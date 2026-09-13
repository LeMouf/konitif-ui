<script lang="ts">
  import WorkspaceActiveOverlayRegion from './WorkspaceActiveOverlayRegion.svelte';
  import WorkspaceActiveRootSurfaceRegion from './WorkspaceActiveRootSurfaceRegion.svelte';
  import WorkspaceLayout from './WorkspaceLayout.svelte';
  import type {
    WorkspaceActiveOverlayProps,
    WorkspaceActiveSurfaceProps
  } from './workspaceActiveRegionTypes';

  export let rootElement: HTMLDivElement | null = null;
  export let rootSplitElement: HTMLDivElement | null = null;
  export let surface: WorkspaceActiveSurfaceProps;
  export let overlay: WorkspaceActiveOverlayProps;
  export let onPointerMove: (event: PointerEvent) => void;
  export let onPointerLeave: () => void;
  export let onWheel: (event: WheelEvent) => void;
</script>

<WorkspaceLayout
  bind:rootElement
  {onPointerMove}
  {onPointerLeave}
  {onWheel}
>
  <WorkspaceActiveRootSurfaceRegion
    bind:rootSplitElement
    {surface}
  />

  <WorkspaceActiveOverlayRegion {overlay} />
</WorkspaceLayout>
