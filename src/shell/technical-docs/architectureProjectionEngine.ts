import {
  projectionKinds,
  type ArchitectureProjection,
  type ArchitectureProjectionInput,
  type ProjectionEdgeVisual,
  type ProjectionKind,
  type ProjectionNodeVisual,
  type ProjectionPoint
} from './architectureProjectionModel';
import {
  readAttractorKinds,
  readCollisionScore,
  type SemanticArchitectureGraph,
  type SemanticGraphEdge,
  type SemanticGraphNode
} from './semanticArchitectureGraphModel';

const projectionLabels: Record<ProjectionKind, { label: string; description: string }> = {
  semantic: {
    label: 'Semantic Projection',
    description: 'Groups nodes by concepts, archetypes, and cooccurrence neighborhoods.'
  },
  structural: {
    label: 'Structural Projection',
    description: 'Emphasizes dependency structure, packages, features, and files.'
  },
  entropy: {
    label: 'Entropy Projection',
    description: 'Surfaces dispersed concepts and ambiguous architectural signals.'
  },
  centrality: {
    label: 'Centrality Projection',
    description: 'Pulls central nodes toward the core and scales them by influence.'
  },
  collision: {
    label: 'Collision Projection',
    description: 'Highlights suspicious conceptual mixtures and high-tension edges.'
  },
  attractor: {
    label: 'Attractor Projection',
    description: 'Places nodes around runtime, projection, workspace, state, and tooling poles.'
  },
  mutualization: {
    label: 'Mutualization Projection',
    description: 'Identifies candidates that are central, dispersed, and weakly cohesive.'
  }
};

const attractorPoles: Record<string, { x: number; y: number }> = {
  'runtime-centric': { x: 500, y: 150 },
  'projection-centric': { x: 765, y: 300 },
  'workspace-centric': { x: 650, y: 640 },
  'state-centric': { x: 350, y: 640 },
  'tooling-centric': { x: 235, y: 300 }
};

export function createArchitectureProjection(
  graph: SemanticArchitectureGraph,
  kind: ProjectionKind
): ArchitectureProjection {
  const descriptor = projectionLabels[kind];
  const generatedAt = graph.generatedAt || 'deterministic';
  const points = graph.nodes.map((node, index) => createProjectionPoint(graph, node, index, kind));
  const nodeVisuals = graph.nodes.map((node) => createProjectionNodeVisual(graph, node, kind));
  const edgeVisuals = graph.edges.map((edge) => createProjectionEdgeVisual(edge, kind));

  return {
    id: `architecture-projection.${kind}`,
    label: descriptor.label,
    kind,
    description: descriptor.description,
    generatedAt,
    points,
    nodeVisuals,
    edgeVisuals,
    metrics: createProjectionMetrics(graph)
  };
}

export function createAllArchitectureProjections(graph: SemanticArchitectureGraph): ArchitectureProjection[] {
  return projectionKinds.map((kind) => createArchitectureProjection(graph, kind));
}

export function createArchitectureProjectionFromInput(input: ArchitectureProjectionInput): ArchitectureProjection {
  return {
    ...createArchitectureProjection(input.graph, input.kind),
    generatedAt: input.generatedAt ?? input.graph.generatedAt
  };
}

function createProjectionPoint(
  graph: SemanticArchitectureGraph,
  node: SemanticGraphNode,
  index: number,
  kind: ProjectionKind
): ProjectionPoint {
  switch (kind) {
    case 'semantic':
      return semanticPoint(graph, node, index);
    case 'structural':
      return structuralPoint(graph, node, index);
    case 'entropy':
      return entropyPoint(graph, node, index);
    case 'centrality':
      return centralityPoint(graph, node, index);
    case 'collision':
      return collisionPoint(graph, node, index);
    case 'attractor':
      return attractorPoint(node, index);
    case 'mutualization':
      return mutualizationPoint(node, index);
  }
}

function semanticPoint(graph: SemanticArchitectureGraph, node: SemanticGraphNode, _index: number): ProjectionPoint {
  const anchor = hashToAngle([node.kind, node.archetypes?.[0] ?? '', node.concepts?.[0] ?? ''].join(':'));
  const radius = 120 + (1 - node.centrality) * 250 + kindOffset(node.kind);
  const cooccurs = graph.edges.filter((edge) => edge.kind === 'cooccurs' && (edge.source === node.id || edge.target === node.id)).length;

  return polarPoint(node.id, anchor + cooccurs * 0.035, radius);
}

function structuralPoint(graph: SemanticArchitectureGraph, node: SemanticGraphNode, index: number): ProjectionPoint {
  const packageIndex = hashToUnit(node.packageNames[0] ?? node.id);
  const packageX = 120 + packageIndex * 760;
  const dependsOn = graph.edges.filter((edge) => edge.kind === 'depends_on' && (edge.source === node.id || edge.target === node.id)).length;
  const yByKind = { package: 120, feature: 245, file: 625, archetype: 380, concept: 470 }[node.kind];

  return {
    nodeId: node.id,
    x: clamp(packageX + stableJitter(index, 54), 60, 940),
    y: clamp(yByKind - Math.min(160, dependsOn * 2) + stableJitter(index + 11, 34), 70, 730)
  };
}

function entropyPoint(_graph: SemanticArchitectureGraph, node: SemanticGraphNode, index: number): ProjectionPoint {
  return {
    nodeId: node.id,
    x: clamp(120 + hashToUnit(node.kind + node.id) * 760, 60, 940),
    y: clamp(720 - node.entropy * 610 + stableJitter(index, 28), 70, 730)
  };
}

function centralityPoint(_graph: SemanticArchitectureGraph, node: SemanticGraphNode, _index: number): ProjectionPoint {
  const angle = hashToAngle(node.id);
  const radius = 320 * (1 - node.centrality) + kindOffset(node.kind);

  return polarPoint(node.id, angle, radius);
}

function collisionPoint(graph: SemanticArchitectureGraph, node: SemanticGraphNode, _index: number): ProjectionPoint {
  const collisionScore = nodeCollisionScore(graph, node.id);
  const angle = hashToAngle(node.id);
  const radius = 80 + (1 - collisionScore) * 330 + kindOffset(node.kind) * 0.45;

  return polarPoint(node.id, angle, radius, { x: 620, y: 340 });
}

function attractorPoint(node: SemanticGraphNode, index: number): ProjectionPoint {
  const attractors = readAttractorKinds(node);
  const fallback = polarPoint(node.id, hashToAngle(node.id), 310 + kindOffset(node.kind));

  if (attractors.length === 0) {
    return fallback;
  }

  const pole = averagePoints(attractors.map((attractor) => attractorPoles[attractor]).filter(Boolean));

  return {
    nodeId: node.id,
    x: clamp(pole.x + stableJitter(index, 92) + kindOffset(node.kind) * 0.5, 60, 940),
    y: clamp(pole.y + stableJitter(index + 23, 92), 70, 730)
  };
}

function mutualizationPoint(node: SemanticGraphNode, _index: number): ProjectionPoint {
  const score = mutualizationScore(node);
  const angle = hashToAngle(node.id);
  const radius = 350 * (1 - score) + kindOffset(node.kind) * 0.5;

  return polarPoint(node.id, angle, radius);
}

function createProjectionNodeVisual(
  graph: SemanticArchitectureGraph,
  node: SemanticGraphNode,
  kind: ProjectionKind
): ProjectionNodeVisual {
  const collisionScore = nodeCollisionScore(graph, node.id);
  const mutualization = mutualizationScore(node);
  const intensity = resolveNodeIntensity(node, kind, collisionScore, mutualization);

  return {
    nodeId: node.id,
    radius: round(clamp(4 + Math.log2(node.weight + 1) * 0.85 + intensity * 12, 4, 24)),
    intensity,
    colorKey: resolveColorKey(node, kind),
    halo: resolveHalo(kind, node, collisionScore, mutualization),
    labelOpacity: round(clamp(0.12 + node.centrality * 0.7 + intensity * 0.35, 0.12, 1))
  };
}

function createProjectionEdgeVisual(edge: SemanticGraphEdge, kind: ProjectionKind): ProjectionEdgeVisual {
  const collisionScore = readCollisionScore(edge);
  const emphasis = kind === 'collision'
    ? collisionScore
    : kind === 'structural' && edge.kind === 'depends_on'
      ? edge.confidence
      : kind === 'semantic' && edge.kind === 'cooccurs'
        ? edge.confidence
        : edge.confidence * 0.45;

  return {
    edgeId: edge.id,
    thickness: round(clamp(0.6 + Math.log2(edge.weight + 1) * 0.7 + emphasis * 1.8, 0.6, 6)),
    opacity: round(clamp(0.06 + emphasis * 0.7, 0.04, 0.9)),
    tension: round(clamp(collisionScore || edge.weight / 30, 0, 1))
  };
}

function createProjectionMetrics(graph: SemanticArchitectureGraph): ArchitectureProjection['metrics'] {
  const collisionScores = graph.edges.map((edge) => readCollisionScore(edge));
  const cohesionValues = graph.nodes.map((node) => node.cohesion);

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    maxCentrality: round(Math.max(0, ...graph.nodes.map((node) => node.centrality))),
    maxEntropy: round(Math.max(0, ...graph.nodes.map((node) => node.entropy))),
    maxCollisionScore: round(Math.max(0, ...collisionScores)),
    averageCohesion: round(cohesionValues.reduce((sum, value) => sum + value, 0) / Math.max(1, cohesionValues.length))
  };
}

function resolveNodeIntensity(
  node: SemanticGraphNode,
  kind: ProjectionKind,
  collisionScore: number,
  mutualization: number
): number {
  switch (kind) {
    case 'entropy':
      return round(node.entropy);
    case 'centrality':
      return round(node.centrality);
    case 'collision':
      return round(collisionScore);
    case 'attractor':
      return round(readAttractorKinds(node).length / 3);
    case 'mutualization':
      return round(mutualization);
    case 'structural':
      return round(node.kind === 'package' ? 0.85 : node.kind === 'file' ? 0.42 : node.centrality);
    case 'semantic':
      return round(Math.max(node.centrality, node.entropy * 0.65));
  }
}

function resolveHalo(
  kind: ProjectionKind,
  node: SemanticGraphNode,
  collisionScore: number,
  mutualization: number
): ProjectionNodeVisual['halo'] {
  if (kind === 'entropy' && node.entropy > 0.45) return 'entropy';
  if (kind === 'collision' && collisionScore > 0.1) return 'collision';
  if (kind === 'centrality' && node.centrality > 0.35) return 'centrality';
  if (kind === 'attractor' && readAttractorKinds(node).length > 0) return 'attractor';
  if (kind === 'mutualization' && mutualization > 0.42) return 'mutualization';

  return 'none';
}

function resolveColorKey(node: SemanticGraphNode, kind: ProjectionKind): string {
  if (kind === 'attractor') {
    return readAttractorKinds(node)[0] ?? node.kind;
  }

  return node.kind;
}

function nodeCollisionScore(graph: SemanticArchitectureGraph, nodeId: string): number {
  return Math.max(
    0,
    ...graph.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => readCollisionScore(edge))
  );
}

function mutualizationScore(node: SemanticGraphNode): number {
  const dispersion = Math.min(1, (node.featureIds.length + node.packageNames.length) / 10);

  return round(clamp(
    node.centrality * 0.4 +
      node.entropy * 0.3 +
      (1 - node.cohesion) * 0.2 +
      dispersion * 0.1,
    0,
    1
  ));
}

function polarPoint(nodeId: string, angle: number, radius: number, center = { x: 500, y: 400 }): ProjectionPoint {
  return {
    nodeId,
    x: round(clamp(center.x + Math.cos(angle) * radius, 60, 940)),
    y: round(clamp(center.y + Math.sin(angle) * radius, 70, 730))
  };
}

function averagePoints(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (points.length === 0) {
    return { x: 500, y: 400 };
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function kindOffset(kind: SemanticGraphNode['kind']): number {
  return { concept: -30, archetype: 0, feature: 38, package: 78, file: 125 }[kind];
}

function hashToAngle(value: string): number {
  return hashToUnit(value) * Math.PI * 2 - Math.PI;
}

function hashToUnit(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function stableJitter(seed: number, amount: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return (value - Math.floor(value) - 0.5) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
