<script lang="ts">
  import { tick } from 'svelte';
  import WorkbenchToolBadge from '../primitives/WorkbenchToolBadge.svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import type {
    LayoutDockSide,
    LayoutInteractionState,
    LayoutMenuActionItem,
    PanelSubdivisionPreview,
    WorkbenchIconInput
  } from '@konitif/workbench';

  export let state: LayoutInteractionState;
  export let menuActions: LayoutMenuActionItem[] = [];
  export let activeMenuActionId: string | null = null;
  export let menuTargetRects: Array<{ targetId: string; left: number; top: number; width: number; height: number }> = [];
  export let activeMenuTargetId: string | null = null;
  export let selectedMenuTargetId: string | null = null;
  export let selectedMenuSplitSegmentIndex: number | null = null;
  export let joinSourcePreviewRect: { left: number; top: number; width: number; height: number } | null = null;
  export let joinDestinationPreviewRect: { left: number; top: number; width: number; height: number } | null = null;
  export let swapSiblingPreviewRect: { left: number; top: number; width: number; height: number } | null = null;
  export let menuPreviewPanelRect: { left: number; top: number; width: number; height: number } | null = null;
  export let menuPreview: PanelSubdivisionPreview | null = null;
  export let previewPanelRect: { left: number; top: number; width: number; height: number } | null = null;
  export let preview: PanelSubdivisionPreview | null = null;
  export let previewSourceToolIcon: WorkbenchIconInput | null = null;
  export let onStartMenuAction: (actionId: string) => void = () => {};
  export let onClearMenuAction: () => void = () => {};
  export let onSelectMenuTarget: (panelId: string | null) => void = () => {};
  export let onHoverMenuSplitSegment: (segmentIndex: number | null) => void = () => {};
  export let onCommitMenuSplitSegment: (targetId: string, segmentIndex: number) => void = () => {};
  export let onCommitMenuTarget: (panelId: string) => void = () => {};
  export let onHoverSplitSide: (side: LayoutDockSide | null) => void = () => {};
  export let onConfirmSplitSide: (side: LayoutDockSide) => void = () => {};
  export let onPreviewOverlayClick: (event: MouseEvent) => void = () => {};
  export let onCancel: () => void = () => {};

  const MENU_OFFSET = 6;
  const i18nT = getWorkbenchTranslator();

  $: splitSides =
    state.mode === 'split-side-pick'
      ? state.orientation === 'horizontal'
        ? (['left', 'right'] as LayoutDockSide[])
        : (['top', 'bottom'] as LayoutDockSide[])
      : [];
  $: splitActions = menuActions.filter((action) => action.group === 'split');
  $: transformActions = menuActions.filter((action) => action.group === 'transform');
  $: selectedMenuTargetRect = menuTargetRects.find((targetRect) => targetRect.targetId === selectedMenuTargetId) ?? null;
  $: useNeutralSwapResizeCandidates = activeMenuActionId === 'swap-areas' && state.mode === 'split-menu' && state.source === 'split-boundary';
  $: useNeutralJoinResizeCandidates = activeMenuActionId === 'join-areas' && state.mode === 'split-menu' && state.source === 'split-boundary';
  $: activeSwapSourcePreviewRect =
    activeMenuActionId === 'swap-areas' && activeMenuTargetId
      ? menuTargetRects.find((targetRect) => targetRect.targetId === activeMenuTargetId) ?? null
      : null;
  $: swapPreviewRects =
    activeMenuActionId === 'swap-areas' && activeSwapSourcePreviewRect && swapSiblingPreviewRect
      ? [activeSwapSourcePreviewRect, swapSiblingPreviewRect]
      : [];
  $: swapPreviewBadgePosition =
    swapPreviewRects.length === 2
      ? resolveSwapBadgePosition(swapPreviewRects[0], swapPreviewRects[1])
      : null;
  $: swapPreviewIsVertical =
    swapPreviewRects.length === 2
      ? Math.abs(
          swapPreviewRects[0].top + swapPreviewRects[0].height / 2 - (swapPreviewRects[1].top + swapPreviewRects[1].height / 2)
        ) >
        Math.abs(
          swapPreviewRects[0].left + swapPreviewRects[0].width / 2 - (swapPreviewRects[1].left + swapPreviewRects[1].width / 2)
        )
      : false;
  $: joinPreviewArrow =
    activeMenuActionId === 'join-areas' && joinSourcePreviewRect && joinDestinationPreviewRect
      ? resolveJoinPreviewArrow(joinSourcePreviewRect, joinDestinationPreviewRect)
      : null;
  $: actionSpineStyle =
    state.mode === 'split-menu' && activeMenuActionId && activeMenuActionId !== 'split:vertical' && activeMenuActionId !== 'split:horizontal'
      ? resolveActionSpineStyle()
      : null;
  $: shouldShowActionMenu =
    state.mode === 'split-menu' &&
    activeMenuActionId === null &&
    !(state.source === 'panel-menu' && state.initialActionId);
  $: if (state.mode === 'split-menu') {
    void updateMenuPosition();
  }

  let overlayElement: HTMLDivElement | null = null;
  let menuElement: HTMLDivElement | null = null;
  let menuPosition = { left: MENU_OFFSET, top: MENU_OFFSET };

  function handleOverlayKeydown(event: KeyboardEvent): void {
    if (state.mode === 'split-menu' && activeMenuActionId && (event.key === 'Escape' || event.key === 'Backspace')) {
      event.preventDefault();
      if (state.source === 'panel-menu') {
        onCancel();
        return;
      }
      onClearMenuAction();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  function handleMenuOverlayContextMenu(event: MouseEvent): void {
    if (state.mode !== 'split-menu' || !activeMenuActionId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (state.source === 'panel-menu') {
      onCancel();
      return;
    }
    onClearMenuAction();
  }

  function handleMenuAction(action: LayoutMenuActionItem): void {
    if (!action.enabled) {
      return;
    }
    onStartMenuAction(action.id);
  }

  function resolveOverlayMenuIcon(action: LayoutMenuActionItem): WorkbenchIconInput {
    if (action.id.startsWith('split:vertical')) {
      return 'action.split-vertical';
    }

    if (action.id.startsWith('split:horizontal')) {
      return 'action.split-horizontal';
    }

    if (action.id === 'swap-areas') {
      return 'action.swap';
    }

    if (action.id === 'join-areas') {
      return 'action.join';
    }

    return 'action.command';
  }

  async function updateMenuPosition(): Promise<void> {
    await tick();

    if (state.mode !== 'split-menu' || !overlayElement || !menuElement) {
      return;
    }

    const overlayWidth = overlayElement.clientWidth;
    const overlayHeight = overlayElement.clientHeight;
    const menuWidth = menuElement.offsetWidth;
    const menuHeight = menuElement.offsetHeight;
    const nextLeft = clamp(state.anchor.x + MENU_OFFSET, MENU_OFFSET, Math.max(MENU_OFFSET, overlayWidth - menuWidth - MENU_OFFSET));
    const nextTop = clamp(state.anchor.y + MENU_OFFSET, MENU_OFFSET, Math.max(MENU_OFFSET, overlayHeight - menuHeight - MENU_OFFSET));

    menuPosition = {
      left: nextLeft,
      top: nextTop
    };
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function handleActionBridgeCommit(): void {
    if (!selectedMenuTargetId) {
      return;
    }

    onCommitMenuTarget(selectedMenuTargetId);
  }

  function handleActionBridgeHover(): void {
    if (!selectedMenuTargetId) {
      return;
    }

    onSelectMenuTarget(selectedMenuTargetId);
  }

  function resolveJoinPreviewArrow(
    source: { left: number; top: number; width: number; height: number },
    sibling: { left: number; top: number; width: number; height: number }
  ):
    | {
        points: string;
      }
    | null {
    if (state.mode !== 'split-menu') {
      return null;
    }
    const { startX, startY, endX, endY } = resolveJoinArrowPoints(source, sibling);
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < 20) {
      return null;
    }

    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const normalX = -unitY;
    const normalY = unitX;
    const shaftWidth = Math.min(30, Math.max(16, distance * 0.14));
    const headWidth = shaftWidth * 2.2;
    const headLength = Math.min(72, Math.max(34, distance * 0.32));
    const startOffset = Math.min(18, Math.max(6, distance * 0.06));
    const shaftStartX = startX + unitX * startOffset;
    const shaftStartY = startY + unitY * startOffset;
    const headBaseX = endX - unitX * headLength;
    const headBaseY = endY - unitY * headLength;
    const shaftHalfWidth = shaftWidth / 2;
    const headHalfWidth = headWidth / 2;

    const points = [
      [shaftStartX + normalX * shaftHalfWidth, shaftStartY + normalY * shaftHalfWidth],
      [headBaseX + normalX * shaftHalfWidth, headBaseY + normalY * shaftHalfWidth],
      [headBaseX + normalX * headHalfWidth, headBaseY + normalY * headHalfWidth],
      [endX, endY],
      [headBaseX - normalX * headHalfWidth, headBaseY - normalY * headHalfWidth],
      [headBaseX - normalX * shaftHalfWidth, headBaseY - normalY * shaftHalfWidth],
      [shaftStartX - normalX * shaftHalfWidth, shaftStartY - normalY * shaftHalfWidth]
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(' ');

    return { points };
  }

  function resolveJoinArrowPoints(
    source: { left: number; top: number; width: number; height: number },
    sibling: { left: number; top: number; width: number; height: number }
  ): { startX: number; startY: number; endX: number; endY: number } {
    const sourceCenterX = source.left + source.width / 2;
    const sourceCenterY = source.top + source.height / 2;
    const siblingCenterX = sibling.left + sibling.width / 2;
    const siblingCenterY = sibling.top + sibling.height / 2;
    const deltaX = siblingCenterX - sourceCenterX;
    const deltaY = siblingCenterY - sourceCenterY;
    const horizontalRelation = Math.abs(deltaX) >= Math.abs(deltaY);

    if (horizontalRelation) {
      const leftRect = sourceCenterX <= siblingCenterX ? source : sibling;
      const rightRect = leftRect === source ? sibling : source;
      const sourceIsLeft = leftRect === source;
      const sharedBoundaryX = (leftRect.left + leftRect.width + rightRect.left) / 2;
      const sharedVerticalCenter = resolveSharedAxisCenter(
        source.top,
        source.top + source.height,
        sibling.top,
        sibling.top + sibling.height
      );
      const inset = Math.min(40, Math.max(20, Math.min(source.width, sibling.width) * 0.16));

      return {
        startX: sharedBoundaryX + (sourceIsLeft ? -inset : inset),
        startY: sharedVerticalCenter,
        endX: sharedBoundaryX + (sourceIsLeft ? inset : -inset),
        endY: sharedVerticalCenter
      };
    }

    const topRect = sourceCenterY <= siblingCenterY ? source : sibling;
    const bottomRect = topRect === source ? sibling : source;
    const sourceIsTop = topRect === source;
    const sharedBoundaryY = (topRect.top + topRect.height + bottomRect.top) / 2;
    const sharedHorizontalCenter = resolveSharedAxisCenter(
      source.left,
      source.left + source.width,
      sibling.left,
      sibling.left + sibling.width
    );
    const inset = Math.min(40, Math.max(20, Math.min(source.height, sibling.height) * 0.16));

    return {
      startX: sharedHorizontalCenter,
      startY: sharedBoundaryY + (sourceIsTop ? -inset : inset),
      endX: sharedHorizontalCenter,
      endY: sharedBoundaryY + (sourceIsTop ? inset : -inset)
    };
  }

  function resolveSharedAxisCenter(sourceStart: number, sourceEnd: number, siblingStart: number, siblingEnd: number): number {
    const overlapStart = Math.max(sourceStart, siblingStart);
    const overlapEnd = Math.min(sourceEnd, siblingEnd);

    if (overlapEnd > overlapStart) {
      return (overlapStart + overlapEnd) / 2;
    }

    return (sourceStart + sourceEnd + siblingStart + siblingEnd) / 4;
  }

  function resolveActionSpineStyle(): string {
    if (!overlayElement || state.mode !== 'split-menu') {
      return '';
    }

    const spineThickness = '2rem';

    if (state.edge === 'left' || state.edge === 'right') {
      return [
        `left: ${state.anchor.x}px`,
        'top: 0',
        `width: ${spineThickness}`,
        'height: 100%',
        'transform: translateX(-50%)'
      ].join('; ');
    }

    return [
      'left: 0',
      `top: ${state.anchor.y}px`,
      'width: 100%',
      `height: ${spineThickness}`,
      'transform: translateY(-50%)'
    ].join('; ');
  }

  function resolveSwapBadgePosition(
    source: { left: number; top: number; width: number; height: number },
    sibling: { left: number; top: number; width: number; height: number }
  ): { left: number; top: number } {
    const sourceCenterX = source.left + source.width / 2;
    const sourceCenterY = source.top + source.height / 2;
    const siblingCenterX = sibling.left + sibling.width / 2;
    const siblingCenterY = sibling.top + sibling.height / 2;
    const horizontalRelation = Math.abs(sourceCenterX - siblingCenterX) >= Math.abs(sourceCenterY - siblingCenterY);

    if (horizontalRelation) {
      const leftRect = sourceCenterX <= siblingCenterX ? source : sibling;
      const rightRect = leftRect === source ? sibling : source;

      return {
        left: (leftRect.left + leftRect.width + rightRect.left) / 2,
        top: resolveSharedAxisCenter(
          source.top,
          source.top + source.height,
          sibling.top,
          sibling.top + sibling.height
        )
      };
    }

    const topRect = sourceCenterY <= siblingCenterY ? source : sibling;
    const bottomRect = topRect === source ? sibling : source;

    return {
      left: resolveSharedAxisCenter(
        source.left,
        source.left + source.width,
        sibling.left,
        sibling.left + sibling.width
      ),
      top: (topRect.top + topRect.height + bottomRect.top) / 2
    };
  }

</script>

<svelte:window on:keydown={handleOverlayKeydown} />

{#if state.mode === 'split-menu'}
  <div
    bind:this={overlayElement}
    class="layout-overlay layout-overlay--menu"
    role="presentation"
    on:mousedown={onCancel}
    on:contextmenu={handleMenuOverlayContextMenu}
  >
    {#each menuTargetRects as targetRect (targetRect.targetId)}
      <div
        class:layout-overlay__target--candidate={
          !useNeutralJoinResizeCandidates &&
          !useNeutralSwapResizeCandidates &&
          !(activeMenuActionId === 'swap-areas' && activeMenuTargetId === targetRect.targetId)
        }
        class:layout-overlay__target--selected={
          activeMenuActionId !== 'join-areas' && activeMenuActionId !== 'swap-areas' && selectedMenuTargetId === targetRect.targetId
        }
        class="layout-overlay__target"
        style:left={`${targetRect.left}px`}
        style:top={`${targetRect.top}px`}
        style:width={`${targetRect.width}px`}
        style:height={`${targetRect.height}px`}
        role="presentation"
        on:mouseenter={() => onSelectMenuTarget(targetRect.targetId)}
        on:mousemove={() => onSelectMenuTarget(targetRect.targetId)}
        on:click|stopPropagation={() => {
          if (activeMenuActionId === 'split:vertical' || activeMenuActionId === 'split:horizontal') {
            onSelectMenuTarget(targetRect.targetId);
            return;
          }

          onCommitMenuTarget(targetRect.targetId);
        }}
        on:mousedown|stopPropagation
      ></div>
    {/each}

    {#if activeMenuActionId === 'swap-areas' && activeSwapSourcePreviewRect}
      <div
        class="layout-overlay__target layout-overlay__target--swap-pair"
        style:left={`${activeSwapSourcePreviewRect.left}px`}
        style:top={`${activeSwapSourcePreviewRect.top}px`}
        style:width={`${activeSwapSourcePreviewRect.width}px`}
        style:height={`${activeSwapSourcePreviewRect.height}px`}
        role="presentation"
      ></div>
    {/if}

    {#if activeMenuActionId === 'swap-areas' && swapSiblingPreviewRect}
      <div
        class="layout-overlay__target layout-overlay__target--swap-pair"
        style:left={`${swapSiblingPreviewRect.left}px`}
        style:top={`${swapSiblingPreviewRect.top}px`}
        style:width={`${swapSiblingPreviewRect.width}px`}
        style:height={`${swapSiblingPreviewRect.height}px`}
        role="presentation"
      ></div>
    {/if}

    {#if activeMenuActionId === 'join-areas' && joinDestinationPreviewRect}
      <div
        class="layout-overlay__target layout-overlay__target--join-target"
        style:left={`${joinDestinationPreviewRect.left}px`}
        style:top={`${joinDestinationPreviewRect.top}px`}
        style:width={`${joinDestinationPreviewRect.width}px`}
        style:height={`${joinDestinationPreviewRect.height}px`}
        role="presentation"
      ></div>
    {/if}

    {#if activeMenuActionId === 'join-areas' && joinSourcePreviewRect}
      <div
        class="layout-overlay__target layout-overlay__target--join-source"
        style:left={`${joinSourcePreviewRect.left}px`}
        style:top={`${joinSourcePreviewRect.top}px`}
        style:width={`${joinSourcePreviewRect.width}px`}
        style:height={`${joinSourcePreviewRect.height}px`}
        role="presentation"
      ></div>
    {/if}

    {#if actionSpineStyle}
      <button
        type="button"
        class="layout-overlay__action-hit-spine"
        style={actionSpineStyle}
        aria-label={$i18nT('ui.shell.layout.overlay.confirmAreaAction', { default: 'Confirm area action' })}
        on:mouseenter={handleActionBridgeHover}
        on:mousemove={handleActionBridgeHover}
        on:click|stopPropagation={handleActionBridgeCommit}
        on:mousedown|stopPropagation
      ></button>
    {/if}

    {#if swapPreviewBadgePosition}
      <button
        type="button"
        class:layout-overlay__swap-badge--vertical={swapPreviewIsVertical}
        class="layout-overlay__swap-badge"
        style:left={`${swapPreviewBadgePosition.left}px`}
        style:top={`${swapPreviewBadgePosition.top}px`}
        aria-label={$i18nT('ui.shell.layout.overlay.confirmSwapArea', { default: 'Confirm swap area' })}
        on:mouseenter={handleActionBridgeHover}
        on:mousemove={handleActionBridgeHover}
        on:click|stopPropagation={handleActionBridgeCommit}
        on:mousedown|stopPropagation
      >
        <WorkbenchIcon icon="action.swap" label="Swap areas" />
      </button>
    {/if}

    {#if joinPreviewArrow}
      <svg class="layout-overlay__join-arrow" viewBox={`0 0 ${overlayElement?.clientWidth ?? 0} ${overlayElement?.clientHeight ?? 0}`} aria-hidden="true">
        <polygon class="layout-overlay__join-arrow-shape" points={joinPreviewArrow.points} />
      </svg>
    {/if}

    {#if menuPreviewPanelRect && menuPreview}
      <div
        class="layout-overlay__preview-panel"
        style:left={`${menuPreviewPanelRect.left}px`}
        style:top={`${menuPreviewPanelRect.top}px`}
        style:width={`${menuPreviewPanelRect.width}px`}
        style:height={`${menuPreviewPanelRect.height}px`}
      >
        {#each menuPreview.segmentRanges as segment (`menu-preview-segment-${segment.index}`)}
          <button
            type="button"
            class:layout-overlay__preview-segment--selected={selectedMenuSplitSegmentIndex === segment.index}
            class:layout-overlay__preview-segment--empty={selectedMenuSplitSegmentIndex !== segment.index}
            class="layout-overlay__preview-segment"
            style:left={menuPreview.axis === 'columns' ? `${segment.start}%` : '0'}
            style:top={menuPreview.axis === 'rows' ? `${segment.start}%` : '0'}
            style:width={menuPreview.axis === 'columns' ? `${segment.end - segment.start}%` : '100%'}
            style:height={menuPreview.axis === 'rows' ? `${segment.end - segment.start}%` : '100%'}
            aria-label={$i18nT('ui.shell.layout.overlay.preserveSourceSegment', {
              default: 'Preserve source in segment {{segment}}',
              values: { segment: segment.index + 1 }
            })}
            on:mouseenter={() => onHoverMenuSplitSegment(segment.index)}
            on:mousemove={() => onHoverMenuSplitSegment(segment.index)}
            on:mouseleave={() => onHoverMenuSplitSegment(null)}
            on:click|stopPropagation={() => selectedMenuTargetId && onCommitMenuSplitSegment(selectedMenuTargetId, segment.index)}
            on:mousedown|stopPropagation
          >
            {#if selectedMenuSplitSegmentIndex === segment.index}
              <WorkbenchToolBadge className="layout-overlay__preview-segment-badge" icon={previewSourceToolIcon} />
            {/if}
          </button>
        {/each}

        {#each menuPreview.linePositions as position, index (`menu-preview-${index}-${position}`)}
          <div
            class:layout-overlay__preview-line--vertical={menuPreview.axis === 'columns'}
            class:layout-overlay__preview-line--horizontal={menuPreview.axis === 'rows'}
            class="layout-overlay__preview-line"
            style:left={menuPreview.axis === 'columns' ? `${position}%` : undefined}
            style:top={menuPreview.axis === 'rows' ? `${position}%` : undefined}
          ></div>
        {/each}
      </div>
    {/if}

    {#if shouldShowActionMenu}
      <div
        bind:this={menuElement}
        class="layout-overlay__menu"
        style:left={`${menuPosition.left}px`}
        style:top={`${menuPosition.top}px`}
        role="menu"
        tabindex="-1"
        aria-label={$i18nT('ui.shell.layout.overlay.areaOptions', { default: 'Area options' })}
        on:mousedown|stopPropagation
      >
        <div class="layout-overlay__menu-title">{$i18nT('ui.shell.layout.overlay.areaOptions', { default: 'Area Options' })}</div>

        <div class="layout-overlay__menu-group" role="none">
          {#each splitActions as action (action.id)}
            <button
              type="button"
              class:layout-overlay__menu-item--active={activeMenuActionId === action.id}
              class="layout-overlay__menu-item"
              role="menuitem"
              on:click={() => handleMenuAction(action)}
            >
              <span class="layout-overlay__menu-icon" aria-hidden="true">
                <WorkbenchIcon
                  icon={resolveOverlayMenuIcon(action)}
                  label={action.label}
                />
              </span>
              <span class="layout-overlay__menu-label">{action.label}</span>
            </button>
          {/each}
        </div>

        <div class="layout-overlay__menu-separator" role="separator"></div>

        <div class="layout-overlay__menu-group" role="none">
          {#each transformActions as action (action.id)}
            <button
              type="button"
              class:layout-overlay__menu-item--active={activeMenuActionId === action.id}
              class:layout-overlay__menu-item--disabled={!action.enabled}
              class="layout-overlay__menu-item"
              role="menuitem"
              aria-disabled={!action.enabled}
              disabled={!action.enabled}
              on:click={() => handleMenuAction(action)}
            >
              <span class="layout-overlay__menu-icon" aria-hidden="true">
                <WorkbenchIcon icon={resolveOverlayMenuIcon(action)} label={action.label} />
              </span>
              <span class="layout-overlay__menu-label">{action.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{:else if state.mode === 'split-side-pick'}
  <div class="layout-overlay layout-overlay--pick" role="presentation" on:mousedown={onCancel}>
    <div class={`layout-overlay__origin layout-overlay__origin--${state.edge}`}></div>

    {#if splitSides.includes('top')}
      <button
        type="button"
        class:layout-overlay__side--hovered={state.hoveredSide === 'top'}
        class="layout-overlay__side layout-overlay__side--top"
        aria-label={$i18nT('ui.shell.layout.overlay.confirmTopSplit', { default: 'Confirm top split' })}
        on:mouseenter={() => onHoverSplitSide('top')}
        on:mouseleave={() => onHoverSplitSide(null)}
        on:click|stopPropagation={() => onConfirmSplitSide('top')}
      />
    {/if}

    {#if splitSides.includes('right')}
      <button
        type="button"
        class:layout-overlay__side--hovered={state.hoveredSide === 'right'}
        class="layout-overlay__side layout-overlay__side--right"
        aria-label={$i18nT('ui.shell.layout.overlay.confirmRightSplit', { default: 'Confirm right split' })}
        on:mouseenter={() => onHoverSplitSide('right')}
        on:mouseleave={() => onHoverSplitSide(null)}
        on:click|stopPropagation={() => onConfirmSplitSide('right')}
      />
    {/if}

    {#if splitSides.includes('bottom')}
      <button
        type="button"
        class:layout-overlay__side--hovered={state.hoveredSide === 'bottom'}
        class="layout-overlay__side layout-overlay__side--bottom"
        aria-label={$i18nT('ui.shell.layout.overlay.confirmBottomSplit', { default: 'Confirm bottom split' })}
        on:mouseenter={() => onHoverSplitSide('bottom')}
        on:mouseleave={() => onHoverSplitSide(null)}
        on:click|stopPropagation={() => onConfirmSplitSide('bottom')}
      />
    {/if}

    {#if splitSides.includes('left')}
      <button
        type="button"
        class:layout-overlay__side--hovered={state.hoveredSide === 'left'}
        class="layout-overlay__side layout-overlay__side--left"
        aria-label={$i18nT('ui.shell.layout.overlay.confirmLeftSplit', { default: 'Confirm left split' })}
        on:mouseenter={() => onHoverSplitSide('left')}
        on:mouseleave={() => onHoverSplitSide(null)}
        on:click|stopPropagation={() => onConfirmSplitSide('left')}
      />
    {/if}

  </div>
{:else if state.mode === 'split-preview'}
  <button type="button" class="layout-overlay layout-overlay--preview" on:click={onPreviewOverlayClick}>
    {#if previewPanelRect && preview}
      <div
        class="layout-overlay__preview-panel"
        style:left={`${previewPanelRect.left}px`}
        style:top={`${previewPanelRect.top}px`}
        style:width={`${previewPanelRect.width}px`}
        style:height={`${previewPanelRect.height}px`}
      >
        {#each preview.segmentRanges as segment (`preview-segment-${segment.index}`)}
          <div
            class:layout-overlay__preview-segment--selected={preview.preservedSegmentIndex === segment.index}
            class:layout-overlay__preview-segment--empty={preview.preservedSegmentIndex !== segment.index}
            class="layout-overlay__preview-segment layout-overlay__preview-segment--passive"
            style:left={preview.axis === 'columns' ? `${segment.start}%` : '0'}
            style:top={preview.axis === 'rows' ? `${segment.start}%` : '0'}
            style:width={preview.axis === 'columns' ? `${segment.end - segment.start}%` : '100%'}
            style:height={preview.axis === 'rows' ? `${segment.end - segment.start}%` : '100%'}
          >
            {#if preview.preservedSegmentIndex === segment.index}
              <WorkbenchToolBadge className="layout-overlay__preview-segment-badge" icon={previewSourceToolIcon} />
            {/if}
          </div>
        {/each}

        {#each preview.linePositions as position, index (`preview-${index}-${position}`)}
          <div
            class:layout-overlay__preview-line--vertical={preview.axis === 'columns'}
            class:layout-overlay__preview-line--horizontal={preview.axis === 'rows'}
            class="layout-overlay__preview-line"
            style:left={preview.axis === 'columns' ? `${position}%` : undefined}
            style:top={preview.axis === 'rows' ? `${position}%` : undefined}
          ></div>
        {/each}
      </div>
    {/if}
  </button>
{/if}

<style>
  .layout-overlay {
    position: absolute;
    inset: 0;
    z-index: 4;
  }

  .layout-overlay--menu {
    background: transparent;
  }

  .layout-overlay__menu {
    position: absolute;
    z-index: 1;
    min-width: 11.25rem;
    display: grid;
    gap: var(--space-4);
    padding: var(--space-6);
    border: 1px solid var(--color-border-strong);
    background: var(--color-background-elevated);
    box-shadow: var(--shadow-surface);
  }

  .layout-overlay__menu-title {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0 var(--space-4) var(--space-2);
  }

  .layout-overlay__menu-group {
    display: grid;
    gap: var(--space-2);
  }

  .layout-overlay__menu-separator {
    height: 1px;
    background: var(--color-border-subtle);
  }

  .layout-overlay__menu-item {
    display: grid;
    grid-template-columns: var(--size-icon-button) minmax(0, 1fr);
    align-items: center;
    min-height: 1.9rem;
    padding: 0 var(--space-8) 0 var(--space-4);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    text-align: left;
    font: inherit;
    border-radius: var(--radius-small);
  }

  .layout-overlay__menu-item:hover,
  .layout-overlay__menu-item:focus-visible {
    border-color: var(--color-border-subtle);
    background: var(--color-background-hover);
    color: var(--color-text-primary);
    outline: none;
  }

  .layout-overlay__menu-item--active,
  .layout-overlay__menu-item--active:hover,
  .layout-overlay__menu-item--active:focus-visible {
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 42%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 12%, transparent);
    color: var(--color-text-primary);
  }

  .layout-overlay__menu-item--disabled,
  .layout-overlay__menu-item--disabled:hover,
  .layout-overlay__menu-item--disabled:focus-visible {
    border-color: transparent;
    background: transparent;
    color: var(--color-text-muted);
    box-shadow: none;
    opacity: 0.7;
    transform: none;
  }

  .layout-overlay__menu-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-icon-button);
    height: 100%;
    color: currentColor;
  }

  .layout-overlay__menu-icon :global(svg) {
    width: var(--size-icon);
    height: var(--size-icon);
    fill: none;
    stroke: currentColor;
    stroke-width: 1.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .layout-overlay__menu-label {
    min-width: 0;
    white-space: nowrap;
  }

  .layout-overlay__target {
    position: absolute;
    z-index: 1;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split) 32%, transparent);
    background: color-mix(in srgb, var(--color-background-elevated) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 18%, transparent);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  .layout-overlay__target--candidate {
    border-color: rgb(255 229 191 / 0.35);
    background: rgb(255 229 191 / 0.08);
    box-shadow:
      inset 0 0 0 1px rgb(255 229 191 / 0.18),
      0 0 0 1px rgb(255 229 191 / 0.08);
  }

  .layout-overlay__target--selected {
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 62%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent);
  }

  .layout-overlay__target--join-source {
    z-index: 2;
    background: color-mix(in srgb, var(--color-action-primary-hover) 12%, transparent);
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 62%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent);
    pointer-events: none;
  }

  .layout-overlay__target--join-target {
    z-index: 2;
    background: rgb(255 255 255 / 0.04);
    border-color: rgb(255 255 255 / 0.6);
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.18),
      0 0 0 1px rgb(255 255 255 / 0.12);
    pointer-events: none;
  }

  .layout-overlay__target--swap-pair {
    z-index: 2;
    background: color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent);
    border-color: color-mix(in srgb, var(--color-border-edge-split-hover) 62%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent);
    pointer-events: none;
  }

  .layout-overlay__swap-badge {
    appearance: none;
    position: absolute;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 6.75rem;
    height: 6.75rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    box-shadow: none;
    transform: translate(-50%, -50%);
    padding: 0;
    cursor: pointer;
  }

  .layout-overlay__swap-badge :global(svg) {
    width: 5.75rem;
    height: 5.75rem;
    fill: none;
    stroke: rgb(255 255 255 / 0.6);
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 8px rgb(255 255 255 / 0.08));
  }

  .layout-overlay__swap-badge--vertical :global(svg) {
    transform: rotate(90deg);
    transform-origin: center;
  }

  .layout-overlay__join-arrow {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: visible;
  }

  .layout-overlay__join-arrow-shape {
    fill: rgb(255 255 255 / 0.6);
    filter: drop-shadow(0 0 10px rgb(255 255 255 / 0.08));
  }

  .layout-overlay__action-hit-spine {
    appearance: none;
    position: absolute;
    z-index: 3;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .layout-overlay--pick {
    background: color-mix(in srgb, var(--color-background-canvas) 62%, transparent);
  }

  .layout-overlay__origin {
    position: absolute;
    background: color-mix(in srgb, var(--color-action-primary-hover) 68%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-action-primary-hover) 24%, transparent);
  }

  .layout-overlay__origin--left,
  .layout-overlay__origin--right {
    top: var(--space-16);
    bottom: var(--space-16);
    width: 2px;
  }

  .layout-overlay__origin--top,
  .layout-overlay__origin--bottom {
    left: var(--space-16);
    right: var(--space-16);
    height: 2px;
  }

  .layout-overlay__origin--left {
    left: 0;
  }

  .layout-overlay__origin--right {
    right: 0;
  }

  .layout-overlay__origin--top {
    top: 0;
  }

  .layout-overlay__origin--bottom {
    bottom: 0;
  }

  .layout-overlay__side {
    position: absolute;
    border: 1px dashed transparent;
    background: transparent;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }

  .layout-overlay__side--hovered {
    border-color: color-mix(in srgb, var(--color-border-focus) 62%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 14%, transparent);
  }

  .layout-overlay__side--top,
  .layout-overlay__side--bottom {
    left: var(--space-20);
    right: var(--space-20);
    height: 28%;
  }

  .layout-overlay__side--left,
  .layout-overlay__side--right {
    top: var(--space-20);
    bottom: var(--space-20);
    width: 28%;
  }

  .layout-overlay__side--top {
    top: 0;
  }

  .layout-overlay__side--bottom {
    bottom: 0;
  }

  .layout-overlay__side--left {
    left: 0;
  }

  .layout-overlay__side--right {
    right: 0;
  }

  .layout-overlay--preview {
    padding: 0;
    border: 0;
    background: transparent;
  }

  .layout-overlay--preview:hover,
  .layout-overlay--preview:focus-visible,
  .layout-overlay--preview:active {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    transform: none;
    outline: none;
  }

  .layout-overlay__preview-panel {
    position: absolute;
    pointer-events: auto;
    border: 1px solid color-mix(in srgb, var(--color-border-edge-split-hover) 58%, transparent);
    background: color-mix(in srgb, var(--color-action-primary-hover) 6%, transparent);
    overflow: hidden;
  }

  .layout-overlay__preview-segment {
    appearance: none;
    position: absolute;
    z-index: 1;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: inset 0 0 0 1px transparent;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  .layout-overlay__preview-segment:hover,
  .layout-overlay__preview-segment:focus-visible {
    background: color-mix(in srgb, var(--color-action-primary-hover) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 14%, transparent);
    outline: none;
  }

  .layout-overlay__preview-segment--selected {
    background: color-mix(in srgb, var(--color-action-primary-hover) 18%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 38%, transparent),
      inset 0 0 0 999px color-mix(in srgb, var(--color-action-primary-hover) 10%, transparent);
  }

  .layout-overlay__preview-segment--empty {
    background:
      repeating-linear-gradient(
        -45deg,
        rgb(255 255 255 / 0.016),
        rgb(255 255 255 / 0.016) 0.7rem,
        rgb(255 255 255 / 0.04) 0.7rem,
        rgb(255 255 255 / 0.04) 1.4rem
      ),
      color-mix(in srgb, var(--color-background-surface) 40%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 18%, transparent),
      inset 0 0 0 999px rgb(255 255 255 / 0.012);
  }

  .layout-overlay__preview-segment--passive {
    pointer-events: none;
    cursor: default;
  }

  .layout-overlay__preview-segment-badge {
    opacity: 0.4;
  }

  .layout-overlay__preview-line {
    position: absolute;
    z-index: 2;
    background: color-mix(in srgb, var(--color-border-edge-split-hover) 88%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-border-edge-split-hover) 18%, transparent);
  }

  .layout-overlay__preview-line--vertical {
    top: 0;
    bottom: 0;
    width: 1px;
    transform: translateX(-50%);
  }

  .layout-overlay__preview-line--horizontal {
    left: 0;
    right: 0;
    height: 1px;
    transform: translateY(-50%);
  }
</style>
