import type { LayoutEdge, LayoutMenuTarget, Workspace } from '@konitif/workbench';
import { canJoinPanelArea, canSwapPanelArea } from '@konitif/workbench';

export type PendingWorkspaceLayoutMenuAction =
  | { id: 'split:vertical'; kind: 'split'; orientation: 'vertical' }
  | { id: 'split:horizontal'; kind: 'split'; orientation: 'horizontal' }
  | { id: 'join-areas'; kind: 'join' }
  | { id: 'swap-areas'; kind: 'swap' };

export interface WorkspaceLayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspaceLayoutMenuTargetRect extends WorkspaceLayoutRect {
  targetId: string;
}

export function toPendingWorkspaceLayoutMenuAction(actionId: string): PendingWorkspaceLayoutMenuAction | null {
  if (actionId === 'split:vertical') {
    return { id: actionId, kind: 'split', orientation: 'vertical' };
  }

  if (actionId === 'split:horizontal') {
    return { id: actionId, kind: 'split', orientation: 'horizontal' };
  }

  if (actionId === 'join-areas') {
    return { id: actionId, kind: 'join' };
  }

  if (actionId === 'swap-areas') {
    return { id: actionId, kind: 'swap' };
  }

  return null;
}

export function isWorkspaceLayoutMenuTargetEligible(
  workspace: Workspace,
  target: LayoutMenuTarget,
  action: PendingWorkspaceLayoutMenuAction
): boolean {
  if (action.kind === 'split') {
    return true;
  }

  if (action.kind === 'join') {
    return canJoinPanelArea(workspace, {
      panelId: target.panelId,
      edge: target.edge
    });
  }

  return canSwapPanelArea(workspace, {
    panelId: target.panelId,
    edge: target.edge
  });
}

export function resolveWorkspaceLayoutActionTargetPanelIds(
  target: LayoutMenuTarget,
  kind: PendingWorkspaceLayoutMenuAction['kind'],
  source: 'workspace-edge' | 'split-boundary' | 'panel-menu' | null
): string[] {
  if (source === 'panel-menu') {
    if (kind === 'join') {
      return [...target.joinSiblingPanelIds];
    }

    if (kind === 'swap') {
      return [...target.swapSiblingPanelIds];
    }
  }

  if (kind === 'join' || kind === 'swap') {
    return [...target.areaPanelIds];
  }

  return [target.panelId];
}

export function resolveSelectableWorkspaceLayoutMenuTargets(input: {
  targets: LayoutMenuTarget[];
  action: PendingWorkspaceLayoutMenuAction;
  isTargetEligible: (target: LayoutMenuTarget, action: PendingWorkspaceLayoutMenuAction) => boolean;
  panelMenuBoundaryCandidates?: LayoutMenuTarget[] | null;
}): LayoutMenuTarget[] {
  if (input.action.kind === 'split') {
    return input.targets.filter((target) => input.isTargetEligible(target, input.action));
  }

  if (input.panelMenuBoundaryCandidates) {
    return input.panelMenuBoundaryCandidates;
  }

  const siblingKey = input.action.kind === 'join' ? 'joinSiblingPanelIds' : 'swapSiblingPanelIds';
  const groupedTargets = new Map<string, LayoutMenuTarget>();

  for (const target of input.targets) {
    if (
      !input.isTargetEligible(target, input.action) ||
      target[siblingKey].length === 0 ||
      groupedTargets.has(target.areaId)
    ) {
      continue;
    }

    groupedTargets.set(target.areaId, target);
  }

  return Array.from(groupedTargets.values());
}

export function clampWorkspaceSplitSegmentIndex(segmentIndex: number, cuts: number): number {
  const maxIndex = Math.max(0, cuts);

  return Math.max(0, Math.min(maxIndex, Math.round(segmentIndex)));
}

export function resolveWorkspaceLayoutRectFromPanelRects(
  rects: WorkspaceLayoutRect[]
): WorkspaceLayoutRect | null {
  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

export function isWorkspacePanelMenuBoundaryCandidateAligned(input: {
  edge: LayoutEdge;
  sourceRect: WorkspaceLayoutRect;
  siblingRect: WorkspaceLayoutRect;
  minOverlapRatio?: number;
  minSizeRatio?: number;
  maxSizeRatio?: number;
}): boolean {
  const minOverlapRatio = input.minOverlapRatio ?? 0.9;
  const minSizeRatio = input.minSizeRatio ?? 0.9;
  const maxSizeRatio = input.maxSizeRatio ?? 1.1;

  if (input.edge === 'left' || input.edge === 'right') {
    const overlapStart = Math.max(input.sourceRect.top, input.siblingRect.top);
    const overlapEnd = Math.min(
      input.sourceRect.top + input.sourceRect.height,
      input.siblingRect.top + input.siblingRect.height
    );
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const overlapRatio = overlap / Math.max(input.sourceRect.height, 1);
    const heightRatio = input.siblingRect.height / Math.max(input.sourceRect.height, 1);

    return overlapRatio >= minOverlapRatio && heightRatio >= minSizeRatio && heightRatio <= maxSizeRatio;
  }

  const overlapStart = Math.max(input.sourceRect.left, input.siblingRect.left);
  const overlapEnd = Math.min(
    input.sourceRect.left + input.sourceRect.width,
    input.siblingRect.left + input.siblingRect.width
  );
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const overlapRatio = overlap / Math.max(input.sourceRect.width, 1);
  const widthRatio = input.siblingRect.width / Math.max(input.sourceRect.width, 1);

  return overlapRatio >= minOverlapRatio && widthRatio >= minSizeRatio && widthRatio <= maxSizeRatio;
}

export function resolveDefaultWorkspaceLayoutMenuTargetId(input: {
  candidateIds: string[];
  candidateRects: WorkspaceLayoutMenuTargetRect[];
  anchor: { x: number; y: number };
  source: 'workspace-edge' | 'split-boundary' | 'panel-menu';
  edge: LayoutEdge;
}): string | null {
  const fallbackTargetId = input.candidateIds[0] ?? null;

  if (input.candidateIds.length === 0 || input.candidateRects.length === 0) {
    return fallbackTargetId;
  }

  const containingRect = input.candidateRects.find((rect) =>
    input.anchor.x >= rect.left &&
    input.anchor.x <= rect.left + rect.width &&
    input.anchor.y >= rect.top &&
    input.anchor.y <= rect.top + rect.height
  );

  if (containingRect) {
    return containingRect.targetId;
  }

  const nearestRect = input.candidateRects.reduce(
    (best, rect) => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance =
        input.source === 'panel-menu'
          ? Math.hypot(input.anchor.x - centerX, input.anchor.y - centerY)
          : resolveWorkspaceLayoutAxisDistance(input.edge, input.anchor, rect);

      if (!best || distance < best.distance) {
        return { targetId: rect.targetId, distance };
      }

      return best;
    },
    null as { targetId: string; distance: number } | null
  );

  return nearestRect?.targetId ?? fallbackTargetId;
}

export function resolveWorkspaceLayoutMenuTargetIdAtPoint(input: {
  candidateRects: WorkspaceLayoutMenuTargetRect[];
  point: { x: number; y: number };
}): string | null {
  const hoveredRect =
    input.candidateRects.find(
      (rect) =>
        input.point.x >= rect.left &&
        input.point.x <= rect.left + rect.width &&
        input.point.y >= rect.top &&
        input.point.y <= rect.top + rect.height
    ) ?? null;

  return hoveredRect?.targetId ?? null;
}

export function resolveWorkspaceLayoutEdgeProjectedTargetId(input: {
  edge: LayoutEdge;
  candidateRects: WorkspaceLayoutMenuTargetRect[];
  point: { x: number; y: number };
}): string | null {
  const matchingRects =
    input.edge === 'left' || input.edge === 'right'
      ? input.candidateRects.filter(
          (rect) => input.point.y >= rect.top && input.point.y <= rect.top + rect.height
        )
      : input.candidateRects.filter(
          (rect) => input.point.x >= rect.left && input.point.x <= rect.left + rect.width
        );

  if (matchingRects.length === 0) {
    return null;
  }

  if (matchingRects.length === 1) {
    return matchingRects[0].targetId;
  }

  const pointerAxis = input.edge === 'left' || input.edge === 'right' ? input.point.y : input.point.x;
  const nearestRect = matchingRects.reduce(
    (best, rect) => {
      const center =
        input.edge === 'left' || input.edge === 'right'
          ? rect.top + rect.height / 2
          : rect.left + rect.width / 2;
      const distance = Math.abs(pointerAxis - center);

      if (!best || distance < best.distance) {
        return {
          targetId: rect.targetId,
          distance
        };
      }

      return best;
    },
    null as { targetId: string; distance: number } | null
  );

  return nearestRect?.targetId ?? null;
}

function resolveWorkspaceLayoutAxisDistance(
  edge: LayoutEdge,
  anchor: { x: number; y: number },
  rect: WorkspaceLayoutRect
): number {
  const rectCenter = edge === 'left' || edge === 'right'
    ? rect.top + rect.height / 2
    : rect.left + rect.width / 2;
  const pointerAxis = edge === 'left' || edge === 'right' ? anchor.y : anchor.x;

  return Math.abs(pointerAxis - rectCenter);
}
