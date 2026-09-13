import type {
  InMemoryShellWidgetRegistry,
  InMemoryToolRegistry,
  RuntimeProjectionSessionEntry,
  ShellState,
  WorkbenchRuntimeSnapshot,
  Workspace
} from '@konitif/workbench';
import { listPanelsInWorkspace } from '@konitif/workbench';
import type {
  DesignSystemDiscoveryBinding,
  DesignSystemDiscoveryBindingTarget,
  DesignSystemThemeDocument,
  DesignSystemThemeElement,
  DesignSystemThemeSyncStatus
} from './designSystemThemeCatalog';
import { listDesignSystemThemeElements } from './designSystemThemeCatalog';

export type DesignSystemDiscoveryEntityKind =
  | 'design-node'
  | 'shell-widget'
  | 'tool'
  | 'workspace-panel'
  | 'runtime-projection'
  | 'history-bridge';

export interface DesignSystemDiscoveryEntity {
  id: string;
  kind: DesignSystemDiscoveryEntityKind;
  title: string;
  summary: string;
  status: DesignSystemThemeSyncStatus;
  source: string;
  designNodeIds: string[];
  tokens: string[];
  cssVariables: string[];
  widgetIds: string[];
  toolIds: string[];
  runtimeProjectionKinds: string[];
  capabilities: string[];
}

export interface DesignSystemDiscoveryRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
}

export interface DesignSystemDiscoveryProjection {
  entities: DesignSystemDiscoveryEntity[];
  relations: DesignSystemDiscoveryRelation[];
  totals: {
    entities: number;
    widgets: number;
    tools: number;
    panels: number;
    runtimeProjections: number;
    undoBridges: number;
  };
}

export interface DesignSystemHistoryBridgeState {
  canUndoAppHistory: boolean;
  canRedoAppHistory: boolean;
  canUndoCoreHistory: boolean;
  canRedoCoreHistory: boolean;
}

export interface CreateDesignSystemEntityDiscoveryInput {
  document: DesignSystemThemeDocument;
  shellWidgetRegistry?: Pick<InMemoryShellWidgetRegistry, 'list'> | null;
  toolRegistry?: Pick<InMemoryToolRegistry, 'list'> | null;
  shellState?: ShellState | null;
  workspace?: Workspace | null;
  runtimeSnapshot?: WorkbenchRuntimeSnapshot | null;
  runtimeProjectionSessionEntries?: RuntimeProjectionSessionEntry[];
  history?: DesignSystemHistoryBridgeState | null;
}

export function createDesignSystemEntityDiscovery(
  input: CreateDesignSystemEntityDiscoveryInput
): DesignSystemDiscoveryProjection {
  const entities: DesignSystemDiscoveryEntity[] = [];
  const relations: DesignSystemDiscoveryRelation[] = [];

  const designElements = listDesignSystemThemeElements(input.document);
  const designElementsById = new Map(designElements.map((element) => [element.id, element]));

  for (const element of designElements) {
    entities.push({
      id: element.id,
      kind: 'design-node',
      title: element.title,
      summary: element.summary,
      status: element.status,
      source: element.category,
      designNodeIds: [element.id],
      tokens: element.tokens,
      cssVariables: element.cssVariables,
      widgetIds: [],
      toolIds: [],
      runtimeProjectionKinds: [],
      capabilities: []
    });
  }

  for (const widget of input.shellWidgetRegistry?.list?.() ?? []) {
    const bindings = resolveDiscoveryBindings(input.document, 'shell-widget', widget.id, widget.title);
    const designNodeIds = resolveDesignNodeIdsFromBindings(bindings);

    entities.push({
      id: `widget.${widget.id}`,
      kind: 'shell-widget',
      title: widget.title,
      summary: widget.description,
      status: designNodeIds.length > 0 ? 'synced' : 'missing',
      source: widget.defaultRegion,
      designNodeIds,
      tokens: resolveTokensForDesignNodeIds(designElementsById, designNodeIds),
      cssVariables: resolveCssVariablesForDesignNodeIds(designElementsById, designNodeIds),
      widgetIds: [widget.id],
      toolIds: [],
      runtimeProjectionKinds: [],
      capabilities: [widget.scope, `region.${widget.defaultRegion}`, ...resolveCapabilitiesFromBindings(bindings)]
    });

    for (const { designNodeId, relationKind } of resolveBindingRelations(bindings)) {
      relations.push({
        id: `relation.widget.${widget.id}.${designNodeId}`,
        from: `widget.${widget.id}`,
        to: designNodeId,
        kind: relationKind
      });
    }
  }

  for (const tool of input.toolRegistry?.list?.() ?? []) {
    const definition = tool.definition;
    const bindings = resolveDiscoveryBindings(input.document, 'tool', definition.id, definition.title);
    const designNodeIds = resolveDesignNodeIdsFromBindings(bindings);
    const commandCapabilities = definition.shell?.commands?.map((command) => `command.${command.id}`) ?? [];

    entities.push({
      id: `tool.${definition.id}`,
      kind: 'tool',
      title: definition.title,
      summary: definition.description,
      status: designNodeIds.length > 0 ? 'synced' : 'missing',
      source: definition.openingPolicy.mode,
      designNodeIds,
      tokens: resolveTokensForDesignNodeIds(designElementsById, designNodeIds),
      cssVariables: resolveCssVariablesForDesignNodeIds(designElementsById, designNodeIds),
      widgetIds: [],
      toolIds: [definition.id],
      runtimeProjectionKinds: [],
      capabilities: [
        definition.panelSplitPolicy?.mode ?? 'panelSplit.default',
        ...commandCapabilities,
        ...resolveCapabilitiesFromBindings(bindings)
      ]
    });

    for (const { designNodeId, relationKind } of resolveBindingRelations(bindings)) {
      relations.push({
        id: `relation.tool.${definition.id}.${designNodeId}`,
        from: `tool.${definition.id}`,
        to: designNodeId,
        kind: relationKind
      });
    }
  }

  const workspace = input.workspace ?? null;
  const workspacePanelBindings = resolveDiscoveryBindings(input.document, 'workspace-panel', 'workspace-panel', 'panel');
  const workspacePanelDesignNodeIds = resolveDesignNodeIdsFromBindings(workspacePanelBindings);
  for (const panel of workspace ? listPanelsInWorkspace(workspace) : []) {
    const toolInstance = panel.toolInstanceId ? workspace?.toolInstances[panel.toolInstanceId] ?? null : null;

    entities.push({
      id: `panel.${panel.id}`,
      kind: 'workspace-panel',
      title: panel.title,
      summary: toolInstance ? `Live panel hosting ${toolInstance.toolId}.` : 'Live workspace panel without resolved tool instance.',
      status: toolInstance ? 'synced' : 'missing',
      source: 'workspace',
      designNodeIds: workspacePanelDesignNodeIds,
      tokens: resolveTokensForDesignNodeIds(designElementsById, workspacePanelDesignNodeIds),
      cssVariables: resolveCssVariablesForDesignNodeIds(designElementsById, workspacePanelDesignNodeIds),
      widgetIds: [],
      toolIds: toolInstance ? [toolInstance.toolId] : [],
      runtimeProjectionKinds: [],
      capabilities: [
        workspace?.fullscreenPanelId === panel.id ? 'fullscreen' : 'panel',
        ...resolveCapabilitiesFromBindings(workspacePanelBindings)
      ]
    });

    for (const { designNodeId, relationKind } of resolveBindingRelations(workspacePanelBindings)) {
      relations.push({
        id: `relation.panel.${panel.id}.${designNodeId}`,
        from: `panel.${panel.id}`,
        to: designNodeId,
        kind: relationKind
      });
    }
  }

  const runtimeSnapshot = input.runtimeSnapshot ?? null;
  const runtimeStatus = runtimeSnapshot?.status ?? 'idle';
  const runtimeCapabilities = runtimeSnapshot?.workspace?.capabilities ?? [];
  for (const projection of runtimeSnapshot?.projectionCatalog ?? []) {
    const bindings = resolveDiscoveryBindings(
      input.document,
      'runtime-projection',
      projection.projectionKind,
      projection.projectionKind
    );
    const designNodeIds = resolveDesignNodeIdsFromBindings(bindings);

    entities.push({
      id: `runtime.${projection.projectionKind}`,
      kind: 'runtime-projection',
      title: projection.projectionKind,
      summary: `${projection.sources.length} source(s), version ${projection.version}.`,
      status: runtimeStatus === 'online' ? 'synced' : 'orphan',
      source: 'runtime',
      designNodeIds,
      tokens: resolveTokensForDesignNodeIds(designElementsById, designNodeIds),
      cssVariables: resolveCssVariablesForDesignNodeIds(designElementsById, designNodeIds),
      widgetIds: [],
      toolIds: [],
      runtimeProjectionKinds: [projection.projectionKind],
      capabilities: [...runtimeCapabilities, ...resolveCapabilitiesFromBindings(bindings)]
    });

    for (const { designNodeId, relationKind } of resolveBindingRelations(bindings)) {
      relations.push({
        id: `relation.runtime.${projection.projectionKind}.${designNodeId}`,
        from: `runtime.${projection.projectionKind}`,
        to: designNodeId,
        kind: relationKind
      });
    }
  }

  for (const session of input.runtimeProjectionSessionEntries ?? []) {
    relations.push({
      id: `relation.runtime-session.${session.key}`,
      from: `runtime.${session.target.projectionKind}`,
      to: 'theme.workbench.dark',
      kind: session.status
    });
  }

  if (input.history) {
    const canUndo = input.history.canUndoAppHistory || input.history.canUndoCoreHistory;
    const canRedo = input.history.canRedoAppHistory || input.history.canRedoCoreHistory;
    const bindings = resolveDiscoveryBindings(input.document, 'history-bridge', 'history', 'undo redo');
    const designNodeIds = resolveDesignNodeIdsFromBindings(bindings);

    entities.push({
      id: 'history.design-system-bridge',
      kind: 'history-bridge',
      title: 'Design System History Bridge',
      summary: 'Connects design edits to app/core undo-redo availability.',
      status: canUndo || canRedo ? 'synced' : 'missing',
      source: 'core-history',
      designNodeIds,
      tokens: resolveTokensForDesignNodeIds(designElementsById, designNodeIds),
      cssVariables: resolveCssVariablesForDesignNodeIds(designElementsById, designNodeIds),
      widgetIds: [],
      toolIds: [],
      runtimeProjectionKinds: [],
      capabilities: [
        input.history.canUndoAppHistory ? 'app.undo' : 'app.undo.empty',
        input.history.canRedoAppHistory ? 'app.redo' : 'app.redo.empty',
        input.history.canUndoCoreHistory ? 'core.undo' : 'core.undo.empty',
        input.history.canRedoCoreHistory ? 'core.redo' : 'core.redo.empty',
        ...resolveCapabilitiesFromBindings(bindings)
      ]
    });

    for (const { designNodeId, relationKind } of resolveBindingRelations(bindings)) {
      relations.push({
        id: `relation.history.design-system-bridge.${designNodeId}`,
        from: 'history.design-system-bridge',
        to: designNodeId,
        kind: relationKind
      });
    }
  }

  return {
    entities,
    relations,
    totals: {
      entities: entities.length,
      widgets: entities.filter((entity) => entity.kind === 'shell-widget').length,
      tools: entities.filter((entity) => entity.kind === 'tool').length,
      panels: entities.filter((entity) => entity.kind === 'workspace-panel').length,
      runtimeProjections: entities.filter((entity) => entity.kind === 'runtime-projection').length,
      undoBridges: entities.filter((entity) => entity.kind === 'history-bridge').length
    }
  };
}

function resolveDiscoveryBindings(
  document: DesignSystemThemeDocument,
  targetKind: DesignSystemDiscoveryBindingTarget,
  id: string,
  title: string
): DesignSystemDiscoveryBinding[] {
  const haystack = `${id} ${title}`.toLowerCase();

  return document.discoveryBindings.filter(
    (binding) =>
      binding.targetKind === targetKind &&
      binding.match.some((pattern) => pattern === '*' || haystack.includes(pattern.toLowerCase()))
  );
}

function resolveDesignNodeIdsFromBindings(bindings: DesignSystemDiscoveryBinding[]): string[] {
  return [...new Set(bindings.flatMap((binding) => binding.designNodeIds))];
}

function resolveCapabilitiesFromBindings(bindings: DesignSystemDiscoveryBinding[]): string[] {
  return [...new Set(bindings.flatMap((binding) => [binding.id, ...binding.capabilities]))];
}

function resolveBindingRelations(
  bindings: DesignSystemDiscoveryBinding[]
): Array<{ designNodeId: string; relationKind: string }> {
  const relationsByNodeId = new Map<string, { designNodeId: string; relationKind: string }>();

  for (const binding of bindings) {
    for (const designNodeId of binding.designNodeIds) {
      if (!relationsByNodeId.has(designNodeId)) {
        relationsByNodeId.set(designNodeId, {
          designNodeId,
          relationKind: binding.relationKind
        });
      }
    }
  }

  return [...relationsByNodeId.values()];
}

function resolveTokensForDesignNodeIds(
  elementsById: ReadonlyMap<string, DesignSystemThemeElement>,
  nodeIds: string[]
): string[] {
  return [...new Set(nodeIds.flatMap((nodeId) => elementsById.get(nodeId)?.tokens ?? []))];
}

function resolveCssVariablesForDesignNodeIds(
  elementsById: ReadonlyMap<string, DesignSystemThemeElement>,
  nodeIds: string[]
): string[] {
  return [...new Set(nodeIds.flatMap((nodeId) => elementsById.get(nodeId)?.cssVariables ?? []))];
}
