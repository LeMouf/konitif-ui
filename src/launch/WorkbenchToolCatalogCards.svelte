<script lang="ts">
 import {tick} from 'svelte';
 import type {WorkbenchToolCatalogEntry} from './toolCatalogLayout';
 import ToolLayoutThumbnail from './ToolLayoutThumbnail.svelte';
 import ExperienceTags from './ExperienceTags.svelte';
 export let usageCounts:Record<string,number>|null=null;
 export let usageError='';
 export let usageRevision=0;
 export let onOpenExperience:((id:string)=>void)|null=null;
 export let openingExperience=false;
 export let loadUsage:((toolId:string,cursor:string|null)=>Promise<{items:{id:string;title:string;revisionId:string;recordedAt?:string;version?:string}[];nextCursor:string|null;total:number}>)|null=null;
 let usageItems:{id:string;title:string;revisionId:string;recordedAt?:string;version?:string}[]=[],usageCursor:string|null=null,usageTotal=0,usageBusy=false,usagePageError='',usageKey='',usageRequest=0;
 $: if(selectedTool&&usageKey!==JSON.stringify([selectedTool.id,usageRevision])){usageKey=JSON.stringify([selectedTool.id,usageRevision]);void firstUsage(selectedTool.id);}else if(!selectedTool){usageKey='';usageRequest++;}
 async function firstUsage(id:string){const token=++usageRequest;usageItems=[];usageCursor=null;usageTotal=0;usageBusy=true;usagePageError='';try{if(!loadUsage)throw new Error('Index d’usage indisponible.');const page=await loadUsage(id,null);if(token!==usageRequest||selectedId!==id)return;usageItems=page.items;usageCursor=page.nextCursor;usageTotal=page.total;}catch(cause){if(token===usageRequest)usagePageError=cause instanceof Error?cause.message:String(cause);}finally{if(token===usageRequest)usageBusy=false;}}
 async function moreUsage(){if(!selectedTool||!usageCursor||!loadUsage||usageBusy)return;const id=selectedTool.id,token=usageRequest;usageBusy=true;usagePageError='';try{const page=await loadUsage(id,usageCursor);if(token!==usageRequest||selectedId!==id)return;usageItems=[...usageItems,...page.items];usageCursor=page.nextCursor;usageTotal=page.total;}catch(cause){if(token===usageRequest)usagePageError=cause instanceof Error?cause.message:String(cause);}finally{if(token===usageRequest)usageBusy=false;}}
 export let tools:readonly WorkbenchToolCatalogEntry[]=[];
 export let selectedId:string|null=null;
 export let onSetTags:((tool:WorkbenchToolCatalogEntry,tags:string[])=>void|Promise<void>)|null=null;
 let catalogScrollTop=0,scrollRoot:HTMLElement|null=null;
 let menuToolId:string|null=null,menuAnchor:HTMLElement|null=null,returnButton:HTMLButtonElement;
 let tagEditors:Record<string,ExperienceTags|null>=Object.create(null);
 $: selectedTool=tools.find(tool=>tool.id===selectedId);
 $: if(selectedId&&!tools.some(tool=>tool.id===selectedId))selectedId=null;
 function saveTags(tool:WorkbenchToolCatalogEntry|undefined,tags:string[]){if(tool)return onSetTags?.(tool,tags);}
 function revisionDate(tool:WorkbenchToolCatalogEntry){const value=tool.revisionDate?new Date(tool.revisionDate):null;return value&&Number.isFinite(value.getTime())?value.toLocaleDateString('fr-FR'):'non renseignée';}
 async function showDetail(tool:WorkbenchToolCatalogEntry){scrollRoot=document.getElementById('tool-detail-'+tool.id)?.closest<HTMLElement>('.dashboard-content')??null;catalogScrollTop=scrollRoot?.scrollTop??0;menuToolId=null;selectedId=tool.id;await tick();if(scrollRoot)scrollRoot.scrollTop=0;returnButton?.focus({preventScroll:true});}
 async function returnToCatalog(){const id=selectedId;selectedId=null;await tick();if(scrollRoot)scrollRoot.scrollTop=catalogScrollTop;document.getElementById('tool-detail-'+id)?.focus({preventScroll:true});}
 function primaryHover(node:HTMLElement){const move=(event:PointerEvent)=>{const target=event.target instanceof Element?event.target:null,control=target?.closest('button,input,select,textarea,a,[contenteditable="true"]');node.dataset.primaryHover=String(!control||control.classList.contains('tool-card-open'));};const leave=()=>{delete node.dataset.primaryHover;};node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);return {destroy(){node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);}};}
 function menuPopup(node:HTMLElement){const anchor=menuAnchor;const position=()=>{if(!anchor)return;const r=anchor.getBoundingClientRect();node.style.left=Math.max(8,Math.min(r.right-node.offsetWidth,window.innerWidth-node.offsetWidth-8))+'px';node.style.top=Math.max(8,r.bottom+6+node.offsetHeight<=window.innerHeight-8?r.bottom+6:r.top-node.offsetHeight-6)+'px';};const close=()=>{if(!node.matches(':popover-open'))menuToolId=null;};node.showPopover();position();node.addEventListener('toggle',close);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);return {destroy(){node.removeEventListener('toggle',close);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);}};}
</script>
{#if selectedTool}
 <section class="tool-detail" aria-label={`Détail de ${selectedTool.title}`}>
  <button bind:this={returnButton} type="button" class="tool-return" on:click={returnToCatalog}>‹ Retour</button>
  <div class="tool-detail-hero"><ToolLayoutThumbnail tool={selectedTool}/><div class="tool-identification">
   <h2>{selectedTool.title}</h2>{#if selectedTool.description}<p>{selectedTool.description}</p>{/if}
   <dl><div><dt>Identifiant</dt><dd>{selectedTool.id}</dd></div>{#if selectedTool.panelTitle}<div><dt>Panneau</dt><dd>{selectedTool.panelTitle}</dd></div>{/if}<div><dt>Version</dt><dd>{selectedTool.version?.value??'Non renseignée'}</dd></div>{#if selectedTool.version?.authority}<div><dt>Package</dt><dd>{selectedTool.version.authority.packageName}</dd></div>{/if}<div><dt>Dernière révision</dt><dd>{revisionDate(selectedTool)}</dd></div></dl>
   <ExperienceTags editorTitle="Tags de l’outil" tags={selectedTool.tags??[]} onSave={onSetTags?tags=>saveTags(selectedTool,tags):null}/>
  </div></div>
  <div class="tool-detail-tabs" role="tablist" aria-label="Contenu de l’outil"><button type="button" id="tool-usage-tab" role="tab" aria-selected="true" aria-controls="tool-usage-panel">Expériences ({(usageCounts===null?'…':usageCounts[selectedTool.id]??0)})</button></div>
  <div class="tool-usage-panel" tabindex="0" id="tool-usage-panel" role="tabpanel" aria-labelledby="tool-usage-tab" aria-busy={usageBusy}>
   {#if usagePageError}<p role="alert">{usagePageError}</p><button type="button" class="tool-return" on:click={()=>selectedTool&&firstUsage(selectedTool.id)}>Réessayer</button>{/if}
   {#if usageItems.length}<ul class="tool-usage-list">{#each usageItems as experience (experience.id)}<li><button type="button" class="tool-usage-open" aria-label={`Ouvrir l’expérience ${experience.title}`} disabled={!onOpenExperience||openingExperience} on:click={()=>onOpenExperience?.(experience.id)}><strong>{experience.title}</strong><span class="tool-usage-meta">{#if experience.recordedAt}<small>Dernière révision : {new Date(experience.recordedAt).toLocaleDateString('fr-FR')}</small>{/if}{#if experience.version}<span class="tool-version" aria-label={`Version ${experience.version}`}>{experience.version}</span>{/if}</span></button></li>{/each}</ul><small class="tool-usage-summary">{usageItems.length} / {usageTotal} expériences</small>{:else if !usageBusy&&!usagePageError}<p>Aucune expérience enregistrée n’utilise cet outil.</p>{/if}
   {#if usageBusy}<p role="status">Chargement des expériences…</p>{/if}{#if usageCursor}<button type="button" class="tool-return" disabled={usageBusy} on:click={moreUsage}>Afficher la suite</button>{/if}
  </div>
 </section>
{:else}
 <div class="tool-catalog-cards" aria-label="Outils disponibles">
  {#each tools as tool (tool.id)}
   <article use:primaryHover class="tool-catalog-card" data-tool-catalog-card={tool.id}>
    <button id={'tool-detail-'+tool.id} type="button" class="tool-card-open" aria-label={`Détail de ${tool.title}`} on:click={()=>showDetail(tool)}></button>
    <span class="tool-action-ribbon" aria-hidden="true">Détail</span>
    <div class="tool-card-preview"><ToolLayoutThumbnail {tool}/><span class="tool-usage-badge" aria-label={`${(usageCounts===null?'…':usageCounts[tool.id]??0)} expériences enregistrées`} title={usageError||'Expériences enregistrées utilisant cet outil'}>Utilisation : {usageError?'?':(usageCounts===null?'…':usageCounts[tool.id]??0)}</span></div>
    <div class="tool-catalog-copy">
     <div class="tool-card-heading"><h3>{tool.title}</h3><button type="button" class="tool-more" aria-label={`Actions de ${tool.title}`} aria-expanded={menuToolId===tool.id} on:click={event=>{menuAnchor=event.currentTarget;menuToolId=menuToolId===tool.id?null:tool.id;}}>…</button></div>
     <div class="tool-catalog-middle">{#if tool.description}<p>{tool.description}</p>{/if}<div class="tool-catalog-tag-row"><ExperienceTags tags={tool.tags??[]}/></div></div>
     <div class="tool-card-footer"><small>Dernière révision : {revisionDate(tool)}</small><div class="tool-footer-actions"><span class="tool-version" aria-label={`Version ${tool.version?.value??'non renseignée'}`}>{tool.version?.value??'—'}</span><ExperienceTags editorTitle="Tags de l’outil" bind:this={tagEditors[tool.id]} buttonSize={32} showTags={false} tags={tool.tags??[]} onSave={onSetTags?tags=>onSetTags?.(tool,tags):null}/></div></div>
    </div>
    {#if menuToolId===tool.id}<div class="tool-menu" popover="auto" use:menuPopup><button type="button" on:click={()=>showDetail(tool)}>Voir le détail</button>{#if onSetTags}<button type="button" on:click={()=>{menuToolId=null;tagEditors[tool.id]?.openEditor();}}>Modifier les tags</button>{/if}</div>{/if}
   </article>
  {:else}<p>Aucun outil disponible dans ce catalogue.</p>{/each}
 </div>
{/if}
<style>
.tool-catalog-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:stretch;gap:12px}
.tool-catalog-card{position:relative;display:grid;grid-template-columns:112px minmax(0,1fr);align-items:start;gap:14px;min-width:0;min-height:144px;box-sizing:border-box;padding:12px;border:1px solid var(--color-border-subtle);border-radius:8px;background:var(--color-background-surface);color:var(--color-text-primary);overflow:hidden;transition:background .18s ease,border-color .18s ease}
.tool-catalog-card:hover{background:color-mix(in srgb,var(--color-background-surface) 86%,var(--color-text-secondary) 14%);border-color:color-mix(in srgb,var(--color-border-subtle) 60%,var(--color-text-secondary) 40%)}
button{font:inherit;color:inherit;cursor:pointer}.tool-card-open{position:absolute;inset:0;z-index:1;width:100%;height:100%;border:0;border-radius:inherit;background:transparent;padding:0}.tool-card-open:focus-visible{outline:2px solid #6798c7;outline-offset:-2px}
.tool-action-ribbon{position:absolute;left:-29px;top:15px;z-index:4;width:112px;padding:3px 0;text-align:center;font-size:10px;font-weight:600;line-height:15px;background:var(--color-text-secondary);color:var(--color-background-surface);box-shadow:0 1px 4px #0004;pointer-events:none;opacity:0;transform:rotate(-45deg) translateY(-5px);transition:opacity .18s ease,transform .18s ease}
.tool-catalog-card:global([data-primary-hover="true"])>.tool-action-ribbon,.tool-card-open:focus-visible+.tool-action-ribbon{opacity:1;transform:rotate(-45deg) translateY(0);transition-delay:.15s}
.tool-catalog-copy{min-width:0;align-self:stretch;display:flex;flex-direction:column;gap:5px}.tool-card-heading{display:flex;gap:8px;align-items:flex-start;min-width:0}.tool-card-heading h3{flex:1;min-width:0;margin:0;font-family:inherit;font-size:14px;line-height:1.4;font-weight:600;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}
.tool-catalog-middle{flex:1;min-width:0}.tool-catalog-middle p{margin:0 0 4px;font-size:12px;line-height:1.4;color:var(--color-text-secondary);display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tool-catalog-tag-row,.tool-catalog-tag-row :global(*){pointer-events:none}.tool-catalog-tag-row :global(.experience-tags){flex-wrap:nowrap;overflow:hidden}
.tool-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;height:24px}.tool-card-footer>small{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;color:var(--color-text-secondary)}.tool-footer-actions{pointer-events:none;display:flex;align-items:center;gap:8px;margin-left:auto;flex:none;position:relative;z-index:2}.tool-version{flex:none;padding:2px 6px;border:1px solid var(--color-border-subtle);border-radius:5px 0 5px 0;font-size:10px;line-height:1.4}
.tool-more{position:relative;z-index:2;display:grid;place-items:center;width:32px;height:32px;flex:none;padding:0;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--color-text-secondary);opacity:.65;transition:background .15s ease,border-color .15s ease,opacity .15s ease}.tool-more:hover,.tool-more:focus-visible,.tool-more[aria-expanded=true]{background:var(--color-background-muted);border-color:var(--color-border-subtle);color:var(--color-text-primary);opacity:1}
.tool-menu{position:fixed;inset:auto;margin:0;display:flex;flex-direction:column;gap:6px;padding:8px;background:var(--color-background-muted);color:var(--color-text-primary);border:1px solid var(--color-border-subtle);border-radius:5px;box-shadow:0 8px 24px #0005}.tool-menu button,.tool-return{padding:7px 10px;border:1px solid var(--color-border-subtle);border-radius:4px;background:var(--color-background-muted)}.tool-menu button:hover,.tool-return:hover{border-color:var(--color-text-secondary)}
.tool-detail{display:flex;flex-direction:column;gap:20px;min-width:0}.tool-return{align-self:flex-start}.tool-detail-hero{display:grid;grid-template-columns:minmax(180px,.85fr) minmax(0,1.15fr);align-items:start;gap:24px}.tool-identification{min-width:0}.tool-identification h2{margin:0;font-size:20px;line-height:1.3}.tool-identification p{font-size:13px;line-height:1.5;color:var(--color-text-secondary)}dl{margin:16px 0;font-size:12px}dl>div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid var(--color-border-subtle)}dt{color:var(--color-text-secondary)}dd{margin:0;overflow-wrap:anywhere}
@media(max-width:600px){.tool-detail-hero{grid-template-columns:minmax(0,1fr)}.tool-detail-hero>:first-child{max-width:320px}}
@media(max-width:480px){.tool-catalog-card{grid-template-columns:88px minmax(0,1fr);gap:10px}}
@media(prefers-reduced-motion:reduce){.tool-action-ribbon,.tool-catalog-card,.tool-more{transition:none;transition-delay:0s}}

.tool-card-preview{display:flex;flex-direction:column;gap:8px;min-width:0;align-items:stretch;pointer-events:none}.tool-usage-badge{pointer-events:none;flex:none;align-self:flex-start;min-width:20px;padding:2px 5px;box-sizing:border-box;border:1px solid var(--color-border-subtle);border-radius:10px;font-size:10px;text-align:center;color:var(--color-text-secondary);background:var(--color-background-muted)}
.tool-detail-tabs{display:flex;gap:12px;border-bottom:1px solid var(--color-border-subtle)}.tool-detail-tabs button{padding:8px 4px;border:0;border-bottom:2px solid #6798c7;background:transparent;font:inherit;color:var(--color-text-primary)}
.tool-usage-panel{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-width:0}.tool-usage-panel p{margin:0;font-size:13px;color:var(--color-text-secondary)}.tool-usage-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.tool-usage-list li{min-width:0}.tool-usage-open{width:100%;box-sizing:border-box;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px;border:1px solid var(--color-border-subtle);border-radius:6px;background:var(--color-background-muted)}.tool-usage-open:hover:not(:disabled){border-color:var(--color-text-secondary);background:color-mix(in srgb,var(--color-background-muted) 86%,var(--color-text-secondary) 14%)}.tool-usage-open:focus-visible{outline:2px solid #6798c7;outline-offset:2px}.tool-usage-open:disabled{cursor:default}.tool-usage-list strong{min-width:0;font-size:13px;overflow-wrap:anywhere}.tool-usage-meta{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.tool-usage-list small,.tool-usage-summary{font-size:11px;color:var(--color-text-secondary)}.tool-usage-panel>.tool-return{align-self:flex-start}
</style>
