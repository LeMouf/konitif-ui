<script lang="ts">
  import type {
    LayoutDockSide,
    LayoutInteractionState,
    LayoutMenuActionItem,
    PanelSubdivisionPreview,
    WorkbenchIconInput
  } from '@konitif/workbench';
  import WorkspaceBoundaryPreviewOverlay from './WorkspaceBoundaryPreviewOverlay.svelte';
  import WorkspaceDockOverlay from './WorkspaceDockOverlay.svelte';
  import WorkspaceInteractionOverlayRegion from './WorkspaceInteractionOverlayRegion.svelte';
  import WorkspaceIntersectionPreviewOverlay from './WorkspaceIntersectionPreviewOverlay.svelte';

  type WorkspaceOverlayRect = {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  type WorkspaceBoundaryGuide = WorkspaceOverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
    kind: 'neutral' | 'creation';
    crossed: boolean;
    armed: boolean;
  };

  type WorkspaceBoundaryTrail = WorkspaceOverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
    kind: 'armed' | 'creation';
  };

  type WorkspaceBoundaryBand = WorkspaceOverlayRect & {
    key: string;
    axis: 'horizontal' | 'vertical';
  };

  type WorkspaceBoundaryPreview = {
    guides: WorkspaceBoundaryGuide[];
    trails: WorkspaceBoundaryTrail[];
    bands: WorkspaceBoundaryBand[];
  };

  type WorkspaceIntersectionLine = WorkspaceOverlayRect & {
    snapped: boolean;
  };

  type WorkspaceIntersectionHandle = {
    left: number;
    top: number;
    size: number;
    snapped: boolean;
  };

  type WorkspaceDragPanel = {
    title: string;
  };

  export let layoutInteraction: LayoutInteractionState;
  export let menuActions: LayoutMenuActionItem[] = [];
  export let activeMenuActionId: string | null = null;
  export let menuTargetRects: Array<WorkspaceOverlayRect & { targetId: string }> = [];
  export let activeMenuTargetId: string | null = null;
  export let activeMenuSplitSegmentIndex: number | null = null;
  export let joinSourcePreviewRect: WorkspaceOverlayRect | null = null;
  export let joinDestinationPreviewRect: WorkspaceOverlayRect | null = null;
  export let swapSiblingPreviewRect: WorkspaceOverlayRect | null = null;
  export let menuPreviewPanelRect: WorkspaceOverlayRect | null = null;
  export let menuSplitPreview: PanelSubdivisionPreview | null = null;
  export let previewPanelRect: WorkspaceOverlayRect | null = null;
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

  export let showBoundaryPullUi = true;
  export let boundaryPreview: WorkspaceBoundaryPreview | null = null;
  export let showIntersectionResizeUi = true;
  export let hasIntersectionPreview = false;
  export let edgeIntersectionResizePreviewLine: WorkspaceIntersectionLine | null = null;
  export let intersectionColumnLine: WorkspaceIntersectionLine | null = null;
  export let intersectionRowLine: WorkspaceIntersectionLine | null = null;
  export let activeIntersectionPreviewHandle: WorkspaceIntersectionHandle | null = null;

  export let showDockPreviewHelpers = true;
  export let dragPreviewRect: WorkspaceOverlayRect | null = null;
  export let dragPreviewPlacement: string | null = null;
  export let dragPreviewTabIndicatorRect: WorkspaceOverlayRect | null = null;
  export let dragPanel: WorkspaceDragPanel | null = null;
  export let dragGhostStyle = '';
  export let tabDockLabel = 'Tab Dock';
</script>

{#if showBoundaryPullUi && boundaryPreview}
  <WorkspaceBoundaryPreviewOverlay
    guides={boundaryPreview.guides}
    trails={boundaryPreview.trails}
    bands={boundaryPreview.bands}
  />
{/if}

{#if showIntersectionResizeUi && (hasIntersectionPreview || edgeIntersectionResizePreviewLine)}
  <WorkspaceIntersectionPreviewOverlay
    edgeResizeLine={edgeIntersectionResizePreviewLine}
    columnLine={intersectionColumnLine}
    rowLine={intersectionRowLine}
    activeHandle={activeIntersectionPreviewHandle}
  />
{/if}

<WorkspaceInteractionOverlayRegion
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
  {showDockPreviewHelpers}
  {dragPreviewRect}
  {dragPreviewPlacement}
  {dragPreviewTabIndicatorRect}
  {dragPanel}
  {dragGhostStyle}
  {tabDockLabel}
/>
