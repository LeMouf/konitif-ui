<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SplitOrientation } from '@konitif/workbench';
  import ResizeHandle from './ResizeHandle.svelte';
  import type { FlattenedSplitHandle } from './splitChain';

  type ResizeHoverState =
    | {
        phase: 'enter' | 'move';
        splitId: string;
        rootSplitId: string;
        boundaryIndex: number;
        orientation: SplitOrientation;
        rect: { left: number; top: number; width: number; height: number };
      }
    | { phase: 'leave'; splitId: string };

  export let handle: FlattenedSplitHandle;
  export let rootSplitId: string;
  export let boundaryIndex: number;
  export let orientation: SplitOrientation;
  export let uiVisible = true;
  export let dragActive = false;
  export let magnetHighlighted = false;
  export let onHoverState: ((input: ResizeHoverState) => void) | null = null;

  const dispatch = createEventDispatcher<{
    resize: {
      handle: FlattenedSplitHandle;
      boundaryIndex: number;
      detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number };
    };
    dragstate: {
      handle: FlattenedSplitHandle;
      boundaryIndex: number;
      event: CustomEvent<{
        phase: 'start' | 'move' | 'end' | 'cancel';
        clientX: number;
        clientY: number;
        handleRect: { left: number; top: number; width: number; height: number };
      }>;
    };
    openmenu: {
      handle: FlattenedSplitHandle;
      event: CustomEvent<{ clientX: number; clientY: number }>;
    };
    hoverstate: ResizeHoverState;
  }>();
</script>

<ResizeHandle
  splitId={handle.splitId}
  {rootSplitId}
  {boundaryIndex}
  {orientation}
  {uiVisible}
  {dragActive}
  {magnetHighlighted}
  {onHoverState}
  on:resize={({ detail }) => dispatch('resize', { handle, boundaryIndex, detail })}
  on:dragstate={(event) => dispatch('dragstate', { handle, boundaryIndex, event })}
  on:openmenu={(event) => dispatch('openmenu', { handle, event })}
  on:hoverstate={(event) => dispatch('hoverstate', event.detail)}
/>
