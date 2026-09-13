import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { WorkbenchRuntimeSnapshot, WorkbenchRuntimeWorkspaceDescriptor } from '@konitif/workbench';

const WORKBENCH_RUNTIME_SNAPSHOT_CONTEXT = Symbol.for('workbench.runtimeSnapshot');
const WORKBENCH_RUNTIME_PROJECT_ACTIONS_CONTEXT = Symbol.for('workbench.runtimeProjectActions');

export type WorkbenchRuntimeSnapshotStore = Writable<WorkbenchRuntimeSnapshot | null>;
export interface WorkbenchRuntimeProjectActions {
  loadProject(root: string): Promise<WorkbenchRuntimeWorkspaceDescriptor>;
}

export function createWorkbenchRuntimeSnapshotStore(
  snapshot: WorkbenchRuntimeSnapshot | null = null
): WorkbenchRuntimeSnapshotStore {
  return writable(snapshot);
}

export function setWorkbenchRuntimeSnapshotStore(
  store: WorkbenchRuntimeSnapshotStore
): WorkbenchRuntimeSnapshotStore {
  setContext(WORKBENCH_RUNTIME_SNAPSHOT_CONTEXT, store);
  return store;
}

export function getWorkbenchRuntimeSnapshotStore(): WorkbenchRuntimeSnapshotStore | null {
  return getContext<WorkbenchRuntimeSnapshotStore | null>(WORKBENCH_RUNTIME_SNAPSHOT_CONTEXT) ?? null;
}

export function setWorkbenchRuntimeProjectActions(
  actions: WorkbenchRuntimeProjectActions
): WorkbenchRuntimeProjectActions {
  setContext(WORKBENCH_RUNTIME_PROJECT_ACTIONS_CONTEXT, actions);
  return actions;
}

export function getWorkbenchRuntimeProjectActions(): WorkbenchRuntimeProjectActions | null {
  return getContext<WorkbenchRuntimeProjectActions | null>(WORKBENCH_RUNTIME_PROJECT_ACTIONS_CONTEXT) ?? null;
}
