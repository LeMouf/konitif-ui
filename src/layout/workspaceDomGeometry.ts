export interface WorkspaceDomRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkspaceInnerClientBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function resolveWorkspacePanelRect(
  workspaceElement: HTMLElement,
  panelId: string
): WorkspaceDomRect | null {
  const panelElement = workspaceElement.querySelector<HTMLElement>(`[data-panel-id="${panelId}"]`);

  if (!panelElement) {
    return null;
  }

  const workspaceRect = workspaceElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();

  return {
    left: panelRect.left - workspaceRect.left,
    top: panelRect.top - workspaceRect.top,
    width: panelRect.width,
    height: panelRect.height
  };
}

export function resolveWorkspaceViewportRect(workspaceElement: HTMLElement): WorkspaceDomRect {
  const viewportElement =
    workspaceElement.closest<HTMLElement>('.app-shell__workspace') ??
    workspaceElement.closest<HTMLElement>('.app-shell__body') ??
    workspaceElement;
  const viewportRect = viewportElement.getBoundingClientRect();
  const shouldUseWorkspacePadding = viewportElement === workspaceElement;
  const padding = shouldUseWorkspacePadding ? readElementPadding(workspaceElement) : emptyPadding();

  return {
    left: viewportRect.left + padding.left,
    top: viewportRect.top + padding.top,
    width: Math.max(0, viewportRect.width - padding.left - padding.right),
    height: Math.max(0, viewportRect.height - padding.top - padding.bottom)
  };
}

export function resolveWorkspaceFullscreenViewportRect(workspaceElement: HTMLElement): WorkspaceDomRect {
  const viewportElement =
    workspaceElement.closest<HTMLElement>('.app-shell__workspace') ??
    workspaceElement.closest<HTMLElement>('.app-shell__body') ??
    workspaceElement;
  const viewportRect = viewportElement.getBoundingClientRect();
  const shouldUseWorkspacePadding = viewportElement === workspaceElement;
  const padding = shouldUseWorkspacePadding ? readElementPadding(workspaceElement) : emptyPadding();

  return {
    left: viewportRect.left + padding.left,
    top: viewportRect.top + padding.top,
    width: Math.max(0, viewportRect.width - padding.left - padding.right),
    height: Math.max(0, viewportRect.height - padding.top - padding.bottom)
  };
}

export function resolveLocalWorkspaceViewportRect(workspaceElement: HTMLElement): WorkspaceDomRect {
  const padding = readElementPadding(workspaceElement);

  return {
    left: padding.left,
    top: padding.top,
    width: Math.max(0, workspaceElement.clientWidth - padding.left - padding.right),
    height: Math.max(0, workspaceElement.clientHeight - padding.top - padding.bottom)
  };
}

export function resolveWorkspaceInnerClientBounds(workspaceElement: HTMLElement): WorkspaceInnerClientBounds {
  const workspaceRect = workspaceElement.getBoundingClientRect();
  const padding = readElementPadding(workspaceElement);

  return {
    left: workspaceRect.left + padding.left,
    right: workspaceRect.right - padding.right,
    top: workspaceRect.top + padding.top,
    bottom: workspaceRect.bottom - padding.bottom
  };
}

function readElementPadding(element: HTMLElement): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const styles = getComputedStyle(element);

  return {
    left: Number.parseFloat(styles.paddingLeft) || 0,
    top: Number.parseFloat(styles.paddingTop) || 0,
    right: Number.parseFloat(styles.paddingRight) || 0,
    bottom: Number.parseFloat(styles.paddingBottom) || 0
  };
}

function emptyPadding(): { left: number; top: number; right: number; bottom: number } {
  return {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  };
}
