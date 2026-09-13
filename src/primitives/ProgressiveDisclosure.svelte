<script lang="ts">
  import { isAudienceVisibleAtReadingLevel } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type { WorkbenchContentAudience } from './progressiveDisclosure';
  import { getWorkbenchReadingLevelContext } from './workbenchReadingLevelContext';

  export let title: string;
  export let summary: string | null = null;
  export let audience: WorkbenchContentAudience = 'expert';
  export let open = false;

  const readingLevel = getWorkbenchReadingLevelContext();
  const i18nT = getWorkbenchTranslator();
  $: governedOpen = open || isAudienceVisibleAtReadingLevel(audience, $readingLevel);
  $: audienceLabel = $i18nT(`ui.shell.readingLevel.${audience}`, { default: audience });
</script>

<details
  class="workbench-progressive-disclosure"
  data-workbench-content-audience={audience}
  open={governedOpen}
  data-workbench-reading-level={$readingLevel}
>
  <summary class="workbench-progressive-disclosure__summary">
    <span class="workbench-progressive-disclosure__heading">
      <strong>{title}</strong>
      {#if summary}
        <span>{summary}</span>
      {/if}
    </span>
    <span class="workbench-progressive-disclosure__audience">{audienceLabel}</span>
  </summary>
  <div class="workbench-progressive-disclosure__content">
    <slot></slot>
  </div>
</details>

<style>
  .workbench-progressive-disclosure {
    min-width: 0;
    border-block: 1px solid color-mix(in srgb, var(--color-border-subtle) 72%, transparent);
    color: var(--color-text-secondary);
  }

  .workbench-progressive-disclosure__summary {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
    min-height: 1.9rem;
    padding: var(--space-2) 0;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .workbench-progressive-disclosure__summary::-webkit-details-marker {
    display: none;
  }

  .workbench-progressive-disclosure__summary::before {
    flex: 0 0 auto;
    color: var(--color-text-accent);
    content: '\203A';
    font-size: 1rem;
    line-height: 1;
    transform: rotate(0deg);
    transition: transform 120ms ease;
  }

  .workbench-progressive-disclosure[open] > .workbench-progressive-disclosure__summary::before {
    transform: rotate(90deg);
  }

  .workbench-progressive-disclosure__summary:focus-visible {
    border-radius: var(--radius-small);
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .workbench-progressive-disclosure__heading {
    display: flex;
    flex: 1 1 auto;
    align-items: baseline;
    gap: var(--space-4);
    min-width: 0;
  }

  .workbench-progressive-disclosure__heading strong,
  .workbench-progressive-disclosure__heading span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workbench-progressive-disclosure__heading strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-label);
    font-weight: 600;
  }

  .workbench-progressive-disclosure__heading span {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
  }

  .workbench-progressive-disclosure__audience {
    flex: 0 0 auto;
    padding: 0.08rem 0.34rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    color: var(--color-text-muted);
    font-family: var(--font-family-mono);
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .workbench-progressive-disclosure__content {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    padding: var(--space-4) 0 var(--space-6);
  }

  @container (max-width: 24rem) {
    .workbench-progressive-disclosure__heading span,
    .workbench-progressive-disclosure__audience {
      display: none;
    }
  }
</style>
