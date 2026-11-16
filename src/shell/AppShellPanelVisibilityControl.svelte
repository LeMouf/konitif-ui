<script context="module" lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';

  export type AppShellExperienceScreenActions = {
    activeId: string;
    entries: readonly {id:string; label?:string; labelKey?:string; number?:number}[];
    select: (id:string)=>void;
    add: (name:string)=>void;
    rename?: (id:string,name:string)=>void;
    remove?: (id:string)=>void;
    href: (id:string)=>string;
    onOpenTab?: (id:string)=>void;
  };

  export type AppShellExperienceMenuActions = {screens?:AppShellExperienceScreenActions;activeName?:string;activeVersion?:string;availableVersion?:string;revisionError?:string;revisionBusy?:boolean;hasUnsavedChanges?:boolean;saveBusy?:boolean;onInspectRevision?:()=>void;onUpdateRevision?:()=>void;onReloadRevision?:()=>void;onInspectCapabilities?:()=>void;capabilitiesOpen?:boolean;activeTags?:readonly string[];onSetTags?:((tags:string[])=>void|Promise<void>);saveKind?:'experience'|'layout';saveDisabled?:boolean;error?:string;onOpen:()=>void;onSave:()=>void;onSaveAs:()=>void};

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
  import ExperienceRevisionBadge from './ExperienceRevisionBadge.svelte';
  import { onDestroy,tick } from 'svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';
  import { mountWorkbenchPortalNode } from '../portal/workbenchPortalRoot';

  let screenPicker:HTMLDetailsElement;
  let screenPopupElement:HTMLDivElement;
  let screenNameInput:HTMLInputElement;
  let screenPopup:{mode:'context'|'create'|'rename';id:string;top:number;left:number}|undefined;
  let screenName='';
  function closeScreenPicker(event:PointerEvent) {
    if(!(event.target instanceof Node)||screenPopupElement?.contains(event.target))return;
    if(screenPicker?.contains(event.target))return;
    screenPopup=undefined;
    if(screenPicker?.open)screenPicker.open=false;
  }
  function openScreenPopup(event:MouseEvent,mode:'context'|'create',id='',label='') {
    const bounds=(event.currentTarget as HTMLElement).getBoundingClientRect();
    screenName=label;
    screenPopup={mode,id,top:Math.min(window.innerHeight-125,mode==='context'?bounds.top:bounds.bottom+4),
      left:Math.max(4,Math.min(window.innerWidth-205,mode==='context'?bounds.right+3:bounds.left))};
    if(mode==='create')void tick().then(()=>screenNameInput?.focus());
  }
  function renameFromPopup(){
    if(!screenPopup)return;
    screenPopup={...screenPopup,mode:'rename'};
    void tick().then(()=>{screenNameInput?.focus();screenNameInput?.select();});
  }
  function submitScreenName(screens:AppShellExperienceScreenActions) {
    const name=screenName.trim();
    if(!screenPopup||!name)return;
    if(screenPopup.mode==='create')screens.add(name);
    else screens.rename?.(screenPopup.id,name);
    screenPopup=undefined;
    if(screenPicker)screenPicker.open=false;
  }

  export let fullscreenPanelId: string | null = null;
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
  export let experienceMenuActions:AppShellExperienceMenuActions|null=null;
  export let showWorkspacePresetActions=true;
  export let onShareExperience: (()=>void)|null=null;
  export let onImportExperience: (()=>void)|null=null;
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
  $: hasGlobalNavigation = Boolean(experienceMenuActions || onReturnToDashboard || (showWorkspacePresetActions && onImportWorkspacePreset) || onConfigureExperienceTools || onShareExperience || onImportExperience);
  $: canResetActivePreset = presets.some((preset) => preset.id === activePresetId);
  $: layoutButtonLabel = experienceMenuActions?.activeName || activePresetLabel || $i18nT('ui.shell.footer.layout', { default: 'Layout' });
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

<svelte:window on:pointerdown|capture={closeScreenPicker} on:keydown={event=>{if(event.key==='Escape'&&screenPopup)screenPopup=undefined;}} />
<div
  class="app-shell-panel-visibility"
  class:app-shell-panel-visibility--screens={!!experienceMenuActions?.screens}
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
    </button>

    <div class="app-shell-panel-visibility__preset-anchor" bind:this={presetAnchorElement}>
      {#if experienceMenuActions}
        <button type="button" class="experience-trigger experience-name-trigger"
          aria-label={$i18nT('ui.shell.experienceMenu.open',{default:'Experiences'})}
          on:click={()=>{isPresetMenuOpen=false;experienceMenuActions?.onOpen();}}>
          <span class="app-shell-panel-visibility__experience-label" title={layoutButtonLabel}>{layoutButtonLabel}</span>
        </button>
        {#if experienceMenuActions.activeVersion}<ExperienceRevisionBadge version={experienceMenuActions.activeVersion} availableVersion={experienceMenuActions.availableVersion??''} error={experienceMenuActions.revisionError??''} busy={experienceMenuActions.revisionBusy??false} onUpdate={()=>experienceMenuActions?.onUpdateRevision?.()} onReload={experienceMenuActions.onReloadRevision} dirty={experienceMenuActions.hasUnsavedChanges??false} saving={experienceMenuActions.saveBusy??false} saveError={experienceMenuActions.error??''} onInspect={()=>experienceMenuActions?.onInspectRevision?.()} onSave={experienceMenuActions.saveKind==='experience'?()=>experienceMenuActions?.onSave():undefined}/>{/if}
      {/if}
      {#if experienceMenuActions?.onInspectCapabilities}<button type="button" aria-label="Capacités partagées d’expérience" title="Capacités partagées" aria-haspopup="dialog" aria-expanded={experienceMenuActions.capabilitiesOpen??false} on:click={()=>experienceMenuActions?.onInspectCapabilities?.()}><WorkbenchIcon icon="widget.inspector" label=""/></button>{/if}
      {#if !experienceMenuActions}
      <button type="button" class="experience-trigger" class:experience-trigger--active={isPresetMenuOpen}
        aria-label={showWorkspacePresetActions?$i18nT('ui.shell.toolbar.workspacePresets.label',{default:'Workbench presets'}):$i18nT('ui.shell.experienceMenu.label',{default:'Experience actions'})}
        aria-haspopup="menu" aria-expanded={isPresetMenuOpen}
        disabled={(!showWorkspacePresetActions||!hasPresets)&&!hasGlobalNavigation}
        on:click={togglePresetMenu}>
        {#if !experienceMenuActions}<span class="app-shell-panel-visibility__experience-label" title={layoutButtonLabel}>{layoutButtonLabel}</span>{/if}
        <WorkbenchIcon icon="action.more-horizontal" label=""/>
      </button>

      {/if}
      {#if isPresetMenuOpen}
        <div
          use:portal
          class="app-shell-panel-visibility__preset-menu"
          role="menu" tabindex="-1"
          style={presetMenuStyle}
          on:pointerdown|stopPropagation
        >
          {#if hasGlobalNavigation}
            <p class="app-shell-panel-visibility__preset-heading">
              {$i18nT('ui.shell.toolbar.workspacePresets.navigation.heading', { default: 'Navigation' })}
            </p>
            <div class="app-shell-panel-visibility__preset-action-row" class:app-shell-panel-visibility__preset-action-row--experience={Boolean(experienceMenuActions)}>
              {#if experienceMenuActions}<div class="experience-current-entry"><button type="button" class="experience-open" role="menuitem" on:click|stopPropagation={()=>{isPresetMenuOpen=false;experienceMenuActions?.onOpen();}}><WorkbenchIcon icon="layout.workspace" className="experience-menu-large-icon" label=""/><span><strong>{$i18nT('ui.shell.experienceMenu.open',{default:'Experiences'})}</strong>{#if experienceMenuActions.activeName}<small><span class="experience-current-name">{experienceMenuActions.activeName}</span>{#if experienceMenuActions.activeVersion}<span class="experience-current-version">{experienceMenuActions.activeVersion}</span>{/if}</small>{/if}</span></button><div class="experience-save-controls"><button type="button" role="menuitem" aria-label={experienceMenuActions.saveKind==='experience'?$i18nT('ui.shell.experienceMenu.saveRevision',{default:'Save experience revision'}):$i18nT('ui.shell.experienceMenu.save',{default:'Save layout'})} title={experienceMenuActions.saveKind==='experience'?$i18nT('ui.shell.experienceMenu.saveRevision',{default:'Save experience revision'}):$i18nT('ui.shell.experienceMenu.save',{default:'Save layout'})} disabled={experienceMenuActions.saveDisabled} on:click|stopPropagation={()=>experienceMenuActions?.onSave()}><WorkbenchIcon icon="action.save" label=""/></button><details class="experience-save-options"><summary on:click|stopPropagation role="menuitem" aria-label={$i18nT('ui.shell.experienceMenu.saveOptions',{default:'Save options'})} title={$i18nT('ui.shell.experienceMenu.saveOptions',{default:'Save options'})}><WorkbenchIcon icon="action.chevron-down" label=""/></summary><div class="experience-save-menu"><button type="button" role="menuitem" on:click={()=>{isPresetMenuOpen=false;experienceMenuActions?.onSaveAs();}}><WorkbenchIcon icon="action.save" label=""/><span>{$i18nT('ui.shell.experienceMenu.saveAs',{default:'Save layout as…'})}</span></button></div></details></div></div>{#if experienceMenuActions.error}<p role="alert">{experienceMenuActions.error}</p>{/if}<span class="app-shell-panel-visibility__preset-separator" aria-hidden="true"></span>{/if}
              {#if onReturnToDashboard}
                <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.dashboard.copy', { default: 'Choose an experience or preset' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onReturnToDashboard?.(); }}>
                  <WorkbenchIcon icon="action.previous-key" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.dashboard.short', { default: 'Dashboard' })}</span>
                </button>
              {/if}
              {#if onConfigureExperienceTools}
                <button type="button" class="app-shell-panel-visibility__preset-action experience-menu-entry" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.tools.copy', { default: 'Select available tools and assign them to panels' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onConfigureExperienceTools?.(); }}>
                  <WorkbenchIcon icon="tool.wrench" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.tools.short', { default: 'Tools' })}</span>
                </button>
              {/if}
              {#if onShareExperience}<button type="button" class="app-shell-panel-visibility__preset-item experience-menu-entry" role="menuitem" on:click|stopPropagation={()=>{isPresetMenuOpen=false;onShareExperience?.();}}><WorkbenchIcon icon="action.detach" label=""/><span>{$i18nT('ui.shell.experienceShare.title',{default:'Share experience'})}</span></button>{/if}
            {#if onImportExperience}<button type="button" class="app-shell-panel-visibility__preset-item experience-menu-entry" role="menuitem" on:click|stopPropagation={()=>{isPresetMenuOpen=false;onImportExperience?.();}}><WorkbenchIcon icon="action.folder" label=""/><span>{$i18nT('ui.shell.experienceShare.import',{default:'Import an experience card…'})}</span></button>{/if}
            {#if showWorkspacePresetActions && onImportWorkspacePreset}
                <button type="button" class="app-shell-panel-visibility__preset-action" role="menuitem" title={$i18nT('ui.shell.toolbar.workspacePresets.navigation.import.copy', { default: 'Validate a JSON or PNG shared definition' })} on:click|stopPropagation={() => { isPresetMenuOpen = false; onImportWorkspacePreset?.(); }}>
                  <WorkbenchIcon icon="action.folder" label="" />
                  <span>{$i18nT('ui.shell.toolbar.workspacePresets.navigation.import.short', { default: 'Import' })}</span>
                </button>
              {/if}
            </div>
            {#if showWorkspacePresetActions}<span class="app-shell-panel-visibility__preset-separator" aria-hidden="true"></span>{/if}
          {/if}
          {#if showWorkspacePresetActions}<p class="app-shell-panel-visibility__preset-heading">
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
          </div>{/if}
        </div>
      {/if}
    </div>

    {#if showWorkspacePresetActions && presetContextMenu}
      <div
        use:portal
        class="app-shell-panel-visibility__preset-context"
        role="menu" tabindex="-1"
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


    {#if experienceMenuActions?.screens}
      {@const screens = experienceMenuActions.screens}
      <details class="screen-picker" bind:this={screenPicker}>
        <summary aria-label={$i18nT('ui.shell.screens.label',{default:'Experience screens'})}>
          {#each screens.entries.filter(entry=>entry.id===screens.activeId) as entry (entry.id)}
            {entry.labelKey?$i18nT(entry.labelKey,{default:entry.label}):entry.label??$i18nT('ui.shell.screens.number',{default:'Screen {{number}}',values:{number:entry.number??1}})}
          {/each}
        </summary>
        <div class="screen-picker-list">
          {#each screens.entries as entry (entry.id)}
            <button type="button" aria-current={entry.id===screens.activeId?'true':undefined}
              on:contextmenu|preventDefault={event=>openScreenPopup(event,'context',entry.id,
               entry.labelKey?$i18nT(entry.labelKey,{default:entry.label}):entry.label??$i18nT('ui.shell.screens.number',{default:'Screen {{number}}',values:{number:entry.number??1}}))}
              on:click={event=>{screenPopup=undefined;event.currentTarget.closest('details')?.removeAttribute('open');screens.select(entry.id);}}>
              {entry.labelKey?$i18nT(entry.labelKey,{default:entry.label}):entry.label??$i18nT('ui.shell.screens.number',{default:'Screen {{number}}',values:{number:entry.number??1}})}
            </button>

          {/each}
        </div>
      </details>
      <button type="button" aria-label={$i18nT('ui.shell.screens.add',{default:'Add a screen'})} title={$i18nT('ui.shell.screens.add',{default:'Add a screen'})} on:click={event=>openScreenPopup(event,'create')}>+</button>
      {#if screenPopup}
       <div class="screen-action-popup" bind:this={screenPopupElement}
        style:left={screenPopup.left+'px'} style:top={screenPopup.top+'px'}>
        {#if screenPopup.mode==='context'}
         {#if screens.rename}<button type="button" on:click={renameFromPopup}>{$i18nT('ui.shell.screens.rename',{default:'Rename screen'})}</button>{/if}
         {#if screens.remove&&screenPopup.id!=='main'}
          <button type="button" on:click={()=>{if(screenPopup)screens.remove?.(screenPopup.id);screenPopup=undefined;}}>{$i18nT('ui.shell.screens.remove',{default:'Remove screen'})}</button>
         {/if}
        {:else}
         <form on:submit|preventDefault={()=>submitScreenName(screens)}>
          <label>{$i18nT('ui.shell.screens.name',{default:'Screen name'})}
           <input maxlength="80" required bind:value={screenName} bind:this={screenNameInput}/>
          </label>
          <button type="submit" disabled={!screenName.trim()}>{$i18nT('ui.shell.screens.confirm',{default:'Confirm'})}</button>
         </form>
        {/if}
       </div>
      {/if}
      <a class="app-shell-panel-visibility__screen-link" href={screens.href(screens.activeId)} on:click={()=>{
        const openedId=screens.activeId;
        setTimeout(()=>screens.onOpenTab?.(openedId),0);
      }} target="_blank" rel="noopener" aria-label={$i18nT('ui.shell.screens.openTab',{default:'Open this screen in a new tab'})} title={$i18nT('ui.shell.screens.openTab',{default:'Open this screen in a new tab'})}>↗</a>
    {/if}
    {#if experienceMenuActions?.screens}<span class="app-shell-panel-visibility__separator" aria-hidden="true"></span>{/if}
    <div class="tool-picker">
      <span class="tool-picker-icon" aria-hidden="true"><WorkbenchIcon icon={panels.find(panel=>panel.id===fullscreenPanelId)?.icon??'layout.workspace'} label=""/></span>
    <select
      class="app-shell-panel-visibility__select"
      aria-label={$i18nT('ui.shell.tools.view',{default:'Tool view'})}
      value={fullscreenPanelId ?? ''}
      disabled={!hasPanels}
      on:change={(event) => {
        const next = event.currentTarget.value;
        if (next !== (fullscreenPanelId ?? '')) onTogglePanel(next || fullscreenPanelId || '');
      }}
    >
      <option value="">{$i18nT('ui.shell.tools.all',{default:'All tools'})}</option>
      {#each panels as panel (panel.id)}
        <option value={panel.id}>{panel.label}</option>
      {/each}
    </select>
    </div>
  </div>
</div>

<style>
 .tool-picker{position:relative;flex:none;inline-size:34px;block-size:32px;overflow:hidden;display:flex;align-items:center;box-sizing:border-box;border:1px solid var(--border-default,#526078);border-radius:6px;background:var(--color-surface-panel,var(--color-surface));transition:inline-size 180ms ease}
 .tool-picker:is(:hover,:focus-within){inline-size:clamp(92px,13vw,180px)}
 .tool-picker-icon{position:absolute;inset-inline-start:8px;display:grid;place-items:center;pointer-events:none}
 .tool-picker-icon :global(svg){width:16px;height:16px}
 .tool-picker .app-shell-panel-visibility__select{width:100%;height:30px;margin:0;border:0;background:transparent;outline-offset:-2px;padding-inline-start:29px}
 .tool-picker:not(:hover):not(:focus-within) .app-shell-panel-visibility__select{appearance:none;color:transparent}
 @media(prefers-reduced-motion:reduce){.tool-picker{transition:none}}

 .screen-action-popup{position:fixed;z-index:30;display:grid;gap:4px;width:190px;padding:6px;border:1px solid var(--color-border-subtle);border-radius:6px;background:var(--color-background-surface,#101a29);box-shadow:0 5px 16px #0005}
 .screen-action-popup form,.screen-action-popup label{display:grid;gap:5px}
 .screen-action-popup input{width:100%;box-sizing:border-box;color:inherit;background:var(--color-background-canvas);border:1px solid var(--color-border-subtle);padding:4px}

  .screen-picker{position:relative;font-size:12px}
  .screen-picker summary{cursor:pointer;padding:6px;color:inherit}
  .screen-picker-list{position:fixed;z-index:20;min-width:9rem;display:grid;gap:3px;padding:5px;border:1px solid var(--color-border-subtle);border-radius:6px;background:var(--color-background-surface,#101a29)}
  .screen-picker-list button{text-align:left;white-space:nowrap}

  .app-shell-panel-visibility--screens .app-shell-panel-visibility__select {
    width: clamp(80px, 10vw, 175px);
  }

  .app-shell-panel-visibility__screen-link { color: inherit; padding: 0 4px; text-decoration: none; }

  .app-shell-panel-visibility__select {
    box-sizing: border-box;
    width: clamp(130px, 20vw, 260px);
    min-width: 0;
    padding: 6px 10px;
    border: 1px solid var(--border-default, #526078);
    border-radius: var(--radius-control, 6px);
    background: var(--color-surface-panel, var(--color-surface));
    color: var(--color-text-primary);
    font: inherit;
  }
  .app-shell-panel-visibility__select:focus-visible {
    outline: 2px solid var(--focus-ring, #79caff);
    outline-offset: 2px;
  }

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

  .app-shell-panel-visibility__button--layout {
    gap: var(--space-5);
    max-width: none;
    flex:0 0 auto;
    width:var(--size-icon-button);
    height:var(--size-icon-button);
    min-height:var(--size-icon-button);
    padding:0;
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

  .app-shell-panel-visibility__experience-label{display:block;min-width:0;max-width:clamp(100px,12vw,200px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--font-size-body);padding-inline:var(--space-4)}
  .app-shell-panel-visibility__preset-anchor {
    flex:0 0 auto;
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

.experience-menu-entry{display:flex;align-items:center;gap:9px}.experience-menu-entry :global(.workbench-icon){flex:none;width:16px;height:16px}
.experience-current-entry{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:10px;border:1px solid var(--color-border-subtle);border-radius:7px;margin:4px 0 10px;padding:6px}.experience-open{flex:1;min-width:0;display:flex;align-items:center;gap:11px;background:transparent;border:0;color:inherit;text-align:left;padding:5px;cursor:pointer}.experience-open>span{display:grid;gap:4px;min-width:0}.experience-open strong{font-size:13px;font-weight:600}.experience-open small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;color:var(--color-text-secondary);font-size:11px}.experience-open :global(.experience-menu-large-icon){font-size:28px;width:28px;height:28px;flex:none}.experience-save-controls{display:flex;align-items:stretch;border:1px solid var(--color-border-subtle);border-radius:5px}.experience-save-controls button,.experience-save-options>summary{font:inherit;display:flex;align-items:center;justify-content:center;gap:8px;border:0;color:inherit;background:var(--color-background-muted);padding:7px;cursor:pointer}.experience-save-controls button:disabled{opacity:.4;cursor:default}.experience-save-controls :global(.workbench-icon){width:16px;height:16px}.experience-save-options{position:relative;border-left:1px solid var(--color-border-subtle)}.experience-save-options>summary{list-style:none;height:100%;box-sizing:border-box}.experience-save-options>summary::-webkit-details-marker{display:none}.experience-save-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:2;min-width:215px;padding:5px;border:1px solid var(--color-border-subtle);border-radius:6px;background:var(--color-background-surface);box-shadow:0 6px 18px #0003}.experience-save-menu button{width:100%;justify-content:flex-start;padding:9px}

.app-shell-panel-visibility__preset-action-row--experience{grid-auto-flow:row;grid-template-columns:minmax(0,1fr);grid-auto-columns:auto;min-width:0}
.app-shell-panel-visibility__preset-action-row--experience>.experience-menu-entry{box-sizing:border-box;width:100%;min-width:0;justify-content:flex-start;padding:10px;text-align:left}
.app-shell-panel-visibility__preset-action-row--experience .experience-current-entry{margin:0 0 4px;min-width:0}
.app-shell-panel-visibility__preset-action-row--experience .experience-save-controls{flex:none}
.app-shell-panel-visibility__preset-action-row--experience .experience-menu-entry>span{min-width:0;overflow-wrap:anywhere}
.app-shell-panel-visibility__preset-menu{box-sizing:border-box;overflow-x:hidden}
.experience-open small{display:flex;align-items:center;gap:8px;max-width:none;overflow:visible}.experience-current-name{min-width:0;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.experience-current-version{flex:none;font-variant-numeric:tabular-nums}
.experience-name-trigger{flex:1;min-width:0}
.experience-trigger{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;height:32px;padding:0 7px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer}.experience-trigger:hover,.experience-trigger--active{background:var(--color-background-muted);border-color:var(--color-border-subtle)}.experience-trigger:focus-visible{outline:2px solid var(--color-text-primary);outline-offset:2px}.experience-trigger :global(.workbench-icon){flex:none;width:16px;height:16px}.experience-trigger:disabled{opacity:.45;cursor:default}
.app-shell-panel-visibility{max-width:100%;overflow:hidden}.app-shell-panel-visibility__group{max-width:100%;overflow-x:auto;scrollbar-width:none}.app-shell-panel-visibility__group::-webkit-scrollbar{display:none}.app-shell-panel-visibility__group>button{flex-shrink:0}
</style>
