<script context="module" lang="ts">
  export type WorkspaceBoundaryGuide = {
    key: string;
    left: number;
    top: number;
    width: number;
    height: number;
    axis: 'horizontal' | 'vertical';
    kind: 'neutral' | 'creation';
    crossed: boolean;
    armed: boolean;
  };

  export type WorkspaceBoundaryTrail = {
    key: string;
    left: number;
    top: number;
    width: number;
    height: number;
    axis: 'horizontal' | 'vertical';
    kind: 'armed' | 'creation';
  };

  export type WorkspaceBoundaryBand = {
    key: string;
    left: number;
    top: number;
    width: number;
    height: number;
    axis: 'horizontal' | 'vertical';
  };

</script>

<script lang="ts">
  export let guides: WorkspaceBoundaryGuide[] = [];
  export let trails: WorkspaceBoundaryTrail[] = [];
  export let bands: WorkspaceBoundaryBand[] = [];
</script>

<div class="workspace-boundary-preview" aria-hidden="true">
  {#each guides as guide (guide.key)}
    <div
      class:workspace-boundary-preview__guide--column={guide.axis === 'horizontal'}
      class:workspace-boundary-preview__guide--row={guide.axis === 'vertical'}
      class:workspace-boundary-preview__guide--crossed={guide.crossed}
      class:workspace-boundary-preview__guide--armed={guide.armed}
      class:workspace-boundary-preview__guide--creation={guide.kind === 'creation'}
      class="workspace-boundary-preview__guide"
      style:left={`${guide.left}px`}
      style:top={`${guide.top}px`}
      style:width={`${guide.width}px`}
      style:height={`${guide.height}px`}
    ></div>
  {/each}

  {#each trails as trail (trail.key)}
    <div
      class="workspace-boundary-preview__trail"
      class:workspace-boundary-preview__trail--column={trail.axis === 'horizontal'}
      class:workspace-boundary-preview__trail--row={trail.axis === 'vertical'}
      class:workspace-boundary-preview__trail--creation={trail.kind === 'creation'}
      style:left={`${trail.left}px`}
      style:top={`${trail.top}px`}
      style:width={`${trail.width}px`}
      style:height={`${trail.height}px`}
    ></div>
  {/each}

  {#each bands as band (band.key)}
    <div
      class="workspace-boundary-preview__band"
      class:workspace-boundary-preview__band--column={band.axis === 'horizontal'}
      class:workspace-boundary-preview__band--row={band.axis === 'vertical'}
      style:left={`${band.left}px`}
      style:top={`${band.top}px`}
      style:width={`${band.width}px`}
      style:height={`${band.height}px`}
    ></div>
  {/each}
</div>

<style>
  .workspace-boundary-preview {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .workspace-boundary-preview__guide {
    position: absolute;
    background: color-mix(in srgb, var(--color-border-subtle) 20%, transparent);
    opacity: 0.14;
    transition:
      opacity 120ms ease,
      background-color 120ms ease;
  }

  .workspace-boundary-preview__guide--creation {
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 24%, transparent);
  }

  .workspace-boundary-preview__guide--crossed {
    opacity: 0.28;
  }

  .workspace-boundary-preview__guide--armed.workspace-boundary-preview__guide--creation {
    opacity: 0.56;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 46%, transparent);
  }

  .workspace-boundary-preview__guide--crossed.workspace-boundary-preview__guide--creation {
    opacity: 0.84;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 72%, transparent);
  }

  .workspace-boundary-preview__trail {
    position: absolute;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 4%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 4%, transparent);
    opacity: 0.72;
  }

  .workspace-boundary-preview__trail--column {
    background:
      linear-gradient(to right, color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent), color-mix(in srgb, var(--color-action-primary-hover) 3%, transparent));
  }

  .workspace-boundary-preview__trail--row {
    background:
      linear-gradient(to bottom, color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent), color-mix(in srgb, var(--color-action-primary-hover) 3%, transparent));
  }

  .workspace-boundary-preview__trail--creation {
    border: 0;
    background: var(--color-border-focus);
    box-shadow: 0 0 0 1px var(--color-border-focus);
    opacity: 1;
  }

  .workspace-boundary-preview__band {
    position: absolute;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 58%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 16%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
  }

  .workspace-boundary-preview__band--column {
    background:
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent) 0.55rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 0.55rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 1.1rem
      );
  }

  .workspace-boundary-preview__band--row {
    background:
      repeating-linear-gradient(
        45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent) 0.55rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 0.55rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 1.1rem
      );
  }
</style>
