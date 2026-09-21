<script lang="ts">
  import { tick } from 'svelte';
  import type {
    WorkbenchDashboardEntry,
    WorkbenchLaunchAdmissionBlocker,
    WorkbenchLaunchAdmissionIssue,
    WorkbenchLibraryItem,
    WorkbenchLibrarySourceDescriptor
  } from '@konitif/workbench';

  export let title: string;
  export let subtitle: string;
  export let recentEntries: WorkbenchDashboardEntry[] = [];
  export let presetEntries: WorkbenchDashboardEntry[] = [];
  export let newExperienceLabel = 'New experience';
  export let newExperienceDescription = 'Start from an empty workspace.';
  export let canCreateEmptyExperience = true;
  export let librarySources: WorkbenchLibrarySourceDescriptor[] = [];
  export let libraryItems: WorkbenchLibraryItem[] = [];
  export let newExperienceDetail = 'Not persisted across reloads.';
  export let labels = {
    brand: 'WORKBENCH',
    libraryEyebrow: 'Explore',
    libraryTitle: 'Available library',
    libraryDescription: 'Browse locally available tools, widgets, and resources without selecting or activating them.',
    libraryRemoteUnavailable: 'No remote registry is configured.',
    importShared: 'Import shared preset…',
    recentEyebrow: 'Continue',
    recentTitle: 'Recent experiences',
    recentEmptyTitle: 'No recent experience detected',
    recentEmptyDescription: 'Cards appear only when a real saved experience is available.',
    resumeExperience: 'Resume experience',
    presetEyebrow: 'Start',
    presetTitle: 'Presets',
    isolatedSession: 'Isolated session',
    toolsTitle: 'Tools',
    widgetsTitle: 'Widgets',
    seeAllTools: 'See all tools',
    seeAllWidgets: 'See all widgets',
    showFewerTools: 'Show fewer tools',
    showFewerWidgets: 'Show fewer widgets',
    libraryLoading: 'Loading the local catalog…',
    detailEyebrow: 'Library item',
    detailSource: 'Source',
    detailIdentifier: 'Identifier',
    detailClose: 'Close details',
    detailPrevious: 'Previous item',
    detailNext: 'Next item',
    detailLocalVersion: 'Local version',
    detailPublishedVersion: 'Published package version',
    detailHostApplicationVersion: 'Host application version',
    detailPublicationUnavailable: 'Not verifiable',
    detailSynchronizationMismatch: 'Local and published package versions differ',
    detailSynchronizationUnavailable: 'Synchronization unavailable',
    detailSynchronize: 'Synchronize',
    detailVersionUnknown: 'Not specified',
    detailShareTitle: 'Share resource',
    detailShareReference: 'Copy reference',
    detailShareCopied: 'Reference copied',
    detailShareUnavailable: 'Phone sharing unavailable',
    detailDescriptionTab: 'Description',
    detailTechnicalTab: 'Technical',
    detailDiagramTab: 'Functional diagram',
    detailDependencies: 'Package dependencies',
    detailDependencyPackage: 'Package',
    detailDependencyConstraint: 'Constraint',
    detailDependencyScope: 'Scope',
    detailDiagramSource: 'Diagram source',
    detailNoDependencies: 'No package dependency is declared.',
    admissionEyebrow: 'Dependency admission',
    admissionClose: 'Back to dashboard',
    admissionRequiredVersion: 'Required version',
    admissionAvailableVersions: 'Available versions',
    admissionUnavailable: 'Acquisition unavailable',
    openingExperience: 'Opening…',
    importingShared: 'Importing…',
    detailIllustrationUnavailable: 'Preview not available',
    libraryViewMenu: 'Library display',
    libraryViewList: 'List',
    libraryViewGrid: 'Grid',
    librarySizeSmall: 'Small',
    librarySizeMedium: 'Medium',
    libraryShow: 'Show Explorer',
    libraryHide: 'Hide Explorer'
  };
  export let libraryInitiallyExpanded = false;
  let libraryWidth = 0;
  let expandedLibraryCategories = { tool: false, widget: false };
  let selectedLibraryItem: WorkbenchLibraryItem | null = null;
  let selectedLibrarySource: WorkbenchLibrarySourceDescriptor | null = null;
  let libraryDetailTrigger: HTMLButtonElement | null = null;
  let libraryDetailCloseButton: HTMLButtonElement | null = null;
  let libraryDetailDialog: HTMLElement | null = null;
  let launchActionTrigger: HTMLButtonElement | null = null;
  let admissionCloseButton: HTMLButtonElement | null = null;
  let admissionDialog: HTMLElement | null = null;
  let admissionWasOpen = false;
  let acquiringAdmissionIssueId: string | null = null;
  let admissionActionStatus = '';
  let isImportingShared = false;
  let isLibraryViewMenuOpen = false;
  let libraryLayout: 'list' | 'grid' = 'grid';
  let librarySize: 'small' | 'medium' = 'small';
  let libraryViewMenuButton: HTMLButtonElement | null = null;
  let libraryViewMenu: HTMLElement | null = null;
  let isLibraryExpanded = libraryInitiallyExpanded;
  let shareStatus = '';
  let isSharing = false;
  type LibraryDetailTab = 'description' | 'technical' | 'diagram';
  let activeLibraryDetailTab: LibraryDetailTab = 'description';
  $: libraryColumnCount = libraryLayout === 'list'
    ? (libraryWidth >= 860 ? 2 : 1)
    : librarySize === 'medium'
      ? (libraryWidth >= 1160 ? 4 : libraryWidth >= 860 ? 3 : libraryWidth >= 560 ? 2 : 1)
      : (libraryWidth >= 1160 ? 5 : libraryWidth >= 880 ? 4 : libraryWidth >= 640 ? 3 : libraryWidth >= 420 ? 2 : 1);
  $: libraryCompactCapacity = libraryColumnCount * 2;
  $: toolItems = libraryItems.filter(item => item.kind === 'tool');
  $: widgetItems = libraryItems.filter(item => item.kind === 'widget');
  $: visibleToolItems = compactLibraryItems(toolItems, expandedLibraryCategories.tool, libraryCompactCapacity);
  $: visibleWidgetItems = compactLibraryItems(widgetItems, expandedLibraryCategories.widget, libraryCompactCapacity);
  $: selectedLibrarySource = selectedLibraryItem
    ? librarySources.find(source => source.id === selectedLibraryItem?.sourceId) ?? null
    : null;
  $: selectedCategoryItems = selectedLibraryItem
    ? libraryItems.filter(item => item.kind === selectedLibraryItem?.kind)
    : [];
  $: selectedLibraryItemIndex = selectedLibraryItem
    ? selectedCategoryItems.findIndex(item => item.id === selectedLibraryItem?.id)
    : -1;
  $: canNavigateLibraryPrevious = selectedLibraryItemIndex > 0;
  $: canNavigateLibraryNext = selectedLibraryItemIndex >= 0 && selectedLibraryItemIndex < selectedCategoryItems.length - 1;
  $: hasPublishedVersionMismatch = Boolean(
    selectedLibraryItem?.versions?.published?.status === 'verified' &&
    selectedLibraryItem.versions.published.version &&
    selectedLibraryItem.versions.local &&
    selectedLibraryItem.versions.published.version !== selectedLibraryItem.versions.local
  );
  $: libraryDetailTabs = selectedLibraryItem
    ? [
        { id: 'description' as const, label: labels.detailDescriptionTab },
        { id: 'technical' as const, label: labels.detailTechnicalTab },
        ...(selectedLibraryItem.details?.diagram
          ? [{ id: 'diagram' as const, label: labels.detailDiagramTab }]
          : [])
      ]
    : [];
  export let busy = false;
  export let busyEntryId: string | null = null;
  export let libraryLoading = false;
  export let error: string | null = null;
  export let admissionBlocker: WorkbenchLaunchAdmissionBlocker | null = null;
  export let onSelectEntry: (entry: WorkbenchDashboardEntry) => void | Promise<void> = () => undefined;
  export let onCreateEmpty: () => void | Promise<void> = () => undefined;
  export let onImportShared: (() => void | Promise<void>) | null = null;
  export let onAcquireAdmissionIssue: ((issue: WorkbenchLaunchAdmissionIssue) => Promise<'resolved' | 'unavailable'>) | null = null;
  export let onRetryAdmission: (() => void | Promise<void>) | null = null;
  export let onSynchronizeLibraryItem: ((item: WorkbenchLibraryItem) => void | Promise<void>) | null = null;
  $: if (admissionBlocker && !admissionWasOpen) {
    admissionWasOpen = true;
    void tick().then(() => admissionCloseButton?.focus());
  } else if (!admissionBlocker && admissionWasOpen) {
    admissionWasOpen = false;
  }

  function compactLibraryItems(items: WorkbenchLibraryItem[], expanded: boolean, capacity: number): WorkbenchLibraryItem[] {
    if (expanded || items.length <= capacity) return items;
    return items.slice(0, Math.max(0, capacity - 1));
  }

  function toggleLibraryCategory(kind: 'tool' | 'widget') {
    expandedLibraryCategories = { ...expandedLibraryCategories, [kind]: !expandedLibraryCategories[kind] };
  }

  function toggleLibraryExpanded() {
    isLibraryExpanded = !isLibraryExpanded;
  }

  function selectLibraryLayout(layout: 'list' | 'grid') {
    libraryLayout = layout;
  }

  function selectLibrarySize(size: 'small' | 'medium') {
    librarySize = size;
  }

  async function toggleLibraryViewMenu() {
    isLibraryViewMenuOpen = !isLibraryViewMenuOpen;
    await tick();
    if (isLibraryViewMenuOpen) libraryViewMenu?.querySelector<HTMLButtonElement>('button')?.focus();
    else libraryViewMenuButton?.focus();
  }

  async function closeLibraryViewMenu() {
    if (!isLibraryViewMenuOpen) return;
    isLibraryViewMenuOpen = false;
    await tick();
    libraryViewMenuButton?.focus();
  }

  async function openLibraryItem(item: WorkbenchLibraryItem, event: MouseEvent) {
    libraryDetailTrigger = event.currentTarget as HTMLButtonElement;
    selectedLibraryItem = item;
    activeLibraryDetailTab = 'description';
    shareStatus = '';
    await tick();
    libraryDetailCloseButton?.focus();
  }

  async function closeLibraryItem() {
    if (!selectedLibraryItem) return;
    const trigger = libraryDetailTrigger;
    selectedLibraryItem = null;
    shareStatus = '';
    libraryDetailTrigger = null;
    await tick();
    trigger?.focus();
  }

  function navigateLibraryItem(direction: -1 | 1) {
    if (!selectedLibraryItem) return;
    const nextIndex = selectedLibraryItemIndex + direction;
    if (nextIndex < 0 || nextIndex >= selectedCategoryItems.length) return;
    selectedLibraryItem = selectedCategoryItems[nextIndex] ?? selectedLibraryItem;
    activeLibraryDetailTab = 'description';
  }

  async function selectLibraryDetailTab(tab: LibraryDetailTab, focus = false) {
    activeLibraryDetailTab = tab;
    await tick();
    if (focus) libraryDetailDialog?.querySelector<HTMLButtonElement>(`[data-library-detail-tab="${tab}"]`)?.focus();
  }

  function navigateLibraryDetailTabs(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement
      ? event.target
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (target?.getAttribute('role') !== 'tab') return false;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
    event.preventDefault();
    const currentIndex = libraryDetailTabs.findIndex(tab => tab.id === activeLibraryDetailTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? libraryDetailTabs.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % libraryDetailTabs.length
          : (currentIndex - 1 + libraryDetailTabs.length) % libraryDetailTabs.length;
    const tab = libraryDetailTabs[nextIndex];
    if (tab) void selectLibraryDetailTab(tab.id, true);
    return true;
  }

  function diagramNodeLabel(item: WorkbenchLibraryItem, nodeId: string) {
    return item.details?.diagram?.nodes.find(node => node.id === nodeId)?.label ?? nodeId;
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) void closeLibraryItem();
  }

  async function selectDashboardEntry(entry: WorkbenchDashboardEntry, event: MouseEvent) {
    launchActionTrigger = event.currentTarget as HTMLButtonElement;
    await onSelectEntry(entry);
  }

  async function createEmptyExperience(event: MouseEvent) {
    launchActionTrigger = event.currentTarget as HTMLButtonElement;
    await onCreateEmpty();
  }

  async function importSharedPreset() {
    if (!onImportShared || isImportingShared) return;
    isImportingShared = true;
    await waitForVisibleUpdate();
    try {
      await onImportShared();
    } finally {
      isImportingShared = false;
    }
  }

  async function shareSelectedLibraryItem() {
    if (!selectedLibraryItem?.share || isSharing) return;
    isSharing = true;
    shareStatus = '';
    await waitForVisibleUpdate();
    try {
      await copyText(selectedLibraryItem.share.reference);
      shareStatus = labels.detailShareCopied;
    } catch {
      shareStatus = labels.detailShareUnavailable;
    } finally {
      isSharing = false;
    }
  }

  async function copyText(value: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.hidden = true;
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard unavailable.');
  }

  async function synchronizeSelectedLibraryItem() {
    if (!selectedLibraryItem || !onSynchronizeLibraryItem) return;
    await onSynchronizeLibraryItem(selectedLibraryItem);
  }

  async function waitForVisibleUpdate() {
    await tick();
    await new Promise<void>(resolve => {
      if (typeof requestAnimationFrame !== 'function') {
        setTimeout(resolve, 0);
        return;
      }
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        resolve();
      };
      requestAnimationFrame(finish);
      setTimeout(finish, 32);
    });
  }

  async function closeAdmissionBlocker() {
    const trigger = launchActionTrigger;
    admissionBlocker = null;
    acquiringAdmissionIssueId = null;
    admissionActionStatus = '';
    await tick();
    trigger?.focus();
  }

  async function acquireAdmissionIssue(issue: WorkbenchLaunchAdmissionIssue) {
    if (!onAcquireAdmissionIssue || issue.acquisition.status !== 'available' || acquiringAdmissionIssueId) return;
    acquiringAdmissionIssueId = issue.id;
    admissionActionStatus = issue.acquisition.actionLabel ?? 'Resolving dependency…';
    const result = await onAcquireAdmissionIssue(issue);
    if (result === 'resolved') await onRetryAdmission?.();
    acquiringAdmissionIssueId = null;
    admissionActionStatus = result === 'unavailable' ? (issue.acquisition.reason ?? labels.admissionUnavailable) : '';
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (admissionBlocker) {
      if (event.key === 'Escape') {
        event.preventDefault();
        void closeAdmissionBlocker();
        return;
      }
      if (event.key === 'Tab' && admissionDialog) {
        const focusable = Array.from(admissionDialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        if (focusable.length === 0) return;
        event.preventDefault();
        const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
          : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
        focusable[nextIndex]?.focus();
      }
      return;
    }
    if (isLibraryViewMenuOpen && event.key === 'Escape') {
      event.preventDefault();
      void closeLibraryViewMenu();
      return;
    }
    if (!selectedLibraryItem) return;
    if (navigateLibraryDetailTabs(event)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeLibraryItem();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateLibraryItem(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateLibraryItem(1);
      return;
    }
    if (event.key === 'Tab' && libraryDetailDialog) {
      const focusable = Array.from(
        libraryDetailDialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
      );
      if (focusable.length === 0) return;
      event.preventDefault();
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      focusable[nextIndex]?.focus();
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<main class="launch-dashboard" aria-labelledby="launch-dashboard-title">
  <header class="launch-dashboard__header">
    <span class="launch-dashboard__brand">{labels.brand}</span>
    <h1 id="launch-dashboard-title">{title}</h1>
    <p>{subtitle}</p>
  </header>

  {#if error}
    <div class="launch-dashboard__error" role="alert">{error}</div>
  {/if}

  <section class="launch-dashboard__section" data-dashboard-section="presets" aria-labelledby="launch-dashboard-presets">
    <div class="launch-dashboard__section-heading">
      <div>
        <span>{labels.presetEyebrow}</span>
        <h2 id="launch-dashboard-presets">{labels.presetTitle}</h2>
      </div>
      <div class="launch-dashboard__section-actions">
        <small>{presetEntries.length + (canCreateEmptyExperience ? 1 : 0) + 1}</small>
        {#if onImportShared}<button type="button" data-testid="dashboard-import-shared" disabled={busy || isImportingShared} aria-busy={isImportingShared} on:click={() => void importSharedPreset()}>{isImportingShared ? labels.importingShared : labels.importShared}</button>{/if}
      </div>
    </div>
    <div class="launch-dashboard__masonry launch-dashboard__masonry--experiences">
      {#each presetEntries as entry (entry.id)}
        <article class="launch-card launch-card--preset">
          {#if entry.preview}
            <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
              {#if entry.preview.kind === 'image' && entry.preview.src}
                <img src={entry.preview.src} alt={entry.preview.alt ?? entry.preview.label} />
              {:else}
                <div class="layout-preview layout-preview--preset" aria-hidden="true">
                  <span class="layout-preview__rail"></span>
                  <span class="layout-preview__main"></span>
                  <span class="layout-preview__side"></span>
                  <span class="layout-preview__timeline"></span>
                </div>
                <small>{entry.preview.label}</small>
              {/if}
            </div>
          {/if}
          <div class="launch-card__copy">
            <span>{entry.eyebrow}</span>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
            {#if entry.detail}<small>{entry.detail}</small>{/if}
          </div>
          <button type="button" data-testid={`dashboard-open-${entry.id}`} disabled={busy} aria-busy={busy && busyEntryId === entry.id} on:click={(event) => selectDashboardEntry(entry, event)}>
            {busy && busyEntryId === entry.id ? labels.openingExperience : entry.actionLabel}
          </button>
        </article>
      {/each}

      {#if canCreateEmptyExperience}
        <article class="launch-card launch-card--new" data-dashboard-create-card>
          <div class="launch-card__new-mark" aria-hidden="true">+</div>
          <div class="launch-card__copy">
            <span>{labels.isolatedSession}</span>
            <h3>{newExperienceLabel}</h3>
            <p>{newExperienceDescription}</p>
            <small>{newExperienceDetail}</small>
          </div>
          <button type="button" data-testid="dashboard-create-empty" disabled={busy} aria-busy={busy && busyEntryId === 'new-empty-workspace'} on:click={createEmptyExperience}>
            {busy && busyEntryId === 'new-empty-workspace' ? labels.openingExperience : newExperienceLabel}
          </button>
        </article>
      {/if}

      {#if recentEntries.length > 0}
        {#each recentEntries as entry (entry.id)}
          <article class="launch-card launch-card--recent" data-dashboard-resume-card>
            {#if entry.preview}
              <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
                {#if entry.preview.kind === 'image' && entry.preview.src}
                  <img src={entry.preview.src} alt={entry.preview.alt ?? entry.preview.label} />
                {:else}
                  <div class="layout-preview" aria-hidden="true">
                    <span class="layout-preview__rail"></span>
                    <span class="layout-preview__main"></span>
                    <span class="layout-preview__side"></span>
                    <span class="layout-preview__timeline"></span>
                  </div>
                  <small>{entry.preview.label}</small>
                {/if}
              </div>
            {/if}
            <div class="launch-card__copy">
              <span>{entry.eyebrow}</span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              {#if entry.detail}<small>{entry.detail}</small>{/if}
            </div>
            <button type="button" data-testid={`dashboard-open-${entry.id}`} disabled={busy} aria-busy={busy && busyEntryId === entry.id} on:click={(event) => selectDashboardEntry(entry, event)}>
              {busy && busyEntryId === entry.id ? labels.openingExperience : entry.actionLabel}
            </button>
          </article>
        {/each}
      {:else}
        <article class="launch-card launch-card--recent launch-card--unavailable" data-dashboard-resume-card>
          <div class="launch-card__copy">
            <span>{labels.recentEyebrow}</span>
            <h3>{labels.recentEmptyTitle}</h3>
            <p>{labels.recentEmptyDescription}</p>
          </div>
          <button type="button" data-testid="dashboard-resume-unavailable" disabled title={labels.recentEmptyDescription}>
            {labels.resumeExperience}
          </button>
        </article>
      {/if}
    </div>
  </section>

  <div class="launch-dashboard__library-divider">
    <button
      class="launch-dashboard__library-toggle"
      type="button"
      data-testid="dashboard-library-toggle"
      aria-expanded={isLibraryExpanded}
      aria-controls="launch-dashboard-library-section"
      aria-label={isLibraryExpanded ? labels.libraryHide : labels.libraryShow}
      title={isLibraryExpanded ? labels.libraryHide : labels.libraryShow}
      on:click={toggleLibraryExpanded}
    >
      <span aria-hidden="true">{isLibraryExpanded ? '×' : '⚙'}</span>
    </button>
  </div>

  {#if isLibraryExpanded}
  <section id="launch-dashboard-library-section" class="launch-dashboard__section launch-dashboard__library" data-dashboard-section="library" aria-labelledby="launch-dashboard-library" bind:clientWidth={libraryWidth}>
    <div class="launch-dashboard__section-heading">
      <div>
        <span>{labels.libraryEyebrow}</span>
        <h2 id="launch-dashboard-library">{labels.libraryTitle}</h2>
      </div>
      <div class="launch-dashboard__library-view-anchor">
        <small>{libraryItems.length}</small>
        <button class="launch-dashboard__library-view-button" type="button" data-testid="dashboard-library-view-menu" title={labels.libraryViewMenu} aria-label={labels.libraryViewMenu} aria-expanded={isLibraryViewMenuOpen} bind:this={libraryViewMenuButton} on:click={() => void toggleLibraryViewMenu()}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="5" height="5" rx="1"/><rect x="9.5" y="2" width="5" height="5" rx="1"/><rect x="1.5" y="9" width="5" height="5" rx="1"/><rect x="9.5" y="9" width="5" height="5" rx="1"/></svg>
        </button>
        {#if isLibraryViewMenuOpen}
          <div class="launch-dashboard__library-view-menu" role="menu" aria-label={labels.libraryViewMenu} bind:this={libraryViewMenu}>
            <span>Disposition</span>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-view-list" aria-checked={libraryLayout === 'list'} on:click={() => selectLibraryLayout('list')}>{labels.libraryViewList}</button>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-view-grid" aria-checked={libraryLayout === 'grid'} on:click={() => selectLibraryLayout('grid')}>{labels.libraryViewGrid}</button>
            <span>Taille</span>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-size-small" aria-checked={librarySize === 'small'} on:click={() => selectLibrarySize('small')}>{labels.librarySizeSmall}</button>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-size-medium" aria-checked={librarySize === 'medium'} on:click={() => selectLibrarySize('medium')}>{labels.librarySizeMedium}</button>
          </div>
        {/if}
      </div>
    </div>
    <p class="launch-dashboard__library-description">{labels.libraryDescription}</p>
    <div class="launch-dashboard__library-sources">
      {#each librarySources as source (source.id)}
        <span data-source-status={source.status}>{source.label}</span>
      {/each}
    </div>
    {#if libraryLoading}
      <p class="launch-dashboard__library-loading" role="status">{labels.libraryLoading}</p>
    {/if}
    <div class="launch-dashboard__library-category" data-library-category="tools">
      <div class="launch-dashboard__category-heading">
        <h3>{labels.toolsTitle}</h3>
        {#if expandedLibraryCategories.tool && toolItems.length > libraryCompactCapacity}
          <button type="button" on:click={() => toggleLibraryCategory('tool')}>{labels.showFewerTools}</button>
        {/if}
      </div>
      <div class:launch-dashboard__library-items--list={libraryLayout === 'list'} class:launch-dashboard__library-items--grid={libraryLayout === 'grid'} class:launch-dashboard__library-items--small={librarySize === 'small'} class:launch-dashboard__library-items--medium={librarySize === 'medium'} class="launch-dashboard__library-items">
        {#each visibleToolItems as item (item.id)}
          <button class="launch-dashboard__library-item" type="button" data-testid={`dashboard-library-${item.kind}-${item.id}`} aria-haspopup="dialog" on:click={(event) => openLibraryItem(item, event)}>
            <span class="launch-dashboard__library-thumbnail">
              {#if item.illustration}<img src={item.illustration.src} alt={item.illustration.alt} />{:else}<small>{labels.detailIllustrationUnavailable}</small>{/if}
            </span>
            <span>{item.kind}</span><strong>{item.title}</strong><small>{item.description}</small>
          </button>
        {/each}
        {#if !expandedLibraryCategories.tool && toolItems.length > libraryCompactCapacity}
          <button class="launch-dashboard__more-tile" type="button" data-testid="dashboard-library-tools-more" aria-label={labels.seeAllTools} on:click={() => toggleLibraryCategory('tool')}>
            <strong aria-hidden="true">…</strong><small>{labels.seeAllTools}</small>
          </button>
        {/if}
      </div>
    </div>
    <div class="launch-dashboard__library-category" data-library-category="widgets">
      <div class="launch-dashboard__category-heading">
        <h3>{labels.widgetsTitle}</h3>
        {#if expandedLibraryCategories.widget && widgetItems.length > libraryCompactCapacity}
          <button type="button" on:click={() => toggleLibraryCategory('widget')}>{labels.showFewerWidgets}</button>
        {/if}
      </div>
      <div class:launch-dashboard__library-items--list={libraryLayout === 'list'} class:launch-dashboard__library-items--grid={libraryLayout === 'grid'} class:launch-dashboard__library-items--small={librarySize === 'small'} class:launch-dashboard__library-items--medium={librarySize === 'medium'} class="launch-dashboard__library-items">
        {#each visibleWidgetItems as item (item.id)}
          <button class="launch-dashboard__library-item" type="button" data-testid={`dashboard-library-${item.kind}-${item.id}`} aria-haspopup="dialog" on:click={(event) => openLibraryItem(item, event)}>
            <span class="launch-dashboard__library-thumbnail">
              {#if item.illustration}<img src={item.illustration.src} alt={item.illustration.alt} />{:else}<small>{labels.detailIllustrationUnavailable}</small>{/if}
            </span>
            <span>{item.kind}</span><strong>{item.title}</strong><small>{item.description}</small>
          </button>
        {/each}
        {#if !expandedLibraryCategories.widget && widgetItems.length > libraryCompactCapacity}
          <button class="launch-dashboard__more-tile" type="button" data-testid="dashboard-library-widgets-more" aria-label={labels.seeAllWidgets} on:click={() => toggleLibraryCategory('widget')}>
            <strong aria-hidden="true">…</strong><small>{labels.seeAllWidgets}</small>
          </button>
        {/if}
      </div>
    </div>
    {#if librarySources.some(source => source.kind === 'remote' && source.status === 'not-configured')}
      <small>{labels.libraryRemoteUnavailable}</small>
    {/if}
  </section>
  {/if}

</main>

{#if selectedLibraryItem}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="launch-dashboard__detail-overlay" on:click={handleOverlayClick}>
    <section
      class="launch-dashboard__detail-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-dashboard-library-detail-title"
      bind:this={libraryDetailDialog}
    >
      <button class="launch-dashboard__detail-close" type="button" data-testid="dashboard-library-detail-close" aria-label={labels.detailClose} bind:this={libraryDetailCloseButton} on:click={() => void closeLibraryItem()}><span aria-hidden="true">×</span></button>
      <button class="launch-dashboard__detail-arrow" type="button" data-testid="dashboard-library-detail-previous" aria-label={labels.detailPrevious} disabled={!canNavigateLibraryPrevious} on:click={() => navigateLibraryItem(-1)}>←</button>
      <div class="launch-dashboard__detail-content">
        <div class="launch-dashboard__detail-product">
          <div class="launch-dashboard__detail-media-column">
            <div class="launch-dashboard__detail-illustration">
              {#if selectedLibraryItem.illustration}
                <img src={selectedLibraryItem.illustration.src} alt={selectedLibraryItem.illustration.alt} />
              {:else}
                <span>{selectedLibraryItem.kind}</span>
                <small>{labels.detailIllustrationUnavailable}</small>
              {/if}
            </div>
            <div class="launch-dashboard__detail-share">
              <strong>{labels.detailShareTitle}</strong>
              {#if selectedLibraryItem.share}
                <button type="button" data-testid="dashboard-library-share-reference" disabled={isSharing} aria-busy={isSharing} on:click={() => void shareSelectedLibraryItem()}>{labels.detailShareReference}</button>
                <small>{selectedLibraryItem.share.limitation}</small>
                {#if shareStatus}<span role="status" aria-live="polite">{shareStatus}</span>{/if}
              {:else}
                <small>{labels.detailShareUnavailable}</small>
              {/if}
            </div>
          </div>
          <div class="launch-dashboard__detail-copy">
            <span>{labels.brand} · {labels.detailEyebrow}</span>
            <h2 id="launch-dashboard-library-detail-title">{selectedLibraryItem.title}</h2>
            <p>{selectedLibraryItem.description}</p>
            <div class="launch-dashboard__detail-tabs" role="tablist" aria-label={selectedLibraryItem.title}>
              {#each libraryDetailTabs as tab}
                <button
                  type="button"
                  role="tab"
                  data-library-detail-tab={tab.id}
                  aria-selected={activeLibraryDetailTab === tab.id}
                  aria-controls={`launch-dashboard-library-detail-panel-${tab.id}`}
                  tabindex={activeLibraryDetailTab === tab.id ? 0 : -1}
                  on:click={() => void selectLibraryDetailTab(tab.id)}
                >{tab.label}</button>
              {/each}
            </div>
            {#if activeLibraryDetailTab === 'description'}
              <div class="launch-dashboard__detail-panel" id="launch-dashboard-library-detail-panel-description" role="tabpanel" data-testid="dashboard-library-detail-description">
                <p>{selectedLibraryItem.details?.description ?? selectedLibraryItem.description}</p>
              </div>
            {:else if activeLibraryDetailTab === 'technical'}
              <div class="launch-dashboard__detail-panel" id="launch-dashboard-library-detail-panel-technical" role="tabpanel" data-testid="dashboard-library-detail-technical">
                <dl>
                  <div><dt>{labels.detailIdentifier}</dt><dd>{selectedLibraryItem.id}</dd></div>
                  <div><dt>{labels.detailSource}</dt><dd>{selectedLibrarySource?.label ?? selectedLibraryItem.sourceId}</dd></div>
                  <div><dt>Type</dt><dd>{selectedLibraryItem.kind}</dd></div>
                  <div><dt>{labels.detailLocalVersion}</dt><dd>{selectedLibraryItem.versions?.local ?? labels.detailVersionUnknown}</dd></div>
                  {#if selectedLibraryItem.versions?.localProvenance}
                    <div><dt>Provenance</dt><dd>{selectedLibraryItem.versions.localProvenance}</dd></div>
                  {/if}
                  {#if selectedLibraryItem.versions?.published}
                    <div>
                      <dt>{labels.detailPublishedVersion}</dt>
                      <dd>
                        {selectedLibraryItem.versions.published.version ?? labels.detailPublicationUnavailable}
                        {#if selectedLibraryItem.versions.published.publisher} · {selectedLibraryItem.versions.published.publisher}{/if}
                        {#if selectedLibraryItem.versions.published.reason}<small>{selectedLibraryItem.versions.published.reason}</small>{/if}
                      </dd>
                    </div>
                  {/if}
                  {#if selectedLibraryItem.versions?.hostApplication}
                    <div><dt>{labels.detailHostApplicationVersion}</dt><dd>{selectedLibraryItem.versions.hostApplication.label} · {selectedLibraryItem.versions.hostApplication.version}</dd></div>
                  {/if}
                </dl>
                <h3>{labels.detailDependencies}</h3>
                {#if selectedLibraryItem.details?.dependencies?.length}
                  <div class="launch-dashboard__dependency-table-wrap">
                    <table>
                      <thead><tr><th>{labels.detailDependencyPackage}</th><th>{labels.detailDependencyConstraint}</th><th>{labels.detailDependencyScope}</th></tr></thead>
                      <tbody>
                        {#each selectedLibraryItem.details.dependencies as dependency}
                          <tr data-dependency-family={dependency.family}>
                            <td>{#if dependency.sourceUrl}<a href={dependency.sourceUrl} target="_blank" rel="noreferrer">{dependency.packageName}</a>{:else}{dependency.packageName}{/if}</td>
                            <td><code>{dependency.versionRange}</code></td>
                            <td>{dependency.scope}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {:else}
                  <p>{labels.detailNoDependencies}</p>
                {/if}
                {#if hasPublishedVersionMismatch && selectedLibraryItem.versions?.published}
                  <div class="launch-dashboard__version-mismatch" data-testid="dashboard-library-version-mismatch">
                    <span>{selectedLibraryItem.versions.local}</span>
                    <span class="launch-dashboard__version-connector" aria-hidden="true"></span>
                    <button type="button" aria-label={labels.detailSynchronizationMismatch}>⚠</button>
                    <span class="launch-dashboard__version-connector" aria-hidden="true"></span>
                    <span>{selectedLibraryItem.versions.published.version}</span>
                    <div class="launch-dashboard__version-sync-action">
                      {#if selectedLibraryItem.versions.published.acquisition.status === 'available' && onSynchronizeLibraryItem}
                        <button type="button" data-testid="dashboard-library-synchronize" on:click={() => void synchronizeSelectedLibraryItem()}>{labels.detailSynchronize}</button>
                      {:else}
                        <small>{labels.detailSynchronizationUnavailable} · {selectedLibraryItem.versions.published.acquisition.reason}</small>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {:else if selectedLibraryItem.details?.diagram}
              <div class="launch-dashboard__detail-panel" id="launch-dashboard-library-detail-panel-diagram" role="tabpanel" data-testid="dashboard-library-detail-diagram">
                <div class="launch-dashboard__diagram-heading">
                  <div><h3>{selectedLibraryItem.details.diagram.title}</h3><p>{selectedLibraryItem.details.diagram.summary}</p></div>
                  <small>{labels.detailDiagramSource} · {selectedLibraryItem.details.diagram.sourcePackage}</small>
                </div>
                <ol class="launch-dashboard__diagram-flow">
                  {#each selectedLibraryItem.details.diagram.nodes as node}
                    <li data-diagram-tone={node.tone ?? 'neutral'}>
                      <strong>{node.label}</strong>
                      <span>{node.description}</span>
                    </li>
                  {/each}
                </ol>
                <ul class="launch-dashboard__diagram-edges" aria-label="Relations">
                  {#each selectedLibraryItem.details.diagram.edges as edge}
                    <li>{diagramNodeLabel(selectedLibraryItem, edge.from)} <span aria-hidden="true">→</span> {diagramNodeLabel(selectedLibraryItem, edge.to)}</li>
                  {/each}
                </ul>
                <p class="launch-dashboard__diagram-caption">{selectedLibraryItem.details.diagram.caption}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
      <button class="launch-dashboard__detail-arrow" type="button" data-testid="dashboard-library-detail-next" aria-label={labels.detailNext} disabled={!canNavigateLibraryNext} on:click={() => navigateLibraryItem(1)}>→</button>
    </section>
  </div>
{/if}

{#if admissionBlocker}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="launch-dashboard__detail-overlay">
    <section
      class="launch-dashboard__admission-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-dashboard-admission-title"
      bind:this={admissionDialog}
    >
      <div class="launch-dashboard__detail-heading">
        <div>
          <span>{labels.brand} · {labels.admissionEyebrow}</span>
          <h2 id="launch-dashboard-admission-title">{admissionBlocker.title}</h2>
        </div>
        <button type="button" data-testid="dashboard-admission-close" bind:this={admissionCloseButton} on:click={() => void closeAdmissionBlocker()}>{labels.admissionClose}</button>
      </div>
      <p>{admissionBlocker.description}</p>
      <div class="launch-dashboard__admission-issues">
        {#each admissionBlocker.issues as issue (issue.id)}
          <article>
            <h3>{issue.title}</h3>
            <p>{issue.description}</p>
            {#if issue.requiredVersion}<small>{labels.admissionRequiredVersion} · {issue.requiredVersion}</small>{/if}
            {#if issue.availableVersions?.length}<small>{labels.admissionAvailableVersions} · {issue.availableVersions.join(', ')}</small>{/if}
            {#if issue.acquisition.status === 'available' && onAcquireAdmissionIssue}
              <button type="button" data-testid={`dashboard-admission-acquire-${issue.id}`} disabled={Boolean(acquiringAdmissionIssueId)} aria-busy={acquiringAdmissionIssueId === issue.id} on:click={() => void acquireAdmissionIssue(issue)}>
                {acquiringAdmissionIssueId === issue.id ? admissionActionStatus : issue.acquisition.actionLabel}
              </button>
            {:else}
              <small>{labels.admissionUnavailable} · {issue.acquisition.reason}</small>
            {/if}
          </article>
        {/each}
      </div>
      {#if admissionActionStatus}<p role="status" aria-live="polite">{admissionActionStatus}</p>{/if}
    </section>
  </div>
{/if}

<style>
  .launch-dashboard {
    --dashboard-accent: var(--color-action-primary, var(--k-color-accent, #7ca2f8));
    --dashboard-violet: var(--color-layer-motion, var(--k-entity-repository, #aa8bf0));
    width: 100%;
    height: 100dvh;
    box-sizing: border-box;
    display: grid;
    align-content: start;
    gap: 28px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: clamp(24px, 5vw, 64px);
    color: var(--color-text-primary, var(--workbench-text-primary, #edf3fb));
    background:
      radial-gradient(circle at 12% 5%, color-mix(in srgb, var(--dashboard-accent) 12%, transparent), transparent 30rem),
      radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--dashboard-violet) 10%, transparent), transparent 28rem),
      var(--workbench-launch-background, var(--color-background-canvas, #0d1117));
  }

  .launch-dashboard__header,
  .launch-dashboard__section,
  .launch-dashboard__error {
    width: min(1440px, 100%);
    margin: 0 auto;
  }

  .launch-dashboard__header { display: grid; gap: 8px; }
  .launch-dashboard__brand,
  .launch-dashboard__section-heading span,
  .launch-card__copy > span {
    color: var(--dashboard-accent);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }
  .launch-dashboard__header h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4.2rem); letter-spacing: -0.05em; }
  .launch-dashboard__header p { max-width: 42rem; margin: 0; color: var(--workbench-text-secondary, #aebdd0); font-size: 1.02rem; }
  .launch-dashboard__error { padding: 12px 14px; border: 1px solid #d7755f; border-radius: 10px; background: rgba(98, 35, 26, 0.78); }
  .launch-dashboard__section { display: grid; gap: 14px; }
  .launch-dashboard__section-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
  .launch-dashboard__section-heading h2 { margin: 3px 0 0; font-size: 1.15rem; }
  .launch-dashboard__section-heading small { color: var(--workbench-text-muted, #8292a8); font-weight: 800; }
  .launch-dashboard__section-actions { display: flex; align-items: center; gap: 9px; }
  .launch-dashboard__section-actions button { padding: 6px 9px; border: 1px solid rgba(135, 159, 188, 0.28); border-radius: 7px; color: inherit; background: rgba(135, 159, 188, 0.08); cursor: pointer; }
  .launch-dashboard__masonry { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .launch-card {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 16px;
    min-width: 0;
    padding: 13px;
    border: 1px solid var(--color-border-subtle, #252d3a);
    border-radius: var(--radius-large, 0.75rem);
    background: var(--color-background-surface, #141922);
    box-shadow: var(--shadow-elevation-low, 0 8px 24px rgba(4, 8, 14, 0.26));
  }
  .launch-card--recent { border-color: rgba(105, 236, 193, 0.3); }
  .launch-card--unavailable { opacity: 0.72; }
  .launch-card--preset { border-color: rgba(176, 132, 255, 0.3); }
  .launch-card--preset .launch-card__copy > span { color: var(--dashboard-violet); }
  .launch-card__preview { display: grid; gap: 8px; }
  .launch-card__preview img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; }
  .launch-card__preview small,
  .launch-card__copy small { color: var(--workbench-text-muted, #8394aa); }
  .layout-preview {
    height: 92px;
    display: grid;
    grid-template: "rail main side" 1fr "rail timeline timeline" 0.35fr / 0.18fr 1fr 0.38fr;
    gap: 5px;
    padding: 8px;
    border: 1px solid rgba(105, 236, 193, 0.16);
    border-radius: 10px;
    background: #080d14;
    transform: perspective(500px) rotateX(2deg) rotateY(-2deg);
  }
  .layout-preview span { border: 1px solid rgba(105, 236, 193, 0.2); border-radius: 4px; background: rgba(105, 236, 193, 0.08); }
  .layout-preview--preset span { border-color: rgba(176, 132, 255, 0.25); background: rgba(176, 132, 255, 0.08); }
  .layout-preview__rail { grid-area: rail; }
  .layout-preview__main { grid-area: main; }
  .layout-preview__side { grid-area: side; }
  .layout-preview__timeline { grid-area: timeline; }
  .launch-card__copy { display: grid; gap: 6px; }
  .launch-card__copy h3, .launch-card__copy p { margin: 0; }
  .launch-card__copy h3 { font-size: 1.3rem; }
  .launch-card__copy p { color: var(--workbench-text-secondary, #aebdd0); line-height: 1.5; }
  .launch-card button {
    width: 100%;
    height: 42px;
    display: grid;
    place-items: center;
    justify-self: stretch;
    padding: 0 13px;
    border: 1px solid color-mix(in srgb, var(--dashboard-accent) 55%, transparent);
    border-radius: var(--radius-medium, 0.5rem);
    color: inherit;
    background: color-mix(in srgb, var(--dashboard-accent) 16%, transparent);
    font: inherit;
    font-weight: 750;
    line-height: 1.15;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
  }
  .launch-card button:hover:not(:disabled) { border-color: var(--color-action-primary-hover, var(--dashboard-accent)); background: color-mix(in srgb, var(--dashboard-accent) 24%, transparent); transform: translateY(-1px); }
  .launch-card button:focus-visible { border-color: var(--color-border-focus, var(--dashboard-accent)); outline: 2px solid var(--color-focus-ring, var(--dashboard-accent)); outline-offset: 2px; }
  .launch-card button:active:not(:disabled) { background: var(--color-background-pressed, #263143); transform: translateY(1px); }
  .launch-card button:disabled { opacity: 0.55; cursor: not-allowed; }
  .launch-card button[aria-busy='true'] { cursor: progress; }
  .launch-card__new-mark { width: 42px; height: 42px; display: grid; place-items: center; border: 1px dashed rgba(105, 236, 193, 0.5); border-radius: 50%; color: var(--dashboard-accent); font-size: 1.6rem; }
  .launch-dashboard__library-divider { position: relative; width: min(1440px, 100%); height: 18px; margin: -4px auto 0; border-top: 1px solid rgba(135, 159, 188, 0.28); }
  .launch-dashboard__library-toggle { position: absolute; top: -1px; right: 0; width: 44px; height: 30px; display: grid; place-items: center; padding: 0; border: 1px solid var(--color-border-subtle, #252d3a); border-top-color: var(--dashboard-accent); border-radius: 0 0 var(--radius-medium, 0.5rem) var(--radius-medium, 0.5rem); color: inherit; background: var(--color-background-surface, #141922); cursor: pointer; transition: color 120ms ease, background 120ms ease, transform 120ms ease; }
  .launch-dashboard__library-toggle:hover { color: var(--dashboard-accent); background: rgba(105, 236, 193, 0.12); }
  .launch-dashboard__library-toggle:active { transform: translateY(1px); background: rgba(105, 236, 193, 0.2); }
  .launch-dashboard__library-toggle:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__library-description { margin: -6px 0 0; color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__library-view-anchor { position: relative; display: flex; align-items: center; gap: 8px; }
  .launch-dashboard__library-view-button { width: 32px; height: 32px; display: grid; place-items: center; padding: 7px; border: 1px solid rgba(135, 159, 188, 0.28); border-radius: 7px; color: inherit; background: rgba(135, 159, 188, 0.08); cursor: pointer; }
  .launch-dashboard__library-view-button svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.2; }
  .launch-dashboard__library-view-menu { position: absolute; top: calc(100% + 7px); right: 0; z-index: 20; min-width: 170px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 9px; border: 1px solid var(--color-border-subtle, #252d3a); border-radius: var(--radius-medium, 0.5rem); background: var(--color-background-elevated, #191f29); box-shadow: var(--shadow-popover, 0 18px 48px rgba(4, 8, 14, 0.52)); }
  .launch-dashboard__library-view-menu > span { grid-column: 1 / -1; color: var(--workbench-text-muted, #8292a8); font-size: .68rem; text-transform: uppercase; }
  .launch-dashboard__library-view-menu button { padding: 7px 8px; border: 1px solid rgba(135, 159, 188, 0.2); border-radius: 6px; color: inherit; background: transparent; cursor: pointer; }
  .launch-dashboard__library-view-menu button[aria-checked='true'] { border-color: var(--dashboard-accent); background: rgba(105,236,193,.12); }
  .launch-dashboard__library-loading { margin: 0; color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__library-sources { display: flex; flex-wrap: wrap; gap: 8px; }
  .launch-dashboard__library-sources span { padding: 5px 8px; border: 1px solid rgba(135, 159, 188, 0.24); border-radius: 999px; font-size: 0.72rem; }
  .launch-dashboard__library-sources [data-source-status='not-configured'] { opacity: 0.58; }
  .launch-dashboard__library-category { display: grid; gap: 8px; }
  .launch-dashboard__category-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .launch-dashboard__category-heading h3 { margin: 0; font-size: 0.95rem; }
  .launch-dashboard__category-heading button { border: 0; color: var(--dashboard-accent); background: transparent; cursor: pointer; text-decoration: underline; }
  .launch-dashboard__library-items { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
  .launch-dashboard__library-items--list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .launch-dashboard__library-items--grid.launch-dashboard__library-items--medium { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .launch-dashboard__library-item,
  .launch-dashboard__more-tile { min-width: 0; display: grid; gap: 4px; padding: 10px; border: 1px solid rgba(135, 159, 188, 0.16); border-radius: 9px; color: inherit; background: rgba(8, 14, 22, 0.55); text-align: left; }
  .launch-dashboard__library-item { grid-template-columns: 54px minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); align-items: start; column-gap: 10px; font: inherit; cursor: pointer; }
  .launch-dashboard__library-item:hover,
  .launch-dashboard__library-item:focus-visible { border-color: rgba(105, 236, 193, 0.58); outline: none; background: rgba(105, 236, 193, 0.08); }
  .launch-dashboard__library-item > span:not(.launch-dashboard__library-thumbnail), .launch-dashboard__library-item > strong, .launch-dashboard__library-item > small { grid-column: 2; }
  .launch-dashboard__library-item span { color: var(--dashboard-accent); font-size: 0.65rem; text-transform: uppercase; }
  .launch-dashboard__library-thumbnail { grid-column: 1; grid-row: 1 / 4; width: 54px; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden; border: 1px solid rgba(135, 159, 188, 0.14); border-radius: 6px; color: var(--workbench-text-muted, #8292a8); background: linear-gradient(145deg, rgba(105, 236, 193, 0.06), rgba(176, 132, 255, 0.06)); }
  .launch-dashboard__library-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
  .launch-dashboard__library-thumbnail small { color: inherit; font-size: 0.68rem; text-transform: none; }
  .launch-dashboard__library-items--medium .launch-dashboard__library-item { grid-template-columns: 1fr; grid-template-rows: auto; }
  .launch-dashboard__library-items--medium .launch-dashboard__library-thumbnail { grid-column: 1; grid-row: auto; width: 100%; aspect-ratio: 4 / 3; }
  .launch-dashboard__library-items--medium .launch-dashboard__library-item > span:not(.launch-dashboard__library-thumbnail),
  .launch-dashboard__library-items--medium .launch-dashboard__library-item > strong,
  .launch-dashboard__library-items--medium .launch-dashboard__library-item > small { grid-column: 1; }
  .launch-dashboard__more-tile { place-content: center; cursor: pointer; text-align: center; }
  .launch-dashboard__more-tile strong { color: var(--dashboard-accent); font-size: 1.6rem; line-height: 1; }
  .launch-dashboard__more-tile small { color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__detail-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: clamp(12px, 2vw, 28px);
    background: var(--color-background-overlay, rgba(6, 9, 14, 0.72));
    backdrop-filter: blur(7px);
  }
  .launch-dashboard__detail-dialog {
    position: relative;
    width: min(1480px, 100%);
    height: min(900px, calc(100dvh - clamp(24px, 4vw, 56px)));
    min-height: min(620px, calc(100dvh - clamp(24px, 4vw, 56px)));
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    grid-template-rows: minmax(0, 1fr);
    align-items: center;
    gap: clamp(12px, 1.5vw, 22px);
    overflow: visible;
    padding: clamp(20px, 2.4vw, 36px);
    border: 1px solid color-mix(in srgb, var(--color-border-focus, var(--dashboard-accent)) 48%, var(--color-border-subtle, #252d3a));
    border-radius: var(--radius-large, 0.75rem);
    color: var(--color-text-primary, var(--workbench-text-primary, #edf3fb));
    background: var(--color-background-elevated, #191f29);
    box-shadow: var(--shadow-overlay, 0 22px 70px rgba(4, 8, 14, 0.56));
  }
  .launch-dashboard__detail-content { min-width: 0; min-height: 0; height: 100%; display: grid; align-content: start; gap: 20px; overflow: auto; scrollbar-gutter: stable; }
  .launch-dashboard__detail-product { min-width: 0; display: grid; grid-template-columns: minmax(240px, 0.32fr) minmax(0, 1fr); align-items: start; gap: clamp(32px, 4vw, 64px); }
  .launch-dashboard__detail-media-column { display: grid; gap: 12px; }
  .launch-dashboard__detail-illustration { width: 100%; aspect-ratio: 1 / 1; display: grid; place-items: center; align-content: center; gap: 8px; overflow: hidden; border: 1px solid rgba(105, 236, 193, 0.2); border-radius: 12px; color: var(--workbench-text-muted, #8292a8); background: linear-gradient(145deg, rgba(105, 236, 193, 0.08), rgba(176, 132, 255, 0.08)); }
  .launch-dashboard__detail-illustration img { width: 100%; height: 100%; object-fit: cover; }
  .launch-dashboard__detail-illustration > span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  .launch-dashboard__detail-share { display: grid; gap: 7px; padding: 10px; border: 1px solid rgba(135, 159, 188, 0.16); border-radius: 9px; background: rgba(8, 14, 22, 0.45); }
  .launch-dashboard__detail-share strong { font-size: 0.78rem; }
  .launch-dashboard__detail-share small, .launch-dashboard__detail-share span { color: var(--workbench-text-muted, #8292a8); font-size: 0.7rem; line-height: 1.35; }
  .launch-dashboard__detail-share button { padding: 7px 9px; border: 1px solid rgba(105, 236, 193, 0.35); border-radius: 7px; color: inherit; background: rgba(105, 236, 193, 0.08); cursor: pointer; }
  .launch-dashboard__detail-share button:hover:not(:disabled) { border-color: var(--dashboard-accent); background: rgba(105, 236, 193, 0.16); }
  .launch-dashboard__detail-share button:active:not(:disabled) { transform: translateY(1px); background: rgba(105, 236, 193, 0.24); }
  .launch-dashboard__detail-share button:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-copy { min-width: 0; display: grid; gap: 16px; }
  .launch-dashboard__detail-copy > span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
  .launch-dashboard__detail-copy h2 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
  .launch-dashboard__detail-copy > p { margin: 0; color: var(--workbench-text-secondary, #aebdd0); line-height: 1.6; }
  .launch-dashboard__detail-tabs { display: flex; gap: 5px; overflow-x: auto; border-bottom: 1px solid rgba(135, 159, 188, 0.2); }
  .launch-dashboard__detail-tabs button { flex: none; padding: 9px 12px; border: 0; border-bottom: 2px solid transparent; color: var(--workbench-text-muted, #8292a8); background: transparent; cursor: pointer; }
  .launch-dashboard__detail-tabs button[aria-selected="true"] { border-bottom-color: var(--dashboard-accent); color: var(--workbench-text-primary, #edf3fb); background: rgba(105, 236, 193, 0.07); }
  .launch-dashboard__detail-tabs button:hover { color: var(--workbench-text-primary, #edf3fb); background: rgba(135, 159, 188, 0.08); }
  .launch-dashboard__detail-tabs button:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: -2px; }
  .launch-dashboard__detail-panel { min-width: 0; display: grid; gap: 14px; }
  .launch-dashboard__detail-panel > p { margin: 0; color: var(--workbench-text-secondary, #aebdd0); line-height: 1.65; }
  .launch-dashboard__detail-panel h3 { margin: 4px 0 0; font-size: 0.92rem; }
  .launch-dashboard__dependency-table-wrap { max-width: 100%; overflow-x: auto; }
  .launch-dashboard__dependency-table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
  .launch-dashboard__dependency-table-wrap th, .launch-dashboard__dependency-table-wrap td { padding: 8px; border-bottom: 1px solid rgba(135, 159, 188, 0.16); text-align: left; vertical-align: top; }
  .launch-dashboard__dependency-table-wrap th { color: var(--workbench-text-muted, #8292a8); font-weight: 600; }
  .launch-dashboard__dependency-table-wrap code { color: var(--dashboard-accent); }
  .launch-dashboard__diagram-heading { display: flex; justify-content: space-between; gap: 20px; }
  .launch-dashboard__diagram-heading h3, .launch-dashboard__diagram-heading p { margin: 0; }
  .launch-dashboard__diagram-heading p, .launch-dashboard__diagram-heading small { color: var(--workbench-text-muted, #8292a8); line-height: 1.45; }
  .launch-dashboard__diagram-heading small { flex: none; }
  .launch-dashboard__diagram-flow { display: flex; align-items: stretch; gap: 18px; margin: 0; padding: 0; overflow-x: auto; list-style: none; }
  .launch-dashboard__diagram-flow li { position: relative; flex: 0 0 150px; display: grid; align-content: start; gap: 6px; padding: 11px; border: 1px solid rgba(135, 159, 188, 0.2); border-radius: 9px; background: rgba(8, 14, 22, 0.46); }
  .launch-dashboard__diagram-flow li[data-diagram-tone="projection"] { border-color: rgba(105, 236, 193, 0.38); }
  .launch-dashboard__diagram-flow li[data-diagram-tone="runtime"] { border-color: rgba(176, 132, 255, 0.42); }
  .launch-dashboard__diagram-flow li[data-diagram-tone="observation"] { border-color: rgba(92, 173, 255, 0.42); }
  .launch-dashboard__diagram-flow span { color: var(--workbench-text-muted, #8292a8); font-size: 0.72rem; line-height: 1.4; }
  .launch-dashboard__diagram-edges { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .launch-dashboard__diagram-edges li { padding: 5px 8px; border-radius: 999px; color: var(--workbench-text-secondary, #aebdd0); background: rgba(135, 159, 188, 0.08); font-size: 0.7rem; }
  .launch-dashboard__diagram-edges span { color: var(--dashboard-accent); }
  .launch-dashboard__diagram-caption { padding-left: 10px; border-left: 2px solid var(--dashboard-accent); font-size: 0.78rem; }
  .launch-dashboard__detail-close { position: absolute; top: -15px; right: -15px; z-index: 3; width: 38px; height: 32px; display: grid; place-items: center; padding: 0; border: 1px solid rgba(105, 236, 193, 0.45); border-radius: 7px; color: inherit; background: rgba(18, 29, 42, 0.98); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42); font-size: 1.25rem; cursor: pointer; transition: border-color 120ms ease, background 120ms ease, transform 120ms ease; }
  .launch-dashboard__detail-close:hover { border-color: var(--dashboard-accent); background: rgba(105, 236, 193, 0.16); }
  .launch-dashboard__detail-close:active { transform: translateY(1px) scale(0.97); background: rgba(105, 236, 193, 0.24); }
  .launch-dashboard__detail-close:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-arrow { width: 42px; height: 42px; border: 1px solid rgba(105, 236, 193, 0.35); border-radius: 999px; color: inherit; background: rgba(105, 236, 193, 0.08); font-size: 1.2rem; cursor: pointer; }
  .launch-dashboard__detail-arrow:hover:not(:disabled) { border-color: var(--dashboard-accent); background: rgba(105, 236, 193, 0.18); }
  .launch-dashboard__detail-arrow:active:not(:disabled) { transform: translateY(1px) scale(0.96); background: rgba(105, 236, 193, 0.26); }
  .launch-dashboard__detail-arrow:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-arrow:disabled { opacity: 0.32; cursor: not-allowed; border-color: rgba(135, 159, 188, 0.18); background: rgba(135, 159, 188, 0.04); }
  .launch-dashboard__detail-heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
  .launch-dashboard__detail-heading span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
  .launch-dashboard__detail-heading h2 { margin: 6px 0 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
  .launch-dashboard__detail-heading button { flex: none; padding: 8px 11px; border: 1px solid rgba(105, 236, 193, 0.4); border-radius: 8px; color: inherit; background: rgba(105, 236, 193, 0.1); cursor: pointer; }
  .launch-dashboard__detail-heading button:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-dialog dl { display: grid; gap: 8px; margin: 0; }
  .launch-dashboard__detail-dialog dl div { display: grid; grid-template-columns: minmax(90px, 0.35fr) 1fr; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(135, 159, 188, 0.16); }
  .launch-dashboard__detail-dialog dt { color: var(--workbench-text-muted, #8292a8); }
  .launch-dashboard__detail-dialog dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
  .launch-dashboard__detail-dialog dd small { display: block; margin-top: 4px; color: var(--workbench-text-muted, #8292a8); }
  .launch-dashboard__version-mismatch { position: relative; display: grid; grid-template-columns: auto minmax(18px, 1fr) 34px minmax(18px, 1fr) auto; align-items: center; gap: 5px; }
  .launch-dashboard__version-connector { height: 1px; background: rgba(234, 179, 80, 0.7); }
  .launch-dashboard__version-mismatch > button { width: 34px; height: 34px; padding: 0; border: 1px solid rgba(234, 179, 80, 0.75); border-radius: 50%; color: #f2c66d; background: rgba(234, 179, 80, 0.12); cursor: help; }
  .launch-dashboard__version-mismatch > button:focus-visible { outline: 2px solid #f2c66d; outline-offset: 2px; }
  .launch-dashboard__version-sync-action { position: absolute; right: calc(50% + 22px); bottom: calc(100% + 7px); display: none; max-width: 240px; padding: 8px; border: 1px solid rgba(234, 179, 80, 0.4); border-radius: 8px; background: #111b29; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
  .launch-dashboard__version-mismatch:hover .launch-dashboard__version-sync-action,
  .launch-dashboard__version-mismatch:focus-within .launch-dashboard__version-sync-action { display: block; }
  .launch-dashboard__version-sync-action button { padding: 7px 10px; border: 1px solid rgba(234, 179, 80, 0.55); border-radius: 7px; color: inherit; background: rgba(234, 179, 80, 0.12); cursor: pointer; }
  .launch-dashboard__admission-dialog { width: min(720px, 100%); max-height: min(760px, calc(100dvh - 48px)); box-sizing: border-box; display: grid; gap: 18px; overflow-y: auto; padding: clamp(20px, 4vw, 34px); border: 1px solid rgba(215, 117, 95, 0.52); border-radius: 18px; color: var(--workbench-text-primary, #edf3fb); background: linear-gradient(145deg, rgba(42, 30, 35, 0.98), rgba(10, 14, 22, 0.98)); box-shadow: 0 32px 90px rgba(0, 0, 0, 0.58); }
  .launch-dashboard__admission-dialog > p { margin: 0; color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__admission-issues { display: grid; gap: 10px; }
  .launch-dashboard__admission-issues article { display: grid; gap: 7px; padding: 13px; border: 1px solid rgba(215, 117, 95, 0.25); border-radius: 10px; background: rgba(8, 14, 22, 0.52); }
  .launch-dashboard__admission-issues h3, .launch-dashboard__admission-issues p { margin: 0; }
  .launch-dashboard__admission-issues p, .launch-dashboard__admission-issues small { color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__admission-issues button { justify-self: start; padding: 8px 11px; border: 1px solid rgba(105, 236, 193, 0.4); border-radius: 8px; color: inherit; background: rgba(105, 236, 193, 0.1); cursor: pointer; }
  @media (max-width: 1280px) { .launch-dashboard__masonry { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 1160px) { .launch-dashboard__library-items:not(.launch-dashboard__library-items--list) { grid-template-columns: repeat(4, minmax(0, 1fr)); } .launch-dashboard__library-items--medium:not(.launch-dashboard__library-items--list) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 880px) { .launch-dashboard__library-items:not(.launch-dashboard__library-items--list) { grid-template-columns: repeat(3, minmax(0, 1fr)); } .launch-dashboard__library-items--list { grid-template-columns: 1fr; } }
  @media (max-width: 760px) { .launch-dashboard__masonry, .launch-dashboard__library-items:not(.launch-dashboard__library-items--list) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .launch-dashboard { padding: 24px 18px; } .launch-dashboard__masonry, .launch-dashboard__library-items { grid-template-columns: 1fr; } }
  @media (max-width: 1100px) { .launch-dashboard__detail-product { grid-template-columns: minmax(200px, 0.3fr) minmax(0, 1fr); gap: 30px; } }
  @media (max-width: 900px) { .launch-dashboard__detail-dialog { grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0, 1fr) auto; } .launch-dashboard__detail-content { grid-column: 1 / -1; grid-row: 1; } .launch-dashboard__detail-arrow { grid-row: 2; justify-self: center; } .launch-dashboard__detail-product { grid-template-columns: minmax(170px, 0.28fr) minmax(0, 1fr); gap: 24px; } }
  @media (max-width: 700px) { .launch-dashboard__detail-close { top: 8px; right: 8px; } .launch-dashboard__detail-product { grid-template-columns: minmax(0, 1fr); padding-top: 42px; } .launch-dashboard__detail-illustration { width: min(280px, 100%); justify-self: center; } .launch-dashboard__diagram-heading { display: grid; gap: 7px; } }
  @media (max-width: 560px) { .launch-dashboard__detail-overlay { padding: 8px; } .launch-dashboard__detail-dialog { padding: 14px; border-radius: 10px; } }
  @media (prefers-reduced-motion: reduce) { .launch-card button, .launch-dashboard__detail-close { transition: none; } }
</style>
