import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { LayoutEdge } from '@konitif/workbench';

export type WorkspaceInteractionHint =
  | { kind: 'resize'; orientation: 'horizontal' | 'vertical' }
  | { kind: 'edge'; edge: LayoutEdge };

export interface WorkspaceInteractionHintsContext {
  hoveredHint: Writable<WorkspaceInteractionHint | null>;
  setHoveredHint: (hint: WorkspaceInteractionHint | null) => void;
}

const WORKSPACE_INTERACTION_HINTS_CONTEXT = Symbol('workspace-interaction-hints');

function createWorkspaceInteractionHintsContext(): WorkspaceInteractionHintsContext {
  const hoveredHint = writable<WorkspaceInteractionHint | null>(null);

  return {
    hoveredHint,
    setHoveredHint(hint) {
      hoveredHint.set(hint);
    }
  };
}

export function initWorkspaceInteractionHintsContext(): WorkspaceInteractionHintsContext {
  const context = createWorkspaceInteractionHintsContext();
  setContext(WORKSPACE_INTERACTION_HINTS_CONTEXT, context);
  return context;
}

export function useWorkspaceInteractionHintsContext(): WorkspaceInteractionHintsContext {
  return getContext<WorkspaceInteractionHintsContext | undefined>(WORKSPACE_INTERACTION_HINTS_CONTEXT) ??
    createWorkspaceInteractionHintsContext();
}
