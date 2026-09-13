<script lang="ts">
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  export let executionMode: 'direct' | 'step' = 'direct';
  export let onExecutionModeChange: (mode: 'direct' | 'step') => void = () => undefined;
  export let onBack: () => void = () => undefined;
  export let onAction: () => void = () => undefined;
  export let backLabel = 'Back';
  export let backAriaLabel = 'Back';
  export let actionLabel = 'Continue';
  export let actionDisabled = false;
  export let actionAriaLabel = actionLabel;
  export let ariaLabel = 'Launch action dock';

  const i18nT = getWorkbenchTranslator();
</script>

<section class="launch-action-dock" aria-label={ariaLabel || $i18nT('ui.shell.launchGate.actionDock.ariaLabel', { default: 'Launch action dock' })} aria-live="polite">
  <div class="launch-action-dock__execution-mode" role="group" aria-label={$i18nT('ui.shell.launchGate.actionDock.executionMode', { default: 'Launch execution mode' })}>
    <button
      type="button"
      aria-label={$i18nT('ui.shell.launchGate.actionDock.directExecution', { default: 'Direct execution' })}
      aria-pressed={executionMode === 'direct'}
      title={$i18nT('ui.shell.launchGate.actions.direct', { default: 'Direct' })}
      on:click={() => onExecutionModeChange('direct')}
    >
      <WorkbenchIcon icon="action.play" label={$i18nT('ui.shell.launchGate.actions.direct', { default: 'Direct' })} />
    </button>
    <button
      type="button"
      aria-label={$i18nT('ui.shell.launchGate.actionDock.stepExecution', { default: 'Step-by-step execution' })}
      aria-pressed={executionMode === 'step'}
      title={$i18nT('ui.shell.launchGate.actions.stepByStep', { default: 'Step-by-step' })}
      on:click={() => onExecutionModeChange('step')}
    >
      <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.actions.stepByStep', { default: 'Step-by-step' })} />
    </button>
  </div>

  <div class="launch-action-dock__actions">
    <button type="button" class="launch-action-dock__back" aria-label={backAriaLabel} on:click={onBack}>
      <span aria-hidden="true"><WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.back', { default: 'Back' })} /></span>
      <strong>{backLabel}</strong>
    </button>
    <button
      type="button"
      class="launch-action-dock__primary"
      aria-label={actionAriaLabel}
      disabled={actionDisabled}
      on:click={() => onAction()}
    >
      {actionLabel}
    </button>
  </div>
</section>

<style>
  .launch-action-dock {
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 0 0;
    border-top: 1px solid rgba(119, 147, 183, 0.18);
  }

  .launch-action-dock__execution-mode {
    min-width: 5.7rem;
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3px;
    padding: 3px;
    border: 1px solid rgba(119, 147, 183, 0.22);
    border-radius: 7px;
    background: rgba(7, 13, 22, 0.4);
  }

  .launch-action-dock__execution-mode button,
  .launch-action-dock__back,
  .launch-action-dock__primary {
    min-height: 2.2rem;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--workbench-text-secondary, #b8c6d8);
    background: transparent;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 850;
    cursor: pointer;
  }

  .launch-action-dock__execution-mode button {
    width: 2.45rem;
    display: grid;
    place-items: center;
    padding: 0;
  }

  .launch-action-dock__execution-mode button :global(.workbench-icon) {
    width: 1.05rem;
    height: 1.05rem;
    font-size: 1.05rem;
  }

  .launch-action-dock__execution-mode button[aria-pressed='true'] {
    border-color: var(--step-card-border, rgba(96, 239, 196, 0.42));
    color: var(--workbench-text-primary, #e8eef8);
    background: var(--step-card-bg, rgba(13, 115, 92, 0.24));
  }

  .launch-action-dock__actions {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .launch-action-dock__back {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    min-width: 7rem;
    justify-content: center;
    padding: 0 0.74rem;
    border-color: rgba(119, 147, 183, 0.26);
    color: var(--workbench-text-secondary, #b8c6d8);
    background: rgba(7, 13, 22, 0.28);
  }

  .launch-action-dock__back span {
    display: inline-grid;
    width: 1rem;
    height: 1rem;
    place-items: center;
  }

  .launch-action-dock__primary {
    min-width: 9.8rem;
    padding: 0 0.9rem;
    border-color: var(--step-card-border, rgba(96, 239, 196, 0.42));
    color: var(--workbench-text-primary, #e8eef8);
    background: linear-gradient(
      135deg,
      rgba(var(--step-rgb, 96, 239, 196), 0.32),
      color-mix(in srgb, var(--step-accent, #60efc4) 14%, transparent)
    );
  }

  .launch-action-dock__execution-mode button:hover,
  .launch-action-dock__execution-mode button:focus-visible,
  .launch-action-dock__back:hover,
  .launch-action-dock__back:focus-visible,
  .launch-action-dock__primary:hover:not(:disabled),
  .launch-action-dock__primary:focus-visible {
    border-color: rgba(var(--step-rgb, 96, 239, 196), 0.52);
    color: var(--workbench-text-primary, #e8eef8);
    outline: none;
  }

  .launch-action-dock__primary:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    .launch-action-dock {
      align-items: stretch;
    }

    .launch-action-dock__actions {
      width: 100%;
      justify-content: space-between;
    }

    .launch-action-dock__primary {
      flex: 1;
      min-width: 0;
    }
  }
</style>
