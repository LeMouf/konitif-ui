import { getContext, setContext } from 'svelte';
import type { ComponentType, SvelteComponent } from 'svelte';
import type { LaunchPhase } from '@konitif/workbench';
import WorkbenchAmbientRuntime from './WorkbenchAmbientRuntime.svelte';
import WorkbenchFocusPlaneProvider from './WorkbenchFocusPlaneProvider.svelte';
import WorkbenchSurfaceFrame from './WorkbenchSurfaceFrame.svelte';

export type WorkbenchThemeColorMode = 'dark' | 'light';
export type WorkbenchAmbientQuality = 'off' | 'low' | 'medium' | 'high';
export type WorkbenchRuntimeVisualPhase = LaunchPhase | 'TEARING_DOWN' | 'RECOVERING';
export type WorkbenchThemeComponent = ComponentType<SvelteComponent>;

export interface WorkbenchThemeRuntime {
  themeFamily: string;
  AmbientRuntime: WorkbenchThemeComponent;
  FocusPlaneProvider: WorkbenchThemeComponent;
  SurfaceFrame: WorkbenchThemeComponent;
  applyTheme: (themeId: string, colorMode: WorkbenchThemeColorMode) => void;
  resolveThemeModeId: (colorMode: WorkbenchThemeColorMode) => string;
}

export interface WorkbenchThemeRuntimeContext {
  getRuntime: () => WorkbenchThemeRuntime;
}

const WORKBENCH_THEME_RUNTIME_CONTEXT = Symbol('workbench-theme-runtime');

export const defaultWorkbenchThemeRuntime: WorkbenchThemeRuntime = {
  themeFamily: 'workbench',
  AmbientRuntime: WorkbenchAmbientRuntime,
  FocusPlaneProvider: WorkbenchFocusPlaneProvider,
  SurfaceFrame: WorkbenchSurfaceFrame,
  applyTheme: applyDefaultWorkbenchTheme,
  resolveThemeModeId: resolveDefaultWorkbenchThemeModeId
};

export function resolveDefaultWorkbenchThemeModeId(colorMode: WorkbenchThemeColorMode): string {
  return `workbench-${colorMode}`;
}

export function applyDefaultWorkbenchTheme(themeId: string, colorMode: WorkbenchThemeColorMode): void {
  const resolvedTarget = typeof document === 'undefined' ? null : document.documentElement;

  if (!resolvedTarget) {
    return;
  }

  resolvedTarget.dataset.theme = themeId;
  resolvedTarget.dataset.workbenchTheme = 'workbench';
  resolvedTarget.dataset.workbenchColorMode = colorMode;
}

export function setWorkbenchThemeRuntimeContext(getRuntime: () => WorkbenchThemeRuntime): void {
  setContext<WorkbenchThemeRuntimeContext>(WORKBENCH_THEME_RUNTIME_CONTEXT, {
    getRuntime
  });
}

export function getWorkbenchThemeRuntimeContext(): WorkbenchThemeRuntimeContext {
  return getContext<WorkbenchThemeRuntimeContext>(WORKBENCH_THEME_RUNTIME_CONTEXT) ?? {
    getRuntime: () => defaultWorkbenchThemeRuntime
  };
}
