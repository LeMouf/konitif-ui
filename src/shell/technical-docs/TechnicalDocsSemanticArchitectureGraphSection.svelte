<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import {
    createSemanticGraphLayout,
    filterSemanticGraphEdges,
    filterSemanticGraphNodes,
    formatSemanticMetric,
    readAttractorKinds,
    readCollisionScore,
    resolveSemanticGraphNeighbors,
    resolveSemanticNodeTone,
    type GraphNodeKind,
    type SemanticArchitectureGraph,
    type SemanticGraphEdge,
    type SemanticGraphLayoutNode,
    type SemanticGraphNode,
    type SemanticGraphViewMode
  } from './semanticArchitectureGraphModel';

  export let graph: SemanticArchitectureGraph | null = null;
  export let sourceLabel = 'docs/generated/semantic-architecture-graph.json';

  const graphWidth = 760;
  const graphHeight = 420;
  const viewModes: Array<{ id: SemanticGraphViewMode; label: string }> = [
    { id: 'feature', label: 'Feature' },
    { id: 'concept', label: 'Concept' },
    { id: 'package', label: 'Package' }
  ];
  const kindFilters: Array<{ id: GraphNodeKind | 'all'; label: string }> = [
    { id: 'all', label: 'All nodes' },
    { id: 'feature', label: 'Features' },
    { id: 'concept', label: 'Concepts' },
    { id: 'archetype', label: 'Archetypes' },
    { id: 'package', label: 'Packages' },
    { id: 'file', label: 'Files' }
  ];

  let query = '';
  let viewMode: SemanticGraphViewMode = 'feature';
  let kindFilter: GraphNodeKind | 'all' = 'all';
  let focusedNodeId = '';

  $: visibleNodes = graph
    ? filterSemanticGraphNodes(graph, { query, kind: kindFilter, viewMode }).slice(0, 160)
    : [];
  $: visibleEdges = graph ? filterSemanticGraphEdges(graph.edges, visibleNodes).slice(0, 420) : [];
  $: layoutNodes = createSemanticGraphLayout(visibleNodes, graphWidth, graphHeight);
  $: layoutNodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  $: selectedNode = visibleNodes.find((node) => node.id === focusedNodeId) ?? null;
  $: focusedNode = selectedNode ?? visibleNodes[0] ?? null;
  $: neighborIds = focusedNode ? resolveSemanticGraphNeighbors(focusedNode.id, graph?.edges ?? []) : new Set<string>();
  $: focusedEdges = focusedNode ? (graph?.edges ?? []).filter((edge) => edge.source === focusedNode.id || edge.target === focusedNode.id) : [];
  $: topNodes = visibleNodes
    .slice()
    .sort((left, right) => right.centrality - left.centrality || right.weight - left.weight)
    .slice(0, 14);
  $: collisionEdges = (graph?.edges ?? [])
    .filter((edge) => readCollisionScore(edge) > 0)
    .sort((left, right) => readCollisionScore(right) - readCollisionScore(left))
    .slice(0, 8);

  function selectNode(node: SemanticGraphNode): void {
    focusedNodeId = node.id;
  }

  function isNodeDimmed(node: SemanticGraphNode): boolean {
    return Boolean(focusedNode && node.id !== focusedNode.id && !neighborIds.has(node.id));
  }

  function isEdgeVisible(edge: SemanticGraphEdge): boolean {
    if (!focusedNode) return true;

    return edge.source === focusedNode.id || edge.target === focusedNode.id;
  }

  function resolveEdgePath(edge: SemanticGraphEdge): string {
    const source = layoutNodeById.get(edge.source);
    const target = layoutNodeById.get(edge.target);

    if (!source || !target) return '';

    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2 - Math.min(42, Math.max(10, edge.weight * 1.5));

    return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
  }

  function resolveEdgeStroke(edge: SemanticGraphEdge): string {
    switch (edge.kind) {
      case 'depends_on':
        return '#ef4444';
      case 'cooccurs':
        return readCollisionScore(edge) > 0 ? '#f97316' : '#22c55e';
      case 'implements':
        return '#f59e0b';
      case 'projects_to':
        return '#8b5cf6';
      case 'references':
        return '#3b82f6';
      case 'contains':
        return '#94a3b8';
    }
  }

  function formatNodeListValue(values: string[] | undefined): string {
    return values?.slice(0, 6).join(', ') || '-';
  }
</script>

<section class="technical-docs-semantic-graph" aria-label="Semantic architecture graph">
  {#if !graph}
    <div class="technical-docs-semantic-graph__state">
      <WorkbenchIcon icon="docs.registry" label="Semantic graph" />
      <strong>Semantic Architecture Graph unavailable</strong>
      <span>{sourceLabel}</span>
    </div>
  {:else}
    <header class="technical-docs-semantic-graph__header">
      <div>
        <p>Architecture observability</p>
        <h3>Semantic Architecture Graph</h3>
      </div>
      <dl>
        <div>
          <dt>Nodes</dt>
          <dd>{graph.totals?.nodes ?? graph.nodes.length}</dd>
        </div>
        <div>
          <dt>Edges</dt>
          <dd>{graph.totals?.edges ?? graph.edges.length}</dd>
        </div>
        <div>
          <dt>Imports</dt>
          <dd>{graph.totals?.dependencies ?? 0}</dd>
        </div>
      </dl>
    </header>

    <div class="technical-docs-semantic-graph__toolbar" aria-label="Semantic graph filters">
      <label>
        <WorkbenchIcon icon="action.search" label="Search" />
        <input bind:value={query} type="search" placeholder="Search node, package, concept, attractor..." />
      </label>

      <div class="technical-docs-semantic-graph__segments" aria-label="Graph view mode">
        {#each viewModes as mode (mode.id)}
          <button
            type="button"
            class:technical-docs-semantic-graph__segment--active={viewMode === mode.id}
            on:click={() => (viewMode = mode.id)}
          >
            {mode.label}
          </button>
        {/each}
      </div>

      <select bind:value={kindFilter} aria-label="Filter node kind">
        {#each kindFilters as filter (filter.id)}
          <option value={filter.id}>{filter.label}</option>
        {/each}
      </select>

      <span>{visibleNodes.length} nodes</span>
    </div>

    <div class="technical-docs-semantic-graph__body">
      <main class="technical-docs-semantic-graph__canvas" aria-label="Semantic architecture graph canvas">
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="Semantic graph">
          <g class="technical-docs-semantic-graph__edges">
            {#each visibleEdges as edge (edge.id)}
              {#if resolveEdgePath(edge)}
                <path
                  d={resolveEdgePath(edge)}
                  stroke={resolveEdgeStroke(edge)}
                  stroke-width={Math.max(0.7, Math.min(4, 0.6 + edge.weight / 8))}
                  opacity={isEdgeVisible(edge) ? 0.44 : 0.06}
                  fill="none"
                />
              {/if}
            {/each}
          </g>

          <g class="technical-docs-semantic-graph__nodes">
            {#each layoutNodes as node (node.id)}
              <g
                role="button"
                tabindex="0"
                aria-label={node.label}
                transform={`translate(${node.x}, ${node.y})`}
                class:technical-docs-semantic-graph__node--focused={focusedNode?.id === node.id}
                class:technical-docs-semantic-graph__node--dimmed={isNodeDimmed(node)}
                on:click={() => selectNode(node)}
                on:keydown={(event) => event.key === 'Enter' && selectNode(node)}
              >
                <circle
                  r={node.radius}
                  fill={resolveSemanticNodeTone(node.kind)}
                  opacity={0.82}
                />
                {#if node.centrality > 0.42 || focusedNode?.id === node.id}
                  <text x={node.radius + 4} y="4">{node.label}</text>
                {/if}
              </g>
            {/each}
          </g>
        </svg>
      </main>

      <aside class="technical-docs-semantic-graph__inspector" aria-label="Semantic graph inspector">
        {#if focusedNode}
          <header>
            <p>{focusedNode.kind}</p>
            <h4>{focusedNode.label}</h4>
            <span>{focusedNode.id}</span>
          </header>

          <div class="technical-docs-semantic-graph__metrics" aria-label="Node metrics">
            <div>
              <strong>{formatSemanticMetric(focusedNode.centrality)}</strong>
              <span>centrality</span>
            </div>
            <div>
              <strong>{formatSemanticMetric(focusedNode.entropy)}</strong>
              <span>entropy</span>
            </div>
            <div>
              <strong>{formatSemanticMetric(focusedNode.cohesion)}</strong>
              <span>cohesion</span>
            </div>
            <div>
              <strong>{focusedNode.weight}</strong>
              <span>weight</span>
            </div>
          </div>

          <section>
            <h5>Attractors</h5>
            <div class="technical-docs-semantic-graph__chips">
              {#each readAttractorKinds(focusedNode) as attractor (attractor)}
                <span>{attractor}</span>
              {:else}
                <span>none</span>
              {/each}
            </div>
          </section>

          <section>
            <h5>Concepts</h5>
            <p>{formatNodeListValue(focusedNode.concepts)}</p>
          </section>

          <section>
            <h5>Archetypes</h5>
            <p>{formatNodeListValue(focusedNode.archetypes)}</p>
          </section>

          <section>
            <h5>Neighbor edges</h5>
            <div class="technical-docs-semantic-graph__edge-list">
              {#each focusedEdges.slice(0, 10) as edge (edge.id)}
                <article>
                  <strong>{edge.kind}</strong>
                  <span>{edge.source === focusedNode.id ? edge.target : edge.source}</span>
                  <em>weight {edge.weight} · confidence {formatSemanticMetric(edge.confidence)}</em>
                </article>
              {/each}
            </div>
          </section>
        {/if}
      </aside>
    </div>

    <div class="technical-docs-semantic-graph__lower">
      <section class="technical-docs-semantic-graph__rank">
        <h4>Centrality Heatmap</h4>
        {#each topNodes as node (node.id)}
          <button type="button" on:click={() => selectNode(node)}>
            <span style={`--semantic-score: ${Math.max(4, Math.round(node.centrality * 100))}%`}></span>
            <strong>{node.label}</strong>
            <em>{node.kind} · {formatSemanticMetric(node.centrality)}</em>
          </button>
        {/each}
      </section>

      <section class="technical-docs-semantic-graph__collisions">
        <h4>Conceptual Collisions</h4>
        {#each collisionEdges as edge (edge.id)}
          <article>
            <strong>{edge.sharedConcepts?.join(' + ') ?? edge.id}</strong>
            <span>score {formatSemanticMetric(readCollisionScore(edge))} · weight {edge.weight}</span>
            <em>{edge.sharedFiles?.slice(0, 2).join(', ')}</em>
          </article>
        {:else}
          <p>No collision edge detected.</p>
        {/each}
      </section>
    </div>
  {/if}
</section>

<style>
  .technical-docs-semantic-graph {
    display: grid;
    align-content: start;
    gap: var(--space-8);
    min-width: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-action-primary) 7%, transparent), transparent 24rem),
      color-mix(in srgb, var(--color-background-surface) 58%, transparent);
  }

  .technical-docs-semantic-graph__header,
  .technical-docs-semantic-graph__toolbar,
  .technical-docs-semantic-graph__body,
  .technical-docs-semantic-graph__lower {
    min-width: 0;
  }

  .technical-docs-semantic-graph__header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .technical-docs-semantic-graph__header p,
  .technical-docs-semantic-graph__inspector p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .technical-docs-semantic-graph__header h3,
  .technical-docs-semantic-graph__inspector h4 {
    margin: var(--space-2) 0 0;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .technical-docs-semantic-graph__header dl {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-6);
    margin: 0;
  }

  .technical-docs-semantic-graph__header dl div,
  .technical-docs-semantic-graph__metrics div {
    min-width: 5.5rem;
    padding: var(--space-5) var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  }

  .technical-docs-semantic-graph__header dt,
  .technical-docs-semantic-graph__metrics span {
    color: var(--color-text-muted);
    font-size: 0.65rem;
  }

  .technical-docs-semantic-graph__header dd,
  .technical-docs-semantic-graph__metrics strong {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 0.82rem;
    font-weight: 700;
  }

  .technical-docs-semantic-graph__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-6);
  }

  .technical-docs-semantic-graph__toolbar label {
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

  .technical-docs-semantic-graph__toolbar input,
  .technical-docs-semantic-graph__toolbar select {
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.75rem;
    outline: 0;
  }

  .technical-docs-semantic-graph__toolbar select {
    height: 2.2rem;
    padding: 0 var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: var(--color-background-surface);
  }

  .technical-docs-semantic-graph__toolbar > span {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
  }

  .technical-docs-semantic-graph__segments {
    display: flex;
    gap: var(--space-3);
  }

  .technical-docs-semantic-graph__segments button {
    height: 2.2rem;
    padding: 0 var(--space-7);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 68%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .technical-docs-semantic-graph__segment--active {
    border-color: color-mix(in srgb, var(--color-action-primary) 72%, var(--color-border-subtle)) !important;
    color: var(--color-text-primary) !important;
  }

  .technical-docs-semantic-graph__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem);
    gap: var(--space-8);
  }

  .technical-docs-semantic-graph__canvas,
  .technical-docs-semantic-graph__inspector,
  .technical-docs-semantic-graph__rank,
  .technical-docs-semantic-graph__collisions {
    min-width: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 76%, transparent);
  }

  .technical-docs-semantic-graph__canvas {
    overflow: auto;
  }

  .technical-docs-semantic-graph__canvas svg {
    display: block;
    min-width: 46rem;
    width: 100%;
    height: auto;
  }

  .technical-docs-semantic-graph__nodes g {
    cursor: pointer;
    outline: none;
  }

  .technical-docs-semantic-graph__nodes text {
    fill: var(--color-text-primary);
    font-size: 0.65rem;
    paint-order: stroke;
    stroke: var(--color-background-surface);
    stroke-width: 3px;
  }

  .technical-docs-semantic-graph__node--focused circle {
    stroke: var(--color-text-primary);
    stroke-width: 2.4;
  }

  .technical-docs-semantic-graph__node--dimmed {
    opacity: 0.22;
  }

  .technical-docs-semantic-graph__inspector {
    display: grid;
    gap: var(--space-7);
    align-content: start;
    padding: var(--space-8);
  }

  .technical-docs-semantic-graph__inspector header span {
    display: block;
    margin-top: var(--space-3);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    overflow-wrap: anywhere;
  }

  .technical-docs-semantic-graph__metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }

  .technical-docs-semantic-graph__inspector h5,
  .technical-docs-semantic-graph__rank h4,
  .technical-docs-semantic-graph__collisions h4 {
    margin: 0 0 var(--space-4);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .technical-docs-semantic-graph__inspector section p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    line-height: 1.45;
    text-transform: none;
  }

  .technical-docs-semantic-graph__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .technical-docs-semantic-graph__chips span {
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-action-primary) 16%, transparent);
    color: var(--color-text-primary);
    font-size: 0.68rem;
  }

  .technical-docs-semantic-graph__edge-list {
    display: grid;
    gap: var(--space-3);
    max-height: 15rem;
    overflow: auto;
  }

  .technical-docs-semantic-graph__edge-list article,
  .technical-docs-semantic-graph__collisions article {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 42%, transparent);
  }

  .technical-docs-semantic-graph__edge-list span,
  .technical-docs-semantic-graph__edge-list em,
  .technical-docs-semantic-graph__collisions span,
  .technical-docs-semantic-graph__collisions em {
    color: var(--color-text-muted);
    font-size: 0.68rem;
    overflow-wrap: anywhere;
  }

  .technical-docs-semantic-graph__lower {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(17rem, 24rem);
    gap: var(--space-8);
  }

  .technical-docs-semantic-graph__rank,
  .technical-docs-semantic-graph__collisions {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    padding: var(--space-8);
  }

  .technical-docs-semantic-graph__rank button {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-4);
    align-items: center;
    min-width: 0;
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    overflow: hidden;
    cursor: pointer;
  }

  .technical-docs-semantic-graph__rank button > span {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--semantic-score);
    background: color-mix(in srgb, var(--color-action-primary) 18%, transparent);
    pointer-events: none;
  }

  .technical-docs-semantic-graph__rank strong,
  .technical-docs-semantic-graph__rank em {
    position: relative;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.72rem;
  }

  .technical-docs-semantic-graph__rank em {
    color: var(--color-text-muted);
    font-style: normal;
  }

  .technical-docs-semantic-graph__state {
    display: grid;
    place-items: center;
    gap: var(--space-4);
    min-height: 18rem;
    padding: var(--space-10);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-small);
    color: var(--color-text-secondary);
    text-align: center;
  }

  @media (max-width: 1180px) {
    .technical-docs-semantic-graph__body,
    .technical-docs-semantic-graph__lower {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
