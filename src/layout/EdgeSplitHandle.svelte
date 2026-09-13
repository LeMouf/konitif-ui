<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { LayoutEdge } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import { useWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';
  import { useWorkspaceInteractionHintsContext } from '../debug/workspaceInteractionHints';

  export let edge: LayoutEdge;
  export let active = false;
  export let visualState: 'idle' | 'neutral' | 'armed' | 'creation' = 'idle';

  const dispatch = createEventDispatcher<{
    startpull: {
      edge: LayoutEdge;
      clientX: number;
      clientY: number;
    };
    openmenu: {
      edge: LayoutEdge;
      clientX: number;
      clientY: number;
    };
  }>();
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const workspaceInteractionHints = useWorkspaceInteractionHintsContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;
  const i18nT = getWorkbenchTranslator();

  $: debugHoverTarget = $debugHoverStore;
  $: isDebugHighlighted =
    (debugHoverTarget?.kind === 'edge' && debugHoverTarget.edge === edge) ||
    (debugHoverTarget?.kind === 'intersection-edge' && debugHoverTarget.edge === edge) ||
    (debugHoverTarget?.kind === 'corner' && doesCornerTouchEdge(debugHoverTarget.corner, edge));

  function doesCornerTouchEdge(
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    candidateEdge: LayoutEdge
  ): boolean {
    switch (corner) {
      case 'top-left':
        return candidateEdge === 'top' || candidateEdge === 'left';
      case 'top-right':
        return candidateEdge === 'top' || candidateEdge === 'right';
      case 'bottom-left':
        return candidateEdge === 'bottom' || candidateEdge === 'left';
      case 'bottom-right':
        return candidateEdge === 'bottom' || candidateEdge === 'right';
    }
  }

  function handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    dispatch('startpull', {
      edge,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    dispatch('openmenu', {
      edge,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  function handlePointerEnter(): void {
    workspaceDebugHover.setHoveredTarget({ kind: 'edge', edge });
    workspaceInteractionHints.setHoveredHint({ kind: 'edge', edge });
  }

  function handlePointerHover(): void {
    workspaceDebugHover.setHoveredTarget({ kind: 'edge', edge });
  }

  function handlePointerLeave(): void {
    workspaceDebugHover.setHoveredTarget(null);
    workspaceInteractionHints.setHoveredHint(null);
  }
</script>

<button
  type="button"
  class={`edge-split-handle edge-split-handle--${edge} edge-split-handle--${visualState}`}
  class:edge-split-handle--active={active}
  class:edge-split-handle--debug-highlighted={isDebugHighlighted}
  data-workbench-context-menu="true"
  aria-label={$i18nT('ui.shell.layout.edgeSplit.openMenu', { default: 'Open {{edge}} edge split menu', values: { edge } })}
  title={$i18nT('ui.shell.layout.edgeSplit.title', { default: 'Split workspace' })}
  on:pointerdown={handlePointerDown}
  on:pointerenter={handlePointerEnter}
  on:pointermove={handlePointerHover}
  on:pointerleave={handlePointerLeave}
  on:contextmenu={handleContextMenu}
/>

<style>
  .edge-split-handle {
    position: absolute;
    display: block;
    --edge-split-line-offset: 2px;
    z-index: 2;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    min-width: 0;
    min-height: 0;
    line-height: 0;
    font-size: 0;
  }

  .edge-split-handle::after {
    content: '';
    position: absolute;
    background: color-mix(in srgb, var(--color-border-edge-split) 46%, transparent);
    opacity: 0.28;
    transition:
      opacity 140ms ease,
      background-color 120ms ease;
  }

  .edge-split-handle:hover::after,
  .edge-split-handle--debug-highlighted::after,
  .edge-split-handle:focus-visible::after {
    opacity: 0.86;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 74%, transparent);
  }

  .edge-split-handle--active::after,
  .edge-split-handle--armed::after {
    opacity: 0.72;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 62%, transparent);
  }

  .edge-split-handle--creation::after {
    opacity: 0.92;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 88%, transparent);
  }

  .edge-split-handle:focus-visible {
    outline: none;
  }

  .edge-split-handle--left,
  .edge-split-handle--right {
    top: var(--size-edge-split-handle);
    bottom: var(--size-edge-split-handle);
    width: var(--size-edge-split-handle);
  }

  .edge-split-handle--top,
  .edge-split-handle--bottom {
    left: var(--size-edge-split-handle);
    right: var(--size-edge-split-handle);
    height: var(--size-edge-split-handle);
  }

  .edge-split-handle--left {
    left: 0;
    cursor: e-resize;
  }

  .edge-split-handle--right {
    right: 0;
    cursor: w-resize;
  }

  .edge-split-handle--top {
    top: 0;
    cursor: s-resize;
  }

  .edge-split-handle--bottom {
    bottom: 0;
    cursor: n-resize;
  }

  .edge-split-handle--left::after,
  .edge-split-handle--right::after {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .edge-split-handle--left::after {
    left: var(--edge-split-line-offset);
  }

  .edge-split-handle--right::after {
    right: var(--edge-split-line-offset);
  }

  .edge-split-handle--top::after,
  .edge-split-handle--bottom::after {
    left: 0;
    right: 0;
    height: 1px;
  }

  .edge-split-handle--top::after {
    top: var(--edge-split-line-offset);
  }

  .edge-split-handle--bottom::after {
    bottom: var(--edge-split-line-offset);
  }

</style>
