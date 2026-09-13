import type { LayoutEdge } from '@konitif/workbench';
import type {
  VisibleEdgeIntersectionTarget,
  VisibleResizeBoundaryHandle
} from './visibleLayoutProjection';

export function resolveWorkspaceEdgeIntersectionResizeBoundary(input: {
  target: VisibleEdgeIntersectionTarget;
  boundaries: VisibleResizeBoundaryHandle[];
}): VisibleResizeBoundaryHandle | null {
  return (
    input.boundaries.find(
      (boundary) =>
        boundary.splitId === input.target.splitId &&
        boundary.rootSplitId === input.target.rootSplitId &&
        boundary.boundaryIndex === input.target.boundaryIndex
    ) ?? null
  );
}

export function resolveWorkspaceEdgeIntersectionCursor(edge: LayoutEdge): string {
  switch (edge) {
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
      return 'all-scroll';
  }
}
