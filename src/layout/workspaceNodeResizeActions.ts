import type { LayoutEdge, LayoutMenuTarget } from '@konitif/workbench';
import { resolveSplitHandleMenuTargets } from '@konitif/workbench';
import type { ResizeDeletePreview } from './resizeBoundaryPreview';
import type { FlattenedSplitHandle } from './splitChain';
import type { WorkspaceNodeResizeDragSession } from './workspaceNodeResizeController';

export interface WorkspaceNodeResizeState {
  canceledResizeSplitId: string | null;
  resizeDeletePreview: ResizeDeletePreview | null;
  resizeDragSession: WorkspaceNodeResizeDragSession | null;
}

export interface WorkspaceNodeResizeHandleMenuResolution extends WorkspaceNodeResizeState {
  menu: {
    panelId: string | null;
    edge: LayoutEdge;
    anchor: { x: number; y: number };
    targets: LayoutMenuTarget[];
  } | null;
}

export function cancelWorkspaceNodeResizePreview(input: {
  resizeDeletePreview: ResizeDeletePreview | null;
  fallbackSplitId?: string | null;
}): WorkspaceNodeResizeState | null {
  const canceledResizeSplitId = input.resizeDeletePreview?.splitId ?? input.fallbackSplitId ?? null;

  if (!canceledResizeSplitId) {
    return null;
  }

  return {
    canceledResizeSplitId,
    resizeDeletePreview: null,
    resizeDragSession: null
  };
}

export function resolveWorkspaceNodeResizeHandleMenu(input: {
  handle: FlattenedSplitHandle;
  clientX: number;
  clientY: number;
  layoutEditingEnabled: boolean;
}): WorkspaceNodeResizeHandleMenuResolution | null {
  if (!input.layoutEditingEnabled) {
    return null;
  }

  const targets = resolveSplitHandleMenuTargets(input.handle.split);

  return {
    canceledResizeSplitId: input.handle.splitId,
    resizeDeletePreview: null,
    resizeDragSession: null,
    menu: targets[0]
      ? {
          panelId: targets[0].panelId,
          edge: targets[0].edge,
          anchor: { x: input.clientX, y: input.clientY },
          targets
        }
      : null
  };
}
