<script lang="ts">
  import type { WorkbenchIconInput, WorkbenchIconTone } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import type { WorkbenchIconDefinition } from '../../icons/iconRegistry';

  type ProductIconScanEntry = {
    sourceFile: string;
    line?: number;
    category: string;
    suggestedIconId: string;
    context?: string;
    bytes?: number;
  };

  type ProductIconScanProjection = {
    generatedAt?: string | null;
    roots: string[];
    totals: {
      svgFiles: number;
      inlineSvg: number;
      scannedFiles: number;
    };
    svgFiles: ProductIconScanEntry[];
    inlineSvg: ProductIconScanEntry[];
  };

  type RegistryIconCategory = {
    id: string;
    label: string;
    count: number;
  };

  type RegistryIconToneGroup = {
    id: WorkbenchIconTone;
    label: string;
    count: number;
  };

  type RegistryIconSetGroup = {
    id: string;
    label: string;
    count: number;
    tone: WorkbenchIconTone;
  };

  export let productIconScan: ProductIconScanProjection | null = null;
  export let productIconDebtCandidates: ProductIconScanEntry[] = [];
  export let productIconDebtGroups: unknown[] = [];
  export let registryIconDefinitions: WorkbenchIconDefinition[] = [];
  export let registryIconCategories: RegistryIconCategory[] = [];
  export let registryIconSetGroups: RegistryIconSetGroup[] = [];
  export let registryIconToneGroups: RegistryIconToneGroup[] = [];
  export let filteredRegistryIcons: WorkbenchIconDefinition[] = [];
  export let selectedRegistryIcon: WorkbenchIconDefinition | null = null;
  export let selectedRegistryIconUsage: ProductIconScanEntry[] = [];
  export let selectedRegistryIconUsageCount = 0;
  export let registryIconUsageAverage = 0;
  export let registryIconCodeSnippet = '';
  export let registryIconCopyStatus = '';

  export let registryIconSearch = '';
  export let registryIconCategoryFilter = 'all';
  export let registryIconToneFilter: WorkbenchIconTone | 'all' = 'all';
  export let registryIconViewMode: 'grid' | 'list' = 'grid';
  export let registryIconSize = 24;
  export let selectedRegistryIconId: string | null = null;

  export let countRegistryIconUsage: (icon: WorkbenchIconDefinition, scan: ProductIconScanProjection | null) => number = () => 0;
  export let formatProductSourceLabel: (sourceFile: string) => string = (sourceFile) => sourceFile;
  export let formatRegistryIconLabel: (value: string) => string = (value) => value;
  export let copyRegistryIconCode: () => void | Promise<void> = () => undefined;

  const variantSizes = [16, 20, 24, 32, 40];

  function resolveCategoryIcon(categoryId: string): WorkbenchIconInput {
    if (categoryId === 'docs') return 'docs.registry';
    if (categoryId === 'design') return 'design.atom';
    if (categoryId === 'runtime') return 'runtime.engine';
    if (categoryId === 'tool') return 'tool.inspector';
    return 'action.menu';
  }

  function resetFilters(): void {
    registryIconSearch = '';
    registryIconCategoryFilter = 'all';
    registryIconToneFilter = 'all';
  }

  function resolveTonePercent(toneCount: number): string {
    return `${Math.round((toneCount / Math.max(registryIconDefinitions.length, 1)) * 100)}%`;
  }
</script>

<section class="technical-docs-view__icon-registry" aria-label="Icon registry">
  <header class="technical-docs-view__icon-registry-top">
    <div class="technical-docs-view__icon-registry-title">
      <span class="technical-docs-view__icon-registry-mark">
        <WorkbenchIcon icon="docs.registry" label="Icon Registry" />
      </span>
      <div>
        <span>Registry / Icons</span>
        <strong>Icon Registry</strong>
        <em>Bibliothèque globale des icônes du design system.</em>
      </div>
    </div>
    <div class="technical-docs-view__icon-registry-actions">
      <button type="button"><WorkbenchIcon icon="action.detach" label="Exporter" /> Exporter</button>
      <button type="button"><WorkbenchIcon icon="action.reset" label="Sync" /> Sync</button>
      <button type="button"><WorkbenchIcon icon="action.settings" label="Settings" /> Settings</button>
      <span>{productIconScan ? `${productIconScan.totals.inlineSvg} inline / ${productIconScan.totals.svgFiles} files` : 'scan unavailable'}</span>
    </div>
  </header>

  <div class="technical-docs-view__icon-registry-stats">
    <article data-tone="product">
      <span>Icônes totales</span>
      <strong>{registryIconDefinitions.length}</strong>
      <em>{registryIconCategories.length} catégories</em>
    </article>
    <article data-tone="shared">
      <span>SVG files</span>
      <strong>{productIconScan?.totals.svgFiles ?? 0}</strong>
      <em>{productIconScan ? 'scan registry' : 'unavailable'}</em>
    </article>
    <article data-tone="runtime">
      <span>Inline SVG</span>
      <strong>{productIconScan?.totals.inlineSvg ?? 0}</strong>
      <em>{productIconScan?.totals.scannedFiles ?? 0} files scanned</em>
    </article>
    <article data-tone="design">
      <span>Candidates</span>
      <strong>{productIconDebtCandidates.length}</strong>
      <em>{productIconDebtGroups.length} groupes</em>
    </article>
    <article data-tone="template">
      <span>Utilisation moyenne</span>
      <strong>{registryIconUsageAverage}%</strong>
      <em>{filteredRegistryIcons.length} visibles</em>
    </article>
  </div>

  <div class="technical-docs-view__icon-registry-layout">
    <aside class="technical-docs-view__icon-registry-rail" aria-label="Icon registry navigation">
      <section>
        <strong>Library</strong>
        <button type="button" class:technical-docs-view__icon-registry-filter--active={registryIconCategoryFilter === 'all'} on:click={() => (registryIconCategoryFilter = 'all')}>
          <WorkbenchIcon icon="docs.page" label="Overview" /> Overview <span>{registryIconDefinitions.length}</span>
        </button>
        {#each registryIconCategories as category (category.id)}
          <button type="button" class:technical-docs-view__icon-registry-filter--active={registryIconCategoryFilter === category.id} on:click={() => (registryIconCategoryFilter = category.id)}>
            <WorkbenchIcon icon={resolveCategoryIcon(category.id)} label={category.label} />
            {category.label}
            <span>{category.count}</span>
          </button>
        {/each}
      </section>

      <section>
        <strong>Sets</strong>
        {#each registryIconSetGroups as set (set.id)}
          <button type="button" data-tone={set.tone} class:technical-docs-view__icon-registry-filter--active={registryIconToneFilter === set.tone} on:click={() => (registryIconToneFilter = set.tone)}>
            <WorkbenchIcon icon="docs.registry" label={set.label} />
            {set.label}
            <span>{set.count}</span>
          </button>
        {/each}
      </section>

      <button type="button" class="technical-docs-view__icon-registry-audit">
        <WorkbenchIcon icon="status.success" label="Audit" />
        Audit & Cleanup
      </button>
    </aside>

    <main class="technical-docs-view__icon-registry-main">
      <div class="technical-docs-view__icon-registry-toolbar">
        <label>
          <WorkbenchIcon icon="action.search" label="Search" />
          <input type="search" bind:value={registryIconSearch} placeholder="Rechercher une icône..." />
        </label>
        <div>
          <button type="button" class:technical-docs-view__icon-registry-filter--active={registryIconViewMode === 'grid'} on:click={() => (registryIconViewMode = 'grid')}>
            <WorkbenchIcon icon="action.command-palette" label="Grid" />
          </button>
          <button type="button" class:technical-docs-view__icon-registry-filter--active={registryIconViewMode === 'list'} on:click={() => (registryIconViewMode = 'list')}>
            <WorkbenchIcon icon="action.menu" label="List" />
          </button>
        </div>
        <input type="range" min="16" max="40" step="2" bind:value={registryIconSize} aria-label="Icon preview size" />
        <span>{registryIconSize}px</span>
      </div>

      <section class="technical-docs-view__icon-registry-preview" aria-label="Library preview">
        <header>
          <div>
            <strong>Library Preview</strong>
            <span>Mode · size · tone · category</span>
          </div>
          <button type="button" on:click={resetFilters}>Réinitialiser</button>
        </header>
        <div class="technical-docs-view__icon-registry-tabs">
          <span>Duotone</span>
          <span>Outline</span>
          <span>Filled</span>
          <span>Multicolor</span>
        </div>
        <div class={`technical-docs-view__icon-registry-grid technical-docs-view__icon-registry-grid--${registryIconViewMode}`}>
          {#each filteredRegistryIcons as icon (icon.id)}
            <button
              type="button"
              data-tone={icon.tone}
              class:technical-docs-view__icon-registry-tile--selected={selectedRegistryIcon?.id === icon.id}
              title={`${icon.title} · ${icon.id}`}
              on:click={() => (selectedRegistryIconId = icon.id)}
            >
              <span class="technical-docs-view__icon-registry-symbol" style={`font-size: ${registryIconSize}px`}>
                <WorkbenchIcon icon={icon.id} label={icon.title} />
              </span>
              <strong>{icon.title}</strong>
              <em>{countRegistryIconUsage(icon, productIconScan)} usages</em>
            </button>
          {:else}
            <p class="technical-docs-view__product-empty">Aucune icône ne correspond aux filtres actifs.</p>
          {/each}
        </div>
        <div class="technical-docs-view__icon-registry-chipbar">
          <button type="button" class:technical-docs-view__icon-registry-filter--active={registryIconToneFilter === 'all'} on:click={() => (registryIconToneFilter = 'all')}>Tous</button>
          {#each registryIconToneGroups as tone (tone.id)}
            <button type="button" data-tone={tone.id} class:technical-docs-view__icon-registry-filter--active={registryIconToneFilter === tone.id} on:click={() => (registryIconToneFilter = tone.id)}>
              {tone.label}{tone.count}
            </button>
          {/each}
        </div>
      </section>

      <div class="technical-docs-view__icon-registry-bottom">
        <section>
          <header>
            <strong>Usage Overview</strong>
            <span>Utilisation par set</span>
          </header>
          <div class="technical-docs-view__icon-registry-donut">
            <strong>{registryIconDefinitions.length}</strong>
            <span>Total</span>
          </div>
          <div class="technical-docs-view__icon-registry-bars">
            {#each registryIconToneGroups.slice(0, 5) as tone (tone.id)}
              <p data-tone={tone.id}>
                <span>{tone.label}</span>
                <i style={`--registry-icon-percent: ${resolveTonePercent(tone.count)}`}></i>
                <em>{tone.count}</em>
              </p>
            {/each}
          </div>
        </section>

        <section>
          <header>
            <strong>Usage ({selectedRegistryIconUsageCount})</strong>
            <span>{selectedRegistryIcon?.title ?? 'No icon selected'}</span>
          </header>
          <div class="technical-docs-view__icon-registry-table">
            {#each selectedRegistryIconUsage as usage (`${usage.sourceFile}:${usage.line}:${usage.context}`)}
              <article>
                <WorkbenchIcon icon="docs.page" label="File" />
                <strong>{formatProductSourceLabel(usage.sourceFile)}</strong>
                <span>{usage.category}</span>
                <code>line {usage.line}</code>
              </article>
            {:else}
              <article>
                <WorkbenchIcon icon="status.warning" label="No usage" />
                <strong>No usage found in scan</strong>
                <span>Registry only</span>
                <code>{selectedRegistryIcon?.designNodeId ?? 'no design binding'}</code>
              </article>
            {/each}
          </div>
        </section>

        <section>
          <header>
            <strong>Dépendances</strong>
            <span>{productIconDebtCandidates.length} candidates</span>
          </header>
          <div class="technical-docs-view__icon-registry-table">
            {#each productIconDebtCandidates.slice(0, 4) as candidate (`${candidate.sourceFile}:${candidate.line}`)}
              <article>
                <WorkbenchIcon icon="action.brush" label="Candidate" />
                <strong>{candidate.suggestedIconId || formatProductSourceLabel(candidate.sourceFile)}</strong>
                <span>{candidate.category}</span>
                <code>{formatProductSourceLabel(candidate.sourceFile)}:{candidate.line}</code>
              </article>
            {/each}
          </div>
        </section>
      </div>
    </main>

    <aside class="technical-docs-view__icon-registry-inspector" aria-label="Icon inspector">
      {#if selectedRegistryIcon}
        <header>
          <span>Inspector</span>
          <WorkbenchIcon icon="action.more-horizontal" label="More" />
        </header>
        <div class="technical-docs-view__icon-registry-canvas">
          <span style={`font-size: ${Math.max(42, registryIconSize * 2)}px`}>
            <WorkbenchIcon icon={selectedRegistryIcon.id} label={selectedRegistryIcon.title} />
          </span>
        </div>
        <div class="technical-docs-view__icon-registry-selected" data-tone={selectedRegistryIcon.tone}>
          <strong>{selectedRegistryIcon.title}</strong>
          <em>{selectedRegistryIcon.tone}</em>
        </div>
        <dl>
          <div><dt>ID</dt><dd>{selectedRegistryIcon.id}</dd></div>
          <div><dt>Set</dt><dd>{formatRegistryIconLabel(selectedRegistryIcon.tone)}</dd></div>
          <div><dt>Category</dt><dd>{formatRegistryIconLabel(selectedRegistryIcon.category)}</dd></div>
          <div><dt>Usage</dt><dd>{selectedRegistryIconUsageCount} usages</dd></div>
          <div><dt>Size</dt><dd>{registryIconSize}px</dd></div>
          <div><dt>Stroke</dt><dd>1.75px</dd></div>
          <div><dt>Design node</dt><dd>{selectedRegistryIcon.designNodeId ?? 'none'}</dd></div>
        </dl>
        <section>
          <header>
            <strong>Code (Svelte)</strong>
            <button type="button" on:click={copyRegistryIconCode}>
              <WorkbenchIcon icon="action.command" label="Copy" />
              {registryIconCopyStatus === 'copied' ? 'Copié' : 'Copier'}
            </button>
          </header>
          <code>{registryIconCodeSnippet}</code>
        </section>
        <section>
          <header><strong>Variants</strong></header>
          <div class="technical-docs-view__icon-registry-variants">
            {#each variantSizes as size (size)}
              <span style={`font-size: ${size}px`}><WorkbenchIcon icon={selectedRegistryIcon.id} label={`${size}px`} /></span>
            {/each}
          </div>
        </section>
        <section>
          <header><strong>Collections</strong></header>
          <div class="technical-docs-view__icon-registry-collections">
            <span>Default +{registryIconSetGroups[0]?.count ?? 0}</span>
            <span>{formatRegistryIconLabel(selectedRegistryIcon.category)} +{registryIconCategories.find((category) => category.id === selectedRegistryIcon?.category)?.count ?? 0}</span>
            <span>{formatRegistryIconLabel(selectedRegistryIcon.tone)} +{registryIconToneGroups.find((tone) => tone.id === selectedRegistryIcon?.tone)?.count ?? 0}</span>
          </div>
        </section>
      {:else}
        <p class="technical-docs-view__product-empty">Aucune icône sélectionnée.</p>
      {/if}
    </aside>
  </div>
</section>

<style>
  .technical-docs-view__icon-registry {
    display: grid;
    gap: var(--space-10);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      radial-gradient(circle at 30% 0%, color-mix(in srgb, var(--color-action-primary) 9%, transparent), transparent 32rem),
      color-mix(in srgb, var(--color-background-muted) 48%, transparent);
  }

  .technical-docs-view__icon-registry-top,
  .technical-docs-view__icon-registry-actions,
  .technical-docs-view__icon-registry-title,
  .technical-docs-view__icon-registry-toolbar,
  .technical-docs-view__icon-registry-tabs,
  .technical-docs-view__icon-registry-chipbar {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__icon-registry-top {
    justify-content: space-between;
  }

  .technical-docs-view__icon-registry-title > div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .technical-docs-view__icon-registry-title span:not(.technical-docs-view__icon-registry-mark),
  .technical-docs-view__icon-registry-preview header span,
  .technical-docs-view__icon-registry-bottom header span,
  .technical-docs-view__icon-registry-inspector > header span {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__icon-registry-title strong {
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .technical-docs-view__icon-registry-title em,
  .technical-docs-view__icon-registry-actions span {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-style: normal;
  }

  .technical-docs-view__icon-registry-mark {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    border: 1px solid color-mix(in srgb, var(--color-action-primary) 45%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-action-primary) 13%, transparent);
    color: var(--color-action-primary);
    font-size: 1.35rem;
  }

  .technical-docs-view__icon-registry-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .technical-docs-view__icon-registry-actions button,
  .technical-docs-view__icon-registry-toolbar button,
  .technical-docs-view__icon-registry-chipbar button,
  .technical-docs-view__icon-registry-rail button,
  .technical-docs-view__icon-registry-preview header button,
  .technical-docs-view__icon-registry-inspector button {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 64%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .technical-docs-view__icon-registry-actions button,
  .technical-docs-view__icon-registry-preview header button,
  .technical-docs-view__icon-registry-inspector button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    min-height: 1.85rem;
    padding: 0 var(--space-7);
  }

  .technical-docs-view__icon-registry-stats {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: repeat(5, minmax(8rem, 1fr));
  }

  .technical-docs-view__icon-registry-stats article {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 35%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 9%, var(--color-background-surface));
  }

  .technical-docs-view__icon-registry-stats span,
  .technical-docs-view__icon-registry-stats em {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__icon-registry-stats strong {
    color: var(--product-tone-color, var(--color-action-primary));
    font-size: 1.45rem;
  }

  .technical-docs-view__icon-registry-layout {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: minmax(11rem, 0.48fr) minmax(30rem, 1.85fr) minmax(15rem, 0.62fr);
    min-width: 0;
    min-height: 0;
  }

  .technical-docs-view__icon-registry-rail,
  .technical-docs-view__icon-registry-main,
  .technical-docs-view__icon-registry-inspector,
  .technical-docs-view__icon-registry-preview,
  .technical-docs-view__icon-registry-bottom > section {
    min-width: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 56%, transparent);
  }

  .technical-docs-view__icon-registry-rail,
  .technical-docs-view__icon-registry-main,
  .technical-docs-view__icon-registry-inspector {
    display: grid;
    align-content: start;
    gap: var(--space-8);
    padding: var(--space-8);
  }

  .technical-docs-view__icon-registry-rail section,
  .technical-docs-view__icon-registry-inspector section {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__icon-registry-rail strong,
  .technical-docs-view__icon-registry-preview strong,
  .technical-docs-view__icon-registry-bottom strong,
  .technical-docs-view__icon-registry-inspector strong {
    color: var(--color-text-primary);
    font-size: 0.78rem;
  }

  .technical-docs-view__icon-registry-rail button {
    display: grid;
    align-items: center;
    gap: var(--space-5);
    grid-template-columns: 1rem minmax(0, 1fr) max-content;
    min-height: 1.85rem;
    padding: 0 var(--space-6);
    text-align: left;
  }

  .technical-docs-view__icon-registry-rail button span,
  .technical-docs-view__icon-registry-chipbar button {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-view__icon-registry-filter--active,
  .technical-docs-view__icon-registry-rail button:hover,
  .technical-docs-view__icon-registry-actions button:hover,
  .technical-docs-view__icon-registry-toolbar button:hover,
  .technical-docs-view__icon-registry-chipbar button:hover {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 58%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 15%, var(--color-background-muted));
    color: var(--color-text-primary);
  }

  .technical-docs-view__icon-registry-audit {
    margin-top: var(--space-8);
    color: var(--color-status-success) !important;
  }

  .technical-docs-view__icon-registry-toolbar {
    grid-template-columns: minmax(14rem, 1fr) auto minmax(8rem, 0.3fr) max-content;
  }

  .technical-docs-view__icon-registry-toolbar label {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    height: 2.15rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
  }

  .technical-docs-view__icon-registry-toolbar input[type='search'] {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.75rem;
    outline: 0;
  }

  .technical-docs-view__icon-registry-toolbar button {
    width: 2rem;
    height: 2rem;
  }

  .technical-docs-view__icon-registry-toolbar input[type='range'] {
    width: 100%;
  }

  .technical-docs-view__icon-registry-preview,
  .technical-docs-view__icon-registry-bottom > section {
    display: grid;
    gap: var(--space-8);
    padding: var(--space-8);
  }

  .technical-docs-view__icon-registry-preview header,
  .technical-docs-view__icon-registry-bottom header,
  .technical-docs-view__icon-registry-inspector header,
  .technical-docs-view__icon-registry-inspector dl div,
  .technical-docs-view__icon-registry-selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__icon-registry-tabs {
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__icon-registry-tabs span {
    padding: 0 0 var(--space-4);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .technical-docs-view__icon-registry-grid {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    max-height: 28rem;
    overflow: auto;
  }

  .technical-docs-view__icon-registry-grid--list {
    grid-template-columns: 1fr;
  }

  .technical-docs-view__icon-registry-grid button {
    display: grid;
    place-items: center;
    gap: var(--space-4);
    min-width: 0;
    min-height: 5.4rem;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 52%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    cursor: pointer;
  }

  .technical-docs-view__icon-registry-grid--list button {
    grid-template-columns: 2.4rem minmax(0, 1fr) max-content;
    min-height: 2.5rem;
    place-items: center start;
    text-align: left;
  }

  .technical-docs-view__icon-registry-grid button:hover,
  .technical-docs-view__icon-registry-tile--selected {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 70%, var(--color-border-subtle)) !important;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 13%, var(--color-background-surface)) !important;
    color: var(--color-text-primary);
  }

  .technical-docs-view__icon-registry-grid button strong,
  .technical-docs-view__icon-registry-grid button em,
  .technical-docs-view__icon-registry-table strong,
  .technical-docs-view__icon-registry-table span,
  .technical-docs-view__icon-registry-table code {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__icon-registry-grid button em {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__icon-registry-symbol {
    display: grid;
    place-items: center;
    color: var(--product-tone-color, var(--color-action-primary));
  }

  .technical-docs-view__icon-registry-chipbar {
    flex-wrap: wrap;
  }

  .technical-docs-view__icon-registry-chipbar button {
    min-height: 1.65rem;
    padding: 0 var(--space-6);
  }

  .technical-docs-view__icon-registry-bottom {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: minmax(12rem, 0.7fr) minmax(18rem, 1.15fr) minmax(18rem, 1fr);
  }

  .technical-docs-view__icon-registry-donut {
    display: grid;
    place-items: center;
    justify-self: start;
    width: 5.75rem;
    height: 5.75rem;
    border: 0.65rem solid color-mix(in srgb, var(--color-action-primary) 55%, var(--color-border-subtle));
    border-radius: 999px;
  }

  .technical-docs-view__icon-registry-donut strong {
    font-size: 1.2rem;
  }

  .technical-docs-view__icon-registry-donut span {
    color: var(--color-text-muted);
    font-size: 0.625rem;
  }

  .technical-docs-view__icon-registry-bars {
    display: grid;
    gap: var(--space-4);
  }

  .technical-docs-view__icon-registry-bars p {
    display: grid;
    align-items: center;
    gap: var(--space-5);
    grid-template-columns: 5rem minmax(0, 1fr) 2rem;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
  }

  .technical-docs-view__icon-registry-bars i {
    height: 0.35rem;
    border-radius: 999px;
    background:
      linear-gradient(90deg, var(--product-tone-color, var(--color-action-primary)) var(--registry-icon-percent), transparent 0),
      color-mix(in srgb, var(--color-border-subtle) 70%, transparent);
  }

  .technical-docs-view__icon-registry-table {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__icon-registry-table article {
    display: grid;
    align-items: center;
    gap: var(--space-6);
    grid-template-columns: 1rem minmax(0, 1fr) max-content max-content;
    min-width: 0;
    min-height: 2rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 48%, transparent);
  }

  .technical-docs-view__icon-registry-table span,
  .technical-docs-view__icon-registry-table code {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-view__icon-registry-inspector {
    position: sticky;
    top: var(--space-8);
  }

  .technical-docs-view__icon-registry-canvas {
    display: grid;
    place-items: center;
    min-height: 7.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background:
      linear-gradient(color-mix(in srgb, var(--color-border-subtle) 34%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-border-subtle) 34%, transparent) 1px, transparent 1px),
      color-mix(in srgb, var(--color-background-muted) 38%, transparent);
    background-size: 0.75rem 0.75rem;
    color: var(--product-tone-color, var(--color-action-primary));
  }

  .technical-docs-view__icon-registry-selected {
    align-items: start;
  }

  .technical-docs-view__icon-registry-selected em {
    padding: 0.1rem var(--space-5);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, transparent);
    color: var(--product-tone-color, var(--color-action-primary));
    font-size: 0.65rem;
    font-style: normal;
  }

  .technical-docs-view__icon-registry-inspector dl {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__icon-registry-inspector dt,
  .technical-docs-view__icon-registry-inspector dd {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
  }

  .technical-docs-view__icon-registry-inspector dd {
    overflow: hidden;
    max-width: 10rem;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__icon-registry-inspector section code {
    display: block;
    overflow: auto;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 54%, transparent);
    color: var(--color-text-primary);
    font-size: 0.6875rem;
  }

  .technical-docs-view__icon-registry-variants,
  .technical-docs-view__icon-registry-collections {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .technical-docs-view__icon-registry-variants span,
  .technical-docs-view__icon-registry-collections span {
    display: grid;
    place-items: center;
    min-width: 2.4rem;
    min-height: 2.4rem;
    padding: var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
  }

  .technical-docs-view__icon-registry-collections span {
    place-items: center start;
    min-width: 6rem;
    min-height: 1.8rem;
    font-size: 0.6875rem;
  }

  .technical-docs-view__product-empty {
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-medium);
    color: var(--color-text-muted);
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
