<script lang="ts">
  import type {
    DesignSystemThemeSession,
    InMemoryShellWidgetRegistry,
    InMemoryToolRegistry,
    JsonObject,
    ShellRegionId,
    ShellRegionAxis,
    ShellRegionPresentation,
    ShellWidgetPlacement,
    ShellState,
    Workspace,
    WorkspaceFocus
  } from '@konitif/workbench';
  import { getWorkbenchThemeRuntimeContext } from '../../themes';
  import ResizeHandle from '../../layout/ResizeHandle.svelte';
  import ShellRegion from '../ShellRegion.svelte';
  import ShellWidgetDragPreview from '../ShellWidgetDragPreview.svelte';
  import ShellRegionWidgetPicker from '../ShellRegionWidgetPicker.svelte';
  import type { DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';
  import {
    refreshShellRegionEmptyPickerCandidates,
    type ShellRegionEmptyCandidate,
    type ShellRegionEmptyPickerRequest
  } from '../shellRegionWidgetPicker';

  type ShellRegionResizeHint = {
    regionId: ShellRegionId;
    active: boolean;
    near: boolean;
    thresholdPx: number;
  };

  export let shellState: ShellState;
  export let shellWidgetRegistry: InMemoryShellWidgetRegistry;
  export let registry: InMemoryToolRegistry;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection;
  export let designSystemThemeSession: DesignSystemThemeSession | null = null;
  export let workspaceHeight = 0;
  export let shellContextToolId: string | null = null;
  export let shellContextToolIds: string[] = [];
  export let shellRegionLayoutEditingEnabled = false;
  export let shellRegionResizeEnabled = false;
  export let shellRegionEmptyStateEnabled = false;
  export let shellRegionPopulateEnabled = false;
  export let shellRegionResizeHint: ShellRegionResizeHint | null = null;
  export let hideShellRegionHeaders = false;
  export let updateToolState: ((toolInstanceId: string, nextState: JsonObject) => boolean) | null = null;
  export let resizeShellRegion: (regionId: ShellRegionId, delta: number) => void;
  export let onActivateShellWidget: (regionId: ShellRegionId, widgetId: string) => void;
  export let onSetShellRegionOpen: (regionId: ShellRegionId, isOpen: boolean) => void;
  export let onAddShellWidgetToRegion: (
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ) => void = () => {};
  export let onMoveShellWidgetToRegion: (
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ) => void = () => {};
  export let onSetShellRegionArrangement: (
    regionId: ShellRegionId,
    presentation: ShellRegionPresentation,
    axis?: ShellRegionAxis
  ) => void = () => {};
  export let onShellRegionResizeDragState: (
    regionId: ShellRegionId,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ) => void;

  let emptyPickerRequest: ShellRegionEmptyPickerRequest | null = null;
  const themeRuntimeContext = getWorkbenchThemeRuntimeContext();

  $: ThemeSurfaceFrame = themeRuntimeContext.getRuntime().SurfaceFrame;
  $: activeEmptyPickerRegionId = emptyPickerRequest?.regionId ?? null;
  $: connectedShellWidgetIds = listConnectedShellWidgetIds(shellState, shellWidgetRegistry);
  $: shouldShowEmptyShellRegions =
    shellRegionLayoutEditingEnabled || shellRegionEmptyStateEnabled || shellRegionPopulateEnabled;
  $: shouldRenderLeftRegion = shouldRenderShellRegionSlot(
    'left',
    shellState,
    shouldShowEmptyShellRegions,
    shellWidgetRegistry
  );
  $: shouldRenderRightRegion = shouldRenderShellRegionSlot(
    'right',
    shellState,
    shouldShowEmptyShellRegions,
    shellWidgetRegistry
  );
  $: shouldRenderBottomRegion = shouldRenderShellRegionSlot(
    'bottom',
    shellState,
    shouldShowEmptyShellRegions,
    shellWidgetRegistry
  );
  $: if (emptyPickerRequest && !shellRegionPopulateEnabled) {
    closeEmptyRegionPicker();
  }
  $: if (
    emptyPickerRequest &&
    (!shellState.regions[emptyPickerRequest.regionId].isVisible ||
      !shellState.regions[emptyPickerRequest.regionId].isOpen)
  ) {
    closeEmptyRegionPicker();
  }

  function openEmptyRegionPicker(request: ShellRegionEmptyPickerRequest): void {
    if (!shellRegionPopulateEnabled) {
      return;
    }

    emptyPickerRequest = request;
  }

  function refreshEmptyRegionPickerCandidates(
    regionId: ShellRegionId,
    candidates: ShellRegionEmptyCandidate[]
  ): void {
    const nextRequest = refreshShellRegionEmptyPickerCandidates(emptyPickerRequest, regionId, candidates);

    if (nextRequest !== emptyPickerRequest) {
      emptyPickerRequest = nextRequest;
    }
  }

  function closeEmptyRegionPicker(): void {
    emptyPickerRequest = null;
  }

  function selectEmptyRegionWidget(widgetId: string): void {
    if (!emptyPickerRequest) {
      return;
    }

    onAddShellWidgetToRegion(emptyPickerRequest.regionId, widgetId, emptyPickerRequest.placement ?? {});
    closeEmptyRegionPicker();
  }

  function shouldRenderShellRegionSlot(
    regionId: ShellRegionId,
    nextShellState: ShellState,
    showEmptyRegions: boolean,
    nextShellWidgetRegistry: InMemoryShellWidgetRegistry
  ): boolean {
    const region = nextShellState.regions[regionId];

    if (!region?.isVisible) {
      return false;
    }

    if (hasRenderableShellRegionWidget(regionId, nextShellState, nextShellWidgetRegistry)) {
      return true;
    }

    return showEmptyRegions && region.isOpen;
  }

  function hasRenderableShellRegionWidget(
    regionId: ShellRegionId,
    nextShellState: ShellState,
    nextShellWidgetRegistry: InMemoryShellWidgetRegistry
  ): boolean {
    return nextShellState.regions[regionId].widgetIds.some((widgetId) =>
      !isPlaceholderShellWidget(widgetId, nextShellWidgetRegistry)
    );
  }

  function isPlaceholderShellWidget(
    widgetId: string,
    nextShellWidgetRegistry: InMemoryShellWidgetRegistry
  ): boolean {
    const definition = nextShellWidgetRegistry.getDefinition(widgetId);

    return widgetId.endsWith('.empty') || definition?.title.toLowerCase().endsWith(' region') === true;
  }

  function listConnectedShellWidgetIds(
    nextShellState: ShellState,
    nextShellWidgetRegistry: InMemoryShellWidgetRegistry
  ): string[] {
    const widgetIds = new Set<string>();

    for (const region of Object.values(nextShellState.regions)) {
      for (const widgetId of region.widgetIds) {
        if (!isPlaceholderShellWidget(widgetId, nextShellWidgetRegistry)) {
          widgetIds.add(widgetId);
        }
      }
    }

    return [...widgetIds];
  }
</script>

<div
  class:app-shell__body--workspace-fullscreen={Boolean(workspace.fullscreenPanelId)}
  class="app-shell__body"
>
  {#if shouldRenderLeftRegion}
    <ShellRegion
      regionId="left"
      region={shellState.regions.left}
      widgetRegistry={shellWidgetRegistry}
      toolRegistry={registry}
      {workspace}
      {focus}
      {designSystemDiscoveryProjection}
      {designSystemThemeSession}
      {updateToolState}
      contextToolId={shellContextToolId}
      contextToolIds={shellContextToolIds}
      hidePanelHeaders={hideShellRegionHeaders}
      emptyStateEnabled={shouldShowEmptyShellRegions}
      populateEnabled={shellRegionPopulateEnabled}
      {connectedShellWidgetIds}
      {activeEmptyPickerRegionId}
      onActivateWidget={onActivateShellWidget}
      onSetRegionOpen={onSetShellRegionOpen}
      onMoveWidgetToRegion={onMoveShellWidgetToRegion}
      onSetRegionArrangement={onSetShellRegionArrangement}
      onOpenEmptyRegionPicker={openEmptyRegionPicker}
      onRefreshEmptyRegionPickerCandidates={refreshEmptyRegionPickerCandidates}
    />
  {/if}

  {#if shouldRenderLeftRegion}
    <div class="app-shell__shell-handle">
      <ResizeHandle
        orientation="horizontal"
        uiVisible={shellRegionResizeEnabled}
        on:resize={({ detail }) => resizeShellRegion('left', detail.delta)}
        on:dragstate={(event) => onShellRegionResizeDragState('left', event)}
      />
    </div>
  {/if}

  <main class="app-shell__workspace" bind:clientHeight={workspaceHeight}>
    <svelte:component
      this={ThemeSurfaceFrame}
      id="shell.workspace"
      role="tool"
      depth={workspace.fullscreenPanelId ? 'overlay' : 'workspace'}
      active={Boolean(workspace.fullscreenPanelId)}
      focusStrength={0.86}
      class="app-shell__workspace-perceptual"
    >
      <slot />
    </svelte:component>
  </main>

  {#if shouldRenderRightRegion}
    <div class="app-shell__shell-handle">
      <ResizeHandle
        orientation="horizontal"
        uiVisible={shellRegionResizeEnabled}
        on:resize={({ detail }) => resizeShellRegion('right', detail.delta)}
        on:dragstate={(event) => onShellRegionResizeDragState('right', event)}
      />
    </div>
  {/if}

  {#if shouldRenderRightRegion}
    <ShellRegion
      regionId="right"
      region={shellState.regions.right}
      widgetRegistry={shellWidgetRegistry}
      toolRegistry={registry}
      {workspace}
      {focus}
      {designSystemDiscoveryProjection}
      {designSystemThemeSession}
      {updateToolState}
      contextToolId={shellContextToolId}
      contextToolIds={shellContextToolIds}
      hidePanelHeaders={hideShellRegionHeaders}
      emptyStateEnabled={shouldShowEmptyShellRegions}
      populateEnabled={shellRegionPopulateEnabled}
      {connectedShellWidgetIds}
      {activeEmptyPickerRegionId}
      onActivateWidget={onActivateShellWidget}
      onSetRegionOpen={onSetShellRegionOpen}
      onMoveWidgetToRegion={onMoveShellWidgetToRegion}
      onSetRegionArrangement={onSetShellRegionArrangement}
      onOpenEmptyRegionPicker={openEmptyRegionPicker}
      onRefreshEmptyRegionPickerCandidates={refreshEmptyRegionPickerCandidates}
    />
  {/if}

  {#if shellRegionResizeHint && shellRegionResizeHint.regionId !== 'bottom'}
    <div
      class="app-shell__side-close-helper"
      class:app-shell__side-close-helper--left={shellRegionResizeHint.regionId === 'left'}
      class:app-shell__side-close-helper--right={shellRegionResizeHint.regionId === 'right'}
      class:app-shell__side-close-helper--near={shellRegionResizeHint.near}
      class:app-shell__side-close-helper--active={shellRegionResizeHint.active}
      style={`--app-shell-side-close-threshold: ${shellRegionResizeHint.thresholdPx}px;`}
      aria-hidden="true"
    >
      <span class="app-shell__side-close-helper-guide"></span>
    </div>
  {/if}
</div>

{#if shouldRenderBottomRegion}
  <div class="app-shell__bottom-dock">
    <div class="app-shell__shell-handle app-shell__shell-handle--bottom">
      <ResizeHandle
        orientation="vertical"
        uiVisible={shellRegionResizeEnabled}
        on:resize={({ detail }) => resizeShellRegion('bottom', detail.delta)}
        on:dragstate={(event) => onShellRegionResizeDragState('bottom', event)}
      />
    </div>

    <ShellRegion
      regionId="bottom"
      region={shellState.regions.bottom}
      widgetRegistry={shellWidgetRegistry}
      toolRegistry={registry}
      {workspace}
      {focus}
      {designSystemDiscoveryProjection}
      {designSystemThemeSession}
      {updateToolState}
      contextToolId={shellContextToolId}
      contextToolIds={shellContextToolIds}
      hidePanelHeaders={hideShellRegionHeaders}
      emptyStateEnabled={shouldShowEmptyShellRegions}
      populateEnabled={shellRegionPopulateEnabled}
      {connectedShellWidgetIds}
      {activeEmptyPickerRegionId}
      onActivateWidget={onActivateShellWidget}
      onSetRegionOpen={onSetShellRegionOpen}
      onMoveWidgetToRegion={onMoveShellWidgetToRegion}
      onSetRegionArrangement={onSetShellRegionArrangement}
      onOpenEmptyRegionPicker={openEmptyRegionPicker}
      onRefreshEmptyRegionPickerCandidates={refreshEmptyRegionPickerCandidates}
    />

    {#if shellRegionResizeHint?.regionId === 'bottom'}
      <div
        class="app-shell__side-close-helper app-shell__side-close-helper--bottom"
        class:app-shell__side-close-helper--near={shellRegionResizeHint.near}
        class:app-shell__side-close-helper--active={shellRegionResizeHint.active}
        style={`--app-shell-side-close-threshold: ${shellRegionResizeHint.thresholdPx}px;`}
        aria-hidden="true"
      >
        <span class="app-shell__side-close-helper-guide"></span>
      </div>
    {/if}
  </div>
{/if}

<ShellRegionWidgetPicker
  request={emptyPickerRequest}
  onClose={closeEmptyRegionPicker}
  onSelectWidget={selectEmptyRegionWidget}
/>

<ShellWidgetDragPreview widgetRegistry={shellWidgetRegistry} />

<style>
  .app-shell__body {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    position: relative;
  }

  .app-shell__body--workspace-fullscreen :global(.shell-region--open) {
    position: relative;
    z-index: 140;
  }

  .app-shell__workspace {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  :global(.app-shell__workspace-perceptual) {
    /* Structural host: filters/transforms would change the containing block
     * of fullscreen stacks, whose coordinates are viewport-relative. */
    filter: none;
    transform: none;
    transition: none;
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  :global(.app-shell__workspace-perceptual > *) {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
  }

  .app-shell__shell-handle {
    flex: 0 0 var(--size-resize-handle);
    display: flex;
    width: var(--size-resize-handle);
    min-width: var(--size-resize-handle);
    background: var(--color-background-shell);
  }

  .app-shell__shell-handle--bottom {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    height: var(--size-resize-handle);
    min-height: var(--size-resize-handle);
  }

  .app-shell__bottom-dock {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
  }

  .app-shell__side-close-helper {
    --app-shell-side-close-helper-color: var(--color-action-danger-hover);
    position: absolute;
    z-index: 8;
    pointer-events: none;
    opacity: 0;
    border: 1px solid color-mix(in srgb, var(--app-shell-side-close-helper-color) 28%, transparent);
    background:
      repeating-linear-gradient(
        135deg,
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 24%, transparent) 0 1px,
        transparent 1px 6px
      ),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 12%, transparent),
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 3%, transparent)
      ),
      color-mix(in srgb, var(--color-background-panel) 70%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--app-shell-side-close-helper-color) 10%, transparent),
      0 0 20px color-mix(in srgb, var(--app-shell-side-close-helper-color) 8%, transparent);
    transition:
      opacity 150ms ease,
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .app-shell__side-close-helper--near {
    opacity: 0.58;
    border-color: color-mix(in srgb, var(--app-shell-side-close-helper-color) 54%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--app-shell-side-close-helper-color) 24%, transparent),
      0 0 34px color-mix(in srgb, var(--app-shell-side-close-helper-color) 18%, transparent);
  }

  .app-shell__side-close-helper--active {
    opacity: 0.96;
    border-color: color-mix(in srgb, var(--app-shell-side-close-helper-color) 92%, transparent);
    background:
      repeating-linear-gradient(
        135deg,
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 48%, transparent) 0 1px,
        transparent 1px 5px
      ),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 24%, transparent),
        color-mix(in srgb, var(--app-shell-side-close-helper-color) 8%, transparent)
      ),
      color-mix(in srgb, var(--color-background-danger) 32%, var(--color-background-panel));
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--app-shell-side-close-helper-color) 44%, transparent),
      0 0 0 1px color-mix(in srgb, var(--app-shell-side-close-helper-color) 26%, transparent),
      0 0 42px color-mix(in srgb, var(--app-shell-side-close-helper-color) 32%, transparent);
  }

  .app-shell__side-close-helper--left {
    inset: 0 auto 0 0;
    width: var(--app-shell-side-close-threshold, 2rem);
  }

  .app-shell__side-close-helper--right {
    inset: 0 0 0 auto;
    width: var(--app-shell-side-close-threshold, 2rem);
  }

  .app-shell__side-close-helper--bottom {
    inset: var(--size-resize-handle) 0 auto 0;
    height: var(--app-shell-side-close-threshold, 2rem);
  }

  .app-shell__side-close-helper-guide {
    position: absolute;
    display: block;
    background: color-mix(in srgb, var(--app-shell-side-close-helper-color) 72%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--app-shell-side-close-helper-color) 36%, transparent);
  }

  .app-shell__side-close-helper--left .app-shell__side-close-helper-guide {
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
  }

  .app-shell__side-close-helper--right .app-shell__side-close-helper-guide {
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
  }

  .app-shell__side-close-helper--bottom .app-shell__side-close-helper-guide {
    top: 0;
    right: 0;
    left: 0;
    height: 1px;
  }

  @media (max-width: 960px) {
    .app-shell__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .app-shell__workspace {
      min-width: 0;
    }
  }
</style>
