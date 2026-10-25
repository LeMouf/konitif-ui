export interface LightTesterZoneDefinition {
  id: string;
  label: string;
  singularLabel: string;
  capability: ('rgb'|'blue-intensity'|'white-intensity');
  channels: readonly ('red'|'green'|'blue'|'intensity')[];
  levelCount: number;
  ledCountPerInstance: number;
  instanceOrder: readonly ('left'|'right'|'center')[];
  semanticColor: string;
  qualification: 'qualified' | 'api-exposed';
}
export interface LightTesterGroupDefinition {
  id: string;
  zoneId: string;
  label: string;
  emitterIds: readonly string[];
  kind: 'aggregate' | 'side' | 'spatial' | 'symmetric-pair' | 'unit';
  channels?: readonly ('red'|'green'|'blue'|'intensity')[];
}
export interface LightTesterConfiguration {
  calibrationVersion: number;
  zoneId: string;
  groupId: string;
  groupIds: readonly string[];
  color: string;
  groupColors: Readonly<Record<string, string>>;
  emitterColors: Readonly<Record<string, readonly string[]>>;
  emitterSelections: Readonly<Record<string, readonly string[]>>;
  scenario: LightTesterScenario;
  groupScenarios: Readonly<Record<string, LightTesterScenario>>;
  individualMode: LightTesterIndividualMode;
  groupIndividualModes: Readonly<Record<string, LightTesterIndividualMode>>;
  animationPattern: LightTesterAnimationPattern;
  groupAnimationPatterns: Readonly<Record<string, LightTesterAnimationPattern>>;
  animationPrimitiveIds: readonly LightTesterAnimationPrimitiveId[];
  groupAnimationPrimitiveIds: Readonly<Record<string, readonly LightTesterAnimationPrimitiveId[]>>;
  animationSpeedMs: number;
  groupAnimationSpeedMs: Readonly<Record<string, number>>;
  animationDirection: LightTesterAnimationDirection;
  groupAnimationDirections: Readonly<Record<string, LightTesterAnimationDirection>>;
  loadingMode: LightTesterLoadingMode;
  groupLoadingModes: Readonly<Record<string, LightTesterLoadingMode>>;
  pulseShape: LightTesterPulseShape;
  groupPulseShapes: Readonly<Record<string, LightTesterPulseShape>>;
  rainbowPalette: LightTesterRainbowPalette;
  groupRainbowPalettes: Readonly<Record<string, LightTesterRainbowPalette>>;
  secondaryColor: string;
  tertiaryColor: string;
  groupSecondaryColors: Readonly<Record<string, string>>;
  groupTertiaryColors: Readonly<Record<string, string>>;
  intensity: number;
  zoneIntensities: Readonly<Partial<Record<string, number>>>;
  emissionIntensities: Readonly<Record<string, number>>;
  lightSpillIntensities: Readonly<Record<string, number>>;
  active: boolean;
}

export type LightTesterScenario = 'preset' | 'animated' | 'individual';
export type LightTesterIndividualMode = 'free' | 'mirror';
export type LightTesterAnimationPrimitiveId = 'loading' | 'chase' | 'pulse' | 'rainbow';
export type LightTesterAnimationPattern = LightTesterAnimationPrimitiveId;
export type LightTesterAnimationDirection = 'forward' | 'reverse';
export type LightTesterLoadingMode = 'fill' | 'bounce';
export type LightTesterPulseShape = 'sine' | 'heartbeat';
export type LightTesterRainbowPalette = 'spectrum' | 'custom';

export interface LightTesterSnapshot {
  configuration: LightTesterConfiguration;
  workflowTracksVisible: boolean;
  realRobotLedsVisible: boolean;
  realRobotConnected: boolean;
  realRobotLedAvailable: boolean;
  zones: readonly LightTesterZoneDefinition[];
  groups: readonly LightTesterGroupDefinition[];
  canEdit: boolean;
  canToggleWorkflowTracks: boolean;
  canToggleRealRobotLeds: boolean;
}

export interface LightTesterCommandPort {
  update(patch: Partial<LightTesterConfiguration>): void;
  stop(): void;
  setWorkflowTracksVisible(visible: boolean): void;
  setRealRobotLedsVisible(visible: boolean): void;
}

export type LightTesterColorPresetId =
  | 'spectrum'
  | 'rgb'
  | 'warm-cool'
  | 'signal';


/** Projection policy supplied by the composing host; no profile is registered here. */
export interface LightTesterPresentation {
 readPreviewTimeMs():number;
 colorPresets:readonly {id:LightTesterColorPresetId;label:string;colors:readonly string[]}[];
 createPresetColors(id:LightTesterColorPresetId,count:number):readonly string[];
 formatEmitterLabel(id:string,compact?:boolean):string;
 identifyAnimationComposition(ids:readonly LightTesterAnimationPrimitiveId[]):{id:string;primitiveIds:readonly LightTesterAnimationPrimitiveId[]};
 partitionEmitterRows(group:LightTesterGroupDefinition):readonly (readonly string[])[];
 resolveMirrorEmitterId(group:LightTesterGroupDefinition,id:string):string|null;
 supportsMirror(group:LightTesterGroupDefinition|undefined):boolean;
 sortEmitterIds(ids:readonly string[]):readonly string[];
}
