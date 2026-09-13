<script lang="ts">
  import type {
    RepoQualityFileEvaluation,
    RepoQualityWorkspaceEvaluation,
    WorkbenchIconInput
  } from '@konitif/workbench';
  import TechnicalDocsCoverageSummary, {
    type TechnicalDocsCoverageCard
  } from './TechnicalDocsCoverageSummary.svelte';
  import TechnicalDocsLanguageRegistryDatasetTable from './TechnicalDocsLanguageRegistryDatasetTable.svelte';
  import TechnicalDocsRegistryDatasetTable from './TechnicalDocsRegistryDatasetTable.svelte';
  import TechnicalDocsRegistrySearchToolbar from './TechnicalDocsRegistrySearchToolbar.svelte';
  import TechnicalDocsRepoQualityDatasetTable from './TechnicalDocsRepoQualityDatasetTable.svelte';

  type RegistryDatasetRow = {
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    detail: string;
    tone: 'design' | 'runtime' | 'template' | 'product' | 'shared';
    sourceFile?: string;
    languageScores?: Record<string, number>;
    languageStatuses?: Record<string, string>;
    languageValues?: Record<string, string | undefined>;
  };

  type RepoQualityGroup = {
    workspace: RepoQualityWorkspaceEvaluation;
    files: RepoQualityFileEvaluation[];
  };

  export let activeRegistryId = '';
  export let query = '';
  export let rows: RegistryDatasetRow[] = [];
  export let totalRows = 0;
  export let repoQualityGroups: RepoQualityGroup[] = [];
  export let repoQualityFilteredRowCount = 0;
  export let repoQualityTotalRowCount = 0;
  export let repoQualitySummaryCards: TechnicalDocsCoverageCard[] = [];
  export let languageCoverageSummaryCards: TechnicalDocsCoverageCard[] = [];
  export let languageLocales: string[] = [];
  export let icon: WorkbenchIconInput = 'docs.registry';
  export let fallbackSource = 'source unavailable';

  $: countLabel = activeRegistryId === 'quality'
    ? `${repoQualityFilteredRowCount} / ${repoQualityTotalRowCount}`
    : `${rows.length} / ${totalRows}`;
</script>

<section class="technical-docs-view__registry-dataset" aria-label="Registry dataset">
  <main class="technical-docs-view__registry-dataset-main">
    <TechnicalDocsRegistrySearchToolbar bind:query countLabel={countLabel} />

    {#if activeRegistryId === 'quality'}
      <TechnicalDocsCoverageSummary
        ariaLabel="Repo quality percentages"
        cards={repoQualitySummaryCards}
        variant="repo-quality"
      />
    {:else if activeRegistryId === 'language'}
      <TechnicalDocsCoverageSummary
        ariaLabel="Language coverage percentages"
        cards={languageCoverageSummaryCards}
        variant="language-registry"
      />
    {/if}

    <div class="technical-docs-view__registry-dataset-table">
      {#if activeRegistryId === 'quality'}
        <TechnicalDocsRepoQualityDatasetTable groups={repoQualityGroups} {icon} />
      {:else if activeRegistryId === 'language'}
        <TechnicalDocsLanguageRegistryDatasetTable
          {rows}
          locales={languageLocales}
          {icon}
          {fallbackSource}
        />
      {:else}
        <TechnicalDocsRegistryDatasetTable {rows} {icon} {fallbackSource} />
      {/if}
    </div>
  </main>
</section>

<style>
  .technical-docs-view__registry-dataset {
    display: block;
    min-height: 0;
    min-width: 0;
  }

  .technical-docs-view__registry-dataset-main {
    display: grid;
    align-content: start;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: var(--space-8);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 8%, transparent), transparent),
      color-mix(in srgb, var(--color-background-surface) 56%, transparent);
  }

  .technical-docs-view__registry-dataset-table {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-width: 0;
    min-height: 0;
    overflow: auto;
  }
</style>
