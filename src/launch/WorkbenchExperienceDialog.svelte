<script lang="ts">
  export let title = 'Experiences';
  export let activeName: string | null = null;
  export let activeLabel = 'In progress';
  export let closeLabel = 'Close experiences';
  export let onClose: (() => void) | null = null;
</script>

<div class="experience-dialog" role="dialog" aria-modal="true" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <div class="context">
      {#if activeName}
        <p title={activeName}>{activeLabel} · <strong>{activeName}</strong></p>
      {/if}
      {#if $$slots['header-actions']}
        <div class="actions"><slot name="header-actions" /></div>
      {/if}
    </div>
    {#if onClose}
      <button type="button" aria-label={closeLabel} title={closeLabel} on:click={onClose}>×</button>
    {/if}
  </header>
  <slot />
</div>

<style>
  .experience-dialog {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 16px;
    box-sizing: border-box;
    width: min(1180px, calc(100vw - 40px), calc((100dvh - 60px) * 4 / 3));
    aspect-ratio: 4 / 3;
    max-height: calc(100dvh - 60px);
    padding: 20px 20px 0;
    overflow: hidden;
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-subtle);
    border-radius: 8px;
    font-size: 14px;
  }
  header {
    display: grid;
    grid-template-columns: 135px minmax(0, 1fr) auto;
    gap: 24px;
    align-items: center;
    min-height: 32px;
  }
  h2 { margin: 0; font-size: 17px; }
  .context { display: flex; align-items: center; min-width: 0; gap: 12px; }
  .context p {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    padding: 6px 10px;
    border-left: 3px solid var(--color-text-secondary);
    background: var(--color-background-muted);
  }
  .actions { margin-inline-start: auto; flex: none; }
  button {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--color-background-muted);
    color: inherit;
    border: 1px solid var(--color-border-subtle);
    border-radius: 4px;
    font: 18px/1 system-ui;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .experience-dialog {
      width: calc(100vw - 20px);
      height: calc(100dvh - 20px);
      max-height: none;
      aspect-ratio: auto;
      padding: 14px 14px 0;
    }
    header { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
    .context { grid-column: 1 / -1; grid-row: 2; }
    .context:empty { display: none; }
    button { grid-column: 2; grid-row: 1; }
  }
</style>
