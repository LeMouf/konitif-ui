import type { FeatureDocEntry } from '../technicalDocsCatalog';
import type { DesignSystemThemeGraphNode } from '../designSystemThemeCatalog';
import type {
  ProductDocsDesignNode,
  ProductDocsFeature,
  ProductDocsPage,
  ProductDocsSourceEntity,
  ProductDocsTemplate,
  ProductMapColumn,
  ProductMapItem,
  ProductMapTone,
  ProductTreeNode
} from './productDocsModel';

type RuntimeSourceEntityKind = 'engine' | 'dialect' | 'registry';

export function createProductSystemMapColumns(
  pages: ProductDocsPage[],
  templates: ProductDocsTemplate[],
  selectedPage: ProductDocsPage | null,
  selectedTemplate: ProductDocsTemplate | null,
  features: Array<ProductDocsFeature | FeatureDocEntry>,
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>,
  sourceEntities: ProductDocsSourceEntity[]
): ProductMapColumn[] {
  const atomNodes = designNodes.filter((node) =>
    ['tokens', 'primitives', 'forms', 'iconography'].includes(node.category)
  );
  const organismNodes = designNodes.filter((node) =>
    ['components', 'layout', 'navigation', 'workbenchSurfaces', 'patterns', 'graphs'].includes(node.category)
  );
  const layoutNodes = designNodes.filter((node) =>
    ['layout', 'navigation', 'workbenchSurfaces'].includes(node.category)
  );
  const layoutItems = layoutNodes.length
    ? layoutNodes.map((node) => createDesignNodeMapItem(node, 'template', 'Layout'))
    : (selectedTemplate?.slots ?? []).map((slot) => createProductLayoutSlotMapItem(slot, selectedTemplate));
  const atomSourceEntities = sourceEntities.filter((entity) => entity.kind === 'atom');
  const workbenchPrimitiveAtomItems = atomSourceEntities
    .filter(isWorkbenchUiPrimitiveAtom)
    .map((entity) => createSourceEntityMapItem(entity, 'design', 'Atom'));
  const atomItems = atomSourceEntities.length
    ? mergeProductMapItems(
        workbenchPrimitiveAtomItems,
        atomSourceEntities
          .filter((entity) => !isWorkbenchUiPrimitiveAtom(entity))
          .map((entity) => createSourceEntityMapItem(entity, 'design', 'Atom'))
      )
    : atomNodes.map((node) => createDesignNodeMapItem(node, 'design', 'Atom'));
  const moleculeItems = mergeProductMapItems(
    sourceEntities
      .filter((entity) => entity.kind === 'molecule')
      .map((entity) => createSourceEntityMapItem(entity, 'design', 'Molecule')),
    features.map((feature) => createFeatureMapItem(feature, 'design', 'Molecule'))
  );
  const organismItems = mergeProductMapItems(
    sourceEntities
      .filter((entity) => entity.kind === 'organism')
      .map((entity) => createSourceEntityMapItem(entity, 'design', 'Organism')),
    organismNodes.map((node) => createDesignNodeMapItem(node, 'design', 'Organism'))
  );

  return sortProductMapColumnsByOrder([
    {
      id: 'routes',
      title: 'Routes',
      tone: 'product',
      summary: 'Entrées de navigation et chemins publics',
      items: pages.map((page) => createProductRouteMapItem(page)).filter((item): item is ProductMapItem => Boolean(item))
    },
    {
      id: 'layout',
      title: 'Layout',
      tone: 'template',
      summary: 'Slots, régions et chrome de composition',
      items: layoutItems
    },
    {
      id: 'atoms',
      title: 'Atoms',
      tone: 'design',
      summary: 'Composants élémentaires réutilisables',
      items: atomItems
    },
    {
      id: 'molecules',
      title: 'Molecules',
      tone: 'design',
      summary: 'Assemblages simples de features',
      items: moleculeItems
    },
    {
      id: 'organisms',
      title: 'Organisms',
      tone: 'design',
      summary: 'Sections complexes fonctionnelles',
      items: organismItems
    },
    {
      id: 'templates',
      title: 'Templates',
      tone: 'template',
      summary: 'Structures de mise en page',
      items: templates.map((template) => createTemplateMapItem(template, selectedTemplate?.id === template.id))
    },
    {
      id: 'pages',
      title: 'Pages',
      tone: 'product',
      summary: 'Surfaces produit finales',
      items: pages.map((page) => createProductPageMapItem(page, templates.find((template) => template.id === page.templateId) ?? null, selectedPage?.id === page.id))
    }
  ], ['routes', 'pages', 'templates', 'layout', 'organisms', 'molecules', 'atoms']);
}

export function createProductRuntimeMapColumns(
  selectedPage: ProductDocsPage | null,
  features: Array<ProductDocsFeature | FeatureDocEntry>,
  sourceEntities: ProductDocsSourceEntity[]
): ProductMapColumn[] {
  const runtimeFeatures = features.filter((feature) =>
    feature.domain === 'app' ||
    ('layer' in feature && feature.layer === 'runtime') ||
    ['workbench', 'temporal', 'nodal'].includes(feature.context)
  );
  const toolEntries = selectedPage?.entryPoints ?? [];
  const engineEntities = selectProductSourceEntities(sourceEntities, 'engine', selectedPage);
  const dialectEntities = selectProductSourceEntities(sourceEntities, 'dialect', selectedPage);
  const registryEntities = selectProductSourceEntities(sourceEntities, 'registry', selectedPage);

  return sortProductMapColumnsByOrder([
    {
      id: 'runtime',
      title: 'Runtime',
      tone: 'runtime',
      summary: 'Exécution & orchestration',
      items: runtimeFeatures.slice(0, 4).map((feature) => createFeatureMapItem(feature, 'runtime'))
    },
    {
      id: 'engine',
      title: 'Engine',
      tone: 'runtime',
      summary: 'Moteurs applicatifs et runtime scannés dans les sources',
      items: engineEntities.map((entity) => createSourceEntityMapItem(entity, 'runtime', 'Engine'))
    },
    {
      id: 'dialect',
      title: 'Dialect',
      tone: 'runtime',
      summary: 'Dialectes de graph, timeline, assembly et validation',
      items: dialectEntities.map((entity) => createSourceEntityMapItem(entity, 'runtime', 'Dialect'))
    },
    {
      id: 'registry',
      title: 'Registry',
      tone: 'shared',
      summary: 'Catalogues, registries et sources de vérité runtime/docs',
      items: registryEntities.map((entity) => createSourceEntityMapItem(entity, 'shared', 'Registry'))
    },
    {
      id: 'tools',
      title: 'Tools',
      tone: 'shared',
      summary: 'Outils & inspections',
      items: toolEntries.slice(0, 4).map((entryPoint) => ({
        id: `entry.${entryPoint.kind}.${entryPoint.href}`,
        title: entryPoint.label,
        subtitle: entryPoint.href,
        kind: entryPoint.kind,
        tone: 'shared' as const,
        status: 'active',
        tags: [entryPoint.kind],
        dependencies: [selectedPage?.title ?? 'Page'],
        consumers: []
      }))
    }
  ], ['tools', 'registry', 'engine', 'runtime', 'dialect']);
}

export function createProductPageMapItemId(pageId: string): string {
  return `page.${pageId}`;
}

export function createProductTemplateMapItemId(templateId: string): string {
  return `template.${templateId}`;
}

export function resolveProductInspectorPage(
  itemId: string | null,
  item: ProductMapItem | null,
  pages: ProductDocsPage[]
): ProductDocsPage | null {
  const pageIds = [itemId, item?.id]
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter((candidate) => candidate.startsWith('page.'))
    .map((candidate) => candidate.slice('page.'.length));
  const pageById = pages.find((page) => pageIds.includes(page.id));

  if (pageById) {
    return pageById;
  }

  return pages.find((page) => page.config === item?.sourceFile) ?? null;
}

export function createProductInspectorDependencies(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null
): ProductTreeNode[] {
  if (!page) {
    return [];
  }

  const templateNode = template ? createProductTemplateTreeNode(template, `inspector.${page.id}.template`) : null;
  const sourceNodes = uniqueBy([...(page.sourceEntities ?? []), ...(template?.sourceEntities ?? [])], (entity) => `${entity.kind}:${entity.title}:${entity.sourceFile}`)
    .slice(0, 5)
    .map((entity) => createSourceEntityTreeNode(entity));
  const featureNodes = uniqueBy([...(page.features ?? []), ...(template?.features ?? [])], (feature) => feature.id)
    .slice(0, 5)
    .map((feature) => ({
      id: `inspector.${page.id}.feature.${feature.id}`,
      label: feature.title,
      tone: 'runtime' as const,
      badge: feature.status,
      targetId: `feature.${feature.id}`
    }));

  return [templateNode, ...sourceNodes, ...featureNodes].filter((node): node is ProductTreeNode => Boolean(node));
}

export function countProductInspectorFiles(page: ProductDocsPage, template: ProductDocsTemplate | null): number {
  return new Set([
    page.config,
    ...(page.sourceEntities?.map((entity) => entity.sourceFile) ?? []),
    ...(template?.sourceEntities?.map((entity) => entity.sourceFile) ?? [])
  ].filter(Boolean)).size;
}

export function formatProductSourceLabel(sourceFile: string): string {
  return sourceFile.split('/').pop() ?? sourceFile;
}

export function resolveProductInspectorExportName(page: ProductDocsPage): string {
  return formatProductSourceLabel(page.config).replace(/\.(svelte|ts|js|json)$/i, '') || page.title;
}

export function resolveProductInspectorMiddleware(page: ProductDocsPage, template: ProductDocsTemplate | null): string {
  const contexts = uniqueBy([...(page.features ?? []), ...(template?.features ?? [])], (feature) => feature.id)
    .map((feature) => feature.context)
    .filter(Boolean);

  return contexts.length ? contexts.slice(0, 3).join(', ') : 'none';
}

export function resolveProductInspectorRuntime(page: ProductDocsPage, template: ProductDocsTemplate | null): string {
  if (page.route === '/docs' || page.route.startsWith('/docs/')) return 'docs-runtime';
  if (page.route.startsWith('/tools/')) return 'tool-runtime';
  return template?.role.toLowerCase().replace(/\s+/g, '-') ?? 'workbench-runtime';
}

export function createProductPageMapItem(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  selected = false
): ProductMapItem {
  return {
    id: page ? createProductPageMapItemId(page.id) : 'page.none',
    title: page?.title ?? 'No page',
    subtitle: page ? formatProductRoutePath(page.route) : 'No route',
    kind: 'Page',
    tone: 'product',
    status: selected ? 'selected' : page?.status ?? 'draft',
    summary: page?.summary,
    sourceFile: page?.config,
    tags: ['page', page?.status ?? 'draft'],
    dependencies: [template?.title ?? page?.templateId ?? 'No template', ...(page?.featureIds ?? []).slice(0, 6)],
    consumers: [
      ...(page?.entryPoints.map((entryPoint) => entryPoint.label) ?? []),
      ...(page?.sourceEntities?.slice(0, 6).map((entity) => entity.title) ?? [])
    ]
  };
}

export function createProductRouteMapItem(page: ProductDocsPage | null): ProductMapItem | null {
  if (!page) {
    return null;
  }

  return {
    id: `route.strip.${page.id}`,
    title: formatProductRoutePath(page.route),
    subtitle: 'Route',
    kind: 'Route',
    tone: 'product',
    status: page.status,
    sourceFile: page.config,
    tags: ['route', page.status],
    dependencies: [page.title],
    consumers: page.entryPoints.map((entryPoint) => entryPoint.label)
  };
}

export function formatProductRoutePath(route: string): string {
  if (route === '/' || route.startsWith('/')) {
    return route;
  }

  return `/${route}`;
}

export function createProductLayoutSlotMapItem(slot: string, template: ProductDocsTemplate | null): ProductMapItem {
  return {
    id: `layout.slot.${template?.id ?? 'selected'}.${slot}`,
    title: slot,
    subtitle: template?.title ?? 'Selected template',
    kind: 'Layout',
    tone: 'template',
    status: 'stable',
    summary: `Layout slot declared by ${template?.title ?? 'the selected template'}.`,
    tags: ['layout', 'slot'],
    dependencies: template ? [template.title] : [],
    consumers: []
  };
}

export function createProductShellMapItem(page: ProductDocsPage | null): ProductMapItem {
  return {
    id: 'shell.product-shell',
    title: 'Product Shell',
    subtitle: 'Application',
    kind: 'Application',
    tone: 'shared',
    status: page?.status ?? 'stable',
    sourceFile: page?.config,
    tags: ['shell', 'application'],
    dependencies: [page?.title ?? 'Selected page'].filter(Boolean),
    consumers: []
  };
}

export function createProductTreeMapItem(nodes: ProductTreeNode[], nodeId: string | null): ProductMapItem | null {
  const node = findProductTreeNode(nodes, nodeId);

  if (!node) {
    return null;
  }

  return {
    id: node.id,
    title: node.label,
    subtitle: node.sourceFile ?? node.badge ?? 'Architecture node',
    kind: 'Architecture',
    tone: node.tone,
    status: node.badge ?? 'stable',
    sourceFile: node.sourceFile,
    tags: [node.tone, node.badge ?? 'node'],
    dependencies: node.children?.map((child) => child.label) ?? [],
    consumers: []
  };
}

export function findProductTreeNode(nodes: ProductTreeNode[], nodeId: string | null): ProductTreeNode | null {
  if (!nodeId) {
    return null;
  }

  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const child = findProductTreeNode(node.children ?? [], nodeId);

    if (child) {
      return child;
    }
  }

  return null;
}

export function createTemplateMapItem(template: ProductDocsTemplate, selected = false): ProductMapItem {
  return {
    id: createProductTemplateMapItemId(template.id),
    title: template.title,
    subtitle: template.role,
    kind: 'Template',
    tone: 'template',
    status: selected ? 'selected' : 'stable',
    summary: template.summary,
    tags: ['template', template.role],
    dependencies: template.featureIds,
    consumers: [...template.slots, ...(template.sourceEntities?.slice(0, 6).map((entity) => entity.title) ?? [])]
  };
}

export function createFeatureMapItem(feature: ProductDocsFeature | FeatureDocEntry, tone: ProductMapTone, kind = 'Feature'): ProductMapItem {
  return {
    id: `feature.${feature.id}`,
    title: feature.title,
    subtitle: `${feature.domain} / ${feature.context}`,
    kind,
    tone,
    status: feature.status,
    summary: feature.summary,
    sourceFile: 'path' in feature ? feature.path : undefined,
    tags: ['domain' in feature ? feature.domain : 'feature', feature.context],
    dependencies: 'designImpact' in feature && feature.designImpact
      ? [...feature.designImpact.components, ...feature.designImpact.tokens]
      : [],
    consumers: []
  };
}

export function createSourceEntityMapItem(entity: ProductDocsSourceEntity, tone: ProductMapTone, kind: string): ProductMapItem {
  return {
    id: `source.${entity.kind}.${entity.sourceFile}.${entity.title}`,
    title: entity.title,
    subtitle: entity.sourceFile,
    kind,
    tone,
    status: 'scanned',
    summary: `Scanned ${entity.kind} entity from ${entity.sourceFile}.`,
    sourceFile: entity.sourceFile,
    tags: [entity.kind, kind.toLowerCase()],
    dependencies: [entity.sourceFile],
    consumers: []
  };
}

export function createDesignNodeMapItem(
  node: ProductDocsDesignNode | DesignSystemThemeGraphNode,
  tone: ProductMapTone,
  kind = node.category
): ProductMapItem {
  return {
    id: `design.${node.id}`,
    title: node.title,
    subtitle: node.id,
    kind,
    tone,
    status: node.status,
    summary: node.summary,
    tags: [node.category, node.status],
    dependencies: 'tokens' in node ? node.tokens : [],
    consumers: []
  };
}

export function sortProductMapColumnsByOrder(columns: ProductMapColumn[], order: string[]): ProductMapColumn[] {
  const rankById = new Map(order.map((id, index) => [id, index]));

  return columns
    .map((column, index) => ({ column, index }))
    .sort((left, right) =>
      (rankById.get(left.column.id) ?? Number.MAX_SAFE_INTEGER) -
        (rankById.get(right.column.id) ?? Number.MAX_SAFE_INTEGER) ||
      left.index - right.index
    )
    .map(({ column }) => column);
}

export function mergeProductMapItems(...groups: ProductMapItem[][]): ProductMapItem[] {
  return uniqueBy(
    groups
      .flat()
      .sort((left, right) =>
        scoreProductMapInventoryItem(right) - scoreProductMapInventoryItem(left) ||
        left.title.localeCompare(right.title)
      ),
    (item) => `${item.kind}:${item.title}:${item.sourceFile ?? item.subtitle}`
  );
}

export function scoreProductMapInventoryItem(item: ProductMapItem): number {
  let score = 0;

  if (item.status === 'scanned') score += 12;
  if (item.sourceFile?.includes('packages/workbench-ui/src/primitives')) score += 22;
  if (item.sourceFile?.includes('packages/workbench-ui/src/layout') && /handle|panel chrome/i.test(item.title)) score += 18;
  if (item.sourceFile?.includes('packages/workbench-ui/src/icons/WorkbenchIcon.svelte')) score += 18;
  if (item.sourceFile?.includes('packages/workbench-ui/src/shell/ShortcutGesture.svelte')) score += 14;
  if (item.sourceFile?.endsWith('.svelte')) score += 10;
  if (item.sourceFile?.includes('packages/workbench-ui/src/layout')) score += 5;
  if (item.sourceFile?.includes('packages/workbench-ui/src/shell')) score += 4;
  if (item.sourceFile && /\/src\/(?:lib\/)?tools\//.test(item.sourceFile)) score += 4;

  return score;
}

export function isWorkbenchUiPrimitiveAtom(entity: ProductDocsSourceEntity): boolean {
  const signature = `${entity.title} ${entity.sourceFile}`.toLowerCase();

  return entity.sourceFile.includes('packages/workbench-ui/src/primitives') ||
    entity.sourceFile.endsWith('packages/workbench-ui/src/icons/WorkbenchIcon.svelte') ||
    entity.sourceFile.endsWith('packages/workbench-ui/src/shell/ShortcutGesture.svelte') ||
    (entity.sourceFile.includes('packages/workbench-ui/src/layout') && /handle|panelchrome/i.test(signature));
}

export function selectProductSourceEntities(
  sourceEntities: ProductDocsSourceEntity[],
  kind: RuntimeSourceEntityKind,
  selectedPage: ProductDocsPage | null
): ProductDocsSourceEntity[] {
  const selectedSourceRoots = new Set(
    [
      selectedPage?.config,
      ...(selectedPage?.sourceEntities?.map((entity) => entity.sourceFile) ?? [])
    ].filter((sourceFile): sourceFile is string => Boolean(sourceFile))
  );
  const matching = sourceEntities.filter((entity) => entity.kind === kind);
  const selectedMatches = matching.filter((entity) => selectedSourceRoots.has(entity.sourceFile));
  const output = selectedMatches.length ? selectedMatches : matching;

  return uniqueBy(output, (entity) => `${entity.kind}:${entity.title}:${entity.sourceFile}`)
    .sort((left, right) =>
      scoreProductSourceEntity(right, kind, selectedSourceRoots) - scoreProductSourceEntity(left, kind, selectedSourceRoots) ||
      left.title.localeCompare(right.title)
    )
    .slice(0, 8);
}

export function scoreProductSourceEntity(
  entity: ProductDocsSourceEntity,
  kind: RuntimeSourceEntityKind,
  selectedSourceRoots: Set<string>
): number {
  const haystack = `${entity.title} ${entity.sourceFile}`.toLowerCase();
  let score = 0;

  if (selectedSourceRoots.has(entity.sourceFile)) score += 16;
  if (entity.title.toLowerCase().includes(kind)) score += 10;
  if (entity.sourceFile.includes('packages/workbench-core/src')) score += 6;
  if (entity.sourceFile.includes('packages/konitif-nodal/src')) score += 6;
  if (entity.sourceFile.includes('infrastructure')) score += 4;
  if (haystack.includes('inmemory')) score += 3;
  if (haystack.includes('definition')) score += 2;

  return score;
}

function createProductTemplateTreeNode(template: ProductDocsTemplate, scope: string): ProductTreeNode {
  return {
    id: `${scope}.${template.id}`,
    label: template.title,
    tone: 'template',
    badge: 'template',
    sourceFile: template.sourceEntities?.[0]?.sourceFile,
    targetId: createProductTemplateMapItemId(template.id)
  };
}

function createSourceEntityTreeNode(entity: ProductDocsSourceEntity): ProductTreeNode {
  return {
    id: `source.${entity.kind}.${entity.sourceFile}.${entity.title}`,
    label: entity.title,
    tone: entity.kind === 'registry' ? 'shared' : 'runtime',
    badge: entity.kind,
    sourceFile: entity.sourceFile
  };
}

function uniqueBy<T>(items: T[], resolveKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = resolveKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}
