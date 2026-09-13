<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let toolMenuElement: HTMLElement | null = null;
  export let toolMenuSurfaceElement: HTMLElement | null = null;
  export let actionMenuElement: HTMLElement | null = null;
  export let actionMenuSurfaceElement: HTMLElement | null = null;

  const dispatch = createEventDispatcher<{
    outsidepointerdown: PointerEvent;
    escapekeydown: KeyboardEvent;
    pointermove: PointerEvent;
    pointerup: PointerEvent;
    viewportlayoutchange: UIEvent;
    closefloatingsurfaces: CustomEvent<unknown>;
  }>();

  function handleWindowPointerDown(event: PointerEvent): void {
    const target = event.target as Node | null;
    const path = event.composedPath();

    if (
      target &&
      (isEventInsideElement(path, toolMenuElement, target) ||
        isEventInsideElement(path, toolMenuSurfaceElement, target) ||
        isEventInsideElement(path, actionMenuElement, target) ||
        isEventInsideElement(path, actionMenuSurfaceElement, target))
    ) {
      return;
    }

    dispatch('outsidepointerdown', event);
  }

  function isEventInsideElement(
    path: EventTarget[],
    element: HTMLElement | null,
    fallbackTarget: Node
  ): boolean {
    return !!element && (path.includes(element) || element.contains(fallbackTarget));
  }

  function handleWindowKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    dispatch('escapekeydown', event);
  }

  function handleCloseFloatingSurfaces(event: Event): void {
    dispatch('closefloatingsurfaces', event as CustomEvent<unknown>);
  }

  function handleVisualViewportLayoutChange(event: Event): void {
    dispatch('viewportlayoutchange', event as UIEvent);
  }

  onMount(() => {
    window.addEventListener('workbench:close-floating-surfaces', handleCloseFloatingSurfaces);
    window.visualViewport?.addEventListener('resize', handleVisualViewportLayoutChange);
    window.visualViewport?.addEventListener('scroll', handleVisualViewportLayoutChange);

    return () => {
      window.removeEventListener('workbench:close-floating-surfaces', handleCloseFloatingSurfaces);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportLayoutChange);
      window.visualViewport?.removeEventListener('scroll', handleVisualViewportLayoutChange);
    };
  });
</script>

<svelte:window
  on:pointerdown|capture={handleWindowPointerDown}
  on:pointermove={(event) => dispatch('pointermove', event)}
  on:pointerup={(event) => dispatch('pointerup', event)}
  on:keydown={handleWindowKeyDown}
  on:resize={(event) => dispatch('viewportlayoutchange', event)}
  on:scroll|capture={(event) => dispatch('viewportlayoutchange', event)}
/>
