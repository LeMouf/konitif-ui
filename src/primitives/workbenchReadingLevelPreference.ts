import {
  DEFAULT_WORKBENCH_READING_LEVEL,
  isWorkbenchReadingLevel,
  type WorkbenchReadingLevel
} from '@konitif/workbench';

export const WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY = 'workbench.user.reading-level';

export function readWorkbenchReadingLevelPreference(
  storageKey = WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY
): WorkbenchReadingLevel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(storageKey) ?? window.sessionStorage.getItem(storageKey);
    return isWorkbenchReadingLevel(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeWorkbenchReadingLevelPreference(
  readingLevel: WorkbenchReadingLevel,
  storageKey = WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, readingLevel);
    window.sessionStorage.removeItem(storageKey);
  } catch {
    try {
      window.sessionStorage.setItem(storageKey, readingLevel);
    } catch {
      // Preference persistence is optional; blocked storage must not break the shell.
    }
  }
}

export function resolveInitialWorkbenchReadingLevel(
  requestedReadingLevel?: WorkbenchReadingLevel | null,
  storageKey = WORKBENCH_READING_LEVEL_PREFERENCE_STORAGE_KEY
): WorkbenchReadingLevel {
  if (isWorkbenchReadingLevel(requestedReadingLevel)) {
    return requestedReadingLevel;
  }

  return readWorkbenchReadingLevelPreference(storageKey) ?? DEFAULT_WORKBENCH_READING_LEVEL;
}
