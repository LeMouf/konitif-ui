<script lang="ts">
  export let rootElement: HTMLDivElement | null = null;
  export let onPointerMove: (event: PointerEvent) => void = () => {};
  export let onPointerLeave: () => void = () => {};
  export let onWheel: (event: WheelEvent) => void = () => {};
</script>

<div
  bind:this={rootElement}
  class="workspace-view"
  on:pointermove={onPointerMove}
  on:pointerleave={onPointerLeave}
  on:wheel|nonpassive={onWheel}
>
  <slot />
</div>

<style>
  .workspace-view {
    position: relative;
    box-sizing: border-box;
    padding: var(--size-edge-split-handle);
    min-height: 0;
    height: 100%;
  }
</style>
