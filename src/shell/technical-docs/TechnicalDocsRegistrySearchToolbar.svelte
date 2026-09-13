<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  export let query = '';
  export let placeholder = 'Filtrer ce registre...';
  export let countLabel = '';
</script>

<div class="technical-docs-view__icon-registry-toolbar">
  <label>
    <WorkbenchIcon icon="action.search" label="Search" />
    <input type="search" bind:value={query} {placeholder} />
  </label>
  <span>{countLabel}</span>
</div>

<style>
  .technical-docs-view__icon-registry-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
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

  .technical-docs-view__icon-registry-toolbar span {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    white-space: nowrap;
  }
</style>
