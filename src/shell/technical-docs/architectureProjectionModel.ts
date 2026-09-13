import type { SemanticArchitectureGraph } from './semanticArchitectureGraphModel';

export type ProjectionKind =
  | 'semantic'
  | 'structural'
  | 'entropy'
  | 'centrality'
  | 'collision'
  | 'attractor'
  | 'mutualization';

export type ProjectionPoint = {
  nodeId: string;
  x: number;
  y: number;
  z?: number;
};

export type ProjectionNodeVisual = {
  nodeId: string;
  radius: number;
  intensity: number;
  colorKey: string;
  halo: 'none' | 'entropy' | 'collision' | 'centrality' | 'attractor' | 'mutualization';
  labelOpacity: number;
};

export type ProjectionEdgeVisual = {
  edgeId: string;
  thickness: number;
  opacity: number;
  tension: number;
};

export type ArchitectureProjection = {
  id: string;
  label: string;
  kind: ProjectionKind;
  description: string;
  generatedAt: string;
  points: ProjectionPoint[];
  nodeVisuals: ProjectionNodeVisual[];
  edgeVisuals: ProjectionEdgeVisual[];
  metrics: {
    nodeCount: number;
    edgeCount: number;
    maxCentrality: number;
    maxEntropy: number;
    maxCollisionScore: number;
    averageCohesion: number;
  };
};

export type ArchitectureProjectionDocument = {
  schemaVersion?: string;
  generatedAt: string;
  sourceGraph: string;
  projections: ArchitectureProjection[];
};

export type ArchitectureProjectionInput = {
  graph: SemanticArchitectureGraph;
  kind: ProjectionKind;
  generatedAt?: string;
};

export const projectionKinds: ProjectionKind[] = [
  'semantic',
  'structural',
  'entropy',
  'centrality',
  'collision',
  'attractor',
  'mutualization'
];

export function formatProjectionMetric(value: number): string {
  return `${Math.round(value * 100)}%`;
}
