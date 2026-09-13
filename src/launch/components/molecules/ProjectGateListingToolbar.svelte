<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextCategory } from '../../projectGateContext';
  import type { ProjectGateListingSortKey } from '../projectGateListingModel';
  import ProjectGateControlButton from '../atoms/ProjectGateControlButton.svelte';
  import { getWorkbenchTranslator } from '../../../i18n/workbenchI18n';

  export let category: ProjectGateContextCategory;
  export let query = '';
  export let sortKey: ProjectGateListingSortKey = 'name';
  export let sortDirection: 'asc' | 'desc' = 'asc';

  const i18nT = getWorkbenchTranslator();

  $: searchPlaceholderByCategory = {
    self: $i18nT('ui.shell.launchGate.search.default', { default: 'Search...' }),
    repository: $i18nT('ui.shell.launchGate.search.repositories', { default: 'Search repositories...' }),
    application: $i18nT('ui.shell.launchGate.search.applications', { default: 'Search applications...' }),
    tool: $i18nT('ui.shell.launchGate.search.tools', { default: 'Search tools...' }),
    widget: $i18nT('ui.shell.launchGate.search.widgets', { default: 'Search widgets...' }),
    poc: $i18nT('ui.shell.launchGate.search.poc', { default: 'Search PoC...' })
  } satisfies Record<ProjectGateContextCategory, string>;

  $: addLabel =
    category === 'application'
      ? $i18nT('ui.shell.launchGate.actions.newApplication', { default: 'New application' })
      : category === 'tool'
        ? $i18nT('ui.shell.launchGate.actions.addTool', { default: 'Add tool' })
        : category === 'widget'
          ? $i18nT('ui.shell.launchGate.actions.addWidget', { default: 'Add widget' })
          : category === 'poc'
            ? $i18nT('ui.shell.launchGate.actions.newPoc', { default: 'New PoC' })
            : $i18nT('ui.shell.launchGate.actions.addItem', { default: 'Add item' });
</script>

<div class="project-gate-listing-toolbar">
  <label class="project-gate-listing-toolbar__search">
    <WorkbenchIcon icon="action.search" label={$i18nT('ui.shell.launchGate.actions.search', { default: 'Search' })} />
    <input bind:value={query} placeholder={searchPlaceholderByCategory[category]} aria-label={searchPlaceholderByCategory[category]} />
  </label>

  <div class="project-gate-listing-toolbar__controls" aria-label={$i18nT('ui.shell.launchGate.listing.controls', { default: 'Listing controls' })}>
    <ProjectGateControlButton icon="action.command-palette" label={$i18nT('ui.shell.launchGate.actions.gridView', { default: 'Grid view' })} />
    <ProjectGateControlButton icon="action.settings" label={$i18nT('ui.shell.launchGate.actions.filter', { default: 'Filter' })} />
    <ProjectGateControlButton
      icon={sortDirection === 'asc' ? 'action.arrow-up' : 'action.arrow-down'}
      label={$i18nT('ui.shell.launchGate.actions.sortByName', { default: 'Sort by name' })}
      active={sortKey === 'name'}
      on:click={() => {
        sortKey = 'name';
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }}
    />
    <ProjectGateControlButton
      icon="action.reset"
      label={$i18nT('ui.shell.launchGate.actions.sortByDate', { default: 'Sort by date' })}
      active={sortKey === 'date'}
      on:click={() => {
        sortKey = 'date';
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }}
    />
    <button type="button" class="project-gate-listing-toolbar__add">
      <WorkbenchIcon icon="action.add" label={addLabel} />
      <span>{addLabel}</span>
      <WorkbenchIcon icon="action.chevron-down" label={$i18nT('ui.shell.launchGate.actions.more', { default: 'More' })} />
    </button>
  </div>
</div>

<style>
  .project-gate-listing-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.7rem;
  }

  .project-gate-listing-toolbar__search {
    min-width: min(19rem, 34vw);
    height: 2.55rem;
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0 0.8rem;
    border: 1px solid rgba(120, 151, 193, 0.22);
    border-radius: 7px;
    color: var(--k-text-muted, #8fa1b8);
    background: rgba(5, 11, 20, 0.24);
  }

  .project-gate-listing-toolbar__search input {
    min-width: 0;
    flex: 1 1 auto;
    border: 0;
    color: var(--k-text-primary, #eef4ff);
    background: transparent;
    font: inherit;
    outline: none;
  }

  .project-gate-listing-toolbar__search input::placeholder {
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), transparent 4%);
  }

  .project-gate-listing-toolbar__controls {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .project-gate-listing-toolbar__add {
    height: 2.55rem;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    margin-left: 0.45rem;
    padding: 0 0.9rem;
    border: 1px solid rgba(105, 236, 193, 0.34);
    border-radius: 7px;
    color: #06131a;
    background: linear-gradient(135deg, #8af0b0, #58bb8b);
    font-size: 0.78rem;
    font-weight: 850;
    cursor: pointer;
  }

  .project-gate-listing-toolbar__add :global(svg) {
    width: 0.92rem;
    height: 0.92rem;
  }

  @media (max-width: 840px) {
    .project-gate-listing-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .project-gate-listing-toolbar__search {
      width: 100%;
    }

    .project-gate-listing-toolbar__controls {
      justify-content: flex-end;
    }
  }
</style>
