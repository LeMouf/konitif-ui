import type { LayoutEdge } from '@konitif/workbench';
import type { WorkspaceDebugHoverTarget } from '../debug/workspaceDebugHover';
import type { VisibleResizeBoundaryHandle } from './visibleLayoutProjection';

export interface WorkspaceIntersectionGeometry {
  left: number;
  top: number;
  size: number;
}

export interface WorkspaceResizeIntersectionIdentity extends WorkspaceIntersectionGeometry {
  columnSplitId: string;
  columnRootSplitId: string;
  columnBoundaryIndex: number;
  rowSplitId: string;
  rowRootSplitId: string;
  rowBoundaryIndex: number;
}

export interface WorkspaceEdgeIntersectionIdentity extends WorkspaceIntersectionGeometry {
  edge: LayoutEdge;
  splitId: string;
  rootSplitId: string;
  boundaryIndex: number;
}

export function isWorkspaceResizeIntersectionDebugHighlighted(input: {
  target: WorkspaceResizeIntersectionIdentity;
  activeHoveredResizeLine: VisibleResizeBoundaryHandle | null;
  activeDebugHoverTarget: WorkspaceDebugHoverTarget | null;
  isIntersectionOnVisibleResizeLine: (
    boundary: VisibleResizeBoundaryHandle,
    target: WorkspaceIntersectionGeometry
  ) => boolean;
}): boolean {
  const { target, activeHoveredResizeLine, activeDebugHoverTarget } = input;

  if (activeHoveredResizeLine && input.isIntersectionOnVisibleResizeLine(activeHoveredResizeLine, target)) {
    return true;
  }

  if (
    activeHoveredResizeLine &&
    (
      (activeHoveredResizeLine.rootSplitId === target.columnRootSplitId &&
        activeHoveredResizeLine.boundaryIndex === target.columnBoundaryIndex) ||
      (activeHoveredResizeLine.rootSplitId === target.rowRootSplitId &&
        activeHoveredResizeLine.boundaryIndex === target.rowBoundaryIndex)
    )
  ) {
    return true;
  }

  if (!activeDebugHoverTarget) {
    return false;
  }

  if (activeDebugHoverTarget.kind === 'intersection-resize') {
    return (
      activeDebugHoverTarget.columnSplitId === target.columnSplitId &&
      activeDebugHoverTarget.rowSplitId === target.rowSplitId
    );
  }

  if (activeDebugHoverTarget.kind === 'resize') {
    return (
      activeDebugHoverTarget.splitId === target.columnSplitId ||
      activeDebugHoverTarget.splitId === target.rowSplitId
    );
  }

  return false;
}

export function isWorkspaceResizeIntersectionLinkedToHoveredResize(input: {
  target: WorkspaceResizeIntersectionIdentity;
  activeHoveredResizeLine: VisibleResizeBoundaryHandle | null;
  activeHoveredResizeSplitId: string | null;
  isIntersectionOnVisibleResizeLine: (
    boundary: VisibleResizeBoundaryHandle,
    target: WorkspaceIntersectionGeometry
  ) => boolean;
  isIntersectionOnHoveredResizeLine: (target: WorkspaceIntersectionGeometry) => boolean;
}): boolean {
  const { target, activeHoveredResizeLine, activeHoveredResizeSplitId } = input;

  if (activeHoveredResizeLine && input.isIntersectionOnVisibleResizeLine(activeHoveredResizeLine, target)) {
    return true;
  }

  if (
    activeHoveredResizeLine &&
    (
      (activeHoveredResizeLine.rootSplitId === target.columnRootSplitId &&
        activeHoveredResizeLine.boundaryIndex === target.columnBoundaryIndex) ||
      (activeHoveredResizeLine.rootSplitId === target.rowRootSplitId &&
        activeHoveredResizeLine.boundaryIndex === target.rowBoundaryIndex)
    )
  ) {
    return true;
  }

  if (
    activeHoveredResizeSplitId &&
    (activeHoveredResizeSplitId === target.columnSplitId || activeHoveredResizeSplitId === target.rowSplitId)
  ) {
    return true;
  }

  return input.isIntersectionOnHoveredResizeLine(target);
}

export function isWorkspaceEdgeIntersectionDebugHighlighted(input: {
  target: WorkspaceEdgeIntersectionIdentity;
  activeHoveredResizeLine: VisibleResizeBoundaryHandle | null;
  activeDebugHoverTarget: WorkspaceDebugHoverTarget | null;
  isIntersectionOnVisibleResizeLine: (
    boundary: VisibleResizeBoundaryHandle,
    target: WorkspaceIntersectionGeometry
  ) => boolean;
}): boolean {
  const { target, activeHoveredResizeLine, activeDebugHoverTarget } = input;

  if (activeHoveredResizeLine && input.isIntersectionOnVisibleResizeLine(activeHoveredResizeLine, target)) {
    return true;
  }

  if (
    activeHoveredResizeLine &&
    activeHoveredResizeLine.rootSplitId === target.rootSplitId &&
    activeHoveredResizeLine.boundaryIndex === target.boundaryIndex
  ) {
    return true;
  }

  if (!activeDebugHoverTarget) {
    return false;
  }

  if (activeDebugHoverTarget.kind === 'intersection-edge') {
    return (
      activeDebugHoverTarget.edge === target.edge &&
      activeDebugHoverTarget.splitId === target.splitId
    );
  }

  if (activeDebugHoverTarget.kind === 'resize') {
    return activeDebugHoverTarget.splitId === target.splitId;
  }

  if (activeDebugHoverTarget.kind === 'edge') {
    return activeDebugHoverTarget.edge === target.edge;
  }

  return false;
}

export function isWorkspaceEdgeIntersectionLinkedToHoveredResize(input: {
  target: WorkspaceEdgeIntersectionIdentity;
  activeHoveredResizeLine: VisibleResizeBoundaryHandle | null;
  activeHoveredResizeSplitId: string | null;
  isIntersectionOnVisibleResizeLine: (
    boundary: VisibleResizeBoundaryHandle,
    target: WorkspaceIntersectionGeometry
  ) => boolean;
  isIntersectionOnHoveredResizeLine: (target: WorkspaceIntersectionGeometry) => boolean;
}): boolean {
  const { target, activeHoveredResizeLine, activeHoveredResizeSplitId } = input;

  if (activeHoveredResizeLine && input.isIntersectionOnVisibleResizeLine(activeHoveredResizeLine, target)) {
    return true;
  }

  if (
    activeHoveredResizeLine &&
    activeHoveredResizeLine.rootSplitId === target.rootSplitId &&
    activeHoveredResizeLine.boundaryIndex === target.boundaryIndex
  ) {
    return true;
  }

  if (activeHoveredResizeSplitId === target.splitId) {
    return true;
  }

  return input.isIntersectionOnHoveredResizeLine(target);
}
