<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextRow } from '../../projectGateContext';
  import ProjectGateIconBadge from '../atoms/ProjectGateIconBadge.svelte';
  import { getWorkbenchTranslator } from '../../../i18n/workbenchI18n';

  export let row: ProjectGateContextRow;
  export let description = '';
  const i18nT = getWorkbenchTranslator();
</script>

<button type="button" class="project-gate-entry-card" data-tone={row.tone} on:click>
  <ProjectGateIconBadge icon={row.icon} label={row.title} tone={row.tone} size="lg" />
  <span class="project-gate-entry-card__copy">
    <strong>{row.title}</strong>
    <em>{description}</em>
  </span>
  {#if row.id !== 'repository'}
    <span class="project-gate-entry-card__count">
      <strong>{row.options.length}</strong>
      <em>{$i18nT('ui.shell.launchGate.context.entries', { default: 'entries' })}</em>
    </span>
  {:else}
    <span class="project-gate-entry-card__count-spacer" aria-hidden="true"></span>
  {/if}
  <span class="project-gate-entry-card__arrow" aria-hidden="true">
    <WorkbenchIcon icon="action.next-key" label={$i18nT('ui.shell.launchGate.actions.open', { default: 'Open' })} />
  </span>
</button>

<style>
  .project-gate-entry-card {
    --gate-tone: #69ecc1;
    --gate-tone-rgb: 105 236 193;
    --gate-card-text-primary: var(--k-text-primary, #f2f6ff);
    --gate-card-text-secondary: color-mix(in srgb, var(--k-text-secondary, #b8c6d8), transparent 8%);
    --gate-card-arrow: var(--k-text-primary, #eef4ff);
    --gate-card-border-alpha: 0.46;
    --gate-card-tone-alpha: 0.11;
    --gate-card-surface-start: rgba(15, 27, 44, 0.76);
    --gate-card-surface-end: rgba(7, 13, 24, 0.64);
    --gate-card-surface-base: rgba(6, 12, 21, 0.64);
    --gate-card-count-bg: rgba(5, 11, 20, 0.22);
    --gate-card-count-border: rgba(120, 151, 193, 0.22);
    --gate-card-shadow: 0 1.8rem 5rem rgba(0, 0, 0, 0.17);
    --gate-card-hover-tone-alpha: 0.16;
    --gate-card-hover-start: rgba(18, 32, 52, 0.84);
    --gate-card-hover-end: rgba(8, 15, 27, 0.72);
    --gate-card-hover-base: rgba(8, 15, 27, 0.72);
    --gate-card-hover-shadow: 0 2rem 5.4rem rgba(0, 0, 0, 0.21);
    min-width: 0;
    min-height: 5.6rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: clamp(0.65rem, 1.3vw, 1rem);
    padding: clamp(0.72rem, 1.4vw, 1rem);
    border: 1px solid rgb(var(--gate-tone-rgb) / var(--gate-card-border-alpha));
    border-radius: 8px;
    color: inherit;
    text-align: left;
    background:
      radial-gradient(circle at 0% 0%, rgb(var(--gate-tone-rgb) / var(--gate-card-tone-alpha)), transparent 42%),
      linear-gradient(135deg, var(--gate-card-surface-start), var(--gate-card-surface-end)),
      var(--gate-card-surface-base);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      var(--gate-card-shadow);
    cursor: pointer;
    backdrop-filter: blur(18px) saturate(1.08);
    transition:
      border-color 170ms ease,
      background 170ms ease,
      box-shadow 200ms ease,
      transform 170ms ease;
  }

  .project-gate-entry-card[data-tone='repository'] {
    --gate-tone: var(--project-gate-tone-repository, #f1c96f);
    --gate-tone-rgb: var(--project-gate-tone-repository-rgb, 241 201 111);
  }

  .project-gate-entry-card[data-tone='project'] {
    --gate-tone: var(--project-gate-tone-project, #a78bfa);
    --gate-tone-rgb: var(--project-gate-tone-project-rgb, 167 139 250);
  }

  .project-gate-entry-card[data-tone='tool'] {
    --gate-tone: var(--project-gate-tone-tool, #78e09a);
    --gate-tone-rgb: var(--project-gate-tone-tool-rgb, 120 224 154);
  }

  .project-gate-entry-card[data-tone='widget'] {
    --gate-tone: var(--project-gate-tone-widget, #f472b6);
    --gate-tone-rgb: var(--project-gate-tone-widget-rgb, 244 114 182);
  }

  .project-gate-entry-card[data-tone='poc'] {
    --gate-tone: var(--project-gate-tone-poc, #6da4ff);
    --gate-tone-rgb: var(--project-gate-tone-poc-rgb, 109 164 255);
  }

  :global([data-workbench-color-mode='light']) .project-gate-entry-card {
    --gate-card-text-primary: #15304d;
    --gate-card-text-secondary: #496783;
    --gate-card-arrow: #315674;
    --gate-card-border-alpha: 0.58;
    --gate-card-tone-alpha: 0.12;
    --gate-card-surface-start: rgba(255, 255, 255, 0.82);
    --gate-card-surface-end: rgba(238, 245, 253, 0.7);
    --gate-card-surface-base: rgba(248, 251, 255, 0.72);
    --gate-card-count-bg: rgba(255, 255, 255, 0.48);
    --gate-card-count-border: rgba(92, 122, 164, 0.2);
    --gate-card-shadow: 0 1.5rem 4.5rem rgba(74, 96, 130, 0.14);
    --gate-card-hover-tone-alpha: 0.18;
    --gate-card-hover-start: rgba(255, 255, 255, 0.92);
    --gate-card-hover-end: rgba(232, 242, 254, 0.82);
    --gate-card-hover-base: rgba(248, 251, 255, 0.84);
    --gate-card-hover-shadow: 0 1.7rem 4.8rem rgba(74, 96, 130, 0.18);
  }

  .project-gate-entry-card:hover,
  .project-gate-entry-card:focus-visible {
    border-color: rgb(var(--gate-tone-rgb) / 0.78);
    background:
      radial-gradient(circle at 0% 0%, rgb(var(--gate-tone-rgb) / var(--gate-card-hover-tone-alpha)), transparent 44%),
      linear-gradient(135deg, var(--gate-card-hover-start), var(--gate-card-hover-end)),
      var(--gate-card-hover-base);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.065),
      var(--gate-card-hover-shadow),
      0 0 2.4rem rgb(var(--gate-tone-rgb) / 0.13);
    outline: none;
    transform: translateY(-1px);
  }

  .project-gate-entry-card__copy {
    min-width: 0;
    display: grid;
    gap: 0.3rem;
  }

  .project-gate-entry-card__copy strong {
    overflow: hidden;
    color: var(--gate-card-text-primary);
    font-size: clamp(1.05rem, 1.45vw, 1.3rem);
    line-height: 1.05;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-gate-entry-card__copy em,
  .project-gate-entry-card__count em {
    color: var(--gate-card-text-secondary);
    font-style: normal;
  }

  .project-gate-entry-card__copy em {
    max-width: 26rem;
    font-size: clamp(0.78rem, 1.05vw, 0.9rem);
    line-height: 1.35;
  }

  .project-gate-entry-card__count {
    min-width: 3.55rem;
    min-height: 3.55rem;
    display: grid;
    place-items: center;
    padding: 0.42rem;
    border: 1px solid var(--gate-card-count-border);
    border-radius: 12px;
    background: var(--gate-card-count-bg);
  }

  .project-gate-entry-card__count-spacer {
    width: 3.55rem;
    min-height: 3.55rem;
  }

  .project-gate-entry-card__count strong {
    color: var(--gate-tone);
    font-size: 1.35rem;
    line-height: 1;
  }

  .project-gate-entry-card__arrow {
    width: 1.05rem;
    height: 1.05rem;
    color: var(--gate-card-arrow);
  }

  .project-gate-entry-card :global(.project-gate-icon-badge[data-size='lg']) {
    width: clamp(3.25rem, 4.1vw, 3.8rem);
    height: clamp(3.25rem, 4.1vw, 3.8rem);
  }

  @media (max-width: 760px) {
    .project-gate-entry-card {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .project-gate-entry-card__count,
    .project-gate-entry-card__count-spacer,
    .project-gate-entry-card__arrow {
      display: none;
    }
  }
</style>
