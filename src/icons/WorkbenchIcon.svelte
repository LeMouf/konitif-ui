<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import { normalizeWorkbenchIconRef, resolveWorkbenchIconDefinition } from './iconRegistry';

  export let icon: WorkbenchIconInput | null | undefined = null;
  export let label = '';
  export let className = '';

  $: iconRef = normalizeWorkbenchIconRef(icon, label);
  $: definition = resolveWorkbenchIconDefinition(iconRef);
  $: fallback = iconRef?.fallback ?? label.slice(0, 2).toUpperCase();
  $: tone = iconRef?.tone ?? definition?.tone ?? 'default';
</script>

<span
  class={`workbench-icon ${className}`.trim()}
  data-tone={tone}
  data-has-icon={definition ? 'true' : 'false'}
  aria-hidden={label ? undefined : 'true'}
  aria-label={label || undefined}
>
  {#if definition}
    {@html definition.svg}
  {:else if fallback}
    <span class="workbench-icon__fallback">{fallback}</span>
  {/if}
</span>

<style>
  .workbench-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1em;
    height: 1em;
    color: var(--workbench-icon-color, currentColor);
    line-height: 1;
  }

  .workbench-icon :global(svg) {
    display: block;
    width: 1em;
    height: 1em;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: var(--workbench-icon-stroke-width, 1.75);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .workbench-icon[data-tone='action'] {
    --workbench-icon-color: var(--workbench-icon-color-action, currentColor);
  }

  .workbench-icon[data-tone='danger'] {
    --workbench-icon-color: var(--workbench-icon-color-danger, currentColor);
  }

  .workbench-icon[data-tone='design'] {
    --workbench-icon-color: var(--workbench-icon-color-design, currentColor);
  }

  .workbench-icon[data-tone='product'] {
    --workbench-icon-color: var(--workbench-icon-color-product, currentColor);
  }

  .workbench-icon[data-tone='runtime'] {
    --workbench-icon-color: var(--workbench-icon-color-runtime, currentColor);
  }

  .workbench-icon[data-tone='template'] {
    --workbench-icon-color: var(--workbench-icon-color-template, currentColor);
  }

  .workbench-icon[data-tone='shared'] {
    --workbench-icon-color: var(--workbench-icon-color-shared, currentColor);
  }

  .workbench-icon__fallback {
    font-size: 0.72em;
    font-weight: 800;
    line-height: 1;
  }
</style>
