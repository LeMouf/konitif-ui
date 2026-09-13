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
  import StackNodeView from './StackNodeView.svelte';

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

  $: isFullscreen = fullscreenStackId === stack.id;
</script>

<div class:workspace-stack-slot-region--fullscreen={isFullscreen} class="workspace-stack-slot-region">
  <StackNodeView
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
    {isFullscreen}
    {fullscreenViewportStyle}
    onToggleFullscreen={onToggleStackFullscreen}
    {suspendHeaderHover}
  />
</div>

<style>
  .workspace-stack-slot-region {
    position: relative;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
  }

  .workspace-stack-slot-region--fullscreen {
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-background-elevated) 48%, transparent),
        color-mix(in srgb, var(--color-background-muted) 72%, transparent)
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-focus) 18%, transparent),
      inset 0 0 0 999px color-mix(in srgb, var(--color-background-overlay) 12%, transparent);
  }

  .workspace-stack-slot-region--fullscreen::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-border-subtle) 14%, transparent),
        color-mix(in srgb, var(--color-border-subtle) 14%, transparent) 0.7rem,
        transparent 0.7rem,
        transparent 1.4rem
      );
    opacity: 0.5;
  }
</style>
