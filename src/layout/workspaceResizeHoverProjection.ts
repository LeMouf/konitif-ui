import type { VisibleResizeBoundaryHandle } from './visibleLayoutProjection';
import type { WorkspaceResizeHoverState } from './workspaceActiveRegionTypes';

/** A pointer notification identifies a handle; it is not complete layout geometry. */
export function resolveWorkspaceResizeHoverBoundary(
  boundaries: readonly VisibleResizeBoundaryHandle[],
  input: WorkspaceResizeHoverState
): VisibleResizeBoundaryHandle | null {
  if (input.phase === 'leave') return null;
  return boundaries.find(boundary => boundary.splitId === input.splitId &&
    boundary.rootSplitId === input.rootSplitId && boundary.boundaryIndex === input.boundaryIndex &&
    boundary.orientation === input.orientation) ?? null;
}
