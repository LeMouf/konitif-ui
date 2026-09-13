<script lang="ts">
  type WorkspaceIntersectionLine = {
    left: number;
    top: number;
    width: number;
    height: number;
    snapped: boolean;
  };

  type WorkspaceIntersectionHandle = {
    left: number;
    top: number;
    size: number;
    snapped: boolean;
  };

  export let edgeResizeLine: WorkspaceIntersectionLine | null = null;
  export let columnLine: WorkspaceIntersectionLine | null = null;
  export let rowLine: WorkspaceIntersectionLine | null = null;
  export let activeHandle: WorkspaceIntersectionHandle | null = null;
</script>

<div class="workspace-intersection-preview" aria-hidden="true">
  {#if edgeResizeLine}
    <div
      class="workspace-intersection-preview__line workspace-intersection-preview__line--edge-resize"
      class:workspace-intersection-preview__line--snapped={edgeResizeLine.snapped}
      style:left={`${edgeResizeLine.left}px`}
      style:top={`${edgeResizeLine.top}px`}
      style:width={`${edgeResizeLine.width}px`}
      style:height={`${edgeResizeLine.height}px`}
    ></div>
  {/if}

  {#if columnLine}
    <div
      class="workspace-intersection-preview__line workspace-intersection-preview__line--column"
      class:workspace-intersection-preview__line--snapped={columnLine.snapped}
      style:left={`${columnLine.left}px`}
      style:top={`${columnLine.top}px`}
      style:width={`${columnLine.width}px`}
      style:height={`${columnLine.height}px`}
    ></div>
  {/if}

  {#if rowLine}
    <div
      class="workspace-intersection-preview__line workspace-intersection-preview__line--row"
      class:workspace-intersection-preview__line--snapped={rowLine.snapped}
      style:left={`${rowLine.left}px`}
      style:top={`${rowLine.top}px`}
      style:width={`${rowLine.width}px`}
      style:height={`${rowLine.height}px`}
    ></div>
  {/if}

  {#if activeHandle}
    <div
      class="workspace-intersection-preview__handle"
      class:workspace-intersection-preview__handle--snapped={activeHandle.snapped}
      style:left={`${activeHandle.left}px`}
      style:top={`${activeHandle.top}px`}
      style:width={`${activeHandle.size}px`}
      style:height={`${activeHandle.size}px`}
    ></div>
  {/if}
</div>

<style>
  .workspace-intersection-preview {
    position: absolute;
    inset: 0;
    z-index: 9;
    pointer-events: none;
  }

  .workspace-intersection-preview__line {
    position: absolute;
    background: var(--color-border-focus);
    opacity: 1;
    box-shadow: 0 0 0 1px var(--color-border-focus);
  }

  .workspace-intersection-preview__line--column {
    transform: translateX(-50%);
    width: 2px !important;
  }

  .workspace-intersection-preview__line--row {
    transform: translateY(-50%);
    height: 2px !important;
  }

  .workspace-intersection-preview__line--snapped {
    background: var(--color-border-focus);
    opacity: 1;
    box-shadow:
      0 0 0 1px var(--color-border-focus),
      0 0 8px color-mix(in srgb, var(--color-border-focus) 24%, transparent);
  }

  .workspace-intersection-preview__handle {
    appearance: none;
    position: absolute;
    z-index: 10;
    display: grid;
    place-items: center;
    overflow: hidden;
    box-sizing: border-box;
    aspect-ratio: 1 / 1;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 52%, transparent);
    border-radius: 999px;
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
    opacity: 1;
  }

  .workspace-intersection-preview__handle::before,
  .workspace-intersection-preview__handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 86%, transparent);
    transform: translate(-50%, -50%);
    opacity: 0.88;
  }

  .workspace-intersection-preview__handle::before {
    width: 9px;
    height: 1px;
  }

  .workspace-intersection-preview__handle::after {
    width: 1px;
    height: 9px;
  }

  .workspace-intersection-preview__handle--snapped {
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 14%, transparent),
      0 0 0 1px var(--color-border-focus),
      0 0 8px color-mix(in srgb, var(--color-border-focus) 24%, transparent);
  }
</style>
