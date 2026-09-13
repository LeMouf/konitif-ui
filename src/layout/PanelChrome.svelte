<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ToolResourceLoadingState, WorkbenchIconInput, WorkspaceCommand } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';
  import { mountWorkbenchPortalNode } from '../portal/workbenchPortalRoot';
  import PanelChromeWindowInteractionBridge from './PanelChromeWindowInteractionBridge.svelte';
  import { shouldArmPanelChromeDrag } from './panelChromeDragModel';

  interface PanelChromeAction {
    id: string;
    label: string;
    icon?: WorkbenchIconInput;
    command?: WorkspaceCommand;
    run?: () => void;
    primaryCommand?: WorkspaceCommand;
    primaryRun?: () => void;
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
    headerButton?: boolean;
    disabled?: boolean;
    danger?: boolean;
    children?: PanelChromeAction[];
  }

  interface PanelChromeDockSideAction {
    id: string;
    side: NonNullable<PanelChromeAction['dockSide']>;
    label: string;
    active: boolean;
    disabled: boolean;
    actions: PanelChromeAction[];
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

  type ActionMenuOpenMode = 'button' | 'context';
  type ToolMenuOpenMode = 'replace' | 'add-tab';
  type ToolMenuAnchorSource = 'selector' | 'add-button' | 'external';
  type ActionMenuAnchorRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  export let panelId: string;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let toolStatus: PanelChromeStatus | null = null;
  export let toolStatusDetail: string | null = null;
  export let resourceLoading: ToolResourceLoadingState | null = null;
  export let headerActions: PanelChromeAction[] = [];
  export let centerActions: PanelChromeAction[] = [];
  export let centerMetrics: string[] = [];
  export let layoutActions: PanelChromeLayoutAction[] = [];
  export let layoutEditingEnabled = true;
  export let activeToolId: string | null = null;
  export let activeToolIcon: WorkbenchIconInput | null = null;
  export let toolOptions: PanelChromeToolOption[] = [];
  export let onStartPanelDrag: ((anchor: { x: number; y: number }) => void) | null = null;
  export let onStartLayoutAction:
    | ((actionId: PanelChromeLayoutAction['id'], anchor: { x: number; y: number }) => void)
    | null = null;
  export let isDragging = false;
  export let isFullscreen = false;
  export let hiddenHost = false;
  export let onToggleFullscreen: (() => void) | null = null;
  export let onDetachPanel: (() => void) | null = null;
  export let showPanelToolSelectorUi = true;
  export let showAddPanelTabAction = true;
  export let showPanelActionMenuUi = true;
  export let showToggleFullscreenAction = true;
  export let showFullscreenAnchorUi = true;
  export let dockToggleButtonsVisible = true;
  export let showClosePanelAction = true;
  export let openActionMenuNonce = 0;
  export let openToolMenuNonce = 0;
  export let toolMenuContextAnchor: ActionMenuAnchorRect | null = null;
  export let actionMenuContextAnchor: { x: number; y: number } | null = null;
  export let onActionMenuToggle: (() => void) | null = null;
  export let onActionMenuStateChange: ((open: boolean) => void) | null = null;
  export let onToolMenuStateChange: ((open: boolean) => void) | null = null;
  export let hoverSuspended = false;

  const PANEL_DRAG_THRESHOLD_PX = 8;
  const HEADER_HOVER_SHOW_DELAY_MS = 300;
  const TOOL_MENU_VIEWPORT_MARGIN = 12;
  const i18nT = getWorkbenchTranslator();

  function portal(node: HTMLElement) {
    return mountWorkbenchPortalNode(node);
  }

  let isToolMenuOpen = false;
  let isActionMenuOpen = false;
  let toolMenuElement: HTMLDivElement | null = null;
  let addPanelTabElement: HTMLSpanElement | null = null;
  let actionMenuElement: HTMLDivElement | null = null;
  let pendingDragAnchor: { x: number; y: number } | null = null;
  let isPointerDragActive = false;
  let isHoverVisible = false;
  let isPointerInsideChrome = false;
  let hoverShowTimer: ReturnType<typeof setTimeout> | null = null;
  let lastOpenActionMenuNonce = openActionMenuNonce;
  let lastOpenToolMenuNonce = openToolMenuNonce;
  let actionMenuSurfaceElement: HTMLDivElement | null = null;
  let toolMenuSurfaceElement: HTMLDivElement | null = null;
  let chromeElement: HTMLDivElement | null = null;
  let actionMenuOpenMode: ActionMenuOpenMode | null = null;
  let toolMenuOpenMode: ToolMenuOpenMode = 'replace';
  let toolMenuAnchorSource: ToolMenuAnchorSource = 'selector';
  let toolMenuAnchorRect: ActionMenuAnchorRect | null = null;
  let actionMenuButtonAnchorRect: ActionMenuAnchorRect | null = null;
  let actionMenuLayoutEpoch = 0;
  let actionMenuLayoutFrame: number | null = null;
  let actionMenuLayoutSettleFrame: number | null = null;
  let lastToolMenuSurfaceElement: HTMLDivElement | null = null;
  let lastActionMenuSurfaceElement: HTMLDivElement | null = null;
  let lastActionMenuContentSignature = '';
  let lastPanelContextSignature = `${panelId}:${activeToolId ?? ''}:${layoutEditingEnabled ? 'layout-on' : 'layout-off'}`;
  const ACTION_MENU_OFFSET = 8;

  $: isDraggable = !!onStartPanelDrag;
  // Adding a tab mutates the workspace topology. Keep this invariant local to
  // the shared chrome so a caller cannot accidentally expose it at runtime.
  $: canShowAddPanelTabAction = layoutEditingEnabled && showAddPanelTabAction;
  // Selecting/replacing a Tool also mutates the workspace composition. The
  // selector therefore belongs exclusively to layout editing, independently
  // of whether the panel currently renders a tab row or a hidden header host.
  $: canShowPanelToolSelectorUi = layoutEditingEnabled && showPanelToolSelectorUi;
  $: isGrabActive = isDragging || isPointerDragActive;
  $: hasSelectedTool = activeToolId !== null;
  $: hasHoverAffordance = isHoverVisible || isToolMenuOpen || isActionMenuOpen || isGrabActive;
  $: if (hoverSuspended) {
    clearHoverShowTimer();
    isPointerInsideChrome = false;
    isHoverVisible = false;
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    closeActionMenu();
  }
  $: if (!canShowPanelToolSelectorUi) {
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
  }
  $: if (!showPanelActionMenuUi) {
    closeActionMenu();
  }
  $: panelContextSignature = `${panelId}:${activeToolId ?? ''}:${layoutEditingEnabled ? 'layout-on' : 'layout-off'}`;
  $: if (panelContextSignature !== lastPanelContextSignature) {
    lastPanelContextSignature = panelContextSignature;
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
  }
  $: if (openActionMenuNonce !== lastOpenActionMenuNonce) {
    lastOpenActionMenuNonce = openActionMenuNonce;
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    actionMenuOpenMode = actionMenuContextAnchor ? 'context' : 'button';
    actionMenuButtonAnchorRect = actionMenuContextAnchor ? null : readActionMenuAnchorRect(actionMenuElement);
    isActionMenuOpen = true;
    isHoverVisible = true;

    if (actionMenuContextAnchor) {
      blurChromeFocus();
    }
  }
  $: if (openToolMenuNonce !== lastOpenToolMenuNonce) {
    lastOpenToolMenuNonce = openToolMenuNonce;
    if (canShowPanelToolSelectorUi) {
      closeActionMenu();
      toolMenuOpenMode = 'add-tab';
      toolMenuAnchorSource = 'external';
      isToolMenuOpen = true;
      isHoverVisible = true;
      toolMenuAnchorRect = toolMenuContextAnchor;
      scheduleActionMenuLayoutRefresh('tool-open');
    }
  }
  $: onToolMenuStateChange?.(isToolMenuOpen);
  $: onActionMenuStateChange?.(isActionMenuOpen);
  $: resourceLoadingTitle = resourceLoading
    ? [resourceLoading.label, resourceLoading.detail].filter(Boolean).join(' · ')
    : '';
  $: toolTriggerTitle = hasSelectedTool
    ? $i18nT('ui.shell.panelChrome.toolTrigger.change', {
        default: 'Change the tool displayed in this panel'
      })
    : $i18nT('ui.shell.panelChrome.toolTrigger.choose', {
        default: 'Choose the tool displayed in this panel'
      });
  $: fullscreenLabel = isFullscreen
    ? $i18nT('ui.shell.panelChrome.fullscreen.exit', { default: 'Exit fullscreen panel view' })
    : $i18nT('ui.shell.panelChrome.fullscreen.open', { default: 'Open fullscreen panel view' });
  $: panelActionMenuLabel = $i18nT('ui.shell.panelChrome.actionMenu.ariaLabel', { default: 'Panel actions' });
  $: addPanelTabLabel = $i18nT('ui.shell.panelChrome.addPanelTab', {
    default: 'Add a Tool tab'
  });
  $: toolMenuLabel =
    toolMenuOpenMode === 'add-tab'
      ? $i18nT('ui.shell.panelChrome.addPanelTabMenu.label', { default: 'New Tool tab' })
      : $i18nT('ui.shell.panelChrome.toolMenu.label', { default: 'Panel Tool' });
  $: toolMenuCopy =
    toolMenuOpenMode === 'add-tab'
      ? $i18nT('ui.shell.panelChrome.addPanelTabMenu.copy', {
          default: 'Choose the Tool to open in a new tab.'
        })
      : $i18nT('ui.shell.panelChrome.toolMenu.copy', {
          default: 'Choose what this panel displays.'
        });
  $: fullscreenMenuLabel = isFullscreen
    ? $i18nT('ui.shell.panelChrome.actionMenu.exitFullscreen', { default: 'Exit Fullscreen' })
    : $i18nT('ui.shell.panelChrome.actionMenu.enterFullscreen', { default: 'Enter Fullscreen' });
  $: resourceLoadingProgressStyle =
    resourceLoading && typeof resourceLoading.progress === 'number'
      ? `width: ${Math.max(4, Math.round(resourceLoading.progress * 100))}%;`
      : '';
  $: toolHeaderActions = headerActions.filter((action) => (action.group ?? 'tool') === 'tool');
  $: dockHeaderActions = headerActions.filter((action) => action.group === 'dock');
  $: dockHeaderButtonActions = dockHeaderActions.filter((action) => action.headerButton);
  $: dockSideActions = createDockSideActions(dockHeaderActions.filter((action) => !action.headerButton));
  $: translatedToolStatusLabel = toolStatus ? translateToolStatusLabel(toolStatus.label, $i18nT) : '';
  $: effectiveActionMenuContextAnchor = actionMenuOpenMode === 'context' ? actionMenuContextAnchor : null;
  $: actionMenuContentSignature = createActionMenuContentSignature(
    toolHeaderActions,
    dockHeaderActions,
    layoutActions,
    isFullscreen,
    showToggleFullscreenAction,
    showClosePanelAction,
    Boolean(onDetachPanel)
  );
  $: if (isActionMenuOpen && actionMenuContentSignature !== lastActionMenuContentSignature) {
    lastActionMenuContentSignature = actionMenuContentSignature;
    scheduleActionMenuLayoutRefresh('content');
  } else if (!isActionMenuOpen && lastActionMenuContentSignature) {
    lastActionMenuContentSignature = '';
  }
  $: if (toolMenuSurfaceElement !== lastToolMenuSurfaceElement) {
    lastToolMenuSurfaceElement = toolMenuSurfaceElement;

    if (isToolMenuOpen && toolMenuSurfaceElement) {
      scheduleActionMenuLayoutRefresh('tool-surface');
    }
  }
  $: if (actionMenuSurfaceElement !== lastActionMenuSurfaceElement) {
    lastActionMenuSurfaceElement = actionMenuSurfaceElement;

    if (isActionMenuOpen && actionMenuSurfaceElement) {
      scheduleActionMenuLayoutRefresh('action-surface');
    }
  }
  $: actionMenuStyle =
    (void actionMenuLayoutEpoch,
    isActionMenuOpen && actionMenuSurfaceElement
      ? resolveActionMenuStyle(
          effectiveActionMenuContextAnchor,
          actionMenuButtonAnchorRect,
          actionMenuElement,
          actionMenuSurfaceElement
        )
      : isActionMenuOpen
        ? resolvePendingActionMenuStyle(
            effectiveActionMenuContextAnchor,
            actionMenuButtonAnchorRect,
            actionMenuElement
          )
        : '');
  $: actionMenuSubmenuPlacement =
    (void actionMenuLayoutEpoch,
    isActionMenuOpen && actionMenuSurfaceElement
      ? resolveActionMenuSubmenuPlacement(actionMenuSurfaceElement)
      : 'right');
  $: toolMenuStyle =
    (void actionMenuLayoutEpoch,
    isToolMenuOpen && toolMenuSurfaceElement
      ? resolveToolMenuStyle(toolMenuAnchorRect, toolMenuElement, toolMenuSurfaceElement)
      : isToolMenuOpen
        ? resolvePendingToolMenuStyle(toolMenuAnchorRect, toolMenuElement)
        : '');
  function clearHoverShowTimer(): void {
    if (hoverShowTimer) {
      clearTimeout(hoverShowTimer);
      hoverShowTimer = null;
    }
  }

  function handleChromePointerEnter(): void {
    if (hoverSuspended) {
      return;
    }

    isPointerInsideChrome = true;
    clearHoverShowTimer();
    hoverShowTimer = setTimeout(() => {
      isHoverVisible = true;
      hoverShowTimer = null;
    }, HEADER_HOVER_SHOW_DELAY_MS);
  }

  function handleChromePointerLeave(): void {
    isPointerInsideChrome = false;
    clearHoverShowTimer();

    if (isToolMenuOpen || isActionMenuOpen) {
      return;
    }

    isHoverVisible = false;
  }

  function blurChromeFocus(): void {
    const activeElement = document.activeElement as HTMLElement | null;

    if (activeElement && chromeElement?.contains(activeElement)) {
      activeElement.blur();
    }
  }

  function syncHoverVisibilityAfterMenuClose(): void {
    if (!isPointerInsideChrome && !isGrabActive) {
      isHoverVisible = false;
    }
  }

  function focusPanel(): void {
    dispatchCommand({ type: 'focus-panel', panelId });
  }

  function focusThen(command: WorkspaceCommand): void {
    focusPanel();
    dispatchCommand(command);
  }

  function translateToolStatusToken(token: string, translate: WorkbenchTranslate): string {
    switch (token.trim()) {
      case 'Dirty':
        return translate('ui.shell.panelChrome.status.dirty', { default: 'Dirty' });
      case 'Not run':
        return translate('ui.shell.panelChrome.status.notRun', { default: 'Not run' });
      case 'Idle':
        return translate('ui.shell.panelChrome.status.idle', { default: 'Idle' });
      case 'Graph Ready':
        return translate('ui.shell.panelChrome.status.graphReady', { default: 'Graph Ready' });
      case 'Ready':
        return translate('ui.shell.panelChrome.status.ready', { default: 'Ready' });
      case 'Playing':
        return translate('ui.shell.panelChrome.status.playing', { default: 'Playing' });
      case 'Live observation':
        return translate('ui.shell.panelChrome.status.liveObservation', { default: 'Live observation' });
      default:
        return token;
    }
  }

  function translateToolStatusLabel(label: string, translate: WorkbenchTranslate): string {
    const issueMatch = label.match(/^Dirty\s+•\s+(\d+)\s+issue(s)?$/);
    const selectedMatch = label.match(/^Selected:\s+(.+)$/);
    const focusedMatch = label.match(/^Focused:\s+(.+)$/);

    if (issueMatch) {
      const count = Number(issueMatch[1]);
      return translate('ui.shell.panelChrome.status.dirtyIssueCount', {
        default: 'Dirty • {{count}} issue{{plural}}',
        values: {
          count,
          plural: count > 1 ? 's' : ''
        }
      });
    }

    if (selectedMatch) {
      return translate('ui.shell.panelChrome.status.selected', {
        default: 'Selected: {{label}}',
        values: { label: selectedMatch[1] ?? '' }
      });
    }

    if (focusedMatch) {
      return translate('ui.shell.panelChrome.status.focused', {
        default: 'Focused: {{label}}',
        values: { label: focusedMatch[1] ?? '' }
      });
    }

    return label
      .split('•')
      .map((token) => translateToolStatusToken(token, translate))
      .join(' • ');
  }

  function handleIconAction(event: MouseEvent, command: WorkspaceCommand): void {
    event.stopPropagation();
    focusThen(command);
  }

  function toggleToolMenu(event: MouseEvent): void {
    event.stopPropagation();
    focusPanel();
    closeActionMenu();
    toolMenuOpenMode = 'replace';
    toolMenuAnchorSource = 'selector';
    isToolMenuOpen = !isToolMenuOpen;
    toolMenuAnchorRect = isToolMenuOpen ? readActionMenuAnchorRect(toolMenuElement) : null;

    if (isToolMenuOpen) {
      scheduleActionMenuLayoutRefresh('tool-open');
    }

    if (!isToolMenuOpen) {
      syncHoverVisibilityAfterMenuClose();
    }
  }

  function toggleActionMenu(event: MouseEvent): void {
    event.stopPropagation();
    focusPanel();
    isToolMenuOpen = false;
    actionMenuOpenMode = isActionMenuOpen ? null : 'button';
    isActionMenuOpen = !isActionMenuOpen;
    actionMenuButtonAnchorRect = isActionMenuOpen ? readActionMenuAnchorRect(actionMenuElement) : null;
    onActionMenuToggle?.();

    if (isActionMenuOpen) {
      scheduleActionMenuLayoutRefresh('open');
      return;
    }

    if (!isActionMenuOpen) {
      syncHoverVisibilityAfterMenuClose();
    }
  }

  function addPanelTab(event: MouseEvent): void {
    event.stopPropagation();
    focusPanel();
    closeActionMenu();
    toolMenuOpenMode = 'add-tab';
    toolMenuAnchorSource = 'add-button';
    isToolMenuOpen = true;
    isHoverVisible = true;
    toolMenuAnchorRect = readActionMenuAnchorRect(addPanelTabElement);
    scheduleActionMenuLayoutRefresh('tool-open');
  }

  function addPanelTabFromLayout(event: MouseEvent): void {
    event.stopPropagation();
    const anchor = readActionMenuAnchorRect(event.currentTarget as HTMLElement);
    toolMenuContextAnchor = anchor;
    focusPanel();
    closeActionMenu();
    toolMenuOpenMode = 'add-tab';
    toolMenuAnchorSource = 'external';
    toolMenuAnchorRect = anchor;
    isToolMenuOpen = true;
    isHoverVisible = true;
    scheduleActionMenuLayoutRefresh('tool-open');
  }

  function closeActionMenu(): void {
    isActionMenuOpen = false;
    actionMenuOpenMode = null;
    actionMenuButtonAnchorRect = null;
  }

  function openTool(toolId: string): void {
    dispatchCommand(
      toolMenuOpenMode === 'add-tab'
        ? { type: 'open-tool-in-new-tab', panelId, toolId }
        : { type: 'open-tool-in-panel', panelId, toolId }
    );
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    syncHoverVisibilityAfterMenuClose();
  }

  function runAction(command: WorkspaceCommand): void {
    focusThen(command);
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
  }

  function runPanelAction(action: PanelChromeAction): boolean {
    if (action.run) {
      focusPanel();
      action.run();
      return true;
    }

    if (action.command) {
      focusThen(action.command);
      return true;
    }

    return false;
  }

  function handleMenuAction(action: PanelChromeAction): void {
    if (action.disabled || action.children?.length) {
      return;
    }

    if (runPanelAction(action)) {
      closeActionMenu();
      syncHoverVisibilityAfterMenuClose();
    }
  }

  function handleSubmenuParentAction(action: PanelChromeAction): void {
    if (action.disabled) {
      return;
    }

    if (action.primaryRun) {
      focusPanel();
      action.primaryRun();
      closeActionMenu();
      syncHoverVisibilityAfterMenuClose();
      return;
    }

    if (action.primaryCommand) {
      runAction(action.primaryCommand);
    }
  }

  function handleSecondaryMenuAction(action: PanelChromeAction): void {
    if (action.disabled || !action.secondaryRun) {
      return;
    }

    focusPanel();
    action.secondaryRun();
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
  }

  function handleDockSideHeaderAction(event: MouseEvent, dockSideAction: PanelChromeDockSideAction): void {
    event.stopPropagation();

    if (dockSideAction.disabled) {
      return;
    }

    const nextVisible = !dockSideAction.active;

    for (const action of dockSideAction.actions) {
      if (action.disabled || !action.internalRun || Boolean(action.internalActive) === nextVisible) {
        continue;
      }

      action.internalRun();
    }
  }

  function handleDockHeaderButtonAction(event: MouseEvent, action: PanelChromeAction): void {
    event.stopPropagation();

    if (action.disabled) {
      return;
    }

    if (action.run) {
      action.run();
      return;
    }

    if (action.command) {
      dispatchCommand(action.command);
    }
  }

  function handleCenterAction(action: PanelChromeAction): void {
    if (action.children?.length === 1) {
      handleMenuAction(action.children[0]!);
      return;
    }

    handleMenuAction(action);
  }

  function resolveHeaderActionIcon(action: PanelChromeAction): WorkbenchIconInput {
    if (action.icon) {
      return action.icon;
    }

    const token = `${action.id} ${action.label}`.toLowerCase();

    if (action.group === 'dock') {
      return resolveDockActionIcon(action.dockSide);
    }

    if (token.includes('focus')) {
      return 'action.focus';
    }

    if (token.includes('clear')) {
      return 'action.clear';
    }

    if (token.includes('layer')) {
      return 'layout.panel-stack';
    }

    if (token.includes('performance')) {
      return 'action.audio-meter';
    }

    if (token.includes('debug')) {
      return 'runtime.engine';
    }

    if (token.includes('reset')) {
      return 'action.reset';
    }

    return 'action.command';
  }

  function createDockSideActions(actions: PanelChromeAction[]): PanelChromeDockSideAction[] {
    const actionsBySide = new Map<NonNullable<PanelChromeAction['dockSide']>, PanelChromeAction[]>();
    const sideOrder: Array<NonNullable<PanelChromeAction['dockSide']>> = ['left', 'right', 'bottom', 'top'];

    for (const action of actions.filter((candidate) => candidate.internalRun)) {
      const side = action.internalDockSide ?? action.dockSide ?? 'left';
      actionsBySide.set(side, [...(actionsBySide.get(side) ?? []), action]);
    }

    return sideOrder.flatMap((side) => {
      const sideActions = actionsBySide.get(side) ?? [];

      if (sideActions.length === 0) {
        return [];
      }

      const active = sideActions.some((action) => action.internalActive);
      const disabled = !sideActions.some((action) => !action.disabled && action.internalRun);
      const sideLabel = resolveDockSideLabel(side);
      const label = active
        ? $i18nT('ui.shell.panelChrome.dockButtons.hideSide', {
            default: `Hide ${sideLabel} dock`,
            values: { side: sideLabel }
          })
        : $i18nT('ui.shell.panelChrome.dockButtons.showSide', {
            default: `Show ${sideLabel} dock`,
            values: { side: sideLabel }
          });

      return [
        {
          id: `dock-side:${side}`,
          side,
          label,
          active,
          disabled,
          actions: sideActions
        }
      ];
    });
  }

  function resolveDockSideLabel(side: NonNullable<PanelChromeAction['dockSide']>): string {
    if (side === 'right') {
      return $i18nT('ui.shell.panelChrome.dockButtons.side.right', { default: 'right' });
    }

    if (side === 'bottom') {
      return $i18nT('ui.shell.panelChrome.dockButtons.side.bottom', { default: 'bottom' });
    }

    if (side === 'top') {
      return $i18nT('ui.shell.panelChrome.dockButtons.side.top', { default: 'top' });
    }

    return $i18nT('ui.shell.panelChrome.dockButtons.side.left', { default: 'left' });
  }

  function resolveDockActionIcon(dockSide: PanelChromeAction['dockSide']): WorkbenchIconInput {
    if (dockSide === 'left') {
      return 'layout.sidebar-left';
    }

    if (dockSide === 'right') {
      return 'layout.sidebar-right';
    }

    if (dockSide === 'bottom') {
      return 'layout.panel-bottom';
    }

    if (dockSide === 'top') {
      return 'layout.panel-top';
    }

    return 'action.command';
  }

  function createActionMenuContentSignature(
    toolActions: PanelChromeAction[],
    dockActions: PanelChromeAction[],
    nextLayoutActions: PanelChromeLayoutAction[],
    nextFullscreen: boolean,
    nextShowToggleFullscreenAction: boolean,
    nextShowClosePanelAction: boolean,
    nextCanDetachPanel: boolean
  ): string {
    return [
      nextFullscreen ? 'fullscreen' : 'windowed',
      nextShowToggleFullscreenAction ? 'fullscreen-action' : 'no-fullscreen-action',
      nextShowClosePanelAction ? 'close-action' : 'no-close-action',
      nextCanDetachPanel ? 'detach-action' : 'no-detach-action',
      ...toolActions.map(createPanelActionSignature),
      ...dockActions.map(createPanelActionSignature),
      ...nextLayoutActions.map((action) =>
        [
          action.id,
          action.label,
          action.disabled ? 'disabled' : 'enabled',
          action.separatorAfter ? 'separator' : ''
        ].join(':')
      )
    ].join('|');
  }

  function createPanelActionSignature(action: PanelChromeAction): string {
    return [
      action.id,
      action.label,
      action.group ?? 'tool',
      action.dockSide ?? '',
      action.secondaryLabel ?? '',
      action.disabled ? 'disabled' : 'enabled',
      action.danger ? 'danger' : '',
      ...(action.children ?? []).map(createPanelActionSignature)
    ].join(':');
  }

  function scheduleActionMenuLayoutRefresh(_reason = 'layout'): void {
    if ((!isActionMenuOpen && !isToolMenuOpen) || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    if (actionMenuLayoutFrame !== null) {
      return;
    }

    actionMenuLayoutFrame = requestAnimationFrame(() => {
      actionMenuLayoutFrame = null;
      refreshOpenMenuAnchors();
      actionMenuLayoutEpoch += 1;

      if (actionMenuLayoutSettleFrame === null && (isActionMenuOpen || isToolMenuOpen)) {
        actionMenuLayoutSettleFrame = requestAnimationFrame(() => {
          actionMenuLayoutSettleFrame = null;
          refreshOpenMenuAnchors();
          actionMenuLayoutEpoch += 1;
        });
      }
    });
  }

  function refreshOpenMenuAnchors(): void {
    if (isToolMenuOpen) {
      toolMenuAnchorRect =
        toolMenuAnchorSource === 'external'
          ? toolMenuContextAnchor
          : readActionMenuAnchorRect(
              toolMenuAnchorSource === 'add-button' ? addPanelTabElement : toolMenuElement
            );
    }

    if (isActionMenuOpen && actionMenuOpenMode === 'button') {
      actionMenuButtonAnchorRect = readActionMenuAnchorRect(actionMenuElement);
    }
  }

  function handleViewportLayoutChange(): void {
    refreshOpenMenuAnchors();
    scheduleActionMenuLayoutRefresh('viewport');
  }

  function resolveLayoutActionIcon(icon: PanelChromeLayoutAction['icon']): WorkbenchIconInput {
    if (icon === 'header') {
      return 'action.header';
    }

    if (icon === 'fullscreen') {
      return 'action.fullscreen';
    }

    if (icon === 'split-vertical') {
      return 'action.split-vertical';
    }

    if (icon === 'split-horizontal') {
      return 'action.split-horizontal';
    }

    if (icon === 'join') {
      return 'action.join';
    }

    return 'action.swap';
  }

  function handleLayoutAction(event: MouseEvent, action: PanelChromeLayoutAction): void {
    if (action.disabled) {
      return;
    }

    event.stopPropagation();
    focusPanel();
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();

    if (action.command) {
      dispatchCommand(action.command);
      return;
    }

    if (!onStartLayoutAction) {
      return;
    }

    const button = event.currentTarget as HTMLElement | null;
    const rect = button?.getBoundingClientRect();

    onStartLayoutAction(action.id, {
      x: rect ? rect.left + rect.width / 2 : 0,
      y: rect ? rect.top + rect.height / 2 : 0
    });
  }

  function handleToggleFullscreen(event: MouseEvent): void {
    if (!onToggleFullscreen) {
      return;
    }

    event.stopPropagation();
    focusPanel();
    onToggleFullscreen();
    (event.currentTarget as HTMLButtonElement | null)?.blur();
  }

  function handleFullscreenMenuAction(): void {
    if (!onToggleFullscreen) {
      return;
    }

    focusPanel();
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
    onToggleFullscreen();
  }

  function handleDetachPanelMenuAction(): void {
    if (!onDetachPanel) {
      return;
    }

    focusPanel();
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
    onDetachPanel();
  }

  function resolvePendingActionMenuStyle(
    anchor: { x: number; y: number } | null,
    anchorRect: ActionMenuAnchorRect | null,
    anchorElement: HTMLDivElement | null
  ): string {
    const fallbackWidth = 208;
    const maxLeft = Math.max(ACTION_MENU_OFFSET, window.innerWidth - fallbackWidth - ACTION_MENU_OFFSET);
    const maxTop = Math.max(ACTION_MENU_OFFSET, window.innerHeight - ACTION_MENU_OFFSET);

    if (anchor) {
      const left = Math.min(Math.max(ACTION_MENU_OFFSET, anchor.x), maxLeft);
      const top = Math.min(Math.max(ACTION_MENU_OFFSET, anchor.y), maxTop);
      return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
    }

    const resolvedAnchorRect = anchorRect ?? readActionMenuAnchorRect(anchorElement);

    if (!resolvedAnchorRect) {
      return `position: fixed; left: ${ACTION_MENU_OFFSET}px; top: ${ACTION_MENU_OFFSET}px; right: auto;`;
    }

    const left = Math.min(Math.max(ACTION_MENU_OFFSET, resolvedAnchorRect.right - fallbackWidth), maxLeft);
    const top = Math.min(Math.max(ACTION_MENU_OFFSET, resolvedAnchorRect.bottom + 6), maxTop);

    return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
  }

  function resolveActionMenuStyle(
    anchor: { x: number; y: number } | null,
    anchorRect: ActionMenuAnchorRect | null,
    anchorElement: HTMLDivElement | null,
    menuElement: HTMLDivElement
  ): string {
    const rect = menuElement.getBoundingClientRect();
    const maxLeft = Math.max(ACTION_MENU_OFFSET, window.innerWidth - rect.width - ACTION_MENU_OFFSET);
    const maxTop = Math.max(ACTION_MENU_OFFSET, window.innerHeight - rect.height - ACTION_MENU_OFFSET);

    if (anchor) {
      const left = Math.min(anchor.x, maxLeft);
      const top = Math.min(anchor.y, maxTop);
      return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
    }

    const resolvedAnchorRect = anchorRect ?? readActionMenuAnchorRect(anchorElement);

    if (!resolvedAnchorRect) {
      return '';
    }

    const preferredLeft = resolvedAnchorRect.right - rect.width;
    const preferredBelowTop = resolvedAnchorRect.bottom + 6;
    const preferredAboveTop = resolvedAnchorRect.top - rect.height - 6;
    const hasRoomBelow = preferredBelowTop <= maxTop;
    const top = hasRoomBelow ? preferredBelowTop : Math.max(ACTION_MENU_OFFSET, preferredAboveTop);
    const left = Math.min(Math.max(ACTION_MENU_OFFSET, preferredLeft), maxLeft);

    return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
  }

  function resolveActionMenuSubmenuPlacement(menuElement: HTMLElement): 'left' | 'right' {
    const rect = menuElement.getBoundingClientRect();
    return rect.left + rect.width / 2 > window.innerWidth / 2 ? 'left' : 'right';
  }

  function readActionMenuAnchorRect(anchorElement: HTMLElement | null): ActionMenuAnchorRect | null {
    if (!anchorElement) {
      return null;
    }

    const rect = anchorElement.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function resolvePendingToolMenuStyle(
    anchorRect: ActionMenuAnchorRect | null,
    anchorElement: HTMLDivElement | null
  ): string {
    const fallbackWidth = 432;
    const maxLeft = Math.max(
      TOOL_MENU_VIEWPORT_MARGIN,
      window.innerWidth - fallbackWidth - TOOL_MENU_VIEWPORT_MARGIN
    );
    const resolvedAnchorRect = anchorRect ?? readActionMenuAnchorRect(anchorElement);

    if (!resolvedAnchorRect) {
      return `position: fixed; left: ${TOOL_MENU_VIEWPORT_MARGIN}px; top: ${TOOL_MENU_VIEWPORT_MARGIN}px; right: auto;`;
    }

    const left = Math.min(Math.max(TOOL_MENU_VIEWPORT_MARGIN, resolvedAnchorRect.left), maxLeft);
    const top = Math.min(
      Math.max(TOOL_MENU_VIEWPORT_MARGIN, resolvedAnchorRect.bottom + 6),
      Math.max(TOOL_MENU_VIEWPORT_MARGIN, window.innerHeight - TOOL_MENU_VIEWPORT_MARGIN)
    );

    return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
  }

  function resolveToolMenuStyle(
    anchorRect: ActionMenuAnchorRect | null,
    anchorElement: HTMLDivElement | null,
    menuElement: HTMLDivElement
  ): string {
    const resolvedAnchorRect = anchorRect ?? readActionMenuAnchorRect(anchorElement);

    if (!resolvedAnchorRect) {
      return '';
    }

    const rect = menuElement.getBoundingClientRect();
    const maxLeft = Math.max(
      TOOL_MENU_VIEWPORT_MARGIN,
      window.innerWidth - rect.width - TOOL_MENU_VIEWPORT_MARGIN
    );
    const maxTop = Math.max(
      TOOL_MENU_VIEWPORT_MARGIN,
      window.innerHeight - rect.height - TOOL_MENU_VIEWPORT_MARGIN
    );
    const left = Math.min(Math.max(TOOL_MENU_VIEWPORT_MARGIN, resolvedAnchorRect.left), maxLeft);
    const top = Math.min(Math.max(TOOL_MENU_VIEWPORT_MARGIN, resolvedAnchorRect.bottom + 6), maxTop);

    return `position: fixed; left: ${left}px; top: ${top}px; right: auto;`;
  }

  function handleChromePointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    const targetIsControl = Boolean(
      target?.closest(
        'button, input, select, textarea, a, [role="button"], [role="menuitem"], [role="dialog"], [role="menu"]'
      )
    );

    if (targetIsControl) {
      queueMicrotask(() => focusPanel());
      return;
    }

    focusPanel();

    const interactiveOwner = target?.closest('[data-workbench-interactive]') ?? null;
    if (
      !shouldArmPanelChromeDrag({
        button: event.button,
        hasDragHandler: Boolean(onStartPanelDrag),
        hoverSuspended,
        targetIsControl,
        targetIsNestedInteractive: interactiveOwner !== null && interactiveOwner !== chromeElement
      })
    ) {
      return;
    }

    pendingDragAnchor = {
      x: event.clientX,
      y: event.clientY
    };
    isPointerDragActive = true;
  }

  function handleWindowOutsidePointerDown(): void {
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
    blurChromeFocus();
  }

  function handleWindowEscapeKeyDown(): void {
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
    blurChromeFocus();
    pendingDragAnchor = null;
    isPointerDragActive = false;
  }

  function handleCloseFloatingSurfaces(): void {
    isToolMenuOpen = false;
    toolMenuAnchorRect = null;
    closeActionMenu();
    syncHoverVisibilityAfterMenuClose();
  }

  function handleWindowPointerMove(event: CustomEvent<PointerEvent>): void {
    if (!pendingDragAnchor || !isPointerDragActive || !onStartPanelDrag) {
      return;
    }

    const pointerEvent = event.detail;
    const deltaX = pointerEvent.clientX - pendingDragAnchor.x;
    const deltaY = pointerEvent.clientY - pendingDragAnchor.y;

    if (Math.hypot(deltaX, deltaY) < PANEL_DRAG_THRESHOLD_PX) {
      return;
    }

    onStartPanelDrag(pendingDragAnchor);
    pendingDragAnchor = null;
  }

  function handleWindowPointerUp(): void {
    pendingDragAnchor = null;
    isPointerDragActive = false;
  }

  onDestroy(() => {
    clearHoverShowTimer();

    if (actionMenuLayoutFrame !== null) {
      cancelAnimationFrame(actionMenuLayoutFrame);
      actionMenuLayoutFrame = null;
    }

    if (actionMenuLayoutSettleFrame !== null) {
      cancelAnimationFrame(actionMenuLayoutSettleFrame);
      actionMenuLayoutSettleFrame = null;
    }
  });
</script>

<PanelChromeWindowInteractionBridge
  {toolMenuElement}
  {toolMenuSurfaceElement}
  {actionMenuElement}
  {actionMenuSurfaceElement}
  on:outsidepointerdown={handleWindowOutsidePointerDown}
  on:escapekeydown={handleWindowEscapeKeyDown}
  on:pointermove={handleWindowPointerMove}
  on:pointerup={handleWindowPointerUp}
  on:viewportlayoutchange={handleViewportLayoutChange}
  on:closefloatingsurfaces={handleCloseFloatingSurfaces}
/>

<div
  bind:this={chromeElement}
  class:panel-chrome--draggable={isDraggable}
  class:panel-chrome--dragging={isGrabActive}
  class:panel-chrome--hover-active={hasHoverAffordance}
  class:panel-chrome--hover-suspended={hoverSuspended}
  class:panel-chrome--with-center={centerActions.length > 0 || centerMetrics.length > 0}
  class:panel-chrome--hidden-host={hiddenHost}
  class="panel-chrome"
  data-workbench-interactive
  on:pointerenter={handleChromePointerEnter}
  on:pointerleave={handleChromePointerLeave}
  on:pointerdown|stopPropagation={handleChromePointerDown}
>
  {#if resourceLoading && !hiddenHost}
    <div
      class="panel-chrome__resource-loading"
      role="status"
      aria-live="polite"
      aria-label={resourceLoading.label}
      title={resourceLoadingTitle}
    >
      <span
        class:panel-chrome__resource-loading-bar--indeterminate={typeof resourceLoading.progress !== 'number'}
        class="panel-chrome__resource-loading-bar"
        style={resourceLoadingProgressStyle}
      ></span>
    </div>
  {/if}

  <div class="panel-chrome__identity">
    {#if canShowPanelToolSelectorUi}
      <div class="panel-chrome__tool-menu-anchor" bind:this={toolMenuElement}>
        <button
          type="button"
          class:panel-chrome__tool-trigger--compact={hasSelectedTool}
          class:panel-chrome__tool-trigger--active={isToolMenuOpen}
          class="panel-chrome__tool-trigger"
          aria-expanded={isToolMenuOpen}
          aria-haspopup="dialog"
          title={toolTriggerTitle}
          on:click={toggleToolMenu}
        >
          {#if activeToolIcon}
            <span class="panel-chrome__tool-trigger-icon">
              <WorkbenchIcon icon={activeToolIcon} label={toolTriggerTitle} />
            </span>
          {:else}
            <span class="panel-chrome__tool-trigger-icon panel-chrome__tool-trigger-icon--placeholder">?</span
            >
          {/if}
          <WorkbenchIcon
            className="panel-chrome__tool-trigger-chevron"
            icon="action.chevron-down"
            label={toolTriggerTitle}
          />
        </button>

        {#if isToolMenuOpen}
          <div
            use:portal
            bind:this={toolMenuSurfaceElement}
            class="panel-chrome__tool-menu"
            style={toolMenuStyle}
            role="dialog"
            aria-label={$i18nT('ui.shell.panelChrome.toolMenu.ariaLabel', { default: 'Available tools' })}
          >
            <div class="panel-chrome__tool-menu-header">
              <p class="panel-chrome__tool-menu-label">
                {toolMenuLabel}
              </p>
              <p class="panel-chrome__tool-menu-copy">
                {toolMenuCopy}
              </p>
            </div>

            <div class="panel-chrome__tool-menu-list">
              {#each toolOptions as tool (tool.id)}
                <button
                  type="button"
                  class:panel-chrome__tool-option--current={toolMenuOpenMode === 'replace' &&
                    tool.id === activeToolId}
                  class="panel-chrome__tool-option"
                  on:click|stopPropagation={() => openTool(tool.id)}
                >
                  {#if tool.icon}
                    <span class="panel-chrome__tool-option-icon">
                      <WorkbenchIcon icon={tool.icon} label={tool.title} />
                    </span>
                  {:else}
                    <span class="panel-chrome__tool-option-icon panel-chrome__tool-option-icon--placeholder"
                      >•</span
                    >
                  {/if}
                  <span class="panel-chrome__tool-option-main">
                    <span class="panel-chrome__tool-option-title">{tool.title}</span>
                    <span class="panel-chrome__tool-option-copy">{tool.description}</span>
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      {#if canShowAddPanelTabAction}
        <span class="panel-chrome__add-tab-anchor" bind:this={addPanelTabElement}>
          <IconButton
            label={addPanelTabLabel}
            title={addPanelTabLabel}
            variant="ghost"
            icon="action.add"
            on:click={addPanelTab}
          />
        </span>
      {/if}
    {/if}
    {#if toolStatus}
      <div class="panel-chrome__meta">
        <span
          class:panel-chrome__tool-status--attention={toolStatus.tone === 'attention'}
          class:panel-chrome__tool-status--success={toolStatus.tone === 'success'}
          class="panel-chrome__tool-status"
        >
          {translatedToolStatusLabel}
        </span>
        {#if toolStatusDetail}
          <span class="panel-chrome__tool-status-detail" title={toolStatusDetail}>
            {toolStatusDetail}
          </span>
        {/if}
      </div>
    {/if}
  </div>

  {#if centerActions.length > 0 || centerMetrics.length > 0}
    <div class="panel-chrome__center">
      {#each centerActions as action (action.id)}
        <button
          type="button"
          class="panel-chrome__center-button"
          title={action.label}
          on:click|stopPropagation={() => handleCenterAction(action)}
        >
          {action.label}
        </button>
      {/each}

      {#each centerMetrics as metric (metric)}
        <span class="panel-chrome__center-metric">{metric}</span>
      {/each}
    </div>
  {/if}

  <div class="panel-chrome__actions">
    {#if onToggleFullscreen && showToggleFullscreenAction && showFullscreenAnchorUi}
      <div
        class:panel-chrome__header-button--visible={isFullscreen || hiddenHost}
        class="panel-chrome__header-button panel-chrome__fullscreen-anchor"
      >
        <IconButton
          label={fullscreenLabel}
          title={fullscreenLabel}
          variant={isFullscreen ? 'active' : 'ghost'}
          icon={isFullscreen ? 'action.fullscreen-exit' : 'action.fullscreen'}
          on:click={handleToggleFullscreen}
        />
      </div>
    {/if}

    {#each dockHeaderButtonActions as action (action.id)}
      {@const dockHeaderButtonIcon = resolveHeaderActionIcon(action)}
      <div class:panel-chrome__header-button--visible={action.active} class="panel-chrome__header-button">
        <IconButton
          label={action.label}
          title={action.label}
          variant={action.active ? 'active' : 'ghost'}
          disabled={action.disabled}
          icon={dockHeaderButtonIcon}
          on:click={(event) => handleDockHeaderButtonAction(event, action)}
        />
      </div>
    {/each}

    {#if dockToggleButtonsVisible && dockSideActions.length > 0}
      <div
        class:panel-chrome__header-button--visible={dockSideActions.some((action) => action.active)}
        class="panel-chrome__dock-buttons panel-chrome__header-button"
        aria-label={$i18nT('ui.shell.panelChrome.dockButtons.ariaLabel', { default: 'Tool docks' })}
      >
        {#each dockSideActions as action (action.id)}
          {@const dockActionIcon = resolveDockActionIcon(action.side)}
          <IconButton
            label={action.label}
            title={action.label}
            variant={action.active ? 'active' : 'ghost'}
            disabled={action.disabled}
            icon={dockActionIcon}
            on:click={(event) => handleDockSideHeaderAction(event, action)}
          />
        {/each}
      </div>
    {/if}

    {#if showPanelActionMenuUi}
      <div
        class:panel-chrome__header-button--visible={isActionMenuOpen}
        class:panel-chrome__action-menu-anchor--open={isActionMenuOpen}
        class="panel-chrome__action-menu-anchor panel-chrome__header-button"
        bind:this={actionMenuElement}
      >
        <IconButton
          label={panelActionMenuLabel}
          title={panelActionMenuLabel}
          variant={isActionMenuOpen ? 'active' : 'ghost'}
          icon="action.more-horizontal"
          on:click={toggleActionMenu}
        />

        {#if isActionMenuOpen}
          <div
            use:portal
            bind:this={actionMenuSurfaceElement}
            class:panel-chrome__action-menu--context={actionMenuOpenMode === 'context'}
            class:panel-chrome__action-menu--submenu-left={actionMenuSubmenuPlacement === 'left'}
            class="panel-chrome__action-menu"
            style={actionMenuStyle}
            role="menu"
            aria-label={panelActionMenuLabel}
          >
            <div class="panel-chrome__action-menu-list">
              {#if (onToggleFullscreen && showToggleFullscreenAction) || onDetachPanel}
                <div class="panel-chrome__action-menu-group">
                  <span class="panel-chrome__action-menu-group-label">
                    {$i18nT('ui.shell.panelChrome.actionMenu.group.window', { default: 'Window' })}
                  </span>
                  {#if onToggleFullscreen && showToggleFullscreenAction}
                    <button
                      type="button"
                      class="panel-chrome__action-menu-item"
                      role="menuitem"
                      on:click|stopPropagation={handleFullscreenMenuAction}
                    >
                      <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                        <WorkbenchIcon
                          icon={isFullscreen ? 'action.fullscreen-exit' : 'action.fullscreen'}
                          label={fullscreenMenuLabel}
                        />
                      </span>
                      <span class="panel-chrome__action-menu-label">{fullscreenMenuLabel}</span>
                    </button>
                  {/if}

                  {#if onDetachPanel}
                    <button
                      type="button"
                      class="panel-chrome__action-menu-item"
                      role="menuitem"
                      on:click|stopPropagation={handleDetachPanelMenuAction}
                    >
                      <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                        <WorkbenchIcon icon="action.detach" label="Detach" />
                      </span>
                      <span class="panel-chrome__action-menu-label">
                        {$i18nT('ui.shell.panelChrome.actionMenu.detachWindow', { default: 'Detach Window' })}
                      </span>
                    </button>
                  {/if}
                </div>
              {/if}

              {#if toolHeaderActions.length > 0}
                <div class="panel-chrome__action-menu-group">
                  <span class="panel-chrome__action-menu-group-label">
                    {$i18nT('ui.shell.panelChrome.actionMenu.group.tool', { default: 'Tool' })}
                  </span>
                  {#each toolHeaderActions as action (action.id)}
                    {@const headerActionIcon = resolveHeaderActionIcon(action)}
                    {#if action.children?.length}
                      <div class="panel-chrome__action-submenu">
                        <button
                          type="button"
                          class="panel-chrome__action-menu-item panel-chrome__action-menu-item--submenu"
                          role="menuitem"
                          aria-haspopup="menu"
                          aria-expanded="false"
                          on:click|stopPropagation={() => handleSubmenuParentAction(action)}
                        >
                          <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                            <WorkbenchIcon icon={headerActionIcon} label={action.label} />
                          </span>
                          <span class="panel-chrome__action-menu-label">{action.label}</span>
                          <span class="panel-chrome__action-submenu-chevron" aria-hidden="true">
                            <WorkbenchIcon icon="action.chevron-down" label="" />
                          </span>
                        </button>
                        <div class="panel-chrome__action-submenu-panel" role="menu" aria-label={action.label}>
                          {#each action.children as childAction (childAction.id)}
                            {@const childActionIcon = resolveHeaderActionIcon(childAction)}
                            <button
                              type="button"
                              class:panel-chrome__action-menu-item--danger={childAction.danger}
                              class="panel-chrome__action-menu-item panel-chrome__action-menu-item--child"
                              role="menuitem"
                              on:click|stopPropagation={() => handleMenuAction(childAction)}
                            >
                              <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                                <WorkbenchIcon icon={childActionIcon} label={childAction.label} />
                              </span>
                              <span class="panel-chrome__action-menu-label">{childAction.label}</span>
                            </button>
                          {/each}
                        </div>
                      </div>
                    {:else}
                      <button
                        type="button"
                        class:panel-chrome__action-menu-item--danger={action.danger}
                        class="panel-chrome__action-menu-item"
                        role="menuitem"
                        on:click|stopPropagation={() => handleMenuAction(action)}
                      >
                        <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                          <WorkbenchIcon icon={headerActionIcon} label={action.label} />
                        </span>
                        <span class="panel-chrome__action-menu-label">{action.label}</span>
                      </button>
                    {/if}
                  {/each}
                </div>
              {/if}

              {#if dockHeaderActions.length > 0}
                <div class="panel-chrome__action-menu-group">
                  <span class="panel-chrome__action-menu-group-label">
                    {$i18nT('ui.shell.panelChrome.actionMenu.group.docks', { default: 'Docks' })}
                  </span>
                  {#each dockHeaderActions as action (action.id)}
                    {@const headerActionIcon = resolveHeaderActionIcon(action)}
                    <div
                      class:panel-chrome__dock-action-row--with-toggle={!!action.secondaryRun}
                      class="panel-chrome__dock-action-row"
                    >
                      <button
                        type="button"
                        class:panel-chrome__action-menu-item--danger={action.danger}
                        class="panel-chrome__action-menu-item"
                        role="menuitem"
                        on:click|stopPropagation={() => handleMenuAction(action)}
                      >
                        <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                          <WorkbenchIcon icon={headerActionIcon} label={action.label} />
                        </span>
                        <span class="panel-chrome__action-menu-label">{action.label}</span>
                      </button>
                      {#if action.secondaryRun && action.secondaryLabel}
                        <button
                          type="button"
                          class="panel-chrome__dock-location-toggle"
                          title={action.secondaryTitle ?? action.secondaryLabel}
                          aria-label={action.secondaryTitle ?? action.secondaryLabel}
                          on:click|stopPropagation={() => handleSecondaryMenuAction(action)}
                        >
                          <span class="panel-chrome__dock-location-toggle-icon" aria-hidden="true">
                            <WorkbenchIcon icon={resolveDockActionIcon(action.dockSide)} label="" />
                          </span>
                          <span>{action.secondaryLabel}</span>
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}

              {#if layoutEditingEnabled}
                {#if layoutActions.length > 0}
                  <div class="panel-chrome__action-menu-group">
                    <span class="panel-chrome__action-menu-group-label">
                      {$i18nT('ui.shell.panelChrome.actionMenu.group.layout', { default: 'Layout' })}
                    </span>
                    {#each layoutActions as action (action.id)}
                      <button
                        type="button"
                        class:panel-chrome__action-menu-item--disabled={action.disabled}
                        class="panel-chrome__action-menu-item"
                        role="menuitem"
                        aria-disabled={action.disabled}
                        disabled={action.disabled}
                        on:click={(event) => handleLayoutAction(event, action)}
                      >
                        {#if action.icon}
                          <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                            <WorkbenchIcon icon={resolveLayoutActionIcon(action.icon)} label={action.label} />
                          </span>
                        {/if}
                        <span class="panel-chrome__action-menu-label">{action.label}</span>
                      </button>
                    {/each}
                    {#if canShowPanelToolSelectorUi}
                      <button
                        type="button"
                        class="panel-chrome__action-menu-item"
                        role="menuitem"
                        on:click={addPanelTabFromLayout}
                      >
                        <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                          <WorkbenchIcon icon="action.add" label="" />
                        </span>
                        <span class="panel-chrome__action-menu-label">{addPanelTabLabel}</span>
                      </button>
                    {/if}
                  </div>
                {/if}
              {/if}

              {#if showClosePanelAction}
                <div class="panel-chrome__action-menu-group panel-chrome__action-menu-group--danger">
                  <button
                    type="button"
                    class="panel-chrome__action-menu-item panel-chrome__action-menu-item--danger"
                    role="menuitem"
                    on:click|stopPropagation={() => runAction({ type: 'close-active-panel' })}
                  >
                    <span class="panel-chrome__action-menu-icon" aria-hidden="true">
                      <WorkbenchIcon icon="action.close" label="Close" />
                    </span>
                    <span class="panel-chrome__action-menu-label">
                      {$i18nT('ui.shell.panelChrome.actionMenu.closePanel', { default: 'Close Panel' })}
                    </span>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .panel-chrome {
    box-sizing: border-box;
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-10);
    min-height: var(--size-control-height);
    max-width: 100%;
    padding: var(--space-6) var(--space-8);
  }

  .panel-chrome__resource-loading {
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    overflow: hidden;
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
    background: color-mix(in srgb, var(--color-border-subtle) 28%, transparent);
  }

  .panel-chrome__resource-loading-bar {
    display: block;
    height: 100%;
    min-width: 2.5rem;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-border-focus) 54%, transparent),
      color-mix(in srgb, var(--color-border-focus) 96%, white) 48%,
      color-mix(in srgb, var(--color-border-focus) 54%, transparent)
    );
    box-shadow: 0 0 14px color-mix(in srgb, var(--color-border-focus) 18%, transparent);
    transition: width 180ms ease;
  }

  .panel-chrome__resource-loading-bar--indeterminate {
    width: 38%;
    animation: panel-chrome-resource-loading 1.15s ease-in-out infinite;
  }

  .panel-chrome--with-center {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }

  .panel-chrome--hidden-host {
    position: absolute;
    inset: 0;
    width: auto;
    height: auto;
    min-height: 0;
    padding: 0;
    gap: 0;
    overflow: visible;
    pointer-events: none;
  }

  .panel-chrome--hidden-host::after {
    display: none;
  }

  .panel-chrome--hidden-host > :not(.panel-chrome__actions) {
    display: none;
  }

  .panel-chrome--hidden-host .panel-chrome__actions {
    position: absolute;
    top: var(--space-8);
    right: var(--space-8);
    left: auto;
    bottom: auto;
    display: inline-flex;
    align-items: center;
    width: max-content;
    height: var(--size-icon-button);
    overflow: visible;
    pointer-events: auto;
  }

  .panel-chrome--hidden-host .panel-chrome__header-button {
    opacity: 0.72;
    pointer-events: auto;
  }

  .panel-chrome--hidden-host .panel-chrome__header-button:hover,
  .panel-chrome--hidden-host .panel-chrome__header-button:focus-within,
  .panel-chrome--hidden-host .panel-chrome__header-button.panel-chrome__header-button--visible,
  .panel-chrome--hidden-host .panel-chrome__fullscreen-anchor:hover,
  .panel-chrome--hidden-host .panel-chrome__fullscreen-anchor:focus-within {
    opacity: 1;
  }

  .panel-chrome--hidden-host .panel-chrome__dock-buttons {
    position: relative;
  }

  .panel-chrome--hidden-host .panel-chrome__dock-buttons:hover,
  .panel-chrome--hidden-host .panel-chrome__dock-buttons:focus-within,
  .panel-chrome--hidden-host .panel-chrome__dock-buttons.panel-chrome__header-button--visible {
    opacity: 1;
  }

  .panel-chrome--hidden-host .panel-chrome__action-menu-anchor {
    position: relative;
    inset: auto;
    width: auto;
    height: auto;
    pointer-events: auto;
  }

  .panel-chrome--hidden-host .panel-chrome__action-menu {
    pointer-events: auto;
  }

  .panel-chrome::after {
    content: '';
    position: absolute;
    left: var(--space-8);
    right: var(--space-8);
    bottom: 0;
    height: 1px;
    background: color-mix(in srgb, var(--color-border-focus) 62%, transparent);
    opacity: 0;
    transform: scaleX(0.32);
    transform-origin: center;
    transition:
      opacity 240ms ease,
      transform 260ms ease,
      background 160ms ease,
      height 160ms ease;
    pointer-events: none;
  }

  .panel-chrome--draggable {
    cursor: default;
  }

  .panel-chrome--draggable.panel-chrome--hover-active,
  .panel-chrome--draggable:focus-within {
    cursor: grab;
  }

  .panel-chrome--draggable::after {
    opacity: 0;
  }

  .panel-chrome--draggable.panel-chrome--hover-active::after,
  .panel-chrome--draggable:focus-within::after {
    opacity: 0.85;
    transform: scaleX(1);
  }

  .panel-chrome--dragging {
    cursor: grabbing;
  }

  .panel-chrome--dragging :global(*:not(button):not([role='dialog']):not([role='menu'])) {
    cursor: grabbing;
  }

  .panel-chrome--dragging::after {
    opacity: 1;
    transform: scaleX(1);
    height: 2px;
    background: color-mix(in srgb, var(--color-border-focus) 86%, white);
  }

  .panel-chrome__identity {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  .panel-chrome__center {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    min-width: 0;
    padding-inline: var(--space-10);
    white-space: nowrap;
  }

  .panel-chrome__center-button {
    min-height: 1.4rem;
    padding: 0 var(--space-6);
    border-radius: var(--radius-small);
    font-size: var(--font-size-label);
    color: var(--color-text-primary);
  }

  .panel-chrome__center-button:active {
    transform: none;
  }

  .panel-chrome__center-metric {
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
  }

  .panel-chrome__tool-menu-anchor {
    position: relative;
    flex: 0 0 auto;
  }

  .panel-chrome__add-tab-anchor {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .panel-chrome__tool-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    max-width: 11rem;
    min-height: calc(var(--size-control-height) - var(--space-2));
    padding: 0 var(--space-8);
    border-radius: var(--radius-medium);
    background: var(--color-background-selected);
    color: var(--color-text-secondary);
    opacity: 0.4;
    transition:
      opacity 140ms ease,
      color 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease;
  }

  .panel-chrome__tool-trigger:hover {
    color: var(--color-text-primary);
  }

  .panel-chrome__tool-trigger:hover,
  .panel-chrome__tool-trigger:focus-visible,
  .panel-chrome__tool-trigger--active {
    opacity: 1;
  }

  .panel-chrome__tool-trigger--compact {
    gap: var(--space-4);
    min-width: unset;
    padding: 0 var(--space-6);
  }

  .panel-chrome__tool-trigger--compact:hover,
  .panel-chrome__tool-trigger--compact:focus-visible,
  .panel-chrome__tool-trigger--compact.panel-chrome__tool-trigger--active {
    opacity: 1;
  }

  .panel-chrome__tool-trigger--active {
    border-color: var(--color-border-focus);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-focus);
  }

  .panel-chrome__tool-trigger-icon,
  .panel-chrome__tool-option-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    font-weight: 700;
    flex: 0 0 auto;
  }

  .panel-chrome__tool-option-icon {
    margin-top: 0.04rem;
  }

  .panel-chrome__tool-option:hover .panel-chrome__tool-option-icon,
  .panel-chrome__tool-option--current .panel-chrome__tool-option-icon {
    color: var(--color-text-primary);
  }

  .panel-chrome__tool-trigger-icon--placeholder {
    font-size: calc(var(--font-size-label) + 0.05rem);
  }

  .panel-chrome__tool-option-icon--placeholder {
    opacity: 0;
  }

  :global(.panel-chrome__tool-trigger-chevron) {
    width: var(--size-icon);
    height: var(--size-icon);
    --workbench-icon-stroke-width: 1.5;
    flex: 0 0 auto;
  }

  .panel-chrome__tool-menu {
    position: absolute;
    top: calc(100% + var(--space-6));
    left: 0;
    z-index: 2147483000;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-8);
    width: min(27rem, calc(100dvw - (var(--space-12) * 2)));
    max-width: calc(100dvw - (var(--space-12) * 2));
    max-height: calc(100dvh - (var(--space-12) * 2));
    padding: var(--space-10);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
    isolation: isolate;
    overflow: hidden;
    pointer-events: auto;
  }

  .panel-chrome__tool-menu-header {
    display: grid;
    gap: var(--space-4);
  }

  .panel-chrome__tool-menu-label {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .panel-chrome__tool-menu-copy {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .panel-chrome__tool-menu-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-height: 0;
    max-height: min(28rem, calc(100dvh - 7.5rem));
    overflow-y: auto;
    padding-right: var(--space-2);
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .panel-chrome__tool-option {
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    align-items: start;
    gap: var(--space-7);
    width: 100%;
    height: auto;
    min-height: 3.25rem;
    flex: 0 0 auto;
    padding: var(--space-7) var(--space-8);
    border: 1px solid transparent;
    border-radius: var(--radius-medium);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    line-height: 1.25;
    cursor: pointer;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease;
  }

  .panel-chrome__tool-option:hover {
    border-color: color-mix(in srgb, var(--color-border-focus) 44%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--color-background-hover) 72%, transparent);
    color: var(--color-text-primary);
  }

  .panel-chrome__tool-option:focus-visible {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: var(--shadow-focus);
  }

  .panel-chrome__tool-option--current {
    border-color: var(--color-border-focus);
    background: color-mix(in srgb, var(--color-background-selected) 86%, var(--color-background-elevated));
    color: var(--color-text-primary);
  }

  .panel-chrome__tool-option-main {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    width: 100%;
  }

  .panel-chrome__tool-option-title {
    color: var(--color-text-primary);
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-chrome__tool-option-copy {
    color: var(--color-text-secondary);
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--font-size-label);
    line-height: 1.35;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .panel-chrome__tool-option:hover .panel-chrome__tool-option-copy,
  .panel-chrome__tool-option--current .panel-chrome__tool-option-copy {
    color: var(--color-text-secondary);
  }

  .panel-chrome__meta {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
  }

  .panel-chrome__tool-status-detail {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-primary);
    font-size: var(--font-size-label);
  }

  .panel-chrome__actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: 0 0 auto;
    justify-self: end;
  }

  .panel-chrome__header-button {
    opacity: 0.4;
    transition: opacity 140ms ease;
  }

  .panel-chrome--hover-active .panel-chrome__header-button,
  .panel-chrome:focus-within .panel-chrome__header-button,
  .panel-chrome__header-button--visible {
    opacity: 1;
  }

  .panel-chrome__action-menu-anchor {
    order: 1;
    position: relative;
    flex: 0 0 auto;
  }

  .panel-chrome__action-menu-anchor--open {
    opacity: 1;
  }

  .panel-chrome__dock-buttons {
    order: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0;
  }

  .panel-chrome__fullscreen-anchor {
    order: 2;
  }

  .panel-chrome__header-button :global(.icon-button--active) {
    background: transparent;
    border-color: transparent;
    color: var(--color-text-primary);
  }

  .panel-chrome__header-button :global(.icon-button--active:hover) {
    background: var(--color-background-hover);
    border-color: var(--color-border-subtle);
  }

  .panel-chrome__dock-buttons :global(.icon-button--active) {
    background: var(--color-background-selected);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .panel-chrome__dock-buttons :global(.icon-button--active:hover) {
    background: var(--color-background-hover);
    border-color: var(--color-border-focus);
  }

  .panel-chrome__header-button :global(.icon-button:focus-visible) {
    border-color: var(--color-border-focus);
  }

  .panel-chrome__tool-status {
    min-width: 0;
    overflow: hidden;
    padding: var(--space-2) var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    color: var(--color-text-secondary);
    background: var(--color-background-muted);
    font-size: var(--font-size-label);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-chrome__tool-status--attention {
    border-color: var(--color-border-focus);
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .panel-chrome__tool-status--success {
    border-color: var(--color-border-strong);
    background: var(--color-background-elevated);
    color: var(--color-text-primary);
  }

  @keyframes panel-chrome-resource-loading {
    0% {
      transform: translateX(-120%);
    }

    100% {
      transform: translateX(280%);
    }
  }

  .panel-chrome__action-menu {
    position: fixed;
    z-index: 2147483000;
    min-width: 13rem;
    padding: var(--space-6);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
    isolation: isolate;
    pointer-events: auto;
  }

  .panel-chrome__action-menu-list {
    display: grid;
    gap: var(--space-6);
  }

  .panel-chrome__action-menu-group {
    display: grid;
    gap: var(--space-2);
  }

  .panel-chrome__action-menu-group + .panel-chrome__action-menu-group {
    padding-top: var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
  }

  .panel-chrome__action-menu-group-label {
    padding: 0 var(--space-8);
    color: var(--color-text-muted);
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .panel-chrome__action-menu-item {
    display: grid;
    grid-template-columns: var(--size-icon-button) minmax(0, 1fr);
    align-items: center;
    min-height: 1.9rem;
    padding: 0 var(--space-8) 0 var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-secondary);
    text-align: left;
    font: inherit;
  }

  .panel-chrome__action-submenu {
    position: relative;
  }

  .panel-chrome__action-menu-item--submenu {
    grid-template-columns: var(--size-icon-button) minmax(0, 1fr) var(--size-icon-button);
    width: 100%;
  }

  .panel-chrome__action-submenu-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transform: rotate(-90deg);
  }

  .panel-chrome__action-submenu-panel {
    position: absolute;
    top: calc(var(--space-2) * -1);
    left: calc(100% + var(--space-6));
    z-index: 1;
    display: none;
    min-width: 14.75rem;
    max-width: min(22rem, calc(100vw - var(--space-16)));
    padding: var(--space-6);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-popover, var(--shadow-surface));
  }

  .panel-chrome__action-menu--submenu-left .panel-chrome__action-submenu-panel {
    right: calc(100% + var(--space-6));
    left: auto;
  }

  .panel-chrome__action-submenu-panel::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 100%;
    width: var(--space-8);
  }

  .panel-chrome__action-menu--submenu-left .panel-chrome__action-submenu-panel::before {
    right: auto;
    left: 100%;
  }

  .panel-chrome__action-submenu:hover .panel-chrome__action-submenu-panel,
  .panel-chrome__action-submenu:focus-within .panel-chrome__action-submenu-panel {
    display: grid;
    gap: var(--space-2);
  }

  .panel-chrome__action-menu-item--child {
    width: 100%;
  }

  .panel-chrome__dock-action-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: var(--space-4);
  }

  .panel-chrome__dock-action-row--with-toggle {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .panel-chrome__dock-action-row .panel-chrome__action-menu-item {
    min-width: 0;
  }

  .panel-chrome__dock-location-toggle {
    min-width: 4.75rem;
    min-height: 1.75rem;
    padding: 0 var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-border-focus) 48%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-selected) 34%, transparent);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    text-align: center;
  }

  .panel-chrome__dock-location-toggle-icon {
    display: inline-flex;
    width: 0.86rem;
    height: 0.86rem;
    color: var(--color-text-muted);
  }

  .panel-chrome__dock-location-toggle:hover,
  .panel-chrome__dock-location-toggle:focus-visible {
    border-color: var(--color-border-focus);
    background: color-mix(in srgb, var(--color-accent-primary) 22%, var(--color-background-selected));
    color: var(--color-text-primary);
    outline: none;
  }

  .panel-chrome__dock-location-toggle:hover .panel-chrome__dock-location-toggle-icon,
  .panel-chrome__dock-location-toggle:focus-visible .panel-chrome__dock-location-toggle-icon {
    color: var(--color-text-primary);
  }

  .panel-chrome__action-menu-item:hover,
  .panel-chrome__action-menu-item:focus-visible {
    border-color: var(--color-border-subtle);
    background: var(--color-background-hover);
    color: var(--color-text-primary);
    outline: none;
  }

  .panel-chrome__action-menu-item--danger {
    color: var(--color-text-danger);
  }

  .panel-chrome__action-menu-item--disabled,
  .panel-chrome__action-menu-item--disabled:hover,
  .panel-chrome__action-menu-item--disabled:focus-visible {
    border-color: transparent;
    background: transparent;
    color: var(--color-text-muted);
    box-shadow: none;
    opacity: 0.7;
    transform: none;
  }

  .panel-chrome__action-menu-item--danger:hover,
  .panel-chrome__action-menu-item--danger:focus-visible {
    border-color: var(--color-border-danger);
    background: var(--color-background-danger);
    color: var(--color-text-danger);
  }

  .panel-chrome__action-menu-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon-button);
    height: 100%;
    color: currentColor;
  }

  .panel-chrome__action-menu-icon :global(svg) {
    width: var(--size-icon);
    height: var(--size-icon);
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .panel-chrome__action-menu-label {
    min-width: 0;
    white-space: nowrap;
  }

  .panel-chrome--draggable button {
    cursor: pointer;
  }

  .panel-chrome--hover-suspended {
    pointer-events: none;
  }

  @media (max-width: 720px) {
    .panel-chrome {
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .panel-chrome__meta {
      flex-wrap: wrap;
    }

    .panel-chrome__actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  }
</style>
