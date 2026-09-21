<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import {
    listWorkbenchWidgetZoneRenderedPlacements,
    type InMemoryWorkbenchWidgetRegistry,
    type ResolvedWorkbenchWidgetZone,
    type WorkbenchWidgetContext,
    type WorkbenchWidgetPlacement,
    type WorkbenchWidgetZoneChrome
  } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import {
    clearShellWidgetDrag,
    readShellWidgetDragData,
    startShellWidgetDrag,
    updateShellWidgetDragPointer,
    writeShellWidgetDragData,
    type ShellWidgetDragPointer
  } from '../shell/shellWidgetDragState';
  import WidgetPlacementHost from './WidgetPlacementHost.svelte';
  import ResizeHandle from '../layout/ResizeHandle.svelte';

  export let resolvedZone: ResolvedWorkbenchWidgetZone | null = null;
  export let widgetRegistry: InMemoryWorkbenchWidgetRegistry | null = null;
  export let context: WorkbenchWidgetContext = {};
  export let chrome: WorkbenchWidgetZoneChrome | 'auto' = 'auto';
  export let density: 'compact' | 'normal' = 'normal';
  export let hostClass = '';
  export let placementActions = false;
  export let placementDragEnabled = false;
  export let placementResizeEnabled = false;
  export let placementProportions: Record<string, number> = {};
  let placementBody: HTMLDivElement | null = null;

  const dispatch = createEventDispatcher<{
    resizePlacements: { zoneId: string; proportions: Record<string, number> };
    activatePlacement: { zoneId: string; placement: WorkbenchWidgetPlacement };
    movePlacement: {
      zoneId: string;
      placementId?: string;
      widgetId?: string;
      beforePlacementId?: string | null;
      afterPlacementId?: string | null;
    };
    resetZoneLayout: { zoneId: string };
    togglePlacementPin: { zoneId: string; placement: WorkbenchWidgetPlacement };
    togglePlacementVisibility: { zoneId: string; placement: WorkbenchWidgetPlacement; isVisible: boolean };
  }>();
  const i18nT = getWorkbenchTranslator();
  let invisibleWidgetDragImage: HTMLCanvasElement | null = null;
  let placementDropDepth = 0;
  let isPlacementDropTarget = false;

  $: zone = resolvedZone?.zone ?? null;
  $: allPlacements = resolvedZone?.allPlacements ?? [];
  $: placements = resolvedZone?.placements ?? [];
  $: hiddenPlacements = allPlacements.filter((placement) => placement.isVisible === false);
  $: activePlacement = resolvedZone?.activePlacement ?? null;
  $: presentation = zone?.presentation ?? 'tabs';
  $: axis = zone?.axis ?? 'vertical';
  $: renderedPlacements = listWorkbenchWidgetZoneRenderedPlacements(resolvedZone);
  $: resizableStack = placementResizeEnabled && presentation === 'stack' && renderedPlacements.length > 1;
  $: placementTrackStyle = resizableStack
    ? `grid-template-${axis === 'horizontal' ? 'columns' : 'rows'}:${renderedPlacements.map(placement =>
        `minmax(0,${readPlacementWeight(placementProportions[placement.id])}fr)`).join(' 6px ')};`
    : '';

  function readPlacementWeight(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
  }

  function resizePlacementBoundary(index: number, delta: number): void {
    if (!resizableStack || !zone || !placementBody || !Number.isFinite(delta)) return;
    const slots = placementBody.querySelectorAll<HTMLElement>(':scope > .widget-zone-host__placement');
    const previous = slots[index - 1], next = slots[index];
    if (!previous || !next) return;
    const previousSize = axis === 'horizontal' ? previous.clientWidth : previous.clientHeight;
    const nextSize = axis === 'horizontal' ? next.clientWidth : next.clientHeight;
    const total = previousSize + nextSize;
    if (total <= 0) return;
    const previousId = renderedPlacements[index - 1].id, nextId = renderedPlacements[index].id;
    const weight = readPlacementWeight(placementProportions[previousId]) + readPlacementWeight(placementProportions[nextId]);
    const minimum = Math.min(64, total / 3);
    const ratio = Math.max(minimum, Math.min(total - minimum, previousSize + delta)) / total;
    placementProportions = { ...placementProportions, [previousId]: weight * ratio, [nextId]: weight * (1 - ratio) };
    dispatch('resizePlacements', { zoneId: zone.id, proportions: { ...placementProportions } });
  }
  $: resolvedChrome = chrome === 'auto' ? zone?.chrome ?? 'header' : chrome;
  $: shouldRenderTabMenu = presentation === 'tabs' && resolvedChrome === 'tabs' && allPlacements.length > 1 && placements.length > 0;
  $: shouldRenderHeader = Boolean(
    zone &&
      (resolvedChrome === 'header' ||
        (resolvedChrome === 'tabs' && shouldRenderTabMenu))
  );
  $: canHideActivePlacement = Boolean(activePlacement && placements.length > 1);

  function activatePlacement(placement: WorkbenchWidgetPlacement): void {
    if (!zone || placement.id === activePlacement?.id) {
      return;
    }

    dispatch('activatePlacement', {
      zoneId: zone.id,
      placement
    });
  }

  function getWidgetZoneDomId(kind: string, id: string): string {
    return `widget-zone-${kind}-${id.replace(/[^a-z0-9_-]+/gi, '-')}`;
  }

  function resetZoneLayout(): void {
    if (!zone) {
      return;
    }

    dispatch('resetZoneLayout', { zoneId: zone.id });
  }

  function toggleActivePlacementPin(): void {
    if (!zone || !activePlacement) {
      return;
    }

    dispatch('togglePlacementPin', {
      zoneId: zone.id,
      placement: activePlacement
    });
  }

  function hideActivePlacement(): void {
    if (!zone || !activePlacement || !canHideActivePlacement) {
      return;
    }

    dispatch('togglePlacementVisibility', {
      zoneId: zone.id,
      placement: activePlacement,
      isVisible: false
    });
  }

  function showPlacement(placement: WorkbenchWidgetPlacement): void {
    if (!zone) {
      return;
    }

    dispatch('togglePlacementVisibility', {
      zoneId: zone.id,
      placement,
      isVisible: true
    });
  }

  function startPlacementDrag(event: DragEvent, placement: WorkbenchWidgetPlacement): void {
    if (!placementDragEnabled || !event.dataTransfer) {
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    writeShellWidgetDragData(event.dataTransfer, JSON.stringify({
      source: 'tool-internal',
      zoneId: zone?.id ?? placement.zoneId,
      placementId: placement.id,
      widgetId: placement.widgetId
    }));
    event.dataTransfer.setData('text/plain', placement.widgetId);
    setInvisibleWidgetDragImage(event.dataTransfer);
    startShellWidgetDrag({
      sourceRegionId: 'tool-internal',
      widgetId: placement.widgetId,
      pointer: resolveDragPointer(event)
    });
    setShellWidgetDragActive(true);
  }

  function updatePlacementDragPointer(event: DragEvent): void {
    if (!placementDragEnabled) {
      return;
    }

    updateShellWidgetDragPointer(resolveDragPointer(event));
  }

  function endPlacementDrag(): void {
    if (!placementDragEnabled) {
      return;
    }

    clearShellWidgetDrag();
    setShellWidgetDragActive(false);
    resetPlacementDropState();
  }

  function handlePlacementDragEnter(event: DragEvent): void {
    if (!isPlacementDropCompatible(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    placementDropDepth += 1;
    isPlacementDropTarget = true;
    updatePlacementDragPointer(event);
  }

  function handlePlacementDragOver(event: DragEvent): void {
    if (!isPlacementDropCompatible(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    isPlacementDropTarget = true;
    updatePlacementDragPointer(event);
  }

  function handlePlacementDragLeave(event: DragEvent): void {
    if (!isPlacementDropCompatible(event.dataTransfer)) {
      return;
    }

    placementDropDepth = Math.max(0, placementDropDepth - 1);

    if (placementDropDepth === 0) {
      isPlacementDropTarget = false;
    }
  }

  function handlePlacementDrop(event: DragEvent): void {
    const payload = readPlacementDragPayload(event.dataTransfer);

    if (!zone || (!payload?.placementId && !payload?.widgetId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const placementTarget = resolvePlacementDropTarget(event);
    dispatch('movePlacement', {
      zoneId: zone.id,
      placementId: payload.placementId,
      widgetId: payload.widgetId,
      beforePlacementId: placementTarget.beforePlacementId,
      afterPlacementId: placementTarget.afterPlacementId
    });
    resetPlacementDropState();
  }

  function isPlacementDropCompatible(dataTransfer: DataTransfer | null): boolean {
    const payload = readPlacementDragPayload(dataTransfer);

    return Boolean(placementDragEnabled && zone && (payload?.placementId || payload?.widgetId));
  }

  function readPlacementDragPayload(dataTransfer: DataTransfer | null): {
    placementId?: string;
    widgetId?: string;
    zoneId?: string;
  } | null {
    if (!dataTransfer) {
      return null;
    }

    const rawPayload = readShellWidgetDragData(dataTransfer);

    if (!rawPayload) {
      const widgetId = dataTransfer.getData('text/plain') || undefined;

      return widgetId ? { widgetId } : null;
    }

    try {
      const payload = JSON.parse(rawPayload) as Record<string, unknown>;
      const placementId = typeof payload.placementId === 'string' ? payload.placementId : undefined;
      const widgetId = typeof payload.widgetId === 'string' ? payload.widgetId : undefined;

      if (!placementId && !widgetId) {
        return null;
      }

      return {
        placementId,
        widgetId,
        zoneId: typeof payload.zoneId === 'string' ? payload.zoneId : undefined
      };
    } catch {
      return null;
    }
  }

  function resolvePlacementDropTarget(event: DragEvent): {
    beforePlacementId?: string | null;
    afterPlacementId?: string | null;
  } {
    const target = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('[data-widget-placement-id]')
      : null;
    const targetPlacementId = target?.dataset.widgetPlacementId;

    if (!targetPlacementId) {
      return {};
    }

    const bounds = target.getBoundingClientRect();
    const isBefore = presentation === 'stack' && axis === 'vertical'
      ? event.clientY < bounds.top + bounds.height / 2
      : event.clientX < bounds.left + bounds.width / 2;

    return isBefore
      ? { beforePlacementId: targetPlacementId }
      : { afterPlacementId: targetPlacementId };
  }

  function resetPlacementDropState(): void {
    placementDropDepth = 0;
    isPlacementDropTarget = false;
  }

  function resolveDragPointer(event: DragEvent): ShellWidgetDragPointer | null {
    const { clientX, clientY } = event;

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    return { x: clientX, y: clientY };
  }

  function setShellWidgetDragActive(active: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.toggleAttribute('data-shell-widget-dragging', active);
  }

  function setInvisibleWidgetDragImage(dataTransfer: DataTransfer): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!invisibleWidgetDragImage) {
      invisibleWidgetDragImage = document.createElement('canvas');
      invisibleWidgetDragImage.width = 1;
      invisibleWidgetDragImage.height = 1;
      invisibleWidgetDragImage.style.position = 'fixed';
      invisibleWidgetDragImage.style.left = '-1000px';
      invisibleWidgetDragImage.style.top = '-1000px';
      invisibleWidgetDragImage.style.width = '1px';
      invisibleWidgetDragImage.style.height = '1px';
      invisibleWidgetDragImage.style.opacity = '0';
      invisibleWidgetDragImage.style.pointerEvents = 'none';
      document.body.appendChild(invisibleWidgetDragImage);
    }

    dataTransfer.setDragImage(invisibleWidgetDragImage, 0, 0);
  }

  onDestroy(() => {
    invisibleWidgetDragImage?.remove();
    invisibleWidgetDragImage = null;
    endPlacementDrag();
  });
</script>

{#if zone}
  <section
    class:widget-zone-host--compact={density === 'compact'}
    class:widget-zone-host--tabs={shouldRenderTabMenu}
    class:widget-zone-host--tab-menu={shouldRenderTabMenu}
    class:widget-zone-host--chrome-none={resolvedChrome === 'none' || !shouldRenderHeader}
    class:widget-zone-host--drop-target={isPlacementDropTarget}
    class:widget-zone-host--stack={presentation === 'stack'}
    class:widget-zone-host--stack-horizontal={presentation === 'stack' && axis === 'horizontal'}
    class={`widget-zone-host ${hostClass}`}
    data-widget-zone-id={zone.id}
    data-widget-zone-surface={zone.surface}
    aria-label={zone.title}
    on:dragenter={handlePlacementDragEnter}
    on:dragover={handlePlacementDragOver}
    on:dragleave={handlePlacementDragLeave}
    on:drop={handlePlacementDrop}
  >
    {#if shouldRenderHeader}
      <header class="widget-zone-host__header">
        <span class="widget-zone-host__heading">
          {#if zone.icon}
            <span class="widget-zone-host__icon" aria-hidden="true">
              <WorkbenchIcon icon={zone.icon} label={zone.title} />
            </span>
          {/if}
          <span class="widget-zone-host__title">{zone.title}</span>
        </span>

        {#if shouldRenderTabMenu}
          <div class="widget-zone-host__header-end">
            <div class="widget-zone-host__tabs" role="tablist" aria-label={zone.title}>
              {#each placements as placement (placement.id)}
                <button
                  type="button"
                  class:widget-zone-host__tab--active={placement.id === activePlacement?.id}
                  class:widget-zone-host__tab--draggable={placementDragEnabled}
                  class="widget-zone-host__tab"
                  role="tab"
                  draggable={placementDragEnabled}
                  id={getWidgetZoneDomId('tab', placement.id)}
                  aria-controls={getWidgetZoneDomId('panel', zone.id)}
                  aria-selected={placement.id === activePlacement?.id}
                  tabindex={placement.id === activePlacement?.id ? 0 : -1}
                  aria-label={placement.title}
                  title={placement.title}
                  data-widget-placement-id={placement.id}
                  data-widget-placement-pinned={placement.isPinned === true ? 'true' : 'false'}
                  data-widget-placement-active={placement.id === activePlacement?.id ? 'true' : 'false'}
                  on:click={() => activatePlacement(placement)}
                  on:dragstart={(event) => startPlacementDrag(event, placement)}
                  on:drag={updatePlacementDragPointer}
                  on:dragend={endPlacementDrag}
                >
                  <span class="widget-zone-host__tab-icon" aria-hidden="true">
                    <WorkbenchIcon icon={placement.icon ?? zone.icon ?? null} label={placement.title} />
                  </span>
                  <span class="widget-zone-host__tab-label">{placement.title}</span>
                  {#if placementDragEnabled}
                    <span class="widget-zone-host__tab-grip" aria-hidden="true">
                      <WorkbenchIcon icon="action.grip" label="" />
                    </span>
                  {/if}
                </button>
              {/each}
            </div>
            {#if placementActions && activePlacement}
              <div class="widget-zone-host__actions" aria-label={$i18nT('ui.shell.widget.actions', { default: 'Widget zone actions' })}>
                {#if placementDragEnabled}
                  <button
                    type="button"
                    class="widget-zone-host__action widget-zone-host__action--move"
                    draggable={true}
                    aria-label={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                    title={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                    on:dragstart={(event) => startPlacementDrag(event, activePlacement)}
                    on:drag={updatePlacementDragPointer}
                    on:dragend={endPlacementDrag}
                  >
                    <WorkbenchIcon icon="action.grip" label="" />
                  </button>
                {/if}
                <button
                  type="button"
                  class:widget-zone-host__action--active={activePlacement.isPinned === true}
                  class="widget-zone-host__action"
                  aria-pressed={activePlacement.isPinned === true}
                  aria-label={activePlacement.isPinned === true
                    ? $i18nT('ui.shell.widget.unpinPlacement', { default: 'Unpin active widget' })
                    : $i18nT('ui.shell.widget.pinPlacement', { default: 'Pin active widget' })}
                  title={activePlacement.isPinned === true
                    ? $i18nT('ui.shell.widget.unpinPlacement', { default: 'Unpin active widget' })
                    : $i18nT('ui.shell.widget.pinPlacement', { default: 'Pin active widget' })}
                  on:click={toggleActivePlacementPin}
                >
                  <WorkbenchIcon icon="action.lock" label="" />
                </button>
                <button
                  type="button"
                  class="widget-zone-host__action"
                  disabled={!canHideActivePlacement}
                  aria-label={$i18nT('ui.shell.widget.hidePlacement', { default: 'Hide active widget' })}
                  title={$i18nT('ui.shell.widget.hidePlacement', { default: 'Hide active widget' })}
                  on:click={hideActivePlacement}
                >
                  <WorkbenchIcon icon="action.visibility-off" label="" />
                </button>
                {#if hiddenPlacements.length > 0}
                  <button
                    type="button"
                    class="widget-zone-host__action"
                    aria-label={$i18nT('ui.shell.widget.showPlacement', { default: 'Show hidden widget' })}
                    title={`${$i18nT('ui.shell.widget.showPlacement', { default: 'Show hidden widget' })}: ${hiddenPlacements[0].title}`}
                    on:click={() => showPlacement(hiddenPlacements[0])}
                  >
                    <WorkbenchIcon icon="action.visibility" label="" />
                  </button>
                {/if}
                <button
                  type="button"
                  class="widget-zone-host__action"
                  aria-label={$i18nT('ui.shell.widget.resetZoneLayout', { default: 'Reset widget zone layout' })}
                  title={$i18nT('ui.shell.widget.resetZoneLayout', { default: 'Reset widget zone layout' })}
                  on:click={resetZoneLayout}
                >
                  <WorkbenchIcon icon="action.reset" label="" />
                </button>
              </div>
            {/if}
          </div>
        {:else if placements.length > 0}
          <span class="widget-zone-host__count">{placements.length}</span>
        {/if}
      </header>
    {/if}

    <div
      class="widget-zone-host__body"
      class:widget-zone-host__body--resizable={resizableStack}
      bind:this={placementBody}
      style={placementTrackStyle}
      id={getWidgetZoneDomId('panel', zone.id)}
      role={shouldRenderTabMenu ? 'tabpanel' : undefined}
      aria-labelledby={shouldRenderTabMenu && activePlacement ? getWidgetZoneDomId('tab', activePlacement.id) : undefined}
      data-widget-active-placement-id={activePlacement?.id}
    >
      <slot {activePlacement} {placements} {zone}>
        {#each renderedPlacements as placement, placementIndex (placement.id)}
          {#if resizableStack && placementIndex > 0}
            <ResizeHandle orientation={axis} on:resize={(event) => resizePlacementBoundary(placementIndex, event.detail.delta)} />
          {/if}
          <div
            class="widget-zone-host__placement"
            class:widget-zone-host__placement--draggable={placementDragEnabled}
            role="group"
            draggable={placementDragEnabled}
            data-widget-placement-id={placement.id}
            on:dragstart={(event) => startPlacementDrag(event, placement)}
            on:drag={updatePlacementDragPointer}
            on:dragend={endPlacementDrag}
          >
            {#if presentation === 'stack' && resolvedChrome === 'header'}
              <button
                type="button"
                class="widget-zone-host__placement-heading"
                aria-label={placement.title}
                title={placement.title}
                on:click={() => activatePlacement(placement)}
              >
                <WorkbenchIcon icon={placement.icon ?? zone.icon ?? null} label="" />
                <span>{placement.title}</span>
              </button>
            {/if}
            <WidgetPlacementHost {resolvedZone} {placement} {widgetRegistry} {context} />
          </div>
        {/each}
      </slot>
    </div>
  </section>
{/if}

<style>
  .widget-zone-host--stack .widget-zone-host__body.widget-zone-host__body--resizable { display:grid;overflow:hidden; }
  .widget-zone-host .widget-zone-host__body--resizable > .widget-zone-host__placement { border:0; }
  .widget-zone-host--chrome-none.widget-zone-host--stack .widget-zone-host__placement { grid-template-rows:minmax(0,1fr); }
  .widget-zone-host {
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    outline: 1px solid transparent;
    outline-offset: -1px;
    transition:
      outline-color 120ms ease,
      background-color 120ms ease;
  }

  .widget-zone-host--drop-target {
    outline-color: color-mix(in srgb, var(--color-accent-primary, #38e8ff) 74%, transparent);
    background-color: color-mix(in srgb, white 5%, transparent);
  }

  .widget-zone-host--chrome-none {
    grid-template-rows: minmax(0, 1fr);
  }

  .widget-zone-host--stack .widget-zone-host__body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: auto;
  }

  .widget-zone-host--stack-horizontal .widget-zone-host__body {
    flex-direction: row;
  }

  .widget-zone-host__placement {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    flex: 1 1 0;
    position: relative;
    overflow: hidden;
  }

  .widget-zone-host--stack .widget-zone-host__placement {
    grid-template-rows: auto minmax(0, 1fr);
    flex-basis: min(18rem, 50%);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 76%, transparent);
  }

  .widget-zone-host--stack-horizontal .widget-zone-host__placement {
    border-bottom: 0;
    border-right: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 76%, transparent);
  }

  .widget-zone-host__placement--draggable {
    cursor: grab;
  }

  .widget-zone-host__placement--draggable:active {
    cursor: grabbing;
  }

  .widget-zone-host__placement-heading {
    width: 100%;
    min-width: 0;
    min-height: 1.75rem;
    display: flex;
    align-items: center;
    gap: var(--space-6, 0.375rem);
    padding: 0.25rem 0.5rem;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 62%, transparent);
    background: color-mix(in srgb, var(--color-background-surface, #0b1624) 90%, transparent);
    color: var(--color-text-secondary, #a9bfd3);
    text-align: left;
  }

  .widget-zone-host__placement-heading span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .widget-zone-host__header {
    min-width: 0;
    min-height: 2.1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8, 0.5rem);
    padding: 0.4rem 0.62rem 0.32rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 76%, transparent);
    background: color-mix(in srgb, var(--color-background-surface, #0b1624) 92%, transparent);
    color: var(--color-text-primary, #f3f7ff);
  }

  .widget-zone-host__heading {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
  }

  .widget-zone-host__icon {
    width: 1rem;
    height: 1rem;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    color: var(--color-action-primary, #7de0b0);
  }

  .widget-zone-host__title {
    overflow: hidden;
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .widget-zone-host__count {
    min-width: 1.28rem;
    padding: 0.06rem 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-action-primary, #7de0b0) 30%, var(--color-border-subtle, #29445f));
    border-radius: 999px;
    color: var(--color-text-secondary, #9fb4ce);
    font-size: 0.58rem;
    font-weight: 850;
    text-align: center;
  }

  .widget-zone-host__header-end {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: end;
    gap: 0.28rem;
  }

  .widget-zone-host__tabs {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    overflow: hidden;
  }

  .widget-zone-host__tab {
    appearance: none;
    overflow: hidden;
    max-width: 7rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.24rem;
    padding: 0.12rem 0.34rem;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 70%, transparent);
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-secondary, #9fb4ce);
    cursor: pointer;
    font-size: 0.58rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .widget-zone-host__tab--draggable {
    cursor: grab;
  }

  .widget-zone-host__tab--draggable:active {
    cursor: grabbing;
  }

  .widget-zone-host__tab-icon {
    width: 0.86rem;
    height: 0.86rem;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .widget-zone-host__tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .widget-zone-host__tab-grip {
    width: 0.72rem;
    height: 0.72rem;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    color: color-mix(in srgb, var(--color-text-secondary, #9fb4ce) 72%, transparent);
    opacity: 0.7;
  }

  .widget-zone-host__tab--active {
    border-color: color-mix(in srgb, var(--color-action-primary, #7de0b0) 40%, var(--color-border-subtle, #29445f));
    color: var(--color-text-primary, #f3f7ff);
  }

  .widget-zone-host--compact .widget-zone-host__tab {
    width: 1.54rem;
    max-width: 1.54rem;
    height: 1.54rem;
    padding: 0;
    border-radius: 999px;
  }

  .widget-zone-host--compact .widget-zone-host__tab--draggable {
    width: 2.14rem;
    max-width: 2.14rem;
    gap: 0.1rem;
  }

  .widget-zone-host--compact .widget-zone-host__tab-grip {
    width: 0.58rem;
    height: 0.58rem;
    opacity: 0.56;
  }

  .widget-zone-host--compact .widget-zone-host__tab-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .widget-zone-host__actions {
    display: inline-flex;
    align-items: center;
    gap: 0.16rem;
    flex: 0 0 auto;
  }

  .widget-zone-host__action {
    appearance: none;
    width: 1.28rem;
    height: 1.28rem;
    display: inline-grid;
    place-items: center;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle, #29445f) 70%, transparent);
    border-radius: 0.34rem;
    background: color-mix(in srgb, var(--color-background-elevated, #0f1d2e) 42%, transparent);
    color: var(--color-text-secondary, #9fb4ce);
    cursor: pointer;
  }

  .widget-zone-host__action--move {
    cursor: grab;
  }

  .widget-zone-host__action--move:active {
    cursor: grabbing;
  }

  .widget-zone-host__action:hover,
  .widget-zone-host__action:focus-visible,
  .widget-zone-host__action--active {
    border-color: color-mix(in srgb, var(--color-action-primary, #7de0b0) 38%, var(--color-border-subtle, #29445f));
    color: var(--color-text-primary, #f3f7ff);
  }

  .widget-zone-host__action:disabled {
    cursor: not-allowed;
    opacity: 0.46;
  }

  .widget-zone-host__body {
    /* A placement contains a size-contained widget: its intrinsic height may
       be zero. Allocate the available tab height instead of sizing by content.
       Stack zones retain their more specific flex/scroll layout above. */
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .widget-zone-host--compact .widget-zone-host__header {
    min-height: 1.9rem;
    padding: 0.32rem 0.52rem 0.28rem;
  }
</style>
