<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import IconButton from '../../primitives/IconButton.svelte';
  import WorkbenchToolBadge from '../../primitives/WorkbenchToolBadge.svelte';
  import WorkbenchToolGlyph from '../../primitives/WorkbenchToolGlyph.svelte';

  type RealPreviewState = {
    id: string;
    label: string;
    variant: 'ghost' | 'active' | 'danger';
    disabled: boolean;
    icon: WorkbenchIconInput;
  };

  export let kind = 'surface';
  export let label = '';
  export let icon: WorkbenchIconInput = 'app.product-shell';
  export let states: RealPreviewState[] = [];
  export let summary = '';
  export let primaryRole = '';
</script>

<div class="product-real-preview-stage" data-preview-kind={kind}>
  {#if kind === 'icon-button'}
    <article class="product-real-preview-stage__icon-button-board">
      <header>
        <strong>IconButton</strong>
        <code>button + WorkbenchIcon</code>
      </header>
      <div class="product-real-preview-stage__icon-button-states">
        {#each states as state (state.id)}
          <figure>
            <IconButton label={`${state.label} icon button`} icon={state.icon} variant={state.variant} disabled={state.disabled} />
            <figcaption>{state.label}</figcaption>
          </figure>
        {/each}
      </div>
      <div class="product-real-preview-stage__icon-button-contract">
        <span><code>--size-icon-button</code><strong>control</strong></span>
        <span><code>--size-icon</code><strong>glyph</strong></span>
        <span><code>--radius-medium</code><strong>shape</strong></span>
      </div>
    </article>
  {:else if kind === 'tool-badge'}
    <WorkbenchToolBadge {label} {icon} />
  {:else if kind === 'tool-glyph'}
    <WorkbenchToolGlyph />
  {:else if kind === 'icon'}
    <WorkbenchIcon {icon} {label} />
  {:else if kind === 'panel-chrome'}
    <article class="product-real-preview-stage__panel">
      <header><strong>{label}</strong><span></span></header>
      <main><i></i><i></i><i></i></main>
    </article>
  {:else if kind === 'handle'}
    <div class="product-real-preview-stage__handle" aria-label={label}></div>
  {:else if kind === 'shortcut'}
    <kbd class="product-real-preview-stage__shortcut">{label.slice(0, 1).toUpperCase()}</kbd>
  {:else}
    <article class="product-real-preview-stage__component">
      <WorkbenchIcon {icon} {label} />
      <strong>{label}</strong>
      <span>{primaryRole || summary}</span>
    </article>
  {/if}
</div>

<style>
  .product-real-preview-stage {
    display: grid;
    place-items: center;
    min-width: 18rem;
    min-height: 12rem;
    padding: 2rem;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 28%, var(--color-border-subtle));
    border-radius: 0.65rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-elevated) 86%, transparent), color-mix(in srgb, var(--color-background-surface) 78%, transparent));
  }

  .product-real-preview-stage :global(.icon-button) {
    --size-icon-button: 2.5rem;
    --size-icon: 1.12rem;
  }

  .product-real-preview-stage__icon-button-board {
    display: grid;
    gap: 1rem;
    width: min(30rem, 78%);
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 34%, var(--color-border-subtle));
    border-radius: 0.68rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-elevated) 92%, transparent), color-mix(in srgb, var(--color-background-surface) 82%, transparent)),
      color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 5%, var(--color-background-surface));
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.18);
  }

  .product-real-preview-stage__icon-button-board header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
  }

  .product-real-preview-stage__icon-button-board header strong,
  .product-real-preview-stage__icon-button-board header code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-real-preview-stage__icon-button-board header code {
    color: var(--color-text-muted);
    font-size: 0.68rem;
  }

  .product-real-preview-stage__icon-button-states {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .product-real-preview-stage__icon-button-states figure {
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    min-width: 0;
    margin: 0;
    padding: 0.75rem 0.45rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--color-background-muted) 52%, transparent);
  }

  .product-real-preview-stage__icon-button-states figcaption {
    overflow: hidden;
    max-width: 100%;
    color: var(--color-text-muted);
    font-size: 0.62rem;
    font-weight: 780;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .product-real-preview-stage__icon-button-contract {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .product-real-preview-stage__icon-button-contract span {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
    padding: 0.58rem 0.65rem;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 24%, var(--color-border-subtle));
    border-radius: 0.42rem;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 8%, transparent);
  }

  .product-real-preview-stage__icon-button-contract code,
  .product-real-preview-stage__icon-button-contract strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-real-preview-stage__icon-button-contract code {
    color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 80%, var(--color-text-muted));
    font-size: 0.58rem;
  }

  .product-real-preview-stage__icon-button-contract strong {
    color: var(--color-text);
    font-size: 0.7rem;
  }

  .product-real-preview-stage :global(.workbench-tool-badge) {
    width: 4.2rem;
    height: 4.2rem;
  }

  .product-real-preview-stage > :global(.workbench-icon) {
    width: 2.5rem;
    height: 2.5rem;
    color: var(--color-text-primary);
  }

  .product-real-preview-stage__panel,
  .product-real-preview-stage__component {
    display: grid;
    gap: 0.75rem;
    width: min(28rem, 76%);
    min-height: 10rem;
    padding: 0.85rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.55rem;
    background: var(--color-background-surface);
    color: var(--color-text);
  }

  .product-real-preview-stage__panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .product-real-preview-stage__panel header span {
    width: 3.5rem;
    height: 0.6rem;
    border-radius: 999px;
    background: var(--color-background-muted);
  }

  .product-real-preview-stage__panel main {
    display: grid;
    gap: 0.55rem;
    align-content: start;
  }

  .product-real-preview-stage__panel main i {
    height: 0.7rem;
    border-radius: 999px;
    background: var(--color-background-muted);
  }

  .product-real-preview-stage__panel main i:nth-child(2) {
    width: 72%;
  }

  .product-real-preview-stage__panel main i:nth-child(3) {
    width: 48%;
  }

  .product-real-preview-stage__handle {
    width: 0.55rem;
    height: 8rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 42%, var(--color-background-elevated));
    box-shadow: 0 0 0 0.45rem color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 10%, transparent);
  }

  .product-real-preview-stage__shortcut {
    display: grid;
    place-items: center;
    min-width: 2.5rem;
    min-height: 2.1rem;
    padding: 0 0.75rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 0.45rem;
    background: var(--color-background-elevated);
    color: var(--color-text);
    font: inherit;
    font-weight: 850;
  }

  .product-real-preview-stage__component {
    place-items: center;
    text-align: center;
  }

  .product-real-preview-stage__component :global(.workbench-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--product-tone-color, var(--color-action-primary));
  }

  .product-real-preview-stage__component strong,
  .product-real-preview-stage__component span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-real-preview-stage__component span {
    color: var(--color-text-muted);
    font-size: 0.7rem;
  }
</style>
