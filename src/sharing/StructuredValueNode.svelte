<script lang="ts">
 export let name='value';export let value:unknown;export let depth=0;
 export let moreLabel='Show more';
 let expanded=depth===0;let limit=40;
 $: structured=value!==null&&typeof value==='object';
 $: children=structured?Object.entries(value as Record<string,unknown>):[];
 $: scalar=JSON.stringify(value)??String(value);
</script>
{#if structured}<details open={expanded} on:toggle={event=>expanded=event.currentTarget.open}><summary><strong>{name}</strong><span>{Array.isArray(value)?'['+children.length+']':'{'+children.length+'}'}</span></summary>{#if expanded}<div class="children">{#each children.slice(0,limit) as [key,child] (key)}<svelte:self name={key} value={child} depth={depth+1} {moreLabel}/>{/each}{#if children.length>limit}<button on:click={()=>limit+=40}>{moreLabel} ({children.length-limit})</button>{/if}</div>{/if}</details>{:else}<div class="scalar"><strong>{name}</strong><span class:string={typeof value==='string'}>{scalar}</span></div>{/if}
<style>details,.scalar{font:12px/1.6 ui-monospace,monospace}summary{cursor:pointer;overflow-wrap:anywhere}summary strong{font-weight:500}summary span{color:var(--color-text-secondary);margin-left:10px}.children{margin-left:8px;padding-left:12px;border-left:1px solid var(--color-border-subtle)}.scalar{display:flex;gap:10px;align-items:baseline}.scalar strong{font-weight:500;flex:none}.scalar span{overflow-wrap:anywhere;white-space:pre-wrap;min-width:0}.string{color:var(--color-text-secondary)}button{font:inherit;color:inherit;background:var(--color-background-muted);border:1px solid var(--color-border-subtle);border-radius:4px;padding:4px 8px;cursor:pointer}</style>