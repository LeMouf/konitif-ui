import { getContext, setContext } from 'svelte';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import {
  WorkbenchTranslationRegistry,
  type TranslationBundle,
  type TranslationLookupOptions,
  type WorkbenchLocale
} from '@konitif/workbench';

export const WORKBENCH_I18N_CONTEXT = Symbol('workbench-i18n');

export type WorkbenchTranslate = (key: string, options?: TranslationLookupOptions) => string;
export type WorkbenchLocaleBundleLoader = (
  locale: WorkbenchLocale
) => Promise<TranslationBundle[]>;

export interface WorkbenchI18nContext {
  registry: WorkbenchTranslationRegistry;
  locale: Writable<WorkbenchLocale>;
  t: Readable<WorkbenchTranslate>;
  translate: WorkbenchTranslate;
  registerBundle(bundle: TranslationBundle): void;
  registerBundles(bundles: TranslationBundle[]): void;
}

export interface CreateWorkbenchI18nContextInput {
  registry?: WorkbenchTranslationRegistry;
  locale?: WorkbenchLocale;
  fallbackLocale?: WorkbenchLocale;
  bundles?: TranslationBundle[];
}

export function createWorkbenchI18nContext(input: CreateWorkbenchI18nContextInput = {}): WorkbenchI18nContext {
  const registry = input.registry ?? new WorkbenchTranslationRegistry({ fallbackLocale: input.fallbackLocale });
  const locale = writable<WorkbenchLocale>(input.locale ?? registry.fallbackLocale);
  const catalogRevision = writable(0);

  if (input.bundles) {
    registry.registerBundles(input.bundles);
  }

  const translate: WorkbenchTranslate = (key, options = {}) =>
    registry.translate(key, {
      ...options,
      locale: options.locale ?? get(locale)
    });
  // Locale bundles are loaded lazily. Registering a projection for the locale
  // that is already selected must still invalidate every rendered translator.
  // A same-value update on a primitive Svelte store is intentionally ignored,
  // so bundle registration owns a distinct catalog revision authority.
  const t = derived([locale, catalogRevision], ([$locale]) => {
    return (key: string, options: TranslationLookupOptions = {}) =>
      registry.translate(key, {
        ...options,
        locale: options.locale ?? $locale
      });
  });

  return {
    registry,
    locale,
    t,
    translate,
    registerBundle(bundle) {
      if (registry.registerBundle(bundle)) {
        catalogRevision.update((revision) => revision + 1);
      }
    },
    registerBundles(bundles) {
      if (registry.registerBundles(bundles)) {
        catalogRevision.update((revision) => revision + 1);
      }
    }
  };
}

export function setWorkbenchI18nContext(context: WorkbenchI18nContext): WorkbenchI18nContext {
  setContext(WORKBENCH_I18N_CONTEXT, context);
  return context;
}

export function initWorkbenchI18nContext(input: CreateWorkbenchI18nContextInput = {}): WorkbenchI18nContext {
  return setWorkbenchI18nContext(createWorkbenchI18nContext(input));
}

export function getWorkbenchI18nContext(): WorkbenchI18nContext | null {
  return getContext<WorkbenchI18nContext | null>(WORKBENCH_I18N_CONTEXT) ?? null;
}

export function getWorkbenchTranslator(): Readable<WorkbenchTranslate> {
  const context = getWorkbenchI18nContext();

  if (context) {
    return context.t;
  }

  const fallback = createWorkbenchI18nContext();
  return fallback.t;
}
