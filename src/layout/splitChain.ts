import { LAYOUT_MIN_SPLIT_SIZE, type LayoutNode, type SplitNode, type SplitOrientation } from '@konitif/workbench';

export interface FlattenedSplitSegment {
  id: string;
  node: LayoutNode;
  size: number;
  startRatio: number;
}

export interface FlattenedSplitHandle {
  id: string;
  splitId: string;
  split: SplitNode;
  orientation: SplitOrientation;
  sizes: [number, number];
  containerStartRatio: number;
  containerSizeRatio: number;
}

export interface FlattenedSplitChain {
  orientation: SplitOrientation;
  segments: FlattenedSplitSegment[];
  handles: FlattenedSplitHandle[];
}

export function flattenSplitChain(split: SplitNode): FlattenedSplitChain {
  return collectFlattenedSplitChain(split, split.orientation, 1, 0);
}

function collectFlattenedSplitChain(
  node: LayoutNode,
  orientation: SplitOrientation,
  size: number,
  startRatio: number
): {
  orientation: SplitOrientation;
  segments: FlattenedSplitSegment[];
  handles: FlattenedSplitHandle[];
} {
  if (node.kind !== 'split' || node.orientation !== orientation) {
    return {
      orientation,
      segments: [{ id: node.id, node, size, startRatio }],
      handles: []
    };
  }

  const leftSize = size * node.sizes[0];
  const rightSize = size * node.sizes[1];
  const left = collectFlattenedSplitChain(node.children[0], orientation, leftSize, startRatio);
  const right = collectFlattenedSplitChain(node.children[1], orientation, rightSize, startRatio + leftSize);

  return {
    orientation,
    segments: [...left.segments, ...right.segments],
    handles: [
      ...left.handles,
      {
        id: `${node.id}-handle`,
        splitId: node.id,
        split: node,
        orientation,
        sizes: node.sizes,
        containerStartRatio: startRatio,
        containerSizeRatio: size
      },
      ...right.handles
    ]
  };
}

export function buildSplitGridStyle(
  orientation: SplitOrientation,
  segments: FlattenedSplitSegment[],
  includeHandleTracks = true
): string {
  const template = segments.flatMap((segment, index) => [
    `minmax(0, ${segment.size}fr)`,
    ...(includeHandleTracks && index < segments.length - 1 ? ['var(--size-resize-handle)'] : [])
  ]);

  if (orientation === 'horizontal') {
    return `grid-template-columns: ${template.join(' ')};`;
  }

  return `grid-template-rows: ${template.join(' ')};`;
}

export function resolveSplitResizePreviewSegments(input: {
  segments: FlattenedSplitSegment[];
  boundaryIndex: number;
  deltaRatio: number | null;
  mode: 'local' | 'proportional';
}): FlattenedSplitSegment[] {
  const { segments, boundaryIndex, deltaRatio, mode } = input;

  if (
    deltaRatio === null ||
    !Number.isFinite(deltaRatio) ||
    boundaryIndex < 0 ||
    boundaryIndex >= segments.length - 1
  ) {
    return segments;
  }

  const sizes = segments.map((segment) => segment.size);
  const nextSizes =
    mode === 'proportional'
      ? resizePreviewBoundaryProportionally(sizes, boundaryIndex, deltaRatio)
      : resizePreviewBoundaryLocally(sizes, boundaryIndex, deltaRatio);

  if (!nextSizes) {
    return segments;
  }

  return segments.map((segment, index) => ({
    ...segment,
    size: nextSizes[index] ?? segment.size
  }));
}

function resizePreviewBoundaryLocally(
  sizes: number[],
  boundaryIndex: number,
  deltaRatio: number
): number[] | null {
  const nextSizes = [...sizes];
  const leftIndex = boundaryIndex;
  const rightIndex = boundaryIndex + 1;
  const leftSize = nextSizes[leftIndex] ?? 0;
  const rightSize = nextSizes[rightIndex] ?? 0;
  const clampedDelta = clampPreviewRatio(
    deltaRatio,
    -(leftSize - LAYOUT_MIN_SPLIT_SIZE),
    rightSize - LAYOUT_MIN_SPLIT_SIZE
  );

  if (!Number.isFinite(clampedDelta) || Math.abs(clampedDelta) < Number.EPSILON) {
    return null;
  }

  nextSizes[leftIndex] = leftSize + clampedDelta;
  nextSizes[rightIndex] = rightSize - clampedDelta;
  return nextSizes;
}

function resizePreviewBoundaryProportionally(
  sizes: number[],
  boundaryIndex: number,
  deltaRatio: number
): number[] | null {
  const leftSizes = sizes.slice(0, boundaryIndex + 1);
  const rightSizes = sizes.slice(boundaryIndex + 1);
  const leftTotal = sumPreviewRatios(leftSizes);
  const minLeftTotal = leftSizes.length * LAYOUT_MIN_SPLIT_SIZE;
  const minRightTotal = rightSizes.length * LAYOUT_MIN_SPLIT_SIZE;
  const nextLeftTotal = clampPreviewRatio(deltaRatio + leftTotal, minLeftTotal, 1 - minRightTotal);
  const nextRightTotal = 1 - nextLeftTotal;

  if (
    !Number.isFinite(nextLeftTotal) ||
    !Number.isFinite(nextRightTotal) ||
    Math.abs(nextLeftTotal - leftTotal) < Number.EPSILON
  ) {
    return null;
  }

  return [
    ...scalePreviewSegmentGroup(leftSizes, nextLeftTotal),
    ...scalePreviewSegmentGroup(rightSizes, nextRightTotal)
  ];
}

function scalePreviewSegmentGroup(sizes: number[], nextTotal: number): number[] {
  const currentTotal = sumPreviewRatios(sizes);

  if (currentTotal <= 0) {
    return sizes;
  }

  const scaled = sizes.map((size) => (size / currentTotal) * nextTotal);
  const clamped = scaled.map((size) => Math.max(LAYOUT_MIN_SPLIT_SIZE, size));
  const clampedTotal = sumPreviewRatios(clamped);

  return clamped.map((size) => (size / clampedTotal) * nextTotal);
}

function sumPreviewRatios(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clampPreviewRatio(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildSegmentOverlayStyle(
  orientation: SplitOrientation,
  startRatio: number,
  sizeRatio: number
): string {
  if (orientation === 'horizontal') {
    return `left: ${startRatio * 100}%; width: ${sizeRatio * 100}%; top: 0; bottom: 0;`;
  }

  return `top: ${startRatio * 100}%; height: ${sizeRatio * 100}%; left: 0; right: 0;`;
}

export function buildSplitGuideStyle(orientation: SplitOrientation, ratio: number): string {
  if (orientation === 'horizontal') {
    return `left: calc(${ratio * 100}% - 0.5px); width: 1px; top: 0; bottom: 0;`;
  }

  return `top: calc(${ratio * 100}% - 0.5px); height: 1px; left: 0; right: 0;`;
}

export function resolveDeleteThreshold(segmentSizePx: number, thresholdPx: number): number {
  return Math.max(8, Math.min(thresholdPx, segmentSizePx * 0.66));
}
