<script lang="ts">
  import type {
    DesignSystemThemeSession,
    InMemoryToolRegistry,
    LayoutUserActionIntent,
    LayoutDockSide,
    LayoutDockTarget,
    LayoutEdge,
    LayoutInteractionState,
    LayoutMenuActionId,
    LayoutMenuActionSelection,
    LayoutMenuTarget,
    SplitOrientation,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolRuntimeHostActions,
    WorkbenchRuntimeSnapshot,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus,
    WorkspaceSessionState
  } from '@konitif/workbench';
  import {
    createWorkspaceLayoutSurfaceProjection,
    createWorkspaceSessionState,
    dispatchLayoutSurfaceIntent
  } from '@konitif/workbench';
  import WorkspaceView from '../../layout/WorkspaceView.svelte';
  import TechnicalDocsView from '../TechnicalDocsView.svelte';
  import type { DesignSystemThemeDocument } from '../designSystemThemeCatalog';
  import type { TechnicalDocsReports } from '../technicalDocsReports';
  import type { TechnicalDocsDatasetLoader } from '../technicalDocsDatasets';
  import type { FeatureDocumentationContribution } from '../technicalDocsCatalog';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  const i18nT = getWorkbenchTranslator();
  import type { DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';

  type ShellRoute = string;
  type ShellShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type ShellShortcutScopeFilter = 'all' | 'context' | 'global';
  type ShellShortcutTypeFilter = 'all' | ShellShortcutType;

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
      }
    | undefined
  >;

  type LayoutOptionStatuses = Record<string, { enabled: boolean } | undefined>;

  export let activeShellRoute: ShellRoute;
  export let featureDocumentation: FeatureDocumentationContribution | null = null;
  export let technicalDocsDatasetLoader: TechnicalDocsDatasetLoader | null = null;
  export let technicalDocsReports: TechnicalDocsReports | null = null;
  export let themeDocument: DesignSystemThemeDocument | null = null;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection;
  export let designSystemThemeSession: DesignSystemThemeSession | null = null;
  export let renderedWindowId: string | null = null;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let onApplyWorkspaceSession: ((workspaceSession: WorkspaceSessionState, historyScope?: 'none' | 'app' | 'core' | 'both') => void) | null = null;
  export let onResizeSplit: (splitId: string, sizes: [number, number]) => void;
  export let onResizeSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    deltaRatio: number,
    mode: 'local' | 'proportional'
  ) => void;
  export let onCollapseSplit: (splitId: string, removeChildIndex: 0 | 1) => void;
  export let onCollapseSplitBoundary: (rootSplitId: string, boundaryIndex: number, removeSide: 'start' | 'end') => void;
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
    windowId?: string;
    anchor: { x: number; y: number };
    horizontalEdge?: 'left' | 'right' | null;
    verticalEdge?: 'top' | 'bottom' | null;
    source?: 'edge' | 'corner';
    neutralThreshold?: number;
    creationThreshold?: number;
  }) => void;
  export let onUpdateBoundaryPull: (pointer: { x: number; y: number }, viewport: { width: number; height: number }) => void;
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
  export let onStartPanelDrag: (panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void;
  export let onUpdatePanelDrag: (pointer: { x: number; y: number }, hoveredTarget: LayoutDockTarget | null) => void;
  export let onCommitPanelDock: () => void;
  export let onSetFullscreenPanel: (panelId: string | null) => void = () => {};
  export let onBeginAppHistoryTransaction: () => void = () => {};
  export let onCommitAppHistoryTransaction: () => void = () => {};
  export let onCancelAppHistoryTransaction: () => void = () => {};
  export let onBeginCoreHistoryTransaction: () => void = () => {};
  export let onCommitCoreHistoryTransaction: () => void = () => {};
  export let onCancelCoreHistoryTransaction: () => void = () => {};
  export let onDetachPanelToWindow: (panelId: string) => void = () => {};
  export let onSetDesignSystemThemeSession: (session: DesignSystemThemeSession | null) => void = () => {};
  export let onLoadRuntimeProjection: (projectionKind: string, sourceFile: string) => Promise<unknown> | unknown = () => null;
  export let shortcutGroups: Array<{
    key: string;
    label: string;
    items: Array<{
      id: string;
      key: string;
      label: string;
      type: ShellShortcutType;
      description?: string;
      scopeLabel: string;
      priorityLabel: string;
    }>;
  }> = [];
  export let totalShortcuts = 0;
  export let filteredShortcuts = 0;
  export let shortcutQuery = '';
  export let shortcutScopeFilter: ShellShortcutScopeFilter = 'all';
  export let shortcutTypeFilter: ShellShortcutTypeFilter = 'all';
  export let shortcutScopeFilters: Array<{ key: ShellShortcutScopeFilter; label: string }> = [];
  export let shortcutTypeFilters: Array<{ key: ShellShortcutTypeFilter; label: string }> = [];
  export let onShortcutQueryChange: (value: string) => void = () => {};
  export let onSelectShortcutScopeFilter: (value: ShellShortcutScopeFilter) => void = () => {};
  export let onSelectShortcutTypeFilter: (value: ShellShortcutTypeFilter) => void = () => {};
  export let layoutEditingEnabled = false;
  export let appliedLayoutEditOptionStatuses: LayoutOptionStatuses = {};

  $: isWorkspaceRoute = activeShellRoute === 'workspace';
  $: isForgeRoute = activeShellRoute === 'lab';
  $: effectiveLayoutEditingEnabled = isForgeRoute || layoutEditingEnabled;
  $: showBoundaryResizeUi = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.boundaryResize?.enabled);
  $: showBoundaryPullUi = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.boundaryPull?.enabled);
  $: showIntersectionResizeUi = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.intersectionResize?.enabled);
  $: showPanelHeaderUi = isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.panelHeaderUi?.enabled);
  $: showPanelToolSelectorUi =
    isWorkspaceRoute || isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.panelToolSelectorUi?.enabled);
  $: showPanelActionMenuUi = isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.panelActionMenuUi?.enabled);
  $: dockToggleButtonsVisible = isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.dockToggleButtonsVisible?.enabled);
  $: showResizeSnapHelpers = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.resizeSnap?.enabled);
  $: showDeleteZoneHelpers = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.deleteZones?.enabled);
  $: showDockPreviewHelpers = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.dockPreview?.enabled);
  $: showPanelLayoutMenuActions = isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.panelLayoutMenu?.enabled);
  $: showPanelToggleHeaderAction = isForgeRoute || Boolean(appliedLayoutEditOptionStatuses.panelToggleHeader?.enabled);
  $: showPanelSplitVerticalAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.panelSplitVertical?.enabled);
  $: showPanelSplitHorizontalAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.panelSplitHorizontal?.enabled);
  $: showPanelJoinAreasAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.panelJoinAreas?.enabled);
  $: showPanelSwapAreasAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.panelSwapAreas?.enabled);
  $: showToggleFullscreenAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.toggleFullscreen?.enabled);
  $: showClosePanelAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.closePanel?.enabled);
  $: showMovePanelAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.movePanel?.enabled);
  $: showDockAsTabAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.dockAsTab?.enabled);
  $: showDockToSideAction = !isForgeRoute && Boolean(appliedLayoutEditOptionStatuses.dockToSide?.enabled);
  $: workspaceLayoutSurfaceProjection = createWorkspaceLayoutSurfaceProjection(
    workspace,
    renderedWindowId ?? workspace.activeWindowId
  );

  function dispatchWorkspaceCommandFromLayout(command: WorkspaceCommand): void {
    const routed = routeWorkspaceCommand(command);

    if (routed) {
      return;
    }

    dispatchCommand(command);
  }

  function resizeSplitBoundaryFromLayout(
    rootSplitId: string,
    boundaryIndex: number,
    deltaRatio: number,
    mode: 'local' | 'proportional'
  ): void {
    const routed = dispatchWorkspaceLayoutIntent(
      {
        kind: 'resize',
        surfaceId: workspaceLayoutSurfaceProjection.id,
        targetId: `${workspaceLayoutSurfaceProjection.id}:boundary:${rootSplitId}`,
        metadata: {
          boundaryIndex,
          deltaRatio,
          mode
        }
      },
      'core'
    );

    if (!routed) {
      onResizeSplitBoundary(rootSplitId, boundaryIndex, deltaRatio, mode);
    }
  }

  function collapseSplitBoundaryFromLayout(
    rootSplitId: string,
    boundaryIndex: number,
    removeSide: 'start' | 'end'
  ): void {
    const routed = dispatchWorkspaceLayoutIntent(
      {
        kind: 'collapse',
        surfaceId: workspaceLayoutSurfaceProjection.id,
        targetId: `${workspaceLayoutSurfaceProjection.id}:boundary:${rootSplitId}`,
        metadata: {
          boundaryIndex,
          removeSide
        }
      },
      'core'
    );

    if (!routed) {
      onCollapseSplitBoundary(rootSplitId, boundaryIndex, removeSide);
    }
  }

  function routeWorkspaceCommand(command: WorkspaceCommand): boolean {
    switch (command.type) {
      case 'activate-tab':
        return dispatchWorkspacePanelIntent(command.panelId, 'activate', 'app');
      case 'focus-panel':
        return dispatchWorkspacePanelIntent(command.panelId, 'activate', 'app');
      case 'close-panel':
        return dispatchWorkspacePanelIntent(command.panelId, 'close', 'app');
      case 'close-active-panel':
        return focus.activePanelId ? dispatchWorkspacePanelIntent(focus.activePanelId, 'close', 'app') : false;
      case 'split-panel-horizontal':
        return focus.activePanelId
          ? dispatchWorkspacePanelIntent(focus.activePanelId, 'split', 'app', {
              orientation: 'horizontal',
              side: 'right'
            })
          : false;
      case 'split-panel-vertical':
        return focus.activePanelId
          ? dispatchWorkspacePanelIntent(focus.activePanelId, 'split', 'app', {
              orientation: 'vertical',
              side: 'bottom'
            })
          : false;
      case 'split-panel-to-side':
        return dispatchWorkspacePanelIntent(command.panelId ?? focus.activePanelId, 'split', 'app', {
          orientation: command.orientation,
          side: command.side
        });
      default:
        return false;
    }
  }

  function dispatchWorkspacePanelIntent(
    panelId: string | null,
    kind: LayoutUserActionIntent['kind'],
    historyScope: 'none' | 'app' | 'core' | 'both',
    options: {
      orientation?: 'horizontal' | 'vertical';
      side?: LayoutDockSide;
      metadata?: LayoutUserActionIntent['metadata'];
    } = {}
  ): boolean {
    if (!panelId) {
      return false;
    }

    return dispatchWorkspaceLayoutIntent(
      {
        kind,
        surfaceId: workspaceLayoutSurfaceProjection.id,
        targetId: `${workspaceLayoutSurfaceProjection.id}:area:${panelId}`,
        ...(options.orientation ? { orientation: options.orientation } : {}),
        ...(options.side ? { side: options.side } : {}),
        ...(options.metadata ? { metadata: options.metadata } : {})
      },
      historyScope
    );
  }

  function dispatchWorkspaceLayoutIntent(
    intent: LayoutUserActionIntent,
    historyScope: 'none' | 'app' | 'core' | 'both'
  ): boolean {
    if (!onApplyWorkspaceSession) {
      return false;
    }

    const result = dispatchLayoutSurfaceIntent({
      state: {
        workspaceSession: createWorkspaceSessionState(workspace, focus)
      },
      projection: workspaceLayoutSurfaceProjection,
      intent
    });

    if (!result.handled || !result.state.workspaceSession) {
      return false;
    }

    onApplyWorkspaceSession(result.state.workspaceSession, historyScope);
    return true;
  }
</script>

{#if activeShellRoute === 'docs'}
  {#if featureDocumentation === null}
    <p role="status">{$i18nT('ui.shell.footer.docs.unavailable', { default: 'This application has not provided a feature documentation catalog.' })}</p>
  {/if}
  <TechnicalDocsView
    {themeDocument}
    reports={technicalDocsReports}
    datasetLoader={technicalDocsDatasetLoader}
    featureDocs={featureDocumentation?.features ?? []}
    ruleEntries={featureDocumentation?.rules ?? []}
    testEntries={featureDocumentation?.tests ?? []}
    viewMode="docs"
    {designSystemDiscoveryProjection}
    {runtimeSnapshot}
    {designSystemThemeSession}
    {onLoadRuntimeProjection}
    onDesignSystemThemeSessionChange={onSetDesignSystemThemeSession}
    {shortcutGroups}
    {totalShortcuts}
    {filteredShortcuts}
    {shortcutQuery}
    {shortcutScopeFilter}
    {shortcutTypeFilter}
    {shortcutScopeFilters}
    {shortcutTypeFilters}
    {onShortcutQueryChange}
    {onSelectShortcutScopeFilter}
    {onSelectShortcutTypeFilter}
  />
{:else}
  {#key `${activeShellRoute}:${workspace.id}`}
    <WorkspaceView
      {workspace}
      {focus}
      {registry}
      dispatchCommand={dispatchWorkspaceCommandFromLayout}
      {onResizeSplit}
      onResizeSplitBoundary={resizeSplitBoundaryFromLayout}
      {onCollapseSplit}
      onCollapseSplitBoundary={collapseSplitBoundaryFromLayout}
      {toolRuntimeHost}
      {toolRuntimeUi}
      {layoutInteraction}
      windowId={renderedWindowId}
      onOpenSplitMenu={onOpenLayoutSplitMenu}
      onSelectLayoutMenuAction={onSelectLayoutMenuAction}
      onHoverSplitSide={onHoverLayoutSplitSide}
      onConfirmSplitSide={onConfirmLayoutSplitSide}
      onUpdateLayoutSplitPreview={onUpdateLayoutSplitPreview}
      onAdjustLayoutSplitPreviewCuts={onAdjustLayoutSplitPreviewCuts}
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
      onSetFullscreenPanelId={onSetFullscreenPanel}
      {onBeginAppHistoryTransaction}
      {onCommitAppHistoryTransaction}
      {onCancelAppHistoryTransaction}
      {onBeginCoreHistoryTransaction}
      {onCommitCoreHistoryTransaction}
      {onCancelCoreHistoryTransaction}
      layoutEditingEnabled={effectiveLayoutEditingEnabled}
      {showBoundaryResizeUi}
      {showBoundaryPullUi}
      {showIntersectionResizeUi}
      {showPanelHeaderUi}
      {showPanelToolSelectorUi}
      {showPanelActionMenuUi}
      {dockToggleButtonsVisible}
      {showResizeSnapHelpers}
      {showDeleteZoneHelpers}
      {showDockPreviewHelpers}
      {showPanelLayoutMenuActions}
      {showPanelToggleHeaderAction}
      {showPanelSplitVerticalAction}
      {showPanelSplitHorizontalAction}
      {showPanelJoinAreasAction}
      {showPanelSwapAreasAction}
      {showToggleFullscreenAction}
      {showClosePanelAction}
      {showMovePanelAction}
      {showDockAsTabAction}
      {showDockToSideAction}
    />
  {/key}
{/if}
