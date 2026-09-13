<script context="module" lang="ts">
  export type AppShellViewEntry = {
    id: string;
    label: string;
  };
</script>

<script lang="ts">
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  export let shellViews: readonly AppShellViewEntry[];
  export let activeShellViewId: string;
  export let onSelectShellView: (viewId: string) => void;

  const i18nT = getWorkbenchTranslator();
</script>

<nav class="app-shell__view-nav" aria-label={$i18nT('ui.shell.toolbar.views.ariaLabel', { default: 'Workbench views' })}>
  {#each shellViews as view}
    <button
      type="button"
      class:app-shell__view-link--active={view.id === activeShellViewId}
      class="app-shell__view-link"
      aria-current={view.id === activeShellViewId ? 'page' : undefined}
      on:click={() => onSelectShellView(view.id)}
    >
      {view.label}
    </button>
  {/each}
</nav>

<style>
  .app-shell__view-nav {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
    justify-self: center;
  }

  .app-shell__view-link {
    appearance: none;
    min-height: 1.75rem;
    border: 0;
    border-radius: calc(var(--radius-medium) - var(--space-2));
    padding: 0 var(--space-10);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-body);
    line-height: 1;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
  }

  .app-shell__view-link:hover {
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell__view-link:active {
    background: var(--color-background-pressed);
  }

  .app-shell__view-link:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }

  .app-shell__view-link--active {
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }
</style>
