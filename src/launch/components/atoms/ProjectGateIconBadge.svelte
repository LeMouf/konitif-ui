<script lang="ts">
  import WorkbenchIcon from '../../../icons/WorkbenchIcon.svelte';
  import type { ProjectGateContextTone } from '../../projectGateContext';

  export let icon: string;
  export let label: string;
  export let tone: ProjectGateContextTone = 'repository';
  export let size: 'sm' | 'md' | 'lg' = 'md';
</script>

<span class="project-gate-icon-badge" data-tone={tone} data-size={size} aria-hidden="true">
  <WorkbenchIcon {icon} {label} />
</span>

<style>
  .project-gate-icon-badge {
    --gate-tone: #69ecc1;
    --gate-tone-rgb: 105 236 193;
    --gate-badge-surface: rgba(5, 11, 20, 0.44);
    --gate-badge-tone-radial-alpha: 0.16;
    --gate-badge-border-alpha: 0.62;
    --gate-badge-inner-alpha: 0.1;
    --gate-badge-glow-alpha: 0.08;
    width: 3.1rem;
    height: 3.1rem;
    display: grid;
    place-items: center;
    border: 1px solid rgb(var(--gate-tone-rgb) / var(--gate-badge-border-alpha));
    border-radius: 999px;
    color: var(--gate-tone);
    background:
      radial-gradient(circle at 50% 50%, rgb(var(--gate-tone-rgb) / var(--gate-badge-tone-radial-alpha)), transparent 58%),
      var(--gate-badge-surface);
    box-shadow:
      inset 0 0 0 1px rgb(var(--gate-tone-rgb) / var(--gate-badge-inner-alpha)),
      0 0 1.8rem rgb(var(--gate-tone-rgb) / var(--gate-badge-glow-alpha));
  }

  .project-gate-icon-badge[data-size='sm'] {
    width: 2.65rem;
    height: 2.65rem;
  }

  .project-gate-icon-badge[data-size='lg'] {
    width: clamp(4.9rem, 6.2vw, 5.8rem);
    height: clamp(4.9rem, 6.2vw, 5.8rem);
  }

  .project-gate-icon-badge[data-tone='repository'] {
    --gate-tone: var(--project-gate-tone-repository, #f1c96f);
    --gate-tone-rgb: var(--project-gate-tone-repository-rgb, 241 201 111);
  }

  .project-gate-icon-badge[data-tone='project'] {
    --gate-tone: var(--project-gate-tone-project, #a78bfa);
    --gate-tone-rgb: var(--project-gate-tone-project-rgb, 167 139 250);
  }

  .project-gate-icon-badge[data-tone='tool'] {
    --gate-tone: var(--project-gate-tone-tool, #78e09a);
    --gate-tone-rgb: var(--project-gate-tone-tool-rgb, 120 224 154);
  }

  .project-gate-icon-badge[data-tone='widget'] {
    --gate-tone: var(--project-gate-tone-widget, #f472b6);
    --gate-tone-rgb: var(--project-gate-tone-widget-rgb, 244 114 182);
  }

  .project-gate-icon-badge[data-tone='poc'] {
    --gate-tone: var(--project-gate-tone-poc, #6da4ff);
    --gate-tone-rgb: var(--project-gate-tone-poc-rgb, 109 164 255);
  }

  .project-gate-icon-badge[data-tone='self'] {
    --gate-tone: var(--project-gate-tone-self, #69ecc1);
    --gate-tone-rgb: var(--project-gate-tone-self-rgb, 105 236 193);
  }

  :global([data-workbench-color-mode='light']) .project-gate-icon-badge {
    --gate-badge-surface: rgba(248, 251, 255, 0.72);
    --gate-badge-tone-radial-alpha: 0.2;
    --gate-badge-border-alpha: 0.68;
    --gate-badge-inner-alpha: 0.16;
    --gate-badge-glow-alpha: 0.12;
  }

  .project-gate-icon-badge :global(.workbench-icon) {
    --workbench-icon-color-action: currentColor;
    --workbench-icon-color-danger: currentColor;
    --workbench-icon-color-design: currentColor;
    --workbench-icon-color-product: currentColor;
    --workbench-icon-color-runtime: currentColor;
    --workbench-icon-color-template: currentColor;
    --workbench-icon-color-shared: currentColor;
    width: 54%;
    height: 54%;
    font-size: 100%;
  }

  .project-gate-icon-badge[data-size='sm'] :global(.workbench-icon) {
    width: 52%;
    height: 52%;
  }

  .project-gate-icon-badge[data-size='lg'] :global(.workbench-icon) {
    width: 50%;
    height: 50%;
  }

  .project-gate-icon-badge :global(svg) {
    width: 100%;
    height: 100%;
    stroke-width: 1.95;
  }
</style>
