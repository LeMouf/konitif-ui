<script lang="ts">
  import type { DesignSystemDiscoveryEntity, DesignSystemDiscoveryProjection } from '../designSystemEntityDiscovery';
  import type { DesignSystemThemeDraftStatus } from '../designSystemThemeDraft';
  import type {
    DesignSystemFeatureImpact,
    DesignSystemThemeCategory,
    DesignSystemThemeContractSummary,
    DesignSystemThemeDocument,
    DesignSystemThemeGraph,
    DesignSystemThemeGraphCategory,
    DesignSystemThemeGraphNode,
    DesignSystemThemeInspection,
    DesignSystemThemeRegistry,
    DesignSystemThemeSyncPreview
  } from '../designSystemThemeCatalog';
  import TechnicalDocsDesignContractSection from './TechnicalDocsDesignContractSection.svelte';
  import TechnicalDocsDesignGraphHeader from './TechnicalDocsDesignGraphHeader.svelte';
  import TechnicalDocsDesignStructureRegion from './TechnicalDocsDesignStructureRegion.svelte';

  type Translate = (key: string, options?: { default?: string }) => string;

  type DesignPreviewCardKind =
    | 'theme'
    | 'foundation'
    | 'token'
    | 'icon'
    | 'primitive'
    | 'form'
    | 'component'
    | 'card'
    | 'layout'
    | 'navigation'
    | 'data'
    | 'overlay'
    | 'feedback'
    | 'graph'
    | 'editor'
    | 'surface'
    | 'pattern'
    | 'manager';

  type DesignCategorySummary = DesignSystemThemeGraphCategory & {
    status: string;
    tokens: number;
    cssVariables: number;
    totalNodes: number;
  };

  type DesignConstructionLayer = {
    id: 'atoms' | 'molecules' | 'organisms' | 'templates' | 'pages';
    label: string;
    title: string;
    summary: string;
    items: string[];
    status: string;
  };

  type DesignThemeRevealLayer = {
    mode: 'light' | 'dark';
    label: string;
    style: string;
  };

  export let t: Translate;
  export let designSystemThemeGraph: DesignSystemThemeGraph;
  export let featureDesignImpacts: DesignSystemFeatureImpact[];
  export let designSystemDiscoveryProjection: DesignSystemDiscoveryProjection;
  export let designSystemThemeRegistry: DesignSystemThemeRegistry;
  export let designSystemContract: DesignSystemThemeContractSummary;
  export let designSystemThemeDocument: DesignSystemThemeDocument;
  export let designSystemThemeSyncPreview: DesignSystemThemeSyncPreview;
  export let designDraftStatus: DesignSystemThemeDraftStatus;
  export let designDraftPreviewText: string;
  export let previewThemeStyle: string;
  export let designSearchQuery: string;
  export let designSearchResultCount: number;
  export let designCategorySummaries: DesignCategorySummary[];
  export let activeDesignCategory: DesignSystemThemeCategory;
  export let activeDesignCategoryEntry: DesignSystemThemeGraphCategory | null;
  export let activeDesignCategoryNodes: DesignSystemThemeGraphNode[];
  export let selectedDesignNode: DesignSystemThemeGraphNode | null;
  export let selectedDesignInspection: DesignSystemThemeInspection | null;
  export let relatedDiscoveryEntities: DesignSystemDiscoveryEntity[];
  export let selectedVisualElementId: string | null;
  export let selectedDesignConstructionLayers: DesignConstructionLayer[];
  export let designThemeRevealRatio: number;
  export let designThemeRevealElement: HTMLDivElement | null = null;
  export let isDesignThemeRevealDragging: boolean;
  export let designThemeRevealLayers: DesignThemeRevealLayer[];
  export let designDraftValues: Record<string, string>;
  export let handleDesignSearchInput: (event: Event) => void;
  export let clearDesignSearch: () => void;
  export let selectDesignCategory: (category: DesignSystemThemeCategory) => void;
  export let isDesignNodeHighlighted: (node: DesignSystemThemeGraphNode) => boolean;
  export let selectDesignNode: (node: DesignSystemThemeGraphNode) => void;
  export let resolvePreviewCardKind: (category: DesignSystemThemeCategory) => DesignPreviewCardKind;
  export let selectVisualElement: (elementId: string, nodeIds: string[]) => void;
  export let resolvePreviewThemeVariableValue: (
    variable: string,
    draftValues?: Record<string, string>,
    mode?: string
  ) => string;
  export let isPreviewElementHighlighted: (nodeIds: string[]) => boolean;
  export let summarizeDesignLayerItems: (items: string[], fallback: string) => string;
  export let handleDesignThemeRevealPointerDown: (event: PointerEvent) => void;
  export let handleDesignThemeRevealKeydown: (event: KeyboardEvent) => void;
  export let undoDesignDraft: () => void;
  export let redoDesignDraft: () => void;
  export let handleDesignDraftInput: (variable: string, event: Event) => void;
  export let resetDesignDraftValue: (variable: string) => void;
  export let resolveThemeVariableValue: (variable: string, draftValues?: Record<string, string>) => string;
  export let resolveThemeVariableTargetValue: (variable: string) => string;
</script>

<section class="technical-docs-view__design" aria-labelledby="technical-docs-design-title">
  <TechnicalDocsDesignGraphHeader
    {t}
    {designSystemThemeGraph}
    {featureDesignImpacts}
    {designSystemDiscoveryProjection}
  />

  <TechnicalDocsDesignContractSection
    {designSystemDiscoveryProjection}
    {designSystemThemeRegistry}
    {designSystemContract}
    {designSystemThemeDocument}
    {designSystemThemeSyncPreview}
    {designDraftStatus}
    {designDraftPreviewText}
  />

  <div class="technical-docs-view__design-workspace" style={previewThemeStyle}>
    <TechnicalDocsDesignStructureRegion
      {t}
      {designSystemThemeGraph}
      {designSearchQuery}
      {designSearchResultCount}
      {designCategorySummaries}
      {activeDesignCategory}
      {activeDesignCategoryEntry}
      {activeDesignCategoryNodes}
      {selectedDesignNode}
      {handleDesignSearchInput}
      {clearDesignSearch}
      {selectDesignCategory}
      {isDesignNodeHighlighted}
      {selectDesignNode}
    />

    <section class="technical-docs-view__design-preview" aria-label={t('ui.shell.docs.design.preview', { default: 'Visual preview' })}>
      <header class="technical-docs-view__design-panel-head">
        <span>Visual Preview</span>
        <strong>{activeDesignCategoryEntry?.label ?? 'Context'}</strong>
      </header>

      <div class="technical-docs-view__preview-stage">
        <section
          class="technical-docs-view__preview-section technical-docs-view__selected-detail"
          style={`--theme-reveal-position: ${designThemeRevealRatio}%;`}
        >
          <header class="technical-docs-view__selected-detail-head">
            <div>
              <span>Selected Element</span>
              <h4>{selectedDesignNode?.title ?? activeDesignCategoryEntry?.label ?? 'Nomenclature'}</h4>
              <p>{selectedDesignNode?.summary ?? 'Navigate categories and inspect the design-system structure.'}</p>
            </div>
            <span data-status={selectedDesignNode?.status ?? 'synced'}>{selectedDesignNode?.status ?? 'synced'}</span>
          </header>

          <div
            bind:this={designThemeRevealElement}
            class:technical-docs-view__theme-reveal--dragging={isDesignThemeRevealDragging}
            class="technical-docs-view__theme-reveal"
            style={`--theme-reveal-position: ${designThemeRevealRatio}%;`}
          >
            {#each designThemeRevealLayers as revealLayer (revealLayer.mode)}
              <div
                class:technical-docs-view__theme-reveal-layer--dark={revealLayer.mode === 'dark'}
                class="technical-docs-view__theme-reveal-layer"
                style={revealLayer.style}
                aria-hidden={revealLayer.mode === 'dark'}
                inert={revealLayer.mode === 'dark'}
              >
                <div class="technical-docs-view__selected-detail-body">
                  <div class="technical-docs-view__selected-demo">
                    <div class="technical-docs-view__selected-demo-toolbar">
                      <strong>{activeDesignCategoryEntry?.label ?? activeDesignCategory}</strong>
                      <code>{selectedDesignNode?.id ?? activeDesignCategory}</code>
                    </div>

                    <div class="technical-docs-view__selected-demo-art" data-preview-kind={resolvePreviewCardKind(activeDesignCategory)}>
                      {#if activeDesignCategory === 'forms'}
                        <label><span>Name</span><input readonly value={selectedDesignNode?.title ?? 'Workbench Theme'} /></label>
                        <label><span>Mode</span><select><option>{revealLayer.label}</option></select></label>
                        <button type="button" on:click={() => selectVisualElement('situation.forms.action', selectedDesignNode ? [selectedDesignNode.id] : ['form.text-input'])}>Apply draft</button>
                        <div class="technical-docs-view__selected-demo-switch"><span></span><i></i></div>
                      {:else if activeDesignCategory === 'theme' || activeDesignCategory === 'layout' || activeDesignCategory === 'workbenchSurfaces'}
                        <div class="technical-docs-view__selected-demo-shell">
                          <aside></aside>
                          <main>
                            <nav></nav>
                            <section></section>
                            <footer></footer>
                          </main>
                          <aside></aside>
                        </div>
                      {:else if activeDesignCategory === 'graphs'}
                        <div class="technical-docs-view__selected-demo-graph">
                          <button type="button" on:click={() => selectVisualElement('situation.graph.node-a', ['graph.node', 'graph.canvas'])}>Node</button>
                          <span></span>
                          <button type="button" on:click={() => selectVisualElement('situation.graph.node-b', ['graph.node', 'graph.edge'])}>Node</button>
                        </div>
                      {:else if activeDesignCategory === 'overlays' || activeDesignCategory === 'feedback'}
                        <div class="technical-docs-view__selected-demo-overlay">
                          <span></span>
                          <article>
                            <strong>{activeDesignCategory === 'overlays' ? 'Modal Preview' : 'Sync complete'}</strong>
                            <em></em>
                            <button type="button">Confirm</button>
                          </article>
                        </div>
                      {:else if activeDesignCategory === 'themeManager'}
                        <div class="technical-docs-view__selected-demo-flow">
                          <span>Source</span><i></i><span>Mapping</span><i></i><span>Targets</span>
                        </div>
                      {:else}
                        <div class="technical-docs-view__selected-demo-stack">
                          <div class="technical-docs-view__selected-demo-swatches">
                            <i style={`background: ${resolvePreviewThemeVariableValue('--color-action-primary', revealLayer.mode === 'light' ? {} : designDraftValues, revealLayer.mode)}`}></i>
                            <i style={`background: ${resolvePreviewThemeVariableValue('--color-background-surface', revealLayer.mode === 'light' ? {} : designDraftValues, revealLayer.mode)}`}></i>
                            <i style={`border-radius: ${resolvePreviewThemeVariableValue('--radius-medium', revealLayer.mode === 'light' ? {} : designDraftValues, revealLayer.mode)}`}></i>
                          </div>
                          <section>
                            <b></b><b></b><b></b>
                            <button type="button">Primary action</button>
                          </section>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <div class="technical-docs-view__construction-flow" aria-label={`${revealLayer.label} atomic construction flow`}>
                    {#each selectedDesignConstructionLayers as layer (layer.id)}
                      <button
                        type="button"
                        class:technical-docs-view__preview-hit--active={selectedVisualElementId === `construction.${layer.id}`}
                        class:technical-docs-view__preview-hit--related={layer.items.some((item) => isPreviewElementHighlighted([item]))}
                        class="technical-docs-view__preview-hit technical-docs-view__construction-step"
                        on:click={() => selectVisualElement(`construction.${layer.id}`, layer.items)}
                      >
                        <span data-status={layer.status}>{layer.status}</span>
                        <strong>{layer.label}</strong>
                        <em>{layer.title}</em>
                        <code>{summarizeDesignLayerItems(layer.items, 'No mapped item')}</code>
                      </button>
                    {/each}
                  </div>
                </div>
              </div>
            {/each}

            <button
              type="button"
              class="technical-docs-view__theme-reveal-handle"
              role="slider"
              aria-label="Adjust dark and light preview split"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(designThemeRevealRatio)}
              on:pointerdown={handleDesignThemeRevealPointerDown}
              on:keydown={handleDesignThemeRevealKeydown}
            >
              <span></span>
            </button>
          </div>
        </section>
      </div>
    </section>

    <aside class="technical-docs-view__design-inspector" aria-label={t('ui.shell.docs.design.inspector', { default: 'Inspector' })}>
      {#if selectedDesignInspection}
        <header class="technical-docs-view__design-panel-head">
          <span>Inspector</span>
          <strong data-status={selectedDesignInspection.status}>{selectedDesignInspection.status}</strong>
        </header>

        <div class="technical-docs-view__inspector-title">
          <span>{selectedDesignInspection.element?.category ?? 'visual'}</span>
          <strong>{selectedDesignInspection.element?.title ?? selectedVisualElementId ?? selectedDesignInspection.id}</strong>
          <code>{selectedDesignInspection.id}</code>
        </div>

        {#if selectedDesignInspection.element?.summary}
          <p>{selectedDesignInspection.element.summary}</p>
        {/if}

        <section>
          <h4>Relations</h4>
          {#if selectedDesignInspection.relations.length > 0}
            {#each selectedDesignInspection.relations as relation (relation.id)}
              <code>{relation.kind}: {relation.from} -> {relation.to}</code>
            {/each}
          {:else}
            <span>No declared relation.</span>
          {/if}
        </section>

        <section>
          <h4>Discovered Usage</h4>
          {#if relatedDiscoveryEntities.length > 0}
            {#each relatedDiscoveryEntities.slice(0, 8) as entity (entity.id)}
              <div class="technical-docs-view__inspector-discovery">
                <span data-status={entity.status}>{entity.kind}</span>
                <code>{entity.title}</code>
                <em>{entity.source}</em>
              </div>
            {/each}
          {:else}
            <span>No live registry usage discovered.</span>
          {/if}
        </section>

        <section>
          <h4>Tokens</h4>
          {#each selectedDesignInspection.tokens as token (token)}
            <code>{token}</code>
          {/each}
        </section>

        <section>
          <h4>CSS Variables</h4>
          <div class="technical-docs-view__inspector-draft-actions">
            <button type="button" on:click={undoDesignDraft} disabled={!designDraftStatus.canUndo}>
              Undo draft
            </button>
            <button type="button" on:click={redoDesignDraft} disabled={!designDraftStatus.canRedo}>
              Redo draft
            </button>
            <span>{designDraftStatus.draftCount} draft values</span>
          </div>
          {#each selectedDesignInspection.cssVariables as variable (variable)}
            <div class="technical-docs-view__inspector-edit-row">
              <label>
                <span>{variable}</span>
                <input
                  value={resolveThemeVariableValue(variable)}
                  aria-label={`Edit ${variable}`}
                  on:input={(event) => handleDesignDraftInput(variable, event)}
                />
              </label>
              <button
                type="button"
                on:click={() => resetDesignDraftValue(variable)}
                disabled={designDraftValues[variable] === undefined}
              >
                Reset
              </button>
              <code>target {resolveThemeVariableTargetValue(variable) || 'missing'}</code>
            </div>
          {/each}
        </section>

        <section>
          <h4>Figma</h4>
          {#if selectedDesignInspection.figma}
            <code>{selectedDesignInspection.figma.collection} / {selectedDesignInspection.figma.mode}</code>
            <code>{selectedDesignInspection.figma.variable}</code>
            <code>{selectedDesignInspection.figma.type} / {selectedDesignInspection.figma.scopes.join(', ')}</code>
          {:else}
            <span>No Figma binding.</span>
          {/if}
        </section>

        <section>
          <h4>Diff</h4>
          {#if selectedDesignInspection.diffEntries.length > 0}
            {#each selectedDesignInspection.diffEntries as entry (entry.id)}
              <div class="technical-docs-view__inspector-diff">
                <span data-status={entry.status}>{entry.status}</span>
                <code>{entry.themeVariable}</code>
                <em>{entry.sourceValue ?? 'missing'} / {resolveThemeVariableValue(entry.themeVariable)}</em>
              </div>
            {/each}
          {:else}
            <span>No diff entry.</span>
          {/if}
        </section>
      {/if}
    </aside>
  </div>
</section>

<style>
  .technical-docs-view__design {
    display: grid;
    gap: var(--space-10);
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-surface) 86%, transparent);
  }

  .technical-docs-view__design {
    grid-template-rows: auto auto minmax(0, 1fr);
  }

  .technical-docs-view__design-workspace {
    display: grid;
    gap: var(--space-10);
    grid-template-columns: minmax(17rem, 0.72fr) minmax(30rem, 1.8fr) minmax(18rem, 0.78fr);
    min-height: 0;
    overflow: hidden;
  }

  .technical-docs-view__design-preview,
  .technical-docs-view__design-inspector {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
    min-height: 0;
    padding: var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-large);
    background: color-mix(in srgb, var(--color-background-muted) 44%, transparent);
    overflow: hidden;
  }

  .technical-docs-view__design-preview {
    grid-template-rows: auto auto minmax(0, 1fr);
  }

  .technical-docs-view__design-inspector {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .technical-docs-view__selected-detail-head > span,
  .technical-docs-view__construction-step > span {
    justify-self: start;
    color: var(--dst-text-muted);
    font-size: 0.625rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .technical-docs-view__selected-detail-head > span[data-status='synced'],
  .technical-docs-view__construction-step > span[data-status='synced'] {
    color: var(--color-success, #77c879);
  }

  .technical-docs-view__selected-detail-head > span[data-status='mismatch'],
  .technical-docs-view__construction-step > span[data-status='mismatch'] {
    color: var(--color-warning, #d6a14d);
  }

  .technical-docs-view__selected-detail-head > span[data-status='missing'],
  .technical-docs-view__selected-detail-head > span[data-status='orphan'],
  .technical-docs-view__construction-step > span[data-status='missing'],
  .technical-docs-view__construction-step > span[data-status='orphan'] {
    color: var(--color-danger, #ee7f7f);
  }

  .technical-docs-view__selected-detail-head > div > span {
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__selected-detail-head h4 {
    margin: 0;
    color: var(--dst-text);
    font-size: 0.875rem;
  }

  .technical-docs-view__selected-detail-head p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .technical-docs-view__selected-detail-body {
    display: grid;
    gap: var(--space-10);
    grid-template-columns: minmax(18rem, 1.2fr) minmax(19rem, 0.8fr);
    min-width: 0;
  }

  .technical-docs-view__theme-reveal {
    position: relative;
    min-width: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--dst-border) 72%, transparent);
    border-radius: var(--dst-radius);
    background: var(--dst-canvas);
    touch-action: none;
  }

  .technical-docs-view__theme-reveal::before {
    content: '';
    position: absolute;
    z-index: 4;
    inset: 0 auto 0 var(--theme-reveal-position);
    width: 0.125rem;
    background: color-mix(in srgb, var(--color-action-primary) 76%, var(--dst-border));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--dst-surface) 88%, transparent),
      0 0 8px color-mix(in srgb, var(--color-action-primary) 20%, transparent);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .technical-docs-view__theme-reveal-layer {
    min-width: 0;
    padding: var(--space-8);
    background: color-mix(in srgb, var(--dst-surface) 72%, var(--dst-canvas));
  }

  .technical-docs-view__theme-reveal-layer--dark {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    pointer-events: none;
    clip-path: inset(0 calc(100% - var(--theme-reveal-position)) 0 0);
  }

  .technical-docs-view__theme-reveal-handle {
    position: absolute;
    z-index: 10;
    top: 50%;
    left: var(--theme-reveal-position);
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 1.65rem;
    min-height: 0;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-action-primary) 72%, var(--dst-border));
    border-radius: 999px;
    background: color-mix(in srgb, var(--dst-surface) 96%, var(--dst-canvas));
    color: var(--dst-text);
    cursor: ew-resize;
    transform: translate(-50%, -50%);
    touch-action: none;
    pointer-events: auto;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--dst-canvas) 54%, transparent),
      0 8px 18px color-mix(in srgb, var(--dst-canvas) 34%, transparent);
  }

  .technical-docs-view__theme-reveal-handle::before {
    content: '';
    position: absolute;
    inset: -0.35rem auto auto 50%;
    width: 1.25rem;
    height: 0.18rem;
    border-radius: 999px;
    background: linear-gradient(90deg, #0d1117 0 50%, #f8fafc 50% 100%);
    transform: translateX(-50%);
  }

  .technical-docs-view__theme-reveal-handle span {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
    border-radius: 999px;
    background:
      linear-gradient(90deg, #0d1117 0 50%, #f8fafc 50% 100%);
  }

  .technical-docs-view__theme-reveal-handle span::before,
  .technical-docs-view__theme-reveal-handle span::after {
    position: absolute;
    top: 50%;
    color: currentColor;
    font-size: 0.55rem;
    font-weight: 900;
    line-height: 1;
    transform: translateY(-50%);
  }

  .technical-docs-view__theme-reveal-handle span::before {
    left: 0.42rem;
    color: #f8fafc;
    content: 'D';
  }

  .technical-docs-view__theme-reveal-handle span::after {
    right: 0.46rem;
    color: #0d1117;
    content: 'L';
  }

  .technical-docs-view__theme-reveal-handle:focus-visible {
    outline: none;
  }

  .technical-docs-view__theme-reveal-handle:focus-visible span {
    box-shadow:
      0 0 0 2px var(--color-background-surface),
      0 0 0 4px var(--color-border-focus),
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 32%, transparent);
  }

  .technical-docs-view__theme-reveal--dragging .technical-docs-view__theme-reveal-handle span {
    transform: scale(1.04);
  }

  .technical-docs-view__selected-demo {
    display: grid;
    gap: var(--space-6);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid color-mix(in srgb, var(--dst-border) 78%, transparent);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-surface) 80%, var(--dst-action-primary) 5%);
  }

  .technical-docs-view__selected-demo-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .technical-docs-view__selected-demo-toolbar strong,
  .technical-docs-view__selected-demo-toolbar code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__selected-demo-toolbar strong {
    color: var(--dst-text);
    font-size: 0.8125rem;
  }

  .technical-docs-view__selected-demo-toolbar code {
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-view__selected-demo-art {
    min-width: 0;
    min-height: 12rem;
    padding: var(--space-8);
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-canvas) 28%, var(--dst-surface));
  }

  .technical-docs-view__selected-demo-stack,
  .technical-docs-view__selected-demo-shell,
  .technical-docs-view__selected-demo-graph,
  .technical-docs-view__selected-demo-overlay,
  .technical-docs-view__selected-demo-flow {
    display: grid;
    gap: var(--space-8);
    min-width: 0;
    height: 100%;
  }

  .technical-docs-view__selected-demo-stack {
    grid-template-columns: minmax(7rem, 0.55fr) minmax(0, 1fr);
    align-items: stretch;
  }

  .technical-docs-view__selected-demo-swatches {
    display: grid;
    gap: var(--space-6);
  }

  .technical-docs-view__selected-demo-swatches i {
    min-height: 2.6rem;
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: var(--dst-action-primary);
  }

  .technical-docs-view__selected-demo-stack section {
    display: grid;
    align-content: center;
    gap: var(--space-6);
    min-width: 0;
    padding: var(--space-8);
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-surface) 78%, transparent);
  }

  .technical-docs-view__selected-demo-stack b,
  .technical-docs-view__selected-demo-shell aside,
  .technical-docs-view__selected-demo-shell nav,
  .technical-docs-view__selected-demo-shell section,
  .technical-docs-view__selected-demo-shell footer {
    display: block;
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-text-muted) 28%, transparent);
  }

  .technical-docs-view__selected-demo-stack b {
    height: 0.7rem;
  }

  .technical-docs-view__selected-demo-stack b:nth-child(2) {
    width: 78%;
  }

  .technical-docs-view__selected-demo-stack b:nth-child(3) {
    width: 56%;
  }

  .technical-docs-view__selected-demo-stack button,
  .technical-docs-view__selected-demo-art > button,
  .technical-docs-view__selected-demo-overlay button {
    min-height: 1.85rem;
    border: 0;
    border-radius: var(--dst-radius);
    background: var(--dst-action-primary);
    color: #06111f;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .technical-docs-view__selected-demo-art > label {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__selected-demo-art > label span {
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-view__selected-demo-art > label input,
  .technical-docs-view__selected-demo-art > label select {
    min-width: 0;
    min-height: 1.85rem;
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: var(--dst-surface);
    color: var(--dst-text);
  }

  .technical-docs-view__selected-demo-art[data-preview-kind='form'] {
    display: grid;
    align-items: end;
    gap: var(--space-8);
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .technical-docs-view__selected-demo-switch {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .technical-docs-view__selected-demo-switch span,
  .technical-docs-view__selected-demo-switch i {
    display: block;
    border-radius: 999px;
  }

  .technical-docs-view__selected-demo-switch span {
    width: 2.75rem;
    height: 1.35rem;
    background: var(--dst-action-primary);
  }

  .technical-docs-view__selected-demo-switch i {
    width: 1rem;
    height: 1rem;
    background: var(--dst-text);
  }

  .technical-docs-view__selected-demo-shell {
    grid-template-columns: minmax(4.5rem, 0.45fr) minmax(0, 1.35fr) minmax(4.5rem, 0.45fr);
  }

  .technical-docs-view__selected-demo-shell main {
    display: grid;
    gap: var(--space-6);
    padding: var(--space-8);
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-surface) 76%, var(--dst-action-primary) 8%);
  }

  .technical-docs-view__selected-demo-shell nav,
  .technical-docs-view__selected-demo-shell footer {
    min-height: 1.4rem;
  }

  .technical-docs-view__selected-demo-shell section {
    min-height: 5rem;
    background: color-mix(in srgb, var(--dst-action-primary) 15%, var(--dst-surface));
  }

  .technical-docs-view__selected-demo-graph {
    grid-template-columns: minmax(7rem, 1fr) minmax(4rem, 0.45fr) minmax(7rem, 1fr);
    align-items: center;
  }

  .technical-docs-view__selected-demo-graph button {
    min-height: 4.5rem;
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-surface) 76%, var(--dst-action-primary) 8%);
    color: var(--dst-text);
    font: inherit;
    font-weight: 800;
  }

  .technical-docs-view__selected-demo-graph > span,
  .technical-docs-view__selected-demo-flow i {
    height: 2px;
    background: var(--dst-action-primary);
  }

  .technical-docs-view__selected-demo-overlay {
    position: relative;
    place-items: center;
  }

  .technical-docs-view__selected-demo-overlay > span {
    position: absolute;
    inset: 0;
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, #000 34%, transparent);
  }

  .technical-docs-view__selected-demo-overlay article {
    position: relative;
    z-index: 1;
    display: grid;
    gap: var(--space-8);
    width: min(24rem, 90%);
    padding: var(--space-10);
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: var(--dst-surface);
    box-shadow: var(--dst-shadow);
  }

  .technical-docs-view__selected-demo-overlay em {
    height: 0.8rem;
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-text-muted) 30%, transparent);
  }

  .technical-docs-view__selected-demo-flow {
    grid-template-columns: minmax(0, 1fr) 2rem minmax(0, 1fr) 2rem minmax(0, 1fr);
    align-items: center;
  }

  .technical-docs-view__selected-demo-flow span {
    display: grid;
    place-items: center;
    min-height: 4rem;
    border: 1px solid var(--dst-border);
    border-radius: var(--dst-radius);
    background: color-mix(in srgb, var(--dst-surface) 78%, var(--dst-action-primary) 8%);
    font-weight: 800;
  }

  .technical-docs-view__construction-flow {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-width: 0;
  }

  .technical-docs-view__construction-step {
    display: grid;
    align-content: start;
    gap: var(--space-4);
    min-height: 8.5rem;
    padding: var(--space-7);
    border-color: color-mix(in srgb, var(--dst-border) 74%, transparent);
    background: color-mix(in srgb, var(--dst-surface) 82%, transparent);
  }

  .technical-docs-view__construction-step strong,
  .technical-docs-view__construction-step em,
  .technical-docs-view__construction-step code {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .technical-docs-view__construction-step strong {
    color: var(--dst-text);
    font-size: 0.8125rem;
  }

  .technical-docs-view__construction-step em {
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
    white-space: nowrap;
  }

  .technical-docs-view__construction-step code {
    display: -webkit-box;
    color: var(--dst-text-muted);
    font-size: 0.625rem;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .technical-docs-view__preview-section h4 {
    margin: 0;
    color: var(--dst-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__preview-hit {
    min-width: 0;
    border: 1px solid transparent;
    border-radius: var(--dst-radius);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .technical-docs-view__preview-hit:hover,
  .technical-docs-view__preview-hit--related {
    border-color: color-mix(in srgb, var(--dst-action-primary) 58%, var(--dst-border));
  }

  .technical-docs-view__preview-hit--active {
    border-color: var(--dst-action-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--dst-action-primary) 30%, transparent);
  }

  .technical-docs-view__design-inspector {
    overflow: auto;
  }

  .technical-docs-view__inspector-title {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .technical-docs-view__inspector-title strong,
  .technical-docs-view__inspector-title code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__design-inspector p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    line-height: 1.45;
  }

  .technical-docs-view__design-inspector section {
    display: grid;
    gap: var(--space-4);
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-border-subtle);
  }

  .technical-docs-view__design-inspector h4 {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .technical-docs-view__design-inspector code,
  .technical-docs-view__design-inspector section > span {
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__inspector-diff,
  .technical-docs-view__inspector-discovery {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .technical-docs-view__inspector-edit-row {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .technical-docs-view__inspector-draft-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
  }

  .technical-docs-view__inspector-edit-row label {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .technical-docs-view__inspector-edit-row label span {
    overflow: hidden;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .technical-docs-view__inspector-edit-row input {
    width: 100%;
    min-width: 0;
    min-height: 1.85rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 86%, transparent);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-label);
  }

  .technical-docs-view__inspector-edit-row input:focus {
    outline: 2px solid color-mix(in srgb, var(--dst-action-primary) 42%, transparent);
    outline-offset: 1px;
  }

  .technical-docs-view__inspector-edit-row button,
  .technical-docs-view__inspector-draft-actions button {
    justify-self: start;
    min-height: 1.5rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-muted) 78%, transparent);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.6875rem;
  }

  .technical-docs-view__inspector-draft-actions span {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
  }

  .technical-docs-view__inspector-edit-row button:disabled,
  .technical-docs-view__inspector-draft-actions button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .technical-docs-view__inspector-diff span,
  .technical-docs-view__inspector-discovery span,
  .technical-docs-view__design-panel-head strong[data-status] {
    justify-self: start;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .technical-docs-view__inspector-diff span[data-status='synced'],
  .technical-docs-view__inspector-discovery span[data-status='synced'],
  .technical-docs-view__design-panel-head strong[data-status='synced'] {
    color: var(--color-success, #77c879);
  }

  .technical-docs-view__inspector-diff span[data-status='mismatch'],
  .technical-docs-view__inspector-discovery span[data-status='mismatch'],
  .technical-docs-view__design-panel-head strong[data-status='mismatch'] {
    color: var(--color-warning, #d6a14d);
  }

  .technical-docs-view__inspector-diff span[data-status='missing'],
  .technical-docs-view__inspector-diff span[data-status='orphan'],
  .technical-docs-view__inspector-discovery span[data-status='missing'],
  .technical-docs-view__inspector-discovery span[data-status='orphan'],
  .technical-docs-view__design-panel-head strong[data-status='missing'],
  .technical-docs-view__design-panel-head strong[data-status='orphan'] {
    color: var(--color-danger, #ee7f7f);
  }

  .technical-docs-view__inspector-diff em,
  .technical-docs-view__inspector-discovery em {
    overflow: hidden;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 960px) {
    .technical-docs-view__preview-stage {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }

    .technical-docs-view__preview-section,
    .technical-docs-view__selected-detail {
      grid-column: 1 / -1;
    }

    .technical-docs-view__selected-detail-body,
    .technical-docs-view__selected-demo-stack,
    .technical-docs-view__selected-demo-art[data-preview-kind='form'] {
      grid-template-columns: minmax(0, 1fr);
    }

    .technical-docs-view__construction-flow {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .technical-docs-view__design-workspace {
      grid-template-columns: minmax(0, 1fr);
    }

  }

  @media (max-width: 640px) {
    .technical-docs-view__preview-stage {
      grid-template-columns: minmax(0, 1fr);
      padding: var(--space-8);
    }

    .technical-docs-view__construction-flow,
    .technical-docs-view__selected-demo-shell,
    .technical-docs-view__selected-demo-graph,
    .technical-docs-view__selected-demo-flow {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
