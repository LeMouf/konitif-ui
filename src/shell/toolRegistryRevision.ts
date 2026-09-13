import { readable } from 'svelte/store';
import type { InMemoryToolRegistry } from '@konitif/workbench';

/** UI subscription adapter; it neither owns nor mutates the registry. */
export function observeToolRegistryRevision(registry: InMemoryToolRegistry) {
  return readable(0, set => registry.subscribeRevision(set));
}
