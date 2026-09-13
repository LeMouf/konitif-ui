import type { LayoutNode } from '@konitif/workbench';

export interface WorkspaceActiveRootSnapshot {
  windowId: string | null;
  root: LayoutNode | null;
}

export interface WorkspaceActiveRootTransition extends WorkspaceActiveRootSnapshot {
  shouldCleanupMutation: boolean;
}

export function createWorkspaceActiveRootSnapshot(): WorkspaceActiveRootSnapshot {
  return {
    windowId: null,
    root: null
  };
}

export function resolveWorkspaceActiveRootTransition(input: {
  previous: WorkspaceActiveRootSnapshot;
  activeWindow: { id: string; root: LayoutNode } | null;
}): WorkspaceActiveRootTransition {
  if (!input.activeWindow) {
    return {
      windowId: null,
      root: null,
      shouldCleanupMutation: false
    };
  }

  const activeWindowChanged = input.previous.windowId !== input.activeWindow.id;
  const rootChanged = input.previous.root !== input.activeWindow.root;

  return {
    windowId: input.activeWindow.id,
    root: input.activeWindow.root,
    shouldCleanupMutation: input.previous.root !== null && rootChanged && !activeWindowChanged
  };
}
