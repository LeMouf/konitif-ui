<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import type { FeatureDocContextGroup, FeatureDocEntry, FeatureDocFilter } from '../technicalDocsCatalog';

  import type { FooterControlId } from './footerControl';

  const i18nT = getWorkbenchTranslator();

  export let hoveredFooterControl: FooterControlId | null = null;
  export let featureDocsButtonElement: HTMLButtonElement | null = null;
  export let featureDocsMenuElement: HTMLDivElement | null = null;
  export let isFeatureDocsMenuOpen = false;
  export let featureDocGroups: FeatureDocContextGroup[] = [];
  export let contextualFeatureDocs: FeatureDocEntry[] = [];
  export let featureDocumentationAvailable = false;
  export let featureDocFilters: Array<{ key: FeatureDocFilter; label: string }> = [];
  export let featureDocsFilter: FeatureDocFilter = 'app';
  export let toggleFeatureDocsMenu: () => void = () => undefined;
  export let openFeatureDocsRoute: () => void = () => undefined;
  export let selectFeatureDocsFilter: (filter: FeatureDocFilter) => void = () => undefined;
</script>

<div
  role="presentation"
  class:app-shell__footer-control--open={isFeatureDocsMenuOpen}
  class="app-shell__footer-help-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'docs')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <button
    bind:this={featureDocsButtonElement}
    type="button"
    class:app-shell__footer-help-button--open={isFeatureDocsMenuOpen}
    class="app-shell__footer-help-button"
    aria-label={$i18nT('ui.shell.footer.docs.open', { default: 'Open feature docs' })}
    aria-haspopup="menu"
    aria-expanded={isFeatureDocsMenuOpen}
    on:click={toggleFeatureDocsMenu}
  >
    <WorkbenchIcon
      className="app-shell__footer-control-icon app-shell__footer-control-icon--docs"
      icon="docs.page"
      label="Feature docs"
    />
  </button>

  {#if isFeatureDocsMenuOpen}
    <div
      bind:this={featureDocsMenuElement}
      class="app-shell__footer-help-menu"
      role="menu"
      aria-label={$i18nT('ui.shell.footer.docs.ariaLabel', { default: 'Feature docs' })}
    >
      <div class="app-shell__footer-help-menu-groups">
        {#each featureDocGroups as group (group.key)}
          <section class="app-shell__footer-help-menu-section">
            <header class="app-shell__footer-help-menu-section-header">
              <h4 class="app-shell__footer-help-menu-section-title">{group.label}</h4>
            </header>

            <div class="app-shell__footer-help-menu-items">
              {#each group.items as item (item.id)}
                <article class="app-shell__footer-help-menu-item">
                  <div class="app-shell__footer-help-menu-item-head">
                    <strong class="app-shell__footer-help-menu-item-title">{item.title}</strong>
                    <span class="app-shell__footer-help-menu-item-status">{item.status}</span>
                  </div>
                  <p class="app-shell__footer-help-menu-item-summary">{item.summary}</p>
                  <div class="app-shell__footer-help-menu-item-meta">
                    <span class="app-shell__footer-help-menu-item-path">{item.path}</span>
                    {#if item.tags.length > 0}
                      <span class="app-shell__footer-help-menu-item-tags">{item.tags.join(' · ')}</span>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {/each}

        {#if !featureDocumentationAvailable}
          <div class="app-shell__footer-help-menu-empty" role="status">
            {$i18nT('ui.shell.footer.docs.unavailable', { default: 'This application has not provided a feature documentation catalog.' })}
          </div>
        {:else if featureDocGroups.length === 0}
          <div class="app-shell__footer-help-menu-empty">
            {$i18nT('ui.shell.footer.docs.empty', { default: 'No docs match the current app context and filter.' })}
          </div>
        {/if}
      </div>

      <div class="app-shell__footer-help-menu-bottom">
        <div class="app-shell__footer-help-menu-header">
          <div>
            <p class="app-shell__footer-help-menu-eyebrow">{$i18nT('ui.shell.footer.docs.eyebrow', { default: 'Docs' })}</p>
            <h3 class="app-shell__footer-help-menu-title">{$i18nT('ui.shell.footer.docs.title', { default: 'Context Docs' })}</h3>
          </div>
          <div class="app-shell__footer-help-menu-header-actions">
            <span class="app-shell__footer-help-menu-count">{contextualFeatureDocs.length}</span>
            <button type="button" class="app-shell__footer-help-menu-open" on:click={openFeatureDocsRoute}>
              {$i18nT('ui.shell.footer.docs.viewAll', { default: 'View All' })}
            </button>
          </div>
        </div>

        <div class="app-shell__footer-help-menu-filters" aria-label={$i18nT('ui.shell.footer.docs.filters.ariaLabel', { default: 'Feature doc type filters' })}>
          {#each featureDocFilters as filter (filter.key)}
            <button
              type="button"
              class:app-shell__footer-help-menu-filter--active={featureDocsFilter === filter.key}
              class="app-shell__footer-help-menu-filter"
              on:click={() => selectFeatureDocsFilter(filter.key)}
            >
              {filter.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-shell__footer-help-group {
    color: color-mix(in srgb, var(--color-text-secondary) 72%, var(--color-text-muted));
  }

  .app-shell__footer-help-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--app-shell-footer-icon-button-width, 1.65rem);
    height: 100%;
    border: 0;
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
    color: inherit;
    font: inherit;
    font-size: var(--app-shell-footer-control-font-size, 0.7rem);
    line-height: 0;
    padding: 0;
  }

  .app-shell__footer-help-button:hover,
  .app-shell__footer-help-button--open {
    background: color-mix(in srgb, var(--color-background-hover) 20%, transparent);
  }

  :global(.app-shell__footer-control-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    flex: 0 0 auto;
    display: block;
  }

  .app-shell__footer-help-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + var(--space-4));
    z-index: 30;
    width: min(36rem, calc(var(--app-shell-shell-width, 100vw) - var(--space-16)));
    max-width: calc(var(--app-shell-shell-width, 100vw) - var(--space-16));
    max-height: min(var(--app-shell-workspace-height, 28rem), calc(100vh - 8rem));
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    overflow: hidden;
    padding: var(--space-10);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow:
      0 -12px 28px rgb(0 0 0 / 0.22),
      0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 38%, transparent);
  }

  .app-shell__footer-help-menu-bottom {
    position: sticky;
    bottom: 0;
    z-index: 1;
    background: var(--color-background-elevated);
    padding-top: var(--space-10);
    border-top: 1px solid color-mix(in srgb, var(--color-border-subtle) 72%, transparent);
    box-shadow:
      0 -10px 18px rgb(0 0 0 / 0.14),
      0 -1px 0 color-mix(in srgb, var(--color-border-subtle) 48%, transparent);
  }

  .app-shell__footer-help-menu-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-12);
    margin-bottom: var(--space-12);
  }

  .app-shell__footer-help-menu-header-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .app-shell__footer-help-menu-eyebrow {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6875rem;
  }

  .app-shell__footer-help-menu-title {
    margin: 0;
    font-size: 0.875rem;
  }

  .app-shell__footer-help-menu-count {
    display: inline-flex;
    align-items: center;
    min-height: 1.25rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    white-space: nowrap;
  }

  .app-shell__footer-help-menu-open,
  .app-shell__footer-help-menu-filter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.5rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-label);
    white-space: nowrap;
  }

  .app-shell__footer-help-menu-open:hover,
  .app-shell__footer-help-menu-filter:hover,
  .app-shell__footer-help-menu-filter--active {
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell__footer-help-menu-filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    margin-bottom: var(--space-12);
  }

  .app-shell__footer-help-menu-groups {
    display: grid;
    gap: var(--space-12);
    min-height: 0;
    overflow: auto;
    padding-right: var(--space-2);
    padding-bottom: var(--space-6);
  }

  .app-shell__footer-help-menu-section {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-section + .app-shell__footer-help-menu-section {
    padding-top: var(--space-10);
    border-top: 1px solid var(--color-border-subtle);
  }

  .app-shell__footer-help-menu-section-title {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .app-shell__footer-help-menu-items {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-item {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--app-shell-footer-menu-card, var(--color-background-muted));
  }

  .app-shell__footer-help-menu-item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-item-title {
    font-size: var(--font-size-body);
    line-height: 1.2;
  }

  .app-shell__footer-help-menu-item-status {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-transform: capitalize;
    white-space: nowrap;
  }

  .app-shell__footer-help-menu-item-summary {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    line-height: 1.35;
  }

  .app-shell__footer-help-menu-item-meta {
    display: grid;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    line-height: 1.35;
  }

  .app-shell__footer-help-menu-item-path {
    font-family: var(--font-family-mono, monospace);
  }

  .app-shell__footer-help-menu-empty {
    padding: var(--space-8);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-medium);
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
  }

  @media (max-width: 720px) {
    .app-shell__footer-help-menu {
      width: calc(100vw - var(--space-16));
    }
  }
</style>
