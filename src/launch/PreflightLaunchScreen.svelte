<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { LaunchPreflightCheck, LaunchState, RepositoryInspectionSnapshot, WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import LaunchActionDock from './LaunchActionDock.svelte';
  import { resolveLaunchTargetLabel } from './launchState';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';

  export let state: LaunchState;
  export let onBack: () => void = () => undefined;
  export let onLaunch: () => void = () => undefined;
  export let executionMode: 'direct' | 'step' = 'direct';
  export let onExecutionModeChange: (mode: 'direct' | 'step') => void = () => undefined;

  let selectedCheckId: string | null = null;
  let animatedProgress = 0;
  let phaseRevealCount = 0;
  let animationStarted = false;
  let progressAnimationFrame: number | null = null;
  let lastAnimatedTarget = -1;
  let lastPhaseRevealTarget = -1;

  type LaunchReadinessTone = 'ready' | 'warning' | 'pending' | 'blocked';
  type PreflightPhaseCard = {
    id: string;
    label: string;
    description: string;
    icon: WorkbenchIconInput;
  };
  type ProjectMetadataRow = {
    label: string;
    value: string;
    tone?: string;
    icon: WorkbenchIconInput;
  };
  type RuntimePlanPreviewStep = {
    label: string;
    detail: string;
    icon: WorkbenchIconInput;
    tone: LaunchReadinessTone;
  };
  type PreflightCheckSubstep = {
    id: string;
    label: string;
    detail: string;
    status: LaunchPreflightCheck['status'];
  };

  const i18nT = getWorkbenchTranslator();

  $: checks = state.preflight?.checks ?? [];
  $: hasBlockedCheck = checks.some((check) => check.status === 'blocked');
  $: readyCount = checks.filter((check) => check.status === 'ready').length;
  $: warningCount = checks.filter((check) => check.status === 'warning').length;
  $: pendingCount = checks.filter((check) => check.status === 'pending').length;
  $: blockedCount = checks.filter((check) => check.status === 'blocked').length;
  $: resolvedCount = checks.filter((check) => check.status === 'ready' || check.status === 'warning').length;
  $: readinessProgress = checks.length > 0 ? Math.round((resolvedCount / checks.length) * 100) : 0;
  $: readinessTone = resolveReadinessTone(hasBlockedCheck, warningCount, pendingCount);
  $: phases = createPreflightPhaseCards($i18nT);
  $: launchReadinessLabel = hasBlockedCheck
    ? $i18nT('ui.shell.launchGate.preflight.readiness.blocked', { default: 'Blocked' })
    : pendingCount > 0
      ? $i18nT('ui.shell.launchGate.preflight.readiness.pending', { default: 'Ready with pending projections' })
      : $i18nT('ui.shell.launchGate.preflight.readiness.ready', { default: 'Ready to run' });
  $: launchActionLabel = hasBlockedCheck
    ? $i18nT('ui.shell.launchGate.preflight.action.blocked', { default: 'Blocked' })
    : pendingCount > 0
      ? $i18nT('ui.shell.launchGate.preflight.action.pending', { default: 'Launch with pending projections' })
      : executionMode === 'step'
        ? $i18nT('ui.shell.launchGate.actions.stepByStep.prepare', { default: 'Prepare step-by-step' })
        : $i18nT('ui.shell.launchGate.preflight.action.launchRuntime', { default: 'Launch runtime' });
  $: repository = state.preflight?.repository ?? null;
  $: if (!selectedCheckId && checks[0]) {
    selectedCheckId = checks[0].id;
  }
  $: selectedCheck = checks.find((check) => check.id === selectedCheckId) ?? checks[0] ?? null;
  $: projectMetadata = createProjectMetadata(state, repository);
  $: metadataTitle = state.target?.kind === 'self'
    ? $i18nT('ui.shell.launchGate.preflight.runtimeMetadata', { default: 'Runtime metadata' })
    : $i18nT('ui.shell.launchGate.preflight.projectMetadata', { default: 'Project metadata' });
  $: metadataLabel = repository?.label ?? state.target?.project?.label ?? resolveLaunchTargetLabel(state.target);
  $: scriptPreview = repository?.scripts.slice(0, 6) ?? [];
  $: configPreview = repository?.configs.slice(0, 8) ?? [];
  $: findingPreview = repository?.findings.slice(0, 5) ?? [];
  $: runtimePlanPreview = createRuntimePlanPreview(state, repository, checks);
  $: checkSubstepsById = createCheckSubstepsById(checks, state, repository);
  $: phaseRevealTarget = resolvePhaseRevealTarget(state.phase);
  $: if (animationStarted && (readinessProgress !== lastAnimatedTarget || phaseRevealTarget !== lastPhaseRevealTarget)) {
    animatePreflightProgress(readinessProgress);
  }

  onMount(() => {
    animationStarted = true;
    animatePreflightProgress(readinessProgress, { fromStart: true });
  });

  onDestroy(() => {
    cancelProgressAnimation();
  });

  function selectCheck(check: LaunchPreflightCheck): void {
    selectedCheckId = check.id;
  }

  function animatePreflightProgress(target: number, options: { fromStart?: boolean } = {}): void {
    cancelProgressAnimation();

    const reducedMotion = prefersReducedMotion();
    const start = options.fromStart ? 0 : animatedProgress;
    const end = clampProgress(target);
    const targetPhaseCount = phaseRevealTarget;

    lastAnimatedTarget = target;
    lastPhaseRevealTarget = targetPhaseCount;

    if (reducedMotion) {
      animatedProgress = end;
      phaseRevealCount = targetPhaseCount;
      return;
    }

    const startedAt = now();
    const duration = 1000;

    animatedProgress = start;
    phaseRevealCount = options.fromStart ? 0 : Math.min(phaseRevealCount, targetPhaseCount);

    const tick = (timestamp: number): void => {
      const elapsed = Math.max(0, timestamp - startedAt);
      const ratio = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(ratio);

      animatedProgress = start + (end - start) * eased;
      phaseRevealCount = Math.max(phaseRevealCount, Math.min(targetPhaseCount, Math.ceil(targetPhaseCount * eased)));

      if (ratio < 1) {
        progressAnimationFrame = requestProgressFrame(tick);
      } else {
        animatedProgress = end;
        phaseRevealCount = targetPhaseCount;
        progressAnimationFrame = null;
      }
    };

    progressAnimationFrame = requestProgressFrame(tick);
  }

  function cancelProgressAnimation(): void {
    if (progressAnimationFrame === null) {
      return;
    }

    cancelProgressFrame(progressAnimationFrame);
    progressAnimationFrame = null;
  }

  function resolvePhaseRevealTarget(phase: string): number {
    const index = phases.findIndex((candidate) => candidate.id === phase);
    return Math.max(1, index + 1);
  }

  function createPreflightPhaseCards(t: WorkbenchTranslate): PreflightPhaseCard[] {
    return [
      {
        id: 'PREFLIGHT',
        label: t('ui.shell.launchGate.phase.preflight', { default: 'Preflight' }),
        description: t('ui.shell.launchGate.phase.preflight.description', { default: 'Checks context, scripts and blocking signals.' }),
        icon: 'action.focus'
      },
      {
        id: 'PLANNED',
        label: t('ui.shell.launchGate.phase.planned', { default: 'Planned' }),
        description: t('ui.shell.launchGate.phase.planned.description', { default: 'Composes the runtime plan and rollback hooks.' }),
        icon: 'action.swap'
      },
      {
        id: 'INITIALIZING',
        label: t('ui.shell.launchGate.phase.initializing', { default: 'Initializing' }),
        description: t('ui.shell.launchGate.phase.initializing.description', { default: 'Starts services, managers and observability hooks.' }),
        icon: 'action.jump-start'
      },
      {
        id: 'HYDRATING',
        label: t('ui.shell.launchGate.phase.hydrating', { default: 'Hydrating' }),
        description: t('ui.shell.launchGate.phase.hydrating.description', { default: 'Restores stores, tools, projections and sessions.' }),
        icon: 'runtime.projection'
      },
      {
        id: 'RUNNING',
        label: t('ui.shell.launchGate.phase.running', { default: 'Running' }),
        description: t('ui.shell.launchGate.phase.running.description', { default: 'Opens the workbench ready for use.' }),
        icon: 'action.audio-meter'
      }
    ];
  }

  function resolveCheckIcon(status: LaunchPreflightCheck['status']): WorkbenchIconInput {
    switch (status) {
      case 'ready':
        return 'status.success';
      case 'warning':
        return 'status.warning';
      case 'blocked':
        return 'status.error';
      default:
        return 'runtime.projection';
    }
  }

  function createProjectMetadata(state: LaunchState, repository: RepositoryInspectionSnapshot | null): ProjectMetadataRow[] {
    const target = state.target;

    return [
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.package', { default: 'Package' }),
        icon: 'docs.page',
        value: repository?.packageName
          ? `${repository.packageName}${repository.packageVersion ? ` @ ${repository.packageVersion}` : ''}`
          : target?.project?.label ?? resolveLaunchTargetLabel(target)
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.packageManager', { default: 'Package manager' }),
        icon: 'runtime.engine',
        value: repository?.packageManager ? repository.packageManager : $i18nT('ui.shell.launchGate.preflight.projectionPending', { default: 'Projection pending' }),
        tone: repository?.packageManager && repository.packageManager !== 'unknown' ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.framework', { default: 'Framework' }),
        icon: 'design.organism',
        value: formatList(repository?.frameworks),
        tone: repository && !repository.frameworks.includes('unknown') ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.buildTools', { default: 'Build tools' }),
        icon: 'tool.lab',
        value: formatList(repository?.buildTools),
        tone: repository && !repository.buildTools.includes('unknown') ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.scripts', { default: 'Scripts' }),
        icon: 'action.command',
        value: repository ? $i18nT('ui.shell.launchGate.preflight.detectedCount', { default: '{{count}} detected', values: { count: repository.scripts.length } }) : $i18nT('ui.shell.launchGate.preflight.projectionPending', { default: 'Projection pending' }),
        tone: repository && repository.scripts.length > 0 ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.configFiles', { default: 'Config files' }),
        icon: 'docs.registry',
        value: repository ? $i18nT('ui.shell.launchGate.preflight.detectedCount', { default: '{{count}} detected', values: { count: repository.configs.length } }) : $i18nT('ui.shell.launchGate.preflight.projectionPending', { default: 'Projection pending' }),
        tone: repository && repository.configs.length > 0 ? 'ready' : 'pending'
      },
      {
        label: 'Git',
        icon: 'tool.nodal',
        value: repository?.git
          ? `${repository.git.branch ?? 'detached'}${repository.git.dirty ? ' dirty' : ' clean'}`
          : 'No metadata',
        tone: repository?.git?.dirty ? 'warning' : repository?.git ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.metadata.generated', { default: 'Generated' }),
        icon: 'widget.timeline',
        value: repository?.generatedAt ?? state.preflight?.generatedAt ?? $i18nT('ui.shell.launchGate.preflight.notGenerated', { default: 'Not generated' }),
        tone: state.preflight?.generatedAt ? 'ready' : 'pending'
      }
    ];
  }

  function createRuntimePlanPreview(
    state: LaunchState,
    repository: RepositoryInspectionSnapshot | null,
    checks: readonly LaunchPreflightCheck[]
  ): RuntimePlanPreviewStep[] {
    const targetLabel = resolveLaunchTargetLabel(state.target);
    const blocked = checks.filter((check) => check.status === 'blocked');
    const warnings = checks.filter((check) => check.status === 'warning');
    const launchCommand = repository?.summary.launchCommand;
    const testCommand = repository?.summary.testCommand;

    return [
      {
        label: $i18nT('ui.shell.launchGate.preflight.plan.runtimePlan', { default: 'Runtime plan' }),
        detail: blocked.length > 0
          ? $i18nT('ui.shell.launchGate.preflight.plan.blockedChecks', { default: '{{count}} blocked check(s) must be resolved before planning.', values: { count: blocked.length } })
          : $i18nT('ui.shell.launchGate.preflight.plan.summary', { default: 'Plan {{target}} with {{count}} preflight check(s).', values: { target: targetLabel, count: checks.length } }),
        icon: 'widget.timeline',
        tone: blocked.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.plan.launchCommand', { default: 'Launch command' }),
        detail: launchCommand ?? $i18nT('ui.shell.launchGate.preflight.plan.launchCommandPending', { default: 'Launch command will be inferred during runtime planning.' }),
        icon: 'action.play',
        tone: launchCommand ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.plan.qualityHooks', { default: 'Quality hooks' }),
        detail: testCommand
          ? $i18nT('ui.shell.launchGate.preflight.plan.testSignal', { default: 'Test signal available: {{command}}', values: { command: testCommand } })
          : $i18nT('ui.shell.launchGate.preflight.plan.noTestCommand', { default: 'No explicit test command projected yet.' }),
        icon: 'status.success',
        tone: testCommand ? 'ready' : 'pending'
      },
      {
        label: $i18nT('ui.shell.launchGate.preflight.plan.observability', { default: 'Observability' }),
        detail: $i18nT('ui.shell.launchGate.preflight.plan.observabilityDetail', { default: 'Runtime phase, debug events and hydration traces will be attached.' }),
        icon: 'tool.inspector',
        tone: 'ready'
      }
    ];
  }

  function resolveReadinessTone(hasBlockedCheck: boolean, warningCount: number, pendingCount: number): LaunchReadinessTone {
    if (hasBlockedCheck) {
      return 'blocked';
    }

    if (warningCount > 0) {
      return 'warning';
    }

    if (pendingCount > 0) {
      return 'pending';
    }

    return 'ready';
  }

  function createCheckSubstepsById(
    checks: readonly LaunchPreflightCheck[],
    state: LaunchState,
    repository: RepositoryInspectionSnapshot | null
  ): Map<string, PreflightCheckSubstep[]> {
    return new Map(checks.map((check) => [check.id, createCheckSubsteps(check, state, repository)]));
  }

  function createCheckSubsteps(
    check: LaunchPreflightCheck,
    state: LaunchState,
    repository: RepositoryInspectionSnapshot | null
  ): PreflightCheckSubstep[] {
    switch (check.id) {
      case 'launch.self.profile':
        return [
          createSubstep('self-profile', $i18nT('ui.shell.launchGate.preflight.substep.profileSelected', { default: 'Profile selected' }), state.target?.profile ?? $i18nT('ui.shell.launchGate.preflight.noProfile', { default: 'No profile' }), state.target?.profile ? 'ready' : 'blocked'),
          createSubstep('self-scope', $i18nT('ui.shell.launchGate.preflight.substep.runtimeScope', { default: 'Runtime scope' }), $i18nT('ui.shell.launchGate.preflight.substep.coreOnlyScope', { default: 'Core-only introspection environment' }), 'ready'),
          createSubstep('self-projection', $i18nT('ui.shell.launchGate.preflight.substep.selfProjection', { default: 'Self projection' }), repository ? $i18nT('ui.shell.launchGate.preflight.substep.repositoryProjectionAvailable', { default: 'Repository projection available' }) : $i18nT('ui.shell.launchGate.preflight.substep.runtimeWithoutProjection', { default: 'Runtime can start without repository projection' }), repository ? 'ready' : 'pending')
        ];
      case 'launch.self.runtime':
        return [
          createSubstep('self-runtime-plan', $i18nT('ui.shell.launchGate.preflight.plan.runtimePlan', { default: 'Runtime plan' }), $i18nT('ui.shell.launchGate.preflight.substep.coreServicesPlanned', { default: 'Core services and shell observability will be planned' }), 'ready'),
          createSubstep('self-observability', $i18nT('ui.shell.launchGate.preflight.substep.observabilityHooks', { default: 'Observability hooks' }), $i18nT('ui.shell.launchGate.preflight.substep.lifecycleTracking', { default: 'Debug events and lifecycle phase tracking enabled' }), 'ready'),
          createSubstep('self-tools', $i18nT('ui.shell.launchGate.preflight.substep.defaultTools', { default: 'Default tools' }), $i18nT('ui.shell.launchGate.preflight.substep.defaultToolsDetail', { default: 'Runtime inspection tools can mount after launch' }), 'ready')
        ];
      case 'launch.project.target':
        return [
          createSubstep('project-kind', $i18nT('ui.shell.launchGate.preflight.substep.targetKind', { default: 'Target kind' }), state.target?.project?.kind ?? state.target?.kind ?? 'unresolved', state.target ? 'ready' : 'blocked'),
          createSubstep('project-root', $i18nT('ui.shell.launchGate.preflight.substep.rootPath', { default: 'Root path' }), state.target?.project?.root ?? $i18nT('ui.shell.launchGate.preflight.noProjectRoot', { default: 'No project root selected' }), state.target?.project?.root ? 'ready' : 'blocked'),
          createSubstep('project-profile', $i18nT('ui.shell.launchGate.preflight.substep.launchProfile', { default: 'Launch profile' }), state.target?.profile ?? $i18nT('ui.shell.launchGate.preflight.noProfile', { default: 'No profile' }), state.target?.profile ? 'ready' : 'blocked'),
          createSubstep('project-projection', $i18nT('ui.shell.launchGate.preflight.substep.projectionSource', { default: 'Projection source' }), repository ? $i18nT('ui.shell.launchGate.preflight.substep.repositoryInspected', { default: '{{label}} inspected', values: { label: repository.label } }) : $i18nT('ui.shell.launchGate.preflight.substep.waitingRepositoryProjection', { default: 'Waiting for repository projection' }), repository ? 'ready' : 'pending')
        ];
      case 'launch.project.scan':
        return [
          createSubstep('scan-root', 'Project target', state.target?.project?.root ?? 'No project root selected', state.target?.project?.root ? 'ready' : 'blocked'),
          createSubstep('scan-status', 'Repository projection', repository ? 'Projection available' : 'Inspection projection not available yet', repository ? 'ready' : check.status),
          createSubstep('scan-runtime', 'Runtime fallback', 'Launch can continue with a minimal plan while projections hydrate', check.status === 'blocked' ? 'blocked' : 'ready')
        ];
      case 'launch.repository.package-manager':
        return [
          createSubstep('pkg-manifest', 'Package manifest', repository?.packageName ? `${repository.packageName}${repository.packageVersion ? ` @ ${repository.packageVersion}` : ''}` : 'Package name unavailable', repository?.packageName ? 'ready' : 'pending'),
          createSubstep('pkg-manager', 'Lockfile / manager', repository?.packageManager && repository.packageManager !== 'unknown' ? repository.packageManager : 'No lockfile detected', repository?.packageManager && repository.packageManager !== 'unknown' ? 'ready' : 'warning'),
          createSubstep('pkg-framework', 'Framework signal', formatList(repository?.frameworks), repository && !repository.frameworks.includes('unknown') ? 'ready' : 'pending'),
          createSubstep('pkg-workspaces', 'Workspace packages', repository?.summary.workspacePackageCount ? `${repository.summary.workspacePackageCount} workspace package(s)` : 'No workspace package projected', repository?.summary.workspacePackageCount ? 'ready' : 'pending')
        ];
      case 'launch.repository.scripts':
        return [
          createScriptSubstep(repository, 'dev', 'Development script'),
          createScriptSubstep(repository, 'build', 'Build script'),
          createScriptSubstep(repository, 'test', 'Test script', 'check'),
          createSubstep('scripts-total', 'Script catalog', repository ? `${repository.scripts.length} script(s) detected` : 'No script projection', repository && repository.scripts.length > 0 ? 'ready' : 'warning')
        ];
      case 'launch.repository.git':
        return [
          createSubstep('git-metadata', 'Git metadata', repository?.git ? 'Git projection available' : 'No git metadata projected', repository?.git ? 'ready' : 'pending'),
          createSubstep('git-branch', 'Branch', repository?.git?.branch ?? 'Detached or unknown', repository?.git?.branch ? 'ready' : 'pending'),
          createSubstep('git-dirty', 'Working tree', repository?.git ? repository.git.dirty ? 'Local changes detected' : 'Clean working tree' : 'Dirty state unavailable', repository?.git?.dirty ? 'warning' : repository?.git ? 'ready' : 'pending')
        ];
      case 'launch.repository.mode':
        return [
          createSubstep('mode-launch', 'Launch capability', repository?.canLaunch ? 'Workspace initialization allowed' : 'Launch is blocked or projection missing', repository?.canLaunch ? 'ready' : check.status === 'blocked' ? 'blocked' : 'pending'),
          createSubstep('mode-inspect', 'Inspect-only', repository?.inspectOnly ? 'Inspect-only mode requested' : 'Full launch allowed', repository?.inspectOnly ? 'warning' : 'ready'),
          createSubstep('mode-findings', 'Findings', formatFindingSummary(repository), resolveFindingStatus(repository)),
          createSubstep('mode-command', 'Launch command', repository?.summary.launchCommand ?? 'Launch command will be inferred during planning', repository?.summary.launchCommand ? 'ready' : 'pending')
        ];
      default:
        return [
          createSubstep(`${check.id}.status`, check.label, check.message, check.status)
        ];
    }
  }

  function createSubstep(
    id: string,
    label: string,
    detail: string,
    status: LaunchPreflightCheck['status']
  ): PreflightCheckSubstep {
    return { id, label, detail, status };
  }

  function createScriptSubstep(
    repository: RepositoryInspectionSnapshot | null,
    kind: RepositoryInspectionSnapshot['scripts'][number]['kind'],
    label: string,
    fallbackKind?: RepositoryInspectionSnapshot['scripts'][number]['kind']
  ): PreflightCheckSubstep {
    const script = repository?.scripts.find((candidate) => candidate.kind === kind) ??
      (fallbackKind ? repository?.scripts.find((candidate) => candidate.kind === fallbackKind) : undefined);

    return createSubstep(
      `script-${kind}`,
      label,
      script ? `${script.name}: ${script.command}` : 'Not projected',
      script ? 'ready' : 'pending'
    );
  }

  function formatFindingSummary(repository: RepositoryInspectionSnapshot | null): string {
    if (!repository) {
      return 'Findings unavailable';
    }

    if (repository.findings.length === 0) {
      return 'No findings projected';
    }

    const blocked = repository.findings.filter((finding) => finding.severity === 'blocked').length;
    const warnings = repository.findings.filter((finding) => finding.severity === 'warning').length;
    const info = repository.findings.filter((finding) => finding.severity === 'info').length;

    return `${blocked} blocked · ${warnings} warning · ${info} info`;
  }

  function resolveFindingStatus(repository: RepositoryInspectionSnapshot | null): LaunchPreflightCheck['status'] {
    if (!repository) {
      return 'pending';
    }

    if (repository.findings.some((finding) => finding.severity === 'blocked')) {
      return 'blocked';
    }

    if (repository.findings.some((finding) => finding.severity === 'warning')) {
      return 'warning';
    }

    return 'ready';
  }

  function formatList(values: readonly string[] | null | undefined): string {
    if (!values || values.length === 0 || values.includes('unknown')) {
      return 'Projection pending';
    }

    return values.map(formatTokenLabel).join(' / ');
  }

  function formatTokenLabel(value: string): string {
    switch (value) {
      case 'sveltekit':
        return 'SvelteKit';
      case 'typescript':
        return 'TypeScript';
      case 'playwright':
        return 'Playwright';
      case 'vitest':
        return 'Vitest';
      default:
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
  }

  function clampProgress(value: number): number {
    return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  }

  function easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }

  function now(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
  }

  function requestProgressFrame(callback: FrameRequestCallback): number {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }

    return setTimeout(() => callback(now()), 16) as unknown as number;
  }

  function cancelProgressFrame(frame: number): void {
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frame);
      return;
    }

    clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
  }

  function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
</script>

<section class="preflight-launch" data-step-phase={state.phase} aria-label={$i18nT('ui.shell.launchGate.preflight.ariaLabel', { default: 'Launch preflight' })}>
  <header class="preflight-launch__header">
    <span>{state.phase}</span>
    <h1>{resolveLaunchTargetLabel(state.target)}</h1>
  </header>

  <main class="preflight-launch__panel" data-readiness={readinessTone}>
    <section class="preflight-launch__workflow" aria-label={$i18nT('ui.shell.launchGate.preflight.workflow', { default: 'Preflight workflow' })}>
      <section class="preflight-launch__summary" aria-label={$i18nT('ui.shell.launchGate.preflight.summary', { default: 'Preflight summary' })}>
        <div>
          <span>{$i18nT('ui.shell.launchGate.preflight.profile', { default: 'Profile' })}</span>
          <strong>{state.target?.profile ?? 'unresolved'}</strong>
          {#if state.target?.project}
            <code>{state.target.project.root}</code>
          {/if}
        </div>
      </section>

      <div class="preflight-launch__timeline">
        <ol class="preflight-launch__phase-list" aria-label={$i18nT('ui.shell.launchGate.preflight.launchPhases', { default: 'Launch phases' })}>
          {#each phases as phase, index (phase.id)}
            <li
              class:preflight-launch__phase--active={phase.id === state.phase}
              class:preflight-launch__phase--enabled={index < phaseRevealCount}
              data-phase={phase.id}
              data-state={phase.id === state.phase ? 'active' : index < phaseRevealCount ? 'on' : 'off'}
              style={`--phase-index: ${index};`}
              title={phase.description}
            >
              <span class="preflight-launch__phase-icon" aria-hidden="true">
                <WorkbenchIcon icon={phase.icon} label={phase.label} />
              </span>
              <span class="preflight-launch__phase-title">{phase.label}</span>
              <small>{phase.id === state.phase ? $i18nT('ui.shell.launchGate.preflight.phase.active', { default: 'Active step' }) : index < phaseRevealCount ? $i18nT('ui.shell.launchGate.preflight.phase.completed', { default: 'Completed' }) : $i18nT('ui.shell.launchGate.preflight.phase.waiting', { default: 'Waiting' })}</small>
            </li>
          {/each}
        </ol>

        <section class="preflight-launch__progress-card" aria-label={$i18nT('ui.shell.launchGate.preflight.progressSummary', { default: 'Preflight progress summary' })}>
          <header>
            <span>{$i18nT('ui.shell.launchGate.preflight.readiness.title', { default: 'Preflight readiness' })}</span>
            <strong>{Math.round(animatedProgress)}%</strong>
          </header>
          <div
            class="preflight-launch__progress"
            role="progressbar"
            aria-label={$i18nT('ui.shell.launchGate.preflight.progress', { default: 'Preflight progress' })}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(animatedProgress)}
          >
            <span style={`width: ${animatedProgress}%`}></span>
          </div>
          <small>{$i18nT('ui.shell.launchGate.preflight.checkCount', { default: '{{count}} check(s)', values: { count: checks.length } })} · {launchReadinessLabel.toLowerCase()} · {Math.round(animatedProgress)}%</small>
        </section>

        <div class="preflight-launch__checks" aria-label={$i18nT('ui.shell.launchGate.preflight.stepDetails', { default: 'Preflight step details' })}>
          {#each checks as check, index (check.id)}
            {@const substeps = checkSubstepsById.get(check.id) ?? []}
            <article
              class={`preflight-launch__check preflight-launch__check--${check.status}`}
              class:preflight-launch__check--selected={selectedCheck?.id === check.id}
              style={`--check-index: ${index};`}
            >
              <button type="button" aria-expanded={selectedCheck?.id === check.id} on:click={() => selectCheck(check)}>
                <span class="preflight-launch__check-status">
                  <span class="preflight-launch__check-icon" aria-hidden="true">
                    <WorkbenchIcon icon={resolveCheckIcon(check.status)} label={check.status} />
                  </span>
                  {check.status}
                </span>
                <strong>{check.label}</strong>
                <small>{$i18nT('ui.shell.launchGate.preflight.stepOrdinal', { default: 'step {{index}}', values: { index: index + 1 } })}</small>
              </button>
              {#if selectedCheck?.id === check.id}
                <div class="preflight-launch__check-body">
                  <p>{check.message}</p>
                  {#if substeps.length > 0}
                    <ul class="preflight-launch__check-substeps" aria-label={`${check.label} substeps`}>
                      {#each substeps as substep (substep.id)}
                        <li class={`preflight-launch__check-substep preflight-launch__check-substep--${substep.status}`}>
                          <span class="preflight-launch__check-substep-icon" aria-hidden="true">
                            <WorkbenchIcon icon={resolveCheckIcon(substep.status)} label={substep.status} />
                          </span>
                          <span>
                            <strong>{substep.label}</strong>
                            <small title={substep.detail}>{substep.detail}</small>
                          </span>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/if}
            </article>
          {/each}
        </div>
      </div>

      <LaunchActionDock
        ariaLabel={$i18nT('ui.shell.launchGate.preflight.execution', { default: 'Preflight execution' })}
        {executionMode}
        {onExecutionModeChange}
        {onBack}
        onAction={onLaunch}
        backLabel={$i18nT('ui.shell.launchGate.stage.context', { default: 'Context' })}
        backAriaLabel={$i18nT('ui.shell.launchGate.backToContexts', { default: 'Back to contexts' })}
        actionLabel={launchActionLabel}
        actionAriaLabel={launchActionLabel}
        actionDisabled={hasBlockedCheck}
      />
    </section>

      <aside class="preflight-launch__metadata" aria-label={metadataTitle}>
        <div class="preflight-launch__readiness" data-readiness={readinessTone} aria-live="polite">
          <span>{launchReadinessLabel}</span>
          <strong>{Math.round(animatedProgress)}%</strong>
          <small>{readyCount} ready · {warningCount} warning · {pendingCount} pending · {blockedCount} blocked</small>
        </div>

        <header>
          <span>{metadataTitle}</span>
          <strong>{metadataLabel}</strong>
        </header>

        <details class="preflight-launch__metadata-section" open>
          <summary>
              <span>{$i18nT('ui.shell.launchGate.preflight.projectSnapshot', { default: 'Project snapshot' })}</span>
            <strong>{projectMetadata.length}</strong>
          </summary>

          <dl>
            {#each projectMetadata as row}
              <div data-tone={row.tone ?? 'default'}>
                <dt>
                  <span class="preflight-launch__metadata-icon" aria-hidden="true">
                    <WorkbenchIcon icon={row.icon} label={row.label} />
                  </span>
                  {row.label}
                </dt>
                <dd title={row.value}>{row.value}</dd>
              </div>
            {/each}
          </dl>
        </details>

        {#if repository}
          <details class="preflight-launch__metadata-section">
            <summary>
              <span>{$i18nT('ui.shell.launchGate.preflight.metadata.scripts', { default: 'Scripts' })}</span>
              <strong>{repository.scripts.length}</strong>
            </summary>
            {#if scriptPreview.length > 0}
              <ul>
                {#each scriptPreview as script}
                  <li><strong>{script.name}</strong><code>{script.command}</code></li>
                {/each}
              </ul>
            {:else}
              <p>{$i18nT('ui.shell.launchGate.preflight.emptyScripts', { default: 'No package scripts detected.' })}</p>
            {/if}
          </details>

          <details class="preflight-launch__metadata-section">
            <summary>
              <span>{$i18nT('ui.shell.launchGate.preflight.metadata.configFiles', { default: 'Config files' })}</span>
              <strong>{repository.configs.length}</strong>
            </summary>
            {#if configPreview.length > 0}
              <ul>
                {#each configPreview as config}
                  <li><code>{config}</code></li>
                {/each}
              </ul>
            {:else}
              <p>{$i18nT('ui.shell.launchGate.preflight.emptyConfigFiles', { default: 'No config files projected.' })}</p>
            {/if}
          </details>

          <details class="preflight-launch__metadata-section">
            <summary>
              <span>{$i18nT('ui.shell.launchGate.preflight.findings', { default: 'Findings' })}</span>
              <strong>{repository.findings.length}</strong>
            </summary>
            {#if findingPreview.length > 0}
              <ul>
                {#each findingPreview as finding}
                  <li>
                    <strong>{finding.title}</strong>
                    <code>{finding.severity}</code>
                    <span>{finding.message}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p>{$i18nT('ui.shell.launchGate.preflight.emptyFindings', { default: 'No repository finding projected.' })}</p>
            {/if}
          </details>
        {:else}
          <div class="preflight-launch__metadata-empty">
            <strong>{$i18nT('ui.shell.launchGate.preflight.repositoryProjectionPending', { default: 'Repository projection pending' })}</strong>
            <p>{$i18nT('ui.shell.launchGate.preflight.repositoryProjectionPendingDetail', { default: 'Launch can continue, but package manager, framework and config metadata will be richer once a repository inspection projection is available.' })}</p>
          </div>
        {/if}

        <details class="preflight-launch__metadata-section preflight-launch__plan-preview" open aria-label={$i18nT('ui.shell.launchGate.preflight.runtimePlanPreview', { default: 'Runtime plan preview' })}>
          <summary>
            <span>{$i18nT('ui.shell.launchGate.preflight.runtimePlanPreview', { default: 'Runtime plan preview' })}</span>
            <strong>{hasBlockedCheck ? $i18nT('ui.shell.launchGate.preflight.needsAttention', { default: 'Needs attention' }) : $i18nT('ui.shell.launchGate.listing.status.ready', { default: 'Ready' })}</strong>
          </summary>
          <ul>
            {#each runtimePlanPreview as step}
              <li data-tone={step.tone}>
                <span class="preflight-launch__plan-icon" aria-hidden="true">
                  <WorkbenchIcon icon={step.icon} label={step.label} />
                </span>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
              </li>
            {/each}
          </ul>
        </details>
      </aside>
  </main>
</section>

<style>
  .preflight-launch {
    --step-color: #69ecc1;
    --step-accent: #22d3ee;
    --step-rgb: 105, 236, 193;
    --step-panel-border: rgba(var(--step-rgb), 0.35);
    --step-card-border: rgba(var(--step-rgb), 0.28);
    --step-card-bg: rgba(var(--step-rgb), 0.08);
    --step-card-bg-strong: rgba(var(--step-rgb), 0.18);
    --step-glow: rgba(var(--step-rgb), 0.14);
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    align-content: start;
    gap: 20px;
    padding: 28px;
    color: var(--workbench-text-primary, #e8eef8);
    background: transparent;
  }

  .preflight-launch[data-step-phase='PLANNED'] {
    --step-color: #60a5fa;
    --step-accent: #22d3ee;
    --step-rgb: 96, 165, 250;
  }

  .preflight-launch[data-step-phase='INITIALIZING'] {
    --step-color: #a78bfa;
    --step-accent: #60a5fa;
    --step-rgb: 167, 139, 250;
  }

  .preflight-launch[data-step-phase='HYDRATING'] {
    --step-color: #fbbf24;
    --step-accent: #34d399;
    --step-rgb: 251, 191, 36;
  }

  .preflight-launch[data-step-phase='RUNNING'] {
    --step-color: #34d399;
    --step-accent: #69ecc1;
    --step-rgb: 52, 211, 153;
  }

  .preflight-launch__header,
  .preflight-launch__panel {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .preflight-launch__header {
    min-height: 4rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 12px;
    align-items: center;
  }

  .preflight-launch__header span,
  .preflight-launch__summary span,
  .preflight-launch__readiness span,
  .preflight-launch__check-status {
    color: var(--step-color);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .preflight-launch__header h1 {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 2rem;
    letter-spacing: 0;
  }

  .preflight-launch__panel {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(19rem, 0.8fr);
    gap: 14px;
    min-height: 0;
    max-height: min(64rem, calc(100dvh - 8.5rem));
    overflow: hidden;
    padding: 0;
    background: transparent;
  }

  .preflight-launch__panel[data-readiness='ready'] .preflight-launch__workflow,
  .preflight-launch__panel[data-readiness='ready'] .preflight-launch__metadata {
    border-color: var(--step-panel-border);
  }

  .preflight-launch__panel[data-readiness='warning'] .preflight-launch__workflow,
  .preflight-launch__panel[data-readiness='warning'] .preflight-launch__metadata {
    border-color: rgba(245, 158, 11, 0.38);
  }

  .preflight-launch__panel[data-readiness='blocked'] .preflight-launch__workflow,
  .preflight-launch__panel[data-readiness='blocked'] .preflight-launch__metadata {
    border-color: rgba(255, 115, 136, 0.48);
  }

  .preflight-launch__workflow {
    min-width: 0;
    min-height: 0;
    max-height: min(64rem, calc(100dvh - 8.5rem));
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 12px;
    overflow: hidden;
    padding: 16px;
    border: 1px solid var(--step-panel-border);
    border-radius: 8px;
    background:
      radial-gradient(circle at 8% 10%, var(--step-card-bg), transparent 18rem),
      rgba(18, 26, 38, 0.78);
    box-shadow:
      0 1.4rem 4rem rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    scrollbar-color: var(--step-card-border) rgba(7, 13, 22, 0.32);
    scrollbar-width: thin;
    transition:
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .preflight-launch__summary {
    display: grid;
    gap: 16px;
    align-items: end;
    padding: 2px 0 0;
  }

  .preflight-launch__summary code {
    display: block;
    overflow: hidden;
    color: var(--workbench-text-muted, #8fa1b8);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preflight-launch__readiness {
    min-width: 0;
    display: grid;
    gap: 2px;
    text-align: right;
  }

  .preflight-launch__readiness strong {
    color: var(--step-color);
    font-size: 1.02rem;
  }

  .preflight-launch__readiness[data-readiness='warning'] span,
  .preflight-launch__readiness[data-readiness='warning'] strong {
    color: #f6b84a;
  }

  .preflight-launch__readiness[data-readiness='blocked'] span,
  .preflight-launch__readiness[data-readiness='blocked'] strong {
    color: #ff7388;
  }

  .preflight-launch__readiness[data-readiness='pending'] span,
  .preflight-launch__readiness[data-readiness='pending'] strong {
    color: #93c5fd;
  }

  .preflight-launch__readiness small {
    display: block;
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .preflight-launch__timeline,
  .preflight-launch__metadata {
    min-width: 0;
    min-height: 0;
    display: grid;
    gap: 12px;
  }

  .preflight-launch__timeline {
    grid-template-rows: auto auto minmax(0, 1fr);
    align-content: start;
    min-height: 0;
  }

  .preflight-launch__progress-card {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--step-card-border);
    border-radius: 7px;
    background: rgba(4, 9, 16, 0.32);
    animation: launch-panel-content-fade 260ms ease both;
    transition:
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .preflight-launch__progress-card header {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .preflight-launch__progress-card header span {
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .preflight-launch__progress-card header strong {
    color: var(--step-color);
    font-size: 0.86rem;
    font-weight: 900;
  }

  .preflight-launch__progress-card small {
    color: var(--workbench-text-secondary, #b8c6d8);
    font-size: 0.8rem;
  }

  .preflight-launch__progress {
    width: 100%;
    height: 0.35rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(10, 16, 24, 0.88);
  }

  .preflight-launch__progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--step-accent), var(--step-color));
    box-shadow: 0 0 1.2rem var(--step-glow);
    transition:
      width 260ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .preflight-launch__checks {
    display: grid;
    align-content: start;
    gap: 8px;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding-right: 0.28rem;
    scrollbar-gutter: stable;
  }

  .preflight-launch__phase-list {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.62rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .preflight-launch__phase-list li {
    --phase-color: #69ecc1;
    --phase-rgb: 105, 236, 193;
    position: relative;
    min-width: 0;
    min-height: 7.75rem;
    overflow: hidden;
    display: grid;
    grid-template-rows: 1fr auto auto;
    justify-items: center;
    align-content: center;
    gap: 0.58rem;
    padding: 0.86rem 0.72rem 0.72rem;
    border: 1px solid rgba(119, 147, 183, 0.14);
    border-radius: 0.52rem;
    color: #748297;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    background:
      linear-gradient(180deg, rgba(78, 92, 111, 0.1), transparent 60%),
      rgba(9, 14, 21, 0.48);
    font-size: 0.68rem;
    font-weight: 800;
    opacity: 0.6;
    filter: saturate(0.45);
    transform: translateY(0.32rem);
    transition:
      border-color 260ms ease,
      background 260ms ease,
      color 260ms ease,
      opacity 260ms ease,
      filter 260ms ease,
      transform 260ms ease;
    transition-delay: calc(var(--phase-index, 0) * 55ms);
  }

  .preflight-launch__phase-list li[data-phase='PLANNED'] {
    --phase-color: #60a5fa;
    --phase-rgb: 96, 165, 250;
  }

  .preflight-launch__phase-list li[data-phase='INITIALIZING'] {
    --phase-color: #a78bfa;
    --phase-rgb: 167, 139, 250;
  }

  .preflight-launch__phase-list li[data-phase='HYDRATING'] {
    --phase-color: #fbbf24;
    --phase-rgb: 251, 191, 36;
  }

  .preflight-launch__phase-list li[data-phase='RUNNING'] {
    --phase-color: #34d399;
    --phase-rgb: 52, 211, 153;
  }

  .preflight-launch__phase-list li::before {
    content: '';
    position: absolute;
    inset: auto 16% -28% 16%;
    height: 58%;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(var(--phase-rgb), 0.34), transparent 68%);
    opacity: 0;
    filter: blur(10px);
    transform: translateY(16%);
    transition:
      opacity 260ms ease,
      transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .preflight-launch__phase-list li::after {
    content: '';
    position: absolute;
    right: 0.7rem;
    bottom: 0.58rem;
    left: 0.7rem;
    height: 0.13rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.12;
    transform: scaleX(0);
    transform-origin: left center;
    transition:
      opacity 260ms ease,
      transform 460ms cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: calc(120ms + var(--phase-index, 0) * 70ms);
  }

  .preflight-launch__phase-list li span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preflight-launch__phase-icon {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 3.3rem;
    height: 3.3rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    background:
      radial-gradient(circle, color-mix(in srgb, currentColor 14%, transparent), transparent 68%),
      color-mix(in srgb, currentColor 6%, transparent);
    opacity: 0.62;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent);
    transition:
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease,
      opacity 220ms ease;
  }

  .preflight-launch__phase-icon :global(.workbench-icon) {
    width: 2.16rem;
    height: 2.16rem;
  }

  .preflight-launch__phase-title {
    position: relative;
    z-index: 1;
    color: #a6b0bf;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .preflight-launch__phase-list li small {
    position: relative;
    z-index: 1;
    color: #737f90;
    font-size: 0.58rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  .preflight-launch__phase--enabled {
    border-color: rgba(var(--phase-rgb), 0.38) !important;
    color: color-mix(in srgb, var(--phase-color) 82%, #a7b2c2) !important;
    background:
      radial-gradient(circle at 50% 20%, rgba(var(--phase-rgb), 0.12), transparent 3.9rem),
      linear-gradient(180deg, rgba(var(--phase-rgb), 0.1), transparent 64%),
      rgba(10, 16, 24, 0.58) !important;
    opacity: 1 !important;
    filter: saturate(0.92) !important;
    transform: translateY(0) !important;
  }

  .preflight-launch__phase--enabled::after {
    opacity: 0.38;
    transform: scaleX(1);
  }

  .preflight-launch__phase--enabled .preflight-launch__phase-icon {
    background:
      radial-gradient(circle, rgba(var(--phase-rgb), 0.18), transparent 68%),
      rgba(var(--phase-rgb), 0.08);
    opacity: 0.88;
    box-shadow: inset 0 0 0 1px rgba(var(--phase-rgb), 0.08);
  }

  .preflight-launch__phase--enabled .preflight-launch__phase-title {
    color: color-mix(in srgb, var(--phase-color) 68%, var(--workbench-text-primary, #e8eef8));
  }

  .preflight-launch__phase--active {
    border-color: rgba(var(--phase-rgb), 0.72) !important;
    color: var(--phase-color) !important;
    background:
      radial-gradient(circle at 50% 80%, rgba(var(--phase-rgb), 0.24), transparent 4.5rem),
      linear-gradient(180deg, rgba(var(--phase-rgb), 0.12), transparent 68%),
      rgba(var(--phase-rgb), 0.18) !important;
    box-shadow:
      inset 0 0 0 1px rgba(var(--phase-rgb), 0.1),
      0 0 2.2rem rgba(var(--phase-rgb), 0.14);
    filter: saturate(1.08) !important;
  }

  .preflight-launch__phase--active::before {
    opacity: 1;
    transform: translateY(0);
  }

  .preflight-launch__phase--active::after {
    opacity: 0.92;
    box-shadow: 0 0 0.9rem currentColor;
  }

  .preflight-launch__phase--active .preflight-launch__phase-icon {
    opacity: 1;
    background:
      radial-gradient(circle, rgba(var(--phase-rgb), 0.28), transparent 68%),
      rgba(var(--phase-rgb), 0.12);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      0 0 1rem rgba(var(--phase-rgb), 0.22);
  }

  .preflight-launch__phase--active .preflight-launch__phase-title,
  .preflight-launch__phase--active small {
    color: var(--phase-color);
  }

  .preflight-launch__phase-list li[data-state='off'] {
    border-color: rgba(114, 129, 150, 0.14);
    color: #667488;
    background:
      linear-gradient(180deg, rgba(91, 103, 119, 0.08), transparent 68%),
      rgba(7, 12, 19, 0.54);
    opacity: 0.54;
    filter: grayscale(0.55) saturate(0.32);
  }

  .preflight-launch__phase-list li[data-state='off'] .preflight-launch__phase-title {
    color: #8f9bab;
  }

  .preflight-launch__phase-list li[data-state='off'] small {
    color: #6e7a8b;
  }

  .preflight-launch__phase-list li[data-state='off'] .preflight-launch__phase-icon {
    border-color: rgba(132, 149, 172, 0.34);
    background:
      radial-gradient(circle, rgba(132, 149, 172, 0.08), transparent 70%),
      rgba(132, 149, 172, 0.04);
    opacity: 0.5;
  }

  .preflight-launch__check {
    display: grid;
    gap: 6px;
    padding: 12px;
    border: 1px solid rgba(119, 147, 183, 0.18);
    border-radius: 7px;
    background: rgba(10, 16, 24, 0.58);
    animation: preflight-check-enter 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(160ms + var(--check-index, 0) * 62ms);
    transition:
      border-color 180ms ease,
      background 180ms ease,
      transform 180ms ease;
  }

  .preflight-launch__check button {
    display: grid;
    grid-template-columns: minmax(104px, auto) 1fr auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    border: 0;
    padding: 0;
    color: inherit;
    text-align: left;
    background: transparent;
    cursor: pointer;
  }

  .preflight-launch__check-status {
    display: inline-grid;
    grid-template-columns: auto minmax(0, auto);
    align-items: center;
    gap: 0.38rem;
  }

  .preflight-launch__check-icon {
    display: grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border: 1px solid var(--step-card-border);
    border-radius: 999px;
    color: var(--step-color);
    background: var(--step-card-bg);
    font-size: 0.72rem;
  }

  .preflight-launch__check p {
    margin: 0;
    color: var(--workbench-text-secondary, #b8c6d8);
  }

  .preflight-launch__check-body {
    display: grid;
    gap: 0.52rem;
    min-width: 0;
    padding-top: 0.1rem;
  }

  .preflight-launch__check-substeps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.42rem;
    margin: 0.28rem 0 0;
    padding: 0;
    list-style: none;
  }

  .preflight-launch__check-substep {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.42rem;
    align-items: start;
    min-width: 0;
    padding: 0.48rem 0.52rem;
    border: 1px solid rgba(119, 147, 183, 0.13);
    border-radius: 0.45rem;
    background:
      linear-gradient(90deg, color-mix(in srgb, currentColor 5%, transparent), transparent 72%),
      rgba(8, 13, 20, 0.34);
    color: var(--workbench-text-muted, #8fa1b8);
  }

  .preflight-launch__check-substep-icon {
    display: grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    margin-top: 0.08rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    opacity: 0.88;
  }

  .preflight-launch__check-substep-icon :global(.workbench-icon) {
    width: 0.66rem;
    height: 0.66rem;
  }

  .preflight-launch__check-substep span:last-child {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .preflight-launch__check-substep strong,
  .preflight-launch__check-substep small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preflight-launch__check-substep strong {
    color: var(--workbench-text-primary, #e8eef8);
    font-size: 0.68rem;
    font-weight: 860;
  }

  .preflight-launch__check-substep small {
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 0.64rem;
    font-weight: 690;
  }

  .preflight-launch__check-substep--ready {
    border-color: rgba(105, 236, 193, 0.18);
    color: #69ecc1;
  }

  .preflight-launch__check-substep--warning {
    border-color: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }

  .preflight-launch__check-substep--blocked {
    border-color: rgba(255, 115, 136, 0.24);
    color: #ff7388;
  }

  .preflight-launch__check-substep--pending {
    border-color: rgba(147, 197, 253, 0.16);
    color: #93c5fd;
  }

  .preflight-launch__check small {
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .preflight-launch__check--selected {
    border-color: rgba(var(--step-rgb), 0.58);
    background:
      linear-gradient(90deg, rgba(var(--step-rgb), 0.12), transparent 58%),
      rgba(var(--step-rgb), 0.14);
    transform: translateX(0.18rem);
  }

  .preflight-launch__check--blocked {
    border-color: rgba(255, 115, 136, 0.45);
  }

  .preflight-launch__check--blocked .preflight-launch__check-status,
  .preflight-launch__check--blocked .preflight-launch__check-icon {
    color: #ff7388;
  }

  .preflight-launch__check--blocked .preflight-launch__check-icon {
    border-color: rgba(255, 115, 136, 0.48);
    background: rgba(255, 115, 136, 0.1);
    box-shadow: 0 0 1.2rem rgba(255, 115, 136, 0.1);
  }

  .preflight-launch__check--warning {
    border-color: rgba(245, 158, 11, 0.36);
  }

  .preflight-launch__check--warning .preflight-launch__check-status,
  .preflight-launch__check--warning .preflight-launch__check-icon {
    color: #f59e0b;
  }

  .preflight-launch__check--warning .preflight-launch__check-icon {
    border-color: rgba(245, 158, 11, 0.44);
    background: rgba(245, 158, 11, 0.1);
  }

  .preflight-launch__check--pending .preflight-launch__check-status,
  .preflight-launch__check--pending .preflight-launch__check-icon {
    color: #93c5fd;
  }

  .preflight-launch__check--pending .preflight-launch__check-icon {
    border-color: rgba(147, 197, 253, 0.36);
    background: rgba(147, 197, 253, 0.08);
  }

  .preflight-launch__metadata {
    align-content: start;
    max-height: min(64rem, calc(100dvh - 8.5rem));
    overflow: auto;
    overscroll-behavior: contain;
    padding: 14px;
    border: 1px solid var(--step-panel-border);
    border-radius: 8px;
    background:
      linear-gradient(145deg, rgba(var(--step-rgb), 0.05), transparent 48%),
      rgba(10, 16, 24, 0.52);
    scrollbar-gutter: stable;
    scrollbar-color: var(--step-card-border) rgba(7, 13, 22, 0.32);
    scrollbar-width: thin;
    transition:
      border-color 220ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }

  .preflight-launch__metadata header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .preflight-launch__metadata header span,
  .preflight-launch__metadata-section summary span {
    color: var(--step-color);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .preflight-launch__metadata dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
  }

  .preflight-launch__metadata dl div,
  .preflight-launch__metadata-empty {
    min-width: 0;
    padding: 10px;
    border: 1px solid rgba(119, 147, 183, 0.16);
    border-radius: 7px;
    background: rgba(18, 26, 38, 0.7);
  }

  .preflight-launch__metadata dl div[data-tone='ready'] {
    border-color: var(--step-card-border);
  }

  .preflight-launch__metadata dl div[data-tone='warning'] {
    border-color: rgba(245, 158, 11, 0.34);
  }

  .preflight-launch__metadata dt {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .preflight-launch__metadata-icon,
  .preflight-launch__plan-icon {
    display: inline-grid;
    place-items: center;
    width: 1.2rem;
    height: 1.2rem;
    color: #9fc7ff;
  }

  .preflight-launch__metadata dd {
    margin: 4px 0 0;
    overflow: hidden;
    color: var(--workbench-text-primary, #e8eef8);
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 800;
  }

  .preflight-launch__metadata-section {
    min-width: 0;
    padding: 0.66rem;
    border: 1px solid rgba(119, 147, 183, 0.16);
    border-radius: 0.48rem;
    background:
      linear-gradient(135deg, rgba(105, 236, 193, 0.035), transparent 68%),
      rgba(18, 26, 38, 0.58);
    animation: launch-panel-content-fade 260ms ease both;
    transition:
      border-color 200ms ease,
      background 200ms ease,
      opacity 200ms ease;
  }

  .preflight-launch__metadata-section summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    min-width: 0;
    list-style: none;
    cursor: pointer;
    color: var(--workbench-text-primary, #e8eef8);
    font-weight: 800;
  }

  .preflight-launch__metadata-section summary::-webkit-details-marker {
    display: none;
  }

  .preflight-launch__metadata-section summary::after {
    content: '›';
    color: var(--workbench-text-muted, #8fa1b8);
    font-size: 1rem;
    line-height: 1;
    transform: rotate(90deg);
    transition: transform 160ms ease;
  }

  .preflight-launch__metadata-section[open] summary::after {
    transform: rotate(-90deg);
  }

  .preflight-launch__metadata-section summary strong {
    overflow: hidden;
    color: var(--workbench-text-primary, #e8eef8);
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.72rem;
  }

  .preflight-launch__metadata-section dl,
  .preflight-launch__metadata-section ul,
  .preflight-launch__metadata-section p {
    margin-top: 0.62rem;
  }

  .preflight-launch__metadata ul {
    display: grid;
    gap: 6px;
    margin-bottom: 0;
    padding: 0;
    list-style: none;
  }

  .preflight-launch__metadata li {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .preflight-launch__metadata li code {
    overflow: hidden;
    color: var(--workbench-text-muted, #8fa1b8);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preflight-launch__metadata-empty p {
    margin: 6px 0 0;
    color: var(--workbench-text-secondary, #b8c6d8);
  }

  .preflight-launch__plan-preview {
    display: grid;
    gap: 0.68rem;
  }

  .preflight-launch__plan-preview ul {
    display: grid;
    gap: 0.48rem;
    margin: 0.62rem 0 0;
    padding: 0;
    list-style: none;
  }

  .preflight-launch__plan-preview li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.56rem;
    align-items: start;
    min-width: 0;
    padding: 0.58rem;
    border: 1px solid rgba(119, 147, 183, 0.14);
    border-radius: 0.45rem;
    background: rgba(10, 16, 24, 0.42);
  }

  .preflight-launch__plan-preview li[data-tone='ready'] {
    border-color: var(--step-card-border);
  }

  .preflight-launch__plan-preview li[data-tone='warning'] {
    border-color: rgba(245, 158, 11, 0.26);
  }

  .preflight-launch__plan-preview li[data-tone='blocked'] {
    border-color: rgba(255, 115, 136, 0.32);
  }

  .preflight-launch__plan-preview li strong,
  .preflight-launch__plan-preview li small {
    display: block;
    min-width: 0;
  }

  .preflight-launch__plan-preview li small {
    overflow: hidden;
    color: var(--workbench-text-muted, #8fa1b8);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes preflight-check-enter {
    from {
      opacity: 0;
      transform: translateY(0.42rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes launch-panel-content-fade {
    from {
      opacity: 0;
      filter: saturate(0.82);
    }

    to {
      opacity: 1;
      filter: saturate(1);
    }
  }

  @media (max-width: 860px) {
    .preflight-launch {
      height: auto;
      min-height: 100dvh;
      overflow: auto;
    }

    .preflight-launch__panel {
      grid-template-columns: 1fr;
      max-height: none;
      overflow: visible;
    }

    .preflight-launch__workflow {
      max-height: none;
      overflow: visible;
      grid-template-rows: auto;
    }

    .preflight-launch__summary,
    .preflight-launch__metadata header {
      align-items: start;
      flex-direction: column;
    }

    .preflight-launch__readiness {
      min-width: 0;
      text-align: left;
    }

    .preflight-launch__metadata dl {
      grid-template-columns: 1fr;
    }

    .preflight-launch__checks,
    .preflight-launch__metadata {
      max-height: none;
      overflow: visible;
    }

    .preflight-launch__phase-list {
      grid-template-columns: 1fr;
    }

    .preflight-launch__phase-list li {
      min-height: 3.4rem;
    }

    .preflight-launch__check-substeps {
      grid-template-columns: 1fr;
    }

  }

  @media (prefers-reduced-motion: reduce) {
    .preflight-launch__phase-list li,
    .preflight-launch__phase-list li::after,
    .preflight-launch__check,
    .preflight-launch__progress-card,
    .preflight-launch__metadata-section {
      animation: none;
      transition: none;
      transform: none;
    }
  }
</style>
