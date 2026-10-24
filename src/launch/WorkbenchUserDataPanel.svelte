<script lang="ts">
 import type {WorkbenchUserDataProjection} from '@konitif/workbench';
 export let projection:WorkbenchUserDataProjection;
 export let title='User and data';
 export let onRequestAction:((id:string)=>void)|null=null;
</script>
<section aria-label={title}><h2 data-dashboard-context-title>{title}</h2><p>{projection.connection.label}{#if projection.connection.providerLabel} · {projection.connection.providerLabel}{/if}</p><div class="uses">{#each projection.dataUses as use (use.id)}<article><h3>{use.label}</h3><p>{use.purpose}</p><small>{use.location}</small>{#if use.retention}<p>{use.retention}</p>{/if}</article>{/each}</div>{#each projection.unavailableServices as service (service.id)}<article class="unavailable"><h3>{service.label}</h3><p>{service.reason}</p></article>{/each}{#each projection.actions as action (action.id)}<article><p>{action.description}</p><button disabled={!onRequestAction} on:click={()=>onRequestAction?.(action.id)}>{action.label}</button></article>{/each}</section>
<style>h2{font-size:20px}h3{font-size:14px;margin:0 0 8px}article{padding:16px;margin:12px 0;border:1px solid var(--color-border-subtle);border-radius:9px;background:var(--color-background-muted)}p{line-height:1.6}small,.unavailable{color:var(--color-text-secondary)}button{font:inherit;padding:9px;cursor:pointer}</style>