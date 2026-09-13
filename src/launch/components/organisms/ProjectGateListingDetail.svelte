<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextOption, ProjectGateContextRow } from '../../projectGateContext';
  import {
    createProjectGateListingItems,
    type ProjectGateListingSortKey
  } from '../projectGateListingModel';
  import ProjectGateIconBadge from '../atoms/ProjectGateIconBadge.svelte';
  import ProjectGateListingToolbar from '../molecules/ProjectGateListingToolbar.svelte';
  import ProjectGateListRow, { type ProjectGateListRowAction } from '../molecules/ProjectGateListRow.svelte';
  import ProjectGateEntityDetailView from './ProjectGateEntityDetailView.svelte';
  import { getWorkbenchTranslator } from '../../../i18n/workbenchI18n';

  export let row: ProjectGateContextRow;
  export let onBack: () => void = () => undefined;
  export let onSelectOption: (option: ProjectGateContextOption) => void = () => undefined;
  export let onRunOption: (option: ProjectGateContextOption, mode: 'direct' | 'step') => void = () => undefined;

  let query = '';
  let sortKey: ProjectGateListingSortKey = 'name';
  let sortDirection: 'asc' | 'desc' = 'asc';
  let detailItem: ReturnType<typeof createProjectGateListingItems>[number] | null = null;
  let actionStatus = '';
  let currentPage = 1;
  let paginationSignature = '';

  const pageSize = 8;
  const i18nT = getWorkbenchTranslator();

  $: descriptionByCategory = {
    self: $i18nT('ui.shell.launchGate.context.self.description', { default: 'Runtime core and self inspection.' }),
    repository: $i18nT('ui.shell.launchGate.context.repository.description.short', { default: 'Work with repositories.' }),
    application: $i18nT('ui.shell.launchGate.context.application.description', { default: 'Manage and run your applications.' }),
    tool: $i18nT('ui.shell.launchGate.context.tool.description', { default: 'Access and manage your tools and utilities.' }),
    widget: $i18nT('ui.shell.launchGate.context.widget.description', { default: 'Inspect shell widgets, docking regions and contextual availability.' }),
    poc: $i18nT('ui.shell.launchGate.context.poc.description', { default: 'Explore and prototype new ideas.' })
  } satisfies Record<string, string>;

  $: listingItems = createProjectGateListingItems(row, $i18nT);
  $: filteredItems = listingItems.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [
      item.option.title,
      item.option.description,
      item.option.eyebrow,
      item.meta.secondary,
      item.meta.status,
      ...(item.option.tool?.widgets ?? []).flatMap((widget) => [
        widget.title,
        widget.description,
        widget.scope,
        widget.defaultRegion
      ]),
      item.option.widget?.scope ?? '',
      item.option.widget?.defaultRegion ?? '',
      ...(item.option.widget?.contextToolIds ?? [])
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  $: sortedItems = [...filteredItems].sort((left, right) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    if (sortKey === 'date') {
      return direction * (left.meta.dateValue - right.meta.dateValue);
    }

    return direction * left.option.title.localeCompare(right.option.title);
  });
  $: totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  $: {
    const nextSignature = `${row.id}:${query}:${sortKey}:${sortDirection}:${sortedItems.length}`;

    if (paginationSignature !== nextSignature) {
      paginationSignature = nextSignature;
      currentPage = 1;
    }
  }
  $: currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  $: visiblePageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  $: pageStartIndex = sortedItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  $: pageEndIndex = Math.min(currentPage * pageSize, sortedItems.length);
  $: paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleRowAction(event: CustomEvent<{
    action: ProjectGateListRowAction;
    option: ProjectGateContextOption;
  }>): void {
    const item = listingItems.find((candidate) => candidate.option.id === event.detail.option.id) ?? null;

    if (event.detail.action === 'run') {
      onRunOption(event.detail.option, 'direct');
      return;
    }

    if (event.detail.action === 'step') {
      onRunOption(event.detail.option, 'step');
      return;
    }

    if (event.detail.action === 'view') {
      detailItem = item;
      actionStatus = '';
      return;
    }

    detailItem = item;
    actionStatus = $i18nT('ui.shell.launchGate.listing.actionQueued', {
      default: '{{action}} queued for {{title}}.',
      values: {
        action: resolveActionLabel(event.detail.action),
        title: event.detail.option.title
      }
    });
  }

  function resolveActionLabel(action: ProjectGateListRowAction): string {
    if (action === 'run') return $i18nT('ui.shell.launchGate.actions.run', { default: 'Run' });
    if (action === 'step') return $i18nT('ui.shell.launchGate.actions.runStepByStep', { default: 'Run step-by-step' });
    if (action === 'edit') return $i18nT('ui.shell.launchGate.actions.edit', { default: 'Edit' });
    if (action === 'duplicate') return $i18nT('ui.shell.launchGate.actions.duplicate', { default: 'Duplicate' });
    if (action === 'export') return $i18nT('ui.shell.launchGate.actions.export', { default: 'Export' });
    if (action === 'delete') return $i18nT('ui.shell.launchGate.actions.delete', { default: 'Delete' });
    return $i18nT('ui.shell.launchGate.actions.viewDetails', { default: 'View details' });
  }

  function goToPage(pageNumber: number): void {
    currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
  }

  function closeEntityDetail(): void {
    detailItem = null;
    actionStatus = '';
  }
</script>

<section class="project-gate-listing-detail" data-tone={row.tone} aria-label={row.title}>
  <header class="project-gate-listing-detail__nav">
    <button type="button" class="project-gate-listing-detail__back" aria-label={$i18nT('ui.shell.launchGate.backToContexts', { default: 'Back to contexts' })} on:click={onBack}>
      <WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.back', { default: 'Back' })} />
      <strong>{$i18nT('ui.shell.launchGate.contexts', { default: 'Contexts' })}</strong>
    </button>
  </header>

  {#if detailItem}
    <ProjectGateEntityDetailView
      item={detailItem}
      {actionStatus}
      onBack={closeEntityDetail}
    />
  {:else}
    <section class="project-gate-listing-detail__surface">
    <header class="project-gate-listing-detail__head">
      <span class="project-gate-listing-detail__identity">
        <ProjectGateIconBadge icon={row.icon} label={row.title} tone={row.tone} size="lg" />
        <span>
          <strong>{row.title}</strong>
          <em>{descriptionByCategory[row.id]}</em>
        </span>
      </span>

      <ProjectGateListingToolbar
        category={row.id}
        bind:query
        bind:sortKey
        bind:sortDirection
      />
    </header>

    <div class="project-gate-listing-detail__table-wrap">
      <table class="project-gate-listing-detail__table" data-category={row.id}>
        <thead>
          <tr>
            <th>{$i18nT('ui.shell.launchGate.table.name', { default: 'Name' })}</th>
            <th>{$i18nT('ui.shell.launchGate.table.description', { default: 'Description' })}</th>
            <th>{row.id === 'application' ? $i18nT('ui.shell.launchGate.table.environment', { default: 'Environment' }) : row.id === 'poc' ? $i18nT('ui.shell.launchGate.table.status', { default: 'Status' }) : row.id === 'tool' ? $i18nT('ui.shell.launchGate.table.widgets', { default: 'Widgets' }) : row.id === 'widget' ? $i18nT('ui.shell.launchGate.table.typology', { default: 'Typology' }) : $i18nT('ui.shell.launchGate.table.version', { default: 'Version' })}</th>
            {#if row.id !== 'tool' && row.id !== 'widget'}
              <th>{row.id === 'application' ? $i18nT('ui.shell.launchGate.table.lastStarted', { default: 'Last started' }) : $i18nT('ui.shell.launchGate.table.lastUpdated', { default: 'Last updated' })}</th>
            {/if}
            <th>{$i18nT('ui.shell.launchGate.table.actions', { default: 'Actions' })}</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedItems as item (item.option.id)}
            <ProjectGateListRow
              option={item.option}
              meta={item.meta}
              on:action={handleRowAction}
              on:select={(event) => onSelectOption(event.detail)}
            />
          {/each}
        </tbody>
      </table>

      {#if sortedItems.length === 0}
        <p class="project-gate-listing-detail__empty">{$i18nT('ui.shell.launchGate.listing.empty', { default: 'No matching entry.' })}</p>
      {/if}
    </div>

    <footer class="project-gate-listing-detail__footer">
      <span>{$i18nT('ui.shell.launchGate.listing.showing', {
        default: 'Showing {{start}} to {{end}} of {{total}} {{label}}',
        values: {
          start: pageStartIndex,
          end: pageEndIndex,
          total: sortedItems.length,
          label: row.title.toLowerCase()
        }
      })}</span>
      <span class="project-gate-listing-detail__pages">
        <button type="button" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)}>
          <WorkbenchIcon icon="action.previous-key" label={$i18nT('ui.shell.launchGate.pagination.previous', { default: 'Previous' })} />
        </button>
        {#each visiblePageNumbers as pageNumber}
          <button
            type="button"
            data-active={pageNumber === currentPage}
            aria-current={pageNumber === currentPage ? 'page' : undefined}
            on:click={() => goToPage(pageNumber)}
          >
            {pageNumber}
          </button>
        {/each}
        <button type="button" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)}>
          <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.pagination.next', { default: 'Next' })} />
        </button>
      </span>
    </footer>
    </section>
  {/if}
</section>

<style>
  .project-gate-listing-detail {
    --gate-tone: #69ecc1;
    --gate-tone-rgb: 105 236 193;
    --gate-widget-tone: var(--project-gate-tone-widget, #f472b6);
    --gate-widget-tone-rgb: var(--project-gate-tone-widget-rgb, 244 114 182);
    width: min(1500px, 100%);
    margin: 0 auto;
    display: grid;
    gap: 0.7rem;
  }

  .project-gate-listing-detail[data-tone='repository'] {
    --gate-tone: var(--project-gate-tone-repository, #f1c96f);
    --gate-tone-rgb: var(--project-gate-tone-repository-rgb, 241 201 111);
  }

  .project-gate-listing-detail[data-tone='project'] {
    --gate-tone: var(--project-gate-tone-project, #a78bfa);
    --gate-tone-rgb: var(--project-gate-tone-project-rgb, 167 139 250);
  }

  .project-gate-listing-detail[data-tone='tool'] {
    --gate-tone: var(--project-gate-tone-tool, #78e09a);
    --gate-tone-rgb: var(--project-gate-tone-tool-rgb, 120 224 154);
  }

  .project-gate-listing-detail[data-tone='widget'] {
    --gate-tone: var(--gate-widget-tone);
    --gate-tone-rgb: var(--gate-widget-tone-rgb);
  }

  .project-gate-listing-detail[data-tone='poc'] {
    --gate-tone: var(--project-gate-tone-poc, #6da4ff);
    --gate-tone-rgb: var(--project-gate-tone-poc-rgb, 109 164 255);
  }

  .project-gate-listing-detail__nav {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    color: var(--k-text-secondary, #b8c6d8);
    font-size: 0.95rem;
  }

  .project-gate-listing-detail__back {
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

  .project-gate-listing-detail__back strong {
    font: inherit;
  }

  .project-gate-listing-detail__back :global(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .project-gate-listing-detail__surface {
    display: grid;
    gap: 1.1rem;
    padding: 1rem;
    border: 1px solid rgba(120, 151, 193, 0.24);
    border-radius: 10px;
    background:
      radial-gradient(circle at 0% 0%, rgb(var(--gate-tone-rgb) / 0.09), transparent 38%),
      rgba(7, 13, 23, 0.5);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      0 1.6rem 4rem rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(18px);
  }

  .project-gate-listing-detail__head {
    display: grid;
    grid-template-columns: minmax(18rem, 1fr) auto;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem 0.7rem 0.9rem;
  }

  .project-gate-listing-detail__identity {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 1.1rem;
  }

  .project-gate-listing-detail__identity > span:last-child {
    min-width: 0;
    display: grid;
    gap: 0.38rem;
  }

  .project-gate-listing-detail__identity strong {
    color: var(--k-text-primary, #eef4ff);
    font-size: 1.35rem;
    line-height: 1.1;
  }

  .project-gate-listing-detail__identity em {
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 8%);
    font-style: normal;
  }

  .project-gate-listing-detail__table-wrap {
    overflow: visible;
    border: 1px solid rgba(120, 151, 193, 0.14);
    border-radius: 8px;
    background: rgba(5, 11, 20, 0.16);
  }

  .project-gate-listing-detail__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .project-gate-listing-detail__table th:nth-child(1) {
    width: 24%;
  }

  .project-gate-listing-detail__table th:nth-child(2) {
    width: 30%;
  }

  .project-gate-listing-detail__table th:nth-child(3),
  .project-gate-listing-detail__table th:nth-child(4) {
    width: 16%;
  }

  .project-gate-listing-detail__table th:nth-child(5) {
    width: 14%;
  }

  .project-gate-listing-detail__table[data-category='tool'] th:nth-child(1) {
    width: 22%;
  }

  .project-gate-listing-detail__table[data-category='tool'] th:nth-child(2) {
    width: 30%;
  }

  .project-gate-listing-detail__table[data-category='tool'] th:nth-child(3) {
    width: 34%;
  }

  .project-gate-listing-detail__table[data-category='tool'] th:nth-child(4) {
    width: 14%;
  }

  .project-gate-listing-detail__table[data-category='widget'] th:nth-child(1) {
    width: 26%;
  }

  .project-gate-listing-detail__table[data-category='widget'] th:nth-child(2) {
    width: 40%;
  }

  .project-gate-listing-detail__table[data-category='widget'] th:nth-child(3) {
    width: 20%;
  }

  .project-gate-listing-detail__table[data-category='widget'] th:nth-child(4) {
    width: 14%;
  }

  .project-gate-listing-detail__table th {
    padding: 0.95rem 1.1rem;
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), white 8%);
    background:
      linear-gradient(180deg, rgba(20, 36, 57, 0.62), rgba(11, 21, 34, 0.38)),
      rgba(5, 11, 20, 0.18);
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
  }

  .project-gate-listing-detail__table th:last-child {
    text-align: right;
  }

  .project-gate-listing-detail__empty {
    margin: 0;
    padding: 1rem;
    color: var(--k-text-muted, #8fa1b8);
    text-align: center;
  }

  .project-gate-listing-detail__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.2rem 0.7rem 0;
    color: var(--k-text-secondary, #b8c6d8);
    font-size: 0.78rem;
  }

  .project-gate-listing-detail__pages {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
  }

  .project-gate-listing-detail__pages button {
    min-width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border: 1px solid rgba(120, 151, 193, 0.18);
    border-radius: 6px;
    color: inherit;
    background: rgba(5, 11, 20, 0.22);
    cursor: pointer;
  }

  .project-gate-listing-detail__pages button[data-active='true'] {
    color: var(--gate-tone);
    border-color: rgb(var(--gate-tone-rgb) / 0.45);
    background: rgb(var(--gate-tone-rgb) / 0.08);
  }

  .project-gate-listing-detail__pages button:disabled {
    opacity: 0.36;
    cursor: not-allowed;
  }

  @media (max-width: 980px) {
    .project-gate-listing-detail__head,
    .project-gate-listing-detail__footer {
      grid-template-columns: 1fr;
      align-items: stretch;
      flex-direction: column;
    }

    .project-gate-listing-detail__footer {
      align-items: flex-start;
    }
  }
</style>
