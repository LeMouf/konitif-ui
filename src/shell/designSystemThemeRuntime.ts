import type { DesignSystemThemeMode } from '@konitif/workbench';

export const DESIGN_SYSTEM_THEME_RUNTIME_STYLE_ID = 'workbench-design-system-theme-runtime';

const CSS_CUSTOM_PROPERTY_NAME_PATTERN = /^--[a-zA-Z0-9_-]+$/;
export const DARK_THEME_VALUES: Record<string, string> = {
  '--color-background-canvas': '#0d1117',
  '--color-background-surface': '#141922',
  '--color-background-elevated': '#191f29',
  '--color-background-accent': '#1f2633',
  '--color-background-muted': '#10151d',
  '--color-background-empty-panel': '#111722',
  '--color-background-empty-panel-stripe': 'rgba(144, 160, 188, 0.04)',
  '--color-background-hover': '#202938',
  '--color-background-pressed': '#263143',
  '--color-background-selected': '#1c2532',
  '--color-background-danger': '#2a171b',
  '--color-background-danger-hover': '#341c22',
  '--color-background-overlay': 'rgba(6, 9, 14, 0.72)',
  '--color-background-glow': 'rgba(121, 151, 214, 0.1)',
  '--color-border-subtle': '#252d3a',
  '--color-border-strong': '#364153',
  '--color-border-focus': '#7ca2f8',
  '--color-border-danger': '#7b3b45',
  '--color-border-edge-split': '#5f6d89',
  '--color-border-edge-split-hover': '#8fb0fb',
  '--color-text-primary': '#eef2f7',
  '--color-text-secondary': '#b6c0cf',
  '--color-text-muted': '#7d8898',
  '--color-text-danger': '#ffb6bf',
  '--color-status-success': '#8ccf67',
  '--color-status-warning': '#e3a943',
  '--color-status-danger': '#ff8794',
  '--color-action-primary': '#7ca2f8',
  '--color-action-primary-hover': '#8fb0fb',
  '--color-action-secondary': '#1a212d',
  '--color-action-secondary-hover': '#222c3b',
  '--color-action-danger': '#5f2831',
  '--color-action-danger-hover': '#73303b',
  '--shadow-surface': '0 14px 36px rgba(4, 8, 14, 0.4)',
  '--shadow-focus': '0 0 0 1px var(--color-border-focus)'
};

export const LIGHT_THEME_VALUES: Record<string, string> = {
  '--color-background-canvas': '#edf1f7',
  '--color-background-surface': '#ffffff',
  '--color-background-elevated': '#f8fafc',
  '--color-background-accent': '#e7edf6',
  '--color-background-muted': '#f2f5f9',
  '--color-background-empty-panel': '#eef3f8',
  '--color-background-empty-panel-stripe': 'rgba(42, 57, 79, 0.06)',
  '--color-background-hover': '#e8eef6',
  '--color-background-pressed': '#dbe5f0',
  '--color-background-selected': '#dfeaff',
  '--color-background-danger': '#fff0f2',
  '--color-background-danger-hover': '#ffe1e6',
  '--color-background-overlay': 'rgba(21, 28, 38, 0.34)',
  '--color-background-glow': 'rgba(67, 111, 186, 0.12)',
  '--color-border-subtle': '#d3dbe7',
  '--color-border-strong': '#aeb9c8',
  '--color-border-focus': '#4d79d8',
  '--color-border-danger': '#d57782',
  '--color-border-edge-split': '#8b9ab0',
  '--color-border-edge-split-hover': '#4d79d8',
  '--color-text-primary': '#101721',
  '--color-text-secondary': '#435066',
  '--color-text-muted': '#6d7789',
  '--color-text-danger': '#a13241',
  '--color-status-success': '#2f9e5f',
  '--color-status-warning': '#b7791f',
  '--color-status-danger': '#d6455a',
  '--color-action-primary': '#386fd6',
  '--color-action-primary-hover': '#285ec2',
  '--color-action-secondary': '#e8eef7',
  '--color-action-secondary-hover': '#dce6f3',
  '--color-action-danger': '#ffd9de',
  '--color-action-danger-hover': '#ffc8cf',
  '--shadow-surface': '0 14px 34px rgba(34, 48, 70, 0.18)',
  '--shadow-focus': '0 0 0 1px var(--color-border-focus)'
};

export function createDesignSystemThemeRuntimeStyleText(
  values: Record<string, string>,
  selector = ':root',
  mode: DesignSystemThemeMode = 'dark'
): string {
  const modeValues = mode === 'light' ? LIGHT_THEME_VALUES : {};
  const declarations = Object.entries({ ...modeValues, ...values })
    .filter(([variable]) => CSS_CUSTOM_PROPERTY_NAME_PATTERN.test(variable))
    .map(([variable, value]) => `  ${variable}: ${normalizeCssCustomPropertyValue(value)};`);

  if (declarations.length === 0 && mode === 'dark') {
    return '';
  }

  return `${selector} {\n  color-scheme: ${mode};\n${declarations.join('\n')}\n}\n`;
}

export function applyDesignSystemThemeRuntimeStyle(
  values: Record<string, string>,
  mode: DesignSystemThemeMode = 'dark'
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const cssText = createDesignSystemThemeRuntimeStyleText(values, ':root', mode);
  let styleElement = document.getElementById(DESIGN_SYSTEM_THEME_RUNTIME_STYLE_ID) as HTMLStyleElement | null;

  if (!cssText) {
    styleElement?.remove();
    return;
  }

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = DESIGN_SYSTEM_THEME_RUNTIME_STYLE_ID;
    styleElement.dataset.source = 'design-system-theme-session';
    document.head.append(styleElement);
  }

  if (styleElement.textContent !== cssText) {
    styleElement.textContent = cssText;
  }
}

export function removeDesignSystemThemeRuntimeStyle(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.getElementById(DESIGN_SYSTEM_THEME_RUNTIME_STYLE_ID)?.remove();
}

function normalizeCssCustomPropertyValue(value: string): string {
  return String(value).replace(/[{};]/g, '').trim();
}
