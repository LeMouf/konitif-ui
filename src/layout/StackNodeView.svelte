<script lang="ts">
  import { projectToolMenuAction, type ToolMenuProjection } from '../shell/toolCommandProjection';
  import { observeToolRegistryRevision } from '../shell/toolRegistryRevision';
  import { getContext, onDestroy, tick } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import type {
    InMemoryToolRegistry,
    LayoutMenuTarget,
    ShellRegionId,
    ShellState,
    ShellWidgetCatalogPort,
    ShellWidgetDefinition,
    StackNode,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ResolvedToolShellHeaderAction,
    ToolShellWidgetDock,
    WorkbenchToolDockActionSide,
    WorkbenchToolDockRootLocation,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import {
    findStack,
    isShellRegionWidgetVisible,
    readWorkbenchToolDockVisibility,
    resolveShellRegionPresentation,
    resolveWorkbenchToolDockEffectiveVisibility,
    resolveWorkbenchToolDockSide,
    resolvePanelMenuTargets,
    resolveToolShellContribution,
    type LayoutMenuActionId
  } from '@konitif/workbench';
  import { useWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import {
    resolveLocalizedToolDefinitionText,
    resolveLocalizedShellWidgetDefinitionText,
    resolveLocalizedToolShellHeaderActionText
  } from '../i18n/workbenchEntityTranslations';
  import StackBodyRegion from './StackBodyRegion.svelte';
  import StackHeaderRegion from './StackHeaderRegion.svelte';
  import StackHiddenHeaderHostRegion from './StackHiddenHeaderHostRegion.svelte';
  import StackTabDragInteractionBridge from './StackTabDragInteractionBridge.svelte';
  import {
    createStackFullscreenTargetStyle,
    createStackViewportStyle,
    STACK_FULLSCREEN_TRANSITION_MS
  } from './stackFullscreenTransition';
  import { createStackPanelLayoutActions, type StackPanelLayoutActionId } from './stackPanelLayoutActions';
  import ToolRenderProbeOverlay from '../performance/ToolRenderProbeOverlay.svelte';
  import { createToolRenderProbe } from '../performance/toolRenderProbe';
  import { getWorkbenchReadingLevelContext } from '../primitives/workbenchReadingLevelContext';

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
        shellStatus?: import('@konitif/workbench').ToolShellStatus | null;
      }
    | undefined
  >;

  type WorkbenchShellStateContext = {
    shellState: Readable<ShellState>;
  };

  type WorkbenchShellWidgetCatalogContext = {
    shellWidgetCatalog: ShellWidgetCatalogPort;
  };

  export let stack: StackNode;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: ToolRuntimeUiStateMap = {};
  export let onStartPanelDrag:
    | ((panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void)
    | null = null;
  export let draggingPanelId: string | null = null;
  export let onOpenPanelLayoutMenu:
    | ((
        panelId: string,
        anchor: { x: number; y: number },
        initialActionId: LayoutMenuActionId,
        targets: LayoutMenuTarget[]
      ) => void)
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
  export let isFullscreen = false;
  export let fullscreenViewportStyle = '';
  export let onToggleFullscreen: ((stackId: string) => void) | null = null;
  export let suspendHeaderHover = false;

  const TAB_DRAG_THRESHOLD_PX = 8;
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;
  const i18nT = getWorkbenchTranslator();
  const inheritedReadingLevelStore = getWorkbenchReadingLevelContext();
  const WORKBENCH_SHELL_STATE_CONTEXT = Symbol.for('workbench.shellState');
  const WORKBENCH_SHELL_WIDGET_CATALOG_CONTEXT = Symbol.for('workbench.shellWidgetCatalog');
  const PANEL_PERFORMANCE_MENU_ID = 'workbench-panel-performance-menu';
  const TOGGLE_PANEL_RENDER_PROBE_ID = 'workbench-toggle-panel-render-probe';
  const panelRenderProbe = createToolRenderProbe({
    id: 'workbench.panel',
    label: 'Panel performance'
  });
  const shellStateContext =
    getContext<WorkbenchShellStateContext | null>(WORKBENCH_SHELL_STATE_CONTEXT) ?? null;
  const shellWidgetCatalogContext =
    getContext<WorkbenchShellWidgetCatalogContext | null>(WORKBENCH_SHELL_WIDGET_CATALOG_CONTEXT) ?? null;
  const shellStateStore = shellStateContext?.shellState ?? readable<ShellState | null>(null);
  const shellWidgetCatalog = shellWidgetCatalogContext?.shellWidgetCatalog ?? null;
  $: activeWindow =
    workspace.windows.find((window) => findStack(window.root, stack.id)) ??
    workspace.windows.find((window) => window.id === workspace.activeWindowId) ??
    workspace.windows[0];
  $: activePanel = stack.children.find((panel) => panel.id === stack.activeChildId) ?? stack.children[0];
  $: activePanelShowFullscreenToggle = activePanel?.showFullscreenToggle !== false;
  $: isFocused = activePanel?.id === focus.activePanelId;
  $: activeToolInstance = activePanel?.toolInstanceId
    ? workspace.toolInstances[activePanel.toolInstanceId]
    : null;
  $: registryRevision = observeToolRegistryRevision(registry);
  $: activeToolEntry = (void $registryRevision, activeToolInstance ? registry.get(activeToolInstance.toolId) : null);
  $: tabItems = (void $registryRevision, stack.children.map((panel) => {
    const toolInstance = panel.toolInstanceId ? workspace.toolInstances[panel.toolInstanceId] : null;
    const toolEntry = toolInstance ? registry.get(toolInstance.toolId) : null;
    const localizedTool = toolEntry ? resolveLocalizedToolDefinitionText($i18nT, toolEntry.definition) : null;

    return {
      panel,
      toolIcon: toolEntry?.definition.icon ?? null,
      // A user-authored instance override remains authoritative. Otherwise the
      // visible tab title is a locale projection and never the persisted panel
      // title captured when the workspace was first created.
      displayTitle: toolInstance?.panelTitleOverride ?? localizedTool?.panelTitle
        ?? (!panel.toolInstanceId && panel.title === 'Welcome' ? 'Untitled panel' : panel.title)
    };
  }));
  $: toolOptions = (void $registryRevision, registry.list().map((entry) => {
    const text = resolveLocalizedToolDefinitionText($i18nT, entry.definition);

    return {
      id: entry.definition.id,
      title: text.title,
      description: text.description,
      icon: entry.definition.icon,
      keywords: entry.definition.keywords
    };
  }));
  $: shellContribution =
    activeToolEntry && activeToolInstance
      ? resolveToolShellContribution(
          activeToolEntry.definition,
          activeToolInstance,
          $inheritedReadingLevelStore
        )
      : null;
  $: activeToolRuntimeUi = activeToolInstance ? (toolRuntimeUi[activeToolInstance.id] ?? null) : null;
  $: activeToolShellStatus =
    activeToolRuntimeUi && 'shellStatus' in activeToolRuntimeUi
      ? (activeToolRuntimeUi.shellStatus ?? null)
      : (shellContribution?.status ?? null);
  // A Tool status has one visual owner. Tools rendering it in their internal
  // header keep the state in the shell contract, while the panel chrome stays
  // silent to avoid a duplicate badge next to the tabs.
  $: chromeStatus =
    shellContribution?.statusPlacement === 'tool-header'
      ? null
      : activeToolShellStatus;
  $: isImmersiveViewer =
    activeToolEntry?.definition.panelPresentation?.immersiveWhenTabsHidden === true && !showTabs;
  $: toolHeaderChromeActions =
    activePanel && activeToolInstance
      ? (shellContribution?.headerActions ?? []).map((action) =>
          createChromeActionFromShellAction(
            action,
            activePanel.id,
            activeToolInstance.id,
            activeToolInstance.toolId,
            activeToolInstance.state
          )
        )
      : [];
  $: declaredDockChromeActions =
    activePanel && activeToolInstance
      ? createDeclaredDockChromeActions(
          shellContribution?.widgetDocks ?? [],
          toolHeaderChromeActions,
          activePanel.id,
          activeToolInstance.id,
          activeToolInstance.state
        )
      : [];
  $: contextualShellWidgetChromeActions =
    activePanel && activeToolInstance
      ? createContextualShellWidgetChromeActions(
          shellWidgetCatalog,
          shellContribution?.widgetDocks ?? [],
          activePanel.id,
          activeToolInstance.id,
          activeToolInstance.toolId
        )
      : [];
  $: toolChromeActions = activePanel ? mergeGlobalPerformanceAction(toolHeaderChromeActions) : [];
  $: chromeActions = [
    ...toolChromeActions,
    ...declaredDockChromeActions,
    ...contextualShellWidgetChromeActions
  ];
  $: panelMenuActions = chromeActions;
  $: hiddenChromeHasSupplementalActions = panelMenuActions.some(
    (action) => action.group === 'dock' && (action.headerButton || dockToggleButtonsVisible)
  );
  $: layoutActions = activePanel ? createPanelLayoutActions(activePanel.id) : [];
  $: filteredLayoutActions = layoutActions.filter((action) => {
    if (!showPanelLayoutMenuActions) {
      return false;
    }

    if (action.id === 'toggle-header') {
      return showPanelToggleHeaderAction;
    }

    if (action.id === 'toggle-fullscreen-toggle') {
      return showToggleFullscreenAction;
    }

    if (action.id === 'split:vertical') {
      return showPanelSplitVerticalAction;
    }

    if (action.id === 'split:horizontal') {
      return showPanelSplitHorizontalAction;
    }

    if (action.id === 'join-areas') {
      return showPanelJoinAreasAction;
    }

    if (action.id === 'swap-areas') {
      return showPanelSwapAreasAction;
    }

    return true;
  });
  $: showTabs = stack.children.length > 1;
  $: isHeaderVisible = stack.headerVisible !== false;
  $: shouldRenderHeader = showPanelHeaderUi && (isHeaderVisible || showTabs);
  $: isHeaderChromeVisible = showPanelHeaderUi && isHeaderVisible;
  $: hostChromeInHeader = isHeaderChromeVisible || showTabs;
  $: debugHoverTarget = $debugHoverStore;
  $: isDebugHovered = debugHoverTarget?.kind === 'cell' && debugHoverTarget.stackId === stack.id;

  let pendingTabDrag: {
    panelId: string;
    anchor: { x: number; y: number };
  } | null = null;
  let suppressedTabClickPanelId: string | null = null;
  let stackElement: HTMLElement | null = null;
  let renderedFullscreen = isFullscreen;
  let isAnimatingFullscreen = false;
  let stackViewportStyle = isFullscreen ? fullscreenViewportStyle : '';
  let previousFullscreenProp = isFullscreen;
  let fullscreenTransitionFrame: number | null = null;
  let fullscreenTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  let openActionMenuNonce = 0;
  let openToolMenuNonce = 0;
  let toolMenuContextAnchor: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null = null;
  let actionMenuContextAnchor: { x: number; y: number } | null = null;
  let isActionMenuVisible = false;
  let isToolMenuVisible = false;
  let panelRenderProbeVisible = false;

  $: panelRenderProbe.setEnabled(panelRenderProbeVisible);
  $: if (panelRenderProbeVisible) {
    panelRenderProbe.markUpdate(activeToolInstance?.toolId ?? 'empty');
  }

  onDestroy(() => {
    panelRenderProbe.destroy();
  });

  $: if (stackElement && isFullscreen !== previousFullscreenProp) {
    previousFullscreenProp = isFullscreen;
    void animateFullscreenState(isFullscreen);
  } else if (!stackElement) {
    previousFullscreenProp = isFullscreen;
    renderedFullscreen = isFullscreen;
    stackViewportStyle = isFullscreen ? fullscreenViewportStyle : '';
  }

  $: if (renderedFullscreen && isFullscreen && !isAnimatingFullscreen) {
    stackViewportStyle = fullscreenViewportStyle;
  }

  function createChromeActionFromShellAction(
    action: ResolvedToolShellHeaderAction,
    panelId: string,
    toolInstanceId: string,
    toolId: string,
    state: unknown
  ) {
    return projectToolMenuAction(action, {
      panelId, toolInstanceId, inheritedReadingLevel: $inheritedReadingLevelStore
    }, {
      label: entry => resolveLocalizedToolShellHeaderActionText($i18nT, toolId, entry).label,
      dock: entry => resolveWorkbenchToolWidgetDockAction(
        findToolWidgetDock(shellContribution?.widgetDocks ?? [], entry.commandId),
        $shellStateStore, $i18nT, panelId, toolInstanceId, state
      )
    });
  }

  function mergeGlobalPerformanceAction(actions: ReturnType<typeof createChromeActionFromShellAction>[]) {
    const globalPerformanceAction = createGlobalPerformanceAction();
    const performanceActionIndex = actions.findIndex((action) => isPerformanceChromeAction(action));

    if (performanceActionIndex < 0) {
      return [...actions, globalPerformanceAction];
    }

    return actions.map((action, index) => {
      if (index !== performanceActionIndex) {
        return action;
      }

      return {
        ...action,
        icon: action.icon ?? globalPerformanceAction.icon,
        ...resolvePerformancePrimaryAction([
          ...(action.children ?? []),
          ...(globalPerformanceAction.children ?? [])
        ]),
        children: [...(action.children ?? []), ...(globalPerformanceAction.children ?? [])]
      };
    });
  }

  function resolvePerformancePrimaryAction(
    children: ReturnType<typeof createChromeActionFromShellAction>[]
  ): {
    primaryRun?: () => void;
    primaryCommand?: ReturnType<typeof createChromeActionFromShellAction>['command'];
  } {
    const primaryChild = children.find((child) => child.run || child.command);

    if (!primaryChild) {
      return {};
    }

    if (primaryChild.run) {
      return { primaryRun: primaryChild.run };
    }

    return primaryChild.command ? { primaryCommand: primaryChild.command } : {};
  }

  function createGlobalPerformanceAction(): ToolMenuProjection {
    const performanceLabel = $i18nT('ui.shell.panelChrome.performance.label', { default: 'Performance' });
    const panelProbeLabel = panelRenderProbeVisible
      ? $i18nT('ui.shell.panelChrome.performance.hidePanelProbe', { default: 'Hide Panel Probe' })
      : $i18nT('ui.shell.panelChrome.performance.showPanelProbe', { default: 'Show Panel Probe' });

    return {
      id: `${activeToolInstance?.id ?? activePanel?.id ?? stack.id}:${PANEL_PERFORMANCE_MENU_ID}`,
      label: performanceLabel,
      group: 'tool',
      icon: 'action.audio-meter' as const,
      frequency: 'advanced' as const,
      children: [
        {
          id: `${activeToolInstance?.id ?? activePanel?.id ?? stack.id}:${TOGGLE_PANEL_RENDER_PROBE_ID}`,
          label: panelProbeLabel,
          group: 'tool',
          icon: 'action.audio-meter' as const,
          frequency: 'advanced' as const,
          run: () => {
            panelRenderProbeVisible = !panelRenderProbeVisible;
          }
        }
      ]
    };
  }

  function isPerformanceChromeAction(action: { id: string; label: string }): boolean {
    const signature = `${action.id} ${action.label}`.toLowerCase();
    return signature.includes('performance');
  }

  function focusPanel(panelId: string, event?: PointerEvent): void {
    const target = event?.target instanceof Element ? event.target : null;

    if (target?.closest('[data-workbench-interactive]')) {
      return;
    }

    dispatchCommand({ type: 'focus-panel', panelId });
  }

  function handleStackPointerMove(event: PointerEvent): void {
    if (!activePanel) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (
      target?.closest(
        '.resize-handle, .edge-split-handle, .boundary-corner-handle, .workspace-view__intersection-handle, [role="dialog"], [role="menu"]'
      )
    ) {
      return;
    }

    workspaceDebugHover.setHoveredTarget({ kind: 'cell', stackId: stack.id });
  }

  function handleStackPointerLeave(): void {
    if (debugHoverTarget?.kind === 'cell' && debugHoverTarget.stackId === stack.id) {
      workspaceDebugHover.setHoveredTarget(null);
    }
  }

  function createDeclaredDockChromeActions(
    widgetDocks: ToolShellWidgetDock[],
    existingActions: Array<{ id: string }>,
    panelId: string,
    toolInstanceId: string,
    state: unknown
  ): ToolMenuProjection[] {
    const existingCommandIds = new Set(
      existingActions.map((action) => action.id.split(':').pop() ?? '').filter(Boolean)
    );

    return widgetDocks
      .filter((dock) => !existingCommandIds.has(dock.commandId))
      .map((dock) => {
        const dockAction = resolveWorkbenchToolWidgetDockAction(
          dock,
          $shellStateStore,
          $i18nT,
          panelId,
          toolInstanceId,
          state
        );

        return {
          id: `${toolInstanceId}:${dock.commandId}`,
          label: dockAction?.label ?? dock.title,
          icon: dockAction?.icon ?? dock.icon,
          group: 'dock' as const,
          ...(dockAction?.run ? { run: dockAction.run } : {}),
          ...(dockAction?.secondaryLabel
            ? {
                secondaryLabel: dockAction.secondaryLabel,
                secondaryTitle: dockAction.secondaryTitle,
                secondaryRun: dockAction.secondaryRun
              }
            : {}),
          dockSide: dockAction?.dockSide ?? resolveWorkbenchToolDockSide(dock.defaultRegionId),
          active: dockAction?.active ?? false,
          internalDockSide:
            dockAction?.internalDockSide ?? resolveWorkbenchToolDockSide(dock.defaultRegionId),
          internalActive: dockAction?.internalActive ?? false,
          ...(dockAction?.internalRun ? { internalRun: dockAction.internalRun } : {})
        };
      });
  }

  function createContextualShellWidgetChromeActions(
    widgetCatalog: ShellWidgetCatalogPort | null,
    widgetDocks: ToolShellWidgetDock[],
    panelId: string,
    toolInstanceId: string,
    toolId: string
  ): ToolMenuProjection[] {
    if (!widgetCatalog || typeof widgetCatalog.list !== 'function') {
      return [];
    }

    const declaredRootWidgetIds = new Set(
      widgetDocks
        .map((dock) => dock.rootWidgetId)
        .filter((widgetId): widgetId is string => typeof widgetId === 'string' && widgetId.length > 0)
    );

    return widgetCatalog
      .list()
      .filter((definition) => isContextualShellWidgetForTool(definition, toolId))
      .filter((definition) => !declaredRootWidgetIds.has(definition.id))
      .map((definition) => createContextualShellWidgetChromeAction(definition, panelId, toolInstanceId));
  }

  function isContextualShellWidgetForTool(definition: ShellWidgetDefinition, toolId: string): boolean {
    return definition.scope === 'contextual' && definition.contextToolIds?.includes(toolId) === true;
  }

  function createContextualShellWidgetChromeAction(
    definition: ShellWidgetDefinition,
    panelId: string,
    toolInstanceId: string
  ) {
    const text = resolveLocalizedShellWidgetDefinitionText($i18nT, definition);
    const location = $shellStateStore
      ? resolveShellWidgetRootLocation($shellStateStore, definition.id)
      : null;
    const dockSide = resolveWorkbenchToolDockSide(location?.regionId ?? definition.defaultRegion);
    const active = resolveWorkbenchToolDockEffectiveVisibility({
      rootLocation: location,
      internalVisible: false,
      widgetId: definition.id
    });
    const label = active
      ? $i18nT('ui.shell.panelChrome.actionMenu.dock.hideRootWidget', {
          default: `Hide ${text.title}`,
          values: { title: text.title }
        })
      : $i18nT('ui.shell.panelChrome.actionMenu.dock.showRootWidget', {
          default: `Show ${text.title}`,
          values: { title: text.title }
        });
    const run = () => {
      if (!location) {
        requestShellWidgetLocation(definition.defaultRegion, definition.id, 'root', {
          panelId,
          toolInstanceId,
          commandId: `toggle-shell-widget:${definition.id}`,
          dockId: definition.id
        });
        return;
      }

      requestShellRegionWidgetVisibility(location.regionId, definition.id, !active);
    };

    return {
      id: `${toolInstanceId}:shell-widget:${definition.id}`,
      label,
      icon: definition.icon,
      group: 'dock' as const,
      run,
      dockSide,
      active,
      internalDockSide: resolveWorkbenchToolDockSide(definition.defaultRegion),
      internalActive: active,
      internalRun: run
    };
  }

  function findToolWidgetDock(
    widgetDocks: ToolShellWidgetDock[],
    commandId: string
  ): ToolShellWidgetDock | null {
    return widgetDocks.find((dock) => dock.commandId === commandId) ?? null;
  }

  function resolveWorkbenchToolWidgetDockAction(
    config: ToolShellWidgetDock | null,
    shellState: ShellState | null,
    translate: (key: string, options: { default: string }) => string,
    panelId: string,
    toolInstanceId: string,
    state: unknown
  ): {
    label?: string;
    run?: () => void;
    secondaryLabel?: string;
    secondaryTitle?: string;
    secondaryRun?: () => void;
    dockSide: WorkbenchToolDockActionSide;
    icon?: ToolShellWidgetDock['icon'];
    active: boolean;
    internalDockSide: WorkbenchToolDockActionSide;
    internalActive: boolean;
    internalRun?: () => void;
  } | null {
    if (!config) {
      return null;
    }

    const rootWidgetId = config.rootWidgetId ?? null;
    const location =
      rootWidgetId && shellState ? resolveShellWidgetRootLocation(shellState, rootWidgetId) : null;
    const internalVisible = readWorkbenchToolDockVisibility(state, config);
    const currentLocation = location ? 'root' : 'internal';
    const targetLocation = location ? 'internal' : 'root';
    const dockSide = resolveWorkbenchToolDockSide(location?.regionId ?? config.defaultRegionId);
    const internalDockSide = location
      ? dockSide
      : resolveWorkbenchToolDockSide(config.defaultRegionId);
    const secondaryLabel = rootWidgetId
      ? translate(
          currentLocation === 'root'
            ? 'ui.shell.panelChrome.actionMenu.dock.location.root'
            : 'ui.shell.panelChrome.actionMenu.dock.location.internal',
          { default: currentLocation === 'root' ? 'Root' : 'Interne' }
        )
      : null;
    const secondaryTitle = rootWidgetId
      ? translate(
          targetLocation === 'root'
            ? 'ui.shell.panelChrome.actionMenu.dock.location.moveToRoot'
            : 'ui.shell.panelChrome.actionMenu.dock.location.moveToInternal',
          {
            default:
              targetLocation === 'root'
                ? 'Move this dock to the root side'
                : 'Move this dock back inside the tool'
          }
        )
      : null;
    const secondaryRun = rootWidgetId
      ? () => {
          requestShellWidgetLocation(config.defaultRegionId, rootWidgetId, targetLocation, {
            panelId,
            toolInstanceId,
            commandId: config.commandId,
            dockId: config.dockId,
            legacyVisibleKey: config.legacyVisibleKey ?? undefined
          });
        }
      : null;
    const isEffectivelyVisible = resolveWorkbenchToolDockEffectiveVisibility({
      rootLocation: location,
      internalVisible,
      widgetId: rootWidgetId ?? config.dockId
    });
    const nextVisible = !isEffectivelyVisible;
    const showLabel = config.showLabel ?? `Show ${config.title}`;
    const hideLabel = config.hideLabel ?? `Hide ${config.title}`;
    const showTranslationKey = config.showTranslationKey;
    const hideTranslationKey = config.hideTranslationKey;
    const label = nextVisible && showTranslationKey
        ? translate(showTranslationKey, { default: showLabel })
        : !nextVisible && hideTranslationKey
          ? translate(hideTranslationKey, { default: hideLabel })
          : nextVisible
            ? showLabel
            : hideLabel;

    return {
      label,
      icon: config.icon,
      run: () => {
        if (location && rootWidgetId) {
          requestShellRegionWidgetVisibility(location.regionId, rootWidgetId, nextVisible);
        } else if (internalVisible !== nextVisible) {
          requestToolInternalDockVisibility(panelId, toolInstanceId, config, nextVisible);
        }
      },
      internalRun: () => {
        if (location && rootWidgetId) {
          requestShellRegionWidgetVisibility(location.regionId, rootWidgetId, nextVisible);
          return;
        }

        requestToolInternalDockVisibility(panelId, toolInstanceId, config, !internalVisible);
      },
      ...(secondaryLabel && secondaryTitle && secondaryRun
        ? {
            secondaryLabel,
            secondaryTitle,
            secondaryRun
          }
        : {}),
      dockSide,
      active: isEffectivelyVisible,
      internalDockSide,
      internalActive: isEffectivelyVisible
    };
  }

  function requestToolInternalDockVisibility(
    panelId: string,
    toolInstanceId: string,
    config: ToolShellWidgetDock,
    isVisible: boolean
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('workbench:tool-internal-dock-visibility-request', {
        detail: {
          panelId,
          toolInstanceId,
          commandId: config.commandId,
          dockId: config.dockId,
          legacyVisibleKey: config.legacyVisibleKey ?? undefined,
          isVisible
        }
      })
    );
  }

  function resolveShellWidgetRootLocation(
    shellState: ShellState,
    widgetId: string
  ): WorkbenchToolDockRootLocation | null {
    const regionIds: ShellRegionId[] = ['left', 'right', 'bottom'];

    for (const regionId of regionIds) {
      const region = shellState.regions[regionId];

      if (region?.widgetIds.includes(widgetId)) {
        return {
          regionId,
          isVisible: region.isVisible && isShellRegionWidgetVisible(region, widgetId),
          isOpen: region.isOpen,
          activeWidgetId: region.activeWidgetId,
          presentation: resolveShellRegionPresentation(region)
        };
      }
    }

    return null;
  }

  function requestShellRegionWidgetVisibility(
    regionId: ShellRegionId,
    widgetId: string,
    isVisible: boolean
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('workbench:shell-region-widget-visibility-request', {
        detail: {
          regionId,
          widgetId,
          isVisible
        }
      })
    );
  }

  function requestShellWidgetLocation(
    regionId: ShellRegionId,
    widgetId: string,
    location: 'root' | 'internal',
    dock?: {
      panelId: string;
      toolInstanceId: string;
      commandId: string;
      dockId: string;
      legacyVisibleKey?: string;
    }
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('workbench:shell-widget-location-request', {
        detail: {
          regionId,
          widgetId,
          location,
          ...(dock ?? {})
        }
      })
    );
  }

  function handleStackContextMenu(event: MouseEvent): void {
    if (!layoutEditingEnabled || !activePanel) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (target?.closest('[role="dialog"], [role="menu"], [data-workbench-context-menu="true"]')) {
      return;
    }

    if (isHeaderVisible && target?.closest('button, input, textarea, select')) {
      return;
    }

    event.preventDefault();
    focusPanel(activePanel.id);
    actionMenuContextAnchor = {
      x: event.clientX,
      y: event.clientY
    };
    openActionMenuNonce += 1;
  }

  function handleHiddenHostToggleFullscreen(): void {
    onToggleFullscreen?.(stack.id);
  }

  function closePanelTab(event: MouseEvent, panelId: string): void {
    event.stopPropagation();

    if (!showClosePanelAction) {
      return;
    }

    dispatchCommand({ type: 'close-panel', panelId });
  }

  function handleTabPointerDown(event: PointerEvent, panelId: string): void {
    focusPanel(panelId);

    if (event.button !== 0 || !layoutEditingEnabled || !showMovePanelAction || !onStartPanelDrag) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (target?.closest('button[aria-label^="Close "]')) {
      return;
    }

    pendingTabDrag = {
      panelId,
      anchor: {
        x: event.clientX,
        y: event.clientY
      }
    };
  }

  function handleTabClick(panelId: string): void {
    if (suppressedTabClickPanelId === panelId) {
      suppressedTabClickPanelId = null;
      return;
    }

    dispatchCommand({ type: 'activate-tab', stackId: stack.id, panelId });
  }

  function handleAddPanelTab(event: MouseEvent): void {
    event.stopPropagation();

    if (!activePanel) {
      return;
    }

    const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    toolMenuContextAnchor = rect
      ? {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
      : null;
    openToolMenuNonce += 1;
  }

  function clearFullscreenTransition(): void {
    if (fullscreenTransitionFrame !== null) {
      cancelAnimationFrame(fullscreenTransitionFrame);
      fullscreenTransitionFrame = null;
    }

    if (fullscreenTransitionTimer) {
      clearTimeout(fullscreenTransitionTimer);
      fullscreenTransitionTimer = null;
    }
  }

  function scheduleFullscreenAnimation(onStart: () => void, onComplete: () => void): void {
    clearFullscreenTransition();
    fullscreenTransitionFrame = requestAnimationFrame(() => {
      fullscreenTransitionFrame = null;
      onStart();
      fullscreenTransitionTimer = setTimeout(() => {
        fullscreenTransitionTimer = null;
        onComplete();
      }, STACK_FULLSCREEN_TRANSITION_MS);
    });
  }

  async function animateFullscreenState(nextFullscreen: boolean): Promise<void> {
    if (!stackElement) {
      renderedFullscreen = nextFullscreen;
      stackViewportStyle = nextFullscreen ? fullscreenViewportStyle : '';
      return;
    }

    clearFullscreenTransition();

    if (nextFullscreen) {
      const startRect = stackElement.getBoundingClientRect();
      renderedFullscreen = true;
      isAnimatingFullscreen = true;
      stackViewportStyle = createStackViewportStyle(startRect, false);
      await tick();

      scheduleFullscreenAnimation(
        () => {
          stackViewportStyle = createStackFullscreenTargetStyle(fullscreenViewportStyle);
        },
        () => {
          isAnimatingFullscreen = false;
          stackViewportStyle = fullscreenViewportStyle;
        }
      );

      return;
    }

    const currentRect = stackElement.getBoundingClientRect();
    const returnRect = stackElement.parentElement?.getBoundingClientRect() ?? currentRect;
    renderedFullscreen = true;
    isAnimatingFullscreen = true;
    stackViewportStyle = createStackViewportStyle(currentRect, false);
    await tick();

    scheduleFullscreenAnimation(
      () => {
        stackViewportStyle = createStackViewportStyle(returnRect, true);
      },
      () => {
        isAnimatingFullscreen = false;
        renderedFullscreen = false;
        stackViewportStyle = '';
      }
    );
  }

  function createPanelLayoutActions(panelId: string) {
    return createStackPanelLayoutActions({
      workspace,
      stack,
      panelId,
      labels: {
        showHeader: $i18nT('ui.shell.layoutActions.showHeader', { default: 'Show Header' }),
        hideHeader: $i18nT('ui.shell.layoutActions.hideHeader', { default: 'Hide Header' }),
        showFullscreenToggle: $i18nT('ui.shell.layoutActions.showFullscreenToggle', {
          default: 'Show Fullscreen Toggle'
        }),
        hideFullscreenToggle: $i18nT('ui.shell.layoutActions.hideFullscreenToggle', {
          default: 'Hide Fullscreen Toggle'
        }),
        verticalSplit: $i18nT('ui.shell.layoutActions.verticalSplit', { default: 'Vertical Split' }),
        horizontalSplit: $i18nT('ui.shell.layoutActions.horizontalSplit', { default: 'Horizontal Split' }),
        joinAreas: $i18nT('ui.shell.layoutActions.joinAreas', { default: 'Join Areas' }),
        swapAreas: $i18nT('ui.shell.layoutActions.swapAreas', { default: 'Swap Areas' })
      }
    });
  }

  function handleStartLayoutAction(
    actionId: StackPanelLayoutActionId,
    anchor: { x: number; y: number }
  ): void {
    if (!layoutEditingEnabled || !activePanel || !onOpenPanelLayoutMenu || !activeWindow) {
      return;
    }

    if (
      actionId !== 'split:vertical' &&
      actionId !== 'split:horizontal' &&
      actionId !== 'join-areas' &&
      actionId !== 'swap-areas'
    ) {
      return;
    }

    if (actionId === 'split:vertical' || actionId === 'split:horizontal') {
      const edge = actionId === 'split:vertical' ? 'left' : 'top';
      onOpenPanelLayoutMenu(activePanel.id, anchor, actionId, [
        {
          id: `panel:${activePanel.id}:split:${edge}`,
          panelId: activePanel.id,
          areaId: `panel:${activePanel.id}:split:${edge}`,
          areaPanelIds: [activePanel.id],
          edge,
          label: '',
          joinSide: edge,
          joinSiblingPanelIds: [],
          swapSiblingPanelIds: []
        }
      ]);
      return;
    }

    const targets = resolvePanelMenuTargets(activeWindow.root, activePanel.id);

    if (targets.length === 0) {
      return;
    }

    onOpenPanelLayoutMenu(activePanel.id, anchor, actionId, targets);
  }

  function handlePanelActionMenuToggle(): void {
    actionMenuContextAnchor = null;
  }

  function handlePanelActionMenuStateChange(open: boolean): void {
    isActionMenuVisible = open;

    if (!open) {
      actionMenuContextAnchor = null;
    }
  }

  function handlePanelToolMenuStateChange(open: boolean): void {
    isToolMenuVisible = open;
  }

  function detachActivePanel(): void {
    if (activePanel) {
      onDetachPanelToWindow(activePanel.id);
    }
  }

  function handleWindowPointerMove(event: CustomEvent<PointerEvent>): void {
    if (!pendingTabDrag || !onStartPanelDrag) {
      return;
    }

    const pointerEvent = event.detail;
    const deltaX = pointerEvent.clientX - pendingTabDrag.anchor.x;
    const deltaY = pointerEvent.clientY - pendingTabDrag.anchor.y;

    if (Math.hypot(deltaX, deltaY) < TAB_DRAG_THRESHOLD_PX) {
      return;
    }

    suppressedTabClickPanelId = pendingTabDrag.panelId;
    onStartPanelDrag(pendingTabDrag.panelId, stack.id, pendingTabDrag.anchor);
    pendingTabDrag = null;
  }

  function handleWindowPointerUp(): void {
    pendingTabDrag = null;
  }

  onDestroy(() => {
    clearFullscreenTransition();
  });
</script>

<StackTabDragInteractionBridge
  on:pointermove={handleWindowPointerMove}
  on:pointerup={handleWindowPointerUp}
/>

<section
  role="group"
  aria-label={$i18nT('ui.shell.layout.stack.ariaLabel', {
    default: activePanel ? 'Panel stack: {{title}}' : 'Panel stack',
    values: {
      title: activePanel
        ? (tabItems.find((item) => item.panel.id === activePanel.id)?.displayTitle ?? activePanel.title)
        : ''
    }
  })}
  class:stack--immersive={isImmersiveViewer}
  class:stack--fullscreen={renderedFullscreen}
  class:stack--focused={isFocused}
  class:stack--debug-hovered={isDebugHovered}
  class:stack--menu-open={isActionMenuVisible || isToolMenuVisible}
  class:stack--header-hidden={!shouldRenderHeader}
  class:stack--hidden-chrome-expanded={hiddenChromeHasSupplementalActions}
  class:stack--header-hover-suspended={suspendHeaderHover}
  class="stack"
  style={renderedFullscreen ? stackViewportStyle : undefined}
  bind:this={stackElement}
  data-panel-id={activePanel?.id}
  data-stack-id={stack.id}
  on:pointerdown={(event) => activePanel && focusPanel(activePanel.id, event)}
  on:pointermove={handleStackPointerMove}
  on:pointerleave={handleStackPointerLeave}
  on:contextmenu|capture={handleStackContextMenu}
>
  {#if shouldRenderHeader}
    <StackHeaderRegion
      {showTabs}
      {tabItems}
      activePanelId={activePanel?.id ?? null}
      {activePanelShowFullscreenToggle}
      isHeaderChromeVisible={hostChromeInHeader}
      stackId={stack.id}
      {isFullscreen}
      tabsLabel={$i18nT('ui.shell.layout.stack.panelTabs', { default: 'Panel tabs' })}
      addPanelTabLabel={$i18nT('ui.shell.panelChrome.addPanelTab', { default: 'Add a Tool tab' })}
      activeToolId={activeToolInstance?.toolId ?? null}
      activeToolIcon={activeToolEntry?.definition.icon ?? null}
      resourceLoading={activeToolRuntimeUi?.resourceLoading ?? null}
      {toolOptions}
      toolStatus={chromeStatus}
      headerActions={panelMenuActions}
      centerActions={[]}
      layoutActions={layoutEditingEnabled ? filteredLayoutActions : []}
      {layoutEditingEnabled}
      {dispatchCommand}
      isDragging={activePanel ? draggingPanelId === activePanel.id : false}
      {openActionMenuNonce}
      {openToolMenuNonce}
      {toolMenuContextAnchor}
      {actionMenuContextAnchor}
      {showPanelToolSelectorUi}
      {showPanelActionMenuUi}
      {showToggleFullscreenAction}
      {dockToggleButtonsVisible}
      {showClosePanelAction}
      showAddPanelTabAction={layoutEditingEnabled && showPanelToolSelectorUi}
      hoverSuspended={suspendHeaderHover}
      onToggleStackFullscreen={onToggleFullscreen}
      onTabPointerDown={handleTabPointerDown}
      onTabClick={handleTabClick}
      onClosePanelTab={closePanelTab}
      onAddPanelTab={handleAddPanelTab}
      onPanelActionMenuToggle={handlePanelActionMenuToggle}
      onPanelActionMenuStateChange={handlePanelActionMenuStateChange}
      onPanelToolMenuStateChange={handlePanelToolMenuStateChange}
      onDetachPanel={showMovePanelAction ? detachActivePanel : null}
      onStartLayoutAction={handleStartLayoutAction}
      onStartPanelDrag={activePanel &&
      layoutEditingEnabled &&
      showMovePanelAction &&
      !isFullscreen &&
      onStartPanelDrag
        ? (anchor) => onStartPanelDrag?.(activePanel.id, stack.id, anchor)
        : null}
    />
  {/if}

  <StackBodyRegion
    panel={activePanel ?? null}
    {workspace}
    {focus}
    {registry}
    {dispatchCommand}
    {toolRuntimeHost}
    {layoutEditingEnabled}
    panelLoading={activeToolRuntimeUi?.panelLoading ?? null}
  />

  {#if showPanelHeaderUi && !hostChromeInHeader && activePanel}
    <StackHiddenHeaderHostRegion
      panelId={activePanel.id}
      activeToolId={activeToolInstance?.toolId ?? null}
      activeToolIcon={activeToolEntry?.definition.icon ?? null}
      {activePanelShowFullscreenToggle}
      resourceLoading={activeToolRuntimeUi?.resourceLoading ?? null}
      {toolOptions}
      toolStatus={chromeStatus}
      headerActions={panelMenuActions}
      centerActions={[]}
      layoutActions={layoutEditingEnabled ? filteredLayoutActions : []}
      {layoutEditingEnabled}
      {dispatchCommand}
      isDragging={draggingPanelId === activePanel.id}
      {isFullscreen}
      {openActionMenuNonce}
      {openToolMenuNonce}
      {actionMenuContextAnchor}
      {toolMenuContextAnchor}
      {showPanelToolSelectorUi}
      {showPanelActionMenuUi}
      {showToggleFullscreenAction}
      {dockToggleButtonsVisible}
      {showClosePanelAction}
      hoverSuspended={suspendHeaderHover}
      onToggleStackFullscreen={onToggleFullscreen ? handleHiddenHostToggleFullscreen : null}
      onDetachPanel={showMovePanelAction ? detachActivePanel : null}
      onPanelActionMenuToggle={handlePanelActionMenuToggle}
      onPanelActionMenuStateChange={handlePanelActionMenuStateChange}
      onPanelToolMenuStateChange={handlePanelToolMenuStateChange}
      onStartLayoutAction={handleStartLayoutAction}
    />
  {/if}

  <ToolRenderProbeOverlay probe={panelRenderProbe} position="bottom-right" />
</section>

<style>
  .stack {
    --stack-panel-radius: 0.3rem;
    --stack-panel-inner-radius: calc(var(--stack-panel-radius) - 1px);
    /*
     * Host-owned footprint of chrome overlaid on top of tool content.
     * Tools may consume this inherited inset, but must not inspect stack classes
     * or reproduce the shell's header dimensions themselves.
    */
    --workbench-tool-chrome-overlay-inline-end: 0px;
    --workbench-tool-chrome-context-block-offset: 2.25rem;
    position: relative;
    z-index: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--stack-panel-radius);
    overflow: hidden;
    background: var(--color-background-surface);
    box-shadow:
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 16%, transparent),
      0 1px 0 color-mix(in srgb, var(--color-border-subtle) 28%, transparent);
    isolation: isolate;
  }

  .stack--focused {
    border-color: color-mix(in srgb, var(--color-border-focus) 38%, var(--color-border-subtle));
    box-shadow:
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 16%, transparent),
      0 1px 0 color-mix(in srgb, var(--color-border-subtle) 28%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-focus) 22%, transparent);
  }

  .stack--menu-open {
    z-index: 80;
    overflow: visible;
  }

  .stack--debug-hovered {
    box-shadow:
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 16%, transparent),
      0 1px 0 color-mix(in srgb, var(--color-border-subtle) 28%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-focus) 26%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-focus) 18%, transparent),
      0 0 14px color-mix(in srgb, var(--color-border-focus) 10%, transparent);
  }

  .stack--header-hover-suspended :global(.stack-hidden-header-host-region) {
    pointer-events: none;
  }

  .stack--immersive {
    --workbench-tool-chrome-overlay-inline-end: calc(
      var(--space-8) + (var(--size-icon-button) * 2) + var(--space-4)
    );
    grid-template-rows: minmax(0, 1fr);
  }

  .stack--header-hidden {
    --workbench-tool-chrome-overlay-inline-end: calc(
      var(--space-8) + (var(--size-icon-button) * 2) + var(--space-4)
    );
    --workbench-tool-chrome-context-block-offset: 0px;
    grid-template-rows: minmax(0, 1fr);
  }

  .stack--hidden-chrome-expanded {
    --workbench-tool-chrome-overlay-inline-end: 108px;
  }

  /* Visible tabs/header own the controls: no overlay occupies the Tool row. */
  .stack:not(.stack--header-hidden) {
    --workbench-tool-chrome-overlay-inline-end: 0px;
  }

  /*
   * A Tool may identify its first internal content row as chrome-aware without
   * knowing whether the shared header is currently visible. The shell owns the
   * overlay footprint; the Tool only declares where that clearance belongs.
   */
  .stack :global([data-tool-chrome-clearance='inline-end']) {
    box-sizing: border-box;
    min-block-size: var(
      --workbench-tool-header-row-height,
      calc(var(--size-icon-button) + var(--space-16))
    );
    align-items: center;
    padding-inline-end: calc(
      var(--workbench-tool-chrome-clearance-base-inline-end, var(--space-12)) +
        var(--workbench-tool-chrome-overlay-inline-end, 0px)
    ) !important;
  }

  .stack--immersive :global(.stack-body) {
    grid-row: 1;
    min-height: 0;
  }

  .stack--fullscreen {
    position: fixed;
    z-index: 120;
    height: auto;
    box-shadow:
      0 22px 64px rgb(0 0 0 / 0.34),
      0 0 0 1px color-mix(in srgb, var(--color-border-focus) 18%, transparent);
  }

  .stack--header-hidden :global(.stack-body),
  .stack--immersive :global(.stack-body) {
    border-top-left-radius: var(--stack-panel-inner-radius);
    border-top-right-radius: var(--stack-panel-inner-radius);
  }
</style>
