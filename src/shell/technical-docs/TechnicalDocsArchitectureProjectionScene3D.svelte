<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import type { ArchitecturePerception } from './architecturePerceptionModel';
  import type { ArchitectureProjection, ProjectionPoint } from './architectureProjectionModel';
  import type { SemanticArchitectureGraph, SemanticGraphEdge, SemanticGraphNode } from './semanticArchitectureGraphModel';

  export let graph: SemanticArchitectureGraph;
  export let projection: ArchitectureProjection;
  export let perception: ArchitecturePerception;
  export let focusedNodeId = '';
  export let showClusters = true;
  export let showAttractors = true;
  export let showCollisions = true;

  const dispatch = createEventDispatcher<{ select: { nodeId: string } }>();
  const sceneScale = 0.022;
  const labelScale = 0.012;

  let hostElement: HTMLDivElement;
  let canvasElement: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let rootGroup: THREE.Group | null = null;
  let fieldGroup: THREE.Group | null = null;
  let edgeGroup: THREE.Group | null = null;
  let nodeGroup: THREE.Group | null = null;
  let labelGroup: THREE.Group | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let animationFrame = 0;
  let sceneReady = false;
  let dragStart: { x: number; y: number; rotationY: number; rotationX: number } | null = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  $: if (sceneReady) {
    rebuildScene();
  }

  onMount(() => {
    setupScene();
    rebuildScene();
    animate();

    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(hostElement);

    return () => {
      cleanup();
    };
  });

  onDestroy(cleanup);

  function setupScene(): void {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 0, 25);

    rootGroup = new THREE.Group();
    rootGroup.rotation.x = -0.32;
    rootGroup.rotation.y = 0.32;

    fieldGroup = new THREE.Group();
    edgeGroup = new THREE.Group();
    nodeGroup = new THREE.Group();
    labelGroup = new THREE.Group();

    rootGroup.add(fieldGroup, edgeGroup, nodeGroup, labelGroup);
    scene.add(rootGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
    const keyLight = new THREE.DirectionalLight(0xbfdcff, 1.2);
    keyLight.position.set(4, 8, 10);
    scene.add(ambientLight, keyLight);

    resizeRenderer();
    sceneReady = true;
  }

  function resizeRenderer(): void {
    if (!renderer || !camera || !hostElement) return;

    const rect = hostElement.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(360, Math.floor(rect.height));

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate(): void {
    animationFrame = window.requestAnimationFrame(animate);

    if (!renderer || !scene || !camera || !rootGroup || dragStart) return;

    rootGroup.rotation.y += 0.0018;
    renderer.render(scene, camera);
  }

  function rebuildScene(): void {
    if (!fieldGroup || !edgeGroup || !nodeGroup || !labelGroup) return;

    clearGroup(fieldGroup);
    clearGroup(edgeGroup);
    clearGroup(nodeGroup);
    clearGroup(labelGroup);

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
    const pointByNodeId = new Map(projection.points.map((point) => [point.nodeId, point]));
    const visualByNodeId = new Map(projection.nodeVisuals.map((visual) => [visual.nodeId, visual]));
    const perceivedNodeById = new Map(perception.nodeVisibility.map((node) => [node.nodeId, node]));
    const perceivedEdgeById = new Map(perception.edgeVisibility.map((edge) => [edge.edgeId, edge]));

    if (showClusters) {
      for (const cluster of perception.clusters.filter((entry) => entry.visible)) {
        const mesh = createFieldMesh(cluster.center, cluster.radius, colorForKey(cluster.colorKey), cluster.opacity * 0.55);
        mesh.scale.z = 0.08;
        fieldGroup.add(mesh);
      }
    }

    if (showAttractors) {
      for (const attractor of perception.attractors.filter((entry) => entry.visible)) {
        const mesh = createFieldMesh(attractor.center, attractor.radius, colorForKey(attractor.colorKey), 0.08 + attractor.strength * 0.16);
        mesh.scale.z = 0.18;
        fieldGroup.add(mesh);
      }
    }

    for (const perceivedEdge of perception.edgeVisibility.filter((entry) => entry.visible)) {
      const edge = edgeById.get(perceivedEdge.edgeId);
      if (!edge) continue;

      const source = pointByNodeId.get(edge.source);
      const target = pointByNodeId.get(edge.target);
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);

      if (!source || !target || !sourceNode || !targetNode) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints([
        toVector3(source, sourceNode, perceivedNodeById.get(edge.source)?.priority ?? 0),
        toVector3(target, targetNode, perceivedNodeById.get(edge.target)?.priority ?? 0)
      ]);
      const material = new THREE.LineBasicMaterial({
        color: colorForEdge(edge, perceivedEdge.role),
        transparent: true,
        opacity: perceivedEdge.opacity,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      edgeGroup.add(line);
    }

    if (showCollisions) {
      for (const collision of perception.collisions.filter((entry) => entry.visible)) {
        const mesh = createFieldMesh(collision.center, collision.radius, '#ef4444', 0.16 + collision.score * 0.18);
        mesh.position.z += 1.2 + collision.score * 2;
        mesh.scale.z = 0.12;
        fieldGroup.add(mesh);
      }
    }

    const sharedNodeGeometry = new THREE.IcosahedronGeometry(1, 2);

    for (const perceivedNode of perception.nodeVisibility.filter((entry) => entry.visible)) {
      const node = nodeById.get(perceivedNode.nodeId);
      const point = pointByNodeId.get(perceivedNode.nodeId);
      const visual = visualByNodeId.get(perceivedNode.nodeId);

      if (!node || !point || !visual) continue;

      const material = new THREE.MeshStandardMaterial({
        color: colorForKey(visual.colorKey),
        emissive: colorForKey(visual.colorKey),
        emissiveIntensity: focusedNodeId === node.id ? 0.42 : 0.16,
        transparent: true,
        opacity: perceivedNode.opacity,
        roughness: 0.55,
        metalness: 0.08
      });
      const mesh = new THREE.Mesh(sharedNodeGeometry, material);
      const radius = visual.radius * perceivedNode.radiusMultiplier * 0.075;
      mesh.position.copy(toVector3(point, node, perceivedNode.priority));
      mesh.scale.setScalar(Math.max(0.12, radius));
      mesh.userData.nodeId = node.id;
      nodeGroup.add(mesh);

      if (visual.halo !== 'none') {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(1, 24, 12),
          new THREE.MeshBasicMaterial({
            color: colorForHalo(visual.halo),
            transparent: true,
            opacity: focusedNodeId === node.id ? 0.22 : 0.1,
            wireframe: true,
            depthWrite: false
          })
        );
        halo.position.copy(mesh.position);
        halo.scale.setScalar(Math.max(0.26, radius * 1.9));
        nodeGroup.add(halo);
      }

      if (perceivedNode.labelVisible) {
        const label = createLabelSprite(node.label, perceivedNode.labelOpacity);
        label.position.copy(mesh.position);
        label.position.x += radius + 0.18;
        label.position.y += radius * 0.25;
        labelGroup.add(label);
      }
    }
  }

  function createFieldMesh(
    center: { x: number; y: number; z?: number },
    radius: number,
    color: string,
    opacity: number
  ): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(Math.max(0.2, radius * sceneScale), 32, 14);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(toVector3({ nodeId: '', x: center.x, y: center.y }, null, 0));

    return mesh;
  }

  function toVector3(point: ProjectionPoint, node: SemanticGraphNode | null, priority: number): THREE.Vector3 {
    const x = (point.x - 500) * sceneScale;
    const y = (400 - point.y) * sceneScale;
    const z = node
      ? (node.centrality - 0.35) * 4.5 + node.entropy * 1.8 + priority * 2.4
      : (point.z ?? 0) * sceneScale;

    return new THREE.Vector3(x, y, z);
  }

  function createLabelSprite(text: string, opacity: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const label = text.length > 32 ? `${text.slice(0, 29)}...` : text;
    canvas.width = 256;
    canvas.height = 48;

    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = '600 22px Inter, system-ui, sans-serif';
      context.fillStyle = `rgba(229, 238, 255, ${opacity})`;
      context.shadowColor = 'rgba(2, 6, 23, 0.9)';
      context.shadowBlur = 6;
      context.fillText(label, 8, 30);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width * labelScale, canvas.height * labelScale, 1);

    return sprite;
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!rootGroup) return;

    dragStart = {
      x: event.clientX,
      y: event.clientY,
      rotationY: rootGroup.rotation.y,
      rotationX: rootGroup.rotation.x
    };
    canvasElement.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragStart || !rootGroup) return;

    rootGroup.rotation.y = dragStart.rotationY + (event.clientX - dragStart.x) * 0.006;
    rootGroup.rotation.x = dragStart.rotationX + (event.clientY - dragStart.y) * 0.004;
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!dragStart) return;

    const moved = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);
    dragStart = null;
    canvasElement.releasePointerCapture(event.pointerId);

    if (moved < 5) {
      selectNodeAtPointer(event);
    }
  }

  function selectNodeAtPointer(event: PointerEvent): void {
    if (!camera || !nodeGroup || !renderer) return;

    const rect = canvasElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObjects(nodeGroup.children, false);
    const nodeId = intersections.find((entry) => typeof entry.object.userData.nodeId === 'string')?.object.userData.nodeId;

    if (nodeId) {
      dispatch('select', { nodeId });
    }
  }

  function colorForEdge(edge: SemanticGraphEdge, role: string): string {
    if (role === 'collision') return '#f97316';
    if (role === 'focus') return '#e5eefb';
    if (edge.kind === 'depends_on') return '#93c5fd';
    if (edge.kind === 'cooccurs') return '#22c55e';

    return '#64748b';
  }

  function colorForKey(key: string): string {
    switch (key) {
      case 'feature':
        return '#3b82f6';
      case 'concept':
        return '#22c55e';
      case 'archetype':
        return '#f59e0b';
      case 'package':
        return '#e879f9';
      case 'file':
        return '#94a3b8';
      case 'runtime-centric':
        return '#ef4444';
      case 'projection-centric':
        return '#8b5cf6';
      case 'workspace-centric':
        return '#06b6d4';
      case 'state-centric':
        return '#14b8a6';
      case 'tooling-centric':
        return '#f97316';
      case 'runtime':
        return '#ef4444';
      case 'projection':
        return '#8b5cf6';
      case 'workspace':
        return '#06b6d4';
      case 'store':
      case 'history':
        return '#14b8a6';
      case 'tool':
        return '#f97316';
      default:
        return '#64748b';
    }
  }

  function colorForHalo(halo: string): string {
    switch (halo) {
      case 'entropy':
        return '#f59e0b';
      case 'collision':
        return '#ef4444';
      case 'centrality':
        return '#3b82f6';
      case 'attractor':
        return '#8b5cf6';
      case 'mutualization':
        return '#22c55e';
      default:
        return '#64748b';
    }
  }

  function clearGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      group.remove(child);
      disposeObject(child);
    }
  }

  function disposeObject(object: THREE.Object3D): void {
    const mesh = object as THREE.Mesh | THREE.Line | THREE.Sprite;
    const geometry = 'geometry' in mesh ? mesh.geometry : null;
    const material = 'material' in mesh ? mesh.material : null;

    geometry?.dispose();

    if (Array.isArray(material)) {
      material.forEach((entry) => disposeMaterial(entry));
    } else if (material) {
      disposeMaterial(material);
    }
  }

  function disposeMaterial(material: THREE.Material): void {
    const maybeWithMap = material as THREE.Material & { map?: THREE.Texture };
    maybeWithMap.map?.dispose();
    material.dispose();
  }

  function cleanup(): void {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    resizeObserver?.disconnect();
    resizeObserver = null;

    if (fieldGroup) clearGroup(fieldGroup);
    if (edgeGroup) clearGroup(edgeGroup);
    if (nodeGroup) clearGroup(nodeGroup);
    if (labelGroup) clearGroup(labelGroup);

    renderer?.dispose();
    renderer = null;
    scene = null;
    camera = null;
    sceneReady = false;
  }
</script>

<div class="technical-docs-projection-scene" bind:this={hostElement}>
  <canvas
    bind:this={canvasElement}
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:pointercancel={handlePointerUp}
  ></canvas>
  <div class="technical-docs-projection-scene__hint">
    <span>Drag to orbit</span>
    <span>Click node to focus</span>
  </div>
</div>

<style>
  .technical-docs-projection-scene {
    position: relative;
    min-height: 38rem;
    width: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--color-action-primary) 10%, transparent), transparent 36%),
      color-mix(in srgb, var(--color-background-muted) 40%, transparent);
  }

  .technical-docs-projection-scene canvas {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 38rem;
    cursor: grab;
    touch-action: none;
  }

  .technical-docs-projection-scene canvas:active {
    cursor: grabbing;
  }

  .technical-docs-projection-scene__hint {
    position: absolute;
    right: var(--space-8);
    bottom: var(--space-8);
    display: flex;
    gap: var(--space-4);
    color: var(--color-text-muted);
    font-size: 0.68rem;
    pointer-events: none;
  }

  .technical-docs-projection-scene__hint span {
    padding: var(--space-2) var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 68%, transparent);
  }
</style>
