export type Archetype =
  | 'tool'
  | 'domain'
  | 'store'
  | 'runtime'
  | 'surface'
  | 'projection'
  | 'interaction'
  | 'selection'
  | 'history'
  | 'registry'
  | 'panel'
  | 'layout'
  | 'shell'
  | 'workspace';

export type ArchetypeColumn = {
  archetype: Archetype;
  label: string;
  description: string;
  terms: string[];
};

export type SourceEvidence = {
  filePath: string;
  packageName: string;
  matchedTerms: string[];
  occurrences: number;
  confidence: number;
};

export type FeatureArchetypeCell = {
  featureId: string;
  archetype: Archetype;
  score: number;
  confidence: number;
  evidences: SourceEvidence[];
};

export type FeatureArchetypeRow = {
  featureId: string;
  label: string;
  packageNames: string[];
  cells: FeatureArchetypeCell[];
  detectedConcepts: string[];
  missingArchetypes: Archetype[];
};

export type FeatureArchetypeSourceFile = {
  filePath: string;
  packageName: string;
  featureId: string;
  archetypes: Array<{
    archetype: Archetype;
    matchedTerms: string[];
    occurrences: number;
    confidence: number;
  }>;
  detectedConcepts: string[];
  occurrences: number;
  confidence: number;
};

export type FeatureArchetypeMatrix = {
  schemaVersion?: string;
  generatedAt: string;
  repoRoot: string;
  archetypes: Archetype[];
  columns: ArchetypeColumn[];
  rows: FeatureArchetypeRow[];
  sourceFiles?: FeatureArchetypeSourceFile[];
};

export type FeatureArchetypeFilters = {
  packageName: string;
  featureQuery: string;
  archetype: Archetype | 'all';
};

export function filterFeatureArchetypeRows(
  rows: FeatureArchetypeRow[],
  filters: FeatureArchetypeFilters
): FeatureArchetypeRow[] {
  const query = filters.featureQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.packageName !== 'all' && !row.packageNames.includes(filters.packageName)) {
      return false;
    }

    if (filters.archetype !== 'all') {
      const cell = row.cells.find((entry) => entry.archetype === filters.archetype);

      if (!cell || cell.score <= 0) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const haystack = [
      row.featureId,
      row.label,
      row.packageNames.join(' '),
      row.detectedConcepts.join(' ')
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
}

export function getFeatureArchetypeCell(row: FeatureArchetypeRow, archetype: Archetype): FeatureArchetypeCell {
  return row.cells.find((cell) => cell.archetype === archetype) ?? {
    featureId: row.featureId,
    archetype,
    score: 0,
    confidence: 0,
    evidences: []
  };
}

export function formatFeatureArchetypePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatFeatureArchetypeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function resolveCellIntensity(cell: FeatureArchetypeCell): 'none' | 'low' | 'medium' | 'high' {
  if (cell.score <= 0) return 'none';
  if (cell.score < 0.35) return 'low';
  if (cell.score < 0.68) return 'medium';

  return 'high';
}

export function summarizePresentArchetypes(row: FeatureArchetypeRow, columns: ArchetypeColumn[]): string[] {
  return columns
    .filter((column) => getFeatureArchetypeCell(row, column.archetype).score > 0)
    .map((column) => column.label);
}
