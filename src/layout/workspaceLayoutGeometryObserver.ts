export interface WorkspaceLayoutGeometryObserver {
  ensure(): void;
  refresh(rootElement: HTMLElement): void;
  disconnect(): void;
}

export interface WorkspaceLayoutGeometryObserverCallbacks {
  onResize(): void;
  onMutation(): void;
}

export function createWorkspaceLayoutGeometryObserver(
  callbacks: WorkspaceLayoutGeometryObserverCallbacks
): WorkspaceLayoutGeometryObserver {
  let observedElements: Element[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;

  function ensure(): void {
    if (typeof ResizeObserver !== 'undefined' && !resizeObserver) {
      resizeObserver = new ResizeObserver(callbacks.onResize);
    }

    if (typeof MutationObserver !== 'undefined' && !mutationObserver) {
      mutationObserver = new MutationObserver(callbacks.onMutation);
    }
  }

  function refresh(rootElement: HTMLElement): void {
    const nextElements = [
      rootElement,
      ...Array.from(rootElement.querySelectorAll<HTMLElement>('[data-panel-id], [data-stack-id]'))
    ];

    const hasSameTargets =
      nextElements.length === observedElements.length &&
      nextElements.every((element, index) => observedElements[index] === element);

    if (hasSameTargets) {
      return;
    }

    if (resizeObserver) {
      for (const element of observedElements) {
        resizeObserver.unobserve(element);
      }

      for (const element of nextElements) {
        resizeObserver.observe(element);
      }
    }

    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver.observe(rootElement, {
        childList: true,
        subtree: true
      });
    }

    observedElements = nextElements;
  }

  function disconnect(): void {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    observedElements = [];
  }

  return {
    ensure,
    refresh,
    disconnect
  };
}
