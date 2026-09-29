import type { ShellWidgetDefinition, ToolDefinition, ToolShellWidgetDock } from '@konitif/workbench';

export type WorkspaceExperienceConnectorKind =
  | 'api'
  | 'tool-registry'
  | 'widget-registry'
  | 'resource-registry';

export interface WorkspaceExperienceConnector {
  id: string;
  label: string;
  kind: WorkspaceExperienceConnectorKind;
  url: string;
  enabled: boolean;
}

export type WorkspaceExperienceWidgetPlacement = 'internal' | 'left' | 'right' | 'bottom';

export function createWorkspaceExperienceWidgetOwnerIndex(
  tools: readonly ToolDefinition[]
): Map<string, Set<string>> {
  const ownerToolIds = new Map<string, Set<string>>();
  for (const tool of tools) {
    for (const dock of tool.shell?.widgetDocks ?? []) {
      if (!dock.rootWidgetId) continue;
      const owners = ownerToolIds.get(dock.rootWidgetId) ?? new Set<string>();
      owners.add(tool.id);
      ownerToolIds.set(dock.rootWidgetId, owners);
    }
  }
  return ownerToolIds;
}

export interface WorkspaceExperienceDockWidgetContext {
  tool: ToolDefinition;
  dock: ToolShellWidgetDock;
  widgetId: string;
}

export interface WorkspaceExperienceWidgetCatalogOptions {
  describeDockWidget?(context: WorkspaceExperienceDockWidgetContext): string;
}

export function createWorkspaceExperienceWidgetCatalog(
  tools: readonly ToolDefinition[],
  shellWidgets: readonly ShellWidgetDefinition[],
  options: WorkspaceExperienceWidgetCatalogOptions = {}
): ShellWidgetDefinition[] {
  const widgets = new Map(shellWidgets.map(widget => [widget.id, widget]));
  for (const tool of tools) {
    for (const dock of tool.shell?.widgetDocks ?? []) {
      const widgetId = dock.rootWidgetId?.trim();
      if (!widgetId || widgets.has(widgetId)) continue;
      widgets.set(widgetId, {
        id: widgetId,
        title: dock.title,
        icon: dock.icon ?? tool.icon,
        description: options.describeDockWidget?.({ tool, dock, widgetId }) ?? dock.title,
        defaultRegion: dock.defaultRegionId,
        scope: 'contextual',
        contextToolIds: [tool.id],
        initiallyConnected: false
      });
    }
  }
  return [...widgets.values()];
}
