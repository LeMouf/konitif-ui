import type {
  InMemoryToolRegistry,
  LayoutDockSide,
  LayoutEdge,
  LayoutInteractionState,
  LayoutMenuActionId,
  LayoutMenuActionItem,
  LayoutMenuTarget,
  PanelSubdivisionPreview,
  ToolPanelLoadingState,
  ToolResourceLoadingState,
  ToolRuntimeHostActions,
  Workspace,
  WorkspaceCommand,
  WorkspaceFocus,
  WorkspaceWindow,
  WorkbenchIconInput
} from '@konitif/workbench';
import type { ResizeDeletePreview } from './resizeBoundaryPreview';
import type { FlattenedSplitChain, FlattenedSplitHandle } from './splitChain';
import type {
  VisibleEdgeIntersectionTarget,
  VisibleResizeIntersectionTarget,
  VisibleWorkspaceCornerPositions
} from './visibleLayoutProjection';
import type { WorkspaceBoundaryCorner, WorkspaceBoundaryVisualState } from './workspaceBoundaryPullPreviewModel';
import type { WorkspaceNodeResizeDragSession } from './workspaceNodeResizeController';

export type WorkspaceToolRuntimeUiStateMap = Record<
  string,
  | {
      panelLoading: ToolPanelLoadingState | null;
      resourceLoading: ToolResourceLoadingState | null;
    }
  | undefined
>;

export type WorkspaceOverlayRect = { left: number; top: number; width: number; height: number };

export type WorkspaceBoundaryGuide = WorkspaceOverlayRect & {
  key: string;
  axis: 'horizontal' | 'vertical';
  kind: 'neutral' | 'creation';
  crossed: boolean;
  armed: boolean;
};

export type WorkspaceBoundaryTrail = WorkspaceOverlayRect & {
  key: string;
  axis: 'horizontal' | 'vertical';
  kind: 'armed' | 'creation';
};

export type WorkspaceBoundaryBand = WorkspaceOverlayRect & {
  key: string;
  axis: 'horizontal' | 'vertical';
};

export interface WorkspaceBoundaryPreview {
  guides: WorkspaceBoundaryGuide[];
  trails: WorkspaceBoundaryTrail[];
  bands: WorkspaceBoundaryBand[];
}

export type WorkspaceIntersectionLine = WorkspaceOverlayRect & { snapped: boolean };
export type WorkspaceIntersectionHandle = { left: number; top: number; size: number; snapped: boolean };
export type WorkspaceDragPanel = { title: string };
export type WorkspaceFullscreenBoundaryPhase = 'visible' | 'fading-out' | 'hidden' | 'fading-in';
export type WorkspaceEdgeSplitHandleEvent = CustomEvent<{ edge: LayoutEdge; clientX: number; clientY: number }>;
export type WorkspaceBoundaryCornerHandleEvent = CustomEvent<{
  corner: WorkspaceBoundaryCorner;
  clientX: number;
  clientY: number;
}>;

export type WorkspaceResizeHoverState =
  | {
      phase: 'enter' | 'move';
      splitId: string;
      rootSplitId: string;
      boundaryIndex: number;
      orientation: 'horizontal' | 'vertical';
      rect: WorkspaceOverlayRect;
    }
  | { phase: 'leave'; splitId: string };

export interface WorkspaceActiveSurfaceProps {
  activeWindow: WorkspaceWindow;
  rootSplitChain: FlattenedSplitChain | null;
  workspace: Workspace;
  focus: WorkspaceFocus;
  registry: InMemoryToolRegistry;
  dispatchCommand: (command: WorkspaceCommand) => void;
  onResizeSplit: (splitId: string, sizes: [number, number]) => void;
  onResizeSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    deltaRatio: number,
    mode: 'local' | 'proportional'
  ) => void;
  onCollapseSplit: (splitId: string, removeChildIndex: 0 | 1) => void;
  onCollapseSplitBoundary: (
    rootSplitId: string,
    boundaryIndex: number,
    removeSide: 'start' | 'end'
  ) => void;
  onOpenInternalSplitMenu: (
    panelId: string | null,
    edge: LayoutEdge,
    anchor: { x: number; y: number },
    targets?: LayoutMenuTarget[],
    options?: {
      source?: 'workspace-edge' | 'split-boundary' | 'panel-menu';
      initialActionId?: LayoutMenuActionId | null;
    }
  ) => void;
  toolRuntimeHost: ToolRuntimeHostActions;
  toolRuntimeUi: WorkspaceToolRuntimeUiStateMap;
  onStartPanelDrag:
    | ((panelId: string, sourceStackId: string, anchor: { x: number; y: number }) => void)
    | null;
  draggingPanelId: string | null;
  onBeginAppHistoryTransaction: () => void;
  onCommitAppHistoryTransaction: () => void;
  onCancelAppHistoryTransaction: () => void;
  onBeginCoreHistoryTransaction: () => void;
  onCommitCoreHistoryTransaction: () => void;
  onCancelCoreHistoryTransaction: () => void;
  onDetachPanelToWindow: (panelId: string) => void;
  layoutEditingEnabled: boolean;
  showBoundaryResizeUi: boolean;
  showBoundaryPullUi: boolean;
  showIntersectionResizeUi: boolean;
  showPanelHeaderUi: boolean;
  showPanelToolSelectorUi: boolean;
  showPanelActionMenuUi: boolean;
  showResizeSnapHelpers: boolean;
  showDeleteZoneHelpers: boolean;
  showPanelLayoutMenuActions: boolean;
  showPanelToggleHeaderAction: boolean;
  showPanelSplitVerticalAction: boolean;
  showPanelSplitHorizontalAction: boolean;
  showPanelJoinAreasAction: boolean;
  showPanelSwapAreasAction: boolean;
  showToggleFullscreenAction: boolean;
  dockToggleButtonsVisible: boolean;
  showClosePanelAction: boolean;
  showMovePanelAction: boolean;
  fullscreenStackId: string | null;
  fullscreenViewportStyle: string;
  onToggleStackFullscreen: ((stackId: string) => void) | null;
  intersectionMagnetKeys: Set<string> | null;
  suspendHeaderHover: boolean;
  rootResizeDeletePreview: ResizeDeletePreview | null;
  rootResizeDragSession: WorkspaceNodeResizeDragSession | null;
  onRootResize: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number }
  ) => void;
  onRootResizeDragState: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: WorkspaceOverlayRect;
    }>
  ) => void;
  onRootResizeHandleMenu: (
    handle: FlattenedSplitHandle,
    event: CustomEvent<{ clientX: number; clientY: number }>
  ) => void;
  onHoverResizeHandle: ((input: WorkspaceResizeHoverState) => void) | null;
}

export interface WorkspaceActiveOverlayProps {
  boundaryHandlesRendered: boolean;
  layoutInteraction: LayoutInteractionState;
  fullscreenBoundaryPhase: WorkspaceFullscreenBoundaryPhase;
  showBoundaryPullUi: boolean;
  showIntersectionResizeUi: boolean;
  boundaryEditingEnabled: boolean;
  workspaceCornerPositions: VisibleWorkspaceCornerPositions | null;
  edgeIntersectionTargets: VisibleEdgeIntersectionTarget[];
  intersectionTargets: VisibleResizeIntersectionTarget[];
  debugEdgeIntersectionIds: Set<string>;
  linkedEdgeIntersectionIds: Set<string>;
  debugResizeIntersectionIds: Set<string>;
  linkedResizeIntersectionIds: Set<string>;
  resolveBoundaryEdgeVisualState: (edge: LayoutEdge) => WorkspaceBoundaryVisualState;
  resolveBoundaryCornerVisualState: (corner: WorkspaceBoundaryCorner) => WorkspaceBoundaryVisualState;
  resolveEdgeIntersectionCursor: (edge: LayoutEdge) => string;
  onStartBoundaryPullFromEdge: (event: WorkspaceEdgeSplitHandleEvent) => void;
  onOpenWorkspaceEdgeSplitMenu: (event: WorkspaceEdgeSplitHandleEvent) => void;
  onStartBoundaryPullFromCorner: (
    corner: WorkspaceBoundaryCorner,
    event: WorkspaceBoundaryCornerHandleEvent
  ) => void;
  onEdgeIntersectionPointerEnter: (target: VisibleEdgeIntersectionTarget) => void;
  onEdgeIntersectionPointerHover: (target: VisibleEdgeIntersectionTarget) => void;
  onEdgeIntersectionPointerLeave: () => void;
  onStartEdgeIntersectionPull: (event: PointerEvent, target: VisibleEdgeIntersectionTarget) => void;
  onEdgeIntersectionContextMenu: (event: MouseEvent, target: VisibleEdgeIntersectionTarget) => void;
  onIntersectionPointerEnter: (target: VisibleResizeIntersectionTarget) => void;
  onIntersectionPointerHover: (target: VisibleResizeIntersectionTarget) => void;
  onIntersectionPointerLeave: () => void;
  onStartIntersectionResize: (event: PointerEvent, target: VisibleResizeIntersectionTarget) => void;
  menuActions: LayoutMenuActionItem[];
  activeMenuActionId: string | null;
  menuTargetRects: Array<WorkspaceOverlayRect & { targetId: string }>;
  activeMenuTargetId: string | null;
  activeMenuSplitSegmentIndex: number | null;
  joinSourcePreviewRect: WorkspaceOverlayRect | null;
  joinDestinationPreviewRect: WorkspaceOverlayRect | null;
  swapSiblingPreviewRect: WorkspaceOverlayRect | null;
  menuPreviewPanelRect: WorkspaceOverlayRect | null;
  menuSplitPreview: PanelSubdivisionPreview | null;
  previewPanelRect: WorkspaceOverlayRect | null;
  splitPreview: PanelSubdivisionPreview | null;
  previewSourceToolIcon: WorkbenchIconInput | null;
  onStartMenuAction: (actionId: string) => void;
  onClearMenuAction: () => void;
  onSelectMenuTarget: (panelId: string | null) => void;
  onHoverMenuSplitSegment: (segmentIndex: number | null) => void;
  onCommitMenuTargetSegment: (targetId: string, segmentIndex: number) => void;
  onCommitMenuTarget: (panelId: string) => void;
  onHoverSplitSide: (side: LayoutDockSide | null) => void;
  onConfirmSplitSide: (side: LayoutDockSide) => void;
  handlePreviewOverlayClick: (event: MouseEvent) => void;
  onCancelLayoutInteraction: () => void;
  boundaryPreview: WorkspaceBoundaryPreview | null;
  hasIntersectionPreview: boolean;
  edgeIntersectionResizePreviewLine: WorkspaceIntersectionLine | null;
  intersectionColumnLine: WorkspaceIntersectionLine | null;
  intersectionRowLine: WorkspaceIntersectionLine | null;
  activeIntersectionPreviewHandle: WorkspaceIntersectionHandle | null;
  showDockPreviewHelpers: boolean;
  dragPreviewRect: WorkspaceOverlayRect | null;
  dragPreviewPlacement: string | null;
  dragPreviewTabIndicatorRect: WorkspaceOverlayRect | null;
  dragPanel: WorkspaceDragPanel | null;
  dragGhostStyle: string;
  tabDockLabel: string;
}
