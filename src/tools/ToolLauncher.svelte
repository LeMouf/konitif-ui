<script lang="ts">
  import type { InMemoryToolRegistry, WorkspaceCommand } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import { resolveLocalizedToolDefinitionText } from '../i18n/workbenchEntityTranslations';

  export let panelId: string;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;

  const i18nT = getWorkbenchTranslator();
  $: toolEntries = registry.list().map((entry) => ({
    ...entry,
    text: resolveLocalizedToolDefinitionText($i18nT, entry.definition)
  }));

  function openTool(toolId: string): void {
    dispatchCommand({ type: 'focus-panel', panelId });
    dispatchCommand({ type: 'open-tool', toolId });
  }
</script>

<section class="tool-launcher" aria-label={$i18nT('ui.shell.toolLauncher.ariaLabel', { default: 'Tool launcher' })}>
  <header class="tool-launcher__header">
    <p class="tool-launcher__label">{$i18nT('ui.shell.toolLauncher.label', { default: 'Launcher' })}</p>
    <h3 class="tool-launcher__title">{$i18nT('ui.shell.toolLauncher.title', { default: 'Open a Tool' })}</h3>
    <p class="tool-launcher__copy">
      {$i18nT('ui.shell.toolLauncher.copy', { default: 'Choose a registered tool to open it in the current panel.' })}
    </p>
  </header>

    <div class="tool-launcher__list">
      {#each toolEntries as entry (entry.definition.id)}
        <button class="tool-launcher__item" on:click|stopPropagation={() => openTool(entry.definition.id)}>
          <span class="tool-launcher__item-main">
            <span class="tool-launcher__item-row">
              {#if entry.definition.icon}
                <span class="tool-launcher__item-icon">
                  <WorkbenchIcon icon={entry.definition.icon} label={entry.text.title} />
                </span>
              {/if}
              <span class="tool-launcher__item-title">{entry.text.title}</span>
            </span>
            <span class="tool-launcher__item-copy">{entry.text.description}</span>
            {#if entry.definition.keywords?.length}
              <span class="tool-launcher__item-keywords">{entry.definition.keywords.join(' · ')}</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
</section>

<style>
  .tool-launcher {
    display: grid;
    gap: var(--space-12);
    width: min(28rem, 100%);
  }

  .tool-launcher__header {
    display: grid;
    gap: var(--space-8);
  }

  .tool-launcher__label {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tool-launcher__title {
    margin: 0;
    font-size: 1rem;
  }

  .tool-launcher__copy {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .tool-launcher__list {
    display: grid;
    gap: var(--space-6);
  }

  .tool-launcher__item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    text-align: left;
    padding: var(--space-12);
    background: var(--color-background-surface);
    border-radius: var(--radius-medium);
  }

  .tool-launcher__item-main {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .tool-launcher__item-row {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .tool-launcher__item-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon-button);
    height: var(--size-icon-button);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: var(--color-background-selected);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    font-weight: 700;
    flex: 0 0 auto;
  }

  .tool-launcher__item-icon :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .tool-launcher__item-title {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .tool-launcher__item-copy {
    color: var(--color-text-secondary);
    white-space: normal;
  }

  .tool-launcher__item-keywords {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
  }
</style>
