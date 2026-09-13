<script lang="ts">
  import type { InMemoryShellWidgetRegistry } from '@konitif/workbench';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../i18n/workbenchI18n';
  import { resolveLocalizedShellWidgetDefinitionText } from '../i18n/workbenchEntityTranslations';
  import {
    shellWidgetDragState,
    updateShellWidgetDragPointer,
    type ShellWidgetDragPointer
  } from './shellWidgetDragState';

  export let widgetRegistry: InMemoryShellWidgetRegistry;

  const i18nT = getWorkbenchTranslator();
  const previewOffset = 14;

  $: dragState = $shellWidgetDragState;
  $: widgetEntry = dragState ? widgetRegistry.get(dragState.widgetId) : null;
  $: widgetText = widgetEntry ? resolveLocalizedShellWidgetDefinitionText($i18nT, widgetEntry.definition) : null;
  $: previewStyle = dragState?.pointer
    ? `transform: translate3d(${dragState.pointer.x + previewOffset}px, ${dragState.pointer.y + previewOffset}px, 0);`
    : '';

  function handleWindowDragOver(event: DragEvent): void {
    if (!$shellWidgetDragState) {
      return;
    }

    const pointer = resolveDragPointer(event);

    if (pointer) {
      updateShellWidgetDragPointer(pointer);
    }
  }

  function resolveDragPointer(event: DragEvent): ShellWidgetDragPointer | null {
    const { clientX, clientY } = event;

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    return { x: clientX, y: clientY };
  }
</script>

<svelte:window on:dragover={handleWindowDragOver} />

{#if dragState && widgetEntry && widgetText && dragState.pointer}
  <div class="shell-widget-drag-preview" style={previewStyle} aria-hidden="true">
    <span class="shell-widget-drag-preview__icon">
      <WorkbenchIcon icon={widgetEntry.definition.icon ?? widgetText.title.slice(0, 1)} label="" />
    </span>
    <span class="shell-widget-drag-preview__body">
      <span class="shell-widget-drag-preview__eyebrow">
        {$i18nT('ui.shell.shellRegion.widget.dragPreviewEyebrow', { default: 'Moving widget' })}
      </span>
      <span class="shell-widget-drag-preview__title">{widgetText.title}</span>
    </span>
  </div>
{/if}

<style>
  .shell-widget-drag-preview {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1800;
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    max-width: min(320px, calc(100vw - 2rem));
    min-width: 12rem;
    padding: var(--space-10) var(--space-12);
    border: 1px solid color-mix(in srgb, var(--color-accent-primary) 72%, var(--color-border-strong));
    border-radius: var(--radius-medium);
    color: var(--color-text-primary);
    background:
      radial-gradient(circle at 16% 16%, rgb(34 211 238 / 0.18), transparent 34%),
      linear-gradient(135deg, rgb(59 130 246 / 0.14), transparent 58%),
      rgb(4 11 22 / 0.96);
    box-shadow:
      0 18px 42px rgb(0 0 0 / 0.58),
      0 0 0 1px rgb(255 255 255 / 0.08),
      0 0 26px color-mix(in srgb, var(--color-accent-primary) 22%, transparent);
    opacity: 0.98;
    pointer-events: none;
    user-select: none;
    will-change: transform;
  }

  .shell-widget-drag-preview__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 var(--size-icon-button);
    width: var(--size-icon-button);
    height: var(--size-icon-button);
    border: 1px solid color-mix(in srgb, var(--color-accent-primary) 42%, transparent);
    border-radius: var(--radius-small);
    color: var(--color-accent-primary);
    background: color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-background-elevated));
  }

  .shell-widget-drag-preview__body {
    display: grid;
    min-width: 0;
    gap: var(--space-2);
  }

  .shell-widget-drag-preview__eyebrow {
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .shell-widget-drag-preview__title {
    overflow: hidden;
    font-size: var(--font-size-label);
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
