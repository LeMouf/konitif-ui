<script lang="ts">
  export let editorTitle='Tags de l’expérience';
  export let tags:readonly string[]=[];
  export let onSave:((tags:string[])=>void|Promise<void>)|null=null;
  export let compact=false;
  export let showTags=true;
  export let buttonSize=24;
  let editing=false,draft:string[]=[],value='',error='',saving=false,anchor:HTMLButtonElement;
  export function openEditor(){begin();}
  function begin(){draft=[...tags];value='';error='';editing=true;}
  function add(){const tag=value.trim().replace(/^#+/,'');if(!tag)return;if(tag.length>40){error='40 caractères maximum par tag.';return;}if(draft.length>=12){error='12 tags maximum.';return;}if(!draft.some(item=>item.toLocaleLowerCase()===tag.toLocaleLowerCase()))draft=[...draft,tag];value='';error='';}
  async function save(){if(saving)return;if(value.trim())add();if(error)return;saving=true;try{await onSave?.(draft);editing=false;}catch(cause){error=cause instanceof Error?cause.message:String(cause);}finally{saving=false;}}
  function popup(node:HTMLElement){const position=()=>{const r=anchor.getBoundingClientRect();node.style.left=Math.max(8,Math.min(r.left,window.innerWidth-node.offsetWidth-8))+'px';node.style.top=Math.max(8,Math.min(r.bottom+6,window.innerHeight-node.offsetHeight-8))+'px';};const close=()=>{if(!node.matches(':popover-open')&&!saving)editing=false;};node.showPopover();position();node.querySelector<HTMLInputElement>('input')?.focus();node.addEventListener('toggle',close);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);const observer=new ResizeObserver(position);observer.observe(node);return {destroy(){observer.disconnect();node.removeEventListener('toggle',close);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);}};}
</script>
<div class="experience-tags" class:compact>
  {#if showTags}{#each tags.slice(0,compact?1:3) as tag (tag)}<span class="tag-chip">{tag}</span>{/each}{#if tags.length>(compact?1:3)}<span class="tag-count">+{tags.length-(compact?1:3)}</span>{/if}{/if}
  {#if onSave}<button bind:this={anchor} style:width={buttonSize+'px'} style:height={buttonSize+'px'} class="tag-edit" type="button" aria-label="Modifier les tags" aria-expanded={editing} title="Modifier les tags" on:click={begin}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3H10L17 10L10 17L3 10Z"/><circle cx="6.5" cy="6.5" r="1"/></svg></button>{/if}
</div>
{#if editing}<div class="tag-popup" popover="auto" use:popup><strong>{editorTitle}</strong><div class="tag-draft">{#each draft as tag (tag)}<button type="button" disabled={saving} aria-label={'Retirer le tag '+tag} on:click={()=>draft=draft.filter(item=>item!==tag)}>{tag}<span aria-hidden="true"> ×</span></button>{/each}</div><form on:submit|preventDefault={add}><input aria-label="Nouveau tag" placeholder="Ajouter un tag" maxlength="40" bind:value disabled={saving}/><button type="submit" disabled={saving||!value.trim()} aria-label="Ajouter le tag">＋</button></form>{#if error}<small role="alert">{error}</small>{/if}<div class="tag-popup-actions"><button type="button" disabled={saving} on:click={()=>editing=false}>Annuler</button><button type="button" disabled={saving} on:click={save}>{saving?'Enregistrement…':'Valider'}</button></div></div>{/if}
<style>
.experience-tags{display:flex;align-items:center;gap:5px;min-width:0;flex-wrap:wrap;pointer-events:auto;position:relative;z-index:2}
.tag-chip,.tag-count{font-size:10px;line-height:1.4;padding:2px 5px;border:1px solid var(--color-border-subtle);border-radius:4px;color:var(--color-text-secondary);background:var(--color-background-muted);max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compact{flex-wrap:nowrap;max-width:150px}
.experience-tags .tag-edit{display:grid;place-items:center;flex:none;width:24px;height:24px;padding:3px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--color-text-secondary);opacity:.65;box-shadow:none;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease}
.experience-tags .tag-edit:hover,.experience-tags .tag-edit:focus-visible,.experience-tags .tag-edit[aria-expanded="true"]{color:var(--color-text-primary);background:var(--color-background-muted);border-color:var(--color-border-subtle);opacity:1}
.tag-edit svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round}
.tag-popup{position:fixed;inset:auto;margin:0;width:280px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;box-sizing:border-box;padding:14px;border:1px solid var(--color-border-subtle);border-radius:7px;background:var(--color-background-surface);color:var(--color-text-primary);box-shadow:0 8px 24px #0006;font-size:12px}
.tag-popup:popover-open{display:flex;flex-direction:column;gap:10px}.tag-popup:not(:popover-open){display:none}
.tag-draft{display:flex;flex-wrap:wrap;gap:5px}.tag-popup form{display:flex;gap:5px}.tag-popup input{flex:1;min-width:0}.tag-popup input,.tag-popup button{font:inherit;color:inherit;background:var(--color-background-muted);border:1px solid var(--color-border-subtle);border-radius:4px;padding:6px}.tag-popup button{cursor:pointer}.tag-popup button:disabled{opacity:.5;cursor:default}.tag-popup-actions{display:flex;justify-content:flex-end;gap:6px}.tag-popup strong{font-size:12px}
</style>
