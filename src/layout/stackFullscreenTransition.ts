export const STACK_FULLSCREEN_TRANSITION_MS = 300;

export interface StackViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function createStackViewportStyle(rect: StackViewportRect, animate: boolean): string {
  return [
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    `transition:${animate ? createStackFullscreenTransitionValue() : 'none'}`,
    'will-change:left, top, width, height'
  ].join(';');
}

export function createStackFullscreenTargetStyle(viewportStyle: string): string {
  return `${viewportStyle};transition:${createStackFullscreenTransitionValue()};will-change:left, top, width, height`;
}

function createStackFullscreenTransitionValue(): string {
  return [
    `left ${STACK_FULLSCREEN_TRANSITION_MS}ms ease`,
    `top ${STACK_FULLSCREEN_TRANSITION_MS}ms ease`,
    `width ${STACK_FULLSCREEN_TRANSITION_MS}ms ease`,
    `height ${STACK_FULLSCREEN_TRANSITION_MS}ms ease`,
    `box-shadow ${STACK_FULLSCREEN_TRANSITION_MS}ms ease`
  ].join(', ');
}
