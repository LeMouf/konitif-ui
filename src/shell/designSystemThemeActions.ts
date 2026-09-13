import type {
  DesignSystemThemeDiffEntry,
  DesignSystemThemeDocument
} from './designSystemThemeCatalog';

export type DesignSystemThemeActionKind = 'sync' | 'override' | 'export';

export interface DesignSystemThemeActionPlan {
  action: DesignSystemThemeActionKind;
  title: string;
  summary: string;
  previewText: string;
  nextDraftValues: Record<string, string>;
  affectedVariables: string[];
  canApply: boolean;
  writeTarget: 'workspace-session' | 'source-registry' | 'export-target';
}

export function createDesignSystemThemeActionPlan(
  document: DesignSystemThemeDocument,
  entries: DesignSystemThemeDiffEntry[],
  draftValues: Record<string, string>,
  action: DesignSystemThemeActionKind
): DesignSystemThemeActionPlan {
  if (action === 'sync') {
    const nextDraftValues = Object.fromEntries(
      entries
        .filter((entry) => entry.status === 'mismatch' || entry.status === 'missing')
        .flatMap((entry) =>
          entry.targetValue && draftValues[entry.themeVariable] !== entry.targetValue
            ? [[entry.themeVariable, entry.targetValue] as const]
            : []
        )
    );
    const affectedVariables = Object.keys(nextDraftValues);

    return {
      action,
      title: 'Sync Draft',
      summary: 'Prepare workspace theme draft values from imported source targets.',
      previewText: serializeCssDraft(nextDraftValues),
      nextDraftValues,
      affectedVariables,
      canApply: affectedVariables.length > 0,
      writeTarget: 'workspace-session'
    };
  }

  if (action === 'override') {
    const overridePayload = entries
      .filter((entry) => entry.status === 'mismatch')
      .map((entry) => ({
        sourceId: entry.sourceId,
          themeVariable: entry.themeVariable,
          overrideValue: draftValues[entry.themeVariable] ?? entry.themeValue ?? entry.targetValue ?? null
      }));
    const affectedVariables = overridePayload.map((entry) => entry.themeVariable);

    return {
      action,
      title: 'Override Source',
      summary: 'Preview source overrides from the current workspace theme values. No source write is performed yet.',
      previewText: `${JSON.stringify({ version: document.version, overrides: overridePayload }, null, 2)}\n`,
      nextDraftValues: { ...draftValues },
      affectedVariables,
      canApply: false,
      writeTarget: 'source-registry'
    };
  }

  const exportVariables = [
    ...entries.map((entry) => entry.themeVariable),
    ...Object.keys(draftValues).filter((variable) => !entries.some((entry) => entry.themeVariable === variable))
  ];
  const exportValues = Object.fromEntries(
    exportVariables.map((variable) => {
      const entry = entries.find((candidate) => candidate.themeVariable === variable);

      return [
        variable,
        draftValues[variable] ?? entry?.targetValue ?? entry?.themeValue ?? entry?.sourceValue ?? '<missing>'
      ];
    })
  );

  return {
    action,
    title: 'Export Target',
    summary: `Preview CSS custom properties for ${document.metadata.exportTarget}.`,
    previewText: serializeCssDraft(exportValues),
    nextDraftValues: { ...draftValues },
    affectedVariables: exportVariables,
    canApply: false,
    writeTarget: 'export-target'
  };
}

function serializeCssDraft(values: Record<string, string>): string {
  const lines = Object.entries(values).map(([variable, value]) => `${variable}: ${value};`);

  return lines.length > 0 ? lines.join('\n') : '/* no pending changes */';
}
