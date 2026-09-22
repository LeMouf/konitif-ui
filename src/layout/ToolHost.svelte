<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { createReferenceProjection } from './referenceProjection';
  import { createPanelPointerFocus } from './panelPointerFocus';
  import FullscreenCompanionFrame from './FullscreenCompanionFrame.svelte';
  import { companionLayoutStorageKey } from './fullscreenCompanionLayout';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import type {
    InMemoryToolRegistry,
    JsonObject,
    PanelNode,
    RegisteredTool,
    RegisteredToolComponentModule,
    ToolDefinition,
    ToolFullscreenCompanionDefinition,
    ToolInstance,
    ToolPanelLoadingState,
    ToolResourceLoadingState,
    ToolShellStatus,
    ToolRuntimeContext,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import {
    createToolRuntimeContext,
    normalizeToolPanelLoadingState,
    normalizeToolResourceLoadingState,
    normalizeToolShellStatus,
    resolveToolReadingLevel,
    resolveToolRuntimeCapabilitySnapshot,
    type ToolRuntimeCapabilityProjection,
    type WorkbenchReadingLevel
  } from '@konitif/workbench';
  import { getWorkbenchThemeRuntimeContext } from '../themes';
  import { projectLocalizedToolDefinition } from '../i18n/workbenchEntityTranslations';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import WorkbenchToolBadge from '../primitives/WorkbenchToolBadge.svelte';
  import {
    getWorkbenchReadingLevelContext,
    setWorkbenchReadingLevelContext
  } from '../primitives/workbenchReadingLevelContext';

  export let panel: PanelNode;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let panelLoading: ToolPanelLoadingState | null = null;
  export let layoutEditingEnabled = false;
  const PANEL_LOADING_EXIT_MS = 220;
  let displayedPanelLoading: ToolPanelLoadingState | null = null;
  let isPanelLoadingVisible = false;
  let panelLoadingExitTimer: ReturnType<typeof setTimeout> | null = null;
  let resolvedToolEntry: RegisteredTool | null = null;
  let resolvedToolComponent: ComponentType<SvelteComponent> | null = null;
  let toolComponentLoading = false;
  let toolComponentLoadError: string | null = null;
  let toolComponentLoadToken = 0;
  let resolvedCompanionEntries: Record<string, RegisteredTool | null> = {};
  let resolvedCompanionComponents: Record<string, ComponentType<SvelteComponent> | null> = {};
  let companionComponentLoadTokens: Record<string, symbol> = {};
  let companionStates: Record<string, JsonObject> = {};
  let companionPanelLoading: Record<string, ToolPanelLoadingState | null> = {};
  let companionResourceLoading: Record<string, ToolResourceLoadingState | null> = {};
  let companionShellStatus: Record<string, ToolShellStatus | null> = {};
  let companionComponentLoadErrors: Record<string, string | null> = {};
  const themeRuntimeContext = getWorkbenchThemeRuntimeContext();
  const i18nT = getWorkbenchTranslator();
  const inheritedReadingLevelStore = getWorkbenchReadingLevelContext();
  const readingLevelStore = writable<WorkbenchReadingLevel>('casual');
  setWorkbenchReadingLevelContext(readingLevelStore);

  let toolInstance: ToolInstance | null = null;
  let toolEntry: RegisteredTool | null = null;
  let capabilitySnapshot: ReturnType<typeof resolveToolRuntimeCapabilitySnapshot> | null = null;
  let runtime: ToolRuntimeContext | null = null;
  const projectCapabilities = createReferenceProjection<ReturnType<typeof resolveToolRuntimeCapabilitySnapshot> | null>();
  const projectRuntime = createReferenceProjection<ToolRuntimeContext | null>();

  $: {
    const next = panel.toolInstanceId ? workspace.toolInstances[panel.toolInstanceId] ?? null : null;
    if (toolInstance !== next) toolInstance = next;
  }
  $: {
    const next = toolInstance ? registry.get(toolInstance.toolId) ?? null : null;
    if (toolEntry !== next) toolEntry = next;
  }
  $: localizedToolDefinition = toolEntry
    ? projectLocalizedToolDefinition($i18nT, toolEntry.definition)
    : null;
  $: readingLevel =
    toolEntry && toolInstance
      ? resolveToolReadingLevel(toolEntry.definition, toolInstance, $inheritedReadingLevelStore)
      : $inheritedReadingLevelStore;
  $: readingLevelStore.set(readingLevel);
  $: ThemeSurfaceFrame = themeRuntimeContext.getRuntime().SurfaceFrame;
  $: {
    const registeredDefinitions = registry.list().map((entry) => entry.definition);
    const next = projectCapabilities([toolEntry?.definition, workspace, focus, ...registeredDefinitions], () => toolEntry
    ? resolveToolRuntimeCapabilitySnapshot({
        consumerDefinition: toolEntry.definition,
        registeredDefinitions,
        workspace,
        focus
      })
    : null);
    if (capabilitySnapshot !== next) capabilitySnapshot = next;
  }
  $: {
    const next = projectRuntime([
      toolInstance?.id, panel.id, focus, toolRuntimeHost, layoutEditingEnabled,
      readingLevel, capabilitySnapshot, requestToolCapability,
    ], () => toolInstance ? createToolRuntimeContext({
      panelId: panel.id,
      toolInstanceId: toolInstance.id,
      focus,
      hostActions: toolRuntimeHost,
      layoutEditingEnabled,
      readingLevel,
      capabilities: capabilitySnapshot ?? undefined,
      requestCapability: requestToolCapability
    }) : null);
    if (runtime !== next) runtime = next;
  }
  $: componentRuntime = runtime as ToolRuntimeContext | null;
  $: if (toolEntry !== resolvedToolEntry) {
    void resolveToolComponent(toolEntry ?? null);
  }
  $: fullscreenCompanions =
    workspace.fullscreenPanelId === panel.id
      ? resolveActiveFullscreenCompanions(toolEntry?.definition.fullscreenCompanions ?? [])
      : [];
  $: syncFullscreenCompanions(fullscreenCompanions);
  $: syncDisplayedPanelLoading(panelLoading);

  function isToolComponentModule(value: unknown): value is RegisteredToolComponentModule {
    return !!value && typeof value === 'object' && 'default' in value;
  }

  function resolveRegisteredToolComponent(value: unknown): ComponentType<SvelteComponent> {
    return value as ComponentType<SvelteComponent>;
  }

  async function resolveToolComponent(entry: RegisteredTool | null): Promise<void> {
    const token = toolComponentLoadToken + 1;
    toolComponentLoadToken = token;
    resolvedToolEntry = entry;
    resolvedToolComponent = entry?.component ? resolveRegisteredToolComponent(entry.component) : null;
    toolComponentLoadError = null;

    if (!entry || entry.component) {
      toolComponentLoading = false;
      return;
    }

    if (!entry.loadComponent) {
      toolComponentLoading = false;
      toolComponentLoadError = 'Tool component is not registered.';
      return;
    }

    toolComponentLoading = true;

    try {
      const loadedComponent = await entry.loadComponent();

      if (token !== toolComponentLoadToken) {
        return;
      }

      resolvedToolComponent = isToolComponentModule(loadedComponent)
        ? resolveRegisteredToolComponent(loadedComponent.default)
        : resolveRegisteredToolComponent(loadedComponent);
      toolComponentLoading = false;
    } catch (error) {
      if (token !== toolComponentLoadToken) {
        return;
      }

      resolvedToolComponent = null;
      toolComponentLoading = false;
      toolComponentLoadError = error instanceof Error ? error.message : 'Unable to load tool component.';
    }
  }

  function resolveCompanionKey(companion: ToolFullscreenCompanionDefinition): string {
    // Ephemeral display binding, not the canonical identity of the source tool.
    // A new owner/source must not inherit the old component's state or resources.
    return JSON.stringify([
      panel.id,
      toolInstance?.id ?? null,
      companion.id,
      companion.toolId,
      companion.mode,
      findCompanionSourceInstance(companion.toolId)?.id ?? null
    ]);
  }

  function resolveActiveFullscreenCompanions(
    companions: ToolFullscreenCompanionDefinition[]
  ): ToolFullscreenCompanionDefinition[] {
    return companions.filter((companion) => resolveFullscreenCompanionEnabled(companion));
  }

  function resolveFullscreenCompanionEnabled(companion: ToolFullscreenCompanionDefinition): boolean {
    const activation = companion.activation;

    if (!activation) {
      return true;
    }

    const sourceState = findCompanionSourceState(companion.toolId);
    const enabled = sourceState?.[activation.sourceStateKey];

    if (typeof enabled === 'boolean') {
      return enabled;
    }

    return activation.defaultEnabled === true;
  }

  function syncFullscreenCompanions(companions: ToolFullscreenCompanionDefinition[]): void {
    const nextKeys = new Set(companions.map(resolveCompanionKey));

    for (const key of Object.keys(resolvedCompanionEntries)) {
      if (nextKeys.has(key)) {
        continue;
      }

      delete resolvedCompanionEntries[key];
      delete resolvedCompanionComponents[key];
      delete companionComponentLoadTokens[key];
      delete companionStates[key];
      delete companionPanelLoading[key];
      delete companionResourceLoading[key];
      delete companionShellStatus[key];
      delete companionComponentLoadErrors[key];
    }

    for (const companion of companions) {
      const key = resolveCompanionKey(companion);
      const entry = registry.get(companion.toolId) ?? null;

      if (resolvedCompanionEntries[key] !== entry) {
        void resolveCompanionComponent(key, entry);
      }

      if (!companionStates[key] && entry) {
        companionStates = {
          ...companionStates,
          [key]: createCompanionInitialState(entry.definition, companion)
        };
      } else if (companionStates[key]) {
        syncCompanionSourceState(key, companion);
      }
    }
  }

  async function resolveCompanionComponent(key: string, entry: RegisteredTool | null): Promise<void> {
    // A removed/reopened companion must never reuse an old request identity.
    const token = Symbol(key);
    companionComponentLoadTokens = {
      ...companionComponentLoadTokens,
      [key]: token
    };
    companionComponentLoadErrors = { ...companionComponentLoadErrors, [key]: null };
    companionPanelLoading = { ...companionPanelLoading, [key]: null };
    companionResourceLoading = { ...companionResourceLoading, [key]: null };
    companionShellStatus = { ...companionShellStatus, [key]: null };
    resolvedCompanionEntries = {
      ...resolvedCompanionEntries,
      [key]: entry
    };
    resolvedCompanionComponents = {
      ...resolvedCompanionComponents,
      [key]: entry?.component ? resolveRegisteredToolComponent(entry.component) : null
    };

    if (!entry || entry.component || !entry.loadComponent) {
      return;
    }

    try {
      const loadedComponent = await entry.loadComponent();

      if (companionComponentLoadTokens[key] !== token) {
        return;
      }

      resolvedCompanionComponents = {
        ...resolvedCompanionComponents,
        [key]: isToolComponentModule(loadedComponent)
          ? resolveRegisteredToolComponent(loadedComponent.default)
          : resolveRegisteredToolComponent(loadedComponent)
      };
    } catch (error) {
      if (companionComponentLoadTokens[key] !== token) {
        return;
      }

      resolvedCompanionComponents = {
        ...resolvedCompanionComponents,
        [key]: null
      };
      companionComponentLoadErrors = { ...companionComponentLoadErrors,
        [key]: error instanceof Error ? error.message : 'Unable to load tool component.' };
    }
  }

  function createCompanionInitialState(
    definition: ToolDefinition,
    companion: ToolFullscreenCompanionDefinition
  ): JsonObject {
    const sourceState = findCompanionSourceState(companion.toolId) ?? definition.initialState;

    return {
      ...structuredCloneJsonObject(sourceState),
      __toolOverlayMode: companion.mode,
      __toolOverlayCompanionId: companion.id,
      __toolOverlayHostToolId: toolEntry?.definition.id ?? null
    };
  }

  function findCompanionSourceState(toolId: string): JsonObject | null {
    return findCompanionSourceInstance(toolId)?.state ?? null;
  }

  function findCompanionSourceInstance(toolId: string): ToolInstance | null {
    return Object.values(workspace.toolInstances).find((candidate) => candidate.toolId === toolId) ?? null;
  }

  function syncCompanionSourceState(key: string, companion: ToolFullscreenCompanionDefinition): void {
    const currentState = companionStates[key];
    const sourceState = findCompanionSourceState(companion.toolId);
    const sourceStateKeys = companion.sourceStateKeys ?? [];

    if (!currentState || !sourceState || sourceStateKeys.length === 0) {
      return;
    }

    let nextState = currentState;

    for (const stateKey of sourceStateKeys) {
      const sourceValue = sourceState[stateKey];

      if (Object.is(nextState[stateKey], sourceValue)) {
        continue;
      }

      nextState = { ...nextState };

      if (sourceValue === undefined) {
        delete nextState[stateKey];
      } else {
        nextState[stateKey] = sourceValue;
      }
    }

    if (nextState !== currentState) {
      companionStates = {
        ...companionStates,
        [key]: nextState
      };
    }
  }

  function structuredCloneJsonObject(value: JsonObject): JsonObject {
    return JSON.parse(JSON.stringify(value)) as JsonObject;
  }

  function resolveCompanionInstance(
    companion: ToolFullscreenCompanionDefinition,
    definition: ToolDefinition
  ): ToolInstance {
    const key = resolveCompanionKey(companion);
    const state = companionStates[key] ?? createCompanionInitialState(definition, companion);

    return {
      id: `fullscreen-companion:${key}`,
      toolId: definition.id,
      state,
      panelTitleOverride: null,
      shellState: {
        status: definition.shell?.initialStatus ?? null
      }
    };
  }

  function resolveCompanionRuntime(companion: ToolFullscreenCompanionDefinition): ToolRuntimeContext {
    const key = resolveCompanionKey(companion);
    const bindingToken = companionComponentLoadTokens[key];
    const isCurrentBinding = () => bindingToken !== undefined && companionComponentLoadTokens[key] === bindingToken;
    const toolInstanceId = `fullscreen-companion:${key}`;
    const localHostActions: ToolRuntimeHostActions = {
      updateToolState(_toolInstanceId, nextState) {
        const sourceInstance = findCompanionSourceInstance(companion.toolId);
        const sourceStateKeys = companion.sourceStateKeys ?? [];

        if (sourceInstance && sourceStateKeys.length > 0) {
          const nextSourceState = { ...sourceInstance.state };
          let sourceStateChanged = false;

          for (const stateKey of sourceStateKeys) {
            const nextValue = nextState[stateKey];

            if (Object.is(nextSourceState[stateKey], nextValue)) {
              continue;
            }

            sourceStateChanged = true;

            if (nextValue === undefined) {
              delete nextSourceState[stateKey];
            } else {
              nextSourceState[stateKey] = nextValue;
            }
          }

          if (sourceStateChanged) {
            toolRuntimeHost.updateToolState(sourceInstance.id, nextSourceState);
          }
        }

        companionStates = {
          ...companionStates,
          [key]: nextState
        };
        return true;
      },
      setToolPanelTitleOverride() {
        return false;
      },
      setToolShellStatus(_toolInstanceId, nextStatus) {
        if (!isCurrentBinding()) return false;
        const next = normalizeToolShellStatus(nextStatus);
        if (JSON.stringify(companionShellStatus[key]) !== JSON.stringify(next))
          companionShellStatus = { ...companionShellStatus, [key]: next };
        return true;
      },
      setToolPanelLoading(_toolInstanceId, nextLoading) {
        if (!isCurrentBinding()) return false;
        const next = normalizeToolPanelLoadingState(nextLoading);
        if (JSON.stringify(companionPanelLoading[key]) !== JSON.stringify(next))
          companionPanelLoading = { ...companionPanelLoading, [key]: next };
        return true;
      },
      setToolResourceLoading(_toolInstanceId, nextLoading) {
        if (!isCurrentBinding()) return false;
        const next = normalizeToolResourceLoadingState(nextLoading);
        if (JSON.stringify(companionResourceLoading[key]) !== JSON.stringify(next))
          companionResourceLoading = { ...companionResourceLoading, [key]: next };
        return true;
      },
      runToolCommand() {
        return false;
      },
      openTool(toolId) {
        return toolRuntimeHost.openTool(toolId);
      },
      canUndoHistory() {
        return toolRuntimeHost.canUndoHistory();
      },
      canRedoHistory() {
        return toolRuntimeHost.canRedoHistory();
      },
      undoHistory() {
        return toolRuntimeHost.undoHistory();
      },
      redoHistory() {
        return toolRuntimeHost.redoHistory();
      },
      patchRuntimeProjectionSession(patch) {
        return toolRuntimeHost.patchRuntimeProjectionSession?.(patch) ?? false;
      }
    };

    const companionCapabilitySnapshot = resolveCompanionCapabilitySnapshot(companion);

    return createToolRuntimeContext({
      panelId: panel.id,
      toolInstanceId,
      focus,
      hostActions: localHostActions,
      layoutEditingEnabled: false,
      readingLevel: companionEntryReadingLevel(companion),
      capabilities: companionCapabilitySnapshot,
      requestCapability: (capabilityId) =>
        requestCapabilityProjection(companionCapabilitySnapshot?.get(capabilityId) ?? null)
    });
  }

  function resolveCompanionCapabilitySnapshot(companion: ToolFullscreenCompanionDefinition) {
    const entry = resolvedCompanionEntries[resolveCompanionKey(companion)];

    return entry
      ? resolveToolRuntimeCapabilitySnapshot({
          consumerDefinition: entry.definition,
          registeredDefinitions: registry.list().map((candidate) => candidate.definition),
          workspace,
          focus
        })
      : undefined;
  }

  function requestToolCapability(capabilityId: string): boolean {
    const projection = capabilitySnapshot?.get(capabilityId) ?? null;
    return requestCapabilityProjection(projection);
  }

  function requestCapabilityProjection(projection: ToolRuntimeCapabilityProjection | null): boolean {
    if (!projection) {
      return false;
    }

    const mountedProvider = projection.providers.find(
      (provider) => provider.availability === 'active' || provider.availability === 'mounted'
    );
    const mountedPanelId = mountedProvider?.panelIds[0];

    if (mountedPanelId) {
      dispatchCommand({ type: 'focus-panel', panelId: mountedPanelId });
      return true;
    }

    const availableProvider = projection.providers.find((provider) => provider.availability === 'available');

    if (!availableProvider) {
      return false;
    }

    dispatchCommand({ type: 'open-tool', toolId: availableProvider.toolId });
    return true;
  }

  function companionEntryReadingLevel(companion: ToolFullscreenCompanionDefinition): WorkbenchReadingLevel {
    const entry = resolvedCompanionEntries[resolveCompanionKey(companion)];
    const instance = entry ? resolveCompanionInstance(companion, entry.definition) : null;
    return entry && instance
      ? resolveToolReadingLevel(entry.definition, instance, $inheritedReadingLevelStore)
      : $inheritedReadingLevelStore;
  }

  const pointerFocus = createPanelPointerFocus({
    read: () => ({ panelId: panel.id, activePanelId: focus.activePanelId }),
    focus: panelId => dispatchCommand({ type: 'focus-panel', panelId }),
    schedule: callback => {
      const timer = setTimeout(callback, 0);
      return () => clearTimeout(timer);
    }
  });

  function focusPanel(): void {
    pointerFocus.request();
  }

  function syncDisplayedPanelLoading(nextLoading: ToolPanelLoadingState | null): void {
    if (nextLoading) {
      clearPanelLoadingExitTimer();
      displayedPanelLoading = nextLoading;
      isPanelLoadingVisible = true;
      return;
    }

    if (!displayedPanelLoading || !isPanelLoadingVisible) {
      displayedPanelLoading = null;
      isPanelLoadingVisible = false;
      return;
    }

    clearPanelLoadingExitTimer();
    isPanelLoadingVisible = false;
    panelLoadingExitTimer = setTimeout(() => {
      displayedPanelLoading = null;
      panelLoadingExitTimer = null;
    }, PANEL_LOADING_EXIT_MS);
  }

  function clearPanelLoadingExitTimer(): void {
    if (panelLoadingExitTimer === null) {
      return;
    }

    clearTimeout(panelLoadingExitTimer);
    panelLoadingExitTimer = null;
  }

  onDestroy(() => {
    pointerFocus.dispose();
    toolComponentLoadToken += 1;
    companionComponentLoadTokens = {};
    clearPanelLoadingExitTimer();
  });
</script>

{#if toolEntry && toolInstance}
  <div
    class:tool-host--loading={!!displayedPanelLoading}
    class:tool-host--loading-visible={isPanelLoadingVisible}
    class="tool-host"
    data-workbench-interactive="tool"
    data-workbench-reading-level={readingLevel}
    aria-busy={displayedPanelLoading ? 'true' : undefined}
    on:pointerdown|capture={focusPanel}
  >
    <svelte:component
      this={ThemeSurfaceFrame}
      id={`tool.${toolInstance.id}`}
      role="tool"
      depth={focus.activePanelId === panel.id ? 'active' : 'workspace'}
      active={focus.activePanelId === panel.id}
      focusStrength={0.94}
      class="tool-host__surface"
      inert={displayedPanelLoading ? true : undefined}
    >
      {#if resolvedToolComponent}
        {#key toolInstance.id}
          <svelte:component
            this={resolvedToolComponent}
            definition={localizedToolDefinition ?? toolEntry.definition}
            instance={toolInstance}
            runtime={componentRuntime}
          />
        {/key}
      {:else}
        <div class="tool-host__component-state" role="status" aria-live="polite">
          <WorkbenchToolBadge />
          <span>{toolComponentLoadError ?? (toolComponentLoading ? 'Loading tool' : 'Tool unavailable')}</span
          >
        </div>
      {/if}
    </svelte:component>

    {#if displayedPanelLoading}
      <div class:tool-host__loading-layer--visible={isPanelLoadingVisible} class="tool-host__loading-layer">
        <svelte:component
          this={ThemeSurfaceFrame}
          id={`tool.${toolInstance.id}.loading`}
          role="overlay"
          depth="overlay"
          active={isPanelLoadingVisible}
          focusStrength={0.9}
          class="tool-host__loading-card"
          ariaRole="status"
          aria-live="polite"
        >
          <div class="tool-host__loading-illustration" aria-hidden="true">
            <span class="tool-host__loading-orbit tool-host__loading-orbit--outer"></span>
            <span class="tool-host__loading-orbit tool-host__loading-orbit--inner"></span>
            <span class="tool-host__loading-core"></span>
          </div>
          <strong class="tool-host__loading-label">{displayedPanelLoading.label}</strong>
          {#if displayedPanelLoading.detail}
            <span class="tool-host__loading-detail">{displayedPanelLoading.detail}</span>
          {/if}
        </svelte:component>
      </div>
    {/if}

    {#each fullscreenCompanions as companion (resolveCompanionKey(companion))}
      {@const companionKey = resolveCompanionKey(companion)}
      {@const companionEntry = resolvedCompanionEntries[companionKey]}
      {@const CompanionComponent = resolvedCompanionComponents[companionKey]}
      {@const localizedCompanionDefinition = companionEntry
        ? projectLocalizedToolDefinition($i18nT, companionEntry.definition)
        : null}
      {#if companionEntry}
        <FullscreenCompanionFrame
          {companion}
          layoutKey={companionLayoutStorageKey(workspace.id, toolInstance?.id ?? panel.id, companion.id)}
          label={`${localizedCompanionDefinition?.title ?? companionEntry.definition.title} preview`}
          componentPending={!CompanionComponent && !companionComponentLoadErrors[companionKey]}
          loadingError={companionComponentLoadErrors[companionKey]}
          loading={companionPanelLoading[companionKey] ?? companionResourceLoading[companionKey] ?? null}
          loadingStage={companionPanelLoading[companionKey] ? 'panel' : 'resource'}
          status={companionShellStatus[companionKey] ?? null}
        >
          {#if CompanionComponent}
            <svelte:component
              this={CompanionComponent}
              definition={localizedCompanionDefinition ?? companionEntry.definition}
              instance={resolveCompanionInstance(companion, companionEntry.definition)}
              runtime={resolveCompanionRuntime(companion)}
            />
          {/if}
        </FullscreenCompanionFrame>
      {/if}
    {/each}
  </div>
{:else}
  <div
    class:tool-host--empty-layout-edit={layoutEditingEnabled}
    class:tool-host--empty-runtime={!layoutEditingEnabled}
    class="tool-host tool-host--empty"
    data-workbench-interactive="tool"
    on:pointerdown|capture={focusPanel}
  >
    <div class="tool-host__empty-state" aria-hidden="true">
      <WorkbenchToolBadge />
    </div>
  </div>
{/if}

<style>
  .tool-host {
    position: relative;
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: 100%;
    container-name: workbench-surface;
    container-type: size;
  }

  :global(.tool-host__surface) {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    transition:
      filter 220ms ease,
      opacity 220ms ease;
  }

  :global(.tool-host__surface > *) {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
  }

  .tool-host--loading :global(.tool-host__surface) {
    filter: blur(10px) saturate(0.82);
    opacity: 0.72;
    pointer-events: none;
  }

  .tool-host__component-state {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-10);
    width: 100%;
    height: 100%;
    min-height: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tool-host--empty {
    position: relative;
    align-items: center;
    justify-content: center;
    padding: var(--space-24);
    background: var(--color-background-surface);
  }

  .tool-host--empty-layout-edit {
    background: repeating-linear-gradient(
      -45deg,
      var(--color-background-empty-panel),
      var(--color-background-empty-panel) 0.65rem,
      var(--color-background-empty-panel-stripe) 0.65rem,
      var(--color-background-empty-panel-stripe) 1.3rem
    );
  }

  .tool-host--empty-runtime {
    background:
      radial-gradient(
        circle at center,
        color-mix(in srgb, var(--color-background-muted) 42%, transparent),
        transparent 52%
      ),
      var(--color-background-surface);
  }

  .tool-host__empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .tool-host__loading-layer {
    position: absolute;
    inset: 0;
    z-index: 12;
    display: grid;
    place-items: center;
    padding: var(--space-20);
    background: radial-gradient(
      circle at center,
      color-mix(in srgb, var(--color-background-overlay) 28%, transparent),
      transparent 62%
    );
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 220ms ease,
      backdrop-filter 220ms ease;
  }

  .tool-host__loading-layer--visible {
    backdrop-filter: blur(3px);
    opacity: 1;
  }

  :global(.tool-host__loading-card) {
    display: grid;
    place-items: center;
    gap: var(--space-10);
    width: min(20rem, calc(100% - 2rem));
    min-height: 16rem;
    padding: var(--space-20);
    border: 1px solid color-mix(in srgb, var(--color-border-focus) 32%, transparent);
    border-radius: var(--radius-large, 0.75rem);
    text-align: center;
    background:
      radial-gradient(
        circle at 50% 28%,
        color-mix(in srgb, var(--color-border-focus) 14%, transparent),
        transparent 58%
      ),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-background-overlay) 90%, transparent),
        color-mix(in srgb, var(--color-background-elevated) 96%, transparent)
      );
    box-shadow:
      0 1.5rem 3.5rem color-mix(in srgb, black 32%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 5%, transparent);
    transform: translateY(0.35rem) scale(0.985);
    transition: transform 220ms ease;
  }

  .tool-host__loading-layer--visible :global(.tool-host__loading-card) {
    transform: translateY(0) scale(1);
  }

  .tool-host__loading-illustration {
    position: relative;
    width: 4.6rem;
    height: 4.6rem;
  }

  .tool-host__loading-orbit,
  .tool-host__loading-core {
    position: absolute;
    inset: 0;
    border-radius: 999px;
  }

  .tool-host__loading-orbit--outer {
    border: 1px solid color-mix(in srgb, var(--color-border-focus) 34%, transparent);
    border-top-color: color-mix(in srgb, var(--color-border-focus) 88%, transparent);
    animation: tool-host-spin 1.35s linear infinite;
  }

  .tool-host__loading-orbit--inner {
    inset: 0.55rem;
    border: 1px dashed color-mix(in srgb, var(--color-border-subtle) 76%, transparent);
    animation: tool-host-spin-reverse 1.9s linear infinite;
  }

  .tool-host__loading-core {
    inset: 1.45rem;
    background: radial-gradient(
      circle at 35% 35%,
      color-mix(in srgb, var(--color-border-focus) 92%, white),
      color-mix(in srgb, var(--color-border-focus) 38%, transparent)
    );
    box-shadow:
      0 0 0 0.3rem color-mix(in srgb, var(--color-border-focus) 10%, transparent),
      0 0 2.2rem color-mix(in srgb, var(--color-border-focus) 18%, transparent);
    animation: tool-host-pulse 1.4s ease-in-out infinite;
  }

  .tool-host__loading-label {
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-weight: 600;
  }

  .tool-host__loading-detail {
    max-width: 22rem;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    line-height: 1.45;
  }

  @keyframes tool-host-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes tool-host-spin-reverse {
    to {
      transform: rotate(-360deg);
    }
  }

  @keyframes tool-host-pulse {
    0%,
    100% {
      transform: scale(0.92);
      opacity: 0.86;
    }

    50% {
      transform: scale(1.06);
      opacity: 1;
    }
  }
</style>
