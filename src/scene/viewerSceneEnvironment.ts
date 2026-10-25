/** Compatibility names only. Scene semantics are owned by Scene. */
export {
  type ScenePhase as ViewerScenePhase,
  type SceneSeason as ViewerSceneSeason,
  type SceneEnvironment as ViewerSceneEnvironment,
  type SceneEnvironmentProjection as ViewerSceneEnvironmentProjection,
  LUNAR_EXPOSURE_MAX as VIEWER_LUNAR_EXPOSURE_MAX,
  LUNAR_RENDER_LIGHT_MAX as VIEWER_LUNAR_RENDER_LIGHT_MAX,
  projectLunarRenderLightFactor as projectViewerLunarRenderLightFactor,
  type CelestialShadowProjection as ViewerCelestialShadowProjection,
  projectCelestialShadow as projectViewerCelestialShadow,
  DEFAULT_SCENE_ENVIRONMENT as DEFAULT_VIEWER_SCENE_ENVIRONMENT,
  wrapSceneValue as wrapViewerSceneValue,
  sceneDaysInYear as viewerSceneDaysInYear,
  resolveSceneEnvironment as resolveViewerSceneEnvironment,
  projectSceneEnvironment as projectViewerSceneEnvironment,
  advanceSceneEnvironment as advanceViewerSceneEnvironment,
  formatSceneTime as formatViewerSceneTime,
  resolveSceneDateFromNow as resolveViewerSceneDateFromNow
} from '@konitif/scene';
