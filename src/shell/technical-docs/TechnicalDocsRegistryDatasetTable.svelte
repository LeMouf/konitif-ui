<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  type RegistryDatasetRow = {
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    detail: string;
    tone: 'design' | 'runtime' | 'template' | 'product' | 'shared';
    sourceFile?: string;
  };

  export let rows: RegistryDatasetRow[] = [];
  export let icon: WorkbenchIconInput = 'docs.registry';
  export let fallbackSource = 'source unavailable';
</script>

<div class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--head" aria-hidden="true">
  <span>Entry</span>
  <span>Meta</span>
  <span>Detail</span>
  <span>Source</span>
</div>

{#each rows as row (row.id)}
  <article class="technical-docs-view__registry-dataset-row" data-tone={row.tone}>
    <div>
      <WorkbenchIcon {icon} label={row.title} />
      <strong>{row.title}</strong>
      <em>{row.subtitle}</em>
    </div>
    <span>{row.meta}</span>
    <p>{row.detail}</p>
    <code>{row.sourceFile ?? fallbackSource}</code>
  </article>
{:else}
  <p class="technical-docs-view__product-empty">Aucune entrée ne correspond au filtre actif.</p>
{/each}

<style>
  .technical-docs-view__registry-dataset-row {
    display: grid;
    align-items: center;
    gap: var(--space-8);
    grid-template-columns: minmax(14rem, 0.72fr) minmax(6rem, 0.24fr) minmax(16rem, 1fr) minmax(12rem, 0.5fr);
    min-width: 0;
    min-height: 2.45rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
  }

  .technical-docs-view__registry-dataset-row--head {
    min-height: 1.85rem;
    padding-block: 0;
    background: transparent;
  }

  .technical-docs-view__registry-dataset-row div {
    display: grid;
    align-items: center;
    gap: var(--space-5);
    grid-template-columns: 1rem minmax(0, 1fr);
    min-width: 0;
  }

  .technical-docs-view__registry-dataset-row div em {
    grid-column: 2;
  }

  .technical-docs-view__registry-dataset-row strong,
  .technical-docs-view__registry-dataset-row em,
  .technical-docs-view__registry-dataset-row span,
  .technical-docs-view__registry-dataset-row p,
  .technical-docs-view__registry-dataset-row code {
    overflow: hidden;
    margin: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__registry-dataset-row strong {
    color: var(--color-text-primary);
    font-size: 0.75rem;
  }

  .technical-docs-view__registry-dataset-row em,
  .technical-docs-view__registry-dataset-row span,
  .technical-docs-view__registry-dataset-row p,
  .technical-docs-view__registry-dataset-row code {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
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
