export const DESIGN_SYSTEM_THEME_SCHEMA_VERSION = 'design-system-theme-explorer.v1';

export type DesignSystemThemeCategory =
  | 'theme'
  | 'foundations'
  | 'tokens'
  | 'iconography'
  | 'primitives'
  | 'forms'
  | 'components'
  | 'cards'
  | 'layout'
  | 'navigation'
  | 'dataDisplay'
  | 'overlays'
  | 'feedback'
  | 'graphs'
  | 'editors'
  | 'workbenchSurfaces'
  | 'patterns'
  | 'themeManager';

export type DesignSystemThemeSyncStatus = 'synced' | 'mismatch' | 'missing' | 'orphan';

export interface DesignSystemThemeMetadata {
  id: string;
  title: string;
  source: string;
  exportTarget: string;
  figmaCollection: string;
  figmaMode: string;
}

export interface DesignSystemThemeTarget {
  id: string;
  title: string;
  kind: 'css-theme' | 'figma-variables' | string;
  format: string;
  mode: string;
  collection: string;
  source: string;
  exportPath: string;
  description: string;
}

export interface DesignSystemThemeFigmaBinding {
  collection: string;
  mode: string;
  variable: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | string;
  scopes: string[];
}

export interface DesignSystemThemeElement {
  id: string;
  category: DesignSystemThemeCategory;
  title: string;
  summary: string;
  status: DesignSystemThemeSyncStatus;
  tokens: string[];
  cssVariables: string[];
  value?: string;
  themeValue?: string;
  figma?: DesignSystemThemeFigmaBinding;
}

export interface DesignSystemThemeMapping {
  sourceId: string;
  themeVariable: string;
  exportPath: string;
  strategy: 'sync' | 'override' | 'export' | string;
}

export interface DesignSystemThemeRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
}

export type DesignSystemDiscoveryBindingTarget =
  | 'shell-widget'
  | 'tool'
  | 'workspace-panel'
  | 'runtime-projection'
  | 'history-bridge';

export interface DesignSystemDiscoveryBinding {
  id: string;
  targetKind: DesignSystemDiscoveryBindingTarget;
  match: string[];
  designNodeIds: string[];
  relationKind: string;
  capabilities: string[];
}

export interface DesignSystemThemeDiffEntry {
  id: string;
  sourceId: string;
  themeVariable: string;
  status: DesignSystemThemeSyncStatus;
  sourceValue: string | null;
  themeValue: string | null;
  targetValue: string | null;
  preview: string;
}

export interface DesignSystemFeatureImpact {
  featureId: string;
  summary: string;
  components: string[];
  tokens: string[];
  cssVariables: string[];
  status: DesignSystemThemeSyncStatus;
}

export interface DesignSystemThemeDocument {
  version: string;
  metadata: DesignSystemThemeMetadata;
  targets: DesignSystemThemeTarget[];
  theme: DesignSystemThemeElement[];
  foundations: DesignSystemThemeElement[];
  tokens: DesignSystemThemeElement[];
  iconography: DesignSystemThemeElement[];
  primitives: DesignSystemThemeElement[];
  forms: DesignSystemThemeElement[];
  components: DesignSystemThemeElement[];
  cards: DesignSystemThemeElement[];
  layout: DesignSystemThemeElement[];
  navigation: DesignSystemThemeElement[];
  dataDisplay: DesignSystemThemeElement[];
  overlays: DesignSystemThemeElement[];
  feedback: DesignSystemThemeElement[];
  graphs: DesignSystemThemeElement[];
  editors: DesignSystemThemeElement[];
  workbenchSurfaces: DesignSystemThemeElement[];
  patterns: DesignSystemThemeElement[];
  themeManager: DesignSystemThemeElement[];
  mapping: DesignSystemThemeMapping[];
  relations: DesignSystemThemeRelation[];
  discoveryBindings: DesignSystemDiscoveryBinding[];
  diff: DesignSystemThemeDiffEntry[];
  featureImpacts: DesignSystemFeatureImpact[];
}

export interface DesignSystemThemeGraphNode {
  id: string;
  category: DesignSystemThemeCategory;
  title: string;
  summary: string;
  status: DesignSystemThemeSyncStatus;
  relationCount: number;
  tokens: string[];
  cssVariables: string[];
}

export interface DesignSystemThemeGraphCategory {
  category: DesignSystemThemeCategory;
  label: string;
  nodes: DesignSystemThemeGraphNode[];
}

export interface DesignSystemThemeGraph {
  categories: DesignSystemThemeGraphCategory[];
  relations: DesignSystemThemeRelation[];
  totals: {
    nodes: number;
    relations: number;
    tokens: number;
    cssVariables: number;
  };
}

export interface DesignSystemThemeSyncPreview {
  entries: DesignSystemThemeDiffEntry[];
  counts: Record<DesignSystemThemeSyncStatus, number>;
  previewText: string;
}

export interface DesignSystemThemeInspection {
  id: string;
  element: DesignSystemThemeElement | null;
  relations: DesignSystemThemeRelation[];
  relatedNodeIds: string[];
  tokens: string[];
  cssVariables: string[];
  diffEntries: DesignSystemThemeDiffEntry[];
  status: DesignSystemThemeSyncStatus;
  figma: DesignSystemThemeFigmaBinding | null;
}

export interface DesignSystemFigmaVariable {
  name: string;
  type: string;
  value: string | number | boolean;
  mode: string;
  collection: string;
  scopes: string[];
  sourceId: string;
}

export interface DesignSystemFigmaExport {
  format: 'figma-variable-collection';
  collection: string;
  mode: string;
  variables: DesignSystemFigmaVariable[];
  source: string;
  target: string;
}

export interface DesignSystemThemeContractSummary {
  version: string;
  source: string;
  cssTarget: DesignSystemThemeTarget | null;
  figmaTarget: DesignSystemThemeTarget | null;
  reconciliation: string[];
  figmaVariableCount: number;
}

export interface DesignSystemThemeRegistryMode {
  id: string;
  label: string;
  kind: string;
  collection: string;
  mode: string;
  source: string;
  target: string;
  description: string;
}

export interface DesignSystemThemeRegistryVariable {
  sourceId: string;
  themeVariable: string;
  exportPath: string;
  strategy: string;
  status: DesignSystemThemeSyncStatus;
  sourceValue: string | null;
  themeValue: string | null;
  targetValue: string | null;
  figmaVariable: string | null;
}

export interface DesignSystemThemeRegistry {
  id: string;
  title: string;
  activeMode: DesignSystemThemeRegistryMode;
  modes: DesignSystemThemeRegistryMode[];
  variables: DesignSystemThemeRegistryVariable[];
  statusCounts: Record<DesignSystemThemeSyncStatus, number>;
}

export const DESIGN_SYSTEM_THEME_CATEGORIES: DesignSystemThemeCategory[] = [
  'theme',
  'foundations',
  'tokens',
  'iconography',
  'primitives',
  'forms',
  'components',
  'cards',
  'layout',
  'navigation',
  'dataDisplay',
  'overlays',
  'feedback',
  'graphs',
  'editors',
  'workbenchSurfaces',
  'patterns',
  'themeManager'
];

export const DESIGN_SYSTEM_THEME_CATEGORY_LABELS: Record<DesignSystemThemeCategory, string> = {
  theme: 'Themes',
  foundations: 'Foundations',
  tokens: 'Tokens',
  iconography: 'Iconography',
  primitives: 'Primitives',
  forms: 'Forms & Inputs',
  components: 'Components',
  cards: 'Cards & Content',
  layout: 'Layout & Shell',
  navigation: 'Navigation & Commands',
  dataDisplay: 'Data & Registry',
  overlays: 'Overlays',
  feedback: 'Feedback',
  graphs: 'Graphs & Relations',
  editors: 'Editors',
  workbenchSurfaces: 'Workbench Surfaces',
  patterns: 'Patterns',
  themeManager: 'Theme Manager'
};

/** Per-consumer derived views, never a selected repository document or session. */
export function createDesignSystemThemeProjection(input: DesignSystemThemeDocument | null) {
  // Structural placeholders allow unrelated documentation to remain usable.
  // Consumers must not present them as an available or synchronized catalog.
  const document = input ?? normalizeDesignSystemThemeDocument(null);
  return {
    available: input !== null,
    document,
    graph: buildDesignSystemThemeGraph(document),
    syncPreview: createDesignSystemThemeSyncPreview(document),
    registry: createDesignSystemThemeRegistry(document)
  };
}

export function normalizeDesignSystemThemeDocument(input: unknown): DesignSystemThemeDocument {
  const record = isRecord(input) ? input : {};
  const metadata = isRecord(record.metadata) ? record.metadata : {};

  return {
    version: normalizeString(record.version, DESIGN_SYSTEM_THEME_SCHEMA_VERSION),
    metadata: {
      id: normalizeString(metadata.id, 'design-system-theme'),
      title: normalizeString(metadata.title, 'Design System Theme'),
      source: normalizeString(metadata.source, ''),
      exportTarget: normalizeString(metadata.exportTarget, ''),
      figmaCollection: normalizeString(metadata.figmaCollection, 'Workbench Theme'),
      figmaMode: normalizeString(metadata.figmaMode, 'Dark')
    },
    targets: normalizeTargetArray(record.targets),
    theme: normalizeElementArray(record.theme, 'theme'),
    foundations: normalizeElementArray(record.foundations, 'foundations'),
    tokens: normalizeElementArray(record.tokens, 'tokens'),
    iconography: normalizeElementArray(record.iconography, 'iconography'),
    primitives: normalizeElementArray(record.primitives, 'primitives'),
    forms: normalizeElementArray(record.forms, 'forms'),
    components: normalizeElementArray(record.components, 'components'),
    cards: normalizeElementArray(record.cards, 'cards'),
    layout: normalizeElementArray(record.layout, 'layout'),
    navigation: normalizeElementArray(record.navigation, 'navigation'),
    dataDisplay: normalizeElementArray(record.dataDisplay, 'dataDisplay'),
    overlays: normalizeElementArray(record.overlays, 'overlays'),
    feedback: normalizeElementArray(record.feedback, 'feedback'),
    graphs: normalizeElementArray(record.graphs, 'graphs'),
    editors: normalizeElementArray(record.editors, 'editors'),
    workbenchSurfaces: normalizeElementArray(record.workbenchSurfaces, 'workbenchSurfaces'),
    patterns: normalizeElementArray(record.patterns, 'patterns'),
    themeManager: normalizeElementArray(record.themeManager, 'themeManager'),
    mapping: normalizeMappingArray(record.mapping),
    relations: normalizeRelationArray(record.relations),
    discoveryBindings: normalizeDiscoveryBindingArray(record.discoveryBindings),
    diff: normalizeDiffArray(record.diff),
    featureImpacts: normalizeFeatureImpactArray(record.featureImpacts)
  };
}

export function serializeDesignSystemThemeDocument(document: DesignSystemThemeDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function listDesignSystemThemeElements(document: DesignSystemThemeDocument): DesignSystemThemeElement[] {
  return DESIGN_SYSTEM_THEME_CATEGORIES.flatMap((category) => document[category]);
}

export function buildDesignSystemThemeGraph(document: DesignSystemThemeDocument): DesignSystemThemeGraph {
  const relationCounts = new Map<string, number>();

  for (const relation of document.relations) {
    relationCounts.set(relation.from, (relationCounts.get(relation.from) ?? 0) + 1);
    relationCounts.set(relation.to, (relationCounts.get(relation.to) ?? 0) + 1);
  }

  const categories = DESIGN_SYSTEM_THEME_CATEGORIES.map((category) => ({
    category,
    label: DESIGN_SYSTEM_THEME_CATEGORY_LABELS[category],
    nodes: document[category].map((element) => ({
      id: element.id,
      category: element.category,
      title: element.title,
      summary: element.summary,
      status: element.status,
      relationCount: relationCounts.get(element.id) ?? 0,
      tokens: element.tokens,
      cssVariables: element.cssVariables
    }))
  }));
  const elements = listDesignSystemThemeElements(document);
  const tokens = new Set(elements.flatMap((element) => element.tokens));
  const cssVariables = new Set(elements.flatMap((element) => element.cssVariables));

  return {
    categories,
    relations: document.relations,
    totals: {
      nodes: elements.length,
      relations: document.relations.length,
      tokens: tokens.size,
      cssVariables: cssVariables.size
    }
  };
}

export function createDesignSystemThemeSyncPreview(
  document: DesignSystemThemeDocument
): DesignSystemThemeSyncPreview {
  const computedDiff = computeDesignSystemThemeDiff(document);
  const entries = computedDiff.length > 0 ? computedDiff : document.diff;

  return {
    entries,
    counts: createSyncStatusCounts(entries),
    previewText: entries
      .filter((entry) => entry.status === 'mismatch' || entry.status === 'missing')
      .map((entry) => entry.preview)
      .join('\n')
  };
}

export function computeDesignSystemThemeDiff(document: DesignSystemThemeDocument): DesignSystemThemeDiffEntry[] {
  const elementsById = new Map(listDesignSystemThemeElements(document).map((element) => [element.id, element]));

  return document.mapping.map((mapping) => {
    const element = elementsById.get(mapping.sourceId);
    const sourceValue = element?.value ?? null;
    const themeValue = element?.themeValue ?? null;
    const status = resolveDiffStatus(sourceValue, themeValue, Boolean(element));
    const targetValue = sourceValue ?? themeValue;

    return {
      id: `diff.${mapping.themeVariable.replace(/^--/, '').replace(/[^a-z0-9]+/gi, '-')}`,
      sourceId: mapping.sourceId,
      themeVariable: mapping.themeVariable,
      status,
      sourceValue,
      themeValue,
      targetValue,
      preview: targetValue ? `${mapping.themeVariable}: ${targetValue};` : `${mapping.themeVariable}: <missing>;`
    };
  });
}

export function mapDesignSystemFeatureImpacts(
  featureEntries: Array<{ id: string; title?: string }>,
  document: DesignSystemThemeDocument
): Array<DesignSystemFeatureImpact & { title: string }> {
  const impactsByFeatureId = new Map(document.featureImpacts.map((impact) => [impact.featureId, impact]));

  return featureEntries
    .map((feature) => {
      const impact = impactsByFeatureId.get(feature.id);

      return impact
        ? {
            ...impact,
            title: feature.title ?? feature.id
          }
        : null;
    })
    .filter((impact): impact is DesignSystemFeatureImpact & { title: string } => Boolean(impact));
}

export function resolveDesignSystemThemeInspection(
  document: DesignSystemThemeDocument,
  targetId: string | null
): DesignSystemThemeInspection | null {
  if (!targetId) {
    return null;
  }

  const syncPreview = createDesignSystemThemeSyncPreview(document);
  const elements = listDesignSystemThemeElements(document);
  const element = elements.find((entry) => entry.id === targetId) ?? null;
  const relations = document.relations.filter((relation) => relation.from === targetId || relation.to === targetId);
  const relatedNodeIds = [
    targetId,
    ...relations.flatMap((relation) => [relation.from, relation.to]).filter((id) => id !== targetId)
  ];
  const tokens = element?.tokens.length ? element.tokens : targetId.startsWith('token.') ? [targetId] : [];
  const cssVariables = element?.cssVariables ?? [];
  const diffEntries = syncPreview.entries.filter(
    (entry) =>
      entry.sourceId === targetId ||
      tokens.includes(entry.sourceId) ||
      cssVariables.includes(entry.themeVariable)
  );

  return {
    id: targetId,
    element,
    relations,
    relatedNodeIds: [...new Set(relatedNodeIds)],
    tokens,
    cssVariables,
    diffEntries,
    status: diffEntries.find((entry) => entry.status !== 'synced')?.status ?? element?.status ?? 'synced',
    figma: element?.figma ?? null
  };
}

export function createDesignSystemFigmaExport(document: DesignSystemThemeDocument): DesignSystemFigmaExport {
  const figmaTarget = resolveDesignSystemThemeTarget(document, 'figma-variables');
  const tokens = listDesignSystemThemeElements(document).filter((element) => element.figma);

  return {
    format: 'figma-variable-collection',
    collection: figmaTarget?.collection ?? document.metadata.figmaCollection,
    mode: figmaTarget?.mode ?? document.metadata.figmaMode,
    variables: tokens.map((element) => ({
      name: element.figma?.variable ?? element.id,
      type: element.figma?.type ?? 'STRING',
      value: coerceFigmaVariableValue(element.value ?? element.themeValue ?? element.id, element.figma?.type),
      mode: element.figma?.mode ?? figmaTarget?.mode ?? document.metadata.figmaMode,
      collection: element.figma?.collection ?? figmaTarget?.collection ?? document.metadata.figmaCollection,
      scopes: element.figma?.scopes ?? [],
      sourceId: element.id
    })),
    source: figmaTarget?.source ?? document.metadata.source,
    target: figmaTarget?.exportPath ?? 'figma/variables/workbench-theme.dark.json'
  };
}

export function createDesignSystemThemeContractSummary(
  document: DesignSystemThemeDocument
): DesignSystemThemeContractSummary {
  const figmaExport = createDesignSystemFigmaExport(document);

  return {
    version: document.version,
    source: document.metadata.source,
    cssTarget: resolveDesignSystemThemeTarget(document, 'css-theme'),
    figmaTarget: resolveDesignSystemThemeTarget(document, 'figma-variables'),
    reconciliation: [
      'Registry document is the source of truth for docs-local previews.',
      'CSS custom properties are the runtime target.',
      'Figma variables are generated from the same token mappings.',
      'Diff status remains advisory until a write service applies sync or override actions.'
    ],
    figmaVariableCount: figmaExport.variables.length
  };
}

export function createDesignSystemThemeRegistry(document: DesignSystemThemeDocument): DesignSystemThemeRegistry {
  const fallbackMode: DesignSystemThemeRegistryMode = {
    id: document.metadata.id,
    label: document.metadata.title,
    kind: 'registry',
    collection: document.metadata.figmaCollection,
    mode: document.metadata.figmaMode,
    source: document.metadata.source,
    target: document.metadata.exportTarget,
    description: 'Docs-local theme registry mode.'
  };
  const modes = document.targets.map((target) => ({
    id: target.id,
    label: target.title,
    kind: target.kind,
    collection: target.collection,
    mode: target.mode,
    source: target.source,
    target: target.exportPath,
    description: target.description
  }));
  const activeMode =
    modes.find((mode) => mode.kind === 'css-theme') ??
    modes.find((mode) => mode.mode === document.metadata.figmaMode) ??
    fallbackMode;
  const diffByVariable = new Map(createDesignSystemThemeSyncPreview(document).entries.map((entry) => [entry.themeVariable, entry]));
  const elementsById = new Map(listDesignSystemThemeElements(document).map((element) => [element.id, element]));
  const variables = document.mapping.map((mapping) => {
    const diffEntry = diffByVariable.get(mapping.themeVariable);
    const element = elementsById.get(mapping.sourceId);

    return {
      sourceId: mapping.sourceId,
      themeVariable: mapping.themeVariable,
      exportPath: mapping.exportPath,
      strategy: mapping.strategy,
      status: diffEntry?.status ?? 'missing',
      sourceValue: diffEntry?.sourceValue ?? element?.value ?? null,
      themeValue: diffEntry?.themeValue ?? element?.themeValue ?? null,
      targetValue: diffEntry?.targetValue ?? element?.value ?? element?.themeValue ?? null,
      figmaVariable: element?.figma?.variable ?? null
    };
  });

  return {
    id: document.metadata.id,
    title: document.metadata.title,
    activeMode,
    modes: modes.length > 0 ? modes : [fallbackMode],
    variables,
    statusCounts: createSyncStatusCounts([...diffByVariable.values()])
  };
}

function resolveDesignSystemThemeTarget(
  document: DesignSystemThemeDocument,
  kind: DesignSystemThemeTarget['kind']
): DesignSystemThemeTarget | null {
  return document.targets.find((target) => target.kind === kind) ?? null;
}

function coerceFigmaVariableValue(value: string, type: string | undefined): string | number | boolean {
  if (type === 'FLOAT') {
    const numeric = Number.parseFloat(value);

    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (type === 'BOOLEAN') {
    return value === 'true';
  }

  return value;
}

function normalizeTargetArray(input: unknown): DesignSystemThemeTarget[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        id: normalizeString(entry.id, 'target.unknown'),
        title: normalizeString(entry.title, 'Target'),
        kind: normalizeString(entry.kind, 'target'),
        format: normalizeString(entry.format, 'json'),
        mode: normalizeString(entry.mode, ''),
        collection: normalizeString(entry.collection, ''),
        source: normalizeString(entry.source, ''),
        exportPath: normalizeString(entry.exportPath, ''),
        description: normalizeString(entry.description, '')
      }))
    : [];
}

function normalizeElementArray(input: unknown, category: DesignSystemThemeCategory): DesignSystemThemeElement[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => normalizeElement(entry, category))
    : [];
}

function normalizeElement(
  input: Record<string, unknown>,
  category: DesignSystemThemeCategory
): DesignSystemThemeElement {
  const id = normalizeString(input.id, `${category}.unknown`);

  return {
    id,
    category,
    title: normalizeString(input.title, id),
    summary: normalizeString(input.summary, ''),
    status: normalizeSyncStatus(input.status),
    tokens: normalizeStringArray(input.tokens),
    cssVariables: normalizeStringArray(input.cssVariables),
    value: normalizeOptionalString(input.value),
    themeValue: normalizeOptionalString(input.themeValue),
    figma: normalizeFigmaBinding(input.figma)
  };
}

function normalizeFigmaBinding(input: unknown): DesignSystemThemeFigmaBinding | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  return {
    collection: normalizeString(input.collection, ''),
    mode: normalizeString(input.mode, ''),
    variable: normalizeString(input.variable, ''),
    type: normalizeString(input.type, 'STRING'),
    scopes: normalizeStringArray(input.scopes)
  };
}

function normalizeMappingArray(input: unknown): DesignSystemThemeMapping[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        sourceId: normalizeString(entry.sourceId, ''),
        themeVariable: normalizeString(entry.themeVariable, ''),
        exportPath: normalizeString(entry.exportPath, ''),
        strategy: normalizeString(entry.strategy, 'sync')
      })).filter((entry) => entry.sourceId && entry.themeVariable)
    : [];
}

function normalizeRelationArray(input: unknown): DesignSystemThemeRelation[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        id: normalizeString(entry.id, `${normalizeString(entry.from, 'source')}->${normalizeString(entry.to, 'target')}`),
        from: normalizeString(entry.from, ''),
        to: normalizeString(entry.to, ''),
        kind: normalizeString(entry.kind, 'related-to')
      })).filter((entry) => entry.from && entry.to)
    : [];
}

function normalizeDiscoveryBindingArray(input: unknown): DesignSystemDiscoveryBinding[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        id: normalizeString(entry.id, 'binding.unknown'),
        targetKind: normalizeDiscoveryBindingTarget(entry.targetKind),
        match: normalizeStringArray(entry.match),
        designNodeIds: normalizeStringArray(entry.designNodeIds),
        relationKind: normalizeString(entry.relationKind, 'uses-design-node'),
        capabilities: normalizeStringArray(entry.capabilities)
      })).filter((entry) => entry.designNodeIds.length > 0)
    : [];
}

function normalizeDiffArray(input: unknown): DesignSystemThemeDiffEntry[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        id: normalizeString(entry.id, 'diff.unknown'),
        sourceId: normalizeString(entry.sourceId, ''),
        themeVariable: normalizeString(entry.themeVariable, ''),
        status: normalizeSyncStatus(entry.status),
        sourceValue: normalizeOptionalString(entry.sourceValue) ?? null,
        themeValue: normalizeOptionalString(entry.themeValue) ?? null,
        targetValue: normalizeOptionalString(entry.targetValue) ?? null,
        preview: normalizeString(entry.preview, '')
      }))
    : [];
}

function normalizeFeatureImpactArray(input: unknown): DesignSystemFeatureImpact[] {
  return Array.isArray(input)
    ? input.filter(isRecord).map((entry) => ({
        featureId: normalizeString(entry.featureId, ''),
        summary: normalizeString(entry.summary, ''),
        components: normalizeStringArray(entry.components),
        tokens: normalizeStringArray(entry.tokens),
        cssVariables: normalizeStringArray(entry.cssVariables),
        status: normalizeSyncStatus(entry.status)
      })).filter((entry) => entry.featureId)
    : [];
}

function createSyncStatusCounts(entries: DesignSystemThemeDiffEntry[]): Record<DesignSystemThemeSyncStatus, number> {
  return entries.reduce<Record<DesignSystemThemeSyncStatus, number>>(
    (counts, entry) => {
      counts[entry.status] += 1;
      return counts;
    },
    {
      synced: 0,
      mismatch: 0,
      missing: 0,
      orphan: 0
    }
  );
}

function resolveDiffStatus(
  sourceValue: string | null,
  themeValue: string | null,
  hasSource: boolean
): DesignSystemThemeSyncStatus {
  if (!hasSource) return 'orphan';
  if (!sourceValue) return 'missing';
  if (!themeValue) return 'missing';
  return sourceValue === themeValue ? 'synced' : 'mismatch';
}

function normalizeSyncStatus(input: unknown): DesignSystemThemeSyncStatus {
  return input === 'synced' || input === 'mismatch' || input === 'missing' || input === 'orphan'
    ? input
    : 'missing';
}

function normalizeDiscoveryBindingTarget(input: unknown): DesignSystemDiscoveryBindingTarget {
  return input === 'shell-widget' ||
    input === 'tool' ||
    input === 'workspace-panel' ||
    input === 'runtime-projection' ||
    input === 'history-bridge'
    ? input
    : 'tool';
}

function normalizeStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalizeOptionalString(input: unknown): string | undefined {
  return typeof input === 'string' ? input : undefined;
}

function normalizeString(input: unknown, fallback: string): string {
  return typeof input === 'string' && input.trim() ? input : fallback;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object' && !Array.isArray(input);
}
