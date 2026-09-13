<script lang="ts">
  import type {
    LayoutDockSide,
    LayoutInteractionState,
    LayoutMenuActionItem,
    PanelSubdivisionPreview,
    WorkbenchIconInput
  } from '@konitif/workbench';
  import LayoutInteractionOverlay from './LayoutInteractionOverlay.svelte';
  import WorkspaceDockOverlay from './WorkspaceDockOverlay.svelte';

  type WorkspaceOverlayRect = {
    left: number;
    top: number;
    width: number;
    height: number;
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

  export let showDockPreviewHelpers = true;
  export let dragPreviewRect: WorkspaceOverlayRect | null = null;
  export let dragPreviewPlacement: string | null = null;
  export let dragPreviewTabIndicatorRect: WorkspaceOverlayRect | null = null;
  export let dragPanel: WorkspaceDragPanel | null = null;
  export let dragGhostStyle = '';
  export let tabDockLabel = 'Tab Dock';
</script>

<LayoutInteractionOverlay
  state={layoutInteraction}
  {menuActions}
  {activeMenuActionId}
  {menuTargetRects}
  {activeMenuTargetId}
  selectedMenuTargetId={activeMenuTargetId}
  selectedMenuSplitSegmentIndex={activeMenuSplitSegmentIndex}
  {joinSourcePreviewRect}
  {joinDestinationPreviewRect}
  {swapSiblingPreviewRect}
  {menuPreviewPanelRect}
  menuPreview={menuSplitPreview}
  {previewPanelRect}
  preview={splitPreview}
  {previewSourceToolIcon}
  {onStartMenuAction}
  {onClearMenuAction}
  {onSelectMenuTarget}
  {onHoverMenuSplitSegment}
  onCommitMenuSplitSegment={onCommitMenuTargetSegment}
  {onCommitMenuTarget}
  {onHoverSplitSide}
  {onConfirmSplitSide}
  onPreviewOverlayClick={handlePreviewOverlayClick}
  onCancel={onCancelLayoutInteraction}
/>

<WorkspaceDockOverlay
  isActive={layoutInteraction.mode === 'drag-panel'}
  {showDockPreviewHelpers}
  {dragPreviewRect}
  {dragPreviewPlacement}
  {dragPreviewTabIndicatorRect}
  {dragPanel}
  {dragGhostStyle}
  {tabDockLabel}
/>
