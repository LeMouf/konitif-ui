<script lang="ts">
  export let label: string;
  export let branches: readonly {
    id: string;
    label: string;
    count?: number;
    steps?: readonly { id: string; label: string; disabled?: boolean }[];
  }[] = [];
  export let activeBranch: string | null = null;
  export let activeStep: string | null = null;
  export let onSelectBranch: (id: string) => void;
  export let onSelectStep: (id: string) => void;
</script>

<nav class="composer-navigation experience-composer__tabs" aria-label={label}>
  <div class="branches">
    {#each branches as branch (branch.id)}
      <div class="branch">
        <button type="button" class:active={activeBranch === branch.id}
          aria-pressed={activeBranch === branch.id} on:click={() => onSelectBranch(branch.id)}>
          <span>{branch.label}</span>
          {#if branch.count !== undefined}<small>{branch.count}</small>{/if}
        </button>
        {#if activeBranch === branch.id && branch.steps?.length}
          <div class="steps experience-composer__tree-children">
            {#each branch.steps as step, index (step.id)}
              <button type="button" class:active={activeStep === step.id}
                aria-current={activeStep === step.id ? 'step' : undefined} disabled={step.disabled}
                on:click={() => onSelectStep(step.id)}>
                <span aria-hidden="true">{index + 1}</span>{step.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if $$slots.actions}<div class="actions"><slot name="actions" /></div>{/if}
</nav>

<style>
  .composer-navigation { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 12px; overflow: auto; padding: 14px 0 14px 10px; border-right: 1px solid var(--color-border-subtle); background: var(--color-background-muted); }
  .branches, .branch, .steps { display: grid; gap: 7px; }
  button { font: inherit; color: inherit; text-align: left; border: 1px solid transparent; background: transparent; cursor: pointer; }
  button:disabled { cursor: default; opacity: .45; }
  button:not(:disabled):is(:hover, :focus-visible), button.active { background: color-mix(in srgb, var(--color-text-primary) 8%, transparent); }
  .branch > button { display: flex; align-items: center; gap: 8px; min-height: 3rem; padding: 8px 12px; border-radius: var(--radius-medium, 8px) 0 0 var(--radius-medium, 8px); }
  .branch > button.active { font-weight: 650; }
  small { margin-inline-start: auto; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
  .steps { position: relative; gap: 3px; margin: 0 10px 0 14px; padding-inline-start: 12px; }
  .steps::before { content: ''; position: absolute; top: -4px; bottom: 1.125rem; inset-inline-start: 0; width: 1px; background: var(--color-border-strong); }
  .steps button { position: relative; display: flex; align-items: center; gap: 6px; min-height: 2.25rem; padding: 6px 8px; border-radius: var(--radius-small, 5px); color: var(--color-text-secondary); }
  .steps button::before { content: ''; position: absolute; inset-inline-start: -13px; top: 0; width: 10px; height: 50%; border-left: 1px solid var(--color-border-strong); border-bottom: 1px solid var(--color-border-strong); border-radius: 0 0 0 8px; }
  .steps button.active { color: var(--color-text-primary); font-weight: 650; }
  .steps button span { display: inline-grid; place-items: center; flex: none; width: 1.25rem; height: 1.25rem; border: 1px solid currentColor; border-radius: 50%; font-size: .65rem; }
  .steps button.active span { color: var(--color-action-primary); }
  .actions { margin-top: auto; }
  @media (max-width: 760px) {
    .composer-navigation { flex-direction: row; padding: 8px; border-right: 0; border-bottom: 1px solid var(--color-border-subtle); }
    .branches { display: flex; flex: 1; flex-wrap: wrap; align-items: start; }
    .branch > button { min-height: 2.25rem; border-radius: var(--radius-small, 5px); }
    .steps { margin: 0; padding: 0; }
    .steps::before, .steps button::before { display: none; }
    .actions { margin-top: 0; }
  }
</style>
