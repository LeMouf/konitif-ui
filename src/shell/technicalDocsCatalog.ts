export type FeatureDocDomain = 'core' | 'ui' | 'app';
export type FeatureDocFilter = 'all' | FeatureDocDomain;

export interface FeatureDocEntry {
  id: string;
  title: string;
  domain: FeatureDocDomain | string;
  layer?: string | null;
  type?: string | null;
  context: string;
  section?: string | null;
  summary: string;
  path: string;
  status: 'active' | 'draft' | 'deprecated' | 'archived' | string;
  tags: string[];
  rules?: string[];
  artifacts?: FeatureDocArtifact[];
  entryPoints?: FeatureDocEntryPoint[];
  designImpact?: TechnicalDocsDesignImpact;
}

export interface FeatureDocEntryPoint {
  label: string;
  href: string;
  kind: string;
}

export interface FeatureDocArtifact {
  kind: string;
  path: string;
  required?: boolean;
}

export interface TechnicalDocsDesignImpact {
  status: string;
  summary: string;
  components: string[];
  tokens: string[];
  cssVariables: string[];
}

export interface TechnicalRuleEntry {
  id: string;
  title: string;
  summary: string;
  path: string;
  context: 'shared' | string;
}

export interface TechnicalTestEntry {
  id: string;
  title: string;
  summary: string;
  path: string;
  context: string;
}

export interface FeatureDocContextGroup {
  key: string;
  label: string;
  items: FeatureDocEntry[];
}

export interface TechnicalDocsRelationCounts {
  docs: number;
  rules: number;
  sources: number;
  tests: number;
  entryPoints: number;
}

export interface TechnicalDocsRelationFeature {
  id: string;
  title: string;
  status: string;
  domain: string;
  context: string;
  summary: string;
  path: string;
  counts: TechnicalDocsRelationCounts;
  relations: string[];
  designImpact: TechnicalDocsDesignImpact | null;
}

export interface TechnicalDocsRelationContext {
  id: string;
  label: string;
  domain: string;
  context: string;
  features: TechnicalDocsRelationFeature[];
  rules: TechnicalRuleEntry[];
  tests: TechnicalTestEntry[];
  counts: TechnicalDocsRelationCounts & {
    features: number;
    contextualRules: number;
    contextualTests: number;
  };
}

export interface TechnicalDocsRelationGraph {
  contexts: TechnicalDocsRelationContext[];
  totals: TechnicalDocsRelationCounts & {
    contexts: number;
    features: number;
    relations: number;
  };
}

/** Application-owned authored data. Replacing this prop updates its projections;
 * the shell neither discovers a repository nor persists these declarations. */
export interface FeatureDocumentationContribution {
  features: FeatureDocEntry[];
  rules: TechnicalRuleEntry[];
  tests: TechnicalTestEntry[];
}

export function resolveContextualFeatureDocs(
  entries: FeatureDocEntry[],
  input: {
    appContext: string;
    filter: FeatureDocFilter;
  }
): FeatureDocEntry[] {
  return entries
    .filter((entry) => {
      if (entry.domain === 'app') {
        return entry.context === input.appContext;
      }

      return true;
    })
    .filter((entry) => input.filter === 'all' || entry.domain === input.filter)
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function groupFeatureDocsByContext(entries: FeatureDocEntry[]): FeatureDocContextGroup[] {
  const groups = new Map<string, FeatureDocContextGroup>();

  for (const entry of entries) {
    const key = `${entry.domain}/${entry.context}`;
    const group =
      groups.get(key) ??
      {
        key,
        label: `${toTitleCase(entry.domain)} / ${toTitleCase(entry.context)}`,
        items: []
      };

    group.items.push(entry);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => left.title.localeCompare(right.title))
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildTechnicalDocsRelationGraph(input: {
  featureDocs: FeatureDocEntry[];
  ruleEntries: TechnicalRuleEntry[];
  testEntries: TechnicalTestEntry[];
}): TechnicalDocsRelationGraph {
  const contexts = new Map<string, TechnicalDocsRelationContext>();

  for (const entry of input.featureDocs) {
    const domain = entry.domain || entry.layer || 'unknown';
    const context = entry.context || 'unknown';
    const contextId = `${domain}/${context}`;
    const group =
      contexts.get(contextId) ??
      createRelationContext({
        id: contextId,
        domain,
        context,
        rules: input.ruleEntries.filter((rule) => rule.context === context || rule.context === 'shared'),
        tests: input.testEntries.filter((test) => test.context === context)
      });

    const feature = createRelationFeature(entry);
    group.features.push(feature);
    group.counts.features += 1;
    group.counts.docs += feature.counts.docs;
    group.counts.rules += feature.counts.rules;
    group.counts.sources += feature.counts.sources;
    group.counts.tests += feature.counts.tests;
    group.counts.entryPoints += feature.counts.entryPoints;
    contexts.set(contextId, group);
  }

  const normalizedContexts = [...contexts.values()]
    .map((context) => ({
      ...context,
      features: context.features.sort((left, right) => left.title.localeCompare(right.title))
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const totals = normalizedContexts.reduce<TechnicalDocsRelationGraph['totals']>(
    (accumulator, context) => {
      accumulator.contexts += 1;
      accumulator.features += context.counts.features;
      accumulator.docs += context.counts.docs;
      accumulator.rules += context.counts.rules;
      accumulator.sources += context.counts.sources;
      accumulator.tests += context.counts.tests;
      accumulator.entryPoints += context.counts.entryPoints;
      return accumulator;
    },
    {
      contexts: 0,
      features: 0,
      docs: 0,
      rules: 0,
      sources: 0,
      tests: 0,
      entryPoints: 0,
      relations: 0
    }
  );

  totals.relations = totals.docs + totals.rules + totals.sources + totals.tests + totals.entryPoints;

  return {
    contexts: normalizedContexts,
    totals
  };
}

function createRelationContext(input: {
  id: string;
  domain: string;
  context: string;
  rules: TechnicalRuleEntry[];
  tests: TechnicalTestEntry[];
}): TechnicalDocsRelationContext {
  return {
    id: input.id,
    label: `${toTitleCase(input.domain)} / ${toTitleCase(input.context)}`,
    domain: input.domain,
    context: input.context,
    features: [],
    rules: input.rules,
    tests: input.tests,
    counts: {
      features: 0,
      docs: 0,
      rules: 0,
      sources: 0,
      tests: 0,
      entryPoints: 0,
      contextualRules: input.rules.length,
      contextualTests: input.tests.length
    }
  };
}

function createRelationFeature(entry: FeatureDocEntry): TechnicalDocsRelationFeature {
  const artifacts = normalizeFeatureDocArtifacts(entry);
  const rules = entry.rules ?? [];
  const entryPoints = entry.entryPoints ?? [];
  const counts: TechnicalDocsRelationCounts = {
    docs: artifacts.filter((artifact) => artifact.kind === 'doc').length,
    rules: rules.length,
    sources: artifacts.filter((artifact) => artifact.kind === 'source').length,
    tests: artifacts.filter((artifact) => artifact.kind === 'test').length,
    entryPoints: entryPoints.length
  };

  return {
    id: entry.id,
    title: entry.title,
    status: entry.status,
    domain: entry.domain || entry.layer || 'unknown',
    context: entry.context || 'unknown',
    summary: entry.summary,
    path: entry.path,
    counts,
    relations: [
      ...rules,
      ...artifacts.map((artifact) => artifact.path),
      ...entryPoints.map((entryPoint) => entryPoint.href)
    ],
    designImpact: normalizeDesignImpact(entry.designImpact)
  };
}

function normalizeDesignImpact(input: TechnicalDocsDesignImpact | undefined): TechnicalDocsDesignImpact | null {
  if (!input) {
    return null;
  }

  return {
    status: input.status || 'missing',
    summary: input.summary || '',
    components: Array.isArray(input.components) ? input.components.filter(Boolean) : [],
    tokens: Array.isArray(input.tokens) ? input.tokens.filter(Boolean) : [],
    cssVariables: Array.isArray(input.cssVariables) ? input.cssVariables.filter(Boolean) : []
  };
}

function normalizeFeatureDocArtifacts(entry: FeatureDocEntry): FeatureDocArtifact[] {
  const artifacts = Array.isArray(entry.artifacts) ? entry.artifacts.filter((artifact) => artifact.path) : [];
  const hasPrimaryDoc = artifacts.some((artifact) => artifact.kind === 'doc' && artifact.path === entry.path);

  return [
    ...(entry.path && !hasPrimaryDoc
      ? [{
          kind: 'doc',
          path: entry.path,
          required: true
        }]
      : []),
    ...artifacts
  ];
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_/ ]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
