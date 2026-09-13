<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';

  export let label: string;
  export let title: string | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'ghost' | 'active' | 'danger' = 'ghost';
  export let disabled = false;
  export let icon: WorkbenchIconInput | null = null;
</script>

<button
  {type}
  {title}
  {disabled}
  aria-label={label}
  class:icon-button--active={variant === 'active'}
  class:icon-button--danger={variant === 'danger'}
  class="icon-button"
  on:click
  on:keydown
>
  <span class="icon-button__icon" aria-hidden="true">
    {#if icon}
      <WorkbenchIcon {icon} {label} />
    {:else}
      <slot />
    {/if}
  </span>
</button>

<style>
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon-button);
    min-width: var(--size-icon-button);
    min-height: var(--size-icon-button);
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: var(--color-text-secondary);
    border-radius: var(--radius-medium);
    flex: 0 0 auto;
  }

  .icon-button:disabled {
    opacity: 0.38;
    color: var(--color-text-muted);
    cursor: not-allowed;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--color-background-hover);
    border-color: var(--color-border-subtle);
    color: var(--color-text-primary);
  }

  .icon-button:active:not(:disabled) {
    background: var(--color-background-pressed);
  }

  .icon-button:focus-visible:not(:disabled) {
    border-color: var(--color-border-focus);
    color: var(--color-text-primary);
  }

  .icon-button--active {
    background: var(--color-background-selected);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .icon-button--active:hover:not(:disabled) {
    background: var(--color-background-hover);
  }

  .icon-button--danger {
    color: var(--color-text-danger);
  }

  .icon-button--danger:hover:not(:disabled) {
    background: var(--color-background-danger);
    border-color: var(--color-border-danger);
    color: var(--color-text-danger);
  }

  .icon-button--danger:active:not(:disabled) {
    background: var(--color-background-danger-hover);
  }

  .icon-button__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .icon-button__icon :global(.workbench-icon),
  .icon-button__icon :global(svg) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .icon-button__icon :global(svg) {
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
