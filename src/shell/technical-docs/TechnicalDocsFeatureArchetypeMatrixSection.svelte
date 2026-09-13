<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import {
    filterFeatureArchetypeRows,
    formatFeatureArchetypeDate,
    formatFeatureArchetypePercent,
    getFeatureArchetypeCell,
    resolveCellIntensity,
    summarizePresentArchetypes,
    type Archetype,
    type ArchetypeColumn,
    type FeatureArchetypeCell,
    type FeatureArchetypeMatrix,
    type FeatureArchetypeRow
  } from './featureArchetypeMatrixModel';

  export let matrix: FeatureArchetypeMatrix | null = null;
  export let status: 'loading' | 'ready' | 'error' = 'ready';
  export let error = '';
  export let sourceLabel = 'docs/generated/feature-archetype-matrix.json';

  let packageFilter = 'all';
  let featureQuery = '';
  let archetypeFilter: Archetype | 'all' = 'all';
  let selectedFeatureId = '';
  let selectedCellKey = '';

  $: columns = matrix?.columns ?? [];
  $: visibleColumns = archetypeFilter === 'all'
    ? columns
    : columns.filter((column) => column.archetype === archetypeFilter);
  $: packageOptions = matrix
    ? [...new Set(matrix.rows.flatMap((row) => row.packageNames))].sort()
    : [];
  $: filteredRows = matrix
    ? filterFeatureArchetypeRows(matrix.rows, {
        packageName: packageFilter,
        featureQuery,
        archetype: archetypeFilter
      })
    : [];
  $: if (packageFilter !== 'all' && !packageOptions.includes(packageFilter)) {
    packageFilter = 'all';
  }
  $: if (archetypeFilter !== 'all' && !columns.some((column) => column.archetype === archetypeFilter)) {
    archetypeFilter = 'all';
  }
  $: if (selectedFeatureId && !filteredRows.some((row) => row.featureId === selectedFeatureId)) {
    selectedFeatureId = filteredRows[0]?.featureId ?? '';
    selectedCellKey = '';
  }
  $: selectedFeature = filteredRows.find((row) => row.featureId === selectedFeatureId) ?? filteredRows[0] ?? null;
  $: selectedCell = selectedCellKey ? resolveSelectedCell(filteredRows, selectedCellKey) : null;
  $: selectedPresentArchetypes = selectedFeature ? summarizePresentArchetypes(selectedFeature, columns) : [];
  $: scannedFileCount = matrix?.sourceFiles?.length ?? matrix?.rows.reduce((total, row) => total + countRowEvidenceFiles(row), 0) ?? 0;
  $: gridTemplateColumns = `minmax(13rem, 1.25fr) repeat(${Math.max(visibleColumns.length, 1)}, minmax(4.75rem, 1fr))`;

  function selectFeature(row: FeatureArchetypeRow): void {
    selectedFeatureId = row.featureId;
    selectedCellKey = '';
  }

  function selectCell(row: FeatureArchetypeRow, column: ArchetypeColumn): void {
    const cell = getFeatureArchetypeCell(row, column.archetype);

    selectedFeatureId = row.featureId;
    selectedCellKey = createCellKey(cell);
  }

  function createCellKey(cell: FeatureArchetypeCell): string {
    return `${cell.featureId}:${cell.archetype}`;
  }

  function resolveSelectedCell(rows: FeatureArchetypeRow[], key: string): FeatureArchetypeCell | null {
    for (const row of rows) {
      const cell = row.cells.find((entry) => createCellKey(entry) === key);

      if (cell) {
        return cell;
      }
    }

    return null;
  }

  function countRowEvidenceFiles(row: FeatureArchetypeRow): number {
    return new Set(row.cells.flatMap((cell) => cell.evidences.map((evidence) => evidence.filePath))).size;
  }
</script>

<section class="technical-docs-archetype-matrix" aria-label="Feature archetype matrix">
  {#if status === 'loading'}
    <div class="technical-docs-archetype-matrix__state">
      <WorkbenchIcon icon="docs.registry" label="Loading" />
      <strong>Loading Feature x Archetype Matrix</strong>
      <span>{sourceLabel}</span>
    </div>
  {:else if status === 'error'}
    <div class="technical-docs-archetype-matrix__state" data-state="error">
      <WorkbenchIcon icon="status.warning" label="Error" />
      <strong>Feature x Archetype Matrix unavailable</strong>
      <span>{error || sourceLabel}</span>
    </div>
  {:else if !matrix || matrix.rows.length === 0}
    <div class="technical-docs-archetype-matrix__state">
      <WorkbenchIcon icon="docs.registry" label="Empty" />
      <strong>No archetype evidence found</strong>
      <span>Run pnpm docs:scan:archetypes to regenerate the matrix.</span>
    </div>
  {:else}
    <header class="technical-docs-archetype-matrix__header">
      <div>
        <p>Architecture registry</p>
        <h3>Feature x Archetype Matrix</h3>
      </div>
      <dl>
        <div>
          <dt>Features</dt>
          <dd>{matrix.rows.length}</dd>
        </div>
        <div>
          <dt>Files</dt>
          <dd>{scannedFileCount}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{formatFeatureArchetypeDate(matrix.generatedAt)}</dd>
        </div>
      </dl>
    </header>

    <div class="technical-docs-archetype-matrix__toolbar" aria-label="Matrix filters">
      <label>
        <WorkbenchIcon icon="action.search" label="Search" />
        <input
          type="search"
          bind:value={featureQuery}
          placeholder="Filter feature, package, concept..."
        />
      </label>

      <select bind:value={packageFilter} aria-label="Filter by package">
        <option value="all">All packages</option>
        {#each packageOptions as packageName (packageName)}
          <option value={packageName}>{packageName}</option>
        {/each}
      </select>

      <select bind:value={archetypeFilter} aria-label="Filter by archetype">
        <option value="all">All archetypes</option>
        {#each columns as column (column.archetype)}
          <option value={column.archetype}>{column.label}</option>
        {/each}
      </select>

      <span>{filteredRows.length} / {matrix.rows.length}</span>
    </div>

    <div class="technical-docs-archetype-matrix__body">
      <main class="technical-docs-archetype-matrix__table" aria-label="Archetype heatmap">
        <div
          class="technical-docs-archetype-matrix__row technical-docs-archetype-matrix__row--head"
          style={`grid-template-columns: ${gridTemplateColumns}`}
        >
          <span>Feature</span>
          {#each visibleColumns as column (column.archetype)}
            <span title={column.description}>{column.label}</span>
          {/each}
        </div>

        {#if filteredRows.length === 0}
          <div class="technical-docs-archetype-matrix__empty">No feature matches the active filters.</div>
        {:else}
          {#each filteredRows as row (row.featureId)}
            <div
              class="technical-docs-archetype-matrix__row"
              class:technical-docs-archetype-matrix__row--selected={selectedFeature?.featureId === row.featureId}
              style={`grid-template-columns: ${gridTemplateColumns}`}
            >
              <button type="button" class="technical-docs-archetype-matrix__feature" on:click={() => selectFeature(row)}>
                <strong>{row.label}</strong>
                <span>{row.packageNames.join(', ')}</span>
              </button>

              {#each visibleColumns as column (column.archetype)}
                {@const cell = getFeatureArchetypeCell(row, column.archetype)}
                <button
                  type="button"
                  class="technical-docs-archetype-matrix__cell"
                  class:technical-docs-archetype-matrix__cell--selected={selectedCell && createCellKey(cell) === createCellKey(selectedCell)}
                  data-intensity={resolveCellIntensity(cell)}
                  disabled={cell.score === 0}
                  title={`${row.label} / ${column.label}: ${formatFeatureArchetypePercent(cell.score)}`}
                  on:click={() => selectCell(row, column)}
                >
                  <strong>{cell.score > 0 ? formatFeatureArchetypePercent(cell.score) : '-'}</strong>
                  <span>{cell.evidences.length}</span>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </main>

      <aside class="technical-docs-archetype-matrix__detail" aria-label="Matrix detail">
        {#if selectedCell}
          <header>
            <p>Cell evidence</p>
            <h4>{selectedFeature?.label ?? selectedCell.featureId} / {columns.find((column) => column.archetype === selectedCell?.archetype)?.label ?? selectedCell.archetype}</h4>
            <span>Score {formatFeatureArchetypePercent(selectedCell.score)} · confidence {formatFeatureArchetypePercent(selectedCell.confidence)}</span>
          </header>

          {#if selectedCell.evidences.length === 0}
            <p class="technical-docs-archetype-matrix__empty">No source evidence for this cell.</p>
          {:else}
            <div class="technical-docs-archetype-matrix__evidence-list">
              {#each selectedCell.evidences as evidence (`${evidence.filePath}:${evidence.matchedTerms.join('.')}`)}
                <article>
                  <strong>{evidence.filePath}</strong>
                  <span>{evidence.packageName} · {evidence.occurrences} hits · {formatFeatureArchetypePercent(evidence.confidence)}</span>
                  <em>{evidence.matchedTerms.join(', ')}</em>
                </article>
              {/each}
            </div>
          {/if}
        {:else if selectedFeature}
          <header>
            <p>Feature summary</p>
            <h4>{selectedFeature.label}</h4>
            <span>{selectedFeature.packageNames.join(', ')}</span>
          </header>

          <section>
            <h5>Present archetypes</h5>
            <div class="technical-docs-archetype-matrix__chips">
              {#each selectedPresentArchetypes as label (label)}
                <span>{label}</span>
              {/each}
            </div>
          </section>

          <section>
            <h5>Missing archetypes</h5>
            <div class="technical-docs-archetype-matrix__chips" data-kind="missing">
              {#each selectedFeature.missingArchetypes as archetype (archetype)}
                <span>{columns.find((column) => column.archetype === archetype)?.label ?? archetype}</span>
              {/each}
            </div>
          </section>

          <section>
            <h5>Detected concepts</h5>
            <div class="technical-docs-archetype-matrix__chips" data-kind="concepts">
              {#each selectedFeature.detectedConcepts as concept (concept)}
                <span>{concept}</span>
              {/each}
            </div>
          </section>
        {/if}
      </aside>
    </div>

    <footer class="technical-docs-archetype-matrix__legend" aria-label="Archetype legend">
      {#each columns as column (column.archetype)}
        <span title={column.terms.join(', ')}><strong>{column.label}</strong> {column.description}</span>
      {/each}
    </footer>
  {/if}
</section>

<style>
  .technical-docs-archetype-matrix {
    display: grid;
    align-content: start;
    gap: var(--space-8);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-action-primary) 7%, transparent), transparent 24rem),
      color-mix(in srgb, var(--color-background-surface) 58%, transparent);
  }

  .technical-docs-archetype-matrix__header,
  .technical-docs-archetype-matrix__toolbar,
  .technical-docs-archetype-matrix__body,
  .technical-docs-archetype-matrix__row,
  .technical-docs-archetype-matrix__feature,
  .technical-docs-archetype-matrix__cell,
  .technical-docs-archetype-matrix__detail header,
  .technical-docs-archetype-matrix__state {
    min-width: 0;
  }

  .technical-docs-archetype-matrix__header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .technical-docs-archetype-matrix__header p,
  .technical-docs-archetype-matrix__detail p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.7rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .technical-docs-archetype-matrix__header h3,
  .technical-docs-archetype-matrix__detail h4 {
    margin: var(--space-2) 0 0;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .technical-docs-archetype-matrix__header dl {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-6);
    margin: 0;
  }

  .technical-docs-archetype-matrix__header dl div {
    min-width: 5.5rem;
    padding: var(--space-5) var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-archetype-matrix__header dt {
    color: var(--color-text-muted);
    font-size: 0.65rem;
  }

  .technical-docs-archetype-matrix__header dd {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .technical-docs-archetype-matrix__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
  }

  .technical-docs-archetype-matrix__toolbar label {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    flex: 1 1 16rem;
    height: 2.2rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
  }

  .technical-docs-archetype-matrix__toolbar input,
  .technical-docs-archetype-matrix__toolbar select {
    min-width: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.75rem;
  }

  .technical-docs-archetype-matrix__toolbar input {
    width: 100%;
    border: 0;
    background: transparent;
    outline: 0;
  }

  .technical-docs-archetype-matrix__toolbar select {
    height: 2.2rem;
    padding: 0 var(--space-7);
  }

  .technical-docs-archetype-matrix__toolbar > span {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .technical-docs-archetype-matrix__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
    gap: var(--space-8);
    align-items: start;
  }

  .technical-docs-archetype-matrix__table {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    overflow: auto;
  }

  .technical-docs-archetype-matrix__row {
    display: grid;
    gap: var(--space-3);
    align-items: stretch;
    min-width: 58rem;
  }

  .technical-docs-archetype-matrix__row--head {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .technical-docs-archetype-matrix__row--head span {
    padding: var(--space-4);
    color: var(--color-text-muted);
    font-size: 0.65rem;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }

  .technical-docs-archetype-matrix__row--head span:first-child {
    text-align: left;
  }

  .technical-docs-archetype-matrix__feature,
  .technical-docs-archetype-matrix__cell {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 70%, transparent);
    color: var(--color-text-primary);
    font: inherit;
    cursor: pointer;
  }

  .technical-docs-archetype-matrix__feature {
    display: grid;
    align-content: center;
    gap: var(--space-2);
    min-height: 3rem;
    padding: var(--space-5) var(--space-7);
    text-align: left;
  }

  .technical-docs-archetype-matrix__feature strong,
  .technical-docs-archetype-matrix__feature span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-archetype-matrix__feature strong {
    font-size: 0.8rem;
  }

  .technical-docs-archetype-matrix__feature span {
    color: var(--color-text-muted);
    font-size: 0.68rem;
  }

  .technical-docs-archetype-matrix__cell {
    display: grid;
    place-items: center;
    gap: var(--space-1);
    min-height: 3rem;
    padding: var(--space-3);
  }

  .technical-docs-archetype-matrix__cell strong {
    font-size: 0.78rem;
  }

  .technical-docs-archetype-matrix__cell span {
    color: var(--color-text-muted);
    font-size: 0.62rem;
  }

  .technical-docs-archetype-matrix__cell[data-intensity='none'] {
    opacity: 0.45;
    cursor: default;
  }

  .technical-docs-archetype-matrix__cell[data-intensity='low'] {
    background: color-mix(in srgb, #3b82f6 16%, var(--color-background-surface));
  }

  .technical-docs-archetype-matrix__cell[data-intensity='medium'] {
    background: color-mix(in srgb, #22c55e 24%, var(--color-background-surface));
  }

  .technical-docs-archetype-matrix__cell[data-intensity='high'] {
    background: color-mix(in srgb, #f59e0b 32%, var(--color-background-surface));
  }

  .technical-docs-archetype-matrix__row--selected .technical-docs-archetype-matrix__feature,
  .technical-docs-archetype-matrix__cell--selected {
    border-color: color-mix(in srgb, var(--color-action-primary) 72%, var(--color-border-subtle));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-action-primary) 26%, transparent);
  }

  .technical-docs-archetype-matrix__detail {
    position: sticky;
    top: 0;
    display: grid;
    gap: var(--space-7);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 78%, transparent);
  }

  .technical-docs-archetype-matrix__detail header span {
    display: block;
    margin-top: var(--space-3);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
  }

  .technical-docs-archetype-matrix__detail h5 {
    margin: 0 0 var(--space-4);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .technical-docs-archetype-matrix__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .technical-docs-archetype-matrix__chips span {
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-action-primary) 16%, transparent);
    color: var(--color-text-primary);
    font-size: 0.68rem;
  }

  .technical-docs-archetype-matrix__chips[data-kind='missing'] span {
    background: color-mix(in srgb, var(--color-border-subtle) 44%, transparent);
    color: var(--color-text-muted);
  }

  .technical-docs-archetype-matrix__chips[data-kind='concepts'] span {
    background: color-mix(in srgb, #22c55e 14%, transparent);
  }

  .technical-docs-archetype-matrix__evidence-list {
    display: grid;
    gap: var(--space-4);
    max-height: 32rem;
    overflow: auto;
  }

  .technical-docs-archetype-matrix__evidence-list article {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 42%, transparent);
  }

  .technical-docs-archetype-matrix__evidence-list strong,
  .technical-docs-archetype-matrix__evidence-list span,
  .technical-docs-archetype-matrix__evidence-list em {
    overflow-wrap: anywhere;
    font-size: 0.7rem;
  }

  .technical-docs-archetype-matrix__evidence-list span,
  .technical-docs-archetype-matrix__evidence-list em {
    color: var(--color-text-muted);
  }

  .technical-docs-archetype-matrix__empty,
  .technical-docs-archetype-matrix__state {
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
    font-size: 0.78rem;
  }

  .technical-docs-archetype-matrix__state {
    display: grid;
    place-items: center;
    gap: var(--space-4);
    min-height: 18rem;
    text-align: center;
  }

  .technical-docs-archetype-matrix__state strong {
    color: var(--color-text-primary);
  }

  .technical-docs-archetype-matrix__state[data-state='error'] {
    border-color: color-mix(in srgb, var(--color-danger, #ef4444) 54%, var(--color-border-subtle));
  }

  .technical-docs-archetype-matrix__legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: var(--space-4);
  }

  .technical-docs-archetype-matrix__legend span {
    padding: var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    line-height: 1.35;
  }

  .technical-docs-archetype-matrix__legend strong {
    display: block;
    margin-bottom: var(--space-1);
    color: var(--color-text-primary);
  }

  @media (max-width: 1180px) {
    .technical-docs-archetype-matrix__body {
      grid-template-columns: minmax(0, 1fr);
    }

    .technical-docs-archetype-matrix__detail {
      position: static;
    }
  }

  @media (max-width: 760px) {
    .technical-docs-archetype-matrix__header {
      display: grid;
    }

    .technical-docs-archetype-matrix__header dl {
      justify-content: stretch;
    }
  }
</style>
