<script lang="ts">
  import TechnicalDocsRegistrySwitcher, {
    type TechnicalDocsRegistrySwitcherEntry
  } from './TechnicalDocsRegistrySwitcher.svelte';

  type RegistryWorkbenchId = TechnicalDocsRegistrySwitcherEntry['id'];

  export let entries: TechnicalDocsRegistrySwitcherEntry[] = [];
  export let activeId: RegistryWorkbenchId;
  export let onSelect: (id: RegistryWorkbenchId) => void = () => {};
</script>

<section class="technical-docs-registry-workbench technical-docs-view__registry-workbench" aria-label="Registry workbench">
  <TechnicalDocsRegistrySwitcher
    {entries}
    {activeId}
    {onSelect}
  />

  <div class="technical-docs-registry-workbench__main technical-docs-view__registry-workbench-main">
    <slot />
  </div>
</section>

<style>
  .technical-docs-registry-workbench {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
    align-items: stretch;
    min-height: 0;
    overflow: hidden;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-surface) 70%, transparent), transparent 26rem),
      color-mix(in srgb, var(--color-background-muted) 52%, transparent);
  }

  .technical-docs-registry-workbench__main {
    display: grid;
    min-width: 0;
    min-height: 0;
    overflow: auto;
  }

  @media (max-width: 980px) {
    .technical-docs-registry-workbench {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
