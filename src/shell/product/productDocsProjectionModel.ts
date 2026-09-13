import type { WorkbenchRuntimeProjectionEnvelope } from '@konitif/workbench';
import type {
  ProductDocsPage,
  ProductDocsProjection,
  ProductIconScanEntry,
  ProductIconScanProjection
} from './productDocsModel';

export const PRODUCT_DOCS_PROJECTION_KIND = 'product-docs';
export const PRODUCT_DOCS_SOURCE_FILE = 'packages/workbench-ui/src/shell/TechnicalDocsView.svelte';

export function normalizeProductDocsProjection(result: unknown): ProductDocsProjection | null {
  const envelope = result && typeof result === 'object' && 'payload' in result
    ? result as WorkbenchRuntimeProjectionEnvelope<unknown>
    : null;
  const payload = envelope?.payload ?? result;

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Partial<ProductDocsProjection>;

  if (!Array.isArray(record.pages) || !Array.isArray(record.templates)) {
    return null;
  }

  const pages = record.pages.map(normalizeProductDocsPage);

  return {
    id: typeof record.id === 'string' ? record.id : `${PRODUCT_DOCS_PROJECTION_KIND}:runtime`,
    sourceFile: typeof record.sourceFile === 'string' ? record.sourceFile : PRODUCT_DOCS_SOURCE_FILE,
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : envelope?.generatedAt,
    totals: {
      pages: Number(record.totals?.pages ?? pages.length),
      templates: Number(record.totals?.templates ?? record.templates.length),
      routes: Number(record.totals?.routes ?? new Set(pages.map((page) => page.route)).size),
      features: Number(record.totals?.features ?? new Set(record.templates.flatMap((template) => template.featureIds).concat(pages.flatMap((page) => page.featureIds))).size),
      designNodes: Number(record.totals?.designNodes ?? new Set(record.templates.flatMap((template) => template.designNodeIds).concat(pages.flatMap((page) => page.designNodeIds))).size),
      sourceEntities: Number(record.totals?.sourceEntities ?? record.sourceEntities?.length ?? 0),
      iconSvgFiles: Number(record.totals?.iconSvgFiles ?? record.iconScan?.totals.svgFiles ?? 0),
      iconInlineSvg: Number(record.totals?.iconInlineSvg ?? record.iconScan?.totals.inlineSvg ?? 0),
      iconScannedFiles: Number(record.totals?.iconScannedFiles ?? record.iconScan?.totals.scannedFiles ?? 0)
    },
    pages,
    templates: record.templates,
    sourceEntities: Array.isArray(record.sourceEntities) ? record.sourceEntities : [],
    iconScan: normalizeProductIconScan(record.iconScan)
  };
}

export function normalizeProductDocsPage(page: ProductDocsPage): ProductDocsPage {
  const route = canonicalizeProductDocsRoutePath(page.route);

  return {
    ...page,
    route,
    entryPoints: page.entryPoints.map((entryPoint) => ({
      ...entryPoint,
      href: entryPoint.kind === 'route' || entryPoint.kind === 'tool'
        ? canonicalizeProductDocsRoutePath(entryPoint.href)
        : entryPoint.href
    }))
  };
}

export function canonicalizeProductDocsRoutePath(route: string): string {
  if (route === '/' || route.startsWith('/docs/') || route.startsWith('/tools/') || route.startsWith('/shell/') || route === '/docs' || route === '/forge') {
    return route;
  }

  if (route === '/lab') {
    return '/forge';
  }

  if (route === 'shell-regions') {
    return '/shell/regions';
  }

  const queryIndex = route.indexOf('?');
  const params = queryIndex >= 0 ? new URLSearchParams(route.slice(queryIndex + 1)) : null;

  if (params?.get('view') === 'docs') {
    const tab = params.get('docsTab');
    return tab ? `/docs/${tab}` : '/docs';
  }

  if (params?.get('view') === 'shortcuts') {
    return '/docs/shortcuts';
  }

  if (params?.get('page') === 'lab') {
    return '/forge';
  }

  const tool = params?.get('tool');
  if (tool) {
    return `/tools/${tool}`;
  }

  return route.startsWith('/') ? route : `/${route}`;
}

export function normalizeProductIconScan(scan: unknown): ProductIconScanProjection | null {
  if (!scan || typeof scan !== 'object') {
    return null;
  }

  const record = scan as Partial<ProductIconScanProjection>;

  if (!record.totals || !Array.isArray(record.inlineSvg)) {
    return null;
  }

  return {
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : null,
    roots: Array.isArray(record.roots) ? record.roots.filter((root): root is string => typeof root === 'string') : [],
    totals: {
      svgFiles: Number(record.totals.svgFiles ?? 0),
      inlineSvg: Number(record.totals.inlineSvg ?? 0),
      scannedFiles: Number(record.totals.scannedFiles ?? 0)
    },
    svgFiles: Array.isArray(record.svgFiles) ? record.svgFiles.map(normalizeProductIconScanEntry).filter((entry): entry is ProductIconScanEntry => Boolean(entry)) : [],
    inlineSvg: record.inlineSvg.map(normalizeProductIconScanEntry).filter((entry): entry is ProductIconScanEntry => Boolean(entry))
  };
}

export function normalizeProductIconScanEntry(entry: unknown): ProductIconScanEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Partial<ProductIconScanEntry>;

  if (typeof record.sourceFile !== 'string') {
    return null;
  }

  return {
    sourceFile: record.sourceFile,
    line: Number(record.line ?? 0),
    category: typeof record.category === 'string' ? record.category : 'source',
    suggestedIconId: typeof record.suggestedIconId === 'string' ? record.suggestedIconId : '',
    context: typeof record.context === 'string' ? record.context : '',
    bytes: Number(record.bytes ?? 0)
  };
}
