<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import ShortcutGesture from '../ShortcutGesture.svelte';

  import type { FooterControlId } from './footerControl';

  type FooterShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type FooterShortcutScopeFilter = 'all' | 'context' | 'global';
  type FooterShortcutTypeFilter = 'all' | FooterShortcutType;

  type FooterShortcut = {
    id: string;
    key: string;
    label: string;
    type: FooterShortcutType;
    description?: string;
    scopeLabel: string;
    priorityLabel: string;
  };

  type FooterShortcutGroup = {
    key: string;
    label: string;
    items: FooterShortcut[];
  };

  export let hoveredFooterControl: FooterControlId | null = null;
  export let shortcutMenuElement: HTMLDivElement | null = null;
  export let shortcutMenuButtonElement: HTMLButtonElement | null = null;
  export let isShortcutMenuOpen = false;
  export let allFooterShortcuts: FooterShortcut[] = [];
  export let visibleFooterContextShortcuts: FooterShortcut[] = [];
  export let visibleFooterGlobalShortcuts: FooterShortcut[] = [];
  export let footerShortcutOverflowCount = 0;
  export let footerShortcutGroups: FooterShortcutGroup[] = [];
  export let filteredFooterShortcuts: FooterShortcut[] = [];
  export let shortcutQuery = '';
  export let shortcutScopeFilter: FooterShortcutScopeFilter = 'all';
  export let shortcutTypeFilter: FooterShortcutTypeFilter = 'all';
  export let shortcutScopeFilters: Array<{ key: FooterShortcutScopeFilter; label: string }> = [];
  export let shortcutTypeFilters: Array<{ key: FooterShortcutTypeFilter; label: string }> = [];
  export let toggleShortcutMenu: () => void = () => undefined;
  export let selectShortcutScopeFilter: (filter: FooterShortcutScopeFilter) => void = () => undefined;
  export let selectShortcutTypeFilter: (filter: FooterShortcutTypeFilter) => void = () => undefined;
  export let resolveShellShortcutTypeLabel: (type: FooterShortcutType) => string = (type) => type;

  const i18nT = getWorkbenchTranslator();
</script>

<div class="app-shell__footer-left">
  <div
    role="presentation"
    class:app-shell__footer-control--open={isShortcutMenuOpen}
    class="app-shell__footer-help-group app-shell__footer-control"
    on:mouseenter={() => (hoveredFooterControl = 'shortcuts')}
    on:mouseleave={() => (hoveredFooterControl = null)}
  >
    <button
      bind:this={shortcutMenuButtonElement}
      type="button"
      class:app-shell__footer-help-button--open={isShortcutMenuOpen}
      class="app-shell__footer-help-button app-shell__footer-help-button--shortcut"
      aria-label={$i18nT('ui.shell.footer.openShortcutsReference', { default: 'Open shortcuts reference' })}
      aria-haspopup="menu"
      aria-expanded={isShortcutMenuOpen}
      title={$i18nT('ui.shell.footer.shortcutCount', {
        default: '{{count}} shortcuts registered',
        values: { count: allFooterShortcuts.length }
      })}
      on:click={toggleShortcutMenu}
    >
      <WorkbenchIcon
        className="app-shell__footer-control-icon app-shell__footer-control-icon--shortcuts"
        icon="action.keyboard"
        label="Shortcuts"
      />
      {#if footerShortcutOverflowCount > 0}
        <span class="app-shell__footer-help-badge">+{footerShortcutOverflowCount}</span>
      {/if}
    </button>

    {#if isShortcutMenuOpen}
      <div
        bind:this={shortcutMenuElement}
        class="app-shell__footer-shortcuts-menu app-shell__footer-help-menu"
        role="menu"
        aria-label={$i18nT('ui.shell.footer.shortcutReference', { default: 'Shortcuts reference' })}
      >
        <div class="app-shell__footer-help-menu-groups">
          {#each footerShortcutGroups as group (group.key)}
            <section class="app-shell__footer-help-menu-section">
              <header class="app-shell__footer-help-menu-section-header">
                <h4 class="app-shell__footer-help-menu-section-title">{group.label}</h4>
              </header>

              <div class="app-shell__footer-shortcuts-menu-items">
                {#each group.items as shortcut (shortcut.id)}
                  <article class="app-shell__footer-shortcuts-menu-item">
                    <div class="app-shell__footer-shortcuts-menu-item-head">
                      <div class="app-shell__footer-shortcuts-menu-item-command">
                        <ShortcutGesture shortcutKey={shortcut.key} />
                        <strong class="app-shell__footer-shortcuts-menu-item-title" title={shortcut.label}>
                          {shortcut.label}
                        </strong>
                      </div>
                      <span class="app-shell__footer-shortcuts-menu-item-type">{resolveShellShortcutTypeLabel(shortcut.type)}</span>
                    </div>
                    {#if shortcut.description}
                      <p class="app-shell__footer-shortcuts-menu-item-summary">{shortcut.description}</p>
                    {/if}
                    <div class="app-shell__footer-shortcuts-menu-item-meta">
                      <span>{shortcut.scopeLabel}</span>
                      <span>{shortcut.priorityLabel}</span>
                    </div>
                  </article>
                {/each}
              </div>
            </section>
          {/each}

          {#if footerShortcutGroups.length === 0}
            <div class="app-shell__footer-help-menu-empty">
              {$i18nT('ui.shell.shortcutCatalog.empty', { default: 'No shortcuts match the current filters.' })}
            </div>
          {/if}
        </div>

        <div class="app-shell__footer-help-menu-bottom">
          <div class="app-shell__footer-help-menu-header">
            <div>
              <p class="app-shell__footer-help-menu-eyebrow">{$i18nT('ui.shell.footer.eyebrow', { default: 'Footer' })}</p>
              <h3 class="app-shell__footer-help-menu-title">{$i18nT('ui.shell.footer.shortcutReference', { default: 'Shortcut Reference' })}</h3>
            </div>
            <div class="app-shell__footer-help-menu-header-actions">
              <span class="app-shell__footer-help-menu-count">{filteredFooterShortcuts.length}</span>
            </div>
          </div>

          <div class="app-shell__footer-shortcuts-menu-search-shell">
            <input
              class="app-shell__footer-shortcuts-menu-search"
              type="search"
              placeholder={$i18nT('ui.shell.shortcutCatalog.searchPlaceholder', { default: 'Filter shortcuts' })}
              bind:value={shortcutQuery}
            />
          </div>

          <div class="app-shell__footer-help-menu-filters" aria-label={$i18nT('ui.shell.shortcutCatalog.scopeFilters.ariaLabel', { default: 'Shortcut scope filters' })}>
            {#each shortcutScopeFilters as filter (filter.key)}
              <button
                type="button"
                class:app-shell__footer-help-menu-filter--active={shortcutScopeFilter === filter.key}
                class="app-shell__footer-help-menu-filter"
                on:click={() => selectShortcutScopeFilter(filter.key)}
              >
                {filter.label}
              </button>
            {/each}
          </div>

          <div class="app-shell__footer-help-menu-filters" aria-label={$i18nT('ui.shell.shortcutCatalog.typeFilters.ariaLabel', { default: 'Shortcut type filters' })}>
            {#each shortcutTypeFilters as filter (filter.key)}
              <button
                type="button"
                class:app-shell__footer-help-menu-filter--active={shortcutTypeFilter === filter.key}
                class="app-shell__footer-help-menu-filter"
                on:click={() => selectShortcutTypeFilter(filter.key)}
              >
                {filter.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if visibleFooterContextShortcuts.length > 0 || visibleFooterGlobalShortcuts.length > 0}
    <span class="app-shell__footer-separator" aria-hidden="true"></span>
  {/if}

  {#if visibleFooterContextShortcuts.length > 0}
    <div class="app-shell__footer-shortcut-group" aria-label={$i18nT('ui.shell.footer.selectedZoneShortcuts', { default: 'Selected zone shortcuts' })}>
      {#each visibleFooterContextShortcuts as shortcut (shortcut.id)}
        <span class="app-shell__footer-shortcut">
          <ShortcutGesture shortcutKey={shortcut.key} compact />
          <span class="app-shell__footer-shortcut-label" title={`${shortcut.label} · ${shortcut.key}`}>{shortcut.label}</span>
        </span>
      {/each}
    </div>
  {/if}

  {#if visibleFooterContextShortcuts.length > 0 && visibleFooterGlobalShortcuts.length > 0}
    <span class="app-shell__footer-separator" aria-hidden="true"></span>
  {/if}

  {#if visibleFooterGlobalShortcuts.length > 0}
    <div class="app-shell__footer-shortcut-group" aria-label={$i18nT('ui.shell.footer.globalShortcuts', { default: 'Global shortcuts' })}>
      {#each visibleFooterGlobalShortcuts as shortcut (shortcut.id)}
        <span class="app-shell__footer-shortcut">
          <ShortcutGesture shortcutKey={shortcut.key} compact />
          <span class="app-shell__footer-shortcut-label" title={`${shortcut.label} · ${shortcut.key}`}>{shortcut.label}</span>
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .app-shell__footer-left {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    justify-self: start;
    flex: 1 1 auto;
    overflow: visible;
  }

  .app-shell__footer-shortcut-group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .app-shell__footer-shortcut {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    max-width: 15rem;
    padding: 0 0.4rem;
    min-height: var(--app-shell-footer-chip-height, 1.375rem);
    border: 1px solid var(--app-shell-footer-control-border, var(--color-border-subtle));
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-panel) 86%, transparent);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .app-shell__footer-shortcut-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text-secondary);
  }

  .app-shell__footer-separator {
    width: 1px;
    align-self: stretch;
    min-height: var(--app-shell-footer-chip-height, 1.375rem);
    background: var(--color-border-subtle);
    opacity: 0.8;
  }

  .app-shell__footer-help-group {
    flex: 0 0 auto;
  }

  .app-shell__footer-help-button {
    position: relative;
    min-width: var(--app-shell-footer-icon-button-width, 1.65rem);
    height: 100%;
    padding: 0 0.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
    color: var(--color-text-muted);
  }

  .app-shell__footer-help-button--shortcut {
    min-width: calc(var(--app-shell-footer-icon-button-width, 1.65rem) + 0.35rem);
  }

  .app-shell__footer-help-badge {
    font-size: 0.62rem;
    line-height: 1;
    color: var(--color-text-primary);
  }

  :global(.app-shell__footer-control-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    stroke-width: 1.8;
  }

  :global(.app-shell__footer-control-icon--shortcuts) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
  }

  .app-shell__footer-help-button:hover,
  .app-shell__footer-help-button--open {
    color: var(--color-text-primary);
  }

  .app-shell__footer-help-menu {
    position: absolute;
    z-index: 260;
    right: 0;
    bottom: calc(100% + var(--space-2));
    width: min(42rem, calc(100vw - 2rem));
    max-height: min(34rem, calc(100vh - 6rem));
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.8fr);
    overflow: hidden;
    border: 1px solid var(--app-shell-footer-menu-border, var(--color-border-strong));
    border-radius: var(--radius-large);
    background: var(--app-shell-footer-menu-surface, var(--color-background-elevated));
    box-shadow: var(--app-shell-footer-menu-shadow, var(--shadow-popover));
  }

  .app-shell__footer-help-menu-bottom {
    border-left: 1px solid var(--color-border-subtle);
    background: var(--app-shell-footer-menu-panel, var(--color-background-panel));
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 0;
  }

  .app-shell__footer-help-menu-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .app-shell__footer-help-menu-header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: 0 0 auto;
  }

  .app-shell__footer-help-menu-eyebrow {
    margin: 0;
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .app-shell__footer-help-menu-title {
    margin: 0;
    font-size: 0.84rem;
  }

  .app-shell__footer-help-menu-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.45rem;
    height: 1.25rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: var(--color-background-selected);
    color: var(--color-text-primary);
    font-size: 0.65rem;
  }

  .app-shell__footer-help-menu-filter {
    min-height: 1.4rem;
    padding: 0 var(--space-2);
    border-radius: var(--radius-small);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-background-panel);
    color: var(--color-text-secondary);
    font-size: 0.68rem;
  }

  .app-shell__footer-help-menu-filter:hover,
  .app-shell__footer-help-menu-filter--active {
    color: var(--color-text-primary);
    border-color: var(--color-border-focus);
    background: var(--color-background-selected);
  }

  .app-shell__footer-help-menu-filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .app-shell__footer-help-menu-groups {
    min-height: 0;
    overflow: auto;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .app-shell__footer-help-menu-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .app-shell__footer-help-menu-section-title {
    margin: 0;
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .app-shell__footer-help-menu-empty {
    padding: var(--space-4);
    color: var(--color-text-secondary);
    font-size: 0.74rem;
  }

  .app-shell__footer-shortcuts-menu {
    left: 0;
    right: auto;
    width: min(48rem, calc(100vw - 2rem));
  }

  .app-shell__footer-shortcuts-menu-search-shell {
    display: flex;
  }

  .app-shell__footer-shortcuts-menu-search {
    width: 100%;
    min-height: 1.7rem;
    padding: 0 var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--app-shell-footer-menu-muted, var(--color-background-muted));
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.72rem;
  }

  .app-shell__footer-shortcuts-menu-search::placeholder {
    color: var(--color-text-muted);
  }

  .app-shell__footer-shortcuts-menu-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .app-shell__footer-shortcuts-menu-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--app-shell-footer-menu-card, var(--color-background-muted));
  }

  .app-shell__footer-shortcuts-menu-item-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
  }

  .app-shell__footer-shortcuts-menu-item-command {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .app-shell__footer-shortcuts-menu-item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .app-shell__footer-shortcuts-menu-item-type {
    flex: 0 0 auto;
    font-size: 0.62rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .app-shell__footer-shortcuts-menu-item-summary {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
  }

  .app-shell__footer-shortcuts-menu-item-meta {
    display: flex;
    gap: var(--space-1);
    color: var(--color-text-muted);
    font-size: 0.62rem;
  }

  @media (max-width: 760px) {
    .app-shell__footer-left {
      display: none;
    }
  }
</style>
