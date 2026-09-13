import type { DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';
import type {
  DesignSystemThemeCategory,
  DesignSystemThemeGraph,
  DesignSystemThemeGraphCategory,
  DesignSystemThemeGraphNode,
  DesignSystemThemeInspection,
  DesignSystemThemeRegistry,
  DesignSystemThemeSyncPreview
} from '../designSystemThemeCatalog';
import { LIGHT_THEME_VALUES } from '../designSystemThemeRuntime';

export type DesignPreviewCardKind =
  | 'theme'
  | 'foundation'
  | 'token'
  | 'icon'
  | 'primitive'
  | 'form'
  | 'component'
  | 'card'
  | 'layout'
  | 'navigation'
  | 'data'
  | 'overlay'
  | 'feedback'
  | 'graph'
  | 'editor'
  | 'surface'
  | 'pattern'
  | 'manager';

export type DesignCategorySummary = DesignSystemThemeGraphCategory & {
  status: string;
  tokens: number;
  cssVariables: number;
  totalNodes: number;
};

export type DesignConstructionLayer = {
  id: 'atoms' | 'molecules' | 'organisms' | 'templates' | 'pages';
  label: string;
  title: string;
  summary: string;
  items: string[];
  status: string;
};

export function createDesignCategorySummaries(
  categories: DesignSystemThemeGraphCategory[],
  query: string
): DesignCategorySummary[] {
  return categories
    .map((category) => {
      const nodes = filterDesignCategoryNodes(category, query);

      return {
        ...category,
        nodes,
        status: resolveCategoryStatus(category.nodes),
        tokens: new Set(nodes.flatMap((node) => node.tokens)).size,
        cssVariables: new Set(nodes.flatMap((node) => node.cssVariables)).size,
        totalNodes: category.nodes.length
      };
    })
    .filter((category) => !query.trim() || category.nodes.length > 0 || matchesSearchText(category.label, query));
}

export function resolveRelatedDiscoveryEntities(
  nodeId: string | null,
  discoveryProjection: DesignSystemDiscoveryProjection
): DesignSystemDiscoveryProjection['entities'] {
  if (!nodeId) {
    return [];
  }

  return discoveryProjection.entities.filter(
    (entity) => entity.id === nodeId || entity.designNodeIds.includes(nodeId)
  );
}

export function resolveFirstGraphNode(nodeIds: string[], graph: DesignSystemThemeGraph): DesignSystemThemeGraphNode | null {
  const graphNodeIds = new Set(graph.categories.flatMap((category) => category.nodes.map((node) => node.id)));
  const nodeId = nodeIds.find((id) => graphNodeIds.has(id));

  return nodeId
    ? graph.categories.flatMap((category) => category.nodes).find((node) => node.id === nodeId) ?? null
    : null;
}

export function resolveCategoryStatus(nodes: DesignSystemThemeGraphNode[]): string {
  if (nodes.some((node) => node.status === 'mismatch')) return 'mismatch';
  if (nodes.some((node) => node.status === 'missing')) return 'missing';
  if (nodes.some((node) => node.status === 'orphan')) return 'orphan';
  return 'synced';
}

export function resolvePreviewCardKind(category: DesignSystemThemeCategory): DesignPreviewCardKind {
  const kindByCategory: Record<DesignSystemThemeCategory, DesignPreviewCardKind> = {
    theme: 'theme',
    foundations: 'foundation',
    tokens: 'token',
    iconography: 'icon',
    primitives: 'primitive',
    forms: 'form',
    components: 'component',
    cards: 'card',
    layout: 'layout',
    navigation: 'navigation',
    dataDisplay: 'data',
    overlays: 'overlay',
    feedback: 'feedback',
    graphs: 'graph',
    editors: 'editor',
    workbenchSurfaces: 'surface',
    patterns: 'pattern',
    themeManager: 'manager'
  };

  return kindByCategory[category];
}

export function createDesignConstructionLayers(
  node: DesignSystemThemeGraphNode | null,
  inspection: DesignSystemThemeInspection | null,
  discoveryEntities: DesignSystemDiscoveryProjection['entities'],
  categoryEntry: { label: string; nodes: DesignSystemThemeGraphNode[] } | null,
  graph: DesignSystemThemeGraph
): DesignConstructionLayer[] {
  const label = node?.title ?? categoryEntry?.label ?? 'Selection';
  const status = inspection?.status ?? node?.status ?? 'synced';
  const tokenItems = [...new Set([...(inspection?.tokens ?? []), ...(node?.tokens ?? [])])];
  const cssItems = [...new Set([...(inspection?.cssVariables ?? []), ...(node?.cssVariables ?? [])])];
  const relatedNodes = resolveRelatedDesignNodes(inspection, node?.id ?? null, graph);
  const categoryNodes = categoryEntry?.nodes.filter((entry) => entry.id !== node?.id).map((entry) => entry.title) ?? [];
  const discoveryLabels = discoveryEntities.map((entity) => entity.title);

  return [
    {
      id: 'atoms',
      label: 'Atoms',
      title: 'Tokens + CSS',
      summary: 'Lowest-level values that build the selected element.',
      items: [...tokenItems, ...cssItems],
      status
    },
    {
      id: 'molecules',
      label: 'Molecules',
      title: label,
      summary: 'Selected primitive or component assembled from the atom set.',
      items: node ? [node.id, node.category] : [categoryEntry?.label ?? 'category'],
      status
    },
    {
      id: 'organisms',
      label: 'Organisms',
      title: 'Related nodes',
      summary: 'Registry relations that depend on, compose, or expose this element.',
      items: relatedNodes.map((entry) => entry.title),
      status: relatedNodes.some((entry) => entry.status !== 'synced') ? 'mismatch' : status
    },
    {
      id: 'templates',
      label: 'Templates',
      title: 'Category context',
      summary: 'Sibling elements that frame the same usage family.',
      items: categoryNodes,
      status: categoryEntry?.nodes.some((entry) => entry.status !== 'synced') ? 'mismatch' : status
    },
    {
      id: 'pages',
      label: 'Pages',
      title: 'Runtime usage',
      summary: 'Live workbench entities currently discovered for this design node.',
      items: discoveryLabels,
      status: discoveryEntities.some((entry) => entry.status !== 'synced') ? 'mismatch' : status
    }
  ];
}

export function resolveRelatedDesignNodes(
  inspection: DesignSystemThemeInspection | null,
  currentNodeId: string | null,
  graph: DesignSystemThemeGraph
): DesignSystemThemeGraphNode[] {
  if (!inspection) {
    return [];
  }

  return inspection.relatedNodeIds
    .filter((nodeId) => nodeId !== currentNodeId)
    .map((nodeId) => resolveDesignNodeById(nodeId, graph))
    .filter((node): node is DesignSystemThemeGraphNode => Boolean(node));
}

export function resolveDesignNodeById(nodeId: string, graph: DesignSystemThemeGraph): DesignSystemThemeGraphNode | null {
  return graph.categories.flatMap((category) => category.nodes).find((node) => node.id === nodeId) ?? null;
}

export function resolveDesignNodeTitle(nodeId: string, graph: DesignSystemThemeGraph): string {
  return resolveDesignNodeById(nodeId, graph)?.title ?? nodeId;
}

export function summarizeDesignLayerItems(items: string[], fallback: string): string {
  if (items.length === 0) {
    return fallback;
  }

  if (items.length <= 3) {
    return items.join(' / ');
  }

  return `${items.slice(0, 3).join(' / ')} +${items.length - 3}`;
}

export function filterDesignCategoryNodes(
  category: { label: string; nodes: DesignSystemThemeGraphNode[] } | null,
  query: string
): DesignSystemThemeGraphNode[] {
  if (!category) {
    return [];
  }

  if (!query.trim()) {
    return category.nodes;
  }

  if (matchesSearchText(category.label, query)) {
    return category.nodes;
  }

  return category.nodes.filter((node) => matchesDesignNodeSearch(node, query));
}

export function matchesDesignNodeSearch(node: DesignSystemThemeGraphNode, query: string): boolean {
  return [
    node.id,
    node.title,
    node.summary,
    node.category,
    node.status,
    ...node.tokens,
    ...node.cssVariables
  ].some((value) => matchesSearchText(value, query));
}

export function matchesSearchText(value: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  return !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
}

export function resolvePreviewThemeStyle(
  draftValues: Record<string, string>,
  mode: string,
  syncPreview: DesignSystemThemeSyncPreview
): string {
  const surface = resolvePreviewThemeVariableValue('--color-background-surface', draftValues, mode, syncPreview);
  const isDarkSurface = isDarkPreviewColor(surface, mode);
  const defaultText = isDarkSurface ? 'rgba(239, 244, 249, 0.94)' : '#101721';
  const defaultTextMuted = isDarkSurface ? 'rgba(195, 207, 219, 0.68)' : '#657086';
  const defaultBorder = isDarkSurface ? 'rgba(255, 255, 255, 0.14)' : 'rgba(27, 42, 65, 0.16)';

  return [
    `--dst-action-primary: ${resolvePreviewThemeVariableValue('--color-action-primary', draftValues, mode, syncPreview)}`,
    `--dst-canvas: ${resolvePreviewThemeVariableValue('--color-background-canvas', draftValues, mode, syncPreview)}`,
    `--dst-surface: ${surface}`,
    `--dst-radius: ${resolvePreviewThemeVariableValue('--radius-medium', draftValues, mode, syncPreview)}`,
    `--dst-text: ${resolvePreviewThemeTextValue('--color-text-primary', defaultText, draftValues)}`,
    `--dst-text-muted: ${resolvePreviewThemeTextValue('--color-text-muted', defaultTextMuted, draftValues)}`,
    `--dst-border: ${resolvePreviewThemeTextValue('--color-border-subtle', defaultBorder, draftValues)}`,
    `--dst-shadow: ${mode === 'light' ? '0 18px 42px rgb(34 48 70 / 0.12)' : '0 18px 42px rgb(0 0 0 / 0.28)'}`
  ].join('; ');
}

export function resolvePreviewThemeVariableValue(
  variable: string,
  draftValues: Record<string, string> = {},
  mode = 'dark',
  syncPreview: DesignSystemThemeSyncPreview,
  lightThemeValues: Record<string, string> = LIGHT_THEME_VALUES
): string {
  const draftValue = draftValues[variable];
  if (draftValue !== undefined) {
    return draftValue;
  }

  if (mode === 'light') {
    const lightValue = lightThemeValues[variable];
    if (lightValue) {
      return lightValue;
    }
  }

  return resolveThemeVariableValue(variable, draftValues, syncPreview);
}

export function resolvePreviewThemeTextValue(variable: string, fallback: string, draftValues: Record<string, string> = {}): string {
  return draftValues[variable] ?? fallback;
}

export function isDarkPreviewColor(value: string, mode = 'dark'): boolean {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!match) {
    return mode !== 'light';
  }

  const hex = match[1].length === 3 ? match[1].split('').map((item) => `${item}${item}`).join('') : match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance < 0.45;
}

export function resolveThemeVariableValue(
  variable: string,
  draftValues: Record<string, string> = {},
  syncPreview: DesignSystemThemeSyncPreview
): string {
  const draftValue = draftValues[variable];
  if (draftValue !== undefined) {
    return draftValue;
  }

  const diffEntry = syncPreview.entries.find((entry) => entry.themeVariable === variable);

  return diffEntry?.themeValue ?? diffEntry?.targetValue ?? `var(${variable})`;
}

export function resolveThemeVariableTargetValue(
  variable: string,
  registry: DesignSystemThemeRegistry
): string {
  const registryVariable = registry.variables.find((entry) => entry.themeVariable === variable);

  return registryVariable?.targetValue ?? registryVariable?.sourceValue ?? registryVariable?.themeValue ?? '';
}
