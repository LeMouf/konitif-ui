<script lang="ts">
  export let onKeyDown: (event: KeyboardEvent) => void = () => {};
  export let onContextMenu: (event: MouseEvent) => void = () => {};
</script>

<svelte:window on:keydown={onKeyDown} on:contextmenu|capture={onContextMenu} />
