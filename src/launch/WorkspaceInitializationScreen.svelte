<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import './WorkspaceInitializationScreen.css';
  import {
    createBootEventTimelineRows,
    getBootStepDurationMs,
    type BootPhase,
    type BootEventTimelineRow,
    type BootProjection,
    type BootStepProjection,
    type LaunchPhase,
    type LaunchState,
    type RuntimeHydrationStep,
    type RuntimeInitializationStep,
    type RuntimePlanStep,
    type WorkbenchIconInput
  } from '@konitif/workbench';
  import { resolveLaunchTargetLabel } from './launchState';
  import LaunchActionDock from './LaunchActionDock.svelte';
  import WorkspaceBootEventsPanel from './WorkspaceBootEventsPanel.svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';

  export let state: LaunchState;
  export let onBack: () => void = () => undefined;
  export let onAdvance: () => void | Promise<void> = () => undefined;
  export let isAdvancing = false;
  export let executionMode: 'direct' | 'step' = 'direct';
  export let onExecutionModeChange: (mode: 'direct' | 'step') => void = () => undefined;
  export let bootProjection: BootProjection | null = null;
  export let bootDagDemoEnabled = false;
  export let onRunBootDagSuccessDemo: () => void | Promise<void> = () => undefined;
  export let onRunBootDagOptionalFailureDemo: () => void | Promise<void> = () => undefined;
  export let onRunBootDagCriticalFailureDemo: () => void | Promise<void> = () => undefined;
  export let onTeardownBootDagDemo: () => void | Promise<void> = () => undefined;
  export let onResetBootDagDemo: () => void = () => undefined;

  let selectedBootStepId = '';
  let isBootStepSelectionManual = false;
  let lastBootExecutionId = '';
  let bootInspectorView: 'target' | 'classic' = 'target';
  let bootEventView: BootEventView = 'flat';
  let bootEventsPopoverHeight = 0;
  let bootTimelineFilter: BootTimelineFilter = 'all';
  let collapsedBootTimelinePhaseIds: BootPhase[] = [];
  let bootSnapshotExportStatus = '';
  let bootSnapshotPreviewPayload = '';
  let isBootSnapshotPreviewOpen = false;
  let runtimeStepsElement: HTMLDivElement | null = null;
  let lastAutoScrollKey = '';
  let autoScrollFrame: number | null = null;
  let inspectedPhaseCardId: RuntimePhaseCard['id'] | null = null;
  let selectedRuntimeLifecycleStepId = '';

  const BOOT_EVENTS_POPOVER_HEIGHT_STORAGE_KEY = 'workbench.bootEventsPopoverHeight';
  const BOOT_EVENTS_POPOVER_BOTTOM_OFFSET = 76;
  const BOOT_EVENTS_POPOVER_TOP_OFFSET = 156;
  const BOOT_EVENTS_POPOVER_MIN_HEIGHT = 180;

  onMount(() => {
    const storedHeight = window.sessionStorage.getItem(BOOT_EVENTS_POPOVER_HEIGHT_STORAGE_KEY);
    const parsedHeight = storedHeight ? Number.parseInt(storedHeight, 10) : 0;

    if (Number.isFinite(parsedHeight) && parsedHeight > 0) {
      bootEventsPopoverHeight = parsedHeight;
    }
  });

  onDestroy(() => {
    cancelActiveStepScroll();
  });

  type BootEventView = 'flat' | 'stack' | 'timeline';
  type BootTimelineFilter = 'all' | 'completed' | 'issues' | 'open';
  type BootEventStackRow = {
    id: string;
    scope: BootEventTimelineRow['scope'];
    level: number;
    name: string;
    target: string;
    scopeId: string;
    scopeLabel: string;
    phaseId: BootPhase | null;
    status: string;
    kind: 'open' | 'close' | 'error' | 'event';
    tone: 'root' | 'plan' | 'initialize' | 'hydrate' | 'run' | 'danger' | 'neutral';
    eventCount: number;
    eventTypes: string[];
    timeLabel: string;
    durationLabel: string;
    startPercent: number;
    timelinePercent: number;
  };
  type BootEventTimelineGroup = {
    phase: BootEventStackRow;
    steps: BootEventStackRow[];
    eventCount: number;
    durationLabel: string;
  };
  type BootEventTimelineSummary = {
    rows: number;
    events: number;
    completed: number;
    failed: number;
    open: number;
    durationLabel: string;
  };
  type RuntimeLifecycleStepView = {
    id: string;
    ordinal: number;
    label: string;
    phaseLabel: string;
    detail: string;
    meta: string;
    status: string;
    tone: 'planned' | 'running' | 'completed' | 'skipped' | 'failed' | 'blocked' | 'pending';
    isActive: boolean;
    isResolved: boolean;
    startedAt: string | null;
    completedAt: string | null;
    bootStepId: string | null;
    bootStatus: string | null;
    isBootSelected: boolean;
  };
  type BootStepMetadataRow = {
    key: string;
    label: string;
    value: string;
    tone: 'neutral' | 'success' | 'warning';
  };
  type RuntimePhaseCard = {
    id: 'PREFLIGHT' | LaunchPhase;
    label: string;
    icon: WorkbenchIconInput;
  };
  type RuntimeOsStatusTone = 'active' | 'blocked' | 'nominal' | 'ready' | 'warning';
  type RuntimeOsStatusItem = {
    id: string;
    label: string;
    value: string;
    detail: string;
    tone: RuntimeOsStatusTone;
    icon: WorkbenchIconInput;
  };
  type RuntimeOsStatus = {
    eyebrow: string;
    title: string;
    detail: string;
    tone: RuntimeOsStatusTone;
    items: RuntimeOsStatusItem[];
  };

  const i18nT = getWorkbenchTranslator();

  $: phaseCards = createRuntimePhaseCards($i18nT);
  $: planSteps = state.plan?.steps ?? [];
  $: plannedCount = planSteps.filter((step) => step.status === 'planned').length;
  $: blockedCount = planSteps.filter((step) => step.status === 'blocked').length;
  $: initialization = state.initialization;
  $: initializationSteps = initialization?.steps ?? [];
  $: hydration = state.hydration;
  $: hydrationSteps = hydration?.steps ?? [];
  $: stepperPhase = resolveRuntimeStepperPhase(state);
  $: activePhaseCardIndex = Math.max(
    1,
    phaseCards.findIndex((phase) => phase.id === stepperPhase)
  );
  $: activePhaseCardId = stepperPhase as RuntimePhaseCard['id'];
  $: if (inspectedPhaseCardId && inspectedPhaseCardId === activePhaseCardId) {
    inspectedPhaseCardId = null;
  }
  $: displayPhaseCardId = inspectedPhaseCardId ?? activePhaseCardId;
  $: isInspectingHistoricalPhase = Boolean(inspectedPhaseCardId);
  $: isInspectingPreflight = inspectedPhaseCardId === 'PREFLIGHT';
  $: displayLaunchPhase = isLaunchPhaseCardId(displayPhaseCardId) ? displayPhaseCardId : stepperPhase;
  $: activeLaunchBootPhase = resolveLaunchBootPhase(stepperPhase);
  $: displayLaunchBootPhase = isInspectingPreflight ? null : resolveLaunchBootPhase(displayLaunchPhase);
  $: runtimeLifecycleTitle = resolveRuntimeLifecycleTitle(displayPhaseCardId);
  $: runtimeLifecycleStatus = resolveRuntimeLifecycleStatus(
    displayPhaseCardId,
    state,
    initialization,
    hydration
  );
  $: runtimeLifecycleSteps = isInspectingPreflight
    ? createPreflightLifecycleSteps(state, planSteps, plannedCount, blockedCount)
    : createRuntimeLifecycleStepsForPhase(
        displayLaunchPhase,
        state,
        planSteps,
        initializationSteps,
        hydrationSteps,
        bootProjection,
        selectedBootStepId,
        isInspectingHistoricalPhase
      );
  $: if (
    selectedRuntimeLifecycleStepId &&
    !runtimeLifecycleSteps.some((step) => step.id === selectedRuntimeLifecycleStepId)
  ) {
    selectedRuntimeLifecycleStepId = '';
  }
  $: displayRuntimeFocusStep =
    runtimeLifecycleSteps.find((step) => step.id === selectedRuntimeLifecycleStepId) ??
    runtimeLifecycleSteps.find((step) => step.isActive) ??
    runtimeLifecycleSteps.find((step) => step.tone === 'running') ??
    runtimeLifecycleSteps[0] ??
    null;
  $: mainRuntimeLifecycleTitle = runtimeLifecycleTitle;
  $: mainRuntimeLifecycleStatus = runtimeLifecycleStatus;
  $: mainRuntimeLifecycleSteps = runtimeLifecycleSteps;
  $: mainActiveRuntimeLifecycleStep = displayRuntimeFocusStep;
  $: runtimeOsStatus = createRuntimeOsStatus(
    state,
    stepperPhase,
    mainPanelProgress,
    plannedCount,
    blockedCount,
    initializationSteps,
    hydrationSteps,
    bootProjection,
    mainActiveRuntimeLifecycleStep
  );
  $: activeLaunchStepLabel = isInspectingPreflight
    ? $i18nT('ui.shell.launchGate.initialization.title.preflightReadiness', {
        default: 'Preflight readiness'
      })
    : displayLaunchPhase === 'PLANNED'
      ? $i18nT('ui.shell.launchGate.initialization.title.runtimePlan', { default: 'Runtime plan' })
      : displayLaunchPhase === 'RUNNING'
        ? $i18nT('ui.shell.launchGate.initialization.title.workspaceLaunch', { default: 'Workspace launch' })
        : (displayRuntimeFocusStep?.label ??
          $i18nT('ui.shell.launchGate.initialization.title.workspaceRuntime', {
            default: 'Workspace runtime'
          }));
  $: canAdvanceLaunchStep =
    isInspectingHistoricalPhase ||
    (!isAdvancing &&
      (stepperPhase === 'PLANNED' ||
        stepperPhase === 'RUNNING' ||
        Boolean(initialization?.activeStepId) ||
        Boolean(hydration?.activeStepId)));
  $: if (bootProjection?.executionId && bootProjection.executionId !== lastBootExecutionId) {
    lastBootExecutionId = bootProjection.executionId;
    selectedBootStepId = '';
    isBootStepSelectionManual = false;
  }
  $: selectedBootStepPhase = isBootStepSelectionManual
    ? (bootProjection?.steps.find((step) => step.id === selectedBootStepId)?.phase ?? null)
    : null;
  $: visibleBootPhase =
    selectedBootStepPhase ??
    displayLaunchBootPhase ??
    (isInspectingHistoricalPhase
      ? 'plan'
      : (activeLaunchBootPhase ?? bootProjection?.currentPhase ?? 'plan'));
  $: bootPhaseProjection = bootProjection?.phases.find((phase) => phase.phase === visibleBootPhase) ?? null;
  $: bootPhaseSteps = bootPhaseProjection?.steps ?? [];
  $: autoSelectedBootStep = isInspectingPreflight ? null : resolveAutoSelectedBootStep(bootPhaseSteps);
  $: reconcileBootStepSelection(bootProjection, autoSelectedBootStep);
  $: selectedBootStep = isInspectingPreflight
    ? null
    : (bootProjection?.steps.find((step) => step.id === selectedBootStepId) ?? autoSelectedBootStep);
  $: selectedBootStepDuration = selectedBootStep ? getBootStepDurationMs(selectedBootStep) : undefined;
  $: bootTotalDuration =
    bootProjection?.startedAt !== undefined && bootProjection.endedAt !== undefined
      ? bootProjection.endedAt - bootProjection.startedAt
      : undefined;
  $: bootEventHistory = bootProjection?.events.slice(-20) ?? [];
  $: bootEvents = [...bootEventHistory].reverse();
  $: bootEventTimelineRows = createBootEventTimelineRows(bootProjection, bootEventHistory);
  $: bootEventStackRows = createBootEventStackRows(bootEventTimelineRows);
  $: bootEventRootRow = bootEventStackRows.find((row) => row.scope === 'boot') ?? null;
  $: bootEventTimelineGroups = createBootEventTimelineGroups(bootEventStackRows);
  $: visibleBootEventTimelineGroups = filterBootEventTimelineGroups(
    bootEventTimelineGroups,
    bootTimelineFilter
  );
  $: bootEventTimelineSummary = createBootEventTimelineSummary(
    bootEventStackRows,
    bootEvents.length,
    bootTotalDuration
  );
  $: selectedBootStepIndex = selectedBootStep
    ? bootPhaseSteps.findIndex((step) => step.id === selectedBootStep.id)
    : -1;
  $: selectedBootStepOrdinal = selectedBootStepIndex >= 0 ? selectedBootStepIndex + 1 : 1;
  $: selectedBootStepLastEvent = selectedBootStep
    ? bootEvents.find((event) => 'stepId' in event && event.stepId === selectedBootStep.id)
    : undefined;
  $: selectedBootStepMetadataRows = selectedBootStep ? createBootStepMetadataRows(selectedBootStep) : [];
  $: selectedBootStepLifecycleBadges = selectedBootStep
    ? createBootStepLifecycleBadges(selectedBootStep)
    : [];
  $: satisfiedDependencyCount =
    selectedBootStep?.dependencies.filter((dependency) => isDependencySatisfied(dependency.stepId)).length ??
    0;
  $: displayActiveProgress = resolveDisplayActiveProgress(displayPhaseCardId, initialization, hydration);
  $: detailPanelProgress = resolveDetailPanelProgress(
    displayActiveProgress,
    bootPhaseSteps,
    displayLaunchPhase,
    isInspectingHistoricalPhase
  );
  $: mainPanelProgress = detailPanelProgress;
  $: detailPanelPhaseLabel = isInspectingPreflight
    ? $i18nT('ui.shell.launchGate.phase.preflight', { default: 'Preflight' })
    : formatBootPhaseLabel(displayLaunchBootPhase ?? visibleBootPhase, $i18nT);
  $: detailPanelStatus = isInspectingPreflight
    ? 'completed'
    : (selectedBootStep?.status ?? bootPhaseProjection?.status ?? runtimeLifecycleStatus);
  $: mainPanelSubstepCount = mainRuntimeLifecycleSteps.length || bootPhaseSteps.length;
  $: advanceLaunchLabel = isInspectingHistoricalPhase
    ? $i18nT('ui.shell.launchGate.initialization.action.returnToPhase', {
        default: 'Return to {{phase}}',
        values: {
          phase:
            phaseCards.find((phase) => phase.id === activePhaseCardId)?.label ??
            $i18nT('ui.shell.launchGate.initialization.currentStep', { default: 'current step' })
        }
      })
    : stepperPhase === 'PLANNED'
      ? executionMode === 'step'
        ? $i18nT('ui.shell.launchGate.actions.stepByStep.prepare', { default: 'Prepare step-by-step' })
        : $i18nT('ui.shell.launchGate.initialization.action.startInitialization', {
            default: 'Start initialization'
          })
      : stepperPhase === 'INITIALIZING'
        ? $i18nT('ui.shell.launchGate.initialization.action.validateInitialization', {
            default: 'Validate initialization step'
          })
        : stepperPhase === 'HYDRATING'
          ? $i18nT('ui.shell.launchGate.initialization.action.validateHydration', {
              default: 'Validate hydration step'
            })
          : $i18nT('ui.shell.launchGate.initialization.action.launchWorkspace', {
              default: 'Launch workspace'
            });
  $: scheduleActiveStepScroll(
    `${displayPhaseCardId}:${mainActiveRuntimeLifecycleStep?.id ?? 'phase'}:${selectedRuntimeLifecycleStepId}:${initialization?.activeStepId ?? ''}:${hydration?.activeStepId ?? ''}`
  );

  function formatBootPhaseLabel(phase: BootPhase, translate: WorkbenchTranslate): string {
    if (phase === 'plan') {
      return translate('ui.shell.launchGate.phase.plan', { default: 'Plan' });
    }

    if (phase === 'initialize') {
      return translate('ui.shell.launchGate.phase.initialize', { default: 'Initialize' });
    }

    if (phase === 'hydrate') {
      return translate('ui.shell.launchGate.phase.hydrate', { default: 'Hydrate' });
    }

    return translate('ui.shell.launchGate.phase.run', { default: 'Run' });
  }

  function createRuntimePhaseCards(t: WorkbenchTranslate): RuntimePhaseCard[] {
    return [
      {
        id: 'PREFLIGHT',
        label: t('ui.shell.launchGate.phase.preflight', { default: 'Preflight' }),
        icon: 'action.focus'
      },
      {
        id: 'PLANNED',
        label: t('ui.shell.launchGate.phase.planned', { default: 'Planned' }),
        icon: 'action.swap'
      },
      {
        id: 'INITIALIZING',
        label: t('ui.shell.launchGate.phase.initializing', { default: 'Initializing' }),
        icon: 'action.jump-start'
      },
      {
        id: 'HYDRATING',
        label: t('ui.shell.launchGate.phase.hydrating', { default: 'Hydrating' }),
        icon: 'runtime.projection'
      },
      {
        id: 'RUNNING',
        label: t('ui.shell.launchGate.phase.running', { default: 'Running' }),
        icon: 'action.audio-meter'
      }
    ];
  }

  function resolveRuntimeStepperPhase(state: LaunchState): LaunchPhase {
    if (state.phase === 'RUNNING' || state.hydration?.status === 'completed') {
      return 'RUNNING';
    }

    if (state.phase === 'HYDRATING' || state.hydration) {
      return 'HYDRATING';
    }

    if (state.phase === 'INITIALIZING' || state.initialization) {
      return 'INITIALIZING';
    }

    return 'PLANNED';
  }

  function isLaunchPhaseCardId(phaseId: RuntimePhaseCard['id']): phaseId is LaunchPhase {
    return phaseId !== 'PREFLIGHT';
  }

  function resolveRuntimeLifecycleTitle(phaseId: RuntimePhaseCard['id']): string {
    if (phaseId === 'PREFLIGHT') {
      return $i18nT('ui.shell.launchGate.initialization.title.preflightReadiness', {
        default: 'Preflight readiness'
      });
    }

    if (phaseId === 'RUNNING') {
      return $i18nT('ui.shell.launchGate.initialization.title.workspaceLaunch', {
        default: 'Workspace launch'
      });
    }

    if (phaseId === 'HYDRATING') {
      return $i18nT('ui.shell.launchGate.initialization.title.workspaceHydration', {
        default: 'Workspace hydration'
      });
    }

    if (phaseId === 'INITIALIZING') {
      return $i18nT('ui.shell.launchGate.initialization.title.runtimeInitialization', {
        default: 'Runtime initialization'
      });
    }

    return $i18nT('ui.shell.launchGate.initialization.title.runtimePlan', { default: 'Runtime plan' });
  }

  function resolveRuntimeLifecycleStatus(
    phaseId: RuntimePhaseCard['id'],
    state: LaunchState,
    initialization: LaunchState['initialization'],
    hydration: LaunchState['hydration']
  ): string {
    if (phaseId === 'PREFLIGHT') {
      return $i18nT('ui.shell.launchGate.initialization.status.completed', { default: 'completed' });
    }

    if (phaseId === 'RUNNING') {
      return state.phase === 'RUNNING'
        ? $i18nT('ui.shell.launchGate.initialization.status.readyToLaunch', {
            default: 'ready to launch · 100%'
          })
        : $i18nT('ui.shell.launchGate.initialization.status.waiting', { default: 'waiting' });
    }

    if (phaseId === 'HYDRATING') {
      return hydration ? `${hydration.status} · ${hydration.progress}%` : 'waiting';
    }

    if (phaseId === 'INITIALIZING') {
      return initialization ? `${initialization.status} · ${initialization.progress}%` : 'waiting';
    }

    return state.plan
      ? state.plan.canExecute
        ? $i18nT('ui.shell.launchGate.initialization.status.executable', { default: 'Executable' })
        : $i18nT('ui.shell.launchGate.initialization.status.blocked', { default: 'Blocked' })
      : $i18nT('ui.shell.launchGate.initialization.status.waitingTitle', { default: 'Waiting' });
  }

  function resolveDisplayActiveProgress(
    phaseId: RuntimePhaseCard['id'],
    initialization: LaunchState['initialization'],
    hydration: LaunchState['hydration']
  ): number {
    if (phaseId === 'PREFLIGHT' || phaseId === 'RUNNING') {
      return 100;
    }

    if (phaseId === 'HYDRATING') {
      return hydration?.progress ?? 0;
    }

    if (phaseId === 'INITIALIZING') {
      return initialization?.progress ?? 0;
    }

    return 0;
  }

  function resolvePhaseCardState(
    phase: RuntimePhaseCard,
    index: number,
    activePhase: LaunchPhase,
    activePhaseIndex: number
  ): 'active' | 'done' | 'waiting' {
    if (phase.id === activePhase) {
      return 'active';
    }

    return index < activePhaseIndex ? 'done' : 'waiting';
  }

  function inspectPhaseCard(phase: RuntimePhaseCard, phaseState: 'active' | 'done' | 'waiting'): void {
    if (phaseState === 'waiting') {
      return;
    }

    inspectedPhaseCardId = phaseState === 'active' ? null : phase.id;
    isBootStepSelectionManual = false;
    selectedRuntimeLifecycleStepId = '';
  }

  function returnToActivePhase(): void {
    inspectedPhaseCardId = null;
    isBootStepSelectionManual = false;
    selectedRuntimeLifecycleStepId = '';
  }

  function handleAdvanceAction(): void | Promise<void> {
    if (isInspectingHistoricalPhase) {
      returnToActivePhase();
      return;
    }

    return onAdvance();
  }

  function formatBootDependencies(step: BootStepProjection): string {
    return step.dependencies
      .map((dependency) => `${dependency.stepId}${dependency.optional ? '?' : ''}`)
      .join(', ');
  }

  function resolveAutoSelectedBootStep(steps: readonly BootStepProjection[]): BootStepProjection | null {
    return (
      steps.find((step) => step.status === 'running') ??
      [...steps].reverse().find((step) => step.status === 'failed') ??
      steps.find((step) => step.status === 'pending') ??
      steps[0] ??
      null
    );
  }

  function reconcileBootStepSelection(
    projection: BootProjection | null,
    autoStep: BootStepProjection | null
  ): void {
    if (!projection) {
      return;
    }

    const selectedStepExists = projection.steps.some((step) => step.id === selectedBootStepId);

    if (selectedStepExists && isBootStepSelectionManual) {
      return;
    }

    if (!selectedStepExists) {
      isBootStepSelectionManual = false;
    }

    const nextSelectedStepId = autoStep?.id ?? '';

    if (selectedBootStepId !== nextSelectedStepId) {
      selectedBootStepId = nextSelectedStepId;
    }
  }

  function selectBootStep(stepId: string): void {
    selectedBootStepId = stepId;
    isBootStepSelectionManual = true;
  }

  function selectRuntimeLifecycleStep(step: RuntimeLifecycleStepView): void {
    selectedRuntimeLifecycleStepId = step.id;

    if (!step.bootStepId) {
      selectedBootStepId = '';
      isBootStepSelectionManual = false;
      return;
    }

    selectBootStep(step.bootStepId);
  }

  function resolveLaunchBootPhase(phase: LaunchPhase): BootPhase | null {
    if (phase === 'PLANNED') return 'plan';
    if (phase === 'INITIALIZING') return 'initialize';
    if (phase === 'HYDRATING') return 'hydrate';
    if (phase === 'RUNNING') return 'run';

    return null;
  }

  function resolveDetailPanelProgress(
    activeProgress: number,
    bootPhaseSteps: readonly BootStepProjection[],
    phase: LaunchPhase,
    forceCompleted = false
  ): number {
    if (forceCompleted) {
      return 100;
    }

    if (activeProgress > 0) {
      return Math.max(0, Math.min(100, activeProgress));
    }

    if (bootPhaseSteps.length > 0) {
      const completed = bootPhaseSteps.filter((step) => step.status === 'success').length;
      return Math.round((completed / bootPhaseSteps.length) * 100);
    }

    return phase === 'RUNNING' ? 100 : 0;
  }

  function createRuntimeOsStatus(
    state: LaunchState,
    stepperPhase: LaunchPhase,
    progress: number,
    plannedCount: number,
    blockedCount: number,
    initializationSteps: readonly RuntimeInitializationStep[],
    hydrationSteps: readonly RuntimeHydrationStep[],
    bootProjection: BootProjection | null,
    activeStep: RuntimeLifecycleStepView | null
  ): RuntimeOsStatus {
    const hasError = Boolean(state.error) || state.phase === 'RECOVERY' || state.phase === 'SAFE_MODE';
    const tone: RuntimeOsStatusTone = hasError
      ? 'blocked'
      : blockedCount > 0
        ? 'warning'
        : stepperPhase === 'RUNNING'
          ? 'ready'
          : stepperPhase === 'INITIALIZING' || stepperPhase === 'HYDRATING'
            ? 'active'
            : 'nominal';
    const targetLabel = resolveLaunchTargetLabel(state.target);
    const activeStepLabel =
      activeStep?.label ??
      $i18nT('ui.shell.launchGate.initialization.os.noActiveStep', { default: 'No active step' });

    return {
      eyebrow: $i18nT('ui.shell.launchGate.initialization.os.eyebrow', { default: 'Workbench OS status' }),
      title: resolveRuntimeOsStatusTitle(stepperPhase, tone),
      detail: resolveRuntimeOsStatusDetail(stepperPhase, tone, targetLabel, activeStepLabel),
      tone,
      items: [
        {
          id: 'authority',
          label: $i18nT('ui.shell.launchGate.initialization.os.authority', { default: 'Runtime authority' }),
          value: resolveRuntimeAuthorityLabel(state, blockedCount),
          detail: state.error ?? resolveRuntimeAuthorityDetail(stepperPhase),
          tone,
          icon: 'runtime.engine'
        },
        {
          id: 'incarnation',
          label: $i18nT('ui.shell.launchGate.initialization.os.incarnation', {
            default: 'Launch incarnation'
          }),
          value: `${Math.round(progress)}%`,
          detail: activeStepLabel,
          tone: stepperPhase === 'RUNNING' ? 'ready' : progress > 0 ? 'active' : 'nominal',
          icon: 'widget.timeline'
        },
        {
          id: 'composition',
          label: $i18nT('ui.shell.launchGate.initialization.os.composition', { default: 'Composition' }),
          value: $i18nT('ui.shell.launchGate.initialization.os.compositionValue', {
            default: '{{planned}} planned · {{blocked}} blocked',
            values: { planned: plannedCount, blocked: blockedCount }
          }),
          detail: state.plan?.profile ?? state.target?.profile ?? 'unresolved',
          tone: blockedCount > 0 ? 'warning' : 'nominal',
          icon: 'action.swap'
        },
        {
          id: 'projection',
          label: $i18nT('ui.shell.launchGate.initialization.os.projection', { default: 'Boot projection' }),
          value: bootProjection
            ? $i18nT('ui.shell.launchGate.initialization.os.bootEvents', {
                default: '{{count}} event(s)',
                values: { count: bootProjection.events.length }
              })
            : $i18nT('ui.shell.launchGate.initialization.os.awaitingProjection', {
                default: 'Awaiting projection'
              }),
          detail: formatRuntimeOsProjectionDetail(
            bootProjection,
            initializationSteps.length,
            hydrationSteps.length
          ),
          tone: bootProjection ? 'nominal' : 'warning',
          icon: 'runtime.projection'
        }
      ]
    };
  }

  function resolveRuntimeOsStatusTitle(phase: LaunchPhase, tone: RuntimeOsStatusTone): string {
    if (tone === 'blocked') {
      return $i18nT('ui.shell.launchGate.initialization.os.title.blocked', {
        default: 'Runtime needs attention'
      });
    }

    if (phase === 'RUNNING') {
      return $i18nT('ui.shell.launchGate.initialization.os.title.ready', { default: 'Workbench OS ready' });
    }

    if (phase === 'HYDRATING') {
      return $i18nT('ui.shell.launchGate.initialization.os.title.hydrating', {
        default: 'Workspace state is restoring'
      });
    }

    if (phase === 'INITIALIZING') {
      return $i18nT('ui.shell.launchGate.initialization.os.title.initializing', {
        default: 'Core services are coming online'
      });
    }

    return $i18nT('ui.shell.launchGate.initialization.os.title.planned', { default: 'Runtime plan staged' });
  }

  function resolveRuntimeOsStatusDetail(
    phase: LaunchPhase,
    tone: RuntimeOsStatusTone,
    targetLabel: string,
    activeStepLabel: string
  ): string {
    if (tone === 'blocked') {
      return $i18nT('ui.shell.launchGate.initialization.os.detail.blocked', {
        default: 'The launch surface is holding the system before workspace activation.'
      });
    }

    if (phase === 'RUNNING') {
      return $i18nT('ui.shell.launchGate.initialization.os.detail.ready', {
        default: '{{target}} is ready to open as an active workspace.',
        values: { target: targetLabel }
      });
    }

    return $i18nT('ui.shell.launchGate.initialization.os.detail.active', {
      default: '{{target}} is advancing through {{step}}.',
      values: { target: targetLabel, step: activeStepLabel }
    });
  }

  function resolveRuntimeAuthorityLabel(state: LaunchState, blockedCount: number): string {
    if (state.error) {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityError', { default: 'Recovery' });
    }

    if (blockedCount > 0) {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityBlocked', { default: 'Blocked' });
    }

    if (state.phase === 'RUNNING') {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityReady', { default: 'Ready' });
    }

    return state.phase;
  }

  function resolveRuntimeAuthorityDetail(phase: LaunchPhase): string {
    if (phase === 'PLANNED') {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityPlanDetail', {
        default: 'Runtime plan owns the next executable boundary.'
      });
    }

    if (phase === 'INITIALIZING') {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityInitDetail', {
        default: 'Runtime initialization owns service and manager startup.'
      });
    }

    if (phase === 'HYDRATING') {
      return $i18nT('ui.shell.launchGate.initialization.os.authorityHydrateDetail', {
        default: 'Hydration owns stores, tools and projection restoration.'
      });
    }

    return $i18nT('ui.shell.launchGate.initialization.os.authorityRunDetail', {
      default: 'Runtime authority can hand off to the workspace.'
    });
  }

  function formatRuntimeOsProjectionDetail(
    bootProjection: BootProjection | null,
    initializationStepCount: number,
    hydrationStepCount: number
  ): string {
    if (bootProjection) {
      return $i18nT('ui.shell.launchGate.initialization.os.projectionDetail', {
        default: '{{steps}} boot node(s) · {{phase}} phase',
        values: {
          steps: bootProjection.steps.length,
          phase: formatBootPhaseLabel(bootProjection.currentPhase, $i18nT)
        }
      });
    }

    return $i18nT('ui.shell.launchGate.initialization.os.projectionFallback', {
      default: '{{initialization}} initialization step(s) · {{hydration}} hydration step(s)',
      values: { initialization: initializationStepCount, hydration: hydrationStepCount }
    });
  }

  function createRuntimeLifecycleStepsForPhase(
    phase: LaunchPhase,
    state: LaunchState,
    planSteps: readonly RuntimePlanStep[],
    initializationSteps: readonly RuntimeInitializationStep[],
    hydrationSteps: readonly RuntimeHydrationStep[],
    bootProjection: BootProjection | null,
    selectedBootStepId: string,
    historical: boolean
  ): RuntimeLifecycleStepView[] {
    const steps =
      phase === 'RUNNING'
        ? [createRunningLifecycleStep(state)]
        : phase === 'HYDRATING'
          ? hydrationSteps.map((step, index) =>
              createHydrationLifecycleStep(step, index, bootProjection, selectedBootStepId)
            )
          : phase === 'INITIALIZING'
            ? initializationSteps.map((step, index) =>
                createInitializationLifecycleStep(step, index, bootProjection, selectedBootStepId)
              )
            : createPlanLifecycleSteps(state, planSteps, bootProjection, selectedBootStepId);

    if (!historical) {
      return steps;
    }

    return steps.map((step) => ({
      ...step,
      status:
        step.status === 'running' ||
        step.status === 'planned' ||
        step.status === 'pending' ||
        step.status === 'ready'
          ? 'completed'
          : step.status,
      tone: step.tone === 'failed' || step.tone === 'blocked' ? step.tone : 'completed',
      isActive: false,
      isResolved: step.tone !== 'failed' && step.tone !== 'blocked' ? true : step.isResolved
    }));
  }

  function createPlanLifecycleSteps(
    state: LaunchState,
    planSteps: readonly RuntimePlanStep[],
    bootProjection: BootProjection | null,
    selectedBootStepId: string
  ): RuntimeLifecycleStepView[] {
    const activePlanStepId =
      planSteps.find((step) => step.status === 'planned')?.id ?? planSteps[0]?.id ?? null;

    return planSteps.map((step, index) =>
      createPlanLifecycleStep(
        step,
        index,
        state.phase === 'PLANNED' && step.id === activePlanStepId,
        bootProjection,
        selectedBootStepId
      )
    );
  }

  function createPreflightLifecycleSteps(
    state: LaunchState,
    planSteps: readonly RuntimePlanStep[],
    plannedCount: number,
    blockedCount: number
  ): RuntimeLifecycleStepView[] {
    const profile = state.target?.profile ?? state.plan?.profile ?? 'unresolved';
    const projectLabel = state.target?.project
      ? resolveLaunchTargetLabel(state.target)
      : $i18nT('ui.shell.launchGate.initialization.preflight.targetResolved', {
          default: 'Launch target resolved'
        });

    return [
      {
        id: 'preflight:profile',
        ordinal: 1,
        label: $i18nT('ui.shell.launchGate.initialization.preflight.coreProfile', {
          default: 'Core profile'
        }),
        phaseLabel: $i18nT('ui.shell.launchGate.phase.preflight', { default: 'Preflight' }),
        detail: $i18nT('ui.shell.launchGate.initialization.preflight.profileResolvedDetail', {
          default: 'Launch profile resolved before runtime planning.'
        }),
        meta: `${profile} · ${projectLabel}`,
        status: 'completed',
        tone: 'completed',
        isActive: false,
        isResolved: true,
        startedAt: null,
        completedAt: state.plan?.createdAt ?? null,
        bootStepId: null,
        bootStatus: null,
        isBootSelected: false
      },
      {
        id: 'preflight:runtime',
        ordinal: 2,
        label: 'Runtime readiness',
        phaseLabel: 'Preflight',
        detail: $i18nT('ui.shell.launchGate.initialization.preflight.runtimeReadyDetail', {
          default: 'Runtime plan is ready for manual validation.'
        }),
        meta: $i18nT('ui.shell.launchGate.initialization.preflight.planMeta', {
          default: '{{count}} plan step(s) · {{planned}} planned · {{blocked}} blocked',
          values: { count: planSteps.length, planned: plannedCount, blocked: blockedCount }
        }),
        status: blockedCount > 0 ? 'blocked' : 'completed',
        tone: blockedCount > 0 ? 'blocked' : 'completed',
        isActive: false,
        isResolved: blockedCount === 0,
        startedAt: state.plan?.createdAt ?? null,
        completedAt: state.plan?.createdAt ?? null,
        bootStepId: null,
        bootStatus: null,
        isBootSelected: false
      }
    ];
  }

  function createRunningLifecycleStep(state: LaunchState): RuntimeLifecycleStepView {
    return {
      id: 'running:launch-workspace',
      ordinal: 1,
      label: $i18nT('ui.shell.launchGate.initialization.action.launchWorkspace', {
        default: 'Launch workspace'
      }),
      phaseLabel: $i18nT('ui.shell.launchGate.phase.run', { default: 'Run' }),
      detail: $i18nT('ui.shell.launchGate.initialization.running.detail', {
        default: 'Runtime is ready. Open the active workspace session.'
      }),
      meta: state.target?.profile ?? state.plan?.profile ?? 'runtime-ready',
      status: 'ready',
      tone: 'running',
      isActive: true,
      isResolved: false,
      startedAt: state.hydration?.completedAt ?? state.hydration?.updatedAt ?? null,
      completedAt: null,
      bootStepId: null,
      bootStatus: null,
      isBootSelected: false
    };
  }

  function createPlanLifecycleStep(
    step: RuntimePlanStep,
    index: number,
    isActive: boolean,
    bootProjection: BootProjection | null,
    selectedBootStepId: string
  ): RuntimeLifecycleStepView {
    const blocked = step.status === 'blocked';
    const skipped = step.status === 'skipped';
    const bootStepId = resolveRuntimePlanBootStepId(step.id, bootProjection);
    const bootStep = bootStepId
      ? (bootProjection?.steps.find((entry) => entry.id === bootStepId) ?? null)
      : null;

    return {
      id: step.id,
      ordinal: index + 1,
      label: step.label,
      phaseLabel: $i18nT('ui.shell.launchGate.phase.plan', { default: 'Plan' }),
      detail:
        step.reason ??
        (step.critical
          ? $i18nT('ui.shell.launchGate.initialization.plan.criticalOperation', {
              default: 'Critical runtime operation'
            })
          : $i18nT('ui.shell.launchGate.initialization.plan.optionalOperation', {
              default: 'Optional runtime operation'
            })),
      meta: `${formatRuntimeKind(step.kind)} · ${step.critical ? $i18nT('ui.shell.launchGate.initialization.plan.critical', { default: 'critical' }) : $i18nT('ui.shell.launchGate.initialization.plan.optional', { default: 'optional' })}`,
      status: step.status,
      tone: blocked ? 'blocked' : skipped ? 'skipped' : isActive ? 'running' : 'planned',
      isActive,
      isResolved: blocked || skipped,
      startedAt: null,
      completedAt: null,
      bootStepId,
      bootStatus: bootStep?.status ?? null,
      isBootSelected: Boolean(bootStepId && bootStepId === selectedBootStepId)
    };
  }

  function createInitializationLifecycleStep(
    step: RuntimeInitializationStep,
    index: number,
    bootProjection: BootProjection | null,
    selectedBootStepId: string
  ): RuntimeLifecycleStepView {
    const bootStepId = resolveRuntimePlanBootStepId(step.planStepId, bootProjection);
    const bootStep = bootStepId
      ? (bootProjection?.steps.find((entry) => entry.id === bootStepId) ?? null)
      : null;

    return {
      id: step.id,
      ordinal: index + 1,
      label: step.label,
      phaseLabel: $i18nT('ui.shell.launchGate.phase.initialize', { default: 'Initialize' }),
      detail:
        step.message ??
        $i18nT('ui.shell.launchGate.initialization.initialize.planStep', {
          default: 'Runtime plan step: {{step}}',
          values: { step: step.planStepId }
        }),
      meta: step.planStepId,
      status: step.status,
      tone: step.status === 'failed' ? 'failed' : step.status,
      isActive: step.status === 'running',
      isResolved: step.status === 'completed' || step.status === 'skipped' || step.status === 'failed',
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      bootStepId,
      bootStatus: bootStep?.status ?? null,
      isBootSelected: Boolean(bootStepId && bootStepId === selectedBootStepId)
    };
  }

  function createHydrationLifecycleStep(
    step: RuntimeHydrationStep,
    index: number,
    bootProjection: BootProjection | null,
    selectedBootStepId: string
  ): RuntimeLifecycleStepView {
    const bootStepId = resolveRuntimeHydrationBootStepId(step, bootProjection);
    const bootStep = bootStepId
      ? (bootProjection?.steps.find((entry) => entry.id === bootStepId) ?? null)
      : null;

    return {
      id: step.id,
      ordinal: index + 1,
      label: step.label,
      phaseLabel: $i18nT('ui.shell.launchGate.phase.hydrate', { default: 'Hydrate' }),
      detail:
        step.message ??
        $i18nT('ui.shell.launchGate.initialization.hydrate.restoreDetail', {
          default: '{{kind}} state will be restored into the active workspace session.',
          values: { kind: formatRuntimeKind(step.kind) }
        }),
      meta: formatRuntimeKind(step.kind),
      status: step.status,
      tone: step.status === 'failed' ? 'failed' : step.status,
      isActive: step.status === 'running',
      isResolved: step.status === 'completed' || step.status === 'failed',
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      bootStepId,
      bootStatus: bootStep?.status ?? null,
      isBootSelected: Boolean(bootStepId && bootStepId === selectedBootStepId)
    };
  }

  function resolveRuntimePlanBootStepId(
    planStepId: string,
    bootProjection: BootProjection | null
  ): string | null {
    const bootStepId = `runtime-plan.${planStepId}`;

    return bootProjection?.steps.some((step) => step.id === bootStepId) ? bootStepId : null;
  }

  function resolveRuntimeHydrationBootStepId(
    step: RuntimeHydrationStep,
    bootProjection: BootProjection | null
  ): string | null {
    const candidates = [
      `runtime-plan.${step.kind}`,
      `runtime-plan.service.${step.kind}`,
      `runtime-plan.tool.${step.kind}`,
      `runtime-plan.store.${step.kind}`
    ];

    return (
      candidates.find((candidate) => bootProjection?.steps.some((bootStep) => bootStep.id === candidate)) ??
      null
    );
  }

  function formatRuntimeKind(value: string): string {
    return value
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function formatDuration(durationMs: number | undefined): string {
    if (durationMs === undefined) {
      return '—';
    }

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }

    return `${(durationMs / 1000).toFixed(2)}s`;
  }

  function formatTimestamp(timestamp: number | undefined): string {
    if (timestamp === undefined) {
      return '—';
    }

    return new Date(timestamp).toLocaleTimeString();
  }

  function isDependencySatisfied(dependencyStepId: string): boolean {
    const dependencyStep = bootProjection?.steps.find((step) => step.id === dependencyStepId);
    return dependencyStep?.status === 'success';
  }

  function formatBootEventType(type: string): string {
    return type.replace('boot:', 'boot / ').replace('phase:', 'phase / ').replace('step:', 'step / ');
  }

  function createBootStepMetadataRows(step: BootStepProjection): BootStepMetadataRow[] {
    const metadata = step.metadata;
    const priorityKeys = [
      'planStepId',
      'kind',
      'profile',
      'owner',
      'storeFactory',
      'storeMode',
      'storeCreated',
      'storeMounted',
      'storeReset',
      'initializedStoreModes',
      'runtimePlanId',
      'runtimeStepCount',
      'rollback',
      'teardown'
    ];
    const keys = [
      ...priorityKeys.filter((key) => Object.prototype.hasOwnProperty.call(metadata, key)),
      ...Object.keys(metadata)
        .filter((key) => !priorityKeys.includes(key))
        .sort()
    ];

    return keys.map((key) => ({
      key,
      label: formatMetadataLabel(key),
      value: formatMetadataValue(metadata[key]),
      tone: resolveMetadataTone(key, metadata[key])
    }));
  }

  function createBootStepLifecycleBadges(step: BootStepProjection): BootStepMetadataRow[] {
    const badges: BootStepMetadataRow[] = [];

    if (step.metadata.rollback) {
      badges.push({
        key: 'rollback',
        label: $i18nT('ui.shell.launchGate.initialization.boot.rollback', { default: 'Rollback' }),
        value: $i18nT('ui.shell.launchGate.initialization.boot.applied', { default: 'applied' }),
        tone: 'warning'
      });
    }

    if (step.metadata.teardown) {
      badges.push({
        key: 'teardown',
        label: $i18nT('ui.shell.launchGate.initialization.boot.teardown', { default: 'Teardown' }),
        value: $i18nT('ui.shell.launchGate.initialization.boot.applied', { default: 'applied' }),
        tone: 'warning'
      });
    }

    if (step.metadata.storeCreated !== undefined) {
      badges.push({
        key: 'storeCreated',
        label: $i18nT('ui.shell.launchGate.initialization.boot.store', { default: 'Store' }),
        value: step.metadata.storeCreated
          ? $i18nT('ui.shell.launchGate.initialization.boot.created', { default: 'created' })
          : $i18nT('ui.shell.launchGate.initialization.boot.reused', { default: 'reused' }),
        tone: 'success'
      });
    }

    if (step.metadata.storeReset) {
      badges.push({
        key: 'storeReset',
        label: $i18nT('ui.shell.launchGate.initialization.boot.storeReset', { default: 'Store reset' }),
        value: $i18nT('ui.shell.launchGate.initialization.boot.done', { default: 'done' }),
        tone: 'warning'
      });
    }

    return badges;
  }

  function formatMetadataLabel(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/^\w/, (letter) => letter.toUpperCase());
  }

  function formatMetadataValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((entry) => formatMetadataValue(entry)).join(', ');
    }

    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value
        ? $i18nT('ui.shell.launchGate.initialization.boot.booleanYes', { default: 'yes' })
        : $i18nT('ui.shell.launchGate.initialization.boot.booleanNo', { default: 'no' });
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function resolveMetadataTone(key: string, value: unknown): BootStepMetadataRow['tone'] {
    if (key === 'rollback' || key === 'teardown' || key === 'storeReset') {
      return value ? 'warning' : 'neutral';
    }

    if (key === 'storeCreated' || key === 'storeMounted') {
      return value ? 'success' : 'neutral';
    }

    return 'neutral';
  }

  function createBootEventStackRows(rows: readonly BootEventTimelineRow[]): BootEventStackRow[] {
    return rows.map((row) => ({
      id: row.id,
      scope: row.scope,
      level: row.level,
      name: row.name,
      target: row.kind === 'open' ? 'start -> pending' : `start -> ${row.status}`,
      scopeId: row.scopeId,
      scopeLabel: row.scopeLabel,
      phaseId: resolveBootTimelinePhaseId(row),
      status: row.status,
      kind: row.kind,
      tone: resolveBootTimelineTone(row),
      eventCount: row.eventTypes.length,
      eventTypes: row.eventTypes,
      timeLabel: formatTimestamp(row.startTime),
      durationLabel: formatDuration(row.durationMs),
      startPercent: row.startPercent,
      timelinePercent: row.timelinePercent
    }));
  }

  function createBootEventTimelineGroups(rows: readonly BootEventStackRow[]): BootEventTimelineGroup[] {
    const stepRows = rows.filter((row) => row.scope === 'step');

    return rows
      .filter((row) => row.scope === 'phase')
      .map((phase) => {
        const steps = stepRows.filter((row) => row.phaseId === phase.phaseId);
        const eventCount = phase.eventCount + steps.reduce((total, row) => total + row.eventCount, 0);

        return {
          phase,
          steps,
          eventCount,
          durationLabel: phase.durationLabel
        };
      });
  }

  function filterBootEventTimelineGroups(
    groups: readonly BootEventTimelineGroup[],
    filter: BootTimelineFilter
  ): BootEventTimelineGroup[] {
    if (filter === 'all') {
      return [...groups];
    }

    return groups.filter((group) => {
      const rows = [group.phase, ...group.steps];

      if (filter === 'completed') {
        return rows.some((row) => row.status === 'success');
      }

      if (filter === 'issues') {
        return rows.some((row) => row.status === 'failed' || row.status === 'blocked');
      }

      return rows.some((row) => row.kind === 'open');
    });
  }

  function createBootEventTimelineSummary(
    rows: readonly BootEventStackRow[],
    eventCount: number,
    totalDuration: number | undefined
  ): BootEventTimelineSummary {
    return {
      rows: rows.length,
      events: eventCount,
      completed: rows.filter((row) => row.status === 'success').length,
      failed: rows.filter((row) => row.status === 'failed' || row.status === 'blocked').length,
      open: rows.filter((row) => row.kind === 'open').length,
      durationLabel: formatDuration(totalDuration)
    };
  }

  function resolveBootTimelinePhaseId(row: BootEventTimelineRow): BootPhase | null {
    if (row.scope === 'phase') {
      return row.scopeId as BootPhase;
    }

    if (row.scope === 'step') {
      return bootProjection?.steps.find((step) => step.id === row.scopeId)?.phase ?? null;
    }

    return null;
  }

  function resolveBootTimelineTone(row: BootEventTimelineRow): BootEventStackRow['tone'] {
    if (row.kind === 'error') {
      return 'danger';
    }

    if (row.scope === 'boot') {
      return 'root';
    }

    const phase =
      row.scope === 'phase'
        ? row.scopeId
        : bootProjection?.steps.find((step) => step.id === row.scopeId)?.phase;

    if (phase === 'plan' || phase === 'initialize' || phase === 'hydrate' || phase === 'run') {
      return phase;
    }

    return 'neutral';
  }

  function createBootEventsSnapshot(): object | null {
    if (!bootProjection) {
      return null;
    }

    return {
      type: 'workbench.boot.events.snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      executionId: bootProjection.executionId,
      currentPhase: bootProjection.currentPhase,
      selectedStepId: selectedBootStep?.id ?? null,
      inspector: {
        view: bootEventView,
        filter: bootTimelineFilter,
        collapsedPhaseIds: collapsedBootTimelinePhaseIds
      },
      summary: bootEventTimelineSummary,
      projection: bootProjection,
      timeline: bootEventTimelineRows
    };
  }

  function formatBootEventsSnapshotPayload(): string {
    const snapshot = createBootEventsSnapshot();

    return snapshot ? JSON.stringify(snapshot, null, 2) : '';
  }

  function inspectBootEventsSnapshot(): void {
    bootSnapshotPreviewPayload = formatBootEventsSnapshotPayload();
    isBootSnapshotPreviewOpen = true;
  }

  function closeBootEventsSnapshotPreview(): void {
    isBootSnapshotPreviewOpen = false;
    bootSnapshotPreviewPayload = '';
  }

  async function exportBootEventsSnapshot(): Promise<void> {
    const snapshot = createBootEventsSnapshot();

    if (!snapshot) {
      return;
    }

    const payload = JSON.stringify(snapshot, null, 2);
    bootSnapshotPreviewPayload = payload;
    isBootSnapshotPreviewOpen = true;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable.');
      }

      await navigator.clipboard.writeText(payload);
      bootSnapshotExportStatus = $i18nT('ui.shell.launchGate.initialization.boot.copied', {
        default: 'Copied'
      });
    } catch {
      console.info('Workbench boot events snapshot', snapshot);
      bootSnapshotExportStatus = $i18nT('ui.shell.launchGate.initialization.boot.logged', {
        default: 'Logged'
      });
    }
  }

  function startBootEventsResize(event: PointerEvent): void {
    if (!(event.currentTarget instanceof HTMLElement)) {
      return;
    }
    const resizeHandle: HTMLElement = event.currentTarget;

    const panel = resizeHandle.closest('.workspace-init__dag--target');

    if (!(panel instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    const pointerId = event.pointerId;
    resizeHandle.setPointerCapture(pointerId);

    const panelRect = panel.getBoundingClientRect();
    const maxHeight = Math.max(
      BOOT_EVENTS_POPOVER_MIN_HEIGHT,
      panelRect.height - BOOT_EVENTS_POPOVER_TOP_OFFSET - BOOT_EVENTS_POPOVER_BOTTOM_OFFSET
    );
    const bottom = panelRect.bottom - BOOT_EVENTS_POPOVER_BOTTOM_OFFSET;

    function updateHeight(clientY: number): void {
      const nextHeight = Math.round(
        Math.max(BOOT_EVENTS_POPOVER_MIN_HEIGHT, Math.min(maxHeight, bottom - clientY))
      );
      bootEventsPopoverHeight = nextHeight >= maxHeight - 2 ? 0 : nextHeight;

      if (bootEventsPopoverHeight > 0) {
        window.sessionStorage.setItem(
          BOOT_EVENTS_POPOVER_HEIGHT_STORAGE_KEY,
          String(bootEventsPopoverHeight)
        );
      } else {
        window.sessionStorage.removeItem(BOOT_EVENTS_POPOVER_HEIGHT_STORAGE_KEY);
      }
    }

    function handlePointerMove(moveEvent: PointerEvent): void {
      updateHeight(moveEvent.clientY);
    }

    function handlePointerUp(upEvent: PointerEvent): void {
      updateHeight(upEvent.clientY);
      if (resizeHandle.hasPointerCapture(pointerId)) {
        resizeHandle.releasePointerCapture(pointerId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function resetBootEventsPopoverHeight(): void {
    bootEventsPopoverHeight = 0;
    window.sessionStorage.removeItem(BOOT_EVENTS_POPOVER_HEIGHT_STORAGE_KEY);
  }

  function scheduleActiveStepScroll(scrollKey: string): void {
    if (!scrollKey || scrollKey === lastAutoScrollKey) {
      return;
    }

    lastAutoScrollKey = scrollKey;
    cancelActiveStepScroll();

    void tick().then(() => {
      autoScrollFrame = requestAnimationFrameSafe(() => {
        autoScrollFrame = null;
        scrollChildToContainerTop(runtimeStepsElement, '.workspace-init__plan-step--active');
      });
    });
  }

  function cancelActiveStepScroll(): void {
    if (autoScrollFrame === null) {
      return;
    }

    cancelAnimationFrameSafe(autoScrollFrame);
    autoScrollFrame = null;
  }

  function scrollChildToContainerTop(container: HTMLElement | null, selector: string): void {
    const target = container?.querySelector<HTMLElement>(selector);

    if (!container || !target) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextScrollTop = container.scrollTop + targetRect.top - containerRect.top;

    container.scrollTop = Math.max(0, nextScrollTop);
  }

  function requestAnimationFrameSafe(callback: FrameRequestCallback): number {
    return typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame(callback)
      : window.setTimeout(() => callback(Date.now()), 0);
  }

  function cancelAnimationFrameSafe(handle: number): void {
    if (typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(handle);
      return;
    }

    window.clearTimeout(handle);
  }
</script>

<section
  class="workspace-init"
  data-step-phase={displayPhaseCardId}
  aria-label={$i18nT('ui.shell.launchGate.initialization.ariaLabel', { default: 'Workspace initialization' })}
>
  <header class="workspace-init__header">
    <span>{stepperPhase}</span>
    <h1>{resolveLaunchTargetLabel(state.target)}</h1>
  </header>

  <div class="workspace-init__panel workspace-init__panel--with-dag">
    <div class="workspace-init__primary">
      <section
        class="workspace-init__summary"
        aria-label={$i18nT('ui.shell.launchGate.initialization.summary.ariaLabel', {
          default: 'Runtime launch summary'
        })}
      >
        <div>
          <span>{$i18nT('ui.shell.launchGate.initialization.summary.profile', { default: 'Profile' })}</span>
          <strong>{state.target?.profile ?? state.plan?.profile ?? 'unresolved'}</strong>
          {#if state.target?.project}
            <code>{state.target.project.root}</code>
          {/if}
        </div>
      </section>

      <section
        class="workspace-init__os-status"
        data-tone={runtimeOsStatus.tone}
        aria-label={runtimeOsStatus.eyebrow}
      >
        <header>
          <span class="workspace-init__os-status-icon" aria-hidden="true">
            <WorkbenchIcon icon="runtime.engine" label={runtimeOsStatus.eyebrow} />
          </span>
          <div>
            <span>{runtimeOsStatus.eyebrow}</span>
            <strong>{runtimeOsStatus.title}</strong>
            <p>{runtimeOsStatus.detail}</p>
          </div>
        </header>
        <dl class="workspace-init__os-status-grid">
          {#each runtimeOsStatus.items as item (item.id)}
            <div data-tone={item.tone}>
              <dt>
                <WorkbenchIcon icon={item.icon} label={item.label} />
                <span>{item.label}</span>
              </dt>
              <dd>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </dd>
            </div>
          {/each}
        </dl>
      </section>

      <section
        class="workspace-init__timeline"
        aria-label={$i18nT('ui.shell.launchGate.initialization.timeline.ariaLabel', {
          default: 'Launch runtime phases'
        })}
      >
        <ol class="workspace-init__phase-cards">
          {#each phaseCards as phase, index (phase.id)}
            {@const phaseState = resolvePhaseCardState(phase, index, stepperPhase, activePhaseCardIndex)}
            <li
              class:workspace-init__phase-card--active={phaseState === 'active'}
              class:workspace-init__phase-card--done={phaseState === 'done'}
              class:workspace-init__phase-card--inspectable={phaseState === 'done' || phaseState === 'active'}
              class:workspace-init__phase-card--inspected={phase.id === inspectedPhaseCardId}
              data-phase={phase.id}
              data-state={phaseState}
              data-inspected={phase.id === inspectedPhaseCardId ? 'true' : 'false'}
            >
              <button
                type="button"
                disabled={phaseState === 'waiting'}
                aria-pressed={phase.id === inspectedPhaseCardId || phaseState === 'active'}
                aria-label={phaseState === 'waiting'
                  ? phase.label
                  : $i18nT('ui.shell.launchGate.initialization.inspectPhase', {
                      default: 'Inspect {{phase}}',
                      values: { phase: phase.label }
                    })}
                on:click={() => inspectPhaseCard(phase, phaseState)}
              >
                <span class="workspace-init__phase-card-icon" aria-hidden="true">
                  <WorkbenchIcon icon={phase.icon} label={phase.label} />
                </span>
                <strong>{phase.label}</strong>
                <small
                  >{phase.id === inspectedPhaseCardId
                    ? $i18nT('ui.shell.launchGate.initialization.phase.inspecting', { default: 'Inspecting' })
                    : phaseState === 'active'
                      ? $i18nT('ui.shell.launchGate.preflight.phase.active', { default: 'Active step' })
                      : phaseState === 'done'
                        ? $i18nT('ui.shell.launchGate.preflight.phase.completed', { default: 'Completed' })
                        : $i18nT('ui.shell.launchGate.preflight.phase.waiting', {
                            default: 'Waiting'
                          })}</small
                >
              </button>
            </li>
          {/each}
        </ol>

        <section
          class="workspace-init__progress-card"
          aria-label={$i18nT('ui.shell.launchGate.initialization.progress.ariaLabel', {
            default: 'Runtime launch progress summary'
          })}
        >
          <header>
            <span>{mainRuntimeLifecycleTitle}</span>
            <strong>{mainPanelProgress}%</strong>
          </header>
          <div
            class="workspace-init__progress"
            role="progressbar"
            aria-label={$i18nT('ui.shell.launchGate.initialization.progress.progressbar', {
              default: 'Runtime launch progress'
            })}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(mainPanelProgress)}
          >
            <span style={`width: ${mainPanelProgress}%`}></span>
          </div>
          <small
            >{$i18nT('ui.shell.launchGate.initialization.progress.substepSummary', {
              default: '{{count}} substep(s) · {{status}}',
              values: { count: mainPanelSubstepCount, status: mainRuntimeLifecycleStatus }
            })}</small
          >
        </section>
      </section>

      <div
        bind:this={runtimeStepsElement}
        class="workspace-init__runtime-steps workspace-init__runtime-steps--primary"
        aria-label={mainRuntimeLifecycleTitle}
      >
        {#each mainRuntimeLifecycleSteps as lifecycleStep (lifecycleStep.id)}
          <article
            class="workspace-init__plan-step"
            class:workspace-init__plan-step--active={lifecycleStep.isActive}
            class:workspace-init__plan-step--boot-selected={lifecycleStep.isBootSelected}
            class:workspace-init__plan-step--boot-linked={Boolean(lifecycleStep.bootStepId)}
            class:workspace-init__plan-step--selected={displayRuntimeFocusStep?.id === lifecycleStep.id}
            class:workspace-init__plan-step--resolved={lifecycleStep.isResolved}
            class:workspace-init__plan-step--blocked={lifecycleStep.tone === 'blocked' ||
              lifecycleStep.tone === 'failed'}
            class:workspace-init__plan-step--running={lifecycleStep.tone === 'running'}
            class:workspace-init__plan-step--completed={lifecycleStep.tone === 'completed' ||
              lifecycleStep.tone === 'skipped'}
            data-status={lifecycleStep.tone}
          >
            <button
              type="button"
              class="workspace-init__plan-step-button"
              class:workspace-init__plan-step--boot-linked={Boolean(lifecycleStep.bootStepId)}
              data-boot-step-id={lifecycleStep.bootStepId ?? ''}
              aria-pressed={displayRuntimeFocusStep?.id === lifecycleStep.id || lifecycleStep.isBootSelected}
              on:click={() => selectRuntimeLifecycleStep(lifecycleStep)}
            >
              <div class="workspace-init__plan-step-main">
                <strong>{lifecycleStep.label}</strong>
                <code>{lifecycleStep.status}</code>
              </div>
              <div class="workspace-init__plan-step-detail">
                <span class="workspace-init__plan-step-index">{lifecycleStep.ordinal}</span>
                <p>{lifecycleStep.detail}</p>
                <small
                  >{lifecycleStep.meta}{lifecycleStep.bootStatus
                    ? ` · Boot ${lifecycleStep.bootStatus}`
                    : ''}</small
                >
              </div>
            </button>
            {#if lifecycleStep.startedAt || lifecycleStep.completedAt}
              <dl
                class="workspace-init__plan-step-timing"
                aria-label={$i18nT('ui.shell.launchGate.initialization.lifecycle.timingAria', {
                  default: '{{label}} timing',
                  values: { label: lifecycleStep.label }
                })}
              >
                <div>
                  <dt>
                    {$i18nT('ui.shell.launchGate.initialization.lifecycle.start', { default: 'Start' })}
                  </dt>
                  <dd>{lifecycleStep.startedAt ?? '—'}</dd>
                </div>
                <div>
                  <dt>{$i18nT('ui.shell.launchGate.initialization.lifecycle.done', { default: 'Done' })}</dt>
                  <dd>{lifecycleStep.completedAt ?? '—'}</dd>
                </div>
              </dl>
            {/if}
          </article>
        {/each}
      </div>

      <LaunchActionDock
        ariaLabel={$i18nT('ui.shell.launchGate.initialization.actionDock.ariaLabel', {
          default: 'Step execution'
        })}
        {executionMode}
        {onExecutionModeChange}
        {onBack}
        onAction={handleAdvanceAction}
        backLabel={$i18nT('ui.shell.launchGate.phase.preflight', { default: 'Preflight' })}
        backAriaLabel={$i18nT('ui.shell.launchGate.initialization.action.backToPreflight', {
          default: 'Back to preflight'
        })}
        actionLabel={isAdvancing
          ? $i18nT('ui.shell.launchGate.initialization.action.processing', { default: 'Processing...' })
          : advanceLaunchLabel}
        actionAriaLabel={isAdvancing
          ? $i18nT('ui.shell.launchGate.initialization.action.processingStep', {
              default: 'Processing launch step'
            })
          : advanceLaunchLabel}
        actionDisabled={!canAdvanceLaunchStep}
      />
    </div>

    <div class="workspace-init__dag-shell">
      <aside
        class="workspace-init__details-panel"
        aria-label={$i18nT('ui.shell.launchGate.initialization.details.ariaLabel', {
          default: 'Step details'
        })}
      >
        <header class="workspace-init__details-header">
          <span
            >{$i18nT('ui.shell.launchGate.initialization.details.title', { default: 'Step Details' })}</span
          >
          <div>
            <strong>{detailPanelPhaseLabel}</strong>
            <code>{detailPanelStatus}</code>
          </div>
          <p>{state.error ?? selectedBootStep?.label ?? activeLaunchStepLabel}</p>
        </header>

        <section
          class="workspace-init__details-cards"
          aria-label={$i18nT('ui.shell.launchGate.initialization.details.contextAria', {
            default: 'Current step context'
          })}
        >
          <article>
            <small
              >{$i18nT('ui.shell.launchGate.initialization.boot.structure', { default: 'Structure' })}</small
            >
            <strong>{detailPanelPhaseLabel}</strong>
            <p>{activeLaunchStepLabel}</p>
          </article>
          <article>
            <small
              >{$i18nT('ui.shell.launchGate.initialization.boot.bootNode', { default: 'Boot node' })}</small
            >
            <strong>{selectedBootStep?.id ?? bootPhaseProjection?.phase ?? 'waiting'}</strong>
            <p>
              {selectedBootStep
                ? $i18nT('ui.shell.launchGate.initialization.boot.dependenciesCount', {
                    default: '{{count}} dependencies',
                    values: { count: selectedBootStep.dependencies.length }
                  })
                : $i18nT('ui.shell.launchGate.initialization.boot.noSelectedNode', {
                    default: 'No selected node'
                  })}
            </p>
          </article>
          <article>
            <small
              >{$i18nT('ui.shell.launchGate.initialization.title.runtimePlan', {
                default: 'Runtime plan'
              })}</small
            >
            <strong>{state.plan?.profile ?? 'pending'}</strong>
            <p>
              {$i18nT('ui.shell.launchGate.initialization.plan.counts', {
                default: '{{planned}} planned · {{blocked}} blocked',
                values: { planned: plannedCount, blocked: blockedCount }
              })}
            </p>
          </article>
          <article>
            <small
              >{$i18nT('ui.shell.launchGate.initialization.boot.duration', { default: 'Duration' })}</small
            >
            <strong>{formatDuration(selectedBootStepDuration ?? bootTotalDuration)}</strong>
            <p>
              {selectedBootStepLastEvent
                ? formatBootEventType(selectedBootStepLastEvent.type)
                : $i18nT('ui.shell.launchGate.initialization.boot.noTerminalEvent', {
                    default: 'No terminal event'
                  })}
            </p>
          </article>
        </section>

        {#if selectedBootStep}
          <section
            class="workspace-init__details-selected"
            aria-label={$i18nT('ui.shell.launchGate.initialization.boot.selectedSummaryAria', {
              default: 'Selected boot step summary'
            })}
          >
            <header>
              <strong>{selectedBootStep.id}</strong>
              <code>{selectedBootStep.criticality}</code>
            </header>
            <p>{selectedBootStep.label}</p>
            <dl
              class="workspace-init__metadata-grid"
              aria-label={$i18nT('ui.shell.launchGate.initialization.boot.selectedMetadataAria', {
                default: 'Selected step metadata'
              })}
            >
              {#each selectedBootStepMetadataRows.slice(0, 6) as row (row.key)}
                <div data-tone={row.tone}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              {/each}
            </dl>
          </section>
        {/if}

        {#if bootDagDemoEnabled && bootProjection}
          <details class="workspace-init__advanced-dag">
            <summary>
              <span
                >{$i18nT('ui.shell.launchGate.initialization.boot.dagInspector', {
                  default: 'Boot DAG Inspector'
                })}</span
              >
              <code>{bootInspectorView}</code>
            </summary>
            <button
              type="button"
              class="workspace-init__view-toggle"
              aria-label={$i18nT('ui.shell.launchGate.initialization.boot.toggleInspectorView', {
                default: 'Toggle boot inspector view'
              })}
              aria-pressed={bootInspectorView === 'target'}
              on:click={() => {
                bootInspectorView = bootInspectorView === 'target' ? 'classic' : 'target';
              }}
            >
              {bootInspectorView === 'target'
                ? $i18nT('ui.shell.launchGate.initialization.boot.target', { default: 'Target' })
                : $i18nT('ui.shell.launchGate.initialization.boot.classic', { default: 'Classic' })}
            </button>

            {#if bootInspectorView === 'target'}
              <aside
                class="workspace-init__dag workspace-init__dag--target"
                aria-label={$i18nT('ui.shell.launchGate.initialization.boot.targetViewAria', {
                  default: 'Boot DAG projection target view'
                })}
              >
                <header class="workspace-init__target-header">
                  <span
                    >{$i18nT('ui.shell.launchGate.initialization.boot.nodeDetails', {
                      default: 'Boot Node Details'
                    })}</span
                  >
                  {#if selectedBootStep}
                    <div>
                      <em>{selectedBootStepOrdinal}</em>
                      <strong>{formatBootPhaseLabel(selectedBootStep.phase, $i18nT)}</strong>
                      <code>{selectedBootStep.status}</code>
                    </div>
                    <p>{selectedBootStep.label}</p>
                  {:else}
                    <div>
                      <em>0</em>
                      <strong>{formatBootPhaseLabel(visibleBootPhase, $i18nT)}</strong>
                      <code>{bootPhaseProjection?.status ?? 'empty'}</code>
                    </div>
                    <p>
                      {$i18nT('ui.shell.launchGate.initialization.boot.noSelectedBootStep', {
                        default: 'No selected boot step.'
                      })}
                    </p>
                  {/if}
                  <div
                    class="workspace-init__target-actions"
                    aria-label={$i18nT('ui.shell.launchGate.initialization.boot.lifecycleActionsAria', {
                      default: 'Boot DAG lifecycle actions'
                    })}
                  >
                    <button
                      type="button"
                      disabled={isAdvancing || !bootProjection || bootProjection.executionId === 'boot-idle'}
                      on:click={onTeardownBootDagDemo}
                      >{$i18nT('ui.shell.launchGate.initialization.boot.teardown', {
                        default: 'Teardown'
                      })}</button
                    >
                    <button type="button" disabled={isAdvancing} on:click={onResetBootDagDemo}
                      >{$i18nT('ui.shell.launchGate.initialization.boot.reset', { default: 'Reset' })}</button
                    >
                  </div>
                </header>

                <section
                  class="workspace-init__graph"
                  aria-label={$i18nT('ui.shell.launchGate.initialization.boot.subDagAria', {
                    default: 'Sub DAG step breakdown'
                  })}
                >
                  <header>
                    <span
                      >{$i18nT('ui.shell.launchGate.initialization.boot.subDag', {
                        default: 'Sub DAG (Step Breakdown)'
                      })}</span
                    >
                  </header>
                  <div
                    class="workspace-init__graph-canvas"
                    style={`--dag-step-count: ${Math.max(bootPhaseSteps.length, 1)}`}
                  >
                    <button
                      type="button"
                      class="workspace-init__graph-node workspace-init__graph-node--root"
                      class:workspace-init__graph-node--success={bootPhaseSteps.some(
                        (step) => step.status === 'success'
                      )}
                      on:click={() => {
                        if (bootPhaseSteps[0]) selectBootStep(bootPhaseSteps[0].id);
                      }}
                    >
                      <strong>{visibleBootPhase}</strong>
                      <small
                        >{$i18nT('ui.shell.launchGate.initialization.boot.pseudoRoot', {
                          default: '(pseudo-root)'
                        })}</small
                      >
                    </button>

                    <div class="workspace-init__graph-branches" aria-hidden="true"></div>

                    <div class="workspace-init__graph-row">
                      {#each bootPhaseSteps as step (step.id)}
                        <div
                          class="workspace-init__graph-step"
                          class:workspace-init__graph-step--expanded={selectedBootStep?.id === step.id}
                        >
                          <button
                            type="button"
                            class="workspace-init__graph-node"
                            class:workspace-init__graph-node--active={selectedBootStep?.id === step.id}
                            data-status={step.status}
                            on:click={() => selectBootStep(step.id)}
                          >
                            <strong>{step.id}</strong>
                            <small>{step.status}</small>
                          </button>

                          {#if selectedBootStep?.id === step.id}
                            <section
                              class="workspace-init__selected-card"
                              aria-label={$i18nT(
                                'ui.shell.launchGate.initialization.boot.selectedNodeDetailsAria',
                                { default: 'Selected boot node details' }
                              )}
                            >
                              <header>
                                <div>
                                  <strong>{selectedBootStep.id}</strong>
                                  <code>{selectedBootStep.status}</code>
                                </div>
                                <span>{selectedBootStep.criticality}</span>
                              </header>
                              <div class="workspace-init__selected-body">
                                <div>
                                  <small
                                    >{$i18nT('ui.shell.launchGate.initialization.boot.responsibility', {
                                      default: 'Responsibility'
                                    })}</small
                                  >
                                  <p>{selectedBootStep.label}</p>
                                </div>
                                <div>
                                  <small
                                    >{$i18nT('ui.shell.launchGate.initialization.boot.dependencies', {
                                      default: 'Dependencies'
                                    })}</small
                                  >
                                  {#if selectedBootStep.dependencies.length > 0}
                                    <ul>
                                      {#each selectedBootStep.dependencies as dependency (dependency.stepId)}
                                        <li
                                          class:workspace-init__dependency--satisfied={isDependencySatisfied(
                                            dependency.stepId
                                          )}
                                        >
                                          {dependency.stepId}{dependency.optional
                                            ? ` ${$i18nT('ui.shell.launchGate.initialization.boot.optional', { default: 'optional' })}`
                                            : ''}
                                        </li>
                                      {/each}
                                    </ul>
                                  {:else}
                                    <p>
                                      {$i18nT(
                                        'ui.shell.launchGate.initialization.boot.rootDependencySatisfied',
                                        { default: 'Root dependency satisfied.' }
                                      )}
                                    </p>
                                  {/if}
                                </div>
                                <div>
                                  <small
                                    >{$i18nT('ui.shell.launchGate.initialization.boot.status', {
                                      default: 'Status'
                                    })}</small
                                  >
                                  <p>
                                    {$i18nT('ui.shell.launchGate.initialization.boot.dependenciesSatisfied', {
                                      default: '{{satisfied}} / {{total}} satisfied',
                                      values: {
                                        satisfied: satisfiedDependencyCount,
                                        total: selectedBootStep.dependencies.length
                                      }
                                    })}
                                  </p>
                                </div>
                              </div>
                              <dl>
                                <div>
                                  <dt>
                                    {$i18nT('ui.shell.launchGate.initialization.boot.startedAt', {
                                      default: 'Started at'
                                    })}
                                  </dt>
                                  <dd>{formatTimestamp(selectedBootStep.startedAt)}</dd>
                                </div>
                                <div>
                                  <dt>
                                    {$i18nT('ui.shell.launchGate.initialization.boot.duration', {
                                      default: 'Duration'
                                    })}
                                  </dt>
                                  <dd>{formatDuration(selectedBootStepDuration)}</dd>
                                </div>
                                <div>
                                  <dt>
                                    {$i18nT('ui.shell.launchGate.initialization.boot.lastEvent', {
                                      default: 'Last event'
                                    })}
                                  </dt>
                                  <dd>
                                    {selectedBootStepLastEvent
                                      ? formatBootEventType(selectedBootStepLastEvent.type)
                                      : '—'}
                                  </dd>
                                </div>
                              </dl>
                              <div
                                class="workspace-init__metadata-badges"
                                aria-label={$i18nT(
                                  'ui.shell.launchGate.initialization.boot.lifecycleMetadataAria',
                                  { default: 'Boot lifecycle metadata' }
                                )}
                              >
                                {#each selectedBootStepLifecycleBadges as badge (badge.key)}
                                  <span data-tone={badge.tone}>{badge.label}: {badge.value}</span>
                                {/each}
                              </div>
                              <dl
                                class="workspace-init__metadata-grid"
                                aria-label={$i18nT(
                                  'ui.shell.launchGate.initialization.boot.stepMetadataAria',
                                  { default: 'Boot step metadata' }
                                )}
                              >
                                {#each selectedBootStepMetadataRows as row (row.key)}
                                  <div data-tone={row.tone}>
                                    <dt>{row.label}</dt>
                                    <dd>{row.value}</dd>
                                  </div>
                                {/each}
                              </dl>
                            </section>
                          {/if}
                        </div>
                      {/each}
                    </div>

                    <div class="workspace-init__graph-join" aria-hidden="true"></div>

                    <button
                      type="button"
                      class="workspace-init__graph-node workspace-init__graph-node--complete"
                      class:workspace-init__graph-node--success={bootPhaseProjection?.status === 'success'}
                      disabled={bootPhaseSteps.length === 0}
                    >
                      <strong>{visibleBootPhase}.complete</strong>
                      <small>{bootPhaseProjection?.status ?? 'empty'}</small>
                    </button>
                  </div>
                </section>

                <WorkspaceBootEventsPanel
                  {bootProjection}
                  {bootEvents}
                  bind:bootEventView
                  bind:bootTimelineFilter
                  {bootEventStackRows}
                  {bootEventTimelineSummary}
                  {bootEventRootRow}
                  {visibleBootEventTimelineGroups}
                  bind:collapsedBootTimelinePhaseIds
                  {bootSnapshotExportStatus}
                  {isBootSnapshotPreviewOpen}
                  {bootSnapshotPreviewPayload}
                  resizable
                  {bootEventsPopoverHeight}
                  onExportBootEventsSnapshot={exportBootEventsSnapshot}
                  onInspectBootEventsSnapshot={inspectBootEventsSnapshot}
                  onCloseBootEventsSnapshotPreview={closeBootEventsSnapshotPreview}
                  onResetBootEventsPopoverHeight={resetBootEventsPopoverHeight}
                  onStartBootEventsResize={startBootEventsResize}
                />
              </aside>
            {:else}
              <aside
                class="workspace-init__dag"
                aria-label={$i18nT('ui.shell.launchGate.initialization.boot.projectionAria', {
                  default: 'Boot DAG projection'
                })}
              >
                <header>
                  <span
                    >{$i18nT('ui.shell.launchGate.initialization.boot.stepDag', {
                      default: 'Step DAG'
                    })}</span
                  >
                  <strong>{formatBootPhaseLabel(visibleBootPhase, $i18nT)}</strong>
                </header>

                <section
                  class="workspace-init__dev-controls"
                  aria-label={$i18nT('ui.shell.launchGate.initialization.boot.demoControlsAria', {
                    default: 'Boot DAG demo controls'
                  })}
                >
                  <button type="button" disabled={isAdvancing} on:click={onRunBootDagSuccessDemo}
                    >{$i18nT('ui.shell.launchGate.initialization.boot.runSuccess', {
                      default: 'Run success'
                    })}</button
                  >
                  <button type="button" disabled={isAdvancing} on:click={onRunBootDagOptionalFailureDemo}
                    >{$i18nT('ui.shell.launchGate.initialization.boot.optionalFailure', {
                      default: 'Optional failure'
                    })}</button
                  >
                  <button type="button" disabled={isAdvancing} on:click={onRunBootDagCriticalFailureDemo}
                    >{$i18nT('ui.shell.launchGate.initialization.boot.criticalFailure', {
                      default: 'Critical failure'
                    })}</button
                  >
                  <button
                    type="button"
                    disabled={isAdvancing || !bootProjection || bootProjection.executionId === 'boot-idle'}
                    on:click={onTeardownBootDagDemo}
                    >{$i18nT('ui.shell.launchGate.initialization.boot.teardown', {
                      default: 'Teardown'
                    })}</button
                  >
                  <button type="button" disabled={isAdvancing} on:click={onResetBootDagDemo}
                    >{$i18nT('ui.shell.launchGate.initialization.boot.reset', { default: 'Reset' })}</button
                  >
                </section>

                <section
                  class="workspace-init__dag-phase"
                  aria-label={$i18nT('ui.shell.launchGate.initialization.boot.currentPhaseAria', {
                    default: 'Current boot phase'
                  })}
                >
                  <small
                    >{visibleBootPhase === bootProjection.currentPhase
                      ? $i18nT('ui.shell.launchGate.initialization.boot.currentPhase', {
                          default: 'Current phase'
                        })
                      : $i18nT('ui.shell.launchGate.initialization.boot.selectedPhase', {
                          default: 'Selected phase'
                        })}</small
                  >
                  <div>
                    <strong>{formatBootPhaseLabel(visibleBootPhase, $i18nT)}</strong>
                    <code>{bootPhaseProjection?.status ?? 'empty'}</code>
                  </div>
                  <small
                    >{$i18nT('ui.shell.launchGate.initialization.boot.bootDuration', {
                      default: 'Boot duration: {{duration}}',
                      values: { duration: formatDuration(bootTotalDuration) }
                    })}</small
                  >
                </section>

                <section
                  class="workspace-init__dag-nodes"
                  aria-label={$i18nT('ui.shell.launchGate.initialization.boot.phaseStepsAria', {
                    default: 'Boot phase steps'
                  })}
                >
                  {#each bootPhaseSteps as step (step.id)}
                    <button
                      type="button"
                      class="workspace-init__dag-node"
                      class:workspace-init__dag-node--active={selectedBootStep?.id === step.id}
                      class:workspace-init__dag-node--success={step.status === 'success'}
                      class:workspace-init__dag-node--running={step.status === 'running'}
                      class:workspace-init__dag-node--failed={step.status === 'failed' ||
                        step.status === 'blocked'}
                      on:click={() => selectBootStep(step.id)}
                    >
                      <div>
                        <strong>{step.id}</strong>
                        <code>{step.status}</code>
                      </div>
                      <p>{step.label}</p>
                      <small>
                        {step.dependencies.length > 0
                          ? $i18nT('ui.shell.launchGate.initialization.boot.dependsOnWithProgress', {
                              default: 'Depends on: {{dependencies}} · {{satisfied}} / {{total}} satisfied',
                              values: {
                                dependencies: formatBootDependencies(step),
                                satisfied: step.dependencies.filter((dependency) =>
                                  isDependencySatisfied(dependency.stepId)
                                ).length,
                                total: step.dependencies.length
                              }
                            })
                          : $i18nT('ui.shell.launchGate.initialization.boot.rootStep', {
                              default: 'Root step'
                            })}
                      </small>
                    </button>
                  {/each}
                </section>

                {#if selectedBootStep}
                  <section
                    class="workspace-init__dag-details"
                    aria-label={$i18nT('ui.shell.launchGate.initialization.boot.selectedStepAria', {
                      default: 'Selected boot step'
                    })}
                  >
                    <header>
                      <span
                        >{$i18nT('ui.shell.launchGate.initialization.boot.selectedNode', {
                          default: 'Selected node'
                        })}</span
                      >
                      <code>{selectedBootStep.criticality}</code>
                    </header>
                    <strong>{selectedBootStep.id}</strong>
                    <p>{selectedBootStep.label}</p>
                    <dl>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.phase', { default: 'Phase' })}
                        </dt>
                        <dd>{selectedBootStep.phase}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.status', { default: 'Status' })}
                        </dt>
                        <dd>{selectedBootStep.status}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.duration', {
                            default: 'Duration'
                          })}
                        </dt>
                        <dd>{formatDuration(selectedBootStepDuration)}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.attempts', {
                            default: 'Attempts'
                          })}
                        </dt>
                        <dd>{selectedBootStep.attempts}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.dependencies', {
                            default: 'Dependencies'
                          })}
                        </dt>
                        <dd>{selectedBootStep.dependencies.length}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.started', { default: 'Started' })}
                        </dt>
                        <dd>{formatTimestamp(selectedBootStep.startedAt)}</dd>
                      </div>
                      <div>
                        <dt>
                          {$i18nT('ui.shell.launchGate.initialization.boot.ended', { default: 'Ended' })}
                        </dt>
                        <dd>{formatTimestamp(selectedBootStep.endedAt)}</dd>
                      </div>
                    </dl>
                    {#if selectedBootStep.dependencies.length > 0}
                      <div class="workspace-init__dependencies">
                        <small
                          >{$i18nT('ui.shell.launchGate.initialization.boot.dependencies', {
                            default: 'Dependencies'
                          })}</small
                        >
                        {#each selectedBootStep.dependencies as dependency (dependency.stepId)}
                          <span
                            class:workspace-init__dependency--satisfied={isDependencySatisfied(
                              dependency.stepId
                            )}
                          >
                            {dependency.stepId}{dependency.optional
                              ? ` ${$i18nT('ui.shell.launchGate.initialization.boot.optional', { default: 'optional' })}`
                              : ''}
                          </span>
                        {/each}
                      </div>
                    {/if}
                    {#if selectedBootStep.warnings.length > 0}
                      <div class="workspace-init__warnings">
                        <small
                          >{$i18nT('ui.shell.launchGate.initialization.boot.warnings', {
                            default: 'Warnings'
                          })}</small
                        >
                        {#each selectedBootStep.warnings as warning}
                          <span>{warning}</span>
                        {/each}
                      </div>
                    {/if}
                    {#if selectedBootStep.error}
                      <div class="workspace-init__error">
                        <small
                          >{$i18nT('ui.shell.launchGate.initialization.boot.error', {
                            default: 'Error'
                          })}</small
                        >
                        <span>{selectedBootStep.error}</span>
                      </div>
                    {/if}
                    {#if Object.keys(selectedBootStep.metadata).length > 0}
                      <dl
                        class="workspace-init__metadata-grid"
                        aria-label={$i18nT('ui.shell.launchGate.initialization.boot.stepMetadataAria', {
                          default: 'Boot step metadata'
                        })}
                      >
                        {#each selectedBootStepMetadataRows as row (row.key)}
                          <div data-tone={row.tone}>
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                          </div>
                        {/each}
                      </dl>
                      <details class="workspace-init__metadata-raw">
                        <summary
                          >{$i18nT('ui.shell.launchGate.initialization.boot.rawMetadata', {
                            default: 'Raw metadata'
                          })}</summary
                        >
                        <pre>{JSON.stringify(selectedBootStep.metadata, null, 2)}</pre>
                      </details>
                    {/if}
                  </section>
                {/if}

                <WorkspaceBootEventsPanel
                  {bootProjection}
                  {bootEvents}
                  bind:bootEventView
                  bind:bootTimelineFilter
                  {bootEventStackRows}
                  {bootEventTimelineSummary}
                  {bootEventRootRow}
                  {visibleBootEventTimelineGroups}
                  bind:collapsedBootTimelinePhaseIds
                  {bootSnapshotExportStatus}
                  {isBootSnapshotPreviewOpen}
                  {bootSnapshotPreviewPayload}
                  {bootEventsPopoverHeight}
                  onExportBootEventsSnapshot={exportBootEventsSnapshot}
                  onInspectBootEventsSnapshot={inspectBootEventsSnapshot}
                  onCloseBootEventsSnapshotPreview={closeBootEventsSnapshotPreview}
                />
              </aside>
            {/if}
          </details>
        {/if}
      </aside>
    </div>
  </div>
</section>
