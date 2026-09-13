<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import ProductArchitectureFindingsPanel from '../product/ProductArchitectureFindingsPanel.svelte';
  import ProductRenderSituation from '../product/ProductRenderSituation.svelte';

  type ProductDocsFeature = {
    id: string;
    title: string;
    status: string;
    domain: string;
    context: string;
    summary: string;
  };

  type ProductDocsDesignNode = {
    id: string;
    title: string;
    status: string;
    category: string;
    summary: string;
  };

  type ProductDocsSourceEntity = {
    id: string;
    title: string;
    kind: string;
    sourceFile: string;
  };

  type ProductDocsTemplate = {
    id: string;
    title: string;
    role: string;
    routeScope: string;
    summary: string;
    featureIds: string[];
    designNodeIds: string[];
    slots: string[];
    features?: ProductDocsFeature[];
    designNodes?: ProductDocsDesignNode[];
    sourceEntities?: ProductDocsSourceEntity[];
  };

  type ProductDocsPage = {
    id: string;
    title: string;
    route: string;
    templateId: string;
    status: string;
    summary: string;
    featureIds: string[];
    designNodeIds: string[];
    entryPoints: Array<{ label: string; href: string; kind: string }>;
    config: string;
    features?: ProductDocsFeature[];
    designNodes?: ProductDocsDesignNode[];
    sourceEntities?: ProductDocsSourceEntity[];
  };

  type ProductArchitectureFindingSeverity = 'info' | 'warning' | 'danger';
  type ProductArchitectureFindingKind = 'oversized' | 'singleton' | 'duplication' | 'reuse';
  type ProductArchitectureFinding = {
    id: string;
    title: string;
    summary: string;
    kind: ProductArchitectureFindingKind;
    severity: ProductArchitectureFindingSeverity;
    count: number;
    sourceFile?: string;
    items: ProductDocsSourceEntity[];
  };

  type ProductMapTone = 'design' | 'runtime' | 'template' | 'product' | 'shared';
  type ProductMapItem = {
    id: string;
    title: string;
    subtitle: string;
    kind: string;
    tone: ProductMapTone;
    status: string;
    summary?: string;
    sourceFile?: string;
    tags: string[];
    dependencies: string[];
    consumers: string[];
  };

  type ProductMapColumn = {
    id: string;
    title: string;
    tone: ProductMapTone;
    summary: string;
    items: ProductMapItem[];
  };

  type ProductSidebarEntry = ProductMapColumn & {
    icon: WorkbenchIconInput;
  };

  type ProductTreeNode = {
    id: string;
    label: string;
    tone: ProductMapTone;
    badge?: string;
    sourceFile?: string;
    targetId?: string;
    children?: ProductTreeNode[];
  };

  type ProductFlatTreeNode = ProductTreeNode & {
    depth: number;
  };

  type ProductRenderSurfaceMode = 'real' | 'projection';
  type ProductRenderWireframeSlot = {
    id: string;
    label: string;
    role: string;
    tone: ProductMapTone;
    source: string;
    targetId?: string;
  };
  type ProductRenderLayoutArea = 'toolbar' | 'left' | 'workspace' | 'right' | 'footer' | 'auto';
  type ProductRenderLayoutVariant = 'app-shell' | 'isolated' | 'standard';
  type ProductRenderLayoutSlot = ProductRenderWireframeSlot & {
    area: ProductRenderLayoutArea;
  };
  type ProductRenderComponentGroup = {
    label: string;
    tone: ProductMapTone;
    items: ProductRenderWireframeSlot[];
  };
  type ProductRenderEngineScene = {
    title: string;
    summary: string;
    mode: ProductRenderSurfaceMode;
    resolution: string;
    theme: string;
    slots: ProductRenderWireframeSlot[];
    layoutSlots: ProductRenderLayoutSlot[];
    layoutVariant: ProductRenderLayoutVariant;
    componentGroups: ProductRenderComponentGroup[];
    compositionRows: ProductFlatTreeNode[];
    template: ProductDocsTemplate | null;
    designNodes: unknown[];
    compositionItems: ProductMapItem[];
    menuEntries: Array<{ label: string; href: string; status: string }>;
    metadata: Array<{ label: string; value: string }>;
  };

  type ProductPropertiesModel = {
    computed: Array<{ label: string; value: string }>;
    box: {
      margin: string;
      border: string;
      padding: string;
      content: string;
    };
  };

  type ProductPropertiesTab = 'computed' | 'styles' | 'events' | 'attributes' | 'data';
  type ProductDocsProjectionStatus = 'fallback' | 'loading' | 'live' | 'error';

  export let productSidebarEntries: ProductSidebarEntry[] = [];
  export let activeProductCategoryId = 'routes';
  export let activeProductSidebarEntry: ProductMapColumn | null | undefined = null;
  export let activeProductCategoryItems: ProductMapItem[] = [];
  export let selectedProductMapItem: ProductMapItem | null = null;
  export let selectedProductInspectorPage: ProductDocsPage | null = null;
  export let selectedProductInspectorTemplate: ProductDocsTemplate | null = null;
  export let selectedProductNavigationDependencies: ProductTreeNode[] = [];
  export let productRenderScene: ProductRenderEngineScene;
  export let productPropertiesTabs: Array<{ id: ProductPropertiesTab; label: string }> = [];
  export let activeProductPropertiesTab: ProductPropertiesTab = 'computed';
  export let selectedProductProperties: ProductPropertiesModel;
  export let visibleProductArchitectureFindings: ProductArchitectureFinding[] = [];
  export let productDocsProjectionStatus: ProductDocsProjectionStatus = 'fallback';
  export let productDocsProjectionStatusLabel = 'fallback';
  export let productDocsProjectionError: string | null = null;

  export let selectProductCategory: (categoryId: string) => void = () => undefined;
  export let selectProductMapItem: (itemId: string) => void = () => undefined;
  export let selectProductRenderLayer: (itemId: string, layerId: string) => void = () => undefined;
  export let resolveProductMapColumnIcon: (columnId: string) => WorkbenchIconInput = () => 'docs.registry';
  export let countProductInspectorFiles: (page: ProductDocsPage, template: ProductDocsTemplate | null) => number | string = () => '-';
  export let resolveProductInspectorExportName: (page: ProductDocsPage) => string = (page) => page.title;
</script>

<section class="technical-docs-view__product" aria-label="Product configuration">
  <section class="technical-docs-view__product-detail" data-tone={selectedProductMapItem?.tone ?? 'shared'} aria-label="Product selection detail">
    <div class="technical-docs-view__product-detail-body">
        <aside class="technical-docs-view__product-detail-list" aria-label="Category elements">
          <section class="technical-docs-view__product-sidebar-section">
            <h4>Catégories</h4>
            <div class="technical-docs-view__product-category-list">
              {#each productSidebarEntries as entry (entry.id)}
                <button
                  type="button"
                  class="technical-docs-view__product-category-button"
                  data-tone={entry.tone}
                  class:technical-docs-view__product-category-button--active={activeProductCategoryId === entry.id}
                  aria-current={activeProductCategoryId === entry.id ? 'true' : undefined}
                  on:click={() => selectProductCategory(entry.id)}
                >
                  <WorkbenchIcon icon={entry.icon} label={entry.title} />
                  <strong>{entry.title}</strong>
                  <span>{entry.items.length}</span>
                </button>
              {/each}
            </div>
          </section>

          <section class="technical-docs-view__product-detail-list-section">
            <header>
              <span>{activeProductSidebarEntry?.title ?? 'Elements'}</span>
              <em>{activeProductCategoryItems.length} items</em>
            </header>
            <div class="technical-docs-view__product-detail-items">
              {#each activeProductCategoryItems as item (item.id)}
                <button
                  type="button"
                  class:technical-docs-view__product-detail-list-item--active={selectedProductMapItem?.id === item.id}
                  on:click={() => selectProductMapItem(item.id)}
                >
                  <span></span>
                  <strong>{item.title}</strong>
                  <em>{item.kind}</em>
                </button>
              {/each}
              {#if activeProductCategoryItems.length === 0}
                <p>Aucun item pour ce filtre.</p>
              {/if}
            </div>
          </section>

          <section class="technical-docs-view__product-selection-card" data-tone={selectedProductMapItem?.tone ?? 'shared'} aria-label="Selected product element">
            <header>
              <span class="technical-docs-view__product-selection-icon">
                <WorkbenchIcon icon={resolveProductMapColumnIcon(activeProductCategoryId)} label={selectedProductMapItem?.kind ?? 'Element'} />
              </span>
              <div>
                <strong>{selectedProductMapItem?.title ?? 'No selection'}</strong>
                <code>{selectedProductMapItem?.sourceFile ?? selectedProductMapItem?.subtitle ?? 'No source file'}</code>
              </div>
              <em>{selectedProductMapItem?.kind ?? 'Element'}</em>
            </header>

            <section>
              <h5>Informations</h5>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedProductMapItem?.kind ?? '-'}</dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{selectedProductInspectorPage?.route ?? selectedProductMapItem?.subtitle ?? '-'}</dd>
                </div>
                <div>
                  <dt>Template</dt>
                  <dd>{selectedProductInspectorTemplate?.title ?? productRenderScene.template?.title ?? '-'}</dd>
                </div>
                <div>
                  <dt>Fichiers</dt>
                  <dd>{selectedProductInspectorPage ? countProductInspectorFiles(selectedProductInspectorPage, selectedProductInspectorTemplate) : productRenderScene.metadata.find((row) => row.label === 'Fichiers')?.value ?? '-'}</dd>
                </div>
                <div>
                  <dt>Exports</dt>
                  <dd>{selectedProductInspectorPage ? resolveProductInspectorExportName(selectedProductInspectorPage) : selectedProductMapItem?.title ?? '-'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h5>Arbre de page</h5>
              <div class="technical-docs-view__product-selection-tree">
                {#each productRenderScene.compositionRows.slice(0, 7) as row (row.id)}
                  <button
                    type="button"
                    data-tone={row.tone}
                    style={`--product-tree-depth: ${row.depth}`}
                    disabled={!row.targetId}
                    on:click={() => row.targetId && selectProductMapItem(row.targetId)}
                  >
                    <span></span>
                    <strong>{row.label}</strong>
                    <em>{row.badge}</em>
                  </button>
                {/each}
              </div>
            </section>

            <section>
              <h5>Dépendances <em>{selectedProductNavigationDependencies.length}</em></h5>
              <div class="technical-docs-view__product-selection-tree">
                {#each selectedProductNavigationDependencies.slice(0, 5) as dependency (dependency.id)}
                  <button
                    type="button"
                    data-tone={dependency.tone}
                    disabled={!dependency.targetId}
                    on:click={() => dependency.targetId && selectProductMapItem(dependency.targetId)}
                  >
                    <span></span>
                    <strong>{dependency.label}</strong>
                    <em>{dependency.badge}</em>
                  </button>
                {:else}
                  <p>Aucune dépendance déclarée.</p>
                {/each}
              </div>
            </section>
          </section>
        </aside>

        <section class="technical-docs-view__product-render-stage">
          <ProductRenderSituation
            scene={productRenderScene}
            on:select={(event) => selectProductRenderLayer(event.detail.itemId, event.detail.layerId)}
          />
        </section>

        <aside class="technical-docs-view__product-detail-side">
          <article class="technical-docs-view__product-properties">
            <header>
              <div>
                <span>Properties</span>
                <strong>{selectedProductMapItem?.title ?? 'Selection'}</strong>
              </div>
              <button type="button" aria-label="Close properties">
                <WorkbenchIcon icon="action.close" label="Close" />
              </button>
            </header>

            <div class="technical-docs-view__product-properties-tabs" role="tablist" aria-label="Properties views">
              {#each productPropertiesTabs as tab (tab.id)}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProductPropertiesTab === tab.id}
                  class:technical-docs-view__product-properties-tab--active={activeProductPropertiesTab === tab.id}
                  on:click={() => (activeProductPropertiesTab = tab.id)}
                >
                  {tab.label}
                </button>
              {/each}
            </div>

            {#if activeProductPropertiesTab === 'computed'}
              <div class="technical-docs-view__product-properties-body">
                <dl class="technical-docs-view__product-properties-computed">
                  {#each selectedProductProperties.computed as row (row.label)}
                    <div><dt>{row.label}</dt><dd>{row.value}</dd></div>
                  {/each}
                </dl>

                <section class="technical-docs-view__product-box-model" aria-label="Box model">
                  <h5>Box Model</h5>
                  <div>
                    <span class="technical-docs-view__product-box-model-margin">margin {selectedProductProperties.box.margin}</span>
                    <span class="technical-docs-view__product-box-model-border">border {selectedProductProperties.box.border}</span>
                    <span class="technical-docs-view__product-box-model-padding">padding {selectedProductProperties.box.padding}</span>
                    <strong>{selectedProductProperties.box.content}</strong>
                  </div>
                </section>
              </div>
            {:else if activeProductPropertiesTab === 'styles'}
              <div class="technical-docs-view__product-properties-list">
                <code>tone: {selectedProductMapItem?.tone ?? 'shared'}</code>
                <code>status: {selectedProductMapItem?.status ?? 'idle'}</code>
                <code>template: {productRenderScene.template?.title ?? 'none'}</code>
              </div>
            {:else if activeProductPropertiesTab === 'events'}
              <div class="technical-docs-view__product-properties-list">
                {#each productRenderScene.menuEntries as entry (entry.href)}
                  <code>navigate -> {entry.href}</code>
                {:else}
                  <span>Aucun event déclaré.</span>
                {/each}
              </div>
            {:else if activeProductPropertiesTab === 'attributes'}
              <div class="technical-docs-view__product-properties-list">
                <code>data-tone="{selectedProductMapItem?.tone ?? 'shared'}"</code>
                <code>data-kind="{selectedProductMapItem?.kind ?? 'Element'}"</code>
                <code>aria-label="{selectedProductMapItem?.title ?? 'Selection'}"</code>
              </div>
            {:else}
              <div class="technical-docs-view__product-properties-list">
                {#each productRenderScene.metadata as row (row.label)}
                  <code>{row.label}: {row.value}</code>
                {/each}
              </div>
            {/if}
          </article>

          <ProductArchitectureFindingsPanel
            findings={visibleProductArchitectureFindings}
            status={productDocsProjectionStatus}
            statusLabel={productDocsProjectionStatusLabel}
            error={productDocsProjectionError}
          />
        </aside>
      </div>

  </section>
</section>

<style>
  .technical-docs-view__product {
    min-height: 0;
    overflow: auto;
  }

  .technical-docs-view__product-sidebar-section {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__product-sidebar-section h4 {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .technical-docs-view__product-category-list {
    display: grid;
    gap: var(--space-5);
    min-width: 0;
  }

  .technical-docs-view__product-category-button {
    position: relative;
    display: grid;
    align-items: center;
    gap: var(--space-7);
    min-width: 0;
    min-height: 2rem;
    border: 1px solid transparent;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .technical-docs-view__product-category-button {
    grid-template-columns: 1rem minmax(0, 1fr) max-content;
    padding: 0 var(--space-7);
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
  }

  .technical-docs-view__product-category-button:hover,
  .technical-docs-view__product-category-button--active {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 72%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 14%, var(--color-background-muted));
  }

  .technical-docs-view__product-category-button--active {
    color: var(--color-text-primary);
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 28%, transparent), transparent 58%),
      color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, var(--color-background-elevated));
    box-shadow:
      inset 3px 0 0 var(--product-tone-color, var(--color-action-primary)),
      0 0 0 1px color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, transparent);
  }

  .technical-docs-view__product-category-button--active :global(svg) {
    color: var(--product-tone-color, var(--color-action-primary));
  }

  .technical-docs-view__product-category-button :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .technical-docs-view__product-category-button strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-category-button strong {
    color: var(--color-text-primary);
    font-size: 0.75rem;
  }

  .technical-docs-view__product-category-button > span {
    display: grid;
    place-items: center;
    min-width: 1.35rem;
    min-height: 1.35rem;
    padding: 0 var(--space-4);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, transparent);
    color: var(--color-text-muted);
    font-size: 0.65rem;
    font-weight: 800;
  }

  .technical-docs-view__product-category-button--active > span {
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 36%, var(--color-background-canvas));
    color: var(--color-text-primary);
  }

  .technical-docs-view__product-detail {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .technical-docs-view__product-detail-list header span,
  .technical-docs-view__product-selection-card h5,
  .technical-docs-view__product-properties h5 {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__product-detail-body {
    display: grid;
    gap: var(--space-12);
    grid-template-columns: minmax(15rem, 0.34fr) minmax(24rem, 1fr) minmax(17rem, 0.48fr);
    align-items: stretch;
    min-height: 0;
    min-width: 0;
    height: 100%;
  }

  .technical-docs-view__product-detail-list,
  .technical-docs-view__product-detail-side article {
    display: grid;
    align-content: start;
    gap: var(--space-10);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 36%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 64%, transparent);
  }

  .technical-docs-view__product-detail-side {
    display: grid;
    align-content: stretch;
    gap: var(--space-8);
    grid-template-rows: minmax(18rem, 1fr) auto;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
    overflow: auto;
  }

  .technical-docs-view__product-detail-list {
    display: flex;
    flex-direction: column;
    align-content: initial;
    gap: var(--space-12);
    height: 100%;
    overflow: auto;
  }

  .technical-docs-view__product-detail-list-section {
    display: grid;
    align-content: start;
    gap: var(--space-8);
    flex: 0 0 auto;
    min-width: 0;
    max-height: 34%;
    min-height: 0;
    overflow: auto;
  }

  .technical-docs-view__product-selection-card {
    display: grid;
    align-content: start;
    gap: var(--space-10);
    flex: 1 1 auto;
    min-width: 0;
    min-height: 14rem;
    overflow: auto;
    padding-top: var(--space-8);
    border-top: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 22%, var(--color-border-subtle));
  }

  .technical-docs-view__product-selection-card > header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-8);
  }

  .technical-docs-view__product-selection-card > header div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .technical-docs-view__product-selection-card > header strong,
  .technical-docs-view__product-selection-card > header code,
  .technical-docs-view__product-selection-card dd,
  .technical-docs-view__product-selection-tree strong,
  .technical-docs-view__product-selection-tree em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-selection-card > header strong {
    color: var(--color-text-primary);
    font-size: 0.8rem;
  }

  .technical-docs-view__product-selection-card > header code {
    color: var(--color-text-muted);
    font-size: 0.64rem;
  }

  .technical-docs-view__product-selection-card > header em {
    padding: 0.12rem var(--space-5);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 14%, transparent);
    color: var(--product-tone-color, var(--color-action-primary));
    font-size: 0.62rem;
    font-style: normal;
    font-weight: 800;
  }

  .technical-docs-view__product-selection-icon {
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 38%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 10%, transparent);
    color: var(--product-tone-color, var(--color-action-primary));
  }

  .technical-docs-view__product-selection-card section {
    display: grid;
    gap: var(--space-6);
    min-width: 0;
  }

  .technical-docs-view__product-selection-card h5 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
  }

  .technical-docs-view__product-selection-card h5 em {
    color: var(--color-text-muted);
    font-style: normal;
  }

  .technical-docs-view__product-selection-card dl {
    display: grid;
    gap: var(--space-5);
    margin: 0;
  }

  .technical-docs-view__product-selection-card dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__product-selection-card dt,
  .technical-docs-view__product-selection-card dd {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.68rem;
  }

  .technical-docs-view__product-selection-card dd {
    max-width: 12rem;
    text-align: right;
  }

  .technical-docs-view__product-detail-list header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .technical-docs-view__product-detail-list header em,
  .technical-docs-view__product-detail-list p,
  .technical-docs-view__product-selection-card p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__product-detail-items,
  .technical-docs-view__product-selection-tree {
    display: grid;
    align-content: start;
    gap: var(--space-5);
    min-height: 0;
    overflow: auto;
  }

  .technical-docs-view__product-detail-list button {
    display: grid;
    align-items: center;
    gap: var(--space-6);
    grid-template-columns: 0.75rem minmax(0, 1fr) max-content;
    min-width: 0;
    min-height: 2rem;
    padding: 0 var(--space-6);
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 24%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 52%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .technical-docs-view__product-detail-list button:hover,
  .technical-docs-view__product-detail-list-item--active {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 68%, var(--color-border-subtle)) !important;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 13%, var(--color-background-muted)) !important;
  }

  .technical-docs-view__product-detail-list button > span {
    width: 0.65rem;
    height: 0.65rem;
    border: 2px solid var(--product-tone-color, var(--color-action-primary));
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 30%, transparent);
  }

  .technical-docs-view__product-detail-list button strong,
  .technical-docs-view__product-detail-list button em,
  .technical-docs-view__product-properties code,
  .technical-docs-view__product-properties strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-detail-list button em {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__product-selection-tree button {
    min-height: 1.55rem;
    padding: 0 var(--space-5) 0 calc(var(--space-5) + var(--product-tree-depth, 0) * 0.8rem);
  }

  .technical-docs-view__product-selection-tree button:not(:disabled):hover {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 54%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 11%, var(--color-background-muted));
  }

  .technical-docs-view__product-selection-tree button:disabled {
    cursor: default;
    opacity: 0.72;
  }

  .technical-docs-view__product-render-stage,
  .technical-docs-view__product-detail-side article {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 28%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 56%, transparent);
  }

  .technical-docs-view__product-detail-side h5 {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__product-render-stage {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .technical-docs-view__product-properties {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: var(--space-8);
    height: 100%;
    overflow: hidden;
  }

  .technical-docs-view__product-properties > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__product-properties > header div {
    min-width: 0;
    display: grid;
    gap: var(--space-2);
  }

  .technical-docs-view__product-properties > header span {
    color: var(--color-text-muted);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .technical-docs-view__product-properties > header strong {
    color: var(--color-text-primary);
    font-size: 0.84rem;
  }

  .technical-docs-view__product-properties > header button {
    display: grid;
    place-items: center;
    width: 1.65rem;
    height: 1.65rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 52%, transparent);
    color: var(--color-text-muted);
  }

  .technical-docs-view__product-properties-tabs {
    display: flex;
    gap: var(--space-4);
    min-width: 0;
    overflow: auto;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__product-properties-tabs button {
    min-height: 1.8rem;
    padding: 0 var(--space-7);
    border: 1px solid transparent;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: 0.7rem;
    font-weight: 760;
    cursor: pointer;
  }

  .technical-docs-view__product-properties-tab--active {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 50%, var(--color-border-subtle)) !important;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 16%, var(--color-background-muted)) !important;
    color: var(--color-text-primary) !important;
  }

  .technical-docs-view__product-properties-body {
    display: grid;
    gap: var(--space-10);
    grid-template-columns: minmax(0, 0.9fr) minmax(10rem, 1fr);
    min-height: 0;
    overflow: auto;
  }

  .technical-docs-view__product-properties-computed,
  .technical-docs-view__product-properties-list {
    display: grid;
    align-content: start;
    gap: var(--space-5);
    margin: 0;
    min-width: 0;
  }

  .technical-docs-view__product-properties-computed div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__product-properties-computed dt,
  .technical-docs-view__product-properties-computed dd {
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-properties-computed dd {
    color: var(--color-text-primary);
  }

  .technical-docs-view__product-properties-list {
    overflow: auto;
  }

  .technical-docs-view__product-properties-list code,
  .technical-docs-view__product-properties-list span {
    overflow: hidden;
    padding: var(--space-5) var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-box-model {
    display: grid;
    align-content: start;
    gap: var(--space-6);
    min-width: 0;
  }

  .technical-docs-view__product-box-model > div {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 11.5rem;
    border: 1px solid color-mix(in srgb, #d69a3d 58%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background:
      linear-gradient(180deg, color-mix(in srgb, #d69a3d 28%, transparent), color-mix(in srgb, #d69a3d 16%, transparent)),
      color-mix(in srgb, var(--color-background-muted) 70%, transparent);
  }

  .technical-docs-view__product-box-model > div::before,
  .technical-docs-view__product-box-model > div::after {
    position: absolute;
    border: 1px solid color-mix(in srgb, #d6c25f 72%, transparent);
    border-radius: var(--radius-small);
    content: '';
  }

  .technical-docs-view__product-box-model > div::before {
    inset: 2.1rem;
    background: color-mix(in srgb, #d6c25f 18%, transparent);
  }

  .technical-docs-view__product-box-model > div::after {
    inset: 4rem 3.5rem;
    background: color-mix(in srgb, var(--color-action-primary) 24%, transparent);
  }

  .technical-docs-view__product-box-model span,
  .technical-docs-view__product-box-model strong {
    position: relative;
    z-index: 1;
    color: var(--color-text-primary);
    font-size: 0.68rem;
    font-weight: 760;
  }

  .technical-docs-view__product-box-model-margin {
    position: absolute !important;
    top: var(--space-6);
  }

  .technical-docs-view__product-box-model-border {
    position: absolute !important;
    top: 2.75rem;
  }

  .technical-docs-view__product-box-model-padding {
    position: absolute !important;
    top: 4.3rem;
  }


  @media (max-width: 1100px) {
    .technical-docs-view__product-detail-body,
    .technical-docs-view__product-properties-body {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 640px) {
    .technical-docs-view__product-detail-body,
    .technical-docs-view__product-properties-body {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  [data-tone='design'] {
    --product-tone-color: #8fbf5d;
  }

  [data-tone='runtime'] {
    --product-tone-color: #d69a3d;
  }

  [data-tone='template'] {
    --product-tone-color: #9b75db;
  }

  [data-tone='product'] {
    --product-tone-color: #6f95e8;
  }

  [data-tone='shared'] {
    --product-tone-color: #8b98a8;
  }
</style>
