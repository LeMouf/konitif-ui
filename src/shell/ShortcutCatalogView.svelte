<script lang="ts">
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';

  type ShellShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type ShellShortcutScopeFilter = 'all' | 'context' | 'global';
  type ShellShortcutTypeFilter = 'all' | ShellShortcutType;
  type ShortcutCatalogVariant = 'page' | 'registry';
  type ShortcutDimension = {
    id: string;
    label: string;
    count: number;
    percent: number;
  };
  type ShortcutDimensionGroup = {
    id: string;
    label: string;
    dimensions: ShortcutDimension[];
  };

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
  export let onClose: () => void = () => {};
  export let variant: ShortcutCatalogVariant = 'page';

  const i18nT = getWorkbenchTranslator();

  $: allShortcutItems = shortcutGroups.flatMap((group) => group.items);
  $: shortcutDimensions = createShortcutDimensions(allShortcutItems, $i18nT);

  function handleShortcutQueryInput(event: Event): void {
    onShortcutQueryChange((event.currentTarget as HTMLInputElement).value);
  }

  function resolveShellShortcutTypeLabel(
    type: ShellShortcutType,
    translate: WorkbenchTranslate
  ): string {
    switch (type) {
      case 'playback':
        return translate('ui.shell.shortcutTypes.playback', { default: 'Playback' });
      case 'navigation':
        return translate('ui.shell.shortcutTypes.navigation', { default: 'Navigate' });
      case 'selection':
        return translate('ui.shell.shortcutTypes.selection', { default: 'Select' });
      case 'edit':
        return translate('ui.shell.shortcutTypes.edit', { default: 'Edit' });
      case 'system':
        return translate('ui.shell.shortcutTypes.system', { default: 'System' });
      case 'view':
      default:
        return translate('ui.shell.shortcutTypes.view', { default: 'View' });
    }
  }

  function createShortcutDimensions(
    items: Array<{ type: ShellShortcutType; scopeLabel: string; priorityLabel: string }>,
    translate: WorkbenchTranslate
  ): ShortcutDimensionGroup[] {
    return [
      {
        id: 'type',
        label: translate('ui.shell.shortcutCatalog.dimensions.type', { default: 'Types' }),
        dimensions: createShortcutDimensionRows(
          items.map((item) => resolveShellShortcutTypeLabel(item.type, translate)),
          items.length
        )
      },
      {
        id: 'scope',
        label: translate('ui.shell.shortcutCatalog.dimensions.scope', { default: 'Scopes' }),
        dimensions: createShortcutDimensionRows(
          items.map((item) => item.scopeLabel),
          items.length
        )
      },
      {
        id: 'priority',
        label: translate('ui.shell.shortcutCatalog.dimensions.priority', { default: 'Priority' }),
        dimensions: createShortcutDimensionRows(
          items.map((item) => item.priorityLabel),
          items.length
        )
      }
    ].filter((group) => group.dimensions.length > 0);
  }

  function createShortcutDimensionRows(values: string[], total: number): ShortcutDimension[] {
    const counts = new Map<string, number>();

    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label, count]) => ({
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0
      }));
  }
</script>

<section
  class:shortcut-catalog-view--registry={variant === 'registry'}
  class="shortcut-catalog-view"
  aria-labelledby="shortcut-catalog-title"
>
  <div class="shortcut-catalog-view__content">
    <div class="shortcut-catalog-view__intro">
      <p class="shortcut-catalog-view__eyebrow">{$i18nT('ui.shell.shortcutCatalog.eyebrow', { default: 'Workbench' })}</p>
      <h2 id="shortcut-catalog-title" class="shortcut-catalog-view__title">
        {$i18nT('ui.shell.shortcutCatalog.title', { default: 'Shortcut Catalog' })}
      </h2>
      <p class="shortcut-catalog-view__summary">
        {$i18nT('ui.shell.shortcutCatalog.summary', {
          default: 'Full reference of contextual and global shortcuts, with the same filters as the footer helper.'
        })}
      </p>
    </div>

    <div class="shortcut-catalog-view__stats">
      <div class="shortcut-catalog-view__stat">
        <span class="shortcut-catalog-view__stat-value">{filteredShortcuts}</span>
        <span class="shortcut-catalog-view__stat-label">{$i18nT('ui.shell.shortcutCatalog.visible', { default: 'Visible' })}</span>
      </div>
      <div class="shortcut-catalog-view__stat">
        <span class="shortcut-catalog-view__stat-value">{totalShortcuts}</span>
        <span class="shortcut-catalog-view__stat-label">{$i18nT('ui.shell.shortcutCatalog.total', { default: 'Total' })}</span>
      </div>
      <div class="shortcut-catalog-view__search-shell">
        <input
          class="shortcut-catalog-view__search"
          type="search"
          placeholder={$i18nT('ui.shell.shortcutCatalog.searchPlaceholder', { default: 'Filter shortcuts' })}
          value={shortcutQuery}
          on:input={handleShortcutQueryInput}
        />
      </div>
    </div>

    <div class="shortcut-catalog-view__filters">
      <div class="shortcut-catalog-view__filter-row" aria-label={$i18nT('ui.shell.shortcutCatalog.scopeFilters.ariaLabel', { default: 'Shortcut scope filters' })}>
        {#each shortcutScopeFilters as filter (filter.key)}
          <button
            type="button"
            class:shortcut-catalog-view__filter--active={shortcutScopeFilter === filter.key}
            class="shortcut-catalog-view__filter"
            on:click={() => onSelectShortcutScopeFilter(filter.key)}
          >
            {filter.label}
          </button>
        {/each}
      </div>

      <div class="shortcut-catalog-view__filter-row" aria-label={$i18nT('ui.shell.shortcutCatalog.typeFilters.ariaLabel', { default: 'Shortcut type filters' })}>
        {#each shortcutTypeFilters as filter (filter.key)}
          <button
            type="button"
            class:shortcut-catalog-view__filter--active={shortcutTypeFilter === filter.key}
            class="shortcut-catalog-view__filter"
            on:click={() => onSelectShortcutTypeFilter(filter.key)}
          >
            {filter.label}
          </button>
        {/each}
      </div>
    </div>

    {#if shortcutDimensions.length > 0}
      <section class="shortcut-catalog-view__dimensions" aria-label="Shortcut dimensions">
        {#each shortcutDimensions as dimensionGroup (dimensionGroup.id)}
          <article class="shortcut-catalog-view__dimension-group">
            <header>
              <strong>{dimensionGroup.label}</strong>
              <span>{dimensionGroup.dimensions.length} dimensions</span>
            </header>
            <div class="shortcut-catalog-view__dimension-list">
              {#each dimensionGroup.dimensions as dimension (dimension.id)}
                <div class="shortcut-catalog-view__dimension-row">
                  <span>{dimension.label}</span>
                  <strong>{dimension.count}</strong>
                  <i style={`--shortcut-dimension-percent: ${dimension.percent}%`}></i>
                </div>
              {/each}
            </div>
          </article>
        {/each}
      </section>
    {/if}

    <div class="shortcut-catalog-view__groups">
      {#each shortcutGroups as group (group.key)}
        <section class="shortcut-catalog-view__group">
          <header class="shortcut-catalog-view__group-header">
            <h3 class="shortcut-catalog-view__group-title">{group.label}</h3>
          </header>

          <div class="shortcut-catalog-view__items">
            {#each group.items as shortcut (shortcut.id)}
              <article class="shortcut-catalog-view__item">
                <div class="shortcut-catalog-view__item-head">
                  <div class="shortcut-catalog-view__item-command">
                    <kbd class="shortcut-catalog-view__key">{shortcut.key}</kbd>
                    <strong class="shortcut-catalog-view__item-title">{shortcut.label}</strong>
                  </div>
                  <span class="shortcut-catalog-view__item-type">
                    {resolveShellShortcutTypeLabel(shortcut.type, $i18nT)}
                  </span>
                </div>
                {#if shortcut.description}
                  <p class="shortcut-catalog-view__item-summary">{shortcut.description}</p>
                {/if}
                <div class="shortcut-catalog-view__item-meta">
                  <span>{shortcut.scopeLabel}</span>
                  <span>{shortcut.priorityLabel}</span>
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}

      {#if shortcutGroups.length === 0}
        <div class="shortcut-catalog-view__empty">
          {$i18nT('ui.shell.shortcutCatalog.empty', { default: 'No shortcuts match the current filters.' })}
        </div>
      {/if}
    </div>
  </div>

  {#if variant === 'page'}
    <footer class="shortcut-catalog-view__footer">
      <div class="shortcut-catalog-view__footer-copy">
        <span class="shortcut-catalog-view__footer-title">
          {$i18nT('ui.shell.shortcutCatalog.title', { default: 'Shortcut Catalog' })}
        </span>
        <span class="shortcut-catalog-view__footer-meta">
          {$i18nT('ui.shell.shortcutCatalog.footerMeta', {
            default: '{{visible}} visible · {{total}} total',
            values: { visible: filteredShortcuts, total: totalShortcuts }
          })}
        </span>
      </div>

      <button type="button" class="shortcut-catalog-view__close" on:click={onClose}>
        {$i18nT('ui.shell.shortcutCatalog.back', { default: 'Back to Workspace' })}
      </button>
    </footer>
  {/if}
</section>

<style>
  .shortcut-catalog-view {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-muted) 52%, transparent), transparent),
      var(--color-background-canvas);
  }

  .shortcut-catalog-view__content {
    min-height: 0;
    overflow: auto;
    padding: var(--space-12);
  }

  .shortcut-catalog-view__intro {
    margin-bottom: var(--space-12);
  }

  .shortcut-catalog-view__eyebrow {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6875rem;
  }

  .shortcut-catalog-view__title {
    margin: 0 0 var(--space-4);
    font-size: 1rem;
  }

  .shortcut-catalog-view__summary {
    margin: 0;
    max-width: 48rem;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    line-height: 1.4;
  }

  .shortcut-catalog-view__stats {
    display: grid;
    grid-template-columns: auto auto minmax(12rem, 1fr);
    gap: var(--space-8);
    margin-bottom: var(--space-10);
    align-items: stretch;
  }

  .shortcut-catalog-view__stat {
    display: grid;
    gap: var(--space-2);
    min-width: 5rem;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
  }

  .shortcut-catalog-view__stat-value {
    font-size: 1rem;
    font-weight: 700;
  }

  .shortcut-catalog-view__stat-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
  }

  .shortcut-catalog-view__search-shell {
    display: flex;
    align-items: stretch;
  }

  .shortcut-catalog-view__search {
    width: 100%;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 92%, transparent);
    color: var(--color-text-primary);
    padding: 0 var(--space-8);
    font: inherit;
  }

  .shortcut-catalog-view__filters {
    display: grid;
    gap: var(--space-6);
    margin-bottom: var(--space-12);
  }

  .shortcut-catalog-view__dimensions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-8);
    margin-bottom: var(--space-12);
  }

  .shortcut-catalog-view__dimension-group {
    display: grid;
    gap: var(--space-8);
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 88%, transparent);
  }

  .shortcut-catalog-view__dimension-group header,
  .shortcut-catalog-view__dimension-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__dimension-group header span,
  .shortcut-catalog-view__dimension-row span {
    overflow: hidden;
    color: var(--color-text-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-label);
  }

  .shortcut-catalog-view__dimension-list {
    display: grid;
    gap: var(--space-6);
  }

  .shortcut-catalog-view__dimension-row i {
    grid-column: 1 / -1;
    display: block;
    height: 0.25rem;
    overflow: hidden;
    border-radius: var(--radius-pill);
    background: var(--color-background-muted);
  }

  .shortcut-catalog-view__dimension-row i::before {
    display: block;
    width: var(--shortcut-dimension-percent);
    height: 100%;
    border-radius: inherit;
    background: var(--color-accent);
    content: '';
  }

  .shortcut-catalog-view__filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .shortcut-catalog-view__filter {
    min-height: 1.875rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--color-background-muted) 90%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
  }

  .shortcut-catalog-view__filter--active {
    border-color: color-mix(in srgb, var(--color-accent) 48%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--color-accent) 14%, var(--color-background-muted));
    color: var(--color-text-primary);
  }

  .shortcut-catalog-view__groups {
    display: grid;
    gap: var(--space-12);
  }

  .shortcut-catalog-view__group {
    display: grid;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__group-title {
    margin: 0;
    font-size: 0.875rem;
  }

  .shortcut-catalog-view__items {
    display: grid;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__item {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 92%, transparent);
  }

  .shortcut-catalog-view__item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__item-command {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
  }

  .shortcut-catalog-view__key {
    padding: 0.1rem 0.45rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.4rem;
    background: var(--color-background-muted);
    font: inherit;
    font-size: var(--font-size-label);
  }

  .shortcut-catalog-view__item-title {
    font-size: 0.875rem;
  }

  .shortcut-catalog-view__item-type,
  .shortcut-catalog-view__item-meta,
  .shortcut-catalog-view__item-summary,
  .shortcut-catalog-view__empty,
  .shortcut-catalog-view__footer-meta {
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
  }

  .shortcut-catalog-view__item-summary,
  .shortcut-catalog-view__item-meta {
    margin: 0;
  }

  .shortcut-catalog-view__item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }

  .shortcut-catalog-view__empty {
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-muted) 80%, transparent);
  }

  .shortcut-catalog-view__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    padding: var(--space-10) var(--space-12);
    border-top: 1px solid var(--color-border-subtle);
    background: color-mix(in srgb, var(--color-background-surface) 92%, transparent);
    box-shadow: 0 -8px 20px rgb(0 0 0 / 0.12);
  }

  .shortcut-catalog-view__footer-copy {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .shortcut-catalog-view__footer-title {
    font-size: 0.8125rem;
    font-weight: 700;
  }

  .shortcut-catalog-view__close {
    padding: 0 var(--space-10);
    min-height: 2rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
    color: var(--color-text-primary);
    font: inherit;
    white-space: nowrap;
  }

  @media (max-width: 960px) {
    .shortcut-catalog-view__stats {
      grid-template-columns: 1fr;
    }

    .shortcut-catalog-view__dimensions {
      grid-template-columns: 1fr;
    }
  }

  .shortcut-catalog-view--registry {
    grid-template-rows: minmax(0, 1fr);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-panel);
  }

  .shortcut-catalog-view--registry .shortcut-catalog-view__content {
    padding: var(--space-10);
  }

  .shortcut-catalog-view--registry .shortcut-catalog-view__intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-8);
    align-items: end;
    margin-bottom: var(--space-8);
  }

  .shortcut-catalog-view--registry .shortcut-catalog-view__summary {
    grid-column: 1 / -1;
  }
</style>
