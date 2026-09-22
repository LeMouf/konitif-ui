<script lang="ts">
  import { invokeApplicationCommand, type ApplicationCommandContribution } from './applicationCommands';
  export let applicationCommands: readonly ApplicationCommandContribution[] = [];
  import { getContext, onDestroy, onMount, setContext, tick } from 'svelte';
  import { writable, type Readable } from 'svelte/store';
  import {
    createDesignSystemThemeSession,
    createPanel,
    createShellLayoutSurfaceProjection,
    createStack,
    createWorkbenchRouteHref,
    createWorkspaceSessionState,
    createWorkspaceShell,
    createWorkspaceWindow,
    dispatchLayoutSurfaceIntent,
    findPanelInWorkspace,
    listPanelsInWorkspace,
    MIN_SHELL_REGION_SIZES,
    parseWorkbenchRoute,
    patchWorkbenchToolDockVisibilityState,
    readWorkbenchToolDockVisibility,
    isShellRegionWidgetVisible,
    resolveShellRegionPresentation,
    SHELL_REGION_RESIZE_CLOSE_OFFSET_PX,
    shouldCloseShellRegionFromResize
  } from '@konitif/workbench';
  import type {
    BootProjection,
    InMemoryShellWidgetRegistry,
    InMemoryToolRegistry,
    JsonObject,
    LayoutDockSide,
    LayoutDockTarget,
    LayoutEdge,
    LayoutInteractionState,
    LayoutMenuActionId,
    LayoutMenuActionSelection,
    LayoutNode,
    LayoutMenuTarget,
    LayoutUserActionIntent,
    ShellRegionId,
    ShellRegionAxis,
    ShellRegionPresentation,
    ShellState,
    SplitOrientation,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus,
    WorkspaceSessionState,
    WorkspacePresetId,
    DesignSystemThemeSession,
    DesignSystemThemeMode,
    RuntimeProjectionSessionEntry,
    ShellWidgetDefinition,
    ShellWidgetPlacement,
    TranslationBundle,
    WorkbenchLocale,
    WorkbenchReadingLevel,
    WorkbenchRuntimeProjectDescriptor,
    WorkbenchRuntimeSnapshot,
    WorkbenchRuntimeWorkspaceDescriptor,
    WorkbenchRoute,
    WorkbenchIconInput,
    WorkspaceSnapshotImportResult
  } from '@konitif/workbench';
  import AppShellToolbar from './AppShellToolbar.svelte';
  import type { TechnicalDocsReports } from './technicalDocsReports';
  import type { TechnicalDocsDatasetLoader } from './technicalDocsDatasets';
  import CommandPalette from './CommandPalette.svelte';
  import { observeToolRegistryRevision } from './toolRegistryRevision';
  import {
    buildCommandPaletteItems,
    resolveCurrentPaletteSelection,
    resolveShellShortcut,
    type CommandPaletteItem,
    type ShellAction
  } from './commandPalette';
  import AppShellMainContentLayout from './layout/AppShellMainContentLayout.svelte';
  import AppShellFooterRegion from './regions/AppShellFooterRegion.svelte';
  import AppShellWorkspaceRegion from './regions/AppShellWorkspaceRegion.svelte';
  import type { DesignSystemThemeDocument } from './designSystemThemeCatalog';
  import {
    applyDesignSystemThemeRuntimeStyle,
    removeDesignSystemThemeRuntimeStyle
  } from './designSystemThemeRuntime';
  import {
    createDesignSystemEntityDiscovery,
    type DesignSystemDiscoveryProjection
  } from './designSystemEntityDiscovery';
  import {
    type FeatureDocumentationContribution,
    resolveContextualFeatureDocs,
    groupFeatureDocsByContext,
    type FeatureDocFilter
  } from './technicalDocsCatalog';
  import { initWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';
  import { initWorkspaceInteractionHintsContext } from '../debug/workspaceInteractionHints';
  import {
    createRuntimeProjectionActionState,
    resolveRuntimeProjectionActionStatus,
    resolveRuntimeProjectionTarget,
    type RuntimeProjectionActionState,
    type RuntimeProjectionTarget,
    type RuntimeProjectionViewerOption
  } from './runtimeObservability';
  import {
    createWorkbenchRuntimeSnapshotStore,
    setWorkbenchRuntimeProjectActions,
    setWorkbenchRuntimeSnapshotStore
  } from './workbenchRuntimeSnapshotContext';
  import {
    defaultWorkbenchThemeRuntime,
    setWorkbenchThemeRuntimeContext,
    type WorkbenchAmbientQuality,
    type WorkbenchRuntimeVisualPhase,
    type WorkbenchThemeRuntime
  } from '../themes';

  import {
    initWorkbenchI18nContext,
    type WorkbenchLocaleBundleLoader,
    type WorkbenchTranslate
  } from '../i18n/workbenchI18n';
  import { workbenchUiTranslationBundles } from '../i18n/workbenchUiTranslations';
  import { loadWorkbenchUiLocaleBundles } from '../i18n/workbenchUiLocaleLoader';
  import { resolveLocalizedToolDefinitionText } from '../i18n/workbenchEntityTranslations';
  import {
    WORKBENCH_LANGUAGE_SESSION_STORAGE_KEY,
    defaultWorkbenchLocaleOptions,
    normalizeWorkbenchLocale,
    resolveInitialWorkbenchLocale,
    writeWorkbenchSessionLocale,
    type WorkbenchLocaleOption
  } from '../i18n/workbenchLanguagePreference';
  import { setWorkbenchReadingLevelContext } from '../primitives/workbenchReadingLevelContext';
  import {
    WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY,
    resolveInitialWorkbenchReadingLevel,
    writeWorkbenchReadingLevelPreference
  } from '../primitives/workbenchReadingLevelPreference';

  const REAL_PREVIEW_DEPTH_CONTEXT = Symbol.for('workbench.componentAssembly.realPreviewDepth');
  const SANDBOX_NAVIGATION_CONTEXT = Symbol.for('workbench.componentAssembly.sandboxNavigation');
  const WORKBENCH_SHELL_ROUTE_CONTEXT = Symbol.for('workbench.shellRoute');
  const WORKBENCH_SHELL_STATE_CONTEXT = Symbol.for('workbench.shellState');
  const WORKBENCH_SHELL_WIDGET_CATALOG_CONTEXT = Symbol.for('workbench.shellWidgetCatalog');
  type SandboxNavigationContext = {
    getHref: () => string;
    push: (href: string, options?: { eventType?: string; targetLabel?: string }) => void;
    subscribe: (run: (href: string) => void) => () => void;
  };
  type WorkbenchShellRouteContext = {
    route: Readable<string>;
  };
  type WorkbenchShellStateContext = {
    shellState: Readable<ShellState>;
  };
  type WorkbenchShellWidgetCatalogContext = {
    shellWidgetCatalog: InMemoryShellWidgetRegistry;
  };
  const isSandboxedComponentAssemblyPreview = Boolean(getContext(REAL_PREVIEW_DEPTH_CONTEXT));
  const sandboxNavigation = getContext<SandboxNavigationContext | null>(SANDBOX_NAVIGATION_CONTEXT) ?? null;

  type ShellShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type ShellShortcutPriority = 'essential' | 'secondary' | 'advanced';
  type ShellShortcutScopeFilter = 'all' | 'context' | 'global';
  type ShellShortcutTypeFilter = 'all' | ShellShortcutType;

  type ShellShortcut = {
    key: string;
    label: string;
    labelKey?: string;
    type?: ShellShortcutType;
    priority?: ShellShortcutPriority;
    context?: string;
    contextKey?: string;
    description?: string;
    descriptionKey?: string;
  };

  type FooterAudioMeter = {
    left: number;
    right: number;
    peakDb: number;
  };

  type FooterAudioChannel = {
    id: string;
    label: string;
    volume: number;
    muted: boolean;
    meter?: FooterAudioMeter;
  };

  type FooterAudioSummary = {
    title: string;
    status: string;
    summary: string;
    meta: string[];
    mediaBlocks?: Array<{
      id: string;
      title: string;
      status: string;
      summary: string;
      meta: string[];
      progress: number | null;
    }>;
  };
  type ShellView = {
    id: string;
    label: string;
    route?: string;
    path?: string;
    labelKey?: string;
  };
  type WorkspacePresetControl = {
    id: string;
    label: string;
    labelKey?: string;
    description?: string;
    descriptionKey?: string;
    icon?: WorkbenchIconInput;
  };
  type WorkspacePanelVisibilityControl = {
    id: string;
    label: string;
    title: string;
    active: boolean;
    icon?: WorkbenchIconInput | null;
    toolId?: string;
    toolInstanceId?: string;
  };
  type ShellRoute = string;
  type ShellRegionResizeHint = {
    regionId: ShellRegionId;
    active: boolean;
    near: boolean;
    thresholdPx: number;
  };
  type ShellRegionWidgetVisibilityRequest = {
    regionId: ShellRegionId;
    widgetId: string;
    isVisible: boolean;
  };
  type ToolInternalDockVisibilityRequest = {
    panelId: string;
    toolInstanceId: string;
    commandId: string;
    dockId: string;
    legacyVisibleKey?: string;
    isVisible: boolean;
  };
  type ShellWidgetLocationRequest = {
    regionId: ShellRegionId;
    widgetId: string;
    location: 'root' | 'internal';
    panelId?: string;
    toolInstanceId?: string;
    commandId?: string;
    dockId?: string;
    legacyVisibleKey?: string;
  };
  type ResolvedShellShortcut = ShellShortcut & {
    id: string;
    scope: 'context' | 'global';
    scopeLabel: string;
    contextLabel: string;
    type: ShellShortcutType;
    priority: ShellShortcutPriority;
    priorityLabel: string;
    searchText: string;
  };

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
      }
    | undefined
  >;

  type LayoutEditOptionKey =
    | 'leftDockVisible'
    | 'rightDockVisible'
    | 'bottomDockVisible'
    | 'shellRegionResize'
    | 'boundaryResize'
    | 'boundaryPull'
    | 'intersectionResize'
    | 'panelHeaderUi'
    | 'panelToolSelectorUi'
    | 'panelActionMenuUi'
    | 'dockToggleButtonsVisible'
    | 'layoutMenuVisible'
    | 'resizeSnap'
    | 'deleteZones'
    | 'dockPreview'
    | 'movePanel'
    | 'dockAsTab'
    | 'dockToSide'
    | 'panelLayoutMenu'
    | 'panelToggleHeader'
    | 'toggleFullscreen'
    | 'closePanel'
    | 'panelSplitVertical'
    | 'panelSplitHorizontal'
    | 'panelJoinAreas'
    | 'panelSwapAreas'
    | 'widgetZoneHost'
    | 'widgetPlacementActions'
    | 'shellRegionEmptyState'
    | 'widgetZonePopulate';

  type LayoutEditModeView = 'off' | 'on';

  type LayoutEditOptionStatus = {
    raw: boolean;
    enabled: boolean;
    state: 'enabled' | 'disabled' | 'blocked';
    blockedBy: LayoutEditOptionKey[];
  };

  const SILENT_FOOTER_AUDIO_METER: FooterAudioMeter = {
    left: 0,
    right: 0,
    peakDb: -90
  };
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let shellState: ShellState;
  export let shellWidgetRegistry: InMemoryShellWidgetRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let onApplyWorkspaceSession:
    | ((workspaceSession: WorkspaceSessionState, historyScope?: 'none' | 'app' | 'core' | 'both') => void)
    | null = null;
  export let onResizeSplit: (splitId: string, sizes: [number, number]) => void;
  export let onResizeSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    deltaRatio: number,
    mode: 'local' | 'proportional'
  ) => void;
  export let onCollapseSplit: (splitId: string, removeChildIndex: 0 | 1) => void;
  export let onCollapseSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    removeSide: 'start' | 'end'
  ) => void;
  export let onActivateShellWidget: (regionId: ShellRegionId, widgetId: string) => void;
  export let onAddShellWidgetToRegion: (
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ) => void = () => {};
  export let onMoveShellWidgetToRegion: (
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ) => void = () => {};
  export let onRemoveShellWidgetFromRegion: (regionId: ShellRegionId, widgetId: string) => void = () => {};
  export let onSetShellRegionArrangement: (
    regionId: ShellRegionId,
    presentation: ShellRegionPresentation,
    axis?: ShellRegionAxis
  ) => void = () => {};
  export let onSetShellRegionOpen: (regionId: ShellRegionId, isOpen: boolean) => void;
  export let onSetShellRegionVisible: (regionId: ShellRegionId, isVisible: boolean) => void;
  export let onSetShellRegionWidgetVisible: (
    regionId: ShellRegionId,
    widgetId: string,
    isVisible: boolean
  ) => void = () => {};
  export let onSetShellRegionSize: (regionId: ShellRegionId, size: number) => void;
  export let onUpdateToolState: ((toolInstanceId: string, nextState: JsonObject) => boolean) | null = null;
  export let onSetFullscreenPanel: (panelId: string | null) => void = () => {};
  export let onSetDesignSystemThemeSession: (session: DesignSystemThemeSession | null) => void = () => {};
  export let onShellRouteChange: (route: ShellRoute) => void = () => {};
  export let shellRoute: ShellRoute | null = null;
  export let featureDocumentation: FeatureDocumentationContribution | null = null;
  export let technicalDocsDatasetLoader: TechnicalDocsDatasetLoader | null = null;
  export let technicalDocsReports: TechnicalDocsReports | null = null;
  export let themeDocument: DesignSystemThemeDocument | null = null;
  export let suppressGlobalThemeRuntime = false;
  export let suppressGlobalNavigation = false;
  export let onResetWorkspace: () => void;
  export let onLoadWorkspacePreset: (presetId: WorkspacePresetId) => void;
  export let onExportWorkspaceSnapshot: () => string;
  export let onImportWorkspaceSnapshot: (snapshot: string) => WorkspaceSnapshotImportResult;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: ToolRuntimeUiStateMap = {};
  export let layoutInteraction: LayoutInteractionState;
  export let onOpenLayoutSplitMenu: (
    panelId: string | null,
    edge: LayoutEdge,
    anchor: { x: number; y: number },
    targets?: LayoutMenuTarget[],
    options?: {
      source?: 'workspace-edge' | 'split-boundary' | 'panel-menu';
      initialActionId?: LayoutMenuActionId | null;
    }
  ) => void;
  export let onSelectLayoutMenuAction: (selection: LayoutMenuActionSelection | null) => void;
  export let onHoverLayoutSplitSide: (side: LayoutDockSide | null) => void;
  export let onConfirmLayoutSplitSide: (side: LayoutDockSide) => void;
  export let onUpdateLayoutSplitPreview: (panelId: string | null, pointerRatio: number) => void;
  export let onAdjustLayoutSplitPreviewCuts: (delta: number) => void;
  export let onStartBoundaryPull: (input: {
    anchor: { x: number; y: number };
    horizontalEdge?: 'left' | 'right' | null;
    verticalEdge?: 'top' | 'bottom' | null;
    source?: 'edge' | 'corner';
    neutralThreshold?: number;
    creationThreshold?: number;
  }) => void;
  export let onUpdateBoundaryPull: (
    pointer: { x: number; y: number },
    viewport: { width: number; height: number }
  ) => void;
  export let onCommitBoundaryPull: () => void;
  export let onStartIntersectionResize: (input: {
    anchor: { x: number; y: number };
    columnSplitId: string;
    rowSplitId: string;
    columnBaseSizes: [number, number];
    rowBaseSizes: [number, number];
  }) => void;
  export let onUpdateIntersectionResize: (
    pointer: { x: number; y: number },
    dimensions: { width: number; height: number }
  ) => void;
  export let onCommitLayoutSubdivideSelection: (
    panelId: string,
    edge: LayoutEdge,
    orientation: SplitOrientation,
    cuts: number,
    pointerRatio: number
  ) => void;
  export let onCommitLayoutSplitPreview: () => void;
  export let onCancelLayoutInteraction: () => void;
  export let onStartPanelDrag: (
    panelId: string,
    sourceStackId: string,
    anchor: { x: number; y: number }
  ) => void;
  export let onUpdatePanelDrag: (
    pointer: { x: number; y: number },
    hoveredTarget: LayoutDockTarget | null
  ) => void;
  export let onCommitPanelDock: () => void;
  export let onBeginAppHistoryTransaction: () => void = () => {};
  export let onCommitAppHistoryTransaction: () => void = () => {};
  export let onCancelAppHistoryTransaction: () => void = () => {};
  export let onBeginCoreHistoryTransaction: () => void = () => {};
  export let onCommitCoreHistoryTransaction: () => void = () => {};
  export let onCancelCoreHistoryTransaction: () => void = () => {};
  export let footerContextShortcuts: ShellShortcut[] = [];
  export let footerGlobalShortcuts: ShellShortcut[] = [];
  export let canUndoAppHistory = false;
  export let canRedoAppHistory = false;
  export let canUndoCoreHistory = false;
  export let canRedoCoreHistory = false;
  export let onUndoAppHistory: () => void = () => {};
  export let onRedoAppHistory: () => void = () => {};
  export let onUndoCoreHistory: () => void = () => {};
  export let onRedoCoreHistory: () => void = () => {};
  export let appVersion = '';
  export let appContext = 'workbench';
  export let appDisplayName = '';
  export let workspaceShellViewId: 'studio' | 'lab' = 'studio';
  export let shellViewDefinitions: ShellView[] | null = null;
  export let workspacePresetDefinitions: WorkspacePresetControl[] = [];
  export let onSelectWorkspacePreset: (presetId: string) => void = (presetId) => {
    onLoadWorkspacePreset(presetId as WorkspacePresetId);
  };
  export let onRequestWorkspacePresetAuthoring: (() => void) | null = null;
  export let onLoadNativeFixture: (() => void) | null = null;
  export let showHeaderLayoutHistoryHint = true;
  export let showFooterDocsControl = true;
  export let showFooterLayoutControl = true;
  export let audioMuted = false;
  export let footerAudioMasterVolume = 1;
  export let footerAudioMasterMeter: FooterAudioMeter = SILENT_FOOTER_AUDIO_METER;
  export let footerAudioChannels: FooterAudioChannel[] = [];
  export let footerAudioSummary: FooterAudioSummary | null = null;
  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let bootProjection: BootProjection | null = null;
  export let spatialAmbientQuality: WorkbenchAmbientQuality = 'medium';
  export let themeRuntime: WorkbenchThemeRuntime = defaultWorkbenchThemeRuntime;
  export let performanceSurfaces = false;
  export let showLaunchGateReturn = true;
  export let runtimeProjectionViewerOptionsByKind: Record<string, RuntimeProjectionViewerOption[]> = {};
  export let runtimeProjectionSessionEntries: RuntimeProjectionSessionEntry[] = [];
  export let projectApplicationOptions: string[] = [];
  export let projectRepositoryOptions: string[] = [];
  export let openProjectMenuOnStartup = false;
  export let runtimeProjectRootFallback = '';
  export let workspaceWindowId: string | null = null;
  export let onReconnectRuntime: () => void = () => {};
  export let onReturnToLaunchGate: () => void = () => {};
  export let onLoadRuntimeProject: (
    root: string
  ) => Promise<WorkbenchRuntimeWorkspaceDescriptor> = async () => {
    throw new Error('Runtime project loading is unavailable.');
  };
  export let onOpenRuntimeProjection: (
    projectionKind: string,
    sourceFile: string,
    viewerId?: string | null
  ) => Promise<void> | void = () => {};
  export let onLoadRuntimeProjection: (
    projectionKind: string,
    sourceFile: string
  ) => Promise<unknown> | unknown = () => null;
  export let onInvalidateRuntimeProjection: (
    projectionKind: string,
    sourceFile: string
  ) => Promise<void> | void = () => {};
  export let onToggleAudioMuted: () => void = () => {};
  export let onSetAudioMasterVolume: (volume: number) => void = () => {};
  export let onSetAudioChannelVolume: (channelId: string, volume: number) => void = () => {};
  export let onDetachPanelToWindow: (panelId: string) => void = () => {};
  export let componentAssemblyToolId: string | null = null;
  export let componentAssemblySources: Record<string, string> = {};
  export let onOpenComponentAssembly: (sourceFile: string, toolId: string | null) => void = () => {};
  export let i18nLocale: WorkbenchLocale = 'en';
  export let i18nBundles: TranslationBundle[] = [];
  export let i18nLocaleOptions: WorkbenchLocaleOption[] = defaultWorkbenchLocaleOptions;
  export let i18nLocaleSessionStorageKey = WORKBENCH_LANGUAGE_SESSION_STORAGE_KEY;
  export let loadI18nLocaleBundles: WorkbenchLocaleBundleLoader = async () => [];
  export let onI18nLocaleChange: (locale: WorkbenchLocale) => void | Promise<void> = () => {};
  export let readingLevelDefault: WorkbenchReadingLevel | null = null;
  export let readingLevelPreferenceStorageKey = WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY;

  let supportedI18nLocales = i18nLocaleOptions.map((option) => option.locale);
  let observedI18nLocale = i18nLocale;
  const initialI18nLocale = resolveInitialWorkbenchLocale({
    requestedLocale: i18nLocale,
    supportedLocales: supportedI18nLocales,
    storageKey: i18nLocaleSessionStorageKey
  });
  let activeI18nLocale: WorkbenchLocale = 'en';
  let i18nLocaleLoadRevision = 0;
  let i18nProjectionReady = false;

  const workbenchI18n = initWorkbenchI18nContext({
    locale: activeI18nLocale,
    bundles: [...workbenchUiTranslationBundles, ...i18nBundles]
  });
  let registeredConsumerI18nBundles = i18nBundles;
  let activeReadingLevelDefault = resolveInitialWorkbenchReadingLevel(
    readingLevelDefault,
    readingLevelPreferenceStorageKey
  );
  const readingLevelDefaultStore = writable<WorkbenchReadingLevel>(activeReadingLevelDefault);
  setWorkbenchReadingLevelContext(readingLevelDefaultStore);
  const runtimeSnapshotStore = setWorkbenchRuntimeSnapshotStore(
    createWorkbenchRuntimeSnapshotStore(runtimeSnapshot)
  );
  setWorkbenchRuntimeProjectActions({
    loadProject: (root) => onLoadRuntimeProject(root)
  });
  const i18nT = workbenchI18n.t;
  const defaultShellViewDefinitions: ShellView[] = [
    { id: 'studio', label: 'Workspace' },
    { id: 'lab', label: 'Forge', route: 'lab', path: '/forge' },
    { id: 'docs', label: 'Docs', route: 'docs', path: '/docs' }
  ];
  let sandboxNavigationHref = sandboxNavigation?.getHref() ?? null;
  let activeShellViewDefinitions = resolveActiveShellViewDefinitions();
  const initialShellRoute = shellRoute ?? resolveInitialShellRoute();
  let shellViews: ShellView[] = defaultShellViewDefinitions;
  $: supportedI18nLocales = i18nLocaleOptions.map((option) => option.locale);
  $: runtimeSnapshotStore.set(runtimeSnapshot);
  $: if (i18nLocale !== observedI18nLocale) {
    observedI18nLocale = i18nLocale;
    const requestedLocale = resolveInitialWorkbenchLocale({
      requestedLocale: i18nLocale,
      supportedLocales: supportedI18nLocales,
      storageKey: i18nLocaleSessionStorageKey
    });
    void activateI18nLocale(requestedLocale, false);
  }
  $: if (!normalizeWorkbenchLocale(activeI18nLocale, supportedI18nLocales)) {
    const requestedLocale = resolveInitialWorkbenchLocale({
      supportedLocales: supportedI18nLocales,
      storageKey: i18nLocaleSessionStorageKey
    });
    void activateI18nLocale(requestedLocale, false);
  }
  $: workbenchI18n.locale.set(activeI18nLocale);
  $: readingLevelDefaultStore.set(activeReadingLevelDefault);
  // Consumer catalogs are immutable projections in normal operation. Re-read
  // them only when HMR or the host actually replaces the bundle collection;
  // unrelated Tool state must never rescan every translated message.
  $: if (i18nBundles !== registeredConsumerI18nBundles) {
    registeredConsumerI18nBundles = i18nBundles;
    workbenchI18n.registerBundles(i18nBundles);
  }
  $: activeShellViewDefinitions = resolveActiveShellViewDefinitions();
  $: shellViews = activeShellViewDefinitions.map((view) => ({
    ...view,
    label: $i18nT(view.labelKey ?? `ui.shell.views.${view.id}`, { default: view.label })
  }));
  let featureDocFilters: Array<{ key: FeatureDocFilter; label: string }> = [];
  let shortcutScopeFilters: Array<{ key: ShellShortcutScopeFilter; label: string }> = [];
  let shortcutTypeFilters: Array<{ key: ShellShortcutTypeFilter; label: string }> = [];
  $: featureDocFilters = [
    { key: 'all', label: $i18nT('ui.shell.filters.all', { default: 'All' }) },
    { key: 'core', label: $i18nT('ui.shell.filters.core', { default: 'Core' }) },
    { key: 'ui', label: $i18nT('ui.shell.filters.ui', { default: 'UI' }) },
    { key: 'app', label: $i18nT('ui.shell.filters.app', { default: 'App' }) }
  ];
  $: shortcutScopeFilters = [
    { key: 'all', label: $i18nT('ui.shell.filters.all', { default: 'All' }) },
    { key: 'context', label: $i18nT('ui.shell.filters.context', { default: 'Context' }) },
    { key: 'global', label: $i18nT('ui.shell.filters.global', { default: 'Global' }) }
  ];
  $: shortcutTypeFilters = [
    { key: 'all', label: $i18nT('ui.shell.filters.all', { default: 'All' }) },
    { key: 'playback', label: $i18nT('ui.shell.shortcutTypes.playback', { default: 'Playback' }) },
    { key: 'navigation', label: $i18nT('ui.shell.shortcutTypes.navigation', { default: 'Navigate' }) },
    { key: 'selection', label: $i18nT('ui.shell.shortcutTypes.selection', { default: 'Select' }) },
    { key: 'edit', label: $i18nT('ui.shell.shortcutTypes.edit', { default: 'Edit' }) },
    { key: 'view', label: $i18nT('ui.shell.shortcutTypes.view', { default: 'View' }) },
    { key: 'system', label: $i18nT('ui.shell.shortcutTypes.system', { default: 'System' }) }
  ];

  const workspaceDebugHover = initWorkspaceDebugHoverContext();
  const workspaceInteractionHints = initWorkspaceInteractionHintsContext();
  const interactionHintStore = workspaceInteractionHints.hoveredHint;
  let appShellElement: HTMLDivElement | null = null;

  const resizeShortcuts: ShellShortcut[] = [
    {
      key: 'Drag',
      label: 'Resize adjacent cells',
      type: 'edit',
      priority: 'essential',
      context: 'Layout Hint'
    },
    {
      key: 'Ctrl + Drag',
      label: 'Redistribute proportionally',
      type: 'edit',
      priority: 'secondary',
      context: 'Layout Hint'
    },
    {
      key: 'Right Click',
      label: 'Resize menu',
      type: 'navigation',
      priority: 'secondary',
      context: 'Layout Hint'
    }
  ];
  const edgeShortcuts: ShellShortcut[] = [
    { key: 'Drag', label: 'Create band', type: 'edit', priority: 'essential', context: 'Layout Hint' },
    {
      key: 'Right Click',
      label: 'Edge menu',
      type: 'navigation',
      priority: 'secondary',
      context: 'Layout Hint'
    }
  ];
  const layoutEditModeTabs: Array<{ key: LayoutEditModeView; label: string }> = [
    { key: 'off', label: 'Off' },
    { key: 'on', label: 'On' }
  ];
  const layoutEditUiSections: Array<{
    title: string;
    items: Array<{ key: LayoutEditOptionKey; label: string }>;
  }> = [
    {
      title: 'Workspace UI',
      items: [
        { key: 'leftDockVisible', label: 'Show Left Dock' },
        { key: 'rightDockVisible', label: 'Show Right Dock' },
        { key: 'bottomDockVisible', label: 'Show Bottom Dock' },
        { key: 'shellRegionResize', label: 'Shell Region Resize' },
        { key: 'boundaryResize', label: 'Boundary Resize' },
        { key: 'boundaryPull', label: 'Boundary Pull' },
        { key: 'intersectionResize', label: 'Intersection Resize' }
      ]
    },
    {
      title: 'Panel Chrome',
      items: [
        { key: 'panelHeaderUi', label: 'Panel Header' },
        { key: 'panelToolSelectorUi', label: 'Tool Selector' },
        { key: 'panelActionMenuUi', label: 'Panel Menu' },
        { key: 'dockToggleButtonsVisible', label: 'Dock Side Toggles' },
        { key: 'layoutMenuVisible', label: 'Layout Menu' },
        { key: 'widgetZoneHost', label: 'Widget Zone Host' }
      ]
    },
    {
      title: 'Gesture Helpers',
      items: [
        { key: 'resizeSnap', label: 'Resize Snap' },
        { key: 'deleteZones', label: 'Delete Zones' },
        { key: 'dockPreview', label: 'Dock Preview' }
      ]
    }
  ];
  const layoutEditActionSections: Array<{
    title: string;
    items: Array<{ key: LayoutEditOptionKey; label: string }>;
  }> = [
    {
      title: 'Panel / Stack',
      items: [
        { key: 'movePanel', label: 'Move Panel' },
        { key: 'dockAsTab', label: 'Dock As Tab' },
        { key: 'dockToSide', label: 'Dock To Side' },
        { key: 'toggleFullscreen', label: 'Toggle Fullscreen' },
        { key: 'closePanel', label: 'Close Panel' }
      ]
    },
    {
      title: 'Panel Layout Menu',
      items: [
        { key: 'panelLayoutMenu', label: 'Panel Layout Menu' },
        { key: 'panelToggleHeader', label: 'Toggle Header' },
        { key: 'panelSplitVertical', label: 'Split Vertical' },
        { key: 'panelSplitHorizontal', label: 'Split Horizontal' },
        { key: 'panelJoinAreas', label: 'Join Areas' },
        { key: 'panelSwapAreas', label: 'Swap Areas' }
      ]
    },
    {
      title: 'Widget Zones',
      items: [
        { key: 'widgetPlacementActions', label: 'Placement Actions' },
        { key: 'shellRegionEmptyState', label: 'Empty Region States' },
        { key: 'widgetZonePopulate', label: 'Populate Empty Zones' }
      ]
    }
  ];
  const layoutEditOptionDependencies: Partial<Record<LayoutEditOptionKey, LayoutEditOptionKey[]>> = {
    panelToolSelectorUi: ['panelHeaderUi'],
    panelActionMenuUi: ['panelHeaderUi'],
    panelLayoutMenu: ['panelActionMenuUi'],
    toggleFullscreen: ['panelHeaderUi'],
    closePanel: ['panelHeaderUi'],
    movePanel: ['panelHeaderUi'],
    dockPreview: ['movePanel'],
    dockAsTab: ['movePanel'],
    dockToSide: ['movePanel'],
    panelToggleHeader: ['panelLayoutMenu'],
    panelSplitVertical: ['panelLayoutMenu'],
    panelSplitHorizontal: ['panelLayoutMenu'],
    panelJoinAreas: ['panelLayoutMenu'],
    panelSwapAreas: ['panelLayoutMenu'],
    widgetPlacementActions: ['widgetZoneHost'],
    shellRegionEmptyState: ['widgetZoneHost'],
    widgetZonePopulate: ['widgetPlacementActions', 'shellRegionEmptyState']
  };

  $: renderedWindow =
    (workspaceWindowId ? workspace.windows.find((window) => window.id === workspaceWindowId) : null) ??
    workspace.windows[0] ??
    workspace.windows.find((window) => window.id === workspace.activeWindowId);
  $: renderedWindowId = renderedWindow?.id ?? null;
  $: registryRevision = observeToolRegistryRevision(registry);
  $: paletteItems = (void $registryRevision, buildCommandPaletteItems({
    applicationCommands,
    registry,
    workspace,
    focus,
    readingLevelDefault: activeReadingLevelDefault,
    translate: $i18nT
  }));
  $: shellLayoutSurfaceProjection = createShellLayoutSurfaceProjection(shellState);
  $: canToggleLeftRegion =
    isLayoutEditingEnabled || hasConnectedShellRegionWidget('left', availableShellToolIds);
  $: canToggleBottomRegion =
    isLayoutEditingEnabled || hasConnectedShellRegionWidget('bottom', availableShellToolIds);
  $: canToggleRightRegion =
    isLayoutEditingEnabled || hasConnectedShellRegionWidget('right', availableShellToolIds);

  let isPaletteOpen = false;
  let activeShellViewId: ShellView['id'] = resolveShellViewIdForRoute(initialShellRoute);
  let activeShellRoute: ShellRoute = initialShellRoute;
  const activeShellRouteStore = writable<ShellRoute>(activeShellRoute);
  const shellStateStore = writable<ShellState>(shellState);
  setContext(WORKBENCH_SHELL_ROUTE_CONTEXT, {
    route: activeShellRouteStore
  } satisfies WorkbenchShellRouteContext);
  setContext(WORKBENCH_SHELL_STATE_CONTEXT, {
    shellState: shellStateStore
  } satisfies WorkbenchShellStateContext);
  setContext(WORKBENCH_SHELL_WIDGET_CATALOG_CONTEXT, {
    shellWidgetCatalog: shellWidgetRegistry
  } satisfies WorkbenchShellWidgetCatalogContext);
  $: activeShellRouteStore.set(activeShellRoute);
  $: shellStateStore.set(shellState);
  $: if (shellRoute && shellRoute !== activeShellRoute) {
    applyActiveShellRoute(shellRoute);
  }

  const unsubscribeSandboxNavigation =
    sandboxNavigation?.subscribe((href) => {
      sandboxNavigationHref = href;
      const shellRoute = resolveShellRouteFromHref(href);

      if (shellRoute !== activeShellRoute) {
        setActiveShellRoute(shellRoute);
      }
    }) ?? (() => undefined);
  let importInput: HTMLInputElement | null = null;
  let shellFeedback: { tone: 'info' | 'error'; message: string } | null = null;
  let selectedWorkspacePresetId: string | null = null;
  let isLayoutEditingEnabled = false;
  let isLayoutEditMenuOpen = false;
  let shellRegionResizeGestureActive = false;
  let shellRegionResizeSession: {
    regionId: ShellRegionId;
    startSize: number;
    requestedSize: number;
  } | null = null;
  $: shellRegionResizeHint = resolveShellRegionResizeHint(shellRegionResizeSession);
  let isFeatureDocsMenuOpen = false;
  let isShortcutMenuOpen = false;
  let isAudioMenuOpen = false;
  let isAudioMediaBlocksOpen = false;
  let isRuntimeMenuOpen = false;
  let isThemeMenuOpen = false;
  let isCoreSideMenuOpen = false;
  let isCoreProjectManualLoadOpen = false;
  let observedOpenProjectMenuOnStartup = false;
  let coreProjectLoadInput: HTMLInputElement | null = null;
  let coreProjectLoadPath = '';
  let coreProjectLoadError: string | null = null;
  let coreProjectLoadingLabel = '';
  let isCoreProjectLoading = false;
  let isInvalidatingRuntimeProjection = false;
  let runtimeProjectionActionState: RuntimeProjectionActionState | null = null;
  let featureDocsFilter: FeatureDocFilter = 'app';
  let shortcutScopeFilter: ShellShortcutScopeFilter = 'all';
  let shortcutTypeFilter: ShellShortcutTypeFilter = 'all';
  let shortcutQuery = '';
  let layoutEditModeView: LayoutEditModeView = 'off';
  let hoveredLayoutEditOptionKey: LayoutEditOptionKey | null = null;
  let hoveredFooterControl:
    | 'docs'
    | 'layout'
    | 'shortcuts'
    | 'audio'
    | 'runtime'
    | 'language'
    | 'reading'
    | 'theme'
    | null = null;
  let workspaceHeight = 0;
  let shellWidth = 0;
  let layoutEditMenuElement: HTMLDivElement | null = null;
  let layoutEditButtonGroupElement: HTMLDivElement | null = null;
  let featureDocsMenuElement: HTMLDivElement | null = null;
  let featureDocsButtonElement: HTMLButtonElement | null = null;
  let audioControlGroupElement: HTMLDivElement | null = null;
  let audioMenuElement: HTMLDivElement | null = null;
  let runtimeControlElement: HTMLDivElement | null = null;
  let runtimeMenuElement: HTMLDivElement | null = null;
  let themeControlElement: HTMLDivElement | null = null;
  let themeMenuElement: HTMLDivElement | null = null;
  let shortcutMenuElement: HTMLDivElement | null = null;
  let shortcutMenuButtonElement: HTMLButtonElement | null = null;
  let layoutEditOptionStatesByMode: Record<LayoutEditModeView, Record<LayoutEditOptionKey, boolean>> = {
    off: createLayoutEditOptionStates('off'),
    on: createLayoutEditOptionStates('on')
  };
  $: activeLayoutEditOptionStates = layoutEditOptionStatesByMode[layoutEditModeView];
  $: activeLayoutEditOptionStatuses = resolveLayoutEditOptionStatuses(activeLayoutEditOptionStates);
  $: contextualFeatureDocs = resolveContextualFeatureDocs(featureDocumentation?.features ?? [], {
    appContext,
    filter: featureDocsFilter
  });
  const emptyDesignSystemDiscoveryProjection: DesignSystemDiscoveryProjection = {
    entities: [],
    relations: [],
    totals: {
      entities: 0,
      widgets: 0,
      tools: 0,
      panels: 0,
      runtimeProjections: 0,
      undoBridges: 0
    }
  };
  let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection =
    emptyDesignSystemDiscoveryProjection;
  let observedThemeDocument: DesignSystemThemeDocument | null | undefined;
  function observeThemeDocument(document: DesignSystemThemeDocument | null): void {
    if (observedThemeDocument === document) return;
    observedThemeDocument = document;
    designSystemDiscoveryProjection = emptyDesignSystemDiscoveryProjection;
    if (activeShellRoute === 'docs') refreshDesignSystemDiscoveryProjection();
  }
  $: observeThemeDocument(themeDocument);

  /**
   * Design-system discovery is a documentation projection, not a live runtime
   * authority. Rebuild it only at an explicit documentation boundary so robot
   * observations and Tool-state publications cannot put this catalog traversal
   * in the global Svelte update loop.
   */
  function refreshDesignSystemDiscoveryProjection(): void {
    if (!themeDocument) {
      designSystemDiscoveryProjection = emptyDesignSystemDiscoveryProjection;
      return;
    }
    designSystemDiscoveryProjection = createDesignSystemEntityDiscovery({
      document: themeDocument,
      shellWidgetRegistry,
      toolRegistry: registry,
      workspace,
      runtimeSnapshot,
      runtimeProjectionSessionEntries,
      history: {
        canUndoAppHistory,
        canRedoAppHistory,
        canUndoCoreHistory,
        canRedoCoreHistory
      }
    });
  }
  $: activeDesignThemeMode = workspace.designSystemThemeSession?.mode ?? 'dark';
  $: spatialAmbientPhase = resolveSpatialAmbientPhase(runtimeSnapshot);
  $: activeThemeModeId = themeRuntime.resolveThemeModeId(activeDesignThemeMode);
  $: activeThemeFamily = themeRuntime.themeFamily;
  $: ThemeAmbientRuntime = themeRuntime.AmbientRuntime;
  $: ThemeFocusPlaneProvider = themeRuntime.FocusPlaneProvider;
  $: ThemeSurfaceFrame = themeRuntime.SurfaceFrame;
  $: shouldApplyGlobalThemeRuntime = !isSandboxedComponentAssemblyPreview && !suppressGlobalThemeRuntime;
  $: if (shouldApplyGlobalThemeRuntime) {
    themeRuntime.applyTheme(activeThemeModeId, activeDesignThemeMode);
  }
  $: if (shouldApplyGlobalThemeRuntime) {
    applyDesignSystemThemeRuntimeStyle(
      workspace.designSystemThemeSession?.draftValues ?? {},
      activeDesignThemeMode
    );
  }
  $: featureDocGroups = groupFeatureDocsByContext(contextualFeatureDocs);
  $: isShortcutFooterControlActive = hoveredFooterControl === 'shortcuts' || isShortcutMenuOpen;
  $: isAudioFooterControlActive = hoveredFooterControl === 'audio' || isAudioMenuOpen;
  $: isDocsFooterControlActive =
    showFooterDocsControl && (hoveredFooterControl === 'docs' || isFeatureDocsMenuOpen);
  $: isLayoutFooterControlActive =
    showFooterLayoutControl &&
    activeLayoutEditOptionStatuses.layoutMenuVisible?.enabled &&
    (hoveredFooterControl === 'layout' || isLayoutEditMenuOpen);
  $: isRuntimeFooterControlActive = hoveredFooterControl === 'runtime' || isRuntimeMenuOpen;
  $: isThemeFooterControlActive = hoveredFooterControl === 'theme' || isThemeMenuOpen;
  $: runtimeFooterStatus = runtimeSnapshot?.status ?? 'idle';
  $: runtimeFooterEventCount = runtimeSnapshot?.events.length ?? 0;
  $: runtimeFooterLabel = resolveRuntimeFooterLabel(runtimeFooterStatus);
  $: runtimeFooterTitle = resolveRuntimeFooterTitle(runtimeSnapshot);
  $: runtimeFooterEvents = runtimeSnapshot?.events.slice(0, 5) ?? [];
  $: runtimeFooterCapabilities = runtimeSnapshot?.workspace?.capabilities ?? [];
  $: runtimeFooterProjectionCatalog = runtimeSnapshot?.projectionCatalog ?? [];
  $: activeRuntimeProjectRoot =
    runtimeSnapshot?.workspace?.project?.root ||
    runtimeSnapshot?.workspace?.workspaceRoot ||
    runtimeProjectRootFallback ||
    '';
  $: activeRuntimeProjectLabel =
    runtimeSnapshot?.workspace?.project?.label ??
    activeRuntimeProjectRoot.split(/[\\/]/).filter(Boolean).pop() ??
    '';
  $: activeRuntimeProjectDisplayLabel = activeRuntimeProjectLabel || 'No runtime project';
  $: projectApplicationChoices = resolveProjectChoices(projectApplicationOptions, activeRuntimeProjectRoot);
  $: projectRepositoryChoices = resolveProjectChoices(projectRepositoryOptions, activeRuntimeProjectRoot);
  $: activeRuntimeProjectTypeLabel = resolveRuntimeProjectTypeLabel(
    activeRuntimeProjectRoot,
    projectApplicationChoices,
    projectRepositoryChoices,
    runtimeSnapshot?.workspace?.project ?? null
  );
  $: activeRuntimeProjectFaviconUrl = runtimeSnapshot?.workspace?.project?.faviconDataUrl ?? null;
  $: coreProjectLoadingKey = normalizeProjectRoot(coreProjectLoadPath);
  $: coreProjectLoadStatusTitle = coreProjectLoadError
    ? 'Project load blocked'
    : isCoreProjectLoading
      ? 'Loading project'
      : '';
  $: coreProjectLoadStatusDetail =
    coreProjectLoadError ??
    coreProjectLoadingLabel ??
    (isCoreProjectLoading && coreProjectLoadPath
      ? `Loading ${resolveProjectChoiceLabel(coreProjectLoadPath)}`
      : '');
  $: if (openProjectMenuOnStartup && !observedOpenProjectMenuOnStartup) {
    observedOpenProjectMenuOnStartup = true;
    void openCoreProjectLoad();
  }
  $: if (!openProjectMenuOnStartup && activeRuntimeProjectRoot) {
    observedOpenProjectMenuOnStartup = false;
  }
  $: activeRuntimeProjectComponentCount =
    runtimeSnapshot?.workspace?.project?.componentSourceCount ??
    runtimeSnapshot?.projectionCatalog.find((entry) => entry.projectionKind === 'component-assembly')?.sources
      .length ??
    0;
  $: runtimeProjectionActionStatus = resolveRuntimeProjectionActionStatus(
    runtimeProjectionActionState,
    runtimeSnapshot?.events ?? []
  );
  $: focusedPanel = focus.activePanelId ? findPanelInWorkspace(workspace, focus.activePanelId) : undefined;
  $: focusedToolInstance = focusedPanel?.toolInstanceId
    ? workspace.toolInstances[focusedPanel.toolInstanceId]
    : undefined;
  $: workspacePanelVisibilityEntries = createWorkspacePanelVisibilityEntries(workspace, $i18nT);
  $: selectedWorkspacePresetId = resolveWorkspacePresetControlId(workspace, workspacePresetDefinitions);
  $: activeWorkspacePreset = resolveActiveWorkspacePreset(
    workspacePresetDefinitions,
    selectedWorkspacePresetId
  );
  $: activeWorkspacePresetId = activeWorkspacePreset?.id ?? selectedWorkspacePresetId ?? '';
  $: activeWorkspacePresetLabel =
    (activeWorkspacePreset ? localizeWorkspacePresetLabel(activeWorkspacePreset) : null) ??
    (selectedWorkspacePresetId === 'snapshot-draft' ? 'Snapshot' : '');
  $: activeRouteToolId = resolveRouteToolIdFromHref(sandboxNavigationHref, shellRoute);
  $: activeShellToolId = focusedToolInstance?.toolId ?? activeRouteToolId;
  $: availableShellToolIds = resolveAvailableShellToolIds(workspace, activeShellToolId);
  $: availableShellToolIdList = [...availableShellToolIds];
  $: focusedToolEntry = focusedToolInstance ? (registry.get(focusedToolInstance.toolId) ?? null) : null;
  $: focusedRuntimeProjectionTarget = focusedToolInstance
    ? resolveRuntimeProjectionStateTarget(focusedToolInstance.state)
    : null;
  $: activeComponentAssemblySource =
    focusedToolInstance && focusedToolInstance.toolId !== componentAssemblyToolId
      ? (componentAssemblySources[focusedToolInstance.toolId] ?? null)
      : null;
  $: onOpenComponentAssembly;
  $: activeRuntimeProjectionTarget = resolveRuntimeProjectionTarget(
    activeComponentAssemblySource
      ? {
          projectionKind: 'component-assembly',
          sourceFile: activeComponentAssemblySource
        }
      : focusedRuntimeProjectionTarget
  );
  $: activeRuntimeProjectionSource = activeRuntimeProjectionTarget?.sourceFile ?? null;
  $: highlightedLayoutEditControllerKeys = hoveredLayoutEditOptionKey
    ? resolveLayoutEditOptionControllerKeys(hoveredLayoutEditOptionKey, activeLayoutEditOptionStatuses)
    : new Set<LayoutEditOptionKey>();
  $: appliedLayoutEditOptionStatuses = resolveLayoutEditOptionStatuses(
    layoutEditOptionStatesByMode[isLayoutEditingEnabled ? 'on' : 'off']
  );
  $: if (!activeLayoutEditOptionStatuses.layoutMenuVisible?.enabled && isLayoutEditMenuOpen) {
    closeLayoutEditMenu();
  }

  $: hoveredInteractionHint = $interactionHintStore;
  $: layoutHoverShortcuts =
    hoveredInteractionHint?.kind === 'resize'
      ? resizeShortcuts
      : hoveredInteractionHint?.kind === 'edge'
        ? edgeShortcuts
        : [];
  $: activeFooterContextShortcuts =
    layoutHoverShortcuts.length > 0 ? layoutHoverShortcuts : footerContextShortcuts;
  $: resolvedFooterContextShortcuts = activeFooterContextShortcuts.map((shortcut, index) =>
    resolveFooterShortcut(shortcut, 'context', index)
  );
  $: resolvedFooterGlobalShortcuts = footerGlobalShortcuts.map((shortcut, index) =>
    resolveFooterShortcut(shortcut, 'global', index)
  );
  $: visibleFooterShortcutCapacity = resolveVisibleFooterShortcutCapacity(shellWidth);
  $: visibleFooterGlobalShortcuts = pickVisibleFooterShortcuts(
    resolvedFooterGlobalShortcuts,
    Math.min(
      2,
      Math.max(0, visibleFooterShortcutCapacity - (resolvedFooterContextShortcuts.length > 0 ? 1 : 0))
    )
  );
  $: visibleFooterContextShortcuts = pickVisibleFooterShortcuts(
    resolvedFooterContextShortcuts,
    Math.max(0, visibleFooterShortcutCapacity - visibleFooterGlobalShortcuts.length)
  );
  $: allFooterShortcuts = [...resolvedFooterContextShortcuts, ...resolvedFooterGlobalShortcuts];
  $: footerShortcutOverflowCount =
    allFooterShortcuts.length - visibleFooterContextShortcuts.length - visibleFooterGlobalShortcuts.length;
  $: filteredFooterShortcuts = filterFooterShortcuts(allFooterShortcuts, {
    scope: shortcutScopeFilter,
    type: shortcutTypeFilter,
    query: shortcutQuery
  });
  $: footerShortcutGroups = groupFooterShortcutsByContext(filteredFooterShortcuts);

  function togglePalette(nextOpen = !isPaletteOpen): void {
    isPaletteOpen = nextOpen;
  }

  function setShellFeedback(tone: 'info' | 'error', message: string): void {
    shellFeedback = { tone, message };
  }

  function resolveInitialShellRoute(): ShellRoute {
    const sandboxHref = sandboxNavigation?.getHref() ?? sandboxNavigationHref;

    if (sandboxHref) {
      return resolveShellRouteFromHref(sandboxHref);
    }

    if (typeof window === 'undefined') {
      return 'workspace';
    }

    return resolveShellRouteFromHref(window.location.href);
  }

  function resolveShellRouteFromHref(href: string): ShellRoute {
    const customRoute = resolveShellRouteFromConfiguredPath(href);

    if (customRoute) {
      return customRoute;
    }

    return resolveShellRouteFromWorkbenchRoute(parseWorkbenchRoute(href));
  }

  function resolveShellRouteFromWorkbenchRoute(route: WorkbenchRoute): ShellRoute {
    if (route.kind === 'docs' || route.kind === 'lab') {
      return route.kind;
    }

    return 'workspace';
  }

  function resolveRouteToolIdFromHref(
    href: string | null,
    route: ShellRoute | null | undefined
  ): string | null {
    if (route && route !== 'workspace') {
      return null;
    }

    const currentHref = href ?? (typeof window !== 'undefined' ? window.location.href : null);

    if (!currentHref) {
      return null;
    }

    const workbenchRoute = parseWorkbenchRoute(currentHref);
    return workbenchRoute.kind === 'tool' ? workbenchRoute.toolId : null;
  }

  function createWorkbenchRouteFromShellRoute(route: ShellRoute): WorkbenchRoute {
    if (route === 'docs') {
      return { kind: 'docs' };
    }

    if (route === 'lab') {
      return { kind: 'lab' };
    }

    return { kind: 'workspace' };
  }

  function resolveShellRouteFromConfiguredPath(href: string): ShellRoute | null {
    const url = new URL(href, 'http://workbench.local');
    const path = normalizeShellViewPath(url.pathname);

    for (const view of activeShellViewDefinitions) {
      const route = view.route ?? 'workspace';
      const viewPath = view.path ? normalizeShellViewPath(view.path) : null;

      if (viewPath && path === viewPath) {
        return route;
      }
    }

    return null;
  }

  function resolveActiveShellViewDefinitions(): ShellView[] {
    return shellViewDefinitions ?? defaultShellViewDefinitions;
  }

  function createHrefForConfiguredShellRoute(currentHref: string, route: ShellRoute): string | null {
    const view = activeShellViewDefinitions.find((entry) => (entry.route ?? 'workspace') === route);

    if (!view?.path) {
      return null;
    }

    const url = new URL(currentHref, 'http://workbench.local');
    url.pathname = normalizeShellViewPath(view.path);

    for (const param of ['view', 'docsTab', 'page', 'tool']) {
      url.searchParams.delete(param);
    }

    return url.toString();
  }

  function normalizeShellViewPath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return normalizedPath.replace(/\/+$/, '') || '/';
  }

  function writeShellRouteToUrl(route: ShellRoute): void {
    const currentHref =
      sandboxNavigationHref ??
      (typeof window !== 'undefined' ? window.location.href : 'http://workbench.local/');
    const nextHref =
      createHrefForConfiguredShellRoute(currentHref, route) ??
      createWorkbenchRouteHref(currentHref, createWorkbenchRouteFromShellRoute(route));

    if (sandboxNavigation) {
      sandboxNavigation.push(nextHref, {
        eventType: 'routechange',
        targetLabel: route
      });
      return;
    }

    if (typeof window === 'undefined' || suppressGlobalNavigation || isSandboxedComponentAssemblyPreview) {
      return;
    }

    if (nextHref !== window.location.href) {
      window.history.pushState({ shellRoute: route }, '', nextHref);
    }
  }

  function setActiveShellRoute(route: ShellRoute): void {
    applyActiveShellRoute(route);
    pushShellRouteToSandbox(route);
    onShellRouteChange(route);
  }

  function applyActiveShellRoute(route: ShellRoute): void {
    activeShellRoute = route;
    activeShellViewId = resolveShellViewIdForRoute(route);
  }

  function pushShellRouteToSandbox(route: ShellRoute): void {
    if (!sandboxNavigation) {
      return;
    }

    const currentHref = sandboxNavigationHref ?? sandboxNavigation.getHref();
    const nextHref =
      createHrefForConfiguredShellRoute(currentHref, route) ??
      createWorkbenchRouteHref(currentHref, createWorkbenchRouteFromShellRoute(route));

    sandboxNavigation.push(nextHref, {
      eventType: 'routechange',
      targetLabel: route
    });
  }

  function applyShellRouteFromUrl(): void {
    const route = resolveInitialShellRoute();
    setActiveShellRoute(route);
  }

  function selectShellView(viewId: ShellView['id']): void {
    const view = activeShellViewDefinitions.find((entry) => entry.id === viewId);

    if (!view) {
      return;
    }

    setActiveShellRoute(view.route ?? 'workspace');
    writeShellRouteToUrl(activeShellRoute);
    closeRuntimeMenu();
    closeFeatureDocsMenu();
    closeShortcutMenu();
    closeThemeMenu();
  }

  let workspacePanelVisibilityProjectionCache: {
    signature: string;
    translate: WorkbenchTranslate;
    entries: WorkspacePanelVisibilityControl[];
  } | null = null;

  function createWorkspacePanelVisibilityEntries(
    workspaceInput: Workspace,
    translate: WorkbenchTranslate
  ): WorkspacePanelVisibilityControl[] {
    const panelInputs = listPanelsInWorkspace(workspaceInput).map((panel) => {
      const toolInstance = panel.toolInstanceId ? workspaceInput.toolInstances[panel.toolInstanceId] : null;
      const definition = toolInstance ? registry.getDefinition(toolInstance.toolId) : null;

      return { panel, toolInstance, definition };
    });
    const signature = JSON.stringify([
      workspaceInput.fullscreenPanelId ?? null,
      panelInputs.map(({ panel, toolInstance, definition }) => [
        panel.id,
        panel.title ?? null,
        panel.toolInstanceId ?? null,
        toolInstance?.id ?? null,
        toolInstance?.toolId ?? null,
        toolInstance?.panelTitleOverride ?? null,
        definition?.title ?? null,
        definition?.panelTitle ?? null,
        definition?.icon ?? null
      ])
    ]);

    if (
      workspacePanelVisibilityProjectionCache?.translate === translate &&
      workspacePanelVisibilityProjectionCache.signature === signature
    ) {
      return workspacePanelVisibilityProjectionCache.entries;
    }

    const toolPanels = panelInputs
      .map(({ panel, toolInstance, definition }) => {
        if (!toolInstance) {
          return null;
        }

        const localizedDefinition = definition
          ? resolveLocalizedToolDefinitionText(translate, definition)
          : null;
        const baseLabel =
          panel.title ||
          toolInstance.panelTitleOverride ||
          localizedDefinition?.panelTitle ||
          localizedDefinition?.title ||
          toolInstance.toolId;
        const title = localizedDefinition ? `${baseLabel} - ${localizedDefinition.title}` : baseLabel;

        return {
          id: panel.id,
          baseLabel,
          title,
          active: !workspaceInput.fullscreenPanelId || workspaceInput.fullscreenPanelId === panel.id,
          icon: definition?.icon ?? null,
          toolId: toolInstance.toolId,
          toolInstanceId: toolInstance.id
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const labelCounts = new Map<string, number>();
    const labelIndexes = new Map<string, number>();

    for (const panel of toolPanels) {
      labelCounts.set(panel.baseLabel, (labelCounts.get(panel.baseLabel) ?? 0) + 1);
    }

    const entries = toolPanels.map((panel) => {
      const count = labelCounts.get(panel.baseLabel) ?? 0;

      if (count <= 1) {
        return {
          id: panel.id,
          label: panel.baseLabel,
          title: panel.title,
          active: panel.active,
          icon: panel.icon,
          toolId: panel.toolId,
          toolInstanceId: panel.toolInstanceId
        };
      }

      const nextIndex = (labelIndexes.get(panel.baseLabel) ?? 0) + 1;
      labelIndexes.set(panel.baseLabel, nextIndex);

      return {
        id: panel.id,
        label: `${panel.baseLabel} ${nextIndex}`,
        title: panel.title,
        active: panel.active,
        icon: panel.icon,
        toolId: panel.toolId,
        toolInstanceId: panel.toolInstanceId
      };
    });

    workspacePanelVisibilityProjectionCache = { signature, translate, entries };
    return entries;
  }

  function createCurrentWorkspacePresetSnapshot(): unknown {
    const preset = resolveActiveWorkspacePreset(workspacePresetDefinitions, selectedWorkspacePresetId);
    const panelLayout = collectPanelLayoutSnapshotEntries(workspace);
    const toolDocks = collectToolDockSnapshotEntries(workspace, shellState);

    return {
      schema: 'workbench.workspace-preset.snapshot',
      version: 1,
      activePresetId: activeWorkspacePresetId,
      activePresetLabel: activeWorkspacePresetLabel,
      activePreset: preset,
      presets: workspacePresetDefinitions,
      summary: {
        panelCount: listPanelsInWorkspace(workspace).length,
        toolInstanceCount: Object.keys(workspace.toolInstances).length,
        activePanelId: focus.activePanelId,
        activeToolInstanceId: focus.activeToolInstanceId,
        fullscreenPanelId: workspace.fullscreenPanelId ?? null,
        rootRegions: cloneJsonValue(shellState.regions)
      },
      panels: workspacePanelVisibilityEntries,
      layout: {
        windows: workspace.windows.map((windowItem) => ({
          id: windowItem.id,
          title: windowItem.title,
          root: summarizeLayoutNode(windowItem.root)
        })),
        panelLayout,
        toolDocks,
        shellRegions: cloneJsonValue(shellState.regions)
      },
      seed: {
        workspaceSession: cloneJsonValue({
          workspace,
          focus
        }),
        shellState: cloneJsonValue(shellState)
      },
      copiedAt: new Date().toISOString()
    };
  }

  function createBlankWorkspacePresetSnapshotSeed(): void {
    if (onRequestWorkspacePresetAuthoring) {
      onRequestWorkspacePresetAuthoring();
      return;
    }

    const panel = createPanel('New preset');
    const workspaceSession = createWorkspaceSessionState(
      createWorkspaceShell(createWorkspaceWindow(createStack([panel]))),
      { activePanelId: panel.id }
    );

    onApplyWorkspaceSession?.(workspaceSession, 'both');
    setShellFeedback('info', 'Blank preset snapshot workspace loaded.');
  }

  function collectPanelLayoutSnapshotEntries(workspaceInput: Workspace) {
    return workspaceInput.windows.flatMap((windowItem) =>
      collectPanelLayoutEntriesFromNode(windowItem.root, {
        windowId: windowItem.id,
        splitPath: []
      })
    );
  }

  function collectPanelLayoutEntriesFromNode(
    node: LayoutNode,
    context: {
      windowId: string;
      splitPath: Array<{
        splitId: string;
        orientation: 'horizontal' | 'vertical';
        branchIndex: number;
        sizes: [number, number];
      }>;
    }
  ): Array<{
    panelId: string;
    panelTitle: string;
    toolInstanceId: string | null;
    windowId: string;
    stackId: string;
    stackActiveChildId: string;
    stackHeaderVisible: boolean;
    splitPath: typeof context.splitPath;
  }> {
    if (node.kind === 'stack') {
      return node.children.map((panel) => ({
        panelId: panel.id,
        panelTitle: panel.title,
        toolInstanceId: panel.toolInstanceId,
        windowId: context.windowId,
        stackId: node.id,
        stackActiveChildId: node.activeChildId,
        stackHeaderVisible: node.headerVisible !== false,
        splitPath: context.splitPath
      }));
    }

    return node.children.flatMap((child, branchIndex) =>
      collectPanelLayoutEntriesFromNode(child, {
        windowId: context.windowId,
        splitPath: [
          ...context.splitPath,
          {
            splitId: node.id,
            orientation: node.orientation,
            branchIndex,
            sizes: [...node.sizes] as [number, number]
          }
        ]
      })
    );
  }

  function summarizeLayoutNode(node: LayoutNode): unknown {
    if (node.kind === 'stack') {
      return {
        id: node.id,
        kind: node.kind,
        activeChildId: node.activeChildId,
        headerVisible: node.headerVisible !== false,
        panels: node.children.map((panel) => ({
          id: panel.id,
          title: panel.title,
          toolInstanceId: panel.toolInstanceId,
          showFullscreenToggle: panel.showFullscreenToggle !== false
        }))
      };
    }

    return {
      id: node.id,
      kind: node.kind,
      orientation: node.orientation,
      sizes: [...node.sizes],
      children: node.children.map(summarizeLayoutNode)
    };
  }

  function collectToolDockSnapshotEntries(workspaceInput: Workspace, shellStateInput: ShellState) {
    const panelsByToolInstanceId = new Map<string, string>();

    for (const panel of listPanelsInWorkspace(workspaceInput)) {
      if (panel.toolInstanceId) {
        panelsByToolInstanceId.set(panel.toolInstanceId, panel.id);
      }
    }

    return Object.values(workspaceInput.toolInstances).flatMap((toolInstance) => {
      const definition = registry.getDefinition(toolInstance.toolId);
      const docks = definition?.shell?.widgetDocks ?? [];

      return docks.map((dock) => {
        const rootLocation = dock.rootWidgetId
          ? resolveShellWidgetRootLocation(shellStateInput, dock.rootWidgetId)
          : null;

        return {
          panelId: panelsByToolInstanceId.get(toolInstance.id) ?? null,
          toolInstanceId: toolInstance.id,
          toolId: toolInstance.toolId,
          commandId: dock.commandId,
          dockId: dock.dockId,
          title: dock.title,
          defaultRegionId: dock.defaultRegionId,
          rootWidgetId: dock.rootWidgetId ?? null,
          location: rootLocation ? 'root' : 'internal',
          rootLocation,
          internalVisible: readWorkbenchToolDockVisibility(toolInstance.state, dock)
        };
      });
    });
  }

  function resolveShellWidgetRootLocation(shellStateInput: ShellState, widgetId: string) {
    const regionIds: ShellRegionId[] = ['left', 'right', 'bottom'];

    for (const regionId of regionIds) {
      const region = shellStateInput.regions[regionId];

      if (region.widgetIds.includes(widgetId)) {
        return {
          regionId,
          isVisible: region.isVisible && isShellRegionWidgetVisible(region, widgetId),
          isOpen: region.isOpen,
          activeWidgetId: region.activeWidgetId,
          presentation: resolveShellRegionPresentation(region),
          size: region.size
        };
      }
    }

    return null;
  }

  function cloneJsonValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function toggleWorkspacePanelVisibility(panelId: string): void {
    const nextFullscreenPanelId = workspace.fullscreenPanelId === panelId ? null : panelId;

    if (nextFullscreenPanelId) {
      dispatchCommand({ type: 'focus-panel', panelId: nextFullscreenPanelId });
    }

    onSetFullscreenPanel(nextFullscreenPanelId);
  }

  function selectWorkspacePreset(presetId: string): void {
    onSelectWorkspacePreset(presetId);
    setShellFeedback('info', `Workbench preset "${presetId}" loaded.`);
  }

  function resetWorkspacePreset(presetId: string): void {
    const resolvedPreset = resolveActiveWorkspacePreset(workspacePresetDefinitions, presetId);
    const resolvedPresetId = resolvedPreset?.id ?? presetId;

    onSelectWorkspacePreset(resolvedPresetId);
    setShellFeedback('info', `Workbench preset "${resolvedPresetId}" reset to default.`);
  }

  function resolveActiveWorkspacePreset(
    presets: WorkspacePresetControl[],
    presetId: string | null
  ): WorkspacePresetControl | null {
    if (!presetId) {
      return presets[0] ?? null;
    }

    return presets.find((preset) => preset.id === presetId) ?? null;
  }

  function localizeWorkspacePresetLabel(preset: WorkspacePresetControl): string {
    return preset.labelKey ? $i18nT(preset.labelKey, { default: preset.label }) : preset.label;
  }

  function resolveWorkspacePresetControlId(
    workspaceInput: Workspace,
    presets: WorkspacePresetControl[]
  ): string | null {
    const provenance = workspaceInput.presetProvenance;

    if (!provenance) {
      return null;
    }

    const versionedId = provenance.version ? `${provenance.id}@${provenance.version}` : provenance.id;
    const controlId = presets.some((preset) => preset.id === versionedId)
      ? versionedId
      : presets.some((preset) => preset.id === provenance.id)
        ? provenance.id
        : versionedId;

    return controlId;
  }

  function requestFloatingSurfaceClose(reason: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('workbench:close-floating-surfaces', {
        detail: { reason }
      })
    );
  }

  function toggleShellRegion(regionId: ShellRegionId): void {
    const region = shellState.regions[regionId];

    if (!region) {
      return;
    }

    if (!canToggleShellRegion(regionId)) {
      return;
    }

    requestFloatingSurfaceClose('shell-region-toggle');

    if (region.isVisible) {
      dispatchShellLayoutIntents([
        createShellRegionLayoutIntent(regionId, 'toggle-visibility'),
        ...(region.isOpen ? [createShellRegionLayoutIntent(regionId, 'toggle-open')] : [])
      ]);
      return;
    }

    if (isLayoutEditingEnabled && !hasConnectedShellRegionWidget(regionId, availableShellToolIds)) {
      dispatchShellLayoutIntents([
        createShellRegionLayoutIntent(regionId, 'toggle-visibility'),
        ...(region.isOpen ? [] : [createShellRegionLayoutIntent(regionId, 'toggle-open')])
      ]);
      return;
    }

    if (region.widgetIds.length === 0) {
      return;
    }

    dispatchShellLayoutIntents([
      createShellRegionLayoutIntent(regionId, 'toggle-visibility'),
      createShellRegionLayoutIntent(regionId, 'activate', {
        widgetId: region.widgetIds[0]
      })
    ]);
  }

  function canToggleShellRegion(regionId: ShellRegionId): boolean {
    return hasConnectedShellRegionWidget(regionId, availableShellToolIds) || isLayoutEditingEnabled;
  }

  function hasConnectedShellRegionWidget(regionId: ShellRegionId, availableToolIds: Set<string>): boolean {
    const region = shellState.regions[regionId];

    if (!region) {
      return false;
    }

    return region.widgetIds.some((widgetId) => {
      if (isPlaceholderShellWidget(widgetId)) {
        return false;
      }

      const definition = shellWidgetRegistry.getDefinition(widgetId);
      return definition ? isShellWidgetAvailableForContext(definition, availableToolIds) : false;
    });
  }

  function isPlaceholderShellWidget(widgetId: string): boolean {
    const definition = shellWidgetRegistry.getDefinition(widgetId);

    return widgetId.endsWith('.empty') || definition?.title.toLowerCase().endsWith(' region') === true;
  }

  function isShellWidgetAvailableForContext(
    definition: ShellWidgetDefinition,
    availableToolIds: Set<string>
  ): boolean {
    return (
      definition.scope !== 'contextual' ||
      !definition.contextToolIds?.length ||
      definition.contextToolIds.some((toolId) => availableToolIds.has(toolId))
    );
  }

  function resolveAvailableShellToolIds(
    nextWorkspace: Workspace,
    preferredToolId: string | null
  ): Set<string> {
    const toolIds = new Set<string>();

    if (preferredToolId) {
      toolIds.add(preferredToolId);
    }

    for (const toolInstance of Object.values(nextWorkspace.toolInstances)) {
      toolIds.add(toolInstance.toolId);
    }

    return toolIds;
  }

  function handleI18nLocaleChange(event: Event): void {
    applyI18nLocale((event.currentTarget as HTMLSelectElement).value);
  }

  function handleReadingLevelDefaultChange(event: Event): void {
    const nextReadingLevel = (event.currentTarget as HTMLSelectElement).value as WorkbenchReadingLevel;

    if (nextReadingLevel !== 'casual' && nextReadingLevel !== 'advanced' && nextReadingLevel !== 'expert') {
      return;
    }

    activeReadingLevelDefault = nextReadingLevel;
    writeWorkbenchReadingLevelPreference(nextReadingLevel, readingLevelPreferenceStorageKey);
  }

  function applyI18nLocale(locale: string | null | undefined): void {
    const nextLocale = normalizeWorkbenchLocale(locale, supportedI18nLocales);

    if (!nextLocale) {
      return;
    }

    void activateI18nLocale(nextLocale, true);
  }

  async function activateI18nLocale(nextLocale: WorkbenchLocale, notifyConsumer: boolean): Promise<void> {
    const revision = ++i18nLocaleLoadRevision;
    i18nProjectionReady = false;
    let resolvedLocale = nextLocale;
    let shellBundles: TranslationBundle[];
    let consumerBundles: TranslationBundle[];

    try {
      [shellBundles, consumerBundles] = await Promise.all([
        loadWorkbenchUiLocaleBundles(nextLocale),
        loadI18nLocaleBundles(nextLocale)
      ]);
    } catch {
      resolvedLocale = 'en';
      [shellBundles, consumerBundles] = await Promise.all([
        loadWorkbenchUiLocaleBundles('en'),
        loadI18nLocaleBundles('en')
      ]);
    }

    if (revision !== i18nLocaleLoadRevision) {
      return;
    }

    workbenchI18n.registerBundles([...shellBundles, ...consumerBundles]);
    activeI18nLocale = resolvedLocale;
    i18nProjectionReady = true;
    writeWorkbenchSessionLocale(resolvedLocale, i18nLocaleSessionStorageKey);

    if (notifyConsumer) {
      await onI18nLocaleChange(resolvedLocale);
    }
  }

  function setDesignThemeMode(mode: DesignSystemThemeMode): void {
    const currentSession = workspace.designSystemThemeSession ?? null;

    if ((currentSession?.mode ?? 'dark') === mode) {
      return;
    }

    onSetDesignSystemThemeSession(
      createDesignSystemThemeSession({
        ...currentSession,
        mode,
        draftValues: currentSession?.draftValues ?? {},
        draftPast: currentSession?.draftPast ?? [],
        draftFuture: currentSession?.draftFuture ?? []
      })
    );
  }

  function toggleDesignThemeMode(): void {
    setDesignThemeMode(activeDesignThemeMode === 'dark' ? 'light' : 'dark');
  }

  function resizeShellRegion(regionId: ShellRegionId, delta: number): void {
    const region = shellState.regions[regionId];

    if (!region) {
      return;
    }

    const signedDelta = regionId === 'left' ? delta : -delta;
    const baseSize =
      shellRegionResizeSession?.regionId === regionId ? shellRegionResizeSession.requestedSize : region.size;
    const nextSize = baseSize + signedDelta;

    if (shellRegionResizeSession?.regionId === regionId) {
      shellRegionResizeSession = {
        ...shellRegionResizeSession,
        requestedSize: nextSize
      };
    }

    dispatchShellLayoutIntents([
      createShellRegionBoundaryLayoutIntent(regionId, 'resize', {
        size: nextSize
      })
    ]);
  }

  function activateShellWidgetFromLayout(regionId: ShellRegionId, widgetId: string): void {
    const region = shellState.regions[regionId];

    if (!region) {
      return;
    }

    if (region.activeWidgetId === widgetId && region.isOpen) {
      dispatchShellLayoutIntents([createShellRegionLayoutIntent(regionId, 'toggle-open')]);
      return;
    }

    dispatchShellLayoutIntents([
      createShellRegionLayoutIntent(regionId, 'activate', {
        widgetId
      })
    ]);
  }

  function setShellRegionWidgetVisibilityFromLayout(
    regionId: ShellRegionId,
    widgetId: string,
    isVisible: boolean
  ): void {
    const region = shellState.regions[regionId];

    if (!region || !region.widgetIds.includes(widgetId)) {
      return;
    }

    requestFloatingSurfaceClose('shell-region-widget-visibility');

    onSetShellRegionWidgetVisible(regionId, widgetId, isVisible);
  }

  function setToolInternalDockVisibilityFromLayout(request: ToolInternalDockVisibilityRequest): void {
    if (!onUpdateToolState) {
      return;
    }

    const toolInstance = workspace.toolInstances[request.toolInstanceId];

    if (!toolInstance) {
      return;
    }

    requestFloatingSurfaceClose('tool-internal-dock-visibility');

    onUpdateToolState(
      request.toolInstanceId,
      patchWorkbenchToolDockVisibilityState(toolInstance.state, {
        dockId: request.dockId,
        legacyVisibleKey: request.legacyVisibleKey,
        isVisible: request.isVisible
      })
    );
  }

  function setShellWidgetLocationFromLayout(request: ShellWidgetLocationRequest): void {
    const { regionId, widgetId, location } = request;

    requestFloatingSurfaceClose('shell-widget-location');

    if (location === 'root') {
      removeShellWidgetFromRootRegions(widgetId, regionId);
      onAddShellWidgetToRegion(regionId, widgetId);
      setToolDockVisibilityForShellWidgetLocation(request, false);
      return;
    }

    removeShellWidgetFromRootRegions(widgetId);
    setToolDockVisibilityForShellWidgetLocation(request, true);
  }

  function addShellWidgetToRegionFromLayout(
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ): void {
    onAddShellWidgetToRegion(regionId, widgetId, placement);
    setKnownToolDockVisibilityForRootWidget(widgetId, false);
  }

  function moveShellWidgetToRegionFromLayout(
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ): void {
    onMoveShellWidgetToRegion(regionId, widgetId, placement);
    setKnownToolDockVisibilityForRootWidget(widgetId, false);
  }

  function setToolDockVisibilityForShellWidgetLocation(
    request: ShellWidgetLocationRequest,
    isVisible: boolean
  ): void {
    if (!request.toolInstanceId || !request.dockId || !request.commandId) {
      setKnownToolDockVisibilityForRootWidget(request.widgetId, isVisible);
      return;
    }

    setToolInternalDockVisibilityFromLayout({
      panelId: request.panelId ?? '',
      toolInstanceId: request.toolInstanceId,
      commandId: request.commandId,
      dockId: request.dockId,
      legacyVisibleKey: request.legacyVisibleKey,
      isVisible
    });
  }

  function setKnownToolDockVisibilityForRootWidget(widgetId: string, isVisible: boolean): void {
    if (!onUpdateToolState) {
      return;
    }

    const activeToolInstanceId = focus.activeToolInstanceId;
    const candidateEntries = Object.values(workspace.toolInstances)
      .map((toolInstance) => {
        const definition = registry.getDefinition(toolInstance.toolId);
        const dock = definition?.shell?.widgetDocks?.find((candidate) => candidate.rootWidgetId === widgetId);

        return dock ? { toolInstance, dock } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((left, right) => {
        if (left.toolInstance.id === activeToolInstanceId) {
          return -1;
        }

        if (right.toolInstance.id === activeToolInstanceId) {
          return 1;
        }

        return left.toolInstance.id.localeCompare(right.toolInstance.id);
      });

    const targetEntries = isVisible ? candidateEntries.slice(0, 1) : candidateEntries;

    if (targetEntries.length === 0) {
      return;
    }

    for (const { toolInstance, dock } of targetEntries) {
      onUpdateToolState(
        toolInstance.id,
        patchWorkbenchToolDockVisibilityState(toolInstance.state, {
          dockId: dock.dockId,
          legacyVisibleKey: dock.legacyVisibleKey,
          isVisible
        })
      );
    }
  }

  function removeShellWidgetFromRootRegions(
    widgetId: string,
    exceptRegionId: ShellRegionId | null = null
  ): void {
    const regionIds: ShellRegionId[] = ['left', 'right', 'bottom'];

    for (const currentRegionId of regionIds) {
      if (currentRegionId === exceptRegionId) {
        continue;
      }

      if (shellState.regions[currentRegionId]?.widgetIds.includes(widgetId)) {
        onRemoveShellWidgetFromRegion(currentRegionId, widgetId);
      }
    }
  }

  function isShellRegionWidgetVisibilityRequestDetail(
    value: unknown
  ): value is ShellRegionWidgetVisibilityRequest {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      isShellRegionId(record.regionId) &&
      typeof record.widgetId === 'string' &&
      record.widgetId.trim().length > 0 &&
      typeof record.isVisible === 'boolean'
    );
  }

  function isToolInternalDockVisibilityRequestDetail(
    value: unknown
  ): value is ToolInternalDockVisibilityRequest {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      typeof record.panelId === 'string' &&
      typeof record.toolInstanceId === 'string' &&
      typeof record.commandId === 'string' &&
      typeof record.dockId === 'string' &&
      record.dockId.trim().length > 0 &&
      (typeof record.legacyVisibleKey === 'undefined' || typeof record.legacyVisibleKey === 'string') &&
      typeof record.isVisible === 'boolean'
    );
  }

  function isShellWidgetLocationRequestDetail(value: unknown): value is ShellWidgetLocationRequest {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      isShellRegionId(record.regionId) &&
      typeof record.widgetId === 'string' &&
      record.widgetId.trim().length > 0 &&
      (record.location === 'root' || record.location === 'internal') &&
      (typeof record.panelId === 'undefined' || typeof record.panelId === 'string') &&
      (typeof record.toolInstanceId === 'undefined' || typeof record.toolInstanceId === 'string') &&
      (typeof record.commandId === 'undefined' || typeof record.commandId === 'string') &&
      (typeof record.dockId === 'undefined' || typeof record.dockId === 'string') &&
      (typeof record.legacyVisibleKey === 'undefined' || typeof record.legacyVisibleKey === 'string')
    );
  }

  function isShellRegionId(value: unknown): value is ShellRegionId {
    return value === 'left' || value === 'right' || value === 'bottom';
  }

  function setShellRegionOpenFromLayout(regionId: ShellRegionId, isOpen: boolean): void {
    const region = shellState.regions[regionId];

    if (!region || region.isOpen === isOpen) {
      return;
    }

    dispatchShellLayoutIntents([createShellRegionLayoutIntent(regionId, 'toggle-open')]);
  }

  function hideLayoutOnlyShellRegions(): void {
    const intents: LayoutUserActionIntent[] = [];
    const regionIds: ShellRegionId[] = ['left', 'right', 'bottom'];

    for (const regionId of regionIds) {
      const region = shellState.regions[regionId];

      if (!region || hasConnectedShellRegionWidget(regionId, availableShellToolIds)) {
        continue;
      }

      if (region.isOpen) {
        intents.push(createShellRegionLayoutIntent(regionId, 'toggle-open'));
      }

      if (region.isVisible) {
        intents.push(createShellRegionLayoutIntent(regionId, 'toggle-visibility'));
      }
    }

    if (intents.length > 0) {
      dispatchShellLayoutIntents(intents);
    }
  }

  function dispatchShellLayoutIntents(intents: LayoutUserActionIntent[]): void {
    let nextShellState = shellState;

    for (const intent of intents) {
      const result = dispatchLayoutSurfaceIntent({
        state: {
          shellState: nextShellState
        },
        projection: shellLayoutSurfaceProjection,
        intent
      });

      if (!result.handled || !result.state.shellState) {
        continue;
      }

      nextShellState = result.state.shellState;
    }

    applyShellStatePatch(nextShellState);
  }

  function applyShellStatePatch(nextShellState: ShellState): void {
    const regionIds: ShellRegionId[] = ['left', 'right', 'bottom'];

    for (const regionId of regionIds) {
      const currentRegion = shellState.regions[regionId];
      const nextRegion = nextShellState.regions[regionId];

      if (!currentRegion || !nextRegion) {
        continue;
      }

      if (currentRegion.isVisible !== nextRegion.isVisible) {
        onSetShellRegionVisible(regionId, nextRegion.isVisible);
      }

      if (currentRegion.size !== nextRegion.size) {
        onSetShellRegionSize(regionId, nextRegion.size);
      }

      if (nextRegion.activeWidgetId && currentRegion.activeWidgetId !== nextRegion.activeWidgetId) {
        onActivateShellWidget(regionId, nextRegion.activeWidgetId);
      } else if (currentRegion.isOpen !== nextRegion.isOpen) {
        onSetShellRegionOpen(regionId, nextRegion.isOpen);
      }
    }
  }

  function createShellRegionLayoutIntent(
    regionId: ShellRegionId,
    kind: LayoutUserActionIntent['kind'],
    metadata?: JsonObject
  ): LayoutUserActionIntent {
    return {
      kind,
      surfaceId: shellLayoutSurfaceProjection.id,
      targetId: `${shellLayoutSurfaceProjection.id}:region:${regionId}`,
      ...(metadata ? { metadata } : {})
    };
  }

  function createShellRegionBoundaryLayoutIntent(
    regionId: ShellRegionId,
    kind: LayoutUserActionIntent['kind'],
    metadata?: JsonObject
  ): LayoutUserActionIntent {
    return {
      kind,
      surfaceId: shellLayoutSurfaceProjection.id,
      targetId: `${shellLayoutSurfaceProjection.id}:boundary:${regionId}`,
      ...(metadata ? { metadata } : {})
    };
  }

  function handleShellRegionResizeDragState(
    regionId: ShellRegionId,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ): void {
    if (event.detail.phase === 'start') {
      const region = shellState.regions[regionId];
      shellRegionResizeSession = region
        ? {
            regionId,
            startSize: region.size,
            requestedSize: region.size
          }
        : null;
      shellRegionResizeGestureActive = true;
      onBeginCoreHistoryTransaction();
      return;
    }

    if (event.detail.phase === 'cancel') {
      shellRegionResizeSession = null;
      shellRegionResizeGestureActive = false;
      onCancelCoreHistoryTransaction();
      return;
    }

    if (event.detail.phase === 'end') {
      const resizeSession = shellRegionResizeSession?.regionId === regionId ? shellRegionResizeSession : null;
      const shouldCloseRegion =
        Boolean(shellState.regions[regionId]?.isOpen) &&
        resizeSession !== null &&
        shouldCloseShellRegionFromResize(regionId, resizeSession.requestedSize);

      if (shouldCloseRegion && resizeSession) {
        dispatchShellLayoutIntents([
          createShellRegionBoundaryLayoutIntent(regionId, 'resize', {
            size: resizeSession.startSize
          }),
          createShellRegionLayoutIntent(regionId, 'toggle-visibility'),
          createShellRegionLayoutIntent(regionId, 'toggle-open')
        ]);
      }

      shellRegionResizeSession = null;
      shellRegionResizeGestureActive = false;
      onCommitCoreHistoryTransaction();
    }
  }

  function resolveShellRegionResizeHint(
    resizeSession: typeof shellRegionResizeSession
  ): ShellRegionResizeHint | null {
    if (!resizeSession || !shellState.regions[resizeSession.regionId]?.isOpen) {
      return null;
    }

    return {
      regionId: resizeSession.regionId,
      active: shouldCloseShellRegionFromResize(resizeSession.regionId, resizeSession.requestedSize),
      near: Math.round(resizeSession.requestedSize) <= MIN_SHELL_REGION_SIZES[resizeSession.regionId],
      thresholdPx: SHELL_REGION_RESIZE_CLOSE_OFFSET_PX
    };
  }

  function isHistoryShortcutLocked(): boolean {
    return layoutInteraction.mode !== 'idle' || shellRegionResizeGestureActive;
  }

  function canHandleHistoryShortcut(event: KeyboardEvent): boolean {
    const hasPrimaryModifier = event.ctrlKey || event.metaKey;

    if (!hasPrimaryModifier || event.shiftKey) {
      return false;
    }

    const normalizedKey = event.key.toLowerCase();
    return normalizedKey === 'z' || normalizedKey === 'y';
  }

  function handleHistoryShortcut(event: KeyboardEvent): boolean {
    if (!canHandleHistoryShortcut(event)) {
      return false;
    }

    const normalizedKey = event.key.toLowerCase();

    if (event.altKey) {
      if (normalizedKey === 'z') {
        event.preventDefault();
        if (canUndoCoreHistory) {
          onUndoCoreHistory();
        }
        return true;
      }

      if (normalizedKey === 'y') {
        event.preventDefault();
        if (canRedoCoreHistory) {
          onRedoCoreHistory();
        }
        return true;
      }

      return false;
    }

    if (normalizedKey === 'z') {
      event.preventDefault();
      if (canUndoAppHistory) {
        onUndoAppHistory();
      }
      return true;
    }

    if (normalizedKey === 'y') {
      event.preventDefault();
      if (canRedoAppHistory) {
        onRedoAppHistory();
      }
      return true;
    }

    return false;
  }

  function runShellAction(action: ShellAction): void {
    switch (action.type) {
      case 'application-command':
        togglePalette(false);
        void invokeApplicationCommand(applicationCommands, action.owner, action.id)
          .catch(error => setShellFeedback('error', error instanceof Error ? error.message : String(error)));
        return;
      case 'toggle-command-palette':
        togglePalette();
        return;
      case 'show-layout-menu':
        setLayoutEditOptionStateForModes('layoutMenuVisible', true);
        isLayoutEditMenuOpen = true;
        hoveredFooterControl = 'layout';
        togglePalette(false);
        return;
      case 'workspace-command':
        dispatchCommand(action.command);
        togglePalette(false);
        return;
      case 'reset-workspace':
        onResetWorkspace();
        setShellFeedback('info', 'Workspace reset to the default state.');
        togglePalette(false);
        return;
      case 'load-workspace-preset':
        onLoadWorkspacePreset(action.presetId);
        setShellFeedback('info', 'Default workspace preset loaded.');
        togglePalette(false);
        return;
      case 'export-workspace-snapshot':
        downloadWorkspaceSnapshot(onExportWorkspaceSnapshot());
        setShellFeedback('info', 'Workspace snapshot exported as JSON.');
        togglePalette(false);
        return;
      case 'import-workspace-snapshot':
        importInput?.click();
        togglePalette(false);
        return;
    }
  }

  function handlePaletteSelect(event: CustomEvent<{ item: CommandPaletteItem }>): void {
    const current = resolveCurrentPaletteSelection(event.detail.item, {
      registry, workspace, focus, applicationCommands, readingLevelDefault: activeReadingLevelDefault, translate: $i18nT
    });
    if (current) runShellAction(current.action);
  }

  async function handleImportChange(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const snapshot = await file.text();
      const result = onImportWorkspaceSnapshot(snapshot);

      if (result.ok) {
        setShellFeedback('info', 'Workspace snapshot imported successfully.');
      } else {
        setShellFeedback('error', result.error ?? 'Workspace snapshot import failed.');
      }
    } finally {
      target.value = '';
    }
  }

  function downloadWorkspaceSnapshot(snapshot: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    const blob = new Blob([snapshot], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = 'workspace-snapshot.json';
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  function toggleLayoutEditing(): void {
    requestFloatingSurfaceClose('layout-editing-toggle');

    if (isRuntimeMenuOpen) {
      closeRuntimeMenu();
    }

    if (isAudioMenuOpen) {
      closeAudioMenu();
    }

    if (isFeatureDocsMenuOpen) {
      closeFeatureDocsMenu();
    }

    if (isLayoutEditMenuOpen) {
      closeLayoutEditMenu();
    }

    const nextLayoutEditingEnabled = !isLayoutEditingEnabled;

    isLayoutEditingEnabled = nextLayoutEditingEnabled;
    layoutEditModeView = nextLayoutEditingEnabled ? 'on' : 'off';

    if (!nextLayoutEditingEnabled) {
      hideLayoutOnlyShellRegions();
    }
  }

  function toggleLayoutEditMenu(): void {
    if (!isLayoutEditMenuOpen) {
      closeRuntimeMenu();
      closeAudioMenu();
      closeShortcutMenu();
      closeFeatureDocsMenu();
    }

    isLayoutEditMenuOpen = !isLayoutEditMenuOpen;
  }

  function closeLayoutEditMenu(): void {
    isLayoutEditMenuOpen = false;
  }

  function toggleShortcutMenu(): void {
    if (!isShortcutMenuOpen) {
      closeRuntimeMenu();
      closeAudioMenu();
      closeLayoutEditMenu();
      closeFeatureDocsMenu();
    }

    isShortcutMenuOpen = !isShortcutMenuOpen;
  }

  function closeShortcutMenu(): void {
    isShortcutMenuOpen = false;
  }

  function toggleFeatureDocsMenu(): void {
    if (!isFeatureDocsMenuOpen) {
      refreshDesignSystemDiscoveryProjection();
      closeRuntimeMenu();
      closeAudioMenu();
      closeShortcutMenu();
      closeLayoutEditMenu();
    }

    isFeatureDocsMenuOpen = !isFeatureDocsMenuOpen;
  }

  function closeFeatureDocsMenu(): void {
    isFeatureDocsMenuOpen = false;
  }

  function toggleAudioMenu(): void {
    if (!isAudioMenuOpen) {
      closeRuntimeMenu();
      closeShortcutMenu();
      closeFeatureDocsMenu();
      closeLayoutEditMenu();
      isAudioMediaBlocksOpen = false;
    }

    isAudioMenuOpen = !isAudioMenuOpen;
  }

  function closeAudioMenu(): void {
    isAudioMenuOpen = false;
    isAudioMediaBlocksOpen = false;
  }

  function toggleAudioMediaBlocks(): void {
    isAudioMediaBlocksOpen = !isAudioMediaBlocksOpen;
  }

  function toggleRuntimeMenu(): void {
    if (!isRuntimeMenuOpen) {
      closeAudioMenu();
      closeFeatureDocsMenu();
      closeLayoutEditMenu();
      closeShortcutMenu();
    }

    isRuntimeMenuOpen = !isRuntimeMenuOpen;
  }

  function closeRuntimeMenu(): void {
    isRuntimeMenuOpen = false;
  }

  function toggleCoreSideMenu(force?: boolean): void {
    if (!showLaunchGateReturn) {
      isCoreSideMenuOpen = false;
      return;
    }

    const nextOpen = force ?? !isCoreSideMenuOpen;

    if (!nextOpen && isCoreProjectLoading) {
      return;
    }

    isCoreSideMenuOpen = nextOpen;

    if (!nextOpen) {
      isCoreProjectManualLoadOpen = false;
      coreProjectLoadError = null;
    }

    coreProjectLoadError = null;
  }

  function confirmReturnToLaunchGate(): void {
    if (!showLaunchGateReturn) {
      toggleCoreSideMenu(false);
      return;
    }

    toggleCoreSideMenu(false);
    onReturnToLaunchGate();
  }

  async function openCoreProjectLoad(expandManualLoad = false): Promise<void> {
    isCoreSideMenuOpen = true;
    coreProjectLoadError = null;
    isCoreProjectManualLoadOpen = expandManualLoad;
    coreProjectLoadPath =
      activeRuntimeProjectRoot ||
      coreProjectLoadPath ||
      projectApplicationChoices[0]?.root ||
      projectRepositoryChoices[0]?.root ||
      '/mnt/e/Dev/project';

    if (expandManualLoad) {
      await tick();
      coreProjectLoadInput?.focus();
      coreProjectLoadInput?.select();
    }
  }

  async function submitCoreProjectLoad(): Promise<void> {
    await loadCoreProjectRoot(coreProjectLoadPath.trim());
  }

  async function loadCoreProjectRoot(projectRoot: string): Promise<void> {
    const normalizedProjectRoot = projectRoot.trim();

    if (!projectRoot) {
      coreProjectLoadError = 'Project root is required.';
      coreProjectLoadPath = normalizedProjectRoot;
      return;
    }

    if (!isAbsoluteProjectPath(normalizedProjectRoot)) {
      coreProjectLoadError = 'Project root must be an absolute path.';
      coreProjectLoadPath = normalizedProjectRoot;
      return;
    }

    try {
      isCoreProjectLoading = true;
      coreProjectLoadError = null;
      coreProjectLoadPath = normalizedProjectRoot;
      coreProjectLoadingLabel = `Loading ${resolveProjectChoiceLabel(normalizedProjectRoot)}`;
      await onLoadRuntimeProject(normalizedProjectRoot);
      isCoreSideMenuOpen = false;
      shellFeedback = { tone: 'info', message: 'Project loaded' };
    } catch (error) {
      coreProjectLoadError = error instanceof Error ? error.message : String(error);
      shellFeedback = { tone: 'error', message: 'Project load failed' };
    } finally {
      isCoreProjectLoading = false;
      coreProjectLoadingLabel = '';
    }
  }

  async function loadProjectChoice(root: string): Promise<void> {
    coreProjectLoadError = null;
    coreProjectLoadPath = root;
    coreProjectLoadingLabel = `Loading ${resolveProjectChoiceLabel(root)}`;
    await loadCoreProjectRoot(root);
  }

  function isAbsoluteProjectPath(path: string): boolean {
    return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('\\\\');
  }

  type ProjectChoice = {
    id: string;
    root: string;
    label: string;
    active: boolean;
  };

  function resolveProjectChoices(options: string[], activeRoot: string): ProjectChoice[] {
    const activeKey = normalizeProjectRoot(activeRoot);
    const seen = new Set<string>();

    return options
      .map((root) => root.trim())
      .filter((root) => root.length > 0)
      .filter((root) => {
        const key = normalizeProjectRoot(root);

        if (!key || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .map((root) => ({
        id: normalizeProjectRoot(root),
        root,
        label: resolveProjectChoiceLabel(root),
        active: normalizeProjectRoot(root) === activeKey
      }));
  }

  function normalizeProjectRoot(root: string): string {
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/+$/, '');
    const windowsDrivePath = normalizedRoot.match(/^([a-zA-Z]):\/(.+)$/);

    return (
      windowsDrivePath ? `/mnt/${windowsDrivePath[1].toLowerCase()}/${windowsDrivePath[2]}` : normalizedRoot
    ).toLowerCase();
  }

  function resolveProjectChoiceLabel(root: string): string {
    return root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? root;
  }

  function resolveRuntimeProjectTypeLabel(
    root: string,
    applications: ProjectChoice[],
    repositories: ProjectChoice[],
    project: WorkbenchRuntimeProjectDescriptor | null
  ): string {
    const key = normalizeProjectRoot(root);

    if (key && applications.some((choice) => choice.id === key)) {
      return 'App';
    }

    if (key && repositories.some((choice) => choice.id === key)) {
      return 'Repo';
    }

    if (project?.isWorkspaceProject) {
      return 'Workspace';
    }

    return project ? 'Project' : 'Project';
  }

  function reconnectRuntime(): void {
    onReconnectRuntime();
  }

  async function openRuntimeProjection(
    target: RuntimeProjectionTarget | null = activeRuntimeProjectionTarget,
    viewerId: string | null = null
  ): Promise<void> {
    if (!target) {
      return;
    }

    runtimeProjectionActionState = createRuntimeProjectionActionState('opening', target);

    try {
      await onOpenRuntimeProjection(target.projectionKind, target.sourceFile, viewerId);
      runtimeProjectionActionState = createRuntimeProjectionActionState('opened', target);
      shellFeedback = {
        tone: 'info',
        message: `${target.projectionKind} opened for ${target.sourceFile}.`
      };
      closeRuntimeMenu();
    } catch (error) {
      runtimeProjectionActionState = createRuntimeProjectionActionState('error', target, error);
      shellFeedback = {
        tone: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async function invalidateRuntimeProjection(): Promise<void> {
    if (!activeRuntimeProjectionTarget || isInvalidatingRuntimeProjection) {
      return;
    }

    isInvalidatingRuntimeProjection = true;
    const actionTarget = activeRuntimeProjectionTarget;
    runtimeProjectionActionState = createRuntimeProjectionActionState('refreshing', actionTarget);

    try {
      await onInvalidateRuntimeProjection(actionTarget.projectionKind, actionTarget.sourceFile);
      runtimeProjectionActionState = createRuntimeProjectionActionState('requested', actionTarget);
      shellFeedback = {
        tone: 'info',
        message: `${actionTarget.projectionKind} refresh requested for ${actionTarget.sourceFile}.`
      };
    } catch (error) {
      runtimeProjectionActionState = createRuntimeProjectionActionState('error', actionTarget, error);
      shellFeedback = {
        tone: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    } finally {
      isInvalidatingRuntimeProjection = false;
    }
  }

  function openFeatureDocsRoute(): void {
    refreshDesignSystemDiscoveryProjection();
    setActiveShellRoute('docs');
    writeShellRouteToUrl('docs');
    closeFeatureDocsMenu();
  }

  function openDesignGraphDocsRoute(): void {
    refreshDesignSystemDiscoveryProjection();
    setActiveShellRoute('docs');

    if (sandboxNavigation) {
      const nextHref = createWorkbenchRouteHref(sandboxNavigationHref ?? sandboxNavigation.getHref(), {
        kind: 'docs',
        tab: 'design'
      });

      sandboxNavigation.push(nextHref, {
        eventType: 'routechange',
        targetLabel: 'docs'
      });
      closeThemeMenu();
      return;
    }

    if (typeof window !== 'undefined') {
      const nextHref = createWorkbenchRouteHref(window.location.href, { kind: 'docs', tab: 'design' });

      if (nextHref !== window.location.href) {
        window.history.pushState({ shellRoute: 'docs', docsTab: 'design' }, '', nextHref);
      }

      window.dispatchEvent(new CustomEvent('workbench-docs-tab-change', { detail: { tab: 'design' } }));
    }

    closeThemeMenu();
  }

  function closeDocsRoute(): void {
    setActiveShellRoute('workspace');
    writeShellRouteToUrl('workspace');
  }

  function normalizeWorkspaceShellViewId(_viewId: typeof workspaceShellViewId): ShellView['id'] {
    return _viewId;
  }

  function resolveShellViewIdForRoute(route: ShellRoute): ShellView['id'] {
    if (route === 'workspace') {
      return normalizeWorkspaceShellViewId(workspaceShellViewId);
    }

    return activeShellViewDefinitions.find((view) => view.route === route)?.id ?? route;
  }

  function toggleThemeMenu(): void {
    isThemeMenuOpen = !isThemeMenuOpen;
    if (isThemeMenuOpen) {
      closeRuntimeMenu();
      closeFeatureDocsMenu();
      closeShortcutMenu();
    }
  }

  function closeThemeMenu(): void {
    isThemeMenuOpen = false;
  }

  function selectFeatureDocsFilter(nextFilter: FeatureDocFilter): void {
    featureDocsFilter = nextFilter;
  }

  function selectShortcutScopeFilter(nextFilter: ShellShortcutScopeFilter): void {
    shortcutScopeFilter = nextFilter;
  }

  function selectShortcutTypeFilter(nextFilter: ShellShortcutTypeFilter): void {
    shortcutTypeFilter = nextFilter;
  }

  function resolveVisibleFooterShortcutCapacity(width: number): number {
    if (width >= 1800) {
      return 8;
    }

    if (width >= 1560) {
      return 7;
    }

    if (width >= 1360) {
      return 6;
    }

    if (width >= 1180) {
      return 5;
    }

    if (width >= 980) {
      return 4;
    }

    return 3;
  }

  function resolveShellShortcutTypeLabel(type: ShellShortcutType): string {
    switch (type) {
      case 'playback':
        return $i18nT('ui.shell.shortcutTypes.playback', { default: 'Playback' });
      case 'navigation':
        return $i18nT('ui.shell.shortcutTypes.navigation', { default: 'Navigate' });
      case 'selection':
        return $i18nT('ui.shell.shortcutTypes.selection', { default: 'Select' });
      case 'edit':
        return $i18nT('ui.shell.shortcutTypes.edit', { default: 'Edit' });
      case 'view':
        return $i18nT('ui.shell.shortcutTypes.view', { default: 'View' });
      case 'system':
      default:
        return $i18nT('ui.shell.shortcutTypes.system', { default: 'System' });
    }
  }

  function resolveShellShortcutPriorityLabel(priority: ShellShortcutPriority): string {
    switch (priority) {
      case 'essential':
        return $i18nT('ui.shell.shortcutPriority.essential', { default: 'Essential' });
      case 'advanced':
        return $i18nT('ui.shell.shortcutPriority.advanced', { default: 'Advanced' });
      case 'secondary':
      default:
        return $i18nT('ui.shell.shortcutPriority.secondary', { default: 'Secondary' });
    }
  }

  function resolveRuntimeFooterLabel(status: WorkbenchRuntimeSnapshot['status'] | 'idle'): string {
    switch (status) {
      case 'online':
        return 'Runtime online';
      case 'connecting':
        return 'Runtime connecting';
      case 'offline':
        return 'Runtime offline';
      case 'error':
        return 'Runtime error';
      case 'idle':
      default:
        return 'Runtime idle';
    }
  }

  function resolveRuntimeFooterTitle(snapshot: WorkbenchRuntimeSnapshot | null): string {
    if (!snapshot) {
      return 'Runtime idle';
    }

    const workspaceRoot = snapshot.workspace?.workspaceRoot ?? 'No workspace metadata';
    const projectLabel = snapshot.workspace?.project ? ` · Project: ${snapshot.workspace.project.label}` : '';
    const lastEvent = snapshot.events[0]?.type ?? 'No events';
    const error = snapshot.lastError ? ` · ${snapshot.lastError}` : '';

    return `${resolveRuntimeFooterLabel(snapshot.status)} · ${workspaceRoot}${projectLabel} · ${lastEvent}${error}`;
  }

  function resolveSpatialAmbientPhase(
    snapshot: WorkbenchRuntimeSnapshot | null
  ): WorkbenchRuntimeVisualPhase {
    if (snapshot?.launch?.phase) {
      return snapshot.launch.phase;
    }

    switch (snapshot?.status) {
      case 'connecting':
        return 'INITIALIZING';
      case 'online':
        return 'RUNNING';
      case 'offline':
      case 'error':
        return 'RECOVERY';
      case 'idle':
      default:
        return 'LAUNCH_GATE';
    }
  }

  function resolveRuntimeProjectionStateTarget(toolState: unknown): RuntimeProjectionTarget | null {
    return resolveComponentAssemblyStateTarget(toolState) ?? resolveRuntimeJsonStateTarget(toolState);
  }

  function resolveComponentAssemblyStateTarget(toolState: unknown): RuntimeProjectionTarget | null {
    const sourceFile = resolveComponentAssemblyStateSource(toolState);

    return sourceFile
      ? {
          projectionKind: 'component-assembly',
          sourceFile
        }
      : null;
  }

  function resolveRuntimeJsonStateTarget(toolState: unknown): RuntimeProjectionTarget | null {
    if (!toolState || typeof toolState !== 'object') {
      return null;
    }

    const envelope = (toolState as Record<string, unknown>).envelope;

    if (!envelope || typeof envelope !== 'object') {
      return null;
    }

    return resolveRuntimeProjectionTarget(envelope);
  }

  function resolveComponentAssemblyStateSource(toolState: unknown): string | null {
    if (!toolState || typeof toolState !== 'object') {
      return null;
    }

    const state = toolState as Record<string, unknown>;
    const runtimeProjection = state.runtimeProjection;

    if (runtimeProjection && typeof runtimeProjection === 'object') {
      const sourceFile = (runtimeProjection as Record<string, unknown>).sourceFile;

      if (typeof sourceFile === 'string') {
        return sourceFile;
      }
    }

    const assembly = state.assembly;

    if (!assembly || typeof assembly !== 'object') {
      return null;
    }

    const assemblyRecord = assembly as Record<string, unknown>;
    const rootLayerId = assemblyRecord.rootLayerId;
    const layers = assemblyRecord.layers;

    if (typeof rootLayerId !== 'string' || !layers || typeof layers !== 'object') {
      return null;
    }

    const rootLayer = (layers as Record<string, unknown>)[rootLayerId];

    if (!rootLayer || typeof rootLayer !== 'object') {
      return null;
    }

    const rootLayerRecord = rootLayer as Record<string, unknown>;
    const sourceRef = rootLayerRecord.sourceRef;

    if (sourceRef && typeof sourceRef === 'object') {
      const file = (sourceRef as Record<string, unknown>).file;

      if (typeof file === 'string') {
        return file;
      }
    }

    const styles = rootLayerRecord.styles;

    if (styles && typeof styles === 'object') {
      const sourceFile = (styles as Record<string, unknown>).sourceFile;

      if (typeof sourceFile === 'string') {
        return sourceFile;
      }
    }

    return null;
  }

  function resolveFooterShortcut(
    shortcut: ShellShortcut,
    scope: 'context' | 'global',
    index: number
  ): ResolvedShellShortcut {
    const type = shortcut.type ?? (scope === 'global' ? 'system' : 'edit');
    const priority = shortcut.priority ?? 'secondary';
    const scopeLabel =
      scope === 'global'
        ? $i18nT('ui.shell.filters.global', { default: 'Global' })
        : $i18nT('ui.shell.filters.context', { default: 'Context' });
    const contextLabel = shortcut.contextKey
      ? $i18nT(shortcut.contextKey, { default: shortcut.context ?? shortcut.contextKey })
      : (shortcut.context ??
        (scope === 'global' ? 'Workbench' : $i18nT('ui.shell.filters.context', { default: 'Context' })));
    const label = shortcut.labelKey ? $i18nT(shortcut.labelKey, { default: shortcut.label }) : shortcut.label;
    const description =
      shortcut.descriptionKey && shortcut.description
        ? $i18nT(shortcut.descriptionKey, { default: shortcut.description })
        : shortcut.description;

    return {
      ...shortcut,
      label,
      description,
      id: `${scope}-${contextLabel}-${shortcut.key}-${label}-${index}`,
      scope,
      scopeLabel,
      contextLabel,
      type,
      priority,
      priorityLabel: resolveShellShortcutPriorityLabel(priority),
      searchText: [
        shortcut.key,
        label,
        description ?? '',
        contextLabel,
        scopeLabel,
        resolveShellShortcutTypeLabel(type)
      ]
        .join(' ')
        .toLowerCase()
    };
  }

  function pickVisibleFooterShortcuts(
    shortcuts: ResolvedShellShortcut[],
    limit: number
  ): ResolvedShellShortcut[] {
    if (limit <= 0 || shortcuts.length === 0) {
      return [];
    }

    const byPriority = (priority: ShellShortcutPriority) =>
      shortcuts.filter((shortcut) => shortcut.priority === priority);

    return [...byPriority('essential'), ...byPriority('secondary'), ...byPriority('advanced')].slice(
      0,
      limit
    );
  }

  function filterFooterShortcuts(
    shortcuts: ResolvedShellShortcut[],
    filters: {
      scope: ShellShortcutScopeFilter;
      type: ShellShortcutTypeFilter;
      query: string;
    }
  ): ResolvedShellShortcut[] {
    const query = filters.query.trim().toLowerCase();

    return shortcuts.filter((shortcut) => {
      if (filters.scope !== 'all' && shortcut.scope !== filters.scope) {
        return false;
      }

      if (filters.type !== 'all' && shortcut.type !== filters.type) {
        return false;
      }

      if (query.length > 0 && !shortcut.searchText.includes(query)) {
        return false;
      }

      return true;
    });
  }

  function groupFooterShortcutsByContext(
    shortcuts: ResolvedShellShortcut[]
  ): Array<{ key: string; label: string; items: ResolvedShellShortcut[] }> {
    const groups = new Map<string, { key: string; label: string; items: ResolvedShellShortcut[] }>();

    for (const shortcut of shortcuts) {
      const groupKey = `${shortcut.scope}:${shortcut.contextLabel}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          label: shortcut.contextLabel,
          items: []
        });
      }

      groups.get(groupKey)?.items.push(shortcut);
    }

    return [...groups.values()];
  }

  function selectLayoutEditModeView(nextView: LayoutEditModeView): void {
    requestFloatingSurfaceClose('layout-edit-mode');

    layoutEditModeView = nextView;
    isLayoutEditingEnabled = nextView === 'on';

    if (nextView === 'off') {
      hideLayoutOnlyShellRegions();
    }
  }

  function toggleLayoutEditOption(option: LayoutEditOptionKey): void {
    requestFloatingSurfaceClose('layout-edit-option');

    const shellRegionId = resolveLayoutEditShellRegionId(option);

    if (shellRegionId) {
      toggleShellRegion(shellRegionId);
      return;
    }

    layoutEditOptionStatesByMode = {
      ...layoutEditOptionStatesByMode,
      [layoutEditModeView]: {
        ...layoutEditOptionStatesByMode[layoutEditModeView],
        [option]: !layoutEditOptionStatesByMode[layoutEditModeView][option]
      }
    };
  }

  function setLayoutEditOptionStateForModes(option: LayoutEditOptionKey, enabled: boolean): void {
    layoutEditOptionStatesByMode = {
      off: {
        ...layoutEditOptionStatesByMode.off,
        [option]: enabled
      },
      on: {
        ...layoutEditOptionStatesByMode.on,
        [option]: enabled
      }
    };
  }

  function resolveLayoutEditShellRegionId(option: LayoutEditOptionKey): ShellRegionId | null {
    switch (option) {
      case 'leftDockVisible':
        return 'left';
      case 'rightDockVisible':
        return 'right';
      case 'bottomDockVisible':
        return 'bottom';
      default:
        return null;
    }
  }

  function createLayoutEditOptionStates(mode: LayoutEditModeView): Record<LayoutEditOptionKey, boolean> {
    if (mode === 'on') {
      return {
        leftDockVisible: true,
        rightDockVisible: true,
        bottomDockVisible: true,
        shellRegionResize: true,
        boundaryResize: true,
        boundaryPull: true,
        intersectionResize: true,
        panelHeaderUi: true,
        panelToolSelectorUi: true,
        panelActionMenuUi: true,
        dockToggleButtonsVisible: true,
        layoutMenuVisible: true,
        resizeSnap: true,
        deleteZones: true,
        dockPreview: true,
        movePanel: true,
        dockAsTab: true,
        dockToSide: true,
        panelLayoutMenu: true,
        panelToggleHeader: true,
        toggleFullscreen: true,
        closePanel: true,
        panelSplitVertical: true,
        panelSplitHorizontal: true,
        panelJoinAreas: true,
        panelSwapAreas: true,
        widgetZoneHost: true,
        widgetPlacementActions: true,
        shellRegionEmptyState: true,
        widgetZonePopulate: true
      };
    }

    return {
      leftDockVisible: true,
      rightDockVisible: true,
      bottomDockVisible: true,
      shellRegionResize: true,
      boundaryResize: true,
      boundaryPull: false,
      intersectionResize: false,
      panelHeaderUi: true,
      panelToolSelectorUi: false,
      panelActionMenuUi: true,
      dockToggleButtonsVisible: true,
      layoutMenuVisible: true,
      resizeSnap: false,
      // Boundary resize remains available outside the expanded edit surface.
      // Its visible collapse threshold must remain coupled to that destructive gesture.
      deleteZones: true,
      dockPreview: false,
      movePanel: false,
      dockAsTab: false,
      dockToSide: false,
      panelLayoutMenu: true,
      panelToggleHeader: true,
      toggleFullscreen: true,
      closePanel: false,
      panelSplitVertical: true,
      panelSplitHorizontal: true,
      panelJoinAreas: false,
      panelSwapAreas: false,
      widgetZoneHost: true,
      widgetPlacementActions: false,
      shellRegionEmptyState: false,
      widgetZonePopulate: false
    };
  }

  function resolveLayoutEditOptionStatuses(
    optionStates: Record<LayoutEditOptionKey, boolean>
  ): Record<LayoutEditOptionKey, LayoutEditOptionStatus> {
    const baseEnabled = {} as Record<LayoutEditOptionKey, boolean>;
    const statuses = {} as Record<LayoutEditOptionKey, LayoutEditOptionStatus>;

    for (const key of Object.keys(optionStates) as LayoutEditOptionKey[]) {
      baseEnabled[key] = isLayoutEditOptionEffectivelyEnabled(key, optionStates, new Set());
    }

    for (const key of Object.keys(optionStates) as LayoutEditOptionKey[]) {
      const shellRegionId = resolveLayoutEditShellRegionId(key);

      if (shellRegionId) {
        const visible = Boolean(shellState.regions[shellRegionId]?.isVisible);
        const available = canToggleShellRegion(shellRegionId);

        statuses[key] = {
          raw: visible,
          enabled: visible && available,
          state: available ? (visible ? 'enabled' : 'disabled') : 'blocked',
          blockedBy: available ? [] : ['widgetZoneHost']
        };
        continue;
      }

      const availability = resolveLayoutEditOptionAvailability(key, optionStates, baseEnabled);
      const enabled = baseEnabled[key] && availability.available;
      const blockedBy = enabled
        ? []
        : !baseEnabled[key]
          ? resolveLayoutEditOptionDependencyBlockers(key, optionStates)
          : availability.blockedBy;

      statuses[key] = {
        raw: optionStates[key],
        enabled,
        state: enabled ? 'enabled' : optionStates[key] ? 'blocked' : 'disabled',
        blockedBy
      };
    }

    return statuses;
  }

  function isLayoutEditOptionEffectivelyEnabled(
    option: LayoutEditOptionKey,
    optionStates: Record<LayoutEditOptionKey, boolean>,
    visited: Set<LayoutEditOptionKey>
  ): boolean {
    if (!optionStates[option]) {
      return false;
    }

    if (visited.has(option)) {
      return true;
    }

    visited.add(option);
    const dependencies = layoutEditOptionDependencies[option] ?? [];

    return dependencies.every((dependency) =>
      isLayoutEditOptionEffectivelyEnabled(dependency, optionStates, visited)
    );
  }

  function resolveLayoutEditOptionAvailability(
    option: LayoutEditOptionKey,
    optionStates: Record<LayoutEditOptionKey, boolean>,
    baseEnabled: Record<LayoutEditOptionKey, boolean>
  ): { available: boolean; blockedBy: LayoutEditOptionKey[] } {
    if (!optionStates[option]) {
      return { available: false, blockedBy: [] };
    }

    switch (option) {
      case 'dockPreview':
        return resolveBlockedByAll(['movePanel'], baseEnabled, [['dockAsTab', 'dockToSide']]);
      case 'resizeSnap':
        return resolveBlockedByAny(['boundaryResize', 'intersectionResize'], baseEnabled);
      case 'deleteZones':
        return resolveBlockedByAny(['boundaryResize', 'intersectionResize', 'boundaryPull'], baseEnabled);
      case 'movePanel':
        return resolveBlockedByAll([], baseEnabled, [['dockAsTab', 'dockToSide']]);
      default:
        return { available: true, blockedBy: [] };
    }
  }

  function resolveLayoutEditOptionDependencyBlockers(
    option: LayoutEditOptionKey,
    optionStates: Record<LayoutEditOptionKey, boolean>
  ): LayoutEditOptionKey[] {
    const dependencies = layoutEditOptionDependencies[option] ?? [];

    return dependencies.filter(
      (dependency) => !isLayoutEditOptionEffectivelyEnabled(dependency, optionStates, new Set())
    );
  }

  function resolveBlockedByAll(
    required: LayoutEditOptionKey[],
    baseEnabled: Record<LayoutEditOptionKey, boolean>,
    anyGroups: LayoutEditOptionKey[][] = []
  ): { available: boolean; blockedBy: LayoutEditOptionKey[] } {
    const blockedBy = required.filter((dependency) => !baseEnabled[dependency]);

    for (const group of anyGroups) {
      if (!group.some((dependency) => baseEnabled[dependency])) {
        blockedBy.push(...group);
      }
    }

    return {
      available: blockedBy.length === 0,
      blockedBy
    };
  }

  function resolveBlockedByAny(
    options: LayoutEditOptionKey[],
    baseEnabled: Record<LayoutEditOptionKey, boolean>
  ): { available: boolean; blockedBy: LayoutEditOptionKey[] } {
    return {
      available: options.some((dependency) => baseEnabled[dependency]),
      blockedBy: options
    };
  }

  function resolveLayoutEditOptionStatusLabel(option: LayoutEditOptionKey): string {
    const status = activeLayoutEditOptionStatuses[option];
    const controllerLabels = [
      ...resolveLayoutEditOptionControllerKeys(option, activeLayoutEditOptionStatuses)
    ].map((dependency) => resolveLayoutEditOptionLabel(dependency));

    if (status.state === 'enabled') {
      return controllerLabels.length > 0
        ? $i18nT('ui.shell.footer.layoutEdit.status.enabledControlled', {
            default: 'Enabled. Controlled by {{controllers}}.',
            values: {
              controllers: controllerLabels.join(
                ` ${$i18nT('ui.shell.footer.layoutEdit.status.and', { default: 'and' })} `
              )
            }
          })
        : $i18nT('ui.shell.footer.layoutEdit.status.enabled', { default: 'Enabled' });
    }

    if (status.state === 'disabled') {
      return controllerLabels.length > 0
        ? $i18nT('ui.shell.footer.layoutEdit.status.disabledControlled', {
            default: 'Disabled. Controlled by {{controllers}}.',
            values: {
              controllers: controllerLabels.join(
                ` ${$i18nT('ui.shell.footer.layoutEdit.status.and', { default: 'and' })} `
              )
            }
          })
        : $i18nT('ui.shell.footer.layoutEdit.status.disabled', { default: 'Disabled' });
    }

    return $i18nT('ui.shell.footer.layoutEdit.status.blockedBy', {
      default: 'Blocked by {{blockers}}',
      values: {
        blockers: status.blockedBy
          .map((dependency) => resolveLayoutEditOptionLabel(dependency))
          .join(` ${$i18nT('ui.shell.footer.layoutEdit.status.or', { default: 'or' })} `)
      }
    });
  }

  function resolveLayoutEditModeLabel(mode: LayoutEditModeView, fallback: string): string {
    return $i18nT(`ui.shell.footer.layoutEdit.mode.${mode}`, { default: fallback });
  }

  function resolveLayoutEditOptionLabel(option: LayoutEditOptionKey): string {
    const shellRegionId = resolveLayoutEditShellRegionId(option);

    if (shellRegionId) {
      const visible = Boolean(shellState.regions[shellRegionId]?.isVisible);
      const labelKey = visible ? `hide-${shellRegionId}-dock` : `show-${shellRegionId}-dock`;
      const fallback = `${visible ? 'Hide' : 'Show'} ${resolveShellRegionLabel(shellRegionId)} Dock`;

      return $i18nT(`ui.shell.footer.layoutEdit.option.${labelKey}`, { default: fallback });
    }

    if (option === 'dockToggleButtonsVisible') {
      const visible = activeLayoutEditOptionStatuses.dockToggleButtonsVisible?.raw ?? true;
      return $i18nT(
        visible
          ? 'footer.layoutEdit.option.hide-dock-toggle-buttons'
          : 'footer.layoutEdit.option.show-dock-toggle-buttons',
        { default: `${visible ? 'Hide' : 'Show'} Dock Toggle Buttons` }
      );
    }

    if (option === 'layoutMenuVisible') {
      const visible = activeLayoutEditOptionStatuses.layoutMenuVisible?.raw ?? true;
      return $i18nT(
        visible ? 'footer.layoutEdit.option.hide-layout-menu' : 'footer.layoutEdit.option.show-layout-menu',
        { default: `${visible ? 'Hide' : 'Show'} Layout Menu` }
      );
    }

    for (const section of [...layoutEditUiSections, ...layoutEditActionSections]) {
      const item = section.items.find((candidate) => candidate.key === option);

      if (item) {
        return $i18nT(`ui.shell.footer.layoutEdit.option.${item.key}`, { default: item.label });
      }
    }

    return option;
  }

  function resolveShellRegionLabel(regionId: ShellRegionId): string {
    switch (regionId) {
      case 'left':
        return 'Left';
      case 'right':
        return 'Right';
      case 'bottom':
        return 'Bottom';
      default:
        return regionId;
    }
  }

  function resolveLayoutEditSectionTitle(title: string): string {
    const key = title
      .toLowerCase()
      .replace(/\s*\/\s*/g, '-')
      .replace(/\s+/g, '-');

    return $i18nT(`ui.shell.footer.layoutEdit.section.${key}`, { default: title });
  }

  function resolveLayoutEditSectionKind(title: string): string {
    let kind: string;

    switch (title) {
      case 'Workspace UI':
      case 'Panel Chrome':
        kind = 'structure';
        break;
      case 'Gesture Helpers':
        kind = 'helpers';
        break;
      case 'Panel / Stack':
        kind = 'entry';
        break;
      case 'Panel Layout Menu':
      case 'Widget Zones':
        kind = 'derived';
        break;
      default:
        return '';
    }

    return $i18nT(`ui.shell.footer.layoutEdit.kind.${kind}`, { default: kind });
  }

  function shouldRenderLayoutEditSectionKind(sections: Array<{ title: string }>, index: number): boolean {
    if (index === 0) {
      return true;
    }

    return (
      resolveLayoutEditSectionKind(sections[index - 1].title) !==
      resolveLayoutEditSectionKind(sections[index].title)
    );
  }

  function resolveLayoutEditOptionControllerKeys(
    option: LayoutEditOptionKey,
    statuses: Record<LayoutEditOptionKey, LayoutEditOptionStatus>
  ): Set<LayoutEditOptionKey> {
    const controllers = new Set<LayoutEditOptionKey>(layoutEditOptionDependencies[option] ?? []);

    for (const dependency of statuses[option]?.blockedBy ?? []) {
      controllers.add(dependency);
    }

    return controllers;
  }

  setWorkbenchThemeRuntimeContext(() => themeRuntime);

  onMount(() => {
    void activateI18nLocale(initialI18nLocale, false);
    if (activeShellRoute === 'docs') {
      refreshDesignSystemDiscoveryProjection();
    }

    function isEditableTarget(target: EventTarget | null): boolean {
      return (
        target instanceof HTMLElement &&
        !!target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
      );
    }

    function isWorkbenchContextMenuTarget(target: EventTarget | null): boolean {
      return target instanceof HTMLElement && !!target.closest('[data-workbench-context-menu="true"]');
    }

    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (isCoreSideMenuOpen && event.key === 'Escape') {
        event.preventDefault();
        toggleCoreSideMenu(false);
        return;
      }

      if (isAudioMenuOpen && event.key === 'Escape') {
        event.preventDefault();
        closeAudioMenu();
        return;
      }

      if (isShortcutMenuOpen && event.key === 'Escape') {
        event.preventDefault();
        closeShortcutMenu();
        return;
      }

      if (isFeatureDocsMenuOpen && event.key === 'Escape') {
        event.preventDefault();
        closeFeatureDocsMenu();
        return;
      }

      if (isLayoutEditMenuOpen && event.key === 'Escape') {
        event.preventDefault();
        closeLayoutEditMenu();
        return;
      }

      if (!isEditableTarget(event.target) && !isHistoryShortcutLocked() && handleHistoryShortcut(event)) {
        return;
      }

      const shortcutAction = resolveShellShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        target: event.target
      });

      if (!shortcutAction) {
        if (isPaletteOpen && event.key === 'Escape') {
          event.preventDefault();
          togglePalette(false);
        }

        return;
      }

      event.preventDefault();
      runShellAction(shortcutAction);
    }

    function handleWindowContextMenu(event: MouseEvent): void {
      if (isEditableTarget(event.target) || isWorkbenchContextMenuTarget(event.target)) {
        return;
      }

      event.preventDefault();
    }

    function handleWindowPointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;

      if (
        isAudioMenuOpen &&
        (!target || (!audioMenuElement?.contains(target) && !audioControlGroupElement?.contains(target)))
      ) {
        closeAudioMenu();
      }

      if (
        isRuntimeMenuOpen &&
        (!target || (!runtimeMenuElement?.contains(target) && !runtimeControlElement?.contains(target)))
      ) {
        closeRuntimeMenu();
      }

      if (
        isThemeMenuOpen &&
        (!target || (!themeMenuElement?.contains(target) && !themeControlElement?.contains(target)))
      ) {
        closeThemeMenu();
      }

      if (
        isShortcutMenuOpen &&
        (!target || (!shortcutMenuElement?.contains(target) && !shortcutMenuButtonElement?.contains(target)))
      ) {
        closeShortcutMenu();
      }

      if (
        isFeatureDocsMenuOpen &&
        (!target ||
          (!featureDocsMenuElement?.contains(target) && !featureDocsButtonElement?.contains(target)))
      ) {
        closeFeatureDocsMenu();
      }

      if (
        isLayoutEditMenuOpen &&
        (!target ||
          (!layoutEditMenuElement?.contains(target) && !layoutEditButtonGroupElement?.contains(target)))
      ) {
        closeLayoutEditMenu();
      }
    }

    function handleWindowWheel(event: WheelEvent): void {
      if ((!event.ctrlKey && !event.altKey) || !appShellElement) {
        return;
      }

      // Cancel browser gestures across the viewport, including portalled UI.
      // Do not stop capture: the hovered Tool must still receive the wheel.
      event.preventDefault();
    }

    function handleWindowWheelBubble(event: WheelEvent): void {
      if ((event.ctrlKey || event.altKey) && appShellElement) {
        event.stopPropagation();
      }
    }

    function handleWindowPopState(): void {
      applyShellRouteFromUrl();
    }

    function handleCoreProjectLoadRequest(): void {
      void openCoreProjectLoad(true);
    }

    function handleShellRegionWidgetVisibilityRequest(event: Event): void {
      const detail = (event as CustomEvent<unknown>).detail;

      if (!isShellRegionWidgetVisibilityRequestDetail(detail)) {
        return;
      }

      setShellRegionWidgetVisibilityFromLayout(detail.regionId, detail.widgetId, detail.isVisible);
    }

    function handleToolInternalDockVisibilityRequest(event: Event): void {
      const detail = (event as CustomEvent<unknown>).detail;

      if (!isToolInternalDockVisibilityRequestDetail(detail)) {
        return;
      }

      setToolInternalDockVisibilityFromLayout(detail);
    }

    function handleShellWidgetLocationRequest(event: Event): void {
      const detail = (event as CustomEvent<unknown>).detail;

      if (!isShellWidgetLocationRequestDetail(detail)) {
        return;
      }

      setShellWidgetLocationFromLayout(detail);
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    window.addEventListener('contextmenu', handleWindowContextMenu);
    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('wheel', handleWindowWheel, { passive: false, capture: true });
    window.addEventListener('wheel', handleWindowWheelBubble);
    window.addEventListener('popstate', handleWindowPopState);
    window.addEventListener('workbench:core-project-load-request', handleCoreProjectLoadRequest);
    window.addEventListener(
      'workbench:shell-region-widget-visibility-request',
      handleShellRegionWidgetVisibilityRequest
    );
    window.addEventListener(
      'workbench:tool-internal-dock-visibility-request',
      handleToolInternalDockVisibilityRequest
    );
    window.addEventListener('workbench:shell-widget-location-request', handleShellWidgetLocationRequest);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.removeEventListener('contextmenu', handleWindowContextMenu);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('wheel', handleWindowWheel, true);
      window.removeEventListener('wheel', handleWindowWheelBubble);
      window.removeEventListener('popstate', handleWindowPopState);
      window.removeEventListener('workbench:core-project-load-request', handleCoreProjectLoadRequest);
      window.removeEventListener(
        'workbench:shell-region-widget-visibility-request',
        handleShellRegionWidgetVisibilityRequest
      );
      window.removeEventListener(
        'workbench:tool-internal-dock-visibility-request',
        handleToolInternalDockVisibilityRequest
      );
      window.removeEventListener('workbench:shell-widget-location-request', handleShellWidgetLocationRequest);
      unsubscribeSandboxNavigation();
    };
  });

  onDestroy(() => {
    if (shouldApplyGlobalThemeRuntime) {
      removeDesignSystemThemeRuntimeStyle();
    }
  });
</script>

<div
  class:app-shell--performance-surfaces={performanceSurfaces}
  class:app-shell--locale-pending={!i18nProjectionReady}
  class="app-shell"
  aria-busy={!i18nProjectionReady}
  data-app-context={appContext}
  data-theme={activeThemeModeId}
  data-workbench-theme={activeThemeFamily}
  data-workbench-theme-id={activeThemeModeId}
  data-workbench-theme-family={activeThemeFamily}
  data-workbench-color-mode={activeDesignThemeMode}
  style={`--app-shell-shell-width: ${Math.max(shellWidth, 0)}px; --app-shell-workspace-height: ${Math.max(workspaceHeight, 0)}px;`}
  bind:this={appShellElement}
  bind:clientWidth={shellWidth}
>
  <svelte:component
    this={ThemeAmbientRuntime}
    phase={spatialAmbientPhase}
    quality={spatialAmbientQuality}
    themeMode={activeDesignThemeMode}
  />

  <svelte:component this={ThemeFocusPlaneProvider}>
    <svelte:component
      this={ThemeSurfaceFrame}
      id="shell.toolbar"
      role="shell"
      depth="panel"
      focusStrength={0.74}
      interactive={false}
      class="app-shell__perceptual-row app-shell__perceptual-row--structural app-shell__toolbar-row"
      ariaRole="presentation"
    >
      <AppShellToolbar
        {shellViews}
        {activeShellViewId}
        panelVisibilityEntries={workspacePanelVisibilityEntries}
        workspacePresetEntries={workspacePresetDefinitions}
        {activeWorkspacePresetId}
        {activeWorkspacePresetLabel}
        createWorkspacePresetSnapshot={createCurrentWorkspacePresetSnapshot}
        {shellState}
        {shellFeedback}
        hasActiveWindow={Boolean(renderedWindow)}
        {isPaletteOpen}
        {isLayoutEditingEnabled}
        {canToggleLeftRegion}
        {canToggleBottomRegion}
        {canToggleRightRegion}
        showLayoutHistoryHint={showHeaderLayoutHistoryHint}
        {canUndoAppHistory}
        {canRedoAppHistory}
        {isCoreSideMenuOpen}
        showCoreSideMenuToggle={showLaunchGateReturn}
        brandEyebrow={$i18nT('ui.shell.brand.eyebrow', { default: 'Workbench' })}
        brandProjectType={activeRuntimeProjectTypeLabel}
        brandProjectLabel={appDisplayName || activeRuntimeProjectLabel}
        brandFaviconUrl={activeRuntimeProjectFaviconUrl}
        onSelectShellView={selectShellView}
        onToggleLayoutEditing={toggleLayoutEditing}
        onToggleWorkspacePanelVisibility={toggleWorkspacePanelVisibility}
        onSelectWorkspacePreset={selectWorkspacePreset}
        onResetWorkspacePreset={resetWorkspacePreset}
        onCreateWorkspacePresetSnapshot={createBlankWorkspacePresetSnapshotSeed}
        {onLoadNativeFixture}
        onToggleCoreSideMenu={() => toggleCoreSideMenu()}
        onTogglePalette={() => togglePalette()}
        onToggleShellRegion={toggleShellRegion}
        {onUndoAppHistory}
        {onRedoAppHistory}
      >
        <slot name="header-status" slot="application-status" />
      </AppShellToolbar>
    </svelte:component>

    <AppShellMainContentLayout
      {shellState}
      {shellWidgetRegistry}
      {registry}
      {workspace}
      {focus}
      {designSystemDiscoveryProjection}
      designSystemThemeSession={workspace.designSystemThemeSession ?? null}
      updateToolState={onUpdateToolState}
      hideShellRegionHeaders={activeShellRoute === 'lab'}
      bind:workspaceHeight
      {shellRegionResizeHint}
      {resizeShellRegion}
      onActivateShellWidget={activateShellWidgetFromLayout}
      onSetShellRegionOpen={setShellRegionOpenFromLayout}
      onAddShellWidgetToRegion={addShellWidgetToRegionFromLayout}
      onMoveShellWidgetToRegion={moveShellWidgetToRegionFromLayout}
      {onSetShellRegionArrangement}
      shellContextToolId={activeShellToolId}
      shellContextToolIds={availableShellToolIdList}
      shellRegionLayoutEditingEnabled={isLayoutEditingEnabled}
      shellRegionResizeEnabled={appliedLayoutEditOptionStatuses.shellRegionResize.enabled}
      shellRegionEmptyStateEnabled={appliedLayoutEditOptionStatuses.shellRegionEmptyState.enabled}
      shellRegionPopulateEnabled={appliedLayoutEditOptionStatuses.widgetZonePopulate.enabled}
      onShellRegionResizeDragState={handleShellRegionResizeDragState}
    >
      <AppShellWorkspaceRegion
        {themeDocument}
        {technicalDocsReports}
        {technicalDocsDatasetLoader}
        {featureDocumentation}
        {activeShellRoute}
        {workspace}
        {focus}
        {registry}
        {runtimeSnapshot}
        {designSystemDiscoveryProjection}
        designSystemThemeSession={workspace.designSystemThemeSession ?? null}
        {renderedWindowId}
        {dispatchCommand}
        {onApplyWorkspaceSession}
        {onResizeSplit}
        {onResizeSplitBoundary}
        {onCollapseSplit}
        {onCollapseSplitBoundary}
        {toolRuntimeHost}
        {toolRuntimeUi}
        {layoutInteraction}
        {onOpenLayoutSplitMenu}
        {onSelectLayoutMenuAction}
        {onHoverLayoutSplitSide}
        {onConfirmLayoutSplitSide}
        {onUpdateLayoutSplitPreview}
        {onAdjustLayoutSplitPreviewCuts}
        {onStartBoundaryPull}
        {onUpdateBoundaryPull}
        {onCommitBoundaryPull}
        {onStartIntersectionResize}
        {onUpdateIntersectionResize}
        {onCommitLayoutSubdivideSelection}
        {onCommitLayoutSplitPreview}
        {onStartPanelDrag}
        {onUpdatePanelDrag}
        {onCommitPanelDock}
        {onDetachPanelToWindow}
        {onCancelLayoutInteraction}
        {onSetFullscreenPanel}
        {onBeginAppHistoryTransaction}
        {onCommitAppHistoryTransaction}
        {onCancelAppHistoryTransaction}
        {onBeginCoreHistoryTransaction}
        {onCommitCoreHistoryTransaction}
        {onCancelCoreHistoryTransaction}
        {onSetDesignSystemThemeSession}
        {onLoadRuntimeProjection}
        shortcutGroups={footerShortcutGroups}
        totalShortcuts={allFooterShortcuts.length}
        filteredShortcuts={filteredFooterShortcuts.length}
        {shortcutQuery}
        {shortcutScopeFilter}
        {shortcutTypeFilter}
        {shortcutScopeFilters}
        {shortcutTypeFilters}
        onShortcutQueryChange={(select) => (shortcutQuery = select)}
        onSelectShortcutScopeFilter={selectShortcutScopeFilter}
        onSelectShortcutTypeFilter={selectShortcutTypeFilter}
        layoutEditingEnabled={isLayoutEditingEnabled}
        {appliedLayoutEditOptionStatuses}
      />
    </AppShellMainContentLayout>

    <svelte:component
      this={ThemeSurfaceFrame}
      id="shell.footer"
      role="shell"
      depth="panel"
      focusStrength={0.62}
      interactive={false}
      class="app-shell__perceptual-row app-shell__perceptual-row--structural"
      ariaRole="presentation"
    >
      <AppShellFooterRegion
        {themeDocument}
        bind:hoveredFooterControl
        bind:activeI18nLocale
        bind:shortcutMenuButtonElement
        bind:shortcutMenuElement
        bind:shortcutQuery
        bind:themeControlElement
        bind:themeMenuElement
        bind:runtimeControlElement
        bind:runtimeMenuElement
        bind:audioControlGroupElement
        bind:audioMenuElement
        bind:featureDocsButtonElement
        bind:featureDocsMenuElement
        bind:hoveredLayoutEditOptionKey
        bind:layoutEditButtonGroupElement
        bind:layoutEditMenuElement
        footerLabel={$i18nT('ui.shell.footer.workbenchStatus', { default: 'Workbench status' })}
        {appVersion}
        {i18nLocaleOptions}
        {handleI18nLocaleChange}
        {activeReadingLevelDefault}
        {handleReadingLevelDefaultChange}
        {isShortcutMenuOpen}
        {allFooterShortcuts}
        {visibleFooterContextShortcuts}
        {visibleFooterGlobalShortcuts}
        {footerShortcutOverflowCount}
        {footerShortcutGroups}
        {filteredFooterShortcuts}
        {shortcutScopeFilter}
        {shortcutTypeFilter}
        {shortcutScopeFilters}
        {shortcutTypeFilters}
        {toggleShortcutMenu}
        {selectShortcutScopeFilter}
        {selectShortcutTypeFilter}
        {resolveShellShortcutTypeLabel}
        {isThemeMenuOpen}
        {activeDesignThemeMode}
        {isThemeFooterControlActive}
        {toggleThemeMenu}
        {toggleDesignThemeMode}
        {openDesignGraphDocsRoute}
        {isRuntimeMenuOpen}
        {runtimeSnapshot}
        {runtimeFooterStatus}
        {runtimeFooterLabel}
        {runtimeFooterTitle}
        {runtimeFooterEventCount}
        {runtimeFooterEvents}
        {runtimeFooterCapabilities}
        {runtimeFooterProjectionCatalog}
        {bootProjection}
        {runtimeProjectionViewerOptionsByKind}
        {runtimeProjectionSessionEntries}
        {activeRuntimeProjectionTarget}
        {activeRuntimeProjectionSource}
        {isInvalidatingRuntimeProjection}
        {runtimeProjectionActionStatus}
        {isRuntimeFooterControlActive}
        {toggleRuntimeMenu}
        {reconnectRuntime}
        {openRuntimeProjection}
        {invalidateRuntimeProjection}
        {isAudioMenuOpen}
        {audioMuted}
        {footerAudioMasterVolume}
        {footerAudioMasterMeter}
        {footerAudioChannels}
        {footerAudioSummary}
        {isAudioMediaBlocksOpen}
        {isAudioFooterControlActive}
        {onToggleAudioMuted}
        {onSetAudioMasterVolume}
        {onSetAudioChannelVolume}
        {toggleAudioMenu}
        {toggleAudioMediaBlocks}
        {showFooterDocsControl}
        {isFeatureDocsMenuOpen}
        {featureDocGroups}
        {contextualFeatureDocs}
        featureDocumentationAvailable={featureDocumentation !== null}
        {featureDocFilters}
        {featureDocsFilter}
        {isDocsFooterControlActive}
        {toggleFeatureDocsMenu}
        {openFeatureDocsRoute}
        {selectFeatureDocsFilter}
        showFooterLayoutControl={showFooterLayoutControl &&
          activeLayoutEditOptionStatuses.layoutMenuVisible?.enabled}
        {isLayoutEditingEnabled}
        {isLayoutEditMenuOpen}
        {layoutEditModeView}
        {layoutEditModeTabs}
        {layoutEditUiSections}
        {layoutEditActionSections}
        {activeLayoutEditOptionStatuses}
        {highlightedLayoutEditControllerKeys}
        {isLayoutFooterControlActive}
        {toggleLayoutEditing}
        {toggleLayoutEditMenu}
        {selectLayoutEditModeView}
        {toggleLayoutEditOption}
        {shouldRenderLayoutEditSectionKind}
        {resolveLayoutEditModeLabel}
        {resolveLayoutEditSectionKind}
        {resolveLayoutEditSectionTitle}
        {resolveLayoutEditOptionStatusLabel}
        {resolveLayoutEditOptionLabel}
      />
    </svelte:component>

    {#if isCoreSideMenuOpen && showLaunchGateReturn}
      <svelte:component
        this={ThemeSurfaceFrame}
        id="overlay.project-menu"
        role="modal"
        depth="overlay"
        active
        focusStrength={0.96}
        class="app-shell__core-menu-focus"
        ariaRole="presentation"
      >
        <div class="app-shell__core-menu" role="presentation">
          <button
            type="button"
            class="app-shell__core-menu-backdrop"
            aria-label={$i18nT('ui.shell.projectMenu.close', { default: 'Close project menu' })}
            on:click={() => toggleCoreSideMenu(false)}
          ></button>
          {#if coreProjectLoadStatusTitle}
            <div
              class:app-shell__core-project-status--error={Boolean(coreProjectLoadError)}
              class="app-shell__core-project-status"
              role={coreProjectLoadError ? 'alert' : 'status'}
              aria-live="polite"
            >
              <div>
                <span>{coreProjectLoadStatusTitle}</span>
                <strong>{coreProjectLoadStatusDetail}</strong>
                {#if coreProjectLoadPath}
                  <small title={coreProjectLoadPath}>{coreProjectLoadPath}</small>
                {/if}
              </div>
              {#if isCoreProjectLoading}
                <i aria-hidden="true"></i>
              {/if}
            </div>
          {/if}
          <aside
            class="app-shell__core-menu-panel"
            role="dialog"
            aria-label={$i18nT('ui.shell.projectMenu.title', { default: 'Project menu' })}
          >
            <header class="app-shell__core-menu-header">
              <div>
                <span>{$i18nT('ui.shell.projectMenu.launch', { default: 'Launch' })}</span>
                <strong>{$i18nT('ui.shell.projectMenu.launchGate', { default: 'Launch Gate' })}</strong>
              </div>
              <button
                type="button"
                aria-label={$i18nT('ui.shell.projectMenu.close', { default: 'Close project menu' })}
                title={$i18nT('ui.shell.projectMenu.close', { default: 'Close project menu' })}
                on:click={() => toggleCoreSideMenu(false)}
                disabled={isCoreProjectLoading}
              >
                ×
              </button>
            </header>

            <section
              class="app-shell__launch-gate-return"
              aria-label={$i18nT('ui.shell.projectMenu.returnAria', { default: 'Return to launch gate' })}
            >
              <div class="app-shell__launch-gate-return-copy">
                <span>{$i18nT('ui.shell.projectMenu.sessionActive', { default: 'Session active' })}</span>
                <strong>{activeRuntimeProjectDisplayLabel}</strong>
                <p>
                  {$i18nT('ui.shell.projectMenu.returnDescription', {
                    default:
                      'Return to the Launch Gate to choose another context without clearing the current session. Cancel to stay here.'
                  })}
                </p>
                {#if activeRuntimeProjectRoot}
                  <small title={activeRuntimeProjectRoot}>{activeRuntimeProjectRoot}</small>
                {/if}
              </div>

              <footer>
                <button type="button" on:click={() => toggleCoreSideMenu(false)}
                  >{$i18nT('ui.shell.projectMenu.cancel', { default: 'Cancel' })}</button
                >
                <button
                  type="button"
                  class="app-shell__launch-gate-return-primary"
                  on:click={confirmReturnToLaunchGate}
                >
                  {$i18nT('ui.shell.projectMenu.returnAction', { default: 'Return to Launch Gate' })}
                </button>
              </footer>
            </section>
          </aside>
        </div>
      </svelte:component>
    {/if}
  </svelte:component>
</div>

<input
  bind:this={importInput}
  class="app-shell__hidden-input"
  type="file"
  accept="application/json,.json"
  on:change={handleImportChange}
/>

<CommandPalette
  isOpen={isPaletteOpen}
  items={paletteItems}
  on:close={() => togglePalette(false)}
  on:select={handlePaletteSelect}
/>

<style>
  .app-shell {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto auto auto;
    gap: 0;
    min-height: 100%;
    height: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at top, var(--color-background-glow), transparent 30%),
      var(--color-background-canvas);
  }

  .app-shell--locale-pending > * {
    visibility: hidden;
  }

  .app-shell > :global(:not(.workbench-theme-ambient)) {
    position: relative;
    z-index: 1;
  }

  :global(.app-shell__perceptual-row) {
    min-width: 0;
    min-height: 0;
  }

  :global(.app-shell__perceptual-row > *) {
    width: 100%;
  }

  :global(.app-shell__perceptual-row--structural) {
    opacity: 1;
    filter: none;
    transform: none;
    transition: none;
  }

  :global(.app-shell__perceptual-row--structural::after) {
    display: none;
  }

  :global(.app-shell__toolbar-row) {
    /* Fullscreen stacks live at z-index 120. Keep header-owned menus in the
     * shell interaction plane so their popovers cannot be painted underneath
     * the maximized Tool that follows this row in DOM order. */
    z-index: 160 !important;
    overflow: visible;
  }

  .app-shell--performance-surfaces {
    background: var(--color-background-canvas);
  }

  .app-shell--performance-surfaces :global(.workbench-theme-ambient) {
    display: none;
  }

  .app-shell--performance-surfaces :global(.workbench-perceptual-surface),
  .app-shell--performance-surfaces
    :global(.workbench-perceptual-surface[data-workbench-surface-active='true']) {
    opacity: 1;
    filter: none;
    transition: none;
  }

  .app-shell--performance-surfaces :global(.workbench-perceptual-surface::after) {
    display: none;
  }

  .app-shell--performance-surfaces :global(*) {
    backdrop-filter: none !important;
  }

  :global(.app-shell__core-menu-focus) {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
  }

  :global(.app-shell__core-menu-focus .app-shell__core-menu) {
    pointer-events: auto;
  }

  .app-shell__hidden-input {
    display: none;
  }

  .app-shell__core-menu {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: start center;
    padding: clamp(1rem, 7vh, 4.5rem) 1rem 1rem;
    color: var(--color-text-primary);
    pointer-events: auto;
  }

  .app-shell__core-menu-backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    border: 0;
    padding: 0;
    background:
      radial-gradient(circle at 50% 18%, rgba(59, 130, 246, 0.12), transparent 34rem),
      linear-gradient(180deg, rgba(3, 7, 18, 0.68), rgba(3, 7, 18, 0.42)),
      color-mix(in srgb, var(--color-background-overlay) 62%, transparent);
    cursor: default;
    backdrop-filter: blur(10px) saturate(1.18);
  }

  .app-shell__core-project-status {
    position: fixed;
    top: 0.75rem;
    left: 50%;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.72rem;
    align-items: center;
    width: min(43rem, calc(100vw - 1.5rem));
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-border-accent) 54%, var(--color-border-subtle));
    border-radius: 0.72rem;
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-background-accent) 30%, transparent),
        transparent 62%
      ),
      color-mix(in srgb, var(--color-background-elevated) 94%, transparent);
    box-shadow: 0 1rem 2.6rem rgba(0, 0, 0, 0.42);
    padding: 0.58rem 0.7rem;
    pointer-events: none;
    transform: translateX(-50%);
    backdrop-filter: blur(16px) saturate(1.2);
  }

  .app-shell__core-project-status::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 0.16rem;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--color-border-accent) 88%, white),
      transparent
    );
    transform: translateX(-100%);
    animation: app-shell-core-project-loading 1.05s linear infinite;
  }

  .app-shell__core-project-status--error {
    border-color: color-mix(in srgb, var(--color-border-danger) 72%, var(--color-border-subtle));
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-background-danger) 48%, transparent),
        transparent 68%
      ),
      color-mix(in srgb, var(--color-background-elevated) 94%, transparent);
  }

  .app-shell__core-project-status--error::after {
    animation: none;
    background: var(--color-border-danger);
    opacity: 0.72;
    transform: translateX(0);
  }

  .app-shell__core-project-status div {
    display: grid;
    min-width: 0;
    gap: 0.12rem;
  }

  .app-shell__core-project-status span {
    color: var(--color-text-muted);
    font-size: 0.6rem;
    font-weight: 920;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .app-shell__core-project-status strong,
  .app-shell__core-project-status small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-shell__core-project-status strong {
    color: var(--color-text-primary);
    font-size: 0.78rem;
    font-weight: 900;
  }

  .app-shell__core-project-status small {
    color: var(--color-text-secondary);
    font-size: 0.66rem;
  }

  .app-shell__core-project-status i {
    display: block;
    width: 1rem;
    height: 1rem;
    border: 2px solid color-mix(in srgb, var(--color-border-accent) 28%, transparent);
    border-top-color: color-mix(in srgb, var(--color-border-accent) 88%, white);
    border-radius: 999px;
    animation: app-shell-core-project-spin 0.74s linear infinite;
  }

  .app-shell__core-menu-panel {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-rows: repeat(2, auto);
    gap: 0.72rem;
    width: min(43rem, calc(100vw - 1.5rem));
    max-height: min(42rem, calc(100dvh - 2rem));
    overflow: auto;
    border: 1px solid color-mix(in srgb, var(--color-border-accent) 42%, var(--color-border-subtle));
    border-radius: 0.95rem;
    background:
      linear-gradient(
        145deg,
        color-mix(in srgb, var(--color-background-accent) 34%, transparent),
        transparent 48%
      ),
      color-mix(in srgb, var(--color-background-elevated) 92%, transparent);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.52);
    padding: 0.9rem;
    backdrop-filter: blur(18px) saturate(1.25);
  }

  .app-shell__core-menu-header,
  .app-shell__launch-gate-return footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.72rem;
  }

  .app-shell__core-menu-header div {
    display: grid;
    min-width: 0;
    gap: 0.16rem;
  }

  .app-shell__core-menu-header span {
    color: var(--color-text-muted);
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .app-shell__core-menu-header strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-shell__core-menu-header button {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.55rem;
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
  }

  .app-shell__core-menu-header button:hover,
  .app-shell__core-menu-header button:focus-visible {
    border-color: var(--color-border-accent);
    color: var(--color-text-primary);
  }

  .app-shell__launch-gate-return {
    display: grid;
    gap: 0.8rem;
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-accent) 24%, var(--color-border-subtle));
    border-radius: 0.68rem;
    background: color-mix(in srgb, var(--color-background-muted) 84%, transparent);
    padding: 0.68rem 0.72rem;
  }

  .app-shell__launch-gate-return-copy {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }

  .app-shell__launch-gate-return-copy span {
    color: var(--color-text-muted);
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .app-shell__launch-gate-return-copy strong {
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .app-shell__launch-gate-return-copy p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .app-shell__launch-gate-return-copy small {
    overflow: hidden;
    color: var(--color-text-muted);
    font-family: var(--font-family-mono, monospace);
    font-size: 0.7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-shell__launch-gate-return footer {
    justify-content: end;
  }

  .app-shell__launch-gate-return footer button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.15rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--color-background-surface) 84%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 850;
    padding: 0 0.85rem;
    cursor: pointer;
  }

  .app-shell__launch-gate-return footer button:hover,
  .app-shell__launch-gate-return footer button:focus-visible {
    border-color: var(--color-border-accent);
    color: var(--color-text-primary);
  }

  .app-shell__launch-gate-return-primary {
    border-color: color-mix(in srgb, var(--color-border-accent) 72%, var(--color-border-subtle)) !important;
    background: color-mix(
      in srgb,
      var(--color-background-accent) 56%,
      var(--color-background-surface)
    ) !important;
    color: var(--color-text-primary) !important;
  }

  @keyframes app-shell-core-project-loading {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(100%);
    }
  }

  @keyframes app-shell-core-project-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
