import { STACK_FULLSCREEN_TRANSITION_MS } from './stackFullscreenTransition';

export type WorkspaceFullscreenBoundaryPhase = 'visible' | 'fading-out' | 'hidden' | 'fading-in';

export interface WorkspaceFullscreenBoundaryController {
  transition(input: {
    currentStackId: string | null;
    nextStackId: string | null;
    setStackId(stackId: string | null): void;
    setBoundaryPhase(phase: WorkspaceFullscreenBoundaryPhase): void;
  }): void;
  clear(): void;
}

export const WORKSPACE_FULLSCREEN_BOUNDARY_FADE_MS = 140;

export function createWorkspaceFullscreenBoundaryController(): WorkspaceFullscreenBoundaryController {
  let boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  let boundaryFrame: number | null = null;

  function clear(): void {
    if (boundaryTimer) {
      clearTimeout(boundaryTimer);
      boundaryTimer = null;
    }

    if (boundaryFrame !== null) {
      cancelAnimationFrame(boundaryFrame);
      boundaryFrame = null;
    }
  }

  function transition(input: {
    currentStackId: string | null;
    nextStackId: string | null;
    setStackId(stackId: string | null): void;
    setBoundaryPhase(phase: WorkspaceFullscreenBoundaryPhase): void;
  }): void {
    const enteringFullscreen = input.nextStackId !== null;
    const leavingFullscreen = input.currentStackId !== null && input.nextStackId === null;

    clear();

    if (enteringFullscreen) {
      input.setBoundaryPhase('fading-out');
      input.setStackId(input.nextStackId);
      boundaryTimer = setTimeout(() => {
        boundaryTimer = null;
        input.setBoundaryPhase('hidden');
      }, WORKSPACE_FULLSCREEN_BOUNDARY_FADE_MS);
      return;
    }

    if (leavingFullscreen) {
      input.setBoundaryPhase('hidden');
      input.setStackId(null);
      boundaryTimer = setTimeout(() => {
        boundaryTimer = null;
        input.setBoundaryPhase('fading-in');
        boundaryFrame = requestAnimationFrame(() => {
          boundaryFrame = null;
          input.setBoundaryPhase('visible');
        });
      }, STACK_FULLSCREEN_TRANSITION_MS);
      return;
    }

    input.setStackId(input.nextStackId);
    input.setBoundaryPhase(input.nextStackId ? 'hidden' : 'visible');
  }

  return {
    transition,
    clear
  };
}
