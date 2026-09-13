import type {
  LayoutEdge,
  LayoutInteractionState,
  LayoutMenuActionSelection,
  LayoutMenuTarget,
  LayoutNode
} from '@konitif/workbench';
import {
  getSubdivisionPreview,
  resolveDefaultSubdivisionPreservedSegmentIndex,
  resolveSubdivisionSegmentPointerRatio,
  resolveWorkspaceEdgeMenuTargets
} from '@konitif/workbench';
import {
  createFallbackWorkspaceLayoutMenuTarget
} from './workspaceLayoutMenuController';
import {
  clampWorkspaceSplitSegmentIndex,
  type PendingWorkspaceLayoutMenuAction
} from './workspaceLayoutMenuModel';

export interface WorkspaceLayoutMenuDraftState {
  pendingAction: PendingWorkspaceLayoutMenuAction | null;
  cuts: number;
  selectedTargetId: string | null;
  hoveredTargetId: string | null;
  hoveredSplitSegmentIndex: number | null;
}

export interface WorkspaceLayoutMenuResolvedState {
  activeTargetId: string | null;
  selectedTarget: LayoutMenuTarget | null;
  defaultSplitSegmentIndex: number | null;
  activeSplitSegmentIndex: number | null;
  splitPointerRatio: number;
  splitPreview: ReturnType<typeof getSubdivisionPreview> | null;
}

export type WorkspaceLayoutMenuCommit =
  | {
      kind: 'split';
      panelId: string;
      edge: LayoutEdge;
      orientation: 'vertical' | 'horizontal';
      cuts: number;
      pointerRatio: number;
    }
  | Exclude<LayoutMenuActionSelection, { kind: 'split' }>;

export function createEmptyWorkspaceLayoutMenuDraftState(): WorkspaceLayoutMenuDraftState {
  return {
    pendingAction: null,
    cuts: 1,
    selectedTargetId: null,
    hoveredTargetId: null,
    hoveredSplitSegmentIndex: null
  };
}

export function resolveWorkspaceLayoutMenuTargets(input: {
  interaction: LayoutInteractionState;
  activeRoot: LayoutNode | null;
}): LayoutMenuTarget[] {
  if (input.interaction.mode !== 'split-menu') {
    return [];
  }

  if (input.interaction.targets.length > 0) {
    return input.interaction.targets;
  }

  if (input.interaction.panelId) {
    return [
      {
        ...createFallbackWorkspaceLayoutMenuTarget(input.interaction.panelId),
        edge: input.interaction.edge,
        joinSide: input.interaction.edge
      }
    ];
  }

  return input.activeRoot ? resolveWorkspaceEdgeMenuTargets(input.activeRoot, input.interaction.edge) : [];
}

export function resolveWorkspaceLayoutMenuDraftForInitialAction(input: {
  currentDraft: WorkspaceLayoutMenuDraftState;
  interaction: LayoutInteractionState;
  resolveAction(actionId: string): PendingWorkspaceLayoutMenuAction | null;
  resolveSelectableTargets(action: PendingWorkspaceLayoutMenuAction): LayoutMenuTarget[];
  resolveDefaultTargetId(candidates: LayoutMenuTarget[]): string | null;
}): WorkspaceLayoutMenuDraftState {
  if (
    input.interaction.mode !== 'split-menu' ||
    input.currentDraft.pendingAction ||
    !input.interaction.initialActionId
  ) {
    return input.currentDraft;
  }

  const initialAction = input.resolveAction(input.interaction.initialActionId);

  if (!initialAction) {
    return input.currentDraft;
  }

  const candidates = input.resolveSelectableTargets(initialAction);

  return {
    pendingAction: initialAction,
    cuts: 1,
    selectedTargetId: input.resolveDefaultTargetId(candidates),
    hoveredTargetId: null,
    hoveredSplitSegmentIndex: null
  };
}

export function resolveWorkspaceLayoutMenuState(input: {
  draft: WorkspaceLayoutMenuDraftState;
  selectableTargets: LayoutMenuTarget[];
}): WorkspaceLayoutMenuResolvedState {
  const activeTargetId = input.draft.hoveredTargetId ?? input.draft.selectedTargetId;
  const selectedTarget =
    input.selectableTargets.find((target) => target.id === activeTargetId) ??
    input.selectableTargets.find((target) => target.id === input.draft.selectedTargetId) ??
    input.selectableTargets[0] ??
    null;
  const defaultSplitSegmentIndex =
    input.draft.pendingAction?.kind === 'split' && selectedTarget
      ? resolveDefaultSubdivisionPreservedSegmentIndex(selectedTarget.edge, input.draft.cuts)
      : null;
  const activeSplitSegmentIndex =
    input.draft.pendingAction?.kind === 'split'
      ? clampWorkspaceSplitSegmentIndex(
          input.draft.hoveredSplitSegmentIndex ?? defaultSplitSegmentIndex ?? 0,
          input.draft.cuts
        )
      : null;
  const splitPointerRatio =
    input.draft.pendingAction?.kind === 'split' && selectedTarget && activeSplitSegmentIndex !== null
      ? resolveSubdivisionSegmentPointerRatio(selectedTarget.edge, input.draft.cuts, activeSplitSegmentIndex)
      : 0.5;
  const splitPreview =
    input.draft.pendingAction?.kind === 'split' && selectedTarget
      ? getSubdivisionPreview(
          input.draft.pendingAction.orientation,
          selectedTarget.edge,
          input.draft.cuts,
          splitPointerRatio
        )
      : null;

  return {
    activeTargetId,
    selectedTarget,
    defaultSplitSegmentIndex,
    activeSplitSegmentIndex,
    splitPointerRatio,
    splitPreview
  };
}

export function resolveWorkspaceLayoutMenuCommit(input: {
  action: PendingWorkspaceLayoutMenuAction;
  target: LayoutMenuTarget;
  segmentIndex: number | null;
  cuts: number;
  source: 'workspace-edge' | 'split-boundary' | 'panel-menu' | null;
}): WorkspaceLayoutMenuCommit {
  if (input.action.kind === 'split') {
    const nextSegmentIndex =
      input.segmentIndex === null
        ? resolveDefaultSubdivisionPreservedSegmentIndex(input.target.edge, input.cuts)
        : clampWorkspaceSplitSegmentIndex(input.segmentIndex, input.cuts);
    const pointerRatio = resolveSubdivisionSegmentPointerRatio(input.target.edge, input.cuts, nextSegmentIndex);

    return {
      kind: 'split',
      panelId: input.target.panelId,
      edge: input.target.edge,
      orientation: input.action.orientation,
      cuts: input.cuts,
      pointerRatio
    };
  }

  if (input.action.kind === 'join') {
    // Panel-menu previews mark the source panel as the survivor, while the
    // core join action removes the source area and expands the sibling area.
    return {
      kind: 'join',
      panelId: input.target.panelId,
      edge: input.target.edge,
      side: input.target.joinSide,
      sourceAreaPanelIds:
        input.source === 'panel-menu' ? input.target.joinSiblingPanelIds : input.target.areaPanelIds,
      siblingAreaPanelIds:
        input.source === 'panel-menu' ? input.target.areaPanelIds : input.target.joinSiblingPanelIds
    };
  }

  return {
    kind: 'swap',
    panelId: input.target.panelId,
    edge: input.target.edge,
    sourceAreaPanelIds: input.target.areaPanelIds,
    siblingAreaPanelIds: input.target.swapSiblingPanelIds
  };
}
