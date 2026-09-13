<script context="module" lang="ts">
  export type WidgetDockSide = 'left' | 'right' | 'bottom';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';

  export let side: WidgetDockSide;
  export let size: number;
  export let minSize = 96;
  export let maxSize = 480;
  export let resizeLabel = 'Resize widget dock';
  export let hostClass = '';

  const dispatch = createEventDispatcher<{
    resize: { side: WidgetDockSide; size: number };
  }>();

  let resizeSession: {
    startX: number;
    startY: number;
    startSize: number;
  } | null = null;

  $: normalizedSize = clampSize(size);

  function clampSize(value: number): number {
    const safeMinimum = Number.isFinite(minSize) ? Math.max(0, minSize) : 0;
    const safeMaximum = Number.isFinite(maxSize) ? Math.max(safeMinimum, maxSize) : safeMinimum;
    const candidate = Number.isFinite(value) ? value : safeMinimum;
    return Math.min(safeMaximum, Math.max(safeMinimum, Math.round(candidate)));
  }

  function startResize(event: PointerEvent): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    event.preventDefault();
    event.stopPropagation();
    resizeSession = {
      startX: event.clientX,
      startY: event.clientY,
      startSize: normalizedSize
    };
    window.addEventListener('pointermove', resizeFromPointer, { passive: false });
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    document.documentElement.setAttribute('data-workbench-widget-dock-resizing', side);
  }

  function resizeFromPointer(event: PointerEvent): void {
    if (!resizeSession) return;

    event.preventDefault();
    const delta =
      side === 'left'
        ? event.clientX - resizeSession.startX
        : side === 'right'
          ? resizeSession.startX - event.clientX
          : resizeSession.startY - event.clientY;
    commitSize(resizeSession.startSize + delta);
  }

  function resizeFromKeyboard(event: KeyboardEvent): void {
    const step = event.shiftKey ? 32 : 8;
    let nextSize: number | null = null;

    if (event.key === 'Home') nextSize = minSize;
    if (event.key === 'End') nextSize = maxSize;
    if (side === 'left') {
      if (event.key === 'ArrowLeft') nextSize = normalizedSize - step;
      if (event.key === 'ArrowRight') nextSize = normalizedSize + step;
    } else if (side === 'right') {
      if (event.key === 'ArrowLeft') nextSize = normalizedSize + step;
      if (event.key === 'ArrowRight') nextSize = normalizedSize - step;
    } else {
      if (event.key === 'ArrowUp') nextSize = normalizedSize + step;
      if (event.key === 'ArrowDown') nextSize = normalizedSize - step;
    }

    if (nextSize === null) return;
    event.preventDefault();
    commitSize(nextSize);
  }

  function commitSize(value: number): void {
    const nextSize = clampSize(value);
    if (nextSize === normalizedSize) return;
    dispatch('resize', { side, size: nextSize });
  }

  function stopResize(): void {
    resizeSession = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', resizeFromPointer);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-workbench-widget-dock-resizing');
    }
  }

  onDestroy(stopResize);
</script>

<section
  class={`widget-dock-host widget-dock-host--${side} ${hostClass}`}
  data-workbench-widget-dock
  data-workbench-widget-dock-side={side}
>
  <slot />
  <!-- A focusable ARIA separator is the canonical interactive splitter pattern. -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    class="widget-dock-host__resize-handle"
    data-workbench-widget-dock-resize-handle
    role="separator"
    aria-label={resizeLabel}
    aria-orientation={side === 'bottom' ? 'horizontal' : 'vertical'}
    aria-valuemin={minSize}
    aria-valuemax={maxSize}
    aria-valuenow={normalizedSize}
    tabindex="0"
    on:pointerdown={startResize}
    on:keydown={resizeFromKeyboard}
  />
</section>

<style>
  .widget-dock-host {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    container-name: workbench-surface;
    container-type: size;
  }

  .widget-dock-host__resize-handle {
    position: absolute;
    z-index: 12;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: transparent;
    opacity: 0.64;
    outline: none;
    touch-action: none;
  }

  .widget-dock-host__resize-handle::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent-primary, #38e8ff) 58%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-background-canvas, #020914) 72%, transparent);
  }

  .widget-dock-host__resize-handle:hover,
  .widget-dock-host__resize-handle:focus-visible {
    opacity: 1;
  }

  .widget-dock-host--left > .widget-dock-host__resize-handle,
  .widget-dock-host--right > .widget-dock-host__resize-handle {
    top: 0;
    bottom: 0;
    width: 0.55rem;
    cursor: col-resize;
  }

  .widget-dock-host--left > .widget-dock-host__resize-handle {
    right: -0.275rem;
  }

  .widget-dock-host--right > .widget-dock-host__resize-handle {
    left: -0.275rem;
  }

  .widget-dock-host--left > .widget-dock-host__resize-handle::after,
  .widget-dock-host--right > .widget-dock-host__resize-handle::after {
    top: 0.75rem;
    bottom: 0.75rem;
    left: calc(50% - 1px);
    width: 2px;
  }

  .widget-dock-host--bottom > .widget-dock-host__resize-handle {
    top: -0.275rem;
    left: 0;
    right: 0;
    height: 0.55rem;
    cursor: row-resize;
  }

  .widget-dock-host--bottom > .widget-dock-host__resize-handle::after {
    top: calc(50% - 1px);
    left: 0;
    right: 0;
    height: 2px;
  }
</style>
