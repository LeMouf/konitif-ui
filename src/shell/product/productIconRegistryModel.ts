import type { WorkbenchIconTone } from '@konitif/workbench';
import type { WorkbenchIconDefinition } from '../../icons/iconRegistry';
import type { ProductIconScanEntry, ProductIconScanProjection } from './productDocsModel';

export type ProductIconDebtGroup = {
  category: string;
  count: number;
  sample: ProductIconScanEntry | null;
};

export type RegistryIconGroup<TId extends string = string> = {
  id: TId;
  label: string;
  count: number;
};

export type RegistryIconSetGroup = RegistryIconGroup & {
  tone: WorkbenchIconTone;
};

export function createProductIconDebtGroups(scan: ProductIconScanProjection | null): ProductIconDebtGroup[] {
  if (!scan) {
    return [];
  }

  const groups = new Map<string, ProductIconDebtGroup>();

  for (const entry of scan.inlineSvg) {
    const category = entry.category || 'source';
    const current = groups.get(category);

    if (current) {
      current.count += 1;
    } else {
      groups.set(category, { category, count: 1, sample: entry });
    }
  }

  return [...groups.values()].sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}

export function isProductIconDebtCandidate(entry: ProductIconScanEntry): boolean {
  const context = entry.context?.toLowerCase() ?? '';

  return (
    entry.category !== 'source' &&
    !context.includes('preserveaspectratio') &&
    !context.includes('grid-layer') &&
    !context.includes('curve-panel__svg') &&
    !context.includes('edge-layer')
  );
}

export function createRegistryIconCategories(icons: WorkbenchIconDefinition[]): RegistryIconGroup[] {
  const counts = new Map<string, number>();

  for (const icon of icons) {
    counts.set(icon.category, (counts.get(icon.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: formatRegistryIconLabel(id), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function createRegistryIconToneGroups(icons: WorkbenchIconDefinition[]): RegistryIconGroup<WorkbenchIconTone>[] {
  const counts = new Map<WorkbenchIconTone, number>();

  for (const icon of icons) {
    counts.set(icon.tone, (counts.get(icon.tone) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: formatRegistryIconLabel(id), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function createRegistryIconSetGroups(
  icons: WorkbenchIconDefinition[],
  scan: ProductIconScanProjection | null
): RegistryIconSetGroup[] {
  const defaultSets: RegistryIconSetGroup[] = [
    { id: 'default', label: 'Default', tone: 'shared', count: icons.filter((icon) => icon.tone === 'default').length },
    { id: 'runtime', label: 'Runtime', tone: 'runtime', count: icons.filter((icon) => icon.tone === 'runtime').length },
    { id: 'design', label: 'Design', tone: 'design', count: icons.filter((icon) => icon.tone === 'design').length },
    { id: 'template', label: 'Template', tone: 'template', count: icons.filter((icon) => icon.tone === 'template').length },
    { id: 'product', label: 'Product', tone: 'product', count: icons.filter((icon) => icon.tone === 'product').length },
    { id: 'inline', label: 'Inline SVG', tone: 'runtime', count: scan?.totals.inlineSvg ?? 0 }
  ];

  return defaultSets.filter((set) => set.count > 0);
}

export function filterRegistryIcons(
  icons: WorkbenchIconDefinition[],
  search: string,
  category: string,
  tone: WorkbenchIconTone | 'all'
): WorkbenchIconDefinition[] {
  const needle = search.trim().toLowerCase();

  return icons.filter((icon) => {
    if (category !== 'all' && icon.category !== category) return false;
    if (tone !== 'all' && icon.tone !== tone) return false;
    if (!needle) return true;

    const haystack = `${icon.id} ${icon.title} ${icon.category} ${icon.tone} ${icon.designNodeId ?? ''}`.toLowerCase();

    return haystack.includes(needle);
  });
}

export function countRegistryIconUsage(icon: WorkbenchIconDefinition, scan: ProductIconScanProjection | null): number {
  if (!scan) {
    return icon.designNodeId ? 1 : 0;
  }

  const key = icon.id.split('.').pop()?.toLowerCase() ?? icon.id.toLowerCase();
  const title = icon.title.toLowerCase();
  const matches = scan.inlineSvg.filter((entry) => matchesRegistryIcon(entry, key, title)).length;

  return matches || (icon.designNodeId ? 1 : 0);
}

export function createRegistryIconUsageRows(
  icon: WorkbenchIconDefinition,
  scan: ProductIconScanProjection | null,
  fallbackCandidates: ProductIconScanEntry[] = []
): ProductIconScanEntry[] {
  if (!scan) {
    return [];
  }

  const key = icon.id.split('.').pop()?.toLowerCase() ?? icon.id.toLowerCase();
  const title = icon.title.toLowerCase();
  const directMatches = scan.inlineSvg.filter((entry) => matchesRegistryIcon(entry, key, title));

  return (directMatches.length ? directMatches : fallbackCandidates).slice(0, 6);
}

export function formatRegistryIconLabel(value: string): string {
  return value
    .split(/[-_. ]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function formatRegistryIconCode(icon: WorkbenchIconDefinition): string {
  return `<WorkbenchIcon icon="${icon.id}" label="${icon.title}" />`;
}

function matchesRegistryIcon(entry: ProductIconScanEntry, key: string, title: string): boolean {
  const haystack = `${entry.suggestedIconId} ${entry.context} ${entry.sourceFile}`.toLowerCase();

  return haystack.includes(key) || haystack.includes(title);
}
