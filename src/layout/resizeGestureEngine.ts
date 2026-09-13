export type ResizeGestureMode = 'local' | 'proportional';

export type ResizeGesturePhase = 'active' | 'delete' | 'outside';

export interface ResizeGestureSessionState {
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  anchorPositionPx: number;
  lastResolvedPositionPx: number;
  resolvedPositionPx: number;
  appliedRatio: number;
  mode: ResizeGestureMode;
  magnetKey: string | null;
  phase: ResizeGesturePhase;
}

export interface ResizeGestureUpdateInput {
  session: ResizeGestureSessionState;
  rawCurrentPosition: number;
  resolvedPosition: number;
  baselineResolvedPosition?: number | null;
  mode: ResizeGestureMode;
  magnetKey: string | null;
  deleteIntent: boolean;
}

export interface ResizeGestureUpdateResult {
  session: ResizeGestureSessionState;
  ratioDelta: number | null;
}

export interface ResizeGestureDriverState {
  currentPositionPx: number;
  magnetKey: string | null;
  deleteIntent: boolean;
}

export function createResizeGestureSession(input: {
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  anchorPositionPx: number;
  mode: ResizeGestureMode;
  magnetKey: string | null;
}): ResizeGestureSessionState {
  return {
    axisStartPx: input.axisStartPx,
    axisSizePx: input.axisSizePx,
    ratioAxisSizePx: input.ratioAxisSizePx ?? input.axisSizePx,
    anchorPositionPx: input.anchorPositionPx,
    lastResolvedPositionPx: input.anchorPositionPx,
    resolvedPositionPx: input.anchorPositionPx,
    appliedRatio: 0,
    mode: input.mode,
    magnetKey: input.magnetKey,
    phase: 'active'
  };
}

export function createResizeGestureSessionFromDriver(input: {
  axisStartPx: number;
  axisSizePx: number;
  ratioAxisSizePx?: number;
  mode: ResizeGestureMode;
  driver: ResizeGestureDriverState;
}): ResizeGestureSessionState {
  return createResizeGestureSession({
    axisStartPx: input.axisStartPx,
    axisSizePx: input.axisSizePx,
    ratioAxisSizePx: input.ratioAxisSizePx,
    anchorPositionPx: input.driver.currentPositionPx,
    mode: input.mode,
    magnetKey: input.driver.magnetKey
  });
}

export function updateResizeGestureSession(input: ResizeGestureUpdateInput): ResizeGestureUpdateResult {
  const outsideResolvedPosition = clampToAxisBounds(
    input.rawCurrentPosition,
    input.session.axisStartPx,
    input.session.axisStartPx + input.session.axisSizePx
  );
  const outsideAxis =
    input.rawCurrentPosition < input.session.axisStartPx ||
    input.rawCurrentPosition > input.session.axisStartPx + input.session.axisSizePx;
  const nextPhase: ResizeGesturePhase = input.deleteIntent ? 'delete' : outsideAxis ? 'outside' : 'active';
  const nonActiveResolvedPosition =
    nextPhase === 'outside' ? outsideResolvedPosition : input.resolvedPosition;

  if (nextPhase !== 'active') {
    const ratioDelta = resolveResizeGestureRatioDelta(
      input.session,
      nonActiveResolvedPosition,
      input.baselineResolvedPosition
    );

    if (input.session.phase !== nextPhase) {
      return {
        session: rebaseResizeGestureSession(
          input.session,
          nonActiveResolvedPosition,
          input.mode,
          null,
          nextPhase
        ),
        ratioDelta
      };
    }

    if (
      input.session.mode !== input.mode ||
      input.session.lastResolvedPositionPx !== nonActiveResolvedPosition ||
      input.session.resolvedPositionPx !== nonActiveResolvedPosition ||
      input.session.magnetKey !== null
    ) {
      return {
        session: {
          ...input.session,
          lastResolvedPositionPx: nonActiveResolvedPosition,
          resolvedPositionPx: nonActiveResolvedPosition,
          mode: input.mode,
          magnetKey: null
        },
        ratioDelta
      };
    }

    return {
      session: input.session,
      ratioDelta: null
    };
  }

  if (input.session.phase !== 'active' || input.session.mode !== input.mode) {
    return {
      session: rebaseResizeGestureSession(
        input.session,
        input.resolvedPosition,
        input.mode,
        input.magnetKey,
        'active'
      ),
      ratioDelta: null
    };
  }

  if (input.session.axisSizePx <= 0) {
    return {
      session: input.session,
      ratioDelta: null
    };
  }

  const ratioDelta = resolveResizeGestureRatioDelta(
    input.session,
    input.resolvedPosition,
    input.baselineResolvedPosition
  );
  const enteredOrChangedMagnet = input.magnetKey !== null && input.magnetKey !== input.session.magnetKey;

  if (ratioDelta === null || !Number.isFinite(ratioDelta) || Math.abs(ratioDelta) < Number.EPSILON) {
    if (enteredOrChangedMagnet) {
      return {
        session: rebaseResizeGestureSession(
          input.session,
          input.resolvedPosition,
          input.mode,
          input.magnetKey,
          'active'
        ),
        ratioDelta: null
      };
    }

    if (input.session.magnetKey !== input.magnetKey) {
      return {
        session: {
          ...input.session,
          lastResolvedPositionPx: input.resolvedPosition,
          resolvedPositionPx: input.resolvedPosition,
          magnetKey: input.magnetKey
        },
        ratioDelta: null
      };
    }

    return {
      session: input.session,
      ratioDelta: null
    };
  }

  return {
    session: enteredOrChangedMagnet
      ? rebaseResizeGestureSession(
          input.session,
          input.resolvedPosition,
          input.mode,
          input.magnetKey,
          'active'
        )
      : {
          ...input.session,
          lastResolvedPositionPx: input.resolvedPosition,
          resolvedPositionPx: input.resolvedPosition,
          appliedRatio: 0,
          magnetKey: input.magnetKey
        },
    ratioDelta
  };
}

export function updateResizeGestureSessionFromDriver(input: {
  session: ResizeGestureSessionState;
  rawCurrentPosition: number;
  baselineResolvedPosition?: number | null;
  mode: ResizeGestureMode;
  driver: ResizeGestureDriverState;
}): ResizeGestureUpdateResult {
  return updateResizeGestureSession({
    session: input.session,
    rawCurrentPosition: input.rawCurrentPosition,
    resolvedPosition: input.driver.currentPositionPx,
    baselineResolvedPosition: input.baselineResolvedPosition,
    mode: input.mode,
    magnetKey: input.driver.magnetKey,
    deleteIntent: input.driver.deleteIntent
  });
}

function rebaseResizeGestureSession(
  session: ResizeGestureSessionState,
  anchorPositionPx: number,
  mode: ResizeGestureMode,
  magnetKey: string | null,
  phase: ResizeGesturePhase
): ResizeGestureSessionState {
  return {
    ...session,
    anchorPositionPx,
    lastResolvedPositionPx: anchorPositionPx,
    resolvedPositionPx: anchorPositionPx,
    appliedRatio: 0,
    mode,
    magnetKey,
    phase
  };
}

function resolveResizeGestureRatioDelta(
  session: ResizeGestureSessionState,
  resolvedPosition: number,
  baselineResolvedPosition?: number | null
): number | null {
  const ratioAxisSizePx = session.ratioAxisSizePx ?? session.axisSizePx;
  if (ratioAxisSizePx <= 0) {
    return null;
  }

  const baseline =
    baselineResolvedPosition !== undefined && baselineResolvedPosition !== null
      ? baselineResolvedPosition
      : session.lastResolvedPositionPx;
  const ratioDelta = (resolvedPosition - baseline) / ratioAxisSizePx;

  if (!Number.isFinite(ratioDelta) || Math.abs(ratioDelta) < Number.EPSILON) {
    return null;
  }

  return ratioDelta;
}

function clampToAxisBounds(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
