<script lang="ts">
  import type {
    InMemoryShellWidgetRegistry,
    InMemoryToolRegistry,
    DesignSystemThemeSession,
    JsonObject,
    RegisteredShellWidget,
    ShellRegionId,
    ShellRegionAxis,
    ShellRegionPresentation,
    ShellRegionState,
    ShellWidgetPlacement,
    Workspace,
    WorkspaceFocus
  } from '@konitif/workbench';
  import {
    listVisibleShellRegionWidgetIds,
    resolveShellRegionAxis,
    resolveShellRegionPresentation
  } from '@konitif/workbench';
  import type { DesignSystemDiscoveryProjection } from './designSystemEntityDiscovery';
  import { getWorkbenchThemeRuntimeContext } from '../themes';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';
  import { resolveLocalizedShellWidgetDefinitionText } from '../i18n/workbenchEntityTranslations';
  import ShellRegionEmptyState from './ShellRegionEmptyState.svelte';
  import ShellWidgetHost from './ShellWidgetHost.svelte';
  import type {
    ShellRegionEmptyCandidate,
    ShellRegionEmptyPickerRequest
  } from './shellRegionWidgetPicker';
  import {
    clearShellWidgetDrag,
    hasShellWidgetDragData,
    readShellWidgetDragData,
    shellWidgetDragState,
    startShellWidgetDrag,
    updateShellWidgetDragPointer,
    writeShellWidgetDragData,
    type ShellWidgetDragState,
    type ShellWidgetDragPointer
  } from './shellWidgetDragState';

  export let regionId: ShellRegionId;
  export let region: ShellRegionState;
  export let widgetRegistry: InMemoryShellWidgetRegistry;
  export let toolRegistry: InMemoryToolRegistry;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection | null = null;
  export let designSystemThemeSession: DesignSystemThemeSession | null = null;
  export let updateToolState: ((toolInstanceId: string, nextState: JsonObject) => boolean) | null = null;
  export let contextToolId: string | null = null;
  export let contextToolIds: string[] = [];
  export let hidePanelHeaders = false;
  export let emptyStateEnabled = false;
  export let populateEnabled = false;
  export let onRemoveWidgetFromRegion: (regionId: ShellRegionId, widgetId: string) => void = () => {};
  let widgetMenu: { widgetId: string; x: number; y: number } | null = null;
  let widgetMenuButton: HTMLButtonElement | null = null;
  $: if (!populateEnabled || (widgetMenu && !region.widgetIds.includes(widgetMenu.widgetId))) widgetMenu = null;
  $: if (widgetMenu && widgetMenuButton) widgetMenuButton.focus();
  function openWidgetMenu(event: MouseEvent): void {
    if (!populateEnabled) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[role="menu"], [role="dialog"]')) return;
    const widgetId = target?.closest<HTMLElement>('[data-shell-widget-id]')?.dataset.shellWidgetId
      ?? activeWidgetEntry?.definition.id;
    if (!widgetId || !region.widgetIds.includes(widgetId)) return;
    event.preventDefault();
    event.stopPropagation();
    widgetMenu = { widgetId, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 240)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 56)) };
  }
  function dismissWidgetMenu(event: PointerEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('[data-shell-widget-menu]')) widgetMenu = null;
  }
  function removeContextWidget(): void {
    if (!populateEnabled || !widgetMenu) return;
    const widgetId = widgetMenu.widgetId;
    widgetMenu = null;
    onRemoveWidgetFromRegion(regionId, widgetId);
  }
  export let connectedShellWidgetIds: string[] = [];
  export let activeEmptyPickerRegionId: ShellRegionId | null = null;
  export let onActivateWidget: (regionId: ShellRegionId, widgetId: string) => void;
  export let onSetRegionOpen: (regionId: ShellRegionId, isOpen: boolean) => void;
  export let onMoveWidgetToRegion: (
    regionId: ShellRegionId,
    widgetId: string,
    placement?: ShellWidgetPlacement
  ) => void = () => {};
  export let onSetRegionArrangement: (
    regionId: ShellRegionId,
    presentation: ShellRegionPresentation,
    axis?: ShellRegionAxis
  ) => void = () => {};
  export let onOpenEmptyRegionPicker: (request: ShellRegionEmptyPickerRequest) => void = () => {};
  export let onRefreshEmptyRegionPickerCandidates: (
    regionId: ShellRegionId,
    candidates: ShellRegionEmptyCandidate[]
  ) => void = () => {};

  export let onSetRegionWidgetProportions: (regionId: ShellRegionId, proportions: Record<string, number>) => void = () => {};
  let widgetProportions: Record<string, number> = {};
  $: widgetProportions = region.widgetProportions ?? {};
  $: widgetTrackStyle = renderedWidgetEntries.length > 1 && regionPresentation === 'stack'
    ? `grid-template-${regionAxis === 'horizontal' ? 'columns' : 'rows'}: ${renderedWidgetEntries.map(entry => `minmax(0, ${widgetProportions[entry.definition.id] ?? 1}fr)`).join(' ')}${shouldRenderAppendRegion ? ' 3.5rem' : ''};`
    : '';

  function resizeWidgetBoundary(event: PointerEvent, index: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget as HTMLElement;
    const nextSlot = handle.parentElement!;
    const previousSlot = nextSlot.previousElementSibling as HTMLElement | null;
    if (!previousSlot) return;
    const horizontal = regionAxis === 'horizontal';
    const previousSize = horizontal ? previousSlot.clientWidth : previousSlot.clientHeight;
    const nextSize = horizontal ? nextSlot.clientWidth : nextSlot.clientHeight;
    const total = previousSize + nextSize;
    if (total <= 0) return;
    const previousId = renderedWidgetEntries[index - 1].definition.id;
    const nextId = renderedWidgetEntries[index].definition.id;
    const totalWeight = (widgetProportions[previousId] ?? 1) + (widgetProportions[nextId] ?? 1);
    const start = horizontal ? event.clientX : event.clientY;
    const minimum = Math.min(64, total / 3);
    handle.setPointerCapture(event.pointerId);
    const move = (current: PointerEvent) => {
      if (current.pointerId !== event.pointerId) return;
      const delta = (horizontal ? current.clientX : current.clientY) - start;
      const size = Math.max(minimum, Math.min(total - minimum, previousSize + delta));
      widgetProportions = { ...widgetProportions, [previousId]: totalWeight * size / total, [nextId]: totalWeight * (total - size) / total };
    };
    const end = (current: PointerEvent) => {
      if (current.pointerId !== event.pointerId) return;
      onSetRegionWidgetProportions(regionId, widgetProportions);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      handle.removeEventListener('lostpointercapture', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  }

  function resizeWidgetBoundaryByKey(event: KeyboardEvent, index: number) {
    const decrement = regionAxis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const increment = regionAxis === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    if (event.key !== decrement && event.key !== increment) return;
    event.preventDefault();
    const previousId = renderedWidgetEntries[index - 1].definition.id;
    const nextId = renderedWidgetEntries[index].definition.id;
    const previous = widgetProportions[previousId] ?? 1;
    const next = widgetProportions[nextId] ?? 1;
    const total = previous + next;
    const adjusted = Math.max(total * 0.1, Math.min(total * 0.9, previous + (event.key === increment ? 1 : -1) * total * 0.05));
    widgetProportions = { ...widgetProportions, [previousId]: adjusted, [nextId]: total - adjusted };
    onSetRegionWidgetProportions(regionId, widgetProportions);
  }

  const i18nT = getWorkbenchTranslator();
  let isWidgetDragOver = false;
  let widgetDropPlacement: ShellWidgetPlacement | null = null;
  let invisibleWidgetDragImage: HTMLCanvasElement | null = null;
  let lastPublishedEmptyCandidateSignature = '';
  const themeRuntimeContext = getWorkbenchThemeRuntimeContext();
  $: ThemeSurfaceFrame = themeRuntimeContext.getRuntime().SurfaceFrame;
  $: activeToolInstance = focus.activeToolInstanceId ? workspace.toolInstances[focus.activeToolInstanceId] : null;
  $: activeToolId = activeToolInstance?.toolId ?? contextToolId ?? null;
  $: availableToolIds = resolveAvailableToolIds(workspace, activeToolId, contextToolIds);
  $: connectedShellWidgetIdSet = new Set([...connectedShellWidgetIds, ...region.widgetIds]);
  $: visibleWidgetIds = listVisibleShellRegionWidgetIds(region);
  $: allWidgetEntries = visibleWidgetIds.flatMap((widgetId) => {
    const entry = widgetRegistry.get(widgetId);
    return entry
      ? [
          {
            ...entry,
            text: resolveLocalizedShellWidgetDefinitionText($i18nT, entry.definition)
          }
        ]
      : [];
  });
  $: availableWidgetEntries = allWidgetEntries.filter((entry) =>
    entry.definition.scope !== 'contextual' ||
    hasAvailableWidgetContext(entry.definition.contextToolIds, availableToolIds)
  );
  $: shouldPreferEmptyRegion = emptyStateEnabled || populateEnabled;
  $: realWidgetEntries = availableWidgetEntries.filter((entry) => !isPlaceholderShellWidget(entry.definition.id, entry.definition.title));
  $: widgetEntries = realWidgetEntries.length > 0
    ? realWidgetEntries
    : shouldPreferEmptyRegion
      ? []
      : availableWidgetEntries;
  $: activeWidgetEntry =
    (region.activeWidgetId
      ? widgetEntries.find((entry) => entry.definition.id === region.activeWidgetId)
      : undefined) ?? widgetEntries[0] ?? null;
  $: regionPresentation = resolveShellRegionPresentation(region);
  $: regionAxis = resolveShellRegionAxis(region);
  $: renderedWidgetEntries = regionPresentation === 'stack'
    ? widgetEntries
    : activeWidgetEntry
      ? [activeWidgetEntry]
      : [];
  $: lastRenderedWidgetEntry = renderedWidgetEntries[renderedWidgetEntries.length - 1] ?? null;
  $: shouldHidePanelHeader =
    hidePanelHeaders ||
    regionId === 'left' ||
    regionId === 'right' ||
    activeWidgetEntry?.definition.hidePanelHeader === true;
  $: shouldRenderWidgetRail = regionPresentation === 'tabs' && widgetEntries.length > 1;
  $: shouldRenderArrangementControl = populateEnabled && widgetEntries.length > 1;
  $: emptyRegionCandidateEntries = listCandidateShellWidgets()
    .filter((entry) => !isPlaceholderShellWidget(entry.definition.id, entry.definition.title))
    .sort((left, right) => compareShellWidgetCandidateEntries(left, right, availableToolIds, regionId))
    .flatMap((entry): ShellRegionEmptyCandidate[] => {
      const text = resolveLocalizedShellWidgetDefinitionText($i18nT, entry.definition);
      const contextAvailable = isWidgetContextAvailable(entry.definition.scope, entry.definition.contextToolIds, availableToolIds);
      const alreadyConnected = connectedShellWidgetIdSet.has(entry.definition.id);

      if (!contextAvailable) {
        return [
          {
            id: entry.definition.id,
            title: text.title,
            description: text.description,
            icon: entry.definition.icon,
            relevance: 'unavailable',
            reason: $i18nT('ui.shell.shellRegion.empty.unavailableReason.context', {
              default: 'Requires another active tool context.'
            })
          }
        ];
      }

      if (alreadyConnected) {
        return [];
      }

      return [
        {
          id: entry.definition.id,
          title: text.title,
          description: text.description,
          icon: entry.definition.icon,
          relevance: isContextualShellWidgetAvailable(entry.definition.scope, entry.definition.contextToolIds, availableToolIds)
            ? 'contextual'
            : 'available'
        }
      ];
    });
  $: shouldRenderEmptyRegion = (emptyStateEnabled || populateEnabled) && region.isOpen && !activeWidgetEntry;
  $: shouldRenderAppendRegion =
    populateEnabled && region.isOpen && renderedWidgetEntries.length > 0;
  $: emptyRegionCandidateSignature = createEmptyRegionCandidateSignature(emptyRegionCandidateEntries);
  $: if (activeEmptyPickerRegionId === regionId) {
    publishEmptyRegionCandidateRefresh(emptyRegionCandidateSignature, emptyRegionCandidateEntries);
  } else if (lastPublishedEmptyCandidateSignature) {
    lastPublishedEmptyCandidateSignature = '';
  }
  $: shouldRenderRegion = region.isVisible && (realWidgetEntries.length > 0 || shouldRenderEmptyRegion);
  $: draggedShellWidgetState = $shellWidgetDragState;
  $: draggedShellWidgetEntry = draggedShellWidgetState ? widgetRegistry.get(draggedShellWidgetState.widgetId) : null;
  $: isWidgetDropSourceRegion = draggedShellWidgetState?.sourceRegionId === regionId;
  $: isCompatibleWidgetDropRegion = isShellWidgetDropCompatible(draggedShellWidgetState, draggedShellWidgetEntry, availableToolIds, populateEnabled);
  $: isPreferredWidgetDropRegion = isCompatibleWidgetDropRegion && draggedShellWidgetEntry?.definition.defaultRegion === regionId;
  $: isEmptyWidgetDropRegion = widgetEntries.length === 0;
  $: widgetDropBeforeId = widgetDropPlacement?.beforeWidgetId ?? null;
  $: widgetDropAfterId = widgetDropPlacement?.afterWidgetId ?? null;
  $: isWidgetAxisDropBefore = Boolean(widgetDropBeforeId);
  $: isWidgetAxisDropAfter = Boolean(widgetDropAfterId);
  $: panelSizeStyle =
    regionId === 'bottom' ? `height: ${region.size}px;` : `width: ${region.size}px;`;
  $: regionSizeStyle =
    regionId === 'bottom'
      ? panelSizeStyle
      : `--shell-region-panel-size: ${region.size}px; --shell-region-rail-width: ${
          shouldRenderWidgetRail ? 'calc(var(--size-icon-button) + var(--space-8))' : '0px'
        };`;

  function activateWidget(widgetId: string): void {
    if (regionPresentation === 'stack') {
      if (region.activeWidgetId !== widgetId || !region.isOpen) {
        onActivateWidget(regionId, widgetId);
      }

      return;
    }

    if (region.activeWidgetId === widgetId && region.isOpen) {
      if (regionId === 'bottom' && shouldRenderWidgetRail) {
        return;
      }

      onSetRegionOpen(regionId, false);
      return;
    }

    onActivateWidget(regionId, widgetId);
  }

  function focusStackedWidget(widgetId: string): void {
    if (regionPresentation === 'stack' && region.activeWidgetId !== widgetId) {
      onActivateWidget(regionId, widgetId);
    }
  }

  function toggleRegionArrangement(): void {
    const presentation: ShellRegionPresentation = regionPresentation === 'tabs' ? 'stack' : 'tabs';
    const axis: ShellRegionAxis = regionId === 'bottom' ? 'horizontal' : 'vertical';
    onSetRegionArrangement(regionId, presentation, axis);
  }

  function resolveArrangementActionLabel(): string {
    return regionPresentation === 'tabs'
      ? $i18nT('ui.shell.shellRegion.arrangement.stack', { default: 'Stack widgets' })
      : $i18nT('ui.shell.shellRegion.arrangement.tabs', { default: 'Show widget tabs' });
  }

  function resolveEmptyRegionIcon(nextRegionId: ShellRegionId): string {
    if (nextRegionId === 'bottom') {
      return 'layout.panel-bottom';
    }

    return nextRegionId === 'left' ? 'layout.sidebar-left' : 'layout.sidebar-right';
  }

  function resolveShellRegionAriaLabel(
    nextRegionId: ShellRegionId,
    translate: WorkbenchTranslate
  ): string {
    if (nextRegionId === 'left') {
      return translate('ui.shell.shellRegion.left.ariaLabel', { default: 'Left sidebar widgets' });
    }

    if (nextRegionId === 'right') {
      return translate('ui.shell.shellRegion.right.ariaLabel', { default: 'Right sidebar widgets' });
    }

    return translate('ui.shell.shellRegion.bottom.ariaLabel', { default: 'Bottom panel widgets' });
  }

  function isPlaceholderShellWidget(widgetId: string, title: string): boolean {
    return widgetId.endsWith('.empty') || title.toLowerCase().endsWith(' region');
  }

  function listShellWidgetsByRegion(nextRegionId: ShellRegionId): RegisteredShellWidget[] {
    const registry = widgetRegistry as InMemoryShellWidgetRegistry & {
      listByRegion?: (regionId: ShellRegionId) => RegisteredShellWidget[];
    };

    return typeof registry.listByRegion === 'function'
      ? registry.listByRegion(nextRegionId)
      : [];
  }

  function listCandidateShellWidgets(): RegisteredShellWidget[] {
    const registry = widgetRegistry as InMemoryShellWidgetRegistry & {
      list?: () => Array<{ id: string }>;
    };

    if (typeof registry.list !== 'function') {
      return listShellWidgetsByRegion(regionId);
    }

    return registry.list().flatMap((definition) => {
      const entry = widgetRegistry.get(definition.id);
      return entry ? [entry] : [];
    });
  }

  function isShellWidgetConnected(widgetId: string): boolean {
    return connectedShellWidgetIdSet.has(widgetId);
  }

  function isWidgetContextAvailable(scope: string, contextToolIds: string[] | undefined, toolIds: Set<string>): boolean {
    return scope !== 'contextual' || hasAvailableWidgetContext(contextToolIds, toolIds);
  }

  function isContextualShellWidgetAvailable(scope: string, contextToolIds: string[] | undefined, toolIds: Set<string>): boolean {
    return scope === 'contextual' && hasAvailableWidgetContext(contextToolIds, toolIds);
  }

  function hasAvailableWidgetContext(contextToolIds: string[] | undefined, toolIds: Set<string>): boolean {
    return !contextToolIds?.length || contextToolIds.some((toolId) => toolIds.has(toolId));
  }

  function resolveAvailableToolIds(
    nextWorkspace: Workspace,
    preferredToolId: string | null,
    contextualToolIds: string[]
  ): Set<string> {
    const toolIds = new Set<string>();

    if (preferredToolId) {
      toolIds.add(preferredToolId);
    }

    for (const toolId of contextualToolIds) {
      toolIds.add(toolId);
    }

    for (const toolInstance of Object.values(nextWorkspace.toolInstances)) {
      toolIds.add(toolInstance.toolId);
    }

    return toolIds;
  }

  function compareShellWidgetCandidateEntries(left: RegisteredShellWidget, right: RegisteredShellWidget, toolIds: Set<string>, preferredRegionId: ShellRegionId): number {
    const leftContextual = isContextualShellWidgetAvailable(left.definition.scope, left.definition.contextToolIds, toolIds);
    const rightContextual = isContextualShellWidgetAvailable(right.definition.scope, right.definition.contextToolIds, toolIds);

    if (leftContextual !== rightContextual) {
      return leftContextual ? -1 : 1;
    }

    const leftPreferredRegion = left.definition.defaultRegion === preferredRegionId;
    const rightPreferredRegion = right.definition.defaultRegion === preferredRegionId;

    if (leftPreferredRegion !== rightPreferredRegion) {
      return leftPreferredRegion ? -1 : 1;
    }

    return left.definition.title.localeCompare(right.definition.title, undefined, {
      sensitivity: 'base'
    });
  }

  function createEmptyRegionCandidateSignature(candidates: ShellRegionEmptyCandidate[]): string {
    return candidates
      .map((candidate) =>
        [
          candidate.id,
          candidate.relevance,
          candidate.title,
          candidate.description,
          candidate.reason ?? ''
        ].join('\u001f')
      )
      .join('\u001e');
  }

  function publishEmptyRegionCandidateRefresh(
    signature: string,
    candidates: ShellRegionEmptyCandidate[]
  ): void {
    if (signature === lastPublishedEmptyCandidateSignature) {
      return;
    }

    lastPublishedEmptyCandidateSignature = signature;
    onRefreshEmptyRegionPickerCandidates(regionId, candidates);
  }

  function startWidgetDrag(event: DragEvent, widgetId: string): void {
    if (!populateEnabled || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    writeShellWidgetDragData(event.dataTransfer, JSON.stringify({ regionId, widgetId }));
    event.dataTransfer.setData('text/plain', widgetId);
    setInvisibleWidgetDragImage(event.dataTransfer);
    startShellWidgetDrag({
      sourceRegionId: regionId,
      widgetId,
      pointer: resolveDragPointer(event)
    });
    setShellWidgetDragActive(true);
  }

  function endWidgetDrag(): void {
    isWidgetDragOver = false;
    widgetDropPlacement = null;
    clearShellWidgetDrag();
    setShellWidgetDragActive(false);
    setShellWidgetDropHoverActive(false);
  }

  function handleWidgetDragEnter(event: DragEvent): void {
    if (!isCompatibleWidgetDropRegion || !hasShellWidgetDragPayload(event)) {
      return;
    }

    updateShellWidgetDragPointer(resolveDragPointer(event));
    widgetDropPlacement = resolveRegionDropPlacement(event);
    isWidgetDragOver = true;
    setShellWidgetDropHoverActive(true);
  }

  function handleWidgetDragOver(event: DragEvent): void {
    if (!isCompatibleWidgetDropRegion || !hasShellWidgetDragPayload(event)) {
      return;
    }

    event.preventDefault();
    updateShellWidgetDragPointer(resolveDragPointer(event));
    widgetDropPlacement = resolveRegionDropPlacement(event);
    isWidgetDragOver = true;
    setShellWidgetDropHoverActive(true);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleWidgetDragLeave(event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const nextTarget = event.relatedTarget as Node | null;

    if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) {
      return;
    }

    isWidgetDragOver = false;
    widgetDropPlacement = null;
    setShellWidgetDropHoverActive(false);
  }

  function handleWidgetTabDragEnter(event: DragEvent, targetWidgetId: string): void {
    if (!isCompatibleWidgetDropRegion || !hasShellWidgetDragPayload(event)) {
      return;
    }

    event.stopPropagation();
    updateShellWidgetDragPointer(resolveDragPointer(event));
    widgetDropPlacement = resolveWidgetTabDropPlacement(event, targetWidgetId);
    isWidgetDragOver = true;
    setShellWidgetDropHoverActive(true);
  }

  function handleWidgetTabDragOver(event: DragEvent, targetWidgetId: string): void {
    if (!isCompatibleWidgetDropRegion || !hasShellWidgetDragPayload(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateShellWidgetDragPointer(resolveDragPointer(event));
    widgetDropPlacement = resolveWidgetTabDropPlacement(event, targetWidgetId);
    isWidgetDragOver = true;
    setShellWidgetDropHoverActive(true);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function dropWidgetIntoRegion(event: DragEvent, placement: ShellWidgetPlacement | null = widgetDropPlacement): void {
    if (!populateEnabled || !event.dataTransfer) {
      return;
    }

    const widgetId = readShellWidgetDragPayload(event);

    if (!widgetId || !isCompatibleWidgetDropRegion) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateShellWidgetDragPointer(resolveDragPointer(event));
    const nextPlacement = placement ?? resolveRegionDropPlacement(event);
    endWidgetDrag();
    onMoveWidgetToRegion(regionId, widgetId, nextPlacement);
  }

  function resolveDragPointer(event: DragEvent): ShellWidgetDragPointer | null {
    const { clientX, clientY } = event;

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    return { x: clientX, y: clientY };
  }

  function setShellWidgetDragActive(active: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.toggleAttribute('data-shell-widget-dragging', active);
  }

  function setShellWidgetDropHoverActive(active: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.toggleAttribute('data-shell-widget-drop-hover', active);
  }

  function setInvisibleWidgetDragImage(dataTransfer: DataTransfer): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!invisibleWidgetDragImage) {
      invisibleWidgetDragImage = document.createElement('canvas');
      invisibleWidgetDragImage.width = 1;
      invisibleWidgetDragImage.height = 1;
      invisibleWidgetDragImage.style.position = 'fixed';
      invisibleWidgetDragImage.style.left = '-1000px';
      invisibleWidgetDragImage.style.top = '-1000px';
      invisibleWidgetDragImage.style.width = '1px';
      invisibleWidgetDragImage.style.height = '1px';
      invisibleWidgetDragImage.style.opacity = '0';
      invisibleWidgetDragImage.style.pointerEvents = 'none';
      document.body.appendChild(invisibleWidgetDragImage);
    }

    dataTransfer.setDragImage(invisibleWidgetDragImage, 0, 0);
  }

  function resolveWidgetTabDropPlacement(event: DragEvent, targetWidgetId: string): ShellWidgetPlacement {
    const currentTarget = event.currentTarget as HTMLElement | null;

    if (!currentTarget) {
      return { afterWidgetId: targetWidgetId };
    }

    const rect = currentTarget.getBoundingClientRect();

    if (regionAxis === 'horizontal') {
      const midpointX = rect.left + rect.width / 2;
      return event.clientX <= midpointX
        ? { beforeWidgetId: targetWidgetId }
        : { afterWidgetId: targetWidgetId };
    }

    const midpointY = rect.top + rect.height / 2;
    return event.clientY <= midpointY
      ? { beforeWidgetId: targetWidgetId }
      : { afterWidgetId: targetWidgetId };
  }

  function resolveRegionDropPlacement(event: DragEvent): ShellWidgetPlacement {
    if (widgetEntries.length === 0) {
      return {};
    }

    const currentTarget = event.currentTarget as HTMLElement | null;
    const firstWidgetId = widgetEntries[0]?.definition.id;
    const lastWidgetId = widgetEntries[widgetEntries.length - 1]?.definition.id;

    if (!currentTarget || !firstWidgetId || !lastWidgetId) {
      return {};
    }

    const rect = currentTarget.getBoundingClientRect();

    if (regionAxis === 'horizontal') {
      const midpointX = rect.left + rect.width / 2;
      return event.clientX <= midpointX
        ? { beforeWidgetId: firstWidgetId }
        : { afterWidgetId: lastWidgetId };
    }

    const midpointY = rect.top + rect.height / 2;
    return event.clientY <= midpointY
      ? { beforeWidgetId: firstWidgetId }
      : { afterWidgetId: lastWidgetId };
  }

  function resolveAppendWidgetPlacement(widgetId: string | undefined): ShellWidgetPlacement {
    return widgetId ? { afterWidgetId: widgetId } : {};
  }

  function hasShellWidgetDragPayload(event: DragEvent): boolean {
    return hasShellWidgetDragData(event.dataTransfer);
  }

  function isShellWidgetDropCompatible(
    dragState: ShellWidgetDragState | null,
    entry: RegisteredShellWidget | null | undefined,
    toolIds: Set<string>,
    canPopulate: boolean
  ): boolean {
    return Boolean(
      canPopulate &&
      dragState &&
      entry &&
      isWidgetContextAvailable(entry.definition.scope, entry.definition.contextToolIds, toolIds)
    );
  }

  function readShellWidgetDragPayload(event: DragEvent): string | null {
    const rawPayload = readShellWidgetDragData(event.dataTransfer);

    if (!rawPayload) {
      return null;
    }

    try {
      const payload = JSON.parse(rawPayload) as { widgetId?: unknown };
      return typeof payload.widgetId === 'string' ? payload.widgetId : null;
    } catch {
      return null;
    }
  }
</script>

<svelte:window on:pointerdown={dismissWidgetMenu} on:keydown={(event) => { if (event.key === 'Escape') widgetMenu = null; }} />

{#if widgetMenu}
  <div class="shell-widget-menu" role="menu" data-shell-widget-menu data-workbench-context-menu="true"
    style={`left:${widgetMenu.x}px;top:${widgetMenu.y}px`}>
    <button bind:this={widgetMenuButton} type="button" role="menuitem" on:click={removeContextWidget}>
      <WorkbenchIcon icon="action.close" label="" />
      {$i18nT('ui.shell.shellRegion.widget.remove', { default: 'Remove widget from sidebar' })}
    </button>
  </div>
{/if}

{#if shouldRenderRegion}
  <section
    class:shell-region--open={region.isOpen}
    class:shell-region--bottom={regionId === 'bottom'}
    class:shell-region--headers-hidden={shouldHidePanelHeader}
    class:shell-region--left={regionId === 'left'}
    class:shell-region--right={regionId === 'right'}
    class:shell-region--widget-drop-enabled={populateEnabled}
    class:shell-region--widget-drop-source={isWidgetDropSourceRegion}
    class:shell-region--widget-drop-compatible={isCompatibleWidgetDropRegion}
    class:shell-region--widget-drop-empty={isEmptyWidgetDropRegion}
    class:shell-region--widget-drop-preferred={isPreferredWidgetDropRegion}
    class:shell-region--widget-drop-hover={isWidgetDragOver}
    class="shell-region"
    on:contextmenu|capture={openWidgetMenu}
    aria-label={resolveShellRegionAriaLabel(regionId, $i18nT)}
    style={regionSizeStyle}
    on:dragenter={handleWidgetDragEnter}
    on:dragover={handleWidgetDragOver}
    on:dragleave={handleWidgetDragLeave}
    on:drop={dropWidgetIntoRegion}
  >
    {#if isCompatibleWidgetDropRegion}
      <div
        class:shell-region__dock-preview--bottom={regionId === 'bottom'}
        class:shell-region__dock-preview--vertical={regionId !== 'bottom'}
        class:shell-region__dock-preview--active={isWidgetDragOver}
        class:shell-region__dock-preview--empty={isEmptyWidgetDropRegion}
        class:shell-region__dock-preview--before={isWidgetAxisDropBefore}
        class:shell-region__dock-preview--after={isWidgetAxisDropAfter}
        class="shell-region__dock-preview"
        aria-hidden="true"
      >
        {#if isEmptyWidgetDropRegion}
          <span class="shell-region__dock-segment shell-region__dock-segment--empty"></span>
        {:else}
          <span class="shell-region__dock-segment shell-region__dock-segment--before"></span>
          <span class="shell-region__dock-segment shell-region__dock-segment--after"></span>
        {/if}
      </div>
    {/if}

    {#if !shouldRenderWidgetRail && shouldRenderArrangementControl}
      <button
        type="button"
        class="shell-region__arrangement-toggle shell-region__arrangement-toggle--stack"
        aria-label={resolveArrangementActionLabel()}
        title={resolveArrangementActionLabel()}
        on:click={toggleRegionArrangement}
      >
        <WorkbenchIcon icon="action.command" label="" />
      </button>
    {/if}

    {#if regionId === 'left'}
      {#if shouldRenderWidgetRail}
        <div class="shell-region__rail" aria-label={$i18nT('ui.shell.shellRegion.left.ariaLabel', { default: 'Left sidebar widgets' })}>
          <div class="shell-region__rail-tabs" role="tablist">
            {#each widgetEntries as entry (entry.definition.id)}
              <button
                type="button"
                role="tab"
                aria-selected={entry.definition.id === activeWidgetEntry?.definition.id}
                class:shell-region__tab--active={entry.definition.id === activeWidgetEntry?.definition.id}
                class:shell-region__tab--drop-before={widgetDropBeforeId === entry.definition.id}
                class:shell-region__tab--drop-after={widgetDropAfterId === entry.definition.id}
                class="shell-region__tab"
                draggable={populateEnabled}
                title={entry.text.title}
                on:click={() => activateWidget(entry.definition.id)}
                on:dragstart={(event) => startWidgetDrag(event, entry.definition.id)}
                on:dragenter={(event) => handleWidgetTabDragEnter(event, entry.definition.id)}
                on:dragover={(event) => handleWidgetTabDragOver(event, entry.definition.id)}
                on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                on:dragend={endWidgetDrag}
              >
                <span class="shell-region__tab-icon">
                  <WorkbenchIcon icon={entry.definition.icon ?? entry.text.title.slice(0, 1)} label={entry.text.title} />
                </span>
              </button>
            {/each}
          </div>
          {#if shouldRenderArrangementControl}
            <button
              type="button"
              class="shell-region__arrangement-toggle"
              aria-label={resolveArrangementActionLabel()}
              title={resolveArrangementActionLabel()}
              on:click={toggleRegionArrangement}
            >
              <WorkbenchIcon icon={regionPresentation === 'tabs' ? 'layout.panel-stack' : 'action.command'} label="" />
            </button>
          {/if}
        </div>
      {/if}

      {#if region.isOpen && (activeWidgetEntry || shouldRenderEmptyRegion)}
        <svelte:component
          this={ThemeSurfaceFrame}
          id={`shell.region.${regionId}`}
          role="panel"
          depth="panel"
          focusStrength={0.78}
          class="shell-region__panel"
          style={panelSizeStyle}
        >
          {#if !shouldHidePanelHeader}
          <header class="shell-region__panel-header">
            <span class="shell-region__panel-heading">
              <span class="shell-region__panel-icon" aria-hidden="true">
                {#if activeWidgetEntry}
                  <WorkbenchIcon icon={activeWidgetEntry.definition.icon ?? activeWidgetEntry.text.title.slice(0, 1)} label={activeWidgetEntry.text.title} />
                {:else}
                  <WorkbenchIcon icon={resolveEmptyRegionIcon(regionId)} label={$i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })} />
                {/if}
              </span>
              <span class="shell-region__panel-title">
                {activeWidgetEntry?.text.title ?? $i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })}
              </span>
            </span>
          </header>
          {/if}

          <div class="shell-region__panel-body">
            {#if renderedWidgetEntries.length > 0}
              <div
                class:shell-region__widget-stack--horizontal={regionAxis === 'horizontal'}
                class:shell-region__widget-stack--vertical={regionAxis === 'vertical'}
                class:shell-region__widget-stack--multiple={renderedWidgetEntries.length > 1}
                class="shell-region__widget-stack"
                style={widgetTrackStyle}
              >
                {#each renderedWidgetEntries as renderedWidgetEntry, widgetIndex (renderedWidgetEntry.definition.id)}
                <div
                  class:shell-region__widget-slot--drop-before={widgetDropBeforeId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--drop-after={widgetDropAfterId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--active={renderedWidgetEntry.definition.id === activeWidgetEntry?.definition.id}
                  class="shell-region__widget-slot"
                  data-shell-widget-id={renderedWidgetEntry.definition.id}
                  role="group"
                  on:pointerdown={() => focusStackedWidget(renderedWidgetEntry.definition.id)}
                  on:dragenter={(event) => handleWidgetTabDragEnter(event, renderedWidgetEntry.definition.id)}
                  on:dragover={(event) => handleWidgetTabDragOver(event, renderedWidgetEntry.definition.id)}
                  on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                >
                  {#if regionPresentation === 'stack' && widgetIndex > 0}
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                      class="shell-region__widget-separator"
                      class:shell-region__widget-separator--horizontal={regionAxis === 'horizontal'}
                      role="separator"
                      tabindex="0"
                      aria-orientation={regionAxis === 'horizontal' ? 'vertical' : 'horizontal'}
                      aria-label={`${renderedWidgetEntries[widgetIndex - 1].text.title} / ${renderedWidgetEntry.text.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(100 * (widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) / ((widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) + (widgetProportions[renderedWidgetEntry.definition.id] ?? 1)))}
                      on:pointerdown={(event) => resizeWidgetBoundary(event, widgetIndex)}
                      on:keydown={(event) => resizeWidgetBoundaryByKey(event, widgetIndex)}
                    ></div>
                  {/if}
                  {#if populateEnabled}
                    <button
                      type="button"
                      draggable={true}
                      class="shell-region__widget-move-handle"
                      aria-label={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      title={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      on:dragstart={(event) => startWidgetDrag(event, renderedWidgetEntry.definition.id)}
                      on:dragend={endWidgetDrag}
                    >
                      <WorkbenchIcon icon="action.grip" label="" />
                    </button>
                  {/if}
                  <ShellWidgetHost
                    {regionId}
                    widgetId={renderedWidgetEntry.definition.id}
                    {widgetRegistry}
                    {toolRegistry}
                    {workspace}
                    {focus}
                    {designSystemDiscoveryProjection}
                    {designSystemThemeSession}
                    {updateToolState}
                  />
                </div>
                {/each}
                {#if shouldRenderAppendRegion}
                  <ShellRegionEmptyState
                    {regionId}
                    variant="append"
                    placement={resolveAppendWidgetPlacement(lastRenderedWidgetEntry?.definition.id)}
                    candidates={emptyRegionCandidateEntries}
                    isPickerOpen={activeEmptyPickerRegionId === regionId}
                    onOpenPicker={onOpenEmptyRegionPicker}
                  />
                {/if}
              </div>
            {:else}
              <ShellRegionEmptyState
                {regionId}
                candidates={populateEnabled ? emptyRegionCandidateEntries : []}
                isPickerOpen={activeEmptyPickerRegionId === regionId}
                onOpenPicker={onOpenEmptyRegionPicker}
              />
            {/if}
          </div>
        </svelte:component>
      {/if}
    {:else if regionId === 'right'}
      {#if region.isOpen && (activeWidgetEntry || shouldRenderEmptyRegion)}
        <svelte:component
          this={ThemeSurfaceFrame}
          id={`shell.region.${regionId}`}
          role="panel"
          depth="panel"
          focusStrength={0.78}
          class="shell-region__panel"
          style={panelSizeStyle}
        >
          {#if !shouldHidePanelHeader}
          <header class="shell-region__panel-header">
            <span class="shell-region__panel-heading">
              <span class="shell-region__panel-icon" aria-hidden="true">
                {#if activeWidgetEntry}
                  <WorkbenchIcon icon={activeWidgetEntry.definition.icon ?? activeWidgetEntry.text.title.slice(0, 1)} label={activeWidgetEntry.text.title} />
                {:else}
                  <WorkbenchIcon icon={resolveEmptyRegionIcon(regionId)} label={$i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })} />
                {/if}
              </span>
              <span class="shell-region__panel-title">
                {activeWidgetEntry?.text.title ?? $i18nT('ui.shell.shellRegion.empty.title', { default: 'Add a widget' })}
              </span>
            </span>
          </header>
          {/if}

          <div class="shell-region__panel-body">
            {#if renderedWidgetEntries.length > 0}
              <div
                class:shell-region__widget-stack--horizontal={regionAxis === 'horizontal'}
                class:shell-region__widget-stack--vertical={regionAxis === 'vertical'}
                class:shell-region__widget-stack--multiple={renderedWidgetEntries.length > 1}
                class="shell-region__widget-stack"
                style={widgetTrackStyle}
              >
                {#each renderedWidgetEntries as renderedWidgetEntry, widgetIndex (renderedWidgetEntry.definition.id)}
                <div
                  class:shell-region__widget-slot--drop-before={widgetDropBeforeId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--drop-after={widgetDropAfterId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--active={renderedWidgetEntry.definition.id === activeWidgetEntry?.definition.id}
                  class="shell-region__widget-slot"
                  data-shell-widget-id={renderedWidgetEntry.definition.id}
                  role="group"
                  on:pointerdown={() => focusStackedWidget(renderedWidgetEntry.definition.id)}
                  on:dragenter={(event) => handleWidgetTabDragEnter(event, renderedWidgetEntry.definition.id)}
                  on:dragover={(event) => handleWidgetTabDragOver(event, renderedWidgetEntry.definition.id)}
                  on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                >
                  {#if regionPresentation === 'stack' && widgetIndex > 0}
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                      class="shell-region__widget-separator"
                      class:shell-region__widget-separator--horizontal={regionAxis === 'horizontal'}
                      role="separator"
                      tabindex="0"
                      aria-orientation={regionAxis === 'horizontal' ? 'vertical' : 'horizontal'}
                      aria-label={`${renderedWidgetEntries[widgetIndex - 1].text.title} / ${renderedWidgetEntry.text.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(100 * (widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) / ((widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) + (widgetProportions[renderedWidgetEntry.definition.id] ?? 1)))}
                      on:pointerdown={(event) => resizeWidgetBoundary(event, widgetIndex)}
                      on:keydown={(event) => resizeWidgetBoundaryByKey(event, widgetIndex)}
                    ></div>
                  {/if}
                  {#if populateEnabled}
                    <button
                      type="button"
                      draggable={true}
                      class="shell-region__widget-move-handle"
                      aria-label={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      title={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      on:dragstart={(event) => startWidgetDrag(event, renderedWidgetEntry.definition.id)}
                      on:dragend={endWidgetDrag}
                    >
                      <WorkbenchIcon icon="action.grip" label="" />
                    </button>
                  {/if}
                  <ShellWidgetHost
                    {regionId}
                    widgetId={renderedWidgetEntry.definition.id}
                    {widgetRegistry}
                    {toolRegistry}
                    {workspace}
                    {focus}
                    {designSystemDiscoveryProjection}
                    {designSystemThemeSession}
                    {updateToolState}
                  />
                </div>
                {/each}
                {#if shouldRenderAppendRegion}
                  <ShellRegionEmptyState
                    {regionId}
                    variant="append"
                    placement={resolveAppendWidgetPlacement(lastRenderedWidgetEntry?.definition.id)}
                    candidates={emptyRegionCandidateEntries}
                    isPickerOpen={activeEmptyPickerRegionId === regionId}
                    onOpenPicker={onOpenEmptyRegionPicker}
                  />
                {/if}
              </div>
            {:else}
              <ShellRegionEmptyState
                {regionId}
                candidates={populateEnabled ? emptyRegionCandidateEntries : []}
                isPickerOpen={activeEmptyPickerRegionId === regionId}
                onOpenPicker={onOpenEmptyRegionPicker}
              />
            {/if}
          </div>
        </svelte:component>
      {/if}

      {#if shouldRenderWidgetRail}
        <div class="shell-region__rail" aria-label={$i18nT('ui.shell.shellRegion.right.ariaLabel', { default: 'Right sidebar widgets' })}>
          <div class="shell-region__rail-tabs" role="tablist">
            {#each widgetEntries as entry (entry.definition.id)}
              <button
                type="button"
                role="tab"
                aria-selected={entry.definition.id === activeWidgetEntry?.definition.id}
                class:shell-region__tab--active={entry.definition.id === activeWidgetEntry?.definition.id}
                class:shell-region__tab--drop-before={widgetDropBeforeId === entry.definition.id}
                class:shell-region__tab--drop-after={widgetDropAfterId === entry.definition.id}
                class="shell-region__tab"
                draggable={populateEnabled}
                title={entry.text.title}
                on:click={() => activateWidget(entry.definition.id)}
                on:dragstart={(event) => startWidgetDrag(event, entry.definition.id)}
                on:dragenter={(event) => handleWidgetTabDragEnter(event, entry.definition.id)}
                on:dragover={(event) => handleWidgetTabDragOver(event, entry.definition.id)}
                on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                on:dragend={endWidgetDrag}
              >
                <span class="shell-region__tab-icon">
                  <WorkbenchIcon icon={entry.definition.icon ?? entry.text.title.slice(0, 1)} label={entry.text.title} />
                </span>
              </button>
            {/each}
          </div>
          {#if shouldRenderArrangementControl}
            <button
              type="button"
              class="shell-region__arrangement-toggle"
              aria-label={resolveArrangementActionLabel()}
              title={resolveArrangementActionLabel()}
              on:click={toggleRegionArrangement}
            >
              <WorkbenchIcon icon={regionPresentation === 'tabs' ? 'layout.panel-stack' : 'action.command'} label="" />
            </button>
          {/if}
        </div>
      {/if}
    {:else}
      {#if !shouldRenderWidgetRail && activeWidgetEntry && !shouldHidePanelHeader}
        <header class="shell-region__panel-header shell-region__panel-header--bottom">
          <span class="shell-region__panel-heading">
            <span class="shell-region__panel-icon" aria-hidden="true">
              <WorkbenchIcon icon={activeWidgetEntry.definition.icon ?? activeWidgetEntry.text.title.slice(0, 1)} label={activeWidgetEntry.text.title} />
            </span>
            <span class="shell-region__panel-title">{activeWidgetEntry.text.title}</span>
          </span>
        </header>
      {/if}

      {#if region.isOpen && (activeWidgetEntry || shouldRenderEmptyRegion)}
        <svelte:component
          this={ThemeSurfaceFrame}
          id={`shell.region.${regionId}`}
          role="panel"
          depth="panel"
          focusStrength={0.72}
          class="shell-region__panel shell-region__panel--bottom"
        >
          <div
            class:shell-region__panel-body--bottom={regionId === 'bottom'}
            class:shell-region__panel-body--bottom-with-tabs={shouldRenderWidgetRail}
            class="shell-region__panel-body"
          >
            {#if shouldRenderWidgetRail}
              <div class="shell-region__bottom-tabs" aria-label={$i18nT('ui.shell.shellRegion.bottom.ariaLabel', { default: 'Bottom panel widgets' })}>
                <div class="shell-region__bottom-tab-list" role="tablist">
                  {#each widgetEntries as entry (entry.definition.id)}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={entry.definition.id === activeWidgetEntry?.definition.id}
                      class:shell-region__bottom-tab--active={entry.definition.id === activeWidgetEntry?.definition.id}
                      class:shell-region__bottom-tab--drop-before={widgetDropBeforeId === entry.definition.id}
                      class:shell-region__bottom-tab--drop-after={widgetDropAfterId === entry.definition.id}
                      class="shell-region__bottom-tab"
                      draggable={populateEnabled}
                      title={entry.text.title}
                      on:click={() => activateWidget(entry.definition.id)}
                      on:dragstart={(event) => startWidgetDrag(event, entry.definition.id)}
                      on:dragenter={(event) => handleWidgetTabDragEnter(event, entry.definition.id)}
                      on:dragover={(event) => handleWidgetTabDragOver(event, entry.definition.id)}
                      on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                      on:dragend={endWidgetDrag}
                    >
                      <span class="shell-region__tab-icon">
                        <WorkbenchIcon icon={entry.definition.icon ?? entry.text.title.slice(0, 1)} label={entry.text.title} />
                      </span>
                      <span>{entry.text.title}</span>
                    </button>
                  {/each}
                </div>
                {#if shouldRenderArrangementControl}
                  <button
                    type="button"
                    class="shell-region__arrangement-toggle"
                    aria-label={resolveArrangementActionLabel()}
                    title={resolveArrangementActionLabel()}
                    on:click={toggleRegionArrangement}
                  >
                    <WorkbenchIcon icon={regionPresentation === 'tabs' ? 'layout.panel-stack' : 'action.command'} label="" />
                  </button>
                {/if}
              </div>
            {/if}
            {#if renderedWidgetEntries.length > 0}
              <div
                class:shell-region__widget-stack--with-tabs={shouldRenderWidgetRail}
                class:shell-region__widget-stack--horizontal={regionAxis === 'horizontal'}
                class:shell-region__widget-stack--vertical={regionAxis === 'vertical'}
                class:shell-region__widget-stack--multiple={renderedWidgetEntries.length > 1}
                class="shell-region__widget-stack shell-region__widget-stack--bottom"
                style={widgetTrackStyle}
              >
                {#each renderedWidgetEntries as renderedWidgetEntry, widgetIndex (renderedWidgetEntry.definition.id)}
                <div
                  class:shell-region__widget-slot--drop-before={widgetDropBeforeId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--drop-after={widgetDropAfterId === renderedWidgetEntry.definition.id}
                  class:shell-region__widget-slot--active={renderedWidgetEntry.definition.id === activeWidgetEntry?.definition.id}
                  class="shell-region__widget-slot"
                  data-shell-widget-id={renderedWidgetEntry.definition.id}
                  role="group"
                  on:pointerdown={() => focusStackedWidget(renderedWidgetEntry.definition.id)}
                  on:dragenter={(event) => handleWidgetTabDragEnter(event, renderedWidgetEntry.definition.id)}
                  on:dragover={(event) => handleWidgetTabDragOver(event, renderedWidgetEntry.definition.id)}
                  on:drop={(event) => dropWidgetIntoRegion(event, widgetDropPlacement)}
                >
                  {#if regionPresentation === 'stack' && widgetIndex > 0}
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                      class="shell-region__widget-separator"
                      class:shell-region__widget-separator--horizontal={regionAxis === 'horizontal'}
                      role="separator"
                      tabindex="0"
                      aria-orientation={regionAxis === 'horizontal' ? 'vertical' : 'horizontal'}
                      aria-label={`${renderedWidgetEntries[widgetIndex - 1].text.title} / ${renderedWidgetEntry.text.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(100 * (widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) / ((widgetProportions[renderedWidgetEntries[widgetIndex - 1].definition.id] ?? 1) + (widgetProportions[renderedWidgetEntry.definition.id] ?? 1)))}
                      on:pointerdown={(event) => resizeWidgetBoundary(event, widgetIndex)}
                      on:keydown={(event) => resizeWidgetBoundaryByKey(event, widgetIndex)}
                    ></div>
                  {/if}
                  {#if populateEnabled}
                    <button
                      type="button"
                      draggable={true}
                      class="shell-region__widget-move-handle"
                      aria-label={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      title={$i18nT('ui.shell.shellRegion.widget.moveHandle', { default: 'Move widget' })}
                      on:dragstart={(event) => startWidgetDrag(event, renderedWidgetEntry.definition.id)}
                      on:dragend={endWidgetDrag}
                    >
                      <WorkbenchIcon icon="action.grip" label="" />
                    </button>
                  {/if}
                  <ShellWidgetHost
                    {regionId}
                    widgetId={renderedWidgetEntry.definition.id}
                    {widgetRegistry}
                    {toolRegistry}
                    {workspace}
                    {focus}
                    {designSystemDiscoveryProjection}
                    {designSystemThemeSession}
                    {updateToolState}
                  />
                </div>
                {/each}
                {#if shouldRenderAppendRegion}
                  <ShellRegionEmptyState
                    {regionId}
                    variant="append"
                    placement={resolveAppendWidgetPlacement(lastRenderedWidgetEntry?.definition.id)}
                    candidates={emptyRegionCandidateEntries}
                    isPickerOpen={activeEmptyPickerRegionId === regionId}
                    onOpenPicker={onOpenEmptyRegionPicker}
                  />
                {/if}
              </div>
            {:else}
              <ShellRegionEmptyState
                {regionId}
                candidates={populateEnabled ? emptyRegionCandidateEntries : []}
                isPickerOpen={activeEmptyPickerRegionId === regionId}
                onOpenPicker={onOpenEmptyRegionPicker}
              />
            {/if}
          </div>
        </svelte:component>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .shell-widget-menu { position:fixed;z-index:1000;min-width:224px;padding:4px;border:1px solid var(--color-border-subtle);border-radius:6px;background:var(--color-background-surface);box-shadow:0 8px 24px #0006; }
  .shell-widget-menu button { display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:0;border-radius:3px;color:var(--color-text-primary);background:transparent;text-align:left;cursor:pointer; }
  .shell-widget-menu button:hover,.shell-widget-menu button:focus-visible { background:var(--color-background-elevated,var(--color-background-canvas));outline:1px solid var(--color-border-focus); }
  .shell-region {
    --shell-region-rail-width: calc(var(--size-icon-button) + var(--space-8));
    --shell-region-barber-background:
      linear-gradient(
        135deg,
        transparent 0 46%,
        color-mix(in srgb, var(--color-border-subtle) 18%, transparent) 46% 54%,
        transparent 54% 100%
      ),
      color-mix(in srgb, var(--color-background-surface) 88%, var(--color-background-muted));
    min-width: 0;
    min-height: 0;
    position: relative;
  }

  .shell-region::before {
    content: "";
    position: absolute;
    inset: var(--space-4);
    z-index: 8;
    border: 1px solid transparent;
    border-radius: var(--radius-medium);
    background: transparent;
    box-shadow: none;
    opacity: 0;
    pointer-events: none;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease,
      opacity 120ms ease;
  }

  .shell-region--left,
  .shell-region--right {
    display: flex;
    flex: 0 0 var(--shell-region-rail-width);
    min-height: 0;
    width: var(--shell-region-rail-width);
    height: 100%;
    background: var(--color-background-surface);
  }

  .shell-region--open.shell-region--left,
  .shell-region--open.shell-region--right {
    flex-basis: calc(var(--shell-region-panel-size) + var(--shell-region-rail-width));
    width: calc(var(--shell-region-panel-size) + var(--shell-region-rail-width));
  }

  .shell-region--bottom {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    position: relative;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-top: 1px solid var(--color-border-subtle);
    background: var(--color-background-surface);
  }

  .shell-region--bottom.shell-region--headers-hidden {
    grid-template-rows: minmax(0, 1fr);
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-enabled {
    opacity: 0.72;
    transition:
      box-shadow 140ms ease,
      opacity 140ms ease,
      filter 140ms ease;
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-source {
    opacity: 0.58;
    filter: saturate(0.78);
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-compatible {
    opacity: 1;
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-compatible::before {
    border-color: color-mix(in srgb, var(--color-accent-primary) 68%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 13%, transparent), transparent 56%),
      color-mix(in srgb, var(--color-accent-primary) 9%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 28%, transparent),
      inset 0 0 42px color-mix(in srgb, var(--color-accent-primary) 20%, transparent),
      0 0 24px color-mix(in srgb, var(--color-accent-primary) 14%, transparent);
    opacity: 1;
  }

  :global(html[data-shell-widget-drop-hover]) .shell-region--widget-drop-compatible:not(.shell-region--widget-drop-hover)::before {
    border-color: color-mix(in srgb, var(--color-accent-primary) 34%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 6%, transparent), transparent 58%),
      color-mix(in srgb, var(--color-accent-primary) 4%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 14%, transparent),
      inset 0 0 24px color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
    opacity: 0.52;
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-preferred {
    opacity: 1;
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-preferred::before {
    border-color: color-mix(in srgb, var(--color-accent-primary) 86%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 14%, transparent), transparent 58%),
      color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 44%, transparent),
      inset 0 0 46px color-mix(in srgb, var(--color-accent-primary) 20%, transparent),
      0 0 26px color-mix(in srgb, var(--color-accent-primary) 14%, transparent);
  }

  .shell-region--widget-drop-hover {
    opacity: 1;
    filter: none;
  }

  .shell-region--widget-drop-hover::before {
    inset: 0;
    border-color: color-mix(in srgb, var(--color-border-focus) 86%, white);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.075), rgb(255 255 255 / 0.025)),
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 26%, transparent), transparent 60%),
      color-mix(in srgb, var(--color-accent-primary) 18%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, white 28%, transparent),
      inset 0 0 76px color-mix(in srgb, var(--color-accent-primary) 34%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-focus) 28%, transparent),
      0 0 42px color-mix(in srgb, var(--color-accent-primary) 28%, transparent);
    opacity: 1;
  }

  .shell-region__dock-preview {
    position: absolute;
    inset: var(--space-8);
    z-index: 9;
    display: grid;
    gap: var(--space-4);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 120ms ease,
      gap 120ms ease;
  }

  :global(html[data-shell-widget-dragging]) .shell-region--widget-drop-compatible .shell-region__dock-preview {
    opacity: 0.62;
  }

  :global(html[data-shell-widget-drop-hover]) .shell-region--widget-drop-compatible:not(.shell-region--widget-drop-hover) .shell-region__dock-preview {
    opacity: 0.28;
  }

  .shell-region__dock-preview--active {
    gap: var(--space-6);
    opacity: 1;
  }

  .shell-region__dock-preview--vertical {
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .shell-region__dock-preview--bottom {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .shell-region__dock-preview--empty {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 0;
  }

  .shell-region__dock-preview--active.shell-region__dock-preview--empty .shell-region__dock-segment--empty {
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 82%, white 8%);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.025)),
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 20%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 20%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent) 1rem
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, white 12%, transparent),
      inset 0 0 36px color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent),
      0 0 18px color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
  }

  .shell-region__dock-segment {
    min-width: 0;
    min-height: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 42%, transparent);
    background:
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 5%, transparent) 1rem
      );
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
  }

  .shell-region__dock-preview--before .shell-region__dock-segment--before,
  .shell-region__dock-preview--after .shell-region__dock-segment--after {
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 82%, white 8%);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.025)),
      repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--color-action-primary-hover) 20%, transparent),
        color-mix(in srgb, var(--color-action-primary-hover) 20%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent) 0.5rem,
        color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent) 1rem
      );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, white 12%, transparent),
      inset 0 0 36px color-mix(in srgb, var(--color-action-primary-hover) 16%, transparent),
      0 0 18px color-mix(in srgb, var(--color-border-edge-split-hover) 12%, transparent);
  }

  .shell-region__rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 0 0 var(--shell-region-rail-width);
    gap: var(--space-4);
    width: var(--shell-region-rail-width);
    min-width: var(--shell-region-rail-width);
    padding: var(--space-6) var(--space-4);
    border-right: 1px solid var(--color-border-subtle);
    background: var(--color-background-surface);
  }

  .shell-region__rail-tabs {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .shell-region__arrangement-toggle--stack {
    position: absolute;
    right: var(--space-8);
    bottom: var(--space-8);
    z-index: 3;
  }

  .shell-region__arrangement-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: var(--size-icon-button);
    height: var(--size-icon-button);
    min-width: var(--size-icon-button);
    min-height: var(--size-icon-button);
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 84%, transparent);
    border-radius: calc(var(--radius-medium) - 2px);
    background: color-mix(in srgb, var(--color-background-elevated) 54%, transparent);
    color: var(--color-text-muted);
  }

  .shell-region__arrangement-toggle:hover,
  .shell-region__arrangement-toggle:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent-primary) 58%, var(--color-border-strong));
    background: color-mix(in srgb, var(--color-background-selected) 52%, transparent);
    color: var(--color-text-primary);
  }

  .shell-region__arrangement-toggle :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .shell-region--right .shell-region__rail {
    border-right: 0;
    border-left: 1px solid var(--color-border-subtle);
  }

  .shell-region__tab,
  .shell-region__bottom-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    min-width: 0;
    color: var(--color-text-muted);
  }

  .shell-region__tab {
    width: 100%;
    min-height: var(--size-icon-button);
    padding: 0;
    border-color: transparent;
    background: transparent;
  }

  .shell-region__tab:hover,
  .shell-region__bottom-tab:hover {
    color: var(--color-text-primary);
  }

  .shell-region__tab--active,
  .shell-region__bottom-tab--active {
    background: var(--color-background-selected);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .shell-region__tab--drop-before::before,
  .shell-region__tab--drop-after::after {
    content: "";
    position: absolute;
    right: 18%;
    left: 18%;
    z-index: 2;
    height: 2px;
    border-radius: var(--radius-small);
    background: var(--color-accent-primary);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent-primary) 60%, transparent);
    pointer-events: none;
  }

  .shell-region__tab--drop-before::before {
    top: -2px;
  }

  .shell-region__tab--drop-after::after {
    bottom: -2px;
  }

  .shell-region__tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon);
    height: var(--size-icon);
    font-size: var(--font-size-label);
    font-weight: 700;
    line-height: 1;
  }

  .shell-region__tab-icon :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  :global(.shell-region__panel) {
    display: grid;
    flex: 0 0 var(--shell-region-panel-size);
    grid-template-rows: auto minmax(0, 1fr);
    width: var(--shell-region-panel-size);
    height: 100%;
    min-width: 0;
    min-height: 0;
    border-right: 1px solid var(--color-border-subtle);
    background: var(--color-background-surface);
  }

  .shell-region--right :global(.shell-region__panel) {
    border-right: 0;
    border-left: 1px solid var(--color-border-subtle);
  }

  .shell-region--headers-hidden :global(.shell-region__panel) {
    grid-template-rows: minmax(0, 1fr);
  }

  :global(.shell-region__panel--bottom) {
    grid-template-rows: minmax(0, 1fr);
    width: 100%;
    height: 100%;
    border-left: 0;
    border-right: 0;
  }

  .shell-region--bottom.shell-region--headers-hidden :global(.shell-region__panel--bottom) {
    grid-row: 1 / -1;
  }

  .shell-region__panel-header,
  .shell-region__bottom-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-height: 2rem;
    padding: 0 var(--space-8);
    border-bottom: 1px solid var(--color-border-subtle);
    background: color-mix(in srgb, var(--color-background-surface) 88%, var(--color-background-muted));
  }

  .shell-region__bottom-tabs {
    position: relative;
    z-index: 1;
    flex-direction: column;
    justify-content: flex-start;
    width: calc(var(--size-icon-button) + var(--space-8));
    min-width: calc(var(--size-icon-button) + var(--space-8));
    height: 100%;
    min-height: 0;
    padding: var(--space-4);
    border: 0;
    border-right: 1px solid color-mix(in srgb, var(--color-border-strong) 64%, transparent);
    border-radius: 0;
    background: color-mix(in srgb, var(--color-background-elevated) 44%, transparent);
    box-shadow: inset -1px 0 0 color-mix(in srgb, var(--color-accent-primary) 12%, transparent);
  }

  .shell-region__bottom-tabs::before {
    content: none;
  }

  .shell-region__panel-header--bottom {
    position: absolute;
    right: var(--space-8);
    bottom: var(--space-8);
    z-index: 3;
    min-height: 2rem;
    max-width: min(28rem, calc(100% - var(--space-16)));
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 70%, transparent);
    border-radius: var(--radius-medium);
    box-shadow: 0 10px 24px rgb(0 0 0 / 0.22);
  }

  .shell-region__panel-heading {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
  }

  .shell-region__panel-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: var(--size-icon);
    height: var(--size-icon);
    color: var(--color-text-secondary);
  }

  .shell-region__panel-icon :global(.workbench-icon) {
    width: var(--size-icon);
    height: var(--size-icon);
  }

  .shell-region__panel-title {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell-region__panel-body {
    display: grid;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--shell-region-barber-background);
    background-size: 1.25rem 1.25rem;
  }

  .shell-region__panel-body--bottom {
    grid-template-columns: minmax(0, 1fr);
  }

  .shell-region__panel-body--bottom-with-tabs {
    grid-template-columns: calc(var(--size-icon-button) + var(--space-8)) minmax(0, 1fr);
  }

  .shell-region__panel-body > :global(*) {
    min-width: 0;
    min-height: 0;
  }

  .shell-region__widget-stack {
    position: relative;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  .shell-region__widget-stack--bottom {
    grid-template-rows: minmax(0, 1fr);
  }

  .shell-region__widget-stack--multiple {
    grid-template-rows: none;
  }

  .shell-region__widget-stack--multiple.shell-region__widget-stack--vertical {
    grid-auto-flow: row;
    grid-auto-rows: minmax(0, 1fr);
  }

  .shell-region__widget-stack--multiple.shell-region__widget-stack--horizontal {
    grid-template-columns: none;
    grid-template-rows: minmax(0, 1fr);
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
  }

  .shell-region__widget-stack > :global(.shell-region-empty-state--append) {
    position: relative;
    inset: auto;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
    padding: var(--space-8);
    z-index: 1;
  }

  .shell-region__widget-separator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 7px;
    z-index: 8;
    cursor: row-resize;
    touch-action: none;
    background: transparent;
  }
  .shell-region__widget-separator--horizontal {
    right: auto;
    bottom: 0;
    width: 7px;
    height: auto;
    cursor: col-resize;
  }
  .shell-region__widget-separator::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    border-radius: 999px;
    background: var(--color-border-subtle);
    opacity: 0.68;
    pointer-events: none;
    transition: background-color 120ms ease, opacity 120ms ease;
  }
  .shell-region__widget-separator--horizontal::after {
    top: 0;
    bottom: 0;
    right: auto;
    width: 1px;
    height: auto;
  }
  .shell-region__widget-separator:hover::after,
  .shell-region__widget-separator:focus-visible::after {
    background: var(--color-border-focus);
    opacity: 1;
  }
  .shell-region__widget-separator:focus-visible {
    outline: none;
  }

  .shell-region__widget-slot {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .shell-region__widget-stack--multiple > .shell-region__widget-slot--active {
    outline: 1px solid color-mix(in srgb, var(--color-border-focus) 64%, transparent);
    outline-offset: -1px;
  }

  .shell-region__widget-stack--vertical.shell-region__widget-stack--multiple
    > .shell-region__widget-slot:not(:first-child) {
    border-top: 1px solid var(--color-border-subtle);
  }

  .shell-region__widget-stack--horizontal.shell-region__widget-stack--multiple
    > .shell-region__widget-slot:not(:first-child) {
    border-left: 1px solid var(--color-border-subtle);
  }

  .shell-region__widget-stack--vertical > .shell-region__widget-slot--drop-before {
    box-shadow: inset 0 2px 0 var(--color-border-focus);
  }

  .shell-region__widget-stack--vertical > .shell-region__widget-slot--drop-after {
    box-shadow: inset 0 -2px 0 var(--color-border-focus);
  }

  .shell-region__widget-stack--horizontal > .shell-region__widget-slot--drop-before {
    box-shadow: inset 2px 0 0 var(--color-border-focus);
  }

  .shell-region__widget-stack--horizontal > .shell-region__widget-slot--drop-after {
    box-shadow: inset -2px 0 0 var(--color-border-focus);
  }

  .shell-region__widget-move-handle {
    position: absolute;
    top: var(--space-6);
    right: var(--space-6);
    z-index: 5;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.9rem;
    height: 1.9rem;
    min-width: 1.9rem;
    min-height: 1.9rem;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-accent-primary) 34%, var(--color-border-subtle));
    border-radius: var(--radius-medium);
    background:
      radial-gradient(circle at center, color-mix(in srgb, var(--color-accent-primary) 14%, transparent), transparent 72%),
      color-mix(in srgb, var(--color-background-elevated) 90%, transparent);
    color: color-mix(in srgb, var(--color-text-secondary) 86%, var(--color-accent-primary));
    cursor: grab;
    opacity: 0.78;
    box-shadow: 0 8px 18px rgb(0 0 0 / 0.24);
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      opacity 140ms ease;
  }

  .shell-region__widget-move-handle:hover,
  .shell-region__widget-move-handle:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent-primary) 78%, var(--color-border-strong));
    color: var(--color-text-primary);
    opacity: 1;
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 32%, transparent),
      0 10px 22px rgb(0 0 0 / 0.3);
  }

  .shell-region__widget-move-handle:active {
    cursor: grabbing;
  }

  .shell-region__widget-move-handle :global(.workbench-icon) {
    width: 1rem;
    height: 1rem;
  }

  .shell-region__widget-slot > :global(*) {
    min-width: 0;
    min-height: 0;
  }

  .shell-region__bottom-tab-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .shell-region__bottom-tabs .shell-region__arrangement-toggle {
    margin-top: auto;
  }

  .shell-region__bottom-tab {
    width: var(--size-icon-button);
    height: var(--size-icon-button);
    min-width: var(--size-icon-button);
    min-height: var(--size-icon-button);
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 84%, transparent);
    border-radius: calc(var(--radius-medium) - 2px);
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, black 14%, transparent);
  }

  .shell-region__bottom-tab > span:not(.shell-region__tab-icon) {
    display: none;
  }

  .shell-region__bottom-tab:hover {
    border-color: color-mix(in srgb, var(--color-accent-primary) 42%, var(--color-border-strong));
    background: color-mix(in srgb, var(--color-background-selected) 42%, transparent);
  }

  .shell-region__bottom-tab--active {
    border-color: color-mix(in srgb, var(--color-accent-primary) 64%, var(--color-border-strong));
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 16%, transparent), transparent 70%),
      var(--color-background-selected);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, white 8%, transparent),
      0 0 14px color-mix(in srgb, var(--color-accent-primary) 14%, transparent);
  }

  .shell-region__bottom-tab--drop-before::before,
  .shell-region__bottom-tab--drop-after::after {
    content: "";
    position: absolute;
    top: 18%;
    bottom: 18%;
    z-index: 2;
    width: 2px;
    border-radius: var(--radius-small);
    background: var(--color-accent-primary);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent-primary) 60%, transparent);
    pointer-events: none;
  }

  .shell-region__bottom-tab--drop-before::before {
    left: -2px;
  }

  .shell-region__bottom-tab--drop-after::after {
    right: -2px;
  }
</style>
