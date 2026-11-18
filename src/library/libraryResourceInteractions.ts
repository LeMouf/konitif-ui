type Rectangle = { left: number; top: number; width: number; height: number };
export type LibraryResourceDrag = { id: string; ids: string[]; x: number; y: number; folder?: string };
type Options = {
  disabled: () => boolean;
  selected: () => string[];
  visible: () => string[];
  select: (ids: string[]) => void;
  marquee: (box?: Rectangle) => void;
  drag: (state?: LibraryResourceDrag) => void;
  move: (ids: string[], destination: string) => void;
  choose?: (id: string) => void;
  dismissMenu?: () => void;
  contextMenu?: (event: MouseEvent, id: string) => void;
  remove?: () => void;
};

const modified = (event: Pick<MouseEvent, 'ctrlKey' | 'metaKey'>) => event.ctrlKey || event.metaKey;
const target = (event: Event) => event.target instanceof Element ? event.target : undefined;
const moved = (event: PointerEvent, start: { x: number; y: number }) =>
  Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5;

export function createLibraryResourceInteractions(options: Options) {
  let drag: { pointer: number; id: string; ids: string[]; x: number; y: number; active: boolean } | undefined;
  let grid: HTMLElement | undefined;

  function selectionSurface(node: HTMLElement) {
    grid = node;
    let gesture: { pointer: number; x: number; y: number; base: string[]; hit?: string; active: boolean } | undefined;
    const card = (event: Event) => target(event)?.closest<HTMLElement>('[data-library-resource]')?.dataset.libraryResource;

    function down(event: PointerEvent) {
      if (event.button !== 0 || options.disabled()) return;
      options.dismissMenu?.();
      if (!modified(event) || target(event)?.closest('input,select,textarea')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, base: options.selected(), hit: card(event), active: false };
      node.focus({ preventScroll: true });
      node.setPointerCapture(event.pointerId);
    }

    function move(event: PointerEvent) {
      if (gesture?.pointer !== event.pointerId || (!gesture.active && !moved(event, gesture))) return;
      gesture.active = true;
      const left = Math.min(gesture.x, event.clientX);
      const top = Math.min(gesture.y, event.clientY);
      const right = Math.max(gesture.x, event.clientX);
      const bottom = Math.max(gesture.y, event.clientY);
      options.marquee({ left, top, width: right - left, height: bottom - top });
      const ids = new Set(gesture.base);
      for (const item of node.querySelectorAll<HTMLElement>('[data-library-resource]')) {
        const bounds = item.getBoundingClientRect();
        const id = item.dataset.libraryResource;
        if (id !== undefined && bounds.right >= left && bounds.left <= right && bounds.bottom >= top && bounds.top <= bottom) ids.add(id);
      }
      options.select([...ids]);
    }

    function up(event: PointerEvent) {
      if (gesture?.pointer !== event.pointerId) return;
      event.stopImmediatePropagation();
      const { active, base, hit } = gesture;
      gesture = undefined;
      options.marquee();
      if (!active && hit !== undefined) options.select(base.includes(hit) ? base.filter(id => id !== hit) : [...base, hit]);
    }

    function cancel(event: PointerEvent) {
      if (gesture?.pointer !== event.pointerId) return;
      options.select(gesture.base);
      gesture = undefined;
      options.marquee();
    }

    function click(event: MouseEvent) {
      if (!modified(event) || target(event)?.closest('input,select,textarea')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function context(event: MouseEvent) {
      const id = card(event);
      if (id === undefined || options.disabled() || !options.contextMenu) return;
      event.preventDefault();
      event.stopPropagation();
      if (!options.selected().includes(id)) options.select([id]);
      options.contextMenu(event, id);
    }

    function keys(event: KeyboardEvent) {
      if (options.disabled() || target(event)?.closest('input,select,textarea,[contenteditable]')) return;
      if (event.key === 'Escape' && options.selected().length) {
        options.select([]);
        options.dismissMenu?.();
      } else if (modified(event) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        options.select(options.visible());
      } else if (event.key === 'Delete' && options.selected().length && options.remove) {
        event.preventDefault();
        options.remove();
      }
    }

    node.addEventListener('pointerdown', down, true);
    node.addEventListener('pointermove', move, true);
    node.addEventListener('pointerup', up, true);
    node.addEventListener('pointercancel', cancel);
    node.addEventListener('lostpointercapture', cancel);
    node.addEventListener('click', click, true);
    node.addEventListener('contextmenu', context);
    node.addEventListener('keydown', keys);
    return { destroy() {
      if (grid === node) grid = undefined;
      node.removeEventListener('pointerdown', down, true);
      node.removeEventListener('pointermove', move, true);
      node.removeEventListener('pointerup', up, true);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('lostpointercapture', cancel);
      node.removeEventListener('click', click, true);
      node.removeEventListener('contextmenu', context);
      node.removeEventListener('keydown', keys);
    } };
  }

  function beginResourceDrag(event: PointerEvent, id: string) {
    if (event.button !== 0 || options.disabled() || modified(event) || drag) return;
    event.preventDefault();
    grid?.focus({ preventScroll: true });
    if (!options.selected().includes(id)) options.select([id]);
    options.choose?.(id);
    drag = { id, ids: options.selected(), pointer: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function folderAt(event: PointerEvent) {
    return document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-library-folder]')?.dataset.libraryFolder;
  }

  function continueResourceDrag(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId || (!drag.active && !moved(event, drag))) return;
    drag.active = true;
    options.drag({ id: drag.id, ids: drag.ids, x: event.clientX + 14, y: event.clientY + 14, folder: folderAt(event) });
  }

  function finishResourceDrag(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return;
    const { ids, active } = drag;
    const folder = folderAt(event);
    cancelResourceDrag(event);
    if (active && folder !== undefined && !options.disabled()) options.move(ids, folder);
  }

  function cancelResourceDrag(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return;
    drag = undefined;
    options.drag();
  }

  function resourceDragSurface(node: HTMLElement, id: string) {
    function start(event: PointerEvent) {
      if (event.button !== 0 || modified(event) || options.disabled()) return;
      if (target(event)?.closest('button,input,select,summary,details,dialog,a')) return;
      if (target(event)?.closest('[data-audio-scrub]')) {
        if (!options.selected().includes(id)) return;
        event.stopPropagation();
      }
      beginResourceDrag(event, id);
    }

    node.addEventListener('pointerdown', start, true);
    node.addEventListener('pointermove', continueResourceDrag);
    node.addEventListener('pointerup', finishResourceDrag);
    node.addEventListener('pointercancel', cancelResourceDrag);
    node.addEventListener('lostpointercapture', cancelResourceDrag);
    return {
      update(value: string) { id = value; },
      destroy() {
        if (drag?.id === id) {
          drag = undefined;
          options.drag();
        }
        node.removeEventListener('pointerdown', start, true);
        node.removeEventListener('pointermove', continueResourceDrag);
        node.removeEventListener('pointerup', finishResourceDrag);
        node.removeEventListener('pointercancel', cancelResourceDrag);
        node.removeEventListener('lostpointercapture', cancelResourceDrag);
      }
    };
  }

  return { selectionSurface, resourceDragSurface, beginResourceDrag, continueResourceDrag, finishResourceDrag, cancelResourceDrag };
}
