<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import ProjectGateIconBadge from '../atoms/ProjectGateIconBadge.svelte';
  import type { ProjectGateListingItem } from '../projectGateListingModel';
  import { getWorkbenchTranslator } from '../../../i18n/workbenchI18n';

  export let item: ProjectGateListingItem;
  export let actionStatus = '';
  export let onBack: () => void = () => undefined;

  const i18nT = getWorkbenchTranslator();

  $: option = item.option;
  $: meta = item.meta;
</script>

<section class="project-gate-entity-detail" data-tone={option.tone} aria-label={`${option.title} details`}>
  <header class="project-gate-entity-detail__header">
    <span class="project-gate-entity-detail__identity">
      <ProjectGateIconBadge icon={option.icon} label={option.title} tone={option.tone} size="sm" />
      <span>
        <strong>{option.title}</strong>
        <em>{meta.secondary}</em>
      </span>
    </span>

    <button
      type="button"
      class="project-gate-entity-detail__close"
      aria-label={$i18nT('ui.shell.launchGate.actions.closeDetails', { default: 'Close details' })}
      on:click={onBack}
    >
      <WorkbenchIcon icon="action.close" label={$i18nT('ui.shell.launchGate.actions.close', { default: 'Close' })} />
    </button>
  </header>

  <div class="project-gate-entity-detail__metrics">
    <span>
      <small>{$i18nT('ui.shell.launchGate.inspector.type', { default: 'Type' })}</small>
      <strong>{option.category}</strong>
    </span>
    <span>
      <small>{$i18nT('ui.shell.launchGate.inspector.status', { default: 'Status' })}</small>
      <strong>{meta.status}</strong>
    </span>
    <span>
      <small>{$i18nT('ui.shell.launchGate.inspector.updated', { default: 'Updated' })}</small>
      <strong>{meta.dateLabel}</strong>
    </span>
    <span>
      <small>{$i18nT('ui.shell.launchGate.inspector.source', { default: 'Source' })}</small>
      <strong>{option.eyebrow}</strong>
    </span>
  </div>

  <p class="project-gate-entity-detail__description">{option.description}</p>

  {#if option.category === 'tool'}
    <section class="project-gate-entity-detail__section" aria-label={$i18nT('ui.shell.launchGate.widgets.associated', { default: 'Associated widgets' })}>
      <header>
        <strong>{$i18nT('ui.shell.launchGate.widgets.associated', { default: 'Associated widgets' })}</strong>
        <span>{option.tool?.widgets?.length ?? 0}</span>
      </header>

      {#if option.tool?.widgets?.length}
        <div class="project-gate-entity-detail__widget-grid">
          {#each option.tool.widgets as widget (widget.id)}
            <article>
              <span class="project-gate-entity-detail__widget-icon">
                <WorkbenchIcon icon={widget.icon} label={widget.title} />
              </span>
              <span>
                <strong>{widget.title}</strong>
                <em>{widget.description}</em>
              </span>
              <small data-scope={widget.scope}>
                {widget.scope === 'global'
                  ? $i18nT('ui.shell.launchGate.widgets.scope.global', { default: 'Global' })
                  : $i18nT('ui.shell.launchGate.widgets.scope.contextual', { default: 'Contextual' })}
              </small>
              <small>{widget.defaultRegion}</small>
            </article>
          {/each}
        </div>
      {:else}
        <p class="project-gate-entity-detail__empty">
          {$i18nT('ui.shell.launchGate.widgets.noneDetail', { default: 'No shell widget is currently associated with this tool.' })}
        </p>
      {/if}
    </section>
  {/if}

  {#if option.category === 'widget' && option.widget}
    <section class="project-gate-entity-detail__section" aria-label={$i18nT('ui.shell.launchGate.widgets.typology', { default: 'Widget typology' })}>
      <header>
        <strong>{$i18nT('ui.shell.launchGate.widgets.typology', { default: 'Widget typology' })}</strong>
        <span>{option.widget.contextToolIds?.length ?? 0}</span>
      </header>

      <div class="project-gate-entity-detail__metrics">
        <span>
          <small>{$i18nT('ui.shell.launchGate.widgets.scope', { default: 'Scope' })}</small>
          <strong>{option.widget.scope}</strong>
        </span>
        <span>
          <small>{$i18nT('ui.shell.launchGate.widgets.region', { default: 'Region' })}</small>
          <strong>{option.widget.defaultRegion}</strong>
        </span>
        <span>
          <small>{$i18nT('ui.shell.launchGate.context.tool.title', { default: 'Tools' })}</small>
          <strong>{option.widget.contextToolIds?.length ?? 0}</strong>
        </span>
        <span>
          <small>ID</small>
          <strong>{option.widget.id}</strong>
        </span>
      </div>

      {#if option.widget.contextToolIds?.length}
        <p>{option.widget.contextToolIds.join(', ')}</p>
      {/if}
    </section>
  {/if}

  {#if actionStatus}
    <p class="project-gate-entity-detail__action-status">{actionStatus}</p>
  {/if}
</section>

<style>
  .project-gate-entity-detail {
    --gate-widget-tone: var(--project-gate-tone-widget, #f472b6);
    --gate-widget-tone-rgb: var(--project-gate-tone-widget-rgb, 244 114 182);
    display: grid;
    gap: 1.05rem;
    padding: 1rem;
    border: 1px solid rgb(var(--gate-tone-rgb) / 0.36);
    border-radius: 8px;
    background:
      radial-gradient(circle at 0% 0%, rgb(var(--gate-tone-rgb) / 0.1), transparent 38%),
      rgba(5, 11, 20, 0.24);
  }

  .project-gate-entity-detail[data-tone='repository'] {
    --gate-tone: var(--project-gate-tone-repository, #f1c96f);
    --gate-tone-rgb: var(--project-gate-tone-repository-rgb, 241 201 111);
  }

  .project-gate-entity-detail[data-tone='project'] {
    --gate-tone: var(--project-gate-tone-project, #a78bfa);
    --gate-tone-rgb: var(--project-gate-tone-project-rgb, 167 139 250);
  }

  .project-gate-entity-detail[data-tone='tool'] {
    --gate-tone: var(--project-gate-tone-tool, #78e09a);
    --gate-tone-rgb: var(--project-gate-tone-tool-rgb, 120 224 154);
  }

  .project-gate-entity-detail[data-tone='widget'] {
    --gate-tone: var(--gate-widget-tone);
    --gate-tone-rgb: var(--gate-widget-tone-rgb);
  }

  .project-gate-entity-detail[data-tone='poc'] {
    --gate-tone: var(--project-gate-tone-poc, #6da4ff);
    --gate-tone-rgb: var(--project-gate-tone-poc-rgb, 109 164 255);
  }

  .project-gate-entity-detail__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .project-gate-entity-detail__identity {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
  }

  .project-gate-entity-detail__identity > span {
    min-width: 0;
    display: grid;
    gap: 0.18rem;
  }

  .project-gate-entity-detail strong {
    color: var(--k-text-primary, #eef4ff);
  }

  .project-gate-entity-detail em,
  .project-gate-entity-detail p,
  .project-gate-entity-detail small {
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 8%);
    font-style: normal;
  }

  .project-gate-entity-detail__close {
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border: 1px solid rgba(120, 151, 193, 0.2);
    border-radius: 7px;
    color: var(--k-text-secondary, #b8c6d8);
    background: rgba(5, 11, 20, 0.22);
    cursor: pointer;
  }

  .project-gate-entity-detail__metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .project-gate-entity-detail__metrics > span {
    min-width: 0;
    display: grid;
    gap: 0.25rem;
    padding: 0.75rem;
    border: 1px solid rgba(120, 151, 193, 0.16);
    border-radius: 7px;
    background: rgba(5, 11, 20, 0.18);
  }

  .project-gate-entity-detail__metrics small {
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .project-gate-entity-detail__metrics strong {
    overflow: hidden;
    font-size: 0.8rem;
    text-overflow: ellipsis;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .project-gate-entity-detail__description {
    margin: 0;
    line-height: 1.5;
  }

  .project-gate-entity-detail__section {
    display: grid;
    gap: 0.65rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(120, 151, 193, 0.12);
  }

  .project-gate-entity-detail__section > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .project-gate-entity-detail__section > header strong {
    font-size: 0.75rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .project-gate-entity-detail__section > header span {
    display: inline-grid;
    place-items: center;
    min-width: 1.55rem;
    min-height: 1.55rem;
    padding: 0 0.42rem;
    border: 1px solid rgb(var(--gate-widget-tone-rgb) / 0.32);
    border-radius: 999px;
    color: var(--gate-widget-tone);
    background: rgb(var(--gate-widget-tone-rgb) / 0.08);
    font-size: 0.7rem;
    font-weight: 900;
  }

  .project-gate-entity-detail__widget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 0.55rem;
  }

  .project-gate-entity-detail__widget-grid article {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.65rem;
    padding: 0.7rem;
    border: 1px solid rgba(120, 151, 193, 0.16);
    border-radius: 7px;
    background: rgba(5, 11, 20, 0.18);
  }

  .project-gate-entity-detail__widget-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgba(120, 151, 193, 0.16);
    border-radius: 7px;
    color: var(--gate-widget-tone);
    background: rgb(var(--gate-widget-tone-rgb) / 0.08);
  }

  .project-gate-entity-detail__widget-icon :global(svg) {
    width: 0.95rem;
    height: 0.95rem;
  }

  .project-gate-entity-detail__widget-grid article > span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 0.18rem;
  }

  .project-gate-entity-detail__widget-grid article strong,
  .project-gate-entity-detail__widget-grid article em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-entity-detail__widget-grid article em {
    font-size: 0.72rem;
  }

  .project-gate-entity-detail__widget-grid small {
    padding: 0.16rem 0.42rem;
    border: 1px solid rgba(120, 151, 193, 0.18);
    border-radius: 999px;
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), white 6%);
    font-size: 0.62rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .project-gate-entity-detail__widget-grid small[data-scope='contextual'] {
    color: var(--gate-widget-tone);
    border-color: rgb(var(--gate-widget-tone-rgb) / 0.26);
    background: rgb(var(--gate-widget-tone-rgb) / 0.08);
  }

  .project-gate-entity-detail__empty,
  .project-gate-entity-detail__action-status {
    margin: 0;
  }

  .project-gate-entity-detail__action-status {
    padding: 0.72rem 0.85rem;
    border: 1px solid rgba(96, 165, 250, 0.24);
    border-radius: 7px;
    background: rgba(96, 165, 250, 0.07);
  }

  @media (max-width: 980px) {
    .project-gate-entity-detail__metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .project-gate-entity-detail__metrics,
    .project-gate-entity-detail__widget-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
