import {writable} from 'svelte/store';
export interface LocalPresenceIdentity {name:string;code:string;actorKind:'human'|'assistant'}
export interface PresencePerson {identityId:string;name:string;actorKind:'human'|'assistant';self:boolean;connections:number;here:number;revisions:string[]}
export interface PresenceView {status:'off'|'connecting'|'connected'|'error';people:PresencePerson[];error:string}
/** Presence alone never grants a collaboration role or submits workspace state. */
export function createWorkbenchPresence(backendUrl: string){
 const base=backendUrl.replace(/\/+$/, '');
 const state=writable<PresenceView>({status:'off',people:[],error:''});let source:EventSource|null=null,credential:{id:string;token:string}|null=null,identity:LocalPresenceIdentity|null=null;
 let context={experienceId:'',revision:''},generation=0,retry:ReturnType<typeof setTimeout>|undefined,disposed=false;
 const endpoint=(path:string,c=credential)=>base+'/api/presence/'+path+(c?'?id='+encodeURIComponent(c.id)+'&token='+encodeURIComponent(c.token):'');
 async function call(path:string,value:unknown,c=credential){const response=await fetch(endpoint(path,c),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value),keepalive:path==='leave'});if(response.status===404)throw Error('Service de presence absent : redemarrer le backend Workbench mis a jour.');const result=await response.json();if(!response.ok)throw Error(result.message??'Présence indisponible.');return result;}
 function disconnect(){generation++;clearTimeout(retry);source?.close();source=null;const previous=credential;credential=null;if(previous)void call('leave',{},previous).catch(()=>{});}
 async function connect(){if(!identity||disposed)return;disconnect();const current=generation;state.set({status:'connecting',people:[],error:''});try{
  const joined=await call('join',{...identity,...context},null);if(disposed||current!==generation){void call('leave',{},joined).catch(()=>{});return;}
  credential={id:joined.id,token:joined.token};const events=new EventSource(endpoint('events'));source=events;
  events.addEventListener('presence',event=>{if(current!==generation)return;try{const value=JSON.parse((event as MessageEvent).data);if(value.schema!=='konitif.local-presence.v1'||!Array.isArray(value.identities))throw Error('Réponse de présence invalide.');state.set({status:'connected',people:value.identities,error:''});}catch(error){state.set({status:'error',people:[],error:String(error)});}});
  events.onerror=()=>{if(current!==generation)return;disconnect();state.set({status:'error',people:[],error:'Présence déconnectée ; nouvelle tentative dans 3 secondes.'});retry=setTimeout(()=>void connect(),3000);};
 }catch(error){if(current!==generation)return;state.set({status:'error',people:[],error:error instanceof Error?error.message:String(error)});retry=setTimeout(()=>void connect(),5000);}}
 return {subscribe:state.subscribe,
  start(value:LocalPresenceIdentity){identity=value;disposed=false;void connect();},
  context(experienceId:string,revision:string){if(context.experienceId===experienceId&&context.revision===revision)return;context={experienceId,revision};if(identity)void connect();},
  stop(){identity=null;disconnect();state.set({status:'off',people:[],error:''});},
  dispose(){disposed=true;identity=null;disconnect();state.set({status:'off',people:[],error:''});}
 };
}
