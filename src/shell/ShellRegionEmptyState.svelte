<script lang="ts">
  import type { ShellRegionId, ShellWidgetPlacement } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type {
    ShellRegionEmptyCandidate,
    ShellRegionEmptyPickerRequest
  } from './shellRegionWidgetPicker';

  export let regionId: ShellRegionId;
  export let candidates: ShellRegionEmptyCandidate[] = [];
  export let isPickerOpen = false;
  export let variant: 'empty' | 'append' = 'empty';
  export let placement: ShellWidgetPlacement = {};
  export let onOpenPicker: (request: ShellRegionEmptyPickerRequest) => void = () => {};

  const i18nT = getWorkbenchTranslator();

  let rootElement: HTMLDivElement | null = null;
  let slotElement: HTMLButtonElement | null = null;

  function openPicker(): void {
    if (!rootElement || !slotElement) {
      return;
    }

    const anchorRect = rootElement.getBoundingClientRect();
    const triggerRect = slotElement.getBoundingClientRect();

    onOpenPicker({
      regionId,
      candidates,
      anchorRect: {
        left: anchorRect.left,
        top: anchorRect.top,
        right: anchorRect.right,
        bottom: anchorRect.bottom,
        width: anchorRect.width,
        height: anchorRect.height
      },
      triggerRect: {
        left: triggerRect.left,
        top: triggerRect.top,
        right: triggerRect.right,
        bottom: triggerRect.bottom,
        width: triggerRect.width,
        height: triggerRect.height
      },
      placement
    });
  }
</script>

<div
  bind:this={rootElement}
  class:shell-region-empty-state--bottom={regionId === 'bottom'}
  class:shell-region-empty-state--append={variant === 'append'}
  class:shell-region-empty-state--picker-open={isPickerOpen}
  class="shell-region-empty-state"
>
  <button
    bind:this={slotElement}
    type="button"
    class="shell-region-empty-state__slot"
    aria-label={$i18nT('ui.shell.shellRegion.empty.openPicker', { default: 'Add a widget to this region' })}
    aria-haspopup="dialog"
    aria-expanded={isPickerOpen}
    on:click={openPicker}
  >
    <span class="shell-region-empty-state__slot-mark" aria-hidden="true">
      <WorkbenchIcon icon="action.add" label="" />
    </span>
    <span class="shell-region-empty-state__slot-label">
      {$i18nT('ui.shell.shellRegion.empty.add', { default: 'Add' })}
    </span>
  </button>
</div>

<style>
  .shell-region-empty-state {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: var(--space-12);
    border: 1px dashed color-mix(in srgb, var(--color-accent-primary) 28%, var(--color-border-subtle));
    background:
      linear-gradient(
        135deg,
        transparent 0 46%,
        color-mix(in srgb, var(--color-border-subtle) 15%, transparent) 46% 54%,
        transparent 54% 100%
      ),
      color-mix(in srgb, var(--color-background-surface) 42%, transparent);
    background-size: 1rem 1rem;
    color: var(--color-text-secondary);
  }

  .shell-region-empty-state__slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: auto;
    height: 2.5rem;
    min-width: 0;
    min-height: 2.5rem;
    padding: 0 var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-accent-primary) 42%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background:
      radial-gradient(circle at center, color-mix(in srgb, var(--color-accent-primary) 18%, transparent), transparent 68%),
      color-mix(in srgb, var(--color-background-canvas) 72%, transparent);
    color: var(--color-text-muted);
    text-align: center;
    transition:
      border-color 140ms ease,
      background-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      gap 140ms ease;
  }

  .shell-region-empty-state--bottom .shell-region-empty-state__slot {
    height: 2.5rem;
  }

  .shell-region-empty-state--append {
    height: 3.75rem;
    min-height: 3.75rem;
    padding: var(--space-8);
    border-width: 1px 0 0;
    border-style: solid;
    border-color: color-mix(in srgb, var(--color-accent-primary) 22%, var(--color-border-subtle));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-background-surface) 82%, transparent),
        color-mix(in srgb, var(--color-background-canvas) 64%, transparent)
      ),
      var(--shell-region-barber-background, transparent);
  }

  .shell-region-empty-state__slot:hover,
  .shell-region-empty-state__slot:focus-visible,
  .shell-region-empty-state--picker-open .shell-region-empty-state__slot {
    gap: var(--space-6);
    border-color: color-mix(in srgb, var(--color-accent-primary) 82%, var(--color-border-strong));
    background-color: color-mix(in srgb, var(--color-background-selected) 58%, transparent);
    color: var(--color-text-primary);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 38%, transparent),
      0 0 18px color-mix(in srgb, var(--color-accent-primary) 18%, transparent);
  }

  .shell-region-empty-state__slot-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.45rem;
    height: 1.45rem;
    color: color-mix(in srgb, var(--color-accent-primary) 72%, var(--color-text-primary));
    font-size: 1.2rem;
  }

  .shell-region-empty-state__slot-mark :global(.workbench-icon) {
    width: 1rem;
    height: 1rem;
  }

  .shell-region-empty-state__slot-label {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    color: var(--color-accent-primary);
    font-size: var(--font-size-label);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition:
      opacity 140ms ease,
      max-width 140ms ease;
  }

  .shell-region-empty-state__slot:hover .shell-region-empty-state__slot-label,
  .shell-region-empty-state__slot:focus-visible .shell-region-empty-state__slot-label,
  .shell-region-empty-state--picker-open .shell-region-empty-state__slot-label {
    max-width: 6rem;
    opacity: 1;
  }
</style>
