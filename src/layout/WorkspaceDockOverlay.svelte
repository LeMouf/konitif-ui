<script lang="ts">
  type WorkspaceOverlayRect = {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  type WorkspaceDragPanel = {
    title: string;
  };

  export let isActive = false;
  export let showDockPreviewHelpers = true;
  export let dragPreviewRect: WorkspaceOverlayRect | null = null;
  export let dragPreviewPlacement: string | null = null;
  export let dragPreviewTabIndicatorRect: WorkspaceOverlayRect | null = null;
  export let dragPanel: WorkspaceDragPanel | null = null;
  export let dragGhostStyle = '';
  export let tabDockLabel = 'Tab Dock';
</script>

{#if isActive}
  <div class="workspace-view__dock-overlay" aria-hidden="true">
    {#if showDockPreviewHelpers && dragPreviewRect}
      <div
        class:workspace-view__dock-preview--center={dragPreviewPlacement === 'center'}
        class:workspace-view__dock-preview--edge={dragPreviewPlacement !== 'center'}
        class="workspace-view__dock-preview"
        style:left={`${dragPreviewRect.left}px`}
        style:top={`${dragPreviewRect.top}px`}
        style:width={`${dragPreviewRect.width}px`}
        style:height={`${dragPreviewRect.height}px`}
      >
        {#if dragPreviewPlacement === 'center'}
          <div class="workspace-view__dock-preview-center-badge">{tabDockLabel}</div>
        {/if}
      </div>
    {/if}

    {#if showDockPreviewHelpers && dragPreviewTabIndicatorRect}
      <div
        class="workspace-view__dock-tab-indicator"
        style:left={`${dragPreviewTabIndicatorRect.left}px`}
        style:top={`${dragPreviewTabIndicatorRect.top}px`}
        style:width={`${dragPreviewTabIndicatorRect.width}px`}
        style:height={`${dragPreviewTabIndicatorRect.height}px`}
      ></div>
    {/if}

    {#if dragPanel}
      <div class="workspace-view__drag-ghost" style={dragGhostStyle}>
        <span class="workspace-view__drag-ghost-title">{dragPanel.title}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .workspace-view__dock-overlay {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
  }

  .workspace-view__dock-preview {
    position: absolute;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 70%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 24%, transparent);
    overflow: hidden;
  }

  .workspace-view__dock-preview--center {
    background:
      linear-gradient(
        to bottom,
        color-mix(in srgb, var(--color-action-primary-hover) 14%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 6%, transparent)
      );
  }

  .workspace-view__dock-preview--edge {
    background:
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 8%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 8%, transparent) 1rem
      );
  }

  .workspace-view__dock-preview-center-badge {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 0 var(--space-8);
    min-height: 1.5rem;
    display: inline-flex;
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 52%, transparent);
    background: color-mix(in srgb, var(--color-background-elevated) 92%, transparent);
    color: var(--color-text-primary);
    font-size: var(--font-size-label);
    letter-spacing: 0.02em;
  }

  .workspace-view__dock-tab-indicator {
    position: absolute;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 88%, white 8%);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-background-canvas) 78%, transparent),
      0 0 12px color-mix(in srgb, var(--color-border-edge-split-hover) 22%, transparent);
  }

  .workspace-view__drag-ghost {
    position: absolute;
    transform: translate(0, 0);
    min-width: 8rem;
    max-width: 14rem;
    padding: var(--space-8) var(--space-10);
    border: 1px solid var(--color-border-strong);
    background: color-mix(in srgb, var(--color-background-elevated) 94%, transparent);
    box-shadow: var(--shadow-surface);
    color: var(--color-text-primary);
  }

  .workspace-view__drag-ghost-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
