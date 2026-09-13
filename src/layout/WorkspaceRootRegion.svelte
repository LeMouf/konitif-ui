<script lang="ts">
  import type {
    InMemoryToolRegistry,
    LayoutDockSide,
    LayoutEdge,
    LayoutMenuActionId,
    LayoutMenuTarget,
    SplitOrientation,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus,
    WorkspaceWindow
  } from '@konitif/workbench';
  import WorkspaceRootSplitRegion from './WorkspaceRootSplitRegion.svelte';
  import WorkspaceSingleRootRegion from './WorkspaceSingleRootRegion.svelte';
  import type { FlattenedSplitChain, FlattenedSplitHandle } from './splitChain';
  import type { ResizeDeletePreview } from './resizeBoundaryPreview';
  import type { ResizeGestureSessionState } from './resizeGestureEngine';

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
      }
    | undefined
  >;

  type ResizeHoverState =
    | {
        phase: 'enter' | 'move';
        splitId: string;
        rootSplitId: string;
        boundaryIndex: number;
        orientation: SplitOrientation;
        rect: { left: number; top: number; width: number; height: number };
      }
    | { phase: 'leave'; splitId: string };

  type RootResizeDragSession =
    | ({
        splitId: string;
        boundaryIndex: number;
        orientation: SplitOrientation;
      } & ResizeGestureSessionState)
    | null;

  export let activeWindow: WorkspaceWindow;
  export let rootSplitChain: FlattenedSplitChain | null;
  export let rootSplitElement: HTMLDivElement | null = null;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let onResizeSplit: (splitId: string, sizes: [number, number]) => void;
  export let onResizeSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    deltaRatio: number,
    mode: 'local' | 'proportional'
  ) => void;
  export let onCollapseSplit: (splitId: string, removeChildIndex: 0 | 1) => void;
  export let onCollapseSplitBoundary: (rootSplitId: string, boundaryIndex: number, removeSide: 'start' | 'end') => void;
  export let onOpenInternalSplitMenu: (
    panelId: string | null,
    edge: LayoutEdge,
    anchor: { x: number; y: number },
    targets?: LayoutMenuTarget[],
    options?: {
      source?: 'workspace-edge' | 'split-boundary' | 'panel-menu';
      initialActionId?: LayoutMenuActionId | null;
    }
  ) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: ToolRuntimeUiStateMap = {};
  export let onStartPanelDrag: ((panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void) | null = null;
  export let draggingPanelId: string | null = null;
  export let onBeginAppHistoryTransaction: () => void = () => {};
  export let onCommitAppHistoryTransaction: () => void = () => {};
  export let onCancelAppHistoryTransaction: () => void = () => {};
  export let onBeginCoreHistoryTransaction: () => void = () => {};
  export let onCommitCoreHistoryTransaction: () => void = () => {};
  export let onCancelCoreHistoryTransaction: () => void = () => {};
  export let onDetachPanelToWindow: (panelId: string) => void = () => {};
  export let layoutEditingEnabled = true;
  export let showBoundaryResizeUi = true;
  export let showBoundaryPullUi = true;
  export let showIntersectionResizeUi = true;
  export let showPanelHeaderUi = true;
  export let showPanelToolSelectorUi = true;
  export let showPanelActionMenuUi = true;
  export let showResizeSnapHelpers = true;
  export let showDeleteZoneHelpers = true;
  export let showPanelLayoutMenuActions = true;
  export let showPanelToggleHeaderAction = true;
  export let showPanelSplitVerticalAction = true;
  export let showPanelSplitHorizontalAction = true;
  export let showPanelJoinAreasAction = true;
  export let showPanelSwapAreasAction = true;
  export let showToggleFullscreenAction = true;
  export let dockToggleButtonsVisible = true;
  export let showClosePanelAction = true;
  export let showMovePanelAction = true;
  export let fullscreenStackId: string | null = null;
  export let fullscreenViewportStyle = '';
  export let onToggleStackFullscreen: ((stackId: string) => void) | null = null;
  export let intersectionMagnetKeys: Set<string> | null = null;
  export let suspendHeaderHover = false;
  export let rootResizeDeletePreview: ResizeDeletePreview | null = null;
  export let rootResizeDragSession: RootResizeDragSession = null;
  export let onRootResize: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number }
  ) => void;
  export let onRootResizeDragState: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ) => void;
  export let onRootResizeHandleMenu: (
    handle: FlattenedSplitHandle,
    event: CustomEvent<{ clientX: number; clientY: number }>
  ) => void;
  export let onHoverResizeHandle: ((input: ResizeHoverState) => void) | null = null;

  function openPanelLayoutMenu(
    panelId: string,
    anchor: { x: number; y: number },
    initialActionId: LayoutMenuActionId,
    targets: LayoutMenuTarget[]
  ): void {
    onOpenInternalSplitMenu(panelId, 'top', anchor, targets, {
      source: 'panel-menu',
      initialActionId
    });
  }

  $: activePanelDragStarter = layoutEditingEnabled && showMovePanelAction ? onStartPanelDrag : null;
</script>

{#if rootSplitChain}
  <WorkspaceRootSplitRegion
    rootSplitId={activeWindow.root.id}
    {rootSplitChain}
    bind:rootSplitElement
    {workspace}
    {focus}
    {registry}
    {dispatchCommand}
    {onResizeSplit}
    {onResizeSplitBoundary}
    {onCollapseSplit}
    {onCollapseSplitBoundary}
    onOpenSplitMenu={onOpenInternalSplitMenu}
    onOpenPanelLayoutMenu={openPanelLayoutMenu}
    {toolRuntimeHost}
    {toolRuntimeUi}
    onStartPanelDrag={activePanelDragStarter}
    {draggingPanelId}
    {onBeginAppHistoryTransaction}
    {onCommitAppHistoryTransaction}
    {onCancelAppHistoryTransaction}
    {onBeginCoreHistoryTransaction}
    {onCommitCoreHistoryTransaction}
    {onCancelCoreHistoryTransaction}
    {onDetachPanelToWindow}
    {layoutEditingEnabled}
    {showBoundaryResizeUi}
    {showBoundaryPullUi}
    {showIntersectionResizeUi}
    {showPanelHeaderUi}
    {showPanelToolSelectorUi}
    {showPanelActionMenuUi}
    {showResizeSnapHelpers}
    {showDeleteZoneHelpers}
    {showPanelLayoutMenuActions}
    {showPanelToggleHeaderAction}
    {showPanelSplitVerticalAction}
    {showPanelSplitHorizontalAction}
    {showPanelJoinAreasAction}
    {showPanelSwapAreasAction}
    {showToggleFullscreenAction}
    {dockToggleButtonsVisible}
    {showClosePanelAction}
    {showMovePanelAction}
    {fullscreenStackId}
    {fullscreenViewportStyle}
    {onToggleStackFullscreen}
    {intersectionMagnetKeys}
    {suspendHeaderHover}
    {rootResizeDeletePreview}
    {rootResizeDragSession}
    {onRootResize}
    {onRootResizeDragState}
    {onRootResizeHandleMenu}
    {onHoverResizeHandle}
  />
{:else}
  <WorkspaceSingleRootRegion
    node={activeWindow.root}
    {workspace}
    {focus}
    {registry}
    {dispatchCommand}
    {onResizeSplit}
    {onResizeSplitBoundary}
    {onCollapseSplit}
    {onCollapseSplitBoundary}
    onOpenSplitMenu={onOpenInternalSplitMenu}
    onOpenPanelLayoutMenu={openPanelLayoutMenu}
    {toolRuntimeHost}
    {toolRuntimeUi}
    onStartPanelDrag={activePanelDragStarter}
    {draggingPanelId}
    {onBeginAppHistoryTransaction}
    {onCommitAppHistoryTransaction}
    {onCancelAppHistoryTransaction}
    {onBeginCoreHistoryTransaction}
    {onCommitCoreHistoryTransaction}
    {onCancelCoreHistoryTransaction}
    {onDetachPanelToWindow}
    {layoutEditingEnabled}
    {showBoundaryResizeUi}
    {showBoundaryPullUi}
    {showIntersectionResizeUi}
    {showPanelHeaderUi}
    {showPanelToolSelectorUi}
    {showPanelActionMenuUi}
    {showResizeSnapHelpers}
    {showDeleteZoneHelpers}
    {showPanelLayoutMenuActions}
    {showPanelToggleHeaderAction}
    {showPanelSplitVerticalAction}
    {showPanelSplitHorizontalAction}
    {showPanelJoinAreasAction}
    {showPanelSwapAreasAction}
    {showToggleFullscreenAction}
    {dockToggleButtonsVisible}
    {showClosePanelAction}
    {showMovePanelAction}
    {fullscreenStackId}
    {fullscreenViewportStyle}
    {onToggleStackFullscreen}
    {intersectionMagnetKeys}
    {suspendHeaderHover}
    {onHoverResizeHandle}
  />
{/if}
