import {
  findVisibleResizeBoundaryBySplitId,
  findVisibleResizeIntersectionTarget,
  resolveVisibleResizeBoundaryLineGeometry,
  type VisibleResizeBoundaryHandle,
  type VisibleResizeIntersectionTarget
} from './visibleLayoutProjection';
import { resolveResizeMagnetSnapFromBoundaries } from './resizeBoundaryPreview';
import {
  updateResizeGestureSession,
  type ResizeGestureMode,
  type ResizeGestureSessionState
} from './resizeGestureEngine';

export interface WorkspaceIntersectionResizePoint {
  x: number;
  y: number;
}

export interface WorkspaceIntersectionResizeDimensions {
  width: number;
  height: number;
}

export interface WorkspaceIntersectionResizeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspaceIntersectionResizeSession {
  columnRootSplitId: string;
  columnBoundaryIndex: number;
  rowRootSplitId: string;
  rowBoundaryIndex: number;
  dimensions: WorkspaceIntersectionResizeDimensions;
  columnGesture: ResizeGestureSessionState;
  rowGesture: ResizeGestureSessionState;
  splitSnapshots: Map<string, [number, number]>;
}

export interface WorkspaceIntersectionResizeUpdateResult {
  session: WorkspaceIntersectionResizeSession;
  snappedPointer: WorkspaceIntersectionResizePoint & {
    columnMagnetKey: string | null;
    rowMagnetKey: string | null;
  };
  dimensions: WorkspaceIntersectionResizeDimensions;
  columnRatioDelta: number | null;
  rowRatioDelta: number | null;
}

export function resolveWorkspaceIntersectionResizeDimensions(input: {
  targets: VisibleResizeIntersectionTarget[];
  columnSplitId: string;
  rowSplitId: string;
}): WorkspaceIntersectionResizeDimensions | null {
  const target = findVisibleResizeIntersectionTarget(input.targets, {
    columnSplitId: input.columnSplitId,
    rowSplitId: input.rowSplitId
  });

  if (!target) {
    return null;
  }

  return {
    width: target.columnContainerWidth,
    height: target.rowContainerHeight
  };
}

export function resolveWorkspaceIntersectionResizeAxisStarts(input: {
  boundaries: VisibleResizeBoundaryHandle[];
  workspaceRect: WorkspaceIntersectionResizeRect;
  columnSplitId: string;
  rowSplitId: string;
}): { columnAxisStartPx: number; rowAxisStartPx: number } | null {
  const columnBoundary = findVisibleResizeBoundaryBySplitId(input.boundaries, input.columnSplitId);
  const rowBoundary = findVisibleResizeBoundaryBySplitId(input.boundaries, input.rowSplitId);

  if (!columnBoundary || !rowBoundary) {
    return null;
  }

  return {
    columnAxisStartPx: columnBoundary.containerRect.left - input.workspaceRect.left,
    rowAxisStartPx: rowBoundary.containerRect.top - input.workspaceRect.top
  };
}

export function resolveWorkspaceIntersectionResizeSnappedPointer(input: {
  enabled: boolean;
  pointer: WorkspaceIntersectionResizePoint;
  dimensions: WorkspaceIntersectionResizeDimensions;
  workspaceRect: WorkspaceIntersectionResizeRect;
  boundaries: VisibleResizeBoundaryHandle[];
  columnSplitId: string;
  rowSplitId: string;
  magnetThresholdPx: number;
}): WorkspaceIntersectionResizePoint & {
  columnMagnetKey: string | null;
  rowMagnetKey: string | null;
} {
  if (!input.enabled) {
    return {
      ...input.pointer,
      columnMagnetKey: null,
      rowMagnetKey: null
    };
  }

  const columnBoundary = findVisibleResizeBoundaryBySplitId(input.boundaries, input.columnSplitId);
  const rowBoundary = findVisibleResizeBoundaryBySplitId(input.boundaries, input.rowSplitId);
  let nextX = input.pointer.x;
  let nextY = input.pointer.y;
  let columnMagnetKey: string | null = null;
  let rowMagnetKey: string | null = null;

  if (columnBoundary) {
    const columnLine = resolveVisibleResizeBoundaryLineGeometry(columnBoundary);
    const columnContainerRect = columnBoundary.containerRect;
    const columnMagnet = resolveResizeMagnetSnapFromBoundaries({
      orientation: columnBoundary.orientation,
      handleSplitId: columnBoundary.splitId,
      containerRect: columnContainerRect as DOMRect,
      candidateBoundaries: input.boundaries,
      axisSizePx: input.dimensions.width,
      crossStartPx: Math.round(columnLine.rect.top - columnContainerRect.top),
      crossSizePx: Math.max(1, Math.round(columnLine.rect.height)),
      currentPositionPx: input.workspaceRect.left + input.pointer.x - columnContainerRect.left,
      magnetThresholdPx: input.magnetThresholdPx
    });

    if (columnMagnet) {
      nextX = columnContainerRect.left + columnMagnet.positionPx - input.workspaceRect.left;
      columnMagnetKey = `${columnMagnet.rootSplitId ?? ''}:${columnMagnet.boundaryIndex ?? ''}:${columnMagnet.splitId}`;
    }
  }

  if (rowBoundary) {
    const rowLine = resolveVisibleResizeBoundaryLineGeometry(rowBoundary);
    const rowContainerRect = rowBoundary.containerRect;
    const rowMagnet = resolveResizeMagnetSnapFromBoundaries({
      orientation: rowBoundary.orientation,
      handleSplitId: rowBoundary.splitId,
      containerRect: rowContainerRect as DOMRect,
      candidateBoundaries: input.boundaries,
      axisSizePx: input.dimensions.height,
      crossStartPx: Math.round(rowLine.rect.left - rowContainerRect.left),
      crossSizePx: Math.max(1, Math.round(rowLine.rect.width)),
      currentPositionPx: input.workspaceRect.top + input.pointer.y - rowContainerRect.top,
      magnetThresholdPx: input.magnetThresholdPx
    });

    if (rowMagnet) {
      nextY = rowContainerRect.top + rowMagnet.positionPx - input.workspaceRect.top;
      rowMagnetKey = `${rowMagnet.rootSplitId ?? ''}:${rowMagnet.boundaryIndex ?? ''}:${rowMagnet.splitId}`;
    }
  }

  return {
    x: nextX,
    y: nextY,
    columnMagnetKey,
    rowMagnetKey
  };
}

export function updateWorkspaceIntersectionResizeSession(input: {
  session: WorkspaceIntersectionResizeSession;
  pointer: WorkspaceIntersectionResizePoint;
  dimensions: WorkspaceIntersectionResizeDimensions;
  mode: ResizeGestureMode;
  snappedPointer: WorkspaceIntersectionResizePoint & {
    columnMagnetKey: string | null;
    rowMagnetKey: string | null;
  };
}): WorkspaceIntersectionResizeUpdateResult {
  const columnUpdate = updateResizeGestureSession({
    session: input.session.columnGesture,
    rawCurrentPosition: input.pointer.x,
    resolvedPosition: input.snappedPointer.x,
    mode: input.mode,
    magnetKey: input.snappedPointer.columnMagnetKey,
    deleteIntent: false
  });
  const rowUpdate = updateResizeGestureSession({
    session: input.session.rowGesture,
    rawCurrentPosition: input.pointer.y,
    resolvedPosition: input.snappedPointer.y,
    mode: input.mode,
    magnetKey: input.snappedPointer.rowMagnetKey,
    deleteIntent: false
  });

  return {
    session: {
      ...input.session,
      dimensions: input.dimensions,
      columnGesture: columnUpdate.session,
      rowGesture: rowUpdate.session
    },
    snappedPointer: input.snappedPointer,
    dimensions: input.dimensions,
    columnRatioDelta: columnUpdate.ratioDelta,
    rowRatioDelta: rowUpdate.ratioDelta
  };
}
