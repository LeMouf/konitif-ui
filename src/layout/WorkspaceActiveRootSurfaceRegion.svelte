<script lang="ts">
  import WorkspaceRootRegion from './WorkspaceRootRegion.svelte';
  import type { WorkspaceActiveSurfaceProps } from './workspaceActiveRegionTypes';

  export let surface: WorkspaceActiveSurfaceProps;
  export let rootSplitElement: HTMLDivElement | null = null;
</script>

<WorkspaceRootRegion
  activeWindow={surface.activeWindow}
  rootSplitChain={surface.rootSplitChain}
  bind:rootSplitElement
  workspace={surface.workspace}
  focus={surface.focus}
  registry={surface.registry}
  dispatchCommand={surface.dispatchCommand}
  onResizeSplit={surface.onResizeSplit}
  onResizeSplitBoundary={surface.onResizeSplitBoundary}
  onCollapseSplit={surface.onCollapseSplit}
  onCollapseSplitBoundary={surface.onCollapseSplitBoundary}
  onOpenInternalSplitMenu={surface.onOpenInternalSplitMenu}
  toolRuntimeHost={surface.toolRuntimeHost}
  toolRuntimeUi={surface.toolRuntimeUi}
  onStartPanelDrag={surface.onStartPanelDrag}
  draggingPanelId={surface.draggingPanelId}
  onBeginAppHistoryTransaction={surface.onBeginAppHistoryTransaction}
  onCommitAppHistoryTransaction={surface.onCommitAppHistoryTransaction}
  onCancelAppHistoryTransaction={surface.onCancelAppHistoryTransaction}
  onBeginCoreHistoryTransaction={surface.onBeginCoreHistoryTransaction}
  onCommitCoreHistoryTransaction={surface.onCommitCoreHistoryTransaction}
  onCancelCoreHistoryTransaction={surface.onCancelCoreHistoryTransaction}
  onDetachPanelToWindow={surface.onDetachPanelToWindow}
  layoutEditingEnabled={surface.layoutEditingEnabled}
  showBoundaryResizeUi={surface.showBoundaryResizeUi}
  showBoundaryPullUi={surface.showBoundaryPullUi}
  showIntersectionResizeUi={surface.showIntersectionResizeUi}
  showPanelHeaderUi={surface.showPanelHeaderUi}
  showPanelToolSelectorUi={surface.showPanelToolSelectorUi}
  showPanelActionMenuUi={surface.showPanelActionMenuUi}
  showResizeSnapHelpers={surface.showResizeSnapHelpers}
  showDeleteZoneHelpers={surface.showDeleteZoneHelpers}
  showPanelLayoutMenuActions={surface.showPanelLayoutMenuActions}
  showPanelToggleHeaderAction={surface.showPanelToggleHeaderAction}
  showPanelSplitVerticalAction={surface.showPanelSplitVerticalAction}
  showPanelSplitHorizontalAction={surface.showPanelSplitHorizontalAction}
  showPanelJoinAreasAction={surface.showPanelJoinAreasAction}
  showPanelSwapAreasAction={surface.showPanelSwapAreasAction}
  showToggleFullscreenAction={surface.showToggleFullscreenAction}
  dockToggleButtonsVisible={surface.dockToggleButtonsVisible}
  showClosePanelAction={surface.showClosePanelAction}
  showMovePanelAction={surface.showMovePanelAction}
  fullscreenStackId={surface.fullscreenStackId}
  fullscreenViewportStyle={surface.fullscreenViewportStyle}
  onToggleStackFullscreen={surface.onToggleStackFullscreen}
  intersectionMagnetKeys={surface.intersectionMagnetKeys}
  suspendHeaderHover={surface.suspendHeaderHover}
  rootResizeDeletePreview={surface.rootResizeDeletePreview}
  rootResizeDragSession={surface.rootResizeDragSession}
  onRootResize={surface.onRootResize}
  onRootResizeDragState={surface.onRootResizeDragState}
  onRootResizeHandleMenu={surface.onRootResizeHandleMenu}
  onHoverResizeHandle={surface.onHoverResizeHandle}
/>
