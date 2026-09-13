<script lang="ts">
  import { resolveWorkspaceResizeHoverBoundary } from './workspaceResizeHoverProjection';
  import type { WorkspaceResizeHoverState } from './workspaceActiveRegionTypes';
  import { onDestroy, onMount, tick } from 'svelte';
  import type {
    InMemoryToolRegistry,
    LayoutNode,
    LayoutDockTarget,
    LayoutDockSide,
    LayoutEdge,
    LayoutInteractionState,
    LayoutMenuActionId,
    LayoutMenuActionSelection,
    LayoutMenuTarget,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import {
    createWorkspaceEdgeDockTarget,
    canJoinPanelArea,
    canSwapPanelArea,
    findStackInWorkspace,
    findPanelInWorkspace,
    getLayoutMenuActions,
    getSubdivisionPreview
  } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import { useWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';
  import { useWorkspaceInteractionHintsContext } from '../debug/workspaceInteractionHints';
  import { WorkspaceActiveWindowRegion, WorkspaceWindowInteractionBridge } from './workspaceViewRegions';
  import type {
    WorkspaceActiveOverlayProps,
    WorkspaceActiveSurfaceProps,
    WorkspaceToolRuntimeUiStateMap
  } from './workspaceActiveRegionTypes';
  import { buildSplitGuideStyle, flattenSplitChain, type FlattenedSplitHandle } from './splitChain';
  import {
    resolveResizePreviewDriver,
    resolveResizeMagnetSnapFromBoundaries,
    type ResizeDeletePreview
  } from './resizeBoundaryPreview';
  import {
    createResizeGestureSession,
    updateResizeGestureSession,
    type ResizeGestureSessionState
  } from './resizeGestureEngine';
  import {
    findVisibleResizeBoundaryBySplitId,
    isVisibleIntersectionOnResizeBoundary,
    resolveVisibleResizeBoundaryLineGeometry,
    resolveVisibleSplitGeometryElement,
    resolveVisibleWorkspaceCornerPositions,
    resolveVisibleResizePreviewLineRect,
    resolveVisibleResizeBoundaries,
    resolveVisibleResizeBoundaryFromPointer,
    resolveVisibleSplitContentAxisSizePx,
    resolveVisibleEdgeIntersectionTargets,
    resolveVisibleResizeIntersectionTargets,
    type VisibleEdgeIntersectionTarget,
    type VisibleLayoutViewportRect,
    type VisibleResizeBoundaryHandle,
    type VisibleResizeIntersectionTarget
  } from './visibleLayoutProjection';
  import {
    clampWorkspaceSplitSegmentIndex,
    isWorkspaceLayoutMenuTargetEligible,
    resolveDefaultWorkspaceLayoutMenuTargetId,
    resolveSelectableWorkspaceLayoutMenuTargets,
    resolveWorkspaceLayoutEdgeProjectedTargetId,
    resolveWorkspaceLayoutActionTargetPanelIds,
    resolveWorkspaceLayoutMenuTargetIdAtPoint,
    resolveWorkspaceLayoutRectFromPanelRects,
    toPendingWorkspaceLayoutMenuAction,
    type PendingWorkspaceLayoutMenuAction
  } from './workspaceLayoutMenuModel';
  import {
    createPreviewWorkspaceLayoutMenuTarget,
    resolveWorkspacePanelMenuBoundaryCandidates
  } from './workspaceLayoutMenuController';
  import {
    resolveWorkspaceLayoutMenuCommit,
    resolveWorkspaceLayoutMenuDraftForInitialAction,
    resolveWorkspaceLayoutMenuState,
    resolveWorkspaceLayoutMenuTargets
  } from './workspaceLayoutMenuSession';
  import {
    isTabStripDockTarget,
    resolveDockTabInsertionIndex,
    resolveDockTabIndicatorRect as resolveDockTabIndicatorModelRect,
    resolveStackDockTargetAtPointer,
    resolveStackDockPreviewRect,
    resolveWorkspaceEdgeDockPreviewRect,
    resolveWorkspaceEdgeDockSide
  } from './workspaceDockModel';
  import {
    isWorkspacePreviewPointInsideRect,
    resolveWorkspaceSplitPreviewTargetPanelId,
    resolveWorkspaceSplitPreviewUpdate
  } from './workspaceSplitPreviewModel';
  import {
    resolveWorkspaceIntersectionPreviewHandle,
    resolveWorkspaceIntersectionPreviewLines,
    resolveWorkspaceIntersectionResizePreviewSizes
  } from './workspaceIntersectionPreviewModel';
  import {
    isWorkspaceEdgeIntersectionDebugHighlighted,
    isWorkspaceEdgeIntersectionLinkedToHoveredResize,
    isWorkspaceResizeIntersectionDebugHighlighted,
    isWorkspaceResizeIntersectionLinkedToHoveredResize,
    type WorkspaceIntersectionGeometry
  } from './workspaceIntersectionHighlightModel';
  import {
    resolveWorkspaceEdgeIntersectionCursor,
    resolveWorkspaceEdgeIntersectionResizeBoundary
  } from './workspaceEdgeIntersectionResizeModel';
  import {
    resolveWorkspaceIntersectionResizeAxisStarts,
    resolveWorkspaceIntersectionResizeDimensions,
    resolveWorkspaceIntersectionResizeSnappedPointer,
    updateWorkspaceIntersectionResizeSession,
    type WorkspaceIntersectionResizeSession
  } from './workspaceIntersectionResizeModel';
  import {
    collectWorkspaceIntersectionSplitSnapshots,
    findWorkspaceSplitById
  } from './workspaceIntersectionSnapshotModel';
  import {
    resolveMeasuredDeleteZoneMaxSizePx,
    resolveMeasuredStackChromeHeight,
    resolveResizeDeleteZoneMinRatio,
    resolveResizeIntersectionHandleSizePx,
    resolveTokenBasedDeleteZoneMaxSizePx
  } from './workspaceNodeResizeMetrics';
  import {
    applyWorkspaceNodeResizePreviewGesture,
    createWorkspaceNodeResizeDragSessionFromDriver,
    createWorkspaceNodeResizeDragStartState,
    createWorkspaceSplitResizeCommitState,
    resolveWorkspaceNodeResizeDeletePreview,
    resolveWorkspaceSplitResizeReleaseDecision,
    resolveWorkspaceSplitResizeCommitState,
    updateWorkspaceNodeResizeDragSession,
    type WorkspaceSplitResizeCommitState,
    type WorkspaceNodeResizeDragSession
  } from './workspaceNodeResizeController';
  import { resolveWorkspaceNodeResizeHandleMenu } from './workspaceNodeResizeActions';
  import {
    resolveWorkspaceBoundaryCornerVisualState,
    resolveWorkspaceBoundaryEdgeVisualState,
    resolveWorkspaceBoundaryPullPreview,
    type WorkspaceBoundaryCorner,
    type WorkspaceBoundaryPullState,
    type WorkspaceBoundaryVisualState
  } from './workspaceBoundaryPullPreviewModel';
  import {
    resolveWorkspaceFullscreenViewportRect as resolveWorkspaceFullscreenViewportDomRect,
    resolveLocalWorkspaceViewportRect as resolveLocalWorkspaceViewportDomRect,
    resolveWorkspaceInnerClientBounds,
    resolveWorkspacePanelRect,
    resolveWorkspaceViewportRect as resolveWorkspaceDomViewportRect
  } from './workspaceDomGeometry';
  import {
    createWorkspaceFullscreenBoundaryController,
    type WorkspaceFullscreenBoundaryPhase
  } from './workspaceFullscreenBoundaryController';
  import {
    resolveWorkspaceFullscreenPanelSync,
    resolveWorkspaceFullscreenStackId,
    shouldClearMissingWorkspaceFullscreenStack
  } from './workspaceFullscreenState';
  import {
    createWorkspaceActiveRootSnapshot,
    resolveWorkspaceActiveRootTransition
  } from './workspaceActiveRootState';
  import { createWorkspaceLayoutGeometryObserver } from './workspaceLayoutGeometryObserver';
  import {
    resolveWorkspaceWindowContextMenuAction,
    resolveWorkspaceWindowKeyDownAction,
    resolveWorkspaceWindowPointerUpAction
  } from './workspaceWindowInteractionModel';

  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let windowId: string | null = null;
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
  export let onCollapseSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    removeSide: 'start' | 'end'
  ) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: WorkspaceToolRuntimeUiStateMap = {};
  export let layoutInteraction: LayoutInteractionState;
  export let onOpenSplitMenu: (
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
  export let onHoverSplitSide: (side: LayoutDockSide | null) => void;
  export let onConfirmSplitSide: (side: LayoutDockSide) => void;
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
    orientation: 'vertical' | 'horizontal',
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
  export let onDetachPanelToWindow: (panelId: string) => void = () => {};
  export let onBeginAppHistoryTransaction: () => void = () => {};
  export let onCommitAppHistoryTransaction: () => void = () => {};
  export let onCancelAppHistoryTransaction: () => void = () => {};
  export let onBeginCoreHistoryTransaction: () => void = () => {};
  export let onCommitCoreHistoryTransaction: () => void = () => {};
  export let onCancelCoreHistoryTransaction: () => void = () => {};
  export let layoutEditingEnabled = true;
  export let showBoundaryResizeUi = true;
  export let showBoundaryPullUi = true;
  export let showIntersectionResizeUi = true;
  export let showPanelHeaderUi = true;
  export let showPanelToolSelectorUi = true;
  export let showPanelActionMenuUi = true;
  export let showResizeSnapHelpers = true;
  export let showDeleteZoneHelpers = true;
  export let showDockPreviewHelpers = true;
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
  export let showDockAsTabAction = true;
  export let showDockToSideAction = true;
  export let onSetFullscreenPanelId: (panelId: string | null) => void = () => {};
  const i18nT = getWorkbenchTranslator();
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const workspaceInteractionHints = useWorkspaceInteractionHintsContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;
  const hoveredResizeSplitStore = workspaceDebugHover.hoveredResizeSplitId;

  type PendingMenuAction = PendingWorkspaceLayoutMenuAction;

  let activeMenuTargetId: string | null = null;
  let menuTargetRects: Array<{ targetId: string; left: number; top: number; width: number; height: number }> = [];
  let intersectionMagnetKeys = new Set<string>();

  $: activeWindow =
    (windowId ? workspace.windows.find((window) => window.id === windowId) : null) ??
    workspace.windows.find((window) => window.id === workspace.activeWindowId) ??
    workspace.windows[0];
  $: splitPreview =
    layoutInteraction.mode === 'split-preview'
      ? getSubdivisionPreview(
          layoutInteraction.orientation,
          layoutInteraction.edge,
          layoutInteraction.cuts,
          layoutInteraction.pointerRatio
        )
      : null;
  $: menuTargets = resolveWorkspaceLayoutMenuTargets({
    interaction: layoutInteraction,
    activeRoot: activeWindow?.root ?? null
  });
  $: if (layoutInteraction.mode !== 'split-menu') {
    pendingMenuAction = null;
    pendingMenuCuts = 1;
    selectedMenuTargetId = null;
    hoveredMenuTargetId = null;
    hoveredMenuSplitSegmentIndex = null;
  }
  $: if (layoutInteraction.mode === 'split-menu' && !pendingMenuAction && layoutInteraction.initialActionId) {
    const draft = resolveWorkspaceLayoutMenuDraftForInitialAction({
      currentDraft: {
        pendingAction: pendingMenuAction,
        cuts: pendingMenuCuts,
        selectedTargetId: selectedMenuTargetId,
        hoveredTargetId: hoveredMenuTargetId,
        hoveredSplitSegmentIndex: hoveredMenuSplitSegmentIndex
      },
      interaction: layoutInteraction,
      resolveAction: toPendingWorkspaceLayoutMenuAction,
      resolveSelectableTargets: (action) => resolveSelectableMenuTargets(menuTargets, action),
      resolveDefaultTargetId: resolveDefaultMenuTargetId
    });

    pendingMenuAction = draft.pendingAction;
    pendingMenuCuts = draft.cuts;
    selectedMenuTargetId = draft.selectedTargetId;
    hoveredMenuTargetId = draft.hoveredTargetId;
    hoveredMenuSplitSegmentIndex = draft.hoveredSplitSegmentIndex;
  }
  $: menuActions =
    layoutInteraction.mode === 'split-menu'
      ? getLayoutMenuActions({
          edge: layoutInteraction.edge,
          panelId: layoutInteraction.panelId,
          targets: layoutInteraction.targets,
          joinEnabled: menuTargets.some((target) =>
            canJoinPanelArea(workspace, {
              panelId: target.panelId,
              edge: target.edge
            })
          ),
          swapAreasEnabled: menuTargets.some((target) =>
            canSwapPanelArea(workspace, {
              panelId: target.panelId,
              edge: target.edge
            })
          )
        })
      : [];
  $: selectableMenuTargets =
    pendingMenuAction === null ? [] : resolveSelectableMenuTargets(menuTargets, pendingMenuAction);
  $: if (
    layoutInteraction.mode === 'split-menu' &&
    pendingMenuAction &&
    !selectableMenuTargets.some((target) => target.id === selectedMenuTargetId)
  ) {
    selectedMenuTargetId = selectableMenuTargets[0]?.id ?? null;
  }
  $: if (layoutInteraction.mode !== 'split-preview') {
    previewPanelRect = null;
  }
  $: {
    const action = pendingMenuAction;
    menuTargetRects =
    layoutInteraction.mode === 'split-menu' && rootElement && action
      ? withLayoutGeometry(layoutGeometryVersion,
        selectableMenuTargets
          .map((target) =>
            resolveMenuTargetRect(
              target,
              resolveWorkspaceLayoutActionTargetPanelIds(
                target,
                action.kind,
                layoutInteraction.mode === 'split-menu' ? layoutInteraction.source : null
              )
            )
          )
          .filter(
            (
              value
            ): value is { targetId: string; left: number; top: number; width: number; height: number } =>
              !!value
          ))
      : [];
  }
  $: resolvedMenuState = resolveWorkspaceLayoutMenuState({
    draft: {
      pendingAction: pendingMenuAction,
      cuts: pendingMenuCuts,
      selectedTargetId: selectedMenuTargetId,
      hoveredTargetId: hoveredMenuTargetId,
      hoveredSplitSegmentIndex: hoveredMenuSplitSegmentIndex
    },
    selectableTargets: selectableMenuTargets
  });
  $: activeMenuTargetId = resolvedMenuState.activeTargetId;
  $: activeMenuSplitSegmentIndex = resolvedMenuState.activeSplitSegmentIndex;
  $: selectedMenuTarget = resolvedMenuState.selectedTarget;
  $: menuSplitPreview = resolvedMenuState.splitPreview;
  $: menuPreviewPanelRect =
    layoutInteraction.mode === 'split-menu' && selectedMenuTarget
      ? withLayoutGeometry(layoutGeometryVersion, resolvePanelRect(selectedMenuTarget.panelId))
      : null;
  $: joinSourcePreviewRect =
    layoutInteraction.mode === 'split-menu' && pendingMenuAction?.kind === 'join' && selectedMenuTarget
      ? withLayoutGeometry(layoutGeometryVersion,
        resolveRectFromPanelIds(
          layoutInteraction.source === 'panel-menu'
            ? selectedMenuTarget.areaPanelIds
            : selectedMenuTarget.joinSiblingPanelIds
        ))
      : null;
  $: joinDestinationPreviewRect =
    layoutInteraction.mode === 'split-menu' && pendingMenuAction?.kind === 'join' && selectedMenuTarget
      ? withLayoutGeometry(layoutGeometryVersion,
        resolveRectFromPanelIds(
          layoutInteraction.source === 'panel-menu'
            ? selectedMenuTarget.joinSiblingPanelIds
            : selectedMenuTarget.areaPanelIds
        ))
      : null;
  $: swapSiblingPreviewRect =
    layoutInteraction.mode === 'split-menu' && pendingMenuAction?.kind === 'swap' && selectedMenuTarget
      ? withLayoutGeometry(layoutGeometryVersion,
        resolveRectFromPanelIds(
          layoutInteraction.source === 'panel-menu'
            ? selectedMenuTarget.areaPanelIds
            : selectedMenuTarget.swapSiblingPanelIds
        ))
      : null;
  $: dragPanel =
    layoutInteraction.mode === 'drag-panel'
      ? (findPanelInWorkspace(workspace, layoutInteraction.panelId) ?? null)
      : null;
  $: draggingPanelId = layoutInteraction.mode === 'drag-panel' ? layoutInteraction.panelId : null;
  $: dragGhostStyle =
    layoutInteraction.mode === 'drag-panel'
      ? `left:${layoutInteraction.pointer.x + 16}px;top:${layoutInteraction.pointer.y + 16}px;`
      : '';
  $: dragPreviewRect =
    layoutInteraction.mode === 'drag-panel' &&
    layoutInteraction.hoveredTarget &&
    !isTabStripDockTarget(layoutInteraction.hoveredTarget)
      ? resolveDockPreviewRect(layoutInteraction.hoveredTarget)
      : null;
  $: dragPreviewTabIndicatorRect =
    layoutInteraction.mode === 'drag-panel' && layoutInteraction.hoveredTarget?.kind === 'stack'
      ? resolveDockTabIndicatorRect(layoutInteraction.hoveredTarget)
      : null;
  $: dragPreviewPlacement =
    layoutInteraction.mode === 'drag-panel' && layoutInteraction.hoveredTarget?.kind === 'stack'
      ? layoutInteraction.hoveredTarget.placement
      : null;
  $: fullscreenViewportRect = rootElement
    ? withLayoutGeometry(layoutGeometryVersion, resolveWorkspaceFullscreenViewportRect())
    : null;
  $: fullscreenViewportStyle = fullscreenViewportRect
    ? `left:${fullscreenViewportRect.left}px;top:${fullscreenViewportRect.top}px;width:${fullscreenViewportRect.width}px;height:${fullscreenViewportRect.height}px;`
    : '';
  $: boundaryEditingEnabled = layoutEditingEnabled && fullscreenStackId === null;
  $: boundaryHandlesRendered =
    (showBoundaryPullUi || showIntersectionResizeUi) &&
    (boundaryEditingEnabled ||
      fullscreenBoundaryPhase === 'fading-out' ||
      fullscreenBoundaryPhase === 'fading-in');
  $: localViewportRect = rootElement ? withLayoutGeometry(layoutGeometryVersion, resolveLocalWorkspaceViewportRect()) : null;
  $: rootSplitChain = activeWindow?.root.kind === 'split' ? flattenSplitChain(activeWindow.root) : null;
  $: if (!rootSplitChain) {
    rootResizeDeletePreview = null;
    rootResizeDragSession = null;
    rootResizeCommitState = createWorkspaceSplitResizeCommitState();
  }
  $: boundaryPreview =
    layoutInteraction.mode === 'boundary-pull' && localViewportRect
      ? resolveBoundaryPullPreview(layoutInteraction, localViewportRect)
      : null;
  $: intersectionTargets =
    layoutEditingEnabled && rootElement
      ? withLayoutGeometry(layoutGeometryVersion, resolveIntersectionTargets(visibleResizeBoundaries))
      : [];
  $: edgeIntersectionTargets =
    boundaryEditingEnabled && rootElement
      ? withLayoutGeometry(layoutGeometryVersion,
        resolveEdgeIntersectionTargets(visibleResizeBoundaries, intersectionTargets))
      : [];
  $: workspaceCornerPositions = rootElement
    ? withLayoutGeometry(layoutGeometryVersion, resolveVisibleWorkspaceCornerPositions(rootElement, EDGE_SPLIT_LINE_OFFSET_PX))
    : null;
  $: intersectionPreview =
    layoutInteraction.mode === 'intersection-resize'
      ? resolveIntersectionPreview(layoutInteraction, intersectionResizeSession)
      : null;
  $: activeIntersectionPreviewHandle =
    layoutInteraction.mode === 'intersection-resize' &&
    intersectionPreview?.columnLine &&
    intersectionPreview?.rowLine
      ? resolveWorkspaceIntersectionPreviewHandle({
          columnLine: intersectionPreview.columnLine,
          rowLine: intersectionPreview.rowLine,
          size: resolveIntersectionHandleSizePx()
        })
      : null;
  $: intersectionMagnetKeys = new Set(
    intersectionResizeSession
      ? [
          intersectionResizeSession.columnGesture.magnetKey,
          intersectionResizeSession.rowGesture.magnetKey
        ].filter((value): value is string => !!value)
      : []
  );
  $: debugHoverTarget = $debugHoverStore;
  $: hoveredResizeSplitId = $hoveredResizeSplitStore;
  $: {
    const activeHoveredResizeLine = hoveredResizeLine;
    const activeHoveredResizeSplitId = hoveredResizeSplitId;

    linkedResizeIntersectionIds = new Set(
      intersectionTargets
        .filter((target) =>
          isWorkspaceResizeIntersectionLinkedToHoveredResize({
            target,
            activeHoveredResizeLine,
            activeHoveredResizeSplitId,
            isIntersectionOnVisibleResizeLine,
            isIntersectionOnHoveredResizeLine
          })
        )
        .map((target) => target.id)
    );
  }
  $: previewSourceToolIcon =
    (layoutInteraction.mode === 'split-menu' || layoutInteraction.mode === 'split-preview') &&
    layoutInteraction.panelId
      ? (() => {
          const panel = findPanelInWorkspace(workspace, layoutInteraction.panelId);
          const toolInstance = panel?.toolInstanceId ? workspace.toolInstances[panel.toolInstanceId] : null;
          const toolEntry = toolInstance ? registry.get(toolInstance.toolId) : null;
          return toolEntry?.definition.icon ?? null;
        })()
      : null;
  $: {
    const activeHoveredResizeLine = hoveredResizeLine;
    const activeDebugHoverTarget = debugHoverTarget;

    debugResizeIntersectionIds = new Set(
      intersectionTargets
        .filter((target) =>
          isWorkspaceResizeIntersectionDebugHighlighted({
            target,
            activeHoveredResizeLine,
            activeDebugHoverTarget,
            isIntersectionOnVisibleResizeLine
          })
        )
        .map((target) => target.id)
    );
  }
  $: {
    const activeHoveredResizeLine = hoveredResizeLine;
    const activeHoveredResizeSplitId = hoveredResizeSplitId;

    linkedEdgeIntersectionIds = new Set(
      edgeIntersectionTargets
        .filter((target) =>
          isWorkspaceEdgeIntersectionLinkedToHoveredResize({
            target,
            activeHoveredResizeLine,
            activeHoveredResizeSplitId,
            isIntersectionOnVisibleResizeLine,
            isIntersectionOnHoveredResizeLine
          })
        )
        .map((target) => target.id)
    );
  }
  $: {
    const activeHoveredResizeLine = hoveredResizeLine;
    const activeDebugHoverTarget = debugHoverTarget;

    debugEdgeIntersectionIds = new Set(
      edgeIntersectionTargets
        .filter((target) =>
          isWorkspaceEdgeIntersectionDebugHighlighted({
            target,
            activeHoveredResizeLine,
            activeDebugHoverTarget,
            isIntersectionOnVisibleResizeLine
          })
        )
        .map((target) => target.id)
    );
  }

  let rootElement: HTMLDivElement | null = null;
  let rootSplitElement: HTMLDivElement | null = null;
  let activeSurfaceProps: WorkspaceActiveSurfaceProps | null = null;
  let activeOverlayProps: WorkspaceActiveOverlayProps | null = null;
  let previewPanelRect: { left: number; top: number; width: number; height: number } | null = null;
  let pendingMenuAction: PendingMenuAction | null = null;
  let pendingMenuCuts = 1;
  let selectedMenuTargetId: string | null = null;
  let hoveredMenuTargetId: string | null = null;
  let hoveredMenuSplitSegmentIndex: number | null = null;
  let layoutGeometryVersion = 0;
  let activeRootSnapshot = createWorkspaceActiveRootSnapshot();
  let layoutMutationCleanupPromise: Promise<void> | null = null;
  let fullscreenStackId: string | null = resolveWorkspaceFullscreenStackId(workspace);
  let previousPersistedFullscreenStackId: string | null = fullscreenStackId;
  let fullscreenBoundaryPhase: WorkspaceFullscreenBoundaryPhase = 'visible';
  let hoveredResizeLine: VisibleResizeBoundaryHandle | null = null;
  let visibleResizeBoundaries: VisibleResizeBoundaryHandle[] = [];
  let linkedResizeIntersectionIds = new Set<string>();
  let debugResizeIntersectionIds = new Set<string>();
  let linkedEdgeIntersectionIds = new Set<string>();
  let debugEdgeIntersectionIds = new Set<string>();

  const BOUNDARY_PULL_NEUTRAL_THRESHOLD = 20;
  const BOUNDARY_PULL_CREATION_THRESHOLD = 72;
  const INTERSECTION_HANDLE_BASE_SIZE = 15;
  const EDGE_SPLIT_LINE_OFFSET_PX = 2;
  const INTERSECTION_MAGNETISM_DISTANCE_PX = 18;
  const RESIZE_MAGNET_THRESHOLD_PX = 14;
  const RESIZE_HOVER_SNAP_PX = 6;
  const RESIZE_HOVER_SPAN_PX = 8;
  const ROOT_DELETE_ZONE_THRESHOLD_PX = 36;
  const ROOT_DELETE_ZONE_APPROACH_THRESHOLD_PX = 20;
  const ROOT_DELETE_ZONE_MIN_SIZE_PX = 32;
  let canceledRootResizeSplitId: string | null = null;
  let rootResizeDragSession: WorkspaceNodeResizeDragSession | null = null;
  let rootResizeCommitState: WorkspaceSplitResizeCommitState = createWorkspaceSplitResizeCommitState();

  let rootResizeDeletePreview: ResizeDeletePreview | null = null;
  const layoutGeometryObserver = createWorkspaceLayoutGeometryObserver({
    onResize: () => {
      layoutGeometryVersion += 1;
    },
    onMutation: () => {
      refreshLayoutGeometryObservers();
      layoutGeometryVersion += 1;
    }
  });
  const fullscreenBoundaryController = createWorkspaceFullscreenBoundaryController();

  $: visibleResizeBoundaries = rootElement
    ? withLayoutGeometry(layoutGeometryVersion, resolveVisibleResizeBoundaries(rootElement))
    : [];

  type IntersectionTarget = VisibleResizeIntersectionTarget;
  type EdgeIntersectionTarget = VisibleEdgeIntersectionTarget;

  let intersectionResizeSession: WorkspaceIntersectionResizeSession | null = null;
  let edgeIntersectionDragSession:
    | {
        kind: 'pending';
        pointerId: number;
        target: EdgeIntersectionTarget;
        anchor: { x: number; y: number };
      }
    | {
        kind: 'resize';
        pointerId: number;
        target: EdgeIntersectionTarget;
        anchor: { x: number; y: number };
        boundary: VisibleResizeBoundaryHandle;
        gesture: ResizeGestureSessionState;
      }
    | null = null;
  let edgeIntersectionResizePreviewLine:
    | ({ left: number; top: number; width: number; height: number } & { snapped: boolean })
    | null = null;
  $: suspendHeaderHover =
    layoutInteraction.mode === 'boundary-pull' ||
    layoutInteraction.mode === 'intersection-resize' ||
    !!rootResizeDeletePreview ||
    !!rootResizeDragSession ||
    !!edgeIntersectionDragSession;

  type WorkspaceViewportRect = VisibleLayoutViewportRect;

  $: {
    const activeRootTransition = resolveWorkspaceActiveRootTransition({
      previous: activeRootSnapshot,
      activeWindow: activeWindow ? { id: activeWindow.id, root: activeWindow.root } : null
    });

    activeRootSnapshot = {
      windowId: activeRootTransition.windowId,
      root: activeRootTransition.root
    };

    if (activeRootTransition.shouldCleanupMutation) {
      queueLayoutMutationCleanup();
    }
  }

  $: persistedFullscreenStackId = resolveWorkspaceFullscreenStackId(workspace);

  $: if (persistedFullscreenStackId !== previousPersistedFullscreenStackId) {
    previousPersistedFullscreenStackId = persistedFullscreenStackId;
    setFullscreenStack(persistedFullscreenStackId);
  }

  $: fullscreenPanelSync = resolveWorkspaceFullscreenPanelSync({
    workspace,
    fullscreenStackId: persistedFullscreenStackId
  });

  $: if (fullscreenPanelSync !== undefined) {
    onSetFullscreenPanelId(fullscreenPanelSync);
  }

  $: if (shouldClearMissingWorkspaceFullscreenStack({ workspace, fullscreenStackId })) {
    onSetFullscreenPanelId(null);
  }

  $: if (rootElement) {
    ensureLayoutGeometryObservers();
    refreshLayoutGeometryObservers();
  } else {
    disconnectLayoutGeometryObservers();
  }

  onDestroy(() => {
    disconnectLayoutGeometryObservers();
    fullscreenBoundaryController.clear();
  });

  onMount(() => {
    void tick().then(() => {
      refreshLayoutGeometryObservers();
      layoutGeometryVersion += 1;
    });
  });

  function queueLayoutMutationCleanup(): void {
    if (layoutMutationCleanupPromise) {
      return;
    }

    hoveredMenuTargetId = null;
    hoveredMenuSplitSegmentIndex = null;
    previewPanelRect = null;

    if (layoutInteraction.mode !== 'split-menu') {
      selectedMenuTargetId = null;
      pendingMenuAction = null;
      pendingMenuCuts = 1;
    }

    layoutMutationCleanupPromise = performLayoutMutationCleanup().finally(() => {
      layoutMutationCleanupPromise = null;
    });
  }

  async function performLayoutMutationCleanup(): Promise<void> {
    await tick();

    refreshLayoutGeometryObservers();
    layoutGeometryVersion += 1;

    await tick();

    if (layoutInteraction.mode === 'split-menu' && pendingMenuAction) {
      const candidates = resolveSelectableMenuTargets(menuTargets, pendingMenuAction);
      selectedMenuTargetId = resolveDefaultMenuTargetId(candidates);
      hoveredMenuTargetId = null;
      hoveredMenuSplitSegmentIndex = null;
      return;
    }

    selectedMenuTargetId = null;
  }

  function handleStartPanelDrag(
    panelId: string,
    sourceStackId: string,
    anchor: { x: number; y: number }
  ): void {
    if (!showMovePanelAction) {
      return;
    }

    if (!rootElement) {
      return;
    }

    onBeginAppHistoryTransaction();
    const rect = rootElement.getBoundingClientRect();
    onStartPanelDrag(panelId, sourceStackId, {
      x: anchor.x - rect.left,
      y: anchor.y - rect.top
    });
  }

  function handleOpenWorkspaceEdgeSplitMenu(
    event: CustomEvent<{ edge: LayoutEdge; clientX: number; clientY: number }>
  ): void {
    openWorkspaceEdgeSplitMenuAt(event.detail.edge, event.detail.clientX, event.detail.clientY);
  }

  function openWorkspaceEdgeSplitMenuAt(edge: LayoutEdge, clientX: number, clientY: number): void {
    if (!layoutEditingEnabled || !rootElement) {
      return;
    }

    const bounds = rootElement.getBoundingClientRect();
    onOpenSplitMenu(
      null,
      edge,
      {
        x: clientX - bounds.left,
        y: clientY - bounds.top
      },
      [],
      { source: 'workspace-edge' }
    );
  }

  function handleStartBoundaryPullFromEdge(
    event: CustomEvent<{ edge: LayoutEdge; clientX: number; clientY: number }>
  ): void {
    startBoundaryPullFromEdge(event.detail.edge, event.detail.clientX, event.detail.clientY);
  }

  function startBoundaryPullFromEdge(edge: LayoutEdge, clientX: number, clientY: number): void {
    if (!layoutEditingEnabled || !rootElement) {
      return;
    }

    const pointer = resolveLocalPointer(clientX, clientY);

    if (!pointer) {
      return;
    }

    onBeginCoreHistoryTransaction();
    onStartBoundaryPull({
      windowId: activeWindow?.id,
      anchor: pointer,
      horizontalEdge: edge === 'left' || edge === 'right' ? edge : null,
      verticalEdge: edge === 'top' || edge === 'bottom' ? edge : null,
      source: 'edge',
      neutralThreshold: BOUNDARY_PULL_NEUTRAL_THRESHOLD,
      creationThreshold: BOUNDARY_PULL_CREATION_THRESHOLD
    });
  }

  function handleStartBoundaryPullFromCorner(
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    event: CustomEvent<{
      corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      clientX: number;
      clientY: number;
    }>
  ): void {
    if (!layoutEditingEnabled || !rootElement) {
      return;
    }

    const pointer = resolveLocalPointer(event.detail.clientX, event.detail.clientY);

    if (!pointer) {
      return;
    }

    onBeginCoreHistoryTransaction();
    const horizontalEdge = corner.includes('left') ? 'left' : 'right';
    const verticalEdge = corner.includes('top') ? 'top' : 'bottom';

    onStartBoundaryPull({
      windowId: activeWindow?.id,
      anchor: pointer,
      horizontalEdge,
      verticalEdge,
      source: 'corner',
      neutralThreshold: BOUNDARY_PULL_NEUTRAL_THRESHOLD,
      creationThreshold: BOUNDARY_PULL_CREATION_THRESHOLD
    });
  }

  function handleOpenInternalSplitMenu(
    panelId: string | null,
    edge: LayoutEdge,
    anchor: { x: number; y: number },
    targets: LayoutMenuTarget[] = [],
    options: {
      source?: 'workspace-edge' | 'split-boundary' | 'panel-menu';
      initialActionId?: LayoutMenuActionId | null;
    } = {}
  ): void {
    if (!layoutEditingEnabled || !rootElement) {
      return;
    }

    const bounds = rootElement.getBoundingClientRect();
    onOpenSplitMenu(
      panelId,
      edge,
      {
        x: anchor.x - bounds.left,
        y: anchor.y - bounds.top
      },
      targets,
      options
    );
  }

  function handleSelectMenuTarget(targetId: string | null): void {
    if (!targetId || !pendingMenuAction) {
      return;
    }

    hoveredMenuTargetId = targetId;
  }

  function handleClearMenuAction(): void {
    pendingMenuAction = null;
    pendingMenuCuts = 1;
    selectedMenuTargetId = null;
    hoveredMenuTargetId = null;
    hoveredMenuSplitSegmentIndex = null;
  }

  function handleStartMenuAction(actionId: string): void {
    if (layoutInteraction.mode !== 'split-menu') {
      return;
    }

    const action = toPendingWorkspaceLayoutMenuAction(actionId);

    if (!action) {
      return;
    }

    const candidates = resolveSelectableMenuTargets(menuTargets, action);

    if (candidates.length === 0) {
      return;
    }

    pendingMenuAction = action;
    pendingMenuCuts = 1;
    selectedMenuTargetId = resolveDefaultMenuTargetId(candidates);
    hoveredMenuTargetId = null;
    hoveredMenuSplitSegmentIndex = null;
  }

  function handleCommitMenuTarget(targetId: string): void {
    handleCommitMenuTargetSegment(targetId, activeMenuSplitSegmentIndex);
  }

  function handleCommitMenuTargetSegment(targetId: string, segmentIndex: number | null): void {
    if (!pendingMenuAction) {
      return;
    }

    const target = selectableMenuTargets.find((candidate) => candidate.id === targetId);

    if (!target) {
      return;
    }

    const commit = resolveWorkspaceLayoutMenuCommit({
      action: pendingMenuAction,
      target,
      segmentIndex,
      cuts: pendingMenuCuts,
      source: layoutInteraction.mode === 'split-menu' ? layoutInteraction.source : null
    });

    if (commit.kind === 'split') {
      onCommitLayoutSubdivideSelection(
        commit.panelId,
        commit.edge,
        commit.orientation,
        commit.cuts,
        commit.pointerRatio
      );
      return;
    }

    onSelectLayoutMenuAction(commit);
  }

  function resolveSelectableMenuTargets(
    targets: LayoutMenuTarget[],
    action: PendingMenuAction
  ): LayoutMenuTarget[] {
    return resolveSelectableWorkspaceLayoutMenuTargets({
      targets,
      action,
      isTargetEligible: (target, selectedAction) =>
        isWorkspaceLayoutMenuTargetEligible(workspace, target, selectedAction),
      panelMenuBoundaryCandidates: resolvePanelMenuBoundaryCandidates(action)
    });
  }

  function resolvePanelMenuBoundaryCandidates(action: PendingMenuAction): LayoutMenuTarget[] | null {
    if (layoutInteraction.mode !== 'split-menu') {
      return null;
    }

    return resolveWorkspacePanelMenuBoundaryCandidates({
      action,
      source: layoutInteraction.source,
      root: activeWindow?.root ?? null,
      panelId: layoutInteraction.panelId,
      sourcePanelRect: layoutInteraction.panelId ? resolvePanelRect(layoutInteraction.panelId) : null,
      resolveSiblingRect: resolveRectFromPanelIds
    });
  }

  function resolvePanelRect(
    panelId: string
  ): { left: number; top: number; width: number; height: number } | null {
    if (!rootElement) {
      return null;
    }

    return resolveWorkspacePanelRect(rootElement, panelId);
  }

  function resolveWorkspaceViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    if (!rootElement) {
      return null;
    }

    return resolveWorkspaceDomViewportRect(rootElement);
  }

  function resolveWorkspaceFullscreenViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    if (!rootElement) {
      return null;
    }

    return resolveWorkspaceFullscreenViewportDomRect(rootElement);
  }

  function resolveMenuTargetRect(
    target: LayoutMenuTarget,
    panelIds: readonly string[]
  ): { targetId: string; left: number; top: number; width: number; height: number } | null {
    const rect = resolveWorkspaceLayoutRectFromPanelRects(
      panelIds
        .map((panelId) => resolvePanelRect(panelId))
        .filter((value): value is { left: number; top: number; width: number; height: number } => !!value)
    );

    if (!rect) {
      return null;
    }

    return {
      targetId: target.id,
      ...rect
    };
  }

  function resolveDefaultMenuTargetId(candidates: LayoutMenuTarget[]): string | null {
    if (!rootElement || layoutInteraction.mode !== 'split-menu' || candidates.length === 0) {
      return candidates[0]?.id ?? null;
    }

    const candidateRects = candidates
      .map((target) =>
        resolveMenuTargetRect(
          target,
          resolveWorkspaceLayoutActionTargetPanelIds(
            target,
            pendingMenuAction?.kind ?? 'split',
            layoutInteraction.mode === 'split-menu' ? layoutInteraction.source : null
          )
        )
      )
      .filter(
        (value): value is { targetId: string; left: number; top: number; width: number; height: number } =>
          !!value
      );

    if (candidateRects.length === 0) {
      return candidates[0]?.id ?? null;
    }

    return resolveDefaultWorkspaceLayoutMenuTargetId({
      candidateIds: candidates.map((candidate) => candidate.id),
      candidateRects,
      anchor: layoutInteraction.anchor,
      source: layoutInteraction.source,
      edge: layoutInteraction.edge
    });
  }

  function resolveRectFromPanelIds(
    panelIds: readonly string[]
  ): { left: number; top: number; width: number; height: number } | null {
    const rect = resolveMenuTargetRect(createPreviewWorkspaceLayoutMenuTarget(panelIds), panelIds);

    return rect
      ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }
      : null;
  }

  function updatePreviewTarget(event: PointerEvent): void {
    if (!rootElement || layoutInteraction.mode !== 'split-preview') {
      return;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const targetPanel = resolvePreviewTargetPanel(event);

    if (!targetPanel) {
      previewPanelRect = null;
      onUpdateLayoutSplitPreview(null, layoutInteraction.pointerRatio);
      return;
    }

    const targetRect = targetPanel.getBoundingClientRect();
    const previewUpdate = resolveWorkspaceSplitPreviewUpdate({
      workspaceRect: {
        left: workspaceRect.left,
        top: workspaceRect.top,
        width: workspaceRect.width,
        height: workspaceRect.height
      },
      targetRect: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height
      },
      targetPanelId: targetPanel.dataset.panelId ?? null,
      orientation: layoutInteraction.orientation,
      edge: layoutInteraction.edge,
      point: { x: event.clientX, y: event.clientY }
    });

    previewPanelRect = previewUpdate.previewRect;
    onUpdateLayoutSplitPreview(previewUpdate.panelId, previewUpdate.pointerRatio);
  }

  function resolvePreviewTargetPanel(event: PointerEvent): HTMLElement | null {
    if (!rootElement || layoutInteraction.mode !== 'split-preview') {
      return null;
    }

    if (layoutInteraction.panelId) {
      return rootElement.querySelector<HTMLElement>(`[data-panel-id="${layoutInteraction.panelId}"]`);
    }

    const innerBounds = resolveWorkspaceInnerClientBounds(rootElement);
    const panelElements = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-panel-id]'));
    const panelCandidates = panelElements.map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        id: element.dataset.panelId ?? '',
        bounds: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        }
      };
    });
    const targetPanelId = resolveWorkspaceSplitPreviewTargetPanelId({
      edge: layoutInteraction.edge,
      candidates: panelCandidates,
      workspaceInnerBounds: {
        left: innerBounds.left,
        right: innerBounds.right,
        top: innerBounds.top,
        bottom: innerBounds.bottom
      },
      point: { x: event.clientX, y: event.clientY }
    });

    return targetPanelId
      ? (panelElements.find((element) => element.dataset.panelId === targetPanelId) ?? null)
      : null;
  }

  function handleWorkspacePointerMove(event: PointerEvent): void {
    updateResizeHoverFromPointer(event);

    if (layoutInteraction.mode === 'split-menu' && pendingMenuAction && rootElement) {
      const eventTarget = event.target;

      if (!(eventTarget instanceof Element) || !eventTarget.closest('.layout-overlay__menu')) {
        const hoveredTargetId = resolveHoveredMenuTargetId(event.clientX, event.clientY);

        if (hoveredTargetId && hoveredTargetId !== activeMenuTargetId) {
          hoveredMenuTargetId = hoveredTargetId;
        } else if (!hoveredTargetId) {
          hoveredMenuTargetId = null;
        }
      }
    }

    updatePreviewTarget(event);
  }

  function updateResizeHoverFromPointer(event: PointerEvent): void {
    updateResizeHoverFromPosition(event.clientX, event.clientY, event.target as HTMLElement | null);
  }

  function applyResizeHover(handle: VisibleResizeBoundaryHandle): void {
    hoveredResizeLine = handle;
    workspaceDebugHover.setHoveredTarget({ kind: 'resize', splitId: handle.splitId });
    workspaceDebugHover.setHoveredResizeSplitId(handle.splitId);
    workspaceDebugHover.setHoveredResizeHandle({
      splitId: handle.splitId,
      orientation: handle.orientation,
      rect: handle.rect
    });
    workspaceInteractionHints.setHoveredHint({ kind: 'resize', orientation: handle.orientation });
  }

  function clearResizeLineState(): void {
    hoveredResizeLine = null;
    workspaceDebugHover.setHoveredResizeSplitId(null);
    workspaceDebugHover.setHoveredResizeHandle(null);
  }

  function resolveRenderedRootResizePosition(splitId: string): number | null {
    const boundary = findVisibleResizeBoundaryBySplitId(visibleResizeBoundaries, splitId);

    if (!boundary) {
      return null;
    }

    const line = resolveVisibleResizeBoundaryLineGeometry(boundary);
    return boundary.orientation === 'horizontal' ? line.rect.left + 0.5 : line.rect.top + 0.5;
  }

  function updateResizeHoverFromPosition(
    clientX: number,
    clientY: number,
    eventTarget: HTMLElement | null = null
  ): void {
    if (!rootElement) {
      return;
    }

    const blockingInteractiveTarget = eventTarget?.closest?.(
      '.workspace-boundary-chrome__intersection-handle, .boundary-corner-handle, .edge-split-handle'
    ) as HTMLElement | null;

    if (blockingInteractiveTarget) {
      clearResizeLineState();
      return;
    }

    const hoveredHandle = resolveVisibleResizeBoundaryFromPointer({
      workspaceElement: rootElement,
      boundaries: visibleResizeBoundaries,
      clientX,
      clientY,
      eventTarget,
      hoverSnapPx: RESIZE_HOVER_SNAP_PX,
      hoverSpanPx: RESIZE_HOVER_SPAN_PX
    });

    if (hoveredHandle) {
      applyResizeHover(hoveredHandle);
      return;
    }

    clearResizeHoverState();
  }

  function clearResizeHoverState(): void {
    if (debugHoverTarget?.kind === 'resize') {
      workspaceDebugHover.setHoveredTarget(null);
    }
    clearResizeLineState();
    workspaceInteractionHints.setHoveredHint(null);
  }

  function setFullscreenStack(nextFullscreenStackId: string | null): void {
    fullscreenBoundaryController.transition({
      currentStackId: fullscreenStackId,
      nextStackId: nextFullscreenStackId,
      setStackId: (stackId) => {
        fullscreenStackId = stackId;
      },
      setBoundaryPhase: (phase) => {
        fullscreenBoundaryPhase = phase;
      }
    });
  }

  function handleResizeHandleHoverState(
    input: WorkspaceResizeHoverState
  ): void {
    if (input.phase === 'leave') {
      return;
    }

    const boundary = resolveWorkspaceResizeHoverBoundary(visibleResizeBoundaries, input);
    if (boundary) applyResizeHover(boundary);
  }

  function resolveLocalPointer(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!rootElement) {
      return null;
    }

    const rect = rootElement.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function resolveHoveredMenuTargetId(clientX: number, clientY: number): string | null {
    const root = rootElement;
    if (!root || !pendingMenuAction) {
      return null;
    }

    if (
      layoutInteraction.mode === 'split-menu' &&
      layoutInteraction.panelId === null &&
      pendingMenuAction.kind === 'split'
    ) {
      const rootBounds = root.getBoundingClientRect();
      const localX = clientX - rootBounds.left;
      const localY = clientY - rootBounds.top;
      const edgeProjectedTarget = resolveWorkspaceLayoutEdgeProjectedTargetId({
        edge: layoutInteraction.edge,
        candidateRects: menuTargetRects,
        point: { x: localX, y: localY }
      });

      if (edgeProjectedTarget) {
        return edgeProjectedTarget;
      }
    }

    if (pendingMenuAction.kind === 'split') {
      const hoveredPanelElement = document
        .elementsFromPoint(clientX, clientY)
        .map((element) =>
          element instanceof HTMLElement ? element.closest<HTMLElement>('[data-panel-id]') : null
        )
        .find(
          (element): element is HTMLElement =>
            !!element && element.dataset.panelId !== undefined && root.contains(element)
        );
      const hoveredPanelId = hoveredPanelElement?.dataset.panelId ?? null;

      if (hoveredPanelId) {
        const hoveredTarget = selectableMenuTargets.find((target) => target.panelId === hoveredPanelId);

        if (hoveredTarget) {
          return hoveredTarget.id;
        }
      }
    }

    const rootBounds = root.getBoundingClientRect();
    const localX = clientX - rootBounds.left;
    const localY = clientY - rootBounds.top;
    return resolveWorkspaceLayoutMenuTargetIdAtPoint({
      candidateRects: menuTargetRects,
      point: { x: localX, y: localY }
    });
  }

  function handlePreviewWheel(event: WheelEvent): void {
    if (layoutInteraction.mode === 'split-menu' && pendingMenuAction?.kind === 'split') {
      event.preventDefault();
      pendingMenuCuts = Math.max(1, Math.min(5, pendingMenuCuts + (event.deltaY > 0 ? -1 : 1)));
      if (hoveredMenuSplitSegmentIndex !== null) {
        hoveredMenuSplitSegmentIndex = clampWorkspaceSplitSegmentIndex(
          hoveredMenuSplitSegmentIndex,
          pendingMenuCuts
        );
      }
      return;
    }

    if (layoutInteraction.mode !== 'split-preview') {
      return;
    }

    event.preventDefault();
    onAdjustLayoutSplitPreviewCuts(event.deltaY > 0 ? -1 : 1);
  }

  function handlePreviewOverlayClick(event: MouseEvent): void {
    if (layoutInteraction.mode !== 'split-preview') {
      return;
    }

    if (!previewPanelRect || !rootElement) {
      onCancelLayoutInteraction();
      return;
    }

    const rootBounds = rootElement.getBoundingClientRect();
    const localX = event.clientX - rootBounds.left;
    const localY = event.clientY - rootBounds.top;
    const isInsidePanel = isWorkspacePreviewPointInsideRect({ x: localX, y: localY }, previewPanelRect);

    if (!isInsidePanel) {
      onCancelLayoutInteraction();
      return;
    }

    onCommitLayoutSplitPreview();
  }

  function handleHoverMenuSplitSegment(segmentIndex: number | null): void {
    hoveredMenuSplitSegmentIndex =
      pendingMenuAction?.kind === 'split' && segmentIndex !== null
        ? clampWorkspaceSplitSegmentIndex(segmentIndex, pendingMenuCuts)
        : null;
  }

  function resolveDockTarget(clientX: number, clientY: number): LayoutDockTarget | null {
    if (!rootElement || layoutInteraction.mode !== 'drag-panel') {
      return null;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const edgeGutter = parseFloat(getComputedStyle(rootElement).paddingLeft || '0') || 0;

    if (showDockToSideAction) {
      const edgeSide = resolveWorkspaceEdgeDockSide(
        { x: clientX, y: clientY },
        {
          left: workspaceRect.left,
          top: workspaceRect.top,
          width: workspaceRect.width,
          height: workspaceRect.height
        },
        edgeGutter
      );

      if (edgeSide) {
        return createWorkspaceEdgeDockTarget(edgeSide);
      }
    }

    const stackElements = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-stack-id]'));
    const sourceStack = findStackInWorkspace(workspace, layoutInteraction.sourceStackId);
    const canTargetSourceStack = (sourceStack?.children.length ?? 0) > 1;

    const stackCandidates = stackElements.flatMap((element) => {
      const stackId = element.dataset.stackId;

      if (!stackId) {
        return [];
      }

      const rect = element.getBoundingClientRect();

      return [
        {
          stackId,
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          },
          tabIndex: resolveDockTabIndex(element, clientX, clientY),
          canTarget: stackId !== layoutInteraction.sourceStackId || canTargetSourceStack
        }
      ];
    });

    return resolveStackDockTargetAtPointer({
      pointer: { x: clientX, y: clientY },
      candidates: stackCandidates,
      showDockAsTabAction,
      showDockToSideAction
    });
  }

  function resolveDockPreviewRect(
    target: LayoutDockTarget
  ): { left: number; top: number; width: number; height: number } | null {
    if (!rootElement) {
      return null;
    }

    if (target.kind === 'workspace-edge') {
      const viewport = resolveLocalWorkspaceViewportRect();

      if (!viewport) {
        return null;
      }

      return resolveWorkspaceEdgeDockPreviewRect(viewport, target.side);
    }

    const stackElement = rootElement.querySelector<HTMLElement>(`[data-stack-id="${target.stackId}"]`);

    if (!stackElement) {
      return null;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const rect = stackElement.getBoundingClientRect();
    const base = {
      left: rect.left - workspaceRect.left,
      top: rect.top - workspaceRect.top,
      width: rect.width,
      height: rect.height
    };

    return resolveStackDockPreviewRect(base, target.placement);
  }

  function resolveDockTabIndex(stackElement: HTMLElement, clientX: number, clientY: number): number | null {
    const tabsElement = stackElement.querySelector<HTMLElement>('[data-workbench-stack-tabs]');

    if (!tabsElement) {
      return null;
    }

    const tabsRect = tabsElement.getBoundingClientRect();

    const tabElements = Array.from(
      tabsElement.querySelectorAll<HTMLElement>('[data-workbench-stack-tab]')
    );
    const tabRects = tabElements.map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    });

    return resolveDockTabInsertionIndex(
      { x: clientX, y: clientY },
      {
        left: tabsRect.left,
        top: tabsRect.top,
        width: tabsRect.width,
        height: tabsRect.height
      },
      tabRects
    );
  }

  function resolveDockTabIndicatorRect(
    target: Extract<LayoutDockTarget, { kind: 'stack' }>
  ): { left: number; top: number; width: number; height: number } | null {
    if (
      !rootElement ||
      target.placement !== 'center' ||
      target.tabIndex === null ||
      target.tabIndex === undefined
    ) {
      return null;
    }

    const stackElement = rootElement.querySelector<HTMLElement>(`[data-stack-id="${target.stackId}"]`);
    const tabsElement = stackElement?.querySelector<HTMLElement>('[data-workbench-stack-tabs]');

    if (!stackElement || !tabsElement) {
      return null;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const tabsRect = tabsElement.getBoundingClientRect();
    const tabElements = Array.from(
      tabsElement.querySelectorAll<HTMLElement>('[data-workbench-stack-tab]')
    );
    const tabRects = tabElements.map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    });

    return resolveDockTabIndicatorModelRect({
      workspaceRect: {
        left: workspaceRect.left,
        top: workspaceRect.top,
        width: workspaceRect.width,
        height: workspaceRect.height
      },
      tabsRect: {
        left: tabsRect.left,
        top: tabsRect.top,
        width: tabsRect.width,
        height: tabsRect.height
      },
      tabRects,
      tabIndex: target.tabIndex
    });
  }

  function handleWindowPointerMove(event: PointerEvent): void {
    if (edgeIntersectionDragSession) {
      const pointer = resolveLocalPointer(event.clientX, event.clientY);

      if (!pointer) {
        return;
      }

      if (edgeIntersectionDragSession.kind === 'pending') {
        const deltaX = pointer.x - edgeIntersectionDragSession.anchor.x;
        const deltaY = pointer.y - edgeIntersectionDragSession.anchor.y;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 3) {
          return;
        }

        startEdgeIntersectionResize(
          edgeIntersectionDragSession.pointerId,
          edgeIntersectionDragSession.target,
          pointer,
          event.ctrlKey
        );
        return;
      }

      if (edgeIntersectionDragSession.kind === 'resize') {
        updateEdgeIntersectionResize(edgeIntersectionDragSession, pointer, event.ctrlKey);

        if (layoutInteraction.mode === 'boundary-pull' && localViewportRect) {
          onUpdateBoundaryPull(pointer, { width: localViewportRect.width, height: localViewportRect.height });
        }
        return;
      }
    }

    if (layoutInteraction.mode === 'boundary-pull' && localViewportRect) {
      const pointer = resolveLocalPointer(event.clientX, event.clientY);

      if (pointer) {
        onUpdateBoundaryPull(pointer, { width: localViewportRect.width, height: localViewportRect.height });
      }

      return;
    }

    if (layoutInteraction.mode === 'intersection-resize') {
      const pointer = resolveLocalPointer(event.clientX, event.clientY);
      const dimensions =
        intersectionResizeSession?.dimensions ?? resolveIntersectionResizeDimensions(layoutInteraction);

      if (pointer && dimensions && intersectionResizeSession) {
        const mode = event.ctrlKey ? 'proportional' : 'local';
        const snappedPointer = resolveIntersectionResizeSnappedPointer(pointer, dimensions);
        const update = updateWorkspaceIntersectionResizeSession({
          session: intersectionResizeSession,
          pointer,
          dimensions,
          mode,
          snappedPointer
        });

        intersectionResizeSession = update.session;

        if (update.columnRatioDelta !== null) {
          onResizeSplitBoundary(
            update.session.columnRootSplitId,
            update.session.columnBoundaryIndex,
            update.columnRatioDelta,
            mode
          );
        }

        if (update.rowRatioDelta !== null) {
          onResizeSplitBoundary(
            update.session.rowRootSplitId,
            update.session.rowBoundaryIndex,
            update.rowRatioDelta,
            mode
          );
        }

        onUpdateIntersectionResize(update.snappedPointer, update.dimensions);
      }

      return;
    }

    if (!rootElement || layoutInteraction.mode !== 'drag-panel') {
      return;
    }

    const rect = rootElement.getBoundingClientRect();
    onUpdatePanelDrag(
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      },
      resolveDockTarget(event.clientX, event.clientY)
    );
  }

  function handleWindowPointerUp(event: PointerEvent): void {
    const action = resolveWorkspaceWindowPointerUpAction({
      interactionMode: layoutInteraction.mode,
      hasEdgeIntersectionDragSession: edgeIntersectionDragSession !== null,
      hasHoveredDockTarget: Boolean(
        layoutInteraction.mode === 'drag-panel' && layoutInteraction.hoveredTarget
      )
    });

    if (action === 'commit-edge-boundary-pull') {
      edgeIntersectionDragSession = null;
      edgeIntersectionResizePreviewLine = null;
      onCommitBoundaryPull();
      onCommitCoreHistoryTransaction();
      updateResizeHoverFromPosition(event.clientX, event.clientY);
      return;
    }

    if (action === 'refresh-resize-hover') {
      edgeIntersectionDragSession = null;
      edgeIntersectionResizePreviewLine = null;
      updateResizeHoverFromPosition(event.clientX, event.clientY);
      return;
    }

    if (action === 'commit-boundary-pull') {
      onCommitBoundaryPull();
      onCommitCoreHistoryTransaction();
      return;
    }

    if (action === 'commit-intersection-resize') {
      intersectionResizeSession = null;
      onCommitCoreHistoryTransaction();
      onCancelLayoutInteraction();
      updateResizeHoverFromPosition(event.clientX, event.clientY);
      return;
    }

    if (action === 'commit-panel-dock') {
      onCommitPanelDock();
      onCommitAppHistoryTransaction();
      updateResizeHoverFromPosition(event.clientX, event.clientY);
      return;
    }

    onCancelLayoutInteraction();
    onCancelAppHistoryTransaction();
    updateResizeHoverFromPosition(event.clientX, event.clientY);
  }

  function handleWindowKeyDown(event: KeyboardEvent): void {
    const action = resolveWorkspaceWindowKeyDownAction({
      key: event.key,
      interactionMode: layoutInteraction.mode,
      hasRootResizeDeletePreview: Boolean(rootResizeDeletePreview)
    });

    if (action === 'cancel-root-resize' && rootResizeDeletePreview) {
      canceledRootResizeSplitId = rootResizeDeletePreview.splitId;
      rootResizeDeletePreview = null;
      rootResizeDragSession = null;
      rootResizeCommitState = createWorkspaceSplitResizeCommitState();
      onCancelCoreHistoryTransaction();
      return;
    }

    if (action === 'none') {
      return;
    }

    if (action === 'cancel-intersection-resize') {
      restoreIntersectionSplitSnapshots();
      intersectionResizeSession = null;
    }

    onCancelLayoutInteraction();
    if (action === 'cancel-panel-drag') {
      onCancelAppHistoryTransaction();
    } else {
      onCancelCoreHistoryTransaction();
    }
  }

  function handleWindowContextMenu(event: MouseEvent): void {
    const action = resolveWorkspaceWindowContextMenuAction({
      interactionMode: layoutInteraction.mode,
      hasRootResizeDeletePreview: Boolean(rootResizeDeletePreview)
    });

    if (action === 'none') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (action === 'cancel-intersection-resize') {
      event.preventDefault();
      event.stopPropagation();
      restoreIntersectionSplitSnapshots();
      intersectionResizeSession = null;
      onCancelLayoutInteraction();
      onCancelCoreHistoryTransaction();
      return;
    }

    if (!rootResizeDeletePreview) return;
    canceledRootResizeSplitId = rootResizeDeletePreview.splitId;
    rootResizeDeletePreview = null;
    rootResizeDragSession = null;
    rootResizeCommitState = createWorkspaceSplitResizeCommitState();
    onCancelCoreHistoryTransaction();
  }

  function toggleStackFullscreen(stackId: string): void {
    if (fullscreenStackId === stackId) {
      onSetFullscreenPanelId(null);
      return;
    }

    const stack = findStackInWorkspace(workspace, stackId);
    onSetFullscreenPanelId(stack?.activeChildId ?? null);
  }

  function handleRootResize(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number }
  ): void {
    if (!showBoundaryResizeUi || !rootSplitElement || !activeWindow || activeWindow.root.kind !== 'split') {
      return;
    }

    if (canceledRootResizeSplitId === handle.splitId) {
      return;
    }

    const mode = detail.ctrlKey ? 'proportional' : 'local';
    const rawCurrentPosition = handle.orientation === 'horizontal' ? detail.clientX : detail.clientY;
    const driver = resolveResizePreviewDriver({
      preview: rootResizeDeletePreview,
      splitId: handle.splitId,
      boundaryIndex,
      rawCurrentPositionPx: rawCurrentPosition
    });
    const currentPosition = driver.currentPositionPx;
    if (
      !rootResizeDragSession ||
      rootResizeDragSession.splitId !== handle.splitId ||
      rootResizeDragSession.boundaryIndex !== boundaryIndex
    ) {
      const totalSize =
        handle.orientation === 'horizontal' ? rootSplitElement.clientWidth : rootSplitElement.clientHeight;

      if (totalSize <= 0) {
        return;
      }

      rootResizeDragSession = createWorkspaceNodeResizeDragSessionFromDriver({
        splitId: handle.splitId,
        boundaryIndex,
        orientation: handle.orientation,
        axisStartPx: rootResizeDeletePreview?.axisStartPx ?? rawCurrentPosition - currentPosition,
        axisSizePx: totalSize,
        ratioAxisSizePx: resolveVisibleSplitContentAxisSizePx(rootSplitElement, handle.orientation),
        mode,
        driver
      });
      rootResizeCommitState = createWorkspaceSplitResizeCommitState(null, mode);
      return;
    }

    const { session } = updateWorkspaceNodeResizeDragSession({
      session: rootResizeDragSession,
      rawCurrentPosition,
      baselineResolvedPosition: resolveRenderedRootResizePosition(handle.splitId),
      mode,
      driver
    });

    rootResizeDragSession = session;
    rootResizeCommitState = resolveWorkspaceSplitResizeCommitState(session, mode);

    rootResizeDeletePreview = applyWorkspaceNodeResizePreviewGesture({
      preview: rootResizeDeletePreview,
      splitId: handle.splitId,
      boundaryIndex,
      session
    });
  }

  function handleRootResizeHandleMenu(
    handle: FlattenedSplitHandle,
    event: CustomEvent<{ clientX: number; clientY: number }>
  ): void {
    const resolution = resolveWorkspaceNodeResizeHandleMenu({
      handle,
      clientX: event.detail.clientX,
      clientY: event.detail.clientY,
      layoutEditingEnabled
    });

    if (!resolution) {
      return;
    }

    canceledRootResizeSplitId = resolution.canceledResizeSplitId;
    rootResizeDeletePreview = resolution.resizeDeletePreview;
    rootResizeDragSession = resolution.resizeDragSession;

    if (!resolution.menu) {
      return;
    }

    onOpenSplitMenu(
      resolution.menu.panelId,
      resolution.menu.edge,
      resolution.menu.anchor,
      resolution.menu.targets,
      { source: 'split-boundary' }
    );
  }

  function resolveRootDeleteZoneMaxSizePx(): number {
    const splitElement = rootSplitElement;

    if (!splitElement) {
      return ROOT_DELETE_ZONE_MIN_SIZE_PX;
    }

    const minimumSize = ROOT_DELETE_ZONE_MIN_SIZE_PX;
    return resolveTokenBasedDeleteZoneMaxSizePx(splitElement, minimumSize);
  }

  function resolveMeasuredRootDeleteZoneMaxSizePx(startNode: LayoutNode, endNode: LayoutNode): number {
    if (!rootSplitElement) {
      return resolveRootDeleteZoneMaxSizePx();
    }

    return resolveMeasuredDeleteZoneMaxSizePx(
      rootSplitElement,
      startNode,
      endNode,
      ROOT_DELETE_ZONE_MIN_SIZE_PX
    );
  }

  function resolveMeasuredRootStackChromeHeight(stackElement: HTMLElement): number {
    return resolveMeasuredStackChromeHeight(stackElement, ROOT_DELETE_ZONE_MIN_SIZE_PX);
  }

  function updateRootResizeDeletePreview(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    pointerX: number,
    pointerY: number
  ): void {
    const preview = rootResizeDeletePreview;

    if (
      !rootSplitElement ||
      !preview ||
      preview.splitId !== handle.splitId ||
      canceledRootResizeSplitId === handle.splitId
    ) {
      return;
    }

    rootResizeDeletePreview = resolveWorkspaceNodeResizeDeletePreview({
      preview,
      dragSession: rootResizeDragSession,
      orientation: handle.orientation,
      splitId: handle.splitId,
      boundaryIndex,
      pointerPositionPx: handle.orientation === 'horizontal' ? pointerX : pointerY,
      containerElement: rootSplitElement,
      candidateRootElement: rootElement,
      magnetThresholdPx: RESIZE_MAGNET_THRESHOLD_PX
    });
  }

  function handleRootResizeDragState(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ): void {
    if (
      !showBoundaryResizeUi ||
      !rootSplitElement ||
      !rootSplitChain ||
      !activeWindow ||
      activeWindow.root.kind !== 'split'
    ) {
      return;
    }

    if (event.detail.phase === 'start') {
      onBeginCoreHistoryTransaction();
      canceledRootResizeSplitId = null;
      const startSegment = rootSplitChain.segments[boundaryIndex];
      const endSegment = rootSplitChain.segments[boundaryIndex + 1];

      if (!startSegment || !endSegment) {
        rootResizeDeletePreview = null;
        rootResizeCommitState = createWorkspaceSplitResizeCommitState();
        return;
      }

      const rect = rootSplitElement.getBoundingClientRect();
      const axisStart = handle.orientation === 'horizontal' ? rect.left : rect.top;
      const axisSize =
        handle.orientation === 'horizontal' ? rootSplitElement.clientWidth : rootSplitElement.clientHeight;
      const crossLimit =
        handle.orientation === 'horizontal' ? rootSplitElement.clientHeight : rootSplitElement.clientWidth;
      const crossStartPx =
        handle.orientation === 'horizontal'
          ? Math.min(Math.max(0, event.detail.handleRect.top - rect.top), crossLimit)
          : Math.min(Math.max(0, event.detail.handleRect.left - rect.left), crossLimit);
      const crossSizePx =
        handle.orientation === 'horizontal'
          ? Math.min(Math.max(0, event.detail.handleRect.height), Math.max(0, crossLimit - crossStartPx))
          : Math.min(Math.max(0, event.detail.handleRect.width), Math.max(0, crossLimit - crossStartPx));
      const initialDragPositionPx =
        handle.orientation === 'horizontal'
          ? event.detail.handleRect.left - rect.left + event.detail.handleRect.width / 2
          : event.detail.handleRect.top - rect.top + event.detail.handleRect.height / 2;
      const resizeStartState = createWorkspaceNodeResizeDragStartState({
        orientation: handle.orientation,
        splitId: handle.splitId,
        boundaryIndex,
        startSegment,
        endSegment,
        axisStartPx: axisStart,
        axisSizePx: axisSize,
        ratioAxisSizePx: resolveVisibleSplitContentAxisSizePx(rootSplitElement, handle.orientation),
        crossStartPx,
        crossSizePx,
        initialDragPositionPx,
        deleteZoneMaxSizePx: resolveMeasuredRootDeleteZoneMaxSizePx(startSegment.node, endSegment.node),
        activeThresholdPx: ROOT_DELETE_ZONE_THRESHOLD_PX,
        approachThresholdPx: ROOT_DELETE_ZONE_APPROACH_THRESHOLD_PX
      });
      rootResizeDeletePreview = resizeStartState.preview;
      rootResizeDragSession = resizeStartState.session;
      rootResizeCommitState = createWorkspaceSplitResizeCommitState();
      return;
    }

    if (event.detail.phase === 'cancel') {
      canceledRootResizeSplitId = handle.splitId;
      rootResizeDeletePreview = null;
      rootResizeDragSession = null;
      rootResizeCommitState = createWorkspaceSplitResizeCommitState();
      onCancelCoreHistoryTransaction();
      return;
    }

    if (event.detail.phase === 'move') {
      if (canceledRootResizeSplitId === handle.splitId) {
        return;
      }

      updateRootResizeDeletePreview(handle, boundaryIndex, event.detail.clientX, event.detail.clientY);
      return;
    }

    if (event.detail.phase === 'end') {
      if (canceledRootResizeSplitId === handle.splitId) {
        canceledRootResizeSplitId = null;
        rootResizeDeletePreview = null;
        rootResizeDragSession = null;
        rootResizeCommitState = createWorkspaceSplitResizeCommitState();
        onCancelCoreHistoryTransaction();
        return;
      }

      const commitState = rootResizeCommitState;
      const releaseDecision = resolveWorkspaceSplitResizeReleaseDecision({
        preview: rootResizeDeletePreview,
        fallbackBoundaryIndex: boundaryIndex,
        commitState,
        collapseEnabled: showDeleteZoneHelpers
      });
      rootResizeDeletePreview = null;
      rootResizeDragSession = null;
      rootResizeCommitState = createWorkspaceSplitResizeCommitState();

      if (releaseDecision.kind === 'collapse') {
        onCollapseSplitBoundary(
          activeWindow.root.id,
          releaseDecision.boundaryIndex,
          releaseDecision.removeSide
        );
        onCommitCoreHistoryTransaction();
        return;
      }

      if (releaseDecision.kind === 'resize') {
        onResizeSplitBoundary(
          activeWindow.root.id,
          releaseDecision.boundaryIndex,
          releaseDecision.deltaRatio,
          releaseDecision.mode
        );
      }

      onCommitCoreHistoryTransaction();
    }
  }

  // Keep the DOM measurement revision as a call argument: Vite/esbuild erases
  // `void revision` before Svelte can discover that reactive dependency.
  function withLayoutGeometry<T>(_revision: number, measurement: T): T {
    return measurement;
  }

  function ensureLayoutGeometryObservers(): void {
    layoutGeometryObserver.ensure();
  }

  function refreshLayoutGeometryObservers(): void {
    if (!rootElement) {
      return;
    }

    layoutGeometryObserver.refresh(rootElement);
  }

  function disconnectLayoutGeometryObservers(): void {
    layoutGeometryObserver.disconnect();
  }

  function resolveLocalWorkspaceViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    if (!rootElement) {
      return null;
    }

    return resolveLocalWorkspaceViewportDomRect(rootElement);
  }

  function resolveBoundaryPullPreview(
    state: Extract<LayoutInteractionState, { mode: 'boundary-pull' }>,
    viewport: WorkspaceViewportRect
  ) {
    return resolveWorkspaceBoundaryPullPreview({
      state,
      viewport,
      horizontalZoneSizePx: state.horizontalEdge
        ? resolveMeasuredBoundaryPullZoneSizePx(state.horizontalEdge)
        : 0,
      verticalZoneSizePx: state.verticalEdge ? resolveMeasuredBoundaryPullZoneSizePx(state.verticalEdge) : 0
    });
  }

  function resolveBoundaryEdgeVisualState(edge: LayoutEdge): WorkspaceBoundaryVisualState {
    return resolveWorkspaceBoundaryEdgeVisualState(resolveActiveBoundaryPullState(), edge);
  }

  function resolveBoundaryCornerVisualState(corner: WorkspaceBoundaryCorner): WorkspaceBoundaryVisualState {
    return resolveWorkspaceBoundaryCornerVisualState(resolveActiveBoundaryPullState(), corner);
  }

  function resolveActiveBoundaryPullState(): WorkspaceBoundaryPullState | null {
    return layoutInteraction.mode === 'boundary-pull' ? layoutInteraction : null;
  }

  function resolveMeasuredBoundaryPullZoneSizePx(edge: LayoutEdge): number {
    if (!rootElement) {
      return ROOT_DELETE_ZONE_THRESHOLD_PX;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const workspaceStyles = getComputedStyle(rootElement);
    const innerLeft = workspaceRect.left + (Number.parseFloat(workspaceStyles.paddingLeft) || 0);
    const innerRight = workspaceRect.right - (Number.parseFloat(workspaceStyles.paddingRight) || 0);
    const innerTop = workspaceRect.top + (Number.parseFloat(workspaceStyles.paddingTop) || 0);
    const innerBottom = workspaceRect.bottom - (Number.parseFloat(workspaceStyles.paddingBottom) || 0);
    const touchingStacks = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-stack-id]'));
    let measuredMax = 0;

    for (const stackElement of touchingStacks) {
      const rect = stackElement.getBoundingClientRect();
      const touchesEdge =
        edge === 'left'
          ? Math.abs(rect.left - innerLeft) <= 2
          : edge === 'right'
            ? Math.abs(rect.right - innerRight) <= 2
            : edge === 'top'
              ? Math.abs(rect.top - innerTop) <= 2
              : Math.abs(rect.bottom - innerBottom) <= 2;

      if (!touchesEdge) {
        continue;
      }

      measuredMax = Math.max(measuredMax, resolveMeasuredRootStackChromeHeight(stackElement));
    }

    return Math.max(ROOT_DELETE_ZONE_THRESHOLD_PX, measuredMax || 0);
  }

  function resolveIntersectionTargets(boundaries: VisibleResizeBoundaryHandle[]): IntersectionTarget[] {
    if (!rootElement) {
      return [];
    }
    return resolveVisibleResizeIntersectionTargets({
      workspaceElement: rootElement,
      boundaries,
      intersectionHandleSize: resolveIntersectionHandleSizePx()
    });
  }

  function resolveEdgeIntersectionTargets(
    boundaries: VisibleResizeBoundaryHandle[],
    resizeIntersections: IntersectionTarget[]
  ): EdgeIntersectionTarget[] {
    if (!rootElement || !localViewportRect) {
      return [];
    }
    return resolveVisibleEdgeIntersectionTargets({
      workspaceElement: rootElement,
      boundaries,
      viewportRect: localViewportRect,
      intersectionHandleSize: resolveIntersectionHandleSizePx(),
      edgeLineOffsetPx: EDGE_SPLIT_LINE_OFFSET_PX,
      magnetismDistancePx: INTERSECTION_MAGNETISM_DISTANCE_PX,
      resizeIntersections
    });
  }

  function handleStartIntersectionResize(
    event: PointerEvent,
    target: {
      columnSplitId: string;
      columnRootSplitId: string;
      columnBoundaryIndex: number;
      rowSplitId: string;
      rowRootSplitId: string;
      rowBoundaryIndex: number;
      columnContainerWidth: number;
      rowContainerHeight: number;
    }
  ): void {
    if (!layoutEditingEnabled || event.button !== 0) {
      return;
    }

    const pointer = resolveLocalPointer(event.clientX, event.clientY);
    const columnSplit = activeWindow ? findWorkspaceSplitById(activeWindow.root, target.columnSplitId) : null;
    const rowSplit = activeWindow ? findWorkspaceSplitById(activeWindow.root, target.rowSplitId) : null;

    if (!pointer || !columnSplit || !rowSplit || columnSplit.kind !== 'split' || rowSplit.kind !== 'split') {
      return;
    }

    onBeginCoreHistoryTransaction();
    onStartIntersectionResize({
      anchor: pointer,
      columnSplitId: target.columnSplitId,
      rowSplitId: target.rowSplitId,
      columnBaseSizes: columnSplit.sizes,
      rowBaseSizes: rowSplit.sizes
    });

    const axisStarts = resolveIntersectionResizeAxisStarts({
      columnSplitId: target.columnSplitId,
      rowSplitId: target.rowSplitId
    });

    if (!axisStarts) {
      return;
    }

    const columnSplitElement = resolveVisibleSplitGeometryElement({
      workspaceElement: rootElement,
      splitId: target.columnSplitId,
      rootSplitId: target.columnRootSplitId,
      rootSplitElement
    });
    const rowSplitElement = resolveVisibleSplitGeometryElement({
      workspaceElement: rootElement,
      splitId: target.rowSplitId,
      rootSplitId: target.rowRootSplitId,
      rootSplitElement
    });

    intersectionResizeSession = {
      columnRootSplitId: target.columnRootSplitId,
      columnBoundaryIndex: target.columnBoundaryIndex,
      rowRootSplitId: target.rowRootSplitId,
      rowBoundaryIndex: target.rowBoundaryIndex,
      dimensions: {
        width: target.columnContainerWidth,
        height: target.rowContainerHeight
      },
      columnGesture: createResizeGestureSession({
        axisStartPx: axisStarts.columnAxisStartPx,
        axisSizePx: target.columnContainerWidth,
        ratioAxisSizePx: columnSplitElement
          ? resolveVisibleSplitContentAxisSizePx(columnSplitElement, 'horizontal')
          : target.columnContainerWidth,
        anchorPositionPx: pointer.x,
        mode: 'local',
        magnetKey: null
      }),
      rowGesture: createResizeGestureSession({
        axisStartPx: axisStarts.rowAxisStartPx,
        axisSizePx: target.rowContainerHeight,
        ratioAxisSizePx: rowSplitElement
          ? resolveVisibleSplitContentAxisSizePx(rowSplitElement, 'vertical')
          : target.rowContainerHeight,
        anchorPositionPx: pointer.y,
        mode: 'local',
        magnetKey: null
      }),
      splitSnapshots: collectIntersectionSplitSnapshots(target.columnRootSplitId, target.rowRootSplitId)
    };
  }

  function handleIntersectionPointerEnter(target: {
    columnSplitId: string;
    columnRootSplitId: string;
    columnBoundaryIndex: number;
    rowSplitId: string;
    rowRootSplitId: string;
    rowBoundaryIndex: number;
  }): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget({
      kind: 'intersection-resize',
      columnSplitId: target.columnSplitId,
      columnRootSplitId: target.columnRootSplitId,
      columnBoundaryIndex: target.columnBoundaryIndex,
      rowSplitId: target.rowSplitId,
      rowRootSplitId: target.rowRootSplitId,
      rowBoundaryIndex: target.rowBoundaryIndex
    });
  }

  function handleIntersectionPointerHover(target: {
    columnSplitId: string;
    columnRootSplitId: string;
    columnBoundaryIndex: number;
    rowSplitId: string;
    rowRootSplitId: string;
    rowBoundaryIndex: number;
  }): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget({
      kind: 'intersection-resize',
      columnSplitId: target.columnSplitId,
      columnRootSplitId: target.columnRootSplitId,
      columnBoundaryIndex: target.columnBoundaryIndex,
      rowSplitId: target.rowSplitId,
      rowRootSplitId: target.rowRootSplitId,
      rowBoundaryIndex: target.rowBoundaryIndex
    });
  }

  function handleIntersectionPointerLeave(): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget(null);
  }

  function handleEdgeIntersectionPointerEnter(target: { edge: LayoutEdge; splitId: string }): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget({
      kind: 'intersection-edge',
      edge: target.edge,
      splitId: target.splitId
    });
    workspaceInteractionHints.setHoveredHint({ kind: 'edge', edge: target.edge });
  }

  function handleEdgeIntersectionPointerHover(target: { edge: LayoutEdge; splitId: string }): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget({
      kind: 'intersection-edge',
      edge: target.edge,
      splitId: target.splitId
    });
  }

  function handleEdgeIntersectionPointerLeave(): void {
    clearResizeLineState();
    workspaceDebugHover.setHoveredTarget(null);
    workspaceInteractionHints.setHoveredHint(null);
  }

  function isIntersectionOnVisibleResizeLine(
    boundary: VisibleResizeBoundaryHandle,
    target: WorkspaceIntersectionGeometry
  ): boolean {
    if (!rootElement) {
      return false;
    }

    return isVisibleIntersectionOnResizeBoundary({
      workspaceElement: rootElement,
      boundary: resolveVisibleResizeBoundaryLineGeometry(boundary),
      left: target.left,
      top: target.top,
      size: target.size
    });
  }

  function isIntersectionOnHoveredResizeLine(target: WorkspaceIntersectionGeometry): boolean {
    if (!rootElement || !hoveredResizeLine) {
      return false;
    }
    return isVisibleIntersectionOnResizeBoundary({
      workspaceElement: rootElement,
      boundary: resolveVisibleResizeBoundaryLineGeometry(hoveredResizeLine),
      left: target.left,
      top: target.top,
      size: target.size
    });
  }

  function handleStartEdgeIntersectionPull(event: PointerEvent, target: EdgeIntersectionTarget): void {
    if (event.button !== 0) {
      return;
    }

    if (!rootElement) {
      return;
    }

    const anchor = resolveLocalPointer(event.clientX, event.clientY);

    if (!anchor) {
      return;
    }

    edgeIntersectionDragSession = {
      kind: 'pending',
      pointerId: event.pointerId,
      target,
      anchor
    };
    edgeIntersectionResizePreviewLine = null;
    event.preventDefault();
    event.stopPropagation();
  }

  function startEdgeIntersectionResize(
    pointerId: number,
    target: EdgeIntersectionTarget,
    pointer: { x: number; y: number },
    ctrlKey: boolean
  ): void {
    if (!rootElement) {
      return;
    }

    const boundary = resolveWorkspaceEdgeIntersectionResizeBoundary({
      target,
      boundaries: visibleResizeBoundaries
    });

    if (!boundary) {
      edgeIntersectionDragSession = null;
      edgeIntersectionResizePreviewLine = null;
      return;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const line = resolveVisibleResizeBoundaryLineGeometry(boundary);
    const axisStartPx =
      boundary.orientation === 'horizontal'
        ? boundary.containerRect.left - workspaceRect.left
        : boundary.containerRect.top - workspaceRect.top;
    const axisSizePx =
      boundary.orientation === 'horizontal' ? boundary.containerRect.width : boundary.containerRect.height;
    const anchorPositionPx =
      boundary.orientation === 'horizontal'
        ? line.rect.left - workspaceRect.left + 0.5
        : line.rect.top - workspaceRect.top + 0.5;
    const boundarySplitElement = resolveVisibleSplitGeometryElement({
      workspaceElement: rootElement,
      splitId: boundary.splitId,
      rootSplitId: boundary.rootSplitId,
      rootSplitElement
    });

    onBeginCoreHistoryTransaction();
    edgeIntersectionDragSession = {
      kind: 'resize',
      pointerId,
      target,
      anchor: pointer,
      boundary,
      gesture: createResizeGestureSession({
        axisStartPx,
        axisSizePx,
        ratioAxisSizePx: boundarySplitElement
          ? resolveVisibleSplitContentAxisSizePx(boundarySplitElement, boundary.orientation)
          : axisSizePx,
        anchorPositionPx,
        mode: ctrlKey ? 'proportional' : 'local',
        magnetKey: null
      })
    };

    startBoundaryPullFromEdge(target.edge, workspaceRect.left + pointer.x, workspaceRect.top + pointer.y);
    updateEdgeIntersectionResize(edgeIntersectionDragSession, pointer, ctrlKey);

    if (layoutInteraction.mode === 'boundary-pull' && localViewportRect) {
      onUpdateBoundaryPull(pointer, { width: localViewportRect.width, height: localViewportRect.height });
    }
  }

  function updateEdgeIntersectionResize(
    session: Extract<typeof edgeIntersectionDragSession, { kind: 'resize' }>,
    pointer: { x: number; y: number },
    ctrlKey: boolean
  ): void {
    if (!rootElement) {
      return;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const line = resolveVisibleResizeBoundaryLineGeometry(session.boundary);
    const rawCurrentPosition = session.boundary.orientation === 'horizontal' ? pointer.x : pointer.y;
    const currentPositionPx = rawCurrentPosition;
    const crossStartPx =
      session.boundary.orientation === 'horizontal'
        ? session.boundary.containerRect.top - workspaceRect.top
        : session.boundary.containerRect.left - workspaceRect.left;
    const crossSizePx =
      session.boundary.orientation === 'horizontal'
        ? session.boundary.containerRect.height
        : session.boundary.containerRect.width;
    const magnetSnap = resolveResizeMagnetSnapFromBoundaries({
      orientation: session.boundary.orientation,
      handleSplitId: session.boundary.splitId,
      containerRect: rootElement.getBoundingClientRect(),
      candidateBoundaries: visibleResizeBoundaries,
      axisSizePx:
        session.boundary.orientation === 'horizontal' ? rootElement.clientWidth : rootElement.clientHeight,
      crossStartPx,
      crossSizePx,
      currentPositionPx,
      magnetThresholdPx: RESIZE_MAGNET_THRESHOLD_PX
    });
    const resolvedPosition = magnetSnap?.positionPx ?? currentPositionPx;
    const mode = ctrlKey ? 'proportional' : 'local';
    const update = updateResizeGestureSession({
      session: session.gesture,
      rawCurrentPosition,
      resolvedPosition,
      mode,
      magnetKey: magnetSnap
        ? `${magnetSnap.rootSplitId}:${magnetSnap.boundaryIndex}:${magnetSnap.splitId}`
        : null,
      deleteIntent: false
    });

    edgeIntersectionDragSession = {
      ...session,
      gesture: update.session
    };

    edgeIntersectionResizePreviewLine =
      session.boundary.orientation === 'horizontal'
        ? {
            left: update.session.resolvedPositionPx - 0.5,
            top: line.rect.top - workspaceRect.top,
            width: 1,
            height: line.rect.height,
            snapped: update.session.magnetKey !== null
          }
        : {
            left: line.rect.left - workspaceRect.left,
            top: update.session.resolvedPositionPx - 0.5,
            width: line.rect.width,
            height: 1,
            snapped: update.session.magnetKey !== null
          };

    if (update.ratioDelta !== null) {
      onResizeSplitBoundary(
        session.target.rootSplitId,
        session.target.boundaryIndex,
        update.ratioDelta,
        mode
      );
    }
  }

  function handleEdgeIntersectionContextMenu(event: MouseEvent, target: { edge: LayoutEdge }): void {
    event.preventDefault();
    event.stopPropagation();
    openWorkspaceEdgeSplitMenuAt(target.edge, event.clientX, event.clientY);
  }

  function collectIntersectionSplitSnapshots(
    columnRootSplitId: string,
    rowRootSplitId: string
  ): Map<string, [number, number]> {
    return collectWorkspaceIntersectionSplitSnapshots({
      root: activeWindow?.root ?? null,
      columnRootSplitId,
      rowRootSplitId
    });
  }

  function restoreIntersectionSplitSnapshots(): void {
    if (!intersectionResizeSession) {
      return;
    }

    for (const [splitId, sizes] of intersectionResizeSession.splitSnapshots.entries()) {
      onResizeSplit(splitId, sizes);
    }
  }

  function resolveIntersectionResizeDimensions(
    state: Extract<LayoutInteractionState, { mode: 'intersection-resize' }>
  ): { width: number; height: number } | null {
    return resolveWorkspaceIntersectionResizeDimensions({
      targets: intersectionTargets,
      columnSplitId: state.columnSplitId,
      rowSplitId: state.rowSplitId
    });
  }

  function resolveIntersectionResizeAxisStarts(input: {
    columnSplitId: string;
    rowSplitId: string;
  }): { columnAxisStartPx: number; rowAxisStartPx: number } | null {
    if (!rootElement) {
      return null;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    return resolveWorkspaceIntersectionResizeAxisStarts({
      boundaries: visibleResizeBoundaries,
      workspaceRect,
      columnSplitId: input.columnSplitId,
      rowSplitId: input.rowSplitId
    });
  }

  function resolveIntersectionResizeSnappedPointer(
    pointer: { x: number; y: number },
    dimensions: { width: number; height: number }
  ): { x: number; y: number; columnMagnetKey: string | null; rowMagnetKey: string | null } {
    if (!rootElement) {
      return {
        ...pointer,
        columnMagnetKey: null,
        rowMagnetKey: null
      };
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    return resolveWorkspaceIntersectionResizeSnappedPointer({
      enabled:
        !!activeWindow &&
        activeWindow.root.kind === 'split' &&
        layoutInteraction.mode === 'intersection-resize',
      pointer,
      dimensions,
      workspaceRect,
      boundaries: visibleResizeBoundaries,
      columnSplitId: layoutInteraction.mode === 'intersection-resize' ? layoutInteraction.columnSplitId : '',
      rowSplitId: layoutInteraction.mode === 'intersection-resize' ? layoutInteraction.rowSplitId : '',
      magnetThresholdPx: RESIZE_MAGNET_THRESHOLD_PX
    });
  }

  function resolveIntersectionHandleSizePx(): number {
    return resolveResizeIntersectionHandleSizePx({
      baseSize: INTERSECTION_HANDLE_BASE_SIZE,
      deleteZoneMaxSizePx: resolveRootDeleteZoneMaxSizePx()
    });
  }

  function resolveIntersectionResizePreviewSizes(
    state: Extract<LayoutInteractionState, { mode: 'intersection-resize' }>,
    pointer: { x: number; y: number },
    dimensions: { width: number; height: number }
  ): {
    columnSizes: [number, number];
    rowSizes: [number, number];
  } | null {
    const columnMinRatio = resolveSplitDeleteZoneMinRatio(state.columnSplitId, dimensions.width);
    const rowMinRatio = resolveSplitDeleteZoneMinRatio(state.rowSplitId, dimensions.height);

    return resolveWorkspaceIntersectionResizePreviewSizes({
      anchor: state.anchor,
      pointer,
      dimensions,
      columnBaseSizes: state.columnBaseSizes,
      rowBaseSizes: state.rowBaseSizes,
      columnMinRatio,
      rowMinRatio
    });
  }

  function resolveSplitDeleteZoneMaxSizePx(splitId: string): number {
    const splitElement = resolveVisibleSplitGeometryElement({
      workspaceElement: rootElement,
      splitId,
      rootSplitId: activeWindow?.root.kind === 'split' ? activeWindow.root.id : null,
      rootSplitElement
    });

    if (!splitElement) {
      return ROOT_DELETE_ZONE_MIN_SIZE_PX;
    }

    return resolveTokenBasedDeleteZoneMaxSizePx(splitElement, ROOT_DELETE_ZONE_MIN_SIZE_PX);
  }

  function resolveSplitDeleteZoneMinRatio(splitId: string, axisSizePx: number): number {
    return resolveResizeDeleteZoneMinRatio({
      axisSizePx,
      deleteZoneMaxSizePx: resolveSplitDeleteZoneMaxSizePx(splitId)
    });
  }

  function resolveIntersectionPreview(
    state: Extract<LayoutInteractionState, { mode: 'intersection-resize' }>,
    session: typeof intersectionResizeSession
  ): {
    columnLine: ({ left: number; top: number; width: number; height: number } & { snapped: boolean }) | null;
    rowLine: ({ left: number; top: number; width: number; height: number } & { snapped: boolean }) | null;
  } {
    if (rootElement && session) {
      const workspaceRect = rootElement.getBoundingClientRect();
      const columnBoundary = findVisibleResizeBoundaryBySplitId(visibleResizeBoundaries, state.columnSplitId);
      const rowBoundary = findVisibleResizeBoundaryBySplitId(visibleResizeBoundaries, state.rowSplitId);

      return resolveWorkspaceIntersectionPreviewLines({
        columnMeasured: columnBoundary
          ? {
              resolvedPositionPx: session.columnGesture.resolvedPositionPx,
              containerTop: columnBoundary.containerRect.top - workspaceRect.top,
              containerHeight: columnBoundary.containerRect.height,
              snapped: session.columnGesture.magnetKey !== null
            }
          : null,
        rowMeasured: rowBoundary
          ? {
              resolvedPositionPx: session.rowGesture.resolvedPositionPx,
              containerLeft: rowBoundary.containerRect.left - workspaceRect.left,
              containerWidth: rowBoundary.containerRect.width,
              snapped: session.rowGesture.magnetKey !== null
            }
          : null,
        columnFallback: resolveSplitPreviewLineRect(
          state.columnSplitId,
          'horizontal',
          state.columnPreviewSizes
        ),
        rowFallback: resolveSplitPreviewLineRect(state.rowSplitId, 'vertical', state.rowPreviewSizes)
      });
    }

    return resolveWorkspaceIntersectionPreviewLines({
      columnMeasured: null,
      rowMeasured: null,
      columnFallback: resolveSplitPreviewLineRect(
        state.columnSplitId,
        'horizontal',
        state.columnPreviewSizes
      ),
      rowFallback: resolveSplitPreviewLineRect(state.rowSplitId, 'vertical', state.rowPreviewSizes)
    });
  }

  function resolveSplitPreviewLineRect(
    splitId: string,
    orientation: 'horizontal' | 'vertical',
    sizes: [number, number]
  ): { left: number; top: number; width: number; height: number } | null {
    if (!rootElement) {
      return null;
    }

    const boundary = findVisibleResizeBoundaryBySplitId(visibleResizeBoundaries, splitId);

    if (boundary) {
      return resolveVisibleResizePreviewLineRect({
        workspaceElement: rootElement,
        boundary,
        orientation,
        sizes
      });
    }

    const splitElement = resolveVisibleSplitGeometryElement({
      workspaceElement: rootElement,
      splitId,
      rootSplitId: activeWindow?.root.kind === 'split' ? activeWindow.root.id : null,
      rootSplitElement
    });

    if (!splitElement) {
      return null;
    }

    const workspaceRect = rootElement.getBoundingClientRect();
    const rect = splitElement.getBoundingClientRect();
    const localLeft = rect.left - workspaceRect.left;
    const localTop = rect.top - workspaceRect.top;

    if (orientation === 'horizontal') {
      return {
        left: localLeft + rect.width * sizes[0],
        top: localTop,
        width: 1,
        height: rect.height
      };
    }

    return {
      left: localLeft,
      top: localTop + rect.height * sizes[0],
      width: rect.width,
      height: 1
    };
  }

  $: activeSurfaceProps = activeWindow
    ? {
        activeWindow,
        rootSplitChain,
        workspace,
        focus,
        registry,
        dispatchCommand,
        onResizeSplit,
        onResizeSplitBoundary,
        onCollapseSplit,
        onCollapseSplitBoundary,
        onOpenInternalSplitMenu: handleOpenInternalSplitMenu,
        toolRuntimeHost,
        toolRuntimeUi,
        onStartPanelDrag: handleStartPanelDrag,
        draggingPanelId,
        onBeginAppHistoryTransaction,
        onCommitAppHistoryTransaction,
        onCancelAppHistoryTransaction,
        onBeginCoreHistoryTransaction,
        onCommitCoreHistoryTransaction,
        onCancelCoreHistoryTransaction,
        onDetachPanelToWindow,
        layoutEditingEnabled,
        showBoundaryResizeUi,
        showBoundaryPullUi,
        showIntersectionResizeUi,
        showPanelHeaderUi,
        showPanelToolSelectorUi,
        showPanelActionMenuUi,
        showResizeSnapHelpers,
        showDeleteZoneHelpers,
        showPanelLayoutMenuActions,
        showPanelToggleHeaderAction,
        showPanelSplitVerticalAction,
        showPanelSplitHorizontalAction,
        showPanelJoinAreasAction,
        showPanelSwapAreasAction,
        showToggleFullscreenAction,
        dockToggleButtonsVisible,
        showClosePanelAction,
        showMovePanelAction,
        fullscreenStackId,
        fullscreenViewportStyle,
        onToggleStackFullscreen: toggleStackFullscreen,
        intersectionMagnetKeys,
        suspendHeaderHover,
        rootResizeDeletePreview,
        rootResizeDragSession,
        onRootResize: handleRootResize,
        onRootResizeDragState: handleRootResizeDragState,
        onRootResizeHandleMenu: handleRootResizeHandleMenu,
        onHoverResizeHandle: handleResizeHandleHoverState
      }
    : null;

  $: activeOverlayProps = {
    boundaryHandlesRendered,
    layoutInteraction,
    fullscreenBoundaryPhase,
    showBoundaryPullUi,
    showIntersectionResizeUi,
    boundaryEditingEnabled,
    workspaceCornerPositions,
    edgeIntersectionTargets,
    intersectionTargets,
    debugEdgeIntersectionIds,
    linkedEdgeIntersectionIds,
    debugResizeIntersectionIds,
    linkedResizeIntersectionIds,
    resolveBoundaryEdgeVisualState,
    resolveBoundaryCornerVisualState,
    resolveEdgeIntersectionCursor: resolveWorkspaceEdgeIntersectionCursor,
    onStartBoundaryPullFromEdge: handleStartBoundaryPullFromEdge,
    onOpenWorkspaceEdgeSplitMenu: handleOpenWorkspaceEdgeSplitMenu,
    onStartBoundaryPullFromCorner: handleStartBoundaryPullFromCorner,
    onEdgeIntersectionPointerEnter: handleEdgeIntersectionPointerEnter,
    onEdgeIntersectionPointerHover: handleEdgeIntersectionPointerHover,
    onEdgeIntersectionPointerLeave: handleEdgeIntersectionPointerLeave,
    onStartEdgeIntersectionPull: handleStartEdgeIntersectionPull,
    onEdgeIntersectionContextMenu: handleEdgeIntersectionContextMenu,
    onIntersectionPointerEnter: handleIntersectionPointerEnter,
    onIntersectionPointerHover: handleIntersectionPointerHover,
    onIntersectionPointerLeave: handleIntersectionPointerLeave,
    onStartIntersectionResize: handleStartIntersectionResize,
    menuActions,
    activeMenuActionId: pendingMenuAction?.id ?? null,
    menuTargetRects,
    activeMenuTargetId,
    activeMenuSplitSegmentIndex,
    joinSourcePreviewRect,
    joinDestinationPreviewRect,
    swapSiblingPreviewRect,
    menuPreviewPanelRect,
    menuSplitPreview,
    previewPanelRect,
    splitPreview,
    previewSourceToolIcon,
    onStartMenuAction: handleStartMenuAction,
    onClearMenuAction: handleClearMenuAction,
    onSelectMenuTarget: handleSelectMenuTarget,
    onHoverMenuSplitSegment: handleHoverMenuSplitSegment,
    onCommitMenuTargetSegment: handleCommitMenuTargetSegment,
    onCommitMenuTarget: handleCommitMenuTarget,
    onHoverSplitSide,
    onConfirmSplitSide,
    handlePreviewOverlayClick,
    onCancelLayoutInteraction,
    boundaryPreview,
    hasIntersectionPreview: Boolean(intersectionPreview),
    edgeIntersectionResizePreviewLine,
    intersectionColumnLine: intersectionPreview?.columnLine ?? null,
    intersectionRowLine: intersectionPreview?.rowLine ?? null,
    activeIntersectionPreviewHandle,
    showDockPreviewHelpers,
    dragPreviewRect,
    dragPreviewPlacement,
    dragPreviewTabIndicatorRect,
    dragPanel,
    dragGhostStyle,
    tabDockLabel: $i18nT('ui.shell.layout.workspace.tabDock', { default: 'Tab Dock' })
  };
</script>

<WorkspaceWindowInteractionBridge
  onPointerMove={handleWindowPointerMove}
  onPointerUp={handleWindowPointerUp}
  onKeyDown={handleWindowKeyDown}
  onContextMenu={handleWindowContextMenu}
/>

{#if activeWindow && activeSurfaceProps && activeOverlayProps}
  <WorkspaceActiveWindowRegion
    bind:rootElement
    onPointerMove={handleWorkspacePointerMove}
    onPointerLeave={clearResizeHoverState}
    onWheel={handlePreviewWheel}
    bind:rootSplitElement
    surface={activeSurfaceProps}
    overlay={activeOverlayProps}
  />
{/if}
