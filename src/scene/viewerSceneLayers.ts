export type ViewerSceneLayerGroupId = 'scene' | 'visualEffects' | 'debug';

export type ViewerSceneLayerItemId = string;

export interface ViewerSceneLayerAnchor {
  itemId: ViewerSceneLayerItemId;
  optionId?: string;
  controlId?: string;
}

export interface ViewerSceneLayerRevealRequest extends ViewerSceneLayerAnchor {
  requestId: number;
}

export interface ViewerSceneLayerOption {
  id: string;
  configurationOf?: string;
  label: string;
  active: boolean;
  kind?: 'toggle' | 'action' | 'control';
  icon?: string;
  disabled?: boolean;
  summary?: string;
  metrics?: readonly ViewerSceneLayerMetric[];
  controls?: readonly ViewerSceneLayerNumericControl[];
  toggles?: readonly ViewerSceneLayerToggleControl[];
}

export interface ViewerSceneLayerToggleControl {
  id: string;
  label: string;
  active: boolean;
  disabled?: boolean;
}

export interface ViewerSceneLayerMetric {
  label: string;
  value: string;
  title?: string;
}

export interface ViewerSceneLayerNumericControl {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  readOnly?: boolean;
  sceneCycle?: {
    engaged: boolean;
    color: string;
    endpointId: string;
  };
}

export interface ViewerSceneLayerItem {
  id: ViewerSceneLayerItemId;
  group: ViewerSceneLayerGroupId;
  label: string;
  description: string;
  active: boolean;
  configOnly?: boolean;
  disabled?: boolean;
  options?: readonly ViewerSceneLayerOption[];
}

export interface ViewerSceneLayersSnapshot {
  items: readonly ViewerSceneLayerItem[];
  canEdit: boolean;
}

export interface ViewerSceneLayersCommandPort {
  toggleItem(id: ViewerSceneLayerItemId): void;
  toggleOption(itemId: ViewerSceneLayerItemId, optionId: string): void;
  toggleOptionControl(itemId: ViewerSceneLayerItemId, optionId: string, controlId: string): void;
  setOptionValue(itemId: ViewerSceneLayerItemId, optionId: string, controlId: string, value: number, commit?: boolean): void;
  toggleOptionValueSceneCycle(itemId: ViewerSceneLayerItemId, optionId: string, controlId: string): void;
}
