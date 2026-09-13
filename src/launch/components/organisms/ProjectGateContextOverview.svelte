<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextCategory, ProjectGateContextRow } from '../../projectGateContext';
  import ProjectGateEntryCard from '../molecules/ProjectGateEntryCard.svelte';
  import { getWorkbenchTranslator } from '../../../i18n/workbenchI18n';

  export let rows: ProjectGateContextRow[] = [];
  export let onBack: () => void = () => undefined;
  export let onSelectCategory: (category: ProjectGateContextCategory) => void = () => undefined;

  const i18nT = getWorkbenchTranslator();

  $: descriptions = {
    self: $i18nT('ui.shell.launchGate.context.self.description', { default: 'Runtime core and self inspection.' }),
    repository: $i18nT('ui.shell.launchGate.context.repository.description', { default: 'Load a local path, Git URL, or recent repository.' }),
    application: $i18nT('ui.shell.launchGate.context.application.description', { default: 'Manage and run your applications.' }),
    tool: $i18nT('ui.shell.launchGate.context.tool.description.short', { default: 'Access your tools and utilities.' }),
    widget: $i18nT('ui.shell.launchGate.context.widget.description.short', { default: 'Inspect shell widgets and their docking context.' }),
    poc: $i18nT('ui.shell.launchGate.context.poc.description', { default: 'Explore and prototype new ideas.' })
  } satisfies Record<ProjectGateContextCategory, string>;
</script>

<section class="project-gate-overview" aria-label={$i18nT('ui.shell.launchGate.contextsAria', { default: 'Launch contexts' })}>
  <div class="project-gate-overview__nav">
    <button type="button" class="project-gate-overview__back" aria-label={$i18nT('ui.shell.launchGate.backToSelf', { default: 'Back to Self' })} on:click={onBack}>
      <WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.back', { default: 'Back' })} />
      <strong>{$i18nT('ui.shell.launchGate.self.label', { default: 'Self' })}</strong>
    </button>
  </div>

  <div class="project-gate-overview__grid">
    {#each rows as row (row.id)}
      <ProjectGateEntryCard row={row} description={descriptions[row.id]} on:click={() => onSelectCategory(row.id)} />
    {/each}
  </div>
</section>

<style>
  .project-gate-overview {
    --project-gate-overview-width: 960px;
    width: min(var(--project-gate-overview-width), 100%);
    margin: 0 auto;
    display: grid;
    gap: 1.35rem;
  }

  .project-gate-overview__nav {
    display: flex;
    align-items: center;
  }

  .project-gate-overview__back {
    --overview-back-bg: rgba(5, 11, 20, 0.28);
    --overview-back-border: rgba(120, 151, 193, 0.22);
    --overview-back-text: var(--k-text-secondary, #b8c6d8);
    min-height: 2rem;
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0 0.72rem;
    border: 1px solid var(--overview-back-border);
    border-radius: 7px;
    color: var(--overview-back-text);
    background: var(--overview-back-bg);
    font-size: 0.7rem;
    font-weight: 850;
    cursor: pointer;
  }

  .project-gate-overview__back strong {
    font: inherit;
  }

  .project-gate-overview__back :global(svg) {
    width: 0.86rem;
    height: 0.86rem;
  }

  .project-gate-overview__back:hover,
  .project-gate-overview__back:focus-visible {
    color: var(--k-text-primary, #eef4ff);
    border-color: rgba(105, 236, 193, 0.42);
    background: rgba(105, 236, 193, 0.085);
    outline: none;
  }

  :global([data-workbench-color-mode='light']) .project-gate-overview__back {
    --overview-back-bg: rgba(255, 255, 255, 0.62);
    --overview-back-border: rgba(88, 118, 158, 0.24);
    --overview-back-text: #496783;
  }

  .project-gate-overview__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(1.1rem, 2vw, 1.6rem);
  }

  @media (max-width: 860px) {
    .project-gate-overview__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
