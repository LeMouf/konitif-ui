import type {
  ResolvedToolShellHeaderAction,
  ShellWidgetDefinition,
  ToolDefinition,
  ToolShellCommand
} from '@konitif/workbench';
import type { WorkbenchTranslate } from './workbenchI18n';

export interface LocalizedToolDefinitionText {
  id: string;
  title: string;
  panelTitle: string;
  description: string;
  keywords?: string[];
}

export interface LocalizedShellWidgetDefinitionText {
  id: string;
  title: string;
  description: string;
}

export interface LocalizedToolShellHeaderActionText {
  label: string;
  title: string;
  description: string;
}

export interface LocalizedToolShellCommandText {
  title: string;
  description: string;
}

export function createToolTranslationKey(toolId: string, field: 'title' | 'panelTitle' | 'description'): string {
  return `tool.${toolId}.${field}`;
}

export function createWidgetTranslationKey(widgetId: string, field: 'title' | 'description'): string {
  return `widget.${widgetId}.${field}`;
}

export function createToolShellCommandTranslationKey(
  toolId: string,
  commandId: string,
  field: 'title' | 'description'
): string {
  return `tool.${toolId}.shell.commands.${commandId}.${field}`;
}

export function createToolShellHeaderActionTranslationKey(toolId: string, commandId: string, field: 'label'): string {
  return `tool.${toolId}.shell.headerActions.${commandId}.${field}`;
}

export function resolveLocalizedToolDefinitionText(
  translate: WorkbenchTranslate,
  definition: ToolDefinition
): LocalizedToolDefinitionText {
  return {
    id: definition.id,
    title: translate(createToolTranslationKey(definition.id, 'title'), { default: definition.title }),
    panelTitle: translate(createToolTranslationKey(definition.id, 'panelTitle'), { default: definition.panelTitle }),
    description: translate(createToolTranslationKey(definition.id, 'description'), {
      default: definition.description
    }),
    keywords: definition.keywords
  };
}

/**
 * Projects locale-dependent display text without changing the Tool identity,
 * capabilities, lifecycle, or registry authority carried by the definition.
 */
export function projectLocalizedToolDefinition(
  translate: WorkbenchTranslate,
  definition: ToolDefinition
): ToolDefinition {
  const localized = resolveLocalizedToolDefinitionText(translate, definition);

  return {
    ...definition,
    title: localized.title,
    panelTitle: localized.panelTitle,
    description: localized.description
  };
}

export function resolveLocalizedShellWidgetDefinitionText(
  translate: WorkbenchTranslate,
  definition: ShellWidgetDefinition
): LocalizedShellWidgetDefinitionText {
  return {
    id: definition.id,
    title: translate(createWidgetTranslationKey(definition.id, 'title'), { default: definition.title }),
    description: translate(createWidgetTranslationKey(definition.id, 'description'), {
      default: definition.description
    })
  };
}

export function resolveLocalizedToolShellHeaderActionText(
  translate: WorkbenchTranslate,
  toolId: string,
  action: ResolvedToolShellHeaderAction
): LocalizedToolShellHeaderActionText {
  const readingLevelCommand = action.commandId.startsWith('workbench.tool.reading-level');
  const readingLevel = action.commandId.slice('workbench.tool.reading-level.'.length);
  const inheritsReadingLevel = action.commandId === 'workbench.tool.reading-level.inherit';
  const labelTranslationKey =
    action.labelTranslationKey ?? createToolShellHeaderActionTranslationKey(toolId, action.commandId, 'label');
  const titleTranslationKey = readingLevelCommand
    ? action.commandId === 'workbench.tool.reading-level'
      ? 'ui.shell.tool.readingLevel.title'
      : inheritsReadingLevel
        ? 'ui.shell.tool.readingLevel.inheritTitle'
        : 'ui.shell.tool.readingLevel.optionTitle'
    : createToolShellCommandTranslationKey(toolId, action.commandId, 'title');
  const descriptionTranslationKey = readingLevelCommand
    ? action.commandId === 'workbench.tool.reading-level'
      ? 'ui.shell.tool.readingLevel.description'
      : inheritsReadingLevel
        ? 'ui.shell.tool.readingLevel.inheritDescription'
        : 'ui.shell.tool.readingLevel.optionDescription'
    : createToolShellCommandTranslationKey(toolId, action.commandId, 'description');

  return {
    label: translate(labelTranslationKey, {
      default: action.label
    }),
    title: translate(titleTranslationKey, {
      default: action.title,
      values: { level: readingLevel }
    }),
    description: translate(descriptionTranslationKey, {
      default: action.description,
      values: { level: readingLevel }
    })
  };
}

export function resolveLocalizedToolShellCommandText(
  translate: WorkbenchTranslate,
  toolId: string,
  command: ToolShellCommand
): LocalizedToolShellCommandText {
  const readingLevelCommand = command.id.startsWith('workbench.tool.reading-level');
  const readingLevel = command.id.slice('workbench.tool.reading-level.'.length);
  const isMenuCommand = command.id === 'workbench.tool.reading-level';
  const inheritsReadingLevel = command.id === 'workbench.tool.reading-level.inherit';

  return {
    title: translate(
      readingLevelCommand
        ? isMenuCommand
          ? 'ui.shell.tool.readingLevel.title'
          : inheritsReadingLevel
            ? 'ui.shell.tool.readingLevel.inheritTitle'
            : 'ui.shell.tool.readingLevel.optionTitle'
        : createToolShellCommandTranslationKey(toolId, command.id, 'title'),
      { default: command.title, values: { level: readingLevel } }
    ),
    description: translate(
      readingLevelCommand
        ? isMenuCommand
          ? 'ui.shell.tool.readingLevel.description'
          : inheritsReadingLevel
            ? 'ui.shell.tool.readingLevel.inheritDescription'
            : 'ui.shell.tool.readingLevel.optionDescription'
        : createToolShellCommandTranslationKey(toolId, command.id, 'description'),
      { default: command.description, values: { level: readingLevel } }
    )
  };
}
