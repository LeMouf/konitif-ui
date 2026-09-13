<script lang="ts">
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import type { WorkbenchLocaleOption } from '../../i18n/workbenchLanguagePreference';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';

  import type { FooterControlId } from './footerControl';

  const i18nT = getWorkbenchTranslator();

  export let hoveredFooterControl: FooterControlId | null = null;
  export let activeI18nLocale = 'en';
  export let i18nLocaleOptions: WorkbenchLocaleOption[] = [];
  export let handleI18nLocaleChange: (event: Event) => void = () => undefined;
</script>

<div
  role="presentation"
  class="app-shell__footer-language-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'language')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <label
    class="app-shell__footer-language"
    title={$i18nT('ui.shell.footer.language.title', { default: 'Workbench language' })}
    aria-label={$i18nT('ui.shell.footer.language.ariaLabel', { default: 'Language' })}
  >
    <span class="app-shell__footer-language-icon" aria-hidden="true">
      <WorkbenchIcon icon="action.language" label="" />
    </span>
    <select
      class="app-shell__footer-language-select"
      bind:value={activeI18nLocale}
      on:change={handleI18nLocaleChange}
    >
      {#each i18nLocaleOptions as option}
        <option value={option.locale}>{option.nativeLabel}</option>
      {/each}
    </select>
  </label>
</div>

<style>
  .app-shell__footer-language-group {
    color: var(--app-shell-footer-control-text-muted, var(--color-text-muted));
  }

  .app-shell__footer-language {
    display: inline-flex;
    align-items: center;
    gap: var(--app-shell-footer-control-gap, 0.32rem);
    height: 100%;
    padding: 0 var(--app-shell-footer-control-padding-x, 0.54rem);
    color: inherit;
  }

  .app-shell__footer-language-icon {
    width: var(--app-shell-footer-icon-size, 0.76rem);
    height: var(--app-shell-footer-icon-size, 0.76rem);
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: inherit;
  }

  .app-shell__footer-language-select {
    height: calc(var(--app-shell-footer-control-height, 1.5rem) - 2px);
    min-width: 4.6rem;
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

  .app-shell__footer-language-select:focus-visible {
    outline: 1px solid color-mix(in srgb, var(--color-action-primary) 72%, transparent);
    outline-offset: 1px;
  }
</style>
