import { writable } from 'svelte/store';
import type { ArchitectureProjectionDocument } from './technical-docs/architectureProjectionModel';
import type { FeatureArchetypeMatrix } from './technical-docs/featureArchetypeMatrixModel';
import type { SemanticArchitectureGraph } from './technical-docs/semanticArchitectureGraphModel';

export interface TechnicalDocsDatasets {
  featureMatrix: FeatureArchetypeMatrix;
  semanticGraph: SemanticArchitectureGraph;
  projectionDocument: ArchitectureProjectionDocument;
}

/** The application selects artifacts and owns their acquisition/validation. */
export type TechnicalDocsDatasetLoader = (signal: AbortSignal) => Promise<TechnicalDocsDatasets>;
export type TechnicalDocsDatasetState =
  | { status: 'unavailable' | 'loading'; data: null }
  | { status: 'error'; data: null; error: unknown }
  | { status: 'ready'; data: TechnicalDocsDatasets };

/** One view's observation; no global cache, discovery, persistence or auto retry. */
export function createTechnicalDocsDatasetObservation() {
  const state = writable<TechnicalDocsDatasetState>({ status: 'unavailable', data: null });
  let selected: TechnicalDocsDatasetLoader | null = null;
  let request: AbortController | null = null;
  let disposed = false;
  return {
    subscribe: state.subscribe,
    select(loader: TechnicalDocsDatasetLoader | null) {
      if (disposed || loader === selected) return;
      selected = loader;
      request?.abort();
      request = null;
      if (!loader) { state.set({ status: 'unavailable', data: null }); return; }
      const current = new AbortController();
      request = current;
      state.set({ status: 'loading', data: null });
      void (async () => {
        try {
          const data = await loader(current.signal);
          if (!disposed && request === current) state.set({ status: 'ready', data });
        } catch (error) {
          if (!disposed && request === current) state.set({ status: 'error', data: null, error });
        }
      })();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      request?.abort();
      request = null;
      selected = null;
      state.set({ status: 'unavailable', data: null });
    }
  };
}
