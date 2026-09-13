<script lang="ts">
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import type { LaunchProjectOption, LaunchState, WorkbenchProjectManifest } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  export let state: LaunchState;
  export let projectManifest: WorkbenchProjectManifest | null = null;
  export let applications: LaunchProjectOption[] = [];
  export let repositories: LaunchProjectOption[] = [];
  export let onSelectProject: (project: LaunchProjectOption) => void = () => undefined;
  export let onBack: () => void = () => undefined;

  let selectedProject: LaunchProjectOption | null = null;
  const i18nT = getWorkbenchTranslator();

  const projectGroupIcons = {
    app: 'tool.component-assembly',
    repository: 'runtime.projection'
  } as const satisfies Record<LaunchProjectOption['kind'], WorkbenchIconInput>;

  $: allProjects = [...applications, ...repositories];
  $: if (allProjects.length > 0 && (!selectedProject || !allProjects.some((project) => project.id === selectedProject?.id))) {
    selectedProject = allProjects[0] ?? null;
  }

  function selectProject(project: LaunchProjectOption): void {
    selectedProject = project;
  }

  function continueSelectedProject(): void {
    if (selectedProject) {
      onSelectProject(selectedProject);
    }
  }

  function getProjectIcon(project: LaunchProjectOption): WorkbenchIconInput {
    return project.icon ?? projectGroupIcons[project.kind];
  }
</script>

<section class="project-dashboard" aria-label={$i18nT('ui.shell.launchGate.projectDashboard.ariaLabel', { default: 'Project dashboard' })}>
  <header class="project-dashboard__header">
    <button type="button" class="project-dashboard__back-button" aria-label={$i18nT('ui.shell.launchGate.projectDashboard.backAria', { default: 'Back to launch gate' })} on:click={onBack}>
      <span aria-hidden="true"><WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.back', { default: 'Back' })} /></span>
      <strong>{$i18nT('ui.shell.launchGate.projectDashboard.backLabel', { default: 'Launch gate' })}</strong>
    </button>
    <span>{state.phase}</span>
    <h1>{projectManifest?.label ?? $i18nT('ui.shell.launchGate.projectDashboard.title', { default: 'Project Dashboard' })}</h1>
    {#if projectManifest}
      <p>{$i18nT('ui.shell.launchGate.projectDashboard.summary', {
        default: '{{apps}} app(s), {{repositories}} repositorie(s), {{profiles}} profile(s)',
        values: {
          apps: projectManifest.apps.length,
          repositories: projectManifest.repositories.length,
          profiles: projectManifest.launchProfiles.length
        }
      })}</p>
    {/if}
  </header>

  <main class="project-dashboard__grid">
    <section class="project-dashboard__group" data-kind="app" aria-label={$i18nT('ui.shell.launchGate.context.application.title', { default: 'Apps' })}>
      <header>
        <span class="project-dashboard__group-title">
          <span class="project-dashboard__group-icon" aria-hidden="true">
            <WorkbenchIcon icon={projectGroupIcons.app} label={$i18nT('ui.shell.launchGate.context.application.title', { default: 'Apps' })} />
          </span>
          <h2>{$i18nT('ui.shell.launchGate.context.application.title', { default: 'Apps' })}</h2>
        </span>
        <strong>{applications.length}</strong>
      </header>

      <div class="project-dashboard__items">
        {#each applications as project (project.id)}
          <button
            type="button"
            class="project-dashboard__item"
            data-kind="app"
            class:project-dashboard__item--active={selectedProject?.id === project.id}
            on:click={() => selectProject(project)}
          >
            <span class="project-dashboard__item-icon" aria-hidden="true">
              <WorkbenchIcon icon={getProjectIcon(project)} label={project.label} />
            </span>
            <span class="project-dashboard__item-copy">
              <strong>{project.label}</strong>
              <code>{project.root}</code>
            </span>
          </button>
        {:else}
          <p>{$i18nT('ui.shell.launchGate.projectDashboard.noApplicationProfile', { default: 'No application profile.' })}</p>
        {/each}
      </div>
    </section>

    <section class="project-dashboard__group" data-kind="repository" aria-label={$i18nT('ui.shell.launchGate.context.repository.title', { default: 'Repositories' })}>
      <header>
        <span class="project-dashboard__group-title">
          <span class="project-dashboard__group-icon" aria-hidden="true">
            <WorkbenchIcon icon={projectGroupIcons.repository} label={$i18nT('ui.shell.launchGate.context.repository.title', { default: 'Repositories' })} />
          </span>
          <h2>{$i18nT('ui.shell.launchGate.context.repository.title', { default: 'Repositories' })}</h2>
        </span>
        <strong>{repositories.length}</strong>
      </header>

      <div class="project-dashboard__items">
        {#each repositories as project (project.id)}
          <button
            type="button"
            class="project-dashboard__item"
            data-kind="repository"
            class:project-dashboard__item--active={selectedProject?.id === project.id}
            on:click={() => selectProject(project)}
          >
            <span class="project-dashboard__item-icon" aria-hidden="true">
              <WorkbenchIcon icon={getProjectIcon(project)} label={project.label} />
            </span>
            <span class="project-dashboard__item-copy">
              <strong>{project.label}</strong>
              <code>{project.root}</code>
            </span>
          </button>
        {:else}
          <p>{$i18nT('ui.shell.launchGate.projectDashboard.noRepositoryProfile', { default: 'No repository profile.' })}</p>
        {/each}
      </div>
    </section>

    <aside class="project-dashboard__detail" data-kind={selectedProject?.kind ?? 'empty'} aria-label={$i18nT('ui.shell.launchGate.projectDashboard.preLaunchDetail', { default: 'Pre-launch detail' })}>
      {#if selectedProject}
        <div class="project-dashboard__detail-heading">
          <span class="project-dashboard__detail-icon" aria-hidden="true">
            <WorkbenchIcon icon={getProjectIcon(selectedProject)} label={selectedProject.label} />
          </span>
          <div>
            <span>{selectedProject.kind}</span>
            <h2>{selectedProject.label}</h2>
          </div>
        </div>
        <p>{selectedProject.description ?? $i18nT('ui.shell.launchGate.projectDashboard.projectProfile', { default: 'Project profile' })}</p>
        <code>{selectedProject.root}</code>
        {#if state.target?.project?.id === selectedProject.id}
          <small>{$i18nT('ui.shell.launchGate.projectDashboard.selectedProfile', { default: 'Selected profile: {{profile}}', values: { profile: state.target.profile } })}</small>
        {/if}
        <button type="button" on:click={continueSelectedProject}>{$i18nT('ui.shell.launchGate.projectDashboard.continueToPreflight', { default: 'Continue to preflight' })}</button>
      {:else}
        <span>{$i18nT('ui.shell.launchGate.projectDashboard.empty', { default: 'empty' })}</span>
        <h2>{$i18nT('ui.shell.launchGate.projectDashboard.noProjectSelected', { default: 'No project selected' })}</h2>
        <p>{$i18nT('ui.shell.launchGate.projectDashboard.emptyDetail', { default: 'Add applications or repositories to enable project preflight.' })}</p>
      {/if}
    </aside>
  </main>
</section>

<style>
  .project-dashboard {
    min-height: 100vh;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 28px;
    color: var(--workbench-text-primary, #e8eef8);
    background: transparent;
  }

  .project-dashboard__header,
  .project-dashboard__grid {
    width: min(980px, 100%);
    margin: 0 auto;
  }

  .project-dashboard__header {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 12px;
    align-items: center;
  }

  .project-dashboard__back-button {
    width: fit-content;
    min-height: 2.1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 7px 10px;
    border: 1px solid rgba(119, 147, 183, 0.34);
    border-radius: 6px;
    color: inherit;
    background: rgba(20, 29, 42, 0.86);
    cursor: pointer;
  }

  .project-dashboard__back-button span {
    width: 0.9rem;
    height: 0.9rem;
    display: grid;
    place-items: center;
  }

  .project-dashboard__back-button strong {
    font-size: 0.74rem;
    line-height: 1;
  }

  .project-dashboard__header span {
    color: #69ecc1;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .project-dashboard__header h1 {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 2rem;
    letter-spacing: 0;
  }

  .project-dashboard__header p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--workbench-text-secondary, #b8c6d8);
  }

  .project-dashboard__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .project-dashboard__group {
    --project-kind-rgb: var(--k-entity-application-rgb, 105, 236, 193);
    --project-kind-color: var(--k-entity-application, #69ecc1);
    min-width: 0;
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid rgba(var(--project-kind-rgb), 0.24);
    border-radius: 8px;
    background:
      radial-gradient(circle at 10% 0%, rgba(var(--project-kind-rgb), 0.12), transparent 16rem),
      linear-gradient(135deg, rgba(24, 34, 49, 0.78), rgba(15, 23, 35, 0.64)),
      rgba(12, 18, 28, 0.58);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 1.6rem 4rem rgba(0, 0, 0, 0.14),
      0 0 0 1px rgba(var(--project-kind-rgb), 0.035);
    backdrop-filter: blur(18px);
  }

  .project-dashboard__group[data-kind='repository'] {
    --project-kind-rgb: var(--k-entity-repository-rgb, 176, 132, 255);
    --project-kind-color: var(--k-entity-repository, #b084ff);
  }

  .project-dashboard__group header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .project-dashboard__group-title {
    min-width: 0;
    display: inline-grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.62rem;
  }

  .project-dashboard__group-icon,
  .project-dashboard__item-icon,
  .project-dashboard__detail-icon {
    display: grid;
    place-items: center;
    color: var(--project-kind-color);
    border: 1px solid rgba(var(--project-kind-rgb), 0.44);
    background:
      radial-gradient(circle at 50% 50%, rgba(var(--project-kind-rgb), 0.2), transparent 62%),
      rgba(9, 16, 27, 0.54);
    box-shadow:
      inset 0 0 0 1px rgba(var(--project-kind-rgb), 0.08),
      0 0 1.4rem rgba(var(--project-kind-rgb), 0.08);
  }

  .project-dashboard__group-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    font-size: 1rem;
  }

  .project-dashboard__group h2 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0;
  }

  .project-dashboard__group header strong {
    color: var(--project-kind-color);
  }

  .project-dashboard__items {
    display: grid;
    gap: 8px;
  }

  .project-dashboard__item {
    --project-kind-rgb: var(--k-entity-application-rgb, 105, 236, 193);
    --project-kind-color: var(--k-entity-application, #69ecc1);
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.72rem;
    padding: 12px;
    border: 1px solid rgba(var(--project-kind-rgb), 0.16);
    border-radius: 7px;
    color: inherit;
    text-align: left;
    background:
      linear-gradient(135deg, rgba(var(--project-kind-rgb), 0.05), transparent 68%),
      rgba(10, 16, 24, 0.6);
  }

  .project-dashboard__item[data-kind='repository'] {
    --project-kind-rgb: var(--k-entity-repository-rgb, 176, 132, 255);
    --project-kind-color: var(--k-entity-repository, #b084ff);
  }

  .project-dashboard__item:hover,
  .project-dashboard__item:focus-visible,
  .project-dashboard__item--active {
    border-color: rgba(var(--project-kind-rgb), 0.62);
    outline: none;
  }

  .project-dashboard__item--active {
    background:
      radial-gradient(circle at 0% 50%, rgba(var(--project-kind-rgb), 0.16), transparent 14rem),
      rgba(var(--project-kind-rgb), 0.1);
    box-shadow:
      inset 3px 0 0 var(--project-kind-color),
      0 0 0 1px rgba(var(--project-kind-rgb), 0.08);
  }

  .project-dashboard__item-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 0.56rem;
    font-size: 1rem;
  }

  .project-dashboard__item-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .project-dashboard__item code,
  .project-dashboard__group p,
  .project-dashboard__detail code {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--workbench-text-muted, #8fa1b8);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-dashboard__detail {
    --project-kind-rgb: var(--k-entity-application-rgb, 105, 236, 193);
    --project-kind-color: var(--k-entity-application, #69ecc1);
    grid-column: 1 / -1;
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid rgba(var(--project-kind-rgb), 0.28);
    border-radius: 8px;
    background:
      radial-gradient(circle at 4% 18%, rgba(var(--project-kind-rgb), 0.14), transparent 18rem),
      linear-gradient(135deg, rgba(27, 45, 55, 0.82), rgba(16, 27, 38, 0.7)),
      rgba(13, 22, 31, 0.64);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 1.6rem 4rem rgba(0, 0, 0, 0.14);
    backdrop-filter: blur(18px);
  }

  .project-dashboard__detail[data-kind='repository'] {
    --project-kind-rgb: var(--k-entity-repository-rgb, 176, 132, 255);
    --project-kind-color: var(--k-entity-repository, #b084ff);
  }

  .project-dashboard__detail-heading {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.74rem;
    align-items: center;
  }

  .project-dashboard__detail-icon {
    width: 2.7rem;
    height: 2.7rem;
    border-radius: 0.72rem;
    font-size: 1.14rem;
  }

  .project-dashboard__detail span {
    color: var(--project-kind-color);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .project-dashboard__detail h2,
  .project-dashboard__detail p {
    margin: 0;
  }

  .project-dashboard__detail p {
    color: var(--workbench-text-secondary, #b8c6d8);
  }

  .project-dashboard__detail small {
    color: var(--workbench-text-muted, #8fa1b8);
    font-weight: 800;
    text-transform: uppercase;
  }

  .project-dashboard__detail button {
    justify-self: end;
    width: fit-content;
    padding: 8px 12px;
    border: 1px solid rgba(var(--project-kind-rgb), 0.5);
    border-radius: 6px;
    color: inherit;
    background: rgba(var(--project-kind-rgb), 0.22);
    cursor: pointer;
  }

  @media (max-width: 780px) {
    .project-dashboard {
      padding: 20px;
    }

    .project-dashboard__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
