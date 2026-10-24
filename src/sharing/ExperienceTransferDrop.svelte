<script lang="ts">
 export let onTransfer:(value:unknown)=>Promise<unknown>;
 export let onFile:(file:File)=>Promise<unknown>;
 export let onAccepted:()=>void=()=>{};
 export let onError:(message:string)=>void=()=>{};
 let busy=false;
 function drag(event:DragEvent){if(!event.defaultPrevented&&(event.dataTransfer?.types.includes('application/vnd.konitif.experience-transfer+json')||event.dataTransfer?.types.includes('Files')))event.preventDefault();}
 async function drop(event:DragEvent){if(event.defaultPrevented)return;
  const data=event.dataTransfer?.getData?.('application/vnd.konitif.experience-transfer+json'),file=Array.from(event.dataTransfer?.files??[]).find(f=>/\.experience\.(png|json)$/i.test(f.name));
  if(!data&&!file)return;event.preventDefault();event.stopPropagation();if(busy)return;busy=true;
  try{if(data&&data.length>2*1024*1024+4096)throw Error('Carte trop volumineuse.');const accepted=data?await onTransfer(JSON.parse(data)):await onFile(file!);if(accepted===false)throw Error('Cette expérience n’a pas été admise par cet hôte.');onAccepted();}
  catch(error){onError(error instanceof Error?error.message:String(error));}finally{busy=false;}
 }
</script>
<svelte:window on:drop|capture={drop} on:dragover={drag}/>
