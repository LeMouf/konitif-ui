import { listWorkbenchIcons, type WorkbenchIconDefinition } from '../icons/iconRegistry';

export interface WorkbenchIconLibraryEntry {
  id: WorkbenchIconDefinition['id'];
  title: string;
  category: WorkbenchIconDefinition['category'];
  tone: WorkbenchIconDefinition['tone'];
  designNodeId?: string;
}

export interface WorkbenchIconLibraryDefinition {
  id: string;
  title: string;
  themeId: string;
  source: string;
  loader: {
    strategy: 'registry-inline-svg' | 'svg-component-import';
    importQuery?: string;
  };
  icons: WorkbenchIconLibraryEntry[];
}

export const workbenchIconLibrary: WorkbenchIconLibraryDefinition = {
  id: 'workbench-icons.v1',
  title: 'Workbench Icon Library',
  themeId: 'workbench-theme.v1',
  source: 'src/icons/iconRegistry.ts',
  loader: {
    strategy: 'registry-inline-svg',
    importQuery: '?component'
  },
  icons: listWorkbenchIcons().map((icon) => ({
    id: icon.id,
    title: icon.title,
    category: icon.category,
    tone: icon.tone,
    designNodeId: icon.designNodeId
  }))
};
