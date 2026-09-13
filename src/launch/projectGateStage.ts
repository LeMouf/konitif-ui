import {
  createStageCamera,
  createStageNode,
  createStageState,
  projectStageState,
  type LaunchPhase,
  type StageProjection,
  type StageState,
  type StageViewport,
} from '@konitif/workbench';

export interface ProjectGateStageEntry {
  id: string;
  tone?: string;
}

export interface CreateProjectGateStageOptions {
  quickLaunches?: readonly ProjectGateStageEntry[];
  focusEntryId?: string;
  activePhase?: LaunchPhase;
  activeStageStep?: ProjectGateStageStepId;
}

export type ProjectGateStageStepId = -1 | 0 | 1 | 2;
export type ProjectGateStageMonitorState = 'done' | 'current' | 'pending';

export interface ProjectGateStageMonitorStep {
  id: string;
  label: string;
  stageStep: ProjectGateStageStepId;
  phases: readonly LaunchPhase[];
}

export interface ProjectGateStageMonitorItem {
  id: string;
  label: string;
  stageStep: ProjectGateStageStepId;
  state: ProjectGateStageMonitorState;
  x: number;
  y: number;
  depth: number;
  opacity: number;
}

export const PROJECT_GATE_STAGE_MONITOR_STEPS: readonly ProjectGateStageMonitorStep[] = [
  {
    id: 'self-menu',
    label: 'Self',
    stageStep: -1,
    phases: [],
  },
  {
    id: 'context',
    label: 'Context',
    stageStep: 0,
    phases: ['BOOT', 'LAUNCH_GATE'],
  },
  {
    id: 'preflight',
    label: 'Preflight',
    stageStep: 1,
    phases: ['CONTEXT_RESOLVED', 'PREFLIGHT', 'PLANNED'],
  },
  {
    id: 'runtime',
    label: 'Runtime',
    stageStep: 2,
    phases: [
      'INITIALIZING',
      'HYDRATING',
      'RUNNING',
      'SUSPENDING',
      'SUSPENDED',
      'RESUMING',
      'TEARDOWN',
      'RECOVERY',
      'SAFE_MODE',
    ],
  },
];

export function createProjectGateStageState(options: CreateProjectGateStageOptions = {}): StageState {
  const quickLaunches = options.quickLaunches ?? [];
  const activePhase = options.activePhase ?? 'LAUNCH_GATE';
  const activeStageStep = options.activeStageStep ?? resolveProjectGateStageStepFromPhase(activePhase);
  const nodes = {
    'entry-self': createStageNode('entry-self', 'panel', {
      position: { x: -310, y: -80, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      metadata: { role: 'entrypoint', tone: 'self' },
    }),
    'entry-project': createStageNode('entry-project', 'panel', {
      position: { x: 310, y: -80, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      metadata: { role: 'entrypoint', tone: 'project' },
    }),
    ...Object.fromEntries(
      quickLaunches.map((entry, index) => [
        `quick-${entry.id}`,
        createStageNode(`quick-${entry.id}`, 'panel', {
          position: { x: -360 + index * 360, y: 120, z: 120 },
          scale: { x: 0.92, y: 0.92, z: 1 },
          opacity: 0.92,
          metadata: { role: 'quick-launch', tone: entry.tone ?? 'repository' },
        }),
      ]),
    ),
    ...Object.fromEntries(
      PROJECT_GATE_STAGE_MONITOR_STEPS.map((step, index) => {
        const state = resolveProjectGateStageMonitorState(activeStageStep, step.stageStep);

        return [
          `monitor-${step.id}`,
          createStageNode(`monitor-${step.id}`, 'overlay', {
            position: { x: -54 + index * 36, y: 332, z: 80 },
            scale: state === 'current' ? { x: 1.08, y: 1.08, z: 1 } : { x: 1, y: 1, z: 1 },
            opacity: state === 'current' ? 1 : state === 'done' ? 0.78 : 0.58,
            zIndex: 20,
            metadata: { role: 'stage-monitor', label: step.label, state },
          }),
        ];
      }),
    ),
  };

  return createStageState({
    camera: createStageCamera({
      position: { x: 0, y: 0, z: -120 },
      rotation: { x: 0, y: 0, z: 0 },
      perspective: 980,
    }),
    nodes,
    ambient: {
      focusNodeId: options.focusEntryId ?? 'entry-project',
      depthIntensity: 0.62,
      fogIntensity: 0.34,
      lightIntensity: 0.62,
      motionIntensity: 0.18,
      parallaxIntensity: 0.42,
      tint: 'launch-gate',
      metadata: { source: 'project-gate-stage' },
    },
  });
}

export function createProjectGateStageProjection(
  viewport: StageViewport,
  options: CreateProjectGateStageOptions = {},
): StageProjection {
  return projectStageState(createProjectGateStageState(options), viewport);
}

export function createProjectGateStageMonitorItems(
  projection: StageProjection,
  activeStageStep: ProjectGateStageStepId,
): ProjectGateStageMonitorItem[] {
  return PROJECT_GATE_STAGE_MONITOR_STEPS.map((step) => {
    const projectedNode = projection.nodes.find((node) => node.id === `monitor-${step.id}`);

    return {
      id: step.id,
      label: step.label,
      stageStep: step.stageStep,
      state: resolveProjectGateStageMonitorState(activeStageStep, step.stageStep),
      x: projectedNode?.x ?? 0,
      y: projectedNode?.y ?? 0,
      depth: projectedNode?.depth ?? 0,
      opacity: projectedNode?.opacity ?? 1,
    };
  });
}

export function resolveProjectGateStageMonitorIndex(phase: LaunchPhase): number {
  const stageStep = resolveProjectGateStageStepFromPhase(phase);
  const index = PROJECT_GATE_STAGE_MONITOR_STEPS.findIndex((step) => step.stageStep === stageStep);

  return index === -1 ? 0 : index;
}

export function resolveProjectGateStageMonitorState(
  activeStageStep: ProjectGateStageStepId,
  stageStep: ProjectGateStageStepId,
): ProjectGateStageMonitorState {
  if (stageStep < activeStageStep) {
    return 'done';
  }

  if (stageStep === activeStageStep) {
    return 'current';
  }

  return 'pending';
}

export function resolveProjectGateStageStepFromPhase(phase: LaunchPhase): ProjectGateStageStepId {
  const step = PROJECT_GATE_STAGE_MONITOR_STEPS.find((item) => item.phases.includes(phase));

  return step?.stageStep ?? 0;
}
