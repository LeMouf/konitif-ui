<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { useWorkspaceDebugHoverContext } from '../debug/workspaceDebugHover';

  export let corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  export let active = false;
  export let visualState: 'idle' | 'neutral' | 'armed' | 'creation' = 'idle';
  export let centerX = 0;
  export let centerY = 0;

  const dispatch = createEventDispatcher<{
    startpull: {
      corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      clientX: number;
      clientY: number;
    };
  }>();
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;

  $: debugHoverTarget = $debugHoverStore;
  $: isDebugHighlighted = debugHoverTarget?.kind === 'corner' && debugHoverTarget.corner === corner;

  function handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    dispatch('startpull', {
      corner,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }

  function handlePointerEnter(): void {
    workspaceDebugHover.setHoveredTarget({ kind: 'corner', corner });
  }

  function handlePointerHover(): void {
    workspaceDebugHover.setHoveredTarget({ kind: 'corner', corner });
  }

  function handlePointerLeave(): void {
    workspaceDebugHover.setHoveredTarget(null);
  }
</script>

<button
  type="button"
  class={`boundary-corner-handle boundary-corner-handle--${corner} boundary-corner-handle--${visualState}`}
  class:boundary-corner-handle--active={active}
  class:boundary-corner-handle--debug-highlighted={isDebugHighlighted}
  style:left={`${centerX}px`}
  style:top={`${centerY}px`}
  aria-label={`Pull ${corner} boundary inward`}
  on:pointerdown={handlePointerDown}
  on:pointerenter={handlePointerEnter}
  on:pointermove={handlePointerHover}
  on:pointerleave={handlePointerLeave}
/>

<style>
  .boundary-corner-handle {
    --boundary-corner-size: 15px;
    appearance: none;
    position: absolute;
    z-index: 8;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: var(--boundary-corner-size);
    height: var(--boundary-corner-size);
    min-width: var(--boundary-corner-size);
    min-height: var(--boundary-corner-size);
    padding: 0;
    border: 0;
    line-height: 0;
    font-size: 0;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    border-radius: 999px;
    background:
      radial-gradient(
        circle at center,
        color-mix(in srgb, var(--color-background-elevated) 100%, white 8%) 0 58%,
        color-mix(in srgb, var(--color-background-canvas) 100%, white 2%) 59% 100%
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 24%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-background-canvas) 92%, transparent),
      0 1px 4px rgb(0 0 0 / 0.24),
      0 0 8px color-mix(in srgb, var(--color-border-edge-split-hover) 10%, transparent);
    cursor: pointer;
    opacity: 0.24;
    transform: translate(-50%, -50%);
    transition:
      opacity 120ms ease,
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  .boundary-corner-handle::before,
  .boundary-corner-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 92%, transparent);
    transform: translate(-50%, -50%);
    opacity: 0.88;
    transition:
      opacity 140ms ease,
      background-color 120ms ease;
  }

  .boundary-corner-handle::before {
    width: 9px;
    height: 1px;
  }

  .boundary-corner-handle::after {
    width: 1px;
    height: 9px;
  }

  .boundary-corner-handle:hover::before,
  .boundary-corner-handle:hover::after,
  .boundary-corner-handle--debug-highlighted::before,
  .boundary-corner-handle--debug-highlighted::after,
  .boundary-corner-handle:focus-visible::before,
  .boundary-corner-handle:focus-visible::after {
    opacity: 0.88;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 78%, transparent);
  }

  .boundary-corner-handle:hover,
  .boundary-corner-handle--debug-highlighted,
  .boundary-corner-handle:focus-visible {
    opacity: 0.92;
    background:
      radial-gradient(
        circle at center,
        color-mix(in srgb, var(--color-background-elevated) 100%, white 6%) 0 58%,
        color-mix(in srgb, var(--color-background-canvas) 100%, white 2%) 59% 100%
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 14%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 14%, transparent),
      0 0 8px color-mix(in srgb, var(--color-border-edge-split-hover) 10%, transparent);
  }

  .boundary-corner-handle--active::before,
  .boundary-corner-handle--active::after,
  .boundary-corner-handle--armed::before,
  .boundary-corner-handle--armed::after {
    opacity: 0.74;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 66%, transparent);
  }

  .boundary-corner-handle--active,
  .boundary-corner-handle--armed {
    opacity: 1;
    background:
      radial-gradient(
        circle at center,
        color-mix(in srgb, var(--color-background-elevated) 100%, white 8%) 0 60%,
        color-mix(in srgb, var(--color-background-canvas) 100%, white 2%) 61% 100%
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 14%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent),
      0 0 8px color-mix(in srgb, var(--color-border-edge-split-hover) 8%, transparent);
  }

  .boundary-corner-handle--creation::before,
  .boundary-corner-handle--creation::after {
    opacity: 0.96;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 90%, transparent);
  }

  .boundary-corner-handle--creation {
    opacity: 1;
    background:
      radial-gradient(
        circle at center,
        color-mix(in srgb, var(--color-background-elevated) 100%, white 10%) 0 62%,
        color-mix(in srgb, var(--color-background-canvas) 100%, white 2%) 63% 100%
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 20%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 22%, transparent),
      0 0 10px color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
  }

  .boundary-corner-handle:focus-visible {
    outline: none;
  }

  .boundary-corner-handle--top-left {
    cursor: se-resize;
  }

  .boundary-corner-handle--top-right {
    cursor: sw-resize;
  }

  .boundary-corner-handle--bottom-left {
    cursor: ne-resize;
  }

  .boundary-corner-handle--bottom-right {
    cursor: nw-resize;
  }
</style>
