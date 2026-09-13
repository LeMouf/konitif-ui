<script lang="ts">
  import type { LayoutEdge, LayoutInteractionState } from '@konitif/workbench';
  import WorkspaceBoundaryChromeRegion from './WorkspaceBoundaryChromeRegion.svelte';
  import type {
    VisibleEdgeIntersectionTarget,
    VisibleResizeIntersectionTarget,
    VisibleWorkspaceCornerPositions
  } from './visibleLayoutProjection';

  type BoundaryCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  type BoundaryVisualState = 'idle' | 'neutral' | 'armed' | 'creation';
  type FullscreenBoundaryPhase = 'visible' | 'fading-out' | 'hidden' | 'fading-in';
  type EdgeSplitHandleEvent = CustomEvent<{ edge: LayoutEdge; clientX: number; clientY: number }>;
  type BoundaryCornerHandleEvent = CustomEvent<{
    corner: BoundaryCorner;
    clientX: number;
    clientY: number;
  }>;

  export let boundaryHandlesRendered = false;
  export let layoutInteraction: LayoutInteractionState;
  export let fullscreenBoundaryPhase: FullscreenBoundaryPhase = 'visible';
  export let showBoundaryPullUi = false;
  export let showIntersectionResizeUi = false;
  export let boundaryEditingEnabled = false;
  export let workspaceCornerPositions: VisibleWorkspaceCornerPositions | null = null;
  export let edgeIntersectionTargets: VisibleEdgeIntersectionTarget[] = [];
  export let intersectionTargets: VisibleResizeIntersectionTarget[] = [];
  export let debugEdgeIntersectionIds: Set<string> = new Set();
  export let linkedEdgeIntersectionIds: Set<string> = new Set();
  export let debugResizeIntersectionIds: Set<string> = new Set();
  export let linkedResizeIntersectionIds: Set<string> = new Set();
  export let resolveBoundaryEdgeVisualState: (edge: LayoutEdge) => BoundaryVisualState = () => 'idle';
  export let resolveBoundaryCornerVisualState: (corner: BoundaryCorner) => BoundaryVisualState = () => 'idle';
  export let resolveEdgeIntersectionCursor: (edge: LayoutEdge) => string = () => 'all-scroll';
  export let onStartBoundaryPullFromEdge: (event: EdgeSplitHandleEvent) => void = () => {};
  export let onOpenWorkspaceEdgeSplitMenu: (event: EdgeSplitHandleEvent) => void = () => {};
  export let onStartBoundaryPullFromCorner: (corner: BoundaryCorner, event: BoundaryCornerHandleEvent) => void =
    () => {};
  export let onEdgeIntersectionPointerEnter: (target: VisibleEdgeIntersectionTarget) => void = () => {};
  export let onEdgeIntersectionPointerHover: (target: VisibleEdgeIntersectionTarget) => void = () => {};
  export let onEdgeIntersectionPointerLeave: () => void = () => {};
  export let onStartEdgeIntersectionPull: (
    event: PointerEvent,
    target: VisibleEdgeIntersectionTarget
  ) => void = () => {};
  export let onEdgeIntersectionContextMenu: (
    event: MouseEvent,
    target: VisibleEdgeIntersectionTarget
  ) => void = () => {};
  export let onIntersectionPointerEnter: (target: VisibleResizeIntersectionTarget) => void = () => {};
  export let onIntersectionPointerHover: (target: VisibleResizeIntersectionTarget) => void = () => {};
  export let onIntersectionPointerLeave: () => void = () => {};
  export let onStartIntersectionResize: (
    event: PointerEvent,
    target: VisibleResizeIntersectionTarget
  ) => void = () => {};
</script>

{#if boundaryHandlesRendered}
  <WorkspaceBoundaryChromeRegion
    {layoutInteraction}
    {fullscreenBoundaryPhase}
    {showBoundaryPullUi}
    {showIntersectionResizeUi}
    {boundaryEditingEnabled}
    {workspaceCornerPositions}
    {edgeIntersectionTargets}
    {intersectionTargets}
    {debugEdgeIntersectionIds}
    {linkedEdgeIntersectionIds}
    {debugResizeIntersectionIds}
    {linkedResizeIntersectionIds}
    {resolveBoundaryEdgeVisualState}
    {resolveBoundaryCornerVisualState}
    {resolveEdgeIntersectionCursor}
    {onStartBoundaryPullFromEdge}
    {onOpenWorkspaceEdgeSplitMenu}
    {onStartBoundaryPullFromCorner}
    {onEdgeIntersectionPointerEnter}
    {onEdgeIntersectionPointerHover}
    {onEdgeIntersectionPointerLeave}
    {onStartEdgeIntersectionPull}
    {onEdgeIntersectionContextMenu}
    {onIntersectionPointerEnter}
    {onIntersectionPointerHover}
    {onIntersectionPointerLeave}
    {onStartIntersectionResize}
  />
{/if}
