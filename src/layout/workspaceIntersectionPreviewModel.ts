export interface WorkspaceIntersectionPreviewPoint {
  x: number;
  y: number;
}

export interface WorkspaceIntersectionPreviewDimensions {
  width: number;
  height: number;
}

export interface WorkspaceIntersectionPreviewLine {
  left: number;
  top: number;
  width: number;
  height: number;
  snapped: boolean;
}

export type WorkspaceIntersectionPreviewLineRect = Omit<WorkspaceIntersectionPreviewLine, 'snapped'>;

export interface WorkspaceIntersectionPreviewMeasuredColumn {
  resolvedPositionPx: number;
  containerTop: number;
  containerHeight: number;
  snapped: boolean;
}

export interface WorkspaceIntersectionPreviewMeasuredRow {
  resolvedPositionPx: number;
  containerLeft: number;
  containerWidth: number;
  snapped: boolean;
}

export interface WorkspaceIntersectionPreviewHandle {
  left: number;
  top: number;
  size: number;
  snapped: boolean;
}

export function normalizeWorkspacePreviewSplitSizes(sizes: [number, number], min = 0.02): [number, number] {
  const total = sizes[0] + sizes[1];

  if (!Number.isFinite(total) || total <= 0) {
    return [0.5, 0.5];
  }

  const first = sizes[0] / total;
  const second = sizes[1] / total;
  const safeMin = Math.min(0.5, Math.max(0.02, min));

  if (first < safeMin) {
    return [safeMin, 1 - safeMin];
  }

  if (second < safeMin) {
    return [1 - safeMin, safeMin];
  }

  return [first, second];
}

export function resolveWorkspaceIntersectionResizePreviewSizes(input: {
  anchor: WorkspaceIntersectionPreviewPoint;
  pointer: WorkspaceIntersectionPreviewPoint;
  dimensions: WorkspaceIntersectionPreviewDimensions;
  columnBaseSizes: [number, number];
  rowBaseSizes: [number, number];
  columnMinRatio: number;
  rowMinRatio: number;
}): {
  columnSizes: [number, number];
  rowSizes: [number, number];
} {
  const deltaX = input.pointer.x - input.anchor.x;
  const deltaY = input.pointer.y - input.anchor.y;
  const columnRatioDelta = input.dimensions.width > 0 ? deltaX / input.dimensions.width : 0;
  const rowRatioDelta = input.dimensions.height > 0 ? deltaY / input.dimensions.height : 0;

  return {
    columnSizes: normalizeWorkspacePreviewSplitSizes(
      [
        input.columnBaseSizes[0] + columnRatioDelta,
        input.columnBaseSizes[1] - columnRatioDelta
      ],
      input.columnMinRatio
    ),
    rowSizes: normalizeWorkspacePreviewSplitSizes(
      [
        input.rowBaseSizes[0] + rowRatioDelta,
        input.rowBaseSizes[1] - rowRatioDelta
      ],
      input.rowMinRatio
    )
  };
}

export function resolveWorkspaceIntersectionPreviewHandle(input: {
  columnLine: WorkspaceIntersectionPreviewLine;
  rowLine: WorkspaceIntersectionPreviewLine;
  size: number;
}): WorkspaceIntersectionPreviewHandle {
  const centerX = input.columnLine.left + input.columnLine.width / 2;
  const centerY = input.rowLine.top + input.rowLine.height / 2;

  return {
    left: centerX - input.size / 2,
    top: centerY - input.size / 2,
    size: input.size,
    snapped: input.columnLine.snapped || input.rowLine.snapped
  };
}

export function resolveWorkspaceIntersectionPreviewLines(input: {
  columnMeasured: WorkspaceIntersectionPreviewMeasuredColumn | null;
  rowMeasured: WorkspaceIntersectionPreviewMeasuredRow | null;
  columnFallback: WorkspaceIntersectionPreviewLineRect | null;
  rowFallback: WorkspaceIntersectionPreviewLineRect | null;
}): {
  columnLine: WorkspaceIntersectionPreviewLine | null;
  rowLine: WorkspaceIntersectionPreviewLine | null;
} {
  return {
    columnLine: input.columnMeasured
      ? {
          left: input.columnMeasured.resolvedPositionPx - 0.5,
          top: input.columnMeasured.containerTop,
          width: 1,
          height: input.columnMeasured.containerHeight,
          snapped: input.columnMeasured.snapped
        }
      : toWorkspaceIntersectionPreviewLine(input.columnFallback),
    rowLine: input.rowMeasured
      ? {
          left: input.rowMeasured.containerLeft,
          top: input.rowMeasured.resolvedPositionPx - 0.5,
          width: input.rowMeasured.containerWidth,
          height: 1,
          snapped: input.rowMeasured.snapped
        }
      : toWorkspaceIntersectionPreviewLine(input.rowFallback)
  };
}

function toWorkspaceIntersectionPreviewLine(
  line: WorkspaceIntersectionPreviewLineRect | null
): WorkspaceIntersectionPreviewLine | null {
  return line ? { ...line, snapped: false } : null;
}
