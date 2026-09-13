<script lang="ts">
  import type { BootProjection, RuntimeProjectionSessionEntry, WorkbenchRuntimeSnapshot } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import RuntimeObservabilityPanel from '../RuntimeObservabilityPanel.svelte';
  import type {
    RuntimeProjectionActionState,
    RuntimeProjectionTarget,
    RuntimeProjectionViewerOption
  } from '../runtimeObservability';

  import type { FooterControlId } from './footerControl';

  export let hoveredFooterControl: FooterControlId | null = null;
  export let runtimeControlElement: HTMLDivElement | null = null;
  export let runtimeMenuElement: HTMLDivElement | null = null;
  export let isRuntimeMenuOpen = false;
  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let runtimeFooterStatus: WorkbenchRuntimeSnapshot['status'] | 'idle' = 'idle';
  export let runtimeFooterLabel = 'Runtime idle';
  export let runtimeFooterTitle = 'Runtime idle';
  export let runtimeFooterEventCount = 0;
  export let runtimeFooterEvents: WorkbenchRuntimeSnapshot['events'] = [];
  export let runtimeFooterCapabilities: string[] = [];
  export let runtimeFooterProjectionCatalog: WorkbenchRuntimeSnapshot['projectionCatalog'] = [];
  export let bootProjection: BootProjection | null = null;
  export let runtimeProjectionViewerOptionsByKind: Record<string, RuntimeProjectionViewerOption[]> = {};
  export let runtimeProjectionSessionEntries: RuntimeProjectionSessionEntry[] = [];
  export let activeRuntimeProjectionTarget: RuntimeProjectionTarget | null = null;
  export let activeRuntimeProjectionSource: string | null = null;
  export let isInvalidatingRuntimeProjection = false;
  export let runtimeProjectionActionStatus: RuntimeProjectionActionState | null = null;
  export let toggleRuntimeMenu: () => void = () => undefined;
  export let reconnectRuntime: () => void = () => undefined;
  export let openRuntimeProjection: (
    target?: RuntimeProjectionTarget | null,
    viewerId?: string | null
  ) => Promise<void> | void = () => undefined;
  export let invalidateRuntimeProjection: () => Promise<void> | void = () => undefined;

  const i18nT = getWorkbenchTranslator();
</script>

<div
  bind:this={runtimeControlElement}
  role="presentation"
  class:app-shell__footer-control--open={isRuntimeMenuOpen}
  class="app-shell__footer-runtime-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'runtime')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <button
    type="button"
    class={`app-shell__footer-runtime app-shell__footer-runtime--${runtimeFooterStatus}`}
    aria-label={runtimeFooterLabel}
    aria-haspopup="menu"
    aria-expanded={isRuntimeMenuOpen}
    title={runtimeFooterTitle}
    on:click={toggleRuntimeMenu}
  >
    <span class="app-shell__footer-runtime-dot" aria-hidden="true"></span>
    <span class="app-shell__footer-runtime-icon" aria-hidden="true">
      <WorkbenchIcon icon="action.settings" label="" />
    </span>
  </button>

  {#if isRuntimeMenuOpen}
    <div
      bind:this={runtimeMenuElement}
      class="app-shell__footer-help-menu app-shell__footer-runtime-menu"
      role="menu"
      aria-label={$i18nT('ui.shell.footer.runtimeStatus', { default: 'Runtime status' })}
    >
      <RuntimeObservabilityPanel
        {runtimeSnapshot}
        {runtimeFooterStatus}
        {runtimeFooterLabel}
        {runtimeFooterEventCount}
        {runtimeFooterEvents}
        {runtimeFooterCapabilities}
        {runtimeFooterProjectionCatalog}
        {bootProjection}
        {runtimeProjectionViewerOptionsByKind}
        {runtimeProjectionSessionEntries}
        {activeRuntimeProjectionTarget}
        {activeRuntimeProjectionSource}
        {isInvalidatingRuntimeProjection}
        {runtimeProjectionActionStatus}
        onReconnectRuntime={reconnectRuntime}
        onOpenRuntimeProjection={openRuntimeProjection}
        onInvalidateRuntimeProjection={invalidateRuntimeProjection}
      />
    </div>
  {/if}
</div>

<style>
  .app-shell__footer-runtime-group {
    color: var(--app-shell-footer-control-text, var(--color-text-secondary));
  }

  .app-shell__footer-runtime {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--app-shell-footer-control-gap, 0.32rem);
    padding: 0 var(--app-shell-footer-control-padding-x, 0.54rem);
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  .app-shell__footer-runtime:hover {
    color: var(--app-shell-footer-control-text-active, var(--color-text-primary));
  }

  .app-shell__footer-runtime-dot {
    width: var(--app-shell-footer-dot-size, 0.42rem);
    height: var(--app-shell-footer-dot-size, 0.42rem);
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--color-text-muted);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-text-muted) 16%, transparent);
  }

  .app-shell__footer-runtime--online .app-shell__footer-runtime-dot {
    background: var(--color-status-success);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-status-success) 18%, transparent);
  }

  .app-shell__footer-runtime--connecting .app-shell__footer-runtime-dot {
    background: var(--color-status-warning);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-status-warning) 18%, transparent);
  }

  .app-shell__footer-runtime--offline .app-shell__footer-runtime-dot,
  .app-shell__footer-runtime--idle .app-shell__footer-runtime-dot {
    background: var(--color-text-muted);
  }

  .app-shell__footer-runtime--error .app-shell__footer-runtime-dot {
    background: var(--color-status-danger);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-status-danger) 18%, transparent);
  }

  .app-shell__footer-runtime-icon {
    width: var(--app-shell-footer-icon-size, 0.76rem);
    height: var(--app-shell-footer-icon-size, 0.76rem);
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
  }

  .app-shell__footer-help-menu {
    position: absolute;
    z-index: 90;
    right: 0;
    bottom: calc(100% + var(--space-2));
    width: min(42rem, calc(100vw - 2rem));
    max-height: min(34rem, calc(100vh - 6rem));
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.8fr);
    overflow: hidden;
    border: 1px solid var(--app-shell-footer-menu-border, var(--color-border-strong));
    border-radius: var(--radius-large);
    background: var(--app-shell-footer-menu-surface, var(--color-background-elevated));
    box-shadow: var(--app-shell-footer-menu-shadow, var(--shadow-popover));
  }

  .app-shell__footer-runtime-menu {
    width: min(64rem, calc(100vw - 2rem));
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.52fr);
  }

  @media (max-width: 760px) {
    .app-shell__footer-help-menu {
      width: calc(100vw - 1rem);
      right: -0.4rem;
    }
  }
</style>
