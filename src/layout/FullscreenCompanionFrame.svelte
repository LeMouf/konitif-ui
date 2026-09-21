<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type {
    ToolFullscreenCompanionDefinition,
    ToolResourceLoadingState,
    ToolShellStatus
  } from '@konitif/workbench';
  import {
    COMPANION_MARGIN,
    companionPlacements,
    companionResizeHandles,
    readCompanionLayout,
    saveCompanionLayout,
    resizeCompanion,
    nearestCompanionPlacement,
    type CompanionLayout,
    type CompanionPlacement,
    type CompanionResizeHandle
  } from './fullscreenCompanionLayout';

  export let companion: ToolFullscreenCompanionDefinition;
  export let layoutKey: string;
  export let label: string;
  export let componentPending = false;
  export let loading: ToolResourceLoadingState | null = null;
  export let loadingStage: 'panel' | 'resource' = 'panel';
  export let loadingError: string | null = null;
  export let status: ToolShellStatus | null = null;
  const i18nT = getWorkbenchTranslator();
  let element: HTMLDivElement;
  let activeKey = '';
  let layout: CompanionLayout;
  let menuOpen = false;
  let candidate: CompanionPlacement | null = null;
  let frame: number | null = null;
  let pending: { x: number; y: number } | null = null;
  let suppressClick = false;
  let gesture: {
    pointerId: number;
    target: HTMLElement;
    handle: CompanionResizeHandle | null;
    startX: number;
    startY: number;
    moved: boolean;
    original: CompanionLayout;
    rect: DOMRect;
    bounds: DOMRect;
  } | null = null;
  let moveLeft: number | null = null;
  let moveTop: number | null = null;
  function storage(): Storage | null {
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  }
  $: if (layoutKey !== activeKey) {
    cancelGesture();
    activeKey = layoutKey;
    layout = readCompanionLayout(
      layoutKey,
      {
        placement: companion.placement,
        width: Math.max(180, companion.size.width),
        height: Math.max(140, companion.size.height)
      },
      storage()
    );
    menuOpen = false;
  }
  $: handles = companion.behavior?.resizable ? companionResizeHandles(layout.placement) : [];
  $: position =
    moveLeft !== null && moveTop !== null
      ? `left:${moveLeft}px;top:${moveTop}px;right:auto;bottom:auto;`
      : `${layout.placement.startsWith('top') ? 'top' : 'bottom'}:${COMPANION_MARGIN}px;${layout.placement.endsWith('left') ? 'left' : 'right'}:${COMPANION_MARGIN}px;`;
  function save() {
    saveCompanionLayout(layoutKey, layout, storage());
  }
  function dock(placement: CompanionPlacement) {
    if (layout.placement !== placement) {
      layout = { ...layout, placement };
      save();
    }
    menuOpen = false;
  }
  function begin(event: PointerEvent, handle: CompanionResizeHandle | null) {
    if (event.button !== 0 || gesture || !element.parentElement) return;
    const target = event.currentTarget as HTMLElement;
    // Read geometry once. Pointer moves affect local presentation only, never Tool props/state.
    const rect = element.getBoundingClientRect(),
      bounds = element.parentElement.getBoundingClientRect();
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    event.preventDefault();
    if (handle) menuOpen = false;
    suppressClick = false;
    gesture = {
      pointerId: event.pointerId,
      target,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...layout },
      rect,
      bounds,
      moved: false
    };
  }
  function apply() {
    frame = null;
    const next = pending;
    pending = null;
    if (!gesture || !next) return;
    const dx = next.x - gesture.startX,
      dy = next.y - gesture.startY;
    gesture.moved ||= Math.hypot(dx, dy) >= 5;
    if (gesture.handle) {
      const size = resizeCompanion(gesture.rect, gesture.handle, dx, dy, gesture.bounds);
      layout = { ...layout, ...size };
    } else if (gesture.moved) {
      menuOpen = false;
      const left = gesture.rect.left - gesture.bounds.left + dx,
        top = gesture.rect.top - gesture.bounds.top + dy;
      moveLeft = Math.max(0, Math.min(left, gesture.bounds.width - gesture.rect.width));
      moveTop = Math.max(0, Math.min(top, gesture.bounds.height - gesture.rect.height));
      candidate = nearestCompanionPlacement(
        moveLeft + gesture.rect.width / 2,
        moveTop + gesture.rect.height / 2,
        gesture.bounds
      );
    }
  }
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    pending = { x: event.clientX, y: event.clientY };
    if (frame === null) frame = requestAnimationFrame(apply);
  }
  function flush() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    apply();
  }
  function release() {
    const previous = gesture;
    gesture = null;
    candidate = null;
    moveLeft = null;
    moveTop = null;
    pending = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (previous?.target.hasPointerCapture(previous.pointerId))
      previous.target.releasePointerCapture(previous.pointerId);
  }
  function finish(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    pending = { x: event.clientX, y: event.clientY };
    flush();
    const previous = gesture;
    suppressClick = previous.moved;
    if (!previous.handle && candidate) layout = { ...layout, placement: candidate };
    // A tiny host viewport must not overwrite the user's preferred normal size.
    if (previous.handle)
      layout = { ...layout, width: Math.max(180, layout.width), height: Math.max(140, layout.height) };
    release();
    if (JSON.stringify(previous.original) !== JSON.stringify(layout)) save();
  }
  function cancelGesture(event?: PointerEvent) {
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    layout = gesture.original;
    release();
    suppressClick = true;
  }
  function toggleMenu() {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    menuOpen = !menuOpen;
  }
  function dismissMenu(event: PointerEvent) {
    if (menuOpen && !element.contains(event.target as Node)) menuOpen = false;
  }
  function keydown(event: KeyboardEvent, handle?: CompanionResizeHandle) {
    if (event.key === 'Escape' && (gesture || menuOpen)) {
      event.preventDefault();
      event.stopPropagation();
      cancelGesture();
      menuOpen = false;
      return;
    }
    if (handle && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const bounds = element.parentElement!.getBoundingClientRect(),
        rect = element.getBoundingClientRect();
      const amount = event.shiftKey ? 40 : 10;
      const size = resizeCompanion(
        rect,
        handle,
        event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0,
        event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0,
        bounds
      );
      layout = { ...layout, width: Math.max(180, size.width), height: Math.max(140, size.height) };
      save();
    }
  }
  onDestroy(release);
</script>

<svelte:window
  on:blur={() => {
    cancelGesture();
    menuOpen = false;
  }}
  on:pointerdown={dismissMenu}
  on:keydown={(event) => {
    if ((gesture || menuOpen) && event.key === 'Escape') keydown(event);
  }}
/>
{#if candidate}
  <div
    class="companion-dock-target"
    data-companion-dock-target={candidate}
    style={`width:min(${layout.width}px,calc(100% - 24px));height:min(${layout.height}px,calc(100% - 24px));${candidate.startsWith('top') ? 'top' : 'bottom'}:12px;${candidate.endsWith('left') ? 'left' : 'right'}:12px;`}
    aria-hidden="true"
  ></div>
{/if}
<div
  bind:this={element}
  class="tool-host__fullscreen-companion"
  class:companion-interacting={gesture !== null}
  data-tool-fullscreen-companion={companion.id}
  data-tool-fullscreen-companion-mode={companion.mode}
  data-companion-placement={layout.placement}
  style={`--companion-width:${layout.width}px;--companion-height:${layout.height}px;${position}`}
  aria-label={label}
>
  <div class="companion-content" aria-busy={componentPending || Boolean(loading)}><slot /></div>
  {#if componentPending || loading || loadingError || status?.tone === 'attention'}
    <div
      class="companion-loading"
      class:companion-loading--notice={!componentPending && !loading && !loadingError}
      class:companion-loading--attention={Boolean(loadingError || (!loading && status?.tone === 'attention'))}
      role="status"
      aria-live="polite"
      data-companion-loading
      data-companion-loading-stage={loadingError
        ? 'error'
        : componentPending
          ? 'component'
          : loading
            ? loadingStage
            : 'notice'}
    >
      {#if !loadingError && (componentPending || loading)}
        <span class="companion-loading__spinner" aria-hidden="true"></span>
      {/if}
      <strong
        >{loadingError
          ? $i18nT('ui.shell.companion.unavailable')
          : (loading?.label ??
            (componentPending ? $i18nT('ui.shell.companion.loading') : status?.label))}</strong
      >
      {#if loadingError || loading?.detail}<span>{loadingError ?? loading?.detail}</span>{/if}
      {#if loading?.progress !== undefined && loading.progress !== null}
        <progress max="1" value={loading.progress} aria-label={loading.label}></progress>
      {/if}
    </div>
  {/if}
  {#if companion.behavior?.draggable}
    <button
      type="button"
      class="companion-move"
      data-companion-move
      title={$i18nT('ui.shell.companion.move')}
      aria-label={$i18nT('ui.shell.companion.move')}
      aria-expanded={menuOpen}
      on:pointerdown|stopPropagation={(event) => begin(event, null)}
      on:pointermove={move}
      on:pointerup={finish}
      on:pointercancel={cancelGesture}
      on:lostpointercapture={cancelGesture}
      on:click|stopPropagation={toggleMenu}
      on:keydown={(event) => keydown(event)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" /></svg
      >
    </button>
  {/if}
  {#each handles as handle}
    <button
      type="button"
      class={`companion-resize companion-resize--${handle}`}
      data-companion-resize={handle}
      title={$i18nT('ui.shell.companion.resize')}
      aria-label={$i18nT('ui.shell.companion.resize')}
      on:pointerdown|stopPropagation={(event) => begin(event, handle)}
      on:pointermove={move}
      on:pointerup={finish}
      on:pointercancel={cancelGesture}
      on:lostpointercapture={cancelGesture}
      on:click|stopPropagation
      on:keydown={(event) => keydown(event, handle)}
    ></button>
  {/each}
  {#if menuOpen}
    <div class="companion-dock-menu" role="group" aria-label={$i18nT('ui.shell.companion.dock')}>
      {#each companionPlacements as placement}
        <button
          type="button"
          data-companion-dock={placement}
          aria-pressed={layout.placement === placement}
          on:pointerdown|stopPropagation
          on:click|stopPropagation={() => dock(placement)}
          on:keydown={(event) => keydown(event)}
        >
          {$i18nT(`ui.shell.companion.${placement}`)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tool-host__fullscreen-companion {
    position: absolute;
    z-index: 18;
    width: min(var(--companion-width), calc(100% - 24px));
    height: min(var(--companion-height), calc(100% - 24px));
    min-width: 0;
    min-height: 0;
    border: 1px solid
      color-mix(in srgb, var(--color-border-active, var(--color-accent-primary, #22d3ee)) 58%, transparent);
    border-radius: var(--radius-large, 0.75rem);
    background: color-mix(in srgb, var(--color-background-panel, #07111c) 86%, transparent);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-background-canvas, #02050a) 78%, transparent),
      0 18px 48px #0005;
  }
  .companion-content {
    position: relative;
    z-index: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: inherit;
  }
  .companion-content > :global(*) {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  .companion-loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 28px 20px;
    text-align: center;
    border-radius: inherit;
    pointer-events: none;
    background: var(--color-background-panel, #07111c);
    color: var(--color-text-primary, #edf6ff);
  }
  .companion-loading strong {
    font-size: clamp(12px, 3.5cqi, 15px);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .companion-loading > span:not(.companion-loading__spinner) {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-secondary, #aebccb);
    overflow-wrap: anywhere;
  }
  .companion-loading__spinner {
    width: 24px;
    height: 24px;
    flex: none;
    border: 2px solid #f59e0b33;
    border-top-color: var(--color-warning, #f59e0b);
    border-radius: 50%;
    animation: companion-loading-spin 1s linear infinite;
  }
  .companion-loading--attention strong {
    color: var(--color-warning, #f59e0b);
  }
  .companion-loading--notice {
    inset: auto 8px 8px;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--color-warning, #f59e0b);
    border-radius: 6px;
    background: color-mix(in srgb, var(--color-background-panel, #07111c) 92%, transparent);
  }
  .companion-loading progress {
    width: 80%;
    max-width: 240px;
    height: 4px;
    accent-color: var(--color-accent-primary, #22d3ee);
    appearance: none;
    border: 0;
    border-radius: 4px;
    background: var(--color-background-surface, #21344b);
  }
  .companion-loading progress::-webkit-progress-bar {
    border-radius: 4px;
    background: var(--color-background-surface, #21344b);
  }
  .companion-loading progress::-webkit-progress-value {
    border-radius: 4px;
    background: var(--color-accent-primary, #22d3ee);
  }
  .companion-loading progress::-moz-progress-bar {
    border-radius: 4px;
    background: var(--color-accent-primary, #22d3ee);
  }
  @keyframes companion-loading-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .companion-move,
  .companion-resize {
    position: absolute;
    z-index: 3;
    padding: 0;
    opacity: 0;
    pointer-events: none;
    touch-action: none;
    transition: opacity 120ms;
  }
  .tool-host__fullscreen-companion:hover > button,
  .tool-host__fullscreen-companion:focus-within > button,
  .companion-interacting > button {
    opacity: 1;
    pointer-events: auto;
  }
  .companion-move {
    top: 3px;
    right: 3px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border: 1px solid #22d3ee66;
    border-radius: 6px;
    background: #07111ce8;
    color: #a5f3fc;
    cursor: grab;
  }
  .companion-interacting .companion-move {
    cursor: grabbing;
  }
  .companion-move svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .companion-resize {
    border: 0;
    background: transparent;
  }
  .companion-resize::after {
    content: '';
    position: absolute;
    border-radius: 4px;
    background: var(--color-accent-primary, #22d3ee);
    box-shadow: 0 0 0 1px #02050a;
  }
  .companion-resize--e,
  .companion-resize--w {
    top: calc(50% - 18px);
    width: 12px;
    height: 36px;
    cursor: ew-resize;
  }
  .companion-resize--e {
    right: -5px;
  }
  .companion-resize--w {
    left: -5px;
  }
  .companion-resize--e::after,
  .companion-resize--w::after {
    inset: 6px 5px;
  }
  .companion-resize--s,
  .companion-resize--n {
    left: calc(50% - 18px);
    height: 12px;
    width: 36px;
    cursor: ns-resize;
  }
  .companion-resize--s {
    bottom: -5px;
  }
  .companion-resize--n {
    top: -5px;
  }
  .companion-resize--s::after,
  .companion-resize--n::after {
    inset: 5px 6px;
  }
  .companion-resize--se,
  .companion-resize--sw,
  .companion-resize--ne,
  .companion-resize--nw {
    width: 16px;
    height: 16px;
  }
  .companion-resize--se {
    right: -5px;
    bottom: -5px;
    cursor: nwse-resize;
  }
  .companion-resize--sw {
    left: -5px;
    bottom: -5px;
    cursor: nesw-resize;
  }
  .companion-resize--ne {
    right: -5px;
    top: -5px;
    cursor: nesw-resize;
  }
  .companion-resize--nw {
    left: -5px;
    top: -5px;
    cursor: nwse-resize;
  }
  .companion-resize--se::after,
  .companion-resize--sw::after,
  .companion-resize--ne::after,
  .companion-resize--nw::after {
    inset: 4px;
  }
  .companion-move:focus-visible,
  .companion-resize:focus-visible {
    outline: 2px solid #a5f3fc;
    outline-offset: 2px;
  }
  .companion-dock-menu {
    position: absolute;
    z-index: 4;
    top: 32px;
    right: 3px;
    display: grid;
    gap: 4px;
    width: 175px;
    max-width: 100%;
    padding: 6px;
    border: 1px solid #22d3ee66;
    border-radius: 8px;
    background: var(--color-background-elevated, #0a1628);
    box-shadow: 0 8px 24px #0006;
  }
  .companion-dock-menu button {
    font: inherit;
    font-size: 12px;
    text-align: left;
    color: var(--color-text-primary, #edf6ff);
    border: 0;
    border-radius: 4px;
    padding: 6px;
    background: transparent;
  }
  .companion-dock-menu button:hover,
  .companion-dock-menu button[aria-pressed='true'] {
    background: var(--color-background-selected, #194256);
  }
  .companion-dock-target {
    position: absolute;
    z-index: 17;
    border: 2px dashed var(--color-accent-primary, #22d3ee);
    border-radius: 12px;
    background: #22d3ee12;
    pointer-events: none;
  }
  @media (pointer: coarse) {
    .companion-move,
    .companion-resize {
      opacity: 0.8;
      pointer-events: auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .companion-loading__spinner {
      animation: none;
    }
    .companion-move,
    .companion-resize {
      transition: none;
    }
  }
</style>
