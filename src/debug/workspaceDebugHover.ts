import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { LayoutEdge } from '@konitif/workbench';

export type WorkspaceDebugCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WorkspaceDebugResizeHandleGeometry = {
  splitId: string;
  orientation: 'horizontal' | 'vertical';
  rect: { left: number; top: number; width: number; height: number };
};

export type WorkspaceDebugHoverTarget =
  | { kind: 'cell'; stackId: string }
  | { kind: 'resize'; splitId: string }
  | { kind: 'edge'; edge: LayoutEdge }
  | { kind: 'corner'; corner: WorkspaceDebugCorner }
  | {
      kind: 'intersection-resize';
      columnSplitId: string;
      columnRootSplitId: string;
      columnBoundaryIndex: number;
      rowSplitId: string;
      rowRootSplitId: string;
      rowBoundaryIndex: number;
    }
  | { kind: 'intersection-edge'; edge: LayoutEdge; splitId: string };

export interface WorkspaceDebugHoverContext {
  hoveredTarget: Writable<WorkspaceDebugHoverTarget | null>;
  hoveredResizeSplitId: Writable<string | null>;
  hoveredResizeHandle: Writable<WorkspaceDebugResizeHandleGeometry | null>;
  setHoveredTarget: (target: WorkspaceDebugHoverTarget | null) => void;
  setHoveredResizeSplitId: (splitId: string | null) => void;
  setHoveredResizeHandle: (handle: WorkspaceDebugResizeHandleGeometry | null) => void;
}

const WORKSPACE_DEBUG_HOVER_CONTEXT = Symbol('workspace-debug-hover');

function createWorkspaceDebugHoverContext(): WorkspaceDebugHoverContext {
  const hoveredTarget = writable<WorkspaceDebugHoverTarget | null>(null);
  const hoveredResizeSplitId = writable<string | null>(null);
  const hoveredResizeHandle = writable<WorkspaceDebugResizeHandleGeometry | null>(null);

  return {
    hoveredTarget,
    hoveredResizeSplitId,
    hoveredResizeHandle,
    setHoveredTarget(target) {
      hoveredTarget.set(target);
    },
    setHoveredResizeSplitId(splitId) {
      hoveredResizeSplitId.set(splitId);
    },
    setHoveredResizeHandle(handle) {
      hoveredResizeHandle.set(handle);
    }
  };
}

export function initWorkspaceDebugHoverContext(): WorkspaceDebugHoverContext {
  const context = createWorkspaceDebugHoverContext();
  setContext(WORKSPACE_DEBUG_HOVER_CONTEXT, context);
  return context;
}

export function useWorkspaceDebugHoverContext(): WorkspaceDebugHoverContext {
  return getContext<WorkspaceDebugHoverContext | undefined>(WORKSPACE_DEBUG_HOVER_CONTEXT) ??
    createWorkspaceDebugHoverContext();
}
