import type { WorkbenchIconInput } from '@konitif/workbench';
import type { FeatureDocEntry } from '../technicalDocsCatalog';
import type { DesignSystemThemeGraphNode } from '../designSystemThemeCatalog';
import type {
  ProductArchitectureFinding,
  ProductArchitectureFindingKind,
  ProductArchitectureFindingSeverity,
  ProductDocsDesignNode,
  ProductDocsFeature,
  ProductDocsPage,
  ProductDocsSourceEntity,
  ProductDocsTemplate,
  ProductFlatTreeNode,
  ProductMapColumn,
  ProductMapItem,
  ProductSidebarEntry,
  ProductTreeNode
} from './productDocsModel';
import {
  createDesignNodeMapItem,
  createFeatureMapItem,
  createProductPageMapItem,
  createProductPageMapItemId,
  createProductRouteMapItem,
  createProductShellMapItem,
  createProductTemplateMapItemId,
  createTemplateMapItem,
  formatProductRoutePath
} from './productSystemMapModel';

export function createProductSidebarEntries(columns: ProductMapColumn[]): ProductSidebarEntry[] {
  return columns.map((column) => ({
    ...column,
    icon: resolveProductMapColumnIcon(column.id)
  }));
}

export function resolveProductMapColumnIcon(columnId: string): WorkbenchIconInput {
  switch (columnId) {
    case 'routes':
    case 'pages':
      return 'docs.page';
    case 'templates':
    case 'layout':
      return 'design.template';
    case 'organisms':
      return 'design.organism';
    case 'molecules':
      return 'design.molecule';
    case 'atoms':
      return 'design.atom';
    default:
      return 'app.product-shell';
  }
}

export function resolveProductMapColumnId(itemId: string | null, columns: ProductMapColumn[]): string | null {
  if (!itemId) {
    return null;
  }

  return columns.find((column) => column.items.some((item) => item.id === itemId))?.id ?? null;
}

export function createProductArchitectureFindings(sourceEntities: ProductDocsSourceEntity[]): ProductArchitectureFinding[] {
  const componentEntities = uniqueBy(
    sourceEntities.filter((entity) =>
      ['atom', 'molecule', 'organism'].includes(entity.kind) &&
      entity.sourceFile.endsWith('.svelte')
    ),
    (entity) => `${entity.kind}:${entity.title}:${entity.sourceFile}`
  );
  const entitiesByFile = groupProductSourceEntitiesBy(sourceEntities, (entity) => entity.sourceFile);
  const entitiesByTitle = groupProductSourceEntitiesBy(sourceEntities, (entity) => normalizeProductArchitectureKey(entity.title));
  const entitiesByFamily = groupProductSourceEntitiesBy(componentEntities, (entity) => normalizeProductArchitectureFamilyName(entity.title));
  const findings: ProductArchitectureFinding[] = [];

  componentEntities
    .map((entity) => ({
      entity,
      count: entitiesByFile.get(entity.sourceFile)?.length ?? 0
    }))
    .filter(({ entity, count }) =>
      count >= (entity.kind === 'organism' ? 72 : entity.kind === 'molecule' ? 54 : 42)
    )
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .forEach(({ entity, count }) => {
      findings.push({
        id: `oversized:${entity.sourceFile}`,
        title: `${entity.title} concentre beaucoup de responsabilités`,
        summary: `${count} entités détectées dans le même fichier. Candidat à une découpe par niveau ou extraction de sous-composants.`,
        kind: 'oversized',
        severity: count >= 120 ? 'danger' : 'warning',
        count,
        sourceFile: entity.sourceFile,
        items: [entity]
      });
    });

  componentEntities
    .map((entity) => ({
      entity,
      count: entitiesByTitle.get(normalizeProductArchitectureKey(entity.title))?.length ?? 0
    }))
    .filter(({ entity, count }) =>
      count <= 1 &&
      ['atom', 'molecule'].includes(entity.kind) &&
      !entity.title.toLowerCase().includes('shell')
    )
    .sort((left, right) => left.entity.title.localeCompare(right.entity.title))
    .slice(0, 6)
    .forEach(({ entity, count }) => {
      findings.push({
        id: `singleton:${entity.kind}:${entity.sourceFile}:${entity.title}`,
        title: `${entity.title} semble mono-usage`,
        summary: `Aucun consommateur clair dans le scan. À vérifier avant de le garder comme ${entity.kind}.`,
        kind: 'singleton',
        severity: 'info',
        count,
        sourceFile: entity.sourceFile,
        items: [entity]
      });
    });

  Array.from(entitiesByFamily.entries())
    .filter(([family, items]) => family.length > 2 && items.length >= 3)
    .map(([family, items]) => ({ family, items: uniqueBy(items, (entity) => `${entity.title}:${entity.sourceFile}`) }))
    .filter(({ items }) => items.length >= 3)
    .sort((left, right) => right.items.length - left.items.length)
    .slice(0, 5)
    .forEach(({ family, items }) => {
      findings.push({
        id: `duplication:${family}`,
        title: `Famille ${formatProductArchitectureFamilyName(family)} à rationaliser`,
        summary: `${items.length} composants proches détectés. Candidat à une primitive, un pattern commun ou une variante explicite.`,
        kind: 'duplication',
        severity: items.length >= 6 ? 'warning' : 'info',
        count: items.length,
        sourceFile: items[0]?.sourceFile,
        items
      });
    });

  createProductArchitectureReuseFindings(componentEntities, entitiesByFile).forEach((finding) => findings.push(finding));

  return uniqueBy(findings, (finding) => finding.id)
    .sort((left, right) =>
      scoreProductArchitectureFinding(right) - scoreProductArchitectureFinding(left) ||
      right.count - left.count ||
      left.title.localeCompare(right.title)
    )
    .slice(0, 18);
}

export function createProductArchitectureReuseFindings(
  componentEntities: ProductDocsSourceEntity[],
  entitiesByFile: Map<string, ProductDocsSourceEntity[]>
): ProductArchitectureFinding[] {
  const byDirectory = groupProductSourceEntitiesBy(componentEntities, (entity) => entity.sourceFile.split('/').slice(0, -1).join('/'));

  return Array.from(byDirectory.entries())
    .map(([directory, items]) => ({
      directory,
      items,
      atoms: items.filter((entity) => entity.kind === 'atom').length,
      molecules: items.filter((entity) => entity.kind === 'molecule').length,
      organisms: items.filter((entity) => entity.kind === 'organism').length,
      entityCount: items.reduce((count, entity) => count + (entitiesByFile.get(entity.sourceFile)?.length ?? 0), 0)
    }))
    .filter((group) => group.items.length >= 4 && group.organisms >= 2 && group.atoms <= 1)
    .sort((left, right) => right.entityCount - left.entityCount)
    .slice(0, 4)
    .map((group) => ({
      id: `reuse:${group.directory}`,
      title: `Mutualisation faible dans ${group.directory.split('/').slice(-2).join('/')}`,
      summary: `${group.organisms} organisms pour ${group.atoms} atom détecté. Chercher les contrôles, chrome ou états répétables à extraire.`,
      kind: 'reuse' as const,
      severity: 'warning' as const,
      count: group.items.length,
      sourceFile: group.items[0]?.sourceFile,
      items: group.items
    }));
}

export function selectProductArchitectureFindings(
  findings: ProductArchitectureFinding[],
  selectedItem: ProductMapItem | null,
  activeCategoryId: string
): ProductArchitectureFinding[] {
  const selectedNeedles = [
    selectedItem?.title,
    selectedItem?.sourceFile,
    selectedItem?.kind,
    activeCategoryId
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeProductArchitectureKey(value));
  const scoped = selectedNeedles.length
    ? findings.filter((finding) => {
        const haystack = normalizeProductArchitectureKey([
          finding.title,
          finding.summary,
          finding.kind,
          finding.sourceFile,
          ...finding.items.flatMap((item) => [item.title, item.kind, item.sourceFile])
        ].join(' '));
        return selectedNeedles.some((needle) => needle && haystack.includes(needle));
      })
    : [];

  return (scoped.length ? scoped : findings).slice(0, 7);
}

export function scoreProductArchitectureFinding(finding: ProductArchitectureFinding): number {
  const severityScore: Record<ProductArchitectureFindingSeverity, number> = {
    danger: 30,
    warning: 20,
    info: 10
  };
  const kindScore: Record<ProductArchitectureFindingKind, number> = {
    oversized: 12,
    duplication: 10,
    reuse: 8,
    singleton: 4
  };

  return severityScore[finding.severity] + kindScore[finding.kind];
}

export function groupProductSourceEntitiesBy(
  entities: ProductDocsSourceEntity[],
  resolveKey: (entity: ProductDocsSourceEntity) => string
): Map<string, ProductDocsSourceEntity[]> {
  const groups = new Map<string, ProductDocsSourceEntity[]>();

  entities.forEach((entity) => {
    const key = resolveKey(entity);
    groups.set(key, [...(groups.get(key) ?? []), entity]);
  });

  return groups;
}

export function normalizeProductArchitectureKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeProductArchitectureFamilyName(value: string): string {
  return normalizeProductArchitectureKey(value)
    .replace(/\b(view|viewer|panel|tool|widget|button|input|row|item|menu|list|toolbar|chrome|node|context|surface|layout|shell|region|component)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatProductArchitectureFamilyName(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function createProductCompositionStrip(
  selectedPage: ProductDocsPage | null,
  selectedTemplate: ProductDocsTemplate | null,
  features: Array<ProductDocsFeature | FeatureDocEntry>,
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>
): ProductMapItem[] {
  const atomNode = designNodes.find((node) => ['tokens', 'primitives', 'forms', 'iconography'].includes(node.category)) ?? designNodes[0] ?? null;
  const organismNode = designNodes.find((node) => ['components', 'layout', 'navigation', 'workbenchSurfaces', 'patterns', 'graphs'].includes(node.category)) ?? designNodes[0] ?? null;
  const routeItem = createProductRouteMapItem(selectedPage);
  const shellItem = createProductShellMapItem(selectedPage);

  return [
    atomNode ? createDesignNodeMapItem(atomNode, 'design', 'Atom') : null,
    features[0] ? createFeatureMapItem(features[0], 'design', 'Atom') : null,
    organismNode ? createDesignNodeMapItem(organismNode, 'design', 'Organism') : null,
    selectedTemplate ? createTemplateMapItem(selectedTemplate, true) : null,
    createProductPageMapItem(selectedPage, selectedTemplate),
    routeItem,
    shellItem
  ].filter((item): item is ProductMapItem => Boolean(item))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
}

export function createProductTreeNodes(
  pages: ProductDocsPage[],
  templates: ProductDocsTemplate[],
  features: FeatureDocEntry[],
  designNodes: DesignSystemThemeGraphNode[],
  sourceEntities: ProductDocsSourceEntity[]
): ProductTreeNode[] {
  const routeNodes = createProductRouteTreeNodes(pages, templates);
  const pageNodes = pages
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((page) => createProductPageTreeNode(page, 'tree.page'));
  const templateNodes = templates
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((template) => createProductTemplateTreeNode(template, 'tree.template'));
  const organismNodes = designNodes
    .filter((node) => ['components', 'layout', 'navigation', 'workbenchSurfaces', 'patterns', 'graphs'].includes(node.category))
    .slice(0, 9)
    .map((node) => createDesignTreeNode(node, 'organism'));
  const atomNodes = designNodes
    .filter((node) => ['tokens', 'primitives', 'forms', 'iconography'].includes(node.category))
    .slice(0, 12)
    .map((node) => createDesignTreeNode(node, 'atom'));
  const moleculeNodes = features
    .slice(0, 18)
    .map((feature) => createFeatureTreeNode(feature, 'tree.molecule'));
  const runtimeNodes = createRuntimeTreeNodes(features, sourceEntities);
  const toolNodes = pages
    .filter((page) => page.route.startsWith('/tools/') || page.config.toLowerCase().includes('tool'))
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((page) => createProductPageTreeNode(page, 'tree.tool'));

  return [
    {
      id: 'tree.product-shell',
      label: 'Product Shell',
      tone: 'product',
      badge: 'root',
      children: [
        {
          id: 'tree.routes',
          label: 'Routes',
          tone: 'product',
          badge: String(routeNodes.length),
          children: routeNodes
        },
        {
          id: 'tree.pages',
          label: 'Pages',
          tone: 'product',
          badge: String(pageNodes.length),
          children: pageNodes
        },
        {
          id: 'tree.templates',
          label: 'Templates',
          tone: 'template',
          badge: String(templateNodes.length),
          children: templateNodes
        },
        {
          id: 'tree.design-system',
          label: 'Design System',
          tone: 'design',
          badge: 'ds',
          children: [
            {
              id: 'tree.design.organisms',
              label: 'Organisms',
              tone: 'design',
              badge: String(organismNodes.length),
              children: organismNodes
            },
            {
              id: 'tree.design.molecules',
              label: 'Molecules',
              tone: 'design',
              badge: String(moleculeNodes.length),
              children: moleculeNodes
            },
            {
              id: 'tree.design.atoms',
              label: 'Atoms',
              tone: 'design',
              badge: String(atomNodes.length),
              children: atomNodes
            }
          ]
        },
        {
          id: 'tree.runtime',
          label: 'Runtime',
          tone: 'runtime',
          badge: String(runtimeNodes.length),
          children: runtimeNodes
        },
        {
          id: 'tree.tools',
          label: 'Tools & Inspectors',
          tone: 'shared',
          badge: String(toolNodes.length),
          children: toolNodes
        }
      ]
    }
  ];
}

export function flattenProductTreeNodes(nodes: ProductTreeNode[], depth = 0): ProductFlatTreeNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenProductTreeNodes(node.children ?? [], depth + 1)
  ]);
}

export function createProductPageTreeNode(page: ProductDocsPage, scope: string): ProductTreeNode {
  return {
    id: `${scope}.${page.id}`,
    label: page.title.replace(/^Docs\s*\/\s*/, ''),
    tone: page.route.startsWith('/tools/') ? 'runtime' : 'product',
    badge: formatProductRoutePath(page.route),
    sourceFile: page.config,
    targetId: createProductPageMapItemId(page.id)
  };
}

export function createProductRouteTreeNodes(pages: ProductDocsPage[], templates: ProductDocsTemplate[]): ProductTreeNode[] {
  return [
    createProductRouteNode(
      'root',
      '/',
      pages.filter((page) => page.route === '/'),
      templates
    ),
    createProductRouteNode(
      'docs',
      '/docs',
      pages.filter((page) => page.route === '/docs' || page.route.startsWith('/docs/')),
      templates
    )
  ].filter((node): node is ProductTreeNode => Boolean(node));
}

export function createProductRouteNode(
  id: string,
  label: string,
  pages: ProductDocsPage[],
  templates: ProductDocsTemplate[]
): ProductTreeNode | null {
  if (!pages.length) {
    return null;
  }

  return {
    id: `route.${id}`,
    label,
    tone: 'product',
    badge: String(pages.length),
    children: pages
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((page) => createProductRoutePageTreeNode(page, templates.find((template) => template.id === page.templateId) ?? null))
  };
}

export function createProductRoutePageTreeNode(page: ProductDocsPage, template: ProductDocsTemplate | null): ProductTreeNode {
  const compositionNodes = createProductPageCompositionTreeNodes(page, template);

  return {
    id: `route.page.${page.id}`,
    label: page.title.replace(/^Docs\s*\/\s*/, ''),
    tone: 'product',
    badge: 'page',
    sourceFile: page.config,
    targetId: createProductPageMapItemId(page.id),
    children: compositionNodes.length
      ? [
          {
            id: `route.${page.id}.page-tree`,
            label: 'Page Tree',
            tone: 'shared',
            badge: String(compositionNodes.length),
            children: compositionNodes
          }
        ]
      : []
  };
}

export function createProductPageCompositionTreeNodes(page: ProductDocsPage, template: ProductDocsTemplate | null): ProductTreeNode[] {
  const designNodes = uniqueBy([...(page.designNodes ?? []), ...(template?.designNodes ?? [])], (node) => node.id);
  const templateNode = template ? createProductTemplateTreeNode(template, `route.${page.id}.template`) : null;
  const designTreeNodes = designNodes
    .slice(0, 8)
    .map((node) => createProductDesignDocTreeNode(node, `route.${page.id}.design`));

  return [templateNode, ...designTreeNodes].filter((node): node is ProductTreeNode => Boolean(node));
}

export function createProductTemplateTreeNode(template: ProductDocsTemplate, scope: string): ProductTreeNode {
  return {
    id: `${scope}.${template.id}`,
    label: template.title,
    tone: 'template',
    badge: 'template',
    sourceFile: template.sourceEntities?.[0]?.sourceFile,
    targetId: createProductTemplateMapItemId(template.id)
  };
}

export function createProductDesignDocTreeNode(node: ProductDocsDesignNode, scope: string): ProductTreeNode {
  return {
    id: `${scope}.${node.id}`,
    label: node.title,
    tone: 'design',
    badge: resolveProductDesignLayerLabel(node.category),
    targetId: `design.${node.id}`
  };
}

export function createDesignTreeNode(node: DesignSystemThemeGraphNode, fallbackBadge: string): ProductTreeNode {
  return {
    id: `tree.design.${node.id}`,
    label: node.title,
    tone: 'design',
    badge: resolveProductDesignLayerLabel(node.category) ?? fallbackBadge,
    targetId: `design.${node.id}`
  };
}

export function createFeatureTreeNode(feature: FeatureDocEntry, scope: string): ProductTreeNode {
  return {
    id: `${scope}.feature.${feature.id}`,
    label: feature.title,
    tone: 'runtime',
    badge: feature.status,
    targetId: `feature.${feature.id}`
  };
}

export function createRuntimeTreeNodes(features: FeatureDocEntry[], sourceEntities: ProductDocsSourceEntity[]): ProductTreeNode[] {
  const engineEntities = uniqueBy(sourceEntities.filter((entity) => entity.kind === 'engine'), (entity) => `${entity.title}:${entity.sourceFile}`);
  const dialectEntities = uniqueBy(sourceEntities.filter((entity) => entity.kind === 'dialect'), (entity) => `${entity.title}:${entity.sourceFile}`);
  const runtimeFeatures = features.filter((feature) =>
    feature.domain === 'app' ||
    feature.layer === 'runtime' ||
    ['workbench', 'temporal', 'nodal'].includes(feature.context)
  );

  return [
    {
      id: 'tree.runtime.workflow-engine',
      label: 'Workflow Engine',
      tone: 'runtime',
      badge: String(engineEntities.length || runtimeFeatures.length),
      children: [...engineEntities.slice(0, 6).map((entity) => createSourceEntityTreeNode(entity)), ...runtimeFeatures.slice(0, 4).map((feature) => createFeatureTreeNode(feature, 'tree.runtime.workflow'))]
    },
    {
      id: 'tree.runtime.animation-engine',
      label: 'Animation Engine',
      tone: 'runtime',
      badge: String(dialectEntities.length),
      children: dialectEntities.slice(0, 6).map((entity) => createSourceEntityTreeNode(entity))
    }
  ];
}

export function createSourceEntityTreeNode(entity: ProductDocsSourceEntity): ProductTreeNode {
  return {
    id: `source.${entity.kind}.${entity.sourceFile}.${entity.title}`,
    label: entity.title,
    tone: entity.kind === 'registry' ? 'shared' : 'runtime',
    badge: entity.kind,
    sourceFile: entity.sourceFile
  };
}

export function resolveProductDesignLayerLabel(category: string): string {
  if (['components', 'layout', 'navigation', 'workbenchSurfaces', 'patterns', 'graphs'].includes(category)) return 'organism';
  if (['tokens', 'primitives', 'forms', 'iconography'].includes(category)) return 'atom';
  return 'molecule';
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
