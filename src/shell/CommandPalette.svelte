<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import { filterCommandPaletteItems, groupCommandPaletteItems, type CommandPaletteItem } from './commandPalette';

  export let isOpen: boolean;
  export let items: CommandPaletteItem[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    select: { item: CommandPaletteItem };
  }>();
  const i18nT = getWorkbenchTranslator();

  let query = '';
  let expandedGroups = new Set<string>();
  let queryInput: HTMLInputElement | null = null;

  $: if (!isOpen) {
    query = '';
  }
  $: filteredItems = filterCommandPaletteItems(items, query);
  $: groups = groupCommandPaletteItems(filteredItems);
  $: if (isOpen && queryInput) {
    queryInput.focus();
  }

  function selectItem(item: CommandPaletteItem): void {
    dispatch('select', { item });
  }

  function toggleGroup(id: string): void {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    expandedGroups = next;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
</script>

{#if isOpen}
  <div class="command-palette__layer">
    <button
      type="button"
      class="command-palette__backdrop"
      aria-label={$i18nT('ui.shell.commandPalette.close', { default: 'Close command palette' })}
      on:click={() => dispatch('close')}
    />
    <div
      class="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label={$i18nT('ui.shell.commandPalette.ariaLabel', { default: 'Command palette' })}
    >
      <div class="command-palette__header">
        <p class="command-palette__label">{$i18nT('ui.shell.commandPalette.title', { default: 'Command Palette' })}</p>
        <IconButton
          label={$i18nT('ui.shell.commandPalette.close', { default: 'Close command palette' })}
          title={$i18nT('ui.shell.commandPalette.close', { default: 'Close command palette' })}
          icon="action.close"
          on:click={() => dispatch('close')}
        />
      </div>

      <input
        bind:this={queryInput}
        class="command-palette__input"
        type="text"
        bind:value={query}
        placeholder={$i18nT('ui.shell.commandPalette.placeholder', { default: 'Filter commands...' })}
        on:keydown={handleKeyDown}
      />

      <div class="command-palette__list">
        {#each groups as group (group.id)}
          {#if group.title}
            <button class="command-palette__group-title"
              aria-expanded={Boolean(query.trim()) || expandedGroups.has(group.id)}
              on:click={() => toggleGroup(group.id)}>{group.title}</button>
          {/if}
          {#if !group.title || query.trim() || expandedGroups.has(group.id)}
          {#each group.items as item (item.id)}
          <button class="command-palette__item" disabled={Boolean(item.disabledReason)} on:click={() => selectItem(item)}>
            <div class="command-palette__item-main">
              <div class="command-palette__item-row">
                {#if item.icon}
                  <span class="command-palette__item-icon">
                    <WorkbenchIcon icon={item.icon} label={item.title} />
                  </span>
                {/if}
                <span class="command-palette__item-title">{item.title}</span>
              </div>
              <p class="command-palette__item-copy">{item.description}</p>
              {#if item.disabledReason}<p class="command-palette__item-copy">{item.disabledReason}</p>{/if}
            </div>
            {#if item.shortcut}
              <span class="command-palette__item-shortcut">{item.shortcut}</span>
            {/if}
          </button>
          {/each}
          {/if}
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .command-palette__layer {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 12vh var(--space-16) var(--space-16);
    z-index: 10;
    isolation: isolate;
  }

  .command-palette__backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-background-overlay);
    border: 0;
    padding: 0;
    z-index: 0;
  }

  .command-palette {
    position: relative;
    z-index: 1;
    display: grid;
    gap: var(--space-12);
    width: min(42rem, 100%);
    padding: var(--space-12);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
  }

  .command-palette__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
  }

  .command-palette__label {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .command-palette__input {
    width: 100%;
    min-height: calc(var(--size-control-height) + var(--space-8));
    padding: var(--space-8) var(--space-12);
  }

  .command-palette__list {
    display: grid;
    gap: var(--space-6);
    max-height: 22rem;
    overflow: auto;
  }

  .command-palette__item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-12);
    width: 100%;
    min-height: auto;
    height: auto;
    padding: var(--space-12);
    text-align: left;
    background: var(--color-background-surface);
    border-radius: var(--radius-medium);
    white-space: normal;
  }

  .command-palette__group-title {
    margin: var(--space-8) 0 var(--space-4);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    text-align: left;
    justify-content: flex-start;
    width: 100%;
  }
  .command-palette__group-title::before { content: '▸'; margin-right: var(--space-8); }
  .command-palette__group-title[aria-expanded='true']::before { content: '▾'; }

  .command-palette__item-main {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    align-self: stretch;
  }

  .command-palette__item-row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    min-width: 0;
  }

  .command-palette__item-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-selected);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    font-weight: 700;
    flex: 0 0 auto;
  }

  .command-palette__item-icon :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .command-palette__item-title {
    display: block;
    min-width: 0;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .command-palette__item-copy {
    margin: 0;
    color: var(--color-text-secondary);
    white-space: normal;
    line-height: 1.35;
  }

  .command-palette__item-shortcut {
    display: inline-flex;
    align-items: center;
    min-height: 1.5rem;
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    white-space: nowrap;
    padding-left: var(--space-8);
    align-self: center;
  }

  @media (max-width: 720px) {
    .command-palette__item {
      grid-template-columns: minmax(0, 1fr);
    }

    .command-palette__item-shortcut {
      padding-left: 0;
      align-self: start;
    }
  }
</style>
