<script lang="ts">
 import {toolCatalogLayout,type WorkbenchToolCatalogEntry} from './toolCatalogLayout';
 export let tool:WorkbenchToolCatalogEntry;
</script>
<div class="tool-layout-thumbnail">
 <svg viewBox="0 0 160 100" role="img" aria-label={`Disposition interne par défaut de ${tool.title}`}>
  {#each toolCatalogLayout(tool) as box (box.id)}
   <g data-layout-region={box.id}><title>{box.labels.join(' · ')}</title><rect x={box.x} y={box.y} width={box.width} height={box.height} rx="2" class:layout-chrome={box.id==='chrome'}/>
    {#if box.id!=='main'&&box.id!=='chrome'}{#each box.labels.slice(0,6) as label,index (index)}<line x1={box.x+3+index*(box.width-6)/Math.min(6,box.labels.length)} y1={box.y+4} x2={box.x+3+(index+.7)*(box.width-6)/Math.min(6,box.labels.length)} y2={box.y+4}><title>{label}</title></line>{/each}{/if}
   </g>
  {/each}
 </svg>
</div>
<style>
.tool-layout-thumbnail{width:100%;aspect-ratio:8 / 5;box-sizing:border-box;padding:6px;background:var(--color-background-muted);border:1px solid color-mix(in srgb,var(--color-background-muted) 80%,white 20%);border-radius:4px;overflow:hidden}
svg{display:block;width:100%;height:100%}rect{fill:#71849b;fill-opacity:.25;stroke:#99abc0;stroke-width:1.5}.layout-chrome{fill-opacity:.12;stroke-opacity:.5}line{stroke:#99abc0;stroke-width:1.5;stroke-opacity:.7}
</style>
