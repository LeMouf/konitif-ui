import type { DesignSystemThemeSession } from '@konitif/workbench';
import { createDesignSystemThemeSession } from '@konitif/workbench';

export interface DesignSystemThemeDraftState {
  values: Record<string, string>;
  past: Array<Record<string, string>>;
  future: Array<Record<string, string>>;
  activeTransaction: Record<string, string> | null;
}

export interface DesignSystemThemeDraftStatus {
  draftCount: number;
  canUndo: boolean;
  canRedo: boolean;
  isTransactionOpen: boolean;
}

const MAX_DESIGN_THEME_DRAFT_HISTORY = 80;

export function createDesignSystemThemeDraftState(
  values: Record<string, string> = {}
): DesignSystemThemeDraftState {
  return {
    values: { ...values },
    past: [],
    future: [],
    activeTransaction: null
  };
}

export function createDesignSystemThemeDraftStateFromSession(
  session: DesignSystemThemeSession | null | undefined
): DesignSystemThemeDraftState {
  return {
    values: { ...(session?.draftValues ?? {}) },
    past: session?.draftPast.map((entry) => ({ ...entry })) ?? [],
    future: session?.draftFuture.map((entry) => ({ ...entry })) ?? [],
    activeTransaction: null
  };
}

export function createDesignSystemThemeSessionFromDraftState(
  state: DesignSystemThemeDraftState,
  mode: DesignSystemThemeSession['mode'] = 'dark'
): DesignSystemThemeSession {
  return createDesignSystemThemeSession({
    mode,
    draftValues: state.values,
    draftPast: state.past,
    draftFuture: state.future
  });
}

export function beginDesignSystemThemeDraftTransaction(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftState {
  if (state.activeTransaction) {
    return state;
  }

  return {
    ...state,
    activeTransaction: state.values
  };
}

export function commitDesignSystemThemeDraftTransaction(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftState {
  if (!state.activeTransaction) {
    return state;
  }

  if (areDraftValuesEqual(state.activeTransaction, state.values)) {
    return {
      ...state,
      activeTransaction: null
    };
  }

  return {
    values: state.values,
    past: pushDraftHistoryEntry(state.past, state.activeTransaction),
    future: [],
    activeTransaction: null
  };
}

export function cancelDesignSystemThemeDraftTransaction(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftState {
  if (!state.activeTransaction) {
    return state;
  }

  return {
    values: state.activeTransaction,
    past: state.past,
    future: state.future,
    activeTransaction: null
  };
}

export function setDesignSystemThemeDraftValue(
  state: DesignSystemThemeDraftState,
  variable: string,
  value: string
): DesignSystemThemeDraftState {
  return commitDesignSystemThemeDraftTransaction({
    ...beginDesignSystemThemeDraftTransaction(state),
    values: {
      ...state.values,
      [variable]: value
    }
  });
}

export function mergeDesignSystemThemeDraftValues(
  state: DesignSystemThemeDraftState,
  values: Record<string, string>
): DesignSystemThemeDraftState {
  if (Object.keys(values).length === 0) {
    return state;
  }

  return commitDesignSystemThemeDraftTransaction({
    ...beginDesignSystemThemeDraftTransaction(state),
    values: {
      ...state.values,
      ...values
    }
  });
}

export function resetDesignSystemThemeDraftValue(
  state: DesignSystemThemeDraftState,
  variable: string
): DesignSystemThemeDraftState {
  if (!(variable in state.values)) {
    return state;
  }

  const nextValues = { ...state.values };
  delete nextValues[variable];

  return commitDesignSystemThemeDraftTransaction({
    ...beginDesignSystemThemeDraftTransaction(state),
    values: nextValues
  });
}

export function undoDesignSystemThemeDraft(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftState {
  const previousValues = state.past[state.past.length - 1];

  if (!previousValues) {
    return state;
  }

  return {
    values: previousValues,
    past: state.past.slice(0, -1),
    future: pushDraftHistoryEntry(state.future, state.values),
    activeTransaction: null
  };
}

export function redoDesignSystemThemeDraft(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftState {
  const nextValues = state.future[state.future.length - 1];

  if (!nextValues) {
    return state;
  }

  return {
    values: nextValues,
    past: pushDraftHistoryEntry(state.past, state.values),
    future: state.future.slice(0, -1),
    activeTransaction: null
  };
}

export function createDesignSystemThemeDraftStatus(
  state: DesignSystemThemeDraftState
): DesignSystemThemeDraftStatus {
  return {
    draftCount: Object.keys(state.values).length,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    isTransactionOpen: Boolean(state.activeTransaction)
  };
}

export function serializeDesignSystemThemeDraft(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([variable, value]) => `${variable}: ${value};`)
    .join('\n');
}

function pushDraftHistoryEntry(
  entries: Array<Record<string, string>>,
  values: Record<string, string>
): Array<Record<string, string>> {
  return [...entries, values].slice(-MAX_DESIGN_THEME_DRAFT_HISTORY);
}

function areDraftValuesEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([key, value]) => right[key] === value);
}
