<script lang="ts">
  import {
    getActiveWindow,
    type HostedShellWidgetProps,
    type LayoutEdge,
    type LayoutNode,
    type ShellWidgetDefinition
  } from '@konitif/workbench';
  import { onMount } from 'svelte';
  import {
    useWorkspaceDebugHoverContext,
    type WorkspaceDebugCorner,
    type WorkspaceDebugHoverTarget
  } from '../debug/workspaceDebugHover';
  import { flattenSplitChain } from '../layout/splitChain';

  export let runtime: HostedShellWidgetProps['runtime'];
  export let definition: ShellWidgetDefinition;

  interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface CellVisual {
    id: string;
    stackId: string;
    bounds: Bounds;
    title: string;
    subtitle: string;
    color: string;
    active: boolean;
  }

  interface BandVisual {
    id: string;
    bounds: Bounds;
    label: 'row' | 'col';
    depth: number;
  }

  interface LabelVisual {
    id: string;
    label: 'root' | 'row' | 'col';
    x: number;
    y: number;
    width: number;
    height: number;
    textX: number;
    textY: number;
  }

  interface ResizeVisual {
    id: string;
    splitId: string;
    rootSplitId: string;
    boundaryIndex: number;
    orientation: 'horizontal' | 'vertical';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  interface IntersectionVisual {
    id: string;
    x: number;
    y: number;
    kind: 'resize-resize' | 'resize-edge' | 'edge-edge';
    hoverTarget: WorkspaceDebugHoverTarget;
  }

  interface EdgeVisual {
    id: string;
    edge: LayoutEdge;
    orientation: 'horizontal' | 'vertical';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  interface ResizeBoundaryMetadata {
    rootSplitId: string;
    boundaryIndex: number;
  }

  type ResizeGuide = ResizeVisual & { source: 'resize' };
  type EdgeGuide = EdgeVisual & { source: 'edge' };
  type IntersectionGuide = ResizeGuide | EdgeGuide;

  const DEFAULT_VIEWBOX_WIDTH = 1000;
  const DEFAULT_VIEWBOX_HEIGHT = 520;
  const EDGE_GUTTER = 20;
  const ROOT_PADDING = EDGE_GUTTER;
  const ROOT_VERTICAL_MARGIN = EDGE_GUTTER;
  const STANDARD_TOP_PADDING = ROOT_VERTICAL_MARGIN / 2;
  const BAND_PADDING = 12;
  const PANEL_PADDING = BAND_PADDING;
  const LABEL_HEIGHT = 16;
  const LABEL_CLEARANCE = LABEL_HEIGHT * 3 + 8;
  const RESIZE_CAP_INSET = 4;
  const CELL_COLORS = [
    '#6b8cff1c',
    '#67d0ff1a',
    '#7fd35d1a',
    '#f0a04a1a',
    '#f16aa51a',
    '#c27cff1a'
  ];
  const workspaceDebugHover = useWorkspaceDebugHoverContext();
  const debugHoverStore = workspaceDebugHover.hoveredTarget;
  $: debugHoverTarget = $debugHoverStore;

  function insetBounds(bounds: Bounds, inset: number): Bounds {
    return {
      x: bounds.x + inset,
      y: bounds.y + inset,
      width: Math.max(0, bounds.width - inset * 2),
      height: Math.max(0, bounds.height - inset * 2)
    };
  }

  function insetBoundsWithTopClearance(bounds: Bounds, insetX: number, insetBottom: number, insetTop: number): Bounds {
    return {
      x: bounds.x + insetX,
      y: bounds.y + insetTop,
      width: Math.max(0, bounds.width - insetX * 2),
      height: Math.max(0, bounds.height - insetTop - insetBottom)
    };
  }

  function getBandInset(_depth: number): number {
    return BAND_PADDING;
  }

  function getCellInset(_depth: number): number {
    return PANEL_PADDING;
  }

  function getCellTopInset(depth: number): number {
    return getCellInset(depth) + STANDARD_TOP_PADDING;
  }

  function getBandTopInset(depth: number, _label: 'row' | 'col'): number {
    return getBandInset(depth) + STANDARD_TOP_PADDING;
  }

  function getNodeVisualBounds(node: LayoutNode, bounds: Bounds, depth: number): Bounds {
    if (node.kind === 'stack') {
      return insetBoundsWithTopClearance(
        bounds,
        getCellInset(depth),
        getCellInset(depth),
        getCellTopInset(depth)
      );
    }

    const bandInset = getBandInset(depth);
    const label = node.orientation === 'vertical' ? 'row' : 'col';
    return insetBoundsWithTopClearance(bounds, bandInset, bandInset, getBandTopInset(depth, label));
  }

  function getBoundsRight(bounds: Bounds): number {
    return bounds.x + bounds.width;
  }

  function getBoundsBottom(bounds: Bounds): number {
    return bounds.y + bounds.height;
  }

  function buildVerticalResizeVisual(
    id: string,
    splitId: string,
    boundary: ResizeBoundaryMetadata,
    leftBounds: Bounds,
    rightBounds: Bounds
  ): ResizeVisual {
    const overlapTop = Math.max(leftBounds.y, rightBounds.y);
    const overlapBottom = Math.min(getBoundsBottom(leftBounds), getBoundsBottom(rightBounds));
    const y1 = overlapTop + RESIZE_CAP_INSET;
    const y2 = overlapBottom - RESIZE_CAP_INSET;
    const fallbackMidY = (overlapTop + overlapBottom) / 2;

    return {
      id,
      splitId,
      ...boundary,
      orientation: 'vertical',
      x1: (getBoundsRight(leftBounds) + rightBounds.x) / 2,
      y1: y2 > y1 ? y1 : fallbackMidY,
      x2: (getBoundsRight(leftBounds) + rightBounds.x) / 2,
      y2: y2 > y1 ? y2 : fallbackMidY
    };
  }

  function buildHorizontalResizeVisual(
    id: string,
    splitId: string,
    boundary: ResizeBoundaryMetadata,
    topBounds: Bounds,
    bottomBounds: Bounds
  ): ResizeVisual {
    const overlapLeft = Math.max(topBounds.x, bottomBounds.x);
    const overlapRight = Math.min(getBoundsRight(topBounds), getBoundsRight(bottomBounds));
    const x1 = overlapLeft + RESIZE_CAP_INSET;
    const x2 = overlapRight - RESIZE_CAP_INSET;
    const fallbackMidX = (overlapLeft + overlapRight) / 2;

    return {
      id,
      splitId,
      ...boundary,
      orientation: 'horizontal',
      x1: x2 > x1 ? x1 : fallbackMidX,
      y1: (getBoundsBottom(topBounds) + bottomBounds.y) / 2,
      x2: x2 > x1 ? x2 : fallbackMidX,
      y2: (getBoundsBottom(topBounds) + bottomBounds.y) / 2
    };
  }

  function rangeContains(value: number, start: number, end: number): boolean {
    return value >= Math.min(start, end) && value <= Math.max(start, end);
  }

  function clampResizeExtents(resizes: ResizeVisual[], edges: EdgeVisual[]): ResizeVisual[] {
    const horizontalAnchors = [
      ...resizes.filter((resize) => resize.orientation === 'horizontal'),
      ...edges.filter((edge) => edge.orientation === 'horizontal')
    ];
    const verticalAnchors = [
      ...resizes.filter((resize) => resize.orientation === 'vertical'),
      ...edges.filter((edge) => edge.orientation === 'vertical')
    ];

    return resizes.map((resize) => {
      if (resize.orientation === 'vertical') {
        const centerY = (resize.y1 + resize.y2) / 2;
        const anchors = horizontalAnchors
          .filter((anchor) => rangeContains(resize.x1, anchor.x1, anchor.x2))
          .map((anchor) => anchor.y1);
        const above = anchors.filter((anchorY) => anchorY <= centerY);
        const below = anchors.filter((anchorY) => anchorY >= centerY);
        const y1 = above.length > 0 ? Math.max(...above) : resize.y1;
        const y2 = below.length > 0 ? Math.min(...below) : resize.y2;

        return {
          ...resize,
          y1,
          y2
        };
      }

      const centerX = (resize.x1 + resize.x2) / 2;
      const anchors = verticalAnchors
        .filter((anchor) => rangeContains(resize.y1, anchor.y1, anchor.y2))
        .map((anchor) => anchor.x1);
      const left = anchors.filter((anchorX) => anchorX <= centerX);
      const right = anchors.filter((anchorX) => anchorX >= centerX);
      const x1 = left.length > 0 ? Math.max(...left) : resize.x1;
      const x2 = right.length > 0 ? Math.min(...right) : resize.x2;

      return {
        ...resize,
        x1,
        x2
      };
    });
  }

  function getIntersectionKind(
    verticalSource: 'resize' | 'edge',
    horizontalSource: 'resize' | 'edge'
  ): IntersectionVisual['kind'] {
    if (verticalSource === 'edge' && horizontalSource === 'edge') {
      return 'edge-edge';
    }

    if (verticalSource === 'resize' && horizontalSource === 'resize') {
      return 'resize-resize';
    }

    return 'resize-edge';
  }

  function resolveCornerFromEdges(verticalEdge: LayoutEdge, horizontalEdge: LayoutEdge): WorkspaceDebugCorner | null {
    if (verticalEdge === 'left' && horizontalEdge === 'top') {
      return 'top-left';
    }

    if (verticalEdge === 'right' && horizontalEdge === 'top') {
      return 'top-right';
    }

    if (verticalEdge === 'left' && horizontalEdge === 'bottom') {
      return 'bottom-left';
    }

    if (verticalEdge === 'right' && horizontalEdge === 'bottom') {
      return 'bottom-right';
    }

    return null;
  }

  function createIntersectionHoverTarget(
    verticalGuide: IntersectionGuide,
    horizontalGuide: IntersectionGuide
  ): WorkspaceDebugHoverTarget {
    if (verticalGuide.source === 'resize' && horizontalGuide.source === 'resize') {
      return {
        kind: 'intersection-resize',
        columnSplitId: verticalGuide.splitId,
        columnRootSplitId: verticalGuide.rootSplitId,
        columnBoundaryIndex: verticalGuide.boundaryIndex,
        rowSplitId: horizontalGuide.splitId,
        rowRootSplitId: horizontalGuide.rootSplitId,
        rowBoundaryIndex: horizontalGuide.boundaryIndex
      };
    }

    if (verticalGuide.source === 'edge' && horizontalGuide.source === 'edge') {
      return {
        kind: 'corner',
        corner: resolveCornerFromEdges(verticalGuide.edge, horizontalGuide.edge) ?? 'top-left'
      };
    }

    if (verticalGuide.source === 'edge' && horizontalGuide.source === 'resize') {
      return {
        kind: 'intersection-edge',
        edge: verticalGuide.edge,
        splitId: horizontalGuide.splitId
      };
    }

    if (verticalGuide.source === 'resize' && horizontalGuide.source === 'edge') {
      return {
        kind: 'intersection-edge',
        edge: horizontalGuide.edge,
        splitId: verticalGuide.splitId
      };
    }

    throw new Error('Unsupported debug intersection guide pair');
  }

  function setDebugHoverTarget(target: WorkspaceDebugHoverTarget | null): void {
    workspaceDebugHover.setHoveredTarget(target);
  }

  function isResizeDebugHighlighted(splitId: string): boolean {
    return (
      (debugHoverTarget?.kind === 'resize' && debugHoverTarget.splitId === splitId) ||
      (debugHoverTarget?.kind === 'intersection-edge' && debugHoverTarget.splitId === splitId)
    );
  }

  function isEdgeDebugHighlighted(edge: LayoutEdge): boolean {
    return (
      (debugHoverTarget?.kind === 'edge' && debugHoverTarget.edge === edge) ||
      (debugHoverTarget?.kind === 'intersection-edge' && debugHoverTarget.edge === edge) ||
      (debugHoverTarget?.kind === 'corner' &&
        ((debugHoverTarget.corner === 'top-left' && (edge === 'top' || edge === 'left')) ||
          (debugHoverTarget.corner === 'top-right' && (edge === 'top' || edge === 'right')) ||
          (debugHoverTarget.corner === 'bottom-left' && (edge === 'bottom' || edge === 'left')) ||
          (debugHoverTarget.corner === 'bottom-right' && (edge === 'bottom' || edge === 'right'))))
    );
  }

  function isIntersectionDebugHighlighted(intersection: IntersectionVisual): boolean {
    if (!debugHoverTarget) {
      return false;
    }

    if (intersection.hoverTarget.kind === 'intersection-resize' && debugHoverTarget.kind === 'intersection-resize') {
      return (
        debugHoverTarget.columnSplitId === intersection.hoverTarget.columnSplitId &&
        debugHoverTarget.rowSplitId === intersection.hoverTarget.rowSplitId
      );
    }

    if (intersection.hoverTarget.kind === 'intersection-edge' && debugHoverTarget.kind === 'intersection-edge') {
      return (
        debugHoverTarget.edge === intersection.hoverTarget.edge &&
        debugHoverTarget.splitId === intersection.hoverTarget.splitId
      );
    }

    if (intersection.hoverTarget.kind === 'corner' && debugHoverTarget.kind === 'corner') {
      return debugHoverTarget.corner === intersection.hoverTarget.corner;
    }

    return false;
  }

  function buildLabelVisual(id: string, label: 'root' | 'row' | 'col', bounds: Bounds): LabelVisual {
    const width = label.length * 7.2 + 18;
    const height = LABEL_HEIGHT;
    const x = bounds.x + 12;
    const y = bounds.y - height / 2;

    return {
      id,
      label,
      x,
      y,
      width,
      height,
      textX: x + 8,
      textY: bounds.y + 3
    };
  }

  function formatStackTitle(node: Extract<LayoutNode, { kind: 'stack' }>): string {
    if (node.children.length === 1) {
      return node.children[0].title;
    }

    const activePanel = node.children.find((panel) => panel.id === node.activeChildId) ?? node.children[0];
    return activePanel ? `${activePanel.title} +${node.children.length - 1}` : `${node.children.length} tabs`;
  }

  function buildLayoutVisuals(
    node: LayoutNode | null,
    activePanelId: string | null,
    viewportWidth: number,
    viewportHeight: number
  ): {
    cells: CellVisual[];
    bands: BandVisual[];
    labels: LabelVisual[];
    resizes: ResizeVisual[];
    intersections: IntersectionVisual[];
    edges: EdgeVisual[];
    rowCount: number;
    colCount: number;
    cellCount: number;
  } {
    if (!node) {
      return {
        cells: [],
        bands: [],
        labels: [],
        resizes: [],
        intersections: [],
        edges: [],
        rowCount: 0,
        colCount: 0,
        cellCount: 0
      };
    }

    const cells: CellVisual[] = [];
    const bands: BandVisual[] = [];
    const labels: LabelVisual[] = [];
    const resizes: ResizeVisual[] = [];
    const resizeBoundaries = new Map<string, ResizeBoundaryMetadata>();
    let rowCount = 0;
    let colCount = 0;

    function collectResizeBoundaries(
      current: LayoutNode,
      parentOrientation: 'horizontal' | 'vertical' | null = null
    ): void {
      if (current.kind === 'stack') {
        return;
      }

      if (current.orientation !== parentOrientation) {
        flattenSplitChain(current).handles.forEach((handle, boundaryIndex) => {
          resizeBoundaries.set(handle.splitId, {
            rootSplitId: current.id,
            boundaryIndex
          });
        });
      }

      collectResizeBoundaries(current.children[0], current.orientation);
      collectResizeBoundaries(current.children[1], current.orientation);
    }

    collectResizeBoundaries(node);

    function visit(
      current: LayoutNode,
      bounds: Bounds,
      depth: number,
      parentOrientation: 'horizontal' | 'vertical' | null = null
    ): void {
      if (current.kind === 'stack') {
        const active = activePanelId ? current.children.some((panel) => panel.id === activePanelId) : false;
        const primaryPanel = current.children.find((panel) => panel.id === current.activeChildId) ?? current.children[0];

        cells.push({
          id: current.id,
          stackId: current.id,
          bounds: getNodeVisualBounds(current, bounds, depth),
          title: formatStackTitle(current),
          subtitle: primaryPanel ? primaryPanel.id.slice(0, 8) : current.id.slice(0, 8),
          color: CELL_COLORS[cells.length % CELL_COLORS.length],
          active
        });
        return;
      }

      const label = current.orientation === 'vertical' ? 'row' : 'col';
      const isCollapsedIntoParent = parentOrientation === current.orientation || depth === 0;
      const bandInset = getBandInset(depth);
      const bandBounds = isCollapsedIntoParent
        ? bounds
        : insetBoundsWithTopClearance(
            bounds,
            bandInset,
            bandInset,
            getBandTopInset(depth, label)
          );

      if (!isCollapsedIntoParent) {
        bands.push({
          id: current.id,
          bounds: bandBounds,
          label,
          depth
        });
        labels.push(buildLabelVisual(`${current.id}-label`, label, bandBounds));

        if (label === 'row') {
          rowCount += 1;
        } else {
          colCount += 1;
        }
      }

      const contentBounds = bandBounds;
      const childDepth = isCollapsedIntoParent ? depth : depth + 1;

      if (current.orientation === 'horizontal') {
        const leftWidth = contentBounds.width * current.sizes[0];
        const leftBounds = {
          x: contentBounds.x,
          y: contentBounds.y,
          width: leftWidth,
          height: contentBounds.height
        };
        const rightBounds = {
          x: contentBounds.x + leftWidth,
          y: contentBounds.y,
          width: contentBounds.width - leftWidth,
          height: contentBounds.height
        };
        const leftVisualBounds = getNodeVisualBounds(current.children[0], leftBounds, childDepth);
        const rightVisualBounds = getNodeVisualBounds(current.children[1], rightBounds, childDepth);
        resizes.push(buildVerticalResizeVisual(
          `${current.id}-resize`,
          current.id,
          resizeBoundaries.get(current.id) ?? { rootSplitId: current.id, boundaryIndex: 0 },
          leftVisualBounds,
          rightVisualBounds
        ));
        visit(current.children[0], leftBounds, childDepth, current.orientation);
        visit(current.children[1], rightBounds, childDepth, current.orientation);
        return;
      }

      const topHeight = contentBounds.height * current.sizes[0];
      const topBounds = { x: contentBounds.x, y: contentBounds.y, width: contentBounds.width, height: topHeight };
      const bottomBounds = {
        x: contentBounds.x,
        y: contentBounds.y + topHeight,
        width: contentBounds.width,
        height: contentBounds.height - topHeight
      };
      const topVisualBounds = getNodeVisualBounds(current.children[0], topBounds, childDepth);
      const bottomVisualBounds = getNodeVisualBounds(current.children[1], bottomBounds, childDepth);
      resizes.push(buildHorizontalResizeVisual(
        `${current.id}-resize`,
        current.id,
        resizeBoundaries.get(current.id) ?? { rootSplitId: current.id, boundaryIndex: 0 },
        topVisualBounds,
        bottomVisualBounds
      ));
      visit(current.children[0], topBounds, childDepth, current.orientation);
      visit(current.children[1], bottomBounds, childDepth, current.orientation);
    }

    visit(
      node,
      {
        x: ROOT_PADDING,
        y: ROOT_VERTICAL_MARGIN,
        width: Math.max(0, viewportWidth - ROOT_PADDING * 2),
        height: Math.max(0, viewportHeight - ROOT_VERTICAL_MARGIN * 2)
      },
      0
    );

    const rootBounds = {
      x: ROOT_PADDING,
      y: ROOT_VERTICAL_MARGIN,
      width: Math.max(0, viewportWidth - ROOT_PADDING * 2),
      height: Math.max(0, viewportHeight - ROOT_VERTICAL_MARGIN * 2)
    };
    labels.unshift(buildLabelVisual('root-label', 'root', rootBounds));
    const edgeOffsetX = rootBounds.x / 2;
    const edgeOffsetY = rootBounds.y / 2;
    const edges: EdgeVisual[] = [
      {
        id: 'edge-top',
        edge: 'top',
        orientation: 'horizontal',
        x1: edgeOffsetX,
        y1: edgeOffsetY,
        x2: rootBounds.x + rootBounds.width + edgeOffsetX,
        y2: edgeOffsetY
      },
      {
        id: 'edge-bottom',
        edge: 'bottom',
        orientation: 'horizontal',
        x1: edgeOffsetX,
        y1: rootBounds.y + rootBounds.height + edgeOffsetY,
        x2: rootBounds.x + rootBounds.width + edgeOffsetX,
        y2: rootBounds.y + rootBounds.height + edgeOffsetY
      },
      {
        id: 'edge-left',
        edge: 'left',
        orientation: 'vertical',
        x1: edgeOffsetX,
        y1: edgeOffsetY,
        x2: edgeOffsetX,
        y2: rootBounds.y + rootBounds.height + edgeOffsetY
      },
      {
        id: 'edge-right',
        edge: 'right',
        orientation: 'vertical',
        x1: rootBounds.x + rootBounds.width + edgeOffsetX,
        y1: edgeOffsetY,
        x2: rootBounds.x + rootBounds.width + edgeOffsetX,
        y2: rootBounds.y + rootBounds.height + edgeOffsetY
      }
    ];
    const normalizedResizes = clampResizeExtents(resizes, edges);
    const verticalResizes = normalizedResizes.filter((resize) => resize.orientation === 'vertical');
    const horizontalResizes = normalizedResizes.filter((resize) => resize.orientation === 'horizontal');
    const intersections: IntersectionVisual[] = [];

    const verticalGuides = [
      ...verticalResizes.map((resize) => ({ ...resize, source: 'resize' as const })),
      ...edges
        .filter((edge) => edge.orientation === 'vertical')
        .map((edge) => ({ ...edge, source: 'edge' as const }))
    ];
    const horizontalGuides = [
      ...horizontalResizes.map((resize) => ({ ...resize, source: 'resize' as const })),
      ...edges
        .filter((edge) => edge.orientation === 'horizontal')
        .map((edge) => ({ ...edge, source: 'edge' as const }))
    ];

    for (const verticalGuide of verticalGuides) {
      for (const horizontalGuide of horizontalGuides) {
        if (
          verticalGuide.x1 >= Math.min(horizontalGuide.x1, horizontalGuide.x2) &&
          verticalGuide.x1 <= Math.max(horizontalGuide.x1, horizontalGuide.x2) &&
          horizontalGuide.y1 >= Math.min(verticalGuide.y1, verticalGuide.y2) &&
          horizontalGuide.y1 <= Math.max(verticalGuide.y1, verticalGuide.y2)
        ) {
          intersections.push({
            id: `${verticalGuide.id}:${horizontalGuide.id}`,
            x: verticalGuide.x1,
            y: horizontalGuide.y1,
            kind: getIntersectionKind(verticalGuide.source, horizontalGuide.source),
            hoverTarget: createIntersectionHoverTarget(verticalGuide, horizontalGuide)
          });
        }
      }
    }

    return {
      cells,
      bands,
      labels,
      resizes: normalizedResizes,
      intersections,
      edges,
      rowCount,
      colCount,
      cellCount: cells.length
    };
  }

  let viewboxWidth = DEFAULT_VIEWBOX_WIDTH;
  let viewboxHeight = DEFAULT_VIEWBOX_HEIGHT;

  onMount(() => {
    const workspaceElement = document.querySelector<HTMLElement>('.app-shell__workspace');

    if (!workspaceElement) {
      return undefined;
    }

    const updateViewbox = ({ width, height }: DOMRectReadOnly): void => {
      viewboxWidth = Math.max(320, Math.round(width));
      viewboxHeight = Math.max(180, Math.round(height));
    };

    updateViewbox(workspaceElement.getBoundingClientRect());

    const resizeObserver = new ResizeObserver((entries) => {
      const [entry] = entries;

      if (!entry) {
        return;
      }

      updateViewbox(entry.contentRect);
    });

    resizeObserver.observe(workspaceElement);

    return () => {
      resizeObserver.disconnect();
    };
  });

  $: activeWindow = getActiveWindow(runtime.workspace);
  $: visuals = buildLayoutVisuals(activeWindow?.root ?? null, runtime.session.activePanelId, viewboxWidth, viewboxHeight);
</script>

<section class="masonry-debug-widget" aria-label={definition.title}>
  <header class="masonry-debug-widget__summary">
    <span class="masonry-debug-widget__chip">rows {visuals.rowCount}</span>
    <span class="masonry-debug-widget__chip">cols {visuals.colCount}</span>
    <span class="masonry-debug-widget__chip">cells {visuals.cellCount}</span>
  </header>

  <div class="masonry-debug-widget__viewport">
    <svg
      class="masonry-debug-widget__svg"
      viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      on:pointerleave={() => setDebugHoverTarget(null)}
    >
      <rect
        class="masonry-debug-widget__frame"
        x="0"
        y="0"
        width={viewboxWidth}
        height={viewboxHeight}
        rx="12"
      />

      <rect
        class="masonry-debug-widget__frame"
        x={ROOT_PADDING}
        y={ROOT_VERTICAL_MARGIN}
        width={Math.max(0, viewboxWidth - ROOT_PADDING * 2)}
        height={Math.max(0, viewboxHeight - ROOT_VERTICAL_MARGIN * 2)}
        rx="10"
      />

      {#each visuals.bands as band (band.id)}
        <g class="masonry-debug-widget__band-group">
          <rect
            class:masonry-debug-widget__band--row={band.label === 'row'}
            class:masonry-debug-widget__band--col={band.label === 'col'}
            class="masonry-debug-widget__band"
            x={band.bounds.x}
            y={band.bounds.y}
            width={band.bounds.width}
            height={band.bounds.height}
            rx={Math.max(4, 10 - band.depth)}
          />
        </g>
      {/each}

      {#each visuals.labels as label (label.id)}
        <g class="masonry-debug-widget__label-group">
          <rect
            class="masonry-debug-widget__label-backdrop"
            x={label.x}
            y={label.y}
            width={label.width}
            height={label.height}
            rx="6"
          />
          <text class="masonry-debug-widget__band-label" x={label.textX} y={label.textY}>
            {label.label}
          </text>
        </g>
      {/each}

      {#each visuals.cells as cell (cell.id)}
        <g
          class="masonry-debug-widget__cell-group"
          class:masonry-debug-widget__cell-group--debug-highlighted={debugHoverTarget?.kind === 'cell' && debugHoverTarget.stackId === cell.stackId}
          on:pointerenter={() => setDebugHoverTarget({ kind: 'cell', stackId: cell.stackId })}
          on:pointerleave={() => setDebugHoverTarget(null)}
        >
          <rect
            class:masonry-debug-widget__cell--active={cell.active}
            class:masonry-debug-widget__cell--debug-highlighted={debugHoverTarget?.kind === 'cell' && debugHoverTarget.stackId === cell.stackId}
            class="masonry-debug-widget__cell"
            x={cell.bounds.x}
            y={cell.bounds.y}
            width={cell.bounds.width}
            height={cell.bounds.height}
            rx="10"
            fill={cell.color}
          />
          <text class="masonry-debug-widget__cell-title" x={cell.bounds.x + 14} y={cell.bounds.y + 22}>
            {cell.title}
          </text>
          <text class="masonry-debug-widget__cell-subtitle" x={cell.bounds.x + 14} y={cell.bounds.y + 40}>
            cell
          </text>
        </g>
      {/each}

      {#each visuals.resizes as resize (resize.id)}
        <line
          class:masonry-debug-widget__resize--horizontal={resize.orientation === 'horizontal'}
          class:masonry-debug-widget__resize--vertical={resize.orientation === 'vertical'}
          class:masonry-debug-widget__resize--debug-highlighted={isResizeDebugHighlighted(resize.splitId)}
          class="masonry-debug-widget__resize"
          x1={resize.x1}
          y1={resize.y1}
          x2={resize.x2}
          y2={resize.y2}
          on:pointerenter={() => setDebugHoverTarget({ kind: 'resize', splitId: resize.splitId })}
          on:pointerleave={() => setDebugHoverTarget(null)}
        />
      {/each}

      {#each visuals.edges as edge (edge.id)}
        <line
          class:masonry-debug-widget__edge--horizontal={edge.orientation === 'horizontal'}
          class:masonry-debug-widget__edge--vertical={edge.orientation === 'vertical'}
          class:masonry-debug-widget__edge--debug-highlighted={isEdgeDebugHighlighted(edge.edge)}
          class="masonry-debug-widget__edge"
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          on:pointerenter={() => setDebugHoverTarget({ kind: 'edge', edge: edge.edge })}
          on:pointerleave={() => setDebugHoverTarget(null)}
        />
      {/each}

      {#each visuals.intersections as intersection (intersection.id)}
        <g
          class="masonry-debug-widget__intersection-group"
          class:masonry-debug-widget__intersection-group--debug-highlighted={isIntersectionDebugHighlighted(intersection)}
          transform={`translate(${intersection.x} ${intersection.y})`}
          on:pointerenter={() => setDebugHoverTarget(intersection.hoverTarget)}
          on:pointerleave={() => setDebugHoverTarget(null)}
        >
          <line
            class:masonry-debug-widget__intersection-cross--resize-resize={intersection.kind === 'resize-resize'}
            class:masonry-debug-widget__intersection-cross--resize-edge={intersection.kind === 'resize-edge'}
            class:masonry-debug-widget__intersection-cross--edge-edge={intersection.kind === 'edge-edge'}
            class="masonry-debug-widget__intersection-cross"
            x1="-8"
            y1="0"
            x2="8"
            y2="0"
          />
          <line
            class:masonry-debug-widget__intersection-cross--resize-resize={intersection.kind === 'resize-resize'}
            class:masonry-debug-widget__intersection-cross--resize-edge={intersection.kind === 'resize-edge'}
            class:masonry-debug-widget__intersection-cross--edge-edge={intersection.kind === 'edge-edge'}
            class="masonry-debug-widget__intersection-cross"
            x1="0"
            y1="-8"
            x2="0"
            y2="8"
          />
          <circle
            class:masonry-debug-widget__intersection--resize-resize={intersection.kind === 'resize-resize'}
            class:masonry-debug-widget__intersection--resize-edge={intersection.kind === 'resize-edge'}
            class:masonry-debug-widget__intersection--edge-edge={intersection.kind === 'edge-edge'}
            class="masonry-debug-widget__intersection"
            r="6"
          />
        </g>
      {/each}
    </svg>
  </div>
</section>

<style>
  .masonry-debug-widget {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-8);
    height: 100%;
    padding: var(--space-10);
    background: var(--color-background-surface);
  }

  .masonry-debug-widget__summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .masonry-debug-widget__chip {
    display: inline-flex;
    align-items: center;
    min-height: 1.4rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    text-transform: lowercase;
  }

  .masonry-debug-widget__viewport {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-background-elevated) 52%, transparent), transparent),
      var(--color-background-canvas);
    overflow: hidden;
  }

  .masonry-debug-widget__svg {
    display: block;
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: rgb(255 255 255 / 0.1);
    max-width: 100%;
    max-height: 100%;
    box-sizing: border-box;
  }

  .masonry-debug-widget__frame {
    fill: rgb(255 255 255 / 0.1);
    stroke: color-mix(in srgb, var(--color-border-subtle) 60%, transparent);
    stroke-width: 2;
  }

  .masonry-debug-widget__cell {
    stroke: color-mix(in srgb, var(--color-border-strong) 68%, transparent);
    stroke-width: 2;
  }

  .masonry-debug-widget__cell--active {
    stroke: color-mix(in srgb, var(--color-border-focus) 88%, transparent);
    stroke-width: 3;
  }

  .masonry-debug-widget__cell--debug-highlighted {
    stroke: color-mix(in srgb, var(--color-border-focus) 96%, white 8%);
    stroke-width: 3;
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-border-focus) 18%, transparent));
  }

  .masonry-debug-widget__cell-title,
  .masonry-debug-widget__cell-subtitle,
  .masonry-debug-widget__band-label {
    font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Consolas, monospace;
    user-select: none;
    pointer-events: none;
  }

  .masonry-debug-widget__cell-title {
    fill: var(--color-text-primary);
    font-size: 15px;
    font-weight: 700;
  }

  .masonry-debug-widget__cell-subtitle {
    fill: var(--color-text-muted);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .masonry-debug-widget__band {
    fill: rgb(255 255 255 / 0.1);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .masonry-debug-widget__band--row {
    stroke: color-mix(in srgb, #7fd35d 34%, transparent);
  }

  .masonry-debug-widget__band--col {
    stroke: color-mix(in srgb, #55c3f1 34%, transparent);
  }

  .masonry-debug-widget__band-label {
    fill: var(--color-text-secondary);
    font-size: 10px;
    dominant-baseline: middle;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .masonry-debug-widget__label-backdrop {
    fill: var(--color-background-canvas);
    stroke: none;
  }

  .masonry-debug-widget__resize {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    opacity: 0.9;
  }

  .masonry-debug-widget__resize--horizontal {
    stroke: color-mix(in srgb, #7fd35d 84%, transparent);
  }

  .masonry-debug-widget__resize--vertical {
    stroke: color-mix(in srgb, #ef6b63 84%, transparent);
  }

  .masonry-debug-widget__resize--debug-highlighted {
    stroke-width: 10;
    opacity: 1;
    filter:
      drop-shadow(0 0 10px rgb(255 255 255 / 0.2))
      drop-shadow(0 0 6px rgb(107 140 255 / 0.12));
  }

  .masonry-debug-widget__edge {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    opacity: 0.78;
  }

  .masonry-debug-widget__edge--horizontal {
    stroke: color-mix(in srgb, #7fd35d 58%, transparent);
  }

  .masonry-debug-widget__edge--vertical {
    stroke: color-mix(in srgb, #ef6b63 58%, transparent);
  }

  .masonry-debug-widget__edge--debug-highlighted {
    stroke-width: 8;
    opacity: 1;
    filter:
      drop-shadow(0 0 10px rgb(255 255 255 / 0.18))
      drop-shadow(0 0 6px rgb(103 208 255 / 0.12));
  }

  .masonry-debug-widget__intersection {
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .masonry-debug-widget__intersection--resize-resize {
    fill: color-mix(in srgb, #6b8cff 82%, transparent);
    stroke: color-mix(in srgb, #9fb0ff 82%, transparent);
  }

  .masonry-debug-widget__intersection--resize-edge {
    fill: color-mix(in srgb, #67d0ff 82%, transparent);
    stroke: color-mix(in srgb, #b5ebff 82%, transparent);
  }

  .masonry-debug-widget__intersection--edge-edge {
    fill: color-mix(in srgb, #f0a04a 82%, transparent);
    stroke: color-mix(in srgb, #ffd4a4 82%, transparent);
  }

  .masonry-debug-widget__intersection-cross {
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .masonry-debug-widget__intersection-cross--resize-resize {
    stroke: color-mix(in srgb, #d8e0ff 82%, transparent);
  }

  .masonry-debug-widget__intersection-cross--resize-edge {
    stroke: color-mix(in srgb, #e3f8ff 82%, transparent);
  }

  .masonry-debug-widget__intersection-cross--edge-edge {
    stroke: color-mix(in srgb, #fff1dc 82%, transparent);
  }

  .masonry-debug-widget__intersection-group--debug-highlighted {
    filter:
      drop-shadow(0 0 12px rgb(255 255 255 / 0.22))
      drop-shadow(0 0 8px rgb(107 140 255 / 0.14));
  }
</style>
