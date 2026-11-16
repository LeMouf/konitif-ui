<script lang="ts">
 import {mountWorkbenchPortalNode} from '../portal/workbenchPortalRoot';
 import {dismissiblePopover} from '../primitives/dismissiblePopover';
 export let version:string;
 export let availableVersion='';
 export let error='';
 export let busy=false;
 export let dirty=false;
 export let saving=false;
 export let saveError='';
 export let onSave:(()=>void)|undefined=undefined;
 export let onInspect:()=>void=()=>{};
 function toggle(){if(!open)onInspect();open=!open;}
 export let onReload:(()=>void)|undefined=undefined;
 export let onUpdate:()=>void=()=>{};
 let open=false,trigger:HTMLButtonElement;
 function portal(node:HTMLElement){const mounted=mountWorkbenchPortalNode(node);const position=()=>{const rect=trigger.getBoundingClientRect();node.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-node.offsetWidth-8))+'px';node.style.top=Math.min(rect.bottom+6,Math.max(8,window.innerHeight-node.offsetHeight-8))+'px';};position();queueMicrotask(()=>{if(open&&node.isConnected)(node.querySelector<HTMLButtonElement>('button:not(:disabled)')??node).focus();});window.addEventListener('resize',position);window.addEventListener('scroll',position,true);return {destroy(){window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);mounted.destroy();}};}
 function ownTrigger(node:HTMLButtonElement){trigger=node;return {destroy(){trigger=undefined!;}};}
</script>
<span class="revision-control">
 <button use:ownTrigger type="button" class:available={!!availableVersion} aria-label={'Révision locale '+version+(availableVersion?' ; mise à jour disponible':'')} aria-expanded={open} aria-haspopup="dialog" title={availableVersion?'Nouvelle révision disponible':'Révision locale chargée'} on:click|stopPropagation={toggle}>{version}{#if availableVersion}<span aria-hidden="true"> •</span>{/if}</button>
 {#if open}<span use:portal class="revision-menu" role="dialog" tabindex="-1" aria-label="Révision de l’expérience" use:dismissiblePopover={{trigger:()=>trigger,onDismiss:()=>open=false}}>
 <span>Chargée localement : <strong>{version}</strong></span>
 {#if availableVersion}<span>Disponible : <strong>{availableVersion}</strong></span><button type="button" disabled={busy||saving} on:click|stopPropagation={onUpdate}>{busy?'Chargement…':'Mettre à jour l’expérience locale'}</button>{:else if !error}<span>Cette révision est à jour dans le catalogue.</span>{/if}
 {#if !availableVersion&&onReload}<button type="button" disabled={busy||saving} on:click|stopPropagation={onReload}>{busy?'Chargement…':'Recharger la dernière version enregistrée'}</button>{/if}
 {#if dirty}<span>Modifications locales non enregistrées.</span>{#if onSave}<button type="button" disabled={saving||busy} on:click|stopPropagation={onSave}>{saving?'Enregistrement…':'Enregistrer'}</button>{/if}{:else}<span>Aucune modification locale.</span>{/if}
 {#if saveError}<span role="alert">{saveError}</span>{/if}
 {#if error}<span role="alert">{error}</span>{/if}
 </span>{/if}
</span>
<style>
.revision-control{position:relative;display:inline-flex;align-items:center}.revision-control>button{font:inherit;font-size:var(--font-size-label);color:var(--color-text-secondary);background:transparent;border:1px solid transparent;border-radius:4px;padding:2px 5px;cursor:pointer}.revision-control>button.available{color:var(--color-accent-primary);border-color:var(--color-accent-primary);background:var(--color-background-muted)}button:focus-visible{outline:2px solid var(--color-accent-primary);outline-offset:2px}.revision-menu{position:fixed;z-index:10020;display:grid;gap:8px;width:max-content;max-width:min(340px,80vw);padding:12px;background:var(--color-background-panel);color:var(--color-text-primary);border:1px solid var(--color-border-subtle);border-radius:6px;box-shadow:0 8px 24px #0005;font-size:var(--font-size-label)}.revision-menu button{font:inherit;white-space:normal;padding:6px;color:inherit;background:var(--color-background-muted);border:1px solid var(--color-border-subtle);border-radius:4px;cursor:pointer}
</style>
