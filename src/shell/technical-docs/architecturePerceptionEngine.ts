import type {
  ArchitecturePerception,
  ArchitecturePerceptionInput,
  DetailLevel,
  PerceivedAttractor,
  PerceivedCluster,
  PerceivedCollision,
  PerceivedEdge,
  PerceivedNode,
  PerceptionMode
} from './architecturePerceptionModel';
import type { ProjectionPoint } from './architectureProjectionModel';
import {
  readAttractorKinds,
  readCollisionScore,
  type SemanticArchitectureGraph,
  type SemanticGraphEdge,
  type SemanticGraphNode
} from './semanticArchitectureGraphModel';

type ScoredNode = {
  node: SemanticGraphNode;
  score: number;
  focusBoost: number;
  searchMatch: boolean;
};

type ScoredEdge = {
  edge: SemanticGraphEdge;
  score: number;
  focusBoost: number;
  collisionScore: number;
};

const modeEdgeRatios: Record<PerceptionMode, number> = {
  overview: 0.1,
  clusters: 0.15,
  attractors: 0.12,
  collisions: 0.08,
  focus: 0.16,
  debug: 1
};

const detailNodeRatios: Record<DetailLevel, number> = {
  macro: 0.28,
  meso: 0.58,
  micro: 1
};

export function createArchitecturePerception(input: ArchitecturePerceptionInput): ArchitecturePerception {
  const pointByNodeId = new Map(input.projection.points.map((point) => [point.nodeId, point]));
  const nodeVisualById = new Map(input.projection.nodeVisuals.map((visual) => [visual.nodeId, visual]));
  const edgeVisualById = new Map(input.projection.edgeVisuals.map((visual) => [visual.edgeId, visual]));
  const nodeById = new Map(input.graph.nodes.map((node) => [node.id, node]));
  const neighbors = resolveNeighborIds(input.graph, input.focusNodeId);
  const scoredNodes = scoreNodes(input, neighbors);
  const nodeVisibility = createNodeVisibility(input, scoredNodes, neighbors);
  const visibleNodeIds = new Set(nodeVisibility.filter((node) => node.visible).map((node) => node.nodeId));
  const scoredEdges = scoreEdges(input, visibleNodeIds, neighbors);
  const edgeVisibility = createEdgeVisibility(input, scoredEdges, visibleNodeIds);
  const visibleEdgeIds = new Set(edgeVisibility.filter((edge) => edge.visible).map((edge) => edge.edgeId));
  const clusters = createPerceivedClusters(input, pointByNodeId, visibleNodeIds);
  const attractors = createPerceivedAttractors(input, pointByNodeId, visibleNodeIds);
  const collisions = createPerceivedCollisions(input, pointByNodeId, visibleEdgeIds, nodeById);

  return {
    mode: input.mode,
    detailLevel: input.detailLevel,
    nodeVisibility,
    edgeVisibility: edgeVisibility.map((edge) => {
      const visual = edgeVisualById.get(edge.edgeId);

      return visual && edge.visible
        ? {
            ...edge,
            opacity: round(edge.opacity * Math.max(0.2, visual.opacity)),
            thicknessMultiplier: round(edge.thicknessMultiplier * Math.max(0.8, visual.thickness / 2))
          }
        : edge;
    }),
    clusters,
    attractors,
    collisions,
    metrics: {
      visibleNodeCount: nodeVisibility.filter((node) => node.visible).length,
      visibleEdgeCount: edgeVisibility.filter((edge) => edge.visible).length,
      hiddenEdgeCount: edgeVisibility.filter((edge) => !edge.visible).length,
      clusterCount: clusters.filter((cluster) => cluster.visible).length,
      attractorCount: attractors.filter((attractor) => attractor.visible).length,
      collisionCount: collisions.filter((collision) => collision.visible).length
    }
  };

  function createNodeVisibility(
    visibilityInput: ArchitecturePerceptionInput,
    nodes: ScoredNode[],
    focusNeighbors: Set<string>
  ): PerceivedNode[] {
    const eligibleNodes = nodes.filter((entry) => entry.searchMatch);
    const sorted = eligibleNodes.slice().sort((left, right) => right.score - left.score || left.node.id.localeCompare(right.node.id));
    const ratio = visibilityInput.mode === 'debug' ? 1 : detailNodeRatios[visibilityInput.detailLevel];
    const visibleLimit = Math.max(12, Math.ceil(sorted.length * ratio));
    const primaryLimit = Math.max(6, Math.ceil(visibleLimit * 0.28));
    const secondaryLimit = Math.max(primaryLimit, Math.ceil(visibleLimit * 0.72));
    const visibleIds = new Set(sorted.slice(0, visibleLimit).map((entry) => entry.node.id));
    const primaryIds = new Set(sorted.slice(0, primaryLimit).map((entry) => entry.node.id));
    const secondaryIds = new Set(sorted.slice(primaryLimit, secondaryLimit).map((entry) => entry.node.id));

    if (visibilityInput.focusNodeId) {
      visibleIds.add(visibilityInput.focusNodeId);
      primaryIds.add(visibilityInput.focusNodeId);

      if (visibilityInput.mode === 'focus') {
        for (const neighborId of focusNeighbors) {
          visibleIds.add(neighborId);
          secondaryIds.add(neighborId);
        }
      }
    }

    return nodes.map(({ node, score }) => {
      const visible = visibilityInput.mode === 'debug' ? true : visibleIds.has(node.id);
      const role = !visible ? 'hidden' : primaryIds.has(node.id) ? 'primary' : secondaryIds.has(node.id) ? 'secondary' : 'context';
      const visual = nodeVisualById.get(node.id);
      const labelVisible = resolveLabelVisible({
        mode: visibilityInput.mode,
        detailLevel: visibilityInput.detailLevel,
        role,
        showLabels: visibilityInput.showLabels ?? true,
        focused: visibilityInput.focusNodeId === node.id,
        neighbor: focusNeighbors.has(node.id),
        labelOpacity: visual?.labelOpacity ?? 0
      });

      return {
        nodeId: node.id,
        visible,
        opacity: visible ? resolveNodeOpacity(role, score) : 0,
        radiusMultiplier: visible ? round(0.72 + score * 0.76 + (role === 'primary' ? 0.28 : 0)) : 0,
        labelVisible,
        labelOpacity: labelVisible ? round(role === 'primary' ? 0.95 : role === 'secondary' ? 0.68 : 0.42) : 0,
        priority: round(score),
        role
      };
    });
  }
}

function scoreNodes(input: ArchitecturePerceptionInput, neighbors: Set<string>): ScoredNode[] {
  const maxWeight = Math.max(1, ...input.graph.nodes.map((node) => node.weight));
  const query = (input.searchQuery ?? '').trim().toLowerCase();
  const visibleKinds = new Set(input.visibleNodeKinds ?? []);

  return input.graph.nodes.map((node) => {
    const searchMatch = matchesNode(node, query) && (visibleKinds.size === 0 || visibleKinds.has(node.kind));
    const focusBoost = !input.focusNodeId
      ? 0
      : node.id === input.focusNodeId
        ? 1
        : neighbors.has(node.id)
          ? 0.58
          : 0;
    const normalizedWeight = Math.log2(node.weight + 1) / Math.log2(maxWeight + 1);
    const score = node.centrality * 0.35 + node.entropy * 0.2 + normalizedWeight * 0.2 + focusBoost * 0.25;

    return {
      node,
      score: round(clamp(score, 0, 1)),
      focusBoost,
      searchMatch
    };
  });
}

function scoreEdges(input: ArchitecturePerceptionInput, visibleNodeIds: Set<string>, neighbors: Set<string>): ScoredEdge[] {
  const maxWeight = Math.max(1, ...input.graph.edges.map((edge) => edge.weight));

  return input.graph.edges.map((edge) => {
    const collisionScore = readCollisionScore(edge);
    const focusBoost = !input.focusNodeId
      ? 0
      : edge.source === input.focusNodeId || edge.target === input.focusNodeId
        ? 1
        : neighbors.has(edge.source) || neighbors.has(edge.target)
          ? 0.36
          : 0;
    const normalizedWeight = Math.log2(edge.weight + 1) / Math.log2(maxWeight + 1);
    const score = normalizedWeight * 0.35 + edge.confidence * 0.25 + collisionScore * 0.2 + focusBoost * 0.2;

    return {
      edge,
      score: round(clamp(score, 0, 1)),
      focusBoost,
      collisionScore
    };
  }).filter((entry) => visibleNodeIds.has(entry.edge.source) && visibleNodeIds.has(entry.edge.target));
}

function createEdgeVisibility(
  input: ArchitecturePerceptionInput,
  scoredEdges: ScoredEdge[],
  visibleNodeIds: Set<string>
): PerceivedEdge[] {
  const sorted = scoredEdges
    .filter((entry) => input.showEdges !== false && visibleNodeIds.has(entry.edge.source) && visibleNodeIds.has(entry.edge.target))
    .filter((entry) => {
      if (input.mode === 'collisions') return entry.collisionScore > 0;
      if (input.mode === 'focus') return entry.focusBoost > 0 || entry.score > 0.62;

      return true;
    })
    .sort((left, right) => right.score - left.score || left.edge.id.localeCompare(right.edge.id));
  const ratio = input.mode === 'debug'
    ? 1
    : clamp((input.edgeBudgetRatio ?? modeEdgeRatios[input.mode]) || modeEdgeRatios[input.mode], 0.02, 1);
  const visibleLimit = input.mode === 'debug' ? sorted.length : Math.max(24, Math.ceil(sorted.length * ratio));
  const visibleEdgeIds = new Set(sorted.slice(0, visibleLimit).map((entry) => entry.edge.id));

  return scoredEdges.map(({ edge, score, focusBoost, collisionScore }) => {
    const visible = input.mode === 'debug' ? input.showEdges !== false : visibleEdgeIds.has(edge.id);
    const role = !visible
      ? 'hidden'
      : focusBoost > 0.7
        ? 'focus'
        : collisionScore > 0
          ? 'collision'
          : edge.kind === 'depends_on' || edge.kind === 'contains'
            ? 'structural'
            : 'semantic';

    return {
      edgeId: edge.id,
      visible,
      opacity: visible ? resolveEdgeOpacity(role, score) : 0,
      thicknessMultiplier: visible ? round(0.72 + score * 1.2 + (role === 'focus' ? 0.5 : 0)) : 0,
      priority: round(score),
      role
    };
  });
}

function createPerceivedClusters(
  input: ArchitecturePerceptionInput,
  pointByNodeId: Map<string, ProjectionPoint>,
  visibleNodeIds: Set<string>
): PerceivedCluster[] {
  const groups = new Map<string, SemanticGraphNode[]>();

  for (const node of input.graph.nodes) {
    if (!visibleNodeIds.has(node.id)) continue;

    const point = pointByNodeId.get(node.id);
    const attractor = readAttractorKinds(node)[0];
    const archetype = node.archetypes?.[0];
    const cell = point ? `${Math.floor(point.x / 250)}:${Math.floor(point.y / 210)}` : 'unknown';
    const key = attractor ? `attractor:${attractor}:${cell}` : archetype ? `archetype:${archetype}:${cell}` : `kind:${node.kind}:${cell}`;
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, nodes]) => nodes.length >= 3)
    .map(([id, nodes]) => {
      const points = nodes.map((node) => pointByNodeId.get(node.id)).filter((point): point is ProjectionPoint => Boolean(point));
      const center = averagePoints(points);
      const radius = clamp(averageDistance(points, center) + nodes.length * 1.8, 38, 170);
      const dominantKinds = dominantTerms(nodes.map((node) => node.kind), 3);
      const dominantArchetypes = dominantTerms(nodes.flatMap((node) => node.archetypes ?? []), 4);
      const attractorKinds = dominantTerms(nodes.flatMap((node) => readAttractorKinds(node)), 3);
      const cohesion = average(nodes.map((node) => node.cohesion));
      const density = round(nodes.length / Math.max(1, Math.PI * radius * radius / 1000));

      return {
        id,
        label: attractorKinds[0] ?? dominantArchetypes[0] ?? dominantKinds[0] ?? 'Cluster',
        nodeIds: nodes.map((node) => node.id),
        center,
        radius: round(radius),
        density,
        cohesion: round(cohesion),
        dominantKinds,
        dominantArchetypes,
        attractorKinds,
        colorKey: attractorKinds[0] ?? dominantArchetypes[0] ?? dominantKinds[0] ?? 'cluster',
        opacity: round(clamp(0.12 + density * 0.04 + cohesion * 0.16, 0.1, 0.34)),
        visible: input.mode === 'debug' || input.mode === 'overview' || input.mode === 'clusters' || input.mode === 'attractors'
      };
    })
    .sort((left, right) => right.nodeIds.length - left.nodeIds.length || left.id.localeCompare(right.id))
    .slice(0, input.detailLevel === 'macro' ? 10 : input.detailLevel === 'meso' ? 18 : 28);
}

function createPerceivedAttractors(
  input: ArchitecturePerceptionInput,
  pointByNodeId: Map<string, ProjectionPoint>,
  visibleNodeIds: Set<string>
): PerceivedAttractor[] {
  const groups = new Map<string, SemanticGraphNode[]>();

  for (const node of input.graph.nodes) {
    if (!visibleNodeIds.has(node.id)) continue;

    for (const attractor of readAttractorKinds(node)) {
      const group = groups.get(attractor) ?? [];
      group.push(node);
      groups.set(attractor, group);
    }
  }

  return [...groups.entries()].map(([attractor, nodes]) => {
    const points = nodes.map((node) => pointByNodeId.get(node.id)).filter((point): point is ProjectionPoint => Boolean(point));
    const center = averagePoints(points);
    const strength = clamp(average(nodes.map((node) => node.centrality + node.entropy * 0.4)) / 1.4, 0, 1);

    return {
      id: `attractor:${attractor}`,
      label: attractor,
      nodeIds: nodes.map((node) => node.id),
      center,
      strength: round(strength),
      radius: round(clamp(90 + nodes.length * 4 + strength * 80, 80, 240)),
      colorKey: attractor,
      visible: input.mode === 'debug' || input.mode === 'overview' || input.mode === 'attractors' || input.projection.kind === 'attractor' || input.projection.kind === 'mutualization'
    };
  }).sort((left, right) => right.strength - left.strength || left.id.localeCompare(right.id));
}

function createPerceivedCollisions(
  input: ArchitecturePerceptionInput,
  pointByNodeId: Map<string, ProjectionPoint>,
  visibleEdgeIds: Set<string>,
  nodeById: Map<string, SemanticGraphNode>
): PerceivedCollision[] {
  return input.graph.edges
    .filter((edge) => visibleEdgeIds.has(edge.id))
    .map((edge) => ({ edge, score: readCollisionScore(edge) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.edge.id.localeCompare(left.edge.id))
    .slice(0, input.detailLevel === 'macro' ? 8 : input.detailLevel === 'meso' ? 16 : 28)
    .map(({ edge, score }) => {
      const source = pointByNodeId.get(edge.source);
      const target = pointByNodeId.get(edge.target);
      const points = [source, target].filter((point): point is ProjectionPoint => Boolean(point));
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);

      return {
        id: `collision:${edge.id}`,
        edgeIds: [edge.id],
        nodeIds: [edge.source, edge.target],
        center: averagePoints(points),
        score: round(score),
        radius: round(clamp(28 + score * 70 + (sourceNode?.entropy ?? 0) * 18 + (targetNode?.entropy ?? 0) * 18, 28, 125)),
        visible: input.mode === 'debug' || input.mode === 'collisions' || input.mode === 'focus' || input.projection.kind === 'collision',
        localOnly: true
      };
    });
}

function resolveNeighborIds(graph: SemanticArchitectureGraph, focusNodeId?: string): Set<string> {
  const neighbors = new Set<string>();

  if (!focusNodeId) return neighbors;

  for (const edge of graph.edges) {
    if (edge.source === focusNodeId) neighbors.add(edge.target);
    if (edge.target === focusNodeId) neighbors.add(edge.source);
  }

  return neighbors;
}

function matchesNode(node: SemanticGraphNode, query: string): boolean {
  if (!query) return true;

  return [
    node.id,
    node.label,
    node.kind,
    node.packageNames.join(' '),
    node.featureIds.join(' '),
    node.concepts?.join(' ') ?? '',
    node.archetypes?.join(' ') ?? '',
    readAttractorKinds(node).join(' ')
  ].join(' ').toLowerCase().includes(query);
}

function resolveLabelVisible(options: {
  mode: PerceptionMode;
  detailLevel: DetailLevel;
  role: PerceivedNode['role'];
  showLabels: boolean;
  focused: boolean;
  neighbor: boolean;
  labelOpacity: number;
}): boolean {
  if (!options.showLabels || options.role === 'hidden') return false;
  if (options.mode === 'debug') return true;
  if (options.focused) return true;
  if (options.mode === 'focus') return options.focused || options.neighbor;
  if (options.detailLevel === 'macro') return options.role === 'primary';
  if (options.detailLevel === 'meso') return options.role === 'primary' || (options.role === 'secondary' && options.labelOpacity > 0.45);

  return options.labelOpacity > 0.34;
}

function resolveNodeOpacity(role: PerceivedNode['role'], score: number): number {
  if (role === 'primary') return round(clamp(0.72 + score * 0.28, 0.72, 1));
  if (role === 'secondary') return round(clamp(0.42 + score * 0.32, 0.42, 0.8));
  if (role === 'context') return round(clamp(0.18 + score * 0.24, 0.18, 0.48));

  return 0;
}

function resolveEdgeOpacity(role: PerceivedEdge['role'], score: number): number {
  if (role === 'focus') return round(clamp(0.5 + score * 0.44, 0.5, 0.94));
  if (role === 'collision') return round(clamp(0.44 + score * 0.38, 0.44, 0.86));
  if (role === 'structural') return round(clamp(0.2 + score * 0.36, 0.2, 0.62));
  if (role === 'semantic') return round(clamp(0.14 + score * 0.3, 0.14, 0.52));

  return 0;
}

function averagePoints(points: ProjectionPoint[]): { x: number; y: number; z?: number } {
  if (points.length === 0) {
    return { x: 500, y: 400 };
  }

  return {
    x: round(points.reduce((sum, point) => sum + point.x, 0) / points.length),
    y: round(points.reduce((sum, point) => sum + point.y, 0) / points.length)
  };
}

function averageDistance(points: ProjectionPoint[], center: { x: number; y: number }): number {
  if (points.length === 0) return 0;

  return average(points.map((point) => Math.hypot(point.x - center.x, point.y - center.y)));
}

function dominantTerms(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
