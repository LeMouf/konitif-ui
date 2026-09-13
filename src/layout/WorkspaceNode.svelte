<script lang="ts">
  import type {
    InMemoryToolRegistry,
    LayoutNode,
    LayoutEdge,
    LayoutMenuActionId,
    LayoutMenuTarget,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import { buildSplitGridStyle, flattenSplitChain, type FlattenedSplitHandle } from './splitChain';
  import { resolveResizePreviewDriver, type ResizeDeletePreview } from './resizeBoundaryPreview';
  import WorkspaceResizePreviewRegion from './WorkspaceResizePreviewRegion.svelte';
  import {
    RESIZE_DELETE_ZONE_APPROACH_THRESHOLD_PX,
    RESIZE_DELETE_ZONE_MIN_SIZE_PX,
    RESIZE_DELETE_ZONE_THRESHOLD_PX,
    RESIZE_MAGNET_THRESHOLD_PX,
    resolveMeasuredDeleteZoneMaxSizePx
  } from './workspaceNodeResizeMetrics';
  import {
    applyWorkspaceNodeResizePreviewGesture,
    createWorkspaceNodeResizeDragStartState,
    createWorkspaceNodeResizeDragSessionFromDriver,
    createWorkspaceSplitResizeCommitState,
    resolveWorkspaceNodeResizeDeletePreview,
    resolveWorkspaceSplitResizeReleaseDecision,
    resolveWorkspaceSplitResizeCommitState,
    resolveWorkspaceSplitResizePreviewChain,
    updateWorkspaceNodeResizeDragSession,
    type WorkspaceSplitResizeCommitState,
    type WorkspaceNodeResizeDragSession
  } from './workspaceNodeResizeController';
  import {
    resolveVisibleResizeBoundaryFromElement,
    resolveVisibleResizeBoundaryLineGeometry,
    resolveVisibleSplitContentAxisSizePx
  } from './visibleLayoutProjection';
  import {
    cancelWorkspaceNodeResizePreview,
    resolveWorkspaceNodeResizeHandleMenu,
    type WorkspaceNodeResizeState
  } from './workspaceNodeResizeActions';
  import WorkspaceNodeInteractionBridge from './WorkspaceNodeInteractionBridge.svelte';
  import WorkspaceNodeSplitHandleRegion from './WorkspaceNodeSplitHandleRegion.svelte';
  import WorkspaceNodeStackRegion from './WorkspaceNodeStackRegion.svelte';
  import WorkspaceSplitFrame from './WorkspaceSplitFrame.svelte';

  type ToolRuntimeUiStateMap = Record<
    string,
    | {
        panelLoading: ToolPanelLoadingState | null;
        resourceLoading: ToolResourceLoadingState | null;
      }
    | undefined
  >;

  export let node: LayoutNode;
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
  export let onCollapseSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    removeSide: 'start' | 'end'
  ) => void;
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
  export let onOpenPanelLayoutMenu:
    | ((
        panelId: string,
        anchor: { x: number; y: number },
        initialActionId: LayoutMenuActionId,
        targets: LayoutMenuTarget[]
      ) => void)
    | null = null;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let toolRuntimeUi: ToolRuntimeUiStateMap = {};
  export let onStartPanelDrag:
    | ((panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void)
    | null = null;
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
  export let onHoverResizeHandle:
    | ((
        input:
          | {
              phase: 'enter' | 'move';
              splitId: string;
              rootSplitId: string;
              boundaryIndex: number;
              orientation: 'horizontal' | 'vertical';
              rect: { left: number; top: number; width: number; height: number };
            }
          | { phase: 'leave'; splitId: string }
      ) => void)
    | null = null;

  let splitElement: HTMLDivElement | null = null;
  let canceledResizeSplitId: string | null = null;
  let resizeDragSession: WorkspaceNodeResizeDragSession | null = null;
  let resizeCommitState: WorkspaceSplitResizeCommitState = createWorkspaceSplitResizeCommitState();

  let resizeDeletePreview: ResizeDeletePreview | null = null;

  $: flattenedSplitChain = node.kind === 'split' ? flattenSplitChain(node) : null;
  $: renderedSplitSegments = resolveWorkspaceSplitResizePreviewChain({
    splitChain: flattenedSplitChain,
    session: resizeDragSession
  });

  function resolveRenderedResizePosition(splitId: string): number | null {
    const handleElement =
      splitElement?.querySelector<HTMLElement>(`.resize-handle[data-split-id="${splitId}"]`) ?? null;
    const boundary = resolveVisibleResizeBoundaryFromElement(handleElement);

    if (!boundary) {
      return null;
    }

    const line = resolveVisibleResizeBoundaryLineGeometry(boundary);
    return boundary.orientation === 'horizontal' ? line.rect.left + 0.5 : line.rect.top + 0.5;
  }
  $: headerHoverSuspended = suspendHeaderHover || !!resizeDragSession || !!resizeDeletePreview;

  function applyResizeState(state: WorkspaceNodeResizeState): void {
    canceledResizeSplitId = state.canceledResizeSplitId;
    resizeDeletePreview = state.resizeDeletePreview;
    resizeDragSession = state.resizeDragSession;
    resizeCommitState = createWorkspaceSplitResizeCommitState();
  }

  function handleResize(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number }
  ): void {
    if (!showBoundaryResizeUi || !splitElement) {
      return;
    }

    if (canceledResizeSplitId === handle.splitId) {
      return;
    }

    const mode = detail.ctrlKey ? 'proportional' : 'local';
    const rawCurrentPosition = handle.orientation === 'horizontal' ? detail.clientX : detail.clientY;
    const driver = resolveResizePreviewDriver({
      preview: resizeDeletePreview,
      splitId: handle.splitId,
      boundaryIndex,
      rawCurrentPositionPx: rawCurrentPosition
    });
    const currentPosition = driver.currentPositionPx;
    if (
      !resizeDragSession ||
      resizeDragSession.splitId !== handle.splitId ||
      resizeDragSession.boundaryIndex !== boundaryIndex
    ) {
      const totalSize =
        handle.orientation === 'horizontal' ? splitElement.clientWidth : splitElement.clientHeight;

      if (totalSize <= 0) {
        return;
      }

      resizeDragSession = createWorkspaceNodeResizeDragSessionFromDriver({
        splitId: handle.splitId,
        boundaryIndex,
        orientation: handle.orientation,
        axisStartPx: resizeDeletePreview?.axisStartPx ?? rawCurrentPosition - currentPosition,
        axisSizePx: totalSize,
        ratioAxisSizePx: resolveVisibleSplitContentAxisSizePx(splitElement, handle.orientation),
        mode,
        driver
      });
      resizeCommitState = createWorkspaceSplitResizeCommitState(null, mode);
      return;
    }

    const { session } = updateWorkspaceNodeResizeDragSession({
      session: resizeDragSession,
      rawCurrentPosition,
      baselineResolvedPosition: resolveRenderedResizePosition(handle.splitId),
      mode,
      driver
    });

    resizeDragSession = session;
    resizeCommitState = resolveWorkspaceSplitResizeCommitState(session, mode);

    resizeDeletePreview = applyWorkspaceNodeResizePreviewGesture({
      preview: resizeDeletePreview,
      splitId: handle.splitId,
      boundaryIndex,
      session
    });
  }

  function handleResizeHandleMenu(
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

    applyResizeState(resolution);

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

  function updateResizeDeletePreview(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    pointerX: number,
    pointerY: number
  ): void {
    if (
      !splitElement ||
      !resizeDeletePreview ||
      resizeDeletePreview.splitId !== handle.splitId ||
      canceledResizeSplitId === handle.splitId
    ) {
      return;
    }
    resizeDeletePreview = resolveWorkspaceNodeResizeDeletePreview({
      preview: resizeDeletePreview,
      dragSession: resizeDragSession,
      orientation: handle.orientation,
      splitId: handle.splitId,
      boundaryIndex,
      pointerPositionPx: handle.orientation === 'horizontal' ? pointerX : pointerY,
      containerElement: splitElement,
      candidateRootElement: splitElement.closest('.workspace-view'),
      magnetThresholdPx: RESIZE_MAGNET_THRESHOLD_PX
    });
  }

  function handleResizeDragState(
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ): void {
    if (!showBoundaryResizeUi || !splitElement || !flattenedSplitChain) {
      return;
    }

    if (event.detail.phase === 'start') {
      onBeginCoreHistoryTransaction();
      canceledResizeSplitId = null;
      const startSegment = flattenedSplitChain.segments[boundaryIndex];
      const endSegment = flattenedSplitChain.segments[boundaryIndex + 1];

      if (!startSegment || !endSegment) {
        resizeDeletePreview = null;
        resizeCommitState = createWorkspaceSplitResizeCommitState();
        return;
      }

      const rect = splitElement.getBoundingClientRect();
      const axisStart = handle.orientation === 'horizontal' ? rect.left : rect.top;
      const axisSize =
        handle.orientation === 'horizontal' ? splitElement.clientWidth : splitElement.clientHeight;
      const crossLimit =
        handle.orientation === 'horizontal' ? splitElement.clientHeight : splitElement.clientWidth;
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
        ratioAxisSizePx: resolveVisibleSplitContentAxisSizePx(splitElement, handle.orientation),
        crossStartPx,
        crossSizePx,
        initialDragPositionPx,
        deleteZoneMaxSizePx: resolveMeasuredDeleteZoneMaxSizePx(
          splitElement,
          startSegment.node,
          endSegment.node,
          RESIZE_DELETE_ZONE_MIN_SIZE_PX
        ),
        activeThresholdPx: RESIZE_DELETE_ZONE_THRESHOLD_PX,
        approachThresholdPx: RESIZE_DELETE_ZONE_APPROACH_THRESHOLD_PX
      });
      resizeDeletePreview = resizeStartState.preview;
      resizeDragSession = resizeStartState.session;
      resizeCommitState = createWorkspaceSplitResizeCommitState();
      return;
    }

    if (event.detail.phase === 'move') {
      if (canceledResizeSplitId === handle.splitId) {
        return;
      }

      updateResizeDeletePreview(handle, boundaryIndex, event.detail.clientX, event.detail.clientY);
      return;
    }

    if (event.detail.phase === 'cancel') {
      canceledResizeSplitId = handle.splitId;
      resizeDeletePreview = null;
      resizeDragSession = null;
      resizeCommitState = createWorkspaceSplitResizeCommitState();
      onCancelCoreHistoryTransaction();
      return;
    }

    if (event.detail.phase === 'end') {
      if (canceledResizeSplitId === handle.splitId) {
        canceledResizeSplitId = null;
        resizeDeletePreview = null;
        resizeDragSession = null;
        resizeCommitState = createWorkspaceSplitResizeCommitState();
        onCancelCoreHistoryTransaction();
        return;
      }

      const commitState = resizeCommitState;
      const releaseDecision = resolveWorkspaceSplitResizeReleaseDecision({
        preview: resizeDeletePreview,
        fallbackBoundaryIndex: boundaryIndex,
        commitState,
        collapseEnabled: showDeleteZoneHelpers
      });
      resizeDeletePreview = null;
      resizeDragSession = null;
      resizeCommitState = createWorkspaceSplitResizeCommitState();

      if (releaseDecision.kind === 'collapse') {
        onCollapseSplitBoundary(node.id, releaseDecision.boundaryIndex, releaseDecision.removeSide);
        onCommitCoreHistoryTransaction();
        return;
      }

      if (releaseDecision.kind === 'resize') {
        onResizeSplitBoundary(
          node.id,
          releaseDecision.boundaryIndex,
          releaseDecision.deltaRatio,
          releaseDecision.mode
        );
      }

      onCommitCoreHistoryTransaction();
    }
  }

  function handleWindowKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    const state = cancelWorkspaceNodeResizePreview({ resizeDeletePreview });

    if (!state) {
      return;
    }

    applyResizeState(state);
    onCancelCoreHistoryTransaction();
  }

  function handleWindowContextMenu(event: MouseEvent): void {
    const state = cancelWorkspaceNodeResizePreview({ resizeDeletePreview });

    if (!state) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    applyResizeState(state);
    onCancelCoreHistoryTransaction();
  }
</script>

<WorkspaceNodeInteractionBridge onKeyDown={handleWindowKeyDown} onContextMenu={handleWindowContextMenu} />

{#if node.kind === 'split'}
  <WorkspaceSplitFrame
    bind:splitElement
    splitId={node.id}
    orientation={flattenedSplitChain?.orientation ?? node.orientation}
    splitStyle={flattenedSplitChain
      ? buildSplitGridStyle(flattenedSplitChain.orientation, renderedSplitSegments)
      : ''}
    className="workspace-node workspace-node--split"
  >
    {#each flattenedSplitChain?.segments ?? [] as segment, index (segment.id)}
      <svelte:self
        node={segment.node}
        {workspace}
        {focus}
        {registry}
        {dispatchCommand}
        {onResizeSplit}
        {onResizeSplitBoundary}
        {onCollapseSplit}
        {onCollapseSplitBoundary}
        {onOpenSplitMenu}
        {onOpenPanelLayoutMenu}
        {toolRuntimeHost}
        {toolRuntimeUi}
        {onStartPanelDrag}
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
        suspendHeaderHover={headerHoverSuspended}
        {onHoverResizeHandle}
      />

      {#if flattenedSplitChain && index < flattenedSplitChain.handles.length}
        <WorkspaceNodeSplitHandleRegion
          handle={flattenedSplitChain.handles[index]}
          rootSplitId={node.id}
          boundaryIndex={index}
          orientation={flattenedSplitChain.orientation}
          {resizeDeletePreview}
          {showBoundaryResizeUi}
          {showResizeSnapHelpers}
          {intersectionMagnetKeys}
          onResize={handleResize}
          onDragState={handleResizeDragState}
          onOpenMenu={handleResizeHandleMenu}
          {onHoverResizeHandle}
        />
      {/if}
    {/each}

    <WorkspaceResizePreviewRegion
      preview={resizeDeletePreview}
      session={resizeDragSession}
      {showResizeSnapHelpers}
      {showDeleteZoneHelpers}
    />
  </WorkspaceSplitFrame>
{:else}
  <WorkspaceNodeStackRegion
    stack={node}
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
    {onToggleStackFullscreen}
    suspendHeaderHover={headerHoverSuspended}
  />
{/if}
