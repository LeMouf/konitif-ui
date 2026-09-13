<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';

  import type { FooterControlId } from './footerControl';

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

  const i18nT = getWorkbenchTranslator();

  export let hoveredFooterControl: FooterControlId | null = null;
  export let hoveredLayoutEditOptionKey: LayoutEditOptionKey | null = null;
  export let layoutEditButtonGroupElement: HTMLDivElement | null = null;
  export let layoutEditMenuElement: HTMLDivElement | null = null;
  export let isLayoutEditingEnabled = false;
  export let isLayoutEditMenuOpen = false;
  export let layoutEditModeView: LayoutEditModeView = 'off';
  export let layoutEditModeTabs: Array<{ key: LayoutEditModeView; label: string }> = [];
  export let layoutEditUiSections: LayoutEditSection[] = [];
  export let layoutEditActionSections: LayoutEditSection[] = [];
  export let activeLayoutEditOptionStatuses: Record<LayoutEditOptionKey, LayoutEditOptionStatus>;
  export let highlightedLayoutEditControllerKeys: Set<LayoutEditOptionKey> = new Set();
  export let showLayoutEditingToggle = true;
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

<div
  bind:this={layoutEditButtonGroupElement}
  role="presentation"
  class:app-shell__footer-control--open={isLayoutEditMenuOpen}
  class:app-shell__footer-toggle-group--active={isLayoutEditingEnabled}
  class:app-shell__footer-toggle-group--menu-only={!showLayoutEditingToggle}
  class="app-shell__footer-toggle-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'layout')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  {#if showLayoutEditingToggle}
    <button
      type="button"
      class="app-shell__footer-toggle app-shell__footer-toggle--primary"
      on:click={toggleLayoutEditing}
      aria-pressed={isLayoutEditingEnabled}
    >
      {#if isLayoutEditingEnabled}
        <WorkbenchIcon
          className="app-shell__footer-toggle-state-icon app-shell__footer-toggle-state-icon--brush"
          icon="action.brush"
          label="Layout editing enabled"
        />
      {:else}
        <WorkbenchIcon
          className="app-shell__footer-toggle-state-icon app-shell__footer-toggle-state-icon--lock"
          icon="action.lock"
          label="Layout locked"
        />
      {/if}
      <span class="app-shell__footer-toggle-label">{$i18nT('ui.shell.footer.layout', { default: 'Layout' })}</span>
    </button>
  {/if}

  <button
    type="button"
    class:app-shell__footer-toggle-menu-button--open={isLayoutEditMenuOpen}
    class="app-shell__footer-toggle-menu-button"
    aria-label={$i18nT('ui.shell.footer.layout.openOptions', { default: 'Open layout edit options' })}
    aria-haspopup="menu"
    aria-expanded={isLayoutEditMenuOpen}
    title={$i18nT('ui.shell.footer.layout.openOptions', { default: 'Open layout edit options' })}
    on:click={toggleLayoutEditMenu}
  >
    <WorkbenchIcon
      className="app-shell__footer-control-icon app-shell__footer-control-icon--menu"
      icon="action.more-horizontal"
      label="Layout options"
    />
  </button>

  {#if isLayoutEditMenuOpen}
    <div
      bind:this={layoutEditMenuElement}
      class="app-shell__footer-toggle-menu"
      role="menu"
      aria-label={$i18nT('ui.shell.footer.layout.options', { default: 'Layout edit options' })}
    >
      <div class="app-shell__footer-toggle-menu-shell">
        <aside class="app-shell__footer-toggle-menu-modes" aria-label={$i18nT('ui.shell.footer.layout.modeView', { default: 'Layout edit mode view' })}>
          {#each layoutEditModeTabs as tab (tab.key)}
            <button
              type="button"
              class:app-shell__footer-toggle-mode-tab--active={layoutEditModeView === tab.key}
              class="app-shell__footer-toggle-mode-tab"
              aria-pressed={layoutEditModeView === tab.key}
              on:click={() => selectLayoutEditModeView(tab.key)}
            >
              <span class="app-shell__footer-toggle-mode-tab-label">{resolveLayoutEditModeLabel(tab.key, tab.label)}</span>
            </button>
          {/each}
        </aside>

        <div class="app-shell__footer-toggle-menu-groups">
          <section class="app-shell__footer-toggle-menu-group" aria-labelledby="layout-edit-ui-column">
            <header class="app-shell__footer-toggle-menu-group-header">
              <h3 id="layout-edit-ui-column" class="app-shell__footer-toggle-menu-group-title">
                {$i18nT('ui.shell.footer.layout.interface', { default: 'Interface' })}
              </h3>
            </header>

            <div class="app-shell__footer-toggle-menu-group-sections">
              {#each layoutEditUiSections as section, sectionIndex (section.title)}
                <div class="app-shell__footer-toggle-menu-section">
                  <div class="app-shell__footer-toggle-menu-section-header">
                    <span class="app-shell__footer-toggle-menu-section-kind">
                      {#if shouldRenderLayoutEditSectionKind(layoutEditUiSections, sectionIndex)}
                        {resolveLayoutEditSectionKind(section.title)}
                      {/if}
                    </span>
                    <h4 class="app-shell__footer-toggle-menu-section-title">{resolveLayoutEditSectionTitle(section.title)}</h4>
                  </div>

                  <div class="app-shell__footer-toggle-menu-section-items">
                    {#each section.items as item (item.key)}
                      <button
                        type="button"
                        class:app-shell__footer-toggle-menu-item--active={activeLayoutEditOptionStatuses[item.key].state === 'enabled'}
                        class:app-shell__footer-toggle-menu-item--inactive={activeLayoutEditOptionStatuses[item.key].state === 'blocked'}
                        class:app-shell__footer-toggle-menu-item--disabled={activeLayoutEditOptionStatuses[item.key].state === 'disabled'}
                        class:app-shell__footer-toggle-menu-item--controller-highlighted={highlightedLayoutEditControllerKeys.has(item.key)}
                        class="app-shell__footer-toggle-menu-item"
                        role="menuitemcheckbox"
                        aria-checked={activeLayoutEditOptionStatuses[item.key].raw}
                        title={resolveLayoutEditOptionStatusLabel(item.key)}
                        on:mouseenter={() => (hoveredLayoutEditOptionKey = item.key)}
                        on:mouseleave={() => (hoveredLayoutEditOptionKey = null)}
                        on:focus={() => (hoveredLayoutEditOptionKey = item.key)}
                        on:blur={() => (hoveredLayoutEditOptionKey = null)}
                        on:click={() => toggleLayoutEditOption(item.key)}
                      >
                        <span
                          class={`app-shell__footer-toggle-menu-item-check app-shell__footer-toggle-menu-item-check--${activeLayoutEditOptionStatuses[item.key].state}`}
                          aria-hidden="true"
                        >
                          <span class="app-shell__footer-toggle-menu-item-check-dot"></span>
                        </span>
                        <span class="app-shell__footer-toggle-menu-item-label">{resolveLayoutEditOptionLabel(item.key)}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </section>

          <section class="app-shell__footer-toggle-menu-group" aria-labelledby="layout-edit-actions-column">
            <header class="app-shell__footer-toggle-menu-group-header">
              <h3 id="layout-edit-actions-column" class="app-shell__footer-toggle-menu-group-title">{$i18nT('ui.shell.footer.layout.actions', { default: 'Actions' })}</h3>
            </header>

            <div class="app-shell__footer-toggle-menu-group-sections">
              {#each layoutEditActionSections as section, sectionIndex (section.title)}
                <div class="app-shell__footer-toggle-menu-section">
                  <div class="app-shell__footer-toggle-menu-section-header">
                    <span class="app-shell__footer-toggle-menu-section-kind">
                      {#if shouldRenderLayoutEditSectionKind(layoutEditActionSections, sectionIndex)}
                        {resolveLayoutEditSectionKind(section.title)}
                      {/if}
                    </span>
                    <h4 class="app-shell__footer-toggle-menu-section-title">{resolveLayoutEditSectionTitle(section.title)}</h4>
                  </div>

                  <div class="app-shell__footer-toggle-menu-section-items">
                    {#each section.items as item (item.key)}
                      <button
                        type="button"
                        class:app-shell__footer-toggle-menu-item--active={activeLayoutEditOptionStatuses[item.key].state === 'enabled'}
                        class:app-shell__footer-toggle-menu-item--inactive={activeLayoutEditOptionStatuses[item.key].state === 'blocked'}
                        class:app-shell__footer-toggle-menu-item--disabled={activeLayoutEditOptionStatuses[item.key].state === 'disabled'}
                        class:app-shell__footer-toggle-menu-item--controller-highlighted={highlightedLayoutEditControllerKeys.has(item.key)}
                        class="app-shell__footer-toggle-menu-item"
                        role="menuitemcheckbox"
                        aria-checked={activeLayoutEditOptionStatuses[item.key].raw}
                        title={resolveLayoutEditOptionStatusLabel(item.key)}
                        on:mouseenter={() => (hoveredLayoutEditOptionKey = item.key)}
                        on:mouseleave={() => (hoveredLayoutEditOptionKey = null)}
                        on:focus={() => (hoveredLayoutEditOptionKey = item.key)}
                        on:blur={() => (hoveredLayoutEditOptionKey = null)}
                        on:click={() => toggleLayoutEditOption(item.key)}
                      >
                        <span
                          class={`app-shell__footer-toggle-menu-item-check app-shell__footer-toggle-menu-item-check--${activeLayoutEditOptionStatuses[item.key].state}`}
                          aria-hidden="true"
                        >
                          <span class="app-shell__footer-toggle-menu-item-check-dot"></span>
                        </span>
                        <span class="app-shell__footer-toggle-menu-item-label">{resolveLayoutEditOptionLabel(item.key)}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.app-shell__footer-control-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    flex: 0 0 auto;
    display: block;
  }

  :global(.app-shell__footer-control-icon--menu) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
  }

  .app-shell__footer-toggle-group {
    max-width: 100%;
  }

  .app-shell__footer-toggle-group--active {
    background: var(--app-shell-footer-control-bg-active, color-mix(in srgb, var(--color-background-selected) 16%, transparent));
    color: var(--app-shell-footer-control-text-active, color-mix(in srgb, var(--color-text-primary) 88%, var(--color-background-surface)));
  }

  .app-shell__footer-toggle,
  .app-shell__footer-toggle-menu-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 0;
  }

  .app-shell__footer-toggle {
    gap: var(--app-shell-footer-control-gap, var(--space-4));
    height: 100%;
    justify-content: flex-start;
    padding: 0 var(--app-shell-footer-control-padding-x, 0.54rem);
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
    min-height: 0;
  }

  .app-shell__footer-toggle-menu-button {
    justify-content: center;
    width: var(--app-shell-footer-icon-button-width, 1.65rem);
    height: 100%;
    min-height: 0;
    border-left: 1px solid var(--app-shell-footer-control-border, var(--color-border-subtle));
    border-radius: 0 calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px) 0;
    background: transparent;
    color: var(--color-text-muted);
    flex: 0 0 auto;
  }

  .app-shell__footer-toggle-group--menu-only .app-shell__footer-toggle-menu-button {
    border-left: 0;
    border-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  .app-shell__footer-toggle-group--active .app-shell__footer-toggle-menu-button {
    border-left-color: color-mix(in srgb, var(--color-border-subtle) 88%, transparent);
  }

  :global(.app-shell__footer-toggle-state-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    flex: 0 0 auto;
    display: block;
  }

  :global(.app-shell__footer-toggle-state-icon--brush) {
    color: var(--color-action-primary-hover);
  }

  .app-shell__footer-toggle-label {
    color: inherit;
    line-height: 1;
  }

  .app-shell__footer-toggle:hover,
  .app-shell__footer-toggle-menu-button:hover {
    color: color-mix(in srgb, var(--color-text-primary) 86%, var(--color-background-surface));
    background: color-mix(in srgb, var(--color-background-hover) 24%, transparent);
  }

  .app-shell__footer-toggle-menu-button:hover,
  .app-shell__footer-toggle-menu-button--open {
    background: color-mix(in srgb, var(--color-background-hover) 40%, transparent);
    color: color-mix(in srgb, var(--color-text-primary) 92%, var(--color-background-surface));
  }

  .app-shell__footer-toggle-menu-button--open {
    border-left-color: color-mix(in srgb, var(--color-text-primary) 18%, transparent);
  }

  .app-shell__footer-toggle-menu {
    position: absolute;
    right: 0;
    top: auto;
    bottom: calc(100% - 1px);
    transform-origin: bottom right;
    z-index: 30;
    box-sizing: border-box;
    width: min(56rem, calc(100vw - var(--space-12)));
    max-width: calc(100vw - var(--space-12));
    padding: var(--space-8);
    border: 1px solid var(--color-border-strong);
    border-bottom-right-radius: 0;
    border-bottom-left-radius: var(--radius-medium);
    border-top-left-radius: var(--radius-large);
    border-top-right-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow:
      0 -12px 28px rgb(0 0 0 / 0.22),
      0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 38%, transparent);
  }

  .app-shell__footer-toggle-menu-shell {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: var(--space-8);
    align-items: start;
  }

  .app-shell__footer-toggle-menu-modes {
    display: grid;
    gap: var(--space-4);
    align-self: stretch;
    padding-right: var(--space-6);
    border-right: 1px solid color-mix(in srgb, var(--color-border-subtle) 100%, transparent);
  }

  .app-shell__footer-toggle-mode-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 3.25rem;
    padding: var(--space-4) 0;
    border: 0;
    border-radius: var(--radius-medium);
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }

  .app-shell__footer-toggle-mode-tab:hover {
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-mode-tab--active {
    background: var(--color-background-selected);
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-mode-tab-label {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1;
  }

  .app-shell__footer-toggle-menu-groups {
    display: grid;
    grid-template-columns: minmax(18rem, 3fr) minmax(22rem, 4fr);
    gap: var(--space-8);
    align-items: start;
  }

  .app-shell__footer-toggle-menu-group {
    display: grid;
    gap: var(--space-10);
    min-width: 0;
  }

  .app-shell__footer-toggle-menu-group:first-child {
    grid-column: 1;
  }

  .app-shell__footer-toggle-menu-group:last-child {
    grid-column: 2;
  }

  .app-shell__footer-toggle-menu-group-header {
    padding: 0 var(--space-6) var(--space-4);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-subtle) 100%, transparent);
  }

  .app-shell__footer-toggle-menu-group-title,
  .app-shell__footer-toggle-menu-section-title {
    margin: 0;
    font: inherit;
  }

  .app-shell__footer-toggle-menu-group-title {
    color: var(--color-text-primary);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .app-shell__footer-toggle-menu-group-sections {
    display: grid;
    grid-template-columns: repeat(2, minmax(9rem, 1fr));
    gap: var(--space-8);
    align-items: stretch;
  }

  .app-shell__footer-toggle-menu-group:first-child .app-shell__footer-toggle-menu-group-sections {
    grid-template-columns: repeat(3, minmax(6.4rem, 1fr));
  }

  .app-shell__footer-toggle-menu-group:last-child .app-shell__footer-toggle-menu-group-sections {
    grid-template-columns: repeat(3, minmax(7rem, 1fr));
  }

  .app-shell__footer-toggle-menu-section {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    height: 100%;
    align-content: start;
  }

  .app-shell__footer-toggle-menu-section + .app-shell__footer-toggle-menu-section {
    padding-left: var(--space-8);
    border-left: 1px solid color-mix(in srgb, var(--color-border-subtle) 100%, transparent);
  }

  .app-shell__footer-toggle-menu-section-header {
    display: grid;
    grid-template-rows: 1.125rem auto;
    gap: var(--space-4);
    min-height: 0;
    align-content: start;
    justify-items: center;
    text-align: center;
    padding: 0 var(--space-6);
  }

  .app-shell__footer-toggle-menu-section-title {
    color: var(--color-text-secondary);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.1;
  }

  .app-shell__footer-toggle-menu-section-kind {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    min-height: 1.125rem;
    padding: 0 var(--space-4);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 100%, transparent);
    border-radius: 999px;
    color: var(--color-text-muted);
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .app-shell__footer-toggle-menu-section-kind:empty {
    visibility: hidden;
  }

  .app-shell__footer-toggle-menu-section-items {
    display: grid;
    gap: var(--space-2);
  }

  .app-shell__footer-toggle-menu-item {
    display: grid;
    grid-template-columns: 1rem minmax(0, 1fr);
    align-items: start;
    gap: var(--space-8);
    min-height: 1.75rem;
    padding: var(--space-2) var(--space-6);
    border: 0;
    border-radius: var(--radius-medium);
    background: transparent;
    color: var(--color-text-secondary);
    text-align: left;
    font: inherit;
  }

  .app-shell__footer-toggle-menu-item:hover {
    background: var(--color-background-hover);
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-menu-item--active {
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-menu-item--inactive {
    color: var(--color-text-muted);
  }

  .app-shell__footer-toggle-menu-item--disabled {
    color: var(--color-text-secondary);
  }

  .app-shell__footer-toggle-menu-item--controller-highlighted {
    background: color-mix(in srgb, var(--color-border-focus) 10%, transparent);
    color: var(--color-text-primary);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border-focus) 26%, transparent);
  }

  .app-shell__footer-toggle-menu-item-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    margin-top: 0.0625rem;
    color: var(--color-text-muted);
  }

  .app-shell__footer-toggle-menu-item-check-dot {
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: transparent;
    box-sizing: border-box;
  }

  .app-shell__footer-toggle-menu-item-check--enabled {
    color: var(--color-action-primary-hover);
  }

  .app-shell__footer-toggle-menu-item-check--enabled .app-shell__footer-toggle-menu-item-check-dot {
    background: currentColor;
    border-color: currentColor;
    box-shadow: inset 0 0 0 2px var(--color-background-canvas);
  }

  .app-shell__footer-toggle-menu-item-check--blocked {
    color: var(--color-text-muted);
  }

  .app-shell__footer-toggle-menu-item-check--blocked .app-shell__footer-toggle-menu-item-check-dot {
    border-style: dashed;
    opacity: 0.9;
  }

  .app-shell__footer-toggle-menu-item-check--disabled {
    color: var(--color-border-default);
  }

  .app-shell__footer-toggle-menu-item-label {
    font-size: var(--font-size-label);
    white-space: normal;
    min-width: 0;
    line-height: 1.2;
  }

  @media (max-width: 960px) {
    .app-shell__footer-toggle-menu {
      width: min(32rem, calc(100vw - var(--space-16)));
      max-width: calc(100vw - var(--space-16));
    }

    .app-shell__footer-toggle-menu-shell {
      grid-template-columns: 2.25rem minmax(0, 1fr);
    }

    .app-shell__footer-toggle-menu-groups {
      grid-template-columns: minmax(0, 1fr);
    }

    .app-shell__footer-toggle-menu-group:first-child,
    .app-shell__footer-toggle-menu-group:last-child {
      grid-column: auto;
    }

    .app-shell__footer-toggle-menu-section + .app-shell__footer-toggle-menu-section {
      padding-left: 0;
      border-left: 0;
    }
  }

  @media (max-width: 640px) {
    .app-shell__footer-toggle-menu {
      width: min(20rem, calc(100vw - var(--space-16)));
      max-width: calc(100vw - var(--space-16));
    }

    .app-shell__footer-toggle-menu-shell {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-8);
    }

    .app-shell__footer-toggle-menu-modes {
      display: flex;
      border-right: 0;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-right: 0;
      padding-bottom: var(--space-6);
    }

    .app-shell__footer-toggle-mode-tab {
      min-height: 1.75rem;
    }

    .app-shell__footer-toggle-mode-tab-label {
      writing-mode: horizontal-tb;
      transform: none;
    }

    .app-shell__footer-toggle-menu-group-sections {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
