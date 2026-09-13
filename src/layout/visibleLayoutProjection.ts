import type { LayoutEdge } from '@konitif/workbench';

export interface VisibleResizeIntersectionTarget {
  id: string;
  columnSplitId: string;
  columnRootSplitId: string;
  columnBoundaryIndex: number;
  rowSplitId: string;
  rowRootSplitId: string;
  rowBoundaryIndex: number;
  left: number;
  top: number;
  size: number;
  columnContainerWidth: number;
  rowContainerHeight: number;
}

export interface VisibleEdgeIntersectionTarget {
  id: string;
  edge: LayoutEdge;
  splitId: string;
  rootSplitId: string;
  boundaryIndex: number;
  left: number;
  top: number;
  size: number;
}

export interface VisibleLayoutViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface VisibleWorkspaceEdgeLinePositions {
  leftX: number;
  rightX: number;
  topY: number;
  bottomY: number;
}

export interface VisibleWorkspaceCornerPositions {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface VisibleResizeBoundaryHandle {
  splitId: string;
  rootSplitId: string;
  boundaryIndex: number;
  orientation: 'horizontal' | 'vertical';
  rect: { left: number; top: number; width: number; height: number };
  containerRect: { left: number; top: number; width: number; height: number };
}

export interface VisibleResizeBoundaryLineGeometry {
  splitOrientation: 'horizontal' | 'vertical';
  lineOrientation: 'horizontal' | 'vertical';
  rect: { left: number; top: number; width: number; height: number };
  position: number;
  spanStart: number;
  spanEnd: number;
}

export function resolveVisibleWorkspaceEdgeLinePositions(
  workspaceElement: HTMLElement,
  edgeLineOffsetPx: number
): VisibleWorkspaceEdgeLinePositions {
  return {
    leftX: edgeLineOffsetPx + 0.5,
    rightX: workspaceElement.clientWidth - edgeLineOffsetPx - 0.5,
    topY: edgeLineOffsetPx + 0.5,
    bottomY: workspaceElement.clientHeight - edgeLineOffsetPx - 0.5
  };
}

export function resolveVisibleWorkspaceCornerPositions(
  workspaceElement: HTMLElement,
  edgeLineOffsetPx: number
): VisibleWorkspaceCornerPositions {
  const lines = resolveVisibleWorkspaceEdgeLinePositions(workspaceElement, edgeLineOffsetPx);

  return {
    topLeft: { x: lines.leftX, y: lines.topY },
    topRight: { x: lines.rightX, y: lines.topY },
    bottomLeft: { x: lines.leftX, y: lines.bottomY },
    bottomRight: { x: lines.rightX, y: lines.bottomY }
  };
}

export function resolveVisibleResizeBoundaryLineGeometry(
  boundary: VisibleResizeBoundaryHandle
): VisibleResizeBoundaryLineGeometry {
  if (boundary.orientation === 'horizontal') {
    return {
      splitOrientation: boundary.orientation,
      lineOrientation: 'vertical',
      rect: {
        left: boundary.rect.left + boundary.rect.width / 2 - 0.5,
        top: boundary.containerRect.top,
        width: 1,
        height: boundary.containerRect.height
      },
      position: boundary.rect.left + boundary.rect.width / 2,
      spanStart: boundary.containerRect.top,
      spanEnd: boundary.containerRect.top + boundary.containerRect.height
    };
  }

  return {
    splitOrientation: boundary.orientation,
    lineOrientation: 'horizontal',
    rect: {
      left: boundary.containerRect.left,
      top: boundary.rect.top + boundary.rect.height / 2 - 0.5,
      width: boundary.containerRect.width,
      height: 1
    },
    position: boundary.rect.top + boundary.rect.height / 2,
    spanStart: boundary.containerRect.left,
    spanEnd: boundary.containerRect.left + boundary.containerRect.width
  };
}

export function resolveVisibleResizeBoundaries(workspaceElement: HTMLElement): VisibleResizeBoundaryHandle[] {
  return Array.from(
    workspaceElement.querySelectorAll<HTMLElement>('.resize-handle[data-split-id][data-split-orientation]')
  )
    .map((element) => resolveVisibleResizeBoundaryFromElement(element))
    .filter((value): value is VisibleResizeBoundaryHandle => !!value);
}

export function resolveVisibleSplitContentAxisSizePx(
  splitElement: HTMLElement,
  orientation: 'horizontal' | 'vertical'
): number {
  const axisSizePx = orientation === 'horizontal' ? splitElement.clientWidth : splitElement.clientHeight;
  const handleTrackSizePx = Array.from(splitElement.children).reduce((total, child) => {
    const handle = child as HTMLElement;
    if (!handle.classList?.contains('resize-handle') || handle.dataset?.splitOrientation !== orientation) {
      return total;
    }
    const rect = handle.getBoundingClientRect();
    return total + (orientation === 'horizontal' ? rect.width : rect.height);
  }, 0);

  return Math.max(1, axisSizePx - handleTrackSizePx);
}

export function findVisibleResizeBoundaryBySplitId(
  boundaries: VisibleResizeBoundaryHandle[],
  splitId: string
): VisibleResizeBoundaryHandle | null {
  return boundaries.find((boundary) => boundary.splitId === splitId) ?? null;
}

export function resolveVisibleSplitGeometryElement(input: {
  workspaceElement: HTMLElement | null;
  splitId: string;
  rootSplitId?: string | null;
  rootSplitElement?: HTMLElement | null;
}): HTMLElement | null {
  if (!input.workspaceElement) {
    return null;
  }

  if (input.rootSplitId && input.rootSplitElement && input.rootSplitId === input.splitId) {
    return input.rootSplitElement;
  }

  const handleElement = input.workspaceElement.querySelector<HTMLElement>(
    `.resize-handle[data-split-id="${input.splitId}"]`
  );

  if (!handleElement) {
    return null;
  }

  return handleElement.parentElement as HTMLElement | null;
}

export function resolveVisibleResizeBoundaryFromElement(
  handleElement: HTMLElement | null
): VisibleResizeBoundaryHandle | null {
  if (!handleElement) {
    return null;
  }

  const splitId = handleElement.dataset.splitId ?? null;
  const rootSplitId = handleElement.dataset.rootSplitId ?? null;
  const boundaryIndex = Number.parseInt(handleElement.dataset.boundaryIndex ?? '', 10);
  const orientation = handleElement.dataset.splitOrientation as 'horizontal' | 'vertical' | undefined;
  const rect = handleElement.getBoundingClientRect();
  const containerRect = handleElement.parentElement?.getBoundingClientRect() ?? rect;

  if (!splitId || !rootSplitId || !Number.isFinite(boundaryIndex) || !orientation) {
    return null;
  }

  return {
    splitId,
    rootSplitId,
    boundaryIndex,
    orientation,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    containerRect: {
      left: containerRect.left,
      top: containerRect.top,
      width: containerRect.width,
      height: containerRect.height
    }
  };
}

export function resolveVisibleResizeBoundaryFromPointer(input: {
  workspaceElement: HTMLElement;
  boundaries?: VisibleResizeBoundaryHandle[];
  clientX: number;
  clientY: number;
  eventTarget?: HTMLElement | null;
  hoverSnapPx: number;
  hoverSpanPx: number;
}): VisibleResizeBoundaryHandle | null {
  const directHandleElement = input.eventTarget?.closest?.('.resize-handle') as HTMLElement | null;
  const directHandle = resolveVisibleResizeBoundaryFromElement(directHandleElement);

  if (directHandle) {
    return directHandle;
  }

  let best: (VisibleResizeBoundaryHandle & { distance: number }) | null = null;

  for (const candidate of input.boundaries ?? resolveVisibleResizeBoundaries(input.workspaceElement)) {
    const line = resolveVisibleResizeBoundaryLineGeometry(candidate);
    const distance =
      line.lineOrientation === 'vertical'
        ? Math.abs(input.clientX - line.position)
        : Math.abs(input.clientY - line.position);
    const crossPosition = line.lineOrientation === 'vertical' ? input.clientY : input.clientX;

    if (distance > input.hoverSnapPx) {
      continue;
    }

    if (
      crossPosition < line.spanStart - input.hoverSpanPx ||
      crossPosition > line.spanEnd + input.hoverSpanPx
    ) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = {
        ...candidate,
        distance
      };
    }
  }

  if (!best) {
    return null;
  }

  return {
    splitId: best.splitId,
    rootSplitId: best.rootSplitId,
    boundaryIndex: best.boundaryIndex,
    orientation: best.orientation,
    rect: best.rect,
    containerRect: best.containerRect
  };
}

export function isVisibleIntersectionOnResizeBoundary(input: {
  workspaceElement: HTMLElement;
  boundary: VisibleResizeBoundaryLineGeometry;
  left: number;
  top: number;
  size: number;
  tolerancePaddingPx?: number;
}): boolean {
  const workspaceRect = input.workspaceElement.getBoundingClientRect();
  const targetCenterX = workspaceRect.left + input.left + input.size / 2;
  const targetCenterY = workspaceRect.top + input.top + input.size / 2;
  const tolerance = input.size / 2 + (input.tolerancePaddingPx ?? 6);

  if (input.boundary.lineOrientation === 'horizontal') {
    const lineY = input.boundary.position;
    return (
      Math.abs(targetCenterY - lineY) <= tolerance &&
      targetCenterX >= input.boundary.spanStart - tolerance &&
      targetCenterX <= input.boundary.spanEnd + tolerance
    );
  }

  const lineX = input.boundary.position;
  return (
    Math.abs(targetCenterX - lineX) <= tolerance &&
    targetCenterY >= input.boundary.spanStart - tolerance &&
    targetCenterY <= input.boundary.spanEnd + tolerance
  );
}

export function resolveVisibleResizeIntersectionTargets(input: {
  workspaceElement: HTMLElement;
  boundaries?: VisibleResizeBoundaryHandle[];
  intersectionHandleSize: number;
}): VisibleResizeIntersectionTarget[] {
  const workspaceRect = input.workspaceElement.getBoundingClientRect();
  const boundaries = input.boundaries ?? resolveVisibleResizeBoundaries(input.workspaceElement);
  const columnHandles = boundaries.filter(
    (element) => resolveVisibleResizeBoundaryLineGeometry(element).lineOrientation === 'vertical'
  );
  const rowHandles = boundaries.filter(
    (element) => resolveVisibleResizeBoundaryLineGeometry(element).lineOrientation === 'horizontal'
  );
  const intersections: VisibleResizeIntersectionTarget[] = [];
  const seen = new Set<string>();

  for (const columnHandle of columnHandles) {
    const columnLine = resolveVisibleResizeBoundaryLineGeometry(columnHandle);
    const columnParentRect = columnHandle.containerRect;

    for (const rowHandle of rowHandles) {
      const rowLine = resolveVisibleResizeBoundaryLineGeometry(rowHandle);
      const rowParentRect = rowHandle.containerRect;
      const columnCenterX = columnLine.rect.left + columnLine.rect.width / 2;
      const rowCenterY = rowLine.rect.top + rowLine.rect.height / 2;
      const horizontalTolerance = Math.max(
        input.intersectionHandleSize / 2 + 6,
        columnLine.rect.width,
        rowLine.rect.height,
        2
      );
      const verticalTolerance = Math.max(
        input.intersectionHandleSize / 2 + 6,
        rowLine.rect.height,
        columnLine.rect.width,
        2
      );
      const columnWithinRow =
        columnCenterX >= rowParentRect.left - horizontalTolerance &&
        columnCenterX <= rowParentRect.left + rowParentRect.width + horizontalTolerance;
      const rowWithinColumn =
        rowCenterY >= columnParentRect.top - verticalTolerance &&
        rowCenterY <= columnParentRect.top + columnParentRect.height + verticalTolerance;

      if (!columnWithinRow || !rowWithinColumn) {
        continue;
      }

      const id = `${columnHandle.splitId}:${rowHandle.splitId}`;

      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      intersections.push({
        id,
        columnSplitId: columnHandle.splitId,
        columnRootSplitId: columnHandle.rootSplitId,
        columnBoundaryIndex: columnHandle.boundaryIndex,
        rowSplitId: rowHandle.splitId,
        rowRootSplitId: rowHandle.rootSplitId,
        rowBoundaryIndex: rowHandle.boundaryIndex,
        left: columnCenterX - workspaceRect.left - input.intersectionHandleSize / 2,
        top: rowCenterY - workspaceRect.top - input.intersectionHandleSize / 2,
        size: input.intersectionHandleSize,
        columnContainerWidth: Math.max(columnParentRect.width, 1),
        rowContainerHeight: Math.max(rowParentRect.height, 1)
      });
    }
  }

  return intersections;
}

export function findVisibleResizeIntersectionTarget(
  intersections: VisibleResizeIntersectionTarget[],
  input: {
    columnSplitId: string;
    rowSplitId: string;
  }
): VisibleResizeIntersectionTarget | null {
  return (
    intersections.find(
      (candidate) =>
        candidate.columnSplitId === input.columnSplitId && candidate.rowSplitId === input.rowSplitId
    ) ?? null
  );
}

export function resolveVisibleEdgeIntersectionTargets(input: {
  workspaceElement: HTMLElement;
  boundaries?: VisibleResizeBoundaryHandle[];
  viewportRect: VisibleLayoutViewportRect;
  intersectionHandleSize: number;
  edgeLineOffsetPx: number;
  magnetismDistancePx: number;
  resizeIntersections: VisibleResizeIntersectionTarget[];
}): VisibleEdgeIntersectionTarget[] {
  const workspaceRect = input.workspaceElement.getBoundingClientRect();
  const boundaries = input.boundaries ?? resolveVisibleResizeBoundaries(input.workspaceElement);
  const intersections: VisibleEdgeIntersectionTarget[] = [];
  const seen = new Set<string>();
  const {
    leftX: leftLineX,
    rightX: rightLineX,
    topY: topLineY,
    bottomY: bottomLineY
  } = resolveVisibleWorkspaceEdgeLinePositions(input.workspaceElement, input.edgeLineOffsetPx);
  const viewportLeft = input.viewportRect.left;
  const viewportTop = input.viewportRect.top;
  const viewportRight = input.viewportRect.left + input.viewportRect.width;
  const viewportBottom = input.viewportRect.top + input.viewportRect.height;
  const edgeTouchTolerance = Math.max(input.intersectionHandleSize / 2 + 1, 6);
  const overlapThresholdPx = 1;

  const pushIntersection = (
    splitId: string,
    rootSplitId: string,
    boundaryIndex: number,
    edge: LayoutEdge,
    centerX: number,
    centerY: number
  ) => {
    const id = `${rootSplitId}:${boundaryIndex}:${edge}`;

    if (seen.has(id)) {
      return;
    }

    seen.add(id);
    intersections.push({
      id,
      edge,
      splitId,
      rootSplitId,
      boundaryIndex,
      left: centerX - input.intersectionHandleSize / 2,
      top: centerY - input.intersectionHandleSize / 2,
      size: input.intersectionHandleSize
    });
  };

  for (const handle of boundaries) {
    const line = resolveVisibleResizeBoundaryLineGeometry(handle);
    const lineRect = line.rect;
    const spanLeft =
      line.lineOrientation === 'horizontal'
        ? line.spanStart - workspaceRect.left
        : line.position - workspaceRect.left;
    const spanTop =
      line.lineOrientation === 'vertical'
        ? line.spanStart - workspaceRect.top
        : line.position - workspaceRect.top;
    const spanRight =
      line.lineOrientation === 'horizontal'
        ? line.spanEnd - workspaceRect.left
        : line.position - workspaceRect.left;
    const spanBottom =
      line.lineOrientation === 'vertical'
        ? line.spanEnd - workspaceRect.top
        : line.position - workspaceRect.top;
    const centerX = lineRect.left + lineRect.width / 2 - workspaceRect.left;
    const centerY = lineRect.top + lineRect.height / 2 - workspaceRect.top;

    if (line.lineOrientation === 'vertical') {
      if (Math.abs(spanTop - viewportTop) <= edgeTouchTolerance) {
        pushIntersection(handle.splitId, handle.rootSplitId, handle.boundaryIndex, 'top', centerX, topLineY);
      }

      if (Math.abs(spanBottom - viewportBottom) <= edgeTouchTolerance) {
        pushIntersection(
          handle.splitId,
          handle.rootSplitId,
          handle.boundaryIndex,
          'bottom',
          centerX,
          bottomLineY
        );
      }

      continue;
    }

    if (Math.abs(spanLeft - viewportLeft) <= edgeTouchTolerance) {
      pushIntersection(handle.splitId, handle.rootSplitId, handle.boundaryIndex, 'left', leftLineX, centerY);
    }

    if (Math.abs(spanRight - viewportRight) <= edgeTouchTolerance) {
      pushIntersection(
        handle.splitId,
        handle.rootSplitId,
        handle.boundaryIndex,
        'right',
        rightLineX,
        centerY
      );
    }
  }

  return intersections.filter((target, index) => {
    const targetCenterX = target.left + target.size / 2;
    const targetCenterY = target.top + target.size / 2;
    const touchesResizeIntersection = input.resizeIntersections.some((resizeTarget) => {
      const resizeCenterX = resizeTarget.left + resizeTarget.size / 2;
      const resizeCenterY = resizeTarget.top + resizeTarget.size / 2;
      return (
        Math.abs(targetCenterX - resizeCenterX) <= overlapThresholdPx &&
        Math.abs(targetCenterY - resizeCenterY) <= overlapThresholdPx
      );
    });

    if (touchesResizeIntersection) {
      return false;
    }

    return !intersections.some((otherTarget, otherIndex) => {
      if (otherIndex >= index) {
        return false;
      }

      const otherCenterX = otherTarget.left + otherTarget.size / 2;
      const otherCenterY = otherTarget.top + otherTarget.size / 2;
      return (
        Math.abs(targetCenterX - otherCenterX) <= overlapThresholdPx &&
        Math.abs(targetCenterY - otherCenterY) <= overlapThresholdPx
      );
    });
  });
}

export function resolveVisibleResizePreviewLineRect(input: {
  workspaceElement: HTMLElement;
  boundary: VisibleResizeBoundaryHandle | null;
  orientation: 'horizontal' | 'vertical';
  sizes: [number, number];
}): { left: number; top: number; width: number; height: number } | null {
  if (!input.boundary) {
    return null;
  }

  void input.orientation;
  void input.sizes;

  const workspaceRect = input.workspaceElement.getBoundingClientRect();
  const line = resolveVisibleResizeBoundaryLineGeometry(input.boundary).rect;

  return {
    left: line.left - workspaceRect.left,
    top: line.top - workspaceRect.top,
    width: line.width,
    height: line.height
  };
}
