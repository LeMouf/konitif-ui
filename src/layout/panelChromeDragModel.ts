export interface PanelChromeDragStartInput {
  button: number;
  hasDragHandler: boolean;
  hoverSuspended: boolean;
  targetIsControl: boolean;
  targetIsNestedInteractive: boolean;
}

/**
 * Keeps the panel drag gesture independent from delayed visual affordances.
 * A plain header grab must work immediately; controls and nested interactive
 * surfaces retain ownership of their pointer gesture.
 */
export function shouldArmPanelChromeDrag(input: PanelChromeDragStartInput): boolean {
  return (
    input.button === 0 &&
    input.hasDragHandler &&
    !input.hoverSuspended &&
    !input.targetIsControl &&
    !input.targetIsNestedInteractive
  );
}
