import type {
  InMemoryToolRegistry,
  WorkbenchIconInput,
  Workspace,
  WorkspaceCommand,
  WorkspaceFocus,
  WorkspacePresetId,
  WorkbenchReadingLevel
} from '@konitif/workbench';
import { listPanels, resolveToolShellContribution } from '@konitif/workbench';
import {
  resolveLocalizedToolDefinitionText,
  resolveLocalizedToolShellCommandText
} from '../i18n/workbenchEntityTranslations';
import type { WorkbenchTranslate } from '../i18n/workbenchI18n';
import { aggregateCommandContributions } from './commandAggregation';
import { projectToolCommand } from './toolCommandProjection';
import type { ApplicationCommandContribution } from './applicationCommands';

export type ShellAction =
  | { type: 'application-command'; owner: string; id: string }
  | { type: 'workspace-command'; command: WorkspaceCommand }
  | { type: 'toggle-command-palette' }
  | { type: 'show-layout-menu' }
  | { type: 'reset-workspace' }
  | { type: 'load-workspace-preset'; presetId: WorkspacePresetId }
  | { type: 'export-workspace-snapshot' }
  | { type: 'import-workspace-snapshot' };

export interface CommandPaletteItem {
  disabledReason?: string;
  categoryPath?: { id: string; title: string }[];
  owner?: string;
  contextKey?: string;
  id: string;
  title: string;
  description: string;
  icon?: WorkbenchIconInput;
  keywords?: string[];
  shortcut?: string;
  action: ShellAction;
}

export interface KeyboardShortcutInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target?: EventTarget | null;
}

interface BuildCommandPaletteItemsInput {
  applicationCommands?: readonly ApplicationCommandContribution[];
  registry: InMemoryToolRegistry;
  workspace: Workspace;
  focus: WorkspaceFocus;
  readingLevelDefault?: WorkbenchReadingLevel;
  translate?: WorkbenchTranslate;
}

// One declaration for the palette label and keyboard interpretation.
// Execution remains with runShellAction and the workspace command owner.
function buildShellShortcutCommands() {
  return {
    splitHorizontal: {
      id: 'split-horizontal',
      shortcut: 'Mod+Shift+H',
      action: { type: 'workspace-command', command: { type: 'split-panel-horizontal' } }
    },
    splitVertical: {
      id: 'split-vertical',
      shortcut: 'Mod+Shift+V',
      action: { type: 'workspace-command', command: { type: 'split-panel-vertical' } }
    },
    closeActivePanel: {
      id: 'close-active-panel',
      shortcut: 'Mod+Shift+W',
      action: { type: 'workspace-command', command: { type: 'close-active-panel' } }
    }
  } satisfies Record<string, Pick<CommandPaletteItem, 'id' | 'shortcut' | 'action'>>;
}

export function buildCommandPaletteItems(input: BuildCommandPaletteItemsInput): CommandPaletteItem[] {
  const shellShortcutCommands = buildShellShortcutCommands();
  const translate: WorkbenchTranslate = input.translate ?? ((key, options) => options?.default ?? key);
  const window = input.workspace.windows.find(window => window.id === input.workspace.activeWindowId);
  const toolCommands = (window ? listPanels(window.root) : []).flatMap(panel => {
    const instance = panel.toolInstanceId ? input.workspace.toolInstances[panel.toolInstanceId] : undefined;
    const entry = instance ? input.registry.get(instance.toolId) : undefined;
    const toolText = entry ? resolveLocalizedToolDefinitionText(translate, entry.definition) : null;
    const instanceLabel = instance && Object.values(input.workspace.toolInstances).filter(other => other.toolId === instance.toolId).length > 1
      ? ` [${instance.id}]` : '';
    const contribution = entry && instance
      ? resolveToolShellContribution(entry.definition, instance, input.readingLevelDefault)
      : null;
    return (
      panel && instance && entry && panel.toolInstanceId === instance.id
        ? contribution!.commands.map((command): CommandPaletteItem => {
            const dock = contribution!.widgetDocks.find(dock => dock.commandId === command.id);
            const commandText = resolveLocalizedToolShellCommandText(
              translate,
              entry.definition.id,
              command
            );

            return {
              categoryPath: [
                { id: `tool:${entry.definition.id}`, title: toolText?.title ?? entry.definition.title },
                ...(dock ? [{ id: `widget:${dock.dockId}`, title: dock.title }] : [])
              ],
              id: `tool-command:${instance.id}:${command.id}`,
              title: `${instance.panelTitleOverride ?? toolText?.title ?? entry.definition.title}${instanceLabel}: ${commandText.title}`,
              description: commandText.description,
              icon: entry.definition.icon,
              keywords: [...(entry.definition.keywords ?? []), ...(command.keywords ?? [])],
              action: {
                type: 'workspace-command',
                command: projectToolCommand({
                  panelId: panel.id,
                  toolInstanceId: instance.id,
                  inheritedReadingLevel: input.readingLevelDefault
                }, command.id)
              }
            };
          })
        : []);
  });

  const shellItems: CommandPaletteItem[] = [
    {
      id: 'load-workspace-preset:default',
      title: translate('ui.shell.commandPalette.loadDefaultPreset.title', {
        default: 'Load Default Workspace Preset'
      }),
      description: translate('ui.shell.commandPalette.loadDefaultPreset.description', {
        default: 'Load the default workspace preset explicitly.'
      }),
      keywords: ['workspace', 'preset', 'default'],
      action: { type: 'load-workspace-preset', presetId: 'default' }
    },
    {
      id: 'reset-workspace',
      title: translate('ui.shell.commandPalette.resetWorkspace.title', { default: 'Reset Workspace' }),
      description: translate('ui.shell.commandPalette.resetWorkspace.description', {
        default: 'Reset the current workspace and focus state back to the default shell.'
      }),
      keywords: ['workspace', 'reset', 'default'],
      action: { type: 'reset-workspace' }
    },
    {
      id: 'export-workspace-snapshot',
      title: translate('ui.shell.commandPalette.exportSnapshot.title', { default: 'Export Workspace Snapshot' }),
      description: translate('ui.shell.commandPalette.exportSnapshot.description', {
        default: 'Download the current workspace snapshot as JSON.'
      }),
      keywords: ['workspace', 'export', 'snapshot', 'json'],
      action: { type: 'export-workspace-snapshot' }
    },
    {
      id: 'import-workspace-snapshot',
      title: translate('ui.shell.commandPalette.importSnapshot.title', { default: 'Import Workspace Snapshot' }),
      description: translate('ui.shell.commandPalette.importSnapshot.description', {
        default: 'Load a workspace snapshot JSON file after validation.'
      }),
      keywords: ['workspace', 'import', 'snapshot', 'json'],
      action: { type: 'import-workspace-snapshot' }
    },
    {
      id: 'show-layout-menu',
      title: translate('ui.shell.commandPalette.showLayoutMenu.title', { default: 'Show Layout Menu' }),
      description: translate('ui.shell.commandPalette.showLayoutMenu.description', {
        default: 'Restore the layout menu if it has been hidden.'
      }),
      keywords: ['layout', 'menu', 'restore', 'show'],
      action: { type: 'show-layout-menu' }
    },
    {
      ...shellShortcutCommands.splitHorizontal,
      title: translate('ui.shell.commandPalette.splitHorizontal.title', { default: 'Split Panel Horizontally' }),
      description: translate('ui.shell.commandPalette.splitHorizontal.description', {
        default: 'Split the focused panel into left and right panels.'
      }),
    },
    {
      ...shellShortcutCommands.splitVertical,
      title: translate('ui.shell.commandPalette.splitVertical.title', { default: 'Split Panel Vertically' }),
      description: translate('ui.shell.commandPalette.splitVertical.description', {
        default: 'Split the focused panel into top and bottom panels.'
      }),
    },
    {
      ...shellShortcutCommands.closeActivePanel,
      title: translate('ui.shell.commandPalette.closeActivePanel.title', { default: 'Close Active Panel' }),
      description: translate('ui.shell.commandPalette.closeActivePanel.description', {
        default: 'Close the currently focused panel.'
      }),
    },
  ];
  const openingItems = input.registry.list().map(
      (entry): CommandPaletteItem => {
        const toolText = resolveLocalizedToolDefinitionText(translate, entry.definition);

        return {
          categoryPath: [{ id: `tool:${entry.definition.id}`, title: toolText.title }],
          id: `open-tool:${entry.definition.id}`,
          title: translate('ui.shell.commandPalette.openTool', {
            default: 'Open {{title}}',
            values: { title: toolText.title }
          }),
          description: toolText.description,
          icon: entry.definition.icon,
          keywords: entry.definition.keywords,
          action: {
            type: 'workspace-command',
            command: {
              type: 'open-tool',
              toolId: entry.definition.id
            }
          }
        };
      }
    );
  const contextKey = JSON.stringify([input.workspace.activeWindowId, input.focus.activePanelId, input.focus.activeToolInstanceId]);
  return aggregateCommandContributions([
    { owner: 'workbench.shell', items: shellItems.map(item => ({ ...item, categoryPath: [{
      id: 'workspace', title: translate('ui.shell.commandPalette.workspaceGroup', { default: 'Workspace' })
    }] })) },
    { owner: 'workbench.tool-catalog', items: openingItems },
    { owner: 'workbench.tool-shell', items: toolCommands },
    { owner: 'application', items: (input.applicationCommands ?? []).map((command): CommandPaletteItem => ({
      id: `application:${JSON.stringify([command.owner, command.id])}`,
      categoryPath: [{ id: `application:${command.owner}`, title: command.translationKeys?.category
        ? translate(command.translationKeys.category, { default: command.category }) : command.category }],
      title: command.translationKeys?.title ? translate(command.translationKeys.title, { default: command.title }) : command.title,
      description: command.translationKeys?.description ? translate(command.translationKeys.description, { default: command.description }) : command.description,
      disabledReason: command.disabledReason && command.translationKeys?.disabledReason
        ? translate(command.translationKeys.disabledReason, { default: command.disabledReason }) || command.disabledReason : command.disabledReason,
      action: { type: 'application-command', owner: command.owner, id: command.id }
    })) }
  ]).map(item => ({ ...item, contextKey: item.owner === 'workbench.tool-shell'
    ? JSON.stringify([input.workspace.activeWindowId]) : contextKey }));
}

/** Re-resolve against current context; never silently retarget a stale selection. */
export function resolveCurrentPaletteSelection(
  selected: CommandPaletteItem,
  input: BuildCommandPaletteItemsInput
): CommandPaletteItem | null {
  return buildCommandPaletteItems(input).find(item =>
    !item.disabledReason &&
    item.id === selected.id && item.owner === selected.owner &&
    item.contextKey === selected.contextKey &&
    JSON.stringify(item.action) === JSON.stringify(selected.action)
  ) ?? null;
}

export function filterCommandPaletteItems(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    `${item.title} ${item.description} ${(item.keywords ?? []).join(' ')} ${(item.categoryPath ?? []).map(part => part.title).join(' ')}`.toLowerCase().includes(normalizedQuery)
  );
}

/** Presentation grouping only: identities and action envelopes stay untouched. */
export function groupCommandPaletteItems(items: CommandPaletteItem[]) {
  const groups = new Map<string, { id: string; title: string; items: CommandPaletteItem[] }>();
  const roots = new Map<string, string[]>();
  for (const item of items) {
    const path = item.categoryPath ?? [];
    const id = JSON.stringify(path.map(part => part.id));
    let group = groups.get(id);
    if (!group) {
      group = { id, title: path.map(part => part.title).join(' › '), items: [] };
      groups.set(id, group);
      const root = path[0]?.id ?? '';
      if (!roots.has(root)) roots.set(root, []);
      roots.get(root)!.push(id);
    }
    group.items.push(item);
  }
  return [...roots.values()].flatMap(ids => ids.map(id => groups.get(id)!));
}

export function resolveShellShortcut(input: KeyboardShortcutInput): ShellAction | null {
  if (isEditableTarget(input.target)) {
    return null;
  }

  const isModifierPressed = input.metaKey || input.ctrlKey;
  const normalizedKey = input.key.toLowerCase();

  if (isModifierPressed && !input.shiftKey && !input.altKey && normalizedKey === 'k') {
    return { type: 'toggle-command-palette' };
  }

  if (!isModifierPressed || !input.shiftKey || input.altKey) {
    return null;
  }

  const declaration = Object.values(buildShellShortcutCommands()).find(
    item => item.shortcut.toLowerCase() === `mod+shift+${normalizedKey}`
  );
  return declaration?.action ?? null;
}

function isEditableTarget(target: EventTarget | null | undefined): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
