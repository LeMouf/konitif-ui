<script lang="ts">
  import type {
    RepoQualityDimensionId,
    RepoQualityFileEvaluation,
    RepoQualityWorkspaceEvaluation,
    WorkbenchIconInput
  } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  type RepoQualityGroup = {
    workspace: RepoQualityWorkspaceEvaluation;
    files: RepoQualityFileEvaluation[];
  };

  const dimensions = ['tests', 'docs', 'decoupling'] as const satisfies RepoQualityDimensionId[];

  export let groups: RepoQualityGroup[] = [];
  export let icon: WorkbenchIconInput = 'docs.registry';

  function formatPercent(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  function formatLines(lineCount: number): string {
    return new Intl.NumberFormat('en-US').format(lineCount);
  }

  function formatSourceLabel(sourceFile: string): string {
    return sourceFile.split('/').pop() ?? sourceFile;
  }

  function formatWorkspaceCoverage(workspace: RepoQualityWorkspaceEvaluation): string {
    const coverage = workspace.coverage;

    if (!coverage) {
      return `decoupling ${formatPercent(workspace.scores.decoupling)}, ${workspace.missingCount} missing evidence, ${workspace.riskCount} decoupling risks`;
    }

    return `coverage ${coverage.fullyCoveredFiles}/${coverage.sourceFiles}, tests ${coverage.testEvidenceFiles}/${coverage.sourceFiles}, docs ${coverage.docEvidenceFiles}/${coverage.sourceFiles}`;
  }
</script>

<div class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--quality technical-docs-view__registry-dataset-row--head" aria-hidden="true">
  <span>Entry</span>
  <span>Lines</span>
  <span>Tests</span>
  <span>Docs</span>
  <span>Decoupling</span>
  <span>Finding</span>
</div>

{#each groups as group (group.workspace.id)}
  <details class="technical-docs-view__repo-quality-group">
    <summary class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--quality technical-docs-view__registry-dataset-row--quality-group">
      <span class="technical-docs-view__registry-dataset-entry">
        <span class="technical-docs-view__repo-quality-disclosure" aria-hidden="true">
          <WorkbenchIcon icon="action.chevron-down" label={group.workspace.path} />
        </span>
        <strong>{group.workspace.path}</strong>
        <em>{group.workspace.fileCount} files</em>
      </span>
      <span class="technical-docs-view__repo-quality-lines">{formatLines(group.workspace.lineCount)}</span>
      {#each dimensions as dimension (dimension)}
        <span
          class="technical-docs-view__repo-quality-cell"
          data-status={group.workspace.statuses[dimension]}
        >
          <b>{formatPercent(group.workspace.scores[dimension])}</b>
          <i style={`--repo-quality-score: ${formatPercent(group.workspace.scores[dimension])}`}></i>
        </span>
      {/each}
      <span class="technical-docs-view__repo-quality-finding">{formatWorkspaceCoverage(group.workspace)}</span>
    </summary>
    <div class="technical-docs-view__repo-quality-children">
      {#each group.files as file (file.path)}
        <article class="technical-docs-view__registry-dataset-row technical-docs-view__registry-dataset-row--quality technical-docs-view__registry-dataset-row--quality-file" data-tone={file.statuses.decoupling === 'risk' ? 'runtime' : 'shared'}>
          <div>
            <WorkbenchIcon {icon} label={file.path} />
            <strong>{formatSourceLabel(file.path)}</strong>
            <em>{file.layer} / {file.kind}</em>
          </div>
          <span class="technical-docs-view__repo-quality-lines">{formatLines(file.lineCount)}</span>
          {#each dimensions as dimension (dimension)}
            <span
              class="technical-docs-view__repo-quality-cell"
              data-status={file.statuses[dimension]}
            >
              <b>{formatPercent(file.scores[dimension])}</b>
              <i style={`--repo-quality-score: ${formatPercent(file.scores[dimension])}`}></i>
            </span>
          {/each}
          <p>{file.findings.length ? file.findings.join(' ') : 'No current quality finding.'}</p>
        </article>
      {/each}
    </div>
  </details>
{:else}
  <p class="technical-docs-view__product-empty">Aucune entrée ne correspond au filtre actif.</p>
{/each}

<style>
  .technical-docs-view__registry-dataset-row {
    display: grid;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
    min-height: 2.35rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 52%, transparent);
  }

  .technical-docs-view__registry-dataset-row--quality {
    grid-template-columns:
      minmax(13rem, 1.15fr)
      minmax(4rem, 0.28fr)
      minmax(7rem, 0.48fr)
      minmax(7rem, 0.48fr)
      minmax(7rem, 0.48fr)
      minmax(12rem, 1.25fr);
  }

  .technical-docs-view__registry-dataset-row--head {
    min-height: 1.85rem;
    padding-block: 0;
    background: transparent;
  }

  .technical-docs-view__registry-dataset-row div,
  .technical-docs-view__registry-dataset-entry {
    display: grid;
    align-items: center;
    gap: var(--space-5);
    grid-template-columns: 1rem minmax(0, 1fr);
    min-width: 0;
  }

  .technical-docs-view__registry-dataset-row div em,
  .technical-docs-view__registry-dataset-entry em {
    grid-column: 2;
  }

  .technical-docs-view__registry-dataset-row strong,
  .technical-docs-view__registry-dataset-row em,
  .technical-docs-view__registry-dataset-row span,
  .technical-docs-view__registry-dataset-row p {
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
  .technical-docs-view__registry-dataset-row p {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__repo-quality-group {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__repo-quality-group summary {
    cursor: pointer;
    list-style: none;
  }

  .technical-docs-view__repo-quality-group summary::-webkit-details-marker {
    display: none;
  }

  .technical-docs-view__repo-quality-disclosure {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-action-primary);
    transition: transform 140ms ease;
  }

  .technical-docs-view__repo-quality-group[open] .technical-docs-view__repo-quality-disclosure {
    transform: rotate(90deg);
  }

  .technical-docs-view__repo-quality-children {
    display: grid;
    gap: var(--space-4);
    margin: var(--space-4) 0 0 var(--space-12);
    padding-left: var(--space-8);
    border-left: 1px solid color-mix(in srgb, var(--color-border-subtle) 75%, transparent);
  }

  .technical-docs-view__registry-dataset-row--quality-file {
    opacity: 0.92;
  }

  .technical-docs-view__repo-quality-lines {
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .technical-docs-view__repo-quality-cell {
    display: grid;
    align-content: center;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__repo-quality-cell b {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.75rem;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__repo-quality-cell i {
    display: block;
    overflow: hidden;
    height: 0.45rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-view__repo-quality-cell i::before {
    display: block;
    width: var(--repo-quality-score);
    height: 100%;
    border-radius: inherit;
    background: var(--color-status-success);
    content: '';
  }

  .technical-docs-view__repo-quality-cell[data-status='partial'] i::before {
    background: var(--color-status-warning);
  }

  .technical-docs-view__repo-quality-cell[data-status='missing'] i::before,
  .technical-docs-view__repo-quality-cell[data-status='risk'] i::before {
    background: var(--color-status-danger);
  }

  .technical-docs-view__repo-quality-finding {
    color: var(--color-text-secondary);
  }

  .technical-docs-view__product-empty {
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-medium);
    color: var(--color-text-muted);
  }
</style>
