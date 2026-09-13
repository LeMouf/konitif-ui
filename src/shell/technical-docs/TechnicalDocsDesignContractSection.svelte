<script lang="ts">
  import type { DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';
  import type { DesignSystemThemeDraftStatus } from '../designSystemThemeDraft';
  import type {
    DesignSystemThemeContractSummary,
    DesignSystemThemeDocument,
    DesignSystemThemeRegistry,
    DesignSystemThemeSyncPreview
  } from '../designSystemThemeCatalog';

  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection;
  export let designSystemThemeRegistry: DesignSystemThemeRegistry;
  export let designSystemContract: DesignSystemThemeContractSummary;
  export let designSystemThemeDocument: DesignSystemThemeDocument;
  export let designSystemThemeSyncPreview: DesignSystemThemeSyncPreview;
  export let designDraftStatus: DesignSystemThemeDraftStatus;
  export let designDraftPreviewText: string;
</script>

<section class="technical-docs-view__design-contract" aria-label="Design system contract">
  <article>
    <span>Theme Registry</span>
    <strong>{designSystemThemeRegistry.title}</strong>
    <code>{designSystemThemeRegistry.activeMode.label} / {designSystemThemeRegistry.variables.length} variables</code>
  </article>
  <article>
    <span>Discovery Bridge</span>
    <strong>{designSystemDiscoveryProjection.totals.widgets} widgets / {designSystemDiscoveryProjection.totals.tools} tools</strong>
    <code>{designSystemDiscoveryProjection.totals.panels} panels / {designSystemDiscoveryProjection.totals.runtimeProjections} runtime projections</code>
  </article>
  <article>
    <span>Source</span>
    <strong>{designSystemContract.version}</strong>
    <code>{designSystemContract.source}</code>
  </article>
  <article>
    <span>Runtime Target</span>
    <strong>{designSystemContract.cssTarget?.title ?? 'CSS Theme'}</strong>
    <code>{designSystemContract.cssTarget?.exportPath ?? designSystemThemeDocument.metadata.exportTarget}</code>
  </article>
  <article>
    <span>Figma Target</span>
    <strong>{designSystemContract.figmaTarget?.collection ?? designSystemThemeDocument.metadata.figmaCollection}</strong>
    <code>{designSystemContract.figmaVariableCount} variables / {designSystemContract.figmaTarget?.mode ?? designSystemThemeDocument.metadata.figmaMode}</code>
  </article>
  <article>
    <span>Reconciliation</span>
    <strong>{designSystemThemeSyncPreview.counts.mismatch} mismatch / {designDraftStatus.draftCount} draft</strong>
    <code>{designDraftPreviewText || designSystemContract.reconciliation[0]}</code>
  </article>
</section>

<style>
  .technical-docs-view__design-contract {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    min-width: 0;
  }

  .technical-docs-view__design-contract article {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-muted) 48%, transparent);
  }

  .technical-docs-view__design-contract span {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__design-contract strong,
  .technical-docs-view__design-contract code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__design-contract strong {
    font-size: 0.8125rem;
  }

  .technical-docs-view__design-contract code {
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
  }

  @media (max-width: 960px) {
    .technical-docs-view__design-contract {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
