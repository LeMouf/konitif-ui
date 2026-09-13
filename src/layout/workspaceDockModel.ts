import type { LayoutDockPlacement, LayoutDockSide, LayoutDockTarget } from '@konitif/workbench';

export interface WorkspaceDockRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspaceDockPointer {
  x: number;
  y: number;
}

export interface WorkspaceStackDockCandidate {
  stackId: string;
  rect: WorkspaceDockRect;
  tabIndex: number | null;
  canTarget: boolean;
}

/**
 * The tab strip owns reordering while the pointer is inside it. Keeping this
 * predicate explicit prevents the broader panel-docking projection from
 * covering or overriding the more precise tab insertion interaction.
 */
export function isTabStripDockTarget(
  target: LayoutDockTarget | null
): target is Extract<LayoutDockTarget, { kind: 'stack' }> & { tabIndex: number } {
  return (
    target?.kind === 'stack' &&
    target.placement === 'center' &&
    typeof target.tabIndex === 'number'
  );
}

export function resolveWorkspaceEdgeDockSide(
  pointer: WorkspaceDockPointer,
  workspaceRect: WorkspaceDockRect,
  edgeGutter: number
): LayoutDockSide | null {
  if (
    pointer.x < workspaceRect.left ||
    pointer.x > workspaceRect.left + workspaceRect.width ||
    pointer.y < workspaceRect.top ||
    pointer.y > workspaceRect.top + workspaceRect.height ||
    edgeGutter <= 0
  ) {
    return null;
  }

  const localX = pointer.x - workspaceRect.left;
  const localY = pointer.y - workspaceRect.top;
  const distances = [
    { side: 'left', value: localX },
    { side: 'right', value: workspaceRect.width - localX },
    { side: 'top', value: localY },
    { side: 'bottom', value: workspaceRect.height - localY }
  ] as const;
  const nearestEdge = distances.reduce((best, entry) => (entry.value < best.value ? entry : best), distances[0]);

  return nearestEdge.value <= edgeGutter ? nearestEdge.side : null;
}

export function resolveStackDockPlacement(
  localXRatio: number,
  localYRatio: number,
  showDockAsTabAction: boolean,
  showDockToSideAction: boolean,
  edgeThreshold = 0.24
): LayoutDockPlacement | null {
  const distances = [
    { placement: 'left', value: localXRatio },
    { placement: 'right', value: 1 - localXRatio },
    { placement: 'top', value: localYRatio },
    { placement: 'bottom', value: 1 - localYRatio }
  ] as const;
  const nearestEdge = distances.reduce((best, entry) => (entry.value < best.value ? entry : best), distances[0]);
  const preferredPlacement = nearestEdge.value <= edgeThreshold ? nearestEdge.placement : 'center';

  if (preferredPlacement === 'center') {
    if (showDockAsTabAction) {
      return 'center';
    }

    return showDockToSideAction ? nearestEdge.placement : null;
  }

  if (showDockToSideAction) {
    return preferredPlacement;
  }

  return showDockAsTabAction ? 'center' : null;
}

export function resolveWorkspaceEdgeDockPreviewRect(
  viewport: WorkspaceDockRect,
  side: LayoutDockSide,
  edgeBandRatio = 0.24
): WorkspaceDockRect {
  if (side === 'left') {
    return { left: viewport.left, top: viewport.top, width: viewport.width * edgeBandRatio, height: viewport.height };
  }

  if (side === 'right') {
    return {
      left: viewport.left + viewport.width * (1 - edgeBandRatio),
      top: viewport.top,
      width: viewport.width * edgeBandRatio,
      height: viewport.height
    };
  }

  if (side === 'top') {
    return { left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height * edgeBandRatio };
  }

  return {
    left: viewport.left,
    top: viewport.top + viewport.height * (1 - edgeBandRatio),
    width: viewport.width,
    height: viewport.height * edgeBandRatio
  };
}

export function resolveStackDockPreviewRect(
  base: WorkspaceDockRect,
  placement: LayoutDockPlacement
): WorkspaceDockRect {
  if (placement === 'center') {
    return {
      left: base.left + base.width * 0.1,
      top: base.top + base.height * 0.1,
      width: base.width * 0.8,
      height: base.height * 0.8
    };
  }

  if (placement === 'left') {
    return { ...base, width: base.width * 0.35 };
  }

  if (placement === 'right') {
    return { ...base, left: base.left + base.width * 0.65, width: base.width * 0.35 };
  }

  if (placement === 'top') {
    return { ...base, height: base.height * 0.35 };
  }

  return { ...base, top: base.top + base.height * 0.65, height: base.height * 0.35 };
}

export function resolveDockTabInsertionIndex(
  pointer: WorkspaceDockPointer,
  tabsRect: WorkspaceDockRect,
  tabRects: readonly WorkspaceDockRect[]
): number | null {
  if (
    pointer.x < tabsRect.left ||
    pointer.x > tabsRect.left + tabsRect.width ||
    pointer.y < tabsRect.top ||
    pointer.y > tabsRect.top + tabsRect.height
  ) {
    return null;
  }

  if (tabRects.length === 0) {
    return 0;
  }

  for (let index = 0; index < tabRects.length; index += 1) {
    const rect = tabRects[index];

    if (pointer.x <= rect.left + rect.width / 2) {
      return index;
    }
  }

  return tabRects.length;
}

export function resolveDockTabIndicatorRect(input: {
  workspaceRect: WorkspaceDockRect;
  tabsRect: WorkspaceDockRect;
  tabRects: readonly WorkspaceDockRect[];
  tabIndex: number;
  inset?: number;
  width?: number;
}): WorkspaceDockRect {
  const insertionIndex = Math.max(0, Math.min(input.tabRects.length, Math.round(input.tabIndex)));
  const previousTab = input.tabRects[insertionIndex - 1] ?? null;
  const nextTab = input.tabRects[insertionIndex] ?? null;
  const inset = input.inset ?? 4;
  const indicatorWidth = input.width ?? 2;

  let x = input.tabsRect.left - input.workspaceRect.left + indicatorWidth;

  if (previousTab && nextTab) {
    x = (previousTab.left + previousTab.width + nextTab.left) / 2 - input.workspaceRect.left;
  } else if (previousTab) {
    x = previousTab.left + previousTab.width - input.workspaceRect.left + indicatorWidth;
  } else if (nextTab) {
    x = nextTab.left - input.workspaceRect.left - indicatorWidth;
  }

  return {
    left: x,
    top: input.tabsRect.top - input.workspaceRect.top + inset,
    width: indicatorWidth,
    height: Math.max(0, input.tabsRect.height - inset * 2)
  };
}

export function resolveStackDockTargetAtPointer(input: {
  pointer: WorkspaceDockPointer;
  candidates: readonly WorkspaceStackDockCandidate[];
  showDockAsTabAction: boolean;
  showDockToSideAction: boolean;
}): Extract<LayoutDockTarget, { kind: 'stack' }> | null {
  const candidate = input.candidates.find((entry) => {
    if (!entry.canTarget) {
      return false;
    }

    return (
      input.pointer.x >= entry.rect.left &&
      input.pointer.x <= entry.rect.left + entry.rect.width &&
      input.pointer.y >= entry.rect.top &&
      input.pointer.y <= entry.rect.top + entry.rect.height
    );
  });

  if (!candidate) {
    return null;
  }

  const localX = (input.pointer.x - candidate.rect.left) / Math.max(candidate.rect.width, 1);
  const localY = (input.pointer.y - candidate.rect.top) / Math.max(candidate.rect.height, 1);
  const placement =
    candidate.tabIndex !== null && input.showDockAsTabAction
      ? 'center'
      : resolveStackDockPlacement(
          localX,
          localY,
          input.showDockAsTabAction,
          input.showDockToSideAction
        );

  if (!placement) {
    return null;
  }

  return {
    kind: 'stack',
    stackId: candidate.stackId,
    placement,
    tabIndex: placement === 'center' ? candidate.tabIndex : null
  };
}
