export interface WorkbenchSvgComponentLoaderDefinition {
  id: string;
  packageName: string;
  includePaths: string[];
  importQuery: string;
  type: 'component';
  svgo: {
    multipass: boolean;
    preserveViewBox: boolean;
    removePresentationAttrs: string[];
  };
}

export const workbenchSvgComponentLoader: WorkbenchSvgComponentLoaderDefinition = {
  id: 'workbench-svg-component-loader.v1',
  packageName: '@poppanator/sveltekit-svg',
  includePaths: ['packages/workbench-ui/src/themes/icons/'],
  importQuery: '?component',
  type: 'component',
  svgo: {
    multipass: true,
    preserveViewBox: true,
    removePresentationAttrs: ['fill', 'stroke']
  }
};
