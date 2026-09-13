<script lang="ts">
  import type { LaunchState, StageProjection } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import ProjectGateIconBadge from './components/atoms/ProjectGateIconBadge.svelte';
  import ProjectGateContextDetail from './components/organisms/ProjectGateContextDetail.svelte';
  import ProjectGateContextOverview from './components/organisms/ProjectGateContextOverview.svelte';
  import type { ProjectGateContextCategory, ProjectGateContextOption, ProjectGateContextRow } from './projectGateContext';
  import type { ProjectGateStageStepId } from './projectGateStage';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';

  export let state: LaunchState;
  export let stageStep: ProjectGateStageStepId = 0;
  export let onSelectSelf: () => void = () => undefined;
  export let contextRows: ProjectGateContextRow[] = [];
  export let selectedContextCategory: ProjectGateContextCategory | null = null;
  export let openContextCategory: ProjectGateContextCategory | null = null;
  export let onShowContextCategory: (category: ProjectGateContextCategory) => void = () => undefined;
  export let onToggleContextCategory: (category: ProjectGateContextCategory) => void = () => undefined;
  export let onBackToContextOverview: () => void = () => undefined;
  export let onBackToSelfMenu: () => void = () => undefined;
  export let onSelectContextOption: (option: ProjectGateContextOption) => void = () => undefined;
  export let onRunContextOption: (option: ProjectGateContextOption, mode: 'direct' | 'step') => void = () => undefined;
  export let stageProjection: StageProjection | null = null;
  const i18nT = getWorkbenchTranslator();

  $: selectedContextRow = resolveSelectedContextRow(selectedContextCategory, openContextCategory, contextRows);

  function resolveSelectedContextRow(
    selectedCategory: ProjectGateContextCategory | null,
    openCategory: ProjectGateContextCategory | null,
    rows: ProjectGateContextRow[]
  ): ProjectGateContextRow | null {
    const category = selectedCategory ?? openCategory;
    return category === null ? null : rows.find((row) => row.id === category) ?? null;
  }

  function createStageSurfaceStyle(nodeId: string): string {
    const projectedNode = stageProjection?.nodes.find((node) => node.id === nodeId);

    if (!projectedNode) {
      return '';
    }

    return [
      `--stage-x: ${projectedNode.x}px`,
      `--stage-y: ${projectedNode.y}px`,
      `--stage-depth: ${projectedNode.depth}`,
      `--stage-surface-opacity: ${projectedNode.opacity}`,
      `--stage-surface-scale: ${projectedNode.scale}`,
    ].join('; ');
  }
</script>

<section class="project-gate" aria-label={$i18nT('ui.shell.launchGate.ariaLabel', { default: 'Launch gate' })}>
  {#if stageStep === -1}
    <div class="project-gate__self-entry">
      <button
        type="button"
        class="project-gate__self-card"
        data-stage-node="entry-self"
        style={createStageSurfaceStyle('entry-self')}
        on:click={onSelectSelf}
      >
        <ProjectGateIconBadge icon="action.focus" label={$i18nT('ui.shell.launchGate.self.coreOnly', { default: 'Core-only' })} tone="self" size="lg" />
        <span>
          <small>{$i18nT('ui.shell.launchGate.self.label', { default: 'Self' })}</small>
          <strong>{$i18nT('ui.shell.launchGate.self.coreOnly', { default: 'Core-only' })}</strong>
          <em>{$i18nT('ui.shell.launchGate.self.description', { default: 'Reduced introspection environment' })}</em>
        </span>
        <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.actions.open', { default: 'Open' })} />
      </button>
    </div>
  {:else if selectedContextRow}
    <ProjectGateContextDetail
      row={selectedContextRow}
      onBack={onBackToContextOverview}
      onSelectOption={onSelectContextOption}
      onRunOption={onRunContextOption}
    />
  {:else}
    <ProjectGateContextOverview
      rows={contextRows}
      onBack={onBackToSelfMenu}
      onSelectCategory={(category) => {
        onToggleContextCategory(category);
        onShowContextCategory(category);
      }}
    />
  {/if}

  {#if state.error}
    <p class="project-gate__error">{state.error}</p>
  {/if}
</section>

<style>
  .project-gate {
    position: relative;
    min-height: 100vh;
    display: grid;
    align-content: center;
    gap: 24px;
    padding: clamp(28px, 5vw, 72px);
    color: var(--k-text-primary, var(--workbench-text-primary, #e8eef8));
    background: transparent;
  }

  .project-gate__self-entry {
    width: min(760px, 100%);
    margin: 0 auto;
    display: grid;
    gap: 1rem;
  }

  .project-gate__self-card {
    --self-card-tone-rgb: 105 236 193;
    --self-card-text-primary: var(--k-text-primary, #f2f6ff);
    --self-card-text-secondary: var(--k-text-secondary, #b8c6d8);
    --self-card-text-muted: var(--k-text-muted, #8fa1b8);
    --self-card-surface-start: rgba(15, 30, 42, 0.78);
    --self-card-surface-end: rgba(6, 13, 23, 0.64);
    --self-card-surface-base: rgba(6, 12, 21, 0.64);
    --self-card-shadow: 0 1.8rem 5rem rgba(0, 0, 0, 0.17);
    --self-card-hover-start: rgba(18, 36, 50, 0.86);
    --self-card-hover-end: rgba(8, 16, 28, 0.72);
    --self-card-hover-base: rgba(8, 16, 28, 0.72);
    --self-card-hover-shadow: 0 2rem 5.4rem rgba(0, 0, 0, 0.21);
    width: 100%;
    min-height: 10rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 1.4rem;
    padding: clamp(1.4rem, 3vw, 2rem);
    border: 1px solid rgb(var(--self-card-tone-rgb) / 0.48);
    border-radius: 8px;
    color: inherit;
    text-align: left;
    background:
      radial-gradient(circle at 0% 0%, rgba(105, 236, 193, 0.12), transparent 42%),
      linear-gradient(135deg, var(--self-card-surface-start), var(--self-card-surface-end)),
      var(--self-card-surface-base);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      var(--self-card-shadow);
    cursor: pointer;
    opacity: var(--stage-surface-opacity, 1);
    backdrop-filter: blur(18px) saturate(1.08);
  }

  .project-gate__self-card > span {
    min-width: 0;
    display: grid;
    gap: 0.42rem;
  }

  .project-gate__self-card small {
    color: var(--self-card-text-muted);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .project-gate__self-card strong {
    color: var(--self-card-text-primary);
    font-size: clamp(1.32rem, 2vw, 1.68rem);
    line-height: 1.05;
  }

  .project-gate__self-card em {
    color: var(--self-card-text-secondary);
    font-style: normal;
  }

  .project-gate__self-card:hover,
  .project-gate__self-card:focus-visible {
    border-color: rgb(var(--self-card-tone-rgb) / 0.72);
    background:
      radial-gradient(circle at 0% 0%, rgba(105, 236, 193, 0.18), transparent 44%),
      linear-gradient(135deg, var(--self-card-hover-start), var(--self-card-hover-end)),
      var(--self-card-hover-base);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.065),
      var(--self-card-hover-shadow),
      0 0 2.4rem rgba(105, 236, 193, 0.13);
    outline: none;
  }

  .project-gate__error {
    width: min(760px, 100%);
    margin: 0 auto;
    color: #ff9ba8;
  }

  :global([data-workbench-color-mode='light']) .project-gate__self-card {
    --self-card-text-primary: #15304d;
    --self-card-text-secondary: #496783;
    --self-card-text-muted: #6e839d;
    --self-card-surface-start: rgba(255, 255, 255, 0.82);
    --self-card-surface-end: rgba(238, 245, 253, 0.7);
    --self-card-surface-base: rgba(248, 251, 255, 0.72);
    --self-card-shadow: 0 1.5rem 4.5rem rgba(74, 96, 130, 0.14);
    --self-card-hover-start: rgba(255, 255, 255, 0.92);
    --self-card-hover-end: rgba(232, 242, 254, 0.82);
    --self-card-hover-base: rgba(248, 251, 255, 0.84);
    --self-card-hover-shadow: 0 1.7rem 4.8rem rgba(74, 96, 130, 0.18);
  }

  @media (max-width: 680px) {
    .project-gate {
      align-content: start;
      padding: 28px 18px;
    }

    .project-gate__self-card {
      grid-template-columns: 1fr;
    }
  }
</style>
