<script context="module" lang="ts">
  import type { ComponentType, SvelteComponent } from 'svelte';
  import type { RegisteredShellWidget, RegisteredShellWidgetComponentModule } from '@konitif/workbench';

  type ShellWidgetResolvedComponent = ComponentType<SvelteComponent>;

  // Cache the registered binding, not its descriptive ID shared by unrelated registries.
  const shellWidgetComponentCache = new WeakMap<
    RegisteredShellWidget,
    ShellWidgetResolvedComponent | Promise<ShellWidgetResolvedComponent>
  >();

  function isWidgetComponentModule(value: unknown): value is RegisteredShellWidgetComponentModule {
    return !!value && typeof value === 'object' && 'default' in value;
  }

  function isPendingShellWidgetComponent(
    value: ShellWidgetResolvedComponent | Promise<ShellWidgetResolvedComponent>
  ): value is Promise<ShellWidgetResolvedComponent> {
    return typeof (value as Promise<ShellWidgetResolvedComponent>).then === 'function';
  }

  function readCachedShellWidgetComponent(entry: RegisteredShellWidget): ShellWidgetResolvedComponent | null {
    const cachedComponent = shellWidgetComponentCache.get(entry);

    return cachedComponent && !isPendingShellWidgetComponent(cachedComponent) ? cachedComponent : null;
  }

  function resolveLoadedShellWidgetComponent(value: unknown): ShellWidgetResolvedComponent {
    return (isWidgetComponentModule(value) ? value.default : value) as ShellWidgetResolvedComponent;
  }

  async function loadShellWidgetComponent(
    entry: RegisteredShellWidget
  ): Promise<ShellWidgetResolvedComponent> {
    if (entry.component) {
      const resolvedComponent = resolveLoadedShellWidgetComponent(entry.component);
      shellWidgetComponentCache.set(entry, resolvedComponent);
      return resolvedComponent;
    }

    const cachedComponent = shellWidgetComponentCache.get(entry);

    if (cachedComponent) {
      return cachedComponent;
    }

    if (!entry.loadComponent) {
      throw new Error('Widget component is not registered.');
    }

    const pendingComponent = entry
      .loadComponent()
      .then((loadedComponent) => {
        const resolvedComponent = resolveLoadedShellWidgetComponent(loadedComponent);
        shellWidgetComponentCache.set(entry, resolvedComponent);

        return resolvedComponent;
      })
      .catch((error) => {
        shellWidgetComponentCache.delete(entry);
        throw error;
      });

    shellWidgetComponentCache.set(entry, pendingComponent);

    return pendingComponent;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import type {
    InMemoryShellWidgetRegistry,
    InMemoryToolRegistry,
    DesignSystemThemeSession,
    JsonObject,
    ShellRegionId,
    Workspace,
    WorkspaceFocus
  } from '@konitif/workbench';
  import { createShellWidgetRuntimeContext } from '@konitif/workbench';
  import type { DesignSystemDiscoveryProjection } from './designSystemEntityDiscovery';
  import {
    getWorkbenchReadingLevelContext,
    setWorkbenchReadingLevelContext
  } from '../primitives/workbenchReadingLevelContext';

  export let regionId: ShellRegionId;
  export let widgetId: string;
  export let widgetRegistry: InMemoryShellWidgetRegistry;
  export let toolRegistry: InMemoryToolRegistry;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection | null = null;
  export let designSystemThemeSession: DesignSystemThemeSession | null = null;
  export let updateToolState: ((toolInstanceId: string, nextState: JsonObject) => boolean) | null = null;

  let resolvedWidgetEntry: RegisteredShellWidget | null = null;
  let resolvedWidgetComponent: ComponentType<SvelteComponent> | null = null;
  let widgetComponentLoading = false;
  let widgetComponentLoadError: string | null = null;
  let widgetComponentLoadToken = 0;
  const inheritedReadingLevelStore = getWorkbenchReadingLevelContext();
  const readingLevelStore = writable<'casual' | 'advanced' | 'expert'>('casual');
  setWorkbenchReadingLevelContext(readingLevelStore);

  $: widgetEntry = widgetRegistry.get(widgetId);
  $: runtime =
    widgetEntry &&
    createShellWidgetRuntimeContext({
      regionId,
      widgetId,
      workspace,
      focus,
      toolCatalog: toolRegistry,
      inheritedReadingLevel: $inheritedReadingLevelStore,
      updateToolState: updateToolState ?? undefined,
      designSystem: designSystemDiscoveryProjection
        ? {
            themeSession: designSystemThemeSession,
            entities: designSystemDiscoveryProjection.entities,
            relations: designSystemDiscoveryProjection.relations,
            totals: designSystemDiscoveryProjection.totals
          }
        : null
    });
  $: readingLevelStore.set(runtime?.readingLevel ?? $inheritedReadingLevelStore);
  $: if (widgetEntry !== resolvedWidgetEntry) {
    void resolveWidgetComponent(widgetEntry ?? null);
  }

  async function resolveWidgetComponent(entry: RegisteredShellWidget | null): Promise<void> {
    const token = widgetComponentLoadToken + 1;
    widgetComponentLoadToken = token;
    resolvedWidgetEntry = entry;
    resolvedWidgetComponent = entry
      ? entry.component
        ? resolveLoadedShellWidgetComponent(entry.component)
        : readCachedShellWidgetComponent(entry)
      : null;
    widgetComponentLoadError = null;

    if (!entry || resolvedWidgetComponent) {
      widgetComponentLoading = false;
      return;
    }

    widgetComponentLoading = true;

    try {
      const loadedComponent = await loadShellWidgetComponent(entry);

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

{#if widgetEntry && runtime}
  <div class="shell-widget-host">
    {#if resolvedWidgetComponent}
      <svelte:component this={resolvedWidgetComponent} definition={widgetEntry.definition} {runtime} />
    {:else}
      <div
        class:shell-widget-host__state--error={Boolean(widgetComponentLoadError) || !widgetComponentLoading}
        class="shell-widget-host__state"
        role="status"
        aria-live="polite"
      >
        {#if widgetComponentLoading && !widgetComponentLoadError}
          <div class="shell-widget-host__skeleton" aria-hidden="true">
            <span class="shell-widget-host__skeleton-title"></span>
            <span></span>
            <span></span>
            <span class="shell-widget-host__skeleton-short"></span>
          </div>
          <span class="shell-widget-host__state-label">Loading {widgetEntry.definition.title}</span>
        {:else}
          <span class="shell-widget-host__state-label"
            >{widgetComponentLoadError ?? 'Widget unavailable'}</span
          >
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .shell-widget-host {
    min-width: 0;
    min-height: 0;
    height: 100%;
    container-name: workbench-surface;
    container-type: size;
    background: color-mix(in srgb, var(--color-background-surface) 94%, var(--color-background-canvas));
  }

  .shell-widget-host__state {
    display: grid;
    align-content: start;
    gap: var(--space-10);
    height: 100%;
    min-height: 0;
    padding: var(--space-10);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .shell-widget-host__state--error {
    place-items: center;
    align-content: center;
  }

  .shell-widget-host__state-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell-widget-host__skeleton {
    display: grid;
    gap: var(--space-6);
    width: 100%;
  }

  .shell-widget-host__skeleton span {
    display: block;
    width: 100%;
    height: 0.82rem;
    border-radius: var(--radius-sm);
    background:
      linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--color-text-primary) 8%, transparent),
        transparent
      ),
      color-mix(in srgb, var(--color-background-muted) 72%, var(--color-background-surface));
    background-size: 220% 100%;
    animation: shell-widget-loading-shimmer 1.05s ease-in-out infinite;
  }

  .shell-widget-host__skeleton-title {
    width: 54%;
    height: 1.2rem;
  }

  .shell-widget-host__skeleton-short {
    width: 68%;
  }

  @keyframes shell-widget-loading-shimmer {
    from {
      background-position: 180% 0;
    }

    to {
      background-position: -40% 0;
    }
  }
</style>
