<script lang="ts">
  /** Pure Viewer composition. The host owns dock state; the renderer owns its viewport lifecycle. */
  export let title: string;
  export let leftDockVisible = false;
  export let rightDockVisible = false;
  export let bottomDockVisible = false;
  export let leftDockSize = 256;
  export let rightDockSize = 256;
  export let bottomDockSize = 176;
</script>
<section class="viewer-tool-frame" aria-label={title} data-viewer-tool-frame data-tool-color-mode-contract="inherited"
 class:with-left={leftDockVisible} class:with-right={rightDockVisible} class:with-bottom={bottomDockVisible}
 style:--viewer-left-size={leftDockSize+'px'} style:--viewer-right-size={rightDockSize+'px'} style:--viewer-bottom-size={bottomDockSize+'px'}>
 {#if leftDockVisible}<aside class="left" aria-label="Dock gauche du Viewer"><slot name="left"/></aside>{/if}
 <div class="viewport" data-viewer-viewport><slot name="viewport"/></div>
 {#if rightDockVisible}<aside class="right" aria-label="Dock droit du Viewer"><slot name="right"/></aside>{/if}
 {#if bottomDockVisible}<aside class="bottom" aria-label="Dock inférieur du Viewer"><slot name="bottom"/></aside>{/if}
</section>
<style>
 .viewer-tool-frame{position:relative;display:grid;grid-template-areas:'viewport';grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:var(--color-background-canvas);color:var(--color-text-primary);color-scheme:inherit}
 .with-left{grid-template-areas:'left viewport';grid-template-columns:var(--viewer-left-size) minmax(0,1fr)}
 .with-right{grid-template-areas:'viewport right';grid-template-columns:minmax(0,1fr) var(--viewer-right-size)}
 .with-left.with-right{grid-template-areas:'left viewport right';grid-template-columns:var(--viewer-left-size) minmax(0,1fr) var(--viewer-right-size)}
 .with-bottom{grid-template-areas:'viewport' 'bottom';grid-template-rows:minmax(0,1fr) var(--viewer-bottom-size)}
 .with-left.with-bottom{grid-template-areas:'left viewport' 'left bottom'}
 .with-right.with-bottom{grid-template-areas:'viewport right' 'bottom right'}
 .with-left.with-right.with-bottom{grid-template-areas:'left viewport right' 'left bottom right'}
 .viewport{position:relative;grid-area:viewport;min-width:0;min-height:0;overflow:hidden}.left{grid-area:left}.right{grid-area:right}.bottom{grid-area:bottom}aside{min-width:0;min-height:0;overflow:hidden}
</style>
