import type { LayoutMenuTarget, LayoutNode } from '@konitif/workbench';
import {
  resolvePanelMenuJoinTargets,
  resolvePanelMenuSwapTargets
} from '@konitif/workbench';
import {
  isWorkspacePanelMenuBoundaryCandidateAligned,
  type PendingWorkspaceLayoutMenuAction,
  type WorkspaceLayoutRect
} from './workspaceLayoutMenuModel';

export type WorkspaceLayoutMenuSource = 'workspace-edge' | 'split-boundary' | 'panel-menu';

export function createFallbackWorkspaceLayoutMenuTarget(panelId: string): LayoutMenuTarget {
  return {
    panelId,
    id: `panel:${panelId}`,
    areaId: `panel:${panelId}`,
    areaPanelIds: [panelId],
    edge: 'left',
    label: '',
    joinSide: 'left',
    joinSiblingPanelIds: [],
    swapSiblingPanelIds: []
  };
}

export function createPreviewWorkspaceLayoutMenuTarget(panelIds: readonly string[]): LayoutMenuTarget {
  return {
    id: '__preview__',
    panelId: panelIds[0] ?? '',
    areaId: '__preview__',
    areaPanelIds: panelIds,
    edge: 'left',
    label: '',
    joinSide: 'left',
    joinSiblingPanelIds: [],
    swapSiblingPanelIds: []
  };
}

export function resolveWorkspacePanelMenuBoundaryCandidates(input: {
  action: PendingWorkspaceLayoutMenuAction;
  source: WorkspaceLayoutMenuSource;
  root: LayoutNode | null;
  panelId: string | null;
  sourcePanelRect: WorkspaceLayoutRect | null;
  resolveSiblingRect: (panelIds: readonly string[]) => WorkspaceLayoutRect | null;
}): LayoutMenuTarget[] | null {
  if (
    input.action.kind === 'split' ||
    input.source !== 'panel-menu' ||
    !input.root ||
    !input.panelId
  ) {
    return null;
  }

  const candidates =
    input.action.kind === 'join'
      ? resolvePanelMenuJoinTargets(input.root, input.panelId)
      : resolvePanelMenuSwapTargets(input.root, input.panelId);

  const sourcePanelRect = input.sourcePanelRect;

  if (candidates.length === 0 || !sourcePanelRect) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const siblingPanelIds =
      input.action.kind === 'join'
        ? candidate.joinSiblingPanelIds
        : candidate.swapSiblingPanelIds;
    const siblingRect = input.resolveSiblingRect(siblingPanelIds);

    if (!siblingRect) {
      return false;
    }

    return isWorkspacePanelMenuBoundaryCandidateAligned({
      edge: candidate.edge,
      sourceRect: sourcePanelRect,
      siblingRect
    });
  });
}
