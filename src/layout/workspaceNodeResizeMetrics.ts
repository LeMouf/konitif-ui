import type { LayoutNode } from '@konitif/workbench';

export const RESIZE_DELETE_ZONE_THRESHOLD_PX = 36;
export const RESIZE_DELETE_ZONE_APPROACH_THRESHOLD_PX = 20;
export const RESIZE_DELETE_ZONE_MIN_SIZE_PX = 32;
export const RESIZE_MAGNET_THRESHOLD_PX = 14;

export function resolveMeasuredDeleteZoneMaxSizePx(
  splitElement: HTMLElement,
  startNode: LayoutNode,
  endNode: LayoutNode,
  minimum = RESIZE_DELETE_ZONE_MIN_SIZE_PX
): number {
  const stackIds = [...collectStackIds(startNode), ...collectStackIds(endNode)];
  let measuredMax = 0;

  for (const stackId of stackIds) {
    const stackElement = splitElement.querySelector<HTMLElement>(`[data-stack-id="${stackId}"]`);

    if (!stackElement) {
      continue;
    }

    measuredMax = Math.max(measuredMax, resolveMeasuredStackChromeHeight(stackElement, minimum));
  }

  return Math.max(resolveTokenBasedDeleteZoneMaxSizePx(splitElement, minimum), measuredMax || 0);
}

export function resolveResizeIntersectionHandleSizePx(input: {
  baseSize: number;
  deleteZoneMaxSizePx: number;
  minimumSize?: number;
}): number {
  const clampedSize = Math.min(input.baseSize, input.deleteZoneMaxSizePx);
  const normalizedSize = clampedSize % 2 === 0 ? clampedSize - 1 : clampedSize;

  return Math.max(input.minimumSize ?? 9, normalizedSize);
}

export function resolveResizeDeleteZoneMinRatio(input: {
  axisSizePx: number;
  deleteZoneMaxSizePx: number;
  minimumRatio?: number;
  maximumRatio?: number;
}): number {
  const minimumRatio = input.minimumRatio ?? 0.02;
  const maximumRatio = input.maximumRatio ?? 0.5;

  if (!Number.isFinite(input.axisSizePx) || input.axisSizePx <= 0) {
    return minimumRatio;
  }

  const minRatio = input.deleteZoneMaxSizePx / input.axisSizePx;

  return Math.min(maximumRatio, Math.max(minimumRatio, minRatio));
}

export function resolveTokenDeleteZoneMaxSizePx(input: {
  controlHeight?: number;
  chromePaddingY?: number;
  headerBorder?: number;
  minimum?: number;
}): number {
  const controlHeight = input.controlHeight ?? 32;
  const chromePaddingY = input.chromePaddingY ?? 6;
  const headerBorder = input.headerBorder ?? 1;
  const minimum = input.minimum ?? RESIZE_DELETE_ZONE_MIN_SIZE_PX;
  const headerHeight = controlHeight + chromePaddingY * 2 + headerBorder;

  return Math.max(minimum, Math.round(headerHeight));
}

function collectStackIds(node: LayoutNode): string[] {
  if (node.kind === 'stack') {
    return [node.id];
  }

  return [...collectStackIds(node.children[0]), ...collectStackIds(node.children[1])];
}

export function resolveMeasuredStackChromeHeight(stackElement: HTMLElement, minimum: number): number {
  const headerElement = stackElement.querySelector<HTMLElement>('.stack__header');

  if (headerElement) {
    const rect = headerElement.getBoundingClientRect();

    if (rect.height > 0) {
      return Math.round(rect.height);
    }
  }

  return resolveTokenBasedDeleteZoneMaxSizePx(stackElement, minimum);
}

export function resolveTokenBasedDeleteZoneMaxSizePx(element: HTMLElement, minimum: number): number {
  const styles = getComputedStyle(element);
  const controlHeight = Number.parseFloat(styles.getPropertyValue('--size-control-height')) || 32;
  const chromePaddingY = Number.parseFloat(styles.getPropertyValue('--space-6')) || 6;
  return resolveTokenDeleteZoneMaxSizePx({ controlHeight, chromePaddingY, minimum });
}
