import type { LayoutInteractionState } from '@konitif/workbench';

export type WorkspaceWindowInteractionMode = LayoutInteractionState['mode'];

export type WorkspaceWindowPointerUpAction =
  | 'commit-edge-boundary-pull'
  | 'commit-boundary-pull'
  | 'commit-intersection-resize'
  | 'commit-panel-dock'
  | 'cancel-panel-drag'
  | 'refresh-resize-hover';

export function resolveWorkspaceWindowPointerUpAction(input: {
  interactionMode: WorkspaceWindowInteractionMode;
  hasEdgeIntersectionDragSession: boolean;
  hasHoveredDockTarget: boolean;
}): WorkspaceWindowPointerUpAction {
  if (input.hasEdgeIntersectionDragSession) {
    return input.interactionMode === 'boundary-pull'
      ? 'commit-edge-boundary-pull'
      : 'refresh-resize-hover';
  }

  if (input.interactionMode === 'boundary-pull') {
    return 'commit-boundary-pull';
  }

  if (input.interactionMode === 'intersection-resize') {
    return 'commit-intersection-resize';
  }

  if (input.interactionMode !== 'drag-panel') {
    return 'refresh-resize-hover';
  }

  return input.hasHoveredDockTarget ? 'commit-panel-dock' : 'cancel-panel-drag';
}

export type WorkspaceWindowKeyDownAction =
  | 'cancel-root-resize'
  | 'cancel-panel-drag'
  | 'cancel-boundary-pull'
  | 'cancel-intersection-resize'
  | 'none';

export function resolveWorkspaceWindowKeyDownAction(input: {
  key: string;
  interactionMode: WorkspaceWindowInteractionMode;
  hasRootResizeDeletePreview: boolean;
}): WorkspaceWindowKeyDownAction {
  if (input.key !== 'Escape') {
    return 'none';
  }

  if (input.hasRootResizeDeletePreview) {
    return 'cancel-root-resize';
  }

  if (input.interactionMode === 'drag-panel') {
    return 'cancel-panel-drag';
  }

  if (input.interactionMode === 'boundary-pull') {
    return 'cancel-boundary-pull';
  }

  if (input.interactionMode === 'intersection-resize') {
    return 'cancel-intersection-resize';
  }

  return 'none';
}

export type WorkspaceWindowContextMenuAction =
  | 'cancel-intersection-resize'
  | 'cancel-root-resize'
  | 'none';

export function resolveWorkspaceWindowContextMenuAction(input: {
  interactionMode: WorkspaceWindowInteractionMode;
  hasRootResizeDeletePreview: boolean;
}): WorkspaceWindowContextMenuAction {
  if (input.interactionMode === 'intersection-resize') {
    return 'cancel-intersection-resize';
  }

  if (input.hasRootResizeDeletePreview) {
    return 'cancel-root-resize';
  }

  return 'none';
}
