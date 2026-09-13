<script lang="ts">
  import type { SplitOrientation } from '@konitif/workbench';
  import WorkspaceResizeHandleRegion from './WorkspaceResizeHandleRegion.svelte';
  import type { ResizeDeletePreview } from './resizeBoundaryPreview';
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
  export let resizeDeletePreview: ResizeDeletePreview | null = null;
  export let showBoundaryResizeUi = true;
  export let showResizeSnapHelpers = true;
  export let intersectionMagnetKeys: Set<string> | null = null;
  export let onResize: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    detail: { delta: number; ctrlKey: boolean; clientX: number; clientY: number }
  ) => void;
  export let onDragState: (
    handle: FlattenedSplitHandle,
    boundaryIndex: number,
    event: CustomEvent<{
      phase: 'start' | 'move' | 'end' | 'cancel';
      clientX: number;
      clientY: number;
      handleRect: { left: number; top: number; width: number; height: number };
    }>
  ) => void;
  export let onOpenMenu: (
    handle: FlattenedSplitHandle,
    event: CustomEvent<{ clientX: number; clientY: number }>
  ) => void;
  export let onHoverResizeHandle: ((input: ResizeHoverState) => void) | null = null;

  $: magnetKey = `${rootSplitId}:${boundaryIndex}:${handle.splitId}`;
  $: dragActive = resizeDeletePreview?.splitId === handle.splitId && resizeDeletePreview?.boundaryIndex === boundaryIndex;
  $: magnetHighlighted =
    showResizeSnapHelpers &&
    ((resizeDeletePreview?.magnetRootSplitId === rootSplitId &&
      resizeDeletePreview?.magnetBoundaryIndex === boundaryIndex &&
      resizeDeletePreview?.magnetSplitId === handle.splitId) ||
      !!intersectionMagnetKeys?.has(magnetKey));
</script>

<WorkspaceResizeHandleRegion
  {handle}
  {rootSplitId}
  {boundaryIndex}
  {orientation}
  uiVisible={showBoundaryResizeUi}
  {dragActive}
  {magnetHighlighted}
  onHoverState={onHoverResizeHandle}
  on:resize={({ detail }) => onResize(detail.handle, detail.boundaryIndex, detail.detail)}
  on:dragstate={({ detail }) => onDragState(detail.handle, detail.boundaryIndex, detail.event)}
  on:openmenu={({ detail }) => onOpenMenu(detail.handle, detail.event)}
  on:hoverstate={(event) => onHoverResizeHandle?.(event.detail)}
/>
