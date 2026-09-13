<script lang="ts">
  import type { WorkbenchAmbientQuality, WorkbenchRuntimeVisualPhase, WorkbenchThemeColorMode } from './workbenchThemeRuntime';

  export let phase: WorkbenchRuntimeVisualPhase | string | null | undefined = null;
  export let quality: WorkbenchAmbientQuality = 'off';
  export let themeMode: WorkbenchThemeColorMode = 'dark';
  export let stageAmbient: unknown = null;
</script>

<span
  class="workbench-ambient-runtime"
  data-workbench-ambient-runtime
  data-phase={phase ?? undefined}
  data-quality={quality}
  data-theme-mode={themeMode}
  data-has-stage-ambient={stageAmbient ? 'true' : undefined}
  aria-hidden="true"
></span>

<style>
  .workbench-ambient-runtime {
    display: none;
  }
</style>
