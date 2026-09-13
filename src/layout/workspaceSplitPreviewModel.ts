import type { LayoutEdge } from '@konitif/workbench';
import type { SplitOrientation } from '@konitif/workbench';

export interface WorkspacePreviewRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspacePreviewBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface WorkspacePreviewPoint {
  x: number;
  y: number;
}

export interface WorkspaceSplitPreviewPanelCandidate {
  id: string;
  bounds: WorkspacePreviewBounds;
}

export interface WorkspaceSplitPreviewUpdate {
  panelId: string | null;
  previewRect: WorkspacePreviewRect;
  pointerRatio: number;
}

export function isWorkspacePreviewPointInsideRect(
  point: WorkspacePreviewPoint,
  rect: WorkspacePreviewRect
): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

export function resolveWorkspaceSplitPreviewPointerRatio(
  orientation: SplitOrientation,
  edge: LayoutEdge,
  point: WorkspacePreviewPoint,
  targetRect: WorkspacePreviewRect
): number {
  const axisRatio =
    orientation === 'vertical'
      ? (point.x - targetRect.left) / Math.max(targetRect.width, 1)
      : (point.y - targetRect.top) / Math.max(targetRect.height, 1);

  return edge === 'left' || edge === 'top' ? axisRatio : 1 - axisRatio;
}

export function isWorkspacePreviewPanelOnEdge(
  edge: LayoutEdge,
  panelBounds: WorkspacePreviewBounds,
  workspaceInnerBounds: WorkspacePreviewBounds,
  point: WorkspacePreviewPoint,
  tolerancePx = 2
): boolean {
  if (edge === 'left' || edge === 'right') {
    const touchesEdge =
      edge === 'left'
        ? Math.abs(panelBounds.left - workspaceInnerBounds.left) <= tolerancePx
        : Math.abs(panelBounds.right - workspaceInnerBounds.right) <= tolerancePx;

    return touchesEdge && point.y >= panelBounds.top && point.y <= panelBounds.bottom;
  }

  const touchesEdge =
    edge === 'top'
      ? Math.abs(panelBounds.top - workspaceInnerBounds.top) <= tolerancePx
      : Math.abs(panelBounds.bottom - workspaceInnerBounds.bottom) <= tolerancePx;

  return touchesEdge && point.x >= panelBounds.left && point.x <= panelBounds.right;
}

export function resolveWorkspaceSplitPreviewTargetPanelId(input: {
  edge: LayoutEdge;
  candidates: WorkspaceSplitPreviewPanelCandidate[];
  workspaceInnerBounds: WorkspacePreviewBounds;
  point: WorkspacePreviewPoint;
}): string | null {
  const candidate =
    input.candidates.find((panel) =>
      isWorkspacePreviewPanelOnEdge(input.edge, panel.bounds, input.workspaceInnerBounds, input.point)
    ) ?? null;

  return candidate?.id ?? null;
}

export function resolveWorkspaceSplitPreviewUpdate(input: {
  workspaceRect: WorkspacePreviewRect;
  targetRect: WorkspacePreviewRect;
  targetPanelId: string | null;
  orientation: SplitOrientation;
  edge: LayoutEdge;
  point: WorkspacePreviewPoint;
}): WorkspaceSplitPreviewUpdate {
  return {
    panelId: input.targetPanelId,
    previewRect: {
      left: input.targetRect.left - input.workspaceRect.left,
      top: input.targetRect.top - input.workspaceRect.top,
      width: input.targetRect.width,
      height: input.targetRect.height
    },
    pointerRatio: resolveWorkspaceSplitPreviewPointerRatio(
      input.orientation,
      input.edge,
      input.point,
      input.targetRect
    )
  };
}
