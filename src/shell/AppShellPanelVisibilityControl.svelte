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
    editable?: boolean;
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
  export let onEditPreset: (presetId: string) => void = () => undefined;
  export let onDeletePreset: (presetId: string) => void = () => undefined;
  export let onSharePreset: (presetId: string) => void = () => undefined;
  export let onShareCurrentPreset: (() => void) | null = null;
  export let onReorderPresets: (orderedPresetIds: readonly string[]) => void = () => undefined;
  export let onLoadNativeFixture: (() => void) | null = null;
  export let onReturnToDashboard: (() => void) | null = null;
  export let onImportWorkspacePreset: (() => void) | null = null;
  export let onConfigureExperienceTools: (() => void) | null = null;
  export let createSnapshot: (() => unknown) | null = null;

  const i18nT = getWorkbenchTranslator();
  let isPresetMenuOpen = false;
  let presetAnchorElement: HTMLDivElement | null = null;
  let presetMenuLayoutEpoch = 0;
  let presetContextMenu: { presetId: string; x: number; y: number; confirmDelete: boolean } | null = null;
  let draggedPresetId: string | null = null;

  $: hasPanels = panels.length > 0;
  $: hasPresets = presets.length > 0;
  $: hasGlobalNavigation = Boolean(onReturnToDashboard || onImportWorkspacePreset || onConfigureExperienceTools);
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

    if (!hasPresets && !hasGlobalNavigation) {
      return;
    }

    isPresetMenuOpen = !isPresetMenuOpen;
    presetMenuLayoutEpoch += 1;
  }

  function selectPreset(presetId: string): void {
    isPresetMenuOpen = false;
    onSelectPreset(presetId);
  }

  function openPresetContextMenu(event: MouseEvent, preset: AppShellWorkspacePresetEntry): void {
    if (!preset.editable) return;
    event.preventDefault();
    event.stopPropagation();
    presetContextMenu = {
      presetId: preset.id,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 190)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 220)),
      confirmDelete: false
    };
  }

  function closePresetMenus(): void {
    presetContextMenu = null;
    isPresetMenuOpen = false;
  }

  function invokePresetAction(action: 'edit' | 'share' | 'delete'): void {
    if (!presetContextMenu) return;
    const presetId = presetContextMenu.presetId;
    if (action === 'delete' && !presetContextMenu.confirmDelete) {
      presetContextMenu = { ...presetContextMenu, confirmDelete: true };
      return;
    }
    closePresetMenus();
    if (action === 'edit') onEditPreset(presetId);
    else if (action === 'share') onSharePreset(presetId);
    else onDeletePreset(presetId);
  }

  function moveEditablePreset(presetId: string, direction: -1 | 1): void {
    const ids = presets.filter((preset) => preset.editable).map((preset) => preset.id);
    const index = ids.indexOf(presetId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    onReorderPresets(ids);
    presetContextMenu = presetContextMenu ? { ...presetContextMenu, confirmDelete: false } : null;
  }

  function startPresetDrag(event: DragEvent, preset: AppShellWorkspacePresetEntry): void {
    if (!preset.editable) return;
    draggedPresetId = preset.id;
    event.dataTransfer?.setData('text/plain', preset.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function dropPreset(event: DragEvent, target: AppShellWorkspacePresetEntry): void {
    const sourceId = draggedPresetId ?? event.dataTransfer?.getData('text/plain') ?? '';
    draggedPresetId = null;
    if (!target.editable || !sourceId || sourceId === target.id) return;
    const ids = presets.filter((preset) => preset.editable).map((preset) => preset.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(target.id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    ids.splice(sourceIndex, 1);
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const insertAfter = event.clientY > targetRect.top + targetRect.height / 2;
    const adjustedTargetIndex = ids.indexOf(target.id) + (insertAfter ? 1 : 0);
    ids.splice(adjustedTargetIndex, 0, sourceId);
    onReorderPresets(ids);
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

  function shareCurrentPreset(): void {
    isPresetMenuOpen = false;
    onShareCurrentPreset?.();
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
    presetContextMenu = null;
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
        disabled={!hasPresets && !hasGlobalNavigation}
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
          {#if hasGlobalNavigation}
            <p class="app-shell-panel-visibility__preset-heading">
              {$i18nT('ui.shell.toolbar.workspacePresets.navigation.heading', { default: 'Navigation' })}
            </p>
            <div class="app-shell-panel-visibility__preset-action-row">
              {#if onReturnToDashboard}
                <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.dashboard.copy', { default: 'Choose an experience or preset' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onReturnToDashboard?.(); }}>
                  <WorkbenchIcon icon="action.previous-key" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.dashboard.short', { default: 'Dashboard' })}</span>
                </button>
              {/if}
              {#if onConfigureExperienceTools}
                <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.tools.copy', { default: 'Select available tools and assign them to panels' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onConfigureExperienceTools?.(); }}>
                  <WorkbenchIcon icon="tool.wrench" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.tools.short', { default: 'Tools' })}</span>
                </button>
              {/if}
              {#if onImportWorkspacePreset}
                <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.import.copy', { default: 'Validate a JSON or PNG shared definition' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onImportWorkspacePreset?.(); }}>
                  <WorkbenchIcon icon="action.folder" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.import.short', { default: 'Import' })}</span>
                </button>
              {/if}
            </div>
            <span class="app-shell-panel-visibility__preset-separator" aria-hidden="true"></span>
          {/if}
          <p class="app-shell-panel-visibility__preset-heading">
            {$i18nT('ui.shell.toolbar.workspacePresets.heading', { default: 'Presets' })}
          </p>
          {#each presets as preset (preset.id)}
            <button
              type="button"
              class:app-shell-panel-visibility__preset-item--active={preset.id === activePresetId}
              class:app-shell-panel-visibility__preset-item--editable={preset.editable}
              class:app-shell-panel-visibility__preset-item--dragging={preset.id === draggedPresetId}
              class="app-shell-panel-visibility__preset-item"
              role="menuitem"
              draggable={preset.editable ? 'true' : undefined}
              aria-current={preset.id === activePresetId ? 'true' : undefined}
              title={localizePresetDescription(preset, $i18nT) ?? localizePresetLabel(preset, $i18nT)}
              on:click={() => selectPreset(preset.id)}
              on:contextmenu={(event) => openPresetContextMenu(event, preset)}
              on:dragstart={(event) => startPresetDrag(event, preset)}
              on:dragend={() => (draggedPresetId = null)}
              on:dragover|preventDefault
              on:drop|preventDefault={(event) => dropPreset(event, preset)}
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
              {#if preset.editable}
                <span class="app-shell-panel-visibility__preset-user-hint">Drag · right-click to manage</span>
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
          <div class="app-shell-panel-visibility__preset-action-row app-shell-panel-visibility__preset-action-row--footer">
            <button
              type="button"
              class="app-shell-panel-visibility__preset-action"
              role="menuitem"
              disabled={!canResetActivePreset}
              title={$i18nT('ui.shell.toolbar.workspacePresets.reset.title', { default: 'Reset the active preset layout' })}
              on:click|stopPropagation={resetPreset}
            >
              <WorkbenchIcon icon="action.reset" label="" />
              <span>{$i18nT('ui.shell.toolbar.workspacePresets.reset.short', { default: 'Reset' })}</span>
            </button>
            <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.createSnapshot.copy', { default: 'Name and version this workspace projection' })} on:click|stopPropagation={createPresetSnapshotSeed}>
              <WorkbenchIcon icon="action.add" label="" />
              <span>{$i18nT('ui.shell.toolbar.workspacePresets.createSnapshot.short', { default: 'Save' })}</span>
            </button>
            {#if onShareCurrentPreset}
              <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.shareCurrent.title', { default: 'Generate a portable image of the current workspace preset' })} on:click|stopPropagation={shareCurrentPreset}>
                <WorkbenchIcon icon="action.detach" label="" />
                <span>{$i18nT('ui.shell.toolbar.workspacePresets.shareCurrent.short', { default: 'Share' })}</span>
              </button>
            {/if}
            <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={`${$i18nT('ui.shell.toolbar.workspacePresets.snapshot.title', { default: 'Copy current preset snapshot' })} · ${layoutButtonLabel}`} on:click|stopPropagation={copyPresetSnapshot}>
              <WorkbenchIcon icon="action.command" label="" />
              <span>{$i18nT('ui.shell.toolbar.workspacePresets.snapshot.short', { default: 'Snapshot' })}</span>
            </button>
          </div>
        </div>
      {/if}
    </div>

    {#if presetContextMenu}
      <div
        use:portal
        class="app-shell-panel-visibility__preset-context"
        role="menu"
        aria-label="Saved preset actions"
        style={`left:${presetContextMenu.x}px;top:${presetContextMenu.y}px;`}
        on:pointerdown|stopPropagation
      >
        <button type="button" role="menuitem" on:click={() => invokePresetAction('edit')}>Edit preset…</button>
        <button type="button" role="menuitem" on:click={() => invokePresetAction('share')}>Share definition…</button>
        <span aria-hidden="true"></span>
        <button
          type="button"
          role="menuitem"
          disabled={presets.filter((preset) => preset.editable).findIndex((preset) => preset.id === presetContextMenu?.presetId) <= 0}
          on:click={() => presetContextMenu && moveEditablePreset(presetContextMenu.presetId, -1)}
        >Move up</button>
        <button
          type="button"
          role="menuitem"
          disabled={presets.filter((preset) => preset.editable).findIndex((preset) => preset.id === presetContextMenu?.presetId) >= presets.filter((preset) => preset.editable).length - 1}
          on:click={() => presetContextMenu && moveEditablePreset(presetContextMenu.presetId, 1)}
        >Move down</button>
        <span aria-hidden="true"></span>
        <button
          type="button"
          role="menuitem"
          class="app-shell-panel-visibility__preset-context-delete"
          on:click={() => invokePresetAction('delete')}
        >{presetContextMenu.confirmDelete ? 'Confirm delete' : 'Delete preset…'}</button>
      </div>
    {/if}

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
    width: min(25rem, calc(100vw - 1rem));
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

  .app-shell-panel-visibility__preset-action-row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }

  .app-shell-panel-visibility__preset-action {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    padding: var(--space-6) var(--space-5);
    background: var(--color-background-base);
    color: var(--color-text-secondary);
    cursor: pointer;
    font: inherit;
    font-size: var(--font-size-label);
    font-weight: 700;
    white-space: nowrap;
  }

  .app-shell-panel-visibility__preset-action:hover:not(:disabled),
  .app-shell-panel-visibility__preset-action:focus-visible {
    outline: none;
    border-color: var(--color-border-accent);
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__preset-action:disabled { opacity: 0.38; cursor: not-allowed; }
  .app-shell-panel-visibility__preset-action :global(svg) { width: 0.9rem; height: 0.9rem; flex: 0 0 auto; }

  .app-shell-panel-visibility__preset-item--active {
    border-color: var(--color-border-accent);
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__preset-item--editable {
    cursor: grab;
  }

  .app-shell-panel-visibility__preset-item--editable:active {
    cursor: grabbing;
  }

  .app-shell-panel-visibility__preset-item--dragging {
    opacity: 0.48;
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

  .app-shell-panel-visibility__preset-item .app-shell-panel-visibility__preset-user-hint {
    color: var(--color-text-muted);
    font-size: calc(var(--font-size-label) * 0.88);
    font-weight: 500;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .app-shell-panel-visibility__preset-item:hover .app-shell-panel-visibility__preset-user-hint,
  .app-shell-panel-visibility__preset-item:focus-visible .app-shell-panel-visibility__preset-user-hint {
    opacity: 0.8;
  }

  .app-shell-panel-visibility__preset-context {
    position: fixed;
    z-index: 2147483100;
    display: grid;
    min-width: 11.5rem;
    overflow: hidden;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-medium);
    padding: var(--space-4);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
  }

  .app-shell-panel-visibility__preset-context button {
    border: 0;
    border-radius: calc(var(--radius-medium) - var(--space-2));
    padding: var(--space-6) var(--space-8);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font: inherit;
    font-size: var(--font-size-label);
    text-align: left;
  }

  .app-shell-panel-visibility__preset-context button:hover:not(:disabled),
  .app-shell-panel-visibility__preset-context button:focus-visible {
    outline: none;
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell-panel-visibility__preset-context button:disabled {
    opacity: 0.38;
  }

  .app-shell-panel-visibility__preset-context > span {
    height: 1px;
    margin: var(--space-3) var(--space-4);
    background: var(--color-border-subtle);
  }

  .app-shell-panel-visibility__preset-context .app-shell-panel-visibility__preset-context-delete {
    color: var(--color-status-danger, #ff918b);
  }

  .app-shell-panel-visibility__preset-separator {
    height: 1px;
    margin: var(--space-2) 0;
    background: var(--color-border-subtle);
  }

</style>
