import {
  createInitialLaunchState,
  createLaunchPreflightSummary,
  createProjectLaunchTarget,
  createRepositoryLaunchPreflightSummary,
  createRuntimeRecoverySnapshot,
  createRuntimeHydrationSnapshot,
  createRuntimeInitializationSnapshot,
  createRuntimeSafeModeSnapshot,
  createRuntimeSuspensionSnapshot,
  createRuntimeTeardownSnapshot,
  createSelfLaunchTarget,
  completeRuntimeRecoveryAction,
  completeRuntimeHydrationStep,
  completeRuntimeInitializationStep,
  completeRuntimeSuspensionStep,
  completeRuntimeTeardownStep,
  failRuntimeRecoveryAction,
  failRuntimeHydrationStep,
  failRuntimeInitializationStep,
  failRuntimeSuspensionStep,
  failRuntimeTeardownStep,
  RepositoryPreflightEngine,
  RuntimePlanEngine,
  resolveProjectDefaultLaunchProfile,
  transitionLaunchState,
  type LaunchPhase,
  type LaunchProfile,
  type LaunchProjectKind,
  type LaunchProjectOption,
  type LaunchState,
  type LaunchTarget,
  type RuntimeRecoveryCause,
  type RepositoryInspectionInput,
  type WorkbenchProjectApp,
  type WorkbenchProjectManifest,
  type WorkbenchProjectRepository
} from '@konitif/workbench';
import { get, writable, type Readable } from 'svelte/store';

export interface LaunchStoreOptions {
  applications?: string[];
  repositories?: string[];
  projectManifest?: WorkbenchProjectManifest | null;
  repositoryInspections?: Record<string, RepositoryInspectionInput>;
  selfInspection?: RepositoryInspectionInput | null;
  initialState?: LaunchState | null;
  initialTarget?: LaunchTarget | null;
  now?: () => string;
}

export interface LaunchStore extends Readable<LaunchState> {
  readonly applications: LaunchProjectOption[];
  readonly repositories: LaunchProjectOption[];
  readonly projectManifest: WorkbenchProjectManifest | null;
  getState(): LaunchState;
  reset(): void;
  selectSelf(): void;
  openProjectDashboard(): void;
  selectProject(project: LaunchProjectOption): void;
  setRepositoryInspection(targetKey: string, inspection: RepositoryInspectionInput): LaunchState;
  confirmLaunch(): LaunchState;
  startInitialization(): LaunchState;
  completeInitializationStep(stepId?: string, message?: string | null): LaunchState;
  failInitializationStep(stepId: string, error: string): LaunchState;
  startHydration(): LaunchState;
  completeHydrationStep(stepId?: string, message?: string | null): LaunchState;
  failHydrationStep(stepId: string, error: string): LaunchState;
  startSuspension(reason?: string): LaunchState;
  completeSuspensionStep(stepId?: string, message?: string | null): LaunchState;
  failSuspensionStep(stepId: string, error: string): LaunchState;
  startResume(): LaunchState;
  completeResumeStep(stepId?: string, message?: string | null): LaunchState;
  failResumeStep(stepId: string, error: string): LaunchState;
  startTeardown(reason?: string): LaunchState;
  completeTeardownStep(stepId?: string, message?: string | null): LaunchState;
  failTeardownStep(stepId: string, error: string): LaunchState;
  startRecovery(cause?: RuntimeRecoveryCause, error?: string): LaunchState;
  completeRecoveryAction(actionId?: string, message?: string | null): LaunchState;
  failRecoveryAction(actionId: string, error: string): LaunchState;
  enterSafeMode(reason?: string): LaunchState;
  retryFromRecoveryPreflight(): LaunchState;
  retryFromSafeMode(): LaunchState;
  transition(phase: LaunchPhase, patch?: Partial<LaunchState>): LaunchState;
}

export function createLaunchStore(options: LaunchStoreOptions = {}): LaunchStore {
  const now = options.now ?? (() => new Date().toISOString());
  const projectManifest = options.projectManifest ?? null;
  const repositoryPreflightEngine = new RepositoryPreflightEngine();
  const runtimePlanEngine = new RuntimePlanEngine();
  let repositoryInspections = options.repositoryInspections ?? {};
  let selfInspection = options.selfInspection ?? null;
  const applications = projectManifest
    ? projectManifest.apps.map((app) => createLaunchProjectOptionFromApp(app, projectManifest))
    : createMockLaunchProjectOptions(options.applications ?? [], 'app');
  const repositories = projectManifest
    ? projectManifest.repositories.map((repository) => createLaunchProjectOptionFromRepository(repository))
    : createMockLaunchProjectOptions(options.repositories ?? [], 'repository');
  const initialState = options.initialState
    ? options.initialState
    : options.initialTarget
    ? transitionLaunchState(createInitialLaunchState(), 'PREFLIGHT', {
        screen: 'preflight',
        target: options.initialTarget,
        preflight: createPreflightSummaryForTarget(
          options.initialTarget,
          now(),
          repositoryInspections,
          selfInspection,
          repositoryPreflightEngine
        ),
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      })
    : createInitialLaunchState();
  const state = writable<LaunchState>(initialState);

  return {
    applications,
    repositories,
    projectManifest,
    subscribe: state.subscribe,
    getState: () => get(state),
    reset: () => state.set(createInitialLaunchState()),
    selectSelf: () => {
      const target = createSelfLaunchTarget();

      state.set(transitionLaunchState(get(state), 'PREFLIGHT', {
        screen: 'preflight',
        target,
        preflight: createPreflightSummaryForTarget(target, now(), repositoryInspections, selfInspection, repositoryPreflightEngine),
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      }));
    },
    openProjectDashboard: () => {
      state.update((current) => ({
        ...current,
        phase: 'CONTEXT_RESOLVED',
        screen: 'dashboard',
        target: null,
        preflight: null,
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      }));
    },
    selectProject: (project) => {
      const target = createProjectLaunchTarget(project, resolveLaunchProfileForProject(project, projectManifest));

      state.set(transitionLaunchState(get(state), 'PREFLIGHT', {
        screen: 'preflight',
        target,
        preflight: createPreflightSummaryForTarget(target, now(), repositoryInspections, selfInspection, repositoryPreflightEngine),
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      }));
    },
    setRepositoryInspection: (targetKey, inspection) => {
      if (targetKey === 'self') {
        selfInspection = inspection;
      } else {
        repositoryInspections = {
          ...repositoryInspections,
          [targetKey]: inspection,
          [inspection.root]: inspection
        };
      }

      let nextState = get(state);

      state.update((current) => {
        if (!current.target || current.phase !== 'PREFLIGHT') {
          nextState = current;
          return current;
        }

        nextState = {
          ...current,
          preflight: createPreflightSummaryForTarget(
            current.target,
            now(),
            repositoryInspections,
            selfInspection,
            repositoryPreflightEngine
          )
        };

        return nextState;
      });

      return nextState;
    },
    confirmLaunch: () => {
      let nextState = get(state);

      state.update((current) => {
        if (current.phase === 'PLANNED' || current.phase === 'INITIALIZING' || current.phase === 'HYDRATING' || current.phase === 'RUNNING') {
          nextState = current;
          return current;
        }

        if (!current.target || !current.preflight) {
          nextState = {
            ...current,
            error: 'Launch target is not ready.'
          };
          return nextState;
        }

        const plan = runtimePlanEngine.createPlan({
          target: current.target,
          preflight: current.preflight,
          now: now()
        });

        nextState = transitionLaunchState(current, 'PLANNED', {
          screen: 'initializing',
          plan,
          initialization: null,
          hydration: null,
          suspension: null,
          teardown: null,
          recovery: null,
          safeMode: null,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    startInitialization: () => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.plan) {
          nextState = {
            ...current,
            error: 'Runtime plan is unavailable.'
          };
          return nextState;
        }

        const initialization = createRuntimeInitializationSnapshot(current.plan, now());

        nextState = transitionLaunchState(current, 'INITIALIZING', {
          screen: 'initializing',
          initialization,
          hydration: null,
          recovery: null,
          safeMode: null,
          error: initialization.error
        });

        return nextState;
      });

      return nextState;
    },
    completeInitializationStep: (stepId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.initialization) {
          nextState = {
            ...current,
            error: 'Runtime initialization is unavailable.'
          };
          return nextState;
        }

        const resolvedStepId = stepId ?? current.initialization.activeStepId;

        if (!resolvedStepId) {
          nextState = current;
          return current;
        }

        const timestamp = now();
        const initialization = completeRuntimeInitializationStep(current.initialization, resolvedStepId, timestamp, message);
        const hydration =
          initialization.status === 'completed' && current.plan
            ? createRuntimeHydrationSnapshot(current.plan, timestamp)
            : current.hydration;

        nextState = transitionLaunchState(current, initialization.status === 'completed' ? 'HYDRATING' : 'INITIALIZING', {
          screen: 'initializing',
          initialization,
          hydration,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    failInitializationStep: (stepId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.initialization) {
          nextState = {
            ...current,
            error: 'Runtime initialization is unavailable.'
          };
          return nextState;
        }

        const timestamp = now();
        const initialization = failRuntimeInitializationStep(current.initialization, stepId, error, timestamp);
        const recovery = createRecoverySnapshotForState(current, 'initialization-failed', error, timestamp);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          initialization,
          recovery,
          safeMode: null,
          error
        });

        return nextState;
      });

      return nextState;
    },
    startHydration: () => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.plan) {
          nextState = {
            ...current,
            error: 'Runtime plan is unavailable.'
          };
          return nextState;
        }

        const hydration = createRuntimeHydrationSnapshot(current.plan, now());

        nextState = transitionLaunchState(current, 'HYDRATING', {
          screen: 'initializing',
          hydration,
          recovery: null,
          safeMode: null,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    completeHydrationStep: (stepId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.hydration) {
          nextState = {
            ...current,
            error: 'Runtime hydration is unavailable.'
          };
          return nextState;
        }

        const resolvedStepId = stepId ?? current.hydration.activeStepId;

        if (!resolvedStepId) {
          nextState = current;
          return current;
        }

        const hydration = completeRuntimeHydrationStep(current.hydration, resolvedStepId, now(), message);

        nextState = transitionLaunchState(current, hydration.status === 'completed' ? 'RUNNING' : 'HYDRATING', {
          screen: hydration.status === 'completed' ? 'running' : 'initializing',
          hydration,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    failHydrationStep: (stepId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.hydration) {
          nextState = {
            ...current,
            error: 'Runtime hydration is unavailable.'
          };
          return nextState;
        }

        const timestamp = now();
        const hydration = failRuntimeHydrationStep(current.hydration, stepId, error, timestamp);
        const recovery = createRecoverySnapshotForState(current, 'hydration-failed', error, timestamp);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          hydration,
          recovery,
          safeMode: null,
          error
        });

        return nextState;
      });

      return nextState;
    },
    startSuspension: (reason = 'User requested suspension.') => {
      let nextState = get(state);

      state.update((current) => {
        if (current.phase !== 'RUNNING') {
          nextState = {
            ...current,
            error: 'Runtime must be running before suspension.'
          };
          return nextState;
        }

        const suspension = createRuntimeSuspensionSnapshot('suspend', now(), reason);

        nextState = transitionLaunchState(current, 'SUSPENDING', {
          screen: 'running',
          suspension,
          recovery: null,
          safeMode: null,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    completeSuspensionStep: (stepId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.suspension || current.suspension.operation !== 'suspend') {
          nextState = {
            ...current,
            error: 'Runtime suspension is unavailable.'
          };
          return nextState;
        }

        const resolvedStepId = stepId ?? current.suspension.activeStepId;

        if (!resolvedStepId) {
          nextState = current;
          return current;
        }

        const suspension = completeRuntimeSuspensionStep(current.suspension, resolvedStepId, now(), message);

        nextState = transitionLaunchState(current, suspension.status === 'completed' ? 'SUSPENDED' : 'SUSPENDING', {
          screen: 'running',
          suspension,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    failSuspensionStep: (stepId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.suspension || current.suspension.operation !== 'suspend') {
          nextState = {
            ...current,
            error: 'Runtime suspension is unavailable.'
          };
          return nextState;
        }

        const timestamp = now();
        const suspension = failRuntimeSuspensionStep(current.suspension, stepId, error, timestamp);
        const recovery = createRecoverySnapshotForState(current, 'suspension-failed', error, timestamp);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          suspension,
          recovery,
          safeMode: null,
          error
        });

        return nextState;
      });

      return nextState;
    },
    startResume: () => {
      let nextState = get(state);

      state.update((current) => {
        if (current.phase !== 'SUSPENDED' || !current.suspension?.checkpoint) {
          nextState = {
            ...current,
            error: 'Runtime checkpoint is unavailable.'
          };
          return nextState;
        }

        const suspension = createRuntimeSuspensionSnapshot('resume', now(), 'User requested resume.', current.suspension.checkpoint);

        nextState = transitionLaunchState(current, 'RESUMING', {
          screen: 'running',
          suspension,
          recovery: null,
          safeMode: null,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    completeResumeStep: (stepId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.suspension || current.suspension.operation !== 'resume') {
          nextState = {
            ...current,
            error: 'Runtime resume is unavailable.'
          };
          return nextState;
        }

        const resolvedStepId = stepId ?? current.suspension.activeStepId;

        if (!resolvedStepId) {
          nextState = current;
          return current;
        }

        const suspension = completeRuntimeSuspensionStep(current.suspension, resolvedStepId, now(), message);

        nextState = transitionLaunchState(current, suspension.status === 'completed' ? 'RUNNING' : 'RESUMING', {
          screen: 'running',
          suspension,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    failResumeStep: (stepId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.suspension || current.suspension.operation !== 'resume') {
          nextState = {
            ...current,
            error: 'Runtime resume is unavailable.'
          };
          return nextState;
        }

        const timestamp = now();
        const suspension = failRuntimeSuspensionStep(current.suspension, stepId, error, timestamp);
        const recovery = createRecoverySnapshotForState(current, 'resume-failed', error, timestamp);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          suspension,
          recovery,
          safeMode: null,
          error
        });

        return nextState;
      });

      return nextState;
    },
    startTeardown: (reason = 'User requested teardown.') => {
      let nextState = get(state);

      state.update((current) => {
        if (current.phase === 'LAUNCH_GATE' || current.phase === 'TEARDOWN') {
          nextState = current;
          return current;
        }

        const teardown = createRuntimeTeardownSnapshot(now(), reason);

        nextState = transitionLaunchState(current, 'TEARDOWN', {
          screen: 'running',
          teardown,
          recovery: null,
          safeMode: null,
          error: null
        });

        return nextState;
      });

      return nextState;
    },
    completeTeardownStep: (stepId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.teardown) {
          nextState = {
            ...current,
            error: 'Runtime teardown is unavailable.'
          };
          return nextState;
        }

        const resolvedStepId = stepId ?? current.teardown.activeStepId;

        if (!resolvedStepId) {
          nextState = current;
          return current;
        }

        const teardown = completeRuntimeTeardownStep(current.teardown, resolvedStepId, now(), message);

        nextState = teardown.status === 'completed'
          ? {
              ...createInitialLaunchState(),
              teardown
            }
          : transitionLaunchState(current, 'TEARDOWN', {
              screen: 'running',
              teardown,
              error: null
            });

        return nextState;
      });

      return nextState;
    },
    failTeardownStep: (stepId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.teardown) {
          nextState = {
            ...current,
            error: 'Runtime teardown is unavailable.'
          };
          return nextState;
        }

        const timestamp = now();
        const teardown = failRuntimeTeardownStep(current.teardown, stepId, error, timestamp);
        const recovery = createRecoverySnapshotForState(current, 'teardown-failed', error, timestamp);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          teardown,
          recovery,
          safeMode: null,
          error
        });

        return nextState;
      });

      return nextState;
    },
    startRecovery: (cause = 'manual', error = 'Manual recovery requested.') => {
      const current = get(state);
      const recovery = createRecoverySnapshotForState(current, cause, error, now());
      const nextState = transitionLaunchState(current, 'RECOVERY', {
        screen: 'running',
        recovery,
        safeMode: null,
        error
      });

      state.set(nextState);
      return nextState;
    },
    completeRecoveryAction: (actionId, message = null) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.recovery) {
          nextState = {
            ...current,
            error: 'Runtime recovery is unavailable.'
          };
          return nextState;
        }

        const resolvedActionId = actionId ?? current.recovery.activeActionId;

        if (!resolvedActionId) {
          nextState = current;
          return current;
        }

        const recovery = completeRuntimeRecoveryAction(current.recovery, resolvedActionId, now(), message);

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          recovery,
          error: recovery.error
        });

        return nextState;
      });

      return nextState;
    },
    failRecoveryAction: (actionId, error) => {
      let nextState = get(state);

      state.update((current) => {
        if (!current.recovery) {
          nextState = {
            ...current,
            error: 'Runtime recovery is unavailable.'
          };
          return nextState;
        }

        const recovery = failRuntimeRecoveryAction(current.recovery, actionId, error, now());

        nextState = transitionLaunchState(current, 'RECOVERY', {
          screen: 'running',
          recovery,
          error
        });

        return nextState;
      });

      return nextState;
    },
    enterSafeMode: (reason) => {
      const current = get(state);
      const safeMode = createRuntimeSafeModeSnapshot(current.recovery, now(), reason);
      const target = createSelfLaunchTarget();
      const nextState = transitionLaunchState(current, 'SAFE_MODE', {
        screen: 'safe-mode',
        target,
        safeMode,
        error: null
      });

      state.set(nextState);
      return nextState;
    },
    retryFromRecoveryPreflight: () => {
      const current = get(state);
      const target = current.recovery?.report.target ?? current.target ?? createSelfLaunchTarget();
      const nextState = transitionLaunchState(current, 'PREFLIGHT', {
        screen: 'preflight',
        target,
        preflight: createPreflightSummaryForTarget(target, now(), repositoryInspections, selfInspection, repositoryPreflightEngine),
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      });

      state.set(nextState);
      return nextState;
    },
    retryFromSafeMode: () => {
      const target = createSelfLaunchTarget();
      const nextState = transitionLaunchState(get(state), 'PREFLIGHT', {
        screen: 'preflight',
        target,
        preflight: createPreflightSummaryForTarget(target, now(), repositoryInspections, selfInspection, repositoryPreflightEngine),
        plan: null,
        initialization: null,
        hydration: null,
        suspension: null,
        teardown: null,
        recovery: null,
        safeMode: null,
        error: null
      });

      state.set(nextState);
      return nextState;
    },
    transition: (phase, patch = {}) => {
      const nextState = transitionLaunchState(get(state), phase, patch);

      state.set(nextState);
      return nextState;
    }
  };
}

function createPreflightSummaryForTarget(
  target: LaunchTarget,
  timestamp: string,
  repositoryInspections: Record<string, RepositoryInspectionInput>,
  selfInspection: RepositoryInspectionInput | null,
  repositoryPreflightEngine: RepositoryPreflightEngine
) {
  if (target.kind === 'self' && selfInspection) {
    const preflight = createLaunchPreflightSummary(target, timestamp);
    const report = repositoryPreflightEngine.inspect(selfInspection, timestamp);

    return {
      ...preflight,
      repository: report
    };
  }

  if (target.kind !== 'project' || !target.project) {
    return createLaunchPreflightSummary(target, timestamp);
  }

  const inspectionInput = repositoryInspections[target.project.id] ?? repositoryInspections[target.project.root];

  if (!inspectionInput) {
    return createLaunchPreflightSummary(target, timestamp);
  }

  const report = repositoryPreflightEngine.inspect({
    ...inspectionInput,
    label: inspectionInput.label ?? target.project.label,
    root: inspectionInput.root || target.project.root
  }, timestamp);

  return createRepositoryLaunchPreflightSummary(target, report, timestamp);
}

function createRecoverySnapshotForState(
  state: LaunchState,
  cause: RuntimeRecoveryCause,
  error: string,
  timestamp: string
) {
  return createRuntimeRecoverySnapshot({
    phase: state.phase,
    cause,
    target: state.target,
    error
  }, timestamp);
}

function createLaunchProjectOptionFromApp(
  app: WorkbenchProjectApp,
  manifest: WorkbenchProjectManifest
): LaunchProjectOption {
  const repository = app.repositoryId
    ? manifest.repositories.find((candidate) => candidate.id === app.repositoryId)
    : null;

  return {
    id: app.id,
    kind: 'app',
    label: app.label,
    root: app.root,
    description: repository ? `Application profile from ${repository.label}` : 'Application profile',
    icon: app.faviconDataUrl ?? 'app.product-shell'
  };
}

function createLaunchProjectOptionFromRepository(repository: WorkbenchProjectRepository): LaunchProjectOption {
  return {
    id: repository.id,
    kind: 'repository',
    label: repository.label,
    root: repository.root,
    description: 'Repository profile',
    icon: 'action.folder'
  };
}

function resolveLaunchProfileForProject(
  project: LaunchProjectOption,
  manifest: WorkbenchProjectManifest | null
): LaunchProfile {
  if (!manifest) {
    return 'project-workbench';
  }

  const targetProfileId =
    project.kind === 'app'
      ? manifest.apps.find((app) => app.id === project.id)?.defaultLaunchProfileId
      : manifest.repositories.find((repository) => repository.id === project.id)?.defaultLaunchProfileId;

  return resolveProjectDefaultLaunchProfile(manifest, project.kind, targetProfileId)?.kind ?? 'project-workbench';
}

export function createMockLaunchProjectOptions(paths: string[], kind: LaunchProjectKind): LaunchProjectOption[] {
  return paths
    .map((path) => path.trim())
    .filter(Boolean)
    .map((root) => ({
      id: `${kind}:${root}`,
      kind,
      label: formatLaunchProjectLabel(root),
      root,
      description: kind === 'app' ? 'Application profile' : 'Repository profile',
      icon: kind === 'app' ? 'app.product-shell' : 'action.folder'
    }));
}

export function resolveLaunchTargetLabel(target: LaunchTarget | null): string {
  if (!target) {
    return 'No target';
  }

  if (target.kind === 'self') {
    return 'Self / Core-only';
  }

  return target.project?.label ?? 'Project';
}

function formatLaunchProjectLabel(root: string): string {
  const normalized = root.replace(/\\/g, '/').replace(/\/+$/, '');
  const label = normalized.split('/').filter(Boolean).pop() ?? normalized;

  return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Project';
}
