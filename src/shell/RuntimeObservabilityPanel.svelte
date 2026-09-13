<script lang="ts">
  import {
    createBootEventTimelineRows,
    type BootEventTimelineRow,
    type BootProjection,
    type RuntimeProjectionSessionEntry,
    type WorkbenchRuntimeSnapshot
  } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import {
    createRuntimeEventKey,
    formatRuntimeEventJson,
    type RuntimeProjectionActionState,
    type RuntimeProjectionTarget,
    type RuntimeProjectionViewerOption
  } from './runtimeObservability';
  import RuntimeLifecycleGraph from './RuntimeLifecycleGraph.svelte';
  import RuntimeObservabilityDetailSections from './RuntimeObservabilityDetailSections.svelte';
  import './RuntimeObservabilityPanel.css';

  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let runtimeFooterStatus: WorkbenchRuntimeSnapshot['status'] | 'idle' = 'idle';
  export let runtimeFooterLabel = 'Runtime idle';
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
  export let onReconnectRuntime: () => void = () => {};
  export let onOpenRuntimeProjection: (
    target?: RuntimeProjectionTarget | null,
    viewerId?: string | null
  ) => Promise<void> | void = () => {};
  export let onInvalidateRuntimeProjection: () => Promise<void> | void = () => {};

  const i18nT = getWorkbenchTranslator();
  const RUNTIME_BOOT_INSPECTOR_STATE_STORAGE_KEY = 'workbench.runtime.bootInspector.state.v1';
  const initialBootInspectorState = readRuntimeBootInspectorState();
  let selectedRuntimeEventKey: string | null = null;
  let bootTimelineFilter: 'all' | 'completed' | 'issues' | 'open' = initialBootInspectorState?.filter ?? 'all';
  let collapsedBootPhaseIds: string[] = initialBootInspectorState?.collapsedPhaseIds ?? [];
  let isBootSnapshotPreviewOpen = initialBootInspectorState?.snapshotPreviewOpen ?? false;
  let bootSnapshotCopyStatus = '';
  let hasHydratedBootInspectorState = typeof window !== 'undefined';

  $: if (
    selectedRuntimeEventKey &&
    !runtimeFooterEvents.some((event) => createRuntimeEventKey(event) === selectedRuntimeEventKey)
  ) {
    selectedRuntimeEventKey = null;
  }

  $: selectedRuntimeEvent =
    runtimeFooterEvents.find((event) => createRuntimeEventKey(event) === selectedRuntimeEventKey) ??
    runtimeFooterEvents[0] ??
    null;
  $: selectedRuntimeEventPayload = selectedRuntimeEvent
    ? formatRuntimeEventJson(selectedRuntimeEvent.payload)
    : '';
  $: runtimeFooterEventCountLabel = $i18nT('ui.shell.runtime.eventCount', {
    default: '{{count}} events retained',
    values: { count: runtimeFooterEventCount }
  });
  $: runtimeStores = runtimeSnapshot?.stores ?? [];
  $: runtimeServices = runtimeSnapshot?.services ?? [];
  $: runtimeManagers = runtimeSnapshot?.managers ?? [];
  $: runtimeDebugEvents = runtimeSnapshot?.debugEvents ?? [];
  $: runtimeStackTraces = runtimeSnapshot?.stackTraces ?? [];
  $: runtimeLaunch = runtimeSnapshot?.launch ?? null;
  $: runtimeLifecycle = runtimeSnapshot?.lifecycle ?? null;
  $: runtimeLaunchTransitions = runtimeLaunch?.transitions ?? [];
  $: runtimeLaunchChecks = runtimeLaunch?.preflight?.checks ?? [];
  $: runtimeLaunchProgress = runtimeLaunch?.progress ?? null;
  $: runtimeMetadata = runtimeSnapshot?.metadata ?? null;
  $: runtimeProjectionMode = runtimeSnapshot?.projectionMode ?? runtimeMetadata?.mode ?? 'self';
  $: runtimeGeneratedLabel = runtimeMetadata?.generatedAt
    ? new Date(runtimeMetadata.generatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : 'n/a';
  $: bootTimelineRows = createBootEventTimelineRows(bootProjection);
  $: bootTimelineSummary = createBootTimelineSummary(bootProjection, bootTimelineRows);
  $: bootTimelineGroups = createBootTimelineGroups(bootTimelineRows);
  $: visibleBootTimelineGroups = filterBootTimelineGroups(bootTimelineGroups, bootTimelineFilter);
  $: bootSnapshotPreviewPayload = isBootSnapshotPreviewOpen ? formatRuntimeBootSnapshot() : '';
  $: if (hasHydratedBootInspectorState) {
    persistRuntimeBootInspectorState({
      filter: bootTimelineFilter,
      collapsedPhaseIds: collapsedBootPhaseIds,
      snapshotPreviewOpen: isBootSnapshotPreviewOpen
    });
  }

  type BootTimelineSummary = {
    events: number;
    rows: number;
    completed: number;
    failed: number;
    open: number;
    durationLabel: string;
  };

  type BootTimelineGroup = {
    phase: BootEventTimelineRow;
    steps: BootEventTimelineRow[];
    eventCount: number;
  };
  type RuntimeBootInspectorState = {
    filter: 'all' | 'completed' | 'issues' | 'open';
    collapsedPhaseIds: string[];
    snapshotPreviewOpen: boolean;
  };

  function readRuntimeBootInspectorState(): RuntimeBootInspectorState | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const rawState = window.sessionStorage.getItem(RUNTIME_BOOT_INSPECTOR_STATE_STORAGE_KEY);

      if (!rawState) {
        return null;
      }

      const parsed = JSON.parse(rawState) as Partial<RuntimeBootInspectorState>;
      const filter =
        parsed.filter === 'completed' || parsed.filter === 'issues' || parsed.filter === 'open'
          ? parsed.filter
          : 'all';

      return {
        filter,
        collapsedPhaseIds: Array.isArray(parsed.collapsedPhaseIds)
          ? parsed.collapsedPhaseIds.filter((phaseId): phaseId is string => typeof phaseId === 'string')
          : [],
        snapshotPreviewOpen: parsed.snapshotPreviewOpen === true
      };
    } catch {
      return null;
    }
  }

  function persistRuntimeBootInspectorState(state: RuntimeBootInspectorState): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(RUNTIME_BOOT_INSPECTOR_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Inspector UI state is a convenience and must not block the footer runtime panel.
    }
  }

  function createBootTimelineSummary(
    projection: BootProjection | null,
    rows: readonly BootEventTimelineRow[],
  ): BootTimelineSummary {
    const duration =
      projection?.startedAt !== undefined && projection.endedAt !== undefined
        ? projection.endedAt - projection.startedAt
        : undefined;

    return {
      events: projection?.events.length ?? 0,
      rows: rows.length,
      completed: rows.filter((row) => row.status === 'success').length,
      failed: rows.filter((row) => row.status === 'failed' || row.status === 'blocked').length,
      open: rows.filter((row) => row.kind === 'open').length,
      durationLabel: formatBootDuration(duration)
    };
  }

  function createBootTimelineGroups(rows: readonly BootEventTimelineRow[]): BootTimelineGroup[] {
    const stepRows = rows.filter((row) => row.scope === 'step');

    return rows
      .filter((row) => row.scope === 'phase')
      .map((phase) => {
        const steps = stepRows.filter((row) => row.scopeLabel.startsWith(`${phase.name.charAt(0).toUpperCase()}${phase.name.slice(1)} /`));

        return {
          phase,
          steps,
          eventCount: phase.eventTypes.length + steps.reduce((total, step) => total + step.eventTypes.length, 0)
        };
      });
  }

  function filterBootTimelineGroups(
    groups: readonly BootTimelineGroup[],
    filter: 'all' | 'completed' | 'issues' | 'open',
  ): BootTimelineGroup[] {
    if (filter === 'all') {
      return [...groups];
    }

    return groups.filter((group) => {
      const rows = [group.phase, ...group.steps];

      if (filter === 'completed') {
        return rows.some((row) => row.status === 'success');
      }

      if (filter === 'issues') {
        return rows.some((row) => row.status === 'failed' || row.status === 'blocked');
      }

      return rows.some((row) => row.kind === 'open');
    });
  }

  function formatBootDuration(durationMs: number | undefined): string {
    if (durationMs === undefined) {
      return 'n/a';
    }

    return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`;
  }

  function isBootPhaseCollapsed(phaseId: string, collapsedIds: readonly string[] = collapsedBootPhaseIds): boolean {
    return collapsedIds.includes(phaseId);
  }

  function toggleBootPhaseCollapsed(phaseId: string): void {
    collapsedBootPhaseIds = isBootPhaseCollapsed(phaseId)
      ? collapsedBootPhaseIds.filter((id) => id !== phaseId)
      : [...collapsedBootPhaseIds, phaseId];
  }

  function formatRuntimeBootSnapshot(): string {
    if (!bootProjection) {
      return '';
    }

    return formatRuntimeEventJson({
      type: 'workbench.runtime.boot.snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      executionId: bootProjection.executionId,
      currentPhase: bootProjection.currentPhase,
      inspector: {
        filter: bootTimelineFilter,
        collapsedPhaseIds: collapsedBootPhaseIds
      },
      summary: bootTimelineSummary,
      projection: bootProjection,
      timeline: bootTimelineRows
    });
  }

  async function copyRuntimeBootSnapshot(): Promise<void> {
    if (!bootProjection) {
      return;
    }

    const payload = formatRuntimeBootSnapshot();

    try {
      await navigator.clipboard?.writeText(payload);
      bootSnapshotCopyStatus = 'Copied';
    } catch {
      bootSnapshotCopyStatus = 'Copy unavailable';
    }
  }
</script>

<div class="app-shell__footer-help-menu-groups">
  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.connection', { default: 'Connection' })}</h4>
    </header>
    <div class="app-shell__footer-runtime-grid">
      <span>{$i18nT('ui.shell.runtime.status', { default: 'Status' })}</span>
      <strong>{runtimeFooterStatus}</strong>
      <span>{$i18nT('ui.shell.runtime.backend', { default: 'Backend' })}</span>
      <code>{runtimeSnapshot?.backendUrl ?? 'unavailable'}</code>
      <span>{$i18nT('ui.shell.runtime.workspace', { default: 'Workspace' })}</span>
      <code>{runtimeSnapshot?.workspace?.workspaceRoot ?? 'unavailable'}</code>
      <span>{$i18nT('ui.shell.runtime.project', { default: 'Project' })}</span>
      <code>{runtimeSnapshot?.workspace?.project?.label ?? 'workspace'}</code>
      <span>{$i18nT('ui.shell.runtime.mode', { default: 'Mode' })}</span>
      <strong>{runtimeSnapshot?.health?.mode ?? runtimeSnapshot?.workspace?.mode ?? 'unknown'}</strong>
      <span>{$i18nT('ui.shell.runtime.launchPhase', { default: 'Launch phase' })}</span>
      <strong>{runtimeLaunch?.phase ?? 'unavailable'}</strong>
    </div>
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.inspection', { default: 'Inspection' })}</h4>
    </header>
    <div class="app-shell__footer-runtime-summary">
      <article>
        <span>{$i18nT('ui.shell.runtime.projectionMode', { default: 'Mode' })}</span>
        <strong>{runtimeProjectionMode}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.stores', { default: 'Stores' })}</span>
        <strong>{runtimeStores.length}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.services', { default: 'Services' })}</span>
        <strong>{runtimeServices.length}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.managers', { default: 'Managers' })}</span>
        <strong>{runtimeManagers.length}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.debugEvents', { default: 'Debug events' })}</span>
        <strong>{runtimeDebugEvents.length}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.stackTraces', { default: 'Stack traces' })}</span>
        <strong>{runtimeStackTraces.length}</strong>
      </article>
      <article>
        <span>{$i18nT('ui.shell.runtime.launchTransitions', { default: 'Launch steps' })}</span>
        <strong>{runtimeLaunchTransitions.length}</strong>
      </article>
    </div>
    <div class="app-shell__footer-runtime-grid">
      <span>{$i18nT('ui.shell.runtime.snapshot', { default: 'Snapshot' })}</span>
      <code>{runtimeGeneratedLabel}</code>
      <span>{$i18nT('ui.shell.runtime.source', { default: 'Source' })}</span>
      <code>{runtimeMetadata?.source ?? 'unavailable'}</code>
      <span>{$i18nT('ui.shell.runtime.version', { default: 'Version' })}</span>
      <code>{runtimeMetadata?.version ?? 'unavailable'}</code>
      <span>{$i18nT('ui.shell.runtime.repo', { default: 'Repo' })}</span>
      <code>{runtimeMetadata?.repo?.label ?? runtimeSnapshot?.workspace?.project?.label ?? 'unavailable'}</code>
    </div>
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.launchLifecycle', { default: 'Launch Lifecycle' })}</h4>
    </header>
    <RuntimeLifecycleGraph lifecycle={runtimeLifecycle} compact />
    {#if runtimeLaunch}
      <div class="app-shell__footer-runtime-grid">
        <span>{$i18nT('ui.shell.runtime.phase', { default: 'Phase' })}</span>
        <strong>{runtimeLaunch.phase}</strong>
        <span>{$i18nT('ui.shell.runtime.target', { default: 'Target' })}</span>
        <code>{runtimeLaunch.target?.kind ?? 'none'}</code>
        <span>{$i18nT('ui.shell.runtime.profile', { default: 'Profile' })}</span>
        <code>{runtimeLaunch.target?.profile ?? 'none'}</code>
        <span>{$i18nT('ui.shell.runtime.updated', { default: 'Updated' })}</span>
        <code>{new Date(runtimeLaunch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</code>
        <span>{$i18nT('ui.shell.runtime.progress', { default: 'Progress' })}</span>
        <strong>{runtimeLaunchProgress?.progress ?? 0}%</strong>
        <span>{$i18nT('ui.shell.runtime.activeStep', { default: 'Active step' })}</span>
        <code>{runtimeLaunchProgress?.activeStepId ?? 'none'}</code>
      </div>
      {#if runtimeLaunchChecks.length > 0}
        <div class="app-shell__footer-runtime-events">
          {#each runtimeLaunchChecks as check (check.id)}
            <article class="app-shell__footer-runtime-event">
              <div>
                <strong>{check.label}</strong>
                <span>{check.status}</span>
              </div>
              <p>{check.message}</p>
            </article>
          {/each}
        </div>
      {/if}
      {#if runtimeLaunchTransitions.length > 0}
        <div class="app-shell__footer-runtime-events">
          {#each runtimeLaunchTransitions as transition (transition.id)}
            <article class="app-shell__footer-runtime-event">
              <div>
                <strong>{transition.phase}</strong>
                <time>{new Date(transition.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
              </div>
              <p>{transition.previousPhase ?? 'start'} → {transition.message}</p>
            </article>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noLaunchLifecycle', { default: 'No launch lifecycle snapshot captured yet.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">Boot DAG</h4>
      {#if bootProjection}
        <button
          type="button"
          class="app-shell__footer-runtime-event-action"
          on:click={() => (isBootSnapshotPreviewOpen = !isBootSnapshotPreviewOpen)}
        >
          {isBootSnapshotPreviewOpen ? 'Hide snapshot' : 'Inspect snapshot'}
        </button>
        <button
          type="button"
          class="app-shell__footer-runtime-event-action"
          on:click={copyRuntimeBootSnapshot}
        >
          {bootSnapshotCopyStatus || 'Copy snapshot'}
        </button>
      {/if}
    </header>
    {#if bootProjection}
      <div class="app-shell__footer-runtime-boot-summary" aria-label="Runtime boot summary">
        <article>
          <span>Execution</span>
          <strong>{bootProjection.executionId}</strong>
        </article>
        <article>
          <span>Phase</span>
          <strong>{bootProjection.currentPhase}</strong>
        </article>
        <article>
          <span>Duration</span>
          <strong>{bootTimelineSummary.durationLabel}</strong>
        </article>
        <article>
          <span>Events</span>
          <strong>{bootTimelineSummary.events}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{bootTimelineSummary.completed}</strong>
        </article>
        <article>
          <span>Issues</span>
          <strong>{bootTimelineSummary.failed}</strong>
        </article>
      </div>

      <div class="app-shell__footer-runtime-boot-filters" aria-label="Runtime boot timeline filters">
        <button
          type="button"
          aria-pressed={bootTimelineFilter === 'all'}
          class:app-shell__footer-runtime-boot-filter--active={bootTimelineFilter === 'all'}
          on:click={() => (bootTimelineFilter = 'all')}
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={bootTimelineFilter === 'completed'}
          class:app-shell__footer-runtime-boot-filter--active={bootTimelineFilter === 'completed'}
          on:click={() => (bootTimelineFilter = 'completed')}
        >
          Done
        </button>
        <button
          type="button"
          aria-pressed={bootTimelineFilter === 'issues'}
          class:app-shell__footer-runtime-boot-filter--active={bootTimelineFilter === 'issues'}
          on:click={() => (bootTimelineFilter = 'issues')}
        >
          Issues
        </button>
        <button
          type="button"
          aria-pressed={bootTimelineFilter === 'open'}
          class:app-shell__footer-runtime-boot-filter--active={bootTimelineFilter === 'open'}
          on:click={() => (bootTimelineFilter = 'open')}
        >
          Open
        </button>
      </div>

      <div class="app-shell__footer-runtime-boot-timeline" aria-label="Runtime boot timeline">
        {#each visibleBootTimelineGroups as group (group.phase.id)}
          <article
            class="app-shell__footer-runtime-boot-phase"
            data-status={group.phase.status}
            data-collapsed={isBootPhaseCollapsed(group.phase.scopeId, collapsedBootPhaseIds)}
          >
            <header>
              <button
                type="button"
                aria-expanded={!isBootPhaseCollapsed(group.phase.scopeId, collapsedBootPhaseIds)}
                on:click={() => toggleBootPhaseCollapsed(group.phase.scopeId)}
              >
                <strong>{group.phase.name}</strong>
              </button>
              <code>{group.phase.status}</code>
              <span>{group.eventCount} event(s)</span>
            </header>
            <div class="app-shell__footer-runtime-boot-bar" aria-hidden="true">
              <i style={`margin-left: ${group.phase.startPercent}%; width: ${group.phase.timelinePercent}%`}></i>
            </div>
            {#if !isBootPhaseCollapsed(group.phase.scopeId, collapsedBootPhaseIds)}
              <div class="app-shell__footer-runtime-boot-steps">
                {#each group.steps as step (step.id)}
                  <div class="app-shell__footer-runtime-boot-step" data-status={step.status}>
                    <div>
                      <strong>{step.name}</strong>
                      <code>{step.status}</code>
                    </div>
                    <span>{formatBootDuration(step.durationMs)} · {step.eventTypes.join(' -> ')}</span>
                    <div class="app-shell__footer-runtime-boot-bar" aria-hidden="true">
                      <i style={`margin-left: ${step.startPercent}%; width: ${step.timelinePercent}%`}></i>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>

      {#if visibleBootTimelineGroups.length === 0}
        <div class="app-shell__footer-help-menu-empty">No boot phase matches this filter.</div>
      {/if}

      {#if isBootSnapshotPreviewOpen}
        <div class="app-shell__footer-runtime-payload" aria-label="Runtime boot snapshot preview">
          <div class="app-shell__footer-runtime-payload-header">
            <strong>Boot snapshot</strong>
            <span>{bootTimelineSummary.rows} timeline rows</span>
          </div>
          <pre>{bootSnapshotPreviewPayload}</pre>
        </div>
      {/if}
    {:else}
      <div class="app-shell__footer-help-menu-empty">No Boot DAG projection has been captured for this runtime session.</div>
    {/if}
  </section>

  <RuntimeObservabilityDetailSections
    {runtimeSnapshot}
    {runtimeFooterEvents}
    {runtimeFooterCapabilities}
    {runtimeFooterProjectionCatalog}
    {runtimeProjectionViewerOptionsByKind}
    {runtimeProjectionSessionEntries}
    {selectedRuntimeEvent}
    {selectedRuntimeEventPayload}
    bind:selectedRuntimeEventKey
    {onOpenRuntimeProjection}
  />

</div>

<div class="app-shell__footer-help-menu-bottom">
  <div class="app-shell__footer-help-menu-header">
    <div>
      <p class="app-shell__footer-help-menu-eyebrow">{$i18nT('ui.shell.runtime.eyebrow', { default: 'Runtime' })}</p>
      <h3 class="app-shell__footer-help-menu-title">{runtimeFooterLabel}</h3>
    </div>
    <div class="app-shell__footer-help-menu-header-actions">
      <span class="app-shell__footer-help-menu-count">{runtimeFooterEventCountLabel}</span>
      <button
        type="button"
        class="app-shell__footer-help-menu-open"
        disabled={!runtimeSnapshot}
        on:click={onReconnectRuntime}
      >
        {$i18nT('ui.shell.runtime.retry', { default: 'Retry' })}
      </button>
      <button
        type="button"
        class="app-shell__footer-help-menu-open"
        disabled={!activeRuntimeProjectionTarget}
        title={activeRuntimeProjectionSource ?? $i18nT('ui.shell.runtime.noActiveProjectionSource', { default: 'No active projection source' })}
        on:click={() => onOpenRuntimeProjection()}
      >
        {$i18nT('ui.shell.runtime.openProjection', { default: 'Open projection' })}
      </button>
      <button
        type="button"
        class="app-shell__footer-help-menu-open"
        disabled={!activeRuntimeProjectionTarget || isInvalidatingRuntimeProjection}
        title={activeRuntimeProjectionSource ?? $i18nT('ui.shell.runtime.noActiveProjectionSource', { default: 'No active projection source' })}
        on:click={onInvalidateRuntimeProjection}
      >
        {isInvalidatingRuntimeProjection
          ? $i18nT('ui.shell.runtime.refreshing', { default: 'Refreshing' })
          : $i18nT('ui.shell.runtime.refreshProjection', { default: 'Refresh projection' })}
      </button>
    </div>
  </div>
  {#if runtimeProjectionActionStatus}
    <div
      class={`app-shell__footer-runtime-action app-shell__footer-runtime-action--${runtimeProjectionActionStatus.phase}`}
      role="status"
    >
      <strong>{runtimeProjectionActionStatus.phase}</strong>
      <p>{runtimeProjectionActionStatus.message}</p>
    </div>
  {/if}
  {#if !runtimeSnapshot}
    <p class="app-shell__footer-runtime-error">{$i18nT('ui.shell.runtime.noBridge', { default: 'No runtime bridge is mounted in this app shell.' })}</p>
  {:else if runtimeSnapshot.lastError}
    <p class="app-shell__footer-runtime-error">{runtimeSnapshot.lastError}</p>
  {/if}
</div>
