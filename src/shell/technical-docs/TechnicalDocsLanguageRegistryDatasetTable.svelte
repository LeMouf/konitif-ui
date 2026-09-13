<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  type LanguageRegistryRow = {
    id: string;
    title: string;
    subtitle: string;
    tone: 'design' | 'runtime' | 'template' | 'product' | 'shared';
    sourceFile?: string;
    languageScores?: Record<string, number>;
    languageStatuses?: Record<string, string>;
    languageValues?: Record<string, string | undefined>;
  };

  export let rows: LanguageRegistryRow[] = [];
  export let locales: string[] = [];
  export let icon: WorkbenchIconInput = 'docs.registry';
  export let fallbackSource = 'source unavailable';

  function formatPercent(score: number): string {
    const boundedScore = Math.max(0, Math.min(1, score));
    const flooredPercent = Math.floor(boundedScore * 10000) / 100;
    return `${flooredPercent.toFixed(2)}%`;
  }

  function resolveScore(row: LanguageRegistryRow, locale: string): number {
    return row.languageScores?.[locale] ?? 0;
  }

  function resolveStatus(row: LanguageRegistryRow, locale: string): string {
    return row.languageStatuses?.[locale] ?? 'missing';
  }

  function resolveValue(row: LanguageRegistryRow, locale: string): string {
    return row.languageValues?.[locale] ?? 'missing';
  }
</script>

<div class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--language technical-docs-view__registry-dataset-row--head" aria-hidden="true">
  <span>Entry</span>
  {#each locales as locale (locale)}
    <span>{locale.toUpperCase()}</span>
  {/each}
  <span>Source</span>
</div>

{#each rows as row (row.id)}
  <article class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--language" data-tone={row.tone}>
    <div>
      <WorkbenchIcon {icon} label={row.title} />
      <strong>{row.title}</strong>
      <em>{row.subtitle}</em>
    </div>
    {#each locales as locale (locale)}
      <span
        class="technical-docs-view__language-registry-cell"
        data-status={resolveStatus(row, locale)}
        title={resolveValue(row, locale)}
      >
        <b>{formatPercent(resolveScore(row, locale))}</b>
        <i style={`--language-coverage-score: ${formatPercent(resolveScore(row, locale))}`}></i>
        <small>{resolveValue(row, locale)}</small>
      </span>
    {/each}
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
    min-width: 0;
    min-height: 2.45rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
  }

  .technical-docs-view__registry-dataset-row--language {
    grid-template-columns: minmax(14rem, 0.82fr) repeat(2, minmax(8rem, 0.36fr)) minmax(12rem, 0.56fr);
    min-height: 3.35rem;
    padding-block: var(--space-6);
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
  .technical-docs-view__registry-dataset-row code {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__language-registry-cell {
    display: grid;
    align-content: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .technical-docs-view__language-registry-cell b,
  .technical-docs-view__language-registry-cell small {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.75rem;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__language-registry-cell small {
    color: var(--color-text-muted);
    font-size: 0.625rem;
    font-weight: 600;
  }

  .technical-docs-view__language-registry-cell i {
    display: block;
    overflow: hidden;
    height: 0.45rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-view__language-registry-cell i::before {
    display: block;
    width: var(--language-coverage-score);
    height: 100%;
    border-radius: inherit;
    background: var(--color-status-success);
    content: '';
  }

  .technical-docs-view__language-registry-cell[data-status='partial'] i::before {
    background: var(--color-status-warning);
  }

  .technical-docs-view__language-registry-cell[data-status='missing'] i::before {
    background: var(--color-status-danger);
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
