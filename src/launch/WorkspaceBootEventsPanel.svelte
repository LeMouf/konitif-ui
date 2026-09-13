<script lang="ts">
  import type { BootEvent, BootPhase, BootProjection } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  type BootEventView = 'flat' | 'stack' | 'timeline';
  type BootTimelineFilter = 'all' | 'completed' | 'issues' | 'open';
  type BootEventStackRow = {
    id: string;
    scope: string;
    level: number;
    name: string;
    target: string;
    scopeId: string;
    scopeLabel: string;
    phaseId: BootPhase | null;
    status: string;
    kind: 'open' | 'close' | 'error' | 'event';
    tone: 'root' | 'plan' | 'initialize' | 'hydrate' | 'run' | 'danger' | 'neutral';
    eventCount: number;
    eventTypes: string[];
    timeLabel: string;
    durationLabel: string;
    startPercent: number;
    timelinePercent: number;
  };
  type BootEventTimelineGroup = {
    phase: BootEventStackRow;
    steps: BootEventStackRow[];
    eventCount: number;
    durationLabel: string;
  };
  type BootEventTimelineSummary = {
    rows: number;
    events: number;
    completed: number;
    failed: number;
    open: number;
    durationLabel: string;
  };

  export let bootProjection: BootProjection | null = null;
  export let bootEvents: readonly BootEvent[] = [];
  export let bootEventView: BootEventView = 'flat';
  export let bootTimelineFilter: BootTimelineFilter = 'all';
  export let bootEventStackRows: readonly BootEventStackRow[] = [];
  export let bootEventTimelineSummary: BootEventTimelineSummary;
  export let bootEventRootRow: BootEventStackRow | null = null;
  export let visibleBootEventTimelineGroups: readonly BootEventTimelineGroup[] = [];
  export let collapsedBootTimelinePhaseIds: BootPhase[] = [];
  export let bootSnapshotExportStatus = '';
  export let isBootSnapshotPreviewOpen = false;
  export let bootSnapshotPreviewPayload = '';
  export let resizable = false;
  export let bootEventsPopoverHeight = 0;
  export let onExportBootEventsSnapshot: () => void | Promise<void> = () => undefined;
  export let onInspectBootEventsSnapshot: () => void = () => undefined;
  export let onCloseBootEventsSnapshotPreview: () => void = () => undefined;
  export let onResetBootEventsPopoverHeight: () => void = () => undefined;
  export let onStartBootEventsResize: (event: PointerEvent) => void = () => undefined;

  const i18nT = getWorkbenchTranslator();

  function formatBootEventType(type: string): string {
    return type.replace(/:/g, ' -> ');
  }

  function isBootTimelinePhaseCollapsed(
    phaseId: string,
    collapsedPhaseIds: readonly BootPhase[] = collapsedBootTimelinePhaseIds,
  ): boolean {
    return collapsedPhaseIds.includes(phaseId as BootPhase);
  }

  function toggleBootTimelinePhase(phaseId: string): void {
    const phase = phaseId as BootPhase;

    collapsedBootTimelinePhaseIds = isBootTimelinePhaseCollapsed(phase)
      ? collapsedBootTimelinePhaseIds.filter((entry) => entry !== phase)
      : [...collapsedBootTimelinePhaseIds, phase];
  }
</script>

<details
  class="workspace-init__events"
  class:workspace-init__events--resized={bootEventsPopoverHeight > 0}
  style={bootEventsPopoverHeight > 0 ? `--boot-events-popover-height: ${bootEventsPopoverHeight}px` : ''}
>
  <summary>
    <span>{$i18nT('ui.shell.launchGate.initialization.boot.events', { default: 'Boot Events' })}</span>
    <div class="workspace-init__event-view-switch" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.eventRepresentationAria', { default: 'Boot event representation' })}>
      <button
        type="button"
        class:workspace-init__event-view-switch--active={bootEventView === 'flat'}
        on:click|preventDefault|stopPropagation={() => {
          bootEventView = 'flat';
        }}
      >
        {$i18nT('ui.shell.launchGate.initialization.boot.flat', { default: 'Flat' })}
      </button>
      <button
        type="button"
        class:workspace-init__event-view-switch--active={bootEventView === 'stack'}
        on:click|preventDefault|stopPropagation={() => {
          bootEventView = 'stack';
        }}
      >
        {$i18nT('ui.shell.launchGate.initialization.boot.stack', { default: 'Stack' })}
      </button>
      <button
        type="button"
        class:workspace-init__event-view-switch--active={bootEventView === 'timeline'}
        on:click|preventDefault|stopPropagation={() => {
          bootEventView = 'timeline';
        }}
      >
        {$i18nT('ui.shell.launchGate.initialization.boot.timeline', { default: 'Timeline' })}
      </button>
    </div>
    <button
      type="button"
      class="workspace-init__snapshot-button"
      disabled={!bootProjection}
      on:click|preventDefault|stopPropagation={onExportBootEventsSnapshot}
    >
      {bootSnapshotExportStatus || $i18nT('ui.shell.launchGate.initialization.boot.copySnapshot', { default: 'Copy Snapshot' })}
    </button>
    <button
      type="button"
      class="workspace-init__snapshot-button"
      disabled={!bootProjection}
      on:click|preventDefault|stopPropagation={onInspectBootEventsSnapshot}
    >
      {$i18nT('ui.shell.launchGate.initialization.boot.inspectSnapshot', { default: 'Inspect Snapshot' })}
    </button>
    <code>{bootEvents.length}</code>
  </summary>

  {#if bootEventView === 'flat'}
    <div aria-label={$i18nT('ui.shell.launchGate.initialization.boot.flatListAria', { default: 'Boot events flat list' })}>
      {#if resizable}
        <button
          type="button"
          class="workspace-init__events-resize-handle"
          aria-label={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsAria', { default: 'Resize boot events popover' })}
          title={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsTitle', { default: 'Drag to resize. Double click to restore full height.' })}
          on:dblclick|stopPropagation={onResetBootEventsPopoverHeight}
          on:pointerdown={onStartBootEventsResize}
        ></button>
      {/if}
      {#each bootEvents as event, index (`${event.executionId}:${event.type}:${index}`)}
        <article>
          <strong>{formatBootEventType(event.type)}</strong>
          {#if 'stepId' in event}
            <small>{event.stepId}</small>
          {:else if 'phase' in event}
            <small>{event.phase}</small>
          {:else}
            <small>{event.executionId}</small>
          {/if}
        </article>
      {/each}
    </div>
  {:else if bootEventView === 'stack'}
    <div class="workspace-init__event-stack" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.stackTraceAria', { default: 'Boot events stack trace' })}>
      {#if resizable}
        <button
          type="button"
          class="workspace-init__events-resize-handle"
          aria-label={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsAria', { default: 'Resize boot events popover' })}
          title={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsTitle', { default: 'Drag to resize. Double click to restore full height.' })}
          on:dblclick|stopPropagation={onResetBootEventsPopoverHeight}
          on:pointerdown={onStartBootEventsResize}
        ></button>
      {/if}
      {#each bootEventStackRows as row (row.id)}
        <article
          class="workspace-init__event-stack-row"
          data-kind={row.kind}
          data-level={row.level}
          data-status={row.status}
          data-tone={row.tone}
        >
          <span class="workspace-init__event-stack-level">L{row.level}</span>
          <div class="workspace-init__event-stack-main">
            <div>
              <strong>{row.name}</strong>
              <code>{row.scopeLabel}</code>
            </div>
            <small>{row.target}</small>
            <span class="workspace-init__event-stack-line">
              <i style={`margin-left: ${row.startPercent}%; width: ${row.timelinePercent}%`}></i>
            </span>
          </div>
          <div class="workspace-init__event-stack-meta">
            <code>{row.timeLabel}</code>
            <small>{row.durationLabel}</small>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="workspace-init__event-timeline" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.timelineGroupsAria', { default: 'Boot event timeline groups' })}>
      {#if resizable}
        <button
          type="button"
          class="workspace-init__events-resize-handle"
          aria-label={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsAria', { default: 'Resize boot events popover' })}
          title={$i18nT('ui.shell.launchGate.initialization.boot.resizeEventsTitle', { default: 'Drag to resize. Double click to restore full height.' })}
          on:dblclick|stopPropagation={onResetBootEventsPopoverHeight}
          on:pointerdown={onStartBootEventsResize}
        ></button>
      {/if}
      <div class="workspace-init__timeline-summary" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.timelineSummaryAria', { default: 'Boot timeline summary' })}>
        <article>
          <strong>{bootEventTimelineSummary.durationLabel}</strong>
          <small>{$i18nT('ui.shell.launchGate.initialization.boot.totalDuration', { default: 'Total duration' })}</small>
        </article>
        <article>
          <strong>{bootEventTimelineSummary.completed}</strong>
          <small>{$i18nT('ui.shell.launchGate.initialization.boot.completedScopes', { default: 'Completed scopes' })}</small>
        </article>
        <article>
          <strong>{bootEventTimelineSummary.failed}</strong>
          <small>{$i18nT('ui.shell.launchGate.initialization.boot.failedScopes', { default: 'Failed scopes' })}</small>
        </article>
        <article>
          <strong>{bootEventTimelineSummary.open}</strong>
          <small>{$i18nT('ui.shell.launchGate.initialization.boot.openScopes', { default: 'Open scopes' })}</small>
        </article>
      </div>
      <div class="workspace-init__timeline-filters" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.timelineFiltersAria', { default: 'Boot timeline filters' })}>
        <button
          type="button"
          class:workspace-init__timeline-filter--active={bootTimelineFilter === 'all'}
          on:click={() => {
            bootTimelineFilter = 'all';
          }}
        >
          {$i18nT('ui.shell.launchGate.initialization.boot.filter.all', { default: 'All' })}
        </button>
        <button
          type="button"
          class:workspace-init__timeline-filter--active={bootTimelineFilter === 'completed'}
          on:click={() => {
            bootTimelineFilter = 'completed';
          }}
        >
          {$i18nT('ui.shell.launchGate.initialization.boot.filter.done', { default: 'Done' })}
        </button>
        <button
          type="button"
          class:workspace-init__timeline-filter--active={bootTimelineFilter === 'issues'}
          on:click={() => {
            bootTimelineFilter = 'issues';
          }}
        >
          {$i18nT('ui.shell.launchGate.initialization.boot.filter.issues', { default: 'Issues' })}
        </button>
        <button
          type="button"
          class:workspace-init__timeline-filter--active={bootTimelineFilter === 'open'}
          on:click={() => {
            bootTimelineFilter = 'open';
          }}
        >
          {$i18nT('ui.shell.launchGate.initialization.boot.filter.open', { default: 'Open' })}
        </button>
      </div>
      {#if bootEventRootRow}
        <article
          class="workspace-init__event-stack-row workspace-init__timeline-root"
          data-kind={bootEventRootRow.kind}
          data-level={bootEventRootRow.level}
          data-status={bootEventRootRow.status}
          data-tone={bootEventRootRow.tone}
        >
          <span class="workspace-init__event-stack-level">L{bootEventRootRow.level}</span>
          <div class="workspace-init__event-stack-main">
            <div>
              <strong>{bootEventRootRow.name}</strong>
              <code>{bootEventRootRow.scopeLabel}</code>
            </div>
            <small>{$i18nT('ui.shell.launchGate.initialization.boot.eventSummary', { default: '{{count}} event(s) · {{target}}', values: { count: bootEventRootRow.eventCount, target: bootEventRootRow.target } })}</small>
            <span class="workspace-init__event-stack-line">
              <i style={`margin-left: ${bootEventRootRow.startPercent}%; width: ${bootEventRootRow.timelinePercent}%`}></i>
            </span>
          </div>
          <div class="workspace-init__event-stack-meta">
            <code>{bootEventRootRow.timeLabel}</code>
            <small>{bootEventRootRow.durationLabel}</small>
          </div>
        </article>
      {/if}
      {#each visibleBootEventTimelineGroups as group (group.phase.id)}
        <section
          class="workspace-init__timeline-group"
          data-status={group.phase.status}
          data-collapsed={isBootTimelinePhaseCollapsed(group.phase.scopeId, collapsedBootTimelinePhaseIds)}
        >
          <header>
            <div>
              <button
                type="button"
                class="workspace-init__timeline-collapse"
                aria-expanded={!isBootTimelinePhaseCollapsed(group.phase.scopeId, collapsedBootTimelinePhaseIds)}
                on:click={() => toggleBootTimelinePhase(group.phase.scopeId)}
              >
                <strong>{group.phase.name}</strong>
              </button>
              <code>{group.phase.status}</code>
            </div>
            <small>{$i18nT('ui.shell.launchGate.initialization.boot.eventSummary', { default: '{{count}} event(s) · {{target}}', values: { count: group.eventCount, target: group.durationLabel } })}</small>
          </header>
          <span class="workspace-init__event-stack-line">
            <i style={`margin-left: ${group.phase.startPercent}%; width: ${group.phase.timelinePercent}%`}></i>
          </span>
          {#if !isBootTimelinePhaseCollapsed(group.phase.scopeId, collapsedBootTimelinePhaseIds)}
            <div class="workspace-init__timeline-children">
              {#each group.steps as row (row.id)}
                <article
                  class="workspace-init__event-stack-row"
                  data-kind={row.kind}
                  data-level={row.level}
                  data-status={row.status}
                  data-tone={row.tone}
                >
                  <span class="workspace-init__event-stack-level">L{row.level}</span>
                  <div class="workspace-init__event-stack-main">
                    <div>
                      <strong>{row.name}</strong>
                      <code>{row.status}</code>
                    </div>
                    <small>{$i18nT('ui.shell.launchGate.initialization.boot.eventSummary', { default: '{{count}} event(s) · {{target}}', values: { count: row.eventCount, target: row.eventTypes.join(' -> ') } })}</small>
                    <span class="workspace-init__event-stack-line">
                      <i style={`margin-left: ${row.startPercent}%; width: ${row.timelinePercent}%`}></i>
                    </span>
                  </div>
                  <div class="workspace-init__event-stack-meta">
                    <code>{row.timeLabel}</code>
                    <small>{row.durationLabel}</small>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
      {#if visibleBootEventTimelineGroups.length === 0}
        <p class="workspace-init__timeline-empty">{$i18nT('ui.shell.launchGate.initialization.boot.noTimelineMatch', { default: 'No boot scope matches this filter.' })}</p>
      {/if}
      {#if isBootSnapshotPreviewOpen}
        <section class="workspace-init__snapshot-preview" aria-label={$i18nT('ui.shell.launchGate.initialization.boot.snapshotPreviewAria', { default: 'Boot snapshot preview' })}>
          <header>
            <strong>{$i18nT('ui.shell.launchGate.initialization.boot.snapshot', { default: 'Snapshot' })}</strong>
            <button type="button" on:click={onCloseBootEventsSnapshotPreview}>{$i18nT('ui.shell.launchGate.actions.close', { default: 'Close' })}</button>
          </header>
          <pre>{bootSnapshotPreviewPayload}</pre>
        </section>
      {/if}
    </div>
  {/if}
</details>
