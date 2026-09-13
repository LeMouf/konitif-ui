<script lang="ts">
  import type { ProjectGateContextOption, ProjectGateContextRow } from '../../projectGateContext';
  import ProjectGateListingDetail from './ProjectGateListingDetail.svelte';
  import ProjectGateRepositoryDetail from './ProjectGateRepositoryDetail.svelte';

  export let row: ProjectGateContextRow;
  export let onBack: () => void = () => undefined;
  export let onSelectOption: (option: ProjectGateContextOption) => void = () => undefined;
  export let onRunOption: (option: ProjectGateContextOption, mode: 'direct' | 'step') => void = () => undefined;
</script>

{#if row.id === 'repository'}
  <ProjectGateRepositoryDetail {row} {onBack} {onSelectOption} />
{:else}
  <ProjectGateListingDetail {row} {onBack} {onSelectOption} {onRunOption} />
{/if}
