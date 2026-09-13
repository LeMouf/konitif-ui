import type { FeatureDocEntry } from '../technicalDocsCatalog';
import type { DesignSystemThemeGraphNode } from '../designSystemThemeCatalog';
import type {
  ProductDocsDesignNode,
  ProductDocsFeature,
  ProductDocsPage,
  ProductDocsTemplate,
  ProductFlatTreeNode,
  ProductMapColumn,
  ProductMapItem,
  ProductMapTone,
  ProductPropertiesModel,
  ProductRenderComponentGroup,
  ProductRenderComputedLayer,
  ProductRenderEngineScene,
  ProductRenderLayoutArea,
  ProductRenderLayoutSlot,
  ProductRenderLayoutVariant,
  ProductRenderSurfaceMode,
  ProductRenderWireframeSlot,
  ProductTreeNode
} from './productDocsModel';
import {
  createDesignNodeMapItem,
  createProductPageMapItemId,
  createProductTemplateMapItemId,
  resolveProductInspectorRuntime
} from './productSystemMapModel';

export function shouldUseIsolatedProductScene(item: ProductMapItem | null, categoryId: string): boolean {
  if (!item) {
    return false;
  }

  if (['routes', 'pages', 'templates'].includes(categoryId)) {
    return false;
  }

  const signature = `${item.kind} ${item.tone} ${item.tags.join(' ')}`.toLowerCase();

  return /atom|molecule|organism|layout|component|primitive|token|field|button|input|icon|surface|chrome/.test(signature);
}

export function createProductIsolatedCompositionItems(item: ProductMapItem | null, categoryItems: ProductMapItem[]): ProductMapItem[] {
  if (!item) {
    return categoryItems.slice(0, 8);
  }

  const directLinks = new Set(
    [...item.dependencies, ...item.consumers]
      .map((entry) => normalizeProductRenderKey(entry))
      .filter(Boolean)
  );
  const linkedItems = categoryItems.filter((candidate) =>
    candidate.id !== item.id &&
    (directLinks.has(normalizeProductRenderKey(candidate.title)) ||
      directLinks.has(normalizeProductRenderKey(candidate.subtitle)) ||
      candidate.sourceFile === item.sourceFile)
  );
  const siblingItems = categoryItems.filter((candidate) => candidate.id !== item.id && !linkedItems.some((linked) => linked.id === candidate.id));

  return uniqueBy([item, ...linkedItems, ...siblingItems], (candidate) => candidate.id).slice(0, 10);
}

export function createProductIsolatedTreeNodes(
  item: ProductMapItem | null,
  category: ProductMapColumn | null,
  categoryItems: ProductMapItem[]
): ProductTreeNode[] {
  if (!item) {
    return [];
  }

  const relatedItems = createProductIsolatedCompositionItems(item, categoryItems).filter((candidate) => candidate.id !== item.id);

  return [
    {
      id: `isolated.root.${item.id}`,
      label: item.title,
      tone: item.tone,
      badge: item.kind,
      sourceFile: item.sourceFile,
      targetId: item.id,
      children: [
        {
          id: `isolated.category.${category?.id ?? item.kind.toLowerCase()}`,
          label: category?.title ?? item.kind,
          tone: category?.tone ?? item.tone,
          badge: `${categoryItems.length} items`,
          children: relatedItems.slice(0, 8).map((candidate) => ({
            id: `isolated.item.${candidate.id}`,
            label: candidate.title,
            tone: candidate.tone,
            badge: candidate.kind,
            sourceFile: candidate.sourceFile,
            targetId: candidate.id
          }))
        }
      ]
    }
  ];
}

export function createProductIsolatedDesignNodes(
  item: ProductMapItem | null,
  categoryItems: ProductMapItem[],
  fallbackNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>
): Array<ProductDocsDesignNode | DesignSystemThemeGraphNode> {
  if (!item) {
    return fallbackNodes.slice(0, 8);
  }

  const itemNeedles = new Set(
    [item.title, item.subtitle, item.kind, ...item.tags, ...item.dependencies]
      .map((entry) => normalizeProductRenderKey(entry))
      .filter(Boolean)
  );
  const matchingNodes = fallbackNodes.filter((node) => {
    const haystack = normalizeProductRenderKey(`${node.id} ${node.title} ${node.category} ${node.summary}`);
    return Array.from(itemNeedles).some((needle) => needle.length > 2 && haystack.includes(needle));
  });
  const categoryNeedles = new Set(categoryItems.flatMap((candidate) => candidate.tags).map((entry) => normalizeProductRenderKey(entry)));
  const scopedNodes = fallbackNodes.filter((node) => categoryNeedles.has(normalizeProductRenderKey(node.category)));

  return uniqueBy([...matchingNodes, ...scopedNodes, ...fallbackNodes], (node) => node.id).slice(0, 8);
}

export function createProductMapItemDependencyNodes(item: ProductMapItem | null, categoryItems: ProductMapItem[]): ProductTreeNode[] {
  if (!item) {
    return [];
  }

  const relationLabels = uniqueBy(
    [...item.dependencies, ...item.consumers].filter(Boolean),
    (label) => normalizeProductRenderKey(label)
  );

  return relationLabels.slice(0, 8).map((label, index) => {
    const target = categoryItems.find((candidate) =>
      normalizeProductRenderKey(candidate.title) === normalizeProductRenderKey(label) ||
      normalizeProductRenderKey(candidate.subtitle) === normalizeProductRenderKey(label)
    );

    return {
      id: `isolated.dependency.${item.id}.${index}.${label}`,
      label,
      tone: target?.tone ?? item.tone,
      badge: target?.kind ?? 'relation',
      sourceFile: target?.sourceFile,
      targetId: target?.id
    };
  });
}

export function createProductRenderEngineScene(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  item: ProductMapItem | null,
  pageTree: ProductTreeNode[],
  features: Array<ProductDocsFeature | FeatureDocEntry>,
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>,
  compositionItems: ProductMapItem[],
  theme: string,
  categoryId = ''
): ProductRenderEngineScene {
  const mode = resolveProductRenderSurfaceMode(item);
  const renderSlots = createProductRenderWireframeSlots(page, template, item, compositionItems, features, designNodes);
  const layoutVariant = resolveProductRenderLayoutVariant(page, template, item, categoryId);
  const layoutSlots = createProductRenderLayoutSlots(page, template, item, compositionItems, designNodes, layoutVariant);
  const compositionTree: ProductTreeNode[] = page
    ? [
        {
          id: `render.page.${page.id}`,
          label: page.title,
          tone: 'product',
          badge: 'page',
          sourceFile: page.config,
          targetId: createProductPageMapItemId(page.id),
          children: pageTree
        }
      ]
    : pageTree;
  const sourceFiles = new Set([
    page?.config,
    item?.sourceFile,
    ...(page?.sourceEntities?.map((entity) => entity.sourceFile) ?? []),
    ...(template?.sourceEntities?.map((entity) => entity.sourceFile) ?? [])
  ].filter((sourceFile): sourceFile is string => Boolean(sourceFile)));

  return {
    title: item?.title ?? page?.title ?? 'Product selection',
    summary: item?.summary ?? page?.summary ?? 'Render scene generated from the selected product element.',
    mode,
    resolution: layoutVariant === 'isolated' ? '720 x 520' : '1280 x 720',
    theme,
    slots: renderSlots,
    layoutSlots,
    layoutVariant,
    componentGroups: createProductRenderComponentGroups(renderSlots, layoutSlots),
    compositionRows: flattenProductTreeNodes(compositionTree).slice(0, 18),
    template,
    designNodes: uniqueBy(designNodes, (node) => node.id).slice(0, 8),
    compositionItems: compositionItems.slice(0, 7),
    menuEntries: (page?.entryPoints ?? []).map((entryPoint) => ({
      label: entryPoint.label,
      href: entryPoint.href,
      status: page?.status ?? 'active'
    })),
    metadata: [
      { label: 'Mode', value: mode },
      { label: 'Runtime', value: page ? resolveProductInspectorRuntime(page, template) : 'selection-runtime' },
      { label: 'Fichiers', value: String(sourceFiles.size) },
      { label: 'Features', value: String(features.length) },
      { label: 'Source', value: item?.sourceFile ?? page?.config ?? 'none' }
    ]
  };
}

export function createProductRenderComponentGroups(
  slots: ProductRenderWireframeSlot[],
  layoutSlots: ProductRenderLayoutSlot[]
): ProductRenderComponentGroup[] {
  const renderItems = uniqueBy([...layoutSlots, ...slots], (slot) => `${slot.role}.${slot.source}.${slot.label}`);
  const groups: ProductRenderComponentGroup[] = [
    {
      label: 'Organisms',
      tone: 'design',
      items: renderItems.filter((slot) => /organism|page|surface|layout|template/i.test(slot.role)).slice(0, 8)
    },
    {
      label: 'Molecules',
      tone: 'product',
      items: renderItems.filter((slot) => /molecule|feature|tool|route|panel|slot/i.test(slot.role)).slice(0, 8)
    },
    {
      label: 'Atoms',
      tone: 'runtime',
      items: renderItems.filter((slot) => /atom|token|primitive|field|icon|button|input/i.test(slot.role)).slice(0, 8)
    }
  ];

  return groups.map((group) => ({
    ...group,
    items: group.items.length > 0 ? group.items : renderItems.slice(0, 4)
  }));
}

export function createProductRenderComputedLayers(scene: ProductRenderEngineScene | null): ProductRenderComputedLayer[] {
  if (!scene) {
    return [];
  }

  const bounds = resolveProductRenderResolution(scene.resolution);

  if (scene.layoutVariant === 'isolated') {
    return createProductIsolatedComputedLayers(scene, bounds);
  }

  const shellInset = 12;
  const topHeight = Math.max(48, Math.round(bounds.height * 0.08));
  const footerHeight = Math.max(44, Math.round(bounds.height * 0.07));
  const contentWidth = Math.max(1, bounds.width - shellInset * 2);
  const isCompactViewport = contentWidth < 720;
  const sideMinWidth = Math.min(160, Math.max(72, Math.round(contentWidth * 0.22)));
  const leftWidth = isCompactViewport
    ? Math.round(contentWidth * 0.24)
    : Math.max(sideMinWidth, Math.round(contentWidth * 0.19));
  const rightWidth = isCompactViewport
    ? Math.round(contentWidth * 0.24)
    : Math.max(sideMinWidth, Math.round(contentWidth * 0.2));
  const contentTop = shellInset + topHeight;
  const contentHeight = Math.max(120, bounds.height - topHeight - footerHeight - shellInset * 2);
  const workspaceWidth = Math.max(1, contentWidth - leftWidth - rightWidth);
  const layers: ProductRenderComputedLayer[] = [
    {
      id: 'frame.template',
      label: scene.template?.title ?? scene.title,
      role: scene.template?.role ?? 'Application frame',
      tone: 'template',
      source: scene.layoutVariant === 'app-shell' ? 'Application frame' : scene.mode,
      area: 'toolbar',
      targetId: scene.template ? createProductTemplateMapItemId(scene.template.id) : undefined,
      x: shellInset,
      y: shellInset,
      width: bounds.width - shellInset * 2,
      height: topHeight
    }
  ];

  for (const slot of scene.layoutSlots) {
    const area = slot.area ?? 'auto';
    const layerBounds =
      area === 'toolbar'
        ? { x: shellInset, y: shellInset, width: bounds.width - shellInset * 2, height: topHeight }
        : area === 'left'
          ? { x: shellInset, y: contentTop, width: leftWidth, height: contentHeight }
          : area === 'right'
            ? { x: bounds.width - rightWidth - shellInset, y: contentTop, width: rightWidth, height: contentHeight }
            : area === 'footer'
              ? { x: shellInset, y: bounds.height - footerHeight - shellInset, width: bounds.width - shellInset * 2, height: footerHeight }
              : area === 'workspace'
                ? { x: shellInset + leftWidth, y: contentTop, width: workspaceWidth, height: contentHeight }
                : resolveProductRenderAutoLayerBounds(layers.length, bounds, contentTop, contentHeight, shellInset);

    layers.push({
      ...slot,
      ...layerBounds
    });
  }

  return layers;
}

export function createProductIsolatedComputedLayers(
  scene: ProductRenderEngineScene,
  bounds: { width: number; height: number }
): ProductRenderComputedLayer[] {
  if (scene.layoutSlots[0]?.role.toLowerCase().includes('atom')) {
    return createProductAtomComputedLayers(scene, bounds);
  }

  const inset = 28;
  const selectedSlot = scene.layoutSlots[0] ?? scene.slots[0] ?? {
    id: 'isolated.empty',
    label: scene.title,
    role: 'Selection',
    tone: 'shared' as ProductMapTone,
    source: scene.summary,
    area: 'workspace' as ProductRenderLayoutArea
  };
  const primaryWidth = Math.min(360, Math.max(220, bounds.width * 0.48));
  const primaryHeight = Math.min(180, Math.max(96, bounds.height * 0.3));
  const layers: ProductRenderComputedLayer[] = [
    {
      ...selectedSlot,
      id: selectedSlot.id,
      label: selectedSlot.label,
      x: Math.round((bounds.width - primaryWidth) / 2),
      y: inset + 34,
      width: Math.round(primaryWidth),
      height: Math.round(primaryHeight)
    }
  ];
  const satelliteSlots = scene.layoutSlots.slice(1, 9);
  const chipWidth = Math.max(150, Math.min(220, (bounds.width - inset * 2 - 18) / 2));
  const chipHeight = 58;

  satelliteSlots.forEach((slot, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    layers.push({
      ...slot,
      x: Math.round(inset + column * (chipWidth + 18)),
      y: Math.round(inset + primaryHeight + 78 + row * (chipHeight + 12)),
      width: Math.round(chipWidth),
      height: chipHeight
    });
  });

  return layers;
}

export function createProductAtomComputedLayers(
  scene: ProductRenderEngineScene,
  bounds: { width: number; height: number }
): ProductRenderComputedLayer[] {
  const selectedSlot = scene.layoutSlots[0] ?? scene.slots[0];
  const slots = scene.layoutSlots.slice(1);
  const stateSlots = slots.filter((slot) => slot.role.toLowerCase().includes('state')).slice(0, 5);
  const tokenSlots = slots.filter((slot) => slot.role.toLowerCase().includes('token')).slice(0, 6);
  const relationSlots = slots.filter((slot) => !stateSlots.includes(slot) && !tokenSlots.includes(slot)).slice(0, 4);
  const centerX = Math.round(bounds.width * 0.5);
  const controlSize = 44;
  const frameWidth = Math.min(520, Math.max(360, Math.round(bounds.width * 0.66)));
  const frameHeight = Math.min(310, Math.max(230, 150 + Math.ceil((tokenSlots.length + relationSlots.length) / 2) * 48));
  const frameX = Math.round(centerX - frameWidth / 2);
  const frameY = Math.max(42, Math.round(bounds.height * 0.18));
  const controlY = frameY + 68;
  const layers: ProductRenderComputedLayer[] = selectedSlot
    ? [
        {
          id: `${selectedSlot.id}.contract`,
          label: `${selectedSlot.source || selectedSlot.label} contract`,
          role: 'Component Contract',
          tone: selectedSlot.tone,
          source: `${stateSlots.length} states - ${tokenSlots.length} tokens - ${relationSlots.length} links`,
          area: 'workspace',
          x: frameX,
          y: frameY,
          width: frameWidth,
          height: frameHeight
        },
        {
          ...selectedSlot,
          role: 'Component Instance',
          x: centerX - controlSize / 2,
          y: controlY,
          width: controlSize,
          height: controlSize
        },
        {
          id: `${selectedSlot.id}.icon-slot`,
          label: 'slot',
          role: 'Component Slot',
          tone: selectedSlot.tone,
          source: relationSlots[0]?.source ?? 'content / icon',
          targetId: selectedSlot.targetId,
          area: 'auto',
          x: centerX - 9,
          y: controlY + 13,
          width: 18,
          height: 18
        }
      ]
    : [];
  const stateWidth = Math.min(108, Math.max(82, Math.round((frameWidth - 48) / Math.max(1, stateSlots.length))));
  const stateHeight = 34;
  const stateGap = 8;
  const stateStartX = Math.round(centerX - (stateSlots.length * stateWidth + Math.max(0, stateSlots.length - 1) * stateGap) / 2);
  const chipWidth = Math.min(156, Math.max(126, Math.round((frameWidth - 72) / 2)));
  const chipHeight = 38;
  const chipStartX = Math.round(centerX - chipWidth - 12);

  stateSlots.forEach((slot, index) => {
    layers.push({
      ...slot,
      x: stateStartX + index * (stateWidth + stateGap),
      y: controlY + controlSize + 38,
      width: stateWidth,
      height: stateHeight
    });
  });

  [...tokenSlots, ...relationSlots].forEach((slot, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    layers.push({
      ...slot,
      x: chipStartX + column * (chipWidth + 24),
      y: controlY + controlSize + 92 + row * (chipHeight + 10),
      width: chipWidth,
      height: chipHeight
    });
  });

  return layers;
}

export function resolveProductRenderResolution(resolution: string): { width: number; height: number } {
  const match = resolution.match(/(\d+)\s*x\s*(\d+)/i);

  return {
    width: match ? Number(match[1]) : 1280,
    height: match ? Number(match[2]) : 720
  };
}

export function resolveProductRenderAutoLayerBounds(
  index: number,
  bounds: { width: number; height: number },
  contentTop: number,
  contentHeight: number,
  shellInset: number
): { x: number; y: number; width: number; height: number } {
  const columns = 3;
  const gap = 8;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const width = Math.max(140, (bounds.width - shellInset * 2 - gap * (columns - 1)) / columns);
  const height = Math.max(72, Math.min(180, contentHeight * 0.34));

  return {
    x: shellInset + column * (width + gap),
    y: contentTop + row * (height + gap),
    width,
    height
  };
}

export function createProductPropertiesModel(
  item: ProductMapItem | null,
  layer: ProductRenderComputedLayer | null,
  scene: ProductRenderEngineScene | null
): ProductPropertiesModel {
  const bounds = resolveProductRenderResolution(scene?.resolution ?? '1280 x 720');
  const kind = item?.kind ?? layer?.role ?? 'Element';
  const roleSignature = `${kind} ${layer?.role ?? ''} ${layer?.area ?? ''}`.toLowerCase();
  const width = Math.round(layer?.width ?? (kind === 'Page' || roleSignature.includes('route') ? bounds.width : Math.min(680, bounds.width)));
  const height = Math.round(layer?.height ?? (kind === 'Page' || roleSignature.includes('route') ? bounds.height : Math.max(40, Math.round(bounds.height * 0.08))));
  const paddingX = roleSignature.includes('route') ? 0 : roleSignature.includes('slot') ? 12 : 16;
  const paddingY = roleSignature.includes('route') ? 0 : roleSignature.includes('slot') ? 10 : 12;
  const border = layer ? 1 : 0;
  const contentWidth = Math.max(0, width - paddingX * 2 - border * 2);
  const contentHeight = Math.max(0, height - paddingY * 2 - border * 2);
  const display = roleSignature.includes('route')
    ? 'contents'
    : roleSignature.includes('toolbar') || roleSignature.includes('footer')
      ? 'flex'
      : roleSignature.includes('layout') || roleSignature.includes('template') || kind === 'Page'
        ? 'grid'
        : 'block';

  return {
    computed: [
      { label: 'font-size', value: roleSignature.includes('page') ? '14px' : '12px' },
      { label: 'font-weight', value: roleSignature.includes('page') || roleSignature.includes('template') ? '800' : '700' },
      { label: 'color', value: 'var(--color-text)' },
      { label: 'line-height', value: '1.2' },
      { label: 'margin', value: '0px' },
      { label: 'padding', value: `${paddingY}px ${paddingX}px` },
      { label: 'width', value: `${width}px` },
      { label: 'height', value: `${height}px` },
      { label: 'display', value: display },
      { label: 'position', value: layer ? 'absolute' : 'relative' },
      { label: 'source', value: item?.sourceFile ?? layer?.source ?? scene?.metadata.find((row) => row.label === 'Source')?.value ?? 'none' }
    ],
    box: {
      margin: '0',
      border: String(border),
      padding: `${paddingY} / ${paddingX}`,
      content: `${contentWidth} x ${contentHeight}`
    }
  };
}

export function createProductRenderLayoutSlots(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  item: ProductMapItem | null,
  compositionItems: ProductMapItem[],
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>,
  variant: ProductRenderLayoutVariant
): ProductRenderLayoutSlot[] {
  if (variant === 'isolated') {
    return createProductRenderIsolatedLayoutSlots(item, compositionItems);
  }

  const layoutBlueprint = createProductRenderLayoutBlueprint(page, template, item, variant);
  const candidates = uniqueBy([
    ...(item ? [item] : []),
    ...compositionItems,
    ...designNodes.map((node) => createDesignNodeMapItem(node, 'design', node.category === 'layout' ? 'Layout' : node.category))
  ], (candidate) => candidate.id);
  const usedCandidateIds = new Set<string>();
  const usedAreas = new Set<ProductRenderLayoutArea>();

  return layoutBlueprint.map((slot, index) => {
    const candidate = resolveProductRenderSlotCandidate(`${slot.label} ${slot.terms.join(' ')}`, candidates, index, usedCandidateIds);
    const preferredArea = slot.area;
    const area = preferredArea !== 'auto' && !usedAreas.has(preferredArea) ? preferredArea : 'auto';

    if (area !== 'auto') {
      usedAreas.add(area);
    }

    if (candidate) {
      usedCandidateIds.add(candidate.id);
    }

    return {
      id: `layout.${template?.id ?? page?.id ?? 'selection'}.${createProductRenderSlotId(slot.label, index)}`,
      label: slot.label,
      role: candidate?.kind ?? 'Slot',
      tone: candidate?.tone ?? 'template',
      source: candidate?.title ?? page?.title ?? template?.title ?? 'Selection',
      targetId: candidate?.id,
      area
    };
  });
}

export function createProductRenderIsolatedLayoutSlots(
  item: ProductMapItem | null,
  compositionItems: ProductMapItem[]
): ProductRenderLayoutSlot[] {
  const selectedItem = item ?? compositionItems[0] ?? null;

  if (selectedItem && selectedItem.kind.toLowerCase().includes('atom')) {
    return createProductRenderAtomLayoutSlots(selectedItem, compositionItems);
  }

  const relatedItems = compositionItems.filter((candidate) => candidate.id !== selectedItem?.id);
  const relationSlots = selectedItem
    ? uniqueBy([...selectedItem.dependencies, ...selectedItem.consumers], (label) => normalizeProductRenderKey(label))
        .slice(0, 4)
        .map((label, index) => ({
          id: `isolated.relation.${selectedItem.id}.${index}`,
          label,
          role: 'Relation',
          tone: selectedItem.tone,
          source: selectedItem.title,
          area: 'auto' as ProductRenderLayoutArea
        }))
    : [];

  return [
    selectedItem
      ? {
          id: `isolated.preview.${selectedItem.id}`,
          label: selectedItem.title,
          role: selectedItem.kind,
          tone: selectedItem.tone,
          source: selectedItem.sourceFile ?? selectedItem.subtitle,
          targetId: selectedItem.id,
          area: 'workspace' as ProductRenderLayoutArea
        }
      : null,
    ...relatedItems.slice(0, 7).map((candidate, index) => ({
      id: `isolated.related.${index}.${candidate.id}`,
      label: candidate.title,
      role: candidate.kind,
      tone: candidate.tone,
      source: candidate.sourceFile ?? candidate.subtitle,
      targetId: candidate.id,
      area: 'auto' as ProductRenderLayoutArea
    })),
    ...relationSlots
  ].filter((slot): slot is ProductRenderLayoutSlot => Boolean(slot)).slice(0, 10);
}

export function createProductRenderAtomLayoutSlots(
  selectedItem: ProductMapItem,
  compositionItems: ProductMapItem[]
): ProductRenderLayoutSlot[] {
  const signature = normalizeProductRenderKey(`${selectedItem.title} ${selectedItem.subtitle} ${selectedItem.sourceFile ?? ''}`);
  const sourceLabel = signature.includes('icon button') || signature.includes('iconbutton')
    ? 'IconButton'
    : selectedItem.title;
  const atomSlots: ProductRenderLayoutSlot[] = [
    {
      id: `isolated.atom.${selectedItem.id}.root`,
      label: sourceLabel === 'IconButton' ? 'button.icon-button' : selectedItem.title,
      role: 'Atom',
      tone: selectedItem.tone,
      source: sourceLabel,
      targetId: selectedItem.id,
      area: 'workspace'
    }
  ];
  const contractSlots = sourceLabel === 'IconButton'
    ? [
        ['ghost', 'State', 'variant=ghost'],
        ['active', 'State', 'variant=active'],
        ['danger', 'State', 'variant=danger'],
        ['disabled', 'State', 'disabled=true'],
        ['button box', 'Token', '--size-icon-button'],
        ['icon box', 'Token', '--size-icon'],
        ['radius', 'Token', '--radius-medium'],
        ['icon source', 'Relation', 'WorkbenchIcon / slot']
      ]
    : uniqueBy([...selectedItem.dependencies, ...selectedItem.consumers], (label) => normalizeProductRenderKey(label))
        .slice(0, 8)
        .map((label) => [label, 'Relation', selectedItem.title]);

  contractSlots.forEach(([label, role, source], index) => {
    const relatedItem = compositionItems.find((candidate) =>
      normalizeProductRenderKey(candidate.title) === normalizeProductRenderKey(label) ||
      normalizeProductRenderKey(candidate.subtitle) === normalizeProductRenderKey(label)
    );

    atomSlots.push({
      id: `isolated.atom.${selectedItem.id}.${index}.${label}`,
      label,
      role,
      tone: relatedItem?.tone ?? selectedItem.tone,
      source,
      targetId: relatedItem?.id,
      area: 'auto'
    });
  });

  return atomSlots;
}

export function createProductRenderLayoutBlueprint(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  item: ProductMapItem | null,
  variant: ProductRenderLayoutVariant
): Array<{ label: string; area: ProductRenderLayoutArea; terms: string[] }> {
  if (variant === 'app-shell') {
    return [
      { label: 'Sidebar left', area: 'left', terms: ['left', 'sidebar', 'rail', 'navigation', 'panel stack'] },
      { label: 'Content', area: 'workspace', terms: ['content', 'workspace', 'surface', 'panel stack', page?.title ?? ''] },
      { label: 'Sidebar right', area: 'right', terms: ['right', 'sidebar', 'inspector', 'panel chrome'] },
      { label: 'Bottom', area: 'footer', terms: ['bottom', 'footer', 'status bar', 'runtime'] }
    ];
  }

  const templateSlots = template?.slots?.length ? template.slots : ['surface', 'content'];

  return templateSlots.map((slot, index) => ({
    label: slot,
    area: resolveProductRenderLayoutArea(slot, index),
    terms: [slot, template?.title ?? '', item?.title ?? '']
  }));
}

export function resolveProductRenderSlotCandidate(
  slot: string,
  candidates: ProductMapItem[],
  index: number,
  excludedCandidateIds = new Set<string>()
): ProductMapItem | null {
  if (candidates.length === 0) {
    return null;
  }

  const availableCandidates = candidates.filter((candidate) => !excludedCandidateIds.has(candidate.id));
  const scopedCandidates = availableCandidates.length ? availableCandidates : candidates;

  return scopedCandidates
    .map((candidate) => ({
      candidate,
      score: scoreProductRenderSlotCandidate(slot, candidate)
    }))
    .sort((left, right) => right.score - left.score)[0]?.candidate ?? scopedCandidates[index % scopedCandidates.length] ?? null;
}

export function scoreProductRenderSlotCandidate(slot: string, candidate: ProductMapItem): number {
  const normalizedSlot = slot.toLowerCase();
  const haystack = [candidate.title, candidate.kind, candidate.subtitle, candidate.summary, ...candidate.tags, ...candidate.dependencies]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  let score = 0;

  if (normalizedSlot.split(/\s+/).some((part) => part && haystack.includes(part))) {
    score += 4;
  }

  if (normalizedSlot.includes('toolbar') && /toolbar|tool|action|menu|chrome/.test(haystack)) {
    score += 8;
  }

  if (normalizedSlot.includes('rail') && /rail|navigation|contextual|sidebar/.test(haystack)) {
    score += 8;
  }

  if (normalizedSlot.includes('workspace') || normalizedSlot.includes('visual') || normalizedSlot.includes('content')) {
    score += /workspace|surface|page|app|docs|graph|preview/.test(haystack) ? 8 : 0;
  }

  if (normalizedSlot.includes('inspector') && /inspector|panel|detail|registry/.test(haystack)) {
    score += 8;
  }

  if (normalizedSlot.includes('footer') || normalizedSlot.includes('status') || normalizedSlot.includes('registry')) {
    score += /footer|status|runtime|registry|page/.test(haystack) ? 8 : 0;
  }

  return score;
}

export function resolveProductRenderLayoutArea(slot: string, index: number): ProductRenderLayoutArea {
  const normalizedSlot = slot.toLowerCase();

  if (/toolbar|tabs|header|top/.test(normalizedSlot)) {
    return 'toolbar';
  }

  if (/left|rail|category|sidebar/.test(normalizedSlot)) {
    return 'left';
  }

  if (/right|inspector|detail/.test(normalizedSlot)) {
    return 'right';
  }

  if (/footer|status|registry|table/.test(normalizedSlot)) {
    return 'footer';
  }

  if (/workspace|grid|visual|preview|content|editor|surface|canvas/.test(normalizedSlot)) {
    return 'workspace';
  }

  return index === 0 ? 'workspace' : 'auto';
}

export function resolveProductRenderLayoutVariant(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  item: ProductMapItem | null,
  categoryId = ''
): ProductRenderLayoutVariant {
  if (shouldUseIsolatedProductScene(item, categoryId)) {
    return 'isolated';
  }

  const signature = [
    item?.id,
    item?.title,
    item?.subtitle,
    template?.id,
    template?.title,
    page?.templateId
  ].filter(Boolean).join(' ').toLowerCase();

  return signature.includes('layout.app-shell') ||
    signature.includes('app shell') ||
    signature.includes('template.workbench-shell')
    ? 'app-shell'
    : 'standard';
}

export function createProductRenderWireframeSlots(
  page: ProductDocsPage | null,
  template: ProductDocsTemplate | null,
  item: ProductMapItem | null,
  compositionItems: ProductMapItem[],
  features: Array<ProductDocsFeature | FeatureDocEntry>,
  designNodes: Array<ProductDocsDesignNode | DesignSystemThemeGraphNode>
): ProductRenderWireframeSlot[] {
  const templateSlots = template?.slots ?? [];
  const selectedSlot: ProductRenderWireframeSlot[] = item
    ? [
        {
          id: `selected.${item.id}`,
          label: item.title,
          role: item.kind,
          tone: item.tone,
          source: item.sourceFile ?? item.subtitle
        }
      ]
    : [];
  const slotNodes = templateSlots.map((slot, index) => {
    const linkedItem = compositionItems[index % Math.max(1, compositionItems.length)] ?? item;

    return {
      id: `slot.${template?.id ?? 'page'}.${createProductRenderSlotId(slot, index)}`,
      label: slot,
      role: linkedItem?.kind ?? 'Slot',
      tone: linkedItem?.tone ?? 'template',
      source: linkedItem?.title ?? template?.title ?? page?.title ?? 'Product shell'
    };
  });
  const pageEntrySlots = (page?.entryPoints ?? []).slice(0, 4).map((entry, index) => ({
    id: `entry.${page?.id ?? 'page'}.${index}`,
    label: entry.label,
    role: entry.kind,
    tone: 'product' as ProductMapTone,
    source: entry.href
  }));
  const featureSlots = features.slice(0, 3).map((feature, index) => ({
    id: `feature.${feature.id}.${index}`,
    label: feature.title,
    role: 'Feature',
    tone: 'runtime' as ProductMapTone,
    source: feature.domain
  }));
  const designSlots = designNodes.slice(0, 3).map((node, index) => ({
    id: `design.${node.id}.${index}`,
    label: node.title,
    role: node.category,
    tone: 'design' as ProductMapTone,
    source: node.id
  }));

  return uniqueBy([...selectedSlot, ...slotNodes, ...pageEntrySlots, ...featureSlots, ...designSlots], (slot) => slot.id).slice(0, 12);
}

export function createProductRenderSlotId(label: string, index: number): string {
  return `${index}.${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function resolveProductRenderSurfaceMode(item: ProductMapItem | null): ProductRenderSurfaceMode {
  return item ? 'projection' : 'projection';
}

function flattenProductTreeNodes(nodes: ProductTreeNode[], depth = 0): ProductFlatTreeNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenProductTreeNodes(node.children ?? [], depth + 1)
  ]);
}

function normalizeProductRenderKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function uniqueBy<T>(items: T[], resolveKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = resolveKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}
