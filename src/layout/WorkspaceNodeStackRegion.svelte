<script lang="ts">
  import type {
    InMemoryToolRegistry,
    LayoutMenuActionId,
    LayoutMenuTarget,
    StackNode,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import WorkspaceStackSlotRegion from './WorkspaceStackSlotRegion.svelte';

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
      }
    | undefined
  >;

  export let stack: StackNode;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: ToolRuntimeUiStateMap = {};
  export let onStartPanelDrag: ((panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void) | null = null;
  export let draggingPanelId: string | null = null;
  export let onOpenPanelLayoutMenu:
    | ((panelId: string, anchor: { x: number; y: number }, initialActionId: LayoutMenuActionId, targets: LayoutMenuTarget[]) => void)
    | null = null;
  export let onDetachPanelToWindow: (panelId: string) => void = () => {};
  export let layoutEditingEnabled = true;
  export let showPanelHeaderUi = true;
  export let showPanelToolSelectorUi = true;
  export let showPanelActionMenuUi = true;
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
  export let suspendHeaderHover = false;
</script>

<WorkspaceStackSlotRegion
  {stack}
  {workspace}
  {focus}
  {registry}
  {dispatchCommand}
  {toolRuntimeHost}
  {toolRuntimeUi}
  {onStartPanelDrag}
  {draggingPanelId}
  {onOpenPanelLayoutMenu}
  {onDetachPanelToWindow}
  {layoutEditingEnabled}
  {showPanelHeaderUi}
  {showPanelToolSelectorUi}
  {showPanelActionMenuUi}
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
  onToggleStackFullscreen={onToggleStackFullscreen}
  {suspendHeaderHover}
/>
