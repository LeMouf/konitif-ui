<script lang="ts" context="module">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import type { CoverageSparklinePoint } from './coverageSparkline';

  export type TechnicalDocsCoverageBucket = {
    id: string;
    label: string;
    value: number;
    status?: string;
    sparklineLabel: string;
    sparklinePoints: string;
    sparklinePointList: CoverageSparklinePoint[];
  };

  export type TechnicalDocsCoverageCard = {
    id: string;
    title: string;
    percent: string;
    status: string;
    trend?: {
      icon: WorkbenchIconInput;
      label: string;
      tone?: 'up' | 'down' | 'flat';
    };
    buckets: TechnicalDocsCoverageBucket[];
  };
</script>

<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import {
    createRepoQualityMeterSegments,
    formatRepoQualityMeterSegmentStyle,
    formatRepoQualityMeterSummary
  } from './technicalDocsCoverageSummaryModel';

  export let ariaLabel = 'Coverage summary';
  export let variant: 'repo-quality' | 'language-registry' = 'repo-quality';
  export let cards: TechnicalDocsCoverageCard[] = [];
</script>

<section class={`technical-docs-view__${variant}-summary`} aria-label={ariaLabel}>
  {#each cards as card (card.id)}
    {@const repoQualityMeterSegments = variant === 'repo-quality' ? createRepoQualityMeterSegments(card) : []}
    {@const repoQualityMeterSummary = formatRepoQualityMeterSummary(repoQualityMeterSegments)}
    <article data-status={card.status}>
      <header>
        <div>
          <span>{card.title}</span>
          <strong>{card.percent}</strong>
        </div>
        {#if card.trend}
          <em class="technical-docs-view__repo-quality-trend" data-trend={card.trend.tone ?? 'flat'}>
            <WorkbenchIcon icon={card.trend.icon} label={card.trend.label} />
            {card.trend.label}
          </em>
        {:else}
          <em>{card.status}</em>
        {/if}
      </header>
      <div
        class={`technical-docs-view__${variant}-meter`}
        style={`--coverage-score: ${card.percent}; --repo-quality-score: ${card.percent}; --language-coverage-score: ${card.percent}`}
        aria-label={`${card.title} ${card.percent}${repoQualityMeterSummary ? `, ${repoQualityMeterSummary}` : ''}`}
      >
        <i aria-hidden="true">
          {#if variant === 'repo-quality'}
            {#each repoQualityMeterSegments as segment (segment.id)}
              <span
                class={`technical-docs-view__repo-quality-meter-segment technical-docs-view__repo-quality-meter-segment--${segment.id}`}
                style={formatRepoQualityMeterSegmentStyle(segment)}
                title={`${segment.label}: ${segment.value} (${segment.percent.toFixed(1)}%)`}
              ></span>
            {/each}
          {/if}
        </i>
      </div>
      <dl>
        {#each card.buckets as bucket (bucket.id)}
          <div class={`technical-docs-view__${variant}-breakdown technical-docs-view__repo-quality-breakdown--${bucket.id}`} data-status={bucket.status ?? card.status}>
            <span class="technical-docs-view__coverage-breakdown-count">
              <dt>{bucket.label}</dt>
              <dd>{bucket.value}</dd>
            </span>
            <span class="technical-docs-view__coverage-sparkline-cell">
              <span class="technical-docs-view__coverage-sparkline-label">
                {bucket.sparklineLabel}
              </span>
              <svg
                aria-label={`${card.title} ${bucket.label} history: ${bucket.sparklineLabel}`}
                class={`technical-docs-view__${variant}-sparkline`}
                role="img"
                viewBox="0 0 52 16"
              >
                <line x1="2" y1="14" x2="50" y2="14" />
                <polyline points={bucket.sparklinePoints} />
                {#each bucket.sparklinePointList as point (`${point.x}:${point.y}`)}
                  <circle cx={point.x} cy={point.y} r="1.55" />
                {/each}
              </svg>
            </span>
          </div>
        {/each}
      </dl>
    </article>
  {/each}
</section>

<style>
  .technical-docs-view__repo-quality-summary,
  .technical-docs-view__language-registry-summary {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__repo-quality-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .technical-docs-view__language-registry-summary {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .technical-docs-view__repo-quality-summary article,
  .technical-docs-view__language-registry-summary article {
    display: grid;
    gap: var(--space-7);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--registry-meter-color) 7%, transparent), transparent),
      color-mix(in srgb, var(--color-background-surface) 58%, transparent);
  }

  .technical-docs-view__repo-quality-summary article[data-status='covered'],
  .technical-docs-view__language-registry-summary article[data-status='covered'] {
    --registry-meter-color: var(--color-status-success);
  }

  .technical-docs-view__repo-quality-summary article[data-status='partial'],
  .technical-docs-view__language-registry-summary article[data-status='partial'] {
    --registry-meter-color: var(--color-status-warning);
  }

  .technical-docs-view__repo-quality-summary article[data-status='missing'],
  .technical-docs-view__repo-quality-summary article[data-status='risk'],
  .technical-docs-view__language-registry-summary article[data-status='missing'],
  .technical-docs-view__language-registry-summary article[data-status='risk'] {
    --registry-meter-color: var(--color-status-danger);
  }

  .technical-docs-view__repo-quality-summary header,
  .technical-docs-view__language-registry-summary header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__repo-quality-summary header > div,
  .technical-docs-view__language-registry-summary header > div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .technical-docs-view__repo-quality-summary span,
  .technical-docs-view__repo-quality-summary em,
  .technical-docs-view__repo-quality-summary dt,
  .technical-docs-view__repo-quality-summary dd,
  .technical-docs-view__language-registry-summary span,
  .technical-docs-view__language-registry-summary em,
  .technical-docs-view__language-registry-summary dt,
  .technical-docs-view__language-registry-summary dd {
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    font-style: normal;
  }

  .technical-docs-view__repo-quality-summary strong,
  .technical-docs-view__language-registry-summary strong {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    line-height: 1;
  }

  .technical-docs-view__repo-quality-summary dl,
  .technical-docs-view__language-registry-summary dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
    gap: var(--space-4);
    margin: 0;
  }

  .technical-docs-view__repo-quality-summary dl div,
  .technical-docs-view__language-registry-summary dl div {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-3) var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 48%, transparent);
  }

  .technical-docs-view__repo-quality-summary dl .technical-docs-view__repo-quality-breakdown,
  .technical-docs-view__language-registry-summary dl .technical-docs-view__language-registry-breakdown {
    grid-template-columns: minmax(3rem, 0.42fr) minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-6);
  }

  .technical-docs-view__repo-quality-summary dt,
  .technical-docs-view__repo-quality-summary dd,
  .technical-docs-view__language-registry-summary dt,
  .technical-docs-view__language-registry-summary dd {
    margin: 0;
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .technical-docs-view__repo-quality-sparkline,
  .technical-docs-view__language-registry-sparkline {
    width: 100%;
    height: 1.15rem;
    color: var(--registry-meter-color);
  }

  .technical-docs-view__coverage-breakdown-count,
  .technical-docs-view__coverage-sparkline-cell {
    display: grid;
    min-width: 0;
  }

  .technical-docs-view__coverage-breakdown-count {
    justify-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .technical-docs-view__coverage-sparkline-cell {
    gap: var(--space-2);
    justify-items: center;
  }

  .technical-docs-view__coverage-sparkline-label {
    justify-self: center;
    color: currentColor;
    font-size: 0.625rem;
    font-weight: 800;
    opacity: 0.86;
    text-align: center;
  }

  .technical-docs-view__repo-quality-sparkline line,
  .technical-docs-view__language-registry-sparkline line {
    stroke: var(--color-border-subtle);
    stroke-linecap: round;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .technical-docs-view__repo-quality-sparkline polyline,
  .technical-docs-view__language-registry-sparkline polyline {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .technical-docs-view__repo-quality-sparkline circle,
  .technical-docs-view__language-registry-sparkline circle {
    fill: var(--color-background-panel);
    stroke: currentColor;
    stroke-width: 1.6;
    vector-effect: non-scaling-stroke;
  }

  .technical-docs-view__repo-quality-breakdown--total {
    color: var(--color-text-secondary);
  }

  .technical-docs-view__repo-quality-breakdown--covered,
  .technical-docs-view__language-registry-breakdown[data-status='covered'] {
    color: var(--color-status-success);
  }

  .technical-docs-view__repo-quality-breakdown--partial,
  .technical-docs-view__language-registry-breakdown[data-status='partial'] {
    color: var(--color-status-warning);
  }

  .technical-docs-view__repo-quality-breakdown--missing,
  .technical-docs-view__repo-quality-breakdown--risk,
  .technical-docs-view__language-registry-breakdown[data-status='missing'],
  .technical-docs-view__language-registry-breakdown[data-status='risk'] {
    color: var(--color-status-danger);
  }

  .technical-docs-view__repo-quality-meter,
  .technical-docs-view__language-registry-meter {
    position: relative;
    overflow: hidden;
    height: 0.75rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-view__repo-quality-meter i,
  .technical-docs-view__language-registry-meter i {
    display: flex;
    width: var(--coverage-score);
    height: 100%;
    border-radius: inherit;
    background: var(--registry-meter-color);
    overflow: hidden;
  }

  .technical-docs-view__repo-quality-meter-segment {
    flex: 0 0 var(--repo-quality-segment-width);
    min-width: 0;
    height: 100%;
    box-shadow:
      inset 1px 0 color-mix(in srgb, var(--color-background-panel) 78%, black),
      inset 0 1px color-mix(in srgb, white 18%, transparent);
  }

  .technical-docs-view__repo-quality-meter-segment:first-child {
    box-shadow: inset 0 1px color-mix(in srgb, white 18%, transparent);
  }

  .technical-docs-view__repo-quality-meter-segment--covered {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--registry-meter-color) 94%, white),
        color-mix(in srgb, var(--registry-meter-color) 96%, black)
      );
  }

  .technical-docs-view__repo-quality-meter-segment--partial {
    background-color: #f59e0b;
    background-image:
      repeating-linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.3) 0 0.125rem,
        rgba(255, 255, 255, 0.3) 0.125rem 0.25rem,
        rgba(66, 38, 0, 0.28) 0.25rem 0.5rem
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.26),
        rgba(0, 0, 0, 0.18)
      );
  }

  .technical-docs-view__repo-quality-meter-segment--open {
    background:
      repeating-linear-gradient(
        135deg,
        color-mix(in srgb, var(--registry-meter-color) 26%, var(--color-background-panel)) 0 0.125rem,
        color-mix(in srgb, var(--registry-meter-color) 52%, transparent) 0.125rem 0.25rem,
        color-mix(in srgb, var(--color-status-danger) 56%, var(--color-background-panel)) 0.25rem 0.5rem
      );
  }

  .technical-docs-view__repo-quality-trend {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    white-space: nowrap;
  }

  .technical-docs-view__repo-quality-trend[data-trend='up'] {
    color: var(--color-status-success);
  }

  .technical-docs-view__repo-quality-trend[data-trend='down'] {
    color: var(--color-status-danger);
  }
</style>
