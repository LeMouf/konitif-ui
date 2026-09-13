import type { WorkbenchIconInput } from '@konitif/workbench';
import type { DesignSystemThemeGraphNode } from '../designSystemThemeCatalog';

export type ProductDocsTemplate = {
  id: string;
  title: string;
  role: string;
  routeScope: string;
  summary: string;
  featureIds: string[];
  designNodeIds: string[];
  slots: string[];
  features?: ProductDocsFeature[];
  designNodes?: ProductDocsDesignNode[];
  sourceEntities?: ProductDocsSourceEntity[];
};

export type ProductDocsPage = {
  id: string;
  title: string;
  route: string;
  templateId: string;
  status: string;
  summary: string;
  featureIds: string[];
  designNodeIds: string[];
  entryPoints: Array<{ label: string; href: string; kind: string }>;
  config: string;
  features?: ProductDocsFeature[];
  designNodes?: ProductDocsDesignNode[];
  sourceEntities?: ProductDocsSourceEntity[];
};

export type ProductDocsFeature = {
  id: string;
  title: string;
  status: string;
  domain: string;
  context: string;
  summary: string;
};

export type ProductDocsDesignNode = {
  id: string;
  title: string;
  status: string;
  category: string;
  summary: string;
};

export type ProductDocsSourceEntity = {
  id: string;
  title: string;
  kind: string;
  sourceFile: string;
};

export type ProductArchitectureFindingSeverity = 'info' | 'warning' | 'danger';
export type ProductArchitectureFindingKind = 'oversized' | 'singleton' | 'duplication' | 'reuse';

export type ProductArchitectureFinding = {
  id: string;
  title: string;
  summary: string;
  kind: ProductArchitectureFindingKind;
  severity: ProductArchitectureFindingSeverity;
  count: number;
  sourceFile?: string;
  items: ProductDocsSourceEntity[];
};

export type ProductIconScanEntry = {
  sourceFile: string;
  line?: number;
  category: string;
  suggestedIconId: string;
  context?: string;
  bytes?: number;
};

export type ProductIconScanProjection = {
  generatedAt?: string | null;
  roots: string[];
  totals: {
    svgFiles: number;
    inlineSvg: number;
    scannedFiles: number;
  };
  svgFiles: ProductIconScanEntry[];
  inlineSvg: ProductIconScanEntry[];
};

export type ProductMapTone = 'design' | 'runtime' | 'template' | 'product' | 'shared';

export type ProductMapItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  tone: ProductMapTone;
  status: string;
  summary?: string;
  sourceFile?: string;
  tags: string[];
  dependencies: string[];
  consumers: string[];
};

export type ProductMapColumn = {
  id: string;
  title: string;
  tone: ProductMapTone;
  summary: string;
  items: ProductMapItem[];
};

export type ProductSidebarEntry = ProductMapColumn & {
  icon: WorkbenchIconInput;
};

export type ProductRenderSurfaceMode = 'real' | 'projection';

export type ProductRenderWireframeSlot = {
  id: string;
  label: string;
  role: string;
  tone: ProductMapTone;
  source: string;
  targetId?: string;
};

export type ProductRenderLayoutArea = 'toolbar' | 'left' | 'workspace' | 'right' | 'footer' | 'auto';
export type ProductRenderLayoutVariant = 'app-shell' | 'isolated' | 'standard';

export type ProductRenderLayoutSlot = ProductRenderWireframeSlot & {
  area: ProductRenderLayoutArea;
};

export type ProductRenderComputedLayer = ProductRenderLayoutSlot & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProductPropertiesModel = {
  computed: Array<{ label: string; value: string }>;
  box: {
    margin: string;
    border: string;
    padding: string;
    content: string;
  };
};

export type ProductRenderComponentGroup = {
  label: string;
  tone: ProductMapTone;
  items: ProductRenderWireframeSlot[];
};

export type ProductRenderEngineScene = {
  title: string;
  summary: string;
  mode: ProductRenderSurfaceMode;
  resolution: string;
  theme: string;
  slots: ProductRenderWireframeSlot[];
  layoutSlots: ProductRenderLayoutSlot[];
  layoutVariant: ProductRenderLayoutVariant;
  componentGroups: ProductRenderComponentGroup[];
  compositionRows: ProductFlatTreeNode[];
  template: ProductDocsTemplate | null;
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>;
  compositionItems: ProductMapItem[];
  menuEntries: Array<{ label: string; href: string; status: string }>;
  metadata: Array<{ label: string; value: string }>;
};

export type ProductTreeNode = {
  id: string;
  label: string;
  tone: ProductMapTone;
  badge?: string;
  sourceFile?: string;
  targetId?: string;
  children?: ProductTreeNode[];
};

export type ProductFlatTreeNode = ProductTreeNode & {
  depth: number;
};

export type ProductPropertiesTab = 'computed' | 'styles' | 'events' | 'attributes' | 'data';

export type ProductDocsProjection = {
  id: string;
  sourceFile: string;
  generatedAt?: string;
  totals: {
    pages: number;
    templates: number;
    routes: number;
    features: number;
    designNodes: number;
    sourceEntities?: number;
    iconSvgFiles?: number;
    iconInlineSvg?: number;
    iconScannedFiles?: number;
  };
  pages: ProductDocsPage[];
  templates: ProductDocsTemplate[];
  sourceEntities?: ProductDocsSourceEntity[];
  iconScan?: ProductIconScanProjection | null;
};
