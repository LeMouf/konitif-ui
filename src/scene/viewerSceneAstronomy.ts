/** Compatibility names only. Scene semantics are owned by Scene. */
export {
  type CelestialDirection as ViewerCelestialDirection,
  type SceneLocation as ViewerSceneLocation,
  type CelestialDirections as ViewerCelestialDirections,
  type CelestialAnnualPaths as ViewerCelestialAnnualPaths,
  resolveCelestialDirections as resolveViewerCelestialDirections,
  resolveSolarDaySpanDeg as resolveViewerSolarDaySpanDeg,
  resolveSolarPeakAltitude as resolveViewerSolarPeakAltitude,
  resolveMoonPhase as resolveViewerMoonPhase,
  projectCelestialAnnualPaths as projectViewerCelestialAnnualPaths
} from '@konitif/scene';
