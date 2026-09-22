<script context="module" lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';

  export type AppShellPanelVisibilityEntry = {
    id: string;
    label: string;
    title: string;
    active: boolean;
    icon?: WorkbenchIconInput | null;
    toolId?: string;
    toolInstanceId?: string;
  };

  export type AppShellWorkspacePresetEntry = {
    id: string;
    label: string;
    labelKey?: string;
    description?: string;
    descriptionKey?: string;
    icon?: WorkbenchIconInput;
  };

</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';
  import { mountWorkbenchPortalNode } from '../portal/workbenchPortalRoot';

  export let panels: readonly AppShellPanelVisibilityEntry[] = [];
  export let presets: readonly AppShellWorkspacePresetEntry[] = [];
  export let activePresetId = '';
  export let activePresetLabel = '';
  export let isLayoutEditingEnabled = false;
  export let onToggleLayoutEditing: () => void = () => undefined;
  export let onTogglePanel: (panelId: string) => void = () => undefined;
  export let onSelectPreset: (presetId: string) => void = () => undefined;
  export let onResetPreset: (presetId: string) => void = () => undefined;
  export let onCreatePresetSnapshot: () => void = () => undefined;
  export let onLoadNativeFixture: (() => void) | null = null;
  export let createSnapshot: (() => unknown) | null = null;

  const i18nT = getWorkbenchTranslator();
  let isPresetMenuOpen = false;
  let presetAnchorElement: HTMLDivElement | null = null;
  let presetMenuLayoutEpoch = 0;

  $: hasPanels = panels.length > 0;
  $: hasPresets = presets.length > 0;
  $: canResetActivePreset = presets.some((preset) => preset.id === activePresetId);
  $: layoutButtonLabel = activePresetLabel || $i18nT('ui.shell.footer.layout', { default: 'Layout' });
  $: presetMenuStyle =
    (void presetMenuLayoutEpoch,
    isPresetMenuOpen && presetAnchorElement ? resolvePresetMenuStyle(presetAnchorElement) : '');

  function portal(node: HTMLElement) {
    return mountWorkbenchPortalNode(node);
  }

  function togglePresetMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (!hasPresets) {
      return;
    }

    isPresetMenuOpen = !isPresetMenuOpen;
    presetMenuLayoutEpoch += 1;
  }

  function selectPreset(presetId: string): void {
    isPresetMenuOpen = false;
    onSelectPreset(presetId);
  }

  function localizePresetLabel(
    preset: AppShellWorkspacePresetEntry,
    translate: WorkbenchTranslate
  ): string {
    return preset.labelKey
      ? translate(preset.labelKey, { default: preset.label })
      : preset.label;
  }

  function localizePresetDescription(
    preset: AppShellWorkspacePresetEntry,
    translate: WorkbenchTranslate
  ): string | undefined {
    if (!preset.description) return undefined;
    return preset.descriptionKey
      ? translate(preset.descriptionKey, { default: preset.description })
      : preset.description;
  }

  function createPresetSnapshotSeed(): void {
    isPresetMenuOpen = false;
    onCreatePresetSnapshot();
  }

  function loadNativeFixture(): void {
    isPresetMenuOpen = false;
    onLoadNativeFixture?.();
  }

  function resetPreset(): void {
    if (!canResetActivePreset) {
      return;
    }

    isPresetMenuOpen = false;
    onResetPreset(activePresetId);
  }

  async function copyPresetSnapshot(): Promise<void> {
    const fallbackSnapshot = {
      activePresetId,
      activePresetLabel: layoutButtonLabel,
      activePreset: presets.find((preset) => preset.id === activePresetId) ?? null,
      presets,
      panels,
      copiedAt: new Date().toISOString()
    };
    const snapshot = createSnapshot?.() ?? fallbackSnapshot;

    await copyText(JSON.stringify(snapshot, null, 2));
  }

  async function copyText(value: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Fall through to the legacy clipboard path.
      }
    }

    if (typeof document === 'undefined') {
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  function handleWindowPointerDown(): void {
    isPresetMenuOpen = false;
  }

  function handleWindowLayoutChange(): void {
    if (isPresetMenuOpen) {
      presetMenuLayoutEpoch += 1;
    }
  }

  function resolvePresetMenuStyle(anchor: HTMLElement): string {
    const anchorRect = anchor.getBoundingClientRect();
    const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;
    const offset = 6;
    const margin = 8;
    const top = Math.min(anchorRect.bottom + offset, Math.max(margin, viewportHeight - margin));
    const right = Math.max(margin, viewportWidth - anchorRect.right);
    const maxHeight = Math.max(12 * 16, viewportHeight - top - margin);

    return `top:${top}px;right:${right}px;max-height:${maxHeight}px;`;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('resize', handleWindowLayoutChange);
    window.addEventListener('scroll', handleWindowLayoutChange, true);
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('resize', handleWindowLayoutChange);
      window.removeEventListener('scroll', handleWindowLayoutChange, true);
    }
  });
</script>

<div
  class="app-shell-panel-visibility"
  aria-label={$i18nT('ui.shell.toolbar.panelVisibility.ariaLabel', { default: 'Tool panel visibility' })}
>
  <div class="app-shell-panel-visibility__group">
    <button
      type="button"
      class:app-shell-panel-visibility__button--active={isLayoutEditingEnabled}
      class="app-shell-panel-visibility__button app-shell-panel-visibility__button--layout"
      title={isLayoutEditingEnabled
        ? $i18nT('ui.shell.toolbar.layout.disable', { default: 'Disable layout editing' })
        : $i18nT('ui.shell.toolbar.layout.enable', { default: 'Enable layout editing' })}
      aria-pressed={isLayoutEditingEnabled}
      on:click={onToggleLayoutEditing}
    >
      <WorkbenchIcon
        className="app-shell-panel-visibility__button-icon"
        icon={isLayoutEditingEnabled ? 'action.brush' : 'action.lock'}
        label={isLayoutEditingEnabled
          ? $i18nT('ui.shell.toolbar.layout.enabled', { default: 'Layout editing enabled' })
          : $i18nT('ui.shell.toolbar.layout.locked', { default: 'Layout locked' })}
      />
      <span>{layoutButtonLabel}</span>
    </button>

    <div class="app-shell-panel-visibility__preset-anchor" bind:this={presetAnchorElement}>
      <IconButton
        label={$i18nT('ui.shell.toolbar.workspacePresets.label', { default: 'Workbench presets' })}
        title={hasPresets
          ? $i18nT('ui.shell.toolbar.workspacePresets.title', { default: 'Load a workbench panel preset' })
          : $i18nT('ui.shell.toolbar.workspacePresets.empty', { default: 'No workbench presets available' })}
        variant={isPresetMenuOpen ? 'active' : 'ghost'}
        disabled={!hasPresets}
        icon="action.more-horizontal"
        on:click={togglePresetMenu}
      />

      {#if isPresetMenuOpen}
        <div
          use:portal
          class="app-shell-panel-visibility__preset-menu"
          role="menu"
          style={presetMenuStyle}
          on:pointerdown|stopPropagation
        >
          <p class="app-shell-panel-visibility__preset-heading">
            {$i18nT('ui.shell.toolbar.workspacePresets.heading', { default: 'Presets' })}
          </p>
          {#each presets as preset (preset.id)}
            <button
              type="button"
              class:app-shell-panel-visibility__preset-item--active={preset.id === activePresetId}
              class="app-shell-panel-visibility__preset-item"
              role="menuitem"
              aria-current={preset.id === activePresetId ? 'true' : undefined}
              title={localizePresetDescription(preset, $i18nT) ?? localizePresetLabel(preset, $i18nT)}
              on:click={() => selectPreset(preset.id)}
            >
              <span class="app-shell-panel-visibility__preset-title">
                {#if preset.icon}
                  <WorkbenchIcon
                    className="app-shell-panel-visibility__preset-icon"
                    icon={preset.icon}
                    label={localizePresetLabel(preset, $i18nT)}
                  />
                {/if}
                <span>{localizePresetLabel(preset, $i18nT)}</span>
              </span>
              {#if preset.description}
                <small>{localizePresetDescription(preset, $i18nT)}</small>
              {/if}
            </button>
          {/each}
          <span class="app-shell-panel-visibility__preset-separator" aria-hidden="true"></span>
          {#if onLoadNativeFixture}
            <button
              type="button"
              class="app-shell-panel-visibility__preset-item app-shell-panel-visibility__preset-item--fixture"
              role="menuitem"
              title={$i18nT('ui.shell.toolbar.workspacePresets.nativeFixture.title', { default: 'Load the bundled synthetic QA fixture' })}
              on:click|stopPropagation={loadNativeFixture}
            >
              <span>{$i18nT('ui.shell.toolbar.workspacePresets.nativeFixture.label', { default: 'Load native QA fixture' })}</span>
              <small>{$i18nT('ui.shell.toolbar.workspacePresets.nativeFixture.copy', { default: 'Synthetic, offline, no external I/O' })}</small>
            </button>
            <span class="app-shell-panel-visibility__preset-separator" aria-hidden="true"></span>
          {/if}
          <button
            type="button"
            class="app-shell-panel-visibility__preset-item app-shell-panel-visibility__preset-item--reset"
            role="menuitem"
            disabled={!canResetActivePreset}
            title={$i18nT('ui.shell.toolbar.workspacePresets.reset.title', { default: 'Reset the active preset layout' })}
            on:click|stopPropagation={resetPreset}
          >
            <span>{$i18nT('ui.shell.toolbar.workspacePresets.reset.label', { default: 'Reset preset' })}</span>
            <small>{$i18nT('ui.shell.toolbar.workspacePresets.reset.copy', { default: 'Restore default docking, sizing, and visibility' })}</small>
          </button>
          <button
            type="button"
            class="app-shell-panel-visibility__preset-item app-shell-panel-visibility__preset-item--create"
            role="menuitem"
            title={$i18nT('ui.shell.toolbar.workspacePresets.createSnapshot.title', { default: 'Create a blank workspace preset seed' })}
            on:click|stopPropagation={createPresetSnapshotSeed}
          >
            <span>{$i18nT('ui.shell.toolbar.workspacePresets.createSnapshot.label', { default: 'Save current preset' })}</span>
            <small>{$i18nT('ui.shell.toolbar.workspacePresets.createSnapshot.copy', { default: 'Name and version this workspace projection' })}</small>
          </button>
          <button
            type="button"
            class="app-shell-panel-visibility__preset-item app-shell-panel-visibility__preset-item--snapshot"
            role="menuitem"
            title={$i18nT('ui.shell.toolbar.workspacePresets.snapshot.title', { default: 'Copy current preset snapshot' })}
            on:click|stopPropagation={copyPresetSnapshot}
          >
            <span>{$i18nT('ui.shell.toolbar.workspacePresets.snapshot.label', { default: 'Copy snapshot' })}</span>
            <small>{layoutButtonLabel}</small>
          </button>
        </div>
      {/if}
    </div>

    <span class="app-shell-panel-visibility__separator" aria-hidden="true"></span>

    {#if hasPanels}
      {#each panels as panel (panel.id)}
        <button
          type="button"
          class:app-shell-panel-visibility__button--active={panel.active}
          class="app-shell-panel-visibility__button"
          title={panel.title}
          aria-label={panel.title}
          aria-pressed={panel.active}
          on:click={() => onTogglePanel(panel.id)}
        >
          {#if panel.icon}
            <WorkbenchIcon
              className="app-shell-panel-visibility__button-icon"
              icon={panel.icon}
              label={panel.label}
            />
          {:else}
            {panel.label}
          {/if}
        </button>
      {/each}
    {:else}
      <button
        type="button"
        class="app-shell-panel-visibility__button app-shell-panel-visibility__button--empty"
        disabled
        title={$i18nT('ui.shell.toolbar.panelVisibility.emptyTitle', { default: 'No panel currently hosts a tool.' })}
      >
        {$i18nT('ui.shell.toolbar.panelVisibility.empty', { default: 'No tool panels' })}
      </button>
    {/if}
  </div>
</div>

<style>
  .app-shell-panel-visibility {
    justify-self: center;
    min-width: 0;
  }

  .app-shell-panel-visibility__group {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    height: var(
      --app-shell-toolbar-control-height,
      calc(var(--size-icon-button) + var(--space-6))
    );
    gap: var(--space-4);
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
  }

  .app-shell-panel-visibility__button {
    appearance: none;
    display: inline-flex;
    min-height: 1.75rem;
    max-width: 10rem;
    border: 0;
    border-radius: calc(var(--radius-medium) - var(--space-2));
    padding: 0 var(--space-10);
    overflow: hidden;
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-body);
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
    align-items: center;
    justify-content: center;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
  }

  .app-shell-panel-visibility__button:hover:not(:disabled) {
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__button:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }

  .app-shell-panel-visibility__button--active {
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__button--empty {
    color: var(--color-text-muted);
  }

  .app-shell-panel-visibility__button--layout {
    gap: var(--space-5);
    max-width: none;
  }

  :global(.app-shell-panel-visibility__button-icon) {
    width: 1.17rem;
    height: 1.17rem;
  }

  .app-shell-panel-visibility__separator {
    width: 1px;
    align-self: stretch;
    min-height: 1.25rem;
    background: var(--color-border-subtle);
  }

  .app-shell-panel-visibility__preset-anchor {
    position: relative;
    display: inline-flex;
  }

  .app-shell-panel-visibility__preset-menu {
    position: fixed;
    z-index: 2147483000;
    display: grid;
    gap: var(--space-4);
    min-width: 13rem;
    overflow-y: auto;
    padding: var(--space-8);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
  }

  .app-shell-panel-visibility__preset-heading {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .app-shell-panel-visibility__preset-item {
    appearance: none;
    display: grid;
    gap: var(--space-2);
    width: 100%;
    border: 1px solid transparent;
    border-radius: var(--radius-medium);
    padding: var(--space-7) var(--space-8);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
  }

  .app-shell-panel-visibility__preset-item:hover,
  .app-shell-panel-visibility__preset-item:focus-visible {
    outline: none;
    border-color: var(--color-border-subtle);
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__preset-item--active {
    border-color: var(--color-border-accent);
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__preset-item span {
    font-weight: 700;
  }

  .app-shell-panel-visibility__preset-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-5);
    min-width: 0;
  }

  :global(.app-shell-panel-visibility__preset-icon) {
    width: 1rem;
    height: 1rem;
  }

  .app-shell-panel-visibility__preset-item small {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
  }

  .app-shell-panel-visibility__preset-separator {
    height: 1px;
    margin: var(--space-2) 0;
    background: var(--color-border-subtle);
  }

  .app-shell-panel-visibility__preset-item--snapshot {
    color: var(--color-text-primary);
  }
</style>
