<script context="module" lang="ts">
  export type AppShellViewEntry = {
    id: string;
    label: string;
  };
</script>

<script lang="ts">
  import type { ShellRegionId, ShellState } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import IconButton from '../primitives/IconButton.svelte';
  import AppShellPanelVisibilityControl, {
    type AppShellPanelVisibilityEntry,
    type AppShellWorkspacePresetEntry
  } from './AppShellPanelVisibilityControl.svelte';

  export let shellViews: readonly AppShellViewEntry[];
  export let activeShellViewId: string;
  export let panelVisibilityEntries: readonly AppShellPanelVisibilityEntry[] = [];
  export let workspacePresetEntries: readonly AppShellWorkspacePresetEntry[] = [];
  export let activeWorkspacePresetId = '';
  export let activeWorkspacePresetLabel = '';
  export let createWorkspacePresetSnapshot: (() => unknown) | null = null;
  export let shellState: ShellState;
  export let shellFeedback: { tone: 'info' | 'error'; message: string } | null = null;
  export let hasActiveWindow = false;
  export let isPaletteOpen = false;
  export let isExperienceManagerOpen = false;
  export let isLayoutEditingEnabled = false;
  export let canToggleLeftRegion = false;
  export let canToggleBottomRegion = false;
  export let canToggleRightRegion = false;
  export let showLayoutHistoryHint = true;
  export let canUndoAppHistory = false;
  export let canRedoAppHistory = false;
  export let isCoreSideMenuOpen = false;
  export let showCoreSideMenuToggle = true;
  export let brandEyebrow = 'Workbench';
  export let brandProjectType = '';
  export let brandProjectLabel = '';
  export let brandFaviconUrl: string | null = null;
  export let onSelectShellView: (viewId: string) => void;
  export let onToggleLayoutEditing: () => void = () => {};
  export let onToggleWorkspacePanelVisibility: (panelId: string) => void = () => {};
  export let onSelectWorkspacePreset: (presetId: string) => void = () => {};
  export let onResetWorkspacePreset: (presetId: string) => void = () => {};
  export let onCreateWorkspacePresetSnapshot: () => void = () => {};
  export let onEditWorkspacePreset: (presetId: string) => void = () => {};
  export let onDeleteWorkspacePreset: (presetId: string) => void = () => {};
  export let onShareWorkspacePreset: (presetId: string) => void = () => {};
  export let onReorderWorkspacePresets: (presetIds: readonly string[]) => void = () => {};
  export let onLoadNativeFixture: (() => void) | null = null;
  export let onReturnToDashboard: (() => void) | null = null;
  export let onImportWorkspacePreset: (() => void) | null = null;
  export let onConfigureExperienceTools: (() => void) | null = null;
  export let onToggleCoreSideMenu: () => void = () => {};
  export let onTogglePalette: () => void;
  export let onToggleShellRegion: (regionId: ShellRegionId) => void;
  export let onUndoAppHistory: () => void;
  export let onRedoAppHistory: () => void;

  const i18nT = getWorkbenchTranslator();
  $: formattedBrandProjectLabel = formatProjectLabel(brandProjectLabel);
  $: consumeLegacyShellViewContract(shellViews, activeShellViewId, onSelectShellView);

  function formatProjectLabel(label: string): string {
    const trimmedLabel = label.trim();

    return trimmedLabel ? `${trimmedLabel[0].toUpperCase()}${trimmedLabel.slice(1)}` : '';
  }

  function consumeLegacyShellViewContract(
    views: readonly AppShellViewEntry[],
    viewId: string,
    selectView: (viewId: string) => void
  ): void {
    void views;
    void viewId;
    void selectView;
  }
</script>

<header class="app-shell__toolbar">
  <div class="app-shell__toolbar-section app-shell__toolbar-section--left">
    {#if showCoreSideMenuToggle}
      <button
        type="button"
        class:app-shell__brand-mark--active={isCoreSideMenuOpen}
        class="app-shell__brand-mark"
        aria-label={$i18nT('ui.shell.projectMenu.toggle', { default: 'Toggle project menu' })}
        aria-expanded={isCoreSideMenuOpen}
        title={$i18nT('ui.shell.projectMenu.toggle', { default: 'Toggle project menu' })}
        on:click={onToggleCoreSideMenu}
      >
        {#if brandFaviconUrl}
          <img src={brandFaviconUrl} alt="" />
        {:else}
          <span></span>
          <span></span>
          <span></span>
        {/if}
      </button>
    {/if}
    <div class="app-shell__brand-copy">
      <h1 class="app-shell__title">
        {#if brandProjectLabel}
          {#if brandProjectType}
            <span class="app-shell__project-type" title={brandProjectType}>
              <WorkbenchIcon
                icon={{ id: 'app.product-shell', tone: 'product' }}
                label={brandProjectType}
              />
            </span>
          {/if}
          <strong>{formattedBrandProjectLabel}</strong>
        {:else}
          <strong>{$i18nT('ui.shell.brand.title', { default: 'Design System Shell' })}</strong>
        {/if}
      </h1>
      <p class="app-shell__eyebrow">{brandEyebrow}</p>
    </div>
  </div>

  <AppShellPanelVisibilityControl
    panels={panelVisibilityEntries}
    presets={workspacePresetEntries}
    activePresetId={activeWorkspacePresetId}
    activePresetLabel={activeWorkspacePresetLabel}
    createSnapshot={createWorkspacePresetSnapshot}
    {isLayoutEditingEnabled}
    {onToggleLayoutEditing}
    onTogglePanel={onToggleWorkspacePanelVisibility}
    onSelectPreset={onSelectWorkspacePreset}
    onResetPreset={onResetWorkspacePreset}
    onCreatePresetSnapshot={onCreateWorkspacePresetSnapshot}
    onEditPreset={onEditWorkspacePreset}
    onDeletePreset={onDeleteWorkspacePreset}
    onSharePreset={onShareWorkspacePreset}
    onReorderPresets={onReorderWorkspacePresets}
    {onLoadNativeFixture}
    {onReturnToDashboard}
    {onImportWorkspacePreset}
    {onConfigureExperienceTools}
  />

  <div class="app-shell__toolbar-section app-shell__toolbar-section--right">
    <slot name="application-status" />

    {#if hasActiveWindow}
      {#if shellFeedback}
        <div
          class:app-shell__feedback--error={shellFeedback.tone === 'error'}
          class="app-shell__feedback"
          role="status"
        >
          {shellFeedback.message}
        </div>
      {/if}

      <div
        class="app-shell__toolbar-toggle-group"
        aria-label={$i18nT('ui.shell.toolbar.panelHistory.ariaLabel', { default: 'Panel history' })}
        title={$i18nT('ui.shell.toolbar.panelHistory.title', {
          default: 'Panels history. Undo: Ctrl + Z. Redo: Ctrl + Y.'
        })}
      >
        <IconButton
          label={$i18nT('ui.shell.toolbar.undoPanelHistory.label', { default: 'Undo panel history' })}
          title={$i18nT('ui.shell.toolbar.undoPanelHistory.title', { default: 'Undo panel history (Ctrl + Z)' })}
          variant="ghost"
          disabled={!canUndoAppHistory}
          icon="action.undo"
          on:click={onUndoAppHistory}
        />

        <IconButton
          label={$i18nT('ui.shell.toolbar.redoPanelHistory.label', { default: 'Redo panel history' })}
          title={$i18nT('ui.shell.toolbar.redoPanelHistory.title', { default: 'Redo panel history (Ctrl + Y)' })}
          variant="ghost"
          disabled={!canRedoAppHistory}
          icon="action.redo"
          on:click={onRedoAppHistory}
        />
      </div>

      {#if showLayoutHistoryHint}
        <div
          class="app-shell__toolbar-history-hint"
          aria-label={$i18nT('ui.shell.toolbar.layoutHistory.ariaLabel', { default: 'Layout history shortcuts' })}
          title={$i18nT('ui.shell.toolbar.layoutHistory.title', {
            default: 'Layout history. Undo: Ctrl + Alt + Z. Redo: Ctrl + Alt + Y.'
          })}
        ></div>
      {/if}

      {#if onConfigureExperienceTools}
        <div
          class="app-shell__toolbar-toggle-group"
          aria-label={$i18nT('ui.shell.toolbar.experienceManager.ariaLabel', { default: 'Tools, widgets and connectors' })}
        >
          <IconButton
            label={$i18nT('ui.shell.toolbar.experienceManager.toggle', { default: 'Manage tools, widgets and connectors' })}
            title={$i18nT('ui.shell.toolbar.experienceManager.toggle', { default: 'Manage tools, widgets and connectors' })}
            variant={isExperienceManagerOpen ? 'active' : 'ghost'}
            icon="tool.wrench"
            on:click={onConfigureExperienceTools}
          />
        </div>
      {/if}

      <div class="app-shell__toolbar-toggle-group" aria-label={$i18nT('ui.shell.toolbar.commandPalette.ariaLabel', { default: 'Command palette' })}>
        <IconButton
          label={$i18nT('ui.shell.toolbar.commandPalette.toggle', { default: 'Toggle command palette' })}
          title={$i18nT('ui.shell.toolbar.commandPalette.toggle', { default: 'Toggle command palette' })}
          variant={isPaletteOpen ? 'active' : 'ghost'}
          icon="action.command-palette"
          on:click={onTogglePalette}
        />
      </div>

      <div class="app-shell__toolbar-toggle-group" aria-label={$i18nT('ui.shell.toolbar.shellRegions.ariaLabel', { default: 'Shell regions' })}>
        <IconButton
          label={$i18nT('ui.shell.toolbar.leftSidebar.toggle', { default: 'Toggle left sidebar' })}
          title={canToggleLeftRegion
            ? $i18nT('ui.shell.toolbar.leftSidebar.toggle', { default: 'Toggle left sidebar' })
            : $i18nT('ui.shell.toolbar.leftSidebar.unavailable', { default: 'No widget connected to the left sidebar' })}
          variant={shellState.regions.left.isVisible ? 'active' : 'ghost'}
          disabled={!canToggleLeftRegion}
          icon="layout.sidebar-left"
          on:click={() => onToggleShellRegion('left')}
        />

        <IconButton
          label={$i18nT('ui.shell.toolbar.bottomPanel.toggle', { default: 'Toggle bottom panel' })}
          title={canToggleBottomRegion
            ? $i18nT('ui.shell.toolbar.bottomPanel.toggle', { default: 'Toggle bottom panel' })
            : $i18nT('ui.shell.toolbar.bottomPanel.unavailable', { default: 'No widget connected to the bottom panel' })}
          variant={shellState.regions.bottom.isVisible ? 'active' : 'ghost'}
          disabled={!canToggleBottomRegion}
          icon="layout.panel-bottom"
          on:click={() => onToggleShellRegion('bottom')}
        />

        <IconButton
          label={$i18nT('ui.shell.toolbar.rightSidebar.toggle', { default: 'Toggle right sidebar' })}
          title={canToggleRightRegion
            ? $i18nT('ui.shell.toolbar.rightSidebar.toggle', { default: 'Toggle right sidebar' })
            : $i18nT('ui.shell.toolbar.rightSidebar.unavailable', { default: 'No widget connected to the right sidebar' })}
          variant={shellState.regions.right.isVisible ? 'active' : 'ghost'}
          disabled={!canToggleRightRegion}
          icon="layout.sidebar-right"
          on:click={() => onToggleShellRegion('right')}
        />
      </div>
    {/if}
  </div>
</header>

<style>
  .app-shell__toolbar {
    --app-shell-toolbar-control-height: calc(var(--size-icon-button) + var(--space-6));

    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-12);
    min-height: calc(var(--size-toolbar-height) - var(--space-8));
    padding: var(--space-6) var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: 0;
    background: var(--color-background-surface);
  }

  .app-shell__toolbar-section {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: var(--space-8);
  }

  .app-shell__toolbar-section--left {
    justify-self: start;
  }

  .app-shell__toolbar-section--right {
    justify-self: end;
  }

  .app-shell__brand-mark {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-2);
    width: 1.5rem;
    height: 1.5rem;
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: linear-gradient(180deg, var(--color-background-accent), var(--color-background-muted));
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .app-shell__brand-mark:hover,
  .app-shell__brand-mark:focus-visible,
  .app-shell__brand-mark--active {
    border-color: var(--color-border-accent);
    background: var(--color-background-accent);
    color: var(--color-text-primary);
  }

  .app-shell__brand-mark span {
    display: block;
    width: 100%;
    height: 1px;
    border-radius: 999px;
    background: var(--color-text-secondary);
  }

  .app-shell__brand-mark img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: calc(var(--radius-small) - 2px);
    object-fit: contain;
  }

  .app-shell__brand-copy {
    display: inline-flex;
    align-items: baseline;
    min-width: 0;
    gap: var(--space-8);
  }

  .app-shell__eyebrow {
    margin: 0;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6875rem;
    white-space: nowrap;
  }

  .app-shell__title {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-7);
    min-width: 0;
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .app-shell__project-type {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.95rem;
    height: 0.95rem;
    color: var(--workbench-icon-color-product);
    font-size: 0.95rem;
    line-height: 1;
    transform: translateY(0.08em);
  }

  .app-shell__title strong {
    overflow: hidden;
    max-width: min(18rem, 42vw);
    color: var(--color-text-primary);
    text-overflow: ellipsis;
    font: inherit;
    font-weight: 900;
  }

  .app-shell__toolbar-toggle-group {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    height: var(--app-shell-toolbar-control-height);
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
  }

  .app-shell__toolbar-history-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1;
    white-space: nowrap;
  }

  .app-shell__feedback {
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    color: var(--color-text-secondary);
    background: var(--color-background-muted);
    font-size: var(--font-size-label);
  }

  .app-shell__feedback--error {
    border-color: var(--color-border-danger);
    color: var(--color-text-danger);
    background: var(--color-background-danger);
  }

  @media (max-width: 960px) {
    .app-shell__toolbar {
      grid-template-columns: minmax(0, 1fr);
      justify-items: stretch;
    }

    .app-shell__toolbar-section--left,
    .app-shell__toolbar-section--right {
      justify-self: stretch;
    }

    .app-shell__toolbar-section--right {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    :global(.app-shell__view-nav) {
      justify-self: stretch;
      overflow-x: auto;
    }
  }
</style>
