import { resolveDeleteThreshold } from './splitChain';
import {
  type VisibleResizeBoundaryHandle,
  resolveVisibleResizeBoundaryFromElement,
  resolveVisibleResizeBoundaryLineGeometry
} from './visibleLayoutProjection';

export interface ResizeBoundarySegment {
  startRatio: number;
  size: number;
}

export interface ResizeDeletePreview {
  orientation: 'horizontal' | 'vertical';
  splitId: string;
  boundaryIndex: number;
  startEnabled: boolean;
  endEnabled: boolean;
  nearSide: 'start' | 'end' | null;
  activeSide: 'start' | 'end' | null;
  latchedSide: 'start' | 'end' | null;
  startSegmentStartRatio: number;
  boundaryRatio: number;
  startSegmentSizeRatio: number;
  endSegmentSizeRatio: number;
  axisStartPx: number;
  axisSizePx: number;
  startOuterStartPx: number;
  boundaryPositionPx: number;
  endOuterEndPx: number;
  startActiveThresholdPx: number;
  endActiveThresholdPx: number;
  startNearThresholdPx: number;
  endNearThresholdPx: number;
  startZoneStyle: string;
  endZoneStyle: string;
  startGuideStyle: string;
  endGuideStyle: string;
  dragIndicatorStyle: string;
  magnetGuideStyle: string | null;
  magnetPositionPx: number | null;
  magnetSplitId: string | null;
  magnetRootSplitId: string | null;
  magnetBoundaryIndex: number | null;
  resolvedPositionPx: number;
  resolvedMagnetKey: string | null;
  deleteIntent: boolean;
  crossStartPx: number;
  crossSizePx: number;
}

export interface ResizeMagnetSnap {
  positionPx: number;
  guideStyle: string;
  splitId: string;
  rootSplitId: string | null;
  boundaryIndex: number | null;
}

export interface ResizePreviewGestureState {
  phase: 'active' | 'delete' | 'outside';
  resolvedPositionPx: number;
}

export interface ResizePreviewResolution {
  preview: ResizeDeletePreview;
  resolvedPositionPx: number;
  magnetKey: string | null;
  deleteIntent: boolean;
}

export interface ResizePreviewDriver {
  preview: ResizeDeletePreview | null;
  currentPositionPx: number;
  magnetKey: string | null;
  deleteIntent: boolean;
}

export function resolveResizePreviewForBoundary(
  preview: ResizeDeletePreview | null,
  splitId: string,
  boundaryIndex: number
): ResizeDeletePreview | null {
  if (!preview || preview.splitId !== splitId || preview.boundaryIndex !== boundaryIndex) {
    return null;
  }

  return preview;
}

export function resolveResizePreviewDriver(input: {
  preview: ResizeDeletePreview | null;
  splitId: string;
  boundaryIndex: number;
  rawCurrentPositionPx: number;
}): ResizePreviewDriver {
  const matchedPreview = resolveResizePreviewForBoundary(
    input.preview,
    input.splitId,
    input.boundaryIndex
  );

  return {
    preview: matchedPreview,
    currentPositionPx: matchedPreview?.resolvedPositionPx ?? input.rawCurrentPositionPx,
    magnetKey: matchedPreview?.resolvedMagnetKey ?? null,
    deleteIntent: matchedPreview?.deleteIntent ?? false
  };
}

export function resolveResizePreviewResolvedPosition(input: {
  preview: ResizeDeletePreview | null;
  splitId: string;
  boundaryIndex: number;
  fallbackPositionPx: number;
}): { positionPx: number; magnetKey: string | null } {
  if (!input.preview || input.preview.splitId !== input.splitId || input.preview.boundaryIndex !== input.boundaryIndex) {
    return {
      positionPx: input.fallbackPositionPx,
      magnetKey: null
    };
  }

  const deleteReferencePosition = resolveResizeDeleteReferencePosition(input.preview);

  if (deleteReferencePosition !== null) {
    return {
      positionPx: input.preview.axisStartPx + deleteReferencePosition,
      magnetKey: null
    };
  }

  if (input.preview.magnetPositionPx === null) {
    return {
      positionPx: input.fallbackPositionPx,
      magnetKey: null
    };
  }

  return {
    positionPx: input.preview.axisStartPx + input.preview.magnetPositionPx,
    magnetKey: `${input.preview.magnetRootSplitId ?? ''}:${input.preview.magnetBoundaryIndex ?? ''}:${input.preview.magnetSplitId ?? ''}`
  };
}

function resolveResizeDeleteReferencePosition(preview: ResizeDeletePreview): number | null {
  if (preview.activeSide === 'start') {
    return preview.startOuterStartPx + preview.startNearThresholdPx;
  }

  if (preview.activeSide === 'end') {
    return preview.endOuterEndPx - preview.endNearThresholdPx;
  }

  if (preview.nearSide === 'start') {
    return preview.startOuterStartPx + preview.startNearThresholdPx;
  }

  if (preview.nearSide === 'end') {
    return preview.endOuterEndPx - preview.endNearThresholdPx;
  }

  if (preview.latchedSide === 'start') {
    return preview.startOuterStartPx + preview.startNearThresholdPx;
  }

  if (preview.latchedSide === 'end') {
    return preview.endOuterEndPx - preview.endNearThresholdPx;
  }

  return null;
}

export function createResizeDeletePreview(input: {
  orientation: 'horizontal' | 'vertical';
  splitId: string;
  boundaryIndex: number;
  startSegment: ResizeBoundarySegment;
  endSegment: ResizeBoundarySegment;
  axisStartPx: number;
  axisSizePx: number;
  crossStartPx: number;
  crossSizePx: number;
  initialDragPositionPx?: number;
  deleteZoneMaxSizePx: number;
  activeThresholdPx: number;
  approachThresholdPx: number;
}): ResizeDeletePreview {
  const startOuterStartPx = Math.min(Math.max(0, input.axisSizePx * input.startSegment.startRatio), input.axisSizePx);
  const boundaryPositionPx = Math.min(Math.max(0, input.axisSizePx * input.endSegment.startRatio), input.axisSizePx);
  const endOuterEndPx = Math.min(
    Math.max(boundaryPositionPx, input.axisSizePx * (input.endSegment.startRatio + input.endSegment.size)),
    input.axisSizePx
  );
  const startZoneSize = Math.min(input.deleteZoneMaxSizePx, input.axisSizePx * input.startSegment.size);
  const endZoneSize = Math.min(input.deleteZoneMaxSizePx, input.axisSizePx * input.endSegment.size);
  const startActiveThresholdPx = Math.min(
    resolveDeleteThreshold(startZoneSize, input.activeThresholdPx),
    startZoneSize
  );
  const endActiveThresholdPx = Math.min(
    resolveDeleteThreshold(endZoneSize, input.activeThresholdPx),
    endZoneSize
  );
  const startNearThresholdPx = Math.min(
    startActiveThresholdPx + input.approachThresholdPx,
    startZoneSize
  );
  const endNearThresholdPx = Math.min(
    endActiveThresholdPx + input.approachThresholdPx,
    endZoneSize
  );
  const initialDragPositionPx = input.initialDragPositionPx ?? boundaryPositionPx;

  return {
    orientation: input.orientation,
    splitId: input.splitId,
    boundaryIndex: input.boundaryIndex,
    startEnabled: true,
    endEnabled: true,
    nearSide: null,
    activeSide: null,
    latchedSide: null,
    startSegmentStartRatio: input.startSegment.startRatio,
    boundaryRatio: input.endSegment.startRatio,
    startSegmentSizeRatio: input.startSegment.size,
    endSegmentSizeRatio: input.endSegment.size,
    axisStartPx: input.axisStartPx,
    axisSizePx: input.axisSizePx,
    startOuterStartPx,
    boundaryPositionPx,
    endOuterEndPx,
    startActiveThresholdPx,
    endActiveThresholdPx,
    startNearThresholdPx,
    endNearThresholdPx,
    startZoneStyle: buildResizeDeleteZoneStyle(
      input.orientation,
      input.startSegment.startRatio,
      input.startSegment.size,
      'start',
      input.crossStartPx,
      input.crossSizePx,
      input.axisSizePx,
      input.deleteZoneMaxSizePx
    ),
    endZoneStyle: buildResizeDeleteZoneStyle(
      input.orientation,
      input.endSegment.startRatio,
      input.endSegment.size,
      'end',
      input.crossStartPx,
      input.crossSizePx,
      input.axisSizePx,
      input.deleteZoneMaxSizePx
    ),
    startGuideStyle: buildResizeDeleteGuideStyle(
      input.orientation,
      startOuterStartPx + startNearThresholdPx,
      input.crossStartPx,
      input.crossSizePx,
      input.axisSizePx
    ),
    endGuideStyle: buildResizeDeleteGuideStyle(
      input.orientation,
      endOuterEndPx - endNearThresholdPx,
      input.crossStartPx,
      input.crossSizePx,
      input.axisSizePx
    ),
    dragIndicatorStyle: buildResizeDragIndicatorStyle(
      input.orientation,
      initialDragPositionPx,
      input.axisSizePx,
      input.crossStartPx,
      input.crossSizePx
    ),
    magnetGuideStyle: null,
    magnetPositionPx: null,
    magnetSplitId: null,
    magnetRootSplitId: null,
    magnetBoundaryIndex: null,
    resolvedPositionPx: input.axisStartPx + initialDragPositionPx,
    resolvedMagnetKey: null,
    deleteIntent: false,
    crossStartPx: input.crossStartPx,
    crossSizePx: input.crossSizePx
  };
}

export function buildResizeDeleteZoneStyle(
  orientation: 'horizontal' | 'vertical',
  segmentStartRatio: number,
  segmentSizeRatio: number,
  side: 'start' | 'end',
  crossStartPx: number,
  crossSizePx: number,
  axisSizePx: number,
  deleteZoneMaxSizePx: number
): string {
  const segmentStart = axisSizePx * segmentStartRatio;
  const segmentSize = axisSizePx * segmentSizeRatio;
  const zoneSize = Math.min(deleteZoneMaxSizePx, segmentSize);
  const clampOffset = (value: number) => Math.min(Math.max(0, value), Math.max(0, axisSizePx - zoneSize));

  if (orientation === 'horizontal') {
    const left = clampOffset(
      side === 'start' ? segmentStart : segmentStart + Math.max(0, segmentSize - zoneSize)
    );
    return `left:${left}px;width:${zoneSize}px;top:${crossStartPx}px;height:${crossSizePx}px;`;
  }

  const top = clampOffset(
    side === 'start' ? segmentStart : segmentStart + Math.max(0, segmentSize - zoneSize)
  );
  return `top:${top}px;height:${zoneSize}px;left:${crossStartPx}px;width:${crossSizePx}px;`;
}

export function buildResizeDeleteGuideStyle(
  orientation: 'horizontal' | 'vertical',
  positionPx: number,
  crossStartPx: number,
  crossSizePx: number,
  axisSizePx: number
): string {
  const position = clampLineCenter(positionPx, axisSizePx);
  const normalizedCrossStart = Math.round(Math.max(0, crossStartPx));
  const normalizedCrossSize = Math.max(1, Math.round(Math.max(0, crossSizePx)));

  if (orientation === 'horizontal') {
    return `left:calc(${position}px - 0.5px);width:1px;top:${normalizedCrossStart}px;height:${normalizedCrossSize}px;`;
  }

  return `top:calc(${position}px - 0.5px);height:1px;left:${normalizedCrossStart}px;width:${normalizedCrossSize}px;`;
}

export function buildResizeDragIndicatorStyle(
  orientation: 'horizontal' | 'vertical',
  positionPx: number,
  axisSizePx: number,
  crossStartPx: number,
  crossSizePx: number
): string {
  const clamped = clampLineCenter(positionPx, axisSizePx);
  const crossStart = Math.round(crossStartPx);
  const crossSize = Math.max(1, Math.round(crossSizePx));

  if (orientation === 'horizontal') {
    return `left:calc(${clamped}px - 0.5px);top:${crossStart}px;height:${crossSize}px;width:1px;`;
  }

  return `top:calc(${clamped}px - 0.5px);left:${crossStart}px;width:${crossSize}px;height:1px;`;
}

function buildResizeDragIndicatorStyleFromLineRect(
  orientation: 'horizontal' | 'vertical',
  lineRect: { left: number; top: number; width: number; height: number },
  containerRect: DOMRect
): string {
  if (orientation === 'horizontal') {
    const left = quantizeHalfPixel(lineRect.left - containerRect.left);
    const top = Math.round(lineRect.top - containerRect.top);
    const height = Math.max(1, Math.round(lineRect.height));
    return `left:${left}px;top:${top}px;height:${height}px;width:1px;`;
  }

  const top = quantizeHalfPixel(lineRect.top - containerRect.top);
  const left = Math.round(lineRect.left - containerRect.left);
  const width = Math.max(1, Math.round(lineRect.width));
  return `top:${top}px;left:${left}px;width:${width}px;height:1px;`;
}

export function evolveResizeDeletePreview(
  preview: ResizeDeletePreview,
  localPosition: number,
  magnetSnap: ResizeMagnetSnap | null
): ResizeDeletePreview {
  const deleteState = resolveResizeDeleteState(preview, localPosition);
  const { latchedSide, activeSide, nearSide } = deleteState;
  const dragPosition = magnetSnap?.positionPx ?? localPosition;
  const clampedPosition = Math.min(
    Math.max(0, localPosition),
    Math.max(0, preview.axisSizePx)
  );
  const deleteReferencePosition = resolveResizeDeleteReferencePosition({
    ...preview,
    latchedSide,
    activeSide,
    nearSide
  });
  const resolvedPositionPx =
    preview.axisStartPx +
    (deleteReferencePosition ?? (magnetSnap ? dragPosition : clampedPosition));
  const resolvedMagnetKey = magnetSnap
    ? `${magnetSnap.rootSplitId ?? ''}:${magnetSnap.boundaryIndex ?? ''}:${magnetSnap.splitId ?? ''}`
    : null;

  return {
    ...preview,
    latchedSide,
    nearSide,
    activeSide,
    dragIndicatorStyle: buildResizeDragIndicatorStyle(
      preview.orientation,
      magnetSnap ? dragPosition : clampedPosition,
      preview.axisSizePx,
        preview.crossStartPx,
        preview.crossSizePx
    ),
    magnetGuideStyle: magnetSnap?.guideStyle ?? null,
    magnetPositionPx: magnetSnap ? Math.min(Math.max(0, dragPosition), preview.axisSizePx) : null,
    magnetSplitId: magnetSnap?.splitId ?? null,
    magnetRootSplitId: magnetSnap?.rootSplitId ?? null,
    magnetBoundaryIndex: magnetSnap?.boundaryIndex ?? null,
    resolvedPositionPx,
    resolvedMagnetKey,
    deleteIntent: !!(nearSide || activeSide || latchedSide)
  };
}

export function resolveResizePreviewResolution(
  preview: ResizeDeletePreview,
  localPosition: number,
  magnetSnap: ResizeMagnetSnap | null
): ResizePreviewResolution {
  const nextPreview = evolveResizeDeletePreview(preview, localPosition, magnetSnap);

  return {
    preview: nextPreview,
    resolvedPositionPx: nextPreview.resolvedPositionPx,
    magnetKey: nextPreview.resolvedMagnetKey,
    deleteIntent: nextPreview.deleteIntent
  };
}

export function shouldDisableResizeMagnetSnap(
  preview: ResizeDeletePreview,
  localPosition: number
): boolean {
  const state = resolveResizeDeleteState(preview, localPosition);
  return !!state.activeSide || !!state.nearSide || !!state.latchedSide;
}

function resolveResizeDeleteState(
  preview: ResizeDeletePreview,
  localPosition: number
): {
  latchedSide: 'start' | 'end' | null;
  activeSide: 'start' | 'end' | null;
  nearSide: 'start' | 'end' | null;
} {
  const startActive =
    preview.startEnabled &&
    localPosition >= preview.startOuterStartPx &&
    localPosition <= preview.startOuterStartPx + preview.startActiveThresholdPx;
  const endActive =
    preview.endEnabled &&
    localPosition >= preview.endOuterEndPx - preview.endActiveThresholdPx &&
    localPosition <= preview.endOuterEndPx;
  const startNear =
    preview.startEnabled &&
    !startActive &&
    localPosition > preview.startOuterStartPx + preview.startActiveThresholdPx &&
    localPosition <= preview.startOuterStartPx + preview.startNearThresholdPx;
  const endNear =
    preview.endEnabled &&
    !endActive &&
    localPosition >= preview.endOuterEndPx - preview.endNearThresholdPx &&
    localPosition < preview.endOuterEndPx - preview.endActiveThresholdPx;

  let latchedSide = preview.latchedSide;

  if (startActive || (preview.startEnabled && localPosition <= preview.startOuterStartPx)) {
    latchedSide = 'start';
  } else if (endActive || (preview.endEnabled && localPosition >= preview.endOuterEndPx)) {
    latchedSide = 'end';
  }

  if (
    latchedSide === 'start' &&
    localPosition > preview.startOuterStartPx + preview.startNearThresholdPx
  ) {
    latchedSide = null;
  }

  if (
    latchedSide === 'end' &&
    localPosition < preview.endOuterEndPx - preview.endNearThresholdPx
  ) {
    latchedSide = null;
  }

  const activeSide = startActive ? 'start' : endActive ? 'end' : latchedSide;
  const nearSide = activeSide ? null : startNear ? 'start' : endNear ? 'end' : null;

  return {
    latchedSide,
    activeSide,
    nearSide
  };
}

export function applyResizePreviewGestureState(
  preview: ResizeDeletePreview,
  gesture: ResizePreviewGestureState | null
): ResizeDeletePreview {
  if (!gesture) {
    return {
      ...preview,
      magnetGuideStyle: null
    };
  }

  return {
    ...preview,
    dragIndicatorStyle: buildResizeDragIndicatorStyle(
      preview.orientation,
      gesture.resolvedPositionPx - preview.axisStartPx,
      preview.axisSizePx,
      preview.crossStartPx,
      preview.crossSizePx
    ),
    magnetGuideStyle: gesture.phase === 'active' ? preview.magnetGuideStyle : null
  };
}

export function shouldRenderResizePreviewHelpers(
  preview: ResizeDeletePreview | null,
  gesture: ResizePreviewGestureState | null
): boolean {
  if (!preview || !gesture) {
    return false;
  }

  if (gesture.phase !== 'active') {
    return false;
  }

  return !preview.nearSide && !preview.activeSide && !preview.latchedSide;
}

export function resolveResizeMagnetSnapFromElements(input: {
  orientation: 'horizontal' | 'vertical';
  handleSplitId: string;
  containerRect: DOMRect;
  candidateElements: HTMLElement[];
  axisStartPx: number;
  axisSizePx: number;
  crossStartPx: number;
  crossSizePx: number;
  currentPositionPx: number;
  magnetThresholdPx: number;
}): ResizeMagnetSnap | null {
  const pointerPosition = quantizeHalfPixel(input.currentPositionPx);
  const currentSpanStart = Math.round(input.crossStartPx);
  const currentSpanEnd = currentSpanStart + Math.max(1, Math.round(input.crossSizePx));
  let bestCandidate: {
    distance: number;
    positionPx: number;
    guideStyle: string;
    splitId: string;
    rootSplitId: string | null;
    boundaryIndex: number | null;
  } | null = null;

  for (const element of input.candidateElements) {
    if (element.dataset.splitId === input.handleSplitId) {
      continue;
    }

    const boundary = resolveVisibleResizeBoundaryFromElement(element);

    if (!boundary) {
      continue;
    }

    const line = resolveVisibleResizeBoundaryLineGeometry(boundary);
    const candidateSpanStart =
      line.lineOrientation === 'vertical'
        ? line.spanStart - input.containerRect.top
        : line.spanStart - input.containerRect.left;
    const candidateSpanSize =
      line.lineOrientation === 'vertical'
        ? line.spanEnd - line.spanStart
        : line.spanEnd - line.spanStart;
    const normalizedCandidateSpanStart = Math.round(candidateSpanStart);
    const normalizedCandidateSpanSize = Math.max(1, Math.round(candidateSpanSize));
    const candidateSpanEnd = normalizedCandidateSpanStart + normalizedCandidateSpanSize;
    const overlap =
      Math.min(currentSpanEnd, candidateSpanEnd) - Math.max(currentSpanStart, normalizedCandidateSpanStart);
    const spanGap =
      overlap >= 0
        ? 0
        : Math.max(normalizedCandidateSpanStart - currentSpanEnd, currentSpanStart - candidateSpanEnd);

    if (overlap <= 0 && spanGap > input.magnetThresholdPx) {
      continue;
    }

    const candidatePosition =
      line.lineOrientation === 'vertical'
        ? quantizeHalfPixel(line.rect.left - input.containerRect.left + 0.5)
        : quantizeHalfPixel(line.rect.top - input.containerRect.top + 0.5);

    if (
      candidatePosition < -input.magnetThresholdPx ||
      candidatePosition > input.axisSizePx + input.magnetThresholdPx
    ) {
      continue;
    }

    const distance = Math.abs(pointerPosition - candidatePosition);

    if (distance > input.magnetThresholdPx) {
      continue;
    }

    const guideStyle = buildResizeDragIndicatorStyleFromLineRect(
      input.orientation,
      line.rect,
      input.containerRect
    );

    if (!bestCandidate || distance < bestCandidate.distance) {
      bestCandidate = {
        distance,
        positionPx: candidatePosition,
        guideStyle,
        splitId: boundary.splitId,
        rootSplitId: boundary.rootSplitId,
        boundaryIndex: boundary.boundaryIndex
      };
    }
  }

  return bestCandidate
    ? {
        positionPx: bestCandidate.positionPx,
        guideStyle: bestCandidate.guideStyle,
        splitId: bestCandidate.splitId,
        rootSplitId: bestCandidate.rootSplitId,
        boundaryIndex: bestCandidate.boundaryIndex
      }
    : null;
}

export function resolveResizeMagnetSnapFromBoundaries(input: {
  orientation: 'horizontal' | 'vertical';
  handleSplitId: string;
  containerRect: DOMRect;
  candidateBoundaries: VisibleResizeBoundaryHandle[];
  axisSizePx: number;
  crossStartPx: number;
  crossSizePx: number;
  currentPositionPx: number;
  magnetThresholdPx: number;
}): ResizeMagnetSnap | null {
  const pointerPosition = quantizeHalfPixel(input.currentPositionPx);
  const currentSpanStart = Math.round(input.crossStartPx);
  const currentSpanEnd = currentSpanStart + Math.max(1, Math.round(input.crossSizePx));
  let bestCandidate: {
    distance: number;
    positionPx: number;
    guideStyle: string;
    splitId: string;
    rootSplitId: string | null;
    boundaryIndex: number | null;
  } | null = null;

  for (const boundary of input.candidateBoundaries) {
    if (boundary.splitId === input.handleSplitId || boundary.orientation !== input.orientation) {
      continue;
    }

    const line = resolveVisibleResizeBoundaryLineGeometry(boundary);
    const candidateSpanStart =
      line.lineOrientation === 'vertical'
        ? line.spanStart - input.containerRect.top
        : line.spanStart - input.containerRect.left;
    const candidateSpanSize = line.spanEnd - line.spanStart;
    const normalizedCandidateSpanStart = Math.round(candidateSpanStart);
    const normalizedCandidateSpanSize = Math.max(1, Math.round(candidateSpanSize));
    const candidateSpanEnd = normalizedCandidateSpanStart + normalizedCandidateSpanSize;
    const overlap =
      Math.min(currentSpanEnd, candidateSpanEnd) - Math.max(currentSpanStart, normalizedCandidateSpanStart);
    const spanGap =
      overlap >= 0
        ? 0
        : Math.max(normalizedCandidateSpanStart - currentSpanEnd, currentSpanStart - candidateSpanEnd);

    if (overlap <= 0 && spanGap > input.magnetThresholdPx) {
      continue;
    }

    const candidatePosition =
      line.lineOrientation === 'vertical'
        ? quantizeHalfPixel(line.rect.left - input.containerRect.left + 0.5)
        : quantizeHalfPixel(line.rect.top - input.containerRect.top + 0.5);

    if (
      candidatePosition < -input.magnetThresholdPx ||
      candidatePosition > input.axisSizePx + input.magnetThresholdPx
    ) {
      continue;
    }

    const distance = Math.abs(pointerPosition - candidatePosition);

    if (distance > input.magnetThresholdPx) {
      continue;
    }

    const guideStyle = buildResizeDragIndicatorStyleFromLineRect(
      input.orientation,
      line.rect,
      input.containerRect
    );

    if (!bestCandidate || distance < bestCandidate.distance) {
      bestCandidate = {
        distance,
        positionPx: candidatePosition,
        guideStyle,
        splitId: boundary.splitId,
        rootSplitId: boundary.rootSplitId,
        boundaryIndex: boundary.boundaryIndex
      };
    }
  }

  return bestCandidate
    ? {
        positionPx: bestCandidate.positionPx,
        guideStyle: bestCandidate.guideStyle,
        splitId: bestCandidate.splitId,
        rootSplitId: bestCandidate.rootSplitId,
        boundaryIndex: bestCandidate.boundaryIndex
      }
    : null;
}

function quantizeHalfPixel(value: number): number {
  return Math.round(value * 2) / 2;
}

function quantizeLineCenter(value: number): number {
  return Math.round(value - 0.5) + 0.5;
}

function clampLineCenter(positionPx: number, axisSizePx: number): number {
  const safeAxisSize = Math.max(1, axisSizePx);
  const minCenter = 0.5;
  const maxCenter = Math.max(minCenter, safeAxisSize - 0.5);
  return quantizeLineCenter(Math.min(Math.max(minCenter, positionPx), maxCenter));
}

export function resolveResizeMagnetSnapFromScope(input: {
  orientation: 'horizontal' | 'vertical';
  handleSplitId: string;
  containerElement: HTMLElement;
  candidateRootElement?: ParentNode | null;
  axisStartPx: number;
  axisSizePx: number;
  crossStartPx: number;
  crossSizePx: number;
  currentPositionPx: number;
  magnetThresholdPx: number;
}): ResizeMagnetSnap | null {
  const candidateRoot = input.candidateRootElement ?? input.containerElement;

  return resolveResizeMagnetSnapFromElements({
    orientation: input.orientation,
    handleSplitId: input.handleSplitId,
    containerRect: input.containerElement.getBoundingClientRect(),
    candidateElements: Array.from(
      candidateRoot.querySelectorAll<HTMLElement>(`.resize-handle[data-split-orientation="${input.orientation}"]`)
    ),
    axisStartPx: input.axisStartPx,
    axisSizePx: input.axisSizePx,
    crossStartPx: input.crossStartPx,
    crossSizePx: input.crossSizePx,
    currentPositionPx: input.currentPositionPx,
    magnetThresholdPx: input.magnetThresholdPx
  });
}
