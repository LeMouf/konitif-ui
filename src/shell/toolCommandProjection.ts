import type { ResolvedToolShellHeaderAction, WorkbenchToolDockActionSide, WorkbenchReadingLevel, WorkspaceCommand } from '@konitif/workbench';

type ToolCommand = Extract<WorkspaceCommand, { type: 'run-tool-shell-command' }>;
export interface ToolCommandTarget {
  panelId: string;
  toolInstanceId: string;
  inheritedReadingLevel?: WorkbenchReadingLevel;
}

/** Creates an intent envelope only. Admission and execution remain with the owner. */
export function projectToolCommand(target: ToolCommandTarget, commandId: string): ToolCommand {
  return { type: 'run-tool-shell-command', ...target, commandId };
}

export interface ToolDockMenuProjection {
  label?: string;
  icon?: ResolvedToolShellHeaderAction['icon'];
  run?: () => void;
  secondaryLabel?: string;
  secondaryTitle?: string;
  secondaryRun?: () => void;
  dockSide: WorkbenchToolDockActionSide;
  active: boolean;
  internalDockSide: WorkbenchToolDockActionSide;
  internalActive: boolean;
  internalRun?: () => void;
}

export interface ToolMenuProjection extends Partial<ToolDockMenuProjection> {
  id: string;
  label: string;
  group: ResolvedToolShellHeaderAction['group'];
  frequency?: ResolvedToolShellHeaderAction['frequency'];
  headerButton?: boolean;
  command?: ToolCommand;
  children?: ToolMenuProjection[];
}

/** Adapts existing declarations without invoking any callback or owning dock state. */
export function projectToolMenuAction(
  action: ResolvedToolShellHeaderAction,
  target: ToolCommandTarget,
  presentation: {
    label: (action: ResolvedToolShellHeaderAction) => string;
    dock: (action: ResolvedToolShellHeaderAction) => ToolDockMenuProjection | null;
  }
): ToolMenuProjection {
  const label = presentation.label(action);
  const dock = presentation.dock(action);
  const command = projectToolCommand(target, action.commandId);
  const children = (action.children ?? []).map(child => projectToolMenuAction(child, target, presentation));
  return {
    id: `${target.toolInstanceId}:${action.commandId}`,
    label: dock?.label ?? label,
    icon: dock?.icon ?? action.icon,
    group: action.group,
    frequency: action.frequency,
    headerButton: action.headerButton,
    active: dock ? dock.active : action.active,
    ...(children.length ? { children } : {}),
    ...(dock ? {
      ...(dock.run ? { run: dock.run } : { command }),
      ...(dock.secondaryLabel ? {
        secondaryLabel: dock.secondaryLabel,
        secondaryTitle: dock.secondaryTitle,
        secondaryRun: dock.secondaryRun
      } : {}),
      dockSide: dock.dockSide,
      internalDockSide: dock.internalDockSide,
      internalActive: dock.internalActive,
      internalRun: dock.internalRun
    } : { command })
  };
}
