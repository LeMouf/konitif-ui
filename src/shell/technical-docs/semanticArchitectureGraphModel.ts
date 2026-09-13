export type GraphNodeKind =
  | 'feature'
  | 'archetype'
  | 'concept'
  | 'file'
  | 'package';

export type GraphEdgeKind =
  | 'contains'
  | 'depends_on'
  | 'cooccurs'
  | 'implements'
  | 'projects_to'
  | 'references';

export type SemanticGraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  weight: number;
  entropy: number;
  cohesion: number;
  centrality: number;
  packageNames: string[];
  featureIds: string[];
  concepts?: string[];
  archetypes?: string[];
  metadata?: Record<string, unknown>;
};

export type SemanticGraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  weight: number;
  confidence: number;
  sharedFiles?: string[];
  sharedConcepts?: string[];
  metadata?: Record<string, unknown>;
};

export type SemanticArchitectureGraph = {
  schemaVersion?: string;
  generatedAt: string;
  sourceMatrix?: string;
  totals?: {
    nodes: number;
    edges: number;
    features: number;
    files: number;
    dependencies: number;
  };
  nodes: SemanticGraphNode[];
  edges: SemanticGraphEdge[];
};

export type SemanticGraphViewMode = 'feature' | 'concept' | 'package';

export type SemanticGraphFilters = {
  query: string;
  kind: GraphNodeKind | 'all';
  viewMode: SemanticGraphViewMode;
};

export type SemanticGraphLayoutNode = SemanticGraphNode & {
  x: number;
  y: number;
  radius: number;
};

export function filterSemanticGraphNodes(
  graph: SemanticArchitectureGraph,
  filters: SemanticGraphFilters
): SemanticGraphNode[] {
  const query = filters.query.trim().toLowerCase();
  const allowedKinds = resolveViewModeKinds(filters.viewMode);

  return graph.nodes.filter((node) => {
    if (!allowedKinds.includes(node.kind)) return false;
    if (filters.kind !== 'all' && node.kind !== filters.kind) return false;
    if (!query) return true;

    const haystack = [
      node.id,
      node.label,
      node.kind,
      node.packageNames.join(' '),
      node.featureIds.join(' '),
      node.concepts?.join(' ') ?? '',
      node.archetypes?.join(' ') ?? '',
      readAttractorKinds(node).join(' ')
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
}

export function filterSemanticGraphEdges(
  edges: SemanticGraphEdge[],
  visibleNodes: SemanticGraphNode[]
): SemanticGraphEdge[] {
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
}

export function resolveSemanticGraphNeighbors(
  nodeId: string,
  edges: SemanticGraphEdge[]
): Set<string> {
  const neighbors = new Set<string>();

  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.add(edge.target);
    if (edge.target === nodeId) neighbors.add(edge.source);
  }

  return neighbors;
}

export function createSemanticGraphLayout(
  nodes: SemanticGraphNode[],
  width: number,
  height: number
): SemanticGraphLayoutNode[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const rings: GraphNodeKind[] = ['concept', 'archetype', 'feature', 'package', 'file'];
  const nodesByKind = new Map<GraphNodeKind, SemanticGraphNode[]>();

  for (const node of nodes) {
    const group = nodesByKind.get(node.kind) ?? [];
    group.push(node);
    nodesByKind.set(node.kind, group);
  }

  return rings.flatMap((kind, ringIndex) => {
    const group = (nodesByKind.get(kind) ?? [])
      .slice()
      .sort((left, right) => right.centrality - left.centrality || right.weight - left.weight || left.label.localeCompare(right.label));
    const radius = ringIndex === 0 ? 58 : 58 + ringIndex * 58;

    return group.map((node, index) => {
      const angle = group.length <= 1 ? -Math.PI / 2 : (Math.PI * 2 * index) / group.length - Math.PI / 2;
      const nodeRadius = Math.max(4, Math.min(14, 4 + node.centrality * 9 + Math.log2(node.weight + 1) * 0.6));

      return {
        ...node,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        radius: Math.round(nodeRadius * 10) / 10
      };
    });
  });
}

export function resolveSemanticNodeTone(kind: GraphNodeKind): string {
  switch (kind) {
    case 'feature':
      return '#3b82f6';
    case 'archetype':
      return '#f59e0b';
    case 'concept':
      return '#22c55e';
    case 'file':
      return '#94a3b8';
    case 'package':
      return '#e879f9';
  }
}

export function formatSemanticMetric(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function readAttractorKinds(node: SemanticGraphNode): string[] {
  const value = node.metadata?.attractorKinds;

  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

export function readCollisionScore(edge: SemanticGraphEdge): number {
  const value = edge.metadata?.collisionScore;

  return typeof value === 'number' ? value : 0;
}

function resolveViewModeKinds(viewMode: SemanticGraphViewMode): GraphNodeKind[] {
  switch (viewMode) {
    case 'feature':
      return ['feature', 'archetype', 'concept', 'package'];
    case 'concept':
      return ['concept', 'archetype', 'feature'];
    case 'package':
      return ['package', 'feature', 'file'];
  }
}
