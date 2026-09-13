<script lang="ts">
  import type { DesignSystemThemeMode } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import {
    createDesignSystemThemeContractSummary,
    createDesignSystemThemeProjection,
    type DesignSystemThemeDocument
  } from '../designSystemThemeCatalog';

  import type { FooterControlId } from './footerControl';

  export let hoveredFooterControl: FooterControlId | null = null;
  export let themeDocument: DesignSystemThemeDocument | null = null;
  export let themeControlElement: HTMLDivElement | null = null;
  export let themeMenuElement: HTMLDivElement | null = null;
  export let isThemeMenuOpen = false;
  export let activeDesignThemeMode: DesignSystemThemeMode = 'dark';
  export let toggleThemeMenu: () => void = () => undefined;
  export let toggleDesignThemeMode: () => void = () => undefined;
  export let openDesignGraphDocsRoute: () => void = () => undefined;

  $: themeProjection = createDesignSystemThemeProjection(themeDocument);
  $: designSystemThemeDocument = themeProjection.document;
  $: designSystemThemeRegistry = themeProjection.registry;
  $: designSystemThemeSyncPreview = themeProjection.syncPreview;
  $: footerThemeContract = createDesignSystemThemeContractSummary(designSystemThemeDocument);
  const i18nT = getWorkbenchTranslator();

  $: activeThemeModeLabel = $i18nT(`ui.shell.launchGate.preferences.theme.${activeDesignThemeMode}`, {
    default: activeDesignThemeMode
  });
  $: nextThemeMode = activeDesignThemeMode === 'dark' ? 'light' : 'dark';
  $: nextThemeModeLabel = $i18nT(`ui.shell.launchGate.preferences.theme.${nextThemeMode}`, {
    default: nextThemeMode
  });
  $: themeLabel = $i18nT('ui.shell.footer.theme.title', { default: 'Theme' });
</script>

<div
  bind:this={themeControlElement}
  role="presentation"
  class:app-shell__footer-control--open={isThemeMenuOpen}
  class="app-shell__footer-theme-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'theme')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <button
    type="button"
    class="app-shell__footer-theme"
    aria-label={themeLabel}
    aria-haspopup="menu"
    aria-expanded={isThemeMenuOpen}
    title={`${themeLabel} · ${activeThemeModeLabel}`}
    on:click={toggleThemeMenu}
  >
    <span class="app-shell__footer-theme-icon" aria-hidden="true">
      <WorkbenchIcon icon="action.palette" label="" />
    </span>
    <span class="app-shell__footer-theme-mode">{activeThemeModeLabel}</span>
  </button>

  <button
    type="button"
    class="app-shell__footer-theme-mode-toggle"
    class:app-shell__footer-theme-mode-toggle--light={activeDesignThemeMode === 'light'}
    role="switch"
    aria-label={$i18nT('ui.shell.launchGate.preferences.switchTheme', {
      default: 'Switch to {{mode}} theme',
      values: { mode: nextThemeModeLabel }
    })}
    aria-checked={activeDesignThemeMode === 'light'}
    title={`${themeLabel} · ${activeThemeModeLabel}`}
    on:click={toggleDesignThemeMode}
  >
    <span class="app-shell__footer-theme-switch-track" aria-hidden="true">
      <span class="app-shell__footer-theme-switch-icon app-shell__footer-theme-switch-icon--moon"></span>
      <span class="app-shell__footer-theme-switch-icon app-shell__footer-theme-switch-icon--sun"></span>
      <span class="app-shell__footer-theme-switch-thumb">
        <span></span>
      </span>
    </span>
  </button>

  {#if isThemeMenuOpen}
    <div
      bind:this={themeMenuElement}
      class="app-shell__footer-help-menu app-shell__footer-theme-menu"
      role="menu"
      aria-label={themeLabel}
    >
      {#if !themeDocument}
        <p role="status">{$i18nT('ui.shell.docs.theme.unavailable')}</p>
      {:else}
      <div class="app-shell__footer-help-menu-groups">
        <section class="app-shell__footer-help-menu-section">
          <header class="app-shell__footer-help-menu-section-header">
            <h4 class="app-shell__footer-help-menu-section-title">{designSystemThemeRegistry.title}</h4>
          </header>
          <div class="app-shell__footer-help-menu-items">
            {#each designSystemThemeRegistry.modes as mode (mode.id)}
              <article class="app-shell__footer-help-menu-item">
                <div class="app-shell__footer-help-menu-item-head">
                  <strong class="app-shell__footer-help-menu-item-title">{mode.label}</strong>
                  <span class="app-shell__footer-help-menu-item-status">{mode.kind}</span>
                </div>
                <p class="app-shell__footer-help-menu-item-summary">{mode.description}</p>
                <div class="app-shell__footer-help-menu-item-meta">
                  <span class="app-shell__footer-help-menu-item-path">{mode.collection || mode.target}</span>
                  <span class="app-shell__footer-help-menu-item-tags">{mode.mode || 'default'} · {mode.source}</span>
                </div>
              </article>
            {/each}
          </div>
        </section>

        <section class="app-shell__footer-help-menu-section">
          <header class="app-shell__footer-help-menu-section-header">
            <h4 class="app-shell__footer-help-menu-section-title">Sync State</h4>
          </header>
          <div class="app-shell__footer-theme-state">
            <span data-status="synced">{designSystemThemeSyncPreview.counts.synced} synced</span>
            <span data-status="mismatch">{designSystemThemeSyncPreview.counts.mismatch} mismatch</span>
            <span data-status="missing">{designSystemThemeSyncPreview.counts.missing} missing</span>
            <span data-status="orphan">{designSystemThemeSyncPreview.counts.orphan} orphan</span>
          </div>
        </section>
      </div>

      <div class="app-shell__footer-help-menu-bottom">
        <div class="app-shell__footer-help-menu-header">
          <div>
            <p class="app-shell__footer-help-menu-eyebrow">Design System</p>
            <h3 class="app-shell__footer-help-menu-title">{footerThemeContract.figmaTarget?.collection ?? designSystemThemeDocument.metadata.figmaCollection}</h3>
          </div>
          <div class="app-shell__footer-help-menu-header-actions">
            <span class="app-shell__footer-help-menu-count">{footerThemeContract.figmaVariableCount} Figma vars</span>
            <button type="button" class="app-shell__footer-help-menu-open" on:click={openDesignGraphDocsRoute}>
              Open Graph
            </button>
          </div>
        </div>
      </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .app-shell__footer-theme-group {
    color: var(--app-shell-footer-control-text, var(--color-text-secondary));
  }

  .app-shell__footer-theme {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: var(--app-shell-footer-control-gap, 0.32rem);
    padding: 0 var(--app-shell-footer-control-padding-x, 0.54rem);
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  .app-shell__footer-theme:hover,
  .app-shell__footer-theme-mode-toggle:hover {
    color: var(--app-shell-footer-control-text-active, var(--color-text-primary));
  }

  .app-shell__footer-theme-mode-toggle {
    width: 2.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-left: 1px solid var(--app-shell-footer-control-border, var(--color-border-subtle));
    border-radius: 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0;
  }

  .app-shell__footer-theme-mode-toggle[aria-checked='true'] {
    color: var(--color-text-primary);
  }

  .app-shell__footer-theme-switch-track {
    position: relative;
    display: block;
    width: 1.95rem;
    height: 1rem;
    margin: 0 auto;
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--color-accent-primary) 18%, transparent), transparent),
      var(--color-background-panel);
    overflow: hidden;
  }

  .app-shell__footer-theme-mode-toggle--light .app-shell__footer-theme-switch-track {
    background:
      linear-gradient(90deg, transparent, color-mix(in srgb, #f8c948 32%, transparent)),
      color-mix(in srgb, var(--color-background-elevated) 88%, white 12%);
  }

  .app-shell__footer-theme-switch-thumb {
    position: absolute;
    top: 50%;
    left: 0.12rem;
    width: 0.72rem;
    height: 0.72rem;
    transform: translateY(-50%);
    border-radius: 999px;
    background: var(--color-text-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, black 42%, transparent);
    transition:
      transform var(--motion-duration-fast) var(--motion-ease-standard),
      background var(--motion-duration-fast) var(--motion-ease-standard);
  }

  .app-shell__footer-theme-mode-toggle--light .app-shell__footer-theme-switch-thumb {
    transform: translate(0.82rem, -50%);
    background: #f8c948;
  }

  .app-shell__footer-theme-switch-thumb span {
    position: absolute;
    inset: 0.18rem;
    border-radius: inherit;
    background: color-mix(in srgb, var(--color-background-panel) 70%, transparent);
    opacity: 0.55;
  }

  .app-shell__footer-theme-mode-toggle--light .app-shell__footer-theme-switch-thumb span {
    opacity: 0;
  }

  .app-shell__footer-theme-switch-icon {
    position: absolute;
    top: 50%;
    width: 0.34rem;
    height: 0.34rem;
    transform: translateY(-50%);
    border-radius: 999px;
    opacity: 0.85;
  }

  .app-shell__footer-theme-switch-icon--moon {
    right: 0.28rem;
    background: color-mix(in srgb, var(--color-text-primary) 82%, transparent);
  }

  .app-shell__footer-theme-switch-icon--sun {
    left: 0.26rem;
    background: #f8c948;
    box-shadow: 0 0 0.35rem color-mix(in srgb, #f8c948 72%, transparent);
  }

  .app-shell__footer-theme-mode-toggle:not(.app-shell__footer-theme-mode-toggle--light) .app-shell__footer-theme-switch-icon--sun,
  .app-shell__footer-theme-mode-toggle--light .app-shell__footer-theme-switch-icon--moon {
    opacity: 0.18;
  }

  .app-shell__footer-theme-icon {
    width: var(--app-shell-footer-icon-size, 0.76rem);
    height: var(--app-shell-footer-icon-size, 0.76rem);
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-primary);
  }

  .app-shell__footer-theme-mode {
    font-size: var(--app-shell-footer-control-font-size, 0.7rem);
    line-height: 1;
    white-space: nowrap;
  }

  .app-shell__footer-theme-mode {
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .app-shell__footer-theme-group {
    gap: 0;
  }

  .app-shell__footer-theme-group .app-shell__footer-theme {
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  .app-shell__footer-theme-group .app-shell__footer-theme-mode-toggle {
    border-radius: 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0;
  }

  .app-shell__footer-theme-menu {
    width: min(44rem, calc(100vw - 2rem));
  }

  .app-shell__footer-theme-state {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .app-shell__footer-theme-state span {
    min-height: 1.35rem;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
    background: var(--color-background-panel);
    font-size: 0.66rem;
  }

  .app-shell__footer-theme-state span[data-status='synced'] {
    color: var(--color-status-success);
  }

  .app-shell__footer-theme-state span[data-status='mismatch'] {
    color: var(--color-status-warning);
  }

  .app-shell__footer-theme-state span[data-status='missing'],
  .app-shell__footer-theme-state span[data-status='orphan'] {
    color: var(--color-text-muted);
  }

  .app-shell__footer-help-menu {
    position: absolute;
    z-index: 90;
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

  .app-shell__footer-help-menu-open {
    min-height: 1.4rem;
    padding: 0 var(--space-2);
    border-radius: var(--radius-small);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-background-panel);
    color: var(--color-text-secondary);
    font-size: 0.68rem;
  }

  .app-shell__footer-help-menu-open:hover {
    color: var(--color-text-primary);
    border-color: var(--color-border-focus);
    background: var(--color-background-selected);
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

  .app-shell__footer-help-menu-section + .app-shell__footer-help-menu-section {
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-subtle);
  }

  .app-shell__footer-help-menu-section-title {
    margin: 0;
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .app-shell__footer-help-menu-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .app-shell__footer-help-menu-item {
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--app-shell-footer-menu-card, var(--color-background-muted));
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .app-shell__footer-help-menu-item-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .app-shell__footer-help-menu-item-title {
    font-size: 0.76rem;
  }

  .app-shell__footer-help-menu-item-status {
    flex: 0 0 auto;
    color: var(--color-text-muted);
    font-size: 0.64rem;
  }

  .app-shell__footer-help-menu-item-summary {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .app-shell__footer-help-menu-item-meta {
    display: flex;
    gap: var(--space-2);
    min-width: 0;
    color: var(--color-text-muted);
    font-size: 0.62rem;
  }

  .app-shell__footer-help-menu-item-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    .app-shell__footer-help-menu {
      width: calc(100vw - 1rem);
      right: -0.4rem;
    }
  }
</style>
