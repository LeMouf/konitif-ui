<script lang="ts">
  import type { RuntimeProjectionSessionEntry, WorkbenchRuntimeSnapshot } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import {
    createRuntimeEventKey,
    formatRuntimeEventJson,
    formatRuntimeEventPayload,
    resolveRuntimeProjectionTarget,
    type RuntimeProjectionTarget,
    type RuntimeProjectionViewerOption
  } from './runtimeObservability';

  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let runtimeFooterEvents: WorkbenchRuntimeSnapshot['events'] = [];
  export let runtimeFooterCapabilities: string[] = [];
  export let runtimeFooterProjectionCatalog: WorkbenchRuntimeSnapshot['projectionCatalog'] = [];
  export let runtimeProjectionViewerOptionsByKind: Record<string, RuntimeProjectionViewerOption[]> = {};
  export let runtimeProjectionSessionEntries: RuntimeProjectionSessionEntry[] = [];
  export let selectedRuntimeEvent: WorkbenchRuntimeSnapshot['events'][number] | null = null;
  export let selectedRuntimeEventPayload = '';
  export let selectedRuntimeEventKey: string | null = null;
  export let onOpenRuntimeProjection: (
    target?: RuntimeProjectionTarget | null,
    viewerId?: string | null
  ) => Promise<void> | void = () => {};

  const i18nT = getWorkbenchTranslator();

  $: runtimeStores = runtimeSnapshot?.stores ?? [];
  $: runtimeServices = runtimeSnapshot?.services ?? [];
  $: runtimeManagers = runtimeSnapshot?.managers ?? [];
  $: runtimeDebugEvents = runtimeSnapshot?.debugEvents ?? [];
  $: runtimeStackTraces = runtimeSnapshot?.stackTraces ?? [];
</script>

<section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.inspectables', { default: 'Runtime Core' })}</h4>
    </header>
    {#if runtimeStores.length || runtimeServices.length || runtimeManagers.length}
      <div class="app-shell__footer-runtime-inspectables">
        {#each runtimeStores as store (store.id)}
          <article>
            <div>
              <strong>{store.label}</strong>
              <span>{store.status}</span>
            </div>
            <p>{store.scope} · {store.id}</p>
            <pre>{formatRuntimeEventJson(store.value)}</pre>
          </article>
        {/each}
        {#each runtimeServices as service (service.id)}
          <article>
            <div>
              <strong>{service.label}</strong>
              <span>{service.status}</span>
            </div>
            <p>{service.capabilities.join(', ') || service.endpoint || service.id}</p>
            {#if service.lastError}
              <p class="app-shell__footer-runtime-session-error">{service.lastError}</p>
            {/if}
          </article>
        {/each}
        {#each runtimeManagers as manager (manager.id)}
          <article>
            <div>
              <strong>{manager.label}</strong>
              <span>{manager.status}</span>
            </div>
            <p>{manager.responsibilities.join(', ') || manager.id}</p>
            {#if manager.lastError}
              <p class="app-shell__footer-runtime-session-error">{manager.lastError}</p>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noInspectables', { default: 'No runtime stores, services, or managers registered yet.' })}</div>
  {/if}
</section>

<style>
  .app-shell__footer-help-menu-section {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-section-title {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-label);
  }

  .app-shell__footer-help-menu-empty {
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-align: center;
  }

  .app-shell__footer-runtime-events,
  .app-shell__footer-runtime-stack-traces,
  .app-shell__footer-runtime-sessions,
  .app-shell__footer-runtime-inspectables,
  .app-shell__footer-runtime-projectors,
  .app-shell__footer-runtime-shared-state {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-runtime-event,
  .app-shell__footer-runtime-stack-traces article,
  .app-shell__footer-runtime-session,
  .app-shell__footer-runtime-inspectables article,
  .app-shell__footer-runtime-projectors article,
  .app-shell__footer-runtime-shared-state-entry {
    display: grid;
    gap: var(--space-6);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-surface-raised) 74%, transparent);
  }

  .app-shell__footer-runtime-event div,
  .app-shell__footer-runtime-stack-traces article div,
  .app-shell__footer-runtime-session > div,
  .app-shell__footer-runtime-inspectables article div,
  .app-shell__footer-runtime-projectors article div,
  .app-shell__footer-runtime-shared-state-entry div,
  .app-shell__footer-runtime-payload-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .app-shell__footer-runtime-event strong,
  .app-shell__footer-runtime-stack-traces strong,
  .app-shell__footer-runtime-session strong,
  .app-shell__footer-runtime-inspectables strong,
  .app-shell__footer-runtime-projectors strong,
  .app-shell__footer-runtime-shared-state-entry strong,
  .app-shell__footer-runtime-payload strong {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-shell__footer-runtime-event p,
  .app-shell__footer-runtime-session p,
  .app-shell__footer-runtime-inspectables p,
  .app-shell__footer-runtime-projectors span,
  .app-shell__footer-runtime-shared-state-entry p,
  .app-shell__footer-runtime-event time,
  .app-shell__footer-runtime-stack-traces time,
  .app-shell__footer-runtime-payload time {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-label);
  }

  .app-shell__footer-runtime-event pre,
  .app-shell__footer-runtime-stack-traces pre,
  .app-shell__footer-runtime-inspectables pre,
  .app-shell__footer-runtime-shared-state-entry pre,
  .app-shell__footer-runtime-payload pre {
    max-height: 220px;
    margin: 0;
    overflow: auto;
    padding: var(--space-8);
    border-radius: var(--radius-sm);
    background: var(--color-surface-inset);
    color: var(--color-text-secondary);
    font-size: 11px;
    line-height: 1.5;
  }

  .app-shell__footer-runtime-tags,
  .app-shell__footer-runtime-viewer-list,
  .app-shell__footer-runtime-session-actions,
  .app-shell__footer-runtime-event-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
  }

  .app-shell__footer-runtime-tags span,
  .app-shell__footer-runtime-session footer span,
  .app-shell__footer-runtime-session-status {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-pill);
    padding: 2px var(--space-6);
    color: var(--color-text-muted);
    font-size: 11px;
  }

  .app-shell__footer-runtime-session footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .app-shell__footer-runtime-event-action {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: 3px var(--space-8);
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .app-shell__footer-runtime-event-action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .app-shell__footer-runtime-event-action--selected,
  .app-shell__footer-runtime-event-action[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--color-layer-control) 70%, transparent);
    color: var(--color-text-primary);
  }

  .app-shell__footer-runtime-session-error,
  .app-shell__footer-runtime-projector-missing {
    color: var(--color-text-danger);
  }

  .app-shell__footer-runtime-payload {
    display: grid;
    gap: var(--space-6);
  }
</style>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.debugTimeline', { default: 'Debug Timeline' })}</h4>
    </header>
    {#if runtimeDebugEvents.length > 0}
      <div class="app-shell__footer-runtime-events">
        {#each runtimeDebugEvents as event (event.id)}
          <article class={`app-shell__footer-runtime-event app-shell__footer-runtime-debug--${event.level}`}>
            <div>
              <strong>{event.type}</strong>
              <time>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
            </div>
            <p>{event.message}</p>
            {#if event.payload !== undefined}
              <pre>{formatRuntimeEventJson(event.payload)}</pre>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noDebugEvents', { default: 'No debug events captured.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.stackTraceTitle', { default: 'Stack Traces' })}</h4>
    </header>
    {#if runtimeStackTraces.length > 0}
      <div class="app-shell__footer-runtime-stack-traces">
        {#each runtimeStackTraces as trace (trace.id)}
          <article>
            <div>
              <strong>{trace.message}</strong>
              <time>{new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
            </div>
            <pre>{trace.frames.join('\n')}</pre>
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noStackTraces', { default: 'No stack traces captured.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.capabilities', { default: 'Capabilities' })}</h4>
    </header>
    {#if runtimeFooterCapabilities.length > 0}
      <div class="app-shell__footer-runtime-tags">
        {#each runtimeFooterCapabilities as capability (capability)}
          <span>{capability}</span>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noCapabilities', { default: 'No backend capabilities available.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.projectors', { default: 'Projectors' })}</h4>
    </header>
    {#if runtimeFooterProjectionCatalog.length > 0}
      <div class="app-shell__footer-runtime-projectors">
        {#each runtimeFooterProjectionCatalog as projector (projector.projectionKind)}
          {@const viewerOptions = runtimeProjectionViewerOptionsByKind[projector.projectionKind] ?? []}
          {@const defaultSourceFile = projector.sources[0] ?? null}
          <article>
            <div class="app-shell__footer-runtime-projector-copy">
              <strong>{projector.projectionKind}</strong>
              <span>
                {$i18nT('ui.shell.runtime.sources', {
                  default: '{{count}} source{{plural}} · {{version}}',
                  values: {
                    count: projector.sources.length,
                    plural: projector.sources.length === 1 ? '' : 's',
                    version: projector.version
                  }
                })}
              </span>
            </div>
            {#if viewerOptions.length > 0}
              <div
                class="app-shell__footer-runtime-viewer-list"
                aria-label={$i18nT('ui.shell.runtime.compatibleViewers', {
                  default: 'Compatible viewers for {{projectionKind}}',
                  values: { projectionKind: projector.projectionKind }
                })}
              >
                {#each viewerOptions as viewer (viewer.id)}
                  <button
                    type="button"
                    class={`app-shell__footer-runtime-event-action${viewer.selected ? ' app-shell__footer-runtime-event-action--selected' : ''}`}
                    disabled={!defaultSourceFile}
                    title={viewer.summary}
                    on:click={() =>
                      defaultSourceFile &&
                      onOpenRuntimeProjection(
                        {
                          projectionKind: projector.projectionKind,
                          sourceFile: defaultSourceFile
                        },
                        viewer.id
                      )
                    }
                  >
                    {viewer.title}
                  </button>
                {/each}
              </div>
            {:else}
              <span class="app-shell__footer-runtime-projector-missing">{$i18nT('ui.shell.runtime.noCompatibleViewer', { default: 'No compatible viewer.' })}</span>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noProjectionCatalog', { default: 'No projection catalog available.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.sessions', { default: 'Sessions' })}</h4>
    </header>
    {#if runtimeProjectionSessionEntries.length > 0}
      <div class="app-shell__footer-runtime-sessions">
        {#each runtimeProjectionSessionEntries as session (session.key)}
          {@const sessionViewerOptions = runtimeProjectionViewerOptionsByKind[session.target.projectionKind] ?? []}
          <article class="app-shell__footer-runtime-session">
            <div>
              <strong>{session.viewerTitle}</strong>
              <span class={`app-shell__footer-runtime-session-status app-shell__footer-runtime-session-status--${session.status}`}>
                {session.status}
              </span>
            </div>
            <p>{session.target.projectionKind} · {session.target.sourceFile}</p>
            <footer>
              <span>
                {$i18nT('ui.shell.runtime.panels', {
                  default: '{{count}} panel{{plural}}',
                  values: { count: session.toolInstanceIds.length, plural: session.toolInstanceIds.length === 1 ? '' : 's' }
                })}
              </span>
              <span>{session.viewerId}</span>
              {#if session.selectedEntityId}
                <span>{$i18nT('ui.shell.runtime.selectedEntity', { default: 'Selected {{id}}', values: { id: session.selectedEntityId } })}</span>
              {/if}
              {#if session.focusedEntityId}
                <span>{$i18nT('ui.shell.runtime.focusedEntity', { default: 'Focus {{id}}', values: { id: session.focusedEntityId } })}</span>
              {/if}
              <span>{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </footer>
            {#if session.lastError}
              <p class="app-shell__footer-runtime-session-error">{session.lastError}</p>
            {/if}
            <div class="app-shell__footer-runtime-session-actions">
              <button
                type="button"
                class="app-shell__footer-runtime-event-action"
                on:click={() => onOpenRuntimeProjection(session.target, session.viewerId)}
              >
                {$i18nT('ui.shell.runtime.openActive', { default: 'Open active' })}
              </button>
              {#each sessionViewerOptions as viewer (viewer.id)}
                <button
                  type="button"
                  class={`app-shell__footer-runtime-event-action${viewer.id === session.viewerId ? ' app-shell__footer-runtime-event-action--selected' : ''}`}
                  title={viewer.summary}
                  on:click={() => onOpenRuntimeProjection(session.target, viewer.id)}
                >
                  {viewer.title}
                </button>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noSession', { default: 'No projection session opened yet.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.sharedState', { default: 'Shared State' })}</h4>
    </header>
    {#if runtimeSnapshot?.sharedState?.length}
      <div class="app-shell__footer-runtime-shared-state">
        {#each runtimeSnapshot.sharedState as entry (entry.key)}
          <article class="app-shell__footer-runtime-shared-state-entry">
            <div>
              <strong>{entry.key}</strong>
              <span>{entry.scope} · v{entry.version} · {entry.revision}</span>
            </div>
            <p>
              {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              {#if entry.originClientId}
                · {entry.originClientId}
              {/if}
            </p>
            <pre>{formatRuntimeEventJson(entry.value)}</pre>
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noSharedState', { default: 'No shared runtime state published yet.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.events', { default: 'Events' })}</h4>
    </header>
    {#if runtimeFooterEvents.length > 0}
      <div class="app-shell__footer-runtime-events">
        {#each runtimeFooterEvents as event (`${event.type}-${event.receivedAt}`)}
          {@const eventProjectionTarget = resolveRuntimeProjectionTarget(event.payload)}
          {@const eventKey = createRuntimeEventKey(event)}
          {@const eventViewerOptions = eventProjectionTarget ? runtimeProjectionViewerOptionsByKind[eventProjectionTarget.projectionKind] ?? [] : []}
          <article class="app-shell__footer-runtime-event">
            <div>
              <strong>{event.type}</strong>
              <span class="app-shell__footer-runtime-event-actions">
                <time>{new Date(event.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                <button
                  type="button"
                  class="app-shell__footer-runtime-event-action"
                  aria-pressed={selectedRuntimeEventKey === eventKey}
                  on:click={() => (selectedRuntimeEventKey = eventKey)}
                >
                  {$i18nT('ui.shell.runtime.inspect', { default: 'Inspect' })}
                </button>
                {#if eventProjectionTarget}
                  <button
                    type="button"
                    class="app-shell__footer-runtime-event-action"
                    title={eventProjectionTarget.sourceFile}
                    on:click={() => onOpenRuntimeProjection(eventProjectionTarget)}
                  >
                    {$i18nT('ui.shell.runtime.open', { default: 'Open' })}
                  </button>
                  {#if eventViewerOptions.length > 1}
                    {#each eventViewerOptions as viewer (viewer.id)}
                      <button
                        type="button"
                        class={`app-shell__footer-runtime-event-action${viewer.selected ? ' app-shell__footer-runtime-event-action--selected' : ''}`}
                        title={viewer.summary}
                        on:click={() => onOpenRuntimeProjection(eventProjectionTarget, viewer.id)}
                      >
                        {viewer.title}
                      </button>
                    {/each}
                  {/if}
                {/if}
              </span>
            </div>
            <p>{formatRuntimeEventPayload(event.payload)}</p>
          </article>
        {/each}
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noEvents', { default: 'No runtime events received.' })}</div>
    {/if}
  </section>

  <section class="app-shell__footer-help-menu-section">
    <header class="app-shell__footer-help-menu-section-header">
      <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.runtime.payload', { default: 'Payload' })}</h4>
    </header>
    {#if selectedRuntimeEvent}
      <div class="app-shell__footer-runtime-payload">
        <div class="app-shell__footer-runtime-payload-header">
          <strong>{selectedRuntimeEvent.type}</strong>
          <time>{new Date(selectedRuntimeEvent.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
        </div>
        <pre>{selectedRuntimeEventPayload}</pre>
      </div>
    {:else}
      <div class="app-shell__footer-help-menu-empty">{$i18nT('ui.shell.runtime.noPayload', { default: 'No payload selected.' })}</div>
    {/if}
  </section>
