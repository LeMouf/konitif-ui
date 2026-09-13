<script lang="ts">
  import type {
    InMemoryToolRegistry,
    PanelNode,
    ToolPanelLoadingState,
    ToolRuntimeHostActions,
    Workspace,
    WorkspaceCommand,
    WorkspaceFocus
  } from '@konitif/workbench';
  import ToolHost from './ToolHost.svelte';

  export let panel: PanelNode | null = null;
  export let workspace: Workspace;
  export let focus: WorkspaceFocus;
  export let registry: InMemoryToolRegistry;
  export let dispatchCommand: (command: WorkspaceCommand) => void;
  export let toolRuntimeHost: ToolRuntimeHostActions;
  export let layoutEditingEnabled = true;
  export let panelLoading: ToolPanelLoadingState | null = null;
</script>

<div class="stack-body">
  {#if panel}
    <ToolHost
      {panel}
      {workspace}
      {focus}
      {registry}
      {dispatchCommand}
      {toolRuntimeHost}
      {layoutEditingEnabled}
      {panelLoading}
    />
  {/if}
</div>

<style>
  .stack-body {
    min-width: 0;
    min-height: 0;
    display: flex;
    width: 100%;
    background: var(--color-background-surface);
    overflow: hidden;
    border-bottom-left-radius: calc(var(--stack-panel-radius) - 1px);
    border-bottom-right-radius: calc(var(--stack-panel-radius) - 1px);
  }
</style>
