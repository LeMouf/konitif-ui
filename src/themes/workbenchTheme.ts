export type WorkbenchThemeMode = 'dark' | 'light';

export interface WorkbenchThemeAsset {
  kind: 'css' | 'icon-library';
  id: string;
  source: string;
}

export interface WorkbenchThemeDefinition {
  id: string;
  title: string;
  version: string;
  defaultMode: WorkbenchThemeMode;
  modes: WorkbenchThemeMode[];
  assets: WorkbenchThemeAsset[];
  designNodeIds: string[];
}

export const workbenchThemeDefinition: WorkbenchThemeDefinition = {
  id: 'workbench-theme.v1',
  title: 'Workbench Theme',
  version: '0.1.0',
  defaultMode: 'dark',
  modes: ['dark', 'light'],
  assets: [
    {
      kind: 'css',
      id: 'workbench-theme-css',
      source: 'packages/workbench-ui/src/themes/workbenchTheme.css'
    },
    {
      kind: 'icon-library',
      id: 'workbench-icons.v1',
      source: 'packages/workbench-ui/src/themes/workbenchIconLibrary.ts'
    }
  ],
  designNodeIds: [
    'theme.workbench.dark',
    'foundation.color',
    'foundation.shape',
    'iconography.action-icons',
    'iconography.tool-glyphs'
  ]
};
