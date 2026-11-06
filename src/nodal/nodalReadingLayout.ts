import type {NodalGraphDocument} from '@konitif/nodal';
import {projectNodalReadingGroups,type NodalReadingInterface,type NodalReadingFlow,readingNodeSize} from './nodalReadingGroups';
/** Pure reading layout. Ranks place existing edges; no dependency or execution is invented. */
export function arrangeNodalReadingClusters(graph:NodalGraphDocument,expandedIds:readonly string[]=[],flow:NodalReadingFlow='horizontal'):NodalGraphDocument{
 const nodeIds=new Set(graph.nodes.map(n=>n.id)),expanded=new Set(expandedIds),groups=graph.groups.map(g=>({...g,nodeIds:[...new Set(g.nodeIds)].filter(id=>nodeIds.has(id))})).filter(g=>g.nodeIds.length);
 const sets=new Map(groups.map(g=>[g.id,new Set(g.nodeIds)]));
 for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){const x=groups[a],y=groups[b],xs=sets.get(x.id)!,ys=sets.get(y.id)!;if(x.nodeIds.some(id=>ys.has(id))&&x.nodeIds.every(id=>ys.has(id))===y.nodeIds.every(id=>xs.has(id)))return graph;}
 const parents=new Map(groups.map(g=>[g.id,groups.filter(p=>p.nodeIds.length>g.nodeIds.length&&g.nodeIds.every(id=>sets.get(p.id)!.has(id))).sort((a,b)=>a.nodeIds.length-b.nodeIds.length)[0]?.id??null]));
 type Item={id:string;group:boolean;members:string[];width:number;height:number;order:number};
 type Plan={width:number;height:number;items:{item:Item;x:number;y:number}[]};
 const closedHeights=new Map<string,number>();
 for(const group of groups){const members=sets.get(group.id)!,inputs=new Set<string>(),outputs=new Set<string>();for(const edge of graph.edges){const source=members.has(edge.sourceNodeId),target=members.has(edge.targetNodeId);if(source===target)continue;const node=graph.nodes.find(n=>n.id===(target?edge.targetNodeId:edge.sourceNodeId)),port=(target?node?.inputs:node?.outputs)?.find(p=>p.id===(target?edge.targetPortId:edge.sourcePortId));if(flow==='vertical'&&port?.mode!=='value')continue;(target?inputs:outputs).add(JSON.stringify([target?edge.targetNodeId:edge.sourceNodeId,target?edge.targetPortId:edge.sourcePortId]));}closedHeights.set(group.id,Math.max(105,58+Math.max(inputs.size,outputs.size)*20));}
 const plans=new Map<string,Plan>();
 function plan(scope:string|null):Plan{
  const key=scope??'@root';const cached=plans.get(key);if(cached)return cached;
  const children=groups.filter(g=>parents.get(g.id)===scope),covered=new Set(children.flatMap(g=>g.nodeIds));const members=scope?sets.get(scope)!:nodeIds;
  const items:Item[]=[...children.map(g=>{const inner=plan(g.id),open=expanded.has(g.id);return{id:g.id,group:true,members:g.nodeIds,width:open?Math.max(322,inner.width+72):250,height:open?Math.max(180,inner.height+94):closedHeights.get(g.id)??105,order:Math.min(...g.nodeIds.map(id=>graph.nodes.findIndex(n=>n.id===id)))};}),...graph.nodes.filter(n=>members.has(n.id)&&!covered.has(n.id)).map(n=>({id:n.id,group:false,members:[n.id],...readingNodeSize,order:graph.nodes.indexOf(n)}))];
  const owner=new Map(items.flatMap(item=>item.members.map(id=>[id,item.id] as const))),incoming=new Map(items.map(i=>[i.id,new Set<string>()])),outgoing=new Map(items.map(i=>[i.id,new Set<string>()]));
  for(const edge of graph.edges){if(flow==='vertical'&&graph.nodes.find(n=>n.id===edge.sourceNodeId)?.outputs.find(p=>p.id===edge.sourcePortId)?.mode==='value')continue;const a=owner.get(edge.sourceNodeId),b=owner.get(edge.targetNodeId);if(a&&b&&a!==b){outgoing.get(a)!.add(b);incoming.get(b)!.add(a);}}
  const isResource=(item:Item)=>flow==='vertical'&&!item.group&&item.members.every(id=>{const n=graph.nodes.find(n=>n.id===id)!;return [...n.inputs,...n.outputs].every(p=>p.mode==='value');});
  const connected=items.filter(i=>flow==='vertical'?!isResource(i):incoming.get(i.id)!.size||outgoing.get(i.id)!.size),isolated=items.filter(i=>flow==='vertical'?isResource(i):!incoming.get(i.id)!.size&&!outgoing.get(i.id)!.size).sort((a,b)=>a.order-b.order);
  const degree=new Map(connected.map(i=>[i.id,incoming.get(i.id)!.size])),ranks=new Map(connected.map(i=>[i.id,0])),queue=connected.filter(i=>!degree.get(i.id)).sort((a,b)=>a.order-b.order),done=new Set<string>();
  while(queue.length){const item=queue.shift()!;done.add(item.id);for(const next of outgoing.get(item.id)!){ranks.set(next,Math.max(ranks.get(next)??0,(ranks.get(item.id)??0)+1));degree.set(next,degree.get(next)!-1);if(!degree.get(next))queue.push(items.find(i=>i.id===next)!);}}
  const cycleRank=Math.max(0,...ranks.values())+1;for(const item of connected)if(!done.has(item.id))ranks.set(item.id,cycleRank);
  const nestedOrder=scope?(graph.metadata.readingOrders as Record<string,string[]>|undefined)?.[scope]:undefined;const readingOrder=Array.isArray(nestedOrder)?nestedOrder:scope==='app-startup'&&Array.isArray(graph.metadata.readingOrder)?graph.metadata.readingOrder as string[]:[];if(flow==='vertical'&&readingOrder.length)for(const item of connected){const index=readingOrder.indexOf(item.id);if(index>=0)ranks.set(item.id,index);}
  const columns=[...new Set(ranks.values())].sort((a,b)=>a-b).map(rank=>connected.filter(i=>ranks.get(i.id)===rank).sort((a,b)=>a.order-b.order));
  let height=0,width=0,bottom=0;const placements:Plan['items']=[];
  if(flow==='vertical'){
   width=Math.max(0,...columns.map(row=>row.reduce((sum,i)=>sum+i.width,0)+Math.max(0,row.length-1)*64));let y=0;
   for(const row of columns){let x=(width-(row.reduce((sum,i)=>sum+i.width,0)+Math.max(0,row.length-1)*64))/2;for(const item of row){placements.push({item,x,y});x+=item.width+64;}y+=Math.max(...row.map(i=>i.height))+96;}bottom=Math.max(0,y-96);
   const sideCounts=new Map<string,number>();for(const item of isolated){const use=graph.edges.find(e=>item.members.includes(e.sourceNodeId)&&!item.members.includes(e.targetNodeId)),creation=graph.edges.find(e=>item.members.includes(e.targetNodeId)&&!item.members.includes(e.sourceNodeId)),target=use?owner.get(use.targetNodeId):creation?owner.get(creation.sourceNodeId):undefined,peer=placements.find(p=>p.item.id===target);const key=use?'left':'right',offset=sideCounts.get(key)??0,targetY=peer?peer.y+Math.max(0,(peer.item.height-item.height)/2):0;sideCounts.set(key,Math.max(targetY,offset)+item.height+40);const x=use?-item.width-96:width+96,y=Math.max(targetY,offset);placements.push({item,x,y});bottom=Math.max(bottom,y+item.height);}
   const left=Math.min(0,...placements.map(p=>p.x));for(const p of placements)p.x-=left;width=Math.max(1,...placements.map(p=>p.x+p.item.width));height=bottom;
  }else{
  height=Math.max(0,...columns.map(c=>c.reduce((sum,i)=>sum+i.height,0)+Math.max(0,c.length-1)*48));let x=0;
  for(const column of columns){let y=(height-(column.reduce((sum,i)=>sum+i.height,0)+Math.max(0,column.length-1)*48))/2;for(const item of column){placements.push({item,x,y});y+=item.height+48;}x+=Math.max(...column.map(i=>i.width))+96;}
  width=Math.max(0,x-96);bottom=height;
  if(isolated.length){let rowY=connected.length?height+120:0;for(let index=0;index<isolated.length;index+=3){const row=isolated.slice(index,index+3);let rowX=0;for(const item of row){placements.push({item,x:rowX,y:rowY});rowX+=item.width+64;}width=Math.max(width,rowX-64);rowY+=Math.max(...row.map(i=>i.height))+48;}bottom=rowY-48;}
  }
  const result={width:Math.max(1,width),height:Math.max(1,bottom),items:placements};plans.set(key,result);return result;
 }
 const positions=new Map<string,{x:number;y:number}>();
 function place(scope:string|null,x:number,y:number){for(const {item,x:dx,y:dy} of plan(scope).items){if(!item.group){positions.set(item.id,{x:x+dx,y:y+dy});continue;}const open=expanded.has(item.id);place(item.id,x+dx+(open?36:0),y+dy+(open?58:0));if(!open){const ps=item.members.map(id=>positions.get(id)!),minX=Math.min(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y));for(const id of item.members){const p=positions.get(id)!;positions.set(id,{x:p.x-minX+x+dx,y:p.y-minY+y+dy});}}}}
 place(null,0,0);return{...graph,nodes:graph.nodes.map(n=>({...n,position:positions.get(n.id)??n.position}))};
}

/** Spatial reflow only: preserve the changed cluster's center and move colliding peers. */
export function separateExpandedNodalReadingClusters(graph:NodalGraphDocument,expandedIds:readonly string[],anchorId:string,interfaces:Record<string,readonly NodalReadingInterface[]>={},previousExpandedIds?:readonly string[]):NodalGraphDocument{
 let result={...graph,nodes:graph.nodes.map(n=>({...n,position:{...n.position}}))};
 const initial=projectNodalReadingGroups(result,expandedIds,interfaces),anchor=initial.groups.find(g=>g.id===anchorId);if(!anchor)return graph;
 const translate=(ids:readonly string[],dx:number,dy:number)=>{if(!dx&&!dy)return;const members=new Set(ids);result={...result,nodes:result.nodes.map(n=>members.has(n.id)?{...n,position:{x:n.position.x+dx,y:n.position.y+dy}}:n)};};
 const before=previousExpandedIds?projectNodalReadingGroups(graph,previousExpandedIds,interfaces).groups.find(g=>g.id===anchorId):undefined,targetCenter=before?{x:before.frame.x+before.frame.width/2,y:before.frame.y+before.frame.height/2}:null;
 const centerAnchor=()=>{if(!targetCenter)return;const current=projectNodalReadingGroups(result,expandedIds,interfaces).groups.find(g=>g.id===anchorId);if(current)translate(anchor.nodeIds,targetCenter.x-current.frame.x-current.frame.width/2,targetCenter.y-current.frame.y-current.frame.height/2);};if(!anchor.expanded)centerAnchor();
 const scopes=[...initial.groups.filter(g=>g.expanded&&(g.id===anchorId||g.nodeIds.every(id=>anchor.nodeIds.includes(id))||anchor.nodeIds.every(id=>g.nodeIds.includes(id)))).sort((a,b)=>b.depth-a.depth).map(g=>g.id),null];
 for(const scope of scopes){const view=projectNodalReadingGroups(result,expandedIds,interfaces),owner=(id:string)=>view.groups.filter(g=>g.expanded&&g.nodeIds.includes(id)).sort((a,b)=>b.depth-a.depth)[0]?.id??null;
  const peers=[...view.groups.filter(g=>g.parentId===scope).map(g=>({id:g.id,members:g.nodeIds,frame:{...g.frame}})),...view.nodes.filter(n=>owner(n.id)===scope).map(n=>({id:n.id,members:[n.id],frame:{...n.position,...readingNodeSize}}))];
  const fixed=peers.find(p=>p.id===anchorId||anchor.nodeIds.every(id=>p.members.includes(id))),overlapX=(a:typeof peers[number],b:typeof peers[number])=>a.frame.x<b.frame.x+b.frame.width+40&&a.frame.x+a.frame.width+40>b.frame.x;
  const move=(peer:typeof peers[number],dy:number)=>{translate(peer.members,0,dy);peer.frame.y+=dy;};
  if(!fixed){const placed:typeof peers=[];for(const peer of peers.sort((a,b)=>a.frame.y-b.frame.y||a.frame.x-b.frame.x)){const floor=Math.max(-Infinity,...placed.filter(p=>overlapX(peer,p)).map(p=>p.frame.y+p.frame.height+40));if(peer.frame.y<floor)move(peer,floor-peer.frame.y);placed.push(peer);}if(scope===anchorId)centerAnchor();continue;}
  const middle=fixed.frame.y+fixed.frame.height/2,above=peers.filter(p=>p!==fixed&&p.frame.y+p.frame.height/2<middle).sort((a,b)=>b.frame.y+b.frame.height-a.frame.y-a.frame.height),below=peers.filter(p=>p!==fixed&&!above.includes(p)).sort((a,b)=>a.frame.y-b.frame.y),placed=[fixed];
  for(const peer of above){const ceiling=Math.min(Infinity,...placed.filter(p=>overlapX(peer,p)).map(p=>p.frame.y-40));const bottom=peer.frame.y+peer.frame.height;if(bottom>ceiling)move(peer,ceiling-bottom);placed.push(peer);}
  for(const peer of below){const floor=Math.max(-Infinity,...placed.filter(p=>overlapX(peer,p)).map(p=>p.frame.y+p.frame.height+40));if(peer.frame.y<floor)move(peer,floor-peer.frame.y);placed.push(peer);}
 }
 return result;
}
export type NodalExpansionOffsets=Record<string,Record<string,{x:number;y:number}>>;
/** Remove only generated offsets on close; preserve any manual movement made since opening. */
export function changeNodalReadingExpansion(graph:NodalGraphDocument,previous:readonly string[],next:readonly string[],offsets:NodalExpansionOffsets={},interfaces:Record<string,readonly NodalReadingInterface[]>={}):{graph:NodalGraphDocument;offsets:NodalExpansionOffsets}{
 const opening=next.find(id=>!previous.includes(id)),closing=previous.find(id=>!next.includes(id)),updated={...offsets};if(opening){const spaced=separateExpandedNodalReadingClusters(graph,next,opening,interfaces,previous),prior=new Map(graph.nodes.map(n=>[n.id,n.position]));updated[opening]=Object.fromEntries(spaced.nodes.flatMap(n=>{const p=prior.get(n.id)!;const x=n.position.x-p.x,y=n.position.y-p.y;return x||y?[[n.id,{x,y}]]:[];}));return{graph:spaced,offsets:updated};}
 if(closing){const delta=updated[closing];delete updated[closing];const restored=delta?{...graph,nodes:graph.nodes.map(n=>{const d=delta[n.id];return d&&Number.isFinite(d.x)&&Number.isFinite(d.y)?{...n,position:{x:n.position.x-d.x,y:n.position.y-d.y}}:n;})}:graph;return{graph:separateExpandedNodalReadingClusters(restored,next,closing,interfaces,delta?undefined:previous),offsets:updated};}
 return{graph,offsets:updated};
}
