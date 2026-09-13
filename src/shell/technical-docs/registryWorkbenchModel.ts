import type {
  LanguageRegistryEvaluation,
  RepoQualityDimensionId,
  RepoQualityEvaluation,
  RepoQualityFileEvaluation,
  RepoQualityWorkspaceEvaluation,
  WorkbenchIconInput
} from '@konitif/workbench';
import type { WorkbenchIconDefinition } from '../../icons/iconRegistry';
import type {
  ProductDocsPage,
  ProductDocsProjection,
  ProductDocsSourceEntity,
  ProductDocsTemplate,
  ProductIconScanProjection,
  ProductMapTone
} from '../product/productDocsModel';
import type { FeatureDocEntry, TechnicalRuleEntry, TechnicalTestEntry } from '../technicalDocsCatalog';
import type { ArchitectureProjectionDocument } from './architectureProjectionModel';
import type { FeatureArchetypeMatrix } from './featureArchetypeMatrixModel';
import type { SemanticArchitectureGraph } from './semanticArchitectureGraphModel';
import {
  createCoverageSparklinePoints,
  formatCoverageSparklinePoints,
  type CoverageSparklinePoint
} from './coverageSparkline';

export type RegistryWorkbenchId =
  | 'icons'
  | 'shortcuts'
  | 'theme'
  | 'design'
  | 'features'
  | 'rules'
  | 'tests'
  | 'quality'
  | 'language'
  | 'product'
  | 'archetypes'
  | 'semantic-graph'
  | 'architecture-projections'
  | 'svg';

export type RegistryWorkbenchEntry = {
  id: RegistryWorkbenchId;
  title: string;
  subtitle: string;
  summary: string;
  count: number;
  tone: ProductMapTone;
  icon: WorkbenchIconInput;
  source: string;
  status: string;
};

export type RegistryWorkbenchRow = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  detail: string;
  tone: ProductMapTone;
  sourceFile?: string;
  qualityScores?: Record<'tests' | 'docs' | 'decoupling', number>;
  qualityStatuses?: Record<'tests' | 'docs' | 'decoupling', string>;
  qualityGranularity?: 'workspace' | 'file';
  parentId?: string;
  fileCount?: number;
  lineCount?: number;
  languageScores?: Record<string, number>;
  languageStatuses?: Record<string, string>;
  languageValues?: Record<string, string | undefined>;
};

export type RepoQualityBucketId = 'total' | 'covered' | 'partial' | 'missing' | 'risk';

export type RepoQualityBucketDescriptor = {
  id: RepoQualityBucketId;
  label: string;
};

export type LanguageCoverageBucketId = 'translatedKeys' | 'missingKeys' | 'totalKeys';

export type LanguageCoverageBucketDescriptor = {
  id: LanguageCoverageBucketId;
  label: string;
};

export type RepoQualityGroup = {
  workspace: RepoQualityWorkspaceEvaluation;
  files: RepoQualityFileEvaluation[];
};

export type RegistryCoverageCard = {
  id: string;
  title: string;
  percent: string;
  status: string;
  trend?: {
    icon: WorkbenchIconInput;
    label: string;
    tone: 'up' | 'down' | 'flat';
  };
  buckets: Array<{
    id: string;
    label: string;
    value: number;
    status?: string;
    sparklineLabel: string;
    sparklinePoints: string;
    sparklinePointList: CoverageSparklinePoint[];
  }>;
};

export type ProductDocsTotals = {
  pages: number;
  templates: number;
  routes: number;
  features: number;
  designNodes: number;
  sourceEntities: number;
  iconSvgFiles: number;
  iconInlineSvg: number;
  iconScannedFiles: number;
};

export type RegistryWorkbenchEntryContext = {
  themeAvailable?: boolean;
  icons: WorkbenchIconDefinition[];
  scan: ProductIconScanProjection | null;
  totals: ProductDocsTotals;
  features: FeatureDocEntry[];
  rules: TechnicalRuleEntry[];
  tests: TechnicalTestEntry[];
  shortcuts: number;
  repoQualityEvaluation: RepoQualityEvaluation | null;
  languageRegistryEvaluation: LanguageRegistryEvaluation | null;
  featureArchetypeMatrix: FeatureArchetypeMatrix;
  semanticArchitectureGraph: SemanticArchitectureGraph;
  architectureProjectionDocument: ArchitectureProjectionDocument;
  designSystemThemeDocument: import('../designSystemThemeCatalog').DesignSystemThemeDocument;
  designSystemThemeGraph: import('../designSystemThemeCatalog').DesignSystemThemeGraph;
  designSystemThemeRegistry: import('../designSystemThemeCatalog').DesignSystemThemeRegistry;
  productDocsSourceFile: string;
  productDocsProjectionStatus: string;
};

export type RegistryWorkbenchRowsContext = {
  themeAvailable?: boolean;
  registryId: RegistryWorkbenchId;
  registryIconDefinitions: WorkbenchIconDefinition[];
  designSystemThemeDocument: import('../designSystemThemeCatalog').DesignSystemThemeDocument;
  designSystemThemeGraph: import('../designSystemThemeCatalog').DesignSystemThemeGraph;
  designSystemThemeRegistry: import('../designSystemThemeCatalog').DesignSystemThemeRegistry;
  featureDocs: FeatureDocEntry[];
  ruleEntries: TechnicalRuleEntry[];
  testEntries: TechnicalTestEntry[];
  repoQualityEvaluation: RepoQualityEvaluation | null;
  languageRegistryEvaluation: LanguageRegistryEvaluation | null;
  productDocsPages: ProductDocsPage[];
  productDocsTemplates: ProductDocsTemplate[];
  productDocsProjection: ProductDocsProjection | null;
  productIconScan: ProductIconScanProjection | null;
  formatSourceLabel: (sourceFile: string) => string;
  formatRegistryIconLabel: (value: string) => string;
  isProductIconDebtCandidate: (entry: ProductIconScanProjection['inlineSvg'][number]) => boolean;
};

export const registryWorkbenchIds: RegistryWorkbenchId[] = [
  'quality',
  'language',
  'archetypes',
  'semantic-graph',
  'architecture-projections',
  'icons',
  'shortcuts',
  'theme',
  'design',
  'features',
  'rules',
  'tests',
  'product',
  'svg'
];

export const repoQualityBuckets: RepoQualityBucketDescriptor[] = [
  { id: 'total', label: 'Total' },
  { id: 'covered', label: 'Covered' },
  { id: 'partial', label: 'Partial' },
  { id: 'missing', label: 'Missing' },
  { id: 'risk', label: 'Risk' }
];

export const languageCoverageBuckets: LanguageCoverageBucketDescriptor[] = [
  { id: 'translatedKeys', label: 'Translated' },
  { id: 'missingKeys', label: 'Missing' },
  { id: 'totalKeys', label: 'Total' }
];

export function createRegistryWorkbenchEntries(context: RegistryWorkbenchEntryContext): RegistryWorkbenchEntry[] {
  const {
    themeAvailable = true,
    icons,
    scan,
    totals,
    features,
    rules,
    tests,
    shortcuts,
    repoQualityEvaluation,
    languageRegistryEvaluation,
    featureArchetypeMatrix,
    semanticArchitectureGraph,
    architectureProjectionDocument,
    designSystemThemeDocument,
    designSystemThemeGraph,
    designSystemThemeRegistry,
    productDocsSourceFile,
    productDocsProjectionStatus
  } = context;

  return [
    {
      id: 'quality',
      title: 'Repo Quality Evaluation',
      subtitle: repoQualityEvaluation ? `${formatRepoQualityPercent(repoQualityEvaluation.dimensions.find((dimension) => dimension.id === 'tests')?.score ?? 0)} tests` : '—',
      summary: 'Contrat global de lecture pour la couverture tests, docs et découpage par granularité repo/workspace/fichier.',
      count: repoQualityEvaluation?.files.length ?? 0,
      tone: 'shared',
      icon: 'status.warning',
      source: 'docs/registry/repo-quality-evaluation.json',
      status: !repoQualityEvaluation ? 'unavailable' : repoQualityEvaluation.dimensions.some((dimension) => dimension.status === 'missing' || dimension.status === 'risk')
        ? 'observed'
        : 'covered'
    },
    {
      id: 'language',
      title: 'Language Registry',
      subtitle: languageRegistryEvaluation ? `${languageRegistryEvaluation.locales.length} locales` : '—',
      summary: 'Contrat global des bundles de traduction, namespaces et couverture par langue.',
      count: languageRegistryEvaluation?.entries.length ?? 0,
      tone: 'shared',
      icon: 'docs.registry',
      source: 'docs/registry/language-coverage.json',
      status: !languageRegistryEvaluation ? 'unavailable' : languageRegistryEvaluation.coverage.some((locale) => locale.status !== 'covered') ? 'partial' : 'covered'
    },
    {
      id: 'features',
      title: 'Feature Graph',
      subtitle: 'Feature docs',
      summary: 'Relations de features, règles, tests, sources et impacts design.',
      count: features.length,
      tone: 'runtime',
      icon: 'tool.feature-explorer',
      source: 'docs/registry/features.json',
      status: 'active'
    },
    {
      id: 'archetypes',
      title: 'Feature × Archetype Matrix',
      subtitle: `${featureArchetypeMatrix.rows.length} features`,
      summary: 'Scan local des rôles architecturaux récurrents par feature, package et fichier source.',
      count: featureArchetypeMatrix.rows.length,
      tone: 'shared',
      icon: 'docs.registry',
      source: 'docs/generated/feature-archetype-matrix.json',
      status: featureArchetypeMatrix.rows.length > 0 ? 'generated' : 'empty'
    },
    {
      id: 'semantic-graph',
      title: 'Semantic Architecture Graph',
      subtitle: `${semanticArchitectureGraph.nodes.length} nodes`,
      summary: 'Graphe sémantique enrichi des concepts, imports, attracteurs, collisions et métriques architecture.',
      count: semanticArchitectureGraph.nodes.length,
      tone: 'runtime',
      icon: 'docs.registry',
      source: 'docs/generated/semantic-architecture-graph.json',
      status: semanticArchitectureGraph.nodes.length > 0 ? 'generated' : 'empty'
    },
    {
      id: 'architecture-projections',
      title: 'Architecture Projection Engine',
      subtitle: `${architectureProjectionDocument.projections.length} projections`,
      summary: 'Projections visuelles renderer-agnostic du graphe sémantique pour préparer spatialisation et observabilité.',
      count: architectureProjectionDocument.projections.length,
      tone: 'runtime',
      icon: 'docs.registry',
      source: 'docs/generated/architecture-projections.json',
      status: architectureProjectionDocument.projections.length > 0 ? 'generated' : 'empty'
    },
    {
      id: 'design',
      title: 'Design Graph',
      subtitle: themeAvailable ? `${designSystemThemeGraph.totals.relations} relations` : '—',
      summary: 'Theme, catégories, nodes et relations design-system.',
      count: designSystemThemeGraph.totals.nodes,
      tone: 'design',
      icon: 'design.organism',
      source: designSystemThemeDocument.metadata.source,
      status: themeAvailable ? 'active' : 'unavailable'
    },
    {
      id: 'product',
      title: 'Product',
      subtitle: `${totals.pages} pages`,
      summary: 'Pages, templates, routes, features et hooks design du produit.',
      count: totals.sourceEntities ?? totals.pages,
      tone: 'product',
      icon: 'app.product-shell',
      source: productDocsSourceFile,
      status: productDocsProjectionStatus
    },
    {
      id: 'icons',
      title: 'Icon Registry',
      subtitle: 'Library',
      summary: 'Bibliothèque globale des icônes, sets, usages et dette inline SVG.',
      count: icons.length,
      tone: 'product',
      icon: 'docs.registry',
      source: 'packages/workbench-ui/src/icons/iconRegistry.ts',
      status: scan ? 'live' : 'fallback'
    },
    {
      id: 'shortcuts',
      title: 'Shortcut Registry',
      subtitle: `${shortcuts} shortcuts`,
      summary: 'Catalogue des raccourcis globaux et contextuels, avec dimensions par type, portée et priorité.',
      count: shortcuts,
      tone: 'shared',
      icon: 'action.keyboard',
      source: 'packages/workbench-ui/src/shell/ShortcutCatalogView.svelte',
      status: shortcuts > 0 ? 'active' : 'fallback'
    },
    {
      id: 'theme',
      title: 'Theme Registry',
      subtitle: themeAvailable ? designSystemThemeRegistry.activeMode.label : '—',
      summary: 'Variables, valeurs cible, tokens CSS et reconciliation du thème courant.',
      count: designSystemThemeRegistry.variables.length,
      tone: 'design',
      icon: 'design.token',
      source: designSystemThemeDocument.metadata.source,
      status: !themeAvailable ? 'unavailable' : designSystemThemeRegistry.statusCounts.mismatch > 0 ? 'mismatch' : 'synced'
    },
    {
      id: 'rules',
      title: 'Rule Registry',
      subtitle: 'Technical docs',
      summary: 'Règles techniques utilisées par la documentation et les surfaces de review.',
      count: rules.length,
      tone: 'shared',
      icon: 'docs.page',
      source: 'packages/workbench-ui/src/shell/technicalDocsCatalog.ts',
      status: 'active'
    },
    {
      id: 'tests',
      title: 'Test Registry',
      subtitle: 'Validation',
      summary: 'Entrées de tests et contrôles liés aux features et au shell.',
      count: tests.length,
      tone: 'shared',
      icon: 'status.success',
      source: 'packages/workbench-ui/src/shell/technicalDocsCatalog.ts',
      status: 'active'
    },
    {
      id: 'svg',
      title: 'SVG Debt Registry',
      subtitle: `${scan?.totals.inlineSvg ?? 0} inline`,
      summary: 'Scan temps réel des SVG inline, fichiers SVG et candidats de migration.',
      count: scan?.totals.inlineSvg ?? 0,
      tone: 'runtime',
      icon: 'action.brush',
      source: 'docs/registry/svg-icon-scan.json',
      status: scan ? 'live' : 'missing'
    }
  ];
}

export function createRegistryWorkbenchRows(context: RegistryWorkbenchRowsContext): RegistryWorkbenchRow[] {
  const {
    registryId,
    registryIconDefinitions,
    designSystemThemeDocument,
    designSystemThemeGraph,
    designSystemThemeRegistry,
    featureDocs,
    ruleEntries,
    testEntries,
    repoQualityEvaluation,
    languageRegistryEvaluation,
    productDocsPages,
    productDocsTemplates,
    productDocsProjection,
    productIconScan,
    formatSourceLabel,
    formatRegistryIconLabel,
    isProductIconDebtCandidate
  } = context;

  switch (registryId) {
    case 'icons':
      return registryIconDefinitions.map((icon) => ({
        id: icon.id,
        title: icon.title,
        subtitle: icon.id,
        meta: `${formatRegistryIconLabel(icon.category)} / ${formatRegistryIconLabel(icon.tone)}`,
        detail: icon.designNodeId ?? 'No design binding',
        tone: icon.tone === 'default' || icon.tone === 'action' || icon.tone === 'danger' ? 'shared' : icon.tone,
        sourceFile: 'packages/workbench-ui/src/icons/iconRegistry.ts'
      }));
    case 'theme':
      if (context.themeAvailable === false) return [];
      return designSystemThemeRegistry.variables.map((variable) => ({
        id: variable.themeVariable,
        title: variable.themeVariable,
        subtitle: variable.sourceId,
        meta: variable.status,
        detail: `${variable.sourceValue ?? 'missing'} -> ${variable.targetValue ?? variable.themeValue ?? 'missing'}`,
        tone: variable.status === 'synced' ? 'design' : 'runtime',
        sourceFile: designSystemThemeDocument.metadata.source
      }));
    case 'design':
      if (context.themeAvailable === false) return [];
      return designSystemThemeGraph.categories.flatMap((category) =>
        category.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          subtitle: node.id,
          meta: formatRegistryIconLabel(category.category),
          detail: node.summary,
          tone: ['templates', 'layout', 'patterns'].includes(category.category) ? 'template' : 'design',
          sourceFile: designSystemThemeDocument.metadata.source
        }))
      );
    case 'features':
      return featureDocs.map((feature) => ({
        id: feature.id,
        title: feature.title,
        subtitle: `${feature.domain} / ${feature.context}`,
        meta: feature.status,
        detail: feature.summary,
        tone: feature.domain === 'app' ? 'product' : feature.domain === 'core' ? 'runtime' : 'design',
        sourceFile: feature.path
      }));
    case 'rules':
      return ruleEntries.map((rule) => ({
        id: rule.id,
        title: rule.title,
        subtitle: rule.context,
        meta: 'rule',
        detail: rule.summary,
        tone: 'shared',
        sourceFile: rule.path
      }));
    case 'tests':
      return testEntries.map((test) => ({
        id: test.id,
        title: test.title,
        subtitle: test.context,
        meta: 'test',
        detail: test.summary,
        tone: 'shared',
        sourceFile: test.path
      }));
    case 'quality':
      if (!repoQualityEvaluation) return [];
      return [
        ...repoQualityEvaluation.workspaces.map((workspace) => ({
          id: `quality:workspace:${workspace.id}`,
          title: workspace.path,
          subtitle: `${workspace.fileCount} files`,
          meta: `tests ${formatRepoQualityPercent(workspace.scores.tests)} / docs ${formatRepoQualityPercent(workspace.scores.docs)}`,
          detail: workspace.coverage
            ? `coverage ${workspace.coverage.fullyCoveredFiles}/${workspace.coverage.sourceFiles}, tests ${workspace.coverage.testEvidenceFiles}/${workspace.coverage.sourceFiles}, docs ${workspace.coverage.docEvidenceFiles}/${workspace.coverage.sourceFiles}`
            : `decoupling ${formatRepoQualityPercent(workspace.scores.decoupling)}, ${workspace.missingCount} missing evidence, ${workspace.riskCount} decoupling risks`,
          tone: workspace.statuses.decoupling === 'risk' ? 'runtime' as const : 'shared' as const,
          sourceFile: workspace.path,
          qualityGranularity: 'workspace' as const,
          fileCount: workspace.fileCount,
          lineCount: workspace.lineCount,
          qualityScores: workspace.scores,
          qualityStatuses: workspace.statuses
        })),
        ...repoQualityEvaluation.files
          .filter((file) => file.findings.length > 0)
          .map((file) => ({
            id: `quality:file:${file.path}`,
            title: formatSourceLabel(file.path),
            subtitle: `${file.owner} / ${file.layer}`,
            meta: `T ${formatRepoQualityPercent(file.scores.tests)} / D ${formatRepoQualityPercent(file.scores.docs)} / C ${formatRepoQualityPercent(file.scores.decoupling)}`,
            detail: `${file.lineCount} lines. ${file.findings.join(' ')}`,
            tone: file.statuses.decoupling === 'risk' ? 'runtime' as const : 'shared' as const,
            sourceFile: file.path,
            qualityGranularity: 'file' as const,
            parentId: file.owner,
            lineCount: file.lineCount,
            qualityScores: file.scores,
            qualityStatuses: file.statuses
          }))
      ];
    case 'language':
      if (!languageRegistryEvaluation) return [];
      return [
        ...languageRegistryEvaluation.namespaces.map((namespace) => ({
          id: `language:namespace:${namespace.namespace}`,
          title: namespace.namespace,
          subtitle: `${namespace.totalKeys} keys`,
          meta: namespace.layer,
          detail: `Namespace coverage from ${formatSourceLabel(namespace.source)}`,
          tone: namespace.layer === 'ui' || namespace.layer === 'app' ? 'product' as const : namespace.layer === 'tool' ? 'runtime' as const : 'shared' as const,
          sourceFile: namespace.source,
          languageScores: Object.fromEntries(
            languageRegistryEvaluation.locales.map((locale) => [locale, namespace.locales[locale]?.coverage ?? 0])
          ),
          languageStatuses: Object.fromEntries(
            languageRegistryEvaluation.locales.map((locale) => [locale, namespace.locales[locale]?.status ?? 'missing'])
          ),
          languageValues: Object.fromEntries(
            languageRegistryEvaluation.locales.map((locale) => [
              locale,
              `${namespace.locales[locale]?.translatedKeys ?? 0}/${namespace.locales[locale]?.totalKeys ?? namespace.totalKeys}`
            ])
          )
        })),
        ...languageRegistryEvaluation.entries
          .filter((entry) =>
            languageRegistryEvaluation.locales.some((locale) => entry.locales[locale]?.status !== 'covered')
          )
          .map((entry) => ({
            id: `language:key:${entry.id}`,
            title: entry.key,
            subtitle: entry.namespace,
            meta: entry.layer,
            detail: languageRegistryEvaluation.locales
              .filter((locale) => entry.locales[locale]?.status !== 'covered')
              .map((locale) => `${locale} missing`)
              .join(', ') || 'covered',
            tone: 'shared' as const,
            sourceFile: entry.source,
            languageScores: Object.fromEntries(
              languageRegistryEvaluation.locales.map((locale) => [locale, entry.locales[locale]?.status === 'covered' ? 1 : 0])
            ),
            languageStatuses: Object.fromEntries(
              languageRegistryEvaluation.locales.map((locale) => [locale, entry.locales[locale]?.status ?? 'missing'])
            ),
            languageValues: Object.fromEntries(
              languageRegistryEvaluation.locales.map((locale) => [locale, entry.locales[locale]?.value])
            )
          }))
      ];
    case 'product':
      return [
        ...productDocsPages.map((page) => ({
          id: `page:${page.id}`,
          title: page.title,
          subtitle: page.route,
          meta: page.status,
          detail: page.summary,
          tone: 'product' as const,
          sourceFile: page.config
        })),
        ...productDocsTemplates.map((template) => ({
          id: `template:${template.id}`,
          title: template.title,
          subtitle: template.routeScope,
          meta: template.role,
          detail: template.summary,
          tone: 'template' as const,
          sourceFile: template.sourceEntities?.[0]?.sourceFile
        })),
        ...(productDocsProjection?.sourceEntities ?? []).map((entity) => ({
          id: `source:${entity.kind}:${entity.title}:${entity.sourceFile}`,
          title: entity.title,
          subtitle: entity.kind,
          meta: formatSourceLabel(entity.sourceFile),
          detail: entity.sourceFile,
          tone: resolveProductSourceEntityTone(entity),
          sourceFile: entity.sourceFile
        }))
      ];
    case 'svg':
      return [
        ...(productIconScan?.svgFiles ?? []).map((entry) => ({
          id: `svg-file:${entry.sourceFile}:${entry.line ?? 0}`,
          title: formatSourceLabel(entry.sourceFile),
          subtitle: entry.category,
          meta: `${entry.bytes ?? 0} bytes`,
          detail: entry.sourceFile,
          tone: 'shared' as const,
          sourceFile: entry.sourceFile
        })),
        ...(productIconScan?.inlineSvg ?? []).map((entry) => ({
          id: `inline-svg:${entry.sourceFile}:${entry.line ?? 0}:${entry.suggestedIconId}`,
          title: entry.suggestedIconId || formatSourceLabel(entry.sourceFile),
          subtitle: entry.category,
          meta: `line ${entry.line ?? 0}`,
          detail: entry.context ?? entry.sourceFile,
          tone: isProductIconDebtCandidate(entry) ? 'runtime' as const : 'shared' as const,
          sourceFile: entry.sourceFile
        }))
      ];
    default:
      return [];
  }
}

export function filterRegistryWorkbenchRows(rows: RegistryWorkbenchRow[], search: string): RegistryWorkbenchRow[] {
  const needle = search.trim().toLowerCase();

  if (!needle) {
    return rows;
  }

  return rows.filter((row) =>
    `${row.id} ${row.title} ${row.subtitle} ${row.meta} ${row.detail} ${row.sourceFile ?? ''}`.toLowerCase().includes(needle)
  );
}

export function createFilteredRepoQualityGroups(evaluation: RepoQualityEvaluation | null, search: string): RepoQualityGroup[] {
  if (!evaluation) return [];
  const needle = search.trim().toLowerCase();

  return evaluation.workspaces
    .map((workspace) => {
      const workspaceFiles = evaluation.files.filter((file) => file.owner === workspace.id);

      if (!needle) {
        return { workspace, files: workspaceFiles };
      }

      const workspaceMatches = createRepoQualityWorkspaceHaystack(workspace).includes(needle);
      const matchingFiles = workspaceFiles.filter((file) => createRepoQualityFileHaystack(file).includes(needle));

      if (!workspaceMatches && matchingFiles.length === 0) {
        return null;
      }

      return {
        workspace,
        files: workspaceMatches ? workspaceFiles : matchingFiles
      };
    })
    .filter((group): group is RepoQualityGroup => Boolean(group));
}

export function formatRepoQualityPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function createRepoQualitySummaryCards(evaluation: RepoQualityEvaluation | null): RegistryCoverageCard[] {
  if (!evaluation) return [];
  return evaluation.dimensions.map((dimension) => ({
    id: dimension.id,
    title: dimension.label,
    percent: formatRepoQualityPercent(dimension.score),
    status: dimension.status,
    trend: {
      icon: resolveRepoQualityTrendIcon(evaluation, dimension.id),
      label: formatRepoQualityTrend(evaluation, dimension.id),
      tone: resolveRepoQualityTrendTone(evaluation, dimension.id)
    },
    buckets: repoQualityBuckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      value: dimension[bucket.id],
      sparklineLabel: resolveRepoQualityBucketSparklineLabel(evaluation, dimension.id, bucket.id),
      sparklinePoints: resolveRepoQualityBucketSparklinePoints(evaluation, dimension.id, bucket.id),
      sparklinePointList: resolveRepoQualityBucketSparklinePointList(evaluation, dimension.id, bucket.id)
    }))
  }));
}

export function createLanguageCoverageSummaryCards(evaluation: LanguageRegistryEvaluation | null): RegistryCoverageCard[] {
  if (!evaluation) return [];
  return evaluation.coverage.map((localeCoverage) => ({
    id: localeCoverage.locale,
    title: localeCoverage.locale.toUpperCase(),
    percent: formatLanguageCoveragePercent(localeCoverage.coverage),
    status: localeCoverage.status,
    buckets: languageCoverageBuckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      value: localeCoverage[bucket.id],
      status: localeCoverage.status,
      sparklineLabel: resolveLanguageCoverageSparklineLabel(evaluation, localeCoverage.locale, bucket.id),
      sparklinePoints: resolveLanguageCoverageSparklinePoints(evaluation, localeCoverage.locale, bucket.id),
      sparklinePointList: resolveLanguageCoverageSparklinePointList(evaluation, localeCoverage.locale, bucket.id)
    }))
  }));
}

export function formatLanguageCoveragePercent(score: number): string {
  const boundedScore = Math.max(0, Math.min(1, score));
  const flooredPercent = Math.floor(boundedScore * 10000) / 100;

  return `${flooredPercent.toFixed(2)}%`;
}

function createRepoQualityWorkspaceHaystack(workspace: RepoQualityWorkspaceEvaluation): string {
  return `${workspace.id} ${workspace.path} ${workspace.fileCount} ${workspace.lineCount} ${workspace.missingCount} ${workspace.riskCount} ${workspace.coverage?.status ?? ''} ${workspace.findings?.join(' ') ?? ''}`.toLowerCase();
}

function createRepoQualityFileHaystack(file: RepoQualityFileEvaluation): string {
  return `${file.id} ${file.path} ${file.owner} ${file.layer} ${file.kind} ${file.lineCount} ${file.findings.join(' ')}`.toLowerCase();
}

function resolveRepoQualityDimensionTrend(evaluation: RepoQualityEvaluation, dimensionId: RepoQualityDimensionId): number {
  const history = evaluation.history ?? [];
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  if (!latest || !previous) {
    return 0;
  }

  return (latest.dimensions[dimensionId]?.score ?? 0) - (previous.dimensions[dimensionId]?.score ?? 0);
}

function resolveRepoQualityTrendIcon(evaluation: RepoQualityEvaluation, dimensionId: RepoQualityDimensionId): WorkbenchIconInput {
  const trend = resolveRepoQualityDimensionTrend(evaluation, dimensionId);

  if (trend > 0.0001) {
    return 'action.arrow-up';
  }

  if (trend < -0.0001) {
    return 'action.arrow-down';
  }

  return 'status.success';
}

function resolveRepoQualityTrendTone(evaluation: RepoQualityEvaluation, dimensionId: RepoQualityDimensionId): 'up' | 'down' | 'flat' {
  const trend = resolveRepoQualityDimensionTrend(evaluation, dimensionId);

  if (trend > 0.0001) {
    return 'up';
  }

  if (trend < -0.0001) {
    return 'down';
  }

  return 'flat';
}

function formatRepoQualityTrend(evaluation: RepoQualityEvaluation, dimensionId: RepoQualityDimensionId): string {
  const trend = resolveRepoQualityDimensionTrend(evaluation, dimensionId) * 100;

  if (Math.abs(trend) < 0.01) {
    return 'stable';
  }

  return `${trend > 0 ? '+' : ''}${trend.toFixed(1)} pt`;
}

function resolveRepoQualityBucketSparklinePoints(
  evaluation: RepoQualityEvaluation,
  dimensionId: RepoQualityDimensionId,
  bucketId: RepoQualityBucketId
): string {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.dimensions[dimensionId]?.[bucketId] ?? 0);

  return formatCoverageSparklinePoints(createCoverageSparklinePoints(values));
}

function resolveRepoQualityBucketSparklinePointList(
  evaluation: RepoQualityEvaluation,
  dimensionId: RepoQualityDimensionId,
  bucketId: RepoQualityBucketId
): CoverageSparklinePoint[] {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.dimensions[dimensionId]?.[bucketId] ?? 0);

  return createCoverageSparklinePoints(values);
}

function resolveRepoQualityBucketSparklineLabel(
  evaluation: RepoQualityEvaluation,
  dimensionId: RepoQualityDimensionId,
  bucketId: RepoQualityBucketId
): string {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.dimensions[dimensionId]?.[bucketId] ?? 0);
  const latest = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? latest;
  const delta = latest - previous;

  if (delta === 0) {
    return 'stable';
  }

  return `${delta > 0 ? '+' : ''}${delta}`;
}

function resolveLanguageCoverageSparklinePoints(
  evaluation: LanguageRegistryEvaluation,
  locale: string,
  bucketId: LanguageCoverageBucketId
): string {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.coverage[locale]?.[bucketId] ?? 0);

  return formatCoverageSparklinePoints(createCoverageSparklinePoints(values));
}

function resolveLanguageCoverageSparklinePointList(
  evaluation: LanguageRegistryEvaluation,
  locale: string,
  bucketId: LanguageCoverageBucketId
): CoverageSparklinePoint[] {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.coverage[locale]?.[bucketId] ?? 0);

  return createCoverageSparklinePoints(values);
}

function resolveLanguageCoverageSparklineLabel(
  evaluation: LanguageRegistryEvaluation,
  locale: string,
  bucketId: LanguageCoverageBucketId
): string {
  const values = (evaluation.history ?? []).map((snapshot) => snapshot.coverage[locale]?.[bucketId] ?? 0);
  const latest = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? latest;
  const delta = latest - previous;

  if (delta === 0) {
    return 'stable';
  }

  return `${delta > 0 ? '+' : ''}${delta}`;
}

function resolveProductSourceEntityTone(entity: ProductDocsSourceEntity): ProductMapTone {
  return entity.kind === 'registry' ? 'shared' : 'runtime';
}
