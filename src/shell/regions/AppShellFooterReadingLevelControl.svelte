<script lang="ts">
  import type { WorkbenchReadingLevel } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  import type { FooterControlId } from './footerControl';

  const i18nT = getWorkbenchTranslator();

  export let hoveredFooterControl: FooterControlId | null = null;
  export let activeReadingLevelDefault: WorkbenchReadingLevel = 'casual';
  export let handleReadingLevelDefaultChange: (event: Event) => void = () => undefined;

  const options: WorkbenchReadingLevel[] = ['casual', 'advanced', 'expert'];
</script>

<div
  role="presentation"
  class="app-shell__footer-reading-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'reading')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <label
    class="app-shell__footer-reading"
    title={$i18nT('ui.shell.footer.reading.title', { default: 'Default Tool reading level' })}
    aria-label={$i18nT('ui.shell.footer.reading.ariaLabel', { default: 'Default Tool reading level' })}
  >
    <span class="app-shell__footer-reading-icon" aria-hidden="true">
      <WorkbenchIcon icon="action.visibility" label="" />
    </span>
    <select
      class="app-shell__footer-reading-select"
      bind:value={activeReadingLevelDefault}
      on:change={handleReadingLevelDefaultChange}
    >
      {#each options as option}
        <option value={option}>
          {$i18nT(`ui.shell.readingLevel.${option}`, { default: option })}
        </option>
      {/each}
    </select>
  </label>
</div>

<style>
  .app-shell__footer-reading-group {
    color: var(--app-shell-footer-control-text-muted, var(--color-text-muted));
  }

  .app-shell__footer-reading {
    display: inline-flex;
    align-items: center;
    gap: var(--app-shell-footer-control-gap, 0.32rem);
    height: 100%;
    padding: 0 var(--app-shell-footer-control-padding-x, 0.54rem);
    color: inherit;
  }

  .app-shell__footer-reading-icon {
    width: var(--app-shell-footer-icon-size, 0.76rem);
    height: var(--app-shell-footer-icon-size, 0.76rem);
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: inherit;
  }

  .app-shell__footer-reading-select {
    height: calc(var(--app-shell-footer-control-height, 1.5rem) - 2px);
    min-width: 4.9rem;
    border: 0;
    border-left: 1px solid var(--app-shell-footer-control-border, var(--color-border-subtle));
    border-radius: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--app-shell-footer-control-font-size, var(--font-size-label));
    line-height: 1;
    padding-left: var(--space-5);
  }

  .app-shell__footer-reading-select:focus-visible {
    outline: 1px solid color-mix(in srgb, var(--color-action-primary) 72%, transparent);
    outline-offset: 1px;
  }
</style>
