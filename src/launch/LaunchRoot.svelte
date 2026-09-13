<script lang="ts">
  import { fade } from 'svelte/transition';
  import { createLaunchStore, type LaunchStore } from './launchState';
  import type { BootProjection, LaunchProjectOption, LaunchState } from '@konitif/workbench';
  import {
    defaultWorkbenchThemeRuntime,
    type WorkbenchAmbientQuality,
    type WorkbenchThemeRuntime
  } from '../themes';
  import PreflightLaunchScreen from './PreflightLaunchScreen.svelte';
  import ProjectGateScreen from './ProjectGateScreen.svelte';
  import WorkspaceInitializationScreen from './WorkspaceInitializationScreen.svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import {
    createProjectGateStageMonitorItems,
    createProjectGateStageProjection,
    resolveProjectGateStageStepFromPhase,
    type ProjectGateStageMonitorItem,
    type ProjectGateStageStepId
  } from './projectGateStage';
  import type {
    ProjectGateContextCategory,
    ProjectGateContextOption,
    ProjectGateContextRow,
    ProjectGateToolLaunch,
    ProjectGateWidgetLaunch
  } from './projectGateContext';
  import type { WorkbenchLocale } from '@konitif/workbench';
  import { defaultWorkbenchLocaleOptions, type WorkbenchLocaleOption } from '../i18n/workbenchLanguagePreference';
  import { initWorkbenchI18nContext, type WorkbenchTranslate } from '../i18n/workbenchI18n';
  import { workbenchUiTranslationBundles } from '../i18n/workbenchUiTranslations';
  import { loadWorkbenchUiLocaleBundles } from '../i18n/workbenchUiLocaleLoader';

  const defaultPocProjects: LaunchProjectOption[] = [
    {
      id: 'poc:qr-setup',
      kind: 'app',
      label: 'qr-setup',
      root: 'qr-setup',
      description: 'Route index',
      icon: 'action.lightbulb'
    },
    {
      id: 'poc:invitation',
      kind: 'app',
      label: 'invitation',
      root: 'invitation',
      description: 'Route index',
      icon: 'action.lightbulb'
    }
  ];

  export let launchStore: LaunchStore = createLaunchStore();
  export let applications = launchStore.applications;
  export let repositories = launchStore.repositories;
  export let pocProjects: LaunchProjectOption[] = defaultPocProjects;
  export let tools: ProjectGateToolLaunch[] = [];
  export let widgets: ProjectGateWidgetLaunch[] = [];
  export let spatialAmbientQuality: WorkbenchAmbientQuality = 'medium';
  export let themeRuntime: WorkbenchThemeRuntime = defaultWorkbenchThemeRuntime;
  export let themeMode: 'dark' | 'light' = 'dark';
  export let i18nLocale: WorkbenchLocale = 'en';
  export let localeOptions: WorkbenchLocaleOption[] = defaultWorkbenchLocaleOptions;
  export let onThemeModeChange: (mode: 'dark' | 'light') => void = () => undefined;
  export let onI18nLocaleChange: (locale: WorkbenchLocale) => void = () => undefined;
  export let onQuickLaunch: (quickLaunchId: string) => boolean | void = () => false;
  export let onAdvanceLaunchStep: () => void | Promise<void> = () => undefined;
  export let isLaunchStepAdvancing = false;
  export let launchExecutionMode: 'direct' | 'step' = 'direct';
  export let onLaunchExecutionModeChange: (mode: 'direct' | 'step') => void = () => undefined;
  export let bootDagDemoEnabled = false;
  export let bootProjection: BootProjection | null = null;
  export let onRunBootDagSuccessDemo: () => void | Promise<void> = () => undefined;
  export let onRunBootDagOptionalFailureDemo: () => void | Promise<void> = () => undefined;
  export let onRunBootDagCriticalFailureDemo: () => void | Promise<void> = () => undefined;
  export let onTeardownBootDagDemo: () => void | Promise<void> = () => undefined;
  export let onResetBootDagDemo: () => void = () => undefined;

  const stageMonitorIconById = {
    'self-menu': 'action.settings',
    context: 'runtime.projection',
    preflight: 'action.jump-start',
    runtime: 'action.play',
  } as const;

  const gateContextStorageKey = 'workbench.launchGate.context.v1';
  const gateContextCategories = new Set<ProjectGateContextCategory>(['repository', 'application', 'tool', 'widget', 'poc']);
  const initialGateContext = readPersistedGateContext();
  const launchI18n = initWorkbenchI18nContext({
    locale: 'en',
    bundles: workbenchUiTranslationBundles
  });
  const i18nT = launchI18n.t;
  let activeI18nLocale: WorkbenchLocale = 'en';
  let i18nLocaleLoadRevision = 0;
  let localeProjectionReady = false;

  let activeGateStageStep: ProjectGateStageStepId = initialGateContext?.stageStep ?? 0;
  let selectedContextCategory: ProjectGateContextCategory | null = initialGateContext?.selectedContextCategory ?? null;
  let openContextCategory: ProjectGateContextCategory | null = initialGateContext?.openContextCategory ?? null;
  let hasRestoredGateContext = true;
  let prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $: launchViewKey = resolveLaunchViewKey($launchStore.screen, activeGateStageStep, selectedContextCategory, openContextCategory);
  $: launchViewFadeIn = { duration: prefersReducedMotion ? 1 : 180 };
  $: launchViewFadeOut = { duration: prefersReducedMotion ? 1 : 140 };
  $: resolvedThemeModeId = themeRuntime.resolveThemeModeId(themeMode);
  $: resolvedThemeFamily = themeRuntime.themeFamily;
  $: ThemeAmbientRuntime = themeRuntime.AmbientRuntime;
  $: themeRuntime.applyTheme(resolvedThemeModeId, themeMode);
  $: void activateLaunchLocale(i18nLocale);
  $: if ($launchStore.screen === 'gate' && !$launchStore.target && activeGateStageStep > 0) {
    activeGateStageStep = 0;
  }
  $: if ($launchStore.screen === 'dashboard') {
    returnToLaunchOrigin();
  }
  $: activeLaunchStageStep =
    $launchStore.screen === 'gate' ? activeGateStageStep : resolveProjectGateStageStepFromPhase($launchStore.phase);
  $: launchGateStageProjection = createProjectGateStageProjection(
    { width: 1200, height: 800 },
    {
      quickLaunches: pocProjects.map((project) => ({ id: project.id, tone: 'poc' })),
      focusEntryId: $launchStore.screen === 'gate' ? 'entry-project' : undefined,
      activePhase: $launchStore.phase,
      activeStageStep: activeLaunchStageStep
    }
  );
  $: stageMonitorItems = createProjectGateStageMonitorItems(launchGateStageProjection, activeLaunchStageStep);
  $: projectGateContextRows = createProjectGateContextRows(applications, repositories, tools, widgets, pocProjects, $i18nT);
  $: if (hasRestoredGateContext) {
    persistGateContext({
      stageStep: activeGateStageStep,
      selectedContextCategory,
      openContextCategory
    });
  }

  function launchWorkspaceRuntime(modeOverride: 'direct' | 'step' = launchExecutionMode): void {
    const nextState = launchStore.confirmLaunch();

    if (modeOverride === 'direct' && nextState.phase === 'PLANNED') {
      void onAdvanceLaunchStep();
    }
  }

  function handleContextOption(option: ProjectGateContextOption): void {
    selectedContextCategory = null;
    openContextCategory = null;

    if (option.project) {
      activeGateStageStep = 1;
      launchStore.selectProject(option.project);
      return;
    }

    if (option.tool) {
      if (onQuickLaunch(`tool:${option.tool.toolId}`)) {
        return;
      }
    }

    if (option.quickLaunch) {
      onQuickLaunch(option.quickLaunch.id);
    }
  }

  function handleRunContextOption(option: ProjectGateContextOption, mode: 'direct' | 'step'): void {
    onLaunchExecutionModeChange(mode);
    selectedContextCategory = null;
    openContextCategory = null;

    if (option.project) {
      activeGateStageStep = 1;
      launchStore.selectProject(option.project);
      launchWorkspaceRuntime(mode);
      return;
    }

    if (option.quickLaunch) {
      onQuickLaunch(option.quickLaunch.id);
      return;
    }

    if (option.tool) {
      onQuickLaunch(`tool:${option.tool.toolId}`);
    }
  }

  function handleStageMonitorClick(stageStep: ProjectGateStageStepId): void {
    if (stageStep <= 0) {
      if ($launchStore.screen !== 'gate') {
        launchStore.reset();
      }

      activeGateStageStep = stageStep;
      selectedContextCategory = null;
      openContextCategory = null;
      return;
    }

    if (stageStep === 1 && $launchStore.target && $launchStore.preflight) {
      launchStore.transition('PREFLIGHT', { screen: 'preflight' });
    }
  }

  function resolveStageMonitorIcon(itemId: string): string {
    return stageMonitorIconById[itemId as keyof typeof stageMonitorIconById] ?? 'runtime.projection';
  }

  function resolveStageMonitorLabel(
    itemId: string,
    fallback: string,
    translate: WorkbenchTranslate
  ): string {
    if (itemId === 'self-menu') return translate('ui.shell.launchGate.stage.self', { default: fallback });
    if (itemId === 'context') return translate('ui.shell.launchGate.stage.context', { default: fallback });
    if (itemId === 'preflight') return translate('ui.shell.launchGate.stage.preflight', { default: fallback });
    if (itemId === 'runtime') return translate('ui.shell.launchGate.stage.runtime', { default: fallback });
    return fallback;
  }

  function isStageMonitorItemDisabled(item: ProjectGateStageMonitorItem): boolean {
    if (item.state !== 'pending') {
      return false;
    }

    if (item.stageStep === 0) {
      return false;
    }

    if (item.stageStep === 1) {
      return !($launchStore.target && $launchStore.preflight);
    }

    return true;
  }

  function returnToSelfMenu(): void {
    activeGateStageStep = -1;
    selectedContextCategory = null;
    openContextCategory = null;
  }

  function toggleContextCategory(category: ProjectGateContextCategory): void {
    openContextCategory = openContextCategory === category ? null : category;
  }

  function readPersistedGateContext(): {
    stageStep: ProjectGateStageStepId;
    selectedContextCategory: ProjectGateContextCategory | null;
    openContextCategory: ProjectGateContextCategory | null;
  } | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const rawContext = window.sessionStorage.getItem(gateContextStorageKey);
      const record = rawContext ? JSON.parse(rawContext) : null;

      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return null;
      }

      const candidate = record as Record<string, unknown>;
      const stageStep = normalizeGateStageStep(candidate.stageStep);
      const selectedCategory = normalizeGateContextCategory(candidate.selectedContextCategory);
      const openCategory = normalizeGateContextCategory(candidate.openContextCategory);

      return {
        stageStep,
        selectedContextCategory: selectedCategory,
        openContextCategory: selectedCategory ? null : openCategory
      };
    } catch {
      return null;
    }
  }

  function persistGateContext(context: {
    stageStep: ProjectGateStageStepId;
    selectedContextCategory: ProjectGateContextCategory | null;
    openContextCategory: ProjectGateContextCategory | null;
  }): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(gateContextStorageKey, JSON.stringify(context));
    } catch {
      // Gate context persistence is only a navigation convenience.
    }
  }

  function normalizeGateStageStep(value: unknown): ProjectGateStageStepId {
    if (value === 3) {
      return 2;
    }

    return value === -1 || value === 0 || value === 1 || value === 2 ? value : 0;
  }

  function normalizeGateContextCategory(value: unknown): ProjectGateContextCategory | null {
    return typeof value === 'string' && gateContextCategories.has(value as ProjectGateContextCategory)
      ? value as ProjectGateContextCategory
      : null;
  }

  function returnToPreflightFromInitialization(): void {
    if ($launchStore.target && $launchStore.preflight) {
      launchStore.transition('PREFLIGHT', { screen: 'preflight' });
      return;
    }

    launchStore.reset();
  }

  function returnToLaunchOrigin(): void {
    const category = resolveLaunchOriginContextCategory($launchStore.target);

    launchStore.reset();
    activeGateStageStep = category ? 1 : 0;
    selectedContextCategory = category;
    openContextCategory = null;
  }

  function resolveLaunchOriginContextCategory(target: LaunchState['target']): ProjectGateContextCategory | null {
    if (target?.kind !== 'project' || !target.project) {
      return null;
    }

    if (target.project.id.startsWith('poc:')) {
      return 'poc';
    }

    return target.project.kind === 'app' ? 'application' : 'repository';
  }

  function findProjectBySlug(slug: string): LaunchProjectOption | null {
    const normalizedSlug = normalizeProjectSlug(slug);

    return (
      [...repositories, ...applications].find((project) => {
        const rootSlug = normalizeProjectSlug(project.root);
        const labelSlug = normalizeProjectSlug(project.label);

        return rootSlug === normalizedSlug || labelSlug === normalizedSlug;
      }) ?? null
    );
  }

  function createProjectGateContextRows(
    appOptions: readonly LaunchProjectOption[],
    repositoryOptions: readonly LaunchProjectOption[],
    toolOptions: readonly ProjectGateToolLaunch[],
    widgetOptions: readonly ProjectGateWidgetLaunch[],
    pocOptions: readonly LaunchProjectOption[],
    t: WorkbenchTranslate,
  ): ProjectGateContextRow[] {
    return [
      {
        id: 'repository',
        eyebrow: t('ui.shell.launchGate.context.repository.eyebrow', { default: 'Repository' }),
        title: t('ui.shell.launchGate.context.repository.title', { default: 'Repositories' }),
        icon: 'action.folder',
        tone: 'repository',
        options: repositoryOptions.map((project) => createProjectContextOption(project, 'repository')),
      },
      {
        id: 'application',
        eyebrow: t('ui.shell.launchGate.context.application.eyebrow', { default: 'Application' }),
        title: t('ui.shell.launchGate.context.application.title', { default: 'Apps' }),
        icon: 'app.product-shell',
        tone: 'project',
        options: appOptions.map((project) => createProjectContextOption(project, 'application')),
      },
      {
        id: 'tool',
        eyebrow: t('ui.shell.launchGate.context.tool.eyebrow', { default: 'Runtime tool' }),
        title: t('ui.shell.launchGate.context.tool.title', { default: 'Tools' }),
        icon: 'tool.wrench',
        tone: 'tool',
        options: toolOptions.map((tool) => ({
          id: `tool:${tool.toolId}`,
          eyebrow: tool.eyebrow,
          title: tool.title,
          description: tool.description,
          icon: tool.icon,
          tone: tool.tone,
          category: 'tool',
          tool,
        })),
      },
      {
        id: 'widget',
        eyebrow: t('ui.shell.launchGate.context.widget.eyebrow', { default: 'Shell widget' }),
        title: t('ui.shell.launchGate.context.widget.title', { default: 'Widgets' }),
        icon: 'widget.layout',
        tone: 'widget',
        options: widgetOptions.map((widget) => ({
          id: `widget:${widget.id}`,
          eyebrow: widget.scope,
          title: widget.title,
          description: widget.description,
          icon: widget.icon,
          tone: 'widget',
          category: 'widget',
          widget,
        })),
      },
      {
        id: 'poc',
        eyebrow: t('ui.shell.launchGate.context.poc.eyebrow', { default: 'PoC' }),
        title: t('ui.shell.launchGate.context.poc.title', { default: 'Proofs of concept' }),
        icon: 'action.lightbulb',
        tone: 'poc',
        options: pocOptions.map((project) => createProjectContextOption(project, 'poc')),
      },
    ];
  }

  function createProjectContextOption(
    project: LaunchProjectOption,
    category: 'repository' | 'application' | 'poc',
  ): ProjectGateContextOption {
    return {
      id: `${category}:${project.id}`,
      eyebrow: category === 'application'
        ? $i18nT('ui.shell.launchGate.context.application.eyebrow', { default: 'Application' })
        : category === 'poc'
          ? $i18nT('ui.shell.launchGate.context.poc.eyebrow', { default: 'PoC' })
          : $i18nT('ui.shell.launchGate.context.repository.eyebrow', { default: 'Repository' }),
      title: project.label,
      description: project.description
        ? translateProjectDescription(project.description)
        : project.root,
      icon: project.icon
        ?? (category === 'application'
          ? 'app.product-shell'
          : category === 'poc' ? 'action.lightbulb' : 'action.folder'),
      tone: category === 'application' ? 'project' : category === 'poc' ? 'poc' : 'repository',
      category,
      project,
    };
  }

  function translateProjectDescription(description: string): string {
    if (description === 'Application profile') {
      return $i18nT('ui.shell.launchGate.projectDescription.applicationProfile', { default: description });
    }

    if (description === 'Repository profile') {
      return $i18nT('ui.shell.launchGate.projectDescription.repositoryProfile', { default: description });
    }

    return description;
  }

  function normalizeProjectSlug(value: string): string {
    return value
      .replace(/\\/g, '/')
      .replace(/\/+$/, '')
      .split('/')
      .filter(Boolean)
      .pop()
      ?.toLowerCase() ?? value.toLowerCase();
  }

  function toggleThemeMode(): void {
    onThemeModeChange(themeMode === 'dark' ? 'light' : 'dark');
  }

  function handleLocaleChange(event: Event): void {
    const locale = (event.currentTarget as HTMLSelectElement).value as WorkbenchLocale;
    i18nLocale = locale;
    onI18nLocaleChange(locale);
  }

  async function activateLaunchLocale(locale: WorkbenchLocale): Promise<void> {
    const revision = ++i18nLocaleLoadRevision;
    localeProjectionReady = false;

    let bundles;
    let resolvedLocale = locale;

    try {
      bundles = await loadWorkbenchUiLocaleBundles(locale);
    } catch {
      bundles = await loadWorkbenchUiLocaleBundles('en');
      resolvedLocale = 'en';
    }

    if (revision !== i18nLocaleLoadRevision) {
      return;
    }

    launchI18n.registerBundles(bundles);
    activeI18nLocale = resolvedLocale;
    // The locale projection resolves asynchronously. Updating the store here
    // keeps the registered bundle and its selected locale in one atomic flow;
    // assignments made inside this function cannot retrigger a separate
    // Svelte reactive statement reliably.
    launchI18n.locale.set(resolvedLocale);
    localeProjectionReady = true;
  }

  function resolveLaunchViewKey(
    screen: LaunchState['screen'],
    gateStageStep: ProjectGateStageStepId,
    selectedCategory: ProjectGateContextCategory | null,
    openCategory: ProjectGateContextCategory | null
  ): string {
    if (screen !== 'gate') {
      return screen;
    }

    const category = selectedCategory ?? openCategory;
    return category ? `gate:${category}` : `gate:${gateStageStep}`;
  }

</script>

<div
  class="launch-root"
  class:launch-root--locale-pending={!localeProjectionReady}
  aria-busy={!localeProjectionReady}
  data-theme={resolvedThemeModeId}
  data-workbench-theme={resolvedThemeFamily}
  data-workbench-theme-id={resolvedThemeModeId}
  data-workbench-theme-family={resolvedThemeFamily}
  data-workbench-color-mode={themeMode}
>
  <svelte:component
    this={ThemeAmbientRuntime}
    phase={$launchStore.phase}
    quality={spatialAmbientQuality}
    {themeMode}
    stageAmbient={launchGateStageProjection.ambient}
  />

  <div class="launch-root__dock" aria-label={$i18nT('ui.shell.launchGate.preferences.ariaLabel', { default: 'Launch preferences' })}>
    <button
      type="button"
      class="launch-root__dock-button launch-root__dock-button--theme"
      aria-label={$i18nT('ui.shell.launchGate.preferences.switchTheme', {
        default: 'Switch to {{mode}} theme',
        values: { mode: themeMode === 'dark' ? 'light' : 'dark' }
      })}
      on:click={toggleThemeMode}
    >
      <span aria-hidden="true">{themeMode === 'dark' ? '◐' : '☀'}</span>
      <strong>{$i18nT(`ui.shell.launchGate.preferences.theme.${themeMode}`, { default: themeMode })}</strong>
    </button>

    <label class="launch-root__dock-select">
      <span>{$i18nT('ui.shell.launchGate.preferences.language', { default: 'Language' })}</span>
      <select bind:value={i18nLocale} on:change={handleLocaleChange} aria-label={$i18nT('ui.shell.launchGate.preferences.launchLanguage', { default: 'Launch language' })}>
        {#each localeOptions as option (option.locale)}
          <option value={option.locale}>{option.nativeLabel}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="launch-root__view-frame">
    {#key launchViewKey}
      <div class="launch-root__view" in:fade={launchViewFadeIn} out:fade={launchViewFadeOut}>
        {#if $launchStore.screen === 'gate'}
          <ProjectGateScreen
            state={$launchStore}
            stageStep={activeGateStageStep}
            onSelectSelf={() => {
              activeGateStageStep = 1;
              launchStore.selectSelf();
            }}
            contextRows={projectGateContextRows}
            {selectedContextCategory}
            {openContextCategory}
            onShowContextCategory={(category) => {
              selectedContextCategory = category;
              openContextCategory = null;
            }}
            onToggleContextCategory={toggleContextCategory}
            onBackToContextOverview={() => {
              selectedContextCategory = null;
              openContextCategory = null;
            }}
            onBackToSelfMenu={returnToSelfMenu}
            onSelectContextOption={handleContextOption}
            onRunContextOption={handleRunContextOption}
            stageProjection={launchGateStageProjection}
          />
        {:else if $launchStore.screen === 'preflight'}
          <PreflightLaunchScreen
            state={$launchStore}
            onBack={returnToLaunchOrigin}
            onLaunch={launchWorkspaceRuntime}
            executionMode={launchExecutionMode}
            onExecutionModeChange={onLaunchExecutionModeChange}
          />
        {:else if $launchStore.screen === 'initializing'}
          <WorkspaceInitializationScreen
            state={$launchStore}
            onBack={returnToPreflightFromInitialization}
            onAdvance={onAdvanceLaunchStep}
            isAdvancing={isLaunchStepAdvancing}
            executionMode={launchExecutionMode}
            onExecutionModeChange={onLaunchExecutionModeChange}
            {bootDagDemoEnabled}
            {bootProjection}
            {onRunBootDagSuccessDemo}
            {onRunBootDagOptionalFailureDemo}
            {onRunBootDagCriticalFailureDemo}
            {onTeardownBootDagDemo}
            {onResetBootDagDemo}
          />
        {:else}
          <section class="launch-root__placeholder" aria-label={$i18nT('ui.shell.launchGate.launch', { default: 'Launch' })}>
            <strong>{$launchStore.phase}</strong>
          </section>
        {/if}
      </div>
    {/key}
  </div>

  <div class="launch-root__stage-monitor-stack">
    <nav class="launch-root__stage-monitor" aria-label={$i18nT('ui.shell.launchGate.stageMonitor.ariaLabel', { default: 'Stage monitor' })}>
      {#each stageMonitorItems as item (item.id)}
        <button
          type="button"
          class="launch-root__stage-monitor-step"
          data-stage-id={item.id}
          data-state={item.state}
          disabled={isStageMonitorItemDisabled(item)}
          aria-current={item.state === 'current' ? 'step' : undefined}
          title={`${resolveStageMonitorLabel(item.id, item.label, $i18nT)} - ${item.state}`}
          style={`--stage-dot-opacity: ${item.opacity}; --stage-dot-depth: ${item.depth};`}
          on:click={() => handleStageMonitorClick(item.stageStep)}
        >
          <span class="launch-root__stage-monitor-orb" aria-hidden="true">
            <WorkbenchIcon icon={resolveStageMonitorIcon(item.id)} label={resolveStageMonitorLabel(item.id, item.label, $i18nT)} />
          </span>
          <span class="launch-root__stage-monitor-label">{resolveStageMonitorLabel(item.id, item.label, $i18nT)}</span>
        </button>
      {/each}
    </nav>
  </div>
</div>

<style>
  .launch-root {
    --project-gate-tone-self: #69ecc1;
    --project-gate-tone-self-rgb: 105 236 193;
    --project-gate-tone-repository: #f1c96f;
    --project-gate-tone-repository-rgb: 241 201 111;
    --project-gate-tone-project: #a78bfa;
    --project-gate-tone-project-rgb: 167 139 250;
    --project-gate-tone-tool: #78e09a;
    --project-gate-tone-tool-rgb: 120 224 154;
    --project-gate-tone-widget: #f472b6;
    --project-gate-tone-widget-rgb: 244 114 182;
    --project-gate-tone-poc: #6da4ff;
    --project-gate-tone-poc-rgb: 109 164 255;
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    background: var(--workbench-launch-background, var(--color-background-canvas, #0d1117));
  }

  .launch-root > :global(:not(.workbench-theme-ambient)) {
    position: relative;
    z-index: 1;
  }

  .launch-root__view-frame {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: grid;
  }

  .launch-root__view-frame > :global(*) {
    grid-area: 1 / 1;
  }

  .launch-root__view {
    min-height: 100vh;
    will-change: opacity;
  }

  .launch-root__dock {
    --launch-dock-border: color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.22)), transparent 8%);
    --launch-dock-surface-tint: color-mix(in srgb, var(--k-bg-surface, rgba(12, 20, 32, 0.72)), transparent 6%);
    --launch-dock-surface-base: rgba(7, 12, 20, 0.42);
    --launch-dock-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
    --launch-dock-inner-light: rgba(255, 255, 255, 0.06);
    --launch-dock-control-hover: color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 88%);
    position: fixed;
    top: clamp(14px, 2.2vw, 24px);
    right: clamp(14px, 3vw, 36px);
    z-index: 4;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--launch-dock-border);
    border-radius: 10px;
    background:
      linear-gradient(135deg, var(--launch-dock-surface-tint), transparent),
      var(--launch-dock-surface-base);
    box-shadow:
      var(--launch-dock-shadow),
      inset 0 1px 0 var(--launch-dock-inner-light);
    backdrop-filter: blur(18px);
  }

  .launch-root__dock-button,
  .launch-root__dock-select {
    min-height: 2rem;
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--k-text-secondary, #b8c6d8);
    background: transparent;
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1;
    transition:
      color 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 180ms ease;
  }

  .launch-root__dock-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 10px;
    cursor: pointer;
    text-transform: capitalize;
  }

  .launch-root__dock-button span {
    color: var(--k-accent-primary, #60a5fa);
    font-size: 0.95rem;
  }

  .launch-root__dock-button strong {
    font: inherit;
  }

  .launch-root__dock-select {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px 0 10px;
  }

  .launch-root__dock-select span {
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8), transparent 12%);
    font-size: 0.64rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .launch-root__dock-select select {
    max-width: 7.5rem;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
    outline: none;
  }

  .launch-root__dock-button:hover,
  .launch-root__dock-button:focus-visible,
  .launch-root__dock-select:hover,
  .launch-root__dock-select:focus-within {
    color: var(--k-text-primary, #eef4ff);
    border-color: color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 48%);
    background: var(--launch-dock-control-hover);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
  }

  .launch-root__dock-button:active {
    background: color-mix(in srgb, var(--k-accent-primary, #60a5fa), transparent 78%);
  }

  .launch-root__stage-monitor-stack {
    position: fixed;
    left: 50%;
    bottom: clamp(18px, 3vw, 32px);
    z-index: 4;
    display: inline-grid;
    justify-items: center;
    transform: translateX(-50%);
  }

  .launch-root__stage-monitor {
    --stage-monitor-border: color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.18)), transparent 8%);
    --stage-monitor-sheen: color-mix(in srgb, var(--k-text-primary, #e8eef8) 7%, transparent);
    --stage-monitor-start: rgba(16, 28, 43, 0.8);
    --stage-monitor-end: rgba(5, 11, 20, 0.68);
    --stage-monitor-base: rgba(4, 10, 18, 0.52);
    --stage-monitor-shadow: 0 22px 58px rgba(0, 0, 0, 0.3);
    --stage-monitor-inner-top: rgba(255, 255, 255, 0.065);
    --stage-monitor-inner-bottom: rgba(0, 0, 0, 0.42);
    --stage-monitor-step-base: rgba(3, 8, 15, 0.72);
    --stage-monitor-step-disabled: rgba(5, 11, 20, 0.48);
    display: inline-flex;
    align-items: center;
    gap: clamp(8px, 1.5vw, 15px);
    min-height: 2.2rem;
    padding: 0.31rem clamp(0.48rem, 1.3vw, 1rem);
    border: 1px solid var(--stage-monitor-border);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 0%, var(--stage-monitor-sheen), transparent 64%),
      linear-gradient(180deg, var(--stage-monitor-start), var(--stage-monitor-end)),
      var(--stage-monitor-base);
    box-shadow:
      var(--stage-monitor-shadow),
      inset 0 1px 0 var(--stage-monitor-inner-top),
      inset 0 -1px 0 var(--stage-monitor-inner-bottom);
    backdrop-filter: blur(22px) saturate(1.12);
  }

  .launch-root__stage-monitor-step {
    --stage-nav-tone: #8fbaff;
    --stage-nav-fill: rgba(96, 165, 250, 0.16);
    position: relative;
    display: grid;
    place-items: center;
    width: clamp(1.4rem, 2.5vw, 2.05rem);
    height: clamp(1.4rem, 2.5vw, 2.05rem);
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--stage-nav-tone) 42%, transparent);
    border-radius: 999px;
    color: inherit;
    background:
      radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--stage-nav-tone) 18%, transparent), transparent 64%),
      color-mix(in srgb, var(--stage-nav-fill) 84%, var(--stage-monitor-step-base));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.055),
      inset 0 -1px 0 rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    opacity: calc(0.76 + (0.24 * var(--stage-dot-opacity, 1)));
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      opacity 180ms ease,
      background 180ms ease,
      box-shadow 220ms ease;
  }

  .launch-root__stage-monitor-step[data-stage-id='self-menu'] {
    --stage-nav-tone: #7bb7ff;
    --stage-nav-fill: rgba(59, 130, 246, 0.18);
  }

  .launch-root__stage-monitor-step[data-stage-id='context'] {
    --stage-nav-tone: #f1c96f;
    --stage-nav-fill: rgba(212, 176, 89, 0.15);
  }

  .launch-root__stage-monitor-step[data-stage-id='preflight'] {
    --stage-nav-tone: #76e59d;
    --stage-nav-fill: rgba(34, 197, 94, 0.14);
  }

  .launch-root__stage-monitor-step[data-stage-id='runtime'] {
    --stage-nav-tone: #a78bfa;
    --stage-nav-fill: rgba(124, 58, 237, 0.16);
  }

  .launch-root__stage-monitor-step:hover,
  .launch-root__stage-monitor-step:focus-visible {
    border-color: color-mix(in srgb, var(--stage-nav-tone) 76%, transparent);
    opacity: 1;
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.32),
      0 0 0 1px color-mix(in srgb, var(--stage-nav-tone) 18%, transparent),
      0 0 22px color-mix(in srgb, var(--stage-nav-tone) 22%, transparent);
    outline: none;
  }

  .launch-root__stage-monitor-step:disabled {
    border-color: color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.18)) 52%, transparent);
    color: var(--k-text-muted, #8fa1b8);
    background:
      radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--k-text-muted, #8fa1b8) 6%, transparent), transparent 64%),
      var(--stage-monitor-step-disabled);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      inset 0 -1px 0 rgba(0, 0, 0, 0.28);
    cursor: not-allowed;
    filter: saturate(0.48);
    opacity: 0.42;
  }

  .launch-root__stage-monitor-step:disabled:hover,
  .launch-root__stage-monitor-step:disabled:focus-visible {
    border-color: color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.18)) 52%, transparent);
    transform: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      inset 0 -1px 0 rgba(0, 0, 0, 0.28);
  }

  .launch-root__stage-monitor-step[data-state='current'] {
    border-color: color-mix(in srgb, var(--stage-nav-tone) 86%, white 8%);
    background:
      radial-gradient(circle at 50% 28%, color-mix(in srgb, var(--stage-nav-tone) 34%, transparent), transparent 68%),
      color-mix(in srgb, var(--stage-nav-fill) 100%, var(--stage-monitor-step-base));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.36),
      0 0 0 2px color-mix(in srgb, var(--stage-nav-tone) 24%, transparent),
      0 0 28px color-mix(in srgb, var(--stage-nav-tone) 38%, transparent),
      0 18px 30px rgba(0, 0, 0, 0.22);
  }

  .launch-root__stage-monitor-step[data-state='done'] {
    border-color: color-mix(in srgb, var(--stage-nav-tone) 52%, transparent);
  }

  .launch-root__stage-monitor-step[data-state='pending'] {
    filter: saturate(0.8);
  }

  .launch-root__stage-monitor-orb {
    width: 84%;
    height: 84%;
    display: grid;
    place-items: center;
    color: color-mix(in srgb, var(--stage-nav-tone) 72%, #eff6ff);
    filter: drop-shadow(0 0 12px color-mix(in srgb, var(--stage-nav-tone) 32%, transparent));
  }

  .launch-root__stage-monitor-orb :global(.workbench-icon) {
    --workbench-icon-color-action: currentColor;
    --workbench-icon-color-danger: currentColor;
    --workbench-icon-color-design: currentColor;
    --workbench-icon-color-product: currentColor;
    --workbench-icon-color-runtime: currentColor;
    --workbench-icon-color-template: currentColor;
    --workbench-icon-color-shared: currentColor;
  }

  .launch-root__stage-monitor-step[data-state='pending'] .launch-root__stage-monitor-orb {
    color: color-mix(in srgb, var(--stage-nav-tone) 46%, var(--k-text-muted, #8fa1b8));
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--stage-nav-tone) 16%, transparent));
  }

  .launch-root__stage-monitor-step:disabled .launch-root__stage-monitor-orb {
    color: color-mix(in srgb, var(--k-text-muted, #8fa1b8) 66%, transparent);
    filter: none;
  }

  .launch-root__stage-monitor-orb :global(svg) {
    width: 100%;
    height: 100%;
    stroke-width: 2.2;
  }

  .launch-root__stage-monitor-label {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 10px);
    width: max-content;
    max-width: 10rem;
    padding: 0.24rem 0.42rem;
    border: 1px solid color-mix(in srgb, var(--k-border-soft, rgba(120, 151, 193, 0.24)), transparent 20%);
    border-radius: 6px;
    color: var(--k-text-secondary, #b8c6d8);
    background: rgba(5, 11, 20, 0.72);
    font-size: 0.62rem;
    font-weight: 850;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    text-transform: uppercase;
    transform: translate(-50%, 3px);
    transition:
      opacity 160ms ease,
      transform 160ms ease;
  }

  .launch-root[data-workbench-color-mode='light'] .launch-root__dock {
    --launch-dock-border: rgba(88, 118, 158, 0.22);
    --launch-dock-surface-tint: rgba(255, 255, 255, 0.88);
    --launch-dock-surface-base: rgba(241, 247, 254, 0.78);
    --launch-dock-shadow: 0 16px 38px rgba(74, 96, 130, 0.13);
    --launch-dock-inner-light: rgba(255, 255, 255, 0.72);
    --launch-dock-control-hover: rgba(47, 143, 214, 0.1);
  }

  .launch-root[data-workbench-color-mode='light'] .launch-root__stage-monitor {
    --stage-monitor-border: rgba(88, 118, 158, 0.22);
    --stage-monitor-sheen: rgba(255, 255, 255, 0.58);
    --stage-monitor-start: rgba(255, 255, 255, 0.86);
    --stage-monitor-end: rgba(232, 241, 251, 0.78);
    --stage-monitor-base: rgba(244, 249, 255, 0.78);
    --stage-monitor-shadow: 0 18px 42px rgba(74, 96, 130, 0.14);
    --stage-monitor-inner-top: rgba(255, 255, 255, 0.84);
    --stage-monitor-inner-bottom: rgba(105, 130, 165, 0.12);
    --stage-monitor-step-base: rgba(247, 251, 255, 0.78);
    --stage-monitor-step-disabled: rgba(222, 232, 244, 0.54);
  }

  .launch-root__stage-monitor-step:hover .launch-root__stage-monitor-label {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  @media (max-width: 640px) {
    .launch-root__stage-monitor-stack {
      bottom: 14px;
    }

    .launch-root__stage-monitor {
      gap: 6px;
      min-height: 1.85rem;
      padding: 0.26rem 0.4rem;
    }

    .launch-root__stage-monitor-step {
      width: 1.35rem;
      height: 1.35rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .launch-root__view {
      will-change: auto;
    }
  }

  .launch-root__placeholder {
    min-height: 100vh;
    display: grid;
    place-items: center;
    color: var(--workbench-text-primary, #e8eef8);
    background: transparent;
  }

  .launch-root--locale-pending > :not(.launch-root__ambient) {
    visibility: hidden;
  }
</style>
