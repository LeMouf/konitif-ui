import { getContext, setContext } from 'svelte';
import { readable, type Readable } from 'svelte/store';
import type { WorkbenchReadingLevel } from '@konitif/workbench';

const WORKBENCH_READING_LEVEL_CONTEXT = Symbol.for('workbench.readingLevel');
const fallbackReadingLevel = readable<WorkbenchReadingLevel>('casual');

export function setWorkbenchReadingLevelContext(readingLevel: Readable<WorkbenchReadingLevel>): void {
  setContext(WORKBENCH_READING_LEVEL_CONTEXT, readingLevel);
}

export function getWorkbenchReadingLevelContext(): Readable<WorkbenchReadingLevel> {
  return getContext<Readable<WorkbenchReadingLevel> | undefined>(WORKBENCH_READING_LEVEL_CONTEXT) ?? fallbackReadingLevel;
}
