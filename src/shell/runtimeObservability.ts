import type { WorkbenchRuntimeProjectionTarget, WorkbenchRuntimeSnapshot } from '@konitif/workbench';

export type RuntimeProjectionTarget = WorkbenchRuntimeProjectionTarget;

export type RuntimeProjectionViewerOption = {
  id: string;
  title: string;
  summary: string;
  version: string;
  priority: number;
  selected: boolean;
};

export type RuntimeProjectionActionPhase =
  | 'opening'
  | 'opened'
  | 'refreshing'
  | 'requested'
  | 'invalidated'
  | 'reloaded'
  | 'error';

export type RuntimeProjectionActionState = {
  phase: RuntimeProjectionActionPhase;
  target: RuntimeProjectionTarget;
  startedAt: string;
  message: string;
};

export function createRuntimeProjectionActionState(
  phase: RuntimeProjectionActionPhase,
  target: RuntimeProjectionTarget,
  error?: unknown
): RuntimeProjectionActionState {
  return {
    phase,
    target,
    startedAt: new Date().toISOString(),
    message: resolveRuntimeProjectionActionMessage(phase, target, error)
  };
}

export function resolveRuntimeProjectionActionStatus(
  state: RuntimeProjectionActionState | null,
  events: WorkbenchRuntimeSnapshot['events']
): RuntimeProjectionActionState | null {
  if (!state) {
    return null;
  }

  const matchingEvent = events.find((event) => {
    const target = resolveRuntimeProjectionTarget(event.payload);

    return (
      target?.projectionKind === state.target.projectionKind &&
      target.sourceFile === state.target.sourceFile &&
      Date.parse(event.receivedAt) >= Date.parse(state.startedAt) &&
      (event.type === 'projection.invalidated' ||
        event.type === 'projection.loaded' ||
        event.type === 'projection.error')
    );
  });

  if (!matchingEvent) {
    return state;
  }

  const nextPhase =
    matchingEvent.type === 'projection.loaded'
      ? 'reloaded'
      : matchingEvent.type === 'projection.error'
        ? 'error'
        : 'invalidated';

  return {
    ...state,
    phase: nextPhase,
    message: resolveRuntimeProjectionActionMessage(nextPhase, state.target, matchingEvent.payload)
  };
}

export function resolveRuntimeProjectionActionMessage(
  phase: RuntimeProjectionActionPhase,
  target: RuntimeProjectionTarget,
  detail?: unknown
): string {
  const prefix = `${target.projectionKind} · ${target.sourceFile}`;

  switch (phase) {
    case 'opening':
      return `Opening ${prefix}.`;
    case 'opened':
      return `Opened ${prefix}.`;
    case 'refreshing':
      return `Requesting refresh for ${prefix}.`;
    case 'requested':
      return `Refresh requested for ${prefix}.`;
    case 'invalidated':
      return `Cache invalidated for ${prefix}.`;
    case 'reloaded':
      return `Projection reloaded for ${prefix}.`;
    case 'error':
    default:
      return `${prefix}: ${resolveRuntimeProjectionActionErrorMessage(detail)}`;
  }
}

export function resolveRuntimeProjectionActionErrorMessage(detail: unknown): string {
  if (detail instanceof Error) {
    return detail.message;
  }

  if (detail && typeof detail === 'object') {
    const payload = detail as Record<string, unknown>;
    const message = typeof payload.message === 'string' ? payload.message : null;

    if (message) {
      return message;
    }
  }

  return detail ? String(detail) : 'runtime projection action failed';
}

export function resolveRuntimeProjectionTarget(value: unknown): RuntimeProjectionTarget | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const projectionKind = typeof payload.projectionKind === 'string' ? payload.projectionKind : null;
  const sourceFile = typeof payload.sourceFile === 'string' ? payload.sourceFile : null;

  if (!projectionKind || !sourceFile) {
    return null;
  }

  return {
    projectionKind,
    sourceFile
  };
}

export function createRuntimeEventKey(event: WorkbenchRuntimeSnapshot['events'][number]): string {
  return `${event.type}:${event.receivedAt}`;
}

export function formatRuntimeEventPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return payload == null ? 'empty payload' : String(payload);
  }

  const eventPayload = payload as Record<string, unknown>;
  const sourceFile = typeof eventPayload.sourceFile === 'string' ? eventPayload.sourceFile : null;
  const projectionKind = typeof eventPayload.projectionKind === 'string' ? eventPayload.projectionKind : null;
  const cacheStatus = typeof eventPayload.cacheStatus === 'string' ? eventPayload.cacheStatus : null;
  const layerCount = typeof eventPayload.layerCount === 'number' ? `${eventPayload.layerCount} layers` : null;
  const message = typeof eventPayload.message === 'string' ? eventPayload.message : null;
  const summary = [projectionKind, cacheStatus, layerCount, sourceFile, message].filter(Boolean).join(' · ');

  return summary || JSON.stringify(payload) || 'payload';
}

export function formatRuntimeEventJson(payload: unknown): string {
  if (payload === undefined) {
    return 'undefined';
  }

  try {
    return JSON.stringify(payload, null, 2) ?? 'null';
  } catch {
    return String(payload);
  }
}
