<script lang="ts">
  import type { ToolResourceLoadingState, WorkbenchIconInput, WorkspaceCommand } from '@konitif/workbench';
  import PanelChrome from './PanelChrome.svelte';

  interface PanelChromeAction {
    id: string;
    label: string;
    icon?: WorkbenchIconInput;
    command?: WorkspaceCommand;
    run?: () => void;
    group?: 'tool' | 'dock';
    frequency?: 'common' | 'advanced' | 'debug';
    dockSide?: 'top' | 'right' | 'bottom' | 'left';
    secondaryLabel?: string;
    secondaryTitle?: string;
    secondaryRun?: () => void;
    active?: boolean;
    internalDockSide?: 'top' | 'right' | 'bottom' | 'left';
    internalActive?: boolean;
    internalRun?: () => void;
    disabled?: boolean;
    danger?: boolean;
    children?: PanelChromeAction[];
  }

  interface PanelChromeLayoutAction {
    id:
      | 'toggle-header'
      | 'toggle-fullscreen-toggle'
      | 'split:vertical'
      | 'split:horizontal'
      | 'join-areas'
      | 'swap-areas';
    label: string;
    icon: 'header' | 'fullscreen' | 'split-vertical' | 'split-horizontal' | 'join' | 'swap';
    disabled?: boolean;
    separatorAfter?: boolean;
    command?: WorkspaceCommand;
  }

  interface PanelChromeStatus {
    label: string;
    tone?: 'neutral' | 'attention' | 'success';
  }

  interface PanelChromeToolOption {
    id: string;
    title: string;
    description: string;
    icon?: WorkbenchIconInput;
    keywords?: string[];
  }

  export let panelId: string;
  export let activeToolId: string | null = null;
  export let activeToolIcon: WorkbenchIconInput | null = null;
  export let activePanelShowFullscreenToggle = true;
  export let resourceLoading: ToolResourceLoadingState | null = null;
  export let toolOptions: PanelChromeToolOption[] = [];
  export let toolStatus: PanelChromeStatus | null = null;
  export let headerActions: PanelChromeAction[] = [];
  export let centerActions: PanelChromeAction[] = [];
  export let layoutActions: PanelChromeLayoutAction[] = [];
  export let layoutEditingEnabled = true;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let isDragging = false;
  export let isFullscreen = false;
  export let openActionMenuNonce = 0;
  export let openToolMenuNonce = 0;
  export let actionMenuContextAnchor: { x: number; y: number } | null = null;
  export let toolMenuContextAnchor: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null = null;
  export let showPanelToolSelectorUi = true;
  export let showPanelActionMenuUi = true;
  export let showToggleFullscreenAction = true;
  export let dockToggleButtonsVisible = true;
  export let showClosePanelAction = true;
  export let hoverSuspended = false;
  export let onToggleStackFullscreen: (() => void) | null = null;
  export let onDetachPanel: (() => void) | null = null;
  export let onPanelActionMenuToggle: (() => void) | null = null;
  export let onPanelActionMenuStateChange: ((open: boolean) => void) | null = null;
  export let onPanelToolMenuStateChange: ((open: boolean) => void) | null = null;
  export let onStartLayoutAction:
    | ((actionId: PanelChromeLayoutAction['id'], anchor: { x: number; y: number }) => void)
    | null = null;
</script>

<div class="stack__hidden-menu-host stack-hidden-header-host-region">
  <PanelChrome
    {panelId}
    {activeToolId}
    {activeToolIcon}
    {resourceLoading}
    {toolOptions}
    {toolStatus}
    toolStatusDetail={null}
    {headerActions}
    {centerActions}
    centerMetrics={[]}
    {layoutActions}
    {layoutEditingEnabled}
    {dispatchCommand}
    {isDragging}
    {isFullscreen}
    hiddenHost={true}
    {openActionMenuNonce}
    {openToolMenuNonce}
    {actionMenuContextAnchor}
    {toolMenuContextAnchor}
    onActionMenuToggle={onPanelActionMenuToggle}
    onActionMenuStateChange={onPanelActionMenuStateChange}
    onToolMenuStateChange={onPanelToolMenuStateChange}
    onToggleFullscreen={onToggleStackFullscreen}
    {onDetachPanel}
    {showPanelToolSelectorUi}
    showAddPanelTabAction={false}
    {showPanelActionMenuUi}
    {showToggleFullscreenAction}
    showFullscreenAnchorUi={activePanelShowFullscreenToggle}
    {dockToggleButtonsVisible}
    {showClosePanelAction}
    {onStartLayoutAction}
    {hoverSuspended}
    onStartPanelDrag={null}
  />
</div>

<style>
  .stack-hidden-header-host-region {
    position: absolute;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    overflow: visible;
  }
</style>
