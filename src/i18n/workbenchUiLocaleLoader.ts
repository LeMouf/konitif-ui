import type { TranslationBundle, WorkbenchLocale } from '@konitif/workbench';
import { workbenchUiEnglishBundle } from './workbenchUiTranslations';

export async function loadWorkbenchUiLocaleBundles(
  locale: WorkbenchLocale
): Promise<TranslationBundle[]> {
  if (locale === 'fr') {
    const { workbenchUiFrenchBundle } = await import('./workbenchUiFrenchTranslations');
    return [workbenchUiFrenchBundle];
  }

  if (locale === 'zh-CN') {
    const { workbenchUiChineseBundle } = await import('./workbenchUiChineseTranslations');
    return [workbenchUiChineseBundle];
  }

  return [workbenchUiEnglishBundle];
}
