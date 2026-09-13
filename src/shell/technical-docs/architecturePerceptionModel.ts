import type { ProjectionPoint } from './architectureProjectionModel';
import type { GraphNodeKind, SemanticArchitectureGraph } from './semanticArchitectureGraphModel';
import type { ArchitectureProjection } from './architectureProjectionModel';

export type PerceptionMode =
  | 'overview'
  | 'clusters'
  | 'attractors'
  | 'collisions'
  | 'focus'
  | 'debug';

export type DetailLevel =
  | 'macro'
  | 'meso'
  | 'micro';

export type PerceivedNode = {
  nodeId: string;
  visible: boolean;
  opacity: number;
  radiusMultiplier: number;
  labelVisible: boolean;
  labelOpacity: number;
  priority: number;
  role: 'primary' | 'secondary' | 'context' | 'hidden';
};

export type PerceivedEdge = {
  edgeId: string;
  visible: boolean;
  opacity: number;
  thicknessMultiplier: number;
  priority: number;
  role: 'structural' | 'semantic' | 'collision' | 'focus' | 'hidden';
};

export type PerceivedCluster = {
  id: string;
  label: string;
  nodeIds: string[];
  center: { x: number; y: number; z?: number };
  radius: number;
  density: number;
  cohesion: number;
  dominantKinds: string[];
  dominantArchetypes: string[];
  attractorKinds: string[];
  colorKey: string;
  opacity: number;
  visible: boolean;
};

export type PerceivedAttractor = {
  id: string;
  label: string;
  nodeIds: string[];
  center: { x: number; y: number; z?: number };
  strength: number;
  radius: number;
  colorKey: string;
  visible: boolean;
};

export type PerceivedCollision = {
  id: string;
  edgeIds: string[];
  nodeIds: string[];
  center: { x: number; y: number; z?: number };
  score: number;
  radius: number;
  visible: boolean;
  localOnly: boolean;
};

export type ArchitecturePerception = {
  mode: PerceptionMode;
  detailLevel: DetailLevel;
  nodeVisibility: PerceivedNode[];
  edgeVisibility: PerceivedEdge[];
  clusters: PerceivedCluster[];
  attractors: PerceivedAttractor[];
  collisions: PerceivedCollision[];
  metrics: {
    visibleNodeCount: number;
    visibleEdgeCount: number;
    hiddenEdgeCount: number;
    clusterCount: number;
    attractorCount: number;
    collisionCount: number;
  };
};

export type ArchitecturePerceptionInput = {
  graph: SemanticArchitectureGraph;
  projection: ArchitectureProjection;
  mode: PerceptionMode;
  detailLevel: DetailLevel;
  focusNodeId?: string;
  searchQuery?: string;
  visibleNodeKinds?: GraphNodeKind[];
  showLabels?: boolean;
  showEdges?: boolean;
  edgeBudgetRatio?: number;
};

export type PerceptionPointLookup = Map<string, ProjectionPoint>;

export const perceptionModes: Array<{ id: PerceptionMode; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'attractors', label: 'Attractors' },
  { id: 'collisions', label: 'Collisions' },
  { id: 'focus', label: 'Focus' },
  { id: 'debug', label: 'Debug' }
];

export const detailLevels: Array<{ id: DetailLevel; label: string }> = [
  { id: 'macro', label: 'Macro' },
  { id: 'meso', label: 'Meso' },
  { id: 'micro', label: 'Micro' }
];
