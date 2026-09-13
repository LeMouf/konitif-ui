<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import type { SplitOrientation } from '@konitif/workbench';
  import { useWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';

  export let orientation: SplitOrientation;
  export let splitId = '';
  export let rootSplitId = '';
  export let boundaryIndex = -1;
  export let magnetHighlighted = false;
  export let dragActive = false;
  export let uiVisible = true;
  export let onHoverState:
    | ((
        detail:
          | {
              phase: 'enter' | 'move';
              splitId: string;
              rootSplitId: string;
              boundaryIndex: number;
              orientation: SplitOrientation;
              rect: { left: number; top: number; width: number; height: number };
            }
          | { phase: 'leave'; splitId: string }
      ) => void)
    | null = null;

  const dispatch = createEventDispatcher<{
    resize: { delta: number; ctrlKey: boolean; clientX: number; clientY: number };
    openmenu: { clientX: number; clientY: number };
    hoverstate:
      | {
          phase: 'enter' | 'move';
          splitId: string;
          rootSplitId: string;
          boundaryIndex: number;
          orientation: SplitOrientation;
          rect: { left: number; top: number; width: number; height: number };
        }
      | { phase: 'leave'; splitId: string };
    dragstate: {
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    };
  }>();
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;

  $: debugHoverTarget = $debugHoverStore;
  $: isDebugHighlighted =
    !!splitId &&
    ((debugHoverTarget?.kind === 'resize' && debugHoverTarget.splitId === splitId) ||
      (debugHoverTarget?.kind === 'intersection-resize' &&
        (debugHoverTarget.columnSplitId === splitId ||
          debugHoverTarget.rowSplitId === splitId ||
          (debugHoverTarget.columnRootSplitId === rootSplitId &&
            debugHoverTarget.columnBoundaryIndex === boundaryIndex) ||
          (debugHoverTarget.rowRootSplitId === rootSplitId &&
            debugHoverTarget.rowBoundaryIndex === boundaryIndex))) ||
      (debugHoverTarget?.kind === 'intersection-edge' && debugHoverTarget.splitId === splitId));

  let activePointerId: number | null = null;
  let lastPosition = 0;
  let resizeFrame = 0;
  let pendingResizeDelta = 0;
  let pendingResizeCtrlKey = false;
  let pendingResizeClientX = 0;
  let pendingResizeClientY = 0;

  function readPosition(event: PointerEvent): number {
    return orientation === 'horizontal' ? event.clientX : event.clientY;
  }

  function readHandleRect(event: PointerEvent): { left: number; top: number; width: number; height: number } {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function readHoverRect(element: HTMLElement): DOMRect {
    const rect = element.getBoundingClientRect();
    return rect;
  }

  function emitHoverState(phase: 'enter' | 'move', element: HTMLElement): void {
    const rect = readHoverRect(element);
    const detail = {
      phase,
      splitId,
      rootSplitId,
      boundaryIndex,
      orientation,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    } as const;
    onHoverState?.(detail);
    dispatch('hoverstate', detail);
  }

  function emitHoverLeave(): void {
    const detail = { phase: 'leave', splitId } as const;
    onHoverState?.(detail);
    dispatch('hoverstate', detail);
  }

  function flushPendingResize(): void {
    resizeFrame = 0;

    if (pendingResizeDelta === 0) {
      return;
    }

    const delta = pendingResizeDelta;
    pendingResizeDelta = 0;
    dispatch('resize', {
      delta,
      ctrlKey: pendingResizeCtrlKey,
      clientX: pendingResizeClientX,
      clientY: pendingResizeClientY
    });
  }

  function accumulateResizeDelta(delta: number, event: PointerEvent): void {
    pendingResizeDelta += delta;
    pendingResizeCtrlKey = event.ctrlKey;
    pendingResizeClientX = event.clientX;
    pendingResizeClientY = event.clientY;
  }

  function scheduleResizeDispatch(delta: number, event: PointerEvent): void {
    accumulateResizeDelta(delta, event);

    if (resizeFrame !== 0) {
      return;
    }

    if (typeof requestAnimationFrame === 'undefined') {
      flushPendingResize();
      return;
    }

    resizeFrame = requestAnimationFrame(flushPendingResize);
  }

  function cancelPendingResize(): void {
    if (resizeFrame !== 0 && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = 0;
    pendingResizeDelta = 0;
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!uiVisible) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    emitHoverState('move', event.currentTarget as HTMLElement);
    activePointerId = event.pointerId;
    lastPosition = readPosition(event);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dispatch('dragstate', {
      phase: 'start',
      clientX: event.clientX,
      clientY: event.clientY,
      handleRect: readHandleRect(event)
    });
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!uiVisible) {
      return;
    }

    emitHoverState('move', event.currentTarget as HTMLElement);

    if (activePointerId !== event.pointerId) {
      return;
    }

    const nextPosition = readPosition(event);
    dispatch('dragstate', {
      phase: 'move',
      clientX: event.clientX,
      clientY: event.clientY,
      handleRect: readHandleRect(event)
    });
    scheduleResizeDispatch(nextPosition - lastPosition, event);
    lastPosition = nextPosition;
  }

  function handlePointerEnd(event: PointerEvent): void {
    if (!uiVisible) {
      return;
    }

    if (activePointerId !== event.pointerId) {
      return;
    }

    const finalPosition = readPosition(event);
    const finalDelta = finalPosition - lastPosition;

    dispatch('dragstate', {
      phase: 'move',
      clientX: event.clientX,
      clientY: event.clientY,
      handleRect: readHandleRect(event)
    });

    if (finalDelta !== 0) {
      accumulateResizeDelta(finalDelta, event);
      lastPosition = finalPosition;
    }

    flushPendingResize();
    dispatch('dragstate', {
      phase: 'end',
      clientX: event.clientX,
      clientY: event.clientY,
      handleRect: readHandleRect(event)
    });
    activePointerId = null;

    if (!(event.currentTarget as HTMLElement).matches(':hover')) {
      emitHoverLeave();
    }
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) {
      return;
    }

    cancelPendingResize();
    dispatch('dragstate', {
      phase: 'cancel',
      clientX: event.clientX,
      clientY: event.clientY,
      handleRect: readHandleRect(event)
    });
    activePointerId = null;
    emitHoverLeave();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!uiVisible) {
      return;
    }

    const step = 24;

    if (orientation === 'horizontal') {
      if (event.key === 'ArrowLeft') {
        dispatch('resize', { delta: -step, ctrlKey: event.ctrlKey, clientX: 0, clientY: 0 });
      }

      if (event.key === 'ArrowRight') {
        dispatch('resize', { delta: step, ctrlKey: event.ctrlKey, clientX: 0, clientY: 0 });
      }
    }

    if (orientation === 'vertical') {
      if (event.key === 'ArrowUp') {
        dispatch('resize', { delta: -step, ctrlKey: event.ctrlKey, clientX: 0, clientY: 0 });
      }

      if (event.key === 'ArrowDown') {
        dispatch('resize', { delta: step, ctrlKey: event.ctrlKey, clientX: 0, clientY: 0 });
      }
    }
  }

  function handleContextMenu(event: MouseEvent): void {
    if (!uiVisible) {
      return;
    }

    event.preventDefault();

    if (activePointerId !== null) {
      dispatch('dragstate', {
        phase: 'cancel',
        clientX: event.clientX,
        clientY: event.clientY,
        handleRect: {
          left: event.clientX,
          top: event.clientY,
          width: 0,
          height: 0
        }
      });
      activePointerId = null;
      cancelPendingResize();
      emitHoverLeave();
      return;
    }

    dispatch('openmenu', {
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  onDestroy(() => {
    cancelPendingResize();
  });

  function handlePointerEnter(event: PointerEvent): void {
    if (!uiVisible) {
      return;
    }

    emitHoverState('enter', event.currentTarget as HTMLElement);
  }

  function handlePointerLeave(): void {
    if (activePointerId === null) {
      emitHoverLeave();
    }
  }

  function handleMouseEnter(event: MouseEvent): void {
    if (!uiVisible) {
      return;
    }

    emitHoverState('enter', event.currentTarget as HTMLElement);
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!uiVisible) {
      return;
    }

    emitHoverState('move', event.currentTarget as HTMLElement);
  }

  function handleMouseLeave(): void {
    if (activePointerId === null) {
      emitHoverLeave();
    }
  }
</script>

<button
  type="button"
  class:resize-handle--horizontal={orientation === 'horizontal'}
  class:resize-handle--vertical={orientation === 'vertical'}
  class:resize-handle--debug-highlighted={isDebugHighlighted}
  class:resize-handle--magnet-highlighted={magnetHighlighted}
  class:resize-handle--drag-active={dragActive}
  class:resize-handle--ui-hidden={!uiVisible}
  class="resize-handle"
  data-split-id={splitId}
  data-split-orientation={orientation}
  data-root-split-id={rootSplitId}
  data-boundary-index={boundaryIndex}
  data-workbench-context-menu="true"
  tabindex={uiVisible ? 0 : -1}
  aria-label={orientation === 'horizontal' ? 'Resize columns' : 'Resize rows'}
  aria-hidden={!uiVisible}
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerEnd}
  on:pointercancel={handlePointerCancel}
  on:pointerenter={handlePointerEnter}
  on:pointerleave={handlePointerLeave}
  on:mouseenter={handleMouseEnter}
  on:mousemove={handleMouseMove}
  on:mouseleave={handleMouseLeave}
  on:keydown={handleKeyDown}
  on:contextmenu={handleContextMenu}
/>

<style>
  .resize-handle {
    appearance: none;
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    align-self: stretch;
    justify-self: stretch;
    min-width: 0;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    touch-action: none;
    overflow: hidden;
  }

  .resize-handle--ui-hidden {
    pointer-events: none;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    background: var(--color-border-subtle);
    opacity: 0.68;
    z-index: 1;
    transition:
      background-color 120ms ease,
      opacity 120ms ease;
  }

  .resize-handle--horizontal {
    cursor: ew-resize;
  }

  .resize-handle--horizontal::after {
    top: 0;
    bottom: 0;
    left: calc(50% - 0.5px);
    width: 1px;
  }

  .resize-handle--vertical {
    cursor: ns-resize;
  }

  .resize-handle--vertical::after {
    left: 0;
    right: 0;
    top: calc(50% - 0.5px);
    height: 1px;
  }

  .resize-handle--horizontal::before,
  .resize-handle--vertical::before {
    content: '';
    position: absolute;
    background: transparent;
    pointer-events: none;
    z-index: 0;
  }

  .resize-handle--horizontal::before {
    top: 0;
    bottom: 0;
    left: calc(50% - 0.1875rem);
    width: 0.375rem;
  }

  .resize-handle--vertical::before {
    left: 0;
    right: 0;
    top: calc(50% - 0.1875rem);
    height: 0.375rem;
  }

  .resize-handle:hover::after,
  .resize-handle--debug-highlighted::after,
  .resize-handle--magnet-highlighted::after,
  .resize-handle:focus-visible::after {
    background: var(--color-border-focus);
    opacity: 1;
  }

  .resize-handle--ui-hidden::after,
  .resize-handle--ui-hidden::before {
    opacity: 0;
  }

  .resize-handle--drag-active::after {
    opacity: 0;
  }

  .resize-handle:focus-visible {
    outline: none;
  }
</style>
