<script context="module" lang="ts">
  export type ProjectGateListRowAction = 'run' | 'step' | 'view' | 'edit' | 'duplicate' | 'export' | 'delete';
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextOption, ProjectGateToolWidgetInfo } from '../../projectGateContext';
  import type { ProjectGateListingRowMeta } from '../projectGateListingModel';
  import ProjectGateControlButton from '../atoms/ProjectGateControlButton.svelte';
  import ProjectGateIconBadge from '../atoms/ProjectGateIconBadge.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../../../i18n/workbenchI18n';

  export let option: ProjectGateContextOption;
  export let meta: ProjectGateListingRowMeta;

  const dispatch = createEventDispatcher<{
    action: { action: ProjectGateListRowAction; option: ProjectGateContextOption; meta: ProjectGateListingRowMeta };
    select: ProjectGateContextOption;
  }>();
  let actionMenuOpen = false;
  let actionMenuAnchor: HTMLSpanElement | null = null;
  let actionMenuElement: HTMLSpanElement | null = null;
  let actionMenuPlacement: 'top' | 'bottom' = 'bottom';
  const i18nT = getWorkbenchTranslator();

  function toggleActionMenu(): void {
    actionMenuOpen = !actionMenuOpen;

    if (actionMenuOpen) {
      updateActionMenuPosition();
    }
  }

  function closeActionMenu(): void {
    actionMenuOpen = false;
  }

  function updateActionMenuPosition(): void {
    if (!actionMenuAnchor || typeof window === 'undefined') {
      return;
    }

    const anchorBounds = actionMenuAnchor.getBoundingClientRect();
    actionMenuPlacement = window.innerHeight - anchorBounds.bottom < 230 ? 'top' : 'bottom';
  }

  function handleWindowClick(event: MouseEvent): void {
    if (!actionMenuOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (actionMenuAnchor?.contains(target) || actionMenuElement?.contains(target)) {
      return;
    }

    closeActionMenu();
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (actionMenuOpen && event.key === 'Escape') {
      closeActionMenu();
    }
  }

  function handleWindowViewportChange(): void {
    if (actionMenuOpen) {
      closeActionMenu();
    }
  }

  function dispatchAction(action: ProjectGateListRowAction): void {
    dispatch('action', { action, option, meta });
    closeActionMenu();
  }

  function handleIdentityClick(): void {
    if (option.category === 'widget') {
      dispatchAction('view');
      return;
    }

    dispatch('select', option);
  }

  function resolveWidgetRegionIcon(region: ProjectGateToolWidgetInfo['defaultRegion']): string {
    if (region === 'left') return 'layout.sidebar-left';
    if (region === 'right') return 'layout.sidebar-right';
    return 'layout.panel-bottom';
  }

  function resolveWidgetScopeLabel(
    scope: ProjectGateToolWidgetInfo['scope'],
    translate: WorkbenchTranslate
  ): string {
    return scope === 'global'
      ? translate('ui.shell.launchGate.widgets.scope.global', { default: 'Global' })
      : translate('ui.shell.launchGate.widgets.scope.contextual', { default: 'Contextual' });
  }

  function resolveWidgetScopeIcon(scope: ProjectGateToolWidgetInfo['scope']): string {
    return scope === 'global' ? 'runtime.projection' : 'action.focus';
  }

  function resolveWidgetRegionLabel(
    region: ProjectGateToolWidgetInfo['defaultRegion'],
    translate: WorkbenchTranslate
  ): string {
    if (region === 'left')
      return translate('ui.shell.launchGate.widgets.region.left', { default: 'Left' });
    if (region === 'right')
      return translate('ui.shell.launchGate.widgets.region.right', { default: 'Right' });
    return translate('ui.shell.launchGate.widgets.region.bottom', { default: 'Bottom' });
  }
</script>

<svelte:window
  on:click={handleWindowClick}
  on:keydown={handleWindowKeydown}
  on:resize={handleWindowViewportChange}
  on:scroll={handleWindowViewportChange}
/>

<tr class="project-gate-list-row" data-tone={option.tone} on:dblclick={() => dispatchAction('view')}>
  <td>
    <button type="button" class="project-gate-list-row__identity" on:click={handleIdentityClick}>
      <ProjectGateIconBadge icon={option.icon} label={option.title} tone={option.tone} size="sm" />
      <span>
        <strong>{option.title}</strong>
        <em>{meta.secondary}</em>
      </span>
    </button>
  </td>
  <td>{option.description}</td>
  <td>
    {#if option.category === 'tool'}
      {#if option.tool?.widgets?.length}
        <span class="project-gate-list-row__widget-list" aria-label={$i18nT('ui.shell.launchGate.widgets.associated', { default: 'Associated widgets' })}>
          {#each option.tool.widgets.slice(0, 3) as widget (widget.id)}
            <span class="project-gate-list-row__widget-chip" title={`${widget.title} · ${resolveWidgetScopeLabel(widget.scope, $i18nT)}`}>
              <span class="project-gate-list-row__widget-icon project-gate-list-row__widget-icon--source">
                <WorkbenchIcon icon={widget.icon} label={widget.title} />
              </span>
              <span>{widget.title}</span>
              <span
                class="project-gate-list-row__widget-icon project-gate-list-row__widget-icon--scope"
                data-scope={widget.scope}
                title={resolveWidgetScopeLabel(widget.scope, $i18nT)}
              >
                <WorkbenchIcon icon={resolveWidgetScopeIcon(widget.scope)} label={resolveWidgetScopeLabel(widget.scope, $i18nT)} />
              </span>
              <span class="project-gate-list-row__widget-icon project-gate-list-row__widget-icon--region" title={widget.defaultRegion}>
                <WorkbenchIcon icon={resolveWidgetRegionIcon(widget.defaultRegion)} label={widget.defaultRegion} />
              </span>
            </span>
          {/each}
          {#if option.tool.widgets.length > 3}
            <span class="project-gate-list-row__widget-more">+{option.tool.widgets.length - 3}</span>
          {/if}
        </span>
      {:else}
        <span class="project-gate-list-row__muted">
          {$i18nT('ui.shell.launchGate.widgets.none', { default: 'No widgets' })}
        </span>
      {/if}
    {:else if option.category === 'widget' && option.widget}
      <span class="project-gate-list-row__widget-typology">
        <span title={resolveWidgetScopeLabel(option.widget.scope, $i18nT)}>
          <WorkbenchIcon icon={resolveWidgetScopeIcon(option.widget.scope)} label={resolveWidgetScopeLabel(option.widget.scope, $i18nT)} />
          {resolveWidgetScopeLabel(option.widget.scope, $i18nT)}
        </span>
        <span title={resolveWidgetRegionLabel(option.widget.defaultRegion, $i18nT)}>
          <WorkbenchIcon icon={resolveWidgetRegionIcon(option.widget.defaultRegion)} label={resolveWidgetRegionLabel(option.widget.defaultRegion, $i18nT)} />
          {resolveWidgetRegionLabel(option.widget.defaultRegion, $i18nT)}
        </span>
        {#if option.widget.contextToolIds?.length}
          <span title={option.widget.contextToolIds.join(', ')}>
            <WorkbenchIcon icon="tool.wrench" label={$i18nT('ui.shell.launchGate.context.tool.title', { default: 'Tools' })} />
            {option.widget.contextToolIds.length}
          </span>
        {/if}
      </span>
    {:else}
      <span class="project-gate-list-row__pill" data-tone={meta.statusTone}>{meta.status}</span>
    {/if}
  </td>
  {#if option.category !== 'tool' && option.category !== 'widget'}
    <td>{meta.dateLabel}</td>
  {/if}
  <td class="project-gate-list-row__actions">
    {#if option.category === 'widget'}
      <ProjectGateControlButton icon="action.visibility" label={$i18nT('ui.shell.launchGate.actions.viewDetails', { default: 'View details' })} tone="primary" tooltipPlacement="bottom" on:click={() => dispatchAction('view')} />
    {:else}
      <ProjectGateControlButton icon="action.play" label={$i18nT('ui.shell.launchGate.actions.run', { default: 'Run' })} tone="primary" tooltipPlacement="bottom" on:click={() => dispatchAction('run')} />
      <ProjectGateControlButton icon="action.next-key" label={$i18nT('ui.shell.launchGate.actions.runStepByStep', { default: 'Run step-by-step' })} tooltipPlacement="bottom" on:click={() => dispatchAction('step')} />
    {/if}
    {#if option.category !== 'widget'}
      <span class="project-gate-list-row__menu-wrap" bind:this={actionMenuAnchor}>
        <ProjectGateControlButton
          icon="action.more-horizontal"
          label={$i18nT('ui.shell.launchGate.actions.moreActions', { default: 'More actions' })}
          active={actionMenuOpen}
          tooltipPlacement="bottom"
          on:click={toggleActionMenu}
        />
        {#if actionMenuOpen}
          <span
            class="project-gate-list-row__menu"
            role="menu"
            data-placement={actionMenuPlacement}
            bind:this={actionMenuElement}
          >
            <button type="button" role="menuitem" on:click={() => dispatchAction('view')}>
              <WorkbenchIcon icon="action.visibility" label={$i18nT('ui.shell.launchGate.actions.viewDetails', { default: 'View details' })} />
              <span>{$i18nT('ui.shell.launchGate.actions.viewDetails', { default: 'View details' })}</span>
            </button>
            <button type="button" role="menuitem" on:click={() => dispatchAction('edit')}>
              <WorkbenchIcon icon="action.brush" label={$i18nT('ui.shell.launchGate.actions.edit', { default: 'Edit' })} />
              <span>{$i18nT('ui.shell.launchGate.actions.edit', { default: 'Edit' })}</span>
            </button>
            <button type="button" role="menuitem" on:click={() => dispatchAction('duplicate')}>
              <WorkbenchIcon icon="action.detach" label={$i18nT('ui.shell.launchGate.actions.duplicate', { default: 'Duplicate' })} />
              <span>{$i18nT('ui.shell.launchGate.actions.duplicate', { default: 'Duplicate' })}</span>
            </button>
            <button type="button" role="menuitem" on:click={() => dispatchAction('export')}>
              <WorkbenchIcon icon="action.arrow-down" label={$i18nT('ui.shell.launchGate.actions.export', { default: 'Export' })} />
              <span>{$i18nT('ui.shell.launchGate.actions.export', { default: 'Export' })}</span>
            </button>
            <button type="button" role="menuitem" data-danger="true" on:click={() => dispatchAction('delete')}>
              <WorkbenchIcon icon="action.clear" label={$i18nT('ui.shell.launchGate.actions.delete', { default: 'Delete' })} />
              <span>{$i18nT('ui.shell.launchGate.actions.delete', { default: 'Delete' })}</span>
            </button>
          </span>
        {/if}
      </span>
    {/if}
  </td>
</tr>

<style>
  .project-gate-list-row {
    --gate-widget-tone: var(--project-gate-tone-widget, #f472b6);
    --gate-widget-tone-rgb: var(--project-gate-tone-widget-rgb, 244 114 182);
    color: var(--k-text-secondary, #b8c6d8);
    border-bottom: 1px solid rgba(120, 151, 193, 0.12);
  }

  .project-gate-list-row:last-child {
    border-bottom: 0;
  }

  .project-gate-list-row td {
    overflow: hidden;
    padding: 1rem 1.1rem;
    vertical-align: middle;
  }

  .project-gate-list-row td:nth-child(2),
  .project-gate-list-row td:nth-child(4) {
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 6%);
    line-height: 1.45;
  }

  .project-gate-list-row__identity {
    width: 100%;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
    border: 0;
    color: inherit;
    text-align: left;
    background: transparent;
    cursor: pointer;
  }

  .project-gate-list-row__identity > span {
    min-width: 0;
    display: grid;
    gap: 0.22rem;
  }

  .project-gate-list-row__identity strong {
    overflow: hidden;
    color: var(--k-text-primary, #eef4ff);
    font-size: 0.92rem;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-list-row__identity em {
    overflow: hidden;
    max-width: 18rem;
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), transparent 8%);
    font-size: 0.78rem;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-list-row__pill {
    display: inline-flex;
    align-items: center;
    min-height: 1.45rem;
    padding: 0 0.62rem;
    border: 1px solid rgba(105, 236, 193, 0.22);
    border-radius: 6px;
    color: #88f0bb;
    background: rgba(105, 236, 193, 0.08);
    font-size: 0.72rem;
    font-weight: 850;
  }

  .project-gate-list-row__pill[data-tone='info'] {
    color: #7bb7ff;
    border-color: rgba(96, 165, 250, 0.24);
    background: rgba(96, 165, 250, 0.08);
  }

  .project-gate-list-row__pill[data-tone='warning'] {
    color: #f1c96f;
    border-color: rgba(241, 201, 111, 0.26);
    background: rgba(241, 201, 111, 0.08);
  }

  .project-gate-list-row__pill[data-tone='muted'] {
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), white 8%);
    border-color: rgba(120, 151, 193, 0.2);
    background: rgba(120, 151, 193, 0.06);
  }

  .project-gate-list-row__widget-list {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
    flex-wrap: wrap;
  }

  .project-gate-list-row__widget-chip {
    display: inline-grid;
    grid-template-columns: 1rem minmax(0, 1fr) 1rem 1rem;
    align-items: center;
    gap: 0.3rem;
    max-width: 15rem;
    min-height: 1.7rem;
    padding: 0 0.38rem;
    border: 1px solid rgba(120, 151, 193, 0.18);
    border-radius: 6px;
    color: var(--k-text-secondary, #b8c6d8);
    background: rgba(5, 11, 20, 0.2);
  }

  .project-gate-list-row__widget-chip > span:nth-child(2) {
    overflow: hidden;
    color: var(--k-text-primary, #eef4ff);
    font-size: 0.72rem;
    font-weight: 780;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-list-row__widget-icon {
    display: inline-grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), white 8%);
  }

  .project-gate-list-row__widget-icon--source {
    color: var(--gate-widget-tone);
  }

  .project-gate-list-row__widget-icon--scope {
    border-radius: 999px;
    background: rgba(120, 151, 193, 0.06);
  }

  .project-gate-list-row__widget-icon--scope[data-scope='contextual'] {
    color: var(--gate-widget-tone);
    background: rgb(var(--gate-widget-tone-rgb) / 0.08);
  }

  .project-gate-list-row__widget-icon :global(svg) {
    width: 0.82rem;
    height: 0.82rem;
  }

  .project-gate-list-row__widget-more,
  .project-gate-list-row__muted {
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), transparent 4%);
    font-size: 0.72rem;
    font-weight: 800;
  }

  .project-gate-list-row__widget-typology {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    flex-wrap: wrap;
  }

  .project-gate-list-row__widget-typology > span {
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    min-height: 1.55rem;
    padding: 0 0.48rem;
    border: 1px solid rgba(120, 151, 193, 0.18);
    border-radius: 999px;
    color: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), white 2%);
    background: rgba(5, 11, 20, 0.18);
    font-size: 0.7rem;
    font-weight: 820;
  }

  .project-gate-list-row__widget-typology :global(svg) {
    width: 0.82rem;
    height: 0.82rem;
  }

  .project-gate-list-row__actions {
    overflow: visible !important;
    position: relative;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    white-space: nowrap;
  }

  .project-gate-list-row__menu-wrap {
    position: relative;
    display: inline-flex;
  }

  .project-gate-list-row__menu {
    position: absolute;
    right: 0;
    z-index: 40;
    min-width: 12rem;
    display: grid;
    gap: 0.18rem;
    padding: 0.5rem;
    border: 1px solid rgba(120, 151, 193, 0.24);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(16, 28, 43, 0.96), rgba(7, 13, 23, 0.94)),
      rgba(5, 11, 20, 0.94);
    box-shadow:
      0 1.4rem 3rem rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .project-gate-list-row__menu[data-placement='bottom'] {
    top: calc(100% + 0.55rem);
  }

  .project-gate-list-row__menu[data-placement='top'] {
    bottom: calc(100% + 0.55rem);
  }

  .project-gate-list-row__menu button {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.55rem;
    padding: 0.34rem;
    border: 0;
    border-radius: 6px;
    color: var(--k-text-secondary, #b8c6d8);
    text-align: left;
    background: transparent;
    cursor: pointer;
  }

  .project-gate-list-row__menu button:hover,
  .project-gate-list-row__menu button:focus-visible {
    color: var(--k-text-primary, #eef4ff);
    background: rgba(96, 165, 250, 0.08);
    outline: none;
  }

  .project-gate-list-row__menu button[data-danger='true'] {
    color: #ff8a8a;
  }

  .project-gate-list-row__menu button :global(svg) {
    width: 0.92rem;
    height: 0.92rem;
  }

  .project-gate-list-row:hover {
    background: rgba(96, 165, 250, 0.035);
  }
</style>
