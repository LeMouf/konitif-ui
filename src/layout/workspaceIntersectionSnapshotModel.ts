import type { LayoutNode } from '@konitif/workbench';

export function findWorkspaceSplitById(node: LayoutNode, splitId: string): LayoutNode | null {
  if (node.kind === 'stack') {
    return null;
  }

  if (node.id === splitId) {
    return node;
  }

  return findWorkspaceSplitById(node.children[0], splitId) ?? findWorkspaceSplitById(node.children[1], splitId);
}

export function collectWorkspaceSplitSizes(
  node: LayoutNode,
  target: Map<string, [number, number]> = new Map()
): Map<string, [number, number]> {
  if (node.kind !== 'split') {
    return target;
  }

  target.set(node.id, [...node.sizes] as [number, number]);
  collectWorkspaceSplitSizes(node.children[0], target);
  collectWorkspaceSplitSizes(node.children[1], target);
  return target;
}

export function collectWorkspaceIntersectionSplitSnapshots(input: {
  root: LayoutNode | null;
  columnRootSplitId: string;
  rowRootSplitId: string;
}): Map<string, [number, number]> {
  const snapshots = new Map<string, [number, number]>();
  const root = input.root;

  if (!root) {
    return snapshots;
  }

  const collect = (rootSplitId: string) => {
    const rootNode = findWorkspaceSplitById(root, rootSplitId);

    if (!rootNode || rootNode.kind !== 'split') {
      return;
    }

    collectWorkspaceSplitSizes(rootNode, snapshots);
  };

  collect(input.columnRootSplitId);

  if (input.rowRootSplitId !== input.columnRootSplitId) {
    collect(input.rowRootSplitId);
  }

  return snapshots;
}
