import type { WorkbenchLocale } from '@konitif/workbench';

export const WORKBENCH_LANGUAGE_SESSION_STORAGE_KEY = 'workbench.user.locale';
export const DEFAULT_WORKBENCH_LOCALES: WorkbenchLocale[] = ['en', 'fr', 'zh-CN'];

export type WorkbenchLocaleOption = {
  locale: WorkbenchLocale;
  label: string;
  nativeLabel: string;
};

export const defaultWorkbenchLocaleOptions: WorkbenchLocaleOption[] = [
  { locale: 'en', label: 'English', nativeLabel: 'English' },
  { locale: 'fr', label: 'French', nativeLabel: 'Français' },
  { locale: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' }
];

export function normalizeWorkbenchLocale(
  locale: WorkbenchLocale | null | undefined,
  supportedLocales: readonly WorkbenchLocale[] = DEFAULT_WORKBENCH_LOCALES
): WorkbenchLocale | null {
  if (!locale) {
    return null;
  }

  const normalizedLocale = locale.toLowerCase();
  const normalizedSupportedLocales = supportedLocales.map((supportedLocale) => supportedLocale.toLowerCase());
  const exactMatchIndex = normalizedSupportedLocales.indexOf(normalizedLocale);

  if (exactMatchIndex >= 0) {
    return supportedLocales[exactMatchIndex];
  }

  const baseLocale = normalizedLocale.split('-')[0];
  const baseMatchIndex = normalizedSupportedLocales.findIndex((supportedLocale) => supportedLocale.split('-')[0] === baseLocale);

  return baseMatchIndex >= 0 ? supportedLocales[baseMatchIndex] : null;
}

export function readWorkbenchSessionLocale(
  storageKey = WORKBENCH_LANGUAGE_SESSION_STORAGE_KEY
): WorkbenchLocale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey) ?? window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeWorkbenchSessionLocale(
  locale: WorkbenchLocale,
  storageKey = WORKBENCH_LANGUAGE_SESSION_STORAGE_KEY
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, locale);
    window.sessionStorage.removeItem(storageKey);
  } catch {
    try {
      window.sessionStorage.setItem(storageKey, locale);
    } catch {
      // Preference persistence is a convenience; blocked storage must not break the shell.
    }
  }
}

export function detectWorkbenchBrowserLocale(
  supportedLocales: readonly WorkbenchLocale[] = DEFAULT_WORKBENCH_LOCALES,
  fallbackLocale: WorkbenchLocale = 'en'
): WorkbenchLocale {
  if (typeof navigator === 'undefined') {
    return fallbackLocale;
  }

  const browserLocales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);

  for (const browserLocale of browserLocales) {
    const normalizedLocale = normalizeWorkbenchLocale(browserLocale, supportedLocales);

    if (normalizedLocale) {
      return normalizedLocale;
    }
  }

  return normalizeWorkbenchLocale(fallbackLocale, supportedLocales) ?? supportedLocales[0] ?? fallbackLocale;
}

export type ResolveInitialWorkbenchLocaleInput = {
  requestedLocale?: WorkbenchLocale | null;
  supportedLocales?: readonly WorkbenchLocale[];
  fallbackLocale?: WorkbenchLocale;
  storageKey?: string;
};

export function resolveInitialWorkbenchLocale(input: ResolveInitialWorkbenchLocaleInput = {}): WorkbenchLocale {
  const supportedLocales = input.supportedLocales ?? DEFAULT_WORKBENCH_LOCALES;
  const fallbackLocale = input.fallbackLocale ?? 'en';
  const requestedLocale = normalizeWorkbenchLocale(input.requestedLocale, supportedLocales);

  if (requestedLocale) {
    return requestedLocale;
  }

  const sessionLocale = normalizeWorkbenchLocale(readWorkbenchSessionLocale(input.storageKey), supportedLocales);

  if (sessionLocale) {
    return sessionLocale;
  }

  return detectWorkbenchBrowserLocale(supportedLocales, fallbackLocale);
}
