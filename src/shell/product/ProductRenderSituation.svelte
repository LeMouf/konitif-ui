<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { WorkbenchIconInput } from '@konitif/workbench';
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import ProductRealPreviewStage from './ProductRealPreviewStage.svelte';

  type ProductTone = 'design' | 'runtime' | 'template' | 'product' | 'shared';
  type ProductSurfaceMode = 'real' | 'projection';
  type ProductLayoutArea = 'toolbar' | 'left' | 'workspace' | 'right' | 'footer' | 'auto';
  type ProductViewportMode = 'custom' | 'desktop' | 'tablet' | 'mobile';
  type ProductViewportOrientation = 'landscape' | 'portrait';
  type ProductRenderSlot = {
    id: string;
    label: string;
    role: string;
    tone: ProductTone;
    source: string;
    area?: ProductLayoutArea;
    targetId?: string;
  };
  type ProductRenderTreeRow = {
    id: string;
    label: string;
    tone: ProductTone;
    badge?: string;
    targetId?: string;
    depth: number;
  };
  type ProductRenderScene = {
    title: string;
    summary: string;
    mode: ProductSurfaceMode;
    resolution: string;
    theme: string;
    layoutVariant: 'app-shell' | 'isolated' | 'standard';
    layoutSlots: ProductRenderSlot[];
    compositionRows: ProductRenderTreeRow[];
    template: { title: string; role: string } | null;
  };
  type ProductRenderLayer = ProductRenderSlot & {
    x: number;
    y: number;
    width: number;
    height: number;
    targetId?: string;
  };
  type RealPreviewState = {
    id: string;
    label: string;
    variant: 'ghost' | 'active' | 'danger';
    disabled: boolean;
    icon: WorkbenchIconInput;
  };

  const VIEWPORT_MODE_OPTIONS: Array<{ value: ProductViewportMode; label: string; icon: WorkbenchIconInput }> = [
    { value: 'custom', label: 'Custom', icon: 'action.viewport-scale' },
    { value: 'desktop', label: 'Desktop', icon: 'action.device-desktop' },
    { value: 'tablet', label: 'Tablette', icon: 'action.device-tablet' },
    { value: 'mobile', label: 'Mobile', icon: 'action.device-mobile' }
  ];
  const VIEWPORT_ORIENTATION_OPTIONS: Array<{ value: ProductViewportOrientation; label: string; icon: WorkbenchIconInput }> = [
    { value: 'landscape', label: 'Paysage', icon: 'action.orientation-landscape' },
    { value: 'portrait', label: 'Portrait', icon: 'action.orientation-portrait' }
  ];
  const FIT_SAFE_ZONE_PX = 96;
  const MIN_ZOOM = 0.12;
  const MAX_ZOOM = 5;
  const REM_FALLBACK_PX = 16;
  const SURFACE_MODE_OPTIONS: Array<{ value: ProductSurfaceMode; label: string; icon: WorkbenchIconInput }> = [
    { value: 'real', label: 'Réel', icon: 'tool.viewer' },
    { value: 'projection', label: 'Projection', icon: 'action.viewport-scale' }
  ];
  const SURFACE_MODE_STORAGE_KEY = 'workbench.product-render-surface-mode';

  export let scene: ProductRenderScene;

  const dispatch = createEventDispatcher<{ select: { itemId: string; layerId: string } }>();

  let stageElement: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let themeObserver: MutationObserver | null = null;
  let viewportMode: ProductViewportMode = 'custom';
  let viewportOrientation: ProductViewportOrientation = 'landscape';
  let surfaceMode: ProductSurfaceMode = 'projection';
  let userSurfaceMode: ProductSurfaceMode | null = null;
  let remPx = REM_FALLBACK_PX;
  let stageWidth = 1;
  let stageHeight = 1;
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let panState: { pointerId: number; startX: number; startY: number; startPan: { x: number; y: number } } | null = null;
  let fitSignature = '';
  let sceneSurfaceSignature = '';
  let realThemeRevealRatio = 50;
  let realThemeRevealElement: HTMLDivElement | null = null;
  let isRealThemeRevealDragging = false;

  $: syncSurfaceMode(scene);
  $: viewportBounds = resolveViewportBounds(scene?.resolution ?? '1280 x 720', viewportMode, viewportOrientation);
  $: viewportOrigin = {
    x: pan.x - (viewportBounds.width * zoom) / 2,
    y: pan.y - (viewportBounds.height * zoom) / 2
  };
  $: rulerMarksX = createRulerMarks('x', stageWidth, stageHeight, zoom, pan, remPx, viewportBounds);
  $: rulerMarksY = createRulerMarks('y', stageWidth, stageHeight, zoom, pan, remPx, viewportBounds);
  $: layoutLayers = createProductRenderLayers(scene, viewportBounds);
  $: selectedRowsByLabel = createCompositionRowTargetMap(scene?.compositionRows ?? []);
  $: realPreviewKind = resolveRealPreviewKind(scene);
  $: realPreviewLabel = resolveRealPreviewLabel(scene);
  $: realPreviewIcon = resolveRealPreviewIcon(realPreviewKind);
  $: realPreviewStates = createRealPreviewStates(scene);
  $: syncFit(viewportBounds, remPx, scene?.title ?? '');

  onMount(() => {
    restoreSurfaceModePreference();
    refreshRemPx();
    refreshStageSize();
    observeThemeChanges();
    resizeObserver = new ResizeObserver(() => {
      refreshStageSize();
      refreshRemPx();
      fitView(false);
    });

    if (stageElement) {
      resizeObserver.observe(stageElement);
    }

    void tick().then(() => fitView(false));

    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      themeObserver?.disconnect();
      themeObserver = null;
      panState = null;
    };
  });

  function syncFit(bounds: { width: number; height: number }, currentRemPx: number, title: string): void {
    const nextSignature = `${bounds.width}:${bounds.height}:${currentRemPx}:${title}`;

    if (nextSignature === fitSignature) {
      return;
    }

    fitSignature = nextSignature;
    void tick().then(() => fitView(false));
  }

  function syncSurfaceMode(nextScene: ProductRenderScene | null | undefined): void {
    const nextSignature = `${nextScene?.title ?? ''}:${nextScene?.layoutVariant ?? ''}:${nextScene?.mode ?? 'projection'}`;

    if (nextSignature === sceneSurfaceSignature) {
      return;
    }

    sceneSurfaceSignature = nextSignature;

    if (!userSurfaceMode) {
      surfaceMode = nextScene?.mode ?? 'projection';
    }
  }

  function setSurfaceMode(nextMode: ProductSurfaceMode): void {
    surfaceMode = nextMode;
    userSurfaceMode = nextMode;
    persistSurfaceModePreference(nextMode);
  }

  function restoreSurfaceModePreference(): void {
    try {
      const storedMode = window.localStorage.getItem(SURFACE_MODE_STORAGE_KEY);

      if (storedMode === 'real' || storedMode === 'projection') {
        surfaceMode = storedMode;
        userSurfaceMode = storedMode;
      }
    } catch {
      userSurfaceMode = surfaceMode;
    }
  }

  function persistSurfaceModePreference(nextMode: ProductSurfaceMode): void {
    try {
      window.localStorage.setItem(SURFACE_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Local storage can be unavailable in embedded previews.
    }
  }

  function fitView(_animate = true): void {
    if (!stageElement) {
      return;
    }

    const rect = stageElement.getBoundingClientRect();
    const safeLeft = Math.min(Math.max(remPx * 5.5, FIT_SAFE_ZONE_PX), Math.max(24, rect.width * 0.2));
    const safeRight = Math.min(Math.max(remPx * 2.5, 48), Math.max(24, rect.width * 0.12));
    const safeTop = Math.min(Math.max(remPx * 7.5, 112), Math.max(40, rect.height * 0.28));
    const safeBottom = Math.min(Math.max(remPx * 5, 80), Math.max(32, rect.height * 0.24));
    const usableWidth = Math.max(1, rect.width - safeLeft - safeRight);
    const usableHeight = Math.max(1, rect.height - safeTop - safeBottom);

    zoom = clampZoom(Math.min(usableWidth / viewportBounds.width, usableHeight / viewportBounds.height));
    pan = {
      x: safeLeft + usableWidth * 0.5 - rect.width * 0.5,
      y: safeTop + usableHeight * 0.5 - rect.height * 0.5
    };
  }

  function resetView(): void {
    zoom = 1;
    pan = { x: 0, y: 0 };
  }

  function refreshRemPx(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const localFontSize = stageElement ? parseFloat(getComputedStyle(stageElement).fontSize) : NaN;
    remPx = Math.max(1, Number.isFinite(rootFontSize) ? rootFontSize : Number.isFinite(localFontSize) ? localFontSize : REM_FALLBACK_PX);
  }

  function refreshStageSize(): void {
    const rect = stageElement?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    stageWidth = Math.max(1, rect.width);
    stageHeight = Math.max(1, rect.height);
  }

  function observeThemeChanges(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    themeObserver?.disconnect();
    themeObserver = new MutationObserver(() => {
      const previousRemPx = remPx;
      refreshRemPx();

      if (previousRemPx !== remPx) {
        fitView(false);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    themeObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function startPan(event: PointerEvent): void {
    if (!stageElement || event.button !== 0) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;

    if (target?.closest('[data-product-situation-control="true"]') || target?.closest('[data-product-situation-layer="true"]')) {
      return;
    }

    event.preventDefault();
    stageElement.setPointerCapture(event.pointerId);
    panState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: { ...pan }
    };
  }

  function movePan(event: PointerEvent): void {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    pan = {
      x: panState.startPan.x + event.clientX - panState.startX,
      y: panState.startPan.y + event.clientY - panState.startY
    };
  }

  function endPan(event: PointerEvent): void {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    if (stageElement?.hasPointerCapture(event.pointerId)) {
      stageElement.releasePointerCapture(event.pointerId);
    }

    panState = null;
  }

  function handleWheel(event: WheelEvent): void {
    if (!stageElement) {
      return;
    }

    event.preventDefault();
    const rect = stageElement.getBoundingClientRect();
    const pointerX = event.clientX - (rect.left + rect.width * 0.5);
    const pointerY = event.clientY - (rect.top + rect.height * 0.5);
    const worldX = (pointerX - pan.x) / zoom;
    const worldY = (pointerY - pan.y) / zoom;
    const delta = event.deltaY > 0 ? -1 : 1;
    const nextZoom = clampZoom(zoom * Math.pow(event.ctrlKey || event.metaKey ? 1.2 : 1.12, delta));

    if (nextZoom === zoom) {
      return;
    }

    pan = {
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom
    };
    zoom = nextZoom;
  }

  function resolveViewportBounds(
    resolution: string,
    mode: ProductViewportMode,
    orientation: ProductViewportOrientation
  ): { width: number; height: number } {
    const match = resolution.match(/(\d+)\s*x\s*(\d+)/i);
    const custom = {
      width: match ? Number(match[1]) : 1280,
      height: match ? Number(match[2]) : 720
    };
    const preset = resolveViewportPreset(mode, custom);

    return {
      width: orientation === 'landscape' ? Math.max(preset.width, preset.height) : Math.min(preset.width, preset.height),
      height: orientation === 'landscape' ? Math.min(preset.width, preset.height) : Math.max(preset.width, preset.height)
    };
  }

  function resolveViewportPreset(mode: ProductViewportMode, custom: { width: number; height: number }): { width: number; height: number } {
    switch (mode) {
      case 'desktop':
        return { width: 1280, height: 720 };
      case 'tablet':
        return { width: 768, height: 1024 };
      case 'mobile':
        return { width: 375, height: 812 };
      default:
        return custom;
    }
  }

  function createProductRenderLayers(sourceScene: ProductRenderScene, bounds: { width: number; height: number }): ProductRenderLayer[] {
    if (sourceScene.layoutVariant === 'isolated') {
      return createIsolatedRenderLayers(sourceScene, bounds);
    }

    const shellInset = 12;
    const topHeight = Math.max(48, Math.round(bounds.height * 0.08));
    const footerHeight = Math.max(44, Math.round(bounds.height * 0.07));
    const contentWidth = Math.max(1, bounds.width - shellInset * 2);
    const isCompactViewport = contentWidth < 720;
    const sideMinWidth = Math.min(160, Math.max(72, Math.round(contentWidth * 0.22)));
    const leftWidth = isCompactViewport
      ? Math.round(contentWidth * 0.24)
      : Math.max(sideMinWidth, Math.round(contentWidth * 0.19));
    const rightWidth = isCompactViewport
      ? Math.round(contentWidth * 0.24)
      : Math.max(sideMinWidth, Math.round(contentWidth * 0.2));
    const contentTop = shellInset + topHeight;
    const contentHeight = Math.max(120, bounds.height - topHeight - footerHeight - shellInset * 2);
    const workspaceWidth = Math.max(1, contentWidth - leftWidth - rightWidth);
    const layers: ProductRenderLayer[] = [
      {
        id: 'frame.template',
        label: sourceScene.template?.title ?? sourceScene.title,
        role: sourceScene.template?.role ?? 'Application frame',
        tone: 'template',
        source: sourceScene.layoutVariant === 'app-shell' ? 'Application frame' : sourceScene.mode,
        x: shellInset,
        y: shellInset,
        width: bounds.width - shellInset * 2,
        height: topHeight
      }
    ];

    for (const slot of sourceScene.layoutSlots) {
      const area = slot.area ?? 'auto';
      const layerBounds =
        area === 'toolbar'
          ? { x: shellInset, y: shellInset, width: bounds.width - shellInset * 2, height: topHeight }
          : area === 'left'
            ? { x: shellInset, y: contentTop, width: leftWidth, height: contentHeight }
            : area === 'right'
              ? { x: bounds.width - rightWidth - shellInset, y: contentTop, width: rightWidth, height: contentHeight }
              : area === 'footer'
                ? { x: shellInset, y: bounds.height - footerHeight - shellInset, width: bounds.width - shellInset * 2, height: footerHeight }
                : area === 'workspace'
                  ? { x: shellInset + leftWidth, y: contentTop, width: workspaceWidth, height: contentHeight }
                  : resolveAutoLayerBounds(layers.length, bounds, contentTop, contentHeight, shellInset);

      layers.push({
        ...slot,
        ...layerBounds
      });
    }

    return layers;
  }

  function createIsolatedRenderLayers(sourceScene: ProductRenderScene, bounds: { width: number; height: number }): ProductRenderLayer[] {
    if (sourceScene.layoutSlots[0]?.role.toLowerCase().includes('atom')) {
      return createAtomRenderLayers(sourceScene, bounds);
    }

    const inset = 28;
    const selectedSlot = sourceScene.layoutSlots[0] ?? {
      id: 'isolated.empty',
      label: sourceScene.title,
      role: 'Selection',
      tone: 'shared' as ProductTone,
      source: sourceScene.summary
    };
    const primaryWidth = Math.min(360, Math.max(220, bounds.width * 0.48));
    const primaryHeight = Math.min(180, Math.max(96, bounds.height * 0.3));
    const layers: ProductRenderLayer[] = [
      {
        ...selectedSlot,
        x: Math.round((bounds.width - primaryWidth) / 2),
        y: inset + 34,
        width: Math.round(primaryWidth),
        height: Math.round(primaryHeight)
      }
    ];
    const chipWidth = Math.max(150, Math.min(220, (bounds.width - inset * 2 - 18) / 2));
    const chipHeight = 58;

    sourceScene.layoutSlots.slice(1, 9).forEach((slot, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);

      layers.push({
        ...slot,
        x: Math.round(inset + column * (chipWidth + 18)),
        y: Math.round(inset + primaryHeight + 78 + row * (chipHeight + 12)),
        width: Math.round(chipWidth),
        height: chipHeight
      });
    });

    return layers;
  }

  function createAtomRenderLayers(sourceScene: ProductRenderScene, bounds: { width: number; height: number }): ProductRenderLayer[] {
    const selectedSlot = sourceScene.layoutSlots[0] ?? {
      id: 'atom.empty',
      label: sourceScene.title,
      role: 'Atom',
      tone: 'design' as ProductTone,
      source: sourceScene.title
    };
    const slots = sourceScene.layoutSlots.slice(1);
    const stateSlots = slots.filter((slot) => slot.role.toLowerCase().includes('state')).slice(0, 5);
    const tokenSlots = slots.filter((slot) => slot.role.toLowerCase().includes('token')).slice(0, 6);
    const relationSlots = slots.filter((slot) => !stateSlots.includes(slot) && !tokenSlots.includes(slot)).slice(0, 4);
    const centerX = Math.round(bounds.width * 0.5);
    const controlSize = 44;
    const frameWidth = Math.min(520, Math.max(360, Math.round(bounds.width * 0.66)));
    const frameHeight = Math.min(310, Math.max(230, 150 + Math.ceil((tokenSlots.length + relationSlots.length) / 2) * 48));
    const frameX = Math.round(centerX - frameWidth / 2);
    const frameY = Math.max(42, Math.round(bounds.height * 0.18));
    const controlY = frameY + 68;
    const layers: ProductRenderLayer[] = [
      {
        id: `${selectedSlot.id}.contract`,
        label: `${selectedSlot.source || selectedSlot.label} contract`,
        role: 'Component Contract',
        tone: selectedSlot.tone,
        source: `${stateSlots.length} états · ${tokenSlots.length} tokens · ${relationSlots.length} liens`,
        x: frameX,
        y: frameY,
        width: frameWidth,
        height: frameHeight
      },
      {
        ...selectedSlot,
        role: 'Component Instance',
        x: centerX - controlSize / 2,
        y: controlY,
        width: controlSize,
        height: controlSize
      },
      {
        id: `${selectedSlot.id}.icon-slot`,
        label: 'slot',
        role: 'Component Slot',
        tone: selectedSlot.tone,
        source: relationSlots[0]?.source ?? 'content / icon',
        targetId: selectedSlot.targetId,
        x: centerX - 9,
        y: controlY + 13,
        width: 18,
        height: 18
      }
    ];
    const stateWidth = Math.min(108, Math.max(82, Math.round((frameWidth - 48) / Math.max(1, stateSlots.length))));
    const stateHeight = 34;
    const stateGap = 8;
    const stateStartX = Math.round(centerX - (stateSlots.length * stateWidth + Math.max(0, stateSlots.length - 1) * stateGap) / 2);
    const chipWidth = Math.min(156, Math.max(126, Math.round((frameWidth - 72) / 2)));
    const chipHeight = 38;
    const chipStartX = Math.round(centerX - chipWidth - 12);

    stateSlots.forEach((slot, index) => {
      layers.push({
        ...slot,
        x: stateStartX + index * (stateWidth + stateGap),
        y: controlY + controlSize + 38,
        width: stateWidth,
        height: stateHeight
      });
    });

    [...tokenSlots, ...relationSlots].forEach((slot, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);

      layers.push({
        ...slot,
        x: chipStartX + column * (chipWidth + 24),
        y: controlY + controlSize + 92 + row * (chipHeight + 10),
        width: chipWidth,
        height: chipHeight
      });
    });

    return layers;
  }

  function resolveAutoLayerBounds(
    index: number,
    bounds: { width: number; height: number },
    contentTop: number,
    contentHeight: number,
    shellInset: number
  ): { x: number; y: number; width: number; height: number } {
    const columns = 3;
    const gap = 8;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const width = Math.max(140, (bounds.width - shellInset * 2 - gap * (columns - 1)) / columns);
    const height = Math.max(72, Math.min(180, contentHeight * 0.34));

    return {
      x: shellInset + column * (width + gap),
      y: contentTop + row * (height + gap),
      width,
      height
    };
  }

  function createRulerMarks(
    axis: 'x' | 'y',
    width: number,
    height: number,
    currentZoom: number,
    currentPan: { x: number; y: number },
    currentRemPx: number,
    bounds: { width: number; height: number }
  ): number[] {
    const stepRem = 8;
    const scale = Math.max(0.01, currentRemPx * currentZoom);
    const size = axis === 'x' ? width : height;
    const offset = axis === 'x'
      ? currentPan.x - (bounds.width * currentZoom) / 2
      : currentPan.y - (bounds.height * currentZoom) / 2;
    const startRem = Math.floor(((0 - size * 0.5 - offset) / scale) / stepRem) * stepRem;
    const endRem = Math.ceil(((size - size * 0.5 - offset) / scale) / stepRem) * stepRem;
    const marks: number[] = [];

    for (let mark = startRem; mark <= endRem; mark += stepRem) {
      marks.push(mark);

      if (marks.length > 80) {
        break;
      }
    }

    return marks.includes(0) ? marks : [...marks, 0].sort((left, right) => left - right);
  }

  function createCompositionRowTargetMap(rows: ProductRenderTreeRow[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const row of rows) {
      if (row.targetId) {
        map.set(row.label.toLowerCase(), row.targetId);
      }
    }

    return map;
  }

  function resolveLayerTargetId(layer: ProductRenderLayer): string | null {
    return layer.targetId ?? selectedRowsByLabel.get(layer.source.toLowerCase()) ?? selectedRowsByLabel.get(layer.label.toLowerCase()) ?? null;
  }

  function normalizeRenderRole(role: string): string {
    return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function getLayerStyle(layer: ProductRenderLayer): string {
    return [
      `left: ${layer.x}px`,
      `top: ${layer.y}px`,
      `width: ${Math.max(2, layer.width)}px`,
      `height: ${Math.max(2, layer.height)}px`
    ].join('; ');
  }

  function getRulerStyle(axis: 'x' | 'y', markRem: number): string {
    const offset = markRem * remPx * zoom;

    if (axis === 'x') {
      return `left: calc(50% + ${viewportOrigin.x + offset}px)`;
    }

    return `top: calc(50% + ${viewportOrigin.y + offset}px)`;
  }

  function clampZoom(value: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number.isFinite(value) ? value : 1));
  }

  function updateRealThemeRevealFromClientX(clientX: number): void {
    if (!realThemeRevealElement) {
      return;
    }

    const rect = realThemeRevealElement.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    realThemeRevealRatio = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  function handleRealThemeRevealPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    isRealThemeRevealDragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    updateRealThemeRevealFromClientX(event.clientX);
  }

  function handleRealThemeRevealPointerMove(event: PointerEvent): void {
    if (!isRealThemeRevealDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateRealThemeRevealFromClientX(event.clientX);
  }

  function handleRealThemeRevealPointerUp(event: PointerEvent): void {
    event.stopPropagation();
    isRealThemeRevealDragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  function handleRealThemeRevealKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 4;
    let nextRatio = realThemeRevealRatio;

    if (event.key === 'ArrowLeft') {
      nextRatio -= step;
    } else if (event.key === 'ArrowRight') {
      nextRatio += step;
    } else if (event.key === 'Home') {
      nextRatio = 0;
    } else if (event.key === 'End') {
      nextRatio = 100;
    } else {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    realThemeRevealRatio = Math.min(100, Math.max(0, nextRatio));
  }

  function resolveRealPreviewKind(sourceScene: ProductRenderScene): string {
    const signature = `${sourceScene.title} ${sourceScene.template?.title ?? ''} ${sourceScene.layoutSlots.map((slot) => `${slot.label} ${slot.role} ${slot.source}`).join(' ')}`.toLowerCase();

    if (signature.includes('iconbutton')) return 'icon-button';
    if (signature.includes('workbenchtoolbadge')) return 'tool-badge';
    if (signature.includes('workbenchtoolglyph')) return 'tool-glyph';
    if (signature.includes('workbenchicon')) return 'icon';
    if (signature.includes('panelchrome')) return 'panel-chrome';
    if (signature.includes('handle')) return 'handle';
    if (signature.includes('shortcutgesture')) return 'shortcut';
    return sourceScene.layoutVariant === 'isolated' ? 'component' : 'surface';
  }

  function resolveRealPreviewIcon(kind: string): WorkbenchIconInput {
    switch (kind) {
      case 'icon-button':
      case 'icon':
        return 'tool.viewer';
      case 'tool-badge':
      case 'tool-glyph':
        return 'tool.component-assembly';
      case 'panel-chrome':
        return 'layout.panel-bottom';
      case 'handle':
        return 'action.viewport-scale';
      case 'shortcut':
        return 'action.command';
      default:
        return 'app.product-shell';
    }
  }

  function resolveRealPreviewLabel(sourceScene: ProductRenderScene): string {
    return sourceScene.layoutSlots[0]?.label ?? sourceScene.title;
  }

  function createRealPreviewStates(sourceScene: ProductRenderScene): RealPreviewState[] {
    const stateSlots = sourceScene.layoutSlots.filter((slot) => slot.role.toLowerCase().includes('state'));
    const states = stateSlots.length
      ? stateSlots
      : [
          { id: 'state.default', label: 'default', source: 'variant=ghost' },
          { id: 'state.active', label: 'active', source: 'variant=active' },
          { id: 'state.danger', label: 'danger', source: 'variant=danger' },
          { id: 'state.disabled', label: 'disabled', source: 'disabled=true' }
        ];

    return states.slice(0, 4).map((state) => {
      const signature = `${state.label} ${state.source}`.toLowerCase();
      const disabled = signature.includes('disabled');
      const variant = signature.includes('danger') ? 'danger' : signature.includes('active') ? 'active' : 'ghost';

      return {
        id: state.id,
        label: state.label.replace(/^variant:\s*/i, ''),
        variant,
        disabled,
        icon: variant === 'danger' ? 'status.warning' : resolveRealPreviewIcon('icon-button')
      };
    });
  }

</script>

<article class="product-render-situation" data-render-mode={surfaceMode} data-layout-variant={scene.layoutVariant}>
  <header class="product-render-situation__header">
    <div>
      <span>Mise en situation</span>
      <strong>{scene.title}</strong>
    </div>
    <div class="product-render-situation__controls" data-product-situation-control="true">
      <div class="product-render-situation__segments" aria-label="Viewport type">
        {#each VIEWPORT_MODE_OPTIONS as option (option.value)}
          <button
            type="button"
            class:product-render-situation__segment--active={viewportMode === option.value}
            aria-pressed={viewportMode === option.value}
            aria-label={option.label}
            title={option.label}
            on:click={() => (viewportMode = option.value)}
          >
            <WorkbenchIcon icon={option.icon} label={option.label} />
          </button>
        {/each}
      </div>
      <div class="product-render-situation__segments" aria-label="Viewport orientation">
        {#each VIEWPORT_ORIENTATION_OPTIONS as option (option.value)}
          <button
            type="button"
            class:product-render-situation__segment--active={viewportOrientation === option.value}
            aria-pressed={viewportOrientation === option.value}
            aria-label={option.label}
            title={option.label}
            on:click={() => (viewportOrientation = option.value)}
          >
            <WorkbenchIcon icon={option.icon} label={option.label} />
          </button>
        {/each}
      </div>
    </div>
  </header>

  <div
    bind:this={stageElement}
    class="product-render-situation__viewer"
    class:product-render-situation__viewer--panning={panState}
    style:--product-render-grid-scale={zoom}
    on:pointerdown={startPan}
    on:pointermove={movePan}
    on:pointerup={endPan}
    on:pointercancel={endPan}
    on:wheel|nonpassive={handleWheel}
  >
    <div class="product-render-situation__grid" aria-hidden="true"></div>
    <div class="product-render-situation__axis product-render-situation__axis--x" style={`top: calc(50% + ${viewportOrigin.y}px)`}></div>
    <div class="product-render-situation__axis product-render-situation__axis--y" style={`left: calc(50% + ${viewportOrigin.x}px)`}></div>

    <div class="product-render-situation__ruler product-render-situation__ruler--x" aria-hidden="true">
      {#each rulerMarksX as mark (mark)}
        <span style={getRulerStyle('x', mark)}>{mark}</span>
      {/each}
    </div>
    <div class="product-render-situation__ruler product-render-situation__ruler--y" aria-hidden="true">
      {#each rulerMarksY as mark (mark)}
        <span style={getRulerStyle('y', mark)}>{mark}</span>
      {/each}
    </div>

    <div class="product-render-situation__title">
      <strong>Composition Viewer</strong>
      <span>1rem = {Math.round(remPx * 100) / 100}px</span>
    </div>

    {#if surfaceMode === 'real'}
      <section
        class="product-render-situation__real-preview"
        style={`width: ${viewportBounds.width}px; height: ${viewportBounds.height}px; transform: translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}
        data-preview-kind={realPreviewKind}
      >
        <div class="product-render-situation__viewport-label">
          <strong>Rendu réel</strong>
          <span>{viewportBounds.width} x {viewportBounds.height}</span>
        </div>

        <div
          bind:this={realThemeRevealElement}
          class="product-render-situation__theme-reveal"
          class:product-render-situation__theme-reveal--dragging={isRealThemeRevealDragging}
          style={`--theme-reveal-position: ${realThemeRevealRatio}%;`}
        >
          <div class="product-render-situation__theme-reveal-layer product-render-situation__theme-reveal-layer--light">
            <ProductRealPreviewStage
              kind={realPreviewKind}
              label={realPreviewLabel}
              icon={realPreviewIcon}
              states={realPreviewStates}
              summary={scene.summary}
              primaryRole={scene.layoutSlots[0]?.role ?? ''}
            />
          </div>
          <div class="product-render-situation__theme-reveal-layer product-render-situation__theme-reveal-layer--dark" aria-hidden="true">
            <ProductRealPreviewStage
              kind={realPreviewKind}
              label={realPreviewLabel}
              icon={realPreviewIcon}
              states={realPreviewStates}
              summary={scene.summary}
              primaryRole={scene.layoutSlots[0]?.role ?? ''}
            />
          </div>
          <button
            type="button"
            class="product-render-situation__theme-reveal-handle"
            role="slider"
            aria-label="Comparer le rendu dark et light"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(realThemeRevealRatio)}
            data-product-situation-control="true"
            on:pointerdown={handleRealThemeRevealPointerDown}
            on:pointermove={handleRealThemeRevealPointerMove}
            on:pointerup={handleRealThemeRevealPointerUp}
            on:pointercancel={handleRealThemeRevealPointerUp}
            on:keydown={handleRealThemeRevealKeydown}
          >
            <span aria-hidden="true"></span>
          </button>
        </div>
      </section>
    {:else}
      <div
        class="product-render-situation__viewport"
        style={`width: ${viewportBounds.width}px; height: ${viewportBounds.height}px; transform: translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}
      >
        <div class="product-render-situation__viewport-label">
          <strong>Projection</strong>
          <span>{viewportBounds.width} x {viewportBounds.height}</span>
        </div>

        {#each layoutLayers as layer (layer.id)}
          <button
            type="button"
            data-tone={layer.tone}
            data-layout-area={layer.area ?? 'auto'}
            data-render-role={normalizeRenderRole(layer.role)}
            data-product-situation-layer="true"
            class="product-render-situation__layer"
            style={getLayerStyle(layer)}
            disabled={!resolveLayerTargetId(layer)}
            title={`${layer.label} - ${layer.role} - ${Math.round(layer.width)} x ${Math.round(layer.height)}px`}
            on:click={() => {
              const targetId = resolveLayerTargetId(layer);

              if (targetId) {
                dispatch('select', { itemId: targetId, layerId: layer.id });
              }
            }}
          >
            <span>
              <strong>{layer.label}</strong>
              <small>{Math.round(layer.width)} x {Math.round(layer.height)}</small>
            </span>
            <em>{layer.source}</em>
            <code>{layer.role}</code>
          </button>
        {/each}
      </div>
    {/if}

    <div class="product-render-situation__toolbar" data-product-situation-control="true">
      <button type="button" on:click={() => fitView()}>Fit</button>
      <span>Grille 1rem</span>
      <button type="button" on:click={resetView}>Reset</button>
    </div>

    <div class="product-render-situation__readout" aria-hidden="true">
      <span>{Math.round(viewportBounds.width / remPx)}rem x {Math.round(viewportBounds.height / remPx)}rem</span>
      <strong>{Math.round(zoom * 100)}%</strong>
    </div>
  </div>

  <footer class="product-render-situation__footer">
    <div>
      <span>Résolution</span>
      <strong>{viewportBounds.width} x {viewportBounds.height}</strong>
    </div>
    <div>
      <span>Thème</span>
      <strong>{scene.theme}</strong>
    </div>
    <div class="product-render-situation__surface-modes" data-product-situation-control="true">
      {#each SURFACE_MODE_OPTIONS as option (option.value)}
        <button
          type="button"
          class:product-render-situation__surface--active={surfaceMode === option.value}
          aria-pressed={surfaceMode === option.value}
          aria-label={option.label}
          title={option.label}
          on:click={() => setSurfaceMode(option.value)}
        >
          <WorkbenchIcon icon={option.icon} label={option.label} />
          <span>{option.label}</span>
        </button>
      {/each}
    </div>
  </footer>
</article>

<style>
  .product-render-situation {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(22rem, 1fr) auto;
    gap: 0.62rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 34%, var(--color-border-subtle));
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--color-background-canvas) 82%, var(--color-background-elevated));
  }

  .product-render-situation__header,
  .product-render-situation__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.42rem 0.72rem;
  }

  .product-render-situation__header span,
  .product-render-situation__footer span,
  .product-render-situation__title strong {
    color: var(--color-text-muted);
    font-size: 0.65rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .product-render-situation__header strong {
    display: block;
    color: var(--color-text);
    font-size: 0.9rem;
    line-height: 1.1;
  }

  .product-render-situation__controls,
  .product-render-situation__segments,
  .product-render-situation__footer > div:last-child {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .product-render-situation__segments {
    overflow: hidden;
    gap: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.45rem;
    background: color-mix(in srgb, var(--color-background-elevated) 82%, transparent);
  }

  .product-render-situation button {
    font: inherit;
  }

  .product-render-situation__segments button,
  .product-render-situation__toolbar button,
  .product-render-situation__toolbar span,
  .product-render-situation__footer button {
    min-height: 1.7rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.38rem;
    background: var(--color-background-elevated);
    color: var(--color-text);
    padding: 0 0.56rem;
    font-size: 0.66rem;
    font-weight: 760;
  }

  .product-render-situation__segments button {
    min-width: 2.2rem;
    width: 2.2rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    padding: 0;
  }

  .product-render-situation__segments button :global(.workbench-icon) {
    width: 0.95rem;
    height: 0.95rem;
  }

  .product-render-situation__segments button + button {
    border-left: 1px solid var(--color-border-subtle);
  }

  .product-render-situation__segment--active,
  .product-render-situation__surface--active {
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 26%, var(--color-background-elevated)) !important;
    color: var(--color-text) !important;
  }

  .product-render-situation__viewer {
    position: relative;
    min-width: 0;
    min-height: 22rem;
    overflow: hidden;
    border-block: 1px solid color-mix(in srgb, var(--color-border-subtle) 74%, transparent);
    background:
      radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 8%, transparent), transparent 30rem),
      var(--color-background-canvas);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .product-render-situation__viewer--panning {
    cursor: grabbing;
  }

  .product-render-situation__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--color-border-subtle) 42%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-border-subtle) 42%, transparent) 1px, transparent 1px),
      linear-gradient(color-mix(in srgb, var(--color-border-subtle) 70%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-border-subtle) 70%, transparent) 1px, transparent 1px);
    background-size:
      calc(1rem * var(--product-render-grid-scale, 1)) calc(1rem * var(--product-render-grid-scale, 1)),
      calc(1rem * var(--product-render-grid-scale, 1)) calc(1rem * var(--product-render-grid-scale, 1)),
      calc(8rem * var(--product-render-grid-scale, 1)) calc(8rem * var(--product-render-grid-scale, 1)),
      calc(8rem * var(--product-render-grid-scale, 1)) calc(8rem * var(--product-render-grid-scale, 1));
    opacity: 0.58;
    pointer-events: none;
  }

  .product-render-situation__axis,
  .product-render-situation__ruler {
    position: absolute;
    z-index: 1;
    pointer-events: none;
  }

  .product-render-situation__axis--x {
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 91, 78, 0.78);
  }

  .product-render-situation__axis--y {
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 91, 78, 0.78);
  }

  .product-render-situation__ruler {
    inset: 0;
    color: var(--color-text-muted);
    font-size: 0.64rem;
    font-weight: 780;
  }

  .product-render-situation__ruler span {
    position: absolute;
    white-space: nowrap;
  }

  .product-render-situation__ruler--x span {
    transform: translate(-50%, 1rem);
  }

  .product-render-situation__ruler--y span {
    transform: translate(0.8rem, -50%);
  }

  .product-render-situation__title {
    position: absolute;
    top: 0.88rem;
    left: 0.88rem;
    z-index: 3;
    display: grid;
    gap: 0.18rem;
    pointer-events: none;
  }

  .product-render-situation__title span {
    color: var(--color-text);
    font-size: 0.72rem;
    font-weight: 820;
  }

  .product-render-situation__viewport {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 2;
    border: 1px dashed color-mix(in srgb, var(--color-action-primary) 78%, transparent);
    background: color-mix(in srgb, var(--color-background-canvas) 24%, transparent);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
    transform-origin: center;
  }

  .product-render-situation__real-preview {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 2;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px dashed color-mix(in srgb, var(--color-action-primary) 58%, transparent);
    background:
      radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 14%, transparent), transparent 18rem),
      color-mix(in srgb, var(--color-background-canvas) 50%, transparent);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
    transform-origin: center;
  }

  .product-render-situation__theme-reveal {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--color-background-canvas);
  }

  .product-render-situation__theme-reveal::before {
    content: '';
    position: absolute;
    z-index: 4;
    inset: 0 auto 0 var(--theme-reveal-position);
    width: 0.125rem;
    background: color-mix(in srgb, var(--color-action-primary) 78%, var(--color-border-strong));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-background-surface) 88%, transparent),
      0 0 12px color-mix(in srgb, var(--color-action-primary) 28%, transparent);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .product-render-situation__theme-reveal-layer {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2rem;
    background:
      radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 14%, transparent), transparent 19rem),
      var(--color-background-canvas);
  }

  .product-render-situation__theme-reveal-layer--light {
    z-index: 1;
    color-scheme: light;
    --color-background-canvas: #f6f8fc;
    --color-background-surface: #ffffff;
    --color-background-elevated: #f1f5fb;
    --color-background-muted: #e6edf7;
    --color-background-hover: #e8eef8;
    --color-background-pressed: #dfe8f5;
    --color-background-selected: #dbe8fb;
    --color-background-danger: #fff0f2;
    --color-background-danger-hover: #ffe3e7;
    --color-border-subtle: #c9d4e3;
    --color-border-strong: #98a9c0;
    --color-border-focus: #3d73d9;
    --color-border-danger: #e8a7b0;
    --color-text: #101721;
    --color-text-primary: #101721;
    --color-text-secondary: #334155;
    --color-text-muted: #68778c;
    --color-text-danger: #a43f4d;
    --color-action-primary: #3d73d9;
    --color-action-danger: #c84b5a;
  }

  .product-render-situation__theme-reveal-layer--dark {
    z-index: 2;
    overflow: hidden;
    pointer-events: none;
    clip-path: inset(0 calc(100% - var(--theme-reveal-position)) 0 0);
    color-scheme: dark;
    --color-background-canvas: #0d1117;
    --color-background-surface: #111821;
    --color-background-elevated: #17202b;
    --color-background-muted: #202a36;
    --color-background-hover: #1c2734;
    --color-background-pressed: #263343;
    --color-background-selected: #20304a;
    --color-background-danger: #2b161d;
    --color-background-danger-hover: #3a1d26;
    --color-border-subtle: #273344;
    --color-border-strong: #3c4b61;
    --color-border-focus: #6f9cff;
    --color-border-danger: #6f3642;
    --color-text: #f6f8fb;
    --color-text-primary: #f6f8fb;
    --color-text-secondary: #c8d3e0;
    --color-text-muted: #8795a8;
    --color-text-danger: #ff8a9a;
    --color-action-primary: #6f9cff;
    --color-action-danger: #ff6f87;
  }

  .product-render-situation__theme-reveal-handle {
    position: absolute;
    z-index: 10;
    top: 50%;
    left: var(--theme-reveal-position);
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 1.65rem;
    min-height: 0;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-action-primary) 74%, var(--color-border-strong));
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background-surface) 94%, var(--color-background-canvas));
    color: var(--color-text-primary);
    cursor: ew-resize;
    transform: translate(-50%, -50%);
    touch-action: none;
    pointer-events: auto;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--color-background-canvas) 54%, transparent),
      0 8px 18px color-mix(in srgb, var(--color-background-canvas) 34%, transparent);
  }

  .product-render-situation__theme-reveal-handle::before {
    content: '';
    position: absolute;
    inset: -0.35rem auto auto 50%;
    width: 1.25rem;
    height: 0.18rem;
    border-radius: 999px;
    background: linear-gradient(90deg, #0d1117 0 50%, #f8fafc 50% 100%);
    transform: translateX(-50%);
  }

  .product-render-situation__theme-reveal-handle span {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(90deg, #0d1117 0 50%, #f8fafc 50% 100%);
  }

  .product-render-situation__theme-reveal-handle span::before,
  .product-render-situation__theme-reveal-handle span::after {
    position: absolute;
    top: 50%;
    font-size: 0.55rem;
    font-weight: 900;
    line-height: 1;
    transform: translateY(-50%);
  }

  .product-render-situation__theme-reveal-handle span::before {
    left: 0.42rem;
    color: #f8fafc;
    content: 'D';
  }

  .product-render-situation__theme-reveal-handle span::after {
    right: 0.46rem;
    color: #0d1117;
    content: 'L';
  }

  .product-render-situation__theme-reveal-handle:focus-visible {
    outline: none;
  }

  .product-render-situation__theme-reveal-handle:focus-visible span {
    box-shadow:
      0 0 0 2px var(--color-background-surface),
      0 0 0 4px var(--color-border-focus),
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 32%, transparent);
  }

  .product-render-situation__theme-reveal--dragging .product-render-situation__theme-reveal-handle span {
    transform: scale(1.04);
  }

  .product-render-situation__viewport-label {
    position: absolute;
    left: 0;
    top: -1.84rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: color-mix(in srgb, var(--color-action-primary) 82%, var(--color-text));
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .product-render-situation__viewport-label strong {
    padding: 0.18rem 0.42rem;
    border-radius: 0.24rem;
    background: color-mix(in srgb, var(--color-action-primary) 54%, var(--color-background-canvas));
    color: white;
  }

  .product-render-situation__layer {
    position: absolute;
    display: grid;
    align-content: start;
    gap: 0.26rem;
    overflow: hidden;
    margin: 0;
    border: 1px solid color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 72%, transparent);
    border-radius: 0.25rem;
    padding: 0.42rem 0.5rem;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 16%, transparent), transparent 58%),
      color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 8%, var(--color-background-elevated));
    color: var(--color-text);
    text-align: left;
  }

  .product-render-situation__layer:disabled {
    cursor: default;
  }

  .product-render-situation__layer span {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.45rem;
    min-width: 0;
    text-align: center;
  }

  .product-render-situation__layer strong,
  .product-render-situation__layer small,
  .product-render-situation__layer code,
  .product-render-situation__layer em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-render-situation__layer strong {
    color: var(--color-text);
    font-size: 0.72rem;
    font-weight: 850;
  }

  .product-render-situation__layer small,
  .product-render-situation__layer code,
  .product-render-situation__layer em {
    color: var(--color-text-muted);
    font-size: 0.56rem;
    font-style: normal;
  }

  .product-render-situation__layer code {
    margin-top: auto;
    color: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 72%, var(--color-text-muted));
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__viewport {
    background:
      radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 16%, transparent), transparent 15rem),
      color-mix(in srgb, var(--color-background-canvas) 42%, transparent);
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer:first-of-type {
    place-items: center;
    align-content: center;
    text-align: center;
    border-width: 2px;
    border-radius: 0.45rem;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 24%, transparent), transparent 62%),
      color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 12%, var(--color-background-elevated));
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer:first-of-type strong {
    font-size: 0.9rem;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-contract'] {
    place-items: stretch;
    align-content: start;
    gap: 0.3rem;
    text-align: left;
    border-style: solid;
    border-width: 1px;
    border-radius: 0.72rem;
    padding: 0.82rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 10%, transparent), transparent 54%),
      color-mix(in srgb, var(--color-background-surface) 54%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, white 4%, transparent),
      0 20px 70px rgba(0, 0, 0, 0.2);
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-contract'] span {
    justify-content: space-between;
    text-align: left;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-contract'] strong {
    font-size: 0.74rem;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-contract'] em {
    color: var(--color-text);
    font-size: 0.82rem;
    font-weight: 850;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-instance'] {
    place-items: center;
    align-content: center;
    border-width: 2px;
    border-radius: var(--radius-medium);
    padding: 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-hover) 78%, transparent), color-mix(in srgb, var(--color-background-elevated) 92%, transparent)),
      color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 8%, var(--color-background-elevated));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 14%, transparent),
      0 12px 26px color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 22%, transparent);
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-instance']::before {
    content: '';
    width: var(--size-icon);
    height: var(--size-icon);
    border: 2px solid currentColor;
    border-radius: 0.2rem;
    opacity: 0.9;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-instance'] span,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-instance'] em,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-instance'] code {
    display: none;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-slot'] {
    display: grid;
    place-items: center;
    align-content: center;
    padding: 0;
    border-style: dashed;
    border-radius: 999px;
    background: color-mix(in srgb, var(--product-tone-color, var(--color-action-primary)) 10%, var(--color-background-canvas));
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-slot']::before {
    content: '';
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.8;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-slot'] span,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-slot'] em,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='component-slot'] code {
    display: none;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='state'],
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='token'],
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='relation'] {
    align-content: center;
    gap: 0.14rem;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='state'] span,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='token'] span,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='relation'] span {
    justify-content: flex-start;
  }

  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='state'] strong,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='token'] strong,
  .product-render-situation[data-layout-variant='isolated'] .product-render-situation__layer[data-render-role='relation'] strong {
    font-size: 0.64rem;
  }

  .product-render-situation__toolbar {
    position: absolute;
    left: 50%;
    bottom: 1.05rem;
    z-index: 4;
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    padding: 0.42rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.54rem;
    background: color-mix(in srgb, var(--color-background-elevated) 92%, transparent);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.26);
    transform: translateX(-50%);
  }

  .product-render-situation__readout {
    position: absolute;
    left: 0.9rem;
    bottom: 0.9rem;
    z-index: 4;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.42rem 0.55rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.52rem;
    background: color-mix(in srgb, var(--color-background-elevated) 92%, transparent);
    color: var(--color-text-muted);
    font-size: 0.66rem;
    font-weight: 780;
  }

  .product-render-situation__readout strong {
    color: var(--color-text);
  }

  .product-render-situation__footer {
    align-items: end;
    padding: 0 0.72rem 0.72rem;
  }

  .product-render-situation__footer > div {
    display: grid;
    gap: 0.12rem;
  }

  .product-render-situation__footer strong {
    color: var(--color-text);
    font-size: 0.74rem;
  }

  .product-render-situation__surface-modes button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .product-render-situation__surface-modes button :global(.workbench-icon) {
    width: 0.82rem;
    height: 0.82rem;
  }

  @media (max-width: 920px) {
    .product-render-situation__header,
    .product-render-situation__footer {
      align-items: stretch;
      flex-direction: column;
    }

    .product-render-situation__controls {
      display: grid;
      grid-template-columns: 1fr;
    }
  }
</style>
