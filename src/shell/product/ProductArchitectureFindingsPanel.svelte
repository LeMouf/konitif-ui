<script lang="ts">
  type ProductArchitectureFindingSeverity = 'info' | 'warning' | 'danger';
  type ProductArchitectureFindingKind = 'oversized' | 'singleton' | 'duplication' | 'reuse';
  type ProductDocsProjectionStatus = 'fallback' | 'loading' | 'live' | 'error';

  type ProductArchitectureFindingItem = {
    kind: string;
    title: string;
    sourceFile: string;
  };

  type ProductArchitectureFinding = {
    id: string;
    title: string;
    summary: string;
    kind: ProductArchitectureFindingKind;
    severity: ProductArchitectureFindingSeverity;
    count: number;
    items: ProductArchitectureFindingItem[];
  };

  export let findings: ProductArchitectureFinding[] = [];
  export let status: ProductDocsProjectionStatus = 'fallback';
  export let statusLabel = 'fallback';
  export let error: string | null = null;
</script>

<article
  class="technical-docs-view__product-architecture-findings"
  class:technical-docs-view__product-architecture-findings--empty={findings.length === 0}
>
  <header>
    <div>
      <span>Architecture findings</span>
      <strong>{findings.length > 0 ? `${findings.length} signaux` : 'Aucun signal'}</strong>
    </div>
    <em data-status={status}>{statusLabel}</em>
  </header>

  <div class="technical-docs-view__product-finding-list">
    {#each findings as finding (finding.id)}
      <section
        class="technical-docs-view__product-finding"
        data-severity={finding.severity}
        data-kind={finding.kind}
      >
        <header>
          <span>{finding.kind}</span>
          <strong>{finding.title}</strong>
          <em>{finding.count}</em>
        </header>
        <p>{finding.summary}</p>
        <div>
          {#each finding.items.slice(0, 4) as item (`${finding.id}:${item.kind}:${item.title}:${item.sourceFile}`)}
            <code>{item.title}</code>
          {/each}
        </div>
      </section>
    {:else}
      <p class="technical-docs-view__product-finding-empty">
        {status === 'error' ? error ?? 'Projection product-docs indisponible.' : 'Aucun signal exploitable dans le scan courant.'}
      </p>
    {/each}
  </div>
</article>

<style>
  .technical-docs-view__product-architecture-findings {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-8);
    min-width: 0;
    min-height: 10rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 28%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 56%, transparent);
  }

  .technical-docs-view__product-architecture-findings--empty {
    align-self: start;
    grid-template-rows: auto auto;
    min-height: 0;
  }

  .technical-docs-view__product-architecture-findings > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__product-architecture-findings > header div {
    min-width: 0;
    display: grid;
    gap: var(--space-2);
  }

  .technical-docs-view__product-architecture-findings > header span {
    color: var(--color-text-muted);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .technical-docs-view__product-architecture-findings > header strong {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.84rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-architecture-findings > header em {
    flex: 0 0 auto;
    color: var(--color-text-muted);
    font-size: 0.68rem;
    font-style: normal;
    font-weight: 760;
  }

  .technical-docs-view__product-architecture-findings > header em[data-status='live'] {
    color: var(--color-text-success);
  }

  .technical-docs-view__product-architecture-findings > header em[data-status='loading'],
  .technical-docs-view__product-architecture-findings > header em[data-status='fallback'] {
    color: var(--color-text-warning);
  }

  .technical-docs-view__product-architecture-findings > header em[data-status='error'] {
    color: var(--color-text-danger);
  }

  .technical-docs-view__product-finding-list {
    display: grid;
    align-content: start;
    gap: var(--space-7);
    min-height: 0;
    overflow: auto;
  }

  .technical-docs-view__product-finding {
    display: grid;
    gap: var(--space-5);
    min-width: 0;
    padding: var(--space-7);
    border: 1px solid color-mix(in srgb, var(--product-finding-color, var(--color-action-primary)) 30%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--product-finding-color, var(--color-action-primary)) 12%, transparent), transparent),
      color-mix(in srgb, var(--color-background-muted) 45%, transparent);
  }

  .technical-docs-view__product-finding[data-severity='danger'] {
    --product-finding-color: #ef6b67;
  }

  .technical-docs-view__product-finding[data-severity='warning'] {
    --product-finding-color: #d69a3d;
  }

  .technical-docs-view__product-finding[data-severity='info'] {
    --product-finding-color: var(--color-action-primary);
  }

  .technical-docs-view__product-finding > header {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) max-content;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
  }

  .technical-docs-view__product-finding > header span {
    padding: 0.1rem var(--space-5);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-finding-color, var(--color-action-primary)) 16%, transparent);
    color: var(--product-finding-color, var(--color-action-primary));
    font-size: 0.58rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .technical-docs-view__product-finding > header strong {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__product-finding > header em {
    color: var(--color-text-muted);
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 820;
  }

  .technical-docs-view__product-finding p,
  .technical-docs-view__product-finding-empty {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    line-height: 1.35;
  }

  .technical-docs-view__product-finding div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__product-finding code {
    overflow: hidden;
    max-width: 9.5rem;
    padding: 0.1rem var(--space-5);
    border: 1px solid color-mix(in srgb, var(--product-finding-color, var(--color-action-primary)) 24%, var(--color-border-subtle));
    border-radius: 999px;
    color: var(--color-text-muted);
    font-size: 0.62rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
