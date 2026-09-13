import type { LayoutEdge, Workspace, WorkspaceCommand } from '@konitif/workbench';
import { canJoinPanelArea, canSwapPanelArea } from '@konitif/workbench';
import type { StackNode } from '@konitif/workbench';

export type StackPanelLayoutActionId =
  | 'toggle-header'
  | 'toggle-fullscreen-toggle'
  | 'split:vertical'
  | 'split:horizontal'
  | 'join-areas'
  | 'swap-areas';

export interface StackPanelLayoutAction {
  id: StackPanelLayoutActionId;
  label: string;
  icon: 'header' | 'fullscreen' | 'split-vertical' | 'split-horizontal' | 'join' | 'swap';
  disabled?: boolean;
  separatorAfter?: boolean;
  command?: WorkspaceCommand;
}

export interface StackPanelLayoutActionLabels {
  hideHeader: string;
  showHeader: string;
  hideFullscreenToggle: string;
  showFullscreenToggle: string;
  verticalSplit: string;
  horizontalSplit: string;
  joinAreas: string;
  swapAreas: string;
}

export function createStackPanelLayoutActions(options: {
  workspace: Workspace;
  stack: StackNode;
  panelId: string;
  labels: StackPanelLayoutActionLabels;
}): StackPanelLayoutAction[] {
  const { workspace, stack, panelId, labels } = options;
  const edges: LayoutEdge[] = ['left', 'right', 'top', 'bottom'];
  const hasJoinCandidate = edges.some((edge) => canJoinPanelArea(workspace, { panelId, edge }));
  const hasSwapCandidate = edges.some((edge) => canSwapPanelArea(workspace, { panelId, edge }));
  const panel = stack.children.find((candidate) => candidate.id === panelId);
  const showFullscreenToggleForPanel = panel?.showFullscreenToggle !== false;

  return [
    {
      id: 'toggle-header',
      label: stack.headerVisible === false ? labels.showHeader : labels.hideHeader,
      icon: 'header',
      command: {
        type: 'set-stack-header-visibility',
        stackId: stack.id,
        visible: stack.headerVisible === false
      }
    },
    {
      id: 'toggle-fullscreen-toggle',
      label: showFullscreenToggleForPanel ? labels.hideFullscreenToggle : labels.showFullscreenToggle,
      icon: 'fullscreen',
      separatorAfter: true,
      command: {
        type: 'set-panel-fullscreen-toggle-visibility',
        panelId,
        visible: !showFullscreenToggleForPanel
      }
    },
    {
      id: 'split:vertical',
      label: labels.verticalSplit,
      icon: 'split-vertical'
    },
    {
      id: 'split:horizontal',
      label: labels.horizontalSplit,
      icon: 'split-horizontal'
    },
    {
      id: 'join-areas',
      label: labels.joinAreas,
      icon: 'join',
      disabled: !hasJoinCandidate
    },
    {
      id: 'swap-areas',
      label: labels.swapAreas,
      icon: 'swap',
      disabled: !hasSwapCandidate
    }
  ];
}
