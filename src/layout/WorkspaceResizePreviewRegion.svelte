<script lang="ts">
  import { shouldRenderResizePreviewHelpers, type ResizeDeletePreview } from './resizeBoundaryPreview';
  import type { ResizeGestureSessionState } from './resizeGestureEngine';

  export let preview: ResizeDeletePreview | null = null;
  export let session: ResizeGestureSessionState | null = null;
  export let showResizeSnapHelpers = true;
  export let showDeleteZoneHelpers = true;

  $: shouldRenderHelpers = preview ? shouldRenderResizePreviewHelpers(preview, session) : false;
</script>

{#if preview}
  {#if showResizeSnapHelpers && shouldRenderHelpers && preview.magnetGuideStyle}
    <div
      class="workspace-resize-preview__drag-indicator workspace-resize-preview__drag-indicator--magnet"
      style={preview.magnetGuideStyle}
      aria-hidden="true"
    ></div>
  {/if}
  {#if shouldRenderHelpers}
    <div
      class="workspace-resize-preview__drag-indicator"
      style={preview.dragIndicatorStyle}
      aria-hidden="true"
    ></div>
  {/if}

  {#if showDeleteZoneHelpers && preview.startEnabled}
    <div
      class:workspace-resize-preview__delete-zone--active={preview.activeSide === 'start'}
      class:workspace-resize-preview__delete-zone--near={preview.nearSide === 'start'}
      class="workspace-resize-preview__delete-zone"
      style={preview.startZoneStyle}
      aria-hidden="true"
    >
      {#if preview.nearSide === 'start' || preview.activeSide === 'start'}
        <span
          class:workspace-resize-preview__delete-gizmo--active={preview.activeSide === 'start'}
          class="workspace-resize-preview__delete-gizmo">×</span
        >
      {/if}
    </div>
    <div
      class:workspace-resize-preview__delete-guide--active={preview.activeSide === 'start'}
      class:workspace-resize-preview__delete-guide--near={preview.nearSide === 'start'}
      class="workspace-resize-preview__delete-guide"
      style={preview.startGuideStyle}
      aria-hidden="true"
    ></div>
  {/if}

  {#if showDeleteZoneHelpers && preview.endEnabled}
    <div
      class:workspace-resize-preview__delete-zone--active={preview.activeSide === 'end'}
      class:workspace-resize-preview__delete-zone--near={preview.nearSide === 'end'}
      class="workspace-resize-preview__delete-zone"
      style={preview.endZoneStyle}
      aria-hidden="true"
    >
      {#if preview.nearSide === 'end' || preview.activeSide === 'end'}
        <span
          class:workspace-resize-preview__delete-gizmo--active={preview.activeSide === 'end'}
          class="workspace-resize-preview__delete-gizmo">×</span
        >
      {/if}
    </div>
    <div
      class:workspace-resize-preview__delete-guide--active={preview.activeSide === 'end'}
      class:workspace-resize-preview__delete-guide--near={preview.nearSide === 'end'}
      class="workspace-resize-preview__delete-guide"
      style={preview.endGuideStyle}
      aria-hidden="true"
    ></div>
  {/if}
{/if}

<style>
  .workspace-resize-preview__delete-zone,
  .workspace-resize-preview__delete-guide,
  .workspace-resize-preview__drag-indicator {
    position: absolute;
    pointer-events: none;
    z-index: 4;
  }

  .workspace-resize-preview__drag-indicator {
    background: var(--color-border-focus);
    opacity: 1;
    z-index: 2;
  }

  .workspace-resize-preview__drag-indicator--magnet {
    background: var(--color-border-focus);
    opacity: 1;
    z-index: 2;
  }

  .workspace-resize-preview__delete-zone {
    border: 1px solid color-mix(in srgb, var(--color-action-danger-hover) 8%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-action-danger-hover) 6%, transparent),
      color-mix(in srgb, var(--color-action-danger-hover) 2%, transparent)
    );
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
    opacity: 0.28;
  }

  .workspace-resize-preview__delete-zone--near {
    border-color: color-mix(in srgb, var(--color-action-danger-hover) 14%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-action-danger-hover) 10%, transparent),
      color-mix(in srgb, var(--color-action-danger-hover) 4%, transparent)
    );
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-action-danger-hover) 6%, transparent);
    opacity: 0.52;
  }

  .workspace-resize-preview__delete-zone--active {
    border-color: color-mix(in srgb, var(--color-action-danger-hover) 22%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-action-danger-hover) 16%, transparent),
      color-mix(in srgb, var(--color-action-danger-hover) 8%, transparent)
    );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-action-danger-hover) 12%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-action-danger-hover) 8%, transparent);
    opacity: 0.82;
  }

  .workspace-resize-preview__delete-guide {
    background: color-mix(in srgb, var(--color-action-danger-hover) 18%, transparent);
    transition:
      background-color 120ms ease,
      opacity 120ms ease;
    opacity: 0.18;
  }

  .workspace-resize-preview__delete-guide--near {
    background: color-mix(in srgb, var(--color-action-danger-hover) 28%, transparent);
    opacity: 0.38;
  }

  .workspace-resize-preview__delete-guide--active {
    background: color-mix(in srgb, var(--color-action-danger-hover) 52%, transparent);
    opacity: 0.72;
  }

  .workspace-resize-preview__delete-gizmo {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--color-action-danger-hover) 58%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-elevated) 86%, transparent);
    color: var(--color-action-danger-hover);
    font-size: 17px;
    font-weight: 700;
    line-height: 1;
    opacity: 0.72;
    transform: translate(-50%, -50%);
  }

  .workspace-resize-preview__delete-gizmo--active {
    border-color: var(--color-action-danger-hover);
    background: color-mix(in srgb, var(--color-action-danger-hover) 20%, var(--color-background-elevated));
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-action-danger-hover) 28%, transparent);
    opacity: 1;
  }
</style>
