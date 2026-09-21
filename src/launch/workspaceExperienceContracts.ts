import type { ToolDefinition } from '@konitif/workbench';

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
