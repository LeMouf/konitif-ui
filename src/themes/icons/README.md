# Theme Icons

This folder is reserved for SVG source icons that belong to the Workbench theme.

The current implementation uses `src/icons/iconRegistry.ts` as the runtime registry. Once the SVG component loader is enabled, theme-owned SVG files can live here and be imported with the `?component` query described by `workbenchSvgComponentLoader`.
