import type { LanguageRegistryEvaluation, RepoQualityEvaluation } from '@konitif/workbench';

/** Evaluations supplied by the application; null means absent, never successful. */
export interface TechnicalDocsReports {
  quality: RepoQualityEvaluation | null;
  language: LanguageRegistryEvaluation | null;
}
