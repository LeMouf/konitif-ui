import type { SplitOrientation } from '@konitif/workbench';
import type { FlattenedSplitChain, FlattenedSplitSegment } from './splitChain';
import type {
  ResizeBoundarySegment,
  ResizeDeletePreview,
  ResizePreviewDriver
} from './resizeBoundaryPreview';
import { resolveSplitResizePreviewSegments } from './splitChain';
import {
  applyResizePreviewGestureState,
  createResizeDeletePreview,
  resolveResizeMagnetSnapFromScope,
  resolveResizePreviewResolution,
  shouldDisableResizeMagnetSnap
} from './resizeBoundaryPreview';
import {
  createResizeGestureSession,
  createResizeGestureSessionFromDriver,
  updateResizeGestureSessionFromDriver,
  type ResizeGestureMode,
  type ResizeGestureSessionState
} from './resizeGestureEngine';

export type WorkspaceNodeResizeDragSession = ResizeGestureSessionState & {
  splitId: string;
  boundaryIndex: number;
  orientation: SplitOrientation;
};

export type WorkspaceSplitResizeCommitState = {
  deltaRatio: number | null;
  mode: ResizeGestureMode;
};

export type WorkspaceSplitResizeReleaseDecision =
  | {
      kind: 'collapse';
      boundaryIndex: number;
      removeSide: 'start' | 'end';
    }
  | {
      kind: 'resize';
      boundaryIndex: number;
      deltaRatio: number;
      mode: ResizeGestureMode;
    }
  | { kind: 'unchanged' };

export function createWorkspaceSplitResizeCommitState(
  deltaRatio: number | null = null,
  mode: ResizeGestureMode = 'local'
): WorkspaceSplitResizeCommitState {
  return {
    deltaRatio,
    mode
  };
}

export function resolveWorkspaceSplitResizeReleaseDecision(input: {
  preview: ResizeDeletePreview | null;
  fallbackBoundaryIndex: number;
  commitState: WorkspaceSplitResizeCommitState;
  collapseEnabled: boolean;
}): WorkspaceSplitResizeReleaseDecision {
  if (input.collapseEnabled && input.preview?.activeSide) {
    return {
      kind: 'collapse',
      boundaryIndex: input.preview.boundaryIndex,
      removeSide: input.preview.activeSide
    };
  }

  if (input.commitState.deltaRatio !== null) {
    return {
      kind: 'resize',
      boundaryIndex: input.fallbackBoundaryIndex,
      deltaRatio: input.commitState.deltaRatio,
      mode: input.commitState.mode
    };
  }

  return { kind: 'unchanged' };
}

export function resolveWorkspaceSplitResizeDeltaRatio(
  session: WorkspaceNodeResizeDragSession | null
): number | null {
  const ratioAxisSizePx = session?.ratioAxisSizePx ?? session?.axisSizePx ?? 0;
  if (!session || ratioAxisSizePx <= 0) {
    return null;
  }

  if (session.phase === 'outside') {
    return null;
  }

  return session.appliedRatio + (session.resolvedPositionPx - session.anchorPositionPx) / ratioAxisSizePx;
}

export function resolveWorkspaceSplitResizeCommitState(
  session: WorkspaceNodeResizeDragSession | null,
  mode: ResizeGestureMode
): WorkspaceSplitResizeCommitState {
  return createWorkspaceSplitResizeCommitState(resolveWorkspaceSplitResizeDeltaRatio(session), mode);
}

export function resolveWorkspaceSplitResizePreviewChain(input: {
  splitChain: FlattenedSplitChain | null;
  session: WorkspaceNodeResizeDragSession | null;
}): FlattenedSplitSegment[] {
  if (!input.splitChain) {
    return [];
  }

  if (!input.session || input.session.orientation !== input.splitChain.orientation) {
    return input.splitChain.segments;
  }

  return resolveSplitResizePreviewSegments({
    segments: input.splitChain.segments,
    boundaryIndex: input.session.boundaryIndex,
    deltaRatio: resolveWorkspaceSplitResizeDeltaRatio(input.session),
    mode: input.session.mode
  });
}

export function createWorkspaceNodeResizeDragSession(input: {
  splitId: string;
  boundaryIndex: number;
  orientation: SplitOrientation;
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  anchorPositionPx: number;
  mode: ResizeGestureMode;
  magnetKey: string | null;
}): WorkspaceNodeResizeDragSession {
  return {
    splitId: input.splitId,
    boundaryIndex: input.boundaryIndex,
    orientation: input.orientation,
    ...createResizeGestureSession({
      axisStartPx: input.axisStartPx,
      axisSizePx: input.axisSizePx,
      ratioAxisSizePx: input.ratioAxisSizePx,
      anchorPositionPx: input.anchorPositionPx,
      mode: input.mode,
      magnetKey: input.magnetKey
    })
  };
}

export function createWorkspaceNodeResizeDragSessionFromDriver(input: {
  splitId: string;
  boundaryIndex: number;
  orientation: SplitOrientation;
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  mode: ResizeGestureMode;
  driver: ResizePreviewDriver;
}): WorkspaceNodeResizeDragSession {
  return {
    splitId: input.splitId,
    boundaryIndex: input.boundaryIndex,
    orientation: input.orientation,
    ...createResizeGestureSessionFromDriver({
      axisStartPx: input.axisStartPx,
      axisSizePx: input.axisSizePx,
      ratioAxisSizePx: input.ratioAxisSizePx,
      mode: input.mode,
      driver: input.driver
    })
  };
}

export function createWorkspaceNodeResizeDragStartState(input: {
  splitId: string;
  boundaryIndex: number;
  orientation: SplitOrientation;
  startSegment: ResizeBoundarySegment;
  endSegment: ResizeBoundarySegment;
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  crossStartPx: number;
  crossSizePx: number;
  initialDragPositionPx: number;
  deleteZoneMaxSizePx: number;
  activeThresholdPx: number;
  approachThresholdPx: number;
}): {
  preview: ResizeDeletePreview;
  session: WorkspaceNodeResizeDragSession;
} {
  return {
    preview: createResizeDeletePreview({
      orientation: input.orientation,
      splitId: input.splitId,
      boundaryIndex: input.boundaryIndex,
      startSegment: input.startSegment,
      endSegment: input.endSegment,
      axisStartPx: input.axisStartPx,
      axisSizePx: input.axisSizePx,
      crossStartPx: input.crossStartPx,
      crossSizePx: input.crossSizePx,
      initialDragPositionPx: input.initialDragPositionPx,
      deleteZoneMaxSizePx: input.deleteZoneMaxSizePx,
      activeThresholdPx: input.activeThresholdPx,
      approachThresholdPx: input.approachThresholdPx
    }),
    session: createWorkspaceNodeResizeDragSession({
      splitId: input.splitId,
      boundaryIndex: input.boundaryIndex,
      orientation: input.orientation,
      axisStartPx: input.axisStartPx,
      axisSizePx: input.axisSizePx,
      ratioAxisSizePx: input.ratioAxisSizePx,
      anchorPositionPx: input.axisStartPx + input.initialDragPositionPx,
      mode: 'local',
      magnetKey: null
    })
  };
}

export function updateWorkspaceNodeResizeDragSession(input: {
  session: WorkspaceNodeResizeDragSession;
  rawCurrentPosition: number;
  baselineResolvedPosition?: number | null;
  mode: ResizeGestureMode;
  driver: ResizePreviewDriver;
}): {
  session: WorkspaceNodeResizeDragSession;
  ratioDelta: number | null;
} {
  const previousResolvedRatio = resolveWorkspaceSplitResizeDeltaRatio(input.session) ?? 0;
  const result = updateResizeGestureSessionFromDriver({
    session: input.session,
    rawCurrentPosition: input.rawCurrentPosition,
    baselineResolvedPosition: input.baselineResolvedPosition,
    mode: input.mode,
    driver: input.driver
  });
  const sessionWasRebased = result.session.anchorPositionPx !== input.session.anchorPositionPx;
  const appliedRatio = sessionWasRebased
    ? previousResolvedRatio + (result.ratioDelta ?? 0)
    : input.session.appliedRatio;

  return {
    session: {
      ...input.session,
      ...result.session,
      appliedRatio
    },
    ratioDelta: result.ratioDelta
  };
}

export function applyWorkspaceNodeResizePreviewGesture(input: {
  preview: ResizeDeletePreview | null;
  splitId: string;
  boundaryIndex: number;
  session: WorkspaceNodeResizeDragSession | null;
}): ResizeDeletePreview | null {
  if (
    !input.preview ||
    input.preview.splitId !== input.splitId ||
    input.preview.boundaryIndex !== input.boundaryIndex
  ) {
    return input.preview;
  }

  return applyResizePreviewGestureState(input.preview, input.session);
}

export function resolveWorkspaceNodeResizeDeletePreview(input: {
  preview: ResizeDeletePreview;
  dragSession: WorkspaceNodeResizeDragSession | null;
  orientation: SplitOrientation;
  splitId: string;
  boundaryIndex: number;
  pointerPositionPx: number;
  containerElement: HTMLElement;
  candidateRootElement: Element | null;
  magnetThresholdPx: number;
}): ResizeDeletePreview {
  const localPosition = input.pointerPositionPx - input.preview.axisStartPx;
  const magnetSnap = shouldDisableResizeMagnetSnap(input.preview, localPosition)
    ? null
    : resolveResizeMagnetSnapFromScope({
        orientation: input.orientation,
        handleSplitId: input.splitId,
        containerElement: input.containerElement,
        candidateRootElement: input.candidateRootElement,
        axisStartPx: input.preview.axisStartPx,
        axisSizePx: input.preview.axisSizePx,
        crossStartPx: input.preview.crossStartPx,
        crossSizePx: input.preview.crossSizePx,
        currentPositionPx: localPosition,
        magnetThresholdPx: input.magnetThresholdPx
      });
  const resolution = resolveResizePreviewResolution(input.preview, localPosition, magnetSnap);
  return applyResizePreviewGestureState(resolution.preview, input.dragSession);
}
