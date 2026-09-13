import { WORKBENCH_PORTAL_ROOT_ID } from '@konitif/workbench';

export function getOrCreateWorkbenchPortalRoot(ownerDocument: Document = document): HTMLElement {
  let root = ownerDocument.getElementById(WORKBENCH_PORTAL_ROOT_ID);

  if (root instanceof HTMLElement) {
    return root;
  }

  root = ownerDocument.createElement('div');
  root.id = WORKBENCH_PORTAL_ROOT_ID;
  root.dataset.surfaceOwner = 'workbench-ui';
  root.dataset.portalKind = 'workbench-overlay-root';
  root.dataset.workbenchContextMenu = 'true';
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    overflow: 'visible',
    zIndex: '2147483000'
  });

  ownerDocument.body.appendChild(root);

  return root;
}

export function mountWorkbenchPortalNode(node: HTMLElement): { destroy(): void } {
  if (typeof document === 'undefined') {
    return { destroy() {} };
  }

  const root = getOrCreateWorkbenchPortalRoot(document);
  if (!node.style.pointerEvents) {
    node.style.pointerEvents = 'auto';
  }
  node.dataset.portalMountedBy = 'workbench-ui';
  root.appendChild(node);

  return {
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}
