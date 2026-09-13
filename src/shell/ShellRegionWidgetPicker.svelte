<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { resolveWorkbenchIconDefinition } from '../icons/iconRegistry';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type {
    ShellRegionEmptyCandidate,
    ShellRegionEmptyPickerAnchor,
    ShellRegionEmptyPickerRequest
  } from './shellRegionWidgetPicker';

  type CandidateGroup = {
    id: string;
    title: string;
    candidates: ShellRegionEmptyCandidate[];
  };

  export let request: ShellRegionEmptyPickerRequest | null = null;
  export let onClose: () => void = () => {};
  export let onSelectWidget: (widgetId: string) => void = () => {};

  const i18nT = getWorkbenchTranslator();
  const pickerWidthPx = 448;
  const pickerMaxHeightPx = 560;
  const edgeMarginPx = 16;
  const anchorGapPx = 12;

  let searchQuery = '';
  let viewportWidth = 0;
  let viewportHeight = 0;
  let pickerHeight = 0;
  let queryInput: HTMLInputElement | null = null;

  $: if (!request) {
    searchQuery = '';
  }
  $: normalizedSearchQuery = searchQuery.trim().toLowerCase();
  $: filteredCandidates = request
    ? normalizedSearchQuery
      ? request.candidates.filter((candidate) => matchesCandidate(candidate, normalizedSearchQuery))
      : request.candidates
    : [];
  $: contextualCandidates = filteredCandidates.filter((candidate) => candidate.relevance === 'contextual');
  $: availableCandidates = filteredCandidates.filter((candidate) => candidate.relevance === 'available');
  $: unavailableCandidates = filteredCandidates.filter((candidate) => candidate.relevance === 'unavailable');
  $: candidateGroups = createCandidateGroups(
    contextualCandidates,
    availableCandidates,
    unavailableCandidates
  );
  $: pickerStyle = request
    ? createPickerStyle(
        request.regionId,
        request.anchorRect,
        request.triggerRect,
        viewportWidth,
        viewportHeight,
        pickerHeight
      )
    : '';
  $: regionLabel = request ? resolveRegionLabel(request.regionId) : '';
  $: if (request && queryInput) {
    queryInput.focus();
  }

  function createCandidateGroups(
    contextual: ShellRegionEmptyCandidate[],
    available: ShellRegionEmptyCandidate[],
    unavailable: ShellRegionEmptyCandidate[]
  ): CandidateGroup[] {
    return [
      {
        id: 'contextual',
        title: $i18nT('ui.shell.shellRegion.empty.contextual', { default: 'Contextual widgets' }),
        candidates: contextual
      },
      {
        id: 'available',
        title: $i18nT('ui.shell.shellRegion.empty.available', { default: 'Available widgets' }),
        candidates: available
      },
      {
        id: 'unavailable',
        title: $i18nT('ui.shell.shellRegion.empty.unavailable', { default: 'Unavailable in this context' }),
        candidates: unavailable
      }
    ].filter((group) => group.candidates.length > 0);
  }

  function matchesCandidate(candidate: ShellRegionEmptyCandidate, query: string): boolean {
    return [
      candidate.title,
      candidate.description,
      candidate.reason ?? ''
    ].some((value) => value.toLowerCase().includes(query));
  }

  function resolveCandidateIcon(candidate: ShellRegionEmptyCandidate): WorkbenchIconInput {
    if (candidate.icon && resolveWorkbenchIconDefinition(candidate.icon)) {
      return candidate.icon;
    }

    if (candidate.id.includes('inspector') || candidate.title.toLowerCase().includes('inspector')) {
      return 'widget.inspector';
    }

    if (candidate.id.includes('timeline') || candidate.title.toLowerCase().includes('timeline')) {
      return 'widget.timeline';
    }

    if (candidate.id.includes('audio') || candidate.title.toLowerCase().includes('audio')) {
      return 'widget.audio';
    }

    if (candidate.id.includes('notes') || candidate.title.toLowerCase().includes('notes')) {
      return 'widget.notes';
    }

    return 'widget.layout';
  }

  function resolveRegionLabel(regionId: ShellRegionEmptyPickerRequest['regionId']): string {
    if (regionId === 'left') {
      return $i18nT('ui.shell.shellRegion.empty.region.left', { default: 'Left panel' });
    }

    if (regionId === 'right') {
      return $i18nT('ui.shell.shellRegion.empty.region.right', { default: 'Right panel' });
    }

    return $i18nT('ui.shell.shellRegion.empty.region.bottom', { default: 'Bottom panel' });
  }

  function createPickerStyle(
    regionId: ShellRegionEmptyPickerRequest['regionId'],
    anchorRect: ShellRegionEmptyPickerAnchor,
    triggerRect: ShellRegionEmptyPickerAnchor,
    nextViewportWidth: number,
    nextViewportHeight: number,
    measuredPickerHeight: number
  ): string {
    const safeViewportWidth = Math.max(nextViewportWidth, pickerWidthPx + edgeMarginPx * 2);
    const safeViewportHeight = Math.max(nextViewportHeight, pickerMaxHeightPx + edgeMarginPx * 2);
    const width = Math.min(pickerWidthPx, safeViewportWidth - edgeMarginPx * 2);
    const maxHeight = Math.min(pickerMaxHeightPx, safeViewportHeight - edgeMarginPx * 2);
    const visualHeight = clamp(
      measuredPickerHeight > 0 ? measuredPickerHeight : estimatePickerHeight(),
      180,
      maxHeight
    );
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    let left = triggerCenterX - width / 2;
    let top = triggerCenterY - visualHeight / 2;
    let arrowX = width / 2;
    let arrowY = visualHeight / 2;

    if (regionId === 'left') {
      left = anchorRect.right + anchorGapPx;
    } else if (regionId === 'right') {
      left = anchorRect.left - width - anchorGapPx;
    } else {
      top = anchorRect.top - visualHeight - anchorGapPx;
    }

    left = clamp(left, edgeMarginPx, safeViewportWidth - width - edgeMarginPx);
    top = clamp(top, edgeMarginPx, safeViewportHeight - visualHeight - edgeMarginPx);
    arrowX = clamp(triggerCenterX - left, 22, width - 22);
    arrowY = clamp(triggerCenterY - top, 22, visualHeight - 22);

    return [
      `--shell-region-widget-picker-left: ${left}px`,
      `--shell-region-widget-picker-top: ${top}px`,
      `--shell-region-widget-picker-width: ${width}px`,
      `--shell-region-widget-picker-max-height: ${maxHeight}px`,
      `--shell-region-widget-picker-arrow-x: ${arrowX}px`,
      `--shell-region-widget-picker-arrow-y: ${arrowY}px`
    ].join('; ');
  }

  function estimatePickerHeight(): number {
    const groupCount = Math.max(candidateGroups.length, 1);
    const candidateCount = Math.max(filteredCandidates.length, 1);

    return 146 + groupCount * 30 + candidateCount * 78;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function selectWidget(widgetId: string): void {
    onSelectWidget(widgetId);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!request || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    onClose();
  }
</script>

<svelte:window
  bind:innerWidth={viewportWidth}
  bind:innerHeight={viewportHeight}
  on:keydown={handleKeydown}
/>

{#if request}
  <div class="shell-region-widget-picker-layer">
    <button
      type="button"
      class="shell-region-widget-picker-layer__backdrop"
      aria-label={$i18nT('ui.shell.shellRegion.empty.closePicker', { default: 'Close widget picker' })}
      on:click={onClose}
    />

    <section
      class:shell-region-widget-picker--left={request.regionId === 'left'}
      class:shell-region-widget-picker--right={request.regionId === 'right'}
      class:shell-region-widget-picker--bottom={request.regionId === 'bottom'}
      class="shell-region-widget-picker"
      style={pickerStyle}
      bind:clientHeight={pickerHeight}
      role="dialog"
      aria-label={$i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })}
    >
      <header class="shell-region-widget-picker__header">
        <div>
          <h2>{$i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })}</h2>
          <span>{regionLabel}</span>
        </div>
        <button
          type="button"
          class="shell-region-widget-picker__close"
          aria-label={$i18nT('ui.shell.shellRegion.empty.closePicker', { default: 'Close widget picker' })}
          on:click={onClose}
        >
          <WorkbenchIcon icon="action.close" label="" />
        </button>
      </header>

      <label class="shell-region-widget-picker__search">
        <WorkbenchIcon icon="action.search" label="" />
        <input
          bind:this={queryInput}
          bind:value={searchQuery}
          class="shell-region-widget-picker__search-input"
          type="search"
          placeholder={$i18nT('ui.shell.shellRegion.empty.search', { default: 'Search widgets...' })}
        />
      </label>

      {#if candidateGroups.length > 0}
        <div class="shell-region-widget-picker__groups">
          {#each candidateGroups as group (group.id)}
            <section class="shell-region-widget-picker__group" aria-label={group.title}>
              <h3>{group.title}</h3>
              <div class="shell-region-widget-picker__list">
                {#each group.candidates as candidate (candidate.id)}
                  <button
                    type="button"
                    class:shell-region-widget-picker__candidate--contextual={candidate.relevance === 'contextual'}
                    class:shell-region-widget-picker__candidate--unavailable={candidate.relevance === 'unavailable'}
                    class="shell-region-widget-picker__candidate"
                    disabled={candidate.relevance === 'unavailable'}
                    on:click={() => selectWidget(candidate.id)}
                  >
                    <span class="shell-region-widget-picker__candidate-icon">
                      <WorkbenchIcon icon={resolveCandidateIcon(candidate)} label={candidate.title} />
                    </span>
                    <span class="shell-region-widget-picker__candidate-text">
                      <strong>{candidate.title}</strong>
                      <span>{candidate.reason ?? candidate.description}</span>
                    </span>
                    <span class="shell-region-widget-picker__candidate-add" aria-hidden="true">
                      {#if candidate.relevance === 'unavailable'}
                        {$i18nT('ui.shell.shellRegion.empty.blocked', { default: 'Blocked' })}
                      {:else}
                        <WorkbenchIcon icon="action.add" label="" />
                      {/if}
                    </span>
                  </button>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {:else}
        <div class="shell-region-widget-picker__notice" role="status">
          {$i18nT('ui.shell.shellRegion.empty.noCandidates', { default: 'No widget is available for this region.' })}
        </div>
      {/if}
    </section>
  </div>
{/if}

<style>
  .shell-region-widget-picker-layer {
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    isolation: isolate;
  }

  .shell-region-widget-picker-layer__backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    padding: 0;
    border: 0;
    background: transparent;
    pointer-events: auto;
  }

  .shell-region-widget-picker {
    position: fixed;
    z-index: 1;
    left: var(--shell-region-widget-picker-left);
    top: var(--shell-region-widget-picker-top);
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: var(--space-16);
    width: var(--shell-region-widget-picker-width);
    max-height: var(--shell-region-widget-picker-max-height);
    padding: var(--space-18, 1.125rem);
    overflow: visible;
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 78%, transparent);
    border-radius: var(--radius-large);
    background:
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--color-background-elevated) 94%, #10253a 6%),
        color-mix(in srgb, var(--color-background-canvas) 96%, #071522 4%)
      ),
      #06111e;
    box-shadow:
      0 24px 58px rgb(0 0 0 / 0.38),
      0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 16%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
    pointer-events: auto;
  }

  .shell-region-widget-picker::before,
  .shell-region-widget-picker::after {
    content: '';
    position: absolute;
    display: block;
    pointer-events: none;
  }

  .shell-region-widget-picker::before {
    z-index: 0;
    width: 1.1rem;
    height: 1.28rem;
    background: color-mix(in srgb, var(--color-border-strong) 86%, transparent);
  }

  .shell-region-widget-picker::after {
    z-index: 1;
    width: 0.92rem;
    height: 1.08rem;
    background: color-mix(in srgb, var(--color-background-elevated) 94%, #10253a 6%);
  }

  .shell-region-widget-picker--left::before {
    left: -1.02rem;
    top: calc(var(--shell-region-widget-picker-arrow-y) - 0.64rem);
    clip-path: polygon(100% 0, 0 50%, 100% 100%);
  }

  .shell-region-widget-picker--left::after {
    left: -0.82rem;
    top: calc(var(--shell-region-widget-picker-arrow-y) - 0.54rem);
    clip-path: polygon(100% 0, 0 50%, 100% 100%);
  }

  .shell-region-widget-picker--right::before {
    right: -1.02rem;
    top: calc(var(--shell-region-widget-picker-arrow-y) - 0.64rem);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }

  .shell-region-widget-picker--right::after {
    right: -0.82rem;
    top: calc(var(--shell-region-widget-picker-arrow-y) - 0.54rem);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }

  .shell-region-widget-picker--bottom::before {
    left: calc(var(--shell-region-widget-picker-arrow-x) - 0.64rem);
    bottom: -1.02rem;
    width: 1.28rem;
    height: 1.1rem;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .shell-region-widget-picker--bottom::after {
    left: calc(var(--shell-region-widget-picker-arrow-x) - 0.54rem);
    bottom: -0.82rem;
    width: 1.08rem;
    height: 0.92rem;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .shell-region-widget-picker__header {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    min-width: 0;
  }

  .shell-region-widget-picker__header span,
  .shell-region-widget-picker__group h3 {
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .shell-region-widget-picker__header > div {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .shell-region-widget-picker__header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.42rem;
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: 0;
  }

  .shell-region-widget-picker__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: var(--color-text-muted);
  }

  .shell-region-widget-picker__close:hover,
  .shell-region-widget-picker__close:focus-visible {
    border-color: var(--color-border-subtle);
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .shell-region-widget-picker__close :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .shell-region-widget-picker__search {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
    min-height: 3.25rem;
    padding: 0 var(--space-12);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 68%, transparent);
    border-radius: var(--radius-medium);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-background-surface) 58%, #020913 42%),
        color-mix(in srgb, var(--color-background-canvas) 88%, #020913 12%)
      );
    color: var(--color-text-muted);
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease;
  }

  .shell-region-widget-picker__search:focus-within {
    border-color: color-mix(in srgb, var(--color-accent-primary) 40%, var(--color-border-subtle));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 12%, transparent),
      0 0 14px color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
  }

  .shell-region-widget-picker__search :global(.workbench-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .shell-region-widget-picker__search-input {
    min-width: 0;
    width: 100%;
    height: 3.15rem;
    padding: 0;
    border: 0 !important;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    outline: none !important;
    box-shadow: none !important;
  }

  .shell-region-widget-picker__groups {
    position: relative;
    z-index: 2;
    display: grid;
    gap: var(--space-14);
    min-width: 0;
    overflow: auto;
    padding-right: var(--space-4);
  }

  .shell-region-widget-picker__group {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
  }

  .shell-region-widget-picker__group h3 {
    margin: 0;
  }

  .shell-region-widget-picker__list {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
  }

  .shell-region-widget-picker__candidate {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-14);
    width: 100%;
    min-width: 0;
    min-height: 4.25rem;
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 28%, transparent);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-surface) 58%, transparent);
    color: var(--color-text-secondary);
    text-align: left;
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
  }

  .shell-region-widget-picker__candidate--contextual {
    border-color: color-mix(in srgb, var(--color-accent-primary) 22%, transparent);
    background: color-mix(in srgb, var(--color-background-selected) 54%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 10%, transparent);
  }

  .shell-region-widget-picker__candidate--unavailable {
    border-color: color-mix(in srgb, var(--color-border-subtle) 42%, transparent);
    background: color-mix(in srgb, var(--color-background-muted) 38%, transparent);
    opacity: 0.72;
    cursor: not-allowed;
  }

  .shell-region-widget-picker__candidate:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-accent-primary) 36%, transparent);
    background: color-mix(in srgb, var(--color-background-selected) 68%, var(--color-background-surface));
    color: var(--color-text-primary);
  }

  .shell-region-widget-picker__candidate-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.05rem;
    height: 3.05rem;
    min-width: 3.05rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 72%, transparent);
    border-radius: var(--radius-medium);
    color: color-mix(in srgb, var(--color-text-primary) 78%, var(--color-accent-primary));
    background: color-mix(in srgb, var(--color-background-selected) 44%, transparent);
  }

  .shell-region-widget-picker__candidate-icon :global(.workbench-icon) {
    width: 1.35rem;
    height: 1.35rem;
  }

  .shell-region-widget-picker__candidate-icon :global(.workbench-icon__fallback) {
    font-size: 0;
  }

  .shell-region-widget-picker__candidate-text {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .shell-region-widget-picker__candidate-text strong,
  .shell-region-widget-picker__candidate-text span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell-region-widget-picker__candidate-text strong {
    color: var(--color-text-primary);
    font-size: 1.08rem;
    line-height: 1.15;
  }

  .shell-region-widget-picker__candidate-text span,
  .shell-region-widget-picker__candidate-add,
  .shell-region-widget-picker__notice {
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
  }

  .shell-region-widget-picker__candidate-add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
    min-width: 2rem;
    min-height: 2rem;
    padding: var(--space-2) var(--space-6);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 42%, transparent);
    border-radius: 999px;
    color: var(--color-accent-primary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .shell-region-widget-picker__candidate-add :global(.workbench-icon) {
    width: 1rem;
    height: 1rem;
  }

  .shell-region-widget-picker__notice {
    position: relative;
    z-index: 2;
    padding: var(--space-8);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
  }
</style>
