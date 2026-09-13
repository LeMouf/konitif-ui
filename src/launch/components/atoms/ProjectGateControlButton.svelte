<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';

  export let icon: string;
  export let label: string;
  export let active = false;
  export let disabled = false;
  export let tone: 'neutral' | 'primary' | 'danger' = 'neutral';
  export let tooltipPlacement: 'top' | 'bottom' = 'top';
</script>

<button
  type="button"
  class="project-gate-control-button"
  data-active={active}
  data-tone={tone}
  data-tooltip-placement={tooltipPlacement}
  {disabled}
  title={label}
  aria-label={label}
  on:click
>
  <WorkbenchIcon {icon} {label} />
  <span>{label}</span>
</button>

<style>
  .project-gate-control-button {
    position: relative;
    width: 2.45rem;
    height: 2.45rem;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.24)), transparent 4%);
    border-radius: 7px;
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), white 8%);
    background: rgba(5, 11, 20, 0.2);
    cursor: pointer;
    transition:
      color 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 180ms ease,
      transform 160ms ease;
  }

  .project-gate-control-button[data-active='true'],
  .project-gate-control-button:hover,
  .project-gate-control-button:focus-visible {
    color: var(--k-accent-primary, #60a5fa);
    border-color: color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 34%);
    background: color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 88%);
    box-shadow: 0 0 1.4rem color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 82%);
    outline: none;
  }

  .project-gate-control-button[data-tone='primary'] {
    color: #69ecc1;
  }

  .project-gate-control-button[data-tone='danger'] {
    color: #ff7a7a;
  }

  .project-gate-control-button:active {
    transform: translateY(1px);
  }

  .project-gate-control-button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    filter: saturate(0.5);
  }

  .project-gate-control-button :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .project-gate-control-button span {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    width: max-content;
    max-width: 12rem;
    padding: 0.42rem 0.5rem;
    border: 1px solid rgba(120, 151, 193, 0.22);
    border-radius: 7px;
    color: var(--k-text-primary, #eef4ff);
    background: rgba(7, 13, 23, 0.9);
    box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.22);
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1.2;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 4px);
    transition:
      opacity 140ms ease,
      transform 140ms ease;
  }

  .project-gate-control-button:hover span,
  .project-gate-control-button:focus-visible span {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .project-gate-control-button[data-tooltip-placement='bottom'] span {
    top: calc(100% + 8px);
    bottom: auto;
    transform: translate(-50%, -4px);
  }

  .project-gate-control-button[data-tooltip-placement='bottom']:hover span,
  .project-gate-control-button[data-tooltip-placement='bottom']:focus-visible span {
    transform: translate(-50%, 0);
  }
</style>
