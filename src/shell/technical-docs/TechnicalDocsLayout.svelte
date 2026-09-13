<script lang="ts">
  export let viewTitle: string;
</script>

<section class="technical-docs-view" class:technical-docs-view--with-status={Boolean($$slots.status)} aria-label={viewTitle}>
  {#if $$slots.status}
    <div class="technical-docs-view__status"><slot name="status" /></div>
  {/if}
  <div class="technical-docs-view__content">
    <slot />
  </div>
</section>

<style>
  .technical-docs-view {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-muted) 56%, transparent), transparent),
      var(--color-background-canvas);
  }

  .technical-docs-view__content {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
    padding: var(--space-6);
  }

  .technical-docs-view--with-status {
    grid-template-rows: auto minmax(0, 1fr);
  }

  @media (max-width: 640px) {
    .technical-docs-view__content {
      grid-template-rows: minmax(24rem, 1fr);
      overflow: auto;
      padding: var(--space-6);
    }
  }
</style>
