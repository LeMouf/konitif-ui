<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  interface StackTabItem {
    panel: {
      id: string;
      title: string;
    };
    toolIcon: WorkbenchIconInput | null;
    displayTitle: string;
  }

  export let tabItems: StackTabItem[] = [];
  export let activePanelId: string | null = null;
  export let showClosePanelAction = true;
  export let showAddPanelTabAction = true;
  export let tabsLabel = 'Panel tabs';
  export let addPanelTabLabel = 'Add a Tool tab';
  const i18nT = getWorkbenchTranslator();

  const dispatch = createEventDispatcher<{
    tabpointerdown: { event: PointerEvent; panelId: string };
    tabclick: { panelId: string };
    close: { event: MouseEvent; panelId: string };
    addpaneltab: { event: MouseEvent };
  }>();

  function handleCloseClick(event: MouseEvent, panelId: string): void {
    dispatch('close', { event, panelId });
  }
</script>

<div class="stack-tabs" role="tablist" aria-label={tabsLabel} data-workbench-stack-tabs>
  {#each tabItems as tabItem (tabItem.panel.id)}
    <div
      class:stack-tabs__tab--active={tabItem.panel.id === activePanelId}
      class="stack-tabs__tab"
      data-workbench-stack-tab
    >
      <button
        type="button"
        class="stack-tabs__tab-button"
        role="tab"
        aria-selected={tabItem.panel.id === activePanelId}
        on:pointerdown|stopPropagation={(event) =>
          dispatch('tabpointerdown', { event, panelId: tabItem.panel.id })}
        on:click|stopPropagation={() => dispatch('tabclick', { panelId: tabItem.panel.id })}
      >
        {#if tabItem.toolIcon}
          <span class="stack-tabs__tab-icon" aria-hidden="true">
            <WorkbenchIcon icon={tabItem.toolIcon} label={tabItem.displayTitle} />
          </span>
        {/if}
        <span class="stack-tabs__tab-label">{tabItem.displayTitle}</span>
      </button>
      {#if showClosePanelAction}
        <IconButton
          label={$i18nT('ui.shell.layout.stack.closePanelTab', {
            default: 'Close {{title}}',
            values: { title: tabItem.displayTitle }
          })}
          title={$i18nT('ui.shell.layout.stack.closePanelTab', {
            default: 'Close {{title}}',
            values: { title: tabItem.displayTitle }
          })}
          variant="ghost"
          icon="action.close"
          on:click={(event) => handleCloseClick(event, tabItem.panel.id)}
        />
      {/if}
    </div>
  {/each}
  {#if showAddPanelTabAction}
    <span class="stack-tabs__add">
      <IconButton
        label={addPanelTabLabel}
        title={addPanelTabLabel}
        variant="ghost"
        icon="action.add"
        on:click={(event) => dispatch('addpaneltab', { event })}
      />
    </span>
  {/if}
</div>

<style>
  .stack-tabs {
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    align-self: stretch;
    align-items: stretch;
    gap: var(--space-4);
    min-block-size: calc(var(--size-tab-height) + var(--space-16));
    min-width: 0;
    overflow-x: auto;
    padding: var(--space-8) var(--space-8) 0;
  }

  .stack-tabs__tab {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    min-block-size: var(--size-tab-height);
    block-size: calc(var(--size-tab-height) + var(--space-8));
    padding: 0 var(--space-10);
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .stack-tabs__tab-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    min-height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
  }

  .stack-tabs__tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.9rem;
    height: 0.9rem;
    color: inherit;
    font-size: var(--font-size-label);
    font-weight: 700;
    flex: 0 0 auto;
    opacity: 0.9;
  }

  .stack-tabs__tab-icon :global(.workbench-icon) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .stack-tabs__tab-button:hover {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .stack-tabs__tab-button:active {
    background: transparent;
    box-shadow: none;
    transform: none;
  }

  .stack-tabs__tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stack-tabs__tab:not(.stack-tabs__tab--active):hover {
    background: var(--color-background-hover);
    border-color: var(--color-border-subtle);
    color: var(--color-text-secondary);
    box-shadow: none;
  }

  .stack-tabs__tab--active {
    background: var(--color-background-selected);
    color: var(--color-text-primary);
    border-color: var(--color-border-strong);
    border-bottom-color: var(--color-background-selected);
    border-radius: var(--radius-medium) var(--radius-medium) 0 0;
    box-shadow: 0 1px 0 var(--color-background-selected);
  }

  .stack-tabs__tab--active:hover {
    background: var(--color-background-selected);
    border-color: var(--color-border-strong);
    border-bottom-color: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .stack-tabs__add {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }
</style>
