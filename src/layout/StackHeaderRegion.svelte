<script lang="ts">
  import type {
    ToolResourceLoadingState,
    WorkbenchIconInput,
    WorkspaceCommand
  } from '@konitif/workbench';
  import PanelChrome from './PanelChrome.svelte';
  import type { StackPanelLayoutActionId } from './stackPanelLayoutActions';
  import StackTabsRegion from './StackTabsRegion.svelte';

  interface StackTabItem {
    panel: {
      id: string;
      title: string;
    };
    toolIcon: WorkbenchIconInput | null;
    displayTitle: string;
  }

  interface StackChromeAction {
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
    children?: StackChromeAction[];
  }

  interface StackLayoutAction {
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

  interface StackChromeStatus {
    label: string;
    tone?: 'neutral' | 'attention' | 'success';
  }

  interface StackToolOption {
    id: string;
    title: string;
    description: string;
    icon?: WorkbenchIconInput;
    keywords?: string[];
  }

  export let showTabs = false;
  export let tabItems: StackTabItem[] = [];
  export let activePanelId: string | null = null;
  export let activePanelShowFullscreenToggle = true;
  export let isHeaderChromeVisible = true;
  export let stackId: string;
  export let isFullscreen = false;
  export let tabsLabel = 'Panel tabs';
  export let addPanelTabLabel = 'Add a Tool tab';
  export let activeToolId: string | null = null;
  export let activeToolIcon: WorkbenchIconInput | null = null;
  export let resourceLoading: ToolResourceLoadingState | null = null;
  export let toolOptions: StackToolOption[] = [];
  export let toolStatus: StackChromeStatus | null = null;
  export let headerActions: StackChromeAction[] = [];
  export let centerActions: StackChromeAction[] = [];
  export let layoutActions: StackLayoutAction[] = [];
  export let layoutEditingEnabled = true;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let isDragging = false;
  export let openActionMenuNonce = 0;
  export let openToolMenuNonce = 0;
  export let toolMenuContextAnchor: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null = null;
  export let actionMenuContextAnchor: { x: number; y: number } | null = null;
  export let showPanelToolSelectorUi = true;
  export let showPanelActionMenuUi = true;
  export let showToggleFullscreenAction = true;
  export let dockToggleButtonsVisible = true;
  export let showClosePanelAction = true;
  export let showAddPanelTabAction = true;
  export let hoverSuspended = false;
  export let onToggleStackFullscreen: ((stackId: string) => void) | null = null;
  export let onTabPointerDown: (event: PointerEvent, panelId: string) => void;
  export let onTabClick: (panelId: string) => void;
  export let onClosePanelTab: (event: MouseEvent, panelId: string) => void;
  export let onAddPanelTab: (event: MouseEvent) => void;
  export let onPanelActionMenuToggle: () => void;
  export let onPanelActionMenuStateChange: (open: boolean) => void;
  export let onPanelToolMenuStateChange: (open: boolean) => void;
  export let onDetachPanel: (() => void) | null = null;
  export let onStartLayoutAction: (actionId: StackPanelLayoutActionId, anchor: { x: number; y: number }) => void;
  export let onStartPanelDrag: ((anchor: { x: number; y: number }) => void) | null = null;

  $: canShowHeaderChrome = activePanelId && isHeaderChromeVisible;
</script>

<header class:stack-header--with-tabs={showTabs} class="stack-header">
  {#if showTabs}
    <StackTabsRegion
      {tabItems}
      {showClosePanelAction}
      showAddPanelTabAction={layoutEditingEnabled && showAddPanelTabAction}
      {tabsLabel}
      {addPanelTabLabel}
      {activePanelId}
      on:tabpointerdown={({ detail }) => onTabPointerDown(detail.event, detail.panelId)}
      on:tabclick={({ detail }) => onTabClick(detail.panelId)}
      on:close={({ detail }) => onClosePanelTab(detail.event, detail.panelId)}
      on:addpaneltab={({ detail }) => onAddPanelTab(detail.event)}
    />
  {/if}

  {#if canShowHeaderChrome && activePanelId}
    <div class:stack-header__chrome--full={!showTabs} class="stack-header__chrome">
      <PanelChrome
        panelId={activePanelId}
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
        {openActionMenuNonce}
        {openToolMenuNonce}
        {toolMenuContextAnchor}
        {actionMenuContextAnchor}
        onActionMenuToggle={onPanelActionMenuToggle}
        onActionMenuStateChange={onPanelActionMenuStateChange}
        onToolMenuStateChange={onPanelToolMenuStateChange}
        onToggleFullscreen={onToggleStackFullscreen ? () => onToggleStackFullscreen?.(stackId) : null}
        {onDetachPanel}
        {showPanelToolSelectorUi}
        showAddPanelTabAction={layoutEditingEnabled && showAddPanelTabAction && !showTabs}
        {showPanelActionMenuUi}
        {showToggleFullscreenAction}
        {dockToggleButtonsVisible}
        showFullscreenAnchorUi={activePanelShowFullscreenToggle}
        {showClosePanelAction}
        {onStartLayoutAction}
        {hoverSuspended}
        {onStartPanelDrag}
      />
    </div>
  {/if}
</header>

<style>
  .stack-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    background: var(--color-background-muted);
    border-bottom: 1px solid var(--color-border-subtle);
    position: relative;
    z-index: 30;
    min-width: 0;
    width: 100%;
    overflow: visible;
    border-top-left-radius: calc(var(--stack-panel-radius) - 1px);
    border-top-right-radius: calc(var(--stack-panel-radius) - 1px);
  }

  :global(.stack--menu-open) .stack-header {
    z-index: 90;
  }

  :global(.stack--header-hover-suspended) .stack-header {
    pointer-events: none;
  }

  :global(.stack--immersive) .stack-header {
    position: absolute;
    inset: 0 0 auto 0;
    width: 100%;
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-background-canvas) 42%, transparent),
      color-mix(in srgb, var(--color-background-canvas) 18%, transparent) 72%,
      transparent
    );
    border-bottom: 0;
    pointer-events: none;
    border-top-left-radius: calc(var(--stack-panel-radius) - 1px);
    border-top-right-radius: calc(var(--stack-panel-radius) - 1px);
  }

  :global(.stack[data-workbench-tool-header-insets]) .stack-header {
    width: auto;
    margin-left: var(--stack-header-inset-left, 0px);
    margin-right: var(--stack-header-inset-right, 0px);
  }

  :global(.stack--immersive[data-workbench-tool-header-insets]) .stack-header {
    inset: 0 var(--stack-header-inset-right, 0px) auto var(--stack-header-inset-left, 0px);
    width: auto;
    margin: 0;
  }

  :global(.stack--immersive) .stack-header :global(.panel-chrome),
  :global(.stack--immersive) .stack-header :global(.stack-tabs) {
    pointer-events: auto;
  }

  .stack-header__chrome {
    flex: 0 0 auto;
    min-width: 0;
    max-width: 100%;
  }

  .stack-header--with-tabs {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-4);
  }

  .stack-header--with-tabs .stack-header__chrome {
    justify-self: end;
  }

  .stack-header__chrome--full {
    flex: 1 1 auto;
    width: 100%;
  }

  .stack-header__chrome--full :global(.panel-chrome) {
    width: 100%;
  }

  .stack-header__chrome :global(.panel-chrome) {
    min-height: unset;
    padding: var(--space-8);
  }
</style>
