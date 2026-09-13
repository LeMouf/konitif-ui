<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import TechnicalDocsArchitectureProjectionScene3D from './TechnicalDocsArchitectureProjectionScene3D.svelte';
  import { createArchitecturePerception } from './architecturePerceptionEngine';
  import {
    detailLevels,
    perceptionModes,
    type DetailLevel,
    type PerceptionMode
  } from './architecturePerceptionModel';
  import {
    createAllArchitectureProjections
  } from './architectureProjectionEngine';
  import {
    formatProjectionMetric,
    type ArchitectureProjectionDocument,
    type ProjectionKind,
    type ProjectionNodeVisual
  } from './architectureProjectionModel';
  import {
    readAttractorKinds,
    type GraphNodeKind,
    type SemanticArchitectureGraph,
    type SemanticGraphNode
  } from './semanticArchitectureGraphModel';

  export let graph: SemanticArchitectureGraph;
  export let projectionDocument: ArchitectureProjectionDocument | null = null;
  export let sourceLabel = 'docs/generated/architecture-projections.json';

  const kindOptions: Array<{ id: GraphNodeKind | 'all'; label: string }> = [
    { id: 'all', label: 'All nodes' },
    { id: 'feature', label: 'Features' },
    { id: 'concept', label: 'Concepts' },
    { id: 'archetype', label: 'Archetypes' },
    { id: 'package', label: 'Packages' },
    { id: 'file', label: 'Files' }
  ];

  let selectedProjectionKind: ProjectionKind = 'semantic';
  let query = '';
  let kindFilter: GraphNodeKind | 'all' = 'all';
  let focusedNodeId = '';
  let showEdges = true;
  let showLabels = true;
  let perceptionMode: PerceptionMode = 'overview';
  let detailLevel: DetailLevel = 'macro';
  let edgeBudgetPercent = 10;
  let showClusters = true;
  let showAttractors = true;
  let showLocalCollisions = true;
  let focusMode = false;

  $: projections = projectionDocument?.projections?.length
    ? projectionDocument.projections
    : createAllArchitectureProjections(graph);
  $: selectedProjection = projections.find((projection) => projection.kind === selectedProjectionKind) ?? projections[0] ?? null;
  $: nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  $: visualByNodeId = new Map((selectedProjection?.nodeVisuals ?? []).map((visual) => [visual.nodeId, visual]));
  $: effectivePerceptionMode = focusMode ? 'focus' : perceptionMode;
  $: perception = selectedProjection
    ? createArchitecturePerception({
        graph,
        projection: selectedProjection,
        mode: effectivePerceptionMode,
        detailLevel,
        focusNodeId: focusedNodeId || undefined,
        searchQuery: query,
        visibleNodeKinds: kindFilter === 'all' ? undefined : [kindFilter],
        showLabels,
        showEdges,
        edgeBudgetRatio: edgeBudgetPercent / 100
      })
    : null;
  $: perceivedNodeById = new Map((perception?.nodeVisibility ?? []).map((node) => [node.nodeId, node]));
  $: visibleNodes = graph.nodes.filter((node) => perceivedNodeById.get(node.id)?.visible).slice(0, 260);
  $: focusedNode = nodeById.get(focusedNodeId) ?? visibleNodes[0] ?? null;
  $: focusedEdges = focusedNode ? graph.edges.filter((edge) => edge.source === focusedNode.id || edge.target === focusedNode.id).slice(0, 12) : [];
  $: topProjectionNodes = visibleNodes
    .slice()
    .sort((left, right) => (perceivedNodeById.get(right.id)?.priority ?? 0) - (perceivedNodeById.get(left.id)?.priority ?? 0))
    .slice(0, 12);

  function selectNode(node: SemanticGraphNode): void {
    focusedNodeId = node.id;
  }

  function selectNodeById(nodeId: string): void {
    focusedNodeId = nodeId;
    focusMode = true;
  }

  function resolveNodeVisual(nodeId: string): ProjectionNodeVisual {
    return visualByNodeId.get(nodeId) ?? {
      nodeId,
      radius: 5,
      intensity: 0,
      colorKey: 'default',
      halo: 'none',
      labelOpacity: 0.2
    };
  }

  function formatList(values: string[] | undefined): string {
    return values?.slice(0, 8).join(', ') || '-';
  }
</script>

<section class="technical-docs-projection" aria-label="Architecture Projection Engine">
  <header class="technical-docs-projection__header">
    <div>
      <p>Projection engine</p>
      <h3>Architecture Projection Engine</h3>
    </div>
    {#if selectedProjection}
      <dl>
        <div>
          <dt>Projection</dt>
          <dd>{selectedProjection.label}</dd>
        </div>
        <div>
          <dt>Nodes</dt>
          <dd>{selectedProjection.metrics.nodeCount}</dd>
        </div>
        <div>
          <dt>Avg cohesion</dt>
          <dd>{formatProjectionMetric(selectedProjection.metrics.averageCohesion)}</dd>
        </div>
      </dl>
    {/if}
  </header>

  <div class="technical-docs-projection__toolbar" aria-label="Projection controls">
    <label>
      <WorkbenchIcon icon="action.search" label="Search" />
      <input bind:value={query} type="search" placeholder="Search node, concept, package, attractor..." />
    </label>

    <select bind:value={selectedProjectionKind} aria-label="Projection kind">
      {#each projections as projection (projection.id)}
        <option value={projection.kind}>{projection.label}</option>
      {/each}
    </select>

    <select bind:value={kindFilter} aria-label="Node kind">
      {#each kindOptions as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </select>

    <select bind:value={perceptionMode} aria-label="Perception mode" disabled={focusMode}>
      {#each perceptionModes as mode (mode.id)}
        <option value={mode.id}>{mode.label}</option>
      {/each}
    </select>

    <select bind:value={detailLevel} aria-label="Detail level">
      {#each detailLevels as level (level.id)}
        <option value={level.id}>{level.label}</option>
      {/each}
    </select>

    <label class="technical-docs-projection__range">
      <span>Edges {edgeBudgetPercent}%</span>
      <input bind:value={edgeBudgetPercent} type="range" min="4" max="100" step="1" />
    </label>

    <button type="button" class:technical-docs-projection__toggle--active={showEdges} on:click={() => (showEdges = !showEdges)}>
      Edges
    </button>
    <button type="button" class:technical-docs-projection__toggle--active={showLabels} on:click={() => (showLabels = !showLabels)}>
      Labels
    </button>
    <button type="button" class:technical-docs-projection__toggle--active={showClusters} on:click={() => (showClusters = !showClusters)}>
      Clusters
    </button>
    <button type="button" class:technical-docs-projection__toggle--active={showAttractors} on:click={() => (showAttractors = !showAttractors)}>
      Attractors
    </button>
    <button type="button" class:technical-docs-projection__toggle--active={showLocalCollisions} on:click={() => (showLocalCollisions = !showLocalCollisions)}>
      Collisions
    </button>
    <button type="button" class:technical-docs-projection__toggle--active={focusMode} on:click={() => (focusMode = !focusMode)}>
      Focus
    </button>
  </div>

  {#if selectedProjection && perception}
    <div class="technical-docs-projection__summary">
      <p>{selectedProjection.description}</p>
      <span>
        Nodes {perception.metrics.visibleNodeCount} / {graph.nodes.length}
        · Edges {perception.metrics.visibleEdgeCount} / {graph.edges.length}
        · Hidden {perception.metrics.hiddenEdgeCount}
        · Clusters {perception.metrics.clusterCount}
        · Attractors {perception.metrics.attractorCount}
        · Collisions {perception.metrics.collisionCount}
        · {sourceLabel}
      </span>
    </div>

    <div class="technical-docs-projection__body">
      <main class="technical-docs-projection__scene" aria-label="Projection map">
        <TechnicalDocsArchitectureProjectionScene3D
          {graph}
          projection={selectedProjection}
          {perception}
          {focusedNodeId}
          {showClusters}
          {showAttractors}
          showCollisions={showLocalCollisions}
          on:select={(event) => selectNodeById(event.detail.nodeId)}
        />
      </main>

      <aside class="technical-docs-projection__detail" aria-label="Projection detail">
        {#if focusedNode}
          {@const focusedVisual = resolveNodeVisual(focusedNode.id)}
          <header>
            <p>{focusedNode.kind}</p>
            <h4>{focusedNode.label}</h4>
            <span>{focusedNode.id}</span>
          </header>

          <div class="technical-docs-projection__metrics">
            <div>
              <strong>{formatProjectionMetric(focusedNode.entropy)}</strong>
              <span>entropy</span>
            </div>
            <div>
              <strong>{formatProjectionMetric(focusedNode.cohesion)}</strong>
              <span>cohesion</span>
            </div>
            <div>
              <strong>{formatProjectionMetric(focusedNode.centrality)}</strong>
              <span>centrality</span>
            </div>
            <div>
              <strong>{formatProjectionMetric(focusedVisual.intensity)}</strong>
              <span>projection</span>
            </div>
          </div>

          <section>
            <h5>Attractors</h5>
            <div class="technical-docs-projection__chips">
              {#each readAttractorKinds(focusedNode) as attractor (attractor)}
                <span>{attractor}</span>
              {:else}
                <span>none</span>
              {/each}
            </div>
          </section>

          <section>
            <h5>Concepts</h5>
            <p>{formatList(focusedNode.concepts)}</p>
          </section>

          <section>
            <h5>Packages</h5>
            <p>{formatList(focusedNode.packageNames)}</p>
          </section>

          <section>
            <h5>Features</h5>
            <p>{formatList(focusedNode.featureIds)}</p>
          </section>

          <section>
            <h5>Neighbor edges</h5>
            <div class="technical-docs-projection__edge-list">
              {#each focusedEdges as edge (edge.id)}
                <article>
                  <strong>{edge.kind}</strong>
                  <span>{edge.source === focusedNode.id ? edge.target : edge.source}</span>
                  <em>weight {edge.weight} · confidence {formatProjectionMetric(edge.confidence)}</em>
                </article>
              {/each}
            </div>
          </section>
        {/if}
      </aside>
    </div>

    <section class="technical-docs-projection__rank" aria-label="Projection intensity heatmap">
      <h4>Projection Heatmap</h4>
      {#each topProjectionNodes as node (node.id)}
        {@const visual = resolveNodeVisual(node.id)}
        <button type="button" on:click={() => selectNode(node)}>
          <span style={`--projection-score: ${Math.max(4, Math.round(visual.intensity * 100))}%`}></span>
          <strong>{node.label}</strong>
          <em>{node.kind} · {formatProjectionMetric(visual.intensity)}</em>
        </button>
      {/each}
    </section>
  {/if}
</section>

<style>
  .technical-docs-projection {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-action-primary) 7%, transparent), transparent 24rem),
      color-mix(in srgb, var(--color-background-surface) 58%, transparent);
  }

  .technical-docs-projection__header,
  .technical-docs-projection__toolbar,
  .technical-docs-projection__body,
  .technical-docs-projection__summary {
    min-width: 0;
  }

  .technical-docs-projection__header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .technical-docs-projection__header p,
  .technical-docs-projection__detail p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .technical-docs-projection__header h3,
  .technical-docs-projection__detail h4 {
    margin: var(--space-2) 0 0;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .technical-docs-projection__header dl {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-6);
    margin: 0;
  }

  .technical-docs-projection__header dl div,
  .technical-docs-projection__metrics div {
    min-width: 5.5rem;
    padding: var(--space-5) var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-projection__header dt,
  .technical-docs-projection__metrics span {
    color: var(--color-text-muted);
    font-size: 0.65rem;
  }

  .technical-docs-projection__header dd,
  .technical-docs-projection__metrics strong {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .technical-docs-projection__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
  }

  .technical-docs-projection__toolbar label {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    flex: 1 1 18rem;
    height: 2.2rem;
    padding: 0 var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
  }

  .technical-docs-projection__toolbar input,
  .technical-docs-projection__toolbar select {
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.75rem;
    outline: 0;
  }

  .technical-docs-projection__toolbar select,
  .technical-docs-projection__toolbar button {
    height: 2.2rem;
    padding: 0 var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.72rem;
  }

  .technical-docs-projection__toolbar button {
    cursor: pointer;
  }

  .technical-docs-projection__toggle--active {
    border-color: color-mix(in srgb, var(--color-action-primary) 72%, var(--color-border-subtle)) !important;
    color: var(--color-text-primary) !important;
  }

  .technical-docs-projection__summary {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
  }

  .technical-docs-projection__summary p {
    margin: 0;
  }

  .technical-docs-projection__summary span {
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .technical-docs-projection__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem);
    gap: var(--space-8);
  }

  .technical-docs-projection__scene,
  .technical-docs-projection__detail,
  .technical-docs-projection__rank {
    min-width: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 76%, transparent);
  }

  .technical-docs-projection__scene {
    overflow: hidden;
  }

  .technical-docs-projection__detail {
    display: grid;
    align-content: start;
    gap: var(--space-7);
    padding: var(--space-8);
  }

  .technical-docs-projection__detail header span {
    display: block;
    margin-top: var(--space-3);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    overflow-wrap: anywhere;
  }

  .technical-docs-projection__metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }

  .technical-docs-projection__detail h5,
  .technical-docs-projection__rank h4 {
    margin: 0 0 var(--space-4);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .technical-docs-projection__detail section p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    line-height: 1.45;
    text-transform: none;
  }

  .technical-docs-projection__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .technical-docs-projection__chips span {
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-action-primary) 16%, transparent);
    color: var(--color-text-primary);
    font-size: 0.68rem;
  }

  .technical-docs-projection__edge-list {
    display: grid;
    gap: var(--space-3);
    max-height: 15rem;
    overflow: auto;
  }

  .technical-docs-projection__edge-list article {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 42%, transparent);
  }

  .technical-docs-projection__edge-list span,
  .technical-docs-projection__edge-list em {
    color: var(--color-text-muted);
    font-size: 0.68rem;
    overflow-wrap: anywhere;
  }

  .technical-docs-projection__rank {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-8);
  }

  .technical-docs-projection__rank button {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    overflow: hidden;
    cursor: pointer;
  }

  .technical-docs-projection__rank button > span {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--projection-score);
    background: color-mix(in srgb, var(--color-action-primary) 18%, transparent);
    pointer-events: none;
  }

  .technical-docs-projection__rank strong,
  .technical-docs-projection__rank em {
    position: relative;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.72rem;
  }

  .technical-docs-projection__rank em {
    color: var(--color-text-muted);
    font-style: normal;
  }

  @media (max-width: 1180px) {
    .technical-docs-projection__body {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
