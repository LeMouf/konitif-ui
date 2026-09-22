/** Defer panel activation until the native pointerdown has reached its owner.
 * A microtask is insufficient: browsers can run it between capture and target
 * listeners. This task never captures/replays the event or owns the Tool gesture.
 */
export function createPanelPointerFocus(host: {
  read(): { panelId: string; activePanelId: string | null };
  focus(panelId: string): void;
  schedule(callback: () => void): () => void;
}) {
  let cancel: (() => void) | null = null;
  let disposed = false;
  return {
    request() {
      if (disposed) return;
      const { panelId, activePanelId } = host.read();
      cancel?.();
      cancel = null;
      if (activePanelId === panelId) return;
      cancel = host.schedule(() => {
        cancel = null;
        if (disposed) return;
        const current = host.read();
        // An explicit focus command delivered by the target action wins over
        // this incidental pointer activation (e.g. opening another Tool).
        if (current.panelId === panelId && current.activePanelId === activePanelId) host.focus(panelId);
      });
    },
    dispose() { disposed = true; cancel?.(); cancel = null; }
  };
}
