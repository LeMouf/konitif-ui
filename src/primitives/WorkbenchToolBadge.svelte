<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';

  export let className = '';
  export let icon: WorkbenchIconInput | null = 'app.product-shell';
  export let label = 'Workbench tool';
</script>

<span class={`workbench-tool-badge ${className}`.trim()}>
  <span class="workbench-tool-badge__glyph">
    <WorkbenchIcon {icon} {label} />
  </span>
</span>

<style>
  .workbench-tool-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 82%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-surface) 82%, transparent);
    color: color-mix(in srgb, var(--color-text-muted) 88%, transparent);
  }

  .workbench-tool-badge__glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .workbench-tool-badge__glyph :global(svg),
  .workbench-tool-badge__glyph :global(.workbench-icon) {
    width: 1.125rem;
    height: 1.125rem;
  }

  .workbench-tool-badge__glyph :global(svg) {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.35;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
