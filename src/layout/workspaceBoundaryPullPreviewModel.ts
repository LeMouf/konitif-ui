import type { LayoutEdge } from '@konitif/workbench';

export type WorkspaceBoundaryAxis = 'horizontal' | 'vertical';
export type WorkspaceBoundaryVisualState = 'idle' | 'neutral' | 'armed' | 'creation';
export type WorkspaceBoundaryCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface WorkspaceBoundaryViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspaceBoundaryPullState {
  source: 'edge' | 'corner';
  horizontalEdge: 'left' | 'right' | null;
  verticalEdge: 'top' | 'bottom' | null;
  horizontalDistance: number;
  verticalDistance: number;
  neutralThreshold: number;
  creationThreshold: number;
  horizontalBandRatio: number | null;
  verticalBandRatio: number | null;
}

export interface WorkspaceBoundaryGuide {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  axis: WorkspaceBoundaryAxis;
  kind: 'neutral' | 'creation';
  crossed: boolean;
  armed: boolean;
}

export interface WorkspaceBoundaryTrail {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  axis: WorkspaceBoundaryAxis;
  kind: 'armed' | 'creation';
}

export interface WorkspaceBoundaryBand {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  axis: WorkspaceBoundaryAxis;
}

export interface WorkspaceBoundaryPullPreview {
  guides: WorkspaceBoundaryGuide[];
  trails: WorkspaceBoundaryTrail[];
  bands: WorkspaceBoundaryBand[];
}

export function resolveWorkspaceBoundaryAxisVisualState(
  distance: number,
  neutralThreshold: number,
  creationThreshold: number
): WorkspaceBoundaryVisualState {
  if (distance >= creationThreshold) {
    return 'creation';
  }

  if (distance >= neutralThreshold) {
    return 'armed';
  }

  if (distance > 0) {
    return 'neutral';
  }

  return 'idle';
}

export function resolveWorkspaceBoundaryEdgeVisualState(
  state: WorkspaceBoundaryPullState | null,
  edge: LayoutEdge
): WorkspaceBoundaryVisualState {
  if (!state) {
    return 'idle';
  }

  if (edge === 'left' || edge === 'right') {
    return state.horizontalEdge === edge
      ? resolveWorkspaceBoundaryAxisVisualState(
          state.horizontalDistance,
          state.neutralThreshold,
          state.creationThreshold
        )
      : 'idle';
  }

  return state.verticalEdge === edge
    ? resolveWorkspaceBoundaryAxisVisualState(
        state.verticalDistance,
        state.neutralThreshold,
        state.creationThreshold
      )
    : 'idle';
}

export function resolveWorkspaceBoundaryCornerVisualState(
  state: WorkspaceBoundaryPullState | null,
  corner: WorkspaceBoundaryCorner
): WorkspaceBoundaryVisualState {
  if (!state || state.source !== 'corner') {
    return 'idle';
  }

  const horizontalEdge = corner.includes('left') ? 'left' : 'right';
  const verticalEdge = corner.includes('top') ? 'top' : 'bottom';

  if (state.horizontalEdge !== horizontalEdge || state.verticalEdge !== verticalEdge) {
    return 'idle';
  }

  const horizontalState = resolveWorkspaceBoundaryAxisVisualState(
    state.horizontalDistance,
    state.neutralThreshold,
    state.creationThreshold
  );
  const verticalState = resolveWorkspaceBoundaryAxisVisualState(
    state.verticalDistance,
    state.neutralThreshold,
    state.creationThreshold
  );

  if (horizontalState === 'creation' || verticalState === 'creation') {
    return 'creation';
  }

  if (horizontalState === 'armed' || verticalState === 'armed') {
    return 'armed';
  }

  if (horizontalState === 'neutral' || verticalState === 'neutral') {
    return 'neutral';
  }

  return 'idle';
}

export function resolveWorkspaceBoundaryPullPreview(input: {
  state: WorkspaceBoundaryPullState;
  viewport: WorkspaceBoundaryViewportRect;
  horizontalZoneSizePx: number;
  verticalZoneSizePx: number;
}): WorkspaceBoundaryPullPreview {
  return {
    guides: [
      ...resolveWorkspaceBoundaryGuidesForAxis('horizontal', input.state, input.viewport),
      ...resolveWorkspaceBoundaryGuidesForAxis('vertical', input.state, input.viewport)
    ],
    trails: [
      ...resolveWorkspaceBoundaryTrailsForAxis(
        'horizontal',
        input.state,
        input.viewport,
        input.horizontalZoneSizePx
      ),
      ...resolveWorkspaceBoundaryTrailsForAxis(
        'vertical',
        input.state,
        input.viewport,
        input.verticalZoneSizePx
      )
    ],
    bands: [
      ...resolveWorkspaceBoundaryBandsForAxis('horizontal', input.state, input.viewport),
      ...resolveWorkspaceBoundaryBandsForAxis('vertical', input.state, input.viewport)
    ]
  };
}

export function resolveWorkspaceBoundaryGuidesForAxis(
  axis: WorkspaceBoundaryAxis,
  state: WorkspaceBoundaryPullState,
  viewport: WorkspaceBoundaryViewportRect
): WorkspaceBoundaryGuide[] {
  const guides: WorkspaceBoundaryGuide[] = [];
  const edge = axis === 'horizontal' ? state.horizontalEdge : state.verticalEdge;
  const distance = axis === 'horizontal' ? state.horizontalDistance : state.verticalDistance;
  const visualState = resolveWorkspaceBoundaryAxisVisualState(
    distance,
    state.neutralThreshold,
    state.creationThreshold
  );

  if (!edge) {
    return guides;
  }

  const thresholds = [
    { distance: state.neutralThreshold, kind: 'neutral' as const },
    { distance: state.creationThreshold, kind: 'creation' as const }
  ];

  for (const threshold of thresholds) {
    if (axis === 'horizontal') {
      const x = edge === 'left'
        ? viewport.left + threshold.distance
        : viewport.left + viewport.width - threshold.distance;
      guides.push({
        key: `${edge}:${threshold.kind}`,
        left: x,
        top: viewport.top,
        width: 1,
        height: viewport.height,
        axis,
        kind: threshold.kind,
        crossed: distance >= threshold.distance,
        armed: threshold.kind === 'creation' && visualState === 'armed'
      });
    } else {
      const y = edge === 'top'
        ? viewport.top + threshold.distance
        : viewport.top + viewport.height - threshold.distance;
      guides.push({
        key: `${edge}:${threshold.kind}`,
        left: viewport.left,
        top: y,
        width: viewport.width,
        height: 1,
        axis,
        kind: threshold.kind,
        crossed: distance >= threshold.distance,
        armed: threshold.kind === 'creation' && visualState === 'armed'
      });
    }
  }

  return guides;
}

export function resolveWorkspaceBoundaryTrailsForAxis(
  axis: WorkspaceBoundaryAxis,
  state: WorkspaceBoundaryPullState,
  viewport: WorkspaceBoundaryViewportRect,
  visualZoneSizePx: number
): WorkspaceBoundaryTrail[] {
  const edge = axis === 'horizontal' ? state.horizontalEdge : state.verticalEdge;
  const distance = axis === 'horizontal' ? state.horizontalDistance : state.verticalDistance;
  const visualState = resolveWorkspaceBoundaryAxisVisualState(
    distance,
    state.neutralThreshold,
    state.creationThreshold
  );

  if (!edge || (visualState !== 'armed' && visualState !== 'creation')) {
    return [];
  }

  if (axis === 'horizontal') {
    if (visualState === 'creation') {
      const x = edge === 'left' ? viewport.left + distance : viewport.left + viewport.width - distance;
      return [
        {
          key: `${edge}:creation-line`,
          left: x,
          top: viewport.top,
          width: 1,
          height: viewport.height,
          axis,
          kind: 'creation'
        }
      ];
    }

    const trailWidth = Math.min(distance, visualZoneSizePx);
    return [
      {
        key: `${edge}:trail`,
        left: edge === 'left' ? viewport.left : viewport.left + viewport.width - trailWidth,
        top: viewport.top,
        width: trailWidth,
        height: viewport.height,
        axis,
        kind: 'armed'
      }
    ];
  }

  if (visualState === 'creation') {
    const y = edge === 'top' ? viewport.top + distance : viewport.top + viewport.height - distance;
    return [
      {
        key: `${edge}:creation-line`,
        left: viewport.left,
        top: y,
        width: viewport.width,
        height: 1,
        axis,
        kind: 'creation'
      }
    ];
  }

  const trailHeight = Math.min(distance, visualZoneSizePx);
  return [
    {
      key: `${edge}:trail`,
      left: viewport.left,
      top: edge === 'top' ? viewport.top : viewport.top + viewport.height - trailHeight,
      width: viewport.width,
      height: trailHeight,
      axis,
      kind: 'armed'
    }
  ];
}

export function resolveWorkspaceBoundaryBandsForAxis(
  axis: WorkspaceBoundaryAxis,
  state: WorkspaceBoundaryPullState,
  viewport: WorkspaceBoundaryViewportRect
): WorkspaceBoundaryBand[] {
  const bands: WorkspaceBoundaryBand[] = [];
  const edge = axis === 'horizontal' ? state.horizontalEdge : state.verticalEdge;
  const distance = axis === 'horizontal' ? state.horizontalDistance : state.verticalDistance;
  const visualState = resolveWorkspaceBoundaryAxisVisualState(
    distance,
    state.neutralThreshold,
    state.creationThreshold
  );

  if (!edge || visualState !== 'creation') {
    return bands;
  }

  if (axis === 'horizontal' && state.horizontalBandRatio !== null) {
    const width = viewport.width * state.horizontalBandRatio;
    bands.push({
      key: edge,
      left: edge === 'left' ? viewport.left : viewport.left + viewport.width - width,
      top: viewport.top,
      width,
      height: viewport.height,
      axis
    });
  }

  if (axis === 'vertical' && state.verticalBandRatio !== null) {
    const height = viewport.height * state.verticalBandRatio;
    bands.push({
      key: edge,
      left: viewport.left,
      top: edge === 'top' ? viewport.top : viewport.top + viewport.height - height,
      width: viewport.width,
      height,
      axis
    });
  }

  return bands;
}
