<script lang="ts">
  export let id: string;
  export let role = 'panel';
  export let depth: string | null = null;
  export let active = false;
  export let focusStrength = 1;
  export let interactive = true;
  export let as: keyof HTMLElementTagNameMap = 'div';
  export let ariaRole: string | null = 'group';
  let className = '';
  export { className as class };
</script>

<svelte:element
  this={as}
  {...$$restProps}
  class={`workbench-surface-frame ${className}`.trim()}
  data-workbench-surface-frame={id}
  data-workbench-surface-active={active ? 'true' : undefined}
  data-workbench-surface-role={role}
  data-workbench-surface-depth={depth ?? undefined}
  data-workbench-focus-strength={focusStrength}
  role={interactive ? (ariaRole ?? undefined) : undefined}
>
  <slot />
</svelte:element>
