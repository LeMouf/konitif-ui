<script lang="ts">
  import type { TechnicalDocsRelationFeature, TechnicalDocsRelationGraph } from '../technicalDocsCatalog';

  type Translate = (key: string, options?: { default?: string }) => string;

  export let relationGraph: TechnicalDocsRelationGraph;
  export let selectedGraphFeature: TechnicalDocsRelationFeature | null = null;
  export let t: Translate = (_key, options) => options?.default ?? _key;
  export let selectGraphFeature: (featureId: string) => void = () => undefined;
  export let resolveGraphContextStyle: (contextIndex: number, featureCount: number) => string = () => '';
  export let resolveGraphFeatureStyle: (featureIndex: number) => string = () => '';
</script>

<section class="technical-docs-feature-graph" aria-labelledby="technical-docs-graph-title">
  <header class="technical-docs-feature-graph__header">
    <div>
      <p class="technical-docs-feature-graph__eyebrow">
        {t('ui.shell.docs.graph.eyebrow', { default: 'Relation Graph' })}
      </p>
      <h3 id="technical-docs-graph-title" class="technical-docs-feature-graph__title">
        {t('ui.shell.docs.graph.title', { default: 'Feature Progress Map' })}
      </h3>
    </div>
    <div class="technical-docs-feature-graph__totals" aria-label={t('ui.shell.docs.graph.totals', { default: 'Graph totals' })}>
      <span>{relationGraph.totals.contexts} {t('ui.shell.docs.graph.contexts', { default: 'contexts' })}</span>
      <span>{relationGraph.totals.features} {t('ui.shell.docs.stats.features', { default: 'Features' })}</span>
      <span>{relationGraph.totals.relations} {t('ui.shell.docs.graph.relations', { default: 'relations' })}</span>
    </div>
  </header>

  <div class="technical-docs-feature-graph__map">
    <div class="technical-docs-feature-graph__spine" aria-hidden="true"></div>

    {#each relationGraph.contexts as context, contextIndex (context.id)}
      <article
        class="technical-docs-feature-graph__context"
        style={resolveGraphContextStyle(contextIndex, context.counts.features)}
      >
        <header class="technical-docs-feature-graph__context-head">
          <div>
            <span class="technical-docs-feature-graph__domain">{context.domain}</span>
            <strong>{context.label}</strong>
          </div>
          <div class="technical-docs-feature-graph__context-counts">
            <span>{context.counts.features}F</span>
            <span>{context.counts.contextualRules}R</span>
            <span>{context.counts.contextualTests}T</span>
          </div>
        </header>

        <div class="technical-docs-feature-graph__features">
          {#each context.features as feature, featureIndex (feature.id)}
            <div class="technical-docs-feature-graph__feature" style={resolveGraphFeatureStyle(featureIndex)}>
              <button
                type="button"
                class:technical-docs-feature-graph__node--selected={selectedGraphFeature?.id === feature.id}
                class="technical-docs-feature-graph__node"
                on:click={() => selectGraphFeature(feature.id)}
              >
                <span class="technical-docs-feature-graph__node-status" data-status={feature.status}>{feature.status}</span>
                <strong>{feature.title}</strong>
                <code>{feature.id}</code>
                {#if feature.designImpact}
                  <span class="technical-docs-feature-graph__node-impact" data-status={feature.designImpact.status}>
                    {feature.designImpact.status}
                  </span>
                {/if}
              </button>
              <div class="technical-docs-feature-graph__links" aria-label={`Relations for ${feature.title}`}>
                {#if feature.counts.docs > 0}
                  <span data-kind="doc">Docs {feature.counts.docs}</span>
                {/if}
                {#if feature.counts.rules > 0}
                  <span data-kind="rule">Rules {feature.counts.rules}</span>
                {/if}
                {#if feature.counts.sources > 0}
                  <span data-kind="source">Sources {feature.counts.sources}</span>
                {/if}
                {#if feature.counts.tests > 0}
                  <span data-kind="test">Tests {feature.counts.tests}</span>
                {/if}
                {#if feature.counts.entryPoints > 0}
                  <span data-kind="entry">Entry {feature.counts.entryPoints}</span>
                {/if}
                {#if feature.designImpact}
                  <span data-kind="design">Design {feature.designImpact.tokens.length + feature.designImpact.components.length}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </article>
    {/each}
  </div>

  {#if selectedGraphFeature}
    <aside class="technical-docs-feature-graph__detail" aria-label={t('ui.shell.docs.graph.detail', { default: 'Feature design impact detail' })}>
      <header>
        <span>{t('ui.shell.docs.graph.designImpact', { default: 'Design Impact' })}</span>
        <strong>{selectedGraphFeature.title}</strong>
        <code>{selectedGraphFeature.id}</code>
      </header>
      {#if selectedGraphFeature.designImpact}
        <p>{selectedGraphFeature.designImpact.summary}</p>
        <div class="technical-docs-feature-graph__impact-grid">
          <div>
            <span>{t('ui.shell.docs.design.components', { default: 'Components' })}</span>
            {#each selectedGraphFeature.designImpact.components as component (component)}
              <code>{component}</code>
            {/each}
          </div>
          <div>
            <span>{t('ui.shell.docs.design.tokens', { default: 'Tokens' })}</span>
            {#each selectedGraphFeature.designImpact.tokens as token (token)}
              <code>{token}</code>
            {/each}
          </div>
          <div>
            <span>{t('ui.shell.docs.design.cssVariables', { default: 'CSS Variables' })}</span>
            {#each selectedGraphFeature.designImpact.cssVariables as variable (variable)}
              <code>{variable}</code>
            {/each}
          </div>
        </div>
      {:else}
        <p>{t('ui.shell.docs.graph.noDesignImpact', { default: 'No design impact declared for this feature.' })}</p>
      {/if}
    </aside>
  {/if}
</section>

<style>
  .technical-docs-feature-graph {
    display: grid;
    gap: var(--space-10);
    min-height: 0;
    overflow: auto;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-surface) 88%, transparent);
  }

  .technical-docs-feature-graph__header,
  .technical-docs-feature-graph__context-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-10);
  }

  .technical-docs-feature-graph__eyebrow,
  .technical-docs-feature-graph__domain {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-feature-graph__title {
    margin: 0;
    font-size: 0.875rem;
  }

  .technical-docs-feature-graph__totals,
  .technical-docs-feature-graph__context-counts,
  .technical-docs-feature-graph__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .technical-docs-feature-graph__totals span,
  .technical-docs-feature-graph__context-counts span,
  .technical-docs-feature-graph__links span {
    display: inline-flex;
    align-items: center;
    min-height: 1.5rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 70%, transparent);
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .technical-docs-feature-graph__map {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-12);
    min-height: 24rem;
    padding: var(--space-10) var(--space-6) var(--space-6);
    overflow: hidden;
  }

  .technical-docs-feature-graph__spine {
    position: absolute;
    inset: var(--space-8) var(--space-4);
    pointer-events: none;
  }

  .technical-docs-feature-graph__spine::before,
  .technical-docs-feature-graph__spine::after {
    position: absolute;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 58%, transparent);
    content: '';
  }

  .technical-docs-feature-graph__spine::before {
    top: 2.4rem;
    right: 2rem;
    left: 1rem;
    height: 42%;
    border-bottom: 0;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  .technical-docs-feature-graph__spine::after {
    right: 12%;
    bottom: 2rem;
    left: 8%;
    height: 36%;
    border-top: 0;
    border-radius: 0 0 1.25rem 1.25rem;
  }

  .technical-docs-feature-graph__context {
    position: relative;
    display: grid;
    gap: var(--space-8);
    flex: 1 1 var(--graph-context-width, 20rem);
    min-width: min(100%, 17rem);
    max-width: min(100%, var(--graph-context-width, 24rem));
    margin-top: max(0rem, var(--graph-context-drift, 0rem));
    margin-left: max(0rem, var(--graph-context-rail, 0rem));
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 82%, transparent);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-muted) 48%, transparent);
    box-shadow: 0 12px 26px rgb(0 0 0 / 0.14);
  }

  .technical-docs-feature-graph__context::before {
    position: absolute;
    top: -0.75rem;
    left: var(--space-12);
    width: 1px;
    height: 0.75rem;
    background: color-mix(in srgb, var(--color-border-subtle) 74%, transparent);
    content: '';
  }

  .technical-docs-feature-graph__context-head {
    position: relative;
    padding-bottom: var(--space-8);
  }

  .technical-docs-feature-graph__context-head::after {
    position: absolute;
    right: var(--space-2);
    bottom: 0;
    left: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--color-border-subtle), transparent);
    content: '';
  }

  .technical-docs-feature-graph__context-head strong {
    display: block;
    font-size: 0.8125rem;
  }

  .technical-docs-feature-graph__features {
    display: grid;
    gap: var(--space-8);
  }

  .technical-docs-feature-graph__feature {
    position: relative;
    display: grid;
    gap: var(--space-6);
    padding-left: calc(var(--space-10) + var(--graph-feature-branch, 0rem));
    transform: translateY(var(--graph-feature-lift, 0rem));
  }

  .technical-docs-feature-graph__feature::before {
    position: absolute;
    top: 0.85rem;
    bottom: -0.55rem;
    left: calc(0.2rem + var(--graph-feature-branch, 0rem));
    width: 1px;
    background: var(--color-border-subtle);
    content: '';
  }

  .technical-docs-feature-graph__feature::after {
    position: absolute;
    top: 0.85rem;
    left: calc(0.2rem + var(--graph-feature-branch, 0rem));
    width: var(--space-8);
    height: 1px;
    background: var(--color-border-subtle);
    content: '';
  }

  .technical-docs-feature-graph__feature:last-child::before {
    bottom: calc(100% - 0.85rem);
  }

  .technical-docs-feature-graph__node {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-action-primary) 28%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 82%, transparent);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .technical-docs-feature-graph__node:hover,
  .technical-docs-feature-graph__node--selected {
    border-color: color-mix(in srgb, var(--color-action-primary) 72%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--color-action-primary) 14%, var(--color-background-surface));
  }

  .technical-docs-feature-graph__node strong,
  .technical-docs-feature-graph__node code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-feature-graph__node strong {
    font-size: 0.8125rem;
  }

  .technical-docs-feature-graph__node code {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-feature-graph__node-status {
    justify-self: start;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .technical-docs-feature-graph__node-status[data-status='active'] {
    color: var(--color-success, #77c879);
  }

  .technical-docs-feature-graph__node-status[data-status='draft'] {
    color: var(--color-warning, #d6a14d);
  }

  .technical-docs-feature-graph__node-impact {
    justify-self: start;
    padding: 0.1rem var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .technical-docs-feature-graph__links {
    padding-left: var(--space-8);
  }

  .technical-docs-feature-graph__links span[data-kind='doc'] {
    border-color: color-mix(in srgb, #73a7ff 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__links span[data-kind='rule'] {
    border-color: color-mix(in srgb, #d6a14d 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__links span[data-kind='source'] {
    border-color: color-mix(in srgb, #a996ff 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__links span[data-kind='test'] {
    border-color: color-mix(in srgb, #77c879 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__links span[data-kind='entry'] {
    border-color: color-mix(in srgb, var(--color-action-primary) 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__links span[data-kind='design'] {
    border-color: color-mix(in srgb, #50c2a8 35%, var(--color-border-subtle));
  }

  .technical-docs-feature-graph__detail {
    display: grid;
    gap: var(--space-10);
    margin-top: var(--space-4);
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-surface) 86%, transparent);
  }

  .technical-docs-feature-graph__impact-grid {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .technical-docs-feature-graph__impact-grid > div {
    display: grid;
    gap: var(--space-4);
    align-content: start;
    min-width: 0;
  }

  .technical-docs-feature-graph__impact-grid span {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-feature-graph__impact-grid code,
  .technical-docs-feature-graph__detail code {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 960px) {
    .technical-docs-feature-graph__impact-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 640px) {
    .technical-docs-feature-graph__header,
    .technical-docs-feature-graph__context-head {
      display: grid;
    }
  }
</style>
