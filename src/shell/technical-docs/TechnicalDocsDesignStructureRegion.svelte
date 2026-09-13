<script lang="ts">
  import type {
    DesignSystemThemeCategory,
    DesignSystemThemeGraph,
    DesignSystemThemeGraphCategory,
    DesignSystemThemeGraphNode
  } from '../designSystemThemeCatalog';

  type Translate = (key: string, options?: { default?: string }) => string;

  type DesignCategorySummary = DesignSystemThemeGraphCategory & {
    status: string;
    tokens: number;
    cssVariables: number;
    totalNodes: number;
  };

  export let t: Translate;
  export let designSystemThemeGraph: DesignSystemThemeGraph;
  export let designSearchQuery: string;
  export let designSearchResultCount: number;
  export let designCategorySummaries: DesignCategorySummary[];
  export let activeDesignCategory: DesignSystemThemeCategory;
  export let activeDesignCategoryEntry: DesignSystemThemeGraphCategory | null;
  export let activeDesignCategoryNodes: DesignSystemThemeGraphNode[];
  export let selectedDesignNode: DesignSystemThemeGraphNode | null;
  export let handleDesignSearchInput: (event: Event) => void;
  export let clearDesignSearch: () => void;
  export let selectDesignCategory: (category: DesignSystemThemeCategory) => void;
  export let isDesignNodeHighlighted: (node: DesignSystemThemeGraphNode) => boolean;
  export let selectDesignNode: (node: DesignSystemThemeGraphNode) => void;
</script>

<section class="technical-docs-view__design-structure" aria-label={t('ui.shell.docs.design.structure', { default: 'Structural graph' })}>
  <header class="technical-docs-view__design-panel-head">
    <span>Categories</span>
    <strong>{designSearchQuery.trim() ? `${designSearchResultCount} results` : `${designSystemThemeGraph.totals.nodes} nodes`}</strong>
  </header>

  <div class="technical-docs-view__design-search">
    <label>
      <span>Search nomenclature</span>
      <input
        value={designSearchQuery}
        placeholder="category, token, CSS var, node..."
        aria-label="Search design system nomenclature"
        on:input={handleDesignSearchInput}
      />
    </label>
    <button type="button" on:click={clearDesignSearch} disabled={!designSearchQuery.trim()}>
      Clear
    </button>
  </div>

  <div class="technical-docs-view__design-category-rail" aria-label="Design system categories">
    {#each designCategorySummaries as category (category.category)}
      <button
        type="button"
        class:technical-docs-view__design-category-tab--active={activeDesignCategory === category.category}
        class="technical-docs-view__design-category-tab"
        on:click={() => selectDesignCategory(category.category)}
      >
        <span data-status={category.status}>{category.status}</span>
        <strong>{category.label}</strong>
        <em>
          {category.nodes.length}{designSearchQuery.trim() ? `/${category.totalNodes}` : ''} nodes
          · {category.tokens} tokens · {category.cssVariables} CSS
        </em>
      </button>
    {/each}
  </div>

  <div class="technical-docs-view__design-categories">
    {#if activeDesignCategoryEntry}
      <section class="technical-docs-view__design-category">
        <header>
          <strong>{activeDesignCategoryEntry.label}</strong>
          <span>{activeDesignCategoryNodes.length}{designSearchQuery.trim() ? `/${activeDesignCategoryEntry.nodes.length}` : ''}</span>
        </header>
        <div class="technical-docs-view__design-nodes">
          {#if activeDesignCategoryNodes.length > 0}
            {#each activeDesignCategoryNodes as node (node.id)}
              <button
                type="button"
                class:technical-docs-view__design-node--selected={selectedDesignNode?.id === node.id}
                class:technical-docs-view__design-node--related={isDesignNodeHighlighted(node)}
                class="technical-docs-view__design-node"
                on:click={() => selectDesignNode(node)}
              >
                <span data-status={node.status}>{node.status}</span>
                <strong>{node.title}</strong>
                <small>{node.summary}</small>
                <em>
                  {node.relationCount} {t('ui.shell.docs.graph.relations', { default: 'relations' })}
                  · {node.tokens.length} tokens · {node.cssVariables.length} CSS
                </em>
              </button>
            {/each}
          {:else}
            <div class="technical-docs-view__design-empty">
              <strong>No match</strong>
              <span>Try another category, token, node id, or CSS variable.</span>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </div>
</section>

<style>
  .technical-docs-view__design-structure {
    display: grid;
    align-content: start;
    gap: var(--space-8);
    grid-template-rows: auto auto auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
  }
</style>
