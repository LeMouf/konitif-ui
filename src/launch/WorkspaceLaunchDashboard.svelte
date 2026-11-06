<script lang="ts">
  import { tick } from 'svelte';
  import {fade} from 'svelte/transition';
  import ExperienceTags from './ExperienceTags.svelte';
  import type {
    WorkbenchDashboardEntry,
    WorkbenchLaunchAdmissionBlocker,
    WorkbenchLaunchAdmissionIssue,
    WorkbenchLibraryItem,
    WorkbenchLibrarySourceDescriptor
  } from '@konitif/workbench';

  export let compact=true;
  let starterActionsOpen=false,experienceActionsOpen=false;
  let experienceSearch='';let visibleExperienceLimit=40;let savedListWidth=0;let recentDisplay:'cards'|'list'='cards';let tagFilter='';
  $: availableTags=[...new Set(recentEntries.flatMap(entry=>entry.tags??[]))].sort((a,b)=>a.localeCompare(b));
  $: if(tagFilter&&!availableTags.some(tag=>tag.toLocaleLowerCase()===tagFilter.toLocaleLowerCase()))tagFilter='';
  $: filteredRecentEntries=recentEntries.filter(entry=>(entry.title+' '+entry.description+' '+(entry.tags??[]).join(' ')).toLocaleLowerCase().includes(experienceSearch.trim().toLocaleLowerCase())&&(!tagFilter||(entry.tags??[]).some(tag=>tag.toLocaleLowerCase()===tagFilter.toLocaleLowerCase())));
  $: visibleRecentEntries=filteredRecentEntries.slice(0,visibleExperienceLimit);
  $: if(experienceSearch)visibleExperienceLimit=40;
  export let embedded=false;
  export let showIntro=true;
  export let showLibrary=true;
  export let title: string;
  export let subtitle: string;
  export let recentEntries: WorkbenchDashboardEntry[] = [];
  export let presetEntries: WorkbenchDashboardEntry[] = [];
  export let starterRowLimit = 0;
  export let showCreateOverlay=false;
  export let currentExperienceInStarters=false;
  export let currentExperience:WorkbenchDashboardEntry|null=null;
  export let showStarterChooser=false;
  export let onShowStarterChooser:()=>void=()=>{};
  export let onShowCurrentExperience:()=>void=()=>{};
  let carouselWidth=0,starterIndex=0;
  $: chooserVisible=showStarterChooser||!currentExperience;
  $: starterPageSize=Math.max(1,Math.floor((carouselWidth+8)/145));
  $: maxStarterIndex=Math.max(0,presetEntries.length-starterPageSize);
  $: if(starterIndex>maxStarterIndex)starterIndex=maxStarterIndex;
  function setCreateOverlayActive(event:Event,active:boolean){(event.currentTarget as HTMLElement).inert=!active;}
  function createFadeDuration(){return typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:160;}
  export let createInformationLabel='Enter details';
  function focusCreateOverlay(node:HTMLElement){const input=node.querySelector<HTMLInputElement>('input');input?.focus();input?.select();}
  let moreStarters = false;
  $: starterCapacity = Math.max(1, starterRowLimit);
  $: hasMoreStarters = !currentExperienceInStarters && starterRowLimit > 0 && presetEntries.length > starterCapacity;
  $: displayedStarters = currentExperienceInStarters ? presetEntries.slice(starterIndex,starterIndex+starterPageSize) : starterRowLimit > 0 ? presetEntries.slice(0,hasMoreStarters ? Math.max(0,starterCapacity-1) : starterCapacity) : presetEntries;

  export let newExperienceActionLabel = 'Create';
  $: creationClickLabel=currentExperienceInStarters?(chooserVisible&&!showCreateOverlay?'Retour':'Créer'):newExperienceActionLabel;
  function trackPrimaryHover(node:HTMLElement){
    function move(event:PointerEvent){const target=event.target instanceof Element?event.target:null;const control=target?.closest('button,input,select,textarea,a,[contenteditable="true"]');node.dataset.primaryHover=String(!control||control.classList.contains('resume-card-open'));}
    function leave(){delete node.dataset.primaryHover;}
    node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);
    return {destroy(){node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);}};
  }
  function releasePointerFocus(event:MouseEvent){if(event.detail===0)return;const button=event.currentTarget as HTMLButtonElement;button.blur();const card=button.closest('article');if(card){card.classList.add('ribbon-dismissed');card.addEventListener('pointerleave',()=>card.classList.remove('ribbon-dismissed'),{once:true});}}
  export let newExperienceLabel = 'New experience';
  export let newExperienceDescription = 'Start from an empty workspace.';
  export let canCreateEmptyExperience = true;
  export let librarySources: WorkbenchLibrarySourceDescriptor[] = [];
  export let libraryItems: WorkbenchLibraryItem[] = [];
  export let newExperienceDetail = 'Not persisted across reloads.';
  export let labels = {
    brand: 'WORKBENCH',
    currentExperience:'In use',
    searchExperiences:'Search experiences',
    noMatchingExperience:'No matching experience.',
    showMoreExperiences:'Show more',
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
  /** Host vocabulary customizes the shared surface without replacing its behavior. */
  export let labelOverrides: Partial<typeof labels> = {};
  $: viewLabels = {...labels,...labelOverrides};
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
        { id: 'description' as const, label: viewLabels.detailDescriptionTab },
        { id: 'technical' as const, label: viewLabels.detailTechnicalTab },
        ...(selectedLibraryItem.details?.diagram
          ? [{ id: 'diagram' as const, label: viewLabels.detailDiagramTab }]
          : [])
      ]
    : [];
  export let canEditEntry: (entry: WorkbenchDashboardEntry) => boolean = () => true;
  export let onSetEntryTags:((entry:WorkbenchDashboardEntry,tags:string[])=>void|Promise<void>)|null=null;
  export let onRenameEntry:((entry:WorkbenchDashboardEntry,name:string)=>void|Promise<void>)|null=null;
  let editingTitleId:string|null=null,titleDraft='',titleError='',titleSaving=false;
  function focusTitle(node:HTMLInputElement){node.focus();node.select();}
  function editTitle(entry:WorkbenchDashboardEntry){editingTitleId=entry.id;titleDraft=entry.title;titleError='';}
  async function commitTitle(entry:WorkbenchDashboardEntry){if(titleSaving||editingTitleId!==entry.id)return;const name=titleDraft.trim();if(!name){titleError='Le nom ne peut pas être vide.';return;}if(name===entry.title){editingTitleId=null;return;}titleSaving=true;titleError='';try{await onRenameEntry?.(entry,name);editingTitleId=null;}catch(cause){titleError=cause instanceof Error?cause.message:String(cause);}finally{titleSaving=false;}}
  function protectTitleEditing(_node:HTMLElement){
    let consumeClick=false;
    const pointer=(event:PointerEvent)=>{consumeClick=false;if(!editingTitleId)return;const target=event.target;if(target instanceof Element&&target.closest('.resume-title-editor'))return;consumeClick=true;event.preventDefault();event.stopImmediatePropagation();if(!titleSaving){editingTitleId=null;titleError='';}};
    const click=(event:MouseEvent)=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation();};
    document.addEventListener('pointerdown',pointer,true);document.addEventListener('click',click,true);
    return {destroy(){document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('click',click,true);}};
  }
  function titleKey(event:KeyboardEvent,entry:WorkbenchDashboardEntry){event.stopPropagation();if(event.key==='Escape'){event.preventDefault();if(!titleSaving)editingTitleId=null;}else if(event.key==='Enter'){event.preventDefault();void commitTitle(entry);}}
  export let canRemoveEntry: (entry: WorkbenchDashboardEntry) => boolean = () => true;
  export let removeConfirmationLabel = 'Supprimer cette expérience ?';
  export let onRemoveEntry: ((entry: WorkbenchDashboardEntry) => void | Promise<void>) | null = null;
  export let showExperienceDetail=false;
  export let onInspectEntry:((entry:WorkbenchDashboardEntry,view:'detail'|'volumes')=>void)|null=null;
  let inspectionTrigger:HTMLElement|null=null,inspectionScroll:{node:HTMLElement;top:number;left:number}[]=[],wasInspecting=false;
  function inspectEntry(entry:WorkbenchDashboardEntry,view:'detail'|'volumes',event:MouseEvent){
    const clicked=event.currentTarget as HTMLElement;inspectionTrigger=clicked.closest('.resume-menu')?clicked.closest('.launch-card')?.querySelector<HTMLElement>('.resume-more')??clicked:clicked;inspectionScroll=[];
    for(let node=inspectionTrigger.parentElement;node;node=node.parentElement)if(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth)inspectionScroll.push({node,top:node.scrollTop,left:node.scrollLeft});
    actionEntryId=null;confirmRemoveId=null;onInspectEntry?.(entry,view);
  }
  $: {if(wasInspecting&&!showExperienceDetail)void tick().then(()=>{inspectionTrigger?.focus({preventScroll:true});for(const item of inspectionScroll){item.node.scrollTop=item.top;item.node.scrollLeft=item.left;}});wasInspecting=showExperienceDetail;}
  export let canRunEntryAction: (entry: WorkbenchDashboardEntry, action: 'share' | 'save' | 'export' | 'close') => boolean = () => true;
  export let onSaveEntryAs: ((entry: WorkbenchDashboardEntry) => void) | null = null;
  export let onEntryAction: ((entry: WorkbenchDashboardEntry, action: 'share'|'save'|'export'|'close') => void | Promise<void>) | null = null;
  let actionAnchor:HTMLElement|null=null;
  function toggleEntryMenu(entry:WorkbenchDashboardEntry,event:MouseEvent){actionAnchor=event.currentTarget as HTMLElement;actionEntryId=actionEntryId===entry.id?null:entry.id;confirmRemoveId=null;}
  function floatingEntryMenu(node:HTMLElement,id:string){
    const anchor=actionAnchor;
    const position=()=>{if(!anchor)return;const r=anchor.getBoundingClientRect(),gap=6,pad=8;node.style.left=Math.max(pad,Math.min(r.right-node.offsetWidth,window.innerWidth-node.offsetWidth-pad))+'px';const below=r.bottom+gap;node.style.top=Math.max(pad,below+node.offsetHeight<=window.innerHeight-pad?below:r.top-node.offsetHeight-gap)+'px';};
    const dismiss=()=>{if(!node.matches(':popover-open')&&actionEntryId===id)actionEntryId=null;};
    node.showPopover();position();node.addEventListener('toggle',dismiss);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);const observer=new ResizeObserver(position);observer.observe(node);
    return {destroy(){observer.disconnect();node.removeEventListener('toggle',dismiss);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);}};
  }
  let actionEntryId: string | null = null;
  let confirmRemoveId: string | null = null;
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
    releasePointerFocus(event);
    launchActionTrigger = event.currentTarget as HTMLButtonElement;
    await onSelectEntry(entry);
  }

  async function createEmptyExperience(event: MouseEvent) {
    releasePointerFocus(event);
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
      shareStatus = viewLabels.detailShareCopied;
    } catch {
      shareStatus = viewLabels.detailShareUnavailable;
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
    admissionActionStatus = result === 'unavailable' ? (issue.acquisition.reason ?? viewLabels.admissionUnavailable) : '';
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

<main hidden={showExperienceDetail} inert={showExperienceDetail?true:undefined} use:protectTitleEditing class:launch-dashboard--creating={showCreateOverlay} class:launch-dashboard--renaming={editingTitleId!==null||titleSaving} class:launch-dashboard--busy={busy} aria-label={title} class="launch-dashboard" class:launch-dashboard--bounded={embedded&&!showIntro&&!showLibrary} class:launch-dashboard--embedded={embedded} class:launch-dashboard--compact={compact} aria-labelledby={showIntro?'launch-dashboard-title':undefined}>
  {#if showIntro}<header class="launch-dashboard__header">
    <span class="launch-dashboard__brand">{viewLabels.brand}</span>
    <h1 data-dashboard-context-title id="launch-dashboard-title">{title}</h1>
    <p>{subtitle}</p>
  </header>{/if}

  {#if error}
    <div class="launch-dashboard__error" role="alert">{error}</div>
  {/if}

  <section class="launch-dashboard__section" data-dashboard-section="presets" aria-labelledby="launch-dashboard-presets">
    <div class="launch-dashboard__section-heading section-heading--toggle" role="group">
      <div>
        <span>{viewLabels.presetEyebrow}</span>
        <h2 id="launch-dashboard-presets">{viewLabels.presetTitle} ({presetEntries.length + (!currentExperienceInStarters&&canCreateEmptyExperience ? 1 : 0)})</h2>
      </div>

      <div class="launch-dashboard__section-actions" class:section-actions-collapsed={!starterActionsOpen}>
        {#if currentExperienceInStarters}{#if currentExperience}<button class="starter-header-icon" type="button" title="En cours" aria-label="En cours" aria-pressed={!chooserVisible} on:click={onShowCurrentExperience}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4L15 10L7 16Z"/></svg></button>{/if}<button class="starter-header-icon" type="button" title="Points de départ" aria-label="Points de départ" aria-pressed={chooserVisible} on:click={onShowStarterChooser}><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="6" height="6"/><rect x="11" y="3" width="6" height="6"/><rect x="3" y="11" width="6" height="6"/><rect x="11" y="11" width="6" height="6"/></svg></button>{/if}
        {#if onImportShared}<button class="starter-header-icon" type="button" title={viewLabels.importShared} aria-label={viewLabels.importShared} data-testid="dashboard-import-shared" disabled={busy || isImportingShared} aria-busy={isImportingShared} on:click={() => void importSharedPreset()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2V12M6 8L10 12L14 8M3 12V17H17V12"/></svg></button>{/if}
      </div>
    <button type="button" class="section-actions-toggle" aria-label="Actions des points de départ" aria-expanded={starterActionsOpen} on:click={()=>starterActionsOpen=!starterActionsOpen}>…</button></div>
    <div class="starter-card-surface" class:starter-workflow={currentExperienceInStarters} style:--starter-count={(starterRowLimit||5)+(canCreateEmptyExperience?1:0)}>
    <div inert={showCreateOverlay||undefined} class="launch-dashboard__masonry launch-dashboard__masonry--starters" class:starter-row={starterRowLimit>0} style:--starter-count={(starterRowLimit||5)+(canCreateEmptyExperience?1:0)}>
      {#if canCreateEmptyExperience}
        <article class="launch-card launch-card--new" data-dashboard-create-card>
          <span class="launch-card__action-ribbon" aria-hidden="true">{creationClickLabel}</span>
          <div class="launch-card__new-mark" aria-hidden="true">{#if showCreateOverlay}<svg class="starter-form-icon" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8H15M9 12H15M9 16H13"/></svg>{:else if currentExperienceInStarters&&chooserVisible}<svg class="starter-form-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9H21M9 9V20M15 9V20"/></svg>{:else}+{/if}</div>
          <div class="launch-card__copy">
            <span>{viewLabels.isolatedSession}</span>
            <h3>{showCreateOverlay?createInformationLabel:currentExperienceInStarters&&chooserVisible?'Choisir un point de départ':newExperienceLabel}</h3>
            <p>{newExperienceDescription}</p>
            <small>{newExperienceDetail}</small>
          </div>
          <button type="button" class="starter-card-open" aria-label={creationClickLabel+' · '+(showCreateOverlay?createInformationLabel:chooserVisible?'Choisir un point de départ':newExperienceLabel)} data-testid="dashboard-create-empty" disabled={busy} aria-busy={busy && busyEntryId === 'new-empty-workspace'} on:click={createEmptyExperience}>
            {busy && busyEntryId === 'new-empty-workspace' ? viewLabels.openingExperience : newExperienceActionLabel}
          </button>
        </article>
      {/if}
      <div class="starter-carousel" class:carousel-concealed={currentExperienceInStarters&&(!chooserVisible||showCreateOverlay)} inert={currentExperienceInStarters&&!chooserVisible||undefined}>
      {#if currentExperienceInStarters}<button class="carousel-arrow" type="button" aria-label="Points de départ précédents" disabled={busy||starterIndex===0} on:click={()=>starterIndex=Math.max(0,starterIndex-starterPageSize)}>‹</button>{/if}
      <div class="starter-carousel-cards" bind:clientWidth={carouselWidth} style:--carousel-count={Math.max(1,displayedStarters.length)}>
      {#each displayedStarters as entry (entry.id)}
        <article class="launch-card launch-card--preset">
          <span class="launch-card__action-ribbon" aria-hidden="true">{entry.actionLabel}</span>
          {#if entry.preview}
            <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
              {#if entry.preview.src}
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
            <span>{entry.active?viewLabels.currentExperience:entry.eyebrow}</span>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
            {#if entry.detail}<small>{entry.detail}</small>{/if}
          </div>
          <button type="button" class="starter-card-open" aria-label={entry.actionLabel+' · '+entry.title} data-testid={`dashboard-open-${entry.id}`}  disabled={busy} aria-busy={busy && busyEntryId === entry.id} on:click={(event) => selectDashboardEntry(entry, event)}>
            {busy && busyEntryId === entry.id ? viewLabels.openingExperience : entry.actionLabel}
          </button>
        </article>
      {/each}
      </div>
      {#if currentExperienceInStarters}<button class="carousel-arrow" type="button" aria-label="Points de départ suivants" disabled={busy||starterIndex>=maxStarterIndex} on:click={()=>starterIndex=Math.min(maxStarterIndex,starterIndex+starterPageSize)}>›</button>{/if}
      </div>
      {#if hasMoreStarters}<article class="launch-card launch-card--preset starter-more"><button type="button" aria-label={viewLabels.showMoreExperiences} aria-expanded={moreStarters} on:click={()=>moreStarters=!moreStarters}>…</button></article>{/if}




    </div>
    {#if currentExperienceInStarters}<div class="starter-current-experience" class:current-concealed={chooserVisible||showCreateOverlay} inert={chooserVisible||showCreateOverlay||undefined}>{#each currentExperience?[currentExperience]:[] as entry (entry.id)}          <article use:trackPrimaryHover class="launch-card launch-card--recent" class:launch-card--active={entry.active} aria-current={entry.active?'true':undefined} data-dashboard-resume-card>
            <button type="button" class="resume-card-open" data-testid={`dashboard-open-${entry.id}`} disabled={busy} aria-label={`${entry.actionLabel} · ${entry.title}`} aria-busy={busy&&busyEntryId===entry.id} on:click={(event)=>selectDashboardEntry(entry,event)}></button>
            <span class="launch-card__action-ribbon" aria-hidden="true">{entry.actionLabel}</span>
            {#if entry.preview}
              <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
                {#if entry.preview.src}
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
            <div class="resume-content">
              <div class="resume-heading"><div class="launch-card__copy"><h3>{#if onRenameEntry && canEditEntry(entry)}{#if editingTitleId===entry.id}<span class="resume-title-editor"><input class="resume-title-input" use:focusTitle aria-label="Nom de l’expérience" aria-invalid={Boolean(titleError)} maxlength="80" bind:value={titleDraft} disabled={titleSaving} on:keydown={event=>titleKey(event,entry)} on:blur={event=>{if(!titleSaving&&!(event.relatedTarget instanceof Element&&event.relatedTarget.closest('.resume-title-editor'))){editingTitleId=null;titleError='';}}}/><button type="button" class="resume-title-action resume-title-cancel" aria-label="Annuler le renommage" title="Annuler" disabled={titleSaving} on:pointerdown|preventDefault on:click={()=>{editingTitleId=null;titleError='';}}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5L15 15M15 5L5 15"/></svg></button><button type="button" class="resume-title-action resume-title-confirm" aria-label="Valider le renommage" title="Valider" disabled={titleSaving} on:pointerdown|preventDefault on:click={()=>commitTitle(entry)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10L8 14L16 5"/></svg></button></span>{:else}<button type="button" class="resume-title-button" disabled={busy||titleSaving} aria-label={`Renommer ${entry.title}`} on:click={()=>editTitle(entry)}>{entry.title}</button>{/if}{:else}{entry.title}{/if}</h3>{#if editingTitleId===entry.id&&titleError}<small class="resume-title-error" role="alert">{titleError}</small>{/if}<p>{entry.description}</p></div><div class="resume-actions">
              {#if entry.active&&entry.canSave!==false&&onEntryAction&&canRunEntryAction(entry,'save')}<button type="button" disabled={busy} aria-label="Enregistrer l’état courant" title="Enregistrer l’état courant" on:click={()=>{void onEntryAction?.(entry,'save');}}>Enregistrer</button>{/if}
              {#if onInspectEntry || onEntryAction || onRemoveEntry}<button class="resume-more" type="button" aria-label={`Actions de ${entry.title}`} aria-expanded={actionEntryId===entry.id} on:click={event=>toggleEntryMenu(entry,event)}>…</button>{/if}
            </div>
</div>
              <div class="resume-middle"><div class="resume-tag-row">{#if entry.tags?.length}<ExperienceTags tags={entry.tags}/>{/if}</div></div>
              <div class="resume-footer">{#if entry.detail}<small class="resume-revision-date">{entry.detail}</small>{/if}<div class="resume-footer-actions">{#if onInspectEntry}<button type="button" class="experience-volume-info" aria-label={`Volumes de ${entry.title}`} title="Volumes et partage" on:click={event=>inspectEntry(entry,'volumes',event)}>ⓘ</button>{/if}{#if entry.version}<span class="resume-version-marker" aria-label={`Version ${entry.version}`}>{entry.version}</span>{/if}{#if onSetEntryTags && canEditEntry(entry)}<ExperienceTags buttonSize={32} showTags={false} tags={entry.tags??[]} onSave={tags=>onSetEntryTags?.(entry,tags)}/>{/if}</div></div>
            </div>
            {#if (onInspectEntry || onEntryAction || onRemoveEntry) && actionEntryId===entry.id}<div class="resume-menu" popover="auto" use:floatingEntryMenu={entry.id}>
              {#if confirmRemoveId===entry.id}<span>{removeConfirmationLabel}</span><button disabled={busy} on:click={()=>{actionEntryId=null;confirmRemoveId=null;void onRemoveEntry?.(entry);}}>Confirmer la suppression</button><button on:click={()=>{actionEntryId=null;confirmRemoveId=null;}}>Annuler</button>
              {:else}{#if onInspectEntry}<button disabled={busy} on:click={event=>inspectEntry(entry,'detail',event)}>Détail de l’expérience</button>{/if}{#if onEntryAction}
                {#if canRunEntryAction(entry,'share')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'share');}}>Partager l’expérience</button>{/if}
                {#if canRunEntryAction(entry,'save')}<button disabled={busy||!entry.active||entry.canSave===false} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'save');}}>Enregistrer la révision</button>{/if}
                {#if canRunEntryAction(entry,'export')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'export');}}>Exporter l’expérience</button>{/if}
                {#if entry.active&&canRunEntryAction(entry,'close')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'close');}}>Fermer l’expérience</button>{/if}
              {/if}{#if entry.active&&onSaveEntryAs}<button disabled={busy} on:click={()=>{actionEntryId=null;onSaveEntryAs?.(entry);}}>Enregistrer sous…</button>{/if}{#if onRemoveEntry&&canRemoveEntry(entry)}<button disabled={busy||entry.active} title={entry.active?'Fermez cette expérience avant de la supprimer':undefined} on:click={()=>confirmRemoveId=entry.id}>Supprimer</button>{/if}{/if}
            </div>{/if}

          </article>{/each}</div>{/if}
    {#if showCreateOverlay}<div class="starter-create-overlay" transition:fade={{duration:createFadeDuration()}} on:introstart={event=>setCreateOverlayActive(event,true)} on:outrostart={event=>setCreateOverlayActive(event,false)} role="region" aria-label="Créer une expérience" use:focusCreateOverlay><slot name="create-form"/></div>{/if}
    </div>
    {#if moreStarters&&hasMoreStarters}<div class="starter-overflow" aria-label={viewLabels.presetTitle}>{#each presetEntries.slice(displayedStarters.length) as entry (entry.id)}<button disabled={busy} on:click={(event)=>{moreStarters=false;void selectDashboardEntry(entry,event);}}>{entry.title}</button>{/each}<button on:click={()=>moreStarters=false}>×</button></div>{/if}
  </section>
  <section class="launch-dashboard__section saved-experiences-section" bind:clientWidth={savedListWidth} aria-label={viewLabels.recentTitle}><div class="launch-dashboard__section-heading section-heading--toggle" role="group"><div><h2>{viewLabels.recentTitle} ({recentEntries.length})</h2></div><div class="experience-list-controls" class:section-actions-collapsed={!experienceActionsOpen}><input type="search" aria-label={viewLabels.searchExperiences} placeholder={viewLabels.searchExperiences} bind:value={experienceSearch}/>{#if availableTags.length}<select class="experience-tag-filter" aria-label="Filtrer par tag" bind:value={tagFilter}><option value="">Tous les tags</option>{#each availableTags as tag (tag)}<option value={tag}>{tag}</option>{/each}</select>{/if}<div class="experience-display-toggle" role="group" aria-label="Affichage des expériences"><button type="button" aria-label="Afficher en cartes" title="Cartes" aria-pressed={recentDisplay==='cards'} on:click={()=>recentDisplay='cards'}><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="5" height="5"/><rect x="12" y="3" width="5" height="5"/><rect x="3" y="12" width="5" height="5"/><rect x="12" y="12" width="5" height="5"/></svg></button><button type="button" aria-label="Afficher en liste" title="Liste" aria-pressed={recentDisplay==='list'} on:click={()=>recentDisplay='list'}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4H17M3 10H17M3 16H17"/></svg></button></div></div><button type="button" class="section-actions-toggle" aria-label="Actions de mes expériences" aria-expanded={experienceActionsOpen} on:click={()=>experienceActionsOpen=!experienceActionsOpen}>…</button></div><div class="launch-dashboard__masonry launch-dashboard__masonry--saved" class:experiences-two-columns={recentDisplay==='cards'&&savedListWidth>=620}>
      {#if visibleRecentEntries.length > 0}
        {#each visibleRecentEntries as entry (entry.id)}
          {#if currentExperienceInStarters&&entry.id===currentExperience?.id}
          <article class="launch-card launch-card--recent launch-card--current-mirror" role="group" aria-current="true" aria-label={`${entry.title} · ${viewLabels.currentExperience}`} data-dashboard-resume-card>
            <span class="launch-card__action-ribbon" aria-hidden="true">{viewLabels.currentExperience}</span>
            {#if entry.preview}
              <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
                {#if entry.preview.src}
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
            <div class="resume-content">
              <div class="resume-heading"><div class="launch-card__copy"><h3>{entry.title}</h3><p>{entry.description}</p></div></div>
              <div class="resume-middle"><div class="resume-tag-row">{#if entry.tags?.length}<ExperienceTags tags={entry.tags}/>{/if}</div></div>
              <div class="resume-footer">{#if entry.detail}<small class="resume-revision-date">{entry.detail}</small>{/if}<div class="resume-footer-actions">{#if onInspectEntry}<button type="button" class="experience-volume-info" aria-label={`Volumes de ${entry.title}`} title="Volumes et partage" on:click={event=>inspectEntry(entry,'volumes',event)}>ⓘ</button>{/if}{#if entry.version}<span class="resume-version-marker" aria-label={`Version ${entry.version}`}>{entry.version}</span>{/if}</div></div>
            </div>
          </article>
          {:else}

          <article use:trackPrimaryHover class="launch-card launch-card--recent" class:launch-card--active={entry.active} aria-current={entry.active?'true':undefined} data-dashboard-resume-card>
            <button type="button" class="resume-card-open" data-testid={`dashboard-open-${entry.id}`} disabled={busy} aria-label={`${entry.actionLabel} · ${entry.title}`} aria-busy={busy&&busyEntryId===entry.id} on:click={(event)=>selectDashboardEntry(entry,event)}></button>
            <span class="launch-card__action-ribbon" aria-hidden="true">{entry.actionLabel}</span>
            {#if entry.preview}
              <div class="launch-card__preview" data-preview-kind={entry.preview.kind}>
                {#if entry.preview.src}
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
            <div class="resume-content">
              <div class="resume-heading"><div class="launch-card__copy"><h3>{#if onRenameEntry && canEditEntry(entry)}{#if editingTitleId===entry.id}<span class="resume-title-editor"><input class="resume-title-input" use:focusTitle aria-label="Nom de l’expérience" aria-invalid={Boolean(titleError)} maxlength="80" bind:value={titleDraft} disabled={titleSaving} on:keydown={event=>titleKey(event,entry)} on:blur={event=>{if(!titleSaving&&!(event.relatedTarget instanceof Element&&event.relatedTarget.closest('.resume-title-editor'))){editingTitleId=null;titleError='';}}}/><button type="button" class="resume-title-action resume-title-cancel" aria-label="Annuler le renommage" title="Annuler" disabled={titleSaving} on:pointerdown|preventDefault on:click={()=>{editingTitleId=null;titleError='';}}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5L15 15M15 5L5 15"/></svg></button><button type="button" class="resume-title-action resume-title-confirm" aria-label="Valider le renommage" title="Valider" disabled={titleSaving} on:pointerdown|preventDefault on:click={()=>commitTitle(entry)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10L8 14L16 5"/></svg></button></span>{:else}<button type="button" class="resume-title-button" disabled={busy||titleSaving} aria-label={`Renommer ${entry.title}`} on:click={()=>editTitle(entry)}>{entry.title}</button>{/if}{:else}{entry.title}{/if}</h3>{#if editingTitleId===entry.id&&titleError}<small class="resume-title-error" role="alert">{titleError}</small>{/if}<p>{entry.description}</p></div><div class="resume-actions">
              {#if entry.active&&entry.canSave!==false&&onEntryAction&&canRunEntryAction(entry,'save')}<button type="button" disabled={busy} aria-label="Enregistrer l’état courant" title="Enregistrer l’état courant" on:click={()=>{void onEntryAction?.(entry,'save');}}>Enregistrer</button>{/if}
              {#if onInspectEntry || onEntryAction || onRemoveEntry}<button class="resume-more" type="button" aria-label={`Actions de ${entry.title}`} aria-expanded={actionEntryId===entry.id} on:click={event=>toggleEntryMenu(entry,event)}>…</button>{/if}
            </div>
</div>
              <div class="resume-middle"><div class="resume-tag-row">{#if entry.tags?.length}<ExperienceTags tags={entry.tags}/>{/if}</div></div>
              <div class="resume-footer">{#if entry.detail}<small class="resume-revision-date">{entry.detail}</small>{/if}<div class="resume-footer-actions">{#if onInspectEntry}<button type="button" class="experience-volume-info" aria-label={`Volumes de ${entry.title}`} title="Volumes et partage" on:click={event=>inspectEntry(entry,'volumes',event)}>ⓘ</button>{/if}{#if entry.version}<span class="resume-version-marker" aria-label={`Version ${entry.version}`}>{entry.version}</span>{/if}{#if onSetEntryTags && canEditEntry(entry)}<ExperienceTags buttonSize={32} showTags={false} tags={entry.tags??[]} onSave={tags=>onSetEntryTags?.(entry,tags)}/>{/if}</div></div>
            </div>
            {#if (onInspectEntry || onEntryAction || onRemoveEntry) && actionEntryId===entry.id}<div class="resume-menu" popover="auto" use:floatingEntryMenu={entry.id}>
              {#if confirmRemoveId===entry.id}<span>{removeConfirmationLabel}</span><button disabled={busy} on:click={()=>{actionEntryId=null;confirmRemoveId=null;void onRemoveEntry?.(entry);}}>Confirmer la suppression</button><button on:click={()=>{actionEntryId=null;confirmRemoveId=null;}}>Annuler</button>
              {:else}{#if onInspectEntry}<button disabled={busy} on:click={event=>inspectEntry(entry,'detail',event)}>Détail de l’expérience</button>{/if}{#if onEntryAction}
                {#if canRunEntryAction(entry,'share')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'share');}}>Partager l’expérience</button>{/if}
                {#if canRunEntryAction(entry,'save')}<button disabled={busy||!entry.active||entry.canSave===false} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'save');}}>Enregistrer la révision</button>{/if}
                {#if canRunEntryAction(entry,'export')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'export');}}>Exporter l’expérience</button>{/if}
                {#if entry.active&&canRunEntryAction(entry,'close')}<button disabled={busy} on:click={()=>{actionEntryId=null;void onEntryAction?.(entry,'close');}}>Fermer l’expérience</button>{/if}
              {/if}{#if entry.active&&onSaveEntryAs}<button disabled={busy} on:click={()=>{actionEntryId=null;onSaveEntryAs?.(entry);}}>Enregistrer sous…</button>{/if}{#if onRemoveEntry&&canRemoveEntry(entry)}<button disabled={busy||entry.active} title={entry.active?'Fermez cette expérience avant de la supprimer':undefined} on:click={()=>confirmRemoveId=entry.id}>Supprimer</button>{/if}{/if}
            </div>{/if}

          </article>
          {/if}
        {/each}
      {:else}
        <article class="launch-card launch-card--recent launch-card--unavailable" data-dashboard-resume-card>
          <div class="launch-card__copy">
            <span>{viewLabels.recentEyebrow}</span>
            <h3>{experienceSearch?viewLabels.noMatchingExperience:viewLabels.recentEmptyTitle}</h3>
            <p>{viewLabels.recentEmptyDescription}</p>
          </div>
          <button type="button" data-testid="dashboard-resume-unavailable" disabled title={viewLabels.recentEmptyDescription}>
            {viewLabels.resumeExperience}
          </button>
        </article>
      {/if}
    </div>
  </section>

  {#if filteredRecentEntries.length>visibleExperienceLimit}<button class="experience-load-more" on:click={()=>visibleExperienceLimit+=40}>{viewLabels.showMoreExperiences}</button>{/if}
  {#if showLibrary}<div class="launch-dashboard__library-divider">
    <button
      class="launch-dashboard__library-toggle"
      type="button"
      data-testid="dashboard-library-toggle"
      aria-expanded={isLibraryExpanded}
      aria-controls="launch-dashboard-library-section"
      aria-label={isLibraryExpanded ? viewLabels.libraryHide : viewLabels.libraryShow}
      title={isLibraryExpanded ? viewLabels.libraryHide : viewLabels.libraryShow}
      on:click={toggleLibraryExpanded}
    >
      <span aria-hidden="true">{isLibraryExpanded ? '×' : '⚙'}</span>
    </button>
  </div>

  {#if isLibraryExpanded}
  <section id="launch-dashboard-library-section" class="launch-dashboard__section launch-dashboard__library" data-dashboard-section="library" aria-labelledby="launch-dashboard-library" bind:clientWidth={libraryWidth}>
    <div class="launch-dashboard__section-heading">
      <div>
        <span>{viewLabels.libraryEyebrow}</span>
        <h2 id="launch-dashboard-library">{viewLabels.libraryTitle}</h2>
      </div>
      <div class="launch-dashboard__library-view-anchor">
        <small>{libraryItems.length}</small>
        <button class="launch-dashboard__library-view-button" type="button" data-testid="dashboard-library-view-menu" title={viewLabels.libraryViewMenu} aria-label={viewLabels.libraryViewMenu} aria-expanded={isLibraryViewMenuOpen} bind:this={libraryViewMenuButton} on:click={() => void toggleLibraryViewMenu()}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="5" height="5" rx="1"/><rect x="9.5" y="2" width="5" height="5" rx="1"/><rect x="1.5" y="9" width="5" height="5" rx="1"/><rect x="9.5" y="9" width="5" height="5" rx="1"/></svg>
        </button>
        {#if isLibraryViewMenuOpen}
          <div class="launch-dashboard__library-view-menu" role="menu" aria-label={viewLabels.libraryViewMenu} bind:this={libraryViewMenu}>
            <span>Disposition</span>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-view-list" aria-checked={libraryLayout === 'list'} on:click={() => selectLibraryLayout('list')}>{viewLabels.libraryViewList}</button>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-view-grid" aria-checked={libraryLayout === 'grid'} on:click={() => selectLibraryLayout('grid')}>{viewLabels.libraryViewGrid}</button>
            <span>Taille</span>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-size-small" aria-checked={librarySize === 'small'} on:click={() => selectLibrarySize('small')}>{viewLabels.librarySizeSmall}</button>
            <button type="button" role="menuitemradio" data-testid="dashboard-library-size-medium" aria-checked={librarySize === 'medium'} on:click={() => selectLibrarySize('medium')}>{viewLabels.librarySizeMedium}</button>
          </div>
        {/if}
      </div>
    </div>
    <p class="launch-dashboard__library-description">{viewLabels.libraryDescription}</p>
    <div class="launch-dashboard__library-sources">
      {#each librarySources as source (source.id)}
        <span data-source-status={source.status}>{source.label}</span>
      {/each}
    </div>
    {#if libraryLoading}
      <p class="launch-dashboard__library-loading" role="status">{viewLabels.libraryLoading}</p>
    {/if}
    <div class="launch-dashboard__library-category" data-library-category="tools">
      <div class="launch-dashboard__category-heading">
        <h3>{viewLabels.toolsTitle}</h3>
        {#if expandedLibraryCategories.tool && toolItems.length > libraryCompactCapacity}
          <button type="button" on:click={() => toggleLibraryCategory('tool')}>{viewLabels.showFewerTools}</button>
        {/if}
      </div>
      <div class:launch-dashboard__library-items--list={libraryLayout === 'list'} class:launch-dashboard__library-items--grid={libraryLayout === 'grid'} class:launch-dashboard__library-items--small={librarySize === 'small'} class:launch-dashboard__library-items--medium={librarySize === 'medium'} class="launch-dashboard__library-items">
        {#each visibleToolItems as item (item.id)}
          <button class="launch-dashboard__library-item" type="button" data-testid={`dashboard-library-${item.kind}-${item.id}`} aria-haspopup="dialog" on:click={(event) => openLibraryItem(item, event)}>
            <span class="launch-dashboard__library-thumbnail">
              {#if item.illustration}<img src={item.illustration.src} alt={item.illustration.alt} />{:else}<small>{viewLabels.detailIllustrationUnavailable}</small>{/if}
            </span>
            <span>{item.kind}</span><strong>{item.title}</strong><small>{item.description}</small>
          </button>
        {/each}
        {#if !expandedLibraryCategories.tool && toolItems.length > libraryCompactCapacity}
          <button class="launch-dashboard__more-tile" type="button" data-testid="dashboard-library-tools-more" aria-label={viewLabels.seeAllTools} on:click={() => toggleLibraryCategory('tool')}>
            <strong aria-hidden="true">…</strong><small>{viewLabels.seeAllTools}</small>
          </button>
        {/if}
      </div>
    </div>
    <div class="launch-dashboard__library-category" data-library-category="widgets">
      <div class="launch-dashboard__category-heading">
        <h3>{viewLabels.widgetsTitle}</h3>
        {#if expandedLibraryCategories.widget && widgetItems.length > libraryCompactCapacity}
          <button type="button" on:click={() => toggleLibraryCategory('widget')}>{viewLabels.showFewerWidgets}</button>
        {/if}
      </div>
      <div class:launch-dashboard__library-items--list={libraryLayout === 'list'} class:launch-dashboard__library-items--grid={libraryLayout === 'grid'} class:launch-dashboard__library-items--small={librarySize === 'small'} class:launch-dashboard__library-items--medium={librarySize === 'medium'} class="launch-dashboard__library-items">
        {#each visibleWidgetItems as item (item.id)}
          <button class="launch-dashboard__library-item" type="button" data-testid={`dashboard-library-${item.kind}-${item.id}`} aria-haspopup="dialog" on:click={(event) => openLibraryItem(item, event)}>
            <span class="launch-dashboard__library-thumbnail">
              {#if item.illustration}<img src={item.illustration.src} alt={item.illustration.alt} />{:else}<small>{viewLabels.detailIllustrationUnavailable}</small>{/if}
            </span>
            <span>{item.kind}</span><strong>{item.title}</strong><small>{item.description}</small>
          </button>
        {/each}
        {#if !expandedLibraryCategories.widget && widgetItems.length > libraryCompactCapacity}
          <button class="launch-dashboard__more-tile" type="button" data-testid="dashboard-library-widgets-more" aria-label={viewLabels.seeAllWidgets} on:click={() => toggleLibraryCategory('widget')}>
            <strong aria-hidden="true">…</strong><small>{viewLabels.seeAllWidgets}</small>
          </button>
        {/if}
      </div>
    </div>
    {#if librarySources.some(source => source.kind === 'remote' && source.status === 'not-configured')}
      <small>{viewLabels.libraryRemoteUnavailable}</small>
    {/if}
  </section>
  {/if}

{/if}
</main>
{#if showExperienceDetail}<section class="experience-detail-content"><slot name="experience-detail"/></section>{/if}

{#if selectedLibraryItem}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="launch-dashboard__detail-overlay" on:click={handleOverlayClick}>
    <div
      class="launch-dashboard__detail-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-dashboard-library-detail-title"
      bind:this={libraryDetailDialog}
    >
      <button class="launch-dashboard__detail-close" type="button" data-testid="dashboard-library-detail-close" aria-label={viewLabels.detailClose} bind:this={libraryDetailCloseButton} on:click={() => void closeLibraryItem()}><span aria-hidden="true">×</span></button>
      <button class="launch-dashboard__detail-arrow" type="button" data-testid="dashboard-library-detail-previous" aria-label={viewLabels.detailPrevious} disabled={!canNavigateLibraryPrevious} on:click={() => navigateLibraryItem(-1)}>←</button>
      <div class="launch-dashboard__detail-content">
        <div class="launch-dashboard__detail-product">
          <div class="launch-dashboard__detail-media-column">
            <div class="launch-dashboard__detail-illustration">
              {#if selectedLibraryItem.illustration}
                <img src={selectedLibraryItem.illustration.src} alt={selectedLibraryItem.illustration.alt} />
              {:else}
                <span>{selectedLibraryItem.kind}</span>
                <small>{viewLabels.detailIllustrationUnavailable}</small>
              {/if}
            </div>
            <div class="launch-dashboard__detail-share">
              <strong>{viewLabels.detailShareTitle}</strong>
              {#if selectedLibraryItem.share}
                <button type="button" data-testid="dashboard-library-share-reference" disabled={isSharing} aria-busy={isSharing} on:click={() => void shareSelectedLibraryItem()}>{viewLabels.detailShareReference}</button>
                <small>{selectedLibraryItem.share.limitation}</small>
                {#if shareStatus}<span role="status" aria-live="polite">{shareStatus}</span>{/if}
              {:else}
                <small>{viewLabels.detailShareUnavailable}</small>
              {/if}
            </div>
          </div>
          <div class="launch-dashboard__detail-copy">
            <span>{viewLabels.brand} · {viewLabels.detailEyebrow}</span>
            <h2 id="launch-dashboard-library-detail-title">{selectedLibraryItem.title}</h2>
            <p>{selectedLibraryItem.description}</p>
            <div class="launch-dashboard__detail-tabs" role="tablist" aria-label={selectedLibraryItem.title}>
              {#each libraryDetailTabs as tab (tab.id)}
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
                  <div><dt>{viewLabels.detailIdentifier}</dt><dd>{selectedLibraryItem.id}</dd></div>
                  <div><dt>{viewLabels.detailSource}</dt><dd>{selectedLibrarySource?.label ?? selectedLibraryItem.sourceId}</dd></div>
                  <div><dt>Type</dt><dd>{selectedLibraryItem.kind}</dd></div>
                  <div><dt>{viewLabels.detailLocalVersion}</dt><dd>{selectedLibraryItem.versions?.local ?? viewLabels.detailVersionUnknown}</dd></div>
                  {#if selectedLibraryItem.versions?.localProvenance}
                    <div><dt>Provenance</dt><dd>{selectedLibraryItem.versions.localProvenance}</dd></div>
                  {/if}
                  {#if selectedLibraryItem.versions?.published}
                    <div>
                      <dt>{viewLabels.detailPublishedVersion}</dt>
                      <dd>
                        {selectedLibraryItem.versions.published.version ?? viewLabels.detailPublicationUnavailable}
                        {#if selectedLibraryItem.versions.published.publisher} · {selectedLibraryItem.versions.published.publisher}{/if}
                        {#if selectedLibraryItem.versions.published.reason}<small>{selectedLibraryItem.versions.published.reason}</small>{/if}
                      </dd>
                    </div>
                  {/if}
                  {#if selectedLibraryItem.versions?.hostApplication}
                    <div><dt>{viewLabels.detailHostApplicationVersion}</dt><dd>{selectedLibraryItem.versions.hostApplication.label} · {selectedLibraryItem.versions.hostApplication.version}</dd></div>
                  {/if}
                </dl>
                <h3>{viewLabels.detailDependencies}</h3>
                {#if selectedLibraryItem.details?.dependencies?.length}
                  <div class="launch-dashboard__dependency-table-wrap">
                    <table>
                      <thead><tr><th>{viewLabels.detailDependencyPackage}</th><th>{viewLabels.detailDependencyConstraint}</th><th>{viewLabels.detailDependencyScope}</th></tr></thead>
                      <tbody>
                        {#each selectedLibraryItem.details.dependencies as dependency (`${dependency.packageName}:${dependency.scope}`)}
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
                  <p>{viewLabels.detailNoDependencies}</p>
                {/if}
                {#if hasPublishedVersionMismatch && selectedLibraryItem.versions?.published}
                  <div class="launch-dashboard__version-mismatch" data-testid="dashboard-library-version-mismatch">
                    <span>{selectedLibraryItem.versions.local}</span>
                    <span class="launch-dashboard__version-connector" aria-hidden="true"></span>
                    <button type="button" aria-label={viewLabels.detailSynchronizationMismatch}>⚠</button>
                    <span class="launch-dashboard__version-connector" aria-hidden="true"></span>
                    <span>{selectedLibraryItem.versions.published.version}</span>
                    <div class="launch-dashboard__version-sync-action">
                      {#if selectedLibraryItem.versions.published.acquisition.status === 'available' && onSynchronizeLibraryItem}
                        <button type="button" data-testid="dashboard-library-synchronize" on:click={() => void synchronizeSelectedLibraryItem()}>{viewLabels.detailSynchronize}</button>
                      {:else}
                        <small>{viewLabels.detailSynchronizationUnavailable} · {selectedLibraryItem.versions.published.acquisition.reason}</small>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {:else if selectedLibraryItem.details?.diagram}
              <div class="launch-dashboard__detail-panel" id="launch-dashboard-library-detail-panel-diagram" role="tabpanel" data-testid="dashboard-library-detail-diagram">
                <div class="launch-dashboard__diagram-heading">
                  <div><h3>{selectedLibraryItem.details.diagram.title}</h3><p>{selectedLibraryItem.details.diagram.summary}</p></div>
                  <small>{viewLabels.detailDiagramSource} · {selectedLibraryItem.details.diagram.sourcePackage}</small>
                </div>
                <ol class="launch-dashboard__diagram-flow">
                  {#each selectedLibraryItem.details.diagram.nodes as node (node.id)}
                    <li data-diagram-tone={node.tone ?? 'neutral'}>
                      <strong>{node.label}</strong>
                      <span>{node.description}</span>
                    </li>
                  {/each}
                </ol>
                <ul class="launch-dashboard__diagram-edges" aria-label="Relations">
                  {#each selectedLibraryItem.details.diagram.edges as edge (`${edge.from}:${edge.to}`)}
                    <li>{diagramNodeLabel(selectedLibraryItem, edge.from)} <span aria-hidden="true">→</span> {diagramNodeLabel(selectedLibraryItem, edge.to)}</li>
                  {/each}
                </ul>
                <p class="launch-dashboard__diagram-caption">{selectedLibraryItem.details.diagram.caption}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
      <button class="launch-dashboard__detail-arrow" type="button" data-testid="dashboard-library-detail-next" aria-label={viewLabels.detailNext} disabled={!canNavigateLibraryNext} on:click={() => navigateLibraryItem(1)}>→</button>
    </div>
  </div>
{/if}

{#if admissionBlocker}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="launch-dashboard__detail-overlay">
    <div
      class="launch-dashboard__admission-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-dashboard-admission-title"
      bind:this={admissionDialog}
    >
      <div class="launch-dashboard__detail-heading">
        <div>
          <span>{viewLabels.brand} · {viewLabels.admissionEyebrow}</span>
          <h2 id="launch-dashboard-admission-title">{admissionBlocker.title}</h2>
        </div>
        <button type="button" data-testid="dashboard-admission-close" bind:this={admissionCloseButton} on:click={() => void closeAdmissionBlocker()}>{viewLabels.admissionClose}</button>
      </div>
      <p>{admissionBlocker.description}</p>
      <div class="launch-dashboard__admission-issues">
        {#each admissionBlocker.issues as issue (issue.id)}
          <article>
            <h3>{issue.title}</h3>
            <p>{issue.description}</p>
            {#if issue.requiredVersion}<small>{viewLabels.admissionRequiredVersion} · {issue.requiredVersion}</small>{/if}
            {#if issue.availableVersions?.length}<small>{viewLabels.admissionAvailableVersions} · {issue.availableVersions.join(', ')}</small>{/if}
            {#if issue.acquisition.status === 'available' && onAcquireAdmissionIssue}
              <button type="button" data-testid={`dashboard-admission-acquire-${issue.id}`} disabled={Boolean(acquiringAdmissionIssueId)} aria-busy={acquiringAdmissionIssueId === issue.id} on:click={() => void acquireAdmissionIssue(issue)}>
                {acquiringAdmissionIssueId === issue.id ? admissionActionStatus : issue.acquisition.actionLabel}
              </button>
            {:else}
              <small>{viewLabels.admissionUnavailable} · {issue.acquisition.reason}</small>
            {/if}
          </article>
        {/each}
      </div>
      {#if admissionActionStatus}<p role="status" aria-live="polite">{admissionActionStatus}</p>{/if}
    </div>
  </div>
{/if}

<style>
  .launch-dashboard[hidden]{display:none!important}.experience-detail-content{min-width:0;min-height:0;overflow:auto}.launch-dashboard .experience-volume-info{display:inline-grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:50%;color:var(--color-text-secondary);background:transparent;font-size:16px;cursor:pointer;position:relative;z-index:3}.experience-volume-info:focus-visible{outline:2px solid var(--color-focus-ring,#79adff);outline-offset:2px}

  .resume-actions{display:flex;gap:6px}.resume-actions>button:first-child{flex:1;min-width:max-content;width:auto;padding-inline:12px;white-space:nowrap}.resume-actions .resume-more{width:32px;flex:none}.resume-menu{display:flex;flex-direction:column;gap:6px;padding:8px;background:var(--color-background-muted);border:1px solid var(--color-border-subtle);border-radius:5px}.resume-menu span{font-size:12px}

  .starter-row{display:grid!important;grid-template-columns:repeat(var(--starter-count),minmax(0,1fr))!important;gap:8px!important}
  .starter-row .launch-card{min-width:0;padding:9px;gap:8px}
  .starter-row .launch-card__preview{display:none}
  .starter-row .launch-card__copy h3{font-size:12px;line-height:1.35}
  .starter-row .launch-card__copy p,.starter-row .launch-card__copy small,.starter-row .launch-card__copy>span{display:none}
  .starter-row .launch-card__new-mark{font-size:22px;height:24px}
  .starter-row .launch-card button{height:30px;font-size:12px}
  .starter-row .starter-more{display:grid;place-items:center}
  .starter-row .starter-more button{font-size:28px;height:100%}
  .starter-overflow{display:flex;flex-wrap:wrap;gap:8px;padding:10px;border:1px solid var(--color-border-subtle);background:var(--color-background-muted);border-radius:6px}
  .starter-overflow button{font:inherit;color:inherit;background:var(--color-background-surface);border:1px solid var(--color-border-subtle);padding:8px;border-radius:4px}

  .launch-dashboard {
    --dashboard-accent: var(--color-text-primary, #30343a);
    --workbench-text-secondary: var(--color-text-secondary);
    --workbench-text-muted: var(--color-text-secondary);
    --dashboard-violet: var(--color-text-secondary, #6d737a);
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
    background:var(--color-background-canvas);
  }

  .launch-dashboard--embedded{height:auto;overflow:visible;padding:0;background:transparent;gap:24px}
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
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: none;
  }
  .launch-dashboard__header h1 { margin: 0; font-size: clamp(1.5rem, 2.8vw, 2.2rem); letter-spacing: -0.025em; }
  .launch-dashboard__header p { max-width: 42rem; margin: 0; color: var(--workbench-text-secondary, #aebdd0); font-size: 1.02rem; }
  .launch-dashboard__error { padding: 12px 14px; border: 1px solid #d7755f; border-radius: 10px; background: rgba(98, 35, 26, 0.78); }
  .launch-dashboard__section { display: grid; gap: 14px; }
  .launch-dashboard__section-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
  .launch-dashboard__section-heading h2 { margin: 3px 0 0; font-size: 1.15rem; }
  .launch-dashboard__section-heading small { color: var(--workbench-text-muted, #8292a8); font-weight: 800; }
  .launch-dashboard__section-actions { display: flex; align-items: center; gap: 9px; }
  .launch-dashboard__section-actions button { padding: 6px 9px; border: 1px solid rgba(135, 159, 188, 0.28); border-radius: 7px; color: inherit; background: rgba(135, 159, 188, 0.08); cursor: pointer; }
  .launch-dashboard__masonry { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .launch-card {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 16px;
    min-width: 0;
    padding: 13px;
    border: 1px solid var(--color-border-subtle, #252d3a);
    border-radius: var(--radius-large, 0.75rem);
    background: var(--color-background-surface, #141922);
    box-shadow: none;
  }
  .launch-card--recent { border-color: color-mix(in srgb, var(--color-text-secondary) 30%, transparent); }
  .launch-card--unavailable { opacity: 0.72; }
  .launch-card--preset { border-color: color-mix(in srgb, var(--color-text-secondary) 30%, transparent); }
  .launch-card--preset .launch-card__copy > span { color: var(--dashboard-violet); }
  .launch-card__preview { display: grid; gap: 8px; }
  .launch-card__preview img { width: 100%; height:140px; object-fit: contain; background:var(--color-background-muted);border-radius: 6px; }
  .launch-card__preview small,
  .launch-card__copy small { color: var(--workbench-text-muted, #8394aa); }
  .layout-preview {
    height: 92px;
    display: grid;
    grid-template: "rail main side" 1fr "rail timeline timeline" 0.35fr / 0.18fr 1fr 0.38fr;
    gap: 5px;
    padding: 8px;
    border: 1px solid color-mix(in srgb, var(--color-text-secondary) 16%, transparent);
    border-radius: 10px;
    background:var(--color-background-muted);
    transform:none;
  }
  .layout-preview span { border: 1px solid color-mix(in srgb, var(--color-text-secondary) 20%, transparent); border-radius: 4px; background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); }
  .layout-preview--preset span { border-color: color-mix(in srgb, var(--color-text-secondary) 25%, transparent); background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); }
  .layout-preview__rail { grid-area: rail; }
  .layout-preview__main { grid-area: main; }
  .layout-preview__side { grid-area: side; }
  .layout-preview__timeline { grid-area: timeline; }
  .launch-card__copy { display: grid; gap: 6px; }
  .launch-card__copy h3, .launch-card__copy p { margin: 0; }
  .launch-card__copy h3 { font-size: 1rem; }
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
    font-weight: 600;
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
  .launch-card__new-mark { width: 42px; height: 42px; display: grid; place-items: center; border: 1px dashed color-mix(in srgb, var(--color-text-secondary) 50%, transparent); border-radius: 50%; color: var(--dashboard-accent); font-size: 1.6rem; }
  .launch-dashboard__library-divider { position: relative; width: min(1440px, 100%); height: 18px; margin: -4px auto 0; border-top: 1px solid rgba(135, 159, 188, 0.28); }
  .launch-dashboard__library-toggle { position: absolute; top: -1px; right: 0; width: 44px; height: 30px; display: grid; place-items: center; padding: 0; border: 1px solid var(--color-border-subtle, #252d3a); border-top-color: var(--dashboard-accent); border-radius: 0 0 var(--radius-medium, 0.5rem) var(--radius-medium, 0.5rem); color: inherit; background: var(--color-background-surface, #141922); cursor: pointer; transition: color 120ms ease, background 120ms ease, transform 120ms ease; }
  .launch-dashboard__library-toggle:hover { color: var(--dashboard-accent); background: color-mix(in srgb, var(--color-text-secondary) 12%, transparent); }
  .launch-dashboard__library-toggle:active { transform: translateY(1px); background: color-mix(in srgb, var(--color-text-secondary) 20%, transparent); }
  .launch-dashboard__library-toggle:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__library-description { margin: -6px 0 0; color: var(--workbench-text-secondary, #aebdd0); }
  .launch-dashboard__library-view-anchor { position: relative; display: flex; align-items: center; gap: 8px; }
  .launch-dashboard__library-view-button { width: 32px; height: 32px; display: grid; place-items: center; padding: 7px; border: 1px solid rgba(135, 159, 188, 0.28); border-radius: 7px; color: inherit; background: rgba(135, 159, 188, 0.08); cursor: pointer; }
  .launch-dashboard__library-view-button svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.2; }
  .launch-dashboard__library-view-menu { position: absolute; top: calc(100% + 7px); right: 0; z-index: 20; min-width: 170px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 9px; border: 1px solid var(--color-border-subtle, #252d3a); border-radius: var(--radius-medium, 0.5rem); background: var(--color-background-elevated, #191f29); box-shadow: var(--shadow-popover, 0 18px 48px rgba(4, 8, 14, 0.52)); }
  .launch-dashboard__library-view-menu > span { grid-column: 1 / -1; color: var(--workbench-text-muted, #8292a8); font-size: .68rem; text-transform: uppercase; }
  .launch-dashboard__library-view-menu button { padding: 7px 8px; border: 1px solid rgba(135, 159, 188, 0.2); border-radius: 6px; color: inherit; background: transparent; cursor: pointer; }
  .launch-dashboard__library-view-menu button[aria-checked='true'] { border-color: var(--dashboard-accent); background: color-mix(in srgb, var(--color-text-secondary) 12%, transparent); }
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
  .launch-dashboard__library-item:focus-visible { border-color: color-mix(in srgb, var(--color-text-secondary) 58%, transparent); outline: none; background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); }
  .launch-dashboard__library-item > span:not(.launch-dashboard__library-thumbnail), .launch-dashboard__library-item > strong, .launch-dashboard__library-item > small { grid-column: 2; }
  .launch-dashboard__library-item span { color: var(--dashboard-accent); font-size: 0.65rem; text-transform: uppercase; }
  .launch-dashboard__library-thumbnail { grid-column: 1; grid-row: 1 / 4; width: 54px; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden; border: 1px solid rgba(135, 159, 188, 0.14); border-radius: 6px; color: var(--workbench-text-muted, #8292a8); background: linear-gradient(145deg, color-mix(in srgb, var(--color-text-secondary) 6%, transparent), color-mix(in srgb, var(--color-text-secondary) 6%, transparent)); }
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
  .launch-dashboard__detail-illustration { width: 100%; aspect-ratio: 1 / 1; display: grid; place-items: center; align-content: center; gap: 8px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 20%, transparent); border-radius: 12px; color: var(--workbench-text-muted, #8292a8); background: linear-gradient(145deg, color-mix(in srgb, var(--color-text-secondary) 8%, transparent), color-mix(in srgb, var(--color-text-secondary) 8%, transparent)); }
  .launch-dashboard__detail-illustration img { width: 100%; height: 100%; object-fit: cover; }
  .launch-dashboard__detail-illustration > span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  .launch-dashboard__detail-share { display: grid; gap: 7px; padding: 10px; border: 1px solid rgba(135, 159, 188, 0.16); border-radius: 9px; background: rgba(8, 14, 22, 0.45); }
  .launch-dashboard__detail-share strong { font-size: 0.78rem; }
  .launch-dashboard__detail-share small, .launch-dashboard__detail-share span { color: var(--workbench-text-muted, #8292a8); font-size: 0.7rem; line-height: 1.35; }
  .launch-dashboard__detail-share button { padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 35%, transparent); border-radius: 7px; color: inherit; background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); cursor: pointer; }
  .launch-dashboard__detail-share button:hover:not(:disabled) { border-color: var(--dashboard-accent); background: color-mix(in srgb, var(--color-text-secondary) 16%, transparent); }
  .launch-dashboard__detail-share button:active:not(:disabled) { transform: translateY(1px); background: color-mix(in srgb, var(--color-text-secondary) 24%, transparent); }
  .launch-dashboard__detail-share button:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-copy { min-width: 0; display: grid; gap: 16px; }
  .launch-dashboard__detail-copy > span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
  .launch-dashboard__detail-copy h2 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
  .launch-dashboard__detail-copy > p { margin: 0; color: var(--workbench-text-secondary, #aebdd0); line-height: 1.6; }
  .launch-dashboard__detail-tabs { display: flex; gap: 5px; overflow-x: auto; border-bottom: 1px solid rgba(135, 159, 188, 0.2); }
  .launch-dashboard__detail-tabs button { flex: none; padding: 9px 12px; border: 0; border-bottom: 2px solid transparent; color: var(--workbench-text-muted, #8292a8); background: transparent; cursor: pointer; }
  .launch-dashboard__detail-tabs button[aria-selected="true"] { border-bottom-color: var(--dashboard-accent); color: var(--workbench-text-primary, #edf3fb); background: color-mix(in srgb, var(--color-text-secondary) 7%, transparent); }
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
  .launch-dashboard__diagram-flow li[data-diagram-tone="projection"] { border-color: color-mix(in srgb, var(--color-text-secondary) 38%, transparent); }
  .launch-dashboard__diagram-flow li[data-diagram-tone="runtime"] { border-color: color-mix(in srgb, var(--color-text-secondary) 42%, transparent); }
  .launch-dashboard__diagram-flow li[data-diagram-tone="observation"] { border-color: rgba(92, 173, 255, 0.42); }
  .launch-dashboard__diagram-flow span { color: var(--workbench-text-muted, #8292a8); font-size: 0.72rem; line-height: 1.4; }
  .launch-dashboard__diagram-edges { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .launch-dashboard__diagram-edges li { padding: 5px 8px; border-radius: 999px; color: var(--workbench-text-secondary, #aebdd0); background: rgba(135, 159, 188, 0.08); font-size: 0.7rem; }
  .launch-dashboard__diagram-edges span { color: var(--dashboard-accent); }
  .launch-dashboard__diagram-caption { padding-left: 10px; border-left: 2px solid var(--dashboard-accent); font-size: 0.78rem; }
  .launch-dashboard__detail-close { position: absolute; top: -15px; right: -15px; z-index: 3; width: 38px; height: 32px; display: grid; place-items: center; padding: 0; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 45%, transparent); border-radius: 7px; color: inherit; background: rgba(18, 29, 42, 0.98); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42); font-size: 1.25rem; cursor: pointer; transition: border-color 120ms ease, background 120ms ease, transform 120ms ease; }
  .launch-dashboard__detail-close:hover { border-color: var(--dashboard-accent); background: color-mix(in srgb, var(--color-text-secondary) 16%, transparent); }
  .launch-dashboard__detail-close:active { transform: translateY(1px) scale(0.97); background: color-mix(in srgb, var(--color-text-secondary) 24%, transparent); }
  .launch-dashboard__detail-close:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-arrow { width: 42px; height: 42px; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 35%, transparent); border-radius: 999px; color: inherit; background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent); font-size: 1.2rem; cursor: pointer; }
  .launch-dashboard__detail-arrow:hover:not(:disabled) { border-color: var(--dashboard-accent); background: color-mix(in srgb, var(--color-text-secondary) 18%, transparent); }
  .launch-dashboard__detail-arrow:active:not(:disabled) { transform: translateY(1px) scale(0.96); background: color-mix(in srgb, var(--color-text-secondary) 26%, transparent); }
  .launch-dashboard__detail-arrow:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }
  .launch-dashboard__detail-arrow:disabled { opacity: 0.32; cursor: not-allowed; border-color: rgba(135, 159, 188, 0.18); background: rgba(135, 159, 188, 0.04); }
  .launch-dashboard__detail-heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
  .launch-dashboard__detail-heading span { color: var(--dashboard-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
  .launch-dashboard__detail-heading h2 { margin: 6px 0 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
  .launch-dashboard__detail-heading button { flex: none; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 40%, transparent); border-radius: 8px; color: inherit; background: color-mix(in srgb, var(--color-text-secondary) 10%, transparent); cursor: pointer; }
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
  .launch-dashboard__admission-issues button { justify-self: start; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--color-text-secondary) 40%, transparent); border-radius: 8px; color: inherit; background: color-mix(in srgb, var(--color-text-secondary) 10%, transparent); cursor: pointer; }
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

 .experience-list-controls{display:flex;gap:12px;align-items:center}.experience-list-controls input{width:230px;max-width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--color-border-subtle);border-radius:6px;color:inherit;background:var(--color-background-muted);font:inherit}.experience-load-more{justify-self:center;padding:9px 18px;border:1px solid var(--color-border-subtle);background:var(--color-background-muted);color:inherit;cursor:pointer}
 .launch-dashboard--compact{gap:22px}.launch-dashboard--compact .launch-dashboard__brand{display:none}.launch-dashboard--compact .launch-dashboard__header h1{font-size:22px}.launch-dashboard--compact .launch-dashboard__header p{font-size:13px}.launch-dashboard--compact .launch-dashboard__section-heading>div>span{display:none}
 .launch-dashboard--compact .launch-card{grid-template-columns:48px minmax(0,1fr) auto;grid-template-rows:1fr;align-items:center;gap:12px;padding:12px;border-radius:8px}.launch-dashboard--compact .launch-card__preview{height:48px;gap:0}.launch-dashboard--compact .launch-card__preview img{height:48px;width:48px;border-radius:4px}.launch-dashboard--compact .layout-preview{height:40px;padding:3px;gap:2px;border-radius:4px}.launch-dashboard--compact .launch-card__preview small{display:none}.launch-dashboard--compact .launch-card__copy{gap:3px}.launch-dashboard--compact .launch-card__copy h3{font-size:14px;line-height:1.4}.launch-dashboard--compact .launch-card__copy p,.launch-dashboard--compact .launch-card__copy small{display:none}.launch-dashboard--compact .launch-card__copy>span{font-size:11px;font-weight:400}.launch-dashboard--compact .launch-card button{width:auto;height:32px;padding:0 10px;font-size:12px;font-weight:500;transform:none}.launch-dashboard--compact .launch-card__new-mark{width:40px;height:40px;font-size:22px}.launch-dashboard--compact .launch-card--unavailable{grid-template-columns:1fr auto}.launch-dashboard--compact .launch-dashboard__masonry--starters{grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}.launch-dashboard--compact .launch-dashboard__masonry--saved{grid-template-columns:1fr}.launch-dashboard--compact .launch-card--recent{grid-template-columns:48px minmax(0,1fr) max-content}.launch-dashboard--compact .launch-card--recent .launch-card__copy>span{order:1}.launch-dashboard--compact .launch-card--recent .launch-card__copy h3{order:0}
 @media(max-width:650px){.experience-list-controls input{width:160px}.launch-dashboard--compact .launch-card--recent{grid-template-columns:40px minmax(0,1fr) auto}.launch-dashboard--compact .launch-dashboard__section-heading{align-items:start;flex-wrap:wrap}}
.launch-card--active{background:var(--color-background-muted);border-color:var(--color-text-secondary);box-shadow:inset 3px 0 0 var(--color-text-primary)}
.launch-dashboard--compact .starter-row .launch-card{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;gap:6px;padding:9px}.launch-dashboard--compact .starter-row .launch-card__new-mark{display:none}.launch-dashboard--compact .starter-row .launch-card__copy h3{font-size:12px}.launch-dashboard--compact .starter-row .launch-card__copy>span{display:none}.launch-card--recent{position:relative}.resume-menu{position:absolute;right:12px;bottom:calc(100% - 4px);z-index:30;min-width:180px;box-shadow:0 8px 24px #0005}.launch-dashboard--compact .resume-actions{width:max-content;min-width:max-content}
.launch-dashboard--compact .starter-row .launch-card{background:color-mix(in srgb,var(--color-background-surface) 86%,var(--color-text-secondary) 14%);grid-template-columns:minmax(0,1fr);grid-template-rows:52px 34px 30px;align-items:stretch;gap:7px;min-width:0}
.launch-dashboard--compact .starter-row .launch-card__preview{display:grid;height:52px;min-height:0;overflow:hidden;grid-row:1}
.launch-dashboard--compact .starter-row .launch-card__preview img{height:52px;width:100%;object-fit:contain}
.launch-dashboard--compact .starter-row .layout-preview{height:46px;width:100%;box-sizing:border-box}
.launch-dashboard--compact .starter-row .launch-card__copy{grid-row:2;align-content:center;min-width:0}
.launch-dashboard--compact .starter-row .launch-card__copy h3{display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:17px;overflow-wrap:anywhere}
.launch-dashboard--compact .starter-row .launch-card>button{grid-row:3;width:100%;margin:0}
.launch-dashboard--compact .starter-row .launch-card--new{background:color-mix(in srgb,var(--color-background-surface) 80%,#6798c7 20%);border-color:color-mix(in srgb,var(--color-border-subtle) 40%,#6798c7 60%)}
.launch-dashboard--compact .starter-row .launch-card--new .launch-card__new-mark{display:grid;grid-row:1;place-items:center;width:100%;height:52px;color:var(--color-text-primary);font-size:30px}
.launch-dashboard--compact .starter-row .starter-more{grid-template-rows:1fr}.launch-dashboard--compact .starter-row .starter-more>button{grid-row:1;height:100%}
.launch-dashboard--compact .launch-card--recent .launch-card__copy small{display:block;order:2;font-size:11px;line-height:1.45}
.launch-dashboard--bounded{height:100%;min-height:0;overflow:visible;display:flex;flex-direction:column;box-sizing:border-box}
.launch-dashboard--bounded>section{flex:none}
.launch-dashboard--bounded>.saved-experiences-section{flex:1;min-height:0;display:flex;flex-direction:column}
.launch-dashboard--bounded .saved-experiences-section>.launch-dashboard__section-heading{flex:none}
.launch-dashboard--bounded .launch-dashboard__masonry--saved{min-height:0;overflow-y:auto;align-content:start;scrollbar-gutter:stable;margin-right:calc(-1 * var(--dashboard-scrollbar-outset,0px));padding:0 calc(4px + var(--dashboard-scrollbar-outset,0px)) 4px 0}
.launch-dashboard--bounded .launch-card--active{position:sticky;top:0;z-index:3}
.launch-card--active{background:color-mix(in srgb,var(--color-background-surface) 90%,#6798c7 10%);border-color:color-mix(in srgb,var(--color-border-subtle) 50%,#6798c7 50%);box-shadow:inset 3px 0 0 #6798c7}
.launch-card--active .resume-menu{bottom:auto;top:calc(100% - 4px)}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-columns:112px minmax(0,1fr) max-content;column-gap:20px}
.launch-dashboard--compact .launch-card--recent .launch-card__preview{position:relative;align-self:stretch;height:auto;min-height:70px;min-width:0;box-sizing:border-box;background:var(--color-background-muted);border:1px solid color-mix(in srgb,var(--color-background-muted) 80%,white 20%);border-radius:4px}
.launch-dashboard--compact .launch-card--recent .launch-card__preview img{position:absolute;inset:0;width:100%;height:100%;padding:8px;box-sizing:border-box;object-fit:contain;background:transparent}
@media(max-width:650px){.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-columns:88px minmax(0,1fr);column-gap:16px}.launch-dashboard--compact .launch-card--recent .resume-actions{grid-column:2}.launch-dashboard--compact .launch-card--recent .launch-card__preview{grid-row:1 / 3}}
.launch-dashboard--compact .launch-card--recent.launch-card--active{padding-left:15px}
.launch-card--recent:not(.launch-card--active):hover{background:color-mix(in srgb,var(--color-background-surface) 93%,#6798c7 7%);border-color:color-mix(in srgb,var(--color-border-subtle) 65%,#6798c7 35%)}
.launch-card--recent:not(.launch-card--unavailable){cursor:pointer}
.launch-card--recent>.launch-card__preview,.launch-card--recent>.launch-card__copy{pointer-events:none}
.launch-card--recent button.resume-card-open{position:absolute;inset:0;z-index:1;width:100%;height:100%;min-height:0;padding:0;margin:0;border:0;border-radius:inherit;background:transparent;box-shadow:none;cursor:pointer;transform:none}
.launch-card--recent button.resume-card-open:hover{background:transparent;box-shadow:none;transform:none}
.launch-card--recent button.resume-card-open:focus-visible{outline:2px solid #6798c7;outline-offset:-2px}
.launch-card--recent button.resume-card-open:disabled{cursor:progress}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--active):hover>.launch-card__preview{background:color-mix(in srgb,var(--color-background-muted) 88%,#6798c7 12%);border-color:#6798c7}
.launch-dashboard--compact .launch-card--recent>.launch-card__preview{transition:border-color .15s ease,background .15s ease}
.launch-dashboard--compact .launch-card .resume-title-button,.resume-title-input{position:relative;z-index:2;pointer-events:auto;font:inherit;color:inherit;text-align:left;width:auto;max-width:100%;height:auto;min-height:0;padding:0;margin:0;border:0;border-radius:2px;background:transparent;box-shadow:none;transform:none}
.launch-dashboard--compact .launch-card .resume-title-button:hover{text-decoration:underline;text-underline-offset:3px;background:transparent;box-shadow:none;transform:none;cursor:text}
.resume-title-input{width:100%;box-sizing:border-box;padding:2px 5px;border:1px solid var(--color-border-subtle);background:var(--color-background-surface)}
.resume-title-button:focus-visible,.resume-title-input:focus-visible{outline:2px solid #6798c7;outline-offset:2px}
.launch-dashboard--compact .launch-dashboard__masonry--saved.experiences-two-columns{grid-template-columns:repeat(2,minmax(0,1fr))}
.launch-dashboard--compact .launch-card--recent.launch-card--active{grid-column:1 / -1}
.launch-dashboard--compact .launch-card .resume-title-button{white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;line-height:1.4}
.resume-menu[popover]{position:fixed;inset:auto;margin:0;min-width:180px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;color:var(--color-text-primary);box-sizing:border-box}
.resume-menu[popover]:not(:popover-open){display:none}
.resume-menu[popover]>button{font:inherit;text-align:left;padding:7px 10px;color:inherit;background:var(--color-background-surface);border:1px solid var(--color-border-subtle);border-radius:4px;cursor:pointer}
.resume-menu[popover]>button:disabled{opacity:.5;cursor:default}
.launch-card--active .resume-menu[popover]{inset:auto}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-rows:minmax(36px,auto) auto;row-gap:8px;align-items:start;min-height:98px;box-sizing:border-box}
.launch-dashboard--compact .launch-card--recent>.launch-card__preview{grid-column:1;grid-row:1 / 3}
.launch-dashboard--compact .launch-card--recent>.launch-card__copy{grid-column:2;grid-row:1;align-self:start;align-content:start}
.resume-revision-date{grid-column:2 / -1;grid-row:2;align-self:end;padding-right:58px;min-width:0;font-size:11px;line-height:1.45;color:var(--color-text-secondary);pointer-events:none}
.resume-version-marker{position:absolute;right:0;bottom:0;padding:3px 7px;border-top:1px solid var(--color-border-subtle);border-left:1px solid var(--color-border-subtle);border-radius:6px 0 7px 0;font-size:10px;line-height:1.4;color:var(--color-text-secondary);background:var(--color-background-muted);pointer-events:none}
@media(max-width:650px){.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-columns:88px minmax(0,1fr) max-content;column-gap:12px}}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-rows:1fr;grid-template-areas:"preview content actions";min-height:106px}
.launch-dashboard--compact .launch-card--recent>.launch-card__preview{grid-area:preview}
.launch-dashboard--compact .launch-card--recent>.launch-card__copy{grid-area:content;display:flex;flex-direction:column;align-self:stretch;gap:4px;min-width:0}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-columns:112px minmax(0,1fr);grid-template-rows:1fr;grid-template-areas:"preview content";align-items:stretch;row-gap:0}
.resume-content{grid-area:content;width:100%;box-sizing:border-box;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:10px;pointer-events:none}
.resume-heading{width:100%;box-sizing:border-box;display:flex;align-items:flex-start;gap:10px;min-width:0}
.launch-dashboard--compact .resume-heading>.launch-card__copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.resume-heading>.resume-actions{position:relative;z-index:2;flex:none;pointer-events:auto;align-self:flex-start}
.resume-footer{width:100%;box-sizing:border-box;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:auto;min-width:0}
.resume-footer>.resume-revision-date{padding:0;font-size:11px;font-weight:400;line-height:1.45;color:var(--workbench-text-muted,#8394aa);text-decoration:none}
.resume-footer .resume-version-marker{position:static;flex:none;align-self:flex-end;margin-left:auto;padding:2px 6px;border:1px solid var(--color-border-subtle);border-radius:5px 0 5px 0;font-size:10px;line-height:1.4}
.resume-title-editor{position:relative;z-index:2;pointer-events:auto;display:flex;align-items:flex-start;gap:4px;min-width:0}
.resume-title-editor>.resume-title-input{flex:1;min-width:0;height:28px}
.launch-dashboard--compact .launch-card button.resume-title-action{flex:none;display:grid;place-items:center;width:28px;height:28px;padding:4px;border:1px solid var(--color-border-subtle);border-radius:4px;background:var(--color-background-muted);cursor:pointer}
.resume-title-action svg{display:block;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.launch-dashboard--compact .launch-card button.resume-title-cancel{color:#ed7777}
.launch-dashboard--compact .launch-card button.resume-title-confirm{color:#72ca90}
.launch-dashboard--compact .launch-card button.resume-title-action:hover{background:var(--color-background-surface);border-color:currentColor}
@media(max-width:650px){.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){grid-template-columns:88px minmax(0,1fr)}}
.launch-card--recent:not(.launch-card--active):hover{background:color-mix(in srgb,var(--color-background-surface) 86%,var(--color-text-secondary) 14%);border-color:color-mix(in srgb,var(--color-border-subtle) 60%,var(--color-text-secondary) 40%)}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--active):hover>.launch-card__preview{background:color-mix(in srgb,var(--color-background-muted) 84%,var(--color-text-secondary) 16%);border-color:color-mix(in srgb,var(--color-border-subtle) 50%,var(--color-text-secondary) 50%)}
.launch-dashboard--compact .launch-card--recent.launch-card--active>.launch-card__preview{border-color:#6798c7}
.experience-display-toggle{display:flex;gap:4px;flex:none}
.experience-display-toggle button{display:grid;place-items:center;width:30px;height:30px;padding:5px;border:1px solid var(--color-border-subtle);border-radius:4px;color:var(--color-text-secondary);background:transparent;cursor:pointer}
.experience-display-toggle button[aria-pressed=true]{color:var(--color-text-primary);background:var(--color-background-muted)}
.experience-display-toggle svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round}
.experience-list-controls{min-width:0;gap:8px}
@media(max-width:650px){.experience-list-controls input{width:130px}}
.resume-tag-row{min-width:0;pointer-events:auto}
.experience-tag-filter{font:inherit;font-size:12px;padding:6px;max-width:140px;color:var(--color-text-secondary);background:var(--color-background-muted);border:1px solid var(--color-border-subtle);border-radius:4px}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){height:max-content;min-height:96px;grid-template-rows:auto;align-self:start}
.launch-dashboard--compact .launch-dashboard__masonry--saved{align-items:start;grid-auto-rows:max-content}
.resume-content{min-height:0;gap:8px}
.resume-tag-row{line-height:1.4}
.resume-middle{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;width:100%;pointer-events:none}
.resume-middle>.resume-tag-row{flex:1;min-width:0}
.resume-content{gap:6px}
.launch-dashboard--compact .starter-row .launch-card{grid-template-rows:auto 34px 30px}
.launch-dashboard--compact .starter-row .launch-card__preview{position:relative;width:100%;height:auto;aspect-ratio:8 / 5;min-height:0;box-sizing:border-box;background:var(--color-background-muted);border:1px solid color-mix(in srgb,var(--color-background-muted) 80%,white 20%);border-radius:4px;overflow:hidden}
.launch-dashboard--compact .starter-row .launch-card__preview img{position:absolute;inset:0;width:100%;height:100%;padding:8px;box-sizing:border-box;object-fit:contain;background:transparent;border-radius:4px}
.launch-dashboard--compact .starter-row .launch-card--new .launch-card__new-mark{height:auto;aspect-ratio:8 / 5;box-sizing:border-box}
.launch-dashboard--compact .starter-row .launch-card--new .launch-card__new-mark{border-radius:4px;border:1px dashed color-mix(in srgb,var(--color-text-secondary) 72%,white 28%);background:color-mix(in srgb,var(--color-background-muted) 60%,#6798c7 40%)}
.launch-dashboard--compact .starter-row .launch-card__copy h3{text-align:center}
.launch-dashboard--compact .launch-card .resume-title-button,.resume-title-editor>.resume-title-input{height:32px;min-height:32px;padding:6px 0;box-sizing:border-box;border:0;line-height:20px;font-family:inherit;font-size:14px;font-weight:600;letter-spacing:normal;color:inherit;text-align:left}
.launch-dashboard--compact .launch-card .resume-title-button{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-line-clamp:unset;line-clamp:unset}
.resume-title-editor>.resume-title-input{background:transparent;box-shadow:inset 0 -1px 0 var(--color-border-subtle)}
.launch-card__action-ribbon{position:absolute;right:-29px;top:15px;z-index:2;display:block;width:112px;box-sizing:border-box;padding:3px 0;text-align:center;font-size:10px;font-weight:600;line-height:15px;letter-spacing:.02em;color:var(--color-background-surface);background:var(--color-text-secondary);box-shadow:0 1px 4px #0004;opacity:0;transform:rotate(45deg) translateY(-5px);transform-origin:center;transition:opacity .18s ease,transform .18s ease;pointer-events:none}
.resume-card-open:hover+.launch-card__action-ribbon,.resume-card-open:focus-visible+.launch-card__action-ribbon,.starter-row .launch-card:hover .launch-card__action-ribbon,.starter-row .launch-card:focus-within .launch-card__action-ribbon{opacity:1;transform:rotate(45deg) translateY(0)}
.launch-dashboard--compact .launch-card--recent>.launch-card__preview{overflow:hidden}
.launch-card--active .launch-card__action-ribbon,.launch-card--new .launch-card__action-ribbon{background:#6798c7}
.launch-card--active:hover{background:color-mix(in srgb,var(--color-background-surface) 82%,#6798c7 18%);border-color:#6798c7}
.launch-dashboard--compact .launch-card--recent.launch-card--active:hover>.launch-card__preview{background:color-mix(in srgb,var(--color-background-muted) 86%,#6798c7 14%);border-color:#89b7e2}
.starter-row .launch-card{position:relative;transition:background .18s ease,border-color .18s ease;cursor:pointer}
.launch-dashboard--compact .starter-row .launch-card:hover{background:color-mix(in srgb,var(--color-background-surface) 78%,var(--color-text-secondary) 22%);border-color:color-mix(in srgb,var(--color-border-subtle) 50%,var(--color-text-secondary) 50%)}
.launch-dashboard--compact .starter-row .launch-card:hover .launch-card__preview{border-color:color-mix(in srgb,var(--color-border-subtle) 50%,var(--color-text-secondary) 50%)}
.launch-dashboard--compact .starter-row .launch-card--new:hover{background:color-mix(in srgb,var(--color-background-surface) 72%,#6798c7 28%);border-color:#6798c7}
.launch-dashboard--compact .starter-row .launch-card--new .launch-card__new-mark{position:relative;overflow:hidden}
.starter-row .launch-card>button{position:static}
.starter-row .launch-card>button::after{content:'';position:absolute;inset:0;z-index:1;border-radius:inherit}
.launch-dashboard--compact .starter-row .launch-card>button:hover{transform:none}
@media(prefers-reduced-motion:reduce){.launch-card__action-ribbon,.starter-row .launch-card{transition:none}}
.starter-card-surface{position:relative;min-width:0}
.starter-create-overlay{position:absolute;inset:0;z-index:5;box-sizing:border-box;display:flex;align-items:center;padding:16px;border:1px solid var(--color-border-subtle);border-radius:8px;background:var(--color-background-surface);box-shadow:0 4px 16px #0004;overflow:auto}
.launch-card--recent,.starter-row .launch-card{overflow:hidden}
.launch-card__action-ribbon{left:-29px;right:auto;top:15px;z-index:4;transform:rotate(-45deg) translateY(-5px)}
.resume-card-open:hover+.launch-card__action-ribbon,.resume-card-open:focus-visible+.launch-card__action-ribbon,.starter-row .launch-card:hover .launch-card__action-ribbon,.starter-row .launch-card:focus-within .launch-card__action-ribbon{transform:rotate(-45deg) translateY(0)}
.launch-dashboard--renaming .launch-card .launch-card__action-ribbon,.launch-dashboard--busy .launch-card .launch-card__action-ribbon{opacity:0;transform:rotate(-45deg) translateY(-5px)}
.launch-card__action-ribbon{transition-delay:0s}
.resume-card-open:hover+.launch-card__action-ribbon,.resume-card-open:focus-visible+.launch-card__action-ribbon,.starter-row .launch-card:hover .launch-card__action-ribbon,.starter-row .launch-card:focus-within .launch-card__action-ribbon{transition-delay:.15s}
.launch-dashboard--renaming .launch-card .launch-card__action-ribbon,.launch-dashboard--busy .launch-card .launch-card__action-ribbon{transition-delay:0s}
@media(prefers-reduced-motion:reduce){.launch-card .launch-card__action-ribbon{transition:none;transition-delay:0s}}
.launch-dashboard--compact .starter-row .launch-card:not(.starter-more){grid-template-rows:auto 34px}
.launch-dashboard--compact .starter-row .launch-card>button.starter-card-open,.launch-dashboard--compact .starter-row .launch-card>button.starter-card-open:hover{position:absolute;inset:0;z-index:1;grid-row:auto;grid-column:auto;display:block;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:inherit;background:transparent;color:transparent;box-shadow:none;font-size:0;transform:none;cursor:pointer}
.launch-dashboard--compact .starter-row .launch-card>button.starter-card-open:focus-visible{outline:2px solid #6798c7;outline-offset:-2px}
.starter-create-overlay{padding:12px}
.starter-create-overlay{left:calc((100% + 8px) / var(--starter-count));align-items:center}
.starter-form-icon{display:block;width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.launch-dashboard--creating .launch-card .launch-card__action-ribbon{opacity:0;transition-delay:0s}

.starter-carousel,.starter-carousel-cards{display:contents}
.starter-workflow>.starter-row{grid-template-columns:calc((100% - (var(--starter-count) - 1)*8px)/var(--starter-count)) minmax(0,1fr)!important}
.starter-workflow .starter-carousel{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:8px;min-width:0}
.starter-workflow .starter-carousel-cards{display:grid;grid-template-columns:repeat(var(--carousel-count),minmax(0,1fr));gap:8px;min-width:0;align-items:stretch}
.starter-workflow .carousel-concealed{visibility:hidden;pointer-events:none}
.starter-current-experience{position:absolute;inset:0;left:calc((100% + 8px)/var(--starter-count));display:grid;min-width:0}
.starter-current-experience.current-concealed{visibility:hidden;pointer-events:none}
.starter-current-experience :global(.launch-card--recent){position:relative!important;top:auto!important;height:100%!important;min-height:0!important;box-sizing:border-box;grid-column:auto!important}
.starter-workflow .carousel-arrow{align-self:center;width:28px;padding:0;height:36px;font-size:24px}

.starter-card-surface.starter-workflow{display:grid;grid-template-columns:calc((100% - (var(--starter-count) - 1)*8px)/var(--starter-count)) minmax(0,1fr);gap:8px;align-items:stretch;grid-template-rows:minmax(0,1fr);height:140px}
.starter-workflow>.starter-row{display:contents!important}
.starter-workflow>.starter-row>.launch-card--new{grid-column:1;grid-row:1}
.starter-workflow .starter-carousel{grid-column:2;grid-row:1;min-height:0}
.starter-workflow .starter-carousel-cards{grid-template-rows:minmax(0,1fr);min-height:0}
.launch-dashboard--compact .starter-workflow .starter-carousel-cards>.launch-card--preset{grid-template-rows:minmax(0,1fr) 34px;min-height:0}
.launch-dashboard--compact .starter-workflow .starter-carousel-cards .launch-card__preview{height:100%;aspect-ratio:auto}
.launch-dashboard--compact .launch-card__preview[data-preview-kind="layout"] img{object-fit:fill}
.launch-dashboard--compact .launch-card--recent .launch-card__preview>.layout-preview{height:100%;min-height:0;box-sizing:border-box}
.starter-workflow .carousel-concealed{display:none}
.starter-workflow>.starter-current-experience{position:static;grid-column:2;grid-row:1;inset:auto}
.starter-workflow>.starter-current-experience.current-concealed{display:none}
.starter-workflow>.starter-create-overlay{position:static;grid-column:2;grid-row:1;inset:auto;z-index:auto;box-shadow:none;overflow:auto;min-height:0;align-self:stretch}
.resume-footer-actions{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0;pointer-events:auto}
.starter-header-icon{display:grid!important;place-items:center;width:32px!important;height:32px;min-width:32px;padding:6px!important}
.starter-header-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
[data-dashboard-section="presets"]>.launch-dashboard__section-heading,.saved-experiences-section>.launch-dashboard__section-heading{padding-bottom:12px;border-bottom:1px solid var(--color-border-subtle)}
[data-dashboard-section="presets"]{margin-bottom:12px;padding-bottom:16px;border-bottom:1px solid var(--color-border-subtle)}
.launch-dashboard--compact .launch-card--recent:not(.launch-card--unavailable){height:104px;min-height:104px}
.resume-content{display:grid;grid-template-rows:32px 20px 20px;align-content:space-between;gap:2px;justify-content:stretch}
.resume-middle{height:20px;overflow:hidden;align-items:center}
.resume-tag-row :global(.experience-tags){flex-wrap:nowrap;overflow:hidden}
.resume-footer{height:20px;margin-top:0;align-items:center;gap:8px}
.resume-footer-actions{height:20px;align-items:center}
.resume-footer .resume-version-marker{align-self:center}
.resume-footer>.resume-revision-date{line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.resume-tag-row,.resume-tag-row :global(.experience-tags),.resume-tag-row :global(.tag-chip),.resume-tag-row :global(.tag-count){pointer-events:none}
.section-actions-toggle{margin-left:0;width:32px;height:32px;flex:none;padding:0;font-size:20px}
.launch-dashboard__section-heading.section-heading--toggle{display:flex;align-items:center;flex-wrap:nowrap;gap:12px}
.section-heading--toggle>div:first-child{flex:1;min-width:0}
.section-heading--toggle h2{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.section-heading--toggle>.launch-dashboard__section-actions,.section-heading--toggle>.experience-list-controls{position:static;display:flex;align-items:center;flex:0 1 auto;flex-wrap:nowrap;gap:8px;min-width:0;max-width:calc(100% - 44px);padding:0;border:0;background:transparent;box-shadow:none;overflow-x:auto}
.section-heading--toggle>.section-actions-collapsed{display:none}
.section-heading--toggle>.experience-list-controls input{flex:0 1 230px;min-width:60px;height:32px}
.section-heading--toggle>.experience-list-controls select{flex:0 1 140px;min-width:60px;height:32px}
.launch-card:global(.ribbon-dismissed) .launch-card__action-ribbon{opacity:0!important;transition-delay:0s!important}
/* One interaction authority: the actual pointer target determines the ribbon. */
.launch-card--recent>.launch-card__action-ribbon{opacity:0!important;transition-delay:0s!important}
.launch-card--recent:global([data-primary-hover="true"])>.launch-card__action-ribbon{opacity:1!important;transform:rotate(-45deg) translateY(0);transition-delay:.15s!important}
.launch-card--recent:global(.ribbon-dismissed)>.launch-card__action-ribbon{opacity:0!important;transition-delay:0s!important}

/* The active entry remains in catalog order; only the separate current card is actionable. */
.launch-dashboard .launch-card--recent.launch-card--current-mirror{cursor:default;background:repeating-linear-gradient(135deg,transparent 0 7px,color-mix(in srgb,var(--color-text-secondary) 7%,transparent) 7px 9px),var(--color-background-muted)}
.launch-dashboard--compact .launch-card--current-mirror h3{height:32px;box-sizing:border-box;padding:6px 0;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.launch-card--current-mirror .resume-content,.launch-card--current-mirror>.launch-card__preview{opacity:.6}
.launch-card--current-mirror:hover>.launch-card__action-ribbon{opacity:1!important;transform:rotate(-45deg) translateY(0);transition-delay:.15s!important}

.resume-actions button.resume-more{background:transparent;border-color:transparent;box-shadow:none;color:var(--color-text-secondary);opacity:.65;transition:background .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease}
.resume-actions button.resume-more:hover,.resume-actions button.resume-more:focus-visible,.resume-actions button.resume-more[aria-expanded="true"]{background:var(--color-background-muted);border-color:var(--color-border-subtle);color:var(--color-text-primary);opacity:1}

  /* The unavailable card has no preview, so its copy occupies the first flexible column. */
  .launch-dashboard--compact .launch-card--recent.launch-card--unavailable {
    grid-template-columns: minmax(0, 1fr) auto;
  }
</style>
