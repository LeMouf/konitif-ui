<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    pointermove: PointerEvent;
    pointerup: PointerEvent;
  }>();
</script>

<svelte:window
  on:pointermove={(event) => dispatch('pointermove', event)}
  on:pointerup={(event) => dispatch('pointerup', event)}
/>
