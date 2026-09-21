<script lang="ts">
  import type { ShellRegionId, ShellWidgetDefinition, ToolDefinition } from '@konitif/workbench';
  import type {
    WorkspaceExperienceConnector,
    WorkspaceExperienceConnectorKind,
    WorkspaceExperienceWidgetPlacement
  } from './workspaceExperienceContracts';

  interface WorkspaceExperiencePanelOption {
    id: string;
    title: string;
    assignedToolId: string | null;
  }

  type ComposerCategory = 'tools' | 'widgets' | 'connectors';
  type ConnectorResult = { accepted: boolean; reason?: string };

  const defaultLabels = {
    managerEyebrow: 'Local library', managerTitle: 'Manage workspace capabilities',
    toolsTab: 'Tools', widgetsTab: 'Widgets', connectorsTab: 'Connectors', close: 'Close',
    selectionTitle: 'Available tools',
    selectionDescription: 'Choose the tools admitted to this experience. The global catalog remains unchanged.',
    assignmentTitle: 'Compose the workbench', assignmentDescription: 'Assign selected tools to workbench panels.',
    continue: 'Assign to panels', finishSelection: 'Finish selection', back: 'Change selection',
    addPanel: 'Add panel', finish: 'Finish', selected: 'selected', unassigned: 'Unassigned',
    widgetsTitle: 'Available widgets', widgetsDescription: 'Enable widgets and choose where they appear in the shell.',
    includedWithTool: 'Included with its tool', internalRegion: 'Inside linked tool',
    leftRegion: 'Left', rightRegion: 'Right', bottomRegion: 'Bottom',
    connectorsTitle: 'Connector endpoints',
    connectorsDescription: 'Configure API and catalog endpoints. Saving does not initiate a network connection.',
    connectorAdd: 'Add connector', connectorEdit: 'Edit', connectorRemove: 'Remove',
    connectorSave: 'Save connector', connectorCancel: 'Cancel', connectorName: 'Name',
    connectorUrl: 'Endpoint URL', connectorKind: 'Kind', connectorEnabled: 'Enabled',
    connectorEmpty: 'No connector configured.', connectorApi: 'API',
    connectorToolRegistry: 'Tool registry', connectorWidgetRegistry: 'Widget registry',
    connectorResourceRegistry: 'Resource registry'
  };

  export let availableTools: ToolDefinition[] = [];
  export let selectedToolIds: string[] = [];
  export let panels: WorkspaceExperiencePanelOption[] = [];
  export let availableWidgets: ShellWidgetDefinition[] = [];
  export let widgetRegionById: Partial<Record<string, ShellRegionId>> = {};
  export let includedWidgetIds: string[] = [];
  export let connectors: WorkspaceExperienceConnector[] = [];
  export let labels: Partial<typeof defaultLabels> = {};
  export let onSetToolSelected: (toolId: string, selected: boolean) => void = () => undefined;
  export let onAssignTool: (toolId: string, panelId: string) => void = () => undefined;
  export let onAddPanel: () => void = () => undefined;
  export let onSetWidgetSelected: (widgetId: string, selected: boolean) => void = () => undefined;
  export let onPlaceWidget: (
    widgetId: string,
    placement: WorkspaceExperienceWidgetPlacement
  ) => void = () => undefined;
  export let onSaveConnector: (connector: WorkspaceExperienceConnector) => ConnectorResult = () => ({ accepted: false });
  export let onSetConnectorEnabled: (connectorId: string, enabled: boolean) => void = () => undefined;
  export let onRemoveConnector: (connectorId: string) => void = () => undefined;
  export let onFinish: () => void = () => undefined;

  let category: ComposerCategory = 'tools';
  let toolStep: 'selection' | 'assignment' = 'selection';
  let editingConnectorId: string | null = null;
  let connectorLabel = '';
  let connectorKind: WorkspaceExperienceConnectorKind = 'api';
  let connectorUrl = '';
  let connectorEnabled = true;
  let connectorError = '';

  $: copy = { ...defaultLabels, ...labels };
  $: selectedSet = new Set(selectedToolIds);
  $: selectedTools = availableTools.filter(tool => selectedSet.has(tool.id));
  $: includedWidgetSet = new Set(includedWidgetIds);
  $: selectedWidgetCount = new Set([...Object.keys(widgetRegionById), ...includedWidgetIds]).size;

  function updateSelection(toolId: string, event: Event): void {
    onSetToolSelected(toolId, (event.currentTarget as HTMLInputElement).checked);
  }
  function assign(toolId: string, event: Event): void {
    const panelId = (event.currentTarget as HTMLSelectElement).value;
    if (panelId) onAssignTool(toolId, panelId);
  }
  function assignedPanelId(toolId: string): string {
    return panels.find(panel => panel.assignedToolId === toolId)?.id ?? '';
  }
  function updateWidgetSelection(widget: ShellWidgetDefinition, event: Event): void {
    onSetWidgetSelected(widget.id, (event.currentTarget as HTMLInputElement).checked);
  }
  function isWidgetSelected(widgetId: string): boolean {
    return includedWidgetSet.has(widgetId) || Boolean(widgetRegionById[widgetId]);
  }
  function widgetPlacement(widgetId: string): WorkspaceExperienceWidgetPlacement {
    return widgetRegionById[widgetId] ?? 'internal';
  }
  function placeWidget(widgetId: string, event: Event): void {
    onPlaceWidget(
      widgetId,
      (event.currentTarget as HTMLSelectElement).value as WorkspaceExperienceWidgetPlacement
    );
  }
  function updateConnectorEnabled(connectorId: string, event: Event): void {
    onSetConnectorEnabled(connectorId, (event.currentTarget as HTMLInputElement).checked);
  }
  function beginConnector(connector?: WorkspaceExperienceConnector): void {
    editingConnectorId = connector?.id ?? '';
    connectorLabel = connector?.label ?? '';
    connectorKind = connector?.kind ?? 'api';
    connectorUrl = connector?.url ?? '';
    connectorEnabled = connector?.enabled ?? true;
    connectorError = '';
  }
  function cancelConnector(): void { editingConnectorId = null; connectorError = ''; }
  function createConnectorId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `connector.${crypto.randomUUID()}`
      : `connector.${Date.now().toString(36)}`;
  }
  function saveConnector(): void {
    const label = connectorLabel.trim(), url = connectorUrl.trim();
    if (!label || !url) { connectorError = 'Name and URL are required.'; return; }
    let parsed: URL;
    try { parsed = new URL(url); } catch { connectorError = 'Enter a valid URL.'; return; }
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      connectorError = 'Only HTTP(S) and WebSocket URLs are supported.'; return;
    }
    const result = onSaveConnector({
      id: editingConnectorId || createConnectorId(),
      label, kind: connectorKind, url: parsed.toString(), enabled: connectorEnabled
    });
    if (!result.accepted) { connectorError = result.reason ?? 'Connector rejected.'; return; }
    cancelConnector();
  }
</script>

<div class="experience-composer__layer">
  <button class="experience-composer__backdrop" type="button" aria-label={copy.close} on:click={onFinish}></button>
  <section class="experience-composer" role="dialog" aria-modal="true" aria-labelledby="experience-composer-title">
    <div class="experience-composer__sticky-header">
      <header class="experience-composer__manager-header">
        <div>
          <span>{copy.managerEyebrow}</span>
          <h2 id="experience-composer-title">{copy.managerTitle}</h2>
        </div>
        <button class="experience-composer__close" type="button" aria-label={copy.close} title={copy.close} on:click={onFinish}>×</button>
      </header>
      <nav class="experience-composer__tabs" aria-label={copy.managerTitle}>
        <button type="button" class:active={category === 'tools'} aria-pressed={category === 'tools'} on:click={() => (category = 'tools')}>{copy.toolsTab}</button>
        <button type="button" class:active={category === 'widgets'} aria-pressed={category === 'widgets'} on:click={() => (category = 'widgets')}>{copy.widgetsTab}</button>
        <button type="button" class:active={category === 'connectors'} aria-pressed={category === 'connectors'} on:click={() => (category = 'connectors')}>{copy.connectorsTab}</button>
      </nav>
    </div>

    <div class="experience-composer__body">
      {#if category === 'tools' && toolStep === 'selection'}
        <header class="experience-composer__section-header"><h3>{copy.selectionTitle}</h3><p>{copy.selectionDescription}</p></header>
        <div class="experience-composer__catalog">
          {#each availableTools as tool (tool.id)}
            <label class:experience-composer__entry--selected={selectedSet.has(tool.id)} class="experience-composer__entry">
              <input type="checkbox" value={tool.id} checked={selectedSet.has(tool.id)} on:change={(event) => updateSelection(tool.id, event)} />
              <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            </label>
          {/each}
        </div>
      {:else if category === 'tools'}
        <header class="experience-composer__section-header"><h3>{copy.assignmentTitle}</h3><p>{copy.assignmentDescription}</p></header>
        <div class="experience-composer__assignments">
          {#each selectedTools as tool (tool.id)}
            <label><span><strong>{tool.title}</strong><small>{tool.panelTitle}</small></span>
              <select data-tool-id={tool.id} value={assignedPanelId(tool.id)} on:change={(event) => assign(tool.id, event)}>
                <option value="">{copy.unassigned}</option>
                {#each panels as panel (panel.id)}<option value={panel.id}>{panel.title}</option>{/each}
              </select>
            </label>
          {/each}
        </div>
      {:else if category === 'widgets'}
        <header class="experience-composer__section-header"><h3>{copy.widgetsTitle}</h3><p>{copy.widgetsDescription}</p></header>
        <div class="experience-composer__catalog">
          {#each availableWidgets as widget (widget.id)}
            <div class:experience-composer__entry--selected={isWidgetSelected(widget.id)} class="experience-composer__entry experience-composer__widget-entry">
              <label class:experience-composer__widget-label--readonly={includedWidgetSet.has(widget.id)}><input type="checkbox" value={widget.id} checked={isWidgetSelected(widget.id)} disabled={includedWidgetSet.has(widget.id)} on:change={(event) => updateWidgetSelection(widget, event)} />
                <span><strong>{widget.title}</strong><small>{widget.description}</small>{#if includedWidgetSet.has(widget.id)}<small class="experience-composer__included">{copy.includedWithTool}</small>{/if}</span></label>
              {#if includedWidgetSet.has(widget.id)}
                <select aria-label={`${widget.title} placement`} value={widgetPlacement(widget.id)} on:change={(event) => placeWidget(widget.id, event)}>
                  <option value="internal">{copy.internalRegion}</option><option value="left">{copy.leftRegion}</option><option value="right">{copy.rightRegion}</option><option value="bottom">{copy.bottomRegion}</option>
                </select>
              {:else if widgetRegionById[widget.id]}
                <select aria-label={`${widget.title} region`} value={widgetRegionById[widget.id]} on:change={(event) => placeWidget(widget.id, event)}>
                  <option value="left">{copy.leftRegion}</option><option value="right">{copy.rightRegion}</option><option value="bottom">{copy.bottomRegion}</option>
                </select>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <header class="experience-composer__section-header"><h3>{copy.connectorsTitle}</h3><p>{copy.connectorsDescription}</p></header>
        <div class="experience-composer__connectors">
          {#if connectors.length === 0}<p class="experience-composer__empty">{copy.connectorEmpty}</p>{/if}
          {#each connectors as connector (connector.id)}
            <article class="experience-composer__connector">
              <label class="experience-composer__connector-toggle"><input type="checkbox" checked={connector.enabled} on:change={(event) => updateConnectorEnabled(connector.id, event)} />
                <span><strong>{connector.label}</strong><small>{connector.kind} · {connector.url}</small></span></label>
              <div><button type="button" class="secondary" on:click={() => beginConnector(connector)}>{copy.connectorEdit}</button><button type="button" class="danger" on:click={() => onRemoveConnector(connector.id)}>{copy.connectorRemove}</button></div>
            </article>
          {/each}
        </div>
        {#if editingConnectorId !== null}
          <div class="experience-composer__connector-editor">
            <label><span>{copy.connectorName}</span><input type="text" bind:value={connectorLabel} /></label>
            <label><span>{copy.connectorKind}</span><select bind:value={connectorKind}><option value="api">{copy.connectorApi}</option><option value="tool-registry">{copy.connectorToolRegistry}</option><option value="widget-registry">{copy.connectorWidgetRegistry}</option><option value="resource-registry">{copy.connectorResourceRegistry}</option></select></label>
            <label class="wide"><span>{copy.connectorUrl}</span><input type="url" bind:value={connectorUrl} placeholder="https://" /></label>
            <label class="experience-composer__enabled"><input type="checkbox" bind:checked={connectorEnabled} /> {copy.connectorEnabled}</label>
            {#if connectorError}<p class="experience-composer__error" role="alert">{connectorError}</p>{/if}
            <div class="experience-composer__editor-actions"><button type="button" class="secondary" on:click={cancelConnector}>{copy.connectorCancel}</button><button type="button" on:click={saveConnector}>{copy.connectorSave}</button></div>
          </div>
        {/if}
      {/if}
    </div>

    <footer class="experience-composer__footer">
      {#if category === 'tools' && toolStep === 'selection'}
        <small>{selectedToolIds.length} {copy.selected}</small>
        <div><button type="button" class="secondary" on:click={onFinish}>{copy.finishSelection}</button><button type="button" disabled={selectedToolIds.length === 0} on:click={() => (toolStep = 'assignment')}>{copy.continue}</button></div>
      {:else if category === 'tools'}
        <div><button type="button" class="secondary" on:click={() => (toolStep = 'selection')}>{copy.back}</button><button type="button" class="secondary" on:click={onAddPanel}>{copy.addPanel}</button></div><button type="button" on:click={onFinish}>{copy.finish}</button>
      {:else if category === 'widgets'}
        <small>{selectedWidgetCount} {copy.selected}</small><button type="button" on:click={onFinish}>{copy.close}</button>
      {:else}
        <button type="button" class="secondary" on:click={() => beginConnector()}>{copy.connectorAdd}</button><button type="button" on:click={onFinish}>{copy.close}</button>
      {/if}
    </footer>
  </section>
</div>

<style>
  .experience-composer__layer { position: fixed; inset: 0; z-index: 1500; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
  .experience-composer__backdrop { position: absolute; inset: 0; border: 0; border-radius: 0; background: rgba(0, 5, 12, 0.62); backdrop-filter: blur(2px); }
  .experience-composer { position: relative; width: min(820px, 100%); height: min(780px, 100%); box-sizing: border-box; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border: 1px solid var(--color-border-accent, rgba(105, 236, 193, 0.35)); border-radius: 16px; color: var(--color-text-primary, #eef5fb); background: linear-gradient(145deg, rgba(20, 31, 46, 0.99), rgba(8, 14, 22, 0.99)); box-shadow: 0 32px 100px rgba(0, 0, 0, 0.58); }
  .experience-composer__sticky-header { position: sticky; top: 0; z-index: 2; display: grid; gap: 14px; padding: 22px 22px 14px; border-bottom: 1px solid rgba(135, 159, 188, 0.18); background: rgba(13, 23, 36, 0.98); }
  .experience-composer__manager-header { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
  .experience-composer__manager-header > div, .experience-composer__section-header { display: grid; gap: 5px; }
  header span { color: var(--color-text-accent, #69ecc1); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  h2, h3, p { margin: 0; } h2 { font-size: 1.4rem; } h3 { font-size: 1.05rem; } p { color: var(--color-text-secondary, #aebdd0); }
  .experience-composer__close { width: 32px; height: 32px; padding: 0; font-size: 1.25rem; }
  .experience-composer__tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border: 1px solid rgba(135, 159, 188, 0.2); border-radius: 10px; background: rgba(4, 10, 18, 0.6); }
  .experience-composer__tabs button { border-color: transparent; background: transparent; }
  .experience-composer__tabs button.active { border-color: rgba(105, 236, 193, 0.5); background: rgba(105, 236, 193, 0.13); }
  .experience-composer__body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: grid; align-content: start; gap: 14px; padding: 18px 22px; scrollbar-gutter: stable; }
  .experience-composer__catalog { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  .experience-composer__entry { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 12px; border: 1px solid rgba(135, 159, 188, 0.2); border-radius: 10px; background: rgba(9, 16, 25, 0.72); cursor: pointer; }
  .experience-composer__entry--selected { border-color: rgba(105, 236, 193, 0.62); background: rgba(105, 236, 193, 0.1); }
  .experience-composer__entry span, .experience-composer__assignments label > span, .experience-composer__connector-toggle span { display: grid; gap: 3px; min-width: 0; }
  .experience-composer__widget-entry { grid-template-columns: 1fr; cursor: default; }
  .experience-composer__widget-entry > label { display: grid; grid-template-columns: auto 1fr; gap: 10px; cursor: pointer; }
  .experience-composer__widget-label--readonly { cursor: default !important; }
  .experience-composer__included { color: var(--color-text-accent, #69ecc1); font-weight: 700; }
  small { color: var(--color-text-muted, #8596aa); overflow-wrap: anywhere; }
  .experience-composer__assignments, .experience-composer__connectors { display: grid; gap: 9px; }
  .experience-composer__assignments label, .experience-composer__connector { display: grid; grid-template-columns: 1fr minmax(180px, 0.7fr); align-items: center; gap: 16px; padding: 11px 12px; border: 1px solid rgba(135, 159, 188, 0.18); border-radius: 10px; }
  .experience-composer__connector-toggle { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; }
  .experience-composer__connector > div { display: flex; justify-content: end; gap: 7px; }
  .experience-composer__connector-editor { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; border: 1px solid rgba(105, 236, 193, 0.3); border-radius: 10px; background: rgba(4, 10, 18, 0.7); }
  .experience-composer__connector-editor label:not(.experience-composer__enabled) { display: grid; gap: 5px; }
  .experience-composer__connector-editor .wide, .experience-composer__error, .experience-composer__editor-actions { grid-column: 1 / -1; }
  .experience-composer__enabled { display: flex; align-items: center; gap: 7px; }
  .experience-composer__error { color: var(--color-status-danger, #fb7185); }
  .experience-composer__editor-actions { display: flex; justify-content: end; gap: 8px; }
  .experience-composer__empty { padding: 16px; border: 1px dashed rgba(135, 159, 188, 0.25); border-radius: 10px; text-align: center; }
  input[type='text'], input[type='url'], select { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid rgba(135, 159, 188, 0.32); border-radius: 7px; color: inherit; background: #0c1622; }
  .experience-composer__footer { position: sticky; bottom: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px 18px; border-top: 1px solid rgba(135, 159, 188, 0.18); background: rgba(10, 18, 29, 0.98); }
  .experience-composer__footer > div { display: flex; gap: 8px; }
  button { padding: 8px 12px; border: 1px solid rgba(105, 236, 193, 0.55); border-radius: 8px; color: inherit; background: rgba(105, 236, 193, 0.14); cursor: pointer; }
  button:disabled { opacity: 0.45; cursor: not-allowed; } button.secondary { border-color: rgba(135, 159, 188, 0.32); background: rgba(135, 159, 188, 0.08); } button.danger { border-color: rgba(251, 113, 133, 0.35); background: rgba(251, 113, 133, 0.08); }
  @media (max-width: 620px) { .experience-composer__connector-editor, .experience-composer__assignments label, .experience-composer__connector { grid-template-columns: 1fr; } .experience-composer__connector > div { justify-content: start; } }
</style>
