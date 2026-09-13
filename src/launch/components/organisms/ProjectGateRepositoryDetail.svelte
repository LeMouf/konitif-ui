<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextOption, ProjectGateContextRow } from '../../projectGateContext';
  import ProjectGateIconBadge from '../atoms/ProjectGateIconBadge.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../../../i18n/workbenchI18n';

  type RecentRepository = {
    id: string;
    title: string;
    path: string;
    source: 'local' | 'git';
    lastUsedAt: string;
  };

  export let row: ProjectGateContextRow;
  export let onBack: () => void = () => undefined;
  export let onSelectOption: (option: ProjectGateContextOption) => void = () => undefined;

  const recentRepositoryStorageKey = 'workbench.launchGate.recentRepositories.v1';
  const i18nT = getWorkbenchTranslator();

  let localPath = '';
  let gitUrl = '';
  let recentRepositories: RecentRepository[] = readRecentRepositories();

  async function browseLocalRepository(): Promise<void> {
    const directoryPicker = typeof window === 'undefined'
      ? null
      : (window as Window & {
          showDirectoryPicker?: () => Promise<{ name?: string; resolve?: (path: string[]) => Promise<{ name?: string }> }>;
        }).showDirectoryPicker;

    if (!directoryPicker) {
      loadRepositoryFromInput('local');
      return;
    }

    try {
      const handle = await directoryPicker.call(window);
      const path = handle.name?.trim();

      if (!path) {
        return;
      }

      localPath = path;
      loadRecentRepository(createRecentRepository(path, 'local'));
    } catch {
      // User cancelled the native picker.
    }
  }

  function readRecentRepositories(): RecentRepository[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const rawValue = window.sessionStorage.getItem(recentRepositoryStorageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue
        .filter((item): item is RecentRepository => (
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.path === 'string' &&
          (item.source === 'local' || item.source === 'git') &&
          typeof item.lastUsedAt === 'string'
        ))
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  function persistRecentRepositories(items: RecentRepository[]): void {
    recentRepositories = items.slice(0, 8);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(recentRepositoryStorageKey, JSON.stringify(recentRepositories));
    } catch {
      // Recent repositories are a session convenience only.
    }
  }

  function loadRepositoryFromInput(source: 'local' | 'git'): void {
    const value = (source === 'local' ? localPath : gitUrl).trim();

    if (!value) {
      return;
    }

    const recentRepository = createRecentRepository(value, source);
    loadRecentRepository(recentRepository);
  }

  function loadRecentRepository(repository: RecentRepository): void {
    persistRecentRepositories([
      { ...repository, lastUsedAt: new Date().toISOString() },
      ...recentRepositories.filter((item) => item.id !== repository.id)
    ]);

    onSelectOption(createRepositoryOption(repository));
  }

  function createRecentRepository(value: string, source: 'local' | 'git'): RecentRepository {
    const title = value
      .replace(/\\/g, '/')
      .replace(/\.git$/i, '')
      .split('/')
      .filter(Boolean)
      .pop() ?? $i18nT('ui.shell.launchGate.context.repository.fallbackTitle', { default: 'Repository' });

    return {
      id: `${source}:${value.toLowerCase()}`,
      title,
      path: value,
      source,
      lastUsedAt: new Date().toISOString()
    };
  }

  function createRepositoryOption(repository: RecentRepository): ProjectGateContextOption {
    const existingOption = row.options.find((option) => option.project?.root === repository.path || option.title === repository.title);

    if (existingOption) {
      return existingOption;
    }

    return {
      id: `recent:${repository.id}`,
      eyebrow: repository.source === 'git'
        ? $i18nT('ui.shell.launchGate.repository.gitUrl', { default: 'Git URL' })
        : $i18nT('ui.shell.launchGate.repository.localPath', { default: 'Local path' }),
      title: repository.title,
      description: repository.path,
      icon: 'action.folder',
      tone: 'repository',
      category: 'repository',
      project: {
        id: `recent-${repository.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repository'}`,
        kind: 'repository',
        label: repository.title,
        root: repository.path,
        description: repository.path,
        icon: 'action.folder'
      }
    };
  }

  function formatRelativeTime(isoDate: string, translate: WorkbenchTranslate): string {
    const elapsedMs = Date.now() - new Date(isoDate).getTime();
    const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60000));

    if (elapsedMinutes < 1)
      return translate('ui.shell.launchGate.repository.justNow', { default: 'just now' });
    if (elapsedMinutes < 60) {
      return translate('ui.shell.launchGate.repository.relativeMinutes', {
        default: '{{count}} min ago',
        values: { count: elapsedMinutes }
      });
    }

    const elapsedHours = Math.round(elapsedMinutes / 60);
    if (elapsedHours < 24) {
      return translate('ui.shell.launchGate.listing.relativeHours', {
        default: '{{count}} hour{{plural}} ago',
        values: { count: elapsedHours, plural: elapsedHours === 1 ? '' : 's' }
      });
    }

    const elapsedDays = Math.round(elapsedHours / 24);
    return translate('ui.shell.launchGate.listing.relativeDays', {
      default: '{{count}} day{{plural}} ago',
      values: { count: elapsedDays, plural: elapsedDays === 1 ? '' : 's' }
    });
  }
</script>

<section class="project-gate-repository-detail" aria-label={$i18nT('ui.shell.launchGate.context.repository.title', { default: 'Repositories' })}>
  <header class="project-gate-repository-detail__nav">
    <button type="button" class="project-gate-repository-detail__back" aria-label={$i18nT('ui.shell.launchGate.backToContexts', { default: 'Back to contexts' })} on:click={onBack}>
      <WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.back', { default: 'Back' })} />
      <strong>{$i18nT('ui.shell.launchGate.contexts', { default: 'Contexts' })}</strong>
    </button>
  </header>

  <div class="project-gate-repository-detail__surface">
    <section class="project-gate-repository-detail__add" aria-label={$i18nT('ui.shell.launchGate.repository.addAria', { default: 'Add a repository' })}>
      <header>
        <strong>{$i18nT('ui.shell.launchGate.repository.addTitle', { default: 'Add a repository' })}</strong>
        <span>{$i18nT('ui.shell.launchGate.repository.addCopy', { default: 'Choose your repository source' })}</span>
      </header>

      <div class="project-gate-repository-detail__sources">
        <article class="project-gate-repository-detail__source" data-source="local">
          <ProjectGateIconBadge icon="action.folder" label={$i18nT('ui.shell.launchGate.repository.localPath', { default: 'Local path' })} tone="repository" size="sm" />
          <span>
            <strong>{$i18nT('ui.shell.launchGate.repository.localPath', { default: 'Local path' })}</strong>
            <em>{$i18nT('ui.shell.launchGate.repository.localCopy', { default: 'Load a repository from your local file system' })}</em>
          </span>
          <label>
            <input
              bind:value={localPath}
              placeholder={$i18nT('ui.shell.launchGate.repository.localPlaceholder', { default: '/path/to/your/repository' })}
              aria-label={$i18nT('ui.shell.launchGate.repository.localPathAria', { default: 'Local repository path' })}
              on:keydown={(event) => {
                if (event.key === 'Enter') {
                  loadRepositoryFromInput('local');
                }
              }}
            />
            <button type="button" on:click={browseLocalRepository}>{$i18nT('ui.shell.launchGate.repository.browse', { default: 'Browse' })}</button>
          </label>
          <small>{$i18nT('ui.shell.launchGate.repository.localHint', { default: 'Select a local directory containing a git repository' })}</small>
        </article>

        <article class="project-gate-repository-detail__source" data-source="git">
          <ProjectGateIconBadge icon="action.command" label={$i18nT('ui.shell.launchGate.repository.gitUrl', { default: 'Git URL' })} tone="project" size="sm" />
          <span>
            <strong>{$i18nT('ui.shell.launchGate.repository.gitUrl', { default: 'Git URL' })}</strong>
            <em>{$i18nT('ui.shell.launchGate.repository.gitCopy', { default: 'Clone a repository from a remote URL' })}</em>
          </span>
          <label>
            <input
              bind:value={gitUrl}
              placeholder={$i18nT('ui.shell.launchGate.repository.gitPlaceholder', { default: 'https://github.com/owner/repository.git' })}
              aria-label={$i18nT('ui.shell.launchGate.repository.gitUrlAria', { default: 'Git repository URL' })}
              on:keydown={(event) => {
                if (event.key === 'Enter') {
                  loadRepositoryFromInput('git');
                }
              }}
            />
            <button type="button" on:click={() => loadRepositoryFromInput('git')}>{$i18nT('ui.shell.launchGate.repository.load', { default: 'Load' })}</button>
          </label>
          <small>{$i18nT('ui.shell.launchGate.repository.gitHint', { default: 'Enter the HTTPS or SSH URL of a git repository' })}</small>
        </article>
      </div>
    </section>

    <section class="project-gate-repository-detail__recent" aria-label={$i18nT('ui.shell.launchGate.repository.recentAria', { default: 'Recently loaded repositories' })}>
      <header>
        <span>
          <strong>{$i18nT('ui.shell.launchGate.repository.recentTitle', { default: 'Recently loaded' })}</strong>
          <em>{$i18nT('ui.shell.launchGate.repository.recentCopy', { default: 'Your recently accessed repositories' })}</em>
        </span>
        <button type="button">
          {$i18nT('ui.shell.launchGate.repository.viewAll', { default: 'View all repositories' })}
          <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.repository.viewAllShort', { default: 'View all' })} />
        </button>
      </header>

      <div class="project-gate-repository-detail__recent-list">
        {#each recentRepositories as repository (repository.id)}
          <button type="button" class="project-gate-repository-detail__recent-row" on:click={() => loadRecentRepository(repository)}>
            <ProjectGateIconBadge
              icon={repository.source === 'git' ? 'action.command' : 'action.folder'}
              label={repository.title}
              tone={repository.source === 'git' ? 'project' : 'repository'}
              size="sm"
            />
            <span>
              <strong>{repository.title}</strong>
              <em>{repository.path}</em>
            </span>
            <small>{$i18nT('ui.shell.launchGate.repository.defaultBranch', { default: 'main' })}</small>
            <small>{formatRelativeTime(repository.lastUsedAt, $i18nT)}</small>
            <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.repository.load', { default: 'Load' })} />
          </button>
        {/each}

        {#if recentRepositories.length === 0}
          <p class="project-gate-repository-detail__empty">
            {$i18nT('ui.shell.launchGate.repository.empty', { default: 'No repository loaded in this session yet.' })}
          </p>
        {/if}
      </div>
    </section>
  </div>
</section>

<style>
  .project-gate-repository-detail {
    width: min(1380px, 100%);
    margin: 0 auto;
    display: grid;
    gap: 0.7rem;
  }

  .project-gate-repository-detail__nav {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    color: var(--k-text-secondary, #b8c6d8);
    font-size: 0.9rem;
  }

  .project-gate-repository-detail__back {
    min-width: 2.45rem;
    height: 2.45rem;
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0 0.72rem;
    border: 1px solid rgba(120, 151, 193, 0.24);
    border-radius: 7px;
    color: inherit;
    background: rgba(5, 11, 20, 0.28);
    font-size: 0.72rem;
    font-weight: 850;
    cursor: pointer;
  }

  .project-gate-repository-detail__back strong {
    font: inherit;
  }

  .project-gate-repository-detail__back :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .project-gate-repository-detail__surface {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid rgba(120, 151, 193, 0.24);
    border-radius: 10px;
    background:
      radial-gradient(circle at 100% 0%, rgba(96, 165, 250, 0.1), transparent 36%),
      rgba(7, 13, 23, 0.5);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
    backdrop-filter: blur(18px);
  }

  .project-gate-repository-detail__add,
  .project-gate-repository-detail__recent {
    display: grid;
    gap: 1.1rem;
    padding: 1rem;
    border: 1px solid rgba(120, 151, 193, 0.18);
    border-radius: 8px;
    background: rgba(5, 11, 20, 0.18);
  }

  .project-gate-repository-detail__add > header,
  .project-gate-repository-detail__recent > header,
  .project-gate-repository-detail__recent > header > span {
    display: grid;
    gap: 0.25rem;
  }

  .project-gate-repository-detail__recent > header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .project-gate-repository-detail__add strong,
  .project-gate-repository-detail__recent strong {
    color: var(--k-text-primary, #eef4ff);
    font-size: 1rem;
  }

  .project-gate-repository-detail__add span,
  .project-gate-repository-detail__recent em,
  .project-gate-repository-detail__source em,
  .project-gate-repository-detail__source small {
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 10%);
    font-style: normal;
  }

  .project-gate-repository-detail__sources {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .project-gate-repository-detail__source {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.85rem 1rem;
    padding: 1.2rem;
    border: 1px solid rgba(241, 201, 111, 0.42);
    border-radius: 8px;
    background:
      radial-gradient(circle at 0% 0%, rgba(241, 201, 111, 0.09), transparent 42%),
      rgba(5, 11, 20, 0.2);
  }

  .project-gate-repository-detail__source[data-source='git'] {
    border-color: rgba(167, 139, 250, 0.42);
    background:
      radial-gradient(circle at 0% 0%, rgba(167, 139, 250, 0.1), transparent 42%),
      rgba(5, 11, 20, 0.2);
  }

  .project-gate-repository-detail__source > span {
    display: grid;
    gap: 0.28rem;
  }

  .project-gate-repository-detail__source label {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.6rem;
  }

  .project-gate-repository-detail__source input {
    min-width: 0;
    height: 2.55rem;
    padding: 0 0.85rem;
    border: 1px solid rgba(120, 151, 193, 0.2);
    border-radius: 7px;
    color: var(--k-text-primary, #eef4ff);
    background: rgba(5, 11, 20, 0.28);
    font: inherit;
    outline: none;
  }

  .project-gate-repository-detail__source button,
  .project-gate-repository-detail__recent > header button {
    min-height: 2.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0 0.9rem;
    border: 1px solid rgba(120, 151, 193, 0.22);
    border-radius: 7px;
    color: var(--k-text-primary, #eef4ff);
    background: rgba(255, 255, 255, 0.035);
    font-weight: 800;
    cursor: pointer;
  }

  .project-gate-repository-detail__source small {
    grid-column: 1 / -1;
  }

  .project-gate-repository-detail__recent-list {
    display: grid;
    gap: 0.5rem;
  }

  .project-gate-repository-detail__recent-row {
    min-width: 0;
    min-height: 3.7rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 0.85rem;
    padding: 0.55rem 0.8rem;
    border: 1px solid rgba(120, 151, 193, 0.16);
    border-radius: 8px;
    color: var(--k-text-secondary, #b8c6d8);
    text-align: left;
    background: rgba(5, 11, 20, 0.18);
    cursor: pointer;
  }

  .project-gate-repository-detail__recent-row span {
    min-width: 0;
    display: grid;
    gap: 0.18rem;
  }

  .project-gate-repository-detail__recent-row strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-repository-detail__recent-row em {
    overflow: hidden;
    color: var(--k-text-muted, #8fa1b8);
    font-size: 0.78rem;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-repository-detail__recent-row small {
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 8%);
  }

  .project-gate-repository-detail__recent-row:hover,
  .project-gate-repository-detail__recent-row:focus-visible {
    border-color: rgba(241, 201, 111, 0.42);
    background: rgba(241, 201, 111, 0.055);
    outline: none;
  }

  .project-gate-repository-detail__empty {
    margin: 0;
    padding: 1rem;
    border: 1px dashed rgba(120, 151, 193, 0.22);
    border-radius: 8px;
    color: var(--k-text-muted, #8fa1b8);
    text-align: center;
  }

  @media (max-width: 860px) {
    .project-gate-repository-detail__sources,
    .project-gate-repository-detail__recent-row {
      grid-template-columns: 1fr;
    }
  }
</style>
