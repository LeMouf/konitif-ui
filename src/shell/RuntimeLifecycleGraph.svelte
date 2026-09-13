<script lang="ts">
  import type {
    RuntimeLifecycleSnapshot,
    RuntimeLifecycleState,
    RuntimeLifecycleTransition
  } from '@konitif/workbench';

  export let lifecycle: RuntimeLifecycleSnapshot | null | undefined = null;
  export let compact = false;

  const lifecycleStates: RuntimeLifecycleState[] = [
    'BOOT',
    'LAUNCH_GATE',
    'CONTEXT_RESOLVED',
    'PREFLIGHT',
    'PLANNED',
    'INITIALIZING',
    'HYDRATING',
    'RUNNING',
    'SUSPENDING',
    'SUSPENDED',
    'RESUMING',
    'TEARDOWN',
    'RECOVERY',
    'SAFE_MODE'
  ];
  const macroPhaseByState: Record<RuntimeLifecycleState, string> = {
    BOOT: 'Boot',
    LAUNCH_GATE: 'Launch',
    CONTEXT_RESOLVED: 'Launch',
    PREFLIGHT: 'Plan',
    PLANNED: 'Plan',
    INITIALIZING: 'Start',
    HYDRATING: 'Start',
    RUNNING: 'Runtime',
    SUSPENDING: 'Suspend',
    SUSPENDED: 'Suspend',
    RESUMING: 'Suspend',
    TEARDOWN: 'Teardown',
    RECOVERY: 'Recovery',
    SAFE_MODE: 'Recovery'
  };

  $: activeState = lifecycle?.state ?? 'LAUNCH_GATE';
  $: acceptedTransitions = (lifecycle?.transitions ?? []).filter((transition) => transition.accepted);
  $: rejectedTransitions = (lifecycle?.transitions ?? []).filter((transition) => !transition.accepted);
  $: visitedStates = new Set<RuntimeLifecycleState>(acceptedTransitions.map((transition) => transition.to));
  $: latestTransition = lifecycle?.transitions?.[0] ?? null;

  function resolveStateClass(state: RuntimeLifecycleState): string {
    if (state === activeState) {
      return 'runtime-lifecycle-graph__node--active';
    }

    if (visitedStates.has(state)) {
      return 'runtime-lifecycle-graph__node--visited';
    }

    if (state === 'RECOVERY' || state === 'SAFE_MODE') {
      return 'runtime-lifecycle-graph__node--recovery';
    }

    return '';
  }

  function formatTransition(transition: RuntimeLifecycleTransition | null): string {
    if (!transition) {
      return 'No transition captured';
    }

    return `${transition.from ?? 'start'} -> ${transition.to}: ${transition.message}`;
  }
</script>

<section class:runtime-lifecycle-graph--compact={compact} class="runtime-lifecycle-graph" aria-label="Runtime lifecycle graph">
  <header>
    <div>
      <span>Lifecycle</span>
      <strong>{activeState}</strong>
    </div>
    <p>{formatTransition(latestTransition)}</p>
  </header>

  <ol>
    {#each lifecycleStates as state (state)}
      <li class={resolveStateClass(state)} title={`${macroPhaseByState[state]} / ${state}`}>
        <span>{macroPhaseByState[state]}</span>
        <strong>{state}</strong>
      </li>
    {/each}
  </ol>

  {#if rejectedTransitions.length > 0}
    <div class="runtime-lifecycle-graph__errors">
      {#each rejectedTransitions.slice(0, compact ? 1 : 3) as transition (transition.id)}
        <p>{transition.from ?? 'start'} -> {transition.to}: {transition.message}</p>
      {/each}
    </div>
  {/if}
</section>

<style>
  .runtime-lifecycle-graph {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .runtime-lifecycle-graph header {
    display: grid;
    gap: 0.35rem;
  }

  .runtime-lifecycle-graph header div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .runtime-lifecycle-graph header span,
  .runtime-lifecycle-graph li span {
    color: var(--color-text-muted);
    font-size: 0.68rem;
    font-weight: 840;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .runtime-lifecycle-graph header strong {
    color: var(--color-accent, #69ecc1);
  }

  .runtime-lifecycle-graph header p,
  .runtime-lifecycle-graph__errors p {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .runtime-lifecycle-graph ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.2rem, 1fr));
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .runtime-lifecycle-graph li {
    min-width: 0;
    display: grid;
    gap: 0.25rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 82%, transparent);
    border-radius: 0.45rem;
    background: color-mix(in srgb, var(--color-background-elevated) 72%, transparent);
  }

  .runtime-lifecycle-graph li strong {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .runtime-lifecycle-graph__node--visited {
    border-color: rgba(105, 236, 193, 0.32) !important;
    background: rgba(105, 236, 193, 0.08) !important;
  }

  .runtime-lifecycle-graph__node--active {
    border-color: rgba(105, 236, 193, 0.72) !important;
    box-shadow: 0 0 0 1px rgba(105, 236, 193, 0.16), 0 0.8rem 2rem rgba(27, 214, 185, 0.12);
    background: rgba(30, 159, 134, 0.18) !important;
  }

  .runtime-lifecycle-graph__node--recovery {
    border-color: rgba(255, 115, 136, 0.3);
  }

  .runtime-lifecycle-graph__errors {
    display: grid;
    gap: 0.3rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid rgba(255, 115, 136, 0.32);
    border-radius: 0.45rem;
    background: rgba(255, 115, 136, 0.08);
  }

  .runtime-lifecycle-graph--compact ol {
    grid-template-columns: repeat(auto-fit, minmax(6.6rem, 1fr));
  }

  .runtime-lifecycle-graph--compact li {
    padding: 0.45rem 0.5rem;
  }
</style>
