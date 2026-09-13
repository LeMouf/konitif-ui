<script lang="ts">
  import type { SplitOrientation } from '@konitif/workbench';

  export let splitElement: HTMLDivElement | null = null;
  export let splitId: string;
  export let orientation: SplitOrientation;
  export let splitStyle = '';
  export let className = '';
</script>

<div
  bind:this={splitElement}
  class={`${className} workspace-split-frame`}
  class:workspace-split-frame--horizontal={orientation === 'horizontal'}
  class:workspace-split-frame--vertical={orientation === 'vertical'}
  data-split-id={splitId}
  data-split-orientation={orientation}
  style={splitStyle}
>
  <slot />
</div>

<style>
  .workspace-split-frame {
    display: grid;
    position: relative;
    gap: 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
  }
</style>
