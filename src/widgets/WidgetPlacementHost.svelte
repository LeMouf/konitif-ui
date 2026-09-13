<script context="module" lang="ts">
  import type { ComponentType, SvelteComponent } from 'svelte';
  import type {
    RegisteredWorkbenchWidget,
    RegisteredWorkbenchWidgetComponentModule
  } from '@konitif/workbench';

  type WorkbenchWidgetResolvedComponent = ComponentType<SvelteComponent>;

  // A registration owns its binding. Equal definition IDs do not imply equal implementations.
  // Registry replacement creates a new entry; existing occurrences still share one pending load.
  const workbenchWidgetComponentCache = new WeakMap<
    RegisteredWorkbenchWidget,
    WorkbenchWidgetResolvedComponent | Promise<WorkbenchWidgetResolvedComponent>
  >();

  function isWidgetComponentModule(value: unknown): value is RegisteredWorkbenchWidgetComponentModule {
    return !!value && typeof value === 'object' && 'default' in value;
  }

  function isPendingWorkbenchWidgetComponent(
    value: WorkbenchWidgetResolvedComponent | Promise<WorkbenchWidgetResolvedComponent>
  ): value is Promise<WorkbenchWidgetResolvedComponent> {
    return typeof (value as Promise<WorkbenchWidgetResolvedComponent>).then === 'function';
  }

  function readCachedWorkbenchWidgetComponent(
    entry: RegisteredWorkbenchWidget
  ): WorkbenchWidgetResolvedComponent | null {
    const cachedComponent = workbenchWidgetComponentCache.get(entry);

    return cachedComponent && !isPendingWorkbenchWidgetComponent(cachedComponent) ? cachedComponent : null;
  }

  function resolveLoadedWorkbenchWidgetComponent(value: unknown): WorkbenchWidgetResolvedComponent {
    return (isWidgetComponentModule(value) ? value.default : value) as WorkbenchWidgetResolvedComponent;
  }

  async function loadWorkbenchWidgetComponent(
    entry: RegisteredWorkbenchWidget
  ): Promise<WorkbenchWidgetResolvedComponent> {
    if (entry.component) {
      const resolvedComponent = resolveLoadedWorkbenchWidgetComponent(entry.component);
      workbenchWidgetComponentCache.set(entry, resolvedComponent);
      return resolvedComponent;
    }

    const cachedComponent = workbenchWidgetComponentCache.get(entry);

    if (cachedComponent) {
      return cachedComponent;
    }

    if (!entry.loadComponent) {
      throw new Error('Widget component is not registered.');
    }

    const pendingComponent = entry
      .loadComponent()
      .then((loadedComponent) => {
        const resolvedComponent = resolveLoadedWorkbenchWidgetComponent(loadedComponent);
        workbenchWidgetComponentCache.set(entry, resolvedComponent);

        return resolvedComponent;
      })
      .catch((error) => {
        workbenchWidgetComponentCache.delete(entry);
        throw error;
      });

    workbenchWidgetComponentCache.set(entry, pendingComponent);

    return pendingComponent;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import type {
    InMemoryWorkbenchWidgetRegistry,
    ResolvedWorkbenchWidgetZone,
    WorkbenchWidgetContext,
    WorkbenchWidgetPlacement
  } from '@konitif/workbench';
  import {
    createWorkbenchWidgetRuntimeContext,
    resolveWorkbenchReadingLevel,
    type WorkbenchReadingLevel
  } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import {
    getWorkbenchReadingLevelContext,
    setWorkbenchReadingLevelContext
  } from '../primitives/workbenchReadingLevelContext';

  export let resolvedZone: ResolvedWorkbenchWidgetZone | null = null;
  export let placement: WorkbenchWidgetPlacement | null = null;
  export let widgetRegistry: InMemoryWorkbenchWidgetRegistry | null = null;
  export let context: WorkbenchWidgetContext = {};

  const i18nT = getWorkbenchTranslator();
  const inheritedReadingLevelStore = getWorkbenchReadingLevelContext();
  const readingLevelStore = writable<WorkbenchReadingLevel>('casual');
  setWorkbenchReadingLevelContext(readingLevelStore);

  let resolvedWidgetEntry: RegisteredWorkbenchWidget | null = null;
  let resolvedWidgetComponent: ComponentType<SvelteComponent> | null = null;
  let widgetComponentLoading = false;
  let widgetComponentLoadError: string | null = null;
  let widgetComponentLoadToken = 0;

  $: zone = resolvedZone?.zone ?? null;
  $: activePlacement = placement ?? resolvedZone?.activePlacement ?? null;
  $: widgetEntry =
    activePlacement && widgetRegistry ? (widgetRegistry.get(activePlacement.widgetId) ?? null) : null;
  $: readingLevel = resolveWorkbenchReadingLevel(
    activePlacement?.state?.workbenchReadingLevel,
    widgetEntry?.definition.presentation?.readingLevel,
    $inheritedReadingLevelStore
  );
  $: readingLevelStore.set(readingLevel);
  $: runtime =
    zone && activePlacement
      ? createWorkbenchWidgetRuntimeContext({
          zone,
          placement: activePlacement,
          context,
          readingLevel
        })
      : null;
  $: if (widgetEntry !== resolvedWidgetEntry) {
    void resolveWidgetComponent(widgetEntry);
  }

  async function resolveWidgetComponent(entry: RegisteredWorkbenchWidget | null): Promise<void> {
    const token = widgetComponentLoadToken + 1;
    widgetComponentLoadToken = token;
    resolvedWidgetEntry = entry;
    resolvedWidgetComponent = entry
      ? entry.component
        ? resolveLoadedWorkbenchWidgetComponent(entry.component)
        : readCachedWorkbenchWidgetComponent(entry)
      : null;
    widgetComponentLoadError = null;

    if (!entry || resolvedWidgetComponent) {
      widgetComponentLoading = false;
      return;
    }

    widgetComponentLoading = true;

    try {
      const loadedComponent = await loadWorkbenchWidgetComponent(entry);

      if (token !== widgetComponentLoadToken) {
        return;
      }

      resolvedWidgetComponent = loadedComponent;
      widgetComponentLoading = false;
    } catch (error) {
      if (token !== widgetComponentLoadToken) {
        return;
      }

      resolvedWidgetComponent = null;
      widgetComponentLoading = false;
      widgetComponentLoadError = error instanceof Error ? error.message : 'Unable to load widget component.';
    }
  }

  onDestroy(() => {
    widgetComponentLoadToken += 1;
  });
</script>

{#if zone && activePlacement}
  <div
    class="widget-placement-host"
    data-widget-id={activePlacement.widgetId}
    data-workbench-reading-level={readingLevel}
  >
    {#if widgetEntry && runtime && resolvedWidgetComponent}
      <svelte:component this={resolvedWidgetComponent} definition={widgetEntry.definition} {runtime} />
    {:else}
      <div
        class:widget-placement-host__state--error={Boolean(widgetComponentLoadError) ||
          !widgetComponentLoading}
        class="widget-placement-host__state"
        role="status"
        aria-live="polite"
      >
        {#if widgetComponentLoading && !widgetComponentLoadError}
          <div class="widget-placement-host__skeleton" aria-hidden="true">
            <span class="widget-placement-host__skeleton-title"></span>
            <span></span>
            <span></span>
          </div>
          <span class="widget-placement-host__state-label">
            {$i18nT('ui.shell.widget.loading', {
              default: 'Loading {{title}}',
              values: { title: activePlacement.title }
            })}
          </span>
        {:else}
          <span class="widget-placement-host__state-label">
            {widgetComponentLoadError ??
              $i18nT('ui.shell.widget.unavailable', { default: 'Widget unavailable' })}
          </span>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .widget-placement-host {
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    container-name: workbench-surface;
    container-type: size;
  }

  .widget-placement-host > :global(*) {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
  }

  .widget-placement-host__state {
    display: grid;
    align-content: start;
    gap: var(--space-10, 0.62rem);
    height: 100%;
    min-height: 0;
    padding: var(--space-10, 0.62rem);
    color: var(--color-text-secondary, #9fb4ce);
    font-size: var(--font-size-label, 0.7rem);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .widget-placement-host__state--error {
    place-items: center;
    align-content: center;
  }

  .widget-placement-host__state-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .widget-placement-host__skeleton {
    display: grid;
    gap: var(--space-6, 0.38rem);
    width: 100%;
  }

  .widget-placement-host__skeleton span {
    display: block;
    width: 100%;
    height: 0.82rem;
    border-radius: var(--radius-sm, 0.25rem);
    background:
      linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--color-text-primary, #f3f7ff) 8%, transparent),
        transparent
      ),
      color-mix(in srgb, var(--color-background-muted, #132236) 72%, var(--color-background-surface, #0b1624));
    background-size: 220% 100%;
    animation: widget-placement-loading-shimmer 1.05s ease-in-out infinite;
  }

  .widget-placement-host__skeleton-title {
    width: 54%;
    height: 1.2rem;
  }

  @keyframes widget-placement-loading-shimmer {
    from {
      background-position: 180% 0;
    }

    to {
      background-position: -40% 0;
    }
  }
</style>
