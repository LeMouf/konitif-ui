<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    DesignSystemThemeSession,
    WorkbenchIconTone,
    WorkbenchRuntimeObservationEvent,
    WorkbenchRuntimeSnapshot
  } from '@konitif/workbench';
  import { createWorkbenchRouteHref, parseWorkbenchRoute } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type { DesignSystemDiscoveryProjection } from './designSystemEntityDiscovery';
  import {
    createDesignSystemThemeDraftStateFromSession,
    createDesignSystemThemeSessionFromDraftState,
    createDesignSystemThemeDraftStatus,
    redoDesignSystemThemeDraft,
    resetDesignSystemThemeDraftValue,
    serializeDesignSystemThemeDraft,
    setDesignSystemThemeDraftValue,
    undoDesignSystemThemeDraft,
    type DesignSystemThemeDraftState
  } from './designSystemThemeDraft';
  import type { FeatureDocEntry, TechnicalRuleEntry, TechnicalTestEntry } from './technicalDocsCatalog';
  import { buildTechnicalDocsRelationGraph } from './technicalDocsCatalog';
  import {
    createDesignSystemThemeProjection,
    type DesignSystemThemeDocument,
    createDesignSystemThemeContractSummary,
    mapDesignSystemFeatureImpacts,
    resolveDesignSystemThemeInspection,
    type DesignSystemThemeCategory,
    type DesignSystemThemeGraphNode
  } from './designSystemThemeCatalog';
  import { listWorkbenchIcons } from '../icons/iconRegistry';
  import ShortcutCatalogView from './ShortcutCatalogView.svelte';
  import TechnicalDocsLayout from './technical-docs/TechnicalDocsLayout.svelte';
  import {
    TechnicalDocsArchitectureProjectionSection,
    TechnicalDocsDesignGraphSection,
    TechnicalDocsFeatureArchetypeMatrixSection,
    TechnicalDocsFeatureGraphSection,
    TechnicalDocsIconRegistrySection,
    TechnicalDocsProductRegistrySection,
    TechnicalDocsRegistryDatasetSection,
    TechnicalDocsRegistryWorkbenchLayout,
    TechnicalDocsSemanticArchitectureGraphSection
  } from './technical-docs/sections';
  import type { ArchitectureProjectionDocument } from './technical-docs/architectureProjectionModel';
  import type { FeatureArchetypeMatrix } from './technical-docs/featureArchetypeMatrixModel';
  import type { SemanticArchitectureGraph } from './technical-docs/semanticArchitectureGraphModel';
  import {
    createFilteredRepoQualityGroups,
    createLanguageCoverageSummaryCards,
    createRegistryWorkbenchEntries,
    createRegistryWorkbenchRows,
    createRepoQualitySummaryCards,
    filterRegistryWorkbenchRows,
    registryWorkbenchIds,
    type RegistryWorkbenchId
  } from './technical-docs/registryWorkbenchModel';
  import {
    createDesignCategorySummaries,
    createDesignConstructionLayers,
    filterDesignCategoryNodes,
    matchesSearchText,
    resolveDesignNodeById,
    resolveFirstGraphNode,
    resolvePreviewCardKind,
    resolvePreviewThemeStyle as resolveDesignPreviewThemeStyle,
    resolvePreviewThemeVariableValue as resolveDesignPreviewThemeVariableValue,
    resolveRelatedDiscoveryEntities,
    resolveThemeVariableTargetValue as resolveDesignThemeVariableTargetValue,
    resolveThemeVariableValue as resolveDesignThemeVariableValue,
    summarizeDesignLayerItems
  } from './technical-docs/designThemeWorkbenchModel';
  import type { TechnicalDocsReports } from './technicalDocsReports';
  import { createTechnicalDocsDatasetObservation, type TechnicalDocsDatasetLoader } from './technicalDocsDatasets';
  import type {
    ProductDocsDesignNode,
    ProductDocsFeature,
    ProductDocsPage,
    ProductDocsProjection,
    ProductDocsTemplate,
    ProductMapColumn,
    ProductMapItem,
    ProductMapTone,
    ProductPropertiesTab,
    ProductTreeNode
  } from './product/productDocsModel';
  import {
    PRODUCT_DOCS_PROJECTION_KIND,
    PRODUCT_DOCS_SOURCE_FILE,
    normalizeProductDocsProjection
  } from './product/productDocsProjectionModel';
  import {
    countRegistryIconUsage,
    createProductIconDebtGroups,
    createRegistryIconCategories,
    createRegistryIconSetGroups,
    createRegistryIconToneGroups,
    createRegistryIconUsageRows,
    filterRegistryIcons,
    formatRegistryIconCode,
    formatRegistryIconLabel,
    isProductIconDebtCandidate
  } from './product/productIconRegistryModel';
  import {
    countProductInspectorFiles,
    createProductInspectorDependencies,
    createProductPageMapItem,
    createProductPageMapItemId,
    createProductRuntimeMapColumns,
    createProductSystemMapColumns,
    createProductTemplateMapItemId,
    createProductTreeMapItem,
    formatProductSourceLabel,
    resolveProductInspectorExportName,
    resolveProductInspectorPage,
    resolveProductInspectorRuntime
  } from './product/productSystemMapModel';
  import {
    createProductIsolatedCompositionItems,
    createProductIsolatedDesignNodes,
    createProductIsolatedTreeNodes,
    createProductMapItemDependencyNodes,
    createProductPropertiesModel,
    createProductRenderComputedLayers,
    createProductRenderEngineScene,
    shouldUseIsolatedProductScene
  } from './product/productRenderModel';
  import {
    createProductArchitectureFindings,
    createProductCompositionStrip,
    createProductPageCompositionTreeNodes,
    createProductSidebarEntries,
    createProductTreeNodes,
    flattenProductTreeNodes,
    resolveProductMapColumnIcon,
    resolveProductMapColumnId,
    selectProductArchitectureFindings
  } from './product/productStructureModel';

  type TechnicalDocsViewMode = 'all' | 'features' | 'docs';
  type TechnicalDocsTab = RegistryWorkbenchId | 'feature-graph' | 'design-graph' | 'registry';
  type ShellShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type ShellShortcutScopeFilter = 'all' | 'context' | 'global';
  type ShellShortcutTypeFilter = 'all' | ShellShortcutType;
  const emptyDesignSystemDiscoveryProjection: DesignSystemDiscoveryProjection = {
    entities: [],
    relations: [],
    totals: {
      entities: 0,
      widgets: 0,
      tools: 0,
      panels: 0,
      runtimeProjections: 0,
      undoBridges: 0
    }
  };

  export let featureDocs: FeatureDocEntry[] = [];
  export let datasetLoader: TechnicalDocsDatasetLoader | null = null;
  export let reports: TechnicalDocsReports | null = null;
  export let themeDocument: DesignSystemThemeDocument | null = null;
  export let ruleEntries: TechnicalRuleEntry[] = [];
  export let testEntries: TechnicalTestEntry[] = [];
  export let viewMode: TechnicalDocsViewMode = 'all';
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection = emptyDesignSystemDiscoveryProjection;
  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let designSystemThemeSession: DesignSystemThemeSession | null = null;
  export let onLoadRuntimeProjection: (projectionKind: string, sourceFile: string) => Promise<unknown> | unknown = () => null;
  export let onDesignSystemThemeSessionChange: (session: DesignSystemThemeSession | null) => void = () => {};
  export let shortcutGroups: Array<{
    key: string;
    label: string;
    items: Array<{
      id: string;
      key: string;
      label: string;
      type: ShellShortcutType;
      description?: string;
      scopeLabel: string;
      priorityLabel: string;
    }>;
  }> = [];
  export let totalShortcuts = 0;
  export let filteredShortcuts = 0;
  export let shortcutQuery = '';
  export let shortcutScopeFilter: ShellShortcutScopeFilter = 'all';
  export let shortcutTypeFilter: ShellShortcutTypeFilter = 'all';
  export let shortcutScopeFilters: Array<{ key: ShellShortcutScopeFilter; label: string }> = [];
  export let shortcutTypeFilters: Array<{ key: ShellShortcutTypeFilter; label: string }> = [];
  export let onShortcutQueryChange: (value: string) => void = () => {};
  export let onSelectShortcutScopeFilter: (value: ShellShortcutScopeFilter) => void = () => {};
  export let onSelectShortcutTypeFilter: (value: ShellShortcutTypeFilter) => void = () => {};

  const i18nT = getWorkbenchTranslator();
  let themeProjection = createDesignSystemThemeProjection(themeDocument);
  let designSystemThemeDocument = themeProjection.document;
  let designSystemThemeGraph = themeProjection.graph;
  let designSystemThemeRegistry = themeProjection.registry;
  let designSystemThemeSyncPreview = themeProjection.syncPreview;
  $: themeProjection = createDesignSystemThemeProjection(themeDocument);
  $: designSystemThemeDocument = themeProjection.document;
  $: designSystemThemeGraph = themeProjection.graph;
  $: designSystemThemeRegistry = themeProjection.registry;
  $: designSystemThemeSyncPreview = themeProjection.syncPreview;
  $: designSystemContract = createDesignSystemThemeContractSummary(designSystemThemeDocument);
  $: languageRegistryEvaluation = reports?.language ?? null;
  $: repoQualityEvaluation = reports?.quality ?? null;
  const emptyFeatureArchetypeMatrix: FeatureArchetypeMatrix = {
    generatedAt: '',
    repoRoot: '',
    archetypes: [],
    columns: [],
    rows: []
  };
  const emptySemanticArchitectureGraph: SemanticArchitectureGraph = {
    generatedAt: '',
    nodes: [],
    edges: []
  };
  const emptyArchitectureProjectionDocument: ArchitectureProjectionDocument = {
    generatedAt: '',
    sourceGraph: '',
    projections: []
  };
  const datasetObservation = createTechnicalDocsDatasetObservation();
  let datasetsMounted = false;
  $: if (datasetsMounted) datasetObservation.select(datasetLoader);
  $: featureArchetypeMatrix = $datasetObservation.data?.featureMatrix ?? emptyFeatureArchetypeMatrix;
  $: semanticArchitectureGraph = $datasetObservation.data?.semanticGraph ?? emptySemanticArchitectureGraph;
  $: architectureProjectionDocument = $datasetObservation.data?.projectionDocument ?? emptyArchitectureProjectionDocument;
  const productPropertiesTabs: Array<{ id: ProductPropertiesTab; label: string }> = [
    { id: 'computed', label: 'Computed' },
    { id: 'styles', label: 'Styles' },
    { id: 'events', label: 'Events' },
    { id: 'attributes', label: 'Attributes' },
    { id: 'data', label: 'Data' }
  ];
  const fallbackProductDocsTemplates: ProductDocsTemplate[] = [
    {
      id: 'template.workbench-shell',
      title: 'Workbench Shell',
      role: 'Application frame',
      routeScope: '/, /docs, /tools/<toolId>',
      summary: 'Primary shell template for panel layout, tool chrome, footer status, detachable windows, and tool launch surfaces.',
      featureIds: ['contextual-workbenches', 'layout-history', 'tool-surface-contract', 'feature-navigation', 'detached-panel-windows'],
      designNodeIds: ['layout.app-shell', 'layout.panel-stack', 'primitive.panel-chrome', 'layout.status-bar', 'navigation.menu'],
      slots: ['top toolbar', 'left rail', 'workspace grid', 'right inspector', 'footer status']
    },
    {
      id: 'template.docs-edit-in-place',
      title: 'Docs Edit In Place',
      role: 'Documentation workspace',
      routeScope: '/docs/<tab>',
      summary: 'Docs template for graph inspection, inline theme editing, registry review, and product/design reconciliation.',
      featureIds: ['design-system-theme-explorer', 'feature-explorer', 'feature-validation-model', 'concept-vocabulary'],
      designNodeIds: ['component.technical-docs-view', 'surface.docs', 'pattern.registry-detail', 'navigation.tabs', 'form.text-input'],
      slots: ['docs tabs', 'category rail', 'visual preview', 'inspector', 'registry tables']
    }
  ];
  const fallbackProductDocsPages: ProductDocsPage[] = [
    {
      id: 'page.workbench',
      title: 'Workbench Runtime',
      route: '/',
      templateId: 'template.workbench-shell',
      status: 'active',
      summary: 'Default product runtime where registered tools are composed into panels and persisted shell layout.',
      featureIds: ['contextual-workbenches', 'tool-surface-contract', 'layout-history'],
      designNodeIds: ['layout.app-shell', 'primitive.panel-chrome', 'layout.splitter'],
      entryPoints: [
        { label: 'Default shell', href: '/', kind: 'route' },
        { label: 'Open Feature Explorer', href: '/tools/workbench.feature-explorer', kind: 'tool' }
      ],
      config: 'packages/workbench-core/src/application/workspace/createWorkspace.ts'
    },
    {
      id: 'page.docs',
      title: 'Technical Docs',
      route: '/docs',
      templateId: 'template.docs-edit-in-place',
      status: 'draft',
      summary: 'Edit-in-place documentation surface where registry entries drive feature, design, product, language, quality, and icon reviews.',
      featureIds: ['design-system-theme-explorer', 'feature-explorer', 'feature-validation-model'],
      designNodeIds: ['component.technical-docs-view', 'surface.docs', 'pattern.registry-detail'],
      entryPoints: [
        { label: 'Open Docs', href: '/docs', kind: 'route' },
        { label: 'Open Product Docs', href: '/docs/product', kind: 'route' }
      ],
      config: 'packages/workbench-ui/src/shell/TechnicalDocsView.svelte'
    }
  ];
  let selectedGraphFeatureId: string | null = null;
  let selectedProductPageId: string = fallbackProductDocsPages[1]?.id ?? fallbackProductDocsPages[0]?.id ?? '';
  let selectedProductMapItemId: string | null = null;
  let activeProductCategoryId = 'routes';
  let activeProductPropertiesTab: ProductPropertiesTab = 'computed';
  let selectedProductRenderLayerId: string | null = null;
  let registryIconSearch = '';
  let registryIconCategoryFilter = 'all';
  let registryIconToneFilter: WorkbenchIconTone | 'all' = 'all';
  let registryIconViewMode: 'grid' | 'list' = 'grid';
  let registryIconSize = 24;
  let selectedRegistryIconId: string | null = null;
  let registryIconCopyStatus = '';
  let registryWorkbenchSearch = '';
  let productDocsProjection: ProductDocsProjection | null = null;
  let productDocsProjectionStatus: 'fallback' | 'loading' | 'live' | 'error' = 'fallback';
  let productDocsProjectionError: string | null = null;
  let productDocsProjectionRequestSignature = '';
  let selectedDesignNodeId: string | null = resolveInitialDesignNodeId();
  let selectedVisualElementId: string | null = null;
  let selectedVisualNodeIds: string[] = [];
  let activeDesignCategory: DesignSystemThemeCategory = resolveInitialDesignCategory();
  let designThemeRevealRatio = 50;
  let designThemeRevealElement: HTMLDivElement | null = null;
  let isDesignThemeRevealDragging = false;
  let designSearchQuery = '';
  const initialRegistryWorkbenchId = resolveInitialRegistryWorkbenchId();
  let activeRegistryWorkbenchId: RegistryWorkbenchId = initialRegistryWorkbenchId;
  let designDraftState: DesignSystemThemeDraftState = createDesignSystemThemeDraftStateFromSession(designSystemThemeSession);
  let designDraftValues: Record<string, string> = designDraftState.values;
  let observedDesignSystemThemeSessionSignature = '';

  $: relationGraph = buildTechnicalDocsRelationGraph({ featureDocs, ruleEntries, testEntries });
  $: featureDesignImpacts = mapDesignSystemFeatureImpacts(featureDocs, designSystemThemeDocument);
  $: selectedGraphFeature =
    relationGraph.contexts.flatMap((context) => context.features).find((feature) => feature.id === selectedGraphFeatureId) ??
    relationGraph.contexts.flatMap((context) => context.features).find((feature) => feature.designImpact) ??
    null;
  $: productDocsPages = productDocsProjection?.pages?.length ? productDocsProjection.pages : fallbackProductDocsPages;
  $: productDocsTemplates = productDocsProjection?.templates?.length ? productDocsProjection.templates : fallbackProductDocsTemplates;
  $: selectedProductPage =
    productDocsPages.find((page) => page.id === selectedProductPageId) ??
    productDocsPages[0] ??
    null;
  $: selectedProductTemplate =
    productDocsTemplates.find((template) => template.id === selectedProductPage?.templateId) ??
    productDocsTemplates[0] ??
    null;
  $: selectedProductFeatureIds = selectedProductPage && selectedProductTemplate
    ? [...new Set([...selectedProductTemplate.featureIds, ...selectedProductPage.featureIds])]
    : [];
  $: selectedProductFeatures = selectedProductFeatureIds
    .map((featureId) => selectedProductPage?.features?.find((feature) => feature.id === featureId) ?? selectedProductTemplate?.features?.find((feature) => feature.id === featureId) ?? featureDocs.find((feature) => feature.id === featureId))
    .filter((feature): feature is ProductDocsFeature | FeatureDocEntry => Boolean(feature));
  $: selectedProductDesignNodeIds = selectedProductPage && selectedProductTemplate
    ? [...new Set([...selectedProductTemplate.designNodeIds, ...selectedProductPage.designNodeIds])]
    : [];
  $: selectedProductDesignNodes = selectedProductDesignNodeIds
    .map((nodeId) => selectedProductPage?.designNodes?.find((node) => node.id === nodeId) ?? selectedProductTemplate?.designNodes?.find((node) => node.id === nodeId) ?? resolveDesignNodeById(nodeId, designSystemThemeGraph))
    .filter((node): node is ProductDocsDesignNode | DesignSystemThemeGraphNode => Boolean(node));
  $: productDocsTotals = {
    pages: productDocsProjection?.totals.pages ?? productDocsPages.length,
    templates: productDocsProjection?.totals.templates ?? productDocsTemplates.length,
    routes: productDocsProjection?.totals.routes ?? new Set(productDocsPages.map((page) => page.route)).size,
    features: productDocsProjection?.totals.features ?? new Set(productDocsTemplates.flatMap((template) => template.featureIds).concat(productDocsPages.flatMap((page) => page.featureIds))).size,
    designNodes: productDocsProjection?.totals.designNodes ?? new Set(productDocsTemplates.flatMap((template) => template.designNodeIds).concat(productDocsPages.flatMap((page) => page.designNodeIds))).size,
    sourceEntities: productDocsProjection?.totals.sourceEntities ?? 0,
    iconSvgFiles: productDocsProjection?.totals.iconSvgFiles ?? productDocsProjection?.iconScan?.totals.svgFiles ?? 0,
    iconInlineSvg: productDocsProjection?.totals.iconInlineSvg ?? productDocsProjection?.iconScan?.totals.inlineSvg ?? 0,
    iconScannedFiles: productDocsProjection?.totals.iconScannedFiles ?? productDocsProjection?.iconScan?.totals.scannedFiles ?? 0
  };
  $: productIconScan = productDocsProjection?.iconScan ?? null;
  $: productIconDebtGroups = createProductIconDebtGroups(productIconScan);
  $: productIconDebtCandidates = (productIconScan?.inlineSvg ?? [])
    .filter((entry) => isProductIconDebtCandidate(entry))
    .slice(0, 8);
  $: registryIconDefinitions = listWorkbenchIcons();
  $: registryIconCategories = createRegistryIconCategories(registryIconDefinitions);
  $: registryIconToneGroups = createRegistryIconToneGroups(registryIconDefinitions);
  $: filteredRegistryIcons = filterRegistryIcons(
    registryIconDefinitions,
    registryIconSearch,
    registryIconCategoryFilter,
    registryIconToneFilter
  );
  $: selectedRegistryIcon =
    filteredRegistryIcons.find((icon) => icon.id === selectedRegistryIconId) ??
    registryIconDefinitions.find((icon) => icon.id === selectedRegistryIconId) ??
    filteredRegistryIcons[0] ??
    registryIconDefinitions[0] ??
    null;
  $: selectedRegistryIconUsage = selectedRegistryIcon
    ? createRegistryIconUsageRows(selectedRegistryIcon, productIconScan, productIconDebtCandidates)
    : [];
  $: selectedRegistryIconUsageCount = selectedRegistryIcon
    ? countRegistryIconUsage(selectedRegistryIcon, productIconScan)
    : 0;
  $: registryIconSetGroups = createRegistryIconSetGroups(registryIconDefinitions, productIconScan);
  $: registryIconUsageAverage = registryIconDefinitions.length
    ? Math.round((registryIconDefinitions.filter((icon) => countRegistryIconUsage(icon, productIconScan) > 0).length / registryIconDefinitions.length) * 100)
    : 0;
  $: registryIconCodeSnippet = selectedRegistryIcon ? formatRegistryIconCode(selectedRegistryIcon) : '';
  $: registryWorkbenchEntries = createRegistryWorkbenchEntries({
    themeAvailable: themeDocument !== null,
    icons: registryIconDefinitions,
    scan: productIconScan,
    totals: productDocsTotals,
    features: featureDocs,
    rules: ruleEntries,
    tests: testEntries,
    shortcuts: totalShortcuts,
    repoQualityEvaluation,
    languageRegistryEvaluation,
    featureArchetypeMatrix,
    semanticArchitectureGraph,
    architectureProjectionDocument,
    designSystemThemeDocument,
    designSystemThemeGraph,
    designSystemThemeRegistry,
    productDocsSourceFile: PRODUCT_DOCS_SOURCE_FILE,
    productDocsProjectionStatus
  });
  $: selectedRegistryWorkbench =
    registryWorkbenchEntries.find((entry) => entry.id === activeRegistryWorkbenchId) ??
    registryWorkbenchEntries[0] ??
    null;
  $: registryWorkbenchRows = createRegistryWorkbenchRows({
    themeAvailable: themeDocument !== null,
    registryId: activeRegistryWorkbenchId,
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
    formatSourceLabel: formatProductSourceLabel,
    formatRegistryIconLabel,
    isProductIconDebtCandidate
  });
  $: filteredRegistryWorkbenchRows = filterRegistryWorkbenchRows(registryWorkbenchRows, registryWorkbenchSearch);
  $: filteredRepoQualityGroups = createFilteredRepoQualityGroups(repoQualityEvaluation, registryWorkbenchSearch);
  $: filteredRepoQualityRowCount = filteredRepoQualityGroups.reduce((total, group) => total + 1 + group.files.length, 0);
  $: repoQualityTotalRowCount = repoQualityEvaluation ? repoQualityEvaluation.workspaces.length + repoQualityEvaluation.files.length : 0;
  $: repoQualitySummaryCards = createRepoQualitySummaryCards(repoQualityEvaluation);
  $: languageCoverageSummaryCards = createLanguageCoverageSummaryCards(languageRegistryEvaluation);
  $: productSystemMapColumns = createProductSystemMapColumns(
    productDocsPages,
    productDocsTemplates,
    selectedProductPage,
    selectedProductTemplate,
    selectedProductFeatures,
    designSystemThemeGraph.categories.flatMap((category) => category.nodes),
    productDocsProjection?.sourceEntities ?? []
  );
  $: productSidebarEntries = createProductSidebarEntries(productSystemMapColumns);
  $: productVisibleSystemMapColumns = productSystemMapColumns;
  $: activeProductSidebarEntry =
    productVisibleSystemMapColumns.find((column) => column.id === activeProductCategoryId) ??
    productVisibleSystemMapColumns[0] ??
    null;
  $: activeProductCategoryItems = activeProductSidebarEntry?.items ?? [];
  $: productRuntimeMapColumns = createProductRuntimeMapColumns(
    selectedProductPage,
    selectedProductFeatures,
    productDocsProjection?.sourceEntities ?? []
  );
  $: productMapItems = [...productSystemMapColumns, ...productRuntimeMapColumns].flatMap((column) => column.items);
  $: selectedProductMapItem =
    productMapItems.find((item) => item.id === selectedProductMapItemId) ??
    createProductTreeMapItem(productTreeNodes, selectedProductMapItemId) ??
    createProductPageMapItem(selectedProductPage, selectedProductTemplate);
  $: selectedProductInspectorPage = resolveProductInspectorPage(
    selectedProductMapItemId,
    selectedProductMapItem,
    productDocsPages
  );
  $: selectedProductInspectorTemplate =
    selectedProductInspectorPage
      ? productDocsTemplates.find((template) => template.id === selectedProductInspectorPage.templateId) ?? null
      : null;
  $: selectedProductInspectorPageTree =
    selectedProductInspectorPage
      ? createProductPageCompositionTreeNodes(selectedProductInspectorPage, selectedProductInspectorTemplate)
      : [];
  $: selectedProductInspectorDependencies = createProductInspectorDependencies(
    selectedProductInspectorPage,
    selectedProductInspectorTemplate
  );
  $: selectedProductUsesIsolatedScene = shouldUseIsolatedProductScene(selectedProductMapItem, activeProductCategoryId);
  $: productRenderPage = selectedProductUsesIsolatedScene
    ? null
    : selectedProductInspectorPage ?? selectedProductPage;
  $: productRenderTemplate = selectedProductUsesIsolatedScene
    ? null
    : selectedProductInspectorTemplate ?? selectedProductTemplate;
  $: productRenderPageTree = selectedProductUsesIsolatedScene
    ? createProductIsolatedTreeNodes(selectedProductMapItem, activeProductSidebarEntry, activeProductCategoryItems)
    : selectedProductInspectorPageTree;
  $: productRenderFeatures = selectedProductUsesIsolatedScene ? [] : selectedProductFeatures;
  $: productRenderDesignNodes = selectedProductUsesIsolatedScene
    ? createProductIsolatedDesignNodes(selectedProductMapItem, activeProductCategoryItems, selectedProductDesignNodes)
    : selectedProductDesignNodes;
  $: productRenderCompositionItems = selectedProductUsesIsolatedScene
    ? createProductIsolatedCompositionItems(selectedProductMapItem, activeProductCategoryItems)
    : createProductCompositionStrip(
        productRenderPage,
        productRenderTemplate,
        productRenderFeatures,
        productRenderDesignNodes
      );
  $: selectedProductNavigationDependencies = selectedProductInspectorDependencies.length
    ? selectedProductInspectorDependencies
    : createProductMapItemDependencyNodes(selectedProductMapItem, activeProductCategoryItems);
  $: productRenderScene = createProductRenderEngineScene(
    productRenderPage,
    productRenderTemplate,
    selectedProductMapItem,
    productRenderPageTree,
    productRenderFeatures,
    productRenderDesignNodes,
    productRenderCompositionItems,
    designSystemThemeSession?.mode === 'light' ? 'Light' : 'Dark',
    activeProductCategoryId
  );
  $: productRenderComputedLayers = createProductRenderComputedLayers(productRenderScene);
  $: selectedProductRenderLayer =
    productRenderComputedLayers.find((layer) => layer.id === selectedProductRenderLayerId) ??
    productRenderComputedLayers.find((layer) => layer.targetId === selectedProductMapItem?.id) ??
    null;
  $: selectedProductProperties = createProductPropertiesModel(
    selectedProductMapItem,
    selectedProductRenderLayer,
    productRenderScene
  );
  $: productArchitectureFindings = createProductArchitectureFindings(productDocsProjection?.sourceEntities ?? []);
  $: visibleProductArchitectureFindings = selectProductArchitectureFindings(
    productArchitectureFindings,
    selectedProductMapItem,
    activeProductCategoryId
  );
  $: productTreeNodes = createProductTreeNodes(
    productDocsPages,
    productDocsTemplates,
    featureDocs,
    designSystemThemeGraph.categories.flatMap((category) => category.nodes),
    productDocsProjection?.sourceEntities ?? []
  );
  $: productFlatTreeNodes = flattenProductTreeNodes(productTreeNodes);
  $: selectedDesignNode =
    designSystemThemeGraph.categories.flatMap((category) => category.nodes).find((node) => node.id === selectedDesignNodeId) ??
    designSystemThemeGraph.categories.find((category) => category.category === activeDesignCategory)?.nodes[0] ??
    designSystemThemeGraph.categories.flatMap((category) => category.nodes)[0] ??
    null;
  $: activeDesignCategoryEntry =
    designSystemThemeGraph.categories.find((category) => category.category === activeDesignCategory) ??
    designSystemThemeGraph.categories[0] ??
    null;
  $: activeDesignCategoryNodes = filterDesignCategoryNodes(activeDesignCategoryEntry, designSearchQuery);
  $: designCategorySummaries = createDesignCategorySummaries(designSystemThemeGraph.categories, designSearchQuery);
  $: designSearchResultCount = designCategorySummaries.reduce((count, category) => count + category.nodes.length, 0);
  $: selectedDesignInspection = resolveDesignSystemThemeInspection(
    designSystemThemeDocument,
    selectedDesignNode?.id ?? null
  );
  $: relatedDiscoveryEntities = resolveRelatedDiscoveryEntities(selectedDesignNode?.id ?? null, designSystemDiscoveryProjection);
  $: selectedDesignConstructionLayers = createDesignConstructionLayers(
    selectedDesignNode,
    selectedDesignInspection,
    relatedDiscoveryEntities,
    activeDesignCategoryEntry,
    designSystemThemeGraph
  );
  $: designDraftStatus = createDesignSystemThemeDraftStatus(designDraftState);
  $: designDraftValues = designDraftState.values;
  $: activeThemeMode = designSystemThemeSession?.mode ?? 'dark';
  $: previewThemeStyle = resolveDesignPreviewThemeStyle(designDraftValues, activeThemeMode, designSystemThemeSyncPreview);
  $: darkPreviewThemeStyle = resolveDesignPreviewThemeStyle(designDraftValues, 'dark', designSystemThemeSyncPreview);
  $: lightPreviewThemeStyle = resolveDesignPreviewThemeStyle({}, 'light', designSystemThemeSyncPreview);
  $: resolvePreviewThemeVariableValue = (
    variable: string,
    draftValues: Record<string, string> = designDraftValues,
    mode: string = activeThemeMode
  ) => resolveDesignPreviewThemeVariableValue(variable, draftValues, mode, designSystemThemeSyncPreview);
  $: resolveThemeVariableValue = (
    variable: string,
    draftValues: Record<string, string> = designDraftValues
  ) => resolveDesignThemeVariableValue(variable, draftValues, designSystemThemeSyncPreview);
  $: resolveThemeVariableTargetValue = (variable: string) => resolveDesignThemeVariableTargetValue(variable, designSystemThemeRegistry);
  $: designThemeRevealLayers = [
    {
      mode: 'light' as const,
      label: 'Light',
      style: lightPreviewThemeStyle
    },
    {
      mode: 'dark' as const,
      label: 'Dark',
      style: darkPreviewThemeStyle
    }
  ];
  $: designDraftPreviewText = serializeDesignSystemThemeDraft(designDraftValues);
  $: syncDesignDraftStateFromSession(designSystemThemeSession);
  $: void syncProductDocsProjection(activeRegistryWorkbenchId, runtimeSnapshot);
  $: viewTitle =
    viewMode === 'features'
      ? $i18nT('ui.shell.docs.title.features', { default: 'Feature Surfaces' })
      : viewMode === 'docs'
        ? $i18nT('ui.shell.docs.title.docs', { default: 'Rules And Tests' })
        : $i18nT('ui.shell.docs.title.all', { default: 'Technical Plan' });

  function resolveGraphContextStyle(index: number, featureCount: number): string {
    const width = Math.min(34, Math.max(18, 17 + featureCount * 2.2));
    const drift = ((index * 29) % 7) - 3;
    const rail = ((index * 17) % 5) - 2;

    return `--graph-context-width: ${width}rem; --graph-context-drift: ${drift}rem; --graph-context-rail: ${rail}rem;`;
  }

  function resolveGraphFeatureStyle(index: number): string {
    const branch = index % 2 === 0 ? 0 : 1.2;
    const lift = ((index * 13) % 5) * 0.16;

    return `--graph-feature-branch: ${branch}rem; --graph-feature-lift: ${lift}rem;`;
  }

  function selectGraphFeature(featureId: string): void {
    selectedGraphFeatureId = featureId;
  }

  function syncProductDocsProjection(registryId: RegistryWorkbenchId, snapshot: WorkbenchRuntimeSnapshot | null): void {
    if (registryId !== 'product') {
      return;
    }

    if (!snapshot || snapshot.status !== 'online') {
      const signature = `product-docs::${snapshot?.status ?? 'missing-snapshot'}::${snapshot?.lastError ?? 'initial'}`;

      if (signature !== productDocsProjectionRequestSignature) {
        productDocsProjectionRequestSignature = signature;
        productDocsProjectionStatus = productDocsProjection ? 'live' : 'error';
        productDocsProjectionError = snapshot?.lastError
          ? `Runtime backend unavailable: ${snapshot.lastError}`
          : 'Runtime backend is not online; product-docs projection is not available yet.';
      }

      return;
    }

    const catalogEntry = snapshot.projectionCatalog.find((entry) => entry.projectionKind === PRODUCT_DOCS_PROJECTION_KIND);

    if (!catalogEntry) {
      const signature = `product-docs::${snapshot.status}::catalog-missing::${snapshot.lastError ?? 'initial'}`;

      if (signature !== productDocsProjectionRequestSignature) {
        productDocsProjectionRequestSignature = signature;
        productDocsProjectionStatus = productDocsProjection ? 'live' : 'error';
        productDocsProjectionError = 'Backend projection catalog does not expose product-docs. Restart the workbench backend on port 5179 so it loads the current server code.';
      }

      return;
    }

    const signature = resolveProductDocsProjectionSignature(snapshot, catalogEntry);

    if (!signature || signature === productDocsProjectionRequestSignature) {
      return;
    }

    productDocsProjectionRequestSignature = signature;
    productDocsProjectionStatus = productDocsProjection ? 'live' : 'loading';
    productDocsProjectionError = null;

    void Promise.resolve(onLoadRuntimeProjection(PRODUCT_DOCS_PROJECTION_KIND, PRODUCT_DOCS_SOURCE_FILE))
      .then((result) => {
        const projection = normalizeProductDocsProjection(result);

        if (!projection) {
          throw new Error('Backend product-docs projection returned an invalid payload.');
        }

        productDocsProjection = projection;
        productDocsProjectionStatus = 'live';
        productDocsProjectionError = null;

        if (!productDocsProjection.pages.some((page) => page.id === selectedProductPageId)) {
          selectedProductPageId = productDocsProjection.pages[0]?.id ?? selectedProductPageId;
        }
      })
      .catch((error) => {
        productDocsProjectionStatus = productDocsProjection ? 'live' : 'error';
        productDocsProjectionError = error instanceof Error ? error.message : String(error);
      });
  }

  function resolveProductDocsProjectionSignature(
    snapshot: WorkbenchRuntimeSnapshot,
    catalogEntry: WorkbenchRuntimeSnapshot['projectionCatalog'][number]
  ): string {
    const latestRelevantEvent = snapshot.events.find((event) => isProductDocsRuntimeEvent(event, catalogEntry.sources));

    return [
      snapshot.status,
      catalogEntry.version,
      catalogEntry.sources.join('|'),
      latestRelevantEvent?.type ?? 'initial',
      latestRelevantEvent?.receivedAt ?? 'initial'
    ].join('::');
  }

  function isProductDocsRuntimeEvent(event: WorkbenchRuntimeObservationEvent, sources: string[]): boolean {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
    const projectionKind = typeof payload.projectionKind === 'string' ? payload.projectionKind : null;
    const sourceFile = typeof payload.sourceFile === 'string' ? payload.sourceFile : null;

    if (projectionKind === PRODUCT_DOCS_PROJECTION_KIND) {
      return true;
    }

    return event.type === 'source.changed' && Boolean(sourceFile && sources.some((source) => sourceFile === source || sourceFile.startsWith(`${source}/`)));
  }

  function selectProductPage(pageId: string): void {
    selectedProductPageId = pageId;
    selectedProductMapItemId = createProductPageMapItemId(pageId);
  }

  function selectProductMapItem(itemId: string): void {
    selectedProductRenderLayerId = null;
    selectedProductMapItemId = itemId;
    activeProductCategoryId = resolveProductMapColumnId(itemId, productSystemMapColumns) ?? activeProductCategoryId;

    const page = productDocsPages.find((entry) => createProductPageMapItemId(entry.id) === itemId);

    if (page) {
      selectedProductPageId = page.id;
      return;
    }

    const template = productDocsTemplates.find((entry) => createProductTemplateMapItemId(entry.id) === itemId);
    const templatePage = template
      ? productDocsPages.find((entry) => entry.templateId === template.id)
      : null;

    if (templatePage) {
      selectedProductPageId = templatePage.id;
    }
  }

  function selectProductRenderLayer(itemId: string, layerId: string): void {
    selectProductMapItem(itemId);
    selectedProductRenderLayerId = layerId;
  }

  function selectProductCategory(categoryId: string): void {
    activeProductCategoryId = categoryId;

    const category = productVisibleSystemMapColumns.find((column) => column.id === categoryId);
    const activeItemStillVisible = category?.items.some((item) => item.id === selectedProductMapItemId);

    if (!activeItemStillVisible && category?.items[0]) {
      selectProductMapItem(category.items[0].id);
    }
  }

  function handleTechnicalDocsPointerMove(event: PointerEvent): void {
    handleDesignThemeRevealPointerMove(event);
  }

  function handleTechnicalDocsPointerUp(): void {
    handleDesignThemeRevealPointerUp();
  }

  async function copyRegistryIconCode(): Promise<void> {
    if (!registryIconCodeSnippet) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(registryIconCodeSnippet);
      registryIconCopyStatus = 'copied';
      window.setTimeout(() => {
        registryIconCopyStatus = '';
      }, 1400);
    } catch {
      registryIconCopyStatus = 'unavailable';
    }
  }

  function resolveProductArchitectureStatusLabel(status: typeof productDocsProjectionStatus): string {
    switch (status) {
      case 'live':
        return 'live';
      case 'loading':
        return 'scan';
      case 'error':
        return 'offline';
      default:
        return 'fallback';
    }
  }

  function selectDesignNode(node: DesignSystemThemeGraphNode): void {
    selectedDesignNodeId = node.id;
    activeDesignCategory = node.category;
    selectedVisualElementId = null;
    selectedVisualNodeIds = [node.id];
    writeDesignNomenclatureToUrl(activeDesignCategory, node.id);
  }

  function selectVisualElement(elementId: string, nodeIds: string[]): void {
    selectedVisualElementId = elementId;
    selectedVisualNodeIds = nodeIds;
    const node = resolveFirstGraphNode(nodeIds, designSystemThemeGraph);
    selectedDesignNodeId = node?.id ?? selectedDesignNodeId;
    activeDesignCategory = node?.category ?? activeDesignCategory;
    writeDesignNomenclatureToUrl(activeDesignCategory, selectedDesignNodeId);
  }

  function selectDesignCategory(category: DesignSystemThemeCategory): void {
    activeDesignCategory = category;
    const categoryEntry = designSystemThemeGraph.categories.find((entry) => entry.category === category) ?? null;
    const firstNode = filterDesignCategoryNodes(categoryEntry, designSearchQuery)[0] ?? categoryEntry?.nodes[0] ?? null;

    if (firstNode) {
      selectedDesignNodeId = firstNode.id;
      selectedVisualElementId = null;
      selectedVisualNodeIds = [firstNode.id];
    }

    writeDesignNomenclatureToUrl(category, firstNode?.id ?? null);
  }

  function handleDesignSearchInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    designSearchQuery = input.value;

    if (!designSearchQuery.trim()) {
      return;
    }

    const activeHasMatch = filterDesignCategoryNodes(activeDesignCategoryEntry, designSearchQuery).length > 0;

    if (activeHasMatch) {
      return;
    }

    const nextCategory = designSystemThemeGraph.categories.find(
      (category) => filterDesignCategoryNodes(category, designSearchQuery).length > 0 || matchesSearchText(category.label, designSearchQuery)
    );

    if (nextCategory) {
      activeDesignCategory = nextCategory.category;
      const firstNode = filterDesignCategoryNodes(nextCategory, designSearchQuery)[0] ?? nextCategory.nodes[0] ?? null;
      selectedDesignNodeId = firstNode?.id ?? selectedDesignNodeId;
      selectedVisualNodeIds = firstNode ? [firstNode.id] : selectedVisualNodeIds;
    }
  }

  function clearDesignSearch(): void {
    designSearchQuery = '';
  }

  function updateDesignThemeRevealFromClientX(clientX: number): void {
    if (!designThemeRevealElement) {
      return;
    }

    const rect = designThemeRevealElement.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    designThemeRevealRatio = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  function handleDesignThemeRevealPointerDown(event: PointerEvent): void {
    event.preventDefault();
    isDesignThemeRevealDragging = true;
    updateDesignThemeRevealFromClientX(event.clientX);
  }

  function handleDesignThemeRevealPointerMove(event: PointerEvent): void {
    if (!isDesignThemeRevealDragging) {
      return;
    }

    event.preventDefault();
    updateDesignThemeRevealFromClientX(event.clientX);
  }

  function handleDesignThemeRevealPointerUp(): void {
    isDesignThemeRevealDragging = false;
  }

  function handleDesignThemeRevealKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 4;
    let nextRatio = designThemeRevealRatio;

    if (event.key === 'ArrowLeft') {
      nextRatio -= step;
    } else if (event.key === 'ArrowRight') {
      nextRatio += step;
    } else if (event.key === 'Home') {
      nextRatio = 0;
    } else if (event.key === 'End') {
      nextRatio = 100;
    } else {
      return;
    }

    event.preventDefault();
    designThemeRevealRatio = Math.min(100, Math.max(0, nextRatio));
  }

  function isDesignNodeHighlighted(node: DesignSystemThemeGraphNode): boolean {
    return (
      selectedDesignInspection?.relatedNodeIds.includes(node.id) ||
      selectedVisualNodeIds.includes(node.id) ||
      selectedDesignNode?.tokens.includes(node.id) ||
      node.tokens.includes(selectedDesignNode?.id ?? '')
    );
  }

  function isPreviewElementHighlighted(nodeIds: string[]): boolean {
    const inspectionIds = selectedDesignInspection?.relatedNodeIds ?? [];

    return nodeIds.some(
      (nodeId) =>
        selectedVisualNodeIds.includes(nodeId) ||
        inspectionIds.includes(nodeId) ||
        selectedDesignNode?.tokens.includes(nodeId) ||
        selectedDesignNode?.cssVariables.some((variable) => nodeId === variable)
    );
  }

  function syncDesignDraftStateFromSession(session: DesignSystemThemeSession | null): void {
    const sessionSignature = JSON.stringify(session ?? null);

    if (sessionSignature === observedDesignSystemThemeSessionSignature) {
      return;
    }

    observedDesignSystemThemeSessionSignature = sessionSignature;
    designDraftState = createDesignSystemThemeDraftStateFromSession(session);
  }

  function applyDesignDraftState(nextState: DesignSystemThemeDraftState): void {
    designDraftState = nextState;
    const nextSession = createDesignSystemThemeSessionFromDraftState(nextState, designSystemThemeSession?.mode ?? 'dark');
    observedDesignSystemThemeSessionSignature = JSON.stringify(nextSession);
    onDesignSystemThemeSessionChange(nextSession);
  }

  function updateDesignDraftValue(variable: string, value: string): void {
    applyDesignDraftState(setDesignSystemThemeDraftValue(designDraftState, variable, value));
  }

  function resetDesignDraftValue(variable: string): void {
    applyDesignDraftState(resetDesignSystemThemeDraftValue(designDraftState, variable));
  }

  function handleDesignDraftInput(variable: string, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    updateDesignDraftValue(variable, input.value);
  }

  function undoDesignDraft(): void {
    applyDesignDraftState(undoDesignSystemThemeDraft(designDraftState));
  }

  function redoDesignDraft(): void {
    applyDesignDraftState(redoDesignSystemThemeDraft(designDraftState));
  }

  function selectRegistryWorkbench(registryId: RegistryWorkbenchId): void {
    activeRegistryWorkbenchId = registryId;
    writeRegistryWorkbenchToUrl(registryId);
  }

  function resolveRegistryWorkbenchIdFromDocsTab(tab: TechnicalDocsTab): RegistryWorkbenchId {
    switch (tab) {
      case 'feature-graph':
        return 'features';
      case 'design-graph':
        return 'design';
      case 'registry':
        return 'quality';
      default:
        return isRegistryWorkbenchId(tab) ? tab : 'quality';
    }
  }

  function resolveInitialRegistryWorkbenchId(): RegistryWorkbenchId {
    if (typeof window === 'undefined') {
      return 'quality';
    }

    const route = parseWorkbenchRoute(window.location.href);
    const tab = route.kind === 'docs' && route.tab ? route.tab : null;

    if (tab === 'feature-graph') {
      return 'features';
    }

    if (tab === 'design-graph') {
      return 'design';
    }

    return isRegistryWorkbenchId(tab) ? tab : 'quality';
  }

  function resolveInitialDesignCategory(): DesignSystemThemeCategory {
    if (typeof window === 'undefined') {
      return 'theme';
    }

    const category = new URLSearchParams(window.location.search).get('designCategory');

    return isDesignThemeCategory(category) ? category : 'theme';
  }

  function resolveInitialDesignNodeId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const nodeId = new URLSearchParams(window.location.search).get('designNode');
    const knownNodeIds = new Set(designSystemThemeGraph.categories.flatMap((category) => category.nodes.map((node) => node.id)));

    return nodeId && knownNodeIds.has(nodeId) ? nodeId : null;
  }

  function writeRegistryWorkbenchToUrl(registryId: RegistryWorkbenchId): void {
    if (typeof window === 'undefined') {
      return;
    }

    const docsTab = resolveDocsRouteTabForRegistryWorkbench(registryId);
    const nextUrl = new URL(createWorkbenchRouteHref(window.location.href, { kind: 'docs', tab: docsTab }));

    if (nextUrl.toString() !== window.location.href) {
      window.history.pushState({ docsTab, registryId }, '', nextUrl.toString());
    }
  }

  function resolveDocsRouteTabForRegistryWorkbench(registryId: RegistryWorkbenchId): string | null {
    return registryId === 'quality' ? null : registryId;
  }

  function writeDesignNomenclatureToUrl(category: DesignSystemThemeCategory, nodeId: string | null): void {
    if (typeof window === 'undefined' || activeRegistryWorkbenchId !== 'design') {
      return;
    }

    const nextUrl = new URL(createWorkbenchRouteHref(window.location.href, { kind: 'docs', tab: 'design' }));
    nextUrl.searchParams.set('designCategory', category);

    if (nodeId) {
      nextUrl.searchParams.set('designNode', nodeId);
    } else {
      nextUrl.searchParams.delete('designNode');
    }

    if (nextUrl.toString() !== window.location.href) {
      window.history.pushState({ docsTab: 'design', designCategory: category, designNode: nodeId }, '', nextUrl.toString());
    }
  }

  function isTechnicalDocsTab(tab: string | null): tab is TechnicalDocsTab {
    return tab === 'feature-graph' || tab === 'design-graph' || tab === 'registry' || isRegistryWorkbenchId(tab);
  }

  function isRegistryWorkbenchId(value: string | null): value is RegistryWorkbenchId {
    return Boolean(value && registryWorkbenchIds.includes(value as RegistryWorkbenchId));
  }

  function isDesignThemeCategory(category: string | null): category is DesignSystemThemeCategory {
    return designSystemThemeGraph.categories.some((entry) => entry.category === category);
  }

  onMount(() => {
    datasetsMounted = true;

    function handleWindowPopState(): void {
      activeRegistryWorkbenchId = resolveInitialRegistryWorkbenchId();
      activeDesignCategory = resolveInitialDesignCategory();
      selectedDesignNodeId = resolveInitialDesignNodeId();
    }

    function handleDocsTabChange(event: Event): void {
      const nextTab = event instanceof CustomEvent ? event.detail?.tab : null;

      if (isTechnicalDocsTab(nextTab)) {
        const nextRegistryId = resolveRegistryWorkbenchIdFromDocsTab(nextTab);
        activeRegistryWorkbenchId = nextRegistryId;
      }
    }

    function handleDesignDraftKeyboard(event: KeyboardEvent): void {
      if (activeRegistryWorkbenchId !== 'design' || !(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey && designDraftStatus.canUndo) {
        event.preventDefault();
        undoDesignDraft();
      } else if ((key === 'y' || (key === 'z' && event.shiftKey)) && designDraftStatus.canRedo) {
        event.preventDefault();
        redoDesignDraft();
      }
    }

    window.addEventListener('popstate', handleWindowPopState);
    window.addEventListener('workbench-docs-tab-change', handleDocsTabChange);
    window.addEventListener('keydown', handleDesignDraftKeyboard);

    return () => {
      datasetsMounted = false;
      datasetObservation.dispose();
      window.removeEventListener('popstate', handleWindowPopState);
      window.removeEventListener('workbench-docs-tab-change', handleDocsTabChange);
      window.removeEventListener('keydown', handleDesignDraftKeyboard);
    };
  });
</script>

<svelte:window
  on:pointermove={handleTechnicalDocsPointerMove}
  on:pointerup={handleTechnicalDocsPointerUp}
  on:pointercancel={handleTechnicalDocsPointerUp}
/>

<TechnicalDocsLayout {viewTitle}>
  <svelte:fragment slot="status">
  {#if !themeDocument}
    <p role="status" data-docs-theme="unavailable">{$i18nT('ui.shell.docs.theme.unavailable')}</p>
  {/if}
  {#if !repoQualityEvaluation}
    <p role="status" data-docs-report="quality-unavailable">{$i18nT('ui.shell.docs.reports.qualityUnavailable')}</p>
  {/if}
  {#if !languageRegistryEvaluation}
    <p role="status" data-docs-report="language-unavailable">{$i18nT('ui.shell.docs.reports.languageUnavailable')}</p>
  {/if}
  {#if $datasetObservation.status !== 'ready'}
    <p role="status" data-docs-datasets={$datasetObservation.status}>
      {$i18nT(`ui.shell.docs.datasets.${$datasetObservation.status}`)}
    </p>
  {/if}
  </svelte:fragment>
  <TechnicalDocsRegistryWorkbenchLayout
    entries={registryWorkbenchEntries}
    activeId={activeRegistryWorkbenchId}
    onSelect={selectRegistryWorkbench}
  >

    {#if activeRegistryWorkbenchId === 'features'}
    <TechnicalDocsFeatureGraphSection
      {relationGraph}
      {selectedGraphFeature}
      t={$i18nT}
      {selectGraphFeature}
      {resolveGraphContextStyle}
      {resolveGraphFeatureStyle}
    />
    {/if}

    {#if activeRegistryWorkbenchId === 'design' && themeDocument}
    <TechnicalDocsDesignGraphSection
      t={$i18nT}
      {designSystemThemeGraph}
      {featureDesignImpacts}
      {designSystemDiscoveryProjection}
      {designSystemThemeRegistry}
      {designSystemContract}
      {designSystemThemeDocument}
      {designSystemThemeSyncPreview}
      {designDraftStatus}
      {designDraftPreviewText}
      {previewThemeStyle}
      {designSearchQuery}
      {designSearchResultCount}
      {designCategorySummaries}
      {activeDesignCategory}
      {activeDesignCategoryEntry}
      {activeDesignCategoryNodes}
      {selectedDesignNode}
      {selectedDesignInspection}
      {relatedDiscoveryEntities}
      {selectedVisualElementId}
      {selectedDesignConstructionLayers}
      {designThemeRevealRatio}
      bind:designThemeRevealElement
      {isDesignThemeRevealDragging}
      {designThemeRevealLayers}
      {designDraftValues}
      {handleDesignSearchInput}
      {clearDesignSearch}
      {selectDesignCategory}
      {isDesignNodeHighlighted}
      {selectDesignNode}
      {resolvePreviewCardKind}
      {selectVisualElement}
      {resolvePreviewThemeVariableValue}
      {isPreviewElementHighlighted}
      {summarizeDesignLayerItems}
      {handleDesignThemeRevealPointerDown}
      {handleDesignThemeRevealKeydown}
      {undoDesignDraft}
      {redoDesignDraft}
      {handleDesignDraftInput}
      {resetDesignDraftValue}
      {resolveThemeVariableValue}
      {resolveThemeVariableTargetValue}
    />
    {/if}

    {#if activeRegistryWorkbenchId === 'product'}
    <TechnicalDocsProductRegistrySection
      {productSidebarEntries}
      {activeProductCategoryId}
      {activeProductSidebarEntry}
      {activeProductCategoryItems}
      {selectedProductMapItem}
      {selectedProductInspectorPage}
      {selectedProductInspectorTemplate}
      {selectedProductNavigationDependencies}
      {productRenderScene}
      {productPropertiesTabs}
      bind:activeProductPropertiesTab
      {selectedProductProperties}
      {visibleProductArchitectureFindings}
      {productDocsProjectionStatus}
      productDocsProjectionStatusLabel={resolveProductArchitectureStatusLabel(productDocsProjectionStatus)}
      {productDocsProjectionError}
      {selectProductCategory}
      {selectProductMapItem}
      {selectProductRenderLayer}
      {resolveProductMapColumnIcon}
      {countProductInspectorFiles}
      {resolveProductInspectorExportName}
    />
    {/if}

    {#if activeRegistryWorkbenchId === 'archetypes'}
      <TechnicalDocsFeatureArchetypeMatrixSection
        matrix={featureArchetypeMatrix}
        sourceLabel="docs/generated/feature-archetype-matrix.json"
      />
    {/if}

    {#if activeRegistryWorkbenchId === 'semantic-graph'}
      <TechnicalDocsSemanticArchitectureGraphSection
        graph={semanticArchitectureGraph}
        sourceLabel="docs/generated/semantic-architecture-graph.json"
      />
    {/if}

    {#if activeRegistryWorkbenchId === 'architecture-projections'}
      <TechnicalDocsArchitectureProjectionSection
        graph={semanticArchitectureGraph}
        projectionDocument={architectureProjectionDocument}
        sourceLabel="docs/generated/architecture-projections.json"
      />
    {/if}

    {#if activeRegistryWorkbenchId !== 'features' && activeRegistryWorkbenchId !== 'design' && activeRegistryWorkbenchId !== 'product' && activeRegistryWorkbenchId !== 'archetypes' && activeRegistryWorkbenchId !== 'semantic-graph' && activeRegistryWorkbenchId !== 'architecture-projections'}
      {#if activeRegistryWorkbenchId === 'icons'}
      <TechnicalDocsIconRegistrySection
        {productIconScan}
        {productIconDebtCandidates}
        {productIconDebtGroups}
        {registryIconDefinitions}
        {registryIconCategories}
        {registryIconSetGroups}
        {registryIconToneGroups}
        {filteredRegistryIcons}
        {selectedRegistryIcon}
        {selectedRegistryIconUsage}
        {selectedRegistryIconUsageCount}
        {registryIconUsageAverage}
        {registryIconCodeSnippet}
        {registryIconCopyStatus}
        bind:registryIconSearch
        bind:registryIconCategoryFilter
        bind:registryIconToneFilter
        bind:registryIconViewMode
        bind:registryIconSize
        bind:selectedRegistryIconId
        {countRegistryIconUsage}
        {formatProductSourceLabel}
        {formatRegistryIconLabel}
        copyRegistryIconCode={copyRegistryIconCode}
      />
      {:else if activeRegistryWorkbenchId === 'shortcuts'}
      <ShortcutCatalogView
        variant="registry"
        {shortcutGroups}
        {totalShortcuts}
        {filteredShortcuts}
        {shortcutQuery}
        {shortcutScopeFilter}
        {shortcutTypeFilter}
        {shortcutScopeFilters}
        {shortcutTypeFilters}
        {onShortcutQueryChange}
        {onSelectShortcutScopeFilter}
        {onSelectShortcutTypeFilter}
      />
      {:else}
      {#if (activeRegistryWorkbenchId !== 'quality' || repoQualityEvaluation) && (activeRegistryWorkbenchId !== 'language' || languageRegistryEvaluation) && (activeRegistryWorkbenchId !== 'theme' || themeDocument)}
      <TechnicalDocsRegistryDatasetSection
        activeRegistryId={activeRegistryWorkbenchId}
        bind:query={registryWorkbenchSearch}
        rows={filteredRegistryWorkbenchRows}
        totalRows={registryWorkbenchRows.length}
        repoQualityGroups={filteredRepoQualityGroups}
        repoQualityFilteredRowCount={filteredRepoQualityRowCount}
        repoQualityTotalRowCount={repoQualityTotalRowCount}
        {repoQualitySummaryCards}
        {languageCoverageSummaryCards}
        languageLocales={languageRegistryEvaluation?.locales ?? []}
        icon={selectedRegistryWorkbench?.icon ?? 'docs.registry'}
        fallbackSource={selectedRegistryWorkbench?.source ?? 'source unavailable'}
      />
      {/if}
      {/if}

    {/if}
  </TechnicalDocsRegistryWorkbenchLayout>
</TechnicalDocsLayout>
