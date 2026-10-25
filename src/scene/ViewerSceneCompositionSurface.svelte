<script lang="ts">
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import {
    VIEWER_SCENE_COMPOSITION_BUILT_IN_TRACKS,
    DEFAULT_VIEWER_SCENE_COMPOSITION,
    evaluateViewerSceneCompositionCurve,
    isViewerSceneCompositionEditableTrackId,
    listViewerSceneCompositionTrackIds,
    removeViewerSceneCompositionKey,
    resolveViewerSceneComposition,
    resolveViewerSceneCompositionTangents,
    serializeViewerSceneComposition,
    type ViewerSceneComposition,
    type ViewerSceneCompositionEditableTrackId,
    type ViewerSceneCompositionEasing,
    type ViewerSceneCompositionKey,
    type ViewerSceneCompositionTangentMode,
    type ViewerSceneCompositionTrackId
  } from './viewerSceneComposition.js';
  import {
    resolveViewerCelestialDirections,
    type ViewerCelestialDirection
  } from './viewerSceneAstronomy.js';
  import {
    VIEWER_LUNAR_RENDER_LIGHT_MAX,
    viewerSceneDaysInYear,
    projectViewerLunarRenderLightFactor,
    projectViewerSceneEnvironment,
    resolveViewerSceneEnvironment,
    type ViewerSceneEnvironment
  } from './viewerSceneEnvironment.js';

  export let environment: ViewerSceneEnvironment;
  export let canEdit = true;
  export let preview: (patch: Partial<ViewerSceneEnvironment>) => void;
  export let commit: (patch: Partial<ViewerSceneEnvironment>) => void;
  export let title = 'Ambiance de scène';
  type SceneCompositionPreset = {
    id: string;
    name: string;
    builtIn: boolean;
    composition: ViewerSceneComposition;
  };
  export let presets: readonly SceneCompositionPreset[] = [{
    id: 'default',
    name: 'Par défaut',
    builtIn: true,
    composition: resolveViewerSceneComposition(DEFAULT_VIEWER_SCENE_COMPOSITION)
  }];
  export let activePresetId: string | null = 'default';
  export let onApplyPreset: (id: string) => void = () => undefined;
  export let onCreatePreset: (name: string, composition: ViewerSceneComposition) => void = () => undefined;
  export let onUpdatePreset: (id: string, composition: ViewerSceneComposition) => void = () => undefined;
  export let onDeletePreset: (id: string) => void = () => undefined;
  export let onOpenParameter: ((endpointId: string) => void) | undefined = undefined;

  const WIDTH = 1000;
  const HEIGHT = 190;
  const PADDING_X = 12;
  const PADDING_Y = 12;
  const TRACK_LIST_DEFAULT_WIDTH = 220;
  const TRACK_LIST_MIN_WIDTH = 170;
  const TRACK_LIST_MAX_WIDTH = 360;
  type LunarReferenceProjection = {
    bandPath: string;
    minimumPath: string;
    maximumPath: string;
    altitudePath: string;
    azimuthPaths: string[];
    horizonY: number;
  };
  const easingOptions: Array<{ id: ViewerSceneCompositionEasing; label: string }> = [
    { id: 'smooth', label: 'Organique' },
    { id: 'linear', label: 'Linéaire' },
    { id: 'ease_in', label: 'Entrée douce' },
    { id: 'ease_out', label: 'Sortie douce' },
    { id: 'ease_in_out', label: 'Douce entrée / sortie' },
    { id: 'step', label: 'Palier' }
  ];
  const cycleDurationOptions = [5, 10, 30, 60, 120, 300, 600] as const;
  const tangentModeOptions: Array<{ id: ViewerSceneCompositionTangentMode; label: string }> = [
    { id: 'auto', label: 'Auto' },
    { id: 'smooth', label: 'Lissée' },
    { id: 'free', label: 'Libre' }
  ];
  const builtInTrackPresentation = Object.fromEntries(
    VIEWER_SCENE_COMPOSITION_BUILT_IN_TRACKS.map((track) => [track.id, {
      label: track.label,
      color: track.color,
      editable: track.role === 'authority',
      ...(track.referenceLabel ? { referenceLabel: track.referenceLabel } : {})
    }])
  ) as Record<string, { label: string; color: string; editable: boolean; referenceLabel?: string }>;
  let selectedTrackId: ViewerSceneCompositionTrackId | null = null;
  let knownTrackIds: ViewerSceneCompositionTrackId[] = [];
  let trackListWidth = TRACK_LIST_DEFAULT_WIDTH;
  let trackListResize: {
    pointerId: number;
    startClientX: number;
    startWidth: number;
    maxWidth: number;
  } | null = null;
  let drag: { trackId: ViewerSceneCompositionEditableTrackId; keyIndex: number; svg: SVGSVGElement } | null = null;
  let tangentDrag: {
    trackId: ViewerSceneCompositionEditableTrackId;
    keyIndex: number;
    side: 'in' | 'out';
    spanHours: number;
    free: boolean;
    svg: SVGSVGElement;
  } | null = null;
  let scrub: { pointerId: number; svg: SVGSVGElement } | null = null;
  let pan: {
    pointerId: number;
    startClientX: number;
    startViewStartHours: number;
    element: HTMLDivElement | SVGSVGElement;
    source: 'footer' | 'graph';
  } | null = null;
  let scrubTimeHours: number | null = null;
  let viewStartHours = 0;
  let controlPressed = false;
  let panOriginRatio = 0.5;
  let panPressureRatio = 0.5;
  let graphSvg: SVGSVGElement | null = null;
  let tweenMenuElement: HTMLDivElement | null = null;
  let tweenMenu: {
    trackId: ViewerSceneCompositionEditableTrackId;
    fromKeyIndex: number;
    x: number;
    y: number;
  } | null = null;
  let selectedKeyIndex: number | null = null;
  let selectedSegmentIndex = 0;
  let hoveredKeyIndex: number | null = null;
  let hoveredSegmentIndex: number | null = null;
  let draftComposition: ViewerSceneComposition | null = null;
  let showLunarReference = false;
  let lunarReferenceCacheKey = "";
  let lunarReferenceCache: LunarReferenceProjection | null = null;
  let creatingPreset = false;
  let newPresetName = '';

  $: composition = draftComposition ?? environment.composition;
  $: availableTrackIds = [
    ...VIEWER_SCENE_COMPOSITION_BUILT_IN_TRACKS.map((track) => track.id),
    ...composition.parameterTracks.map((track) => track.id)
  ];
  $: computedTrackIds = listViewerSceneCompositionTrackIds(composition);
  $: synchronizeTrackSelection(computedTrackIds);
  $: visibleTrackIds = computedTrackIds.filter(
    (trackId) => !composition.hiddenTrackIds.includes(trackId)
  );
  $: renderedTrackIds = selectedTrackId && visibleTrackIds.includes(selectedTrackId)
    ? [...visibleTrackIds.filter((trackId) => trackId !== selectedTrackId), selectedTrackId]
    : visibleTrackIds;
  $: graphEnvironment = resolveViewerSceneEnvironment({ ...environment, composition });
  $: trackPaths = buildTrackPaths(graphEnvironment, viewStartHours);
  $: selectedKeys = selectedTrackId && isEditableTrack(selectedTrackId)
    ? editableKeys(selectedTrackId, composition, graphEnvironment)
    : [];
  $: selectedKeyPoints = selectedKeys.map((key) => ({
    key,
    x: xForSceneTime(key.timeHours, viewStartHours),
    y: yForValue(key.value)
  }));
  $: selectedTangents = resolveViewerSceneCompositionTangents(selectedKeys);
  $: selectedTangentHandles = buildSelectedTangentHandles(selectedKeys, selectedTangents, selectedKeyIndex, viewStartHours);
  $: if (selectedKeyIndex !== null && selectedKeys.length > 0 && selectedKeyIndex >= selectedKeys.length) {
    selectedKeyIndex = selectedKeys.length - 1;
  }
  $: if (selectedKeys.length > 1 && selectedSegmentIndex >= selectedKeys.length) {
    selectedSegmentIndex = selectedKeys.length - 1;
  }
  $: selectedSegmentPaths = selectedTrackId && isEditableTrack(selectedTrackId)
    ? buildEditableSegmentPaths(
        selectedKeys,
        viewStartHours
      )
    : [];
  $: lunarReferenceProjection = showLunarReference
    ? buildLunarReferenceProjection(
        environment.year,
        environment.dayOfYear,
        environment.latitude,
        environment.longitude,
        viewStartHours
      )
    : null;
  $: selectedSegmentEasing = selectedKeys[selectedSegmentIndex]?.interpolationToNext ?? 'smooth';
  $: selectedTangentMode = selectedKeyIndex === null ? 'auto' : selectedKeys[selectedKeyIndex]?.tangentMode ?? 'auto';
  $: displayedTimeHours = scrubTimeHours ?? environment.timeHours;
  $: activePreset = presets.find((preset) => preset.id === activePresetId) ?? null;
  $: compositionDirty = activePreset === null ||
    compositionFingerprint(composition) !== compositionFingerprint(activePreset.composition);
  $: hasStandardCycleDuration = cycleDurationOptions.includes(
    environment.cycleDurationSeconds as typeof cycleDurationOptions[number]
  );

  function projectionAt(timeHours: number, source = environment) {
    const dayOffset = Math.floor(timeHours / 24);
    return projectViewerSceneEnvironment({
      ...source,
      dayOfYear: source.dayOfYear + dayOffset,
      timeHours: wrapHours(timeHours)
    });
  }

  function synchronizeTrackSelection(nextTrackIds: ViewerSceneCompositionTrackId[]): void {
    const addedEditableTrack = nextTrackIds.find(
      (trackId) => !knownTrackIds.includes(trackId) && isEditableTrack(trackId)
    );
    if (addedEditableTrack) {
      selectedTrackId = addedEditableTrack;
      selectedKeyIndex = null;
    } else if (selectedTrackId && !nextTrackIds.includes(selectedTrackId)) {
      selectedTrackId = null;
      selectedKeyIndex = null;
    }
    knownTrackIds = [...nextTrackIds];
  }

  function compositionFingerprint(value: ViewerSceneComposition): string {
    return JSON.stringify(serializeViewerSceneComposition(value));
  }

  function selectCompositionPreset(event: Event): void {
    const id = (event.currentTarget as HTMLSelectElement).value;
    if (id) onApplyPreset(id);
  }

  function beginPresetCreation(): void {
    newPresetName = '';
    creatingPreset = true;
  }

  function createCompositionPreset(): void {
    const name = newPresetName.trim();
    if (!name) return;
    onCreatePreset(name, composition);
    creatingPreset = false;
    newPresetName = '';
  }

  function handlePresetNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      createCompositionPreset();
    } else if (event.key === 'Escape') {
      creatingPreset = false;
      newPresetName = '';
    }
  }

  function updateCompositionPreset(): void {
    if (!activePreset || activePreset.builtIn) return;
    onUpdatePreset(activePreset.id, composition);
  }

  function saveCompositionPreset(): void {
    if (!compositionDirty) return;
    if (activePreset && !activePreset.builtIn) {
      updateCompositionPreset();
      return;
    }
    beginPresetCreation();
  }

  function deleteCompositionPreset(): void {
    if (!activePreset || activePreset.builtIn) return;
    onDeletePreset(activePreset.id);
  }

  function valueAt(trackId: ViewerSceneCompositionTrackId, timeHours: number, source = environment): number {
    if (isEditableTrack(trackId)) {
      const curve = source.composition.curves[trackId];
      if (curve?.length) return evaluateViewerSceneCompositionCurve(curve, timeHours, 0);
    }
    const projection = projectionAt(timeHours, source);
    if (trackId === 'solar') return projection.solarExposureFactor;
    if (trackId === 'lunar') return Math.min(1,
      projectViewerLunarRenderLightFactor(
        projection.solarExposureFactor, projection.lunarExposureFactor
      ) / VIEWER_LUNAR_RENDER_LIGHT_MAX
    );
    if (trackId === 'lighting') return projection.lightingCurveFactor;
    if (trackId === 'fog') return projection.fogFactor;
    if (trackId === 'reflection') return projection.reflectionFactor;
    return (projection.effectiveExposure - projection.exposureMin) /
      Math.max(0.001, projection.exposureMax - projection.exposureMin);
  }

  function presentationFor(trackId: ViewerSceneCompositionTrackId): { label: string; color: string; editable: boolean; referenceLabel?: string } {
    const builtIn = builtInTrackPresentation[trackId];
    if (builtIn) return builtIn;
    const parameter = composition.parameterTracks.find((track) => track.id === trackId);
    return {
      label: parameter?.label ?? trackId,
      color: parameter?.color ?? '#45d9e9',
      editable: true
    };
  }

  function endpointFor(trackId: ViewerSceneCompositionTrackId): string | null {
    return VIEWER_SCENE_COMPOSITION_BUILT_IN_TRACKS.find((track) => track.id === trackId)?.endpointId
      ?? composition.parameterTracks.find((track) => track.id === trackId)?.endpointId
      ?? null;
  }

  function wrapHours(value: number): number {
    return ((value % 24) + 24) % 24;
  }

  function buildTrackPaths(
    source: ViewerSceneEnvironment,
    startHours: number
  ): Partial<Record<ViewerSceneCompositionTrackId, string>> {
    return Object.fromEntries(listViewerSceneCompositionTrackIds(source.composition).map((trackId) => {
      const keys = isEditableTrack(trackId)
        ? editableKeys(trackId, source.composition, source)
        : undefined;
      const path = keys && keys.length > 1
        ? buildEditableSegmentPaths(keys, startHours).flatMap((segment) => segment.paths).join(' ')
        : pathFor(trackId, source, startHours);
      return [trackId, path];
    })) as Partial<Record<ViewerSceneCompositionTrackId, string>>;
  }

  function pathFor(
    trackId: ViewerSceneCompositionTrackId,
    source: ViewerSceneEnvironment,
    startHours: number
  ): string {
    const displayTimes = new Set(Array.from({ length: 97 }, (_, index) => index / 4));
    for (const key of (isViewerSceneCompositionEditableTrackId(trackId)?source.composition.curves[trackId]:undefined) ?? []) {
      displayTimes.add(wrapHours(key.timeHours - startHours));
    }
    return [...displayTimes].sort((left, right) => left - right).map((displayTime, index) => {
      const unwrappedSceneTime = startHours + displayTime;
      const sceneTime = unwrappedSceneTime;
      const x = xForDisplayTime(displayTime);
      const y = PADDING_Y + (1 - valueAt(trackId, sceneTime, source)) * (HEIGHT - PADDING_Y * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function buildEditableSegmentPaths(
    keys: ViewerSceneCompositionKey[],
    startHours: number
  ): Array<{ fromKeyIndex: number; paths: string[] }> {
    return keys.map((key, fromKeyIndex) => {
      const nextKey = keys[(fromKeyIndex + 1) % keys.length];
      if (!nextKey) return { fromKeyIndex, paths: [] };
      const segmentEndTime = fromKeyIndex === keys.length - 1
        ? nextKey.timeHours + 24
        : nextKey.timeHours;
      const chunks: Array<Array<{ x: number; y: number }>> = [[]];
      let previousDisplayTime: number | null = null;
      let previousSceneTime: number | null = null;
      for (let sampleIndex = 0; sampleIndex <= 32; sampleIndex += 1) {
        const ratio = sampleIndex / 32;
        const sceneTime = key.timeHours + (segmentEndTime - key.timeHours) * ratio;
        const displayTime = wrapHours(sceneTime - startHours);
        if (previousDisplayTime !== null && previousSceneTime !== null && displayTime < previousDisplayTime - 12) {
          const boundarySceneTime = startHours + Math.ceil((previousSceneTime - startHours) / 24) * 24;
          const boundaryY = yForValue(evaluateViewerSceneCompositionCurve(keys, boundarySceneTime, key.value));
          chunks[chunks.length - 1]?.push({ x: xForDisplayTime(24), y: boundaryY });
          chunks.push([{ x: xForDisplayTime(0), y: boundaryY }]);
        }
        chunks[chunks.length - 1]?.push({
          x: xForDisplayTime(displayTime),
          y: yForValue(evaluateViewerSceneCompositionCurve(keys, sceneTime, key.value))
        });
        previousDisplayTime = displayTime;
        previousSceneTime = sceneTime;
      }
      return {
        fromKeyIndex,
        paths: chunks.filter((chunk) => chunk.length > 1).map((chunk) =>
          chunk.map((point, index) =>
            `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`
          ).join(' ')
        )
      };
    });
  }

  function editableKeys(
    trackId: ViewerSceneCompositionEditableTrackId,
    sourceComposition = composition,
    sourceEnvironment = environment
  ): ViewerSceneCompositionKey[] {
    const explicit = sourceComposition.curves[trackId];
    if (explicit?.length) return explicit;
    const evaluationEnvironment = sourceEnvironment.composition === sourceComposition
      ? sourceEnvironment
      : { ...sourceEnvironment, composition: sourceComposition };
    return Array.from({ length: 8 }, (_, index) => {
      const timeHours = index * 3;
      return { timeHours, value: valueAt(trackId, timeHours, evaluationEnvironment) };
    });
  }

  function isEditableTrack(trackId: ViewerSceneCompositionTrackId): trackId is ViewerSceneCompositionEditableTrackId {
    return isViewerSceneCompositionEditableTrackId(trackId, composition);
  }

  function xForDisplayTime(timeHours: number): number {
    return PADDING_X + (timeHours / 24) * (WIDTH - PADDING_X * 2);
  }

  function xForSceneTime(timeHours: number, startHours: number): number {
    let relativeTime = wrapHours(timeHours - startHours);
    if (Math.abs(relativeTime) < 0.001 && timeHours >= 24 && Math.abs(startHours) < 0.001) {
      relativeTime = 24;
    }
    return xForDisplayTime(relativeTime);
  }

  function yForValue(value: number): number {
    return PADDING_Y + (1 - value) * (HEIGHT - PADDING_Y * 2);
  }

  function altitudeValue(direction: ViewerCelestialDirection): number {
    return (direction.y + 1) / 2;
  }

  function azimuthValue(direction: ViewerCelestialDirection): number {
    return wrapHours(Math.atan2(-direction.x, direction.z) * 12 / Math.PI) / 24;
  }

  function svgPath(points: Array<{ x: number; y: number }>): string {
    return points.map((point, index) =>
      (index === 0 ? "M" : "L") + point.x.toFixed(2) + "," + point.y.toFixed(2)
    ).join(" ");
  }

  function buildLunarReferenceProjection(
    year: number,
    dayOfYear: number,
    latitude: number,
    longitude: number,
    startHours: number
  ): LunarReferenceProjection {
    const cacheKey = [year, dayOfYear, latitude.toFixed(4), longitude.toFixed(4), startHours.toFixed(4)].join(":");
    if (lunarReferenceCacheKey === cacheKey && lunarReferenceCache) return lunarReferenceCache;
    const annualDays = viewerSceneDaysInYear(year);
    const minimum: Array<{ x: number; y: number }> = [];
    const maximum: Array<{ x: number; y: number }> = [];
    const altitude: Array<{ x: number; y: number }> = [];
    const azimuthChunks: Array<Array<{ x: number; y: number }>> = [[]];
    let previousAzimuth: number | null = null;

    for (let sampleIndex = 0; sampleIndex <= 96; sampleIndex += 1) {
      const displayTime = sampleIndex / 4;
      const sceneTime = startHours + displayTime;
      const x = xForDisplayTime(displayTime);
      const currentMoon = resolveViewerCelestialDirections({
        year, dayOfYear, timeHours: sceneTime, latitude, longitude
      }).moon;
      const annualAltitudes: number[] = [];
      for (let annualDay = 0; annualDay < annualDays; annualDay += 1) {
        annualAltitudes.push(altitudeValue(resolveViewerCelestialDirections({
          year, dayOfYear: annualDay, timeHours: sceneTime, latitude, longitude
        }).moon));
      }
      const minimumAltitude = Math.min(...annualAltitudes);
      const maximumAltitude = Math.max(...annualAltitudes);
      minimum.push({ x, y: yForValue(minimumAltitude) });
      maximum.push({ x, y: yForValue(maximumAltitude) });
      altitude.push({ x, y: yForValue(altitudeValue(currentMoon)) });

      const azimuth = azimuthValue(currentMoon);
      if (previousAzimuth !== null && Math.abs(azimuth - previousAzimuth) > .5) azimuthChunks.push([]);
      azimuthChunks[azimuthChunks.length - 1]?.push({ x, y: yForValue(azimuth) });
      previousAzimuth = azimuth;
    }

    const projection: LunarReferenceProjection = {
      bandPath: svgPath(maximum) + " " + svgPath([...minimum].reverse()).replace(/^M/, "L") + " Z",
      minimumPath: svgPath(minimum),
      maximumPath: svgPath(maximum),
      altitudePath: svgPath(altitude),
      azimuthPaths: azimuthChunks.filter((chunk) => chunk.length > 1).map(svgPath),
      horizonY: yForValue(.5)
    };
    lunarReferenceCacheKey = cacheKey;
    lunarReferenceCache = projection;
    return projection;
  }

  function buildSelectedTangentHandles(
    keys: ViewerSceneCompositionKey[],
    tangents: Array<{ inTangent: number; outTangent: number }>,
    keyIndex: number | null,
    startHours: number
  ): Array<{ side: 'in' | 'out'; x: number; y: number; keyX: number; keyY: number; spanHours: number }> {
    if (keyIndex === null || keys.length < 3 || !keys[keyIndex]) return [];
    const previousIndex = (keyIndex - 1 + keys.length) % keys.length;
    const nextIndex = (keyIndex + 1) % keys.length;
    const key = keys[keyIndex];
    const tangent = tangents[keyIndex];
    const previous = keys[previousIndex];
    const next = keys[nextIndex];
    if (!key || !tangent || !previous || !next) return [];
    const keyTime = key.timeHours;
    const previousTime = previousIndex > keyIndex ? previous.timeHours - 24 : previous.timeHours;
    const nextTime = nextIndex < keyIndex ? next.timeHours + 24 : next.timeHours;
    const previousSpan = Math.max(0.05, keyTime - previousTime);
    const nextSpan = Math.max(0.05, nextTime - keyTime);
    const keyX = xForSceneTime(keyTime, startHours);
    const keyY = yForValue(key.value);
    const handles = [
      {
        side: 'in' as const,
        x: xForSceneTime(keyTime - previousSpan / 3, startHours),
        y: yForValue(key.value - tangent.inTangent * previousSpan / 3),
        keyX, keyY, spanHours: previousSpan
      },
      {
        side: 'out' as const,
        x: xForSceneTime(keyTime + nextSpan / 3, startHours),
        y: yForValue(key.value + tangent.outTangent * nextSpan / 3),
        keyX, keyY, spanHours: nextSpan
      }
    ];
    return handles.filter((handle) => {
      const organic = handle.side === 'in'
        ? (previous.interpolationToNext ?? 'smooth') === 'smooth'
        : (key.interpolationToNext ?? 'smooth') === 'smooth';
      return organic && Math.abs(handle.x - keyX) < WIDTH / 2;
    });
  }

  function toggleTrack(trackId: ViewerSceneCompositionTrackId): void {
    if (!computedTrackIds.includes(trackId)) {
      if (!isEditableTrack(trackId)) return;
      commitComposition({
        ...composition,
        curves: {
          ...composition.curves,
          [trackId]: [{ timeHours: 0, value: valueAt(trackId, environment.timeHours) }]
        }
      });
      return;
    }
    const hiddenTrackIds = composition.hiddenTrackIds.includes(trackId)
      ? composition.hiddenTrackIds.filter((id) => id !== trackId)
      : [...composition.hiddenTrackIds, trackId];
    commitComposition({ ...composition, hiddenTrackIds });
  }

  function isolateTrack(trackId: ViewerSceneCompositionTrackId): void {
    if (!computedTrackIds.includes(trackId)) return;
    const alreadyIsolated = visibleTrackIds.length === 1 && visibleTrackIds[0] === trackId;
    commitComposition({
      ...composition,
      hiddenTrackIds: alreadyIsolated ? [] : computedTrackIds.filter((id) => id !== trackId)
    });
    selectCurveTrack(trackId);
  }

  function selectAvailableTrack(trackId: ViewerSceneCompositionTrackId): void {
    if (computedTrackIds.includes(trackId)) {
      selectCurveTrack(trackId);
      return;
    }
    const endpointId = endpointFor(trackId);
    if (endpointId) onOpenParameter?.(endpointId);
  }

  function clampTrackListWidth(value: number, maxWidth = TRACK_LIST_MAX_WIDTH): number {
    return Math.round(Math.min(Math.max(TRACK_LIST_MIN_WIDTH, value), maxWidth));
  }

  function startTrackListResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    const separator = event.currentTarget as HTMLElement;
    const editor = separator.parentElement;
    const availableMaximum = editor
      ? Math.max(TRACK_LIST_MIN_WIDTH, Math.min(TRACK_LIST_MAX_WIDTH, editor.clientWidth * .55))
      : TRACK_LIST_MAX_WIDTH;
    trackListResize = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startWidth: trackListWidth,
      maxWidth: availableMaximum
    };
    separator.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function updateTrackListResize(event: PointerEvent): void {
    if (!trackListResize || event.pointerId !== trackListResize.pointerId) return;
    trackListWidth = clampTrackListWidth(
      trackListResize.startWidth + event.clientX - trackListResize.startClientX,
      trackListResize.maxWidth
    );
  }

  function finishTrackListResize(event: PointerEvent): void {
    if (!trackListResize || event.pointerId !== trackListResize.pointerId) return;
    trackListResize = null;
  }

  function handleTrackListResizeKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.key === 'Home') trackListWidth = TRACK_LIST_MIN_WIDTH;
    else if (event.key === 'End') trackListWidth = TRACK_LIST_MAX_WIDTH;
    else trackListWidth = clampTrackListWidth(trackListWidth + (event.key === 'ArrowLeft' ? -12 : 12));
    event.preventDefault();
  }

  function commitComposition(next: ViewerSceneComposition): void {
    draftComposition = null;
    commit({ composition: resolveViewerSceneComposition(next) });
  }

  function startKeyDrag(
    event: PointerEvent,
    trackId: ViewerSceneCompositionEditableTrackId,
    keyIndex: number
  ): void {
    if (!canEdit) return;
    event.stopPropagation();
    selectedTrackId = trackId;
    selectedKeyIndex = keyIndex;
    selectedSegmentIndex = Math.min(keyIndex, Math.max(0, editableKeys(trackId).length - 1));
    const svg = graphSvg;
    if (!svg) return;
    const keys = editableKeys(trackId).map((key) => ({ ...key }));
    draftComposition = resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [trackId]: keys }
    });
    drag = { trackId, keyIndex, svg };
    updateKeyFromPointer(event);
  }

  function updateKeyFromPointer(event: PointerEvent): void {
    if (!drag || !draftComposition) return;
    const rect = drag.svg.getBoundingClientRect();
    const keys = (draftComposition.curves[drag.trackId] ?? []).map((key) => ({ ...key }));
    const key = keys[drag.keyIndex];
    if (!key) return;
    const viewY = (event.clientY - rect.top) / Math.max(1, rect.height) * HEIGHT;
    const value = 1 - Math.min(1, Math.max(0, (viewY - PADDING_Y) / (HEIGHT - PADDING_Y * 2)));
    key.value = Math.round(value * 1000) / 1000;
    const rawTime = timeFromPointer(event, drag.svg);
    const minimum = drag.keyIndex === 0 ? 0 : (keys[drag.keyIndex - 1]?.timeHours ?? 0) + 0.05;
    const maximum = drag.keyIndex === keys.length - 1 ? 23.95 : (keys[drag.keyIndex + 1]?.timeHours ?? 24) - 0.05;
    key.timeHours = Math.round(Math.min(maximum, Math.max(minimum, rawTime)) * 100) / 100;
    draftComposition = resolveViewerSceneComposition({
      ...draftComposition,
      curves: { ...draftComposition.curves, [drag.trackId]: keys }
    });
    preview({ composition: draftComposition });
  }

  function finishKeyDrag(): void {
    if (!drag || !draftComposition) return;
    const next = draftComposition;
    drag = null;
    commitComposition(next);
  }

  function startTangentDrag(
    event: PointerEvent,
    trackId: ViewerSceneCompositionEditableTrackId,
    keyIndex: number,
    side: 'in' | 'out',
    spanHours: number
  ): void {
    if (!canEdit || !graphSvg) return;
    event.preventDefault();
    event.stopPropagation();
    selectedTrackId = trackId;
    selectedKeyIndex = keyIndex;
    const keys = editableKeys(trackId).map((key) => ({ ...key }));
    const tangents = resolveViewerSceneCompositionTangents(keys);
    const tangent = tangents[keyIndex] ?? { inTangent: 0, outTangent: 0 };
    const key = keys[keyIndex];
    if (!key) return;
    key.inTangent = tangent.inTangent;
    key.outTangent = tangent.outTangent;
    key.tangentMode = event.altKey || key.tangentMode === 'free' ? 'free' : 'smooth';
    draftComposition = resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [trackId]: keys }
    });
    tangentDrag = {
      trackId,
      keyIndex,
      side,
      spanHours,
      free: key.tangentMode === 'free',
      svg: graphSvg
    };
    updateTangentFromPointer(event);
  }

  function updateTangentFromPointer(event: PointerEvent): void {
    if (!tangentDrag || !draftComposition) return;
    const rect = tangentDrag.svg.getBoundingClientRect();
    const keys = (draftComposition.curves[tangentDrag.trackId] ?? []).map((key) => ({ ...key }));
    const key = keys[tangentDrag.keyIndex];
    if (!key) return;
    const viewY = (event.clientY - rect.top) / Math.max(1, rect.height) * HEIGHT;
    const pointerValue = 1 - (viewY - PADDING_Y) / (HEIGHT - PADDING_Y * 2);
    const slope = tangentDrag.side === 'out'
      ? (pointerValue - key.value) * 3 / tangentDrag.spanHours
      : (key.value - pointerValue) * 3 / tangentDrag.spanHours;
    const safeSlope = Math.min(4, Math.max(-4, slope));
    if (tangentDrag.side === 'in') key.inTangent = safeSlope;
    else key.outTangent = safeSlope;
    if (!tangentDrag.free) {
      key.inTangent = safeSlope;
      key.outTangent = safeSlope;
      key.tangentMode = 'smooth';
    } else {
      key.tangentMode = 'free';
    }
    draftComposition = resolveViewerSceneComposition({
      ...draftComposition,
      curves: { ...draftComposition.curves, [tangentDrag.trackId]: keys }
    });
    preview({ composition: draftComposition });
  }

  function finishTangentDrag(): void {
    if (!tangentDrag || !draftComposition) return;
    const next = draftComposition;
    tangentDrag = null;
    commitComposition(next);
  }

  function setSelectedKeyTangentMode(event: Event): void {
    if (!selectedTrackId || !isEditableTrack(selectedTrackId) || selectedKeyIndex === null) return;
    const mode = (event.currentTarget as HTMLSelectElement).value as ViewerSceneCompositionTangentMode;
    if (!tangentModeOptions.some((option) => option.id === mode)) return;
    const keys = editableKeys(selectedTrackId).map((key) => ({ ...key }));
    const key = keys[selectedKeyIndex];
    if (!key) return;
    const tangent = resolveViewerSceneCompositionTangents(keys)[selectedKeyIndex]
      ?? { inTangent: 0, outTangent: 0 };
    key.tangentMode = mode;
    if (mode === 'auto') {
      delete key.inTangent;
      delete key.outTangent;
    } else {
      key.inTangent = tangent.inTangent;
      key.outTangent = tangent.outTangent;
    }
    commitComposition(resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [selectedTrackId]: keys }
    }));
  }

  function setSelectedSegmentEasing(event: Event): void {
    if (!selectedTrackId || !isEditableTrack(selectedTrackId)) return;
    const select = event.currentTarget as HTMLSelectElement;
    const easing = select.value as ViewerSceneCompositionEasing;
    if (!easingOptions.some((option) => option.id === easing)) return;
    applySegmentEasing(selectedTrackId, selectedSegmentIndex, easing);
  }

  function applySegmentEasing(
    trackId: ViewerSceneCompositionEditableTrackId,
    fromKeyIndex: number,
    easing: ViewerSceneCompositionEasing
  ): void {
    const keys = editableKeys(trackId).map((key) => ({ ...key }));
    const key = keys[fromKeyIndex];
    if (!key || fromKeyIndex >= keys.length) return;
    key.interpolationToNext = easing;
    commitComposition(resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [trackId]: keys }
    }));
    selectedTrackId = trackId;
    selectedKeyIndex = null;
    selectedSegmentIndex = fromKeyIndex;
    tweenMenu = null;
  }

  function insertKeyOnSegment(event: MouseEvent, fromKeyIndex: number): void {
    if (!canEdit || !selectedTrackId || !isEditableTrack(selectedTrackId) || !graphSvg) return;
    const keys = editableKeys(selectedTrackId).map((key) => ({ ...key }));
    const leftKey = keys[fromKeyIndex];
    const rightKey = keys[(fromKeyIndex + 1) % keys.length];
    if (!leftKey || !rightKey) return;
    const minimum = leftKey.timeHours + 0.05;
    const maximum = (fromKeyIndex === keys.length - 1 ? rightKey.timeHours + 24 : rightKey.timeHours) - 0.05;
    if (minimum > maximum) return;
    let pointerTime = timeFromPointer(event, graphSvg);
    if (fromKeyIndex === keys.length - 1 && pointerTime <= rightKey.timeHours) pointerTime += 24;
    const unwrappedTime = Math.round(Math.min(maximum, Math.max(minimum, pointerTime)) * 100) / 100;
    const timeHours = wrapHours(unwrappedTime);
    const interpolationToNext = leftKey.interpolationToNext ?? 'smooth';
    const value = Math.round(evaluateViewerSceneCompositionCurve(keys, timeHours, leftKey.value) * 10000) / 10000;
    const nextComposition = resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [selectedTrackId]: [...keys, { timeHours, value, interpolationToNext }] }
    });
    commitComposition(nextComposition);
    const insertedKeys = nextComposition.curves[selectedTrackId] ?? [];
    selectedKeyIndex = insertedKeys.findIndex((key) => Math.abs(key.timeHours - timeHours) < 0.001);
    selectedSegmentIndex = Math.max(0, selectedKeyIndex);
    tweenMenu = null;
  }

  function openSegmentTweenMenu(event: MouseEvent, fromKeyIndex: number): void {
    if (!canEdit || !selectedTrackId || !isEditableTrack(selectedTrackId) || !graphSvg) return;
    const rect = graphSvg.getBoundingClientRect();
    selectedSegmentIndex = fromKeyIndex;
    selectedKeyIndex = null;
    tweenMenu = {
      trackId: selectedTrackId,
      fromKeyIndex,
      x: Math.min(Math.max(8, event.clientX - rect.left), Math.max(8, rect.width - 224)),
      y: Math.min(Math.max(8, event.clientY - rect.top), Math.max(8, rect.height - 174))
    };
  }

  function easingPreviewPath(easing: ViewerSceneCompositionEasing): string {
    if (easing === 'step') return 'M2 14 H30 V2';
    if (easing === 'ease_in') return 'M2 14 C17 14 20 2 30 2';
    if (easing === 'ease_out') return 'M2 14 C12 2 15 2 30 2';
    if (easing === 'ease_in_out') return 'M2 14 C10 14 22 2 30 2';
    if (easing === 'smooth') return 'M2 14 C9 14 23 2 30 2';
    return 'M2 14 L30 2';
  }

  function closeTransientEditorsFromPointer(event: PointerEvent): void {
    const target = event.target;
    if (tweenMenu && !tweenMenuElement?.contains(target as Node)) tweenMenu = null;
    if (event.button !== 0 || selectedKeyIndex === null) return;
    if (target instanceof Element && target.closest('.curve-key, .tangent-handle, .key-edit-controls')) return;
    selectedKeyIndex = null;
    hoveredKeyIndex = null;
  }

  function isTextEditingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
  }

  function deleteSelectedKey(): boolean {
    if (!canEdit || drag || tangentDrag || !selectedTrackId || !isEditableTrack(selectedTrackId) || selectedKeyIndex === null) {
      return false;
    }
    const keys = editableKeys(selectedTrackId).map((key) => ({ ...key }));
    const nextKeys = removeViewerSceneCompositionKey(keys, selectedKeyIndex);
    if (nextKeys.length === keys.length) return true;
    const nextSelectedIndex = Math.min(selectedKeyIndex, nextKeys.length - 1);
    commitComposition(resolveViewerSceneComposition({
      ...composition,
      curves: { ...composition.curves, [selectedTrackId]: nextKeys }
    }));
    selectedKeyIndex = nextSelectedIndex;
    selectedSegmentIndex = Math.max(0, Math.min(nextSelectedIndex, nextKeys.length - 1));
    tweenMenu = null;
    return true;
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Control') controlPressed = true;
    if (event.key === 'Escape') tweenMenu = null;
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isTextEditingTarget(event.target) && deleteSelectedKey()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleWindowKeyup(event: KeyboardEvent): void {
    if (event.key === 'Control') controlPressed = false;
  }

  function selectCurveTrack(trackId: ViewerSceneCompositionTrackId): void {
    selectedTrackId = trackId;
    selectedKeyIndex = null;
  }

  function selectCurveKey(keyIndex: number): void {
    selectedKeyIndex = keyIndex;
    selectedSegmentIndex = Math.min(keyIndex, Math.max(0, selectedKeys.length - 1));
  }

  function selectCurveSegment(fromKeyIndex: number): void {
    selectedSegmentIndex = fromKeyIndex;
    selectedKeyIndex = null;
  }

  function timeFromPointer(event: PointerEvent | MouseEvent, svg: SVGSVGElement): number {
    const rect = svg.getBoundingClientRect();
    const viewX = (event.clientX - rect.left) / Math.max(1, rect.width) * WIDTH;
    const displayTime = Math.min(24, Math.max(0, (viewX - PADDING_X) / (WIDTH - PADDING_X * 2) * 24));
    return wrapHours(viewStartHours + displayTime);
  }

  function startScrub(event: PointerEvent): void {
    if (!canEdit || event.button !== 0 || event.ctrlKey || drag || pan) return;
    const svg = event.currentTarget as SVGSVGElement;
    scrub = { pointerId: event.pointerId, svg };
    svg.setPointerCapture?.(event.pointerId);
    updateScrub(event);
    event.preventDefault();
  }

  function updateScrub(event: PointerEvent): void {
    if (!scrub || event.pointerId !== scrub.pointerId) return;
    scrubTimeHours = timeFromPointer(event, scrub.svg);
    preview({ timeHours: scrubTimeHours === 24 ? 0 : scrubTimeHours });
  }

  function finishScrub(event: PointerEvent): void {
    if (!scrub || event.pointerId !== scrub.pointerId) return;
    const timeHours = scrubTimeHours;
    scrub = null;
    scrubTimeHours = null;
    if (timeHours !== null) commit({ timeHours });
  }

  function beginPan(
    event: PointerEvent,
    element: HTMLDivElement | SVGSVGElement,
    source: 'footer' | 'graph'
  ): void {
    if (event.button !== 0 || pan) return;
    const rect = element.getBoundingClientRect();
    const pointerRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    panOriginRatio = pointerRatio;
    panPressureRatio = pointerRatio;
    pan = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startViewStartHours: viewStartHours,
      element,
      source
    };
    element.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function startPan(event: PointerEvent): void {
    beginPan(event, event.currentTarget as HTMLDivElement, 'footer');
  }

  function startGraphPan(event: PointerEvent): void {
    if (!event.ctrlKey || event.button !== 0 || !graphSvg) return;
    finishKeyDrag();
    finishTangentDrag();
    scrub = null;
    tweenMenu = null;
    beginPan(event, graphSvg, 'graph');
    event.stopPropagation();
  }

  function updatePan(event: PointerEvent): void {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const rect = pan.element.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const deltaHours = (event.clientX - pan.startClientX) / width * 24;
    panPressureRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / width));
    viewStartHours = wrapHours(pan.startViewStartHours - deltaHours);
  }

  function finishPan(event: PointerEvent): void {
    if (!pan || event.pointerId !== pan.pointerId) return;
    pan.element.releasePointerCapture?.(event.pointerId);
    pan = null;
  }

  function handlePanKeydown(event: KeyboardEvent): void {
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction) return;
    viewStartHours = wrapHours(viewStartHours + direction * (event.shiftKey ? 3 : 1));
    event.preventDefault();
  }

  function formatCycleDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} s`;
    if (seconds % 60 === 0) return `${seconds / 60} min`;
    return `${seconds} s`;
  }

  function setCycleDuration(event: Event): void {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    if (Number.isFinite(value) && value > 0) commit({ cycleDurationSeconds: value });
  }

  function formatRulerHour(value: number, endpoint = false): string {
    if (endpoint && Math.abs(viewStartHours) < 0.001) return '24 h';
    const wrapped = wrapHours(value);
    const hours = Math.floor(wrapped);
    const minutes = Math.round((wrapped - hours) * 60);
    if (minutes === 0) return `${String(hours).padStart(2, '0')} h`;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
</script>

<svelte:window
  on:pointerdown|capture={closeTransientEditorsFromPointer}
  on:keydown|capture={handleWindowKeydown}
  on:keyup={handleWindowKeyup}
  on:blur={() => controlPressed = false}
  on:pointermove={(event) => { updateKeyFromPointer(event); updateTangentFromPointer(event); updateScrub(event); updatePan(event); updateTrackListResize(event); }}
  on:pointerup={(event) => { finishKeyDrag(); finishTangentDrag(); finishScrub(event); finishPan(event); finishTrackListResize(event); }}
  on:pointercancel={(event) => { finishKeyDrag(); finishTangentDrag(); finishScrub(event); finishPan(event); finishTrackListResize(event); }}
/>

<section class="composition" aria-label={title}>
  <header>
    <div class="header-identity">
      <div class="header-title"><small>SCÈNE · AMBIANCE</small><h2>{title}</h2></div>
      <div class="cycle-controls" aria-label="Contrôle du cycle jour/nuit">
        <button
          type="button"
          class="cycle-toggle"
          class:active={environment.cyclePlaying}
          disabled={!canEdit}
          aria-pressed={environment.cyclePlaying}
          aria-label="Activer ou arrêter le cycle jour/nuit"
          on:click={() => commit({ cyclePlaying: !environment.cyclePlaying })}
        ><span aria-hidden="true"></span>{environment.cyclePlaying ? 'Live' : 'Cycle'}</button>
        <label class="cycle-duration" title="Durée d’un cycle jour/nuit complet">
          <span class="sr-only">Durée du cycle jour/nuit</span>
          <select aria-label="Durée du cycle jour/nuit" value={environment.cycleDurationSeconds} disabled={!canEdit} on:change={setCycleDuration}>
            {#if !hasStandardCycleDuration}<option value={environment.cycleDurationSeconds}>{formatCycleDuration(environment.cycleDurationSeconds)}</option>{/if}
            {#each cycleDurationOptions as duration (duration)}<option value={duration}>{formatCycleDuration(duration)}</option>{/each}
          </select>
        </label>
      </div>
    </div>
    <div class="header-actions">
      <div class="preset-controls" class:creating={creatingPreset} aria-label="Presets de composition">
        {#if creatingPreset}
          <input
            bind:value={newPresetName}
            aria-label="Nom du nouveau preset"
            placeholder="Nom du preset"
            maxlength="80"
            on:keydown={handlePresetNameKeydown}
          />
          <button type="button" class="preset-confirm" disabled={!newPresetName.trim()} title="Créer le preset" aria-label="Créer le preset" on:click={createCompositionPreset}>✓</button>
          <button type="button" title="Annuler" aria-label="Annuler la création" on:click={() => creatingPreset = false}>×</button>
        {:else}
          <select aria-label="Preset de composition actif" value={activePresetId ?? ''} disabled={!canEdit} on:change={selectCompositionPreset}>
            {#if activePresetId === null}<option value="">Configuration actuelle</option>{/if}
            {#each presets as preset (preset.id)}
              <option value={preset.id}>{preset.name}{preset.builtIn ? ' · système' : ''}</option>
            {/each}
          </select>
          <span class="preset-status-slot">
            {#if compositionDirty}
              <span class="preset-dirty" role="status" title="La composition diffère du preset actif">Modifié</span>
            {/if}
          </span>
          <button
            type="button"
            class="preset-save"
            class:preset-recommended={compositionDirty}
            title={!compositionDirty
              ? 'Aucune modification à enregistrer'
              : activePreset && !activePreset.builtIn
                ? `Enregistrer les modifications dans « ${activePreset.name} »`
                : 'Créer un preset avec ces modifications'}
            aria-label="Enregistrer les modifications"
            disabled={!canEdit || !compositionDirty}
            on:click={saveCompositionPreset}
          >{activePreset && !activePreset.builtIn ? 'Enregistrer' : 'Enregistrer sous…'}</button>
          <button
            type="button"
            title="Créer un nouveau preset utilisateur"
            aria-label="Créer un preset utilisateur"
            disabled={!canEdit}
            on:click={beginPresetCreation}
          >＋</button>
          <button type="button" class="preset-delete" title="Supprimer le preset utilisateur" aria-label="Supprimer le preset" disabled={!canEdit || !activePreset || activePreset.builtIn} on:click={deleteCompositionPreset}>×</button>
        {/if}
      </div>
      {#if selectedTrackId && isEditableTrack(selectedTrackId)}
        {#if selectedKeyIndex !== null}
          <div class="key-edit-controls">
            <label class="easing-control tangent-control">
              <span>Clé {selectedKeyIndex + 1} · tangente</span>
              <select value={selectedTangentMode} on:change={setSelectedKeyTangentMode}>
                {#each tangentModeOptions as option (option.id)}
                  <option value={option.id}>{option.label}</option>
                {/each}
              </select>
            </label>
            <button
              type="button"
              class="key-delete"
              disabled={!canEdit || selectedKeys.length <= 1}
              aria-label="Supprimer la clé sélectionnée"
              title={selectedKeys.length <= 1 ? 'Une clé minimum est requise' : 'Supprimer la clé sélectionnée (Suppr)'}
              on:click={deleteSelectedKey}
            >×</button>
          </div>
        {/if}
        {#if selectedKeys.length > 1}
          <label class="easing-control">
            <span>Segment {selectedSegmentIndex + 1} · easing</span>
            <select value={selectedSegmentEasing} on:change={setSelectedSegmentEasing}>
              {#each easingOptions as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>
        {/if}
      {/if}
      <output>{displayedTimeHours.toFixed(2)} h</output>
    </div>
  </header>
  <div class="editor" class:resizing-track-list={trackListResize !== null} style:--track-list-width={`${trackListWidth}px`}>
    <aside aria-label="Pistes de composition">
      {#each availableTrackIds as trackId (trackId)}
        <div
          class:focused={selectedTrackId === trackId}
          class:muted={selectedTrackId !== null && selectedTrackId !== trackId}
          class:inactive={!computedTrackIds.includes(trackId)}
          class:has-reference={trackId === "lunar"}
          title={presentationFor(trackId).label}
        >
          <button
            class="isolate"
            class:active={visibleTrackIds.length === 1 && visibleTrackIds[0] === trackId}
            type="button"
            disabled={!computedTrackIds.includes(trackId)}
            aria-label={`Isoler ${presentationFor(trackId).label}`}
            aria-pressed={visibleTrackIds.length === 1 && visibleTrackIds[0] === trackId}
            title={visibleTrackIds.length === 1 && visibleTrackIds[0] === trackId ? 'Afficher toutes les courbes' : 'Isoler cette courbe'}
            on:click={() => isolateTrack(trackId)}
          >◎</button>
          <button
            class="visibility"
            class:off={!computedTrackIds.includes(trackId) || composition.hiddenTrackIds.includes(trackId)}
            style={`--track-color:${presentationFor(trackId).color}`}
            type="button"
            aria-label={!computedTrackIds.includes(trackId) ? `Activer ${presentationFor(trackId).label} dans le cycle` : `${composition.hiddenTrackIds.includes(trackId) ? 'Afficher' : 'Masquer'} ${presentationFor(trackId).label}`}
            aria-pressed={computedTrackIds.includes(trackId) && !composition.hiddenTrackIds.includes(trackId)}
            title={!computedTrackIds.includes(trackId) ? 'Activer et initialiser la courbe à la valeur actuelle' : composition.hiddenTrackIds.includes(trackId) ? 'Afficher la courbe' : 'Masquer la courbe'}
            on:click={() => toggleTrack(trackId)}
          ><span aria-hidden="true"></span></button>
          <button class="track" type="button" on:click={() => selectAvailableTrack(trackId)}>
            <span>{presentationFor(trackId).label}</span>
            {#if !presentationFor(trackId).editable}<small>{presentationFor(trackId).referenceLabel ?? 'réel'}</small>{/if}
          </button>
          {#if trackId === "lunar"}
            <button
              class="reference-toggle"
              class:active={showLunarReference}
              type="button"
              aria-label={(showLunarReference ? "Masquer" : "Afficher") + " les références astronomiques lunaires"}
              aria-pressed={showLunarReference}
              title="Hauteur annuelle min/max · hauteur et azimut du jour"
              on:click={() => showLunarReference = !showLunarReference}
            >±</button>
          {/if}
          {#if presentationFor(trackId).editable && endpointFor(trackId)}
            <button
              class="open-anchor"
              type="button"
              aria-label={`Ouvrir ${presentationFor(trackId).label} dans Calques`}
              title={`Ouvrir le paramètre dans Calques · ${endpointFor(trackId)}`}
              disabled={!onOpenParameter} on:click={() => onOpenParameter?.(endpointFor(trackId) ?? '')}
            ><WorkbenchIcon icon="widget.inspector" label="" /></button>
          {:else}
            <span class="anchor-spacer" aria-hidden="true"></span>
          {/if}
        </div>
      {/each}
    </aside>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
    <div
      class="track-list-resizer"
      class:active={trackListResize !== null}
      role="separator"
      tabindex="0"
      aria-label="Redimensionner la colonne des pistes"
      aria-orientation="vertical"
      aria-valuemin={TRACK_LIST_MIN_WIDTH}
      aria-valuemax={TRACK_LIST_MAX_WIDTH}
      aria-valuenow={trackListWidth}
      title="Glisser pour ajuster les labels · double-clic pour réinitialiser"
      on:pointerdown={startTrackListResize}
      on:keydown={handleTrackListResizeKeydown}
      on:dblclick={() => trackListWidth = TRACK_LIST_DEFAULT_WIDTH}
    ><span aria-hidden="true"></span></div>
    <div class="graph-wrap">
      <div
        class="graph-canvas" role="application" aria-label="Édition des courbes d’ambiance"
        class:ctrl-pan-ready={controlPressed}
        class:panning={pan?.source === 'graph'}
        title="Ctrl + clic-glissé pour déplacer la boucle de 24 heures"
        on:pointerdown|capture={startGraphPan}
      >
      <svg role="group" bind:this={graphSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" on:pointerdown={startScrub} aria-label="Scrubber les courbes normalisées sur 24 heures">
        <defs>
          <linearGradient
            id="cycle-background"
            gradientUnits="userSpaceOnUse"
            x1={PADDING_X - viewStartHours / 24 * (WIDTH - PADDING_X * 2)}
            x2={WIDTH - PADDING_X - viewStartHours / 24 * (WIDTH - PADDING_X * 2)}
            spreadMethod="repeat"
          >
            <stop offset="0" stop-color="#071326"/><stop offset=".25" stop-color="#845e67"/>
            <stop offset=".5" stop-color="#397bc0"/><stop offset=".75" stop-color="#845e67"/>
            <stop offset="1" stop-color="#071326"/>
          </linearGradient>
          <pattern id="lunar-reference-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
            <rect width="9" height="9" fill="rgb(169 191 255 / .035)" />
            <line x1="0" x2="0" y1="0" y2="9" stroke="rgb(169 191 255 / .16)" stroke-width="2" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#cycle-background)" opacity=".22" />
        {#each [0, .25, .5, .75, 1] as ratio (ratio)}
          <line x1={PADDING_X} x2={WIDTH-PADDING_X} y1={PADDING_Y+ratio*(HEIGHT-PADDING_Y*2)} y2={PADDING_Y+ratio*(HEIGHT-PADDING_Y*2)} class="grid" />
        {/each}
        {#each [0, 6, 12, 18, 24] as hour (hour)}
          <line x1={xForDisplayTime(hour)} x2={xForDisplayTime(hour)} y1={PADDING_Y} y2={HEIGHT-PADDING_Y} class="grid major" />
        {/each}
        <line
          class="midnight-marker"
          x1={xForSceneTime(0, viewStartHours)}
          x2={xForSceneTime(0, viewStartHours)}
          y1={PADDING_Y}
          y2={HEIGHT-PADDING_Y}
          aria-label="00 h 00"
        />
        {#if lunarReferenceProjection}
          <g class="lunar-reference" aria-label="Références astronomiques lunaires">
            <path class="lunar-reference-band" d={lunarReferenceProjection.bandPath} fill="url(#lunar-reference-hatch)" />
            <path class="lunar-reference-limit" d={lunarReferenceProjection.minimumPath} />
            <path class="lunar-reference-limit" d={lunarReferenceProjection.maximumPath} />
            <line
              class="lunar-reference-horizon"
              x1={PADDING_X}
              x2={WIDTH-PADDING_X}
              y1={lunarReferenceProjection.horizonY}
              y2={lunarReferenceProjection.horizonY}
            />
            <path class="lunar-reference-altitude" d={lunarReferenceProjection.altitudePath} />
            {#each lunarReferenceProjection.azimuthPaths as azimuthPath, azimuthIndex (azimuthIndex)}
              <path class="lunar-reference-azimuth" d={azimuthPath} />
            {/each}
          </g>
        {/if}
        {#each renderedTrackIds as trackId (trackId)}
          <g class="curve-track">
            <path
              d={trackPaths[trackId] ?? ''}
              fill="none"
              stroke={presentationFor(trackId).color}
              stroke-width={selectedTrackId === trackId ? 4 : 2.25}
              opacity={selectedTrackId === null || selectedTrackId === trackId ? 1 : .15}
              class="curve"
              class:curve--editing={drag?.trackId === trackId}
            />
            <path
              d={trackPaths[trackId] ?? ''}
              fill="none"
              stroke="transparent"
              stroke-width="18"
              class="curve-track-hit" role="button" tabindex="0" on:keydown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectCurveTrack(trackId);}}}
              class:curve-track-hit--selected={selectedTrackId === trackId}
              aria-label={`Sélectionner la courbe ${presentationFor(trackId).label}`}
              on:pointerdown|stopPropagation={() => selectCurveTrack(trackId)}
            />
          </g>
        {/each}
        {#if selectedTrackId && isEditableTrack(selectedTrackId) && !composition.hiddenTrackIds.includes(selectedTrackId)}
          {#each selectedSegmentPaths as segment, segmentIndex (segmentIndex)}
            {#each segment.paths as segmentPath, pathIndex (pathIndex)}
              <path
                d={segmentPath}
                fill="none"
                stroke={presentationFor(selectedTrackId).color}
                class="curve-segment"
                class:curve-segment--focused={selectedSegmentIndex === segment.fromKeyIndex}
                class:curve-segment--hovered={hoveredSegmentIndex === segment.fromKeyIndex}
                class:curve-segment--editing={drag !== null && drag.trackId === selectedTrackId &&
                  (segment.fromKeyIndex === (drag.keyIndex - 1 + selectedKeys.length) % selectedKeys.length ||
                    segment.fromKeyIndex === drag.keyIndex)}
              />
              <path
                d={segmentPath}
                fill="none"
                class="curve-segment-hit"
                role="button"
                tabindex="0"
                aria-label={`Segment ${segment.fromKeyIndex + 1} — double-cliquer pour ajouter une clé, clic droit pour choisir le tween`}
                on:pointerdown|stopPropagation={(event) => event.button === 0 && selectCurveSegment(segment.fromKeyIndex)}
                on:dblclick|preventDefault|stopPropagation={(event) => insertKeyOnSegment(event, segment.fromKeyIndex)}
                on:contextmenu|preventDefault|stopPropagation={(event) => openSegmentTweenMenu(event, segment.fromKeyIndex)}
                on:keydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    selectCurveSegment(segment.fromKeyIndex);
                    event.preventDefault();
                  }
                }}
                on:pointerenter={() => hoveredSegmentIndex = segment.fromKeyIndex}
                on:pointerleave={() => hoveredSegmentIndex = null}
              />
            {/each}
          {/each}
        {/if}
        {#each selectedTangentHandles as handle, handleIndex (handleIndex)}
          <line
            class="tangent-arm"
            x1={handle.keyX}
            y1={handle.keyY}
            x2={handle.x}
            y2={handle.y}
            stroke={presentationFor(selectedTrackId ?? 'exposure').color}
          />
        {/each}
        <line class="playhead" class:scrubbing={scrub !== null} x1={xForSceneTime(displayedTimeHours, viewStartHours)} x2={xForSceneTime(displayedTimeHours, viewStartHours)} y1="0" y2={HEIGHT} />
      </svg>
      {#if selectedTrackId && isEditableTrack(selectedTrackId) && !composition.hiddenTrackIds.includes(selectedTrackId)}
        <div class="key-layer">
          {#each selectedKeyPoints as point, keyIndex (keyIndex)}
            <button
              type="button"
              class="curve-key"
              class:curve-key--selected={selectedKeyIndex === keyIndex}
              class:curve-key--hovered={hoveredKeyIndex === keyIndex}
              class:curve-key--dragging={drag?.trackId === selectedTrackId && drag.keyIndex === keyIndex}
              style:left={`${point.x / WIDTH * 100}%`}
              style:top={`${point.y / HEIGHT * 100}%`}
              style:--key-color={presentationFor(selectedTrackId).color}
              aria-label={`Clé ${keyIndex + 1}, ${point.key.timeHours.toFixed(2)} heures, ${Math.round(point.key.value * 100)} pour cent`}
              on:pointerdown={(event) => selectedTrackId&&isViewerSceneCompositionEditableTrackId(selectedTrackId)&&startKeyDrag(event, selectedTrackId, keyIndex)}
              on:click|stopPropagation={() => selectCurveKey(keyIndex)}
              on:pointerenter={() => hoveredKeyIndex = keyIndex}
              on:pointerleave={() => hoveredKeyIndex = null}
            ><span aria-hidden="true"></span></button>
          {/each}
          {#each selectedTangentHandles as handle, handleIndex (handleIndex)}
            <button
              type="button"
              class="tangent-handle"
              class:tangent-handle--dragging={tangentDrag?.side === handle.side}
              style:left={`${handle.x / WIDTH * 100}%`}
              style:top={`${handle.y / HEIGHT * 100}%`}
              style:--key-color={presentationFor(selectedTrackId).color}
              aria-label={`Poignée ${handle.side === 'in' ? 'entrante' : 'sortante'} de la clé ${(selectedKeyIndex ?? 0) + 1}`}
              title="Glisser pour régler la tangente · Alt pour désolidariser"
              on:pointerdown={(event) => selectedTrackId&&isViewerSceneCompositionEditableTrackId(selectedTrackId)&&startTangentDrag(event, selectedTrackId, selectedKeyIndex ?? 0, handle.side, handle.spanHours)}
            ><span aria-hidden="true"></span></button>
          {/each}
        </div>
      {/if}
      {#if tweenMenu}
        <div
          bind:this={tweenMenuElement}
          class="tween-menu"
          style:left={`${tweenMenu.x}px`}
          style:top={`${tweenMenu.y}px`}
          role="menu" tabindex="-1"
          aria-label={`Tween du segment ${tweenMenu.fromKeyIndex + 1}`}
          on:pointerdown|stopPropagation
        >
          <div class="tween-menu__header">
            <span>Segment {tweenMenu.fromKeyIndex + 1} → {tweenMenu.fromKeyIndex + 2}</span>
            <small>TWEEN</small>
          </div>
          {#each easingOptions as option (option.id)}
            <button
              type="button"
              role="menuitemradio"
              aria-checked={(editableKeys(tweenMenu.trackId)[tweenMenu.fromKeyIndex]?.interpolationToNext ?? 'smooth') === option.id}
              class:active={(editableKeys(tweenMenu.trackId)[tweenMenu.fromKeyIndex]?.interpolationToNext ?? 'smooth') === option.id}
              on:click={() => tweenMenu&&applySegmentEasing(tweenMenu.trackId, tweenMenu.fromKeyIndex, option.id)}
            >
              <svg viewBox="0 0 32 16" aria-hidden="true"><path d={easingPreviewPath(option.id)} /></svg>
              <span>{option.label}</span>
              <i aria-hidden="true"></i>
            </button>
          {/each}
        </div>
      {/if}
      </div>
      <div
        class="cycle-footer"
        class:dragging={pan?.source === 'footer'}
        style:--pan-origin={`${panOriginRatio * 100}%`}
        style:--pan-pressure={`${panPressureRatio * 100}%`}
        role="slider"
        tabindex="0"
        aria-label="Faire glisser horizontalement la boucle de 24 heures"
        aria-valuemin="0"
        aria-valuemax="24"
        aria-valuenow={viewStartHours}
        aria-valuetext={`Début de la vue ${formatRulerHour(viewStartHours)}`}
        title="Faire glisser la bande horaire pour centrer une autre plage"
        on:pointerdown={startPan}
        on:keydown={handlePanKeydown}
      >
        <span class="cycle-pressure" aria-hidden="true"></span>
        <span class="cycle-origin" aria-hidden="true"></span>
        <div class="ruler" aria-hidden="true">
          {#each [0, 6, 12, 18, 24] as hour, index (index)}
            <span>{formatRulerHour(viewStartHours + hour, index === 4)}</span>
          {/each}
        </div>
        <small aria-hidden="true">GLISSER LA BOUCLE 24 H</small>
      </div>
    </div>
  </div>
</section>

<style>
  .composition{height:100%;min-height:0;box-sizing:border-box;display:grid;grid-template-rows:auto 1fr;background:#07131f;color:#eaf7ff;font:12px Inter,system-ui,sans-serif;overflow:hidden}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;padding:9px 13px;border-bottom:1px solid #17364d;background:linear-gradient(135deg,#091b2b,#07131f)}
  .header-identity{display:flex;align-items:center;gap:12px;min-width:0}.header-title{min-width:max-content}.cycle-controls{display:flex;align-items:center;gap:5px}.cycle-toggle{display:flex;align-items:center;justify-content:center;gap:6px;min-width:58px;height:30px;padding:0 9px;border-color:#2b7898}.cycle-toggle>span{width:7px;height:7px;border-radius:50%;background:#6c91aa;box-shadow:0 0 0 2px rgb(108 145 170 / .15)}.cycle-toggle.active{border-color:#38dff5;color:#dffcff;background:#0a2736}.cycle-toggle.active>span{background:#5df2a1;box-shadow:0 0 8px rgb(93 242 161 / .85)}.cycle-duration select{box-sizing:border-box;width:78px;height:30px;padding:0 22px 0 8px;border:1px solid #2b7898;border-radius:6px;background:#081b2a;color:#dff8ff;font:10px Inter,system-ui,sans-serif;outline:none}.cycle-duration select:hover,.cycle-duration select:focus-visible{border-color:#38dff5;box-shadow:0 0 0 2px rgb(56 223 245 / .1)}.cycle-toggle:disabled,.cycle-duration select:disabled{cursor:not-allowed;opacity:.38}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  header small{display:block;color:#6c91aa;font:8px ui-monospace,monospace;letter-spacing:.12em}h2{margin:2px 0 0;font-size:13px}header output{color:#38dff5;font:10px ui-monospace,monospace}.header-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px}.easing-control{display:flex;align-items:center;gap:6px}.easing-control span{color:#6c91aa;font:8px ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase}.easing-control select{height:26px;max-width:160px;padding:0 24px 0 8px;border:1px solid #2b7898;border-radius:5px;background:#081b2a;color:#dff8ff;font:9px Inter,system-ui,sans-serif;outline:none}.easing-control select:hover,.easing-control select:focus-visible{border-color:#38dff5;box-shadow:0 0 0 2px rgb(56 223 245 / .1)}
  .key-edit-controls{display:flex;align-items:center;gap:4px}.key-delete{width:26px;height:26px;padding:0;border-color:#79434b;color:#ff8e89;font-size:15px}.key-delete:hover:not(:disabled),.key-delete:focus-visible{border-color:#ff716b;background:#32191d;color:#fff;outline:none}.key-delete:disabled{cursor:not-allowed;opacity:.3}
  .preset-controls{display:grid;grid-template-columns:152px 52px 100px 26px 26px;align-items:center;gap:4px;width:372px;min-width:372px}.preset-controls.creating input{grid-column:1 / span 3}.preset-status-slot{width:52px;height:20px;display:flex;align-items:center;justify-content:center}.preset-dirty{height:18px;display:inline-flex;align-items:center;padding:0 6px;border:1px solid rgb(255 190 92 / .48);border-radius:999px;background:rgb(255 166 43 / .1);color:#ffc46b;font:7px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}.preset-controls .preset-recommended{border-color:#e8a348;background:rgb(232 163 72 / .14);color:#ffd08a;box-shadow:0 0 8px rgb(232 163 72 / .14)}.preset-controls .preset-recommended:hover:not(:disabled),.preset-controls .preset-recommended:focus-visible{border-color:#ffc46b;background:rgb(232 163 72 / .22);color:#fff}.preset-controls select,.preset-controls input{box-sizing:border-box;height:26px;width:100%;min-width:0;padding:0 25px 0 8px;border:1px solid #2b7898;border-radius:5px;background:#081b2a;color:#dff8ff;font:9px Inter,system-ui,sans-serif;outline:none}.preset-controls input{padding-right:8px}.preset-controls select:hover,.preset-controls select:focus-visible,.preset-controls input:hover,.preset-controls input:focus-visible{border-color:#38dff5;box-shadow:0 0 0 2px rgb(56 223 245 / .1)}.preset-controls button{width:26px;height:26px;padding:0;border-color:#2b7898;border-radius:5px;color:#9edcea;font-size:13px}.preset-controls .preset-save{width:100%;padding:0 8px;font-size:9px;white-space:nowrap}.preset-controls button:hover:not(:disabled),.preset-controls button:focus-visible{border-color:#38dff5;background:#0c293a;color:#fff;outline:none}.preset-controls button:disabled{cursor:not-allowed;opacity:.28}.preset-controls .preset-save:disabled{opacity:.52}.preset-controls .preset-confirm{color:#73f0a5}.preset-controls .preset-delete:not(:disabled){color:#ff8e89}.preset-controls .preset-delete:hover:not(:disabled){border-color:#ff716b;background:#32191d}
  .editor{min-height:0;display:grid;grid-template-columns:clamp(170px,var(--track-list-width,220px),360px) 8px minmax(0,1fr)}.editor.resizing-track-list{cursor:col-resize;user-select:none}aside{min-width:0;padding:8px 5px 8px 8px;overflow:auto}
  aside>div{display:flex;align-items:center;gap:4px;margin-bottom:3px;min-width:0}.track{flex:1 1 auto;max-width:100%}.muted .track{opacity:.58}.inactive .track{border-style:dashed;color:#91a6b3;background:#08131e;opacity:.72}.focused .track{opacity:1}.open-anchor,.anchor-spacer,.visibility,.isolate,.reference-toggle{flex:0 0 28px;width:28px}
  button{border:1px solid #28455e;border-radius:6px;background:#091725;color:#d8e9f4;cursor:pointer}.track{min-width:0;height:28px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px;padding:0 8px;text-align:left}.track>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.track small{min-width:max-content;font-size:8px;color:#7891a4}.focused .track{border-color:#38dff5;background:#092333}.open-anchor{height:28px;display:grid;place-items:center;color:#86a9bd}.open-anchor:hover,.open-anchor:focus-visible{border-color:#38dff5;color:#dffcff;outline:none}.anchor-spacer{height:28px}.visibility{height:28px;display:grid;place-items:center}.visibility>span{width:8px;height:8px;border-radius:50%;background:var(--track-color);box-shadow:0 0 8px var(--track-color);opacity:1}.visibility.off>span{background:#3d5261;box-shadow:none;opacity:.55}.visibility:disabled,.isolate:disabled{cursor:default;opacity:.42}.isolate{height:28px;color:#7891a4}.isolate:hover:not(:disabled),.isolate:focus-visible,.isolate.active{border-color:#38dff5;color:#dffcff;outline:none}.isolate.active{background:#0a2736}.reference-toggle{height:28px;padding:0;border-color:#314d6a;color:#8299bb;font:12px ui-monospace,monospace}.reference-toggle:hover,.reference-toggle:focus-visible{border-color:#a9bfff;outline:none}.reference-toggle.active{border-color:#a9bfff;background:#17253d;color:#e8edff;box-shadow:inset 0 0 0 1px rgb(169 191 255 / .12),0 0 7px rgb(169 191 255 / .18)}
  .track-list-resizer{position:relative;width:8px;height:100%;min-height:0;padding:0;border:0;border-radius:0;background:transparent;cursor:col-resize;touch-action:none;outline:none}.track-list-resizer::before{content:'';position:absolute;inset:0 -3px}.track-list-resizer>span{position:absolute;top:8px;bottom:8px;left:3px;width:2px;border-radius:2px;background:#17364d;transition:background 120ms ease,box-shadow 120ms ease}.track-list-resizer:hover>span,.track-list-resizer:focus-visible>span,.track-list-resizer.active>span{background:#38dff5;box-shadow:0 0 7px rgb(56 223 245 / .65)}
  .graph-wrap{min-width:0;min-height:0;display:grid;grid-template-rows:minmax(90px,1fr) 38px;padding:8px 10px 3px}.graph-canvas{position:relative;min-width:0;min-height:90px}.graph-canvas>svg{position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;min-height:90px;border:1px solid #183b53;border-radius:6px;background:#050c14;touch-action:none;cursor:ew-resize}.grid{stroke:#d8efff;stroke-width:1;opacity:.08}.grid.major{opacity:.15}.midnight-marker{stroke:#b9d8e8;stroke-width:1;stroke-dasharray:4 5;opacity:.32;vector-effect:non-scaling-stroke;pointer-events:none}.lunar-reference{pointer-events:none}.lunar-reference-band{stroke:none}.lunar-reference-limit,.lunar-reference-altitude,.lunar-reference-azimuth,.lunar-reference-horizon{fill:none;vector-effect:non-scaling-stroke}.lunar-reference-limit{stroke:#a9bfff;stroke-width:1;stroke-dasharray:3 5;opacity:.42}.lunar-reference-horizon{stroke:#a9bfff;stroke-width:1;stroke-dasharray:2 7;opacity:.2}.lunar-reference-altitude{stroke:#e7edff;stroke-width:1.6;opacity:.78;filter:drop-shadow(0 0 2px rgb(169 191 255 / .5))}.lunar-reference-azimuth{stroke:#79cfe8;stroke-width:1.2;stroke-dasharray:6 4;opacity:.58}.curve{vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px currentColor);pointer-events:none;transition:opacity 120ms ease,filter 120ms ease}.curve-track-hit{vector-effect:non-scaling-stroke;pointer-events:stroke;cursor:pointer}.curve-track-hit--selected{pointer-events:none}.curve-track:hover .curve{opacity:1;filter:drop-shadow(0 0 5px currentColor)}.curve--editing{opacity:.4}.curve-segment{vector-effect:non-scaling-stroke;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0;pointer-events:none;transition:opacity 100ms ease,stroke-width 100ms ease}.curve-segment--focused{opacity:.72}.curve-segment--hovered{stroke-width:4;opacity:1;filter:drop-shadow(0 0 5px currentColor)}.curve-segment--editing{stroke-width:3.5;stroke-dasharray:8 6;opacity:1;filter:drop-shadow(0 0 4px currentColor);animation:scene-segment-dash .55s linear infinite}.curve-segment-hit{vector-effect:non-scaling-stroke;stroke:transparent;stroke-width:15;pointer-events:stroke;cursor:pointer}.playhead{stroke:#fff;stroke-width:2;opacity:.75;vector-effect:non-scaling-stroke;pointer-events:none}.playhead.scrubbing{stroke:#38dff5;stroke-width:3;opacity:1;filter:drop-shadow(0 0 5px #38dff5)}
  .graph-canvas.ctrl-pan-ready>svg,.graph-canvas.ctrl-pan-ready .curve,.graph-canvas.ctrl-pan-ready .curve-track-hit,.graph-canvas.ctrl-pan-ready .curve-segment-hit,.graph-canvas.ctrl-pan-ready .curve-key,.graph-canvas.ctrl-pan-ready .tangent-handle{cursor:grab}.graph-canvas.panning>svg,.graph-canvas.panning .curve,.graph-canvas.panning .curve-track-hit,.graph-canvas.panning .curve-segment-hit,.graph-canvas.panning .curve-key,.graph-canvas.panning .tangent-handle{cursor:grabbing}
  .key-layer{position:absolute;z-index:4;inset:0;overflow:visible;pointer-events:none}.curve-key{position:absolute;width:26px;height:26px;padding:0;border:0;background:transparent;box-shadow:none;transform:translate(-50%,-50%);pointer-events:auto;cursor:move;outline:none}.curve-key>span{position:absolute;left:50%;top:50%;width:10px;height:10px;border:2px solid #06101a;border-radius:2px;background:color-mix(in srgb,var(--key-color) 88%,white 12%);box-shadow:0 0 0 1px color-mix(in srgb,var(--key-color) 45%,transparent),0 0 7px color-mix(in srgb,var(--key-color) 42%,transparent);transform:translate(-50%,-50%) rotate(45deg);transition:width 100ms ease,height 100ms ease,border-color 100ms ease,box-shadow 100ms ease,background 100ms ease}.curve-key:hover>span,.curve-key--hovered>span,.curve-key:focus-visible>span{width:12px;height:12px;border-color:color-mix(in srgb,var(--key-color) 60%,white 30%);box-shadow:0 0 0 2px color-mix(in srgb,var(--key-color) 28%,transparent),0 0 12px color-mix(in srgb,var(--key-color) 62%,transparent)}.curve-key--selected>span{width:13px;height:13px;background:color-mix(in srgb,var(--key-color) 76%,white 24%);box-shadow:0 0 0 2px color-mix(in srgb,var(--key-color) 38%,transparent),0 0 13px color-mix(in srgb,var(--key-color) 58%,transparent)}.curve-key--dragging{cursor:grabbing}.curve-key--dragging>span{width:15px;height:15px;border-color:white;background:var(--key-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--key-color) 34%,transparent),0 0 18px color-mix(in srgb,var(--key-color) 85%,transparent);transition:none}
  .tangent-arm{vector-effect:non-scaling-stroke;stroke-width:1.25;stroke-dasharray:3 3;opacity:.7;pointer-events:none}.tangent-handle{position:absolute;width:24px;height:24px;padding:0;border:0;background:transparent;box-shadow:none;transform:translate(-50%,-50%);pointer-events:auto;cursor:ns-resize}.tangent-handle>span{position:absolute;left:50%;top:50%;width:7px;height:7px;border:1.5px solid #06101a;border-radius:50%;background:var(--key-color);box-shadow:0 0 0 1px color-mix(in srgb,var(--key-color) 55%,transparent),0 0 8px color-mix(in srgb,var(--key-color) 55%,transparent);transform:translate(-50%,-50%)}.tangent-handle:hover>span,.tangent-handle--dragging>span{width:9px;height:9px;border-color:white;box-shadow:0 0 0 2px color-mix(in srgb,var(--key-color) 38%,transparent),0 0 12px var(--key-color)}.tangent-handle--dragging{cursor:grabbing}
  .tween-menu{position:absolute;z-index:12;width:216px;padding:5px;border:1px solid #2b7898;border-radius:7px;background:rgb(5 17 28 / .98);box-shadow:0 10px 28px rgb(0 0 0 / .55),0 0 0 1px rgb(56 223 245 / .08);backdrop-filter:blur(8px)}.tween-menu__header{display:flex;align-items:center;justify-content:space-between;padding:3px 6px 6px;color:#dff8ff;font-size:9px}.tween-menu__header small{color:#38dff5;font:7px ui-monospace,monospace;letter-spacing:.12em}.tween-menu button{width:100%;height:26px;display:grid;grid-template-columns:36px minmax(0,1fr) 8px;align-items:center;gap:6px;padding:0 6px;border:0;border-radius:4px;background:transparent;text-align:left;font-size:9px}.tween-menu button:hover,.tween-menu button:focus-visible{background:#0d2b3d;outline:none}.tween-menu button.active{color:#eaffff;background:rgb(56 223 245 / .1)}.tween-menu button svg{width:32px;height:16px;overflow:visible}.tween-menu button path{fill:none;stroke:#6e9bb3;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.tween-menu button:hover path,.tween-menu button.active path{stroke:#38dff5;filter:drop-shadow(0 0 3px rgb(56 223 245 / .6))}.tween-menu button i{width:5px;height:5px;border-radius:50%;background:transparent}.tween-menu button.active i{background:#38dff5;box-shadow:0 0 7px #38dff5}
  .cycle-footer{position:relative;min-width:0;display:grid;align-items:center;height:32px;margin-top:3px;padding:0 5px;overflow:hidden;border:1px solid #17384d;border-radius:6px;background:linear-gradient(180deg,#081722 0%,#050d15 100%);box-shadow:inset 0 1px 0 rgb(157 221 255 / .045),0 1px 3px rgb(0 0 0 / .28);cursor:grab;touch-action:none;outline:none;transition:border-color 130ms ease,background 130ms ease,box-shadow 130ms ease}.cycle-footer:hover{border-color:#28627f;background:linear-gradient(180deg,#0a1d2b 0%,#07111b 100%);box-shadow:inset 0 1px 0 rgb(185 235 255 / .1),inset 0 0 18px rgb(56 223 245 / .035),0 2px 6px rgb(0 0 0 / .35)}.cycle-footer:focus-visible{border-color:#38dff5;box-shadow:inset 0 0 0 1px rgb(56 223 245 / .18),0 0 0 2px rgb(56 223 245 / .07)}.cycle-footer:active,.cycle-footer.dragging{cursor:grabbing}.cycle-footer.dragging{border-color:#38dff5;background:linear-gradient(180deg,#0b2231 0%,#07131e 100%);box-shadow:inset 0 0 0 1px rgb(56 223 245 / .12),inset 0 0 22px rgb(56 223 245 / .06)}.ruler{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:center;color:#82a5ba;font:9px ui-monospace,monospace;pointer-events:none}.ruler span{min-width:34px;text-shadow:0 1px 2px #02080d,0 0 5px #02080d}.ruler span:last-child{text-align:right}.cycle-footer:hover .ruler{color:#a1c5d9}.cycle-pressure{position:absolute;z-index:1;top:3px;bottom:3px;left:var(--pan-pressure);width:clamp(110px,22%,280px);border-radius:999px;background:linear-gradient(90deg,transparent 0%,rgb(56 223 245 / .12) 24%,rgb(56 223 245 / .55) 50%,rgb(56 223 245 / .12) 76%,transparent 100%);opacity:0;transform:translateX(-50%);transition:opacity 120ms ease;pointer-events:none}.cycle-footer:hover:not(.dragging) .cycle-pressure{opacity:.13}.cycle-footer.dragging .cycle-pressure{opacity:1;transition:none}.cycle-origin{position:absolute;z-index:2;top:5px;bottom:5px;left:var(--pan-origin);width:1px;background:#c8f8ff;box-shadow:0 0 6px #38dff5;opacity:0;pointer-events:none}.cycle-footer.dragging .cycle-origin{opacity:.85}.cycle-footer small{position:absolute;z-index:2;left:50%;bottom:2px;color:#3d6277;font:6px ui-monospace,monospace;letter-spacing:.1em;transform:translateX(-50%);pointer-events:none}
  @media(max-width:620px){.editor{grid-template-columns:min(var(--track-list-width,170px),52%) 8px minmax(0,1fr)}.open-anchor,.anchor-spacer,.visibility,.isolate,.reference-toggle{flex-basis:24px;width:24px}}
  @keyframes scene-segment-dash{to{stroke-dashoffset:-14}}
</style>
