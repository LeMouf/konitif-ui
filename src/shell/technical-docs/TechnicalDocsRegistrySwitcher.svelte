<script context="module" lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';

  type RegistryWorkbenchId =
    | 'quality'
    | 'language'
    | 'icons'
    | 'shortcuts'
    | 'theme'
    | 'design'
    | 'features'
    | 'rules'
    | 'tests'
    | 'product'
    | 'archetypes'
    | 'semantic-graph'
    | 'architecture-projections'
    | 'svg';
  type ProductMapTone = 'design' | 'runtime' | 'template' | 'product' | 'shared';

  export type TechnicalDocsRegistrySwitcherEntry = {
    id: RegistryWorkbenchId;
    title: string;
    count: number;
    tone: ProductMapTone;
    icon: WorkbenchIconInput;
    status: string;
  };

</script>

<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  export let entries: TechnicalDocsRegistrySwitcherEntry[] = [];
  export let activeId: RegistryWorkbenchId = 'quality';
  export let onSelect: (id: RegistryWorkbenchId) => void = () => {};
</script>

<nav class="technical-docs-registry-switcher" aria-label="Registry selector">
  {#each entries as entry (entry.id)}
    <button
      type="button"
      data-tone={entry.tone}
      class:technical-docs-registry-switcher__item--active={activeId === entry.id}
      on:click={() => onSelect(entry.id)}
    >
      <WorkbenchIcon icon={entry.icon} label={entry.title} />
      <strong>{entry.title}</strong>
      <span>{entry.count}</span>
      <em>{entry.status}</em>
    </button>
  {/each}
</nav>

<style>
  .technical-docs-registry-switcher,
  .technical-docs-registry-switcher button {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .technical-docs-registry-switcher {
    position: sticky;
    top: var(--space-8);
    flex-direction: column;
    gap: var(--space-5);
    max-height: calc(100dvh - 10rem);
    overflow: auto;
    padding: var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-surface) 56%, transparent);
  }

  .technical-docs-registry-switcher button {
    gap: var(--space-6);
    width: 100%;
    min-height: 2.25rem;
    padding: var(--space-6) var(--space-8);
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 34%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 11%, transparent), transparent),
      color-mix(in srgb, var(--color-background-surface) 58%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .technical-docs-registry-switcher button:hover,
  .technical-docs-registry-switcher__item--active {
    border-color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 72%, var(--color-border-subtle)) !important;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 14%, var(--color-background-surface)) !important;
    color: var(--color-text-primary);
  }

  .technical-docs-registry-switcher strong,
  .technical-docs-registry-switcher em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-registry-switcher strong {
    flex: 1 1 auto;
    font-size: 0.75rem;
  }

  .technical-docs-registry-switcher span {
    flex: 0 0 auto;
    padding: 0.05rem var(--space-4);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 18%, transparent);
    color: var(--product-tone-color, var(--color-action-primary));
    font-size: 0.65rem;
  }

  .technical-docs-registry-switcher em {
    display: none;
    color: var(--color-text-muted);
    font-size: 0.65rem;
    font-style: normal;
  }
</style>
