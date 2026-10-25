<script lang="ts">
  import type {LightTesterCommandPort,LightTesterAnimationDirection,LightTesterAnimationPrimitiveId,LightTesterColorPresetId,LightTesterIndividualMode,LightTesterLoadingMode,LightTesterPulseShape,LightTesterRainbowPalette,LightTesterScenario,LightTesterSnapshot,LightTesterPresentation} from './lightTesterContracts';
  export let title = 'LED Lab';
  export let snapshot: LightTesterSnapshot;
  export let commands: LightTesterCommandPort;
  export let readOnly = false;
  export let observedRows: Record<string, readonly {
    side: 'L' | 'R' | null;
    leds: readonly { label: string; color: string | null; state: string; intensity: number | null }[];
  }[]> = {};

  type LedPreviewRow = { colors: readonly string[]; side: 'L' | 'R' | null };
  export let presentation:LightTesterPresentation;
  export let zoneOrder:readonly string[]=[];
  export let footer='';
  $: orderedZones = [...snapshot.zones].sort((left, right) => zoneOrder.indexOf(left.id) - zoneOrder.indexOf(right.id));

  $: configuration = snapshot.configuration;
  $: activeZone = snapshot.zones.find((zone) => zone.id === configuration.zoneId) ?? snapshot.zones[0];
  $: groups = snapshot.groups.filter((group) => group.zoneId === activeZone?.id);
  $: selectedGroup = groups.find((group) => group.kind === 'aggregate')
    ?? groups.find((group) => group.id === configuration.groupId)
    ?? groups[0];
  $: selectedGroupColor = selectedGroup
    ? configuration.groupColors[selectedGroup.id] ?? configuration.color
    : configuration.color;
  $: selectedEmitterColors = selectedGroup
    ? configuration.emitterColors[selectedGroup.id] ??
      selectedGroup.emitterIds.map(() => selectedGroupColor)
    : [];
  $: selectedEmitterRows = selectedGroup
    ? presentation.partitionEmitterRows(selectedGroup)
    : [];
  $: selectedEmitterIds = selectedGroup
    ? configuration.emitterSelections[selectedGroup.id] ?? selectedGroup.emitterIds
    : [];
  $: selectedEmissionIntensity = selectedGroup
    ? configuration.emissionIntensities[selectedGroup.id] ?? 1
    : 1;
  $: selectedLightSpillIntensity = selectedGroup
    ? configuration.lightSpillIntensities[selectedGroup.id] ?? 1
    : 1;
  $: selectedZoneIntensity = activeZone
    ? configuration.zoneIntensities[activeZone.id] ?? configuration.intensity
    : configuration.intensity;
  $: supportsColor = activeZone !== undefined;
  $: supportsMirror = presentation.supportsMirror(selectedGroup);
  $: selectedScenario = selectedGroup
    ? configuration.groupScenarios[selectedGroup.id] ?? configuration.scenario
    : configuration.scenario;
  $: selectedIndividualMode = selectedGroup
    ? configuration.groupIndividualModes[selectedGroup.id] ?? configuration.individualMode
    : configuration.individualMode;
  $: selectedAnimationPrimitiveIds = selectedGroup
    ? configuration.groupAnimationPrimitiveIds[selectedGroup.id] ?? configuration.animationPrimitiveIds
    : configuration.animationPrimitiveIds;
  $: selectedAnimationComposition = presentation.identifyAnimationComposition(selectedAnimationPrimitiveIds);
  $: selectedAnimationSpeedMs = selectedGroup
    ? configuration.groupAnimationSpeedMs[selectedGroup.id] ?? configuration.animationSpeedMs
    : configuration.animationSpeedMs;
  $: selectedAnimationDirection = selectedGroup
    ? configuration.groupAnimationDirections[selectedGroup.id] ?? configuration.animationDirection
    : configuration.animationDirection;
  $: selectedLoadingMode = selectedGroup
    ? configuration.groupLoadingModes[selectedGroup.id] ?? configuration.loadingMode
    : configuration.loadingMode;
  $: selectedPulseShape = selectedGroup
    ? configuration.groupPulseShapes[selectedGroup.id] ?? configuration.pulseShape
    : configuration.pulseShape;
  $: selectedRainbowPalette = selectedGroup
    ? configuration.groupRainbowPalettes[selectedGroup.id] ?? configuration.rainbowPalette
    : configuration.rainbowPalette;
  $: selectedSecondaryColor = selectedGroup
    ? configuration.groupSecondaryColors[selectedGroup.id] ?? configuration.secondaryColor
    : configuration.secondaryColor;
  $: selectedTertiaryColor = selectedGroup
    ? configuration.groupTertiaryColors[selectedGroup.id] ?? configuration.tertiaryColor
    : configuration.tertiaryColor;
  $: usesDirection = selectedAnimationPrimitiveIds.includes('loading') || selectedAnimationPrimitiveIds.includes('chase');
  $: usesSecondaryColor = selectedAnimationPrimitiveIds.includes('loading') ||
    selectedAnimationPrimitiveIds.includes('chase') ||
    (selectedAnimationPrimitiveIds.includes('rainbow') && selectedRainbowPalette === 'custom');
  $: usesTertiaryColor = selectedAnimationPrimitiveIds.includes('rainbow') && selectedRainbowPalette === 'custom';
  $: illuminationMode = configuration.active
    ? snapshot.workflowTracksVisible
      ? {
          source: 'SIMULATION LOCALE',
          detail: 'La simulation passive remplace temporairement les lumières du clip · pistes workflow toujours autorisées.',
          tone: 'simulation'
        }
      : {
          source: 'SIMULATION LOCALE',
          detail: 'Aperçu passif du LED Lab · pistes du clip masquées · aucune commande envoyée au robot.',
          tone: 'simulation'
        }
    : snapshot.realRobotLedsVisible && snapshot.realRobotConnected
      ? snapshot.realRobotLedAvailable
        ? {
            source: 'ROBOT RÉEL',
            detail: 'Le Viewer reproduit les valeurs LED observées sur le robot connecté.',
            tone: 'robot'
          }
        : {
            source: 'ROBOT RÉEL · EN ATTENTE',
            detail: 'Robot connecté · affichage du clip conservé jusqu’à la première observation LED physique.',
            tone: 'waiting'
          }
    : snapshot.workflowTracksVisible
      ? {
          source: 'CLIP / WORKFLOW',
          detail: 'Les lumières proviennent des pistes LED écrites dans le clip courant.',
          tone: 'workflow'
        }
      : {
          source: 'AUCUNE SOURCE LED',
          detail: 'Pistes du clip masquées et simulation locale arrêtée.',
          tone: 'inactive'
        };

  function value(event: Event): string {
    return event.currentTarget instanceof HTMLInputElement || event.currentTarget instanceof HTMLSelectElement
      ? event.currentTarget.value
      : '';
  }

  function compactEmitterLabel(emitterId: string): string {
    return presentation.formatEmitterLabel(emitterId,supportsMirror);
  }

  function isZoneSelected(zoneId: string): boolean {
    if (!configuration.active) return false;
    const zoneGroups = snapshot.groups.filter((group) => group.zoneId === zoneId);
    const aggregateGroup = zoneGroups.find((group) => group.kind === 'aggregate');
    return aggregateGroup
      ? configuration.groupIds.includes(aggregateGroup.id)
      : zoneGroups.some((group) => configuration.groupIds.includes(group.id));
  }

  function fixedZoneColor(zoneId: typeof configuration.zoneId): string {
    if (readOnly) return observedRows[zoneId]?.flatMap((row) => row.leds).find((led) => led.state === 'on')?.color ?? '#000000';
    const zoneGroups = snapshot.groups.filter((group) => group.zoneId === zoneId);
    const primaryGroup = zoneGroups.find((group) => group.kind === 'aggregate') ?? zoneGroups[0];
    return primaryGroup
      ? configuration.groupColors[primaryGroup.id] ?? configuration.color
      : configuration.color;
  }

  function previewColorSwatchStyle(zoneId: typeof configuration.zoneId): string {
    const colors = previewZoneColorRows(zoneId).flatMap((row) => row.colors);
    const fallbackColor = fixedZoneColor(zoneId);
    const palette = colors.length > 1
      ? `linear-gradient(90deg, ${colors.join(', ')})`
      : colors[0] ?? fallbackColor;
    return `--preview-color:${fallbackColor};--preview-palette:${palette}`;
  }

  function previewGroupColor(groupId: string, zoneId: typeof configuration.zoneId): string {
    return snapshot.zones.find((zone) => zone.id === zoneId)?.capability === 'rgb'
      ? configuration.groupColors[groupId] ?? configuration.color
      : fixedZoneColor(zoneId);
  }

  function previewGroupColors(groupId: string, zoneId: typeof configuration.zoneId): readonly string[] {
    const group = snapshot.groups.find((candidate) => candidate.id === groupId);
    if (!group) return [];
    const color = previewGroupColor(groupId, zoneId);
    return configuration.emitterColors[groupId] ?? group.emitterIds.map(() => color);
  }

  function previewGroupColorRows(
    groupId: string,
    zoneId: typeof configuration.zoneId
  ): readonly LedPreviewRow[] {
    const group = snapshot.groups.find((candidate) => candidate.id === groupId);
    if (!group) return [];
    const colors = previewGroupColors(groupId, zoneId);
    const emitterRows = presentation.partitionEmitterRows(group);
    return emitterRows.map((emitterIds, rowIndex) => ({
      colors: emitterIds.map((emitterId) =>
        colors[group.emitterIds.indexOf(emitterId)] ?? fixedZoneColor(zoneId)
      ),
      side: emitterRows.length > 1 ? rowIndex === 0 ? 'L' : 'R' : null
    }));
  }

  function previewGroupScenario(groupId: string | null): LightTesterScenario {
    return groupId
      ? configuration.groupScenarios[groupId] ?? configuration.scenario
      : 'preset';
  }

  function previewGroupAnimationPrimitiveIds(
    groupId: string | null
  ): readonly LightTesterAnimationPrimitiveId[] {
    return groupId
      ? configuration.groupAnimationPrimitiveIds[groupId] ?? configuration.animationPrimitiveIds
      : configuration.animationPrimitiveIds;
  }

  function previewGroupHasAnimationPrimitive(
    groupId: string | null,
    primitiveId: LightTesterAnimationPrimitiveId
  ): boolean {
    return previewGroupAnimationPrimitiveIds(groupId).includes(primitiveId);
  }

  function previewGroupAnimationSpeed(groupId: string | null): number {
    return groupId
      ? configuration.groupAnimationSpeedMs[groupId] ?? configuration.animationSpeedMs
      : configuration.animationSpeedMs;
  }

  function previewAnimationStyle(groupId: string | null): string {
    const group = snapshot.groups.find((candidate) => candidate.id === groupId);
    const rowLength = group
      ? Math.max(...presentation.partitionEmitterRows(group).map((row) => row.length), 1)
      : 1;
    const speed = previewGroupAnimationSpeed(groupId);
    return `--preview-step:${speed}ms;--preview-cycle:${speed * rowLength}ms;--preview-rainbow-cycle:${Math.max(800, speed * 8)}ms`;
  }

  function previewEmitterStyle(color: string, index: number, groupId: string | null): string {
    const animationClockMs = presentation.readPreviewTimeMs();
    const delayMs = index * previewGroupAnimationSpeed(groupId) - animationClockMs;
    return `--preview-color:${color};--led-delay:${delayMs}ms`;
  }

  function previewZoneAnimationGroupId(zoneId: typeof configuration.zoneId): string | null {
    const aggregateGroup = snapshot.groups.find((group) =>
      group.zoneId === zoneId && group.kind === 'aggregate'
    );
    return aggregateGroup && configuration.groupIds.includes(aggregateGroup.id) &&
      previewGroupScenario(aggregateGroup.id) === 'animated'
      ? aggregateGroup.id
      : null;
  }

  function previewZoneColorRows(
    zoneId: typeof configuration.zoneId
  ): readonly LedPreviewRow[] {
    if (readOnly) return (observedRows[zoneId] ?? []).map((row) => ({ side: row.side, colors: row.leds.map((led) => led.color ?? 'transparent') }));
    const zone = snapshot.zones.find((candidate) => candidate.id === zoneId);
    if (!zone) return [];
    const group = snapshot.groups.find((candidate) =>
      candidate.zoneId === zoneId && candidate.kind === 'aggregate'
    )
      ?? snapshot.groups.find((candidate) => candidate.zoneId === zoneId);
    if (group) return previewGroupColorRows(group.id, zoneId);
    return zone.instanceOrder.map((side) => ({
      colors: Array.from({ length: zone.ledCountPerInstance }, () => fixedZoneColor(zoneId)),
      side: side === 'left' ? 'L' : side === 'right' ? 'R' : null
    }));
  }

  function selectZone(zoneId: typeof configuration.zoneId): void {
    const zoneGroups = snapshot.groups.filter((group) => group.zoneId === zoneId);
    const firstGroup = zoneGroups.find((group) => group.kind === 'aggregate') ?? zoneGroups[0];
    if (!firstGroup) return;
    commands.update({ zoneId, groupId: firstGroup.id });
  }

  function toggleZone(zoneId: typeof configuration.zoneId): void {
    const zoneGroups = snapshot.groups.filter((group) => group.zoneId === zoneId);
    const firstGroup = zoneGroups.find((group) => group.kind === 'aggregate') ?? zoneGroups[0];
    if (!firstGroup) return;
    const zoneGroupIds = new Set(zoneGroups.map((group) => group.id));
    const remainingGroupIds = configuration.groupIds.filter((groupId) => !zoneGroupIds.has(groupId));
    const groupIds = isZoneSelected(zoneId)
      ? remainingGroupIds
      : [...remainingGroupIds, firstGroup.id];
    commands.update({ groupIds, active: groupIds.length > 0 });
  }

  function toggleTest(): void {
    const groupIds = configuration.groupIds.length > 0
      ? configuration.groupIds
      : [configuration.groupId];
    commands.update({ groupIds, active: !configuration.active });
  }

  function toggleWorkflowTracks(): void {
    commands.setWorkflowTracksVisible(!snapshot.workflowTracksVisible);
  }

  function toggleRealRobotLeds(): void {
    commands.setRealRobotLedsVisible(!snapshot.realRobotLedsVisible);
  }

  function setSelectedEmissionIntensity(event: Event): void {
    if (!selectedGroup) return;
    commands.update({
      emissionIntensities: {
        ...configuration.emissionIntensities,
        [selectedGroup.id]: Number(value(event))
      },
      active: true
    });
  }

  function setSelectedLightSpillIntensity(event: Event): void {
    if (!selectedGroup) return;
    commands.update({
      lightSpillIntensities: {
        ...configuration.lightSpillIntensities,
        [selectedGroup.id]: Number(value(event))
      },
      active: true
    });
  }

  function setSelectedZoneIntensity(event: Event): void {
    if (!activeZone) return;
    commands.update({
      zoneIntensities: {
        ...configuration.zoneIntensities,
        [activeZone.id]: Number(value(event))
      },
      active: true
    });
  }

  function setSelectedGroupColor(event: Event): void {
    if (!selectedGroup) return;
    const color = value(event);
    commands.update({
      groupColors: {
        ...configuration.groupColors,
        [selectedGroup.id]: color
      },
      emitterColors: {
        ...configuration.emitterColors,
        [selectedGroup.id]: selectedGroup.emitterIds.map(() => color)
      },
      active: true
    });
  }

  function setSelectedEmitterColor(emitterId: string, event: Event): void {
    if (!selectedGroup) return;
    const colorIndex = selectedGroup.emitterIds.indexOf(emitterId);
    if (colorIndex < 0) return;
    const colors = [...selectedEmitterColors];
    colors[colorIndex] = value(event);
    if (selectedIndividualMode === 'mirror' && supportsMirror) {
      const mirrorId = presentation.resolveMirrorEmitterId(selectedGroup, emitterId);
      const mirrorIndex = mirrorId ? selectedGroup.emitterIds.indexOf(mirrorId) : -1;
      if (mirrorIndex >= 0) colors[mirrorIndex] = value(event);
    }
    commands.update({
      emitterColors: {
        ...configuration.emitterColors,
        [selectedGroup.id]: colors
      },
      active: true
    });
  }

  function activateSelectedGroup(patch: Partial<typeof configuration>): void {
    if (!selectedGroup) return;
    const sameZoneGroupIds = new Set(
      snapshot.groups
        .filter((group) => group.zoneId === selectedGroup.zoneId)
        .map((group) => group.id)
    );
    const groupIds = [
      ...configuration.groupIds.filter((groupId) => !sameZoneGroupIds.has(groupId)),
      selectedGroup.id
    ];
    commands.update({
      ...patch,
      zoneId: selectedGroup.zoneId,
      groupId: selectedGroup.id,
      groupIds,
      active: true
    });
  }

  function selectScenario(scenario: LightTesterScenario): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupScenarios: {
        ...configuration.groupScenarios,
        [selectedGroup.id]: scenario
      }
    });
  }

  function testSelectedEmitter(emitterId: string): void {
    if (!selectedGroup) return;
    const mirrorId = selectedIndividualMode === 'mirror' && supportsMirror
      ? presentation.resolveMirrorEmitterId(selectedGroup, emitterId)
      : null;
    activateSelectedGroup({
      groupScenarios: { ...configuration.groupScenarios, [selectedGroup.id]: 'individual' },
      emitterSelections: {
        ...configuration.emitterSelections,
        [selectedGroup.id]: mirrorId ? [emitterId, mirrorId] : [emitterId]
      }
    });
  }

  function selectIndividualMode(individualMode: LightTesterIndividualMode): void {
    if (!selectedGroup || (individualMode === 'mirror' && !supportsMirror)) return;
    const current = configuration.emitterSelections[selectedGroup.id];
    const emitterSelections = { ...configuration.emitterSelections };
    if (individualMode === 'mirror' && current && current.length < selectedGroup.emitterIds.length) {
      emitterSelections[selectedGroup.id] = [...new Set(current.flatMap((emitterId) => {
        const mirrorId = presentation.resolveMirrorEmitterId(selectedGroup, emitterId);
        return mirrorId ? [emitterId, mirrorId] : [emitterId];
      }))];
    }
    activateSelectedGroup({
      groupScenarios: { ...configuration.groupScenarios, [selectedGroup.id]: 'individual' },
      groupIndividualModes: { ...configuration.groupIndividualModes, [selectedGroup.id]: individualMode },
      emitterSelections
    });
  }

  function testAllSelectedEmitters(): void {
    if (!selectedGroup) return;
    const emitterSelections: Record<string, readonly string[]> = {
      ...configuration.emitterSelections
    };
    delete emitterSelections[selectedGroup.id];
    activateSelectedGroup({
      groupScenarios: { ...configuration.groupScenarios, [selectedGroup.id]: 'individual' },
      emitterSelections
    });
  }

  function toggleAnimationPrimitive(primitiveId: LightTesterAnimationPrimitiveId): void {
    if (!selectedGroup) return;
    const primitiveIds = selectedAnimationPrimitiveIds.includes(primitiveId)
      ? selectedAnimationPrimitiveIds.filter((candidate) => candidate !== primitiveId)
      : [...selectedAnimationPrimitiveIds, primitiveId];
    if (primitiveIds.length === 0) return;
    activateSelectedGroup({
      groupScenarios: { ...configuration.groupScenarios, [selectedGroup.id]: 'animated' },
      groupAnimationPatterns: { ...configuration.groupAnimationPatterns, [selectedGroup.id]: primitiveIds[0] },
      groupAnimationPrimitiveIds: {
        ...configuration.groupAnimationPrimitiveIds,
        [selectedGroup.id]: primitiveIds
      }
    });
  }

  function setAnimationDirection(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupAnimationDirections: {
        ...configuration.groupAnimationDirections,
        [selectedGroup.id]: value(event) as LightTesterAnimationDirection
      }
    });
  }

  function setLoadingMode(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupLoadingModes: {
        ...configuration.groupLoadingModes,
        [selectedGroup.id]: value(event) as LightTesterLoadingMode
      }
    });
  }

  function setPulseShape(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupPulseShapes: {
        ...configuration.groupPulseShapes,
        [selectedGroup.id]: value(event) as LightTesterPulseShape
      }
    });
  }

  function setRainbowPalette(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupRainbowPalettes: {
        ...configuration.groupRainbowPalettes,
        [selectedGroup.id]: value(event) as LightTesterRainbowPalette
      }
    });
  }

  function setSelectedSecondaryColor(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupSecondaryColors: {
        ...configuration.groupSecondaryColors,
        [selectedGroup.id]: value(event)
      }
    });
  }

  function setSelectedTertiaryColor(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupTertiaryColors: {
        ...configuration.groupTertiaryColors,
        [selectedGroup.id]: value(event)
      }
    });
  }

  function setAnimationSpeed(event: Event): void {
    if (!selectedGroup) return;
    activateSelectedGroup({
      groupAnimationSpeedMs: {
        ...configuration.groupAnimationSpeedMs,
        [selectedGroup.id]: Number(value(event))
      }
    });
  }

  function applyColorPreset(presetId: LightTesterColorPresetId): void {
    if (!selectedGroup) return;
    const colors = presentation.createPresetColors(
      presetId,
      selectedGroup.emitterIds.length
    );
    const emitterSelections: Record<string, readonly string[]> = {
      ...configuration.emitterSelections
    };
    delete emitterSelections[selectedGroup.id];
    activateSelectedGroup({
      groupColors: {
        ...configuration.groupColors,
        [selectedGroup.id]: colors[0] ?? selectedGroupColor
      },
      emitterColors: {
        ...configuration.emitterColors,
        [selectedGroup.id]: colors
      },
      emitterSelections
    });
  }
</script>

<section class="led-lab" data-read-only={readOnly} aria-label={title}>
  <header>
    <div class="led-lab__heading"><small>VIEWER · LED LAB</small><strong>{title}</strong>{#if readOnly}<small>Lecture seule</small>{/if}</div>
    <div class="led-lab__header-actions">
      <button
        type="button"
        class="led-lab__workflow-toggle"
        class:active={snapshot.workflowTracksVisible}
        aria-pressed={snapshot.workflowTracksVisible}
        aria-label={snapshot.workflowTracksVisible ? 'Masquer les pistes LED du workflow' : 'Afficher les pistes LED du workflow'}
        disabled={!snapshot.canToggleWorkflowTracks}
        on:click={toggleWorkflowTracks}
      >
        <span aria-hidden="true"></span>{snapshot.workflowTracksVisible ? 'Pistes actives' : 'Activer les pistes'}
      </button>
      <button
        type="button"
        class="led-lab__robot-toggle"
        class:active={snapshot.realRobotLedsVisible && snapshot.realRobotConnected}
        class:available={snapshot.realRobotLedAvailable}
        aria-pressed={snapshot.realRobotLedsVisible && snapshot.realRobotConnected}
        aria-label={snapshot.realRobotLedsVisible ? 'Masquer les LED observées sur le robot réel' : 'Afficher les LED observées sur le robot réel'}
        disabled={!snapshot.canToggleRealRobotLeds}
        on:click={toggleRealRobotLeds}
      >
        <span aria-hidden="true"></span>{snapshot.realRobotConnected ? 'Robot réel' : 'Robot absent'}
      </button>
      <button
        type="button"
        class="led-lab__test-toggle"
        class:active={configuration.active}
        aria-pressed={configuration.active}
        aria-label={configuration.active ? 'Arrêter la simulation LED' : 'Lancer la simulation LED'}
        disabled={!snapshot.canEdit}
        on:click={toggleTest}
      >
        <span aria-hidden="true"></span>{configuration.active ? 'Simulation active' : 'Lancer la simulation'}
      </button>
    </div>
  </header>

  <div class="led-lab__notice" class:workflow={illuminationMode.tone === 'workflow'} class:simulation={illuminationMode.tone === 'simulation'} class:robot={illuminationMode.tone === 'robot'} class:waiting={illuminationMode.tone === 'waiting'}>
    <span aria-hidden="true"></span>
    <p><strong>{illuminationMode.source}</strong><small>{illuminationMode.detail}</small></p>
  </div>

  <nav class="led-lab__scenario-tabs" aria-label="Scénario de simulation LED">
    <button type="button" class:active={selectedScenario === 'preset'} aria-pressed={selectedScenario === 'preset'} disabled={!snapshot.canEdit} on:click={() => selectScenario('preset')}>Presets</button>
    <button type="button" class:active={selectedScenario === 'animated'} aria-pressed={selectedScenario === 'animated'} disabled={!snapshot.canEdit} on:click={() => selectScenario('animated')}>Animé</button>
    <button type="button" class:active={selectedScenario === 'individual'} aria-pressed={selectedScenario === 'individual'} disabled={!snapshot.canEdit} on:click={() => selectScenario('individual')}>Individuel</button>
  </nav>

  <div class="led-lab__zones" aria-label="LED zones">
    {#each orderedZones as zone (zone.id)}
      <div class="led-lab__zone-control">
        <button
          type="button"
          class="led-lab__visibility-toggle"
          class:active={isZoneSelected(zone.id)}
          aria-label={`${isZoneSelected(zone.id) ? 'Masquer' : 'Afficher'} ${zone.label}`}
          aria-pressed={isZoneSelected(zone.id)}
          disabled={!snapshot.canEdit}
          title={`${isZoneSelected(zone.id) ? 'Masquer' : 'Afficher'} les LEDs ${zone.label}`}
          on:click={() => toggleZone(zone.id)}
        >
          {#if isZoneSelected(zone.id)}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.3 3.1M6.2 7.6A17.8 17.8 0 0 0 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1"/></svg>
          {/if}
        </button>
        <button
          type="button"
          class="led-lab__layer-button"
          class:selected={!readOnly && configuration.zoneId === zone.id}
          aria-current={!readOnly && configuration.zoneId === zone.id ? 'true' : undefined}
          disabled={!snapshot.canEdit}
          title={`Parcourir les groupes ${zone.label}`}
          on:click={() => selectZone(zone.id)}
        >
          <span class="led-lab__global-color" style={previewColorSwatchStyle(zone.id)}></span>
          <span class="led-lab__layer-copy"><strong>{zone.label}</strong><small>{zone.ledCountPerInstance * zone.instanceOrder.length} LEDs</small></span>
          <span
            class="led-lab__led-dots"
            class:active={readOnly || isZoneSelected(zone.id)}
            class:preview-animated={configuration.active && previewZoneAnimationGroupId(zone.id) !== null}
            class:preview-loading={previewGroupHasAnimationPrimitive(previewZoneAnimationGroupId(zone.id), 'loading')}
            class:preview-chase={previewGroupHasAnimationPrimitive(previewZoneAnimationGroupId(zone.id), 'chase')}
            class:preview-pulse={previewGroupHasAnimationPrimitive(previewZoneAnimationGroupId(zone.id), 'pulse')}
            class:preview-rainbow={previewGroupHasAnimationPrimitive(previewZoneAnimationGroupId(zone.id), 'rainbow')}
            style={previewAnimationStyle(previewZoneAnimationGroupId(zone.id))}
            aria-hidden={!readOnly}
          >
            {#if readOnly}
              {#each observedRows[zone.id] ?? [] as row, rowIndex (rowIndex)}
                <span class="led-lab__led-row">
                  {#each row.leds as led, ledIndex (ledIndex)}
                    <i data-state={led.state} style:background={led.color ?? 'transparent'} role="img"
                      aria-label={`${led.label} : ${led.state === 'on' ? 'allumée' : led.state === 'off' ? 'éteinte' : 'non observée'}`}
                      title={`${led.label} · ${led.state === 'on' ? 'Allumée' : led.state === 'off' ? 'Éteinte' : 'Non observée'} · ${led.color ?? '—'} · ${led.intensity === null ? '—' : Math.round(led.intensity * 100) + ' %'}`}></i>
                  {/each}
                  <b>{row.side ?? ''}</b>
                </span>
              {/each}
            {:else}
            {#each previewZoneColorRows(zone.id) as row, rowIndex (rowIndex)}
              <span class="led-lab__led-row">
                {#each row.colors as color, ledIndex (ledIndex)}<i style={previewEmitterStyle(color, ledIndex, previewZoneAnimationGroupId(zone.id))}></i>{/each}
                <b>{row.side ?? ''}</b>
              </span>
            {/each}
            {/if}
          </span>
        </button>
      </div>
    {/each}
  </div>

  {#if !readOnly}
  {#if selectedScenario === "animated"}
    <section
      class="led-lab__scenario-panel"
      aria-label="Composition d’animation LED"
      data-animation-composition-id={selectedAnimationComposition.id}
    >
      <div class="led-lab__field-heading">
        <strong>Composition d’animation</strong>
        <output>{selectedAnimationPrimitiveIds.length} primitive{selectedAnimationPrimitiveIds.length > 1 ? 's' : ''} · {selectedAnimationSpeedMs} ms</output>
      </div>
      <div class="led-lab__animation-patterns">
        <button type="button" class:active={selectedAnimationPrimitiveIds.includes('loading')} aria-pressed={selectedAnimationPrimitiveIds.includes('loading')} on:click={() => toggleAnimationPrimitive('loading')}>Chargement</button>
        <button type="button" class:active={selectedAnimationPrimitiveIds.includes('chase')} aria-pressed={selectedAnimationPrimitiveIds.includes('chase')} on:click={() => toggleAnimationPrimitive('chase')}>Chenillard</button>
        <button type="button" class:active={selectedAnimationPrimitiveIds.includes('pulse')} aria-pressed={selectedAnimationPrimitiveIds.includes('pulse')} on:click={() => toggleAnimationPrimitive('pulse')}>Respiration</button>
        <button type="button" class:active={selectedAnimationPrimitiveIds.includes('rainbow')} aria-pressed={selectedAnimationPrimitiveIds.includes('rainbow')} disabled={!supportsColor} on:click={() => toggleAnimationPrimitive('rainbow')}>Arc-en-ciel</button>
      </div>
      <input type="range" min="80" max="2400" step="20" value={selectedAnimationSpeedMs} disabled={!snapshot.canEdit} on:input={setAnimationSpeed} />
      <div class="led-lab__animation-options">
        {#if usesDirection}
          <label><span>Direction</span><select value={selectedAnimationDirection} disabled={!snapshot.canEdit} on:change={setAnimationDirection}><option value="forward">Avant</option><option value="reverse">Arrière</option></select></label>
        {/if}
        {#if selectedAnimationPrimitiveIds.includes('loading')}
          <label><span>Chargement</span><select value={selectedLoadingMode} disabled={!snapshot.canEdit} on:change={setLoadingMode}><option value="fill">Remplissage</option><option value="bounce">Aller-retour</option></select></label>
        {/if}
        {#if selectedAnimationPrimitiveIds.includes('pulse')}
          <label><span>Respiration</span><select value={selectedPulseShape} disabled={!snapshot.canEdit} on:change={setPulseShape}><option value="sine">Souple</option><option value="heartbeat">Battement</option></select></label>
        {/if}
        {#if selectedAnimationPrimitiveIds.includes('rainbow')}
          <label><span>Palette</span><select value={selectedRainbowPalette} disabled={!snapshot.canEdit} on:change={setRainbowPalette}><option value="spectrum">Spectre</option><option value="custom">3 couleurs</option></select></label>
        {/if}
      </div>
    </section>
  {/if}

  <label>
    <span><strong>Couleur principale · {selectedGroup?.label ?? '—'}</strong><output>{selectedGroupColor.toUpperCase()}</output></span>
    <input type="color" value={selectedGroupColor} disabled={!snapshot.canEdit || !supportsColor || !selectedGroup} on:input={setSelectedGroupColor} />
  </label>

  {#if selectedScenario === 'animated' && usesSecondaryColor}
    <label>
      <span><strong>Couleur secondaire</strong><output>{selectedSecondaryColor.toUpperCase()}</output></span>
      <input type="color" value={selectedSecondaryColor} disabled={!snapshot.canEdit || !supportsColor || !selectedGroup} on:input={setSelectedSecondaryColor} />
    </label>
  {/if}

  {#if selectedScenario === 'animated' && usesTertiaryColor}
    <label>
      <span><strong>Couleur tertiaire</strong><output>{selectedTertiaryColor.toUpperCase()}</output></span>
      <input type="color" value={selectedTertiaryColor} disabled={!snapshot.canEdit || !supportsColor || !selectedGroup} on:input={setSelectedTertiaryColor} />
    </label>
  {/if}

  {#if selectedScenario !== 'individual'}
    <section class="led-lab__scenario-panel" aria-label={`Presets de couleur ${selectedGroup?.label ?? 'LED'}`}>
      <div class="led-lab__field-heading"><strong>Presets de couleur</strong><output>Étape couleur</output></div>
      <div class="led-lab__presets">
        {#each presentation.colorPresets as preset (preset.id)}
          <button type="button" disabled={!snapshot.canEdit || !supportsColor || !selectedGroup} on:click={() => applyColorPreset(preset.id)}>
            <span class="led-lab__preset-preview">
              {#each preset.colors.slice(0, 4) as color, colorIndex (colorIndex)}
                <i style={`--preset-color:${color}`}></i>
              {/each}
            </span>
            {preset.label}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedScenario === 'individual'}
    <section class="led-lab__scenario-panel led-lab__scenario-panel--individual" aria-label="Simulation LED individuelle">
      <div class="led-lab__individual-mode" aria-label="Mode d’édition individuelle">
        <button type="button" class:active={selectedIndividualMode === 'free' || !supportsMirror} aria-pressed={selectedIndividualMode === 'free' || !supportsMirror} disabled={!snapshot.canEdit} on:click={() => selectIndividualMode('free')}>Libre</button>
        <button type="button" class:active={selectedIndividualMode === 'mirror' && supportsMirror} aria-pressed={selectedIndividualMode === 'mirror' && supportsMirror} disabled={!snapshot.canEdit || !supportsMirror} title={supportsMirror ? 'Éditer les LEDs physiques par paires symétriques' : 'Aucune paire miroir fiable pour ce groupe'} on:click={() => selectIndividualMode('mirror')}>Miroir</button>
      </div>
      <div class="led-lab__field-heading">
        <strong>LEDs individuelles</strong>
        <button type="button" class:active={selectedGroup !== undefined && selectedEmitterIds.length === selectedGroup.emitterIds.length} disabled={!snapshot.canEdit || !selectedGroup} on:click={testAllSelectedEmitters}>Toutes</button>
      </div>
      {#if selectedGroup}
        <div class="led-lab__emitters" class:led-lab__emitters--mirrored={supportsMirror} aria-label={`LEDs individuelles · ${selectedGroup.label}`}>
          {#each selectedEmitterRows as emitterIds, sideIndex (sideIndex)}
            <div class="led-lab__emitter-side">
              {#if supportsMirror}
                <div class="led-lab__side-label" aria-label={sideIndex === 0 ? 'Côté gauche' : 'Côté droit'}>
                  <b>{sideIndex === 0 ? 'L' : 'R'}</b>
                  <span>{sideIndex === 0 ? 'Gauche' : 'Droite'}</span>
                </div>
              {/if}
              <div class="led-lab__emitter-side-list">
                {#each presentation.sortEmitterIds(emitterIds) as emitterId (emitterId)}
                  <div class="led-lab__emitter-control">
                    <button
                      type="button"
                      class:active={selectedEmitterIds.includes(emitterId)}
                      aria-label={`Simuler ${presentation.formatEmitterLabel(emitterId)}`}
                      aria-pressed={selectedEmitterIds.includes(emitterId)}
                      disabled={!snapshot.canEdit}
                      title={emitterId}
                      on:click={() => testSelectedEmitter(emitterId)}
                    >
                      <span style={`--emitter-color:${selectedEmitterColors[selectedGroup.emitterIds.indexOf(emitterId)] ?? selectedGroupColor}`}></span>
                      <small>{compactEmitterLabel(emitterId)}</small>
                    </button>
                    {#if supportsColor}
                      <input type="color" value={selectedEmitterColors[selectedGroup.emitterIds.indexOf(emitterId)] ?? selectedGroupColor} aria-label={`Couleur ${emitterId}`} disabled={!snapshot.canEdit} on:input={(event) => setSelectedEmitterColor(emitterId, event)} />
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <details class="led-lab__intensity-settings">
    <summary>
      <span><strong>Réglages d’intensité</strong><small>{activeZone?.label ?? '—'}</small></span>
      <i aria-hidden="true">⌄</i>
    </summary>
    <div class="led-lab__intensity-content">
      <label>
        <span><strong>Intensité · {activeZone?.label ?? '—'}</strong><output>{Math.round(selectedZoneIntensity * 100)}%</output></span>
        <input type="range" min="0" max="1" step="0.01" value={selectedZoneIntensity} disabled={!snapshot.canEdit || !activeZone} on:input={setSelectedZoneIntensity} />
      </label>

      <label>
        <span><strong>Luminance du diffuseur · {selectedGroup?.label ?? '—'}</strong><output>{Math.round(selectedEmissionIntensity * 100)}%</output></span>
        <input type="range" min="0" max="2" step="0.05" value={selectedEmissionIntensity} disabled={!snapshot.canEdit || !selectedGroup} on:input={setSelectedEmissionIntensity} />
      </label>

      <label>
        <span><strong>Lumière projetée · voisinage</strong><output>{Math.round(selectedLightSpillIntensity * 100)}%</output></span>
        <input type="range" min="0" max="2" step="0.05" value={selectedLightSpillIntensity} disabled={!snapshot.canEdit || !selectedGroup} on:input={setSelectedLightSpillIntensity} />
      </label>
    </div>
  </details>
  {:else}
    <small>Couleur reçue · noir : éteinte · pointillé : non observée. Survol : valeur exacte.</small>
  {/if}

  <footer>
    {#if footer}<small>{footer}</small>{/if}
  </footer>
</section>

<style>
  .led-lab[data-read-only=true] .led-lab__layer-button:disabled{opacity:1;cursor:default}
  .led-lab[data-read-only=true] .led-lab__led-dots{opacity:1}
  .led-lab[data-read-only=true] .led-lab__led-dots i{opacity:1!important;animation:none!important;border:1px solid #78909c;box-shadow:none}
  .led-lab[data-read-only=true] .led-lab__led-dots i[data-state=unknown]{border-style:dashed;opacity:.6!important}
  .led-lab{box-sizing:border-box;display:flex;flex-direction:column;align-content:normal;gap:14px;width:100%;height:100%;min-width:0;min-height:0;padding:12px;overflow-x:hidden;overflow-y:auto;scrollbar-gutter:stable;overscroll-behavior:contain;background:linear-gradient(145deg,color-mix(in srgb,var(--color-accent-primary,#45d9e9) 5%,transparent),transparent 38%),var(--color-background-surface,#071522);color:var(--color-text-primary,#d9ebf7);font:12px/1.35 system-ui,sans-serif}.led-lab header{display:grid;gap:6px;min-width:0}.led-lab label,.led-lab label>span,.led-lab footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.led-lab__heading{display:flex;align-items:baseline;gap:7px;min-width:0;white-space:nowrap}.led-lab header small,.led-lab footer small{color:#fff;font-size:9px;letter-spacing:.08em}.led-lab header strong{overflow:hidden;font-size:14px;text-overflow:ellipsis}.led-lab button{border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 82%,transparent);border-radius:7px;background:var(--color-background-panel,#0a1826);color:inherit;padding:6px 8px;font:inherit}.led-lab button{cursor:pointer}.led-lab button:hover:not(:disabled),.led-lab button.active{border-color:var(--color-accent-primary,#45d9e9);color:var(--color-accent-primary,#76f2ff);background:color-mix(in srgb,var(--color-accent-primary,#45d9e9) 10%,var(--color-background-panel,#0a1826))}.led-lab button:disabled,.led-lab input:disabled{cursor:not-allowed;opacity:.46}.led-lab__header-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;width:100%;min-width:0}.led-lab header .led-lab__test-toggle,.led-lab header .led-lab__workflow-toggle{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;padding:8px 10px;border-color:color-mix(in srgb,var(--color-accent-primary,#45d9e9) 68%,transparent);color:#dffcff;background:linear-gradient(135deg,color-mix(in srgb,var(--color-accent-primary,#45d9e9) 22%,var(--color-background-panel,#0a1826)),color-mix(in srgb,var(--color-accent-primary,#45d9e9) 8%,var(--color-background-panel,#0a1826)));box-shadow:inset 0 1px 0 rgb(255 255 255 / .08),0 3px 10px rgb(0 0 0 / .22);font-size:10px;font-weight:650;white-space:nowrap}.led-lab header .led-lab__test-toggle:hover:not(:disabled),.led-lab header .led-lab__workflow-toggle:hover:not(:disabled){background:linear-gradient(135deg,color-mix(in srgb,var(--color-accent-primary,#45d9e9) 32%,var(--color-background-panel,#0a1826)),color-mix(in srgb,var(--color-accent-primary,#45d9e9) 14%,var(--color-background-panel,#0a1826)));box-shadow:inset 0 1px 0 rgb(255 255 255 / .12),0 0 12px color-mix(in srgb,var(--color-accent-primary,#45d9e9) 24%,transparent)}.led-lab header .led-lab__test-toggle>span,.led-lab header .led-lab__workflow-toggle>span{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#76f2ff;box-shadow:0 0 7px rgb(118 242 255 / .55)}.led-lab header .led-lab__test-toggle.active{border-color:#55f19b;color:#e9fff3;background:linear-gradient(135deg,rgb(25 109 76 / .72),rgb(8 45 42 / .94));box-shadow:inset 0 1px 0 rgb(255 255 255 / .1),0 0 11px rgb(85 241 155 / .22)}.led-lab header .led-lab__test-toggle.active>span{background:#55f19b;box-shadow:0 0 8px #55f19b}.led-lab header .led-lab__workflow-toggle.active{border-color:#45d9e9;color:#e5fcff;background:linear-gradient(135deg,rgb(12 83 108 / .78),rgb(8 38 57 / .96))}.led-lab__notice{display:grid;grid-template-columns:8px minmax(0,1fr);align-items:center;gap:8px;margin:0;padding:7px 8px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 45%,transparent);border-radius:7px;color:var(--color-text-muted,#8da8ba);background:color-mix(in srgb,var(--color-background-panel,#0a1826) 72%,transparent)}.led-lab__notice>span{width:7px;height:7px;border-radius:50%;background:#526878;box-shadow:0 0 6px rgb(82 104 120 / .45)}.led-lab__notice.workflow>span{background:#45d9e9;box-shadow:0 0 7px rgb(69 217 233 / .7)}.led-lab__notice.simulation>span{background:#55f19b;box-shadow:0 0 7px rgb(85 241 155 / .72)}.led-lab__notice p{display:grid;gap:1px;margin:0;min-width:0}.led-lab__notice strong{color:var(--color-text-primary,#d9ebf7);font-size:9px;letter-spacing:.08em}.led-lab__notice small{overflow:hidden;color:var(--color-text-muted,#8da8ba);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.led-lab__zones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.led-lab__zones button{display:flex;align-items:center;gap:6px;min-width:0;text-align:left}.led-lab__zones button>span{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:var(--zone-color);box-shadow:0 0 6px color-mix(in srgb,var(--zone-color) 70%,transparent)}.led-lab label{align-items:stretch;flex-direction:column}.led-lab label>span{color:var(--color-text-muted,#8da8ba)}.led-lab label strong,.led-lab__field-heading strong{color:var(--color-text-primary,#d9ebf7);font-weight:600}.led-lab__field-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--color-text-muted,#8da8ba)}.led-lab output{color:var(--color-accent-primary,#71deee);font:10px ui-monospace,Consolas,monospace}.led-lab input[type='range']{width:100%;margin:0;accent-color:var(--color-accent-primary,#42d5e8)}.led-lab input[type='color']{box-sizing:border-box;width:100%;height:34px;padding:3px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 82%,transparent);border-radius:7px;background:var(--color-background-panel,#0a1826)}.led-lab footer{justify-content:flex-end;align-items:flex-end;padding-top:2px}.led-lab footer small{max-width:140px;text-align:right}
  .led-lab__intensity-settings{overflow:hidden;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 68%,transparent);border-radius:8px;background:color-mix(in srgb,var(--color-background-panel,#0a1826) 78%,transparent)}.led-lab__intensity-settings summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:34px;padding:0 10px;color:var(--color-text-primary,#d9ebf7);cursor:pointer;list-style:none}.led-lab__intensity-settings summary::-webkit-details-marker{display:none}.led-lab__intensity-settings summary>span{display:flex;align-items:center;gap:7px;min-width:0}.led-lab__intensity-settings summary small{overflow:hidden;color:var(--color-text-muted,#8da8ba);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.led-lab__intensity-settings summary i{color:var(--color-accent-primary,#71deee);font-style:normal;transition:transform 140ms ease}.led-lab__intensity-settings[open] summary i{transform:rotate(180deg)}.led-lab__intensity-content{display:grid;gap:13px;padding:10px;border-top:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 44%,transparent);background:rgb(255 255 255 / .025)}
  .led-lab__zone-control{display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:4px;min-width:0}
  .led-lab__zone-control>button:first-child{display:flex;align-items:center;gap:6px;min-width:0;text-align:left}
  .led-lab__zone-control>button.selected{border-color:var(--color-accent-primary,#45d9e9);color:var(--color-accent-primary,#76f2ff);background:color-mix(in srgb,var(--color-accent-primary,#45d9e9) 10%,var(--color-background-panel,#0a1826))}

  .led-lab__scenario-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:3px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 52%,transparent);border-radius:9px;background:color-mix(in srgb,var(--color-background-panel,#0a1826) 82%,transparent)}
  .led-lab__scenario-tabs button{padding:6px 5px;border-color:transparent;background:transparent}
  .led-lab__scenario-tabs button.active{border-color:color-mix(in srgb,var(--color-accent-primary,#45d9e9) 68%,transparent);background:color-mix(in srgb,var(--color-accent-primary,#45d9e9) 13%,var(--color-background-panel,#0a1826))}

  .led-lab__scenario-panel{display:grid;gap:8px;padding:9px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 52%,transparent);border-radius:8px;background:var(--color-background-panel,#0a1826)}
  .led-lab__presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .led-lab__presets button{display:flex;align-items:center;gap:6px;min-width:0;font-size:10px;text-align:left}
  .led-lab__preset-preview{display:flex;flex:0 0 auto;overflow:hidden;width:28px;height:10px;border-radius:5px}
  .led-lab__preset-preview i{flex:1;background:var(--preset-color)}
  .led-lab__animation-patterns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .led-lab__animation-patterns button{min-width:0;padding:6px 4px;font-size:10px}
  .led-lab__animation-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .led-lab__animation-options label{display:grid;gap:4px;min-width:0;color:var(--color-text-muted,#8da8ba);font-size:9px}
  .led-lab__animation-options select{box-sizing:border-box;min-width:0;width:100%;height:30px;padding:0 7px;border:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 72%,transparent);border-radius:6px;background:var(--color-background-surface,#071522);color:var(--color-text-primary,#d9ebf7);font:10px system-ui,sans-serif}
  .led-lab__emitters{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;max-height:174px;padding:1px;overflow-y:auto;scrollbar-gutter:stable}
  .led-lab__emitter-control{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:4px;min-width:0;min-height:34px}
  .led-lab__emitter-control>button{display:flex;align-items:center;gap:6px;min-width:0;padding:5px 7px;text-align:left}
  .led-lab__emitter-control>button>span{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:var(--emitter-color);opacity:.28}
  .led-lab__emitter-control>button.active>span{opacity:1;box-shadow:0 0 7px color-mix(in srgb,var(--emitter-color) 88%,transparent)}
  .led-lab__emitter-control small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .led-lab__emitter-control input[type='color']{box-sizing:border-box;width:30px;height:100%;min-height:34px;padding:2px}
  .led-lab__emitters small{color:#fff;font:9px ui-monospace,Consolas,monospace}
  .led-lab__zones{grid-template-columns:minmax(0,1fr)}
  .led-lab__zone-control{display:grid;grid-template-columns:36px minmax(0,1fr);gap:5px;min-width:0}
  .led-lab__visibility-toggle{display:grid!important;place-items:center;min-width:0;padding:0!important;color:#fff}
  .led-lab__visibility-toggle svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .led-lab__visibility-toggle svg circle{fill:currentColor;stroke:none}
  .led-lab__visibility-toggle.active{color:var(--color-accent-primary,#76f2ff)}
  .led-lab__layer-button{display:grid!important;grid-template-columns:24px minmax(76px,auto) minmax(64px,1fr)!important;align-items:center!important;gap:8px!important;min-height:44px!important;text-align:left!important}
  .led-lab__global-color{display:block;box-sizing:border-box;width:22px;height:14px;border:1px solid color-mix(in srgb,var(--preview-color) 72%,white);border-radius:5px;background:var(--preview-palette);box-shadow:0 0 7px color-mix(in srgb,var(--preview-color) 45%,transparent)}
  .led-lab__zones .led-lab__global-color{flex:0 0 auto;width:22px;height:14px;border-radius:5px;background:var(--preview-palette);box-shadow:0 0 7px color-mix(in srgb,var(--preview-color) 45%,transparent)}
  .led-lab__layer-copy{display:grid;gap:2px;min-width:0}
  .led-lab__zones .led-lab__layer-copy{flex:1 1 auto;width:auto;height:auto;border-radius:0;background:none;box-shadow:none}
  .led-lab__layer-copy strong,.led-lab__layer-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .led-lab__led-dots{display:grid;align-content:center;justify-items:end;gap:3px;min-width:0;opacity:.3}
  .led-lab__zones .led-lab__led-dots{flex:1 1 auto;width:auto;height:auto;border-radius:0;background:none;box-shadow:none}
  .led-lab__led-dots.active{opacity:1}
  .led-lab__led-row{display:flex;align-items:center;justify-content:flex-end;gap:3px;min-width:0}
  .led-lab__led-row b{width:9px;margin-left:2px;color:#fff;font:700 8px/1 ui-monospace,Consolas,monospace;text-align:right}
  .led-lab__led-dots i{display:block;width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:var(--preview-color);box-shadow:0 0 4px color-mix(in srgb,var(--preview-color) 72%,transparent)}
  .led-lab__led-dots.preview-animated i{will-change:opacity,transform,filter}
  .led-lab__led-dots.preview-animated.preview-loading i{opacity:.12;animation:led-layer-loading var(--preview-cycle) steps(1,end) infinite;animation-delay:var(--led-delay)}
  .led-lab__led-dots.preview-animated.preview-chase i{opacity:.14;animation:led-layer-chase var(--preview-cycle) linear infinite;animation-delay:var(--led-delay)}
  .led-lab__led-dots.preview-animated.preview-pulse i{animation:led-layer-pulse var(--preview-step) ease-in-out infinite}
  .led-lab__led-dots.preview-animated.preview-rainbow i{animation:led-layer-rainbow var(--preview-rainbow-cycle) linear infinite;animation-delay:var(--led-delay)}
  @keyframes led-layer-loading{0%,8%{opacity:1;filter:brightness(1.35)}10%,100%{opacity:.12;filter:brightness(.55)}}
  @keyframes led-layer-chase{0%,9%{opacity:1;transform:scale(1.35);filter:brightness(1.35)}12%,100%{opacity:.14;transform:scale(.82);filter:brightness(.58)}}
  @keyframes led-layer-pulse{0%,100%{opacity:.32;transform:scale(.86);filter:brightness(.68)}50%{opacity:1;transform:scale(1.25);filter:brightness(1.4)}}
  @keyframes led-layer-rainbow{0%{filter:hue-rotate(0deg);transform:scale(.92)}50%{filter:hue-rotate(180deg);transform:scale(1.18)}100%{filter:hue-rotate(360deg);transform:scale(.92)}}
  @media (prefers-reduced-motion:reduce){.led-lab__led-dots.preview-animated i{animation-duration:calc(var(--preview-cycle) * 2)}}
  .led-lab__individual-mode{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .led-lab__scenario-panel--individual{grid-template-rows:auto auto minmax(0,1fr);flex:1 1 240px;min-height:150px;overflow:hidden}
  .led-lab__emitters{display:block;min-height:0;height:100%;max-height:none;padding:1px;overflow-y:auto;scrollbar-gutter:stable}
  .led-lab__emitter-side{min-width:0}
  .led-lab__emitter-side-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));align-content:start;gap:6px;min-width:0}
  .led-lab__emitters--mirrored{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:8px}
  .led-lab__emitters--mirrored .led-lab__emitter-side-list{grid-template-columns:minmax(0,1fr)}
  .led-lab__side-label{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:7px;margin-bottom:6px;padding:4px 6px;border-bottom:1px solid color-mix(in srgb,var(--color-border-strong,#31536a) 62%,transparent);background:var(--color-background-panel,#0a1826)}
  .led-lab__side-label b{display:grid;place-items:center;width:20px;height:20px;border:1px solid color-mix(in srgb,var(--color-accent-primary,#45d9e9) 72%,transparent);border-radius:5px;color:var(--color-accent-primary,#76f2ff);font:700 10px/1 ui-monospace,Consolas,monospace}
  .led-lab__side-label span{color:var(--color-text-muted,#8da8ba);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
  .led-lab footer{flex:0 0 auto;align-items:center;margin-top:auto;padding-top:2px;white-space:nowrap}
  .led-lab footer small{max-width:none;white-space:nowrap}
  .led-lab__header-actions{width:100%;min-width:0}
  .led-lab header .led-lab__robot-toggle{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;padding:8px 10px;border-color:color-mix(in srgb,#f2b84b 58%,transparent);color:#ffe8b0;background:linear-gradient(135deg,rgb(103 70 18 / .62),rgb(44 30 9 / .9));font-size:10px;font-weight:650;white-space:nowrap}
  .led-lab header .led-lab__robot-toggle>span{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:#8a7040}
  .led-lab header .led-lab__robot-toggle.active>span{background:#f2b84b;box-shadow:0 0 8px #f2b84b}
  .led-lab header .led-lab__robot-toggle.available{border-color:#f2b84b}
  .led-lab__notice.robot>span{background:#f2b84b;box-shadow:0 0 7px rgb(242 184 75 / .72)}
  .led-lab__notice.waiting>span{background:#b69760;animation:led-real-waiting 1.2s ease-in-out infinite}
  @keyframes led-real-waiting{50%{opacity:.35}}
  @media (max-width:520px){.led-lab header{align-items:stretch;flex-direction:column}.led-lab__header-actions{width:100%;min-width:0}}
</style>
