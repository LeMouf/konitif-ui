<script lang="ts">
  import WorkbenchIcon from './WorkbenchIcon.svelte';
  import { listWorkbenchIcons } from './iconRegistry';
  import type { WorkbenchIconTone } from '@konitif/workbench';

  export let filter = '';
  export let showInspector = true;
  export let compact = false;

  $: normalizedFilter = filter.trim().toLowerCase();
  $: icons = listWorkbenchIcons().filter((icon) =>
    !normalizedFilter ||
    `${icon.id} ${icon.title} ${icon.category} ${icon.tone} ${icon.designNodeId ?? ''}`.toLowerCase().includes(normalizedFilter)
  );
  $: featuredIcons = icons.slice(0, 8);
  $: toneGroups = createToneGroups(icons);
  $: selectedIcon = icons[0] ?? null;

  const previewModes = ['dark', 'light'] as const;
  const previewSizes = [
    { label: 'XS', value: 'var(--workbench-icon-size-xs)' },
    { label: 'SM', value: 'var(--workbench-icon-size-sm)' },
    { label: 'MD', value: 'var(--workbench-icon-size-md)' },
    { label: 'LG', value: 'var(--workbench-icon-size-lg)' }
  ];
  const typographyRows = [
    { label: 'Label', className: 'icon-library-view__type-label' },
    { label: 'Body', className: 'icon-library-view__type-body' },
    { label: 'Code', className: 'icon-library-view__type-code' }
  ];

  function createToneGroups(iconList: typeof icons): Array<{ tone: WorkbenchIconTone; count: number }> {
    const counts = new Map<WorkbenchIconTone, number>();

    for (const icon of iconList) {
      counts.set(icon.tone, (counts.get(icon.tone) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([tone, count]) => ({ tone, count }))
      .sort((left, right) => right.count - left.count || left.tone.localeCompare(right.tone));
  }
</script>

<div class:icon-library-view--compact={compact} class="icon-library-view">
  {#if showInspector && selectedIcon}
    <section class="icon-library-view__preview" aria-label="Icon preview">
      <div class="icon-library-view__preview-modes">
        {#each previewModes as mode}
          <article class="icon-library-view__mode-card" data-preview-mode={mode}>
            <header>
              <span>{mode}</span>
              <strong>{selectedIcon.title}</strong>
            </header>
            <div class="icon-library-view__mode-sizes">
              {#each previewSizes as size}
                <span style={`font-size: ${size.value}`}>
                  <WorkbenchIcon icon={selectedIcon.id} label={`${selectedIcon.title} ${size.label}`} />
                </span>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <div class="icon-library-view__type-situations">
        {#each typographyRows as row}
          <p class={row.className}>
            <WorkbenchIcon icon={selectedIcon.id} label={`${selectedIcon.title} ${row.label}`} />
            <span>{row.label}</span>
            <strong>{selectedIcon.title}</strong>
            <code>{selectedIcon.id}</code>
          </p>
        {/each}
      </div>

      <div class="icon-library-view__tone-strip" aria-label="Icon tone distribution">
        {#each toneGroups as group}
          <span data-tone={group.tone}>{group.tone} <strong>{group.count}</strong></span>
        {/each}
      </div>
    </section>
  {/if}

  <section class="icon-library-view__grid" aria-label="Icon library listing">
    {#each icons as icon (icon.id)}
      <button
        type="button"
        class="icon-library-view__item"
        data-tone={icon.tone}
        aria-label={`${icon.title}, ${icon.id}`}
      >
        <WorkbenchIcon icon={icon.id} label={icon.title} />
        <strong>{icon.title}</strong>
        <code>{icon.id}</code>
        {#if icon.designNodeId}<span>{icon.designNodeId}</span>{/if}
        <div class="icon-library-view__tooltip" role="tooltip">
          <strong>{icon.title}</strong>
          <code>{icon.id}</code>
          <span>{icon.category} / {icon.tone}</span>
          {#if icon.designNodeId}<span>{icon.designNodeId}</span>{/if}
        </div>
      </button>
    {/each}
  </section>

  {#if featuredIcons.length > 0}
    <section class="icon-library-view__swatches" aria-label="Featured icon color situations">
      {#each featuredIcons as icon}
        <span data-tone={icon.tone}>
          <WorkbenchIcon icon={icon.id} label={icon.title} />
          {icon.title}
        </span>
      {/each}
    </section>
  {/if}
</div>

<style>
  .icon-library-view {
    display: grid;
    gap: var(--space-10);
    min-width: 0;
  }

  .icon-library-view__preview {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
  }

  .icon-library-view__preview-modes {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .icon-library-view__mode-card {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
  }

  .icon-library-view__mode-card[data-preview-mode='dark'] {
    background: #101721;
    color: #d8e2f0;
  }

  .icon-library-view__mode-card[data-preview-mode='light'] {
    background: #f7f9fc;
    color: #172133;
  }

  .icon-library-view__mode-card header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .icon-library-view__mode-card header span,
  .icon-library-view__tone-strip span,
  .icon-library-view__swatches span {
    color: currentColor;
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .icon-library-view__mode-card header strong {
    overflow: hidden;
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-library-view__mode-sizes {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    min-height: 2.25rem;
  }

  .icon-library-view__type-situations {
    display: grid;
    gap: var(--space-5);
  }

  .icon-library-view__type-situations p {
    display: grid;
    align-items: center;
    gap: var(--space-6);
    grid-template-columns: 1.25rem 3.5rem minmax(0, 1fr) minmax(0, 1.25fr);
    min-width: 0;
    margin: 0;
    padding: var(--space-5) var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 52%, transparent);
  }

  .icon-library-view__type-label {
    font-size: var(--font-size-label);
    font-weight: 800;
    text-transform: uppercase;
  }

  .icon-library-view__type-body {
    font-size: var(--font-size-body);
  }

  .icon-library-view__type-code {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-code);
  }

  .icon-library-view__type-situations span,
  .icon-library-view__type-situations code {
    overflow: hidden;
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-library-view__type-situations strong {
    overflow: hidden;
    color: var(--color-text-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-library-view__tone-strip,
  .icon-library-view__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    min-width: 0;
  }

  .icon-library-view__tone-strip span,
  .icon-library-view__swatches span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-5);
    min-height: 1.8rem;
    padding: 0 var(--space-8);
    border: 1px solid color-mix(in srgb, var(--workbench-icon-color, currentColor) 42%, var(--color-border-subtle));
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--workbench-icon-color, currentColor) 10%, transparent);
  }

  .icon-library-view__grid {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  }

  .icon-library-view__item {
    position: relative;
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 76%, transparent);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-muted) 55%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    text-align: left;
    cursor: default;
    outline: none;
  }

  .icon-library-view__item:hover,
  .icon-library-view__item:focus-visible {
    border-color: color-mix(in srgb, var(--workbench-icon-color, var(--color-action-primary)) 48%, var(--color-border-subtle));
    background: color-mix(in srgb, var(--workbench-icon-color, var(--color-action-primary)) 10%, var(--color-background-muted));
  }

  .icon-library-view__item :global(.workbench-icon) {
    font-size: 1.5rem;
  }

  .icon-library-view__item strong,
  .icon-library-view__item code,
  .icon-library-view__item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-library-view__item strong {
    font-size: 0.75rem;
  }

  .icon-library-view__item code,
  .icon-library-view__item span {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
  }

  .icon-library-view__tooltip {
    position: absolute;
    left: var(--space-8);
    bottom: calc(100% + var(--space-6));
    z-index: 3;
    display: none;
    width: min(18rem, 80vw);
    gap: var(--space-3);
    padding: var(--space-8);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-medium);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
  }

  .icon-library-view__item:hover .icon-library-view__tooltip,
  .icon-library-view__item:focus-visible .icon-library-view__tooltip {
    display: grid;
  }

  .icon-library-view--compact .icon-library-view__preview {
    grid-template-columns: minmax(15rem, 0.85fr) minmax(18rem, 1fr);
    align-items: start;
  }

  .icon-library-view--compact .icon-library-view__preview-modes {
    grid-template-columns: repeat(2, minmax(8rem, 1fr));
  }

  .icon-library-view--compact .icon-library-view__grid {
    max-height: 18rem;
    overflow: auto;
    padding-right: var(--space-4);
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  }

  .icon-library-view--compact .icon-library-view__swatches {
    max-height: 5.25rem;
    overflow: auto;
  }

  @media (max-width: 760px) {
    .icon-library-view__preview-modes,
    .icon-library-view--compact .icon-library-view__preview,
    .icon-library-view--compact .icon-library-view__preview-modes {
      grid-template-columns: 1fr;
    }

    .icon-library-view__type-situations p {
      grid-template-columns: 1.25rem minmax(0, 1fr);
    }

    .icon-library-view__type-situations code {
      grid-column: 2;
    }
  }
</style>
