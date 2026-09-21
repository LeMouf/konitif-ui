import type { ToolFullscreenCompanionDefinition } from '@konitif/workbench';

export type CompanionPlacement = ToolFullscreenCompanionDefinition['placement'];
export type CompanionResizeHandle = 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw';
export interface CompanionLayout {
  placement: CompanionPlacement;
  width: number;
  height: number;
}
export interface CompanionBounds {
  width: number;
  height: number;
}
export const companionPlacements: CompanionPlacement[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right'
];
export const COMPANION_MARGIN = 12;

/** Local presentation preference, never a Viewer state or Workflow edit. */
export function companionLayoutStorageKey(workspaceId: string, ownerId: string, companionId: string): string {
  return 'workbench.fullscreen-companion-layout.v1:' + JSON.stringify([workspaceId, ownerId, companionId]);
}
export function readCompanionLayout(
  key: string,
  fallback: CompanionLayout,
  storage?: Pick<Storage, 'getItem'> | null
): CompanionLayout {
  try {
    const candidate = JSON.parse(storage?.getItem(key) ?? 'null');
    if (
      candidate &&
      companionPlacements.includes(candidate.placement) &&
      Number.isFinite(candidate.width) &&
      candidate.width >= 180 &&
      candidate.width <= 4096 &&
      Number.isFinite(candidate.height) &&
      candidate.height >= 140 &&
      candidate.height <= 4096
    ) {
      return {
        placement: candidate.placement,
        width: Math.round(candidate.width),
        height: Math.round(candidate.height)
      };
    }
  } catch {
    /* Unavailable storage/corrupt preference must never block a Tool. */
  }
  return { ...fallback };
}
export function saveCompanionLayout(
  key: string,
  layout: CompanionLayout,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  try {
    storage?.setItem(key, JSON.stringify(layout));
  } catch {
    /* In-memory interaction remains usable. */
  }
}
export function companionResizeHandles(placement: CompanionPlacement): CompanionResizeHandle[] {
  const horizontal = placement.endsWith('left') ? 'e' : 'w';
  const vertical = placement.startsWith('top') ? 's' : 'n';
  return [horizontal, vertical, (vertical + horizontal) as CompanionResizeHandle];
}
export function clampCompanionSize(size: CompanionBounds, bounds: CompanionBounds): CompanionBounds {
  const maximumWidth = Math.max(1, Math.min(4096, bounds.width - 2 * COMPANION_MARGIN));
  const maximumHeight = Math.max(1, Math.min(4096, bounds.height - 2 * COMPANION_MARGIN));
  return {
    width: Math.round(Math.max(Math.min(180, maximumWidth), Math.min(size.width, maximumWidth))),
    height: Math.round(Math.max(Math.min(140, maximumHeight), Math.min(size.height, maximumHeight)))
  };
}
export function resizeCompanion(
  size: CompanionBounds,
  handle: CompanionResizeHandle,
  dx: number,
  dy: number,
  bounds: CompanionBounds
): CompanionBounds {
  return clampCompanionSize(
    {
      width: size.width + (handle.includes('e') ? dx : handle.includes('w') ? -dx : 0),
      height: size.height + (handle.includes('s') ? dy : handle.includes('n') ? -dy : 0)
    },
    bounds
  );
}
export function nearestCompanionPlacement(x: number, y: number, bounds: CompanionBounds): CompanionPlacement {
  return `${y < bounds.height / 2 ? 'top' : 'bottom'}-${x < bounds.width / 2 ? 'left' : 'right'}`;
}
