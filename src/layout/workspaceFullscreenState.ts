import type { Workspace } from '@konitif/workbench';
import {
  findStackContainingPanelInWorkspace,
  findStackInWorkspace
} from '@konitif/workbench';

export function resolveWorkspaceFullscreenStackId(workspace: Workspace): string | null {
  const fullscreenPanelId = workspace.fullscreenPanelId ?? null;

  if (!fullscreenPanelId) {
    return null;
  }

  return findStackContainingPanelInWorkspace(workspace, fullscreenPanelId)?.id ?? null;
}

export function resolveWorkspaceFullscreenPanelSync(input: {
  workspace: Workspace;
  fullscreenStackId: string | null;
}): string | null | undefined {
  if (!input.fullscreenStackId) {
    return undefined;
  }

  const fullscreenStack = findStackInWorkspace(input.workspace, input.fullscreenStackId);

  if (!fullscreenStack) {
    return null;
  }

  const persistedFullscreenPanelId = input.workspace.fullscreenPanelId ?? null;

  return fullscreenStack.activeChildId === persistedFullscreenPanelId
    ? undefined
    : fullscreenStack.activeChildId;
}

export function shouldClearMissingWorkspaceFullscreenStack(input: {
  workspace: Workspace;
  fullscreenStackId: string | null;
}): boolean {
  return !!input.fullscreenStackId && !findStackInWorkspace(input.workspace, input.fullscreenStackId);
}
