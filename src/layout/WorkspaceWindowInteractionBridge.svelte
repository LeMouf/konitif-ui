<script lang="ts">
  export let onPointerMove: (event: PointerEvent) => void = () => {};
  export let onPointerUp: (event: PointerEvent) => void = () => {};
  export let onKeyDown: (event: KeyboardEvent) => void = () => {};
  export let onContextMenu: (event: MouseEvent) => void = () => {};
</script>

<svelte:window
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:keydown={onKeyDown}
  on:contextmenu|capture={onContextMenu}
/>
