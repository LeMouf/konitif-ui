<script lang="ts">
  import type {
    LayoutDockSide,
    LayoutEdge,
    LayoutInteractionState,
    LayoutMenuActionItem,
    PanelSubdivisionPreview,
    WorkbenchIconInput
  } from '@konitif/workbench';
  import WorkspaceBoundaryInteractionOverlayRegion from './WorkspaceBoundaryInteractionOverlayRegion.svelte';
  import WorkspacePreviewOverlayRegion from './WorkspacePreviewOverlayRegion.svelte';
  import type {
    VisibleEdgeIntersectionTarget,
    VisibleResizeIntersectionTarget,
    VisibleWorkspaceCornerPositions
  } from './visibleLayoutProjection';

  type BoundaryCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  type BoundaryVisualState = 'idle' | 'neutral' | 'armed' | 'creation';
  type FullscreenBoundaryPhase = 'visible' | 'fading-out' | 'hidden' | 'fading-in';
  type OverlayRect = { left: number; top: number; width: number; height: number };
  type BoundaryGuide = OverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
    kind: 'neutral' | 'creation';
    crossed: boolean;
    armed: boolean;
  };
  type BoundaryTrail = OverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
    kind: 'armed' | 'creation';
  };
  type BoundaryBand = OverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
  };
  type BoundaryPreview = {
    guides: BoundaryGuide[];
    trails: BoundaryTrail[];
    bands: BoundaryBand[];
  };
  type IntersectionLine = OverlayRect & { snapped: boolean };
  type IntersectionHandle = { left: number; top: number; size: number; snapped: boolean };
  type DragPanel = { title: string };
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

  export let menuActions: LayoutMenuActionItem[] = [];
  export let activeMenuActionId: string | null = null;
  export let menuTargetRects: Array<OverlayRect & { targetId: string }> = [];
  export let activeMenuTargetId: string | null = null;
  export let activeMenuSplitSegmentIndex: number | null = null;
  export let joinSourcePreviewRect: OverlayRect | null = null;
  export let joinDestinationPreviewRect: OverlayRect | null = null;
  export let swapSiblingPreviewRect: OverlayRect | null = null;
  export let menuPreviewPanelRect: OverlayRect | null = null;
  export let menuSplitPreview: PanelSubdivisionPreview | null = null;
  export let previewPanelRect: OverlayRect | null = null;
  export let splitPreview: PanelSubdivisionPreview | null = null;
  export let previewSourceToolIcon: WorkbenchIconInput | null = null;
  export let onStartMenuAction: (actionId: string) => void = () => undefined;
  export let onClearMenuAction: () => void = () => undefined;
  export let onSelectMenuTarget: (panelId: string | null) => void = () => undefined;
  export let onHoverMenuSplitSegment: (segmentIndex: number | null) => void = () => undefined;
  export let onCommitMenuTargetSegment: (targetId: string, segmentIndex: number) => void = () => undefined;
  export let onCommitMenuTarget: (panelId: string) => void = () => undefined;
  export let onHoverSplitSide: (side: LayoutDockSide | null) => void = () => undefined;
  export let onConfirmSplitSide: (side: LayoutDockSide) => void = () => undefined;
  export let handlePreviewOverlayClick: (event: MouseEvent) => void = () => undefined;
  export let onCancelLayoutInteraction: () => void = () => undefined;

  export let boundaryPreview: BoundaryPreview | null = null;
  export let hasIntersectionPreview = false;
  export let edgeIntersectionResizePreviewLine: IntersectionLine | null = null;
  export let intersectionColumnLine: IntersectionLine | null = null;
  export let intersectionRowLine: IntersectionLine | null = null;
  export let activeIntersectionPreviewHandle: IntersectionHandle | null = null;
  export let showDockPreviewHelpers = true;
  export let dragPreviewRect: OverlayRect | null = null;
  export let dragPreviewPlacement: string | null = null;
  export let dragPreviewTabIndicatorRect: OverlayRect | null = null;
  export let dragPanel: DragPanel | null = null;
  export let dragGhostStyle = '';
  export let tabDockLabel = 'Tab Dock';
</script>

<WorkspaceBoundaryInteractionOverlayRegion
  {boundaryHandlesRendered}
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

<WorkspacePreviewOverlayRegion
  {layoutInteraction}
  {menuActions}
  {activeMenuActionId}
  {menuTargetRects}
  {activeMenuTargetId}
  {activeMenuSplitSegmentIndex}
  {joinSourcePreviewRect}
  {joinDestinationPreviewRect}
  {swapSiblingPreviewRect}
  {menuPreviewPanelRect}
  {menuSplitPreview}
  {previewPanelRect}
  {splitPreview}
  {previewSourceToolIcon}
  {onStartMenuAction}
  {onClearMenuAction}
  {onSelectMenuTarget}
  {onHoverMenuSplitSegment}
  {onCommitMenuTargetSegment}
  {onCommitMenuTarget}
  {onHoverSplitSide}
  {onConfirmSplitSide}
  {handlePreviewOverlayClick}
  {onCancelLayoutInteraction}
  {showBoundaryPullUi}
  {boundaryPreview}
  {showIntersectionResizeUi}
  {hasIntersectionPreview}
  {edgeIntersectionResizePreviewLine}
  {intersectionColumnLine}
  {intersectionRowLine}
  {activeIntersectionPreviewHandle}
  {showDockPreviewHelpers}
  {dragPreviewRect}
  {dragPreviewPlacement}
  {dragPreviewTabIndicatorRect}
  {dragPanel}
  {dragGhostStyle}
  {tabDockLabel}
/>
