<script lang="ts">
  import type { DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';
  import type { DesignSystemFeatureImpact, DesignSystemThemeGraph } from '../designSystemThemeCatalog';

  type Translate = (key: string, options?: { default?: string }) => string;

  export let t: Translate;
  export let designSystemThemeGraph: DesignSystemThemeGraph;
  export let featureDesignImpacts: DesignSystemFeatureImpact[];
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection;
</script>

<header class="technical-docs-view__graph-header">
  <div>
    <p class="technical-docs-view__graph-eyebrow">
      {t('ui.shell.docs.design.eyebrow', { default: 'Design System Theme Explorer' })}
    </p>
    <h3 id="technical-docs-design-title" class="technical-docs-view__graph-title">
      {t('ui.shell.docs.design.title', { default: 'Design Graph' })}
    </h3>
  </div>
  <div class="technical-docs-view__graph-totals" aria-label={t('ui.shell.docs.design.totals', { default: 'Design graph totals' })}>
    <span>{designSystemThemeGraph.totals.nodes} {t('ui.shell.docs.design.nodes', { default: 'nodes' })}</span>
    <span>{designSystemThemeGraph.totals.relations} {t('ui.shell.docs.graph.relations', { default: 'relations' })}</span>
    <span>{featureDesignImpacts.length} impacts</span>
    <span>{designSystemThemeGraph.totals.tokens} {t('ui.shell.docs.design.tokens', { default: 'tokens' })}</span>
    <span>{designSystemThemeGraph.totals.cssVariables} CSS</span>
    <span>{designSystemDiscoveryProjection.totals.entities} discovered</span>
  </div>
</header>

<style>
  .technical-docs-view__graph-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-10);
  }

  .technical-docs-view__graph-eyebrow {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__graph-title {
    margin: 0;
    font-size: 0.875rem;
  }

  .technical-docs-view__graph-totals {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .technical-docs-view__graph-totals span {
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

  @media (max-width: 640px) {
    .technical-docs-view__graph-header {
      display: grid;
    }
  }
</style>
