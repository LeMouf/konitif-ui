<script lang="ts">
  import type { WorkbenchUserDataProjection } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';

  export let projection: WorkbenchUserDataProjection;
  export let title = 'User and data';
  export let labels = {
    connection: 'Account',
    data: 'Your data',
    services: 'Services',
    unavailable: 'Unavailable',
    actions: 'Actions'
  };
  export let onRequestAction: ((id: string) => void) | null = null;
</script>

<section class="user-panel" aria-label={title}>
  <header class="intro">
    <span>{labels.connection}</span>
    <h2>{title}</h2>
  </header>

  <div class="connection" data-status={projection.connection.status}>
    <span class="icon"><WorkbenchIcon icon="action.lock" /></span>
    <div class="connection-content">
      <slot name="connection">
        <strong>{projection.connection.label}</strong>
        {#if projection.connection.providerLabel}<p>{projection.connection.providerLabel}</p>{/if}
      </slot>
    </div>
  </div>

  {#if projection.dataUses.length}
    <section class="group" aria-label={labels.data}>
      <h3>{labels.data}</h3>
      <div class="cards">
        {#each projection.dataUses as use (use.id)}
          <article>
            <div class="card-heading"><span class="icon"><WorkbenchIcon icon="action.folder" /></span><h4>{use.label}</h4></div>
            <p>{use.purpose}</p>
            <small>{use.location}</small>
            {#if use.retention}<p class="retention">{use.retention}</p>{/if}
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if projection.unavailableServices.length}
    <section class="group" aria-label={labels.services}>
      <h3>{labels.services}</h3>
      <div class="cards">
        {#each projection.unavailableServices as service (service.id)}
          <article>
            <div class="card-heading"><h4>{service.label}</h4><span class="badge">{labels.unavailable}</span></div>
            <p>{service.reason}</p>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if projection.actions.length}
    <section class="group" aria-label={labels.actions}>
      <h3>{labels.actions}</h3>
      <div class="cards">
        {#each projection.actions as action (action.id)}
          <article>
            <p>{action.description}</p>
            <button type="button" disabled={!onRequestAction} on:click={() => onRequestAction?.(action.id)}>{action.label}</button>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</section>

<style>
  .user-panel {
    --accent: var(--color-text-accent, #7dd3fc);
    display: grid;
    gap: 16px;
    padding: clamp(14px, 3vw, 24px);
    background:
      radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 48%),
      var(--color-background-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: 18px;
  }
  .intro { display: grid; justify-items: center; gap: 4px; text-align: center; }
  .intro span { color: var(--accent); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  h2, h3, h4, p { margin: 0; }
  h2 { font-size: clamp(1.1rem, 2.6vw, 1.6rem); }
  h3 { font-size: 0.9rem; }
  h4 { font-size: 0.85rem; line-height: 1.4; }
  p { color: var(--color-text-secondary); font-size: 0.8rem; line-height: 1.5; }
  .connection, article {
    border: 1px solid var(--color-border-subtle);
    background: var(--color-background-muted);
    border-radius: 12px;
  }
  .connection {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px;
    border-color: color-mix(in srgb, var(--accent) 35%, var(--color-border-subtle));
  }
  .connection-content { flex: 1; min-width: 0; }
  .connection[data-status='unavailable'] { border-color: var(--color-border-subtle); }
  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
  }
  .group { display: grid; gap: 8px; border-top: 1px solid var(--color-border-subtle); padding-top: 12px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 8px; }
  article { display: grid; align-content: start; gap: 8px; padding: 12px; }
  .card-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  small, .badge {
    justify-self: start;
    border-radius: 999px;
    padding: 3px 8px;
    color: var(--color-text-secondary);
    background: color-mix(in srgb, currentColor 9%, transparent);
    font-size: 0.72rem;
  }
  .retention { font-size: 0.75rem; }
  button {
    justify-self: start;
    border: 1px solid var(--color-border-subtle);
    border-radius: 8px;
    background: var(--color-background-surface);
    color: inherit;
    padding: 7px 12px;
    font: inherit;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: default; }
</style>
