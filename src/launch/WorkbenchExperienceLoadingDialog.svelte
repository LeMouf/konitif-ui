<script context="module" lang="ts">
  export type ExperienceLoadingStep = {
    label: string;
    status: 'pending' | 'running' | 'ready' | 'failed';
    detail?: string;
    duration?: number;
    startedAt?: number;
  };
</script>

<script lang="ts">
  export let message = 'Préparation de votre espace';
  export let steps: readonly ExperienceLoadingStep[] = [];
  export let now = 0;
  export let onCancel: (() => void) | null = null;
  $: completed = steps.filter(step => step.status === 'ready').length;
</script>

<div class="experience-loading" role="status" aria-live="polite" aria-label="Chargement de l’expérience">
  <div class="panel">
    <span class="spinner" aria-hidden="true"></span>
    <strong>Chargement de l’expérience…</strong>
    <small>{message}</small>
    {#if steps.length}
      <p>{completed} / {steps.length} étapes confirmées</p>
      <ol>
        {#each steps as step (step.label)}
          <li class:running={step.status === 'running'} class:failed={step.status === 'failed'}>
            <span aria-hidden="true">{step.status === 'ready' ? '✓' : step.status === 'failed' ? '!' : step.status === 'running' ? '◌' : '·'}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.status === 'ready' ? 'Prêt' : step.status === 'failed' ? 'Échec' : step.status === 'running' ? 'En cours' : 'En attente'}{step.duration === undefined ? '' : ' · ' + (step.duration / 1000).toFixed(1) + ' s'}</small>
              {#if step.detail}<small>{step.detail}</small>{/if}
              {#if step.status === 'running' && step.startedAt !== undefined && now - step.startedAt > 3000}
                <small>Cette étape travaille depuis {Math.floor((now - step.startedAt) / 1000)} s.</small>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    {/if}
    {#if onCancel}<button type="button" on:click={onCancel}>Annuler l’ouverture</button>{/if}
    <slot />
  </div>
</div>

<style>
  .experience-loading {
    position: fixed; inset: 0; z-index: 10001; display: grid; place-items: center;
    padding: 16px; box-sizing: border-box; background: rgb(6 12 22 / 16%);
    backdrop-filter: blur(5px); overflow: auto; overscroll-behavior: contain; cursor: progress;
  }
  .panel {
    display: grid; justify-items: center; gap: 14px; width: min(360px, 100%);
    max-height: calc(100dvh - 32px); overflow: auto; padding: 28px; box-sizing: border-box;
    border: 1px solid var(--color-border-subtle); border-radius: 10px; box-shadow: 0 8px 28px #0006;
    background: var(--color-background-surface); color: var(--color-text-primary); text-align: center;
  }
  small, p { color: var(--color-text-secondary); font-size: 12px; margin: 0; }
  .spinner { width: 24px; height: 24px; border: 2px solid var(--color-border-subtle); border-top-color: var(--color-text-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  ol { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; width: 100%; text-align: left; }
  li { display: grid; grid-template-columns: 20px 1fr; gap: 8px; opacity: 0.58; }
  li.running, li.failed { opacity: 1; }
  li > div { display: grid; gap: 3px; }
  li strong { font-size: 13px; }
  li small { font-size: 11px; }
  li.running > span { color: #80b5ef; }
  li.failed > span { color: #eea092; }
  button { font: inherit; color: inherit; background: var(--color-background-muted); border: 1px solid var(--color-border-subtle); border-radius: 4px; padding: 6px; cursor: pointer; }
</style>
