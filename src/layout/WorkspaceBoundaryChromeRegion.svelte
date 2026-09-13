<script lang="ts">
  import type { LayoutEdge, LayoutInteractionState } from '@konitif/workbench';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import BoundaryCornerHandle from './BoundaryCornerHandle.svelte';
  import EdgeSplitHandle from './EdgeSplitHandle.svelte';
  import type {
    VisibleEdgeIntersectionTarget,
    VisibleResizeIntersectionTarget,
    VisibleWorkspaceCornerPositions
  } from './visibleLayoutProjection';

  type BoundaryCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  type BoundaryVisualState = 'idle' | 'neutral' | 'armed' | 'creation';
  type FullscreenBoundaryPhase = 'visible' | 'fading-out' | 'hidden' | 'fading-in';
  type EdgeSplitHandleEvent = CustomEvent<{ edge: LayoutEdge; clientX: number; clientY: number }>;
  type BoundaryCornerHandleEvent = CustomEvent<{
    corner: BoundaryCorner;
    clientX: number;
    clientY: number;
  }>;

  export let layoutInteraction: LayoutInteractionState;
  export let fullscreenBoundaryPhase: FullscreenBoundaryPhase = 'visible';
  export let showBoundaryPullUi = false;
  export let showIntersectionResizeUi = false;
  export let boundaryEditingEnabled = false;
  export let workspaceCornerPositions: VisibleWorkspaceCornerPositions | null = null;
  export let edgeIntersectionTargets: VisibleEdgeIntersectionTarget[] = [];
  export let intersectionTargets: VisibleResizeIntersectionTarget[] = [];
  export let debugEdgeIntersectionIds: Set<string> = new Set();
  export let linkedEdgeIntersectionIds: Set<string> = new Set();
  export let debugResizeIntersectionIds: Set<string> = new Set();
  export let linkedResizeIntersectionIds: Set<string> = new Set();
  export let resolveBoundaryEdgeVisualState: (edge: LayoutEdge) => BoundaryVisualState = () => 'idle';
  export let resolveBoundaryCornerVisualState: (corner: BoundaryCorner) => BoundaryVisualState = () => 'idle';
  export let resolveEdgeIntersectionCursor: (edge: LayoutEdge) => string = () => 'all-scroll';
  export let onStartBoundaryPullFromEdge: (event: EdgeSplitHandleEvent) => void = () => {};
  export let onOpenWorkspaceEdgeSplitMenu: (event: EdgeSplitHandleEvent) => void = () => {};
  export let onStartBoundaryPullFromCorner: (corner: BoundaryCorner, event: BoundaryCornerHandleEvent) => void =
    () => {};
  export let onEdgeIntersectionPointerEnter: (target: VisibleEdgeIntersectionTarget) => void = () => {};
  export let onEdgeIntersectionPointerHover: (target: VisibleEdgeIntersectionTarget) => void = () => {};
  export let onEdgeIntersectionPointerLeave: () => void = () => {};
  export let onStartEdgeIntersectionPull: (
    event: PointerEvent,
    target: VisibleEdgeIntersectionTarget
  ) => void = () => {};
  export let onEdgeIntersectionContextMenu: (
    event: MouseEvent,
    target: VisibleEdgeIntersectionTarget
  ) => void = () => {};
  export let onIntersectionPointerEnter: (target: VisibleResizeIntersectionTarget) => void = () => {};
  export let onIntersectionPointerHover: (target: VisibleResizeIntersectionTarget) => void = () => {};
  export let onIntersectionPointerLeave: () => void = () => {};
  export let onStartIntersectionResize: (
    event: PointerEvent,
    target: VisibleResizeIntersectionTarget
  ) => void = () => {};

  const i18nT = getWorkbenchTranslator();

  $: shouldShowBoundaryPullHandles =
    (showBoundaryPullUi && boundaryEditingEnabled) || fullscreenBoundaryPhase === 'fading-out';
  $: shouldShowIntersectionHandles =
    (showIntersectionResizeUi && boundaryEditingEnabled) || fullscreenBoundaryPhase === 'fading-out';
</script>

<div
  class:workspace-boundary-chrome--visible={fullscreenBoundaryPhase === 'visible'}
  class:workspace-boundary-chrome--fading-out={fullscreenBoundaryPhase === 'fading-out'}
  class:workspace-boundary-chrome--fading-in={fullscreenBoundaryPhase === 'fading-in'}
  class="workspace-boundary-chrome"
>
  {#if shouldShowBoundaryPullHandles}
    <EdgeSplitHandle
      edge="top"
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.verticalEdge === 'top'}
      visualState={resolveBoundaryEdgeVisualState('top')}
      on:startpull={onStartBoundaryPullFromEdge}
      on:openmenu={onOpenWorkspaceEdgeSplitMenu}
    />
    <EdgeSplitHandle
      edge="right"
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.horizontalEdge === 'right'}
      visualState={resolveBoundaryEdgeVisualState('right')}
      on:startpull={onStartBoundaryPullFromEdge}
      on:openmenu={onOpenWorkspaceEdgeSplitMenu}
    />
    <EdgeSplitHandle
      edge="bottom"
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.verticalEdge === 'bottom'}
      visualState={resolveBoundaryEdgeVisualState('bottom')}
      on:startpull={onStartBoundaryPullFromEdge}
      on:openmenu={onOpenWorkspaceEdgeSplitMenu}
    />
    <EdgeSplitHandle
      edge="left"
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.horizontalEdge === 'left'}
      visualState={resolveBoundaryEdgeVisualState('left')}
      on:startpull={onStartBoundaryPullFromEdge}
      on:openmenu={onOpenWorkspaceEdgeSplitMenu}
    />
    <BoundaryCornerHandle
      corner="top-left"
      centerX={workspaceCornerPositions?.topLeft.x ?? 0}
      centerY={workspaceCornerPositions?.topLeft.y ?? 0}
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.source === 'corner' && layoutInteraction.horizontalEdge === 'left' && layoutInteraction.verticalEdge === 'top'}
      visualState={resolveBoundaryCornerVisualState('top-left')}
      on:startpull={(event) => onStartBoundaryPullFromCorner('top-left', event)}
    />
    <BoundaryCornerHandle
      corner="top-right"
      centerX={workspaceCornerPositions?.topRight.x ?? 0}
      centerY={workspaceCornerPositions?.topRight.y ?? 0}
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.source === 'corner' && layoutInteraction.horizontalEdge === 'right' && layoutInteraction.verticalEdge === 'top'}
      visualState={resolveBoundaryCornerVisualState('top-right')}
      on:startpull={(event) => onStartBoundaryPullFromCorner('top-right', event)}
    />
    <BoundaryCornerHandle
      corner="bottom-left"
      centerX={workspaceCornerPositions?.bottomLeft.x ?? 0}
      centerY={workspaceCornerPositions?.bottomLeft.y ?? 0}
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.source === 'corner' && layoutInteraction.horizontalEdge === 'left' && layoutInteraction.verticalEdge === 'bottom'}
      visualState={resolveBoundaryCornerVisualState('bottom-left')}
      on:startpull={(event) => onStartBoundaryPullFromCorner('bottom-left', event)}
    />
    <BoundaryCornerHandle
      corner="bottom-right"
      centerX={workspaceCornerPositions?.bottomRight.x ?? 0}
      centerY={workspaceCornerPositions?.bottomRight.y ?? 0}
      active={layoutInteraction.mode === 'boundary-pull' && layoutInteraction.source === 'corner' && layoutInteraction.horizontalEdge === 'right' && layoutInteraction.verticalEdge === 'bottom'}
      visualState={resolveBoundaryCornerVisualState('bottom-right')}
      on:startpull={(event) => onStartBoundaryPullFromCorner('bottom-right', event)}
    />
  {/if}

  {#if shouldShowIntersectionHandles}
    {#each edgeIntersectionTargets as target (target.id)}
      <button
        type="button"
        class="workspace-boundary-chrome__intersection-handle workspace-boundary-chrome__intersection-handle--edge"
        class:workspace-boundary-chrome__intersection-handle--debug-highlighted={debugEdgeIntersectionIds.has(target.id)}
        class:workspace-boundary-chrome__intersection-handle--linked={linkedEdgeIntersectionIds.has(target.id)}
        style:left={`${target.left}px`}
        style:top={`${target.top}px`}
        style:width={`${target.size}px`}
        style:height={`${target.size}px`}
        style:cursor={resolveEdgeIntersectionCursor(target.edge)}
        aria-label={`Pull ${target.edge} boundary from resize intersection`}
        on:pointerenter={() => onEdgeIntersectionPointerEnter(target)}
        on:pointermove={() => onEdgeIntersectionPointerHover(target)}
        on:pointerleave={onEdgeIntersectionPointerLeave}
        on:pointerdown={(event) => onStartEdgeIntersectionPull(event, target)}
        on:contextmenu={(event) => onEdgeIntersectionContextMenu(event, target)}
      ></button>
    {/each}

    {#each intersectionTargets as target (target.id)}
      <button
        type="button"
        class="workspace-boundary-chrome__intersection-handle"
        class:workspace-boundary-chrome__intersection-handle--active={layoutInteraction.mode === 'intersection-resize' && layoutInteraction.columnSplitId === target.columnSplitId && layoutInteraction.rowSplitId === target.rowSplitId}
        class:workspace-boundary-chrome__intersection-handle--ghosted={layoutInteraction.mode === 'intersection-resize' && layoutInteraction.columnSplitId === target.columnSplitId && layoutInteraction.rowSplitId === target.rowSplitId}
        class:workspace-boundary-chrome__intersection-handle--debug-highlighted={debugResizeIntersectionIds.has(target.id)}
        class:workspace-boundary-chrome__intersection-handle--linked={linkedResizeIntersectionIds.has(target.id)}
        style:left={`${target.left}px`}
        style:top={`${target.top}px`}
        style:width={`${target.size}px`}
        style:height={`${target.size}px`}
        aria-label={$i18nT('ui.shell.layout.workspace.resizeIntersectingSplits', { default: 'Resize intersecting splits' })}
        on:pointerenter={() => onIntersectionPointerEnter(target)}
        on:pointermove={() => onIntersectionPointerHover(target)}
        on:pointerleave={onIntersectionPointerLeave}
        on:pointerdown={(event) => onStartIntersectionResize(event, target)}
      ></button>
    {/each}
  {/if}
</div>

<style>
  .workspace-boundary-chrome {
    position: absolute;
    inset: 0;
    z-index: 8;
    opacity: 1;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  .workspace-boundary-chrome :global(button) {
    pointer-events: auto;
  }

  .workspace-boundary-chrome--fading-out,
  .workspace-boundary-chrome--fading-in {
    opacity: 0;
    pointer-events: none;
  }

  .workspace-boundary-chrome__intersection-handle {
    --intersection-handle-size: 15px;
    appearance: none;
    position: absolute;
    z-index: 8;
    display: grid;
    place-items: center;
    overflow: hidden;
    box-sizing: border-box;
    aspect-ratio: 1 / 1;
    width: var(--intersection-handle-size);
    height: var(--intersection-handle-size);
    min-width: var(--intersection-handle-size);
    min-height: var(--intersection-handle-size);
    padding: 0;
    line-height: 0;
    font-size: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 56%, transparent);
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
    cursor: all-scroll;
    opacity: 0.24;
    transition:
      opacity 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      background-color 120ms ease;
  }

  .workspace-boundary-chrome__intersection-handle--edge {
    cursor: pointer;
  }

  .workspace-boundary-chrome__intersection-handle::before,
  .workspace-boundary-chrome__intersection-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 92%, transparent);
    transform: translate(-50%, -50%);
    transition:
      background-color 120ms ease,
      opacity 120ms ease;
    opacity: 0.88;
  }

  .workspace-boundary-chrome__intersection-handle::before {
    width: 9px;
    height: 1px;
  }

  .workspace-boundary-chrome__intersection-handle::after {
    width: 1px;
    height: 9px;
  }

  .workspace-boundary-chrome__intersection-handle:hover,
  .workspace-boundary-chrome__intersection-handle--linked,
  .workspace-boundary-chrome__intersection-handle--debug-highlighted,
  .workspace-boundary-chrome__intersection-handle:focus-visible {
    opacity: 0.92;
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 46%, transparent);
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
    outline: none;
  }

  .workspace-boundary-chrome__intersection-handle:hover::before,
  .workspace-boundary-chrome__intersection-handle:hover::after,
  .workspace-boundary-chrome__intersection-handle--linked::before,
  .workspace-boundary-chrome__intersection-handle--linked::after,
  .workspace-boundary-chrome__intersection-handle--debug-highlighted::before,
  .workspace-boundary-chrome__intersection-handle--debug-highlighted::after,
  .workspace-boundary-chrome__intersection-handle:focus-visible::before,
  .workspace-boundary-chrome__intersection-handle:focus-visible::after,
  .workspace-boundary-chrome__intersection-handle--active::before,
  .workspace-boundary-chrome__intersection-handle--active::after {
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 86%, transparent);
  }

  .workspace-boundary-chrome__intersection-handle--active {
    opacity: 1;
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 52%, transparent);
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

  .workspace-boundary-chrome__intersection-handle--ghosted {
    opacity: 0;
  }
</style>
