<script lang="ts">
  import type { DesignSystemThemeDocument } from '../designSystemThemeCatalog';
  export let themeDocument: DesignSystemThemeDocument | null = null;
  import type {
    DesignSystemThemeMode,
    BootProjection,
    RuntimeProjectionSessionEntry,
    WorkbenchReadingLevel,
    WorkbenchRuntimeSnapshot
  } from '@konitif/workbench';
  import type { WorkbenchLocaleOption } from '../../i18n/workbenchLanguagePreference';
  import type { FeatureDocContextGroup, FeatureDocEntry, FeatureDocFilter } from '../technicalDocsCatalog';
  import type {
    RuntimeProjectionActionState,
    RuntimeProjectionTarget,
    RuntimeProjectionViewerOption
  } from '../runtimeObservability';
  import AppShellFooterAudioControl from './AppShellFooterAudioControl.svelte';
  import AppShellFooterDocsControl from './AppShellFooterDocsControl.svelte';
  import AppShellFooterLanguageControl from './AppShellFooterLanguageControl.svelte';
  import AppShellFooterReadingLevelControl from './AppShellFooterReadingLevelControl.svelte';
  import AppShellFooterLayoutControl from './AppShellFooterLayoutControl.svelte';
  import AppShellFooterRuntimeControl from './AppShellFooterRuntimeControl.svelte';
  import AppShellFooterShortcutRegion from './AppShellFooterShortcutRegion.svelte';
  import AppShellFooterThemeControl from './AppShellFooterThemeControl.svelte';

  import type { FooterControlId } from './footerControl';

  type FooterShortcutType = 'view' | 'edit' | 'selection' | 'navigation' | 'playback' | 'system';
  type FooterShortcutScopeFilter = 'all' | 'context' | 'global';
  type FooterShortcutTypeFilter = 'all' | FooterShortcutType;

  type FooterShortcut = {
    id: string;
    key: string;
    label: string;
    type: FooterShortcutType;
    description?: string;
    scopeLabel: string;
    priorityLabel: string;
  };

  type FooterShortcutGroup = {
    key: string;
    label: string;
    items: FooterShortcut[];
  };

  type FooterAudioMeter = {
    left: number;
    right: number;
    peakDb: number;
  };

  type FooterAudioChannel = {
    id: string;
    label: string;
    volume: number;
    muted: boolean;
    meter?: FooterAudioMeter;
  };

  type FooterAudioSummary = {
    title: string;
    status: string;
    summary: string;
    meta: string[];
    mediaBlocks?: Array<{
      id: string;
      title: string;
      status: string;
      summary: string;
      meta: string[];
      progress: number | null;
    }>;
  };

  type LayoutEditOptionKey =
    | 'leftDockVisible'
    | 'rightDockVisible'
    | 'bottomDockVisible'
    | 'shellRegionResize'
    | 'boundaryResize'
    | 'boundaryPull'
    | 'intersectionResize'
    | 'panelHeaderUi'
    | 'panelToolSelectorUi'
    | 'panelActionMenuUi'
    | 'dockToggleButtonsVisible'
    | 'layoutMenuVisible'
    | 'resizeSnap'
    | 'deleteZones'
    | 'dockPreview'
    | 'movePanel'
    | 'dockAsTab'
    | 'dockToSide'
    | 'panelLayoutMenu'
    | 'panelToggleHeader'
    | 'toggleFullscreen'
    | 'closePanel'
    | 'panelSplitVertical'
    | 'panelSplitHorizontal'
    | 'panelJoinAreas'
    | 'panelSwapAreas'
    | 'widgetZoneHost'
    | 'widgetPlacementActions'
    | 'shellRegionEmptyState'
    | 'widgetZonePopulate';

  type LayoutEditModeView = 'off' | 'on';

  type LayoutEditOptionStatus = {
    raw: boolean;
    enabled: boolean;
    state: 'enabled' | 'disabled' | 'blocked';
    blockedBy: LayoutEditOptionKey[];
  };

  type LayoutEditSection = {
    title: string;
    items: Array<{ key: LayoutEditOptionKey; label: string }>;
  };

  export let footerLabel = 'Workbench status';
  export let appVersion: string | null = null;
  export let hoveredFooterControl: FooterControlId | null = null;
  export let activeI18nLocale = 'en';
  export let i18nLocaleOptions: WorkbenchLocaleOption[] = [];
  export let handleI18nLocaleChange: (event: Event) => void = () => undefined;
  export let activeReadingLevelDefault: WorkbenchReadingLevel = 'casual';
  export let handleReadingLevelDefaultChange: (event: Event) => void = () => undefined;

  export let isShortcutMenuOpen = false;
  export let shortcutMenuElement: HTMLDivElement | null = null;
  export let shortcutMenuButtonElement: HTMLButtonElement | null = null;
  export let allFooterShortcuts: FooterShortcut[] = [];
  export let visibleFooterContextShortcuts: FooterShortcut[] = [];
  export let visibleFooterGlobalShortcuts: FooterShortcut[] = [];
  export let footerShortcutOverflowCount = 0;
  export let footerShortcutGroups: FooterShortcutGroup[] = [];
  export let filteredFooterShortcuts: FooterShortcut[] = [];
  export let shortcutQuery = '';
  export let shortcutScopeFilter: FooterShortcutScopeFilter = 'all';
  export let shortcutTypeFilter: FooterShortcutTypeFilter = 'all';
  export let shortcutScopeFilters: Array<{ key: FooterShortcutScopeFilter; label: string }> = [];
  export let shortcutTypeFilters: Array<{ key: FooterShortcutTypeFilter; label: string }> = [];
  export let toggleShortcutMenu: () => void = () => undefined;
  export let selectShortcutScopeFilter: (filter: FooterShortcutScopeFilter) => void = () => undefined;
  export let selectShortcutTypeFilter: (filter: FooterShortcutTypeFilter) => void = () => undefined;
  export let resolveShellShortcutTypeLabel: (type: FooterShortcutType) => string = (type) => type;

  export let themeControlElement: HTMLDivElement | null = null;
  export let themeMenuElement: HTMLDivElement | null = null;
  export let isThemeMenuOpen = false;
  export let activeDesignThemeMode: DesignSystemThemeMode = 'dark';
  export let isThemeFooterControlActive = false;
  export let toggleThemeMenu: () => void = () => undefined;
  export let toggleDesignThemeMode: () => void = () => undefined;
  export let openDesignGraphDocsRoute: () => void = () => undefined;

  export let runtimeControlElement: HTMLDivElement | null = null;
  export let runtimeMenuElement: HTMLDivElement | null = null;
  export let isRuntimeMenuOpen = false;
  export let runtimeSnapshot: WorkbenchRuntimeSnapshot | null = null;
  export let runtimeFooterStatus: WorkbenchRuntimeSnapshot['status'] | 'idle' = 'idle';
  export let runtimeFooterLabel = 'Runtime idle';
  export let runtimeFooterTitle = 'Runtime idle';
  export let runtimeFooterEventCount = 0;
  export let runtimeFooterEvents: WorkbenchRuntimeSnapshot['events'] = [];
  export let runtimeFooterCapabilities: string[] = [];
  export let runtimeFooterProjectionCatalog: WorkbenchRuntimeSnapshot['projectionCatalog'] = [];
  export let bootProjection: BootProjection | null = null;
  export let runtimeProjectionViewerOptionsByKind: Record<string, RuntimeProjectionViewerOption[]> = {};
  export let runtimeProjectionSessionEntries: RuntimeProjectionSessionEntry[] = [];
  export let activeRuntimeProjectionTarget: RuntimeProjectionTarget | null = null;
  export let activeRuntimeProjectionSource: string | null = null;
  export let isInvalidatingRuntimeProjection = false;
  export let runtimeProjectionActionStatus: RuntimeProjectionActionState | null = null;
  export let isRuntimeFooterControlActive = false;
  export let toggleRuntimeMenu: () => void = () => undefined;
  export let reconnectRuntime: () => void = () => undefined;
  export let openRuntimeProjection: (
    target?: RuntimeProjectionTarget | null,
    viewerId?: string | null
  ) => Promise<void> | void = () => undefined;
  export let invalidateRuntimeProjection: () => Promise<void> | void = () => undefined;

  export let audioControlGroupElement: HTMLDivElement | null = null;
  export let audioMenuElement: HTMLDivElement | null = null;
  export let isAudioMenuOpen = false;
  export let audioMuted = false;
  export let footerAudioMasterVolume = 1;
  export let footerAudioMasterMeter: FooterAudioMeter = { left: 0, right: 0, peakDb: -90 };
  export let footerAudioChannels: FooterAudioChannel[] = [];
  export let footerAudioSummary: FooterAudioSummary | null = null;
  export let isAudioMediaBlocksOpen = false;
  export let isAudioFooterControlActive = false;
  export let onToggleAudioMuted: () => void = () => undefined;
  export let onSetAudioMasterVolume: (volume: number) => void = () => undefined;
  export let onSetAudioChannelVolume: (channelId: string, volume: number) => void = () => undefined;
  export let toggleAudioMenu: () => void = () => undefined;
  export let toggleAudioMediaBlocks: () => void = () => undefined;

  export let showFooterDocsControl = false;
  export let featureDocsButtonElement: HTMLButtonElement | null = null;
  export let featureDocsMenuElement: HTMLDivElement | null = null;
  export let isFeatureDocsMenuOpen = false;
  export let featureDocGroups: FeatureDocContextGroup[] = [];
  export let contextualFeatureDocs: FeatureDocEntry[] = [];
  export let featureDocumentationAvailable = false;
  export let featureDocFilters: Array<{ key: FeatureDocFilter; label: string }> = [];
  export let featureDocsFilter: FeatureDocFilter = 'all';
  export let isDocsFooterControlActive = false;
  export let toggleFeatureDocsMenu: () => void = () => undefined;
  export let openFeatureDocsRoute: () => void = () => undefined;
  export let selectFeatureDocsFilter: (filter: FeatureDocFilter) => void = () => undefined;

  export let showFooterLayoutControl = false;
  export let hoveredLayoutEditOptionKey: LayoutEditOptionKey | null = null;
  export let layoutEditButtonGroupElement: HTMLDivElement | null = null;
  export let layoutEditMenuElement: HTMLDivElement | null = null;
  export let isLayoutEditingEnabled = false;
  export let isLayoutEditMenuOpen = false;
  export let layoutEditModeView: LayoutEditModeView = 'off';
  export let layoutEditModeTabs: Array<{ key: LayoutEditModeView; label: string }> = [];
  export let layoutEditUiSections: LayoutEditSection[] = [];
  export let layoutEditActionSections: LayoutEditSection[] = [];
  export let activeLayoutEditOptionStatuses: Record<LayoutEditOptionKey, LayoutEditOptionStatus> =
    {} as Record<LayoutEditOptionKey, LayoutEditOptionStatus>;
  export let highlightedLayoutEditControllerKeys: Set<LayoutEditOptionKey> = new Set();
  export let isLayoutFooterControlActive = false;
  export let toggleLayoutEditing: () => void = () => undefined;
  export let toggleLayoutEditMenu: () => void = () => undefined;
  export let selectLayoutEditModeView: (view: LayoutEditModeView) => void = () => undefined;
  export let toggleLayoutEditOption: (option: LayoutEditOptionKey) => void = () => undefined;
  export let shouldRenderLayoutEditSectionKind: (sections: LayoutEditSection[], index: number) => boolean = () => false;
  export let resolveLayoutEditModeLabel: (mode: LayoutEditModeView, fallback: string) => string = (_mode, fallback) => fallback;
  export let resolveLayoutEditSectionKind: (title: string) => string = (title) => title;
  export let resolveLayoutEditSectionTitle: (title: string) => string = (title) => title;
  export let resolveLayoutEditOptionStatusLabel: (option: LayoutEditOptionKey) => string = () => '';
  export let resolveLayoutEditOptionLabel: (option: LayoutEditOptionKey) => string = (option) => option;
</script>

<footer class="app-shell__footer" aria-label={footerLabel}>
  <AppShellFooterShortcutRegion
    bind:hoveredFooterControl
    bind:shortcutMenuButtonElement
    bind:shortcutMenuElement
    bind:shortcutQuery
    {isShortcutMenuOpen}
    {allFooterShortcuts}
    {visibleFooterContextShortcuts}
    {visibleFooterGlobalShortcuts}
    {footerShortcutOverflowCount}
    {footerShortcutGroups}
    {filteredFooterShortcuts}
    {shortcutScopeFilter}
    {shortcutTypeFilter}
    {shortcutScopeFilters}
    {shortcutTypeFilters}
    {toggleShortcutMenu}
    {selectShortcutScopeFilter}
    {selectShortcutTypeFilter}
    {resolveShellShortcutTypeLabel}
  />

  <div class="app-shell__footer-right">
    {#if appVersion}
      <span class="app-shell__footer-version app-shell__footer-meta-slot">{appVersion}</span>
      <span
        class:app-shell__footer-control-separator--active={hoveredFooterControl === 'language'}
        class="app-shell__footer-control-separator"
        aria-hidden="true"
      ></span>
    {/if}

    <AppShellFooterLanguageControl
      bind:hoveredFooterControl
      bind:activeI18nLocale
      {i18nLocaleOptions}
      {handleI18nLocaleChange}
    />

    <AppShellFooterReadingLevelControl
      bind:hoveredFooterControl
      bind:activeReadingLevelDefault
      {handleReadingLevelDefaultChange}
    />

    <span
      class:app-shell__footer-control-separator--active={hoveredFooterControl === 'reading' || isThemeFooterControlActive}
      class="app-shell__footer-control-separator"
      aria-hidden="true"
    ></span>

    <AppShellFooterThemeControl
      {themeDocument}
      bind:hoveredFooterControl
      bind:themeControlElement
      bind:themeMenuElement
      {isThemeMenuOpen}
      {activeDesignThemeMode}
      {toggleThemeMenu}
      {toggleDesignThemeMode}
      {openDesignGraphDocsRoute}
    />

    <span
      class:app-shell__footer-control-separator--active={isThemeFooterControlActive || isRuntimeFooterControlActive}
      class="app-shell__footer-control-separator"
      aria-hidden="true"
    ></span>

    <AppShellFooterRuntimeControl
      bind:hoveredFooterControl
      bind:runtimeControlElement
      bind:runtimeMenuElement
      {isRuntimeMenuOpen}
      {runtimeSnapshot}
      {runtimeFooterStatus}
      {runtimeFooterLabel}
      {runtimeFooterTitle}
      {runtimeFooterEventCount}
      {runtimeFooterEvents}
      {runtimeFooterCapabilities}
      {runtimeFooterProjectionCatalog}
      {bootProjection}
      {runtimeProjectionViewerOptionsByKind}
      {runtimeProjectionSessionEntries}
      {activeRuntimeProjectionTarget}
      {activeRuntimeProjectionSource}
      {isInvalidatingRuntimeProjection}
      {runtimeProjectionActionStatus}
      {toggleRuntimeMenu}
      {reconnectRuntime}
      {openRuntimeProjection}
      {invalidateRuntimeProjection}
    />

    <span
      class:app-shell__footer-control-separator--active={isRuntimeFooterControlActive || isAudioFooterControlActive}
      class="app-shell__footer-control-separator"
      aria-hidden="true"
    ></span>

    <AppShellFooterAudioControl
      bind:hoveredFooterControl
      bind:audioControlGroupElement
      bind:audioMenuElement
      {isAudioMenuOpen}
      {audioMuted}
      {footerAudioMasterVolume}
      {footerAudioMasterMeter}
      {footerAudioChannels}
      {footerAudioSummary}
      {isAudioMediaBlocksOpen}
      {onToggleAudioMuted}
      {onSetAudioMasterVolume}
      {onSetAudioChannelVolume}
      {toggleAudioMenu}
      {toggleAudioMediaBlocks}
    />

    {#if showFooterDocsControl || showFooterLayoutControl}
      <span
        class:app-shell__footer-control-separator--active={isAudioFooterControlActive || isDocsFooterControlActive || isLayoutFooterControlActive}
        class="app-shell__footer-control-separator"
        aria-hidden="true"
      ></span>
    {/if}

    {#if showFooterDocsControl}
      <AppShellFooterDocsControl
        bind:hoveredFooterControl
        bind:featureDocsButtonElement
        bind:featureDocsMenuElement
        {isFeatureDocsMenuOpen}
        {featureDocGroups}
        {contextualFeatureDocs}
        {featureDocumentationAvailable}
        {featureDocFilters}
        {featureDocsFilter}
        {toggleFeatureDocsMenu}
        {openFeatureDocsRoute}
        {selectFeatureDocsFilter}
      />
    {/if}

    {#if showFooterDocsControl && showFooterLayoutControl}
      <span
        class:app-shell__footer-control-separator--active={isDocsFooterControlActive || isLayoutFooterControlActive}
        class="app-shell__footer-control-separator"
        aria-hidden="true"
      ></span>
    {/if}

    {#if showFooterLayoutControl}
      <AppShellFooterLayoutControl
        bind:hoveredFooterControl
        bind:hoveredLayoutEditOptionKey
        bind:layoutEditButtonGroupElement
        bind:layoutEditMenuElement
        {isLayoutEditingEnabled}
        {isLayoutEditMenuOpen}
        {layoutEditModeView}
        {layoutEditModeTabs}
        {layoutEditUiSections}
        {layoutEditActionSections}
        {activeLayoutEditOptionStatuses}
        {highlightedLayoutEditControllerKeys}
        showLayoutEditingToggle={false}
        {toggleLayoutEditing}
        {toggleLayoutEditMenu}
        {selectLayoutEditModeView}
        {toggleLayoutEditOption}
        {shouldRenderLayoutEditSectionKind}
        {resolveLayoutEditModeLabel}
        {resolveLayoutEditSectionKind}
        {resolveLayoutEditSectionTitle}
        {resolveLayoutEditOptionStatusLabel}
        {resolveLayoutEditOptionLabel}
      />

      <span
        class:app-shell__footer-control-separator--active={isLayoutFooterControlActive}
        class="app-shell__footer-control-separator"
        aria-hidden="true"
      ></span>
    {/if}
  </div>
</footer>

<style>
  .app-shell__footer {
    --app-shell-footer-control-height: 1.5rem;
    --app-shell-footer-slot-height: var(--app-shell-footer-control-height);
    --app-shell-footer-control-radius: var(--radius-medium);
    --app-shell-footer-control-bg: color-mix(in srgb, var(--color-background-muted) 78%, transparent);
    --app-shell-footer-control-bg-active: color-mix(in srgb, var(--color-background-selected) 16%, transparent);
    --app-shell-footer-control-bg-hover: color-mix(in srgb, var(--color-background-hover) 24%, transparent);
    --app-shell-footer-control-border: color-mix(in srgb, var(--color-border-subtle) 76%, transparent);
    --app-shell-footer-control-border-active: color-mix(in srgb, var(--color-border-subtle) 88%, transparent);
    --app-shell-footer-control-text: var(--color-text-secondary);
    --app-shell-footer-control-text-muted: color-mix(in srgb, var(--color-text-secondary) 64%, var(--color-text-muted));
    --app-shell-footer-control-text-active: color-mix(in srgb, var(--color-text-primary) 90%, var(--color-background-surface));
    --app-shell-footer-control-font-size: 0.7rem;
    --app-shell-footer-control-gap: 0.32rem;
    --app-shell-footer-control-padding-x: 0.54rem;
    --app-shell-footer-icon-button-width: 1.65rem;
    --app-shell-footer-icon-size: 0.95rem;
    --app-shell-footer-dot-size: 0.42rem;
    --app-shell-footer-chip-height: 1.375rem;
    --app-shell-footer-menu-surface: var(--color-background-elevated);
    --app-shell-footer-menu-panel: var(--color-background-panel);
    --app-shell-footer-menu-muted: var(--color-background-muted);
    --app-shell-footer-menu-card: color-mix(in srgb, var(--color-background-muted) 92%, var(--color-background-panel));
    --app-shell-footer-menu-border: var(--color-border-strong);
    --app-shell-footer-menu-shadow:
      0 -12px 28px rgb(0 0 0 / 0.22),
      0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 38%, transparent);
    position: relative;
    z-index: 220;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    min-height: 1.9rem;
    padding: 0 var(--space-10);
    border: 1px solid var(--color-border-subtle);
    border-top: 0;
    background: var(--color-background-surface);
    overflow: visible;
  }

  .app-shell__footer-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    min-height: var(--app-shell-footer-slot-height);
  }

  .app-shell__footer-version {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    line-height: 1;
    white-space: nowrap;
  }

  .app-shell__footer-meta-slot {
    display: inline-flex;
    align-items: center;
    min-height: var(--app-shell-footer-slot-height);
  }

  .app-shell__footer-control-separator {
    width: 1px;
    height: 1rem;
    background: color-mix(in srgb, var(--color-border-subtle) 88%, transparent);
    flex: 0 0 auto;
    transition: background-color 120ms ease;
  }

  .app-shell__footer-control-separator--active {
    background: color-mix(in srgb, var(--color-text-primary) 28%, transparent);
  }

  .app-shell__footer :global(.app-shell__footer-control) {
    min-height: var(--app-shell-footer-control-height);
    border-radius: var(--app-shell-footer-control-radius);
    color: var(--app-shell-footer-control-text);
    font-size: var(--app-shell-footer-control-font-size);
    line-height: 1;
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease,
      color 120ms ease;
  }

  .app-shell__footer :global(.app-shell__footer-control:hover),
  .app-shell__footer :global(.app-shell__footer-control--open) {
    background: var(--app-shell-footer-control-bg-hover);
    box-shadow: inset 0 0 0 1px var(--app-shell-footer-control-border-active);
    color: var(--app-shell-footer-control-text-active);
  }

  .app-shell__footer :global(.app-shell__footer-help-group),
  .app-shell__footer :global(.app-shell__footer-theme-group),
  .app-shell__footer :global(.app-shell__footer-runtime-group),
  .app-shell__footer :global(.app-shell__footer-audio-group),
  .app-shell__footer :global(.app-shell__footer-toggle-group),
  .app-shell__footer :global(.app-shell__footer-language-group),
  .app-shell__footer :global(.app-shell__footer-reading-group) {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    flex: 0 0 auto;
    min-height: var(--app-shell-footer-control-height);
    height: var(--app-shell-footer-control-height);
    border: 1px solid var(--app-shell-footer-control-border);
    border-radius: var(--app-shell-footer-control-radius);
    background: var(--app-shell-footer-control-bg);
    isolation: isolate;
    overflow: visible;
  }

  .app-shell__footer :global(.app-shell__footer-control--open),
  .app-shell__footer :global(.app-shell__footer-toggle-group--active) {
    background: var(--app-shell-footer-control-bg-active);
    color: var(--app-shell-footer-control-text-active);
  }

  .app-shell__footer :global(.app-shell__footer-control-icon),
  .app-shell__footer :global(.app-shell__footer-toggle-state-icon) {
    width: var(--app-shell-footer-icon-size);
    height: var(--app-shell-footer-icon-size);
    flex: 0 0 auto;
    display: block;
  }

  .app-shell__footer :global(.app-shell__footer-toggle),
  .app-shell__footer :global(.app-shell__footer-help-button),
  .app-shell__footer :global(.app-shell__footer-runtime),
  .app-shell__footer :global(.app-shell__footer-theme),
  .app-shell__footer :global(.app-shell__footer-theme-mode-toggle) {
    height: 100%;
    min-height: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .app-shell__footer :global(.app-shell__footer-toggle:hover),
  .app-shell__footer :global(.app-shell__footer-toggle-menu-button:hover),
  .app-shell__footer :global(.app-shell__footer-help-button:hover),
  .app-shell__footer :global(.app-shell__footer-runtime:hover),
  .app-shell__footer :global(.app-shell__footer-theme:hover),
  .app-shell__footer :global(.app-shell__footer-theme-mode-toggle:hover) {
    background: var(--app-shell-footer-control-bg-hover);
    color: var(--app-shell-footer-control-text-active);
  }

  .app-shell__footer :global(.app-shell__footer-help-menu) {
    z-index: 260;
    isolation: isolate;
    border-color: var(--app-shell-footer-menu-border);
    background: var(--app-shell-footer-menu-surface);
    box-shadow: var(--app-shell-footer-menu-shadow);
  }

  .app-shell__footer :global(.app-shell__footer-help-menu-groups) {
    background: var(--app-shell-footer-menu-surface);
  }

  .app-shell__footer :global(.app-shell__footer-help-menu-bottom) {
    background: var(--app-shell-footer-menu-panel);
  }

  .app-shell__footer :global(.app-shell__footer-help-menu-item) {
    background: var(--app-shell-footer-menu-card);
  }

  .app-shell__footer :global(.app-shell__footer-shortcuts-menu) {
    left: 0;
    right: auto;
    width: min(48rem, calc(100vw - 2rem));
  }

  .app-shell__footer :global(.app-shell__footer-theme-menu) {
    width: min(42rem, calc(100vw - 2rem));
  }

  .app-shell__footer :global(.app-shell__footer-runtime-menu) {
    width: min(58rem, calc(100vw - 2rem));
  }

  @media (max-width: 960px) {
    .app-shell__footer {
      flex-wrap: wrap;
      justify-content: flex-start;
      padding-top: var(--space-6);
      padding-bottom: var(--space-6);
    }

    .app-shell__footer-right {
      margin-left: auto;
    }
  }
</style>
