import type {NodalGraphDocument,NodalGraphNode,NodalGraphPort} from '@konitif/nodal';
export interface NodalReadingInterface {nodeId:string;portId:string;direction:'input'|'output';label?:string;}
export interface NodalReadingPoint {x:number;y:number;}
export interface NodalReadingFrame {x:number;y:number;width:number;height:number;}
export interface NodalReadingBoundaryPort {id:string;nodeId:string;portId:string;direction:'input'|'output';label:string;dataType:NodalGraphPort['dataType'];mode:NodalGraphPort['mode'];point?:NodalReadingPoint;}
export interface NodalReadingGroup {id:string;label:string;nodeIds:string[];parentId:string|null;depth:number;expanded:boolean;frame:NodalReadingFrame;inputs:NodalReadingBoundaryPort[];outputs:NodalReadingBoundaryPort[];}
export type NodalReadingFlow='horizontal'|'vertical';
export interface NodalReadingConnection {id:string;points:NodalReadingPoint[];axis?:NodalReadingFlow;}
export interface NodalReadingGroupProjection {nodes:NodalGraphNode[];groups:NodalReadingGroup[];connections:NodalReadingConnection[];diagnostics:string[];}
export const readingNodeSize={width:250,height:105};
const portRank=(port:{mode:NodalGraphPort['mode']})=>port.mode==='control'?0:port.mode==='event'?1:2;
export function orderNodalReadingPorts(ports:readonly NodalGraphPort[]):NodalGraphPort[]{return ports.map((port,index)=>({port,index})).sort((a,b)=>portRank(a.port)-portRank(b.port)||a.index-b.index).map(item=>item.port);}
/** Control/event ports follow the main flow; values remain lateral. Coordinates are shared by ports and cables. */
export function nodalReadingPortPoint(frame:NodalReadingFrame,ports:readonly {mode:NodalGraphPort['mode']}[],index:number,direction:'input'|'output',flow:NodalReadingFlow='horizontal',compactControl=false):NodalReadingPoint{
 if(compactControl&&flow==='vertical'&&ports[index]?.mode==='control')return{x:frame.x+frame.width/2,y:frame.y+(direction==='output'?frame.height:0)};
 const vertical=flow==='vertical'&&ports[index]?.mode!=='value',peers=ports.filter(p=>(flow==='vertical'&&p.mode!=='value')===vertical),ordinal=ports.slice(0,index).filter(p=>(flow==='vertical'&&p.mode!=='value')===vertical).length;
 return vertical?{x:frame.x+frame.width*(ordinal+1)/(peers.length+1),y:frame.y+(direction==='output'?frame.height:0)}:{x:frame.x+(direction==='output'?frame.width:0),y:frame.y+frame.height*(ordinal+1)/(peers.length+1)};
}
const boundaryId=(nodeId:string,portId:string,direction:string)=>JSON.stringify([direction,nodeId,portId]);
/** Laminar membership defines visual nesting only. No execution or canonical graph rewriting. */
export function projectNodalReadingGroups(graph:NodalGraphDocument,expandedIds:readonly string[]=[],interfaces:Record<string,readonly NodalReadingInterface[]>={},flow:NodalReadingFlow='horizontal',compactControlPorts=false):NodalReadingGroupProjection{
 const displayNodes=graph.nodes.map(n=>({...n,inputs:orderNodalReadingPorts(n.inputs),outputs:orderNodalReadingPorts(n.outputs)}));
 const byId=new Map(displayNodes.map(n=>[n.id,n])),diagnostics:string[]=[];
 const candidates=graph.groups.map(g=>({...g,nodeIds:[...new Set(g.nodeIds)].filter(id=>byId.has(id))})).filter(g=>g.nodeIds.length);
 const sets=new Map(candidates.map(g=>[g.id,new Set(g.nodeIds)])),invalid=new Set<string>();
 for(let a=0;a<candidates.length;a++)for(let b=a+1;b<candidates.length;b++){const first=candidates[a],second=candidates[b],one=sets.get(first.id)!,two=sets.get(second.id)!;const intersects=first.nodeIds.some(id=>two.has(id));if(!intersects)continue;const firstInSecond=first.nodeIds.every(id=>two.has(id)),secondInFirst=second.nodeIds.every(id=>one.has(id));if(firstInSecond!==secondInFirst)continue;invalid.add(first.id);invalid.add(second.id);}
 const admitted=candidates.filter(g=>{if(invalid.has(g.id)){diagnostics.push('Groupes partiellement superposés ou identiques : '+g.label);return false;}return true;});
 const groups:NodalReadingGroup[]=admitted.map(g=>{const parents=admitted.filter(p=>p.nodeIds.length>g.nodeIds.length&&g.nodeIds.every(id=>sets.get(p.id)!.has(id))).sort((a,b)=>a.nodeIds.length-b.nodeIds.length);return{id:g.id,label:g.label,nodeIds:g.nodeIds,parentId:parents[0]?.id??null,depth:parents.length,expanded:expandedIds.includes(g.id),frame:{x:0,y:0,width:250,height:105},inputs:[],outputs:[]};});
 const groupById=new Map(groups.map(g=>[g.id,g]));
 const containing=(nodeId:string)=>groups.filter(g=>sets.get(g.id)!.has(nodeId)).sort((a,b)=>b.depth-a.depth);
 const visibleGroup=(g:NodalReadingGroup)=>{let parent=g.parentId;while(parent){const p=groupById.get(parent)!;if(!p.expanded)return false;parent=p.parentId;}return true;};
 function addBoundary(g:NodalReadingGroup,nodeId:string,portId:string,direction:'input'|'output'){
  const node=byId.get(nodeId),port=(direction==='input'?node?.inputs:node?.outputs)?.find(p=>p.id===portId);if(!port)return;const list=direction==='input'?g.inputs:g.outputs,id=boundaryId(nodeId,portId,direction);if(!list.some(p=>p.id===id))list.push({id,nodeId,portId,direction,label:node!.title+' · '+port.label,dataType:port.dataType,mode:port.mode});
 }
 for(const g of groups)for(const binding of interfaces[g.id]??[]){if(!sets.get(g.id)!.has(binding.nodeId))continue;addBoundary(g,binding.nodeId,binding.portId,binding.direction);for(const child of groups.filter(c=>c.depth>g.depth&&c.nodeIds.every(id=>sets.get(g.id)!.has(id))&&sets.get(c.id)!.has(binding.nodeId)))addBoundary(child,binding.nodeId,binding.portId,binding.direction);const port=(binding.direction==='input'?g.inputs:g.outputs).find(p=>p.nodeId===binding.nodeId&&p.portId===binding.portId);if(port&&binding.label)port.label=binding.label;}
 for(const edge of graph.edges)for(const g of groups){const source=sets.get(g.id)!.has(edge.sourceNodeId),target=sets.get(g.id)!.has(edge.targetNodeId);if(source&&!target)addBoundary(g,edge.sourceNodeId,edge.sourcePortId,'output');if(target&&!source)addBoundary(g,edge.targetNodeId,edge.targetPortId,'input');}
 for(const g of groups){g.inputs.sort((a,b)=>portRank(a)-portRank(b));g.outputs.sort((a,b)=>portRank(a)-portRank(b));}
 for(const g of [...groups].sort((a,b)=>b.depth-a.depth)){
  const members=g.nodeIds.map(id=>byId.get(id)!);const minX=Math.min(...members.map(n=>n.position.x)),minY=Math.min(...members.map(n=>n.position.y));
  const sideCount=(ports:NodalReadingBoundaryPort[])=>flow==='vertical'?ports.filter(p=>p.mode==='value').length:ports.length;
  if(!g.expanded){g.frame={x:minX,y:minY,width:250,height:Math.max(105,58+Math.max(sideCount(g.inputs),sideCount(g.outputs))*20)};continue;}
  const children=groups.filter(c=>c.parentId===g.id),owned=new Set(children.flatMap(c=>c.nodeIds));const frames=[...members.filter(n=>!owned.has(n.id)).map(n=>({...n.position,...readingNodeSize})),...children.map(c=>c.frame)];
  const left=Math.min(...frames.map(f=>f.x)),top=Math.min(...frames.map(f=>f.y)),right=Math.max(...frames.map(f=>f.x+f.width)),bottom=Math.max(...frames.map(f=>f.y+f.height));
  g.frame={x:left-36,y:top-58,width:Math.max(322,right-left+72),height:Math.max(180,bottom-top+94,70+Math.max(sideCount(g.inputs),sideCount(g.outputs))*20)};
 }
 const visible=groups.filter(visibleGroup).sort((a,b)=>a.depth-b.depth);
 const blocker=(nodeId:string)=>containing(nodeId).filter(g=>!g.expanded).sort((a,b)=>a.depth-b.depth)[0];
 function nodePoint(nodeId:string,portId:string,direction:'input'|'output'):NodalReadingPoint|null{const node=byId.get(nodeId);if(!node)return null;const ports=direction==='input'?node.inputs:node.outputs,index=ports.findIndex(p=>p.id===portId);if(index<0)return null;return nodalReadingPortPoint({...node.position,...readingNodeSize},ports,index,direction,flow);}
 function groupPoint(g:NodalReadingGroup,nodeId:string,portId:string,direction:'input'|'output'):NodalReadingPoint|null{const list=direction==='input'?g.inputs:g.outputs,index=list.findIndex(p=>p.nodeId===nodeId&&p.portId===portId);if(index<0)return null;if(flow==='vertical'&&g.expanded&&list[index].mode==='value'){const blocked=blocker(nodeId),inside=blocked?groupPoint(blocked,nodeId,portId,direction):nodePoint(nodeId,portId,direction);if(inside)return{x:g.frame.x+(direction==='output'?g.frame.width:0),y:Math.max(g.frame.y+40,Math.min(g.frame.y+g.frame.height-20,inside.y))};}return flow==='horizontal'?{x:g.frame.x+(direction==='output'?g.frame.width:0),y:g.frame.y+52+index*20}:nodalReadingPortPoint(g.frame,list,index,direction,flow,compactControlPorts&&!g.expanded);}
 const connections:NodalReadingConnection[]=[];
 for(const edge of graph.edges){if(!byId.has(edge.sourceNodeId)||!byId.has(edge.targetNodeId))continue;const sourceBlock=blocker(edge.sourceNodeId),targetBlock=blocker(edge.targetNodeId);if(sourceBlock&&sourceBlock===targetBlock)continue;
  const start=sourceBlock?groupPoint(sourceBlock,edge.sourceNodeId,edge.sourcePortId,'output'):nodePoint(edge.sourceNodeId,edge.sourcePortId,'output'),end=targetBlock?groupPoint(targetBlock,edge.targetNodeId,edge.targetPortId,'input'):nodePoint(edge.targetNodeId,edge.targetPortId,'input');if(!start||!end){diagnostics.push('Port introuvable : '+edge.id);continue;}
  const points=[start];for(const g of containing(edge.sourceNodeId).filter(g=>g.expanded&&visibleGroup(g)&&!sets.get(g.id)!.has(edge.targetNodeId))){const p=groupPoint(g,edge.sourceNodeId,edge.sourcePortId,'output');if(p)points.push(p);}
  for(const g of containing(edge.targetNodeId).filter(g=>g.expanded&&visibleGroup(g)&&!sets.get(g.id)!.has(edge.sourceNodeId)).reverse()){const p=groupPoint(g,edge.targetNodeId,edge.targetPortId,'input');if(p)points.push(p);}points.push(end);connections.push({id:edge.id,points,axis:flow==='vertical'&&byId.get(edge.sourceNodeId)?.outputs.find(p=>p.id===edge.sourcePortId)?.mode!=='value'?'vertical':'horizontal'});
 }
 // A declared interface binding is not an observed causal edge.
 for(const g of visible.filter(g=>g.expanded))for(const binding of interfaces[g.id]??[]){
  const incoming=binding.direction==='input';const hasCrossing=graph.edges.some(e=>incoming?e.targetNodeId===binding.nodeId&&e.targetPortId===binding.portId&&!sets.get(g.id)!.has(e.sourceNodeId):e.sourceNodeId===binding.nodeId&&e.sourcePortId===binding.portId&&!sets.get(g.id)!.has(e.targetNodeId));if(hasCrossing)continue;
  const boundary=groupPoint(g,binding.nodeId,binding.portId,binding.direction),blocked=blocker(binding.nodeId);const endpoint=blocked?groupPoint(blocked,binding.nodeId,binding.portId,binding.direction):nodePoint(binding.nodeId,binding.portId,binding.direction);if(!boundary||!endpoint)continue;
  const middle=containing(binding.nodeId).filter(c=>c.id!==g.id&&c.depth>g.depth&&c.expanded&&visibleGroup(c)).reverse().flatMap(c=>{const p=groupPoint(c,binding.nodeId,binding.portId,binding.direction);return p?[p]:[];});
  const points=[boundary,...middle,endpoint];connections.push({id:'interface.'+g.id+'.'+binding.direction+'.'+binding.nodeId+'.'+binding.portId,points:incoming?points:points.reverse(),axis:flow==='vertical'&&(incoming?g.inputs:g.outputs).find(p=>p.nodeId===binding.nodeId&&p.portId===binding.portId)?.mode!=='value'?'vertical':'horizontal'});
 }
 for(const g of visible)for(const direction of ['input','output'] as const)for(const port of direction==='input'?g.inputs:g.outputs){const point=groupPoint(g,port.nodeId,port.portId,direction);if(point)port.point=point;}
 return {nodes:displayNodes.filter(n=>!blocker(n.id)),groups:visible,connections,diagnostics};
}
export function nodalReadingConnectionPath(points:readonly NodalReadingPoint[],axis:NodalReadingFlow='horizontal'):string{return points.map((p,index)=>{if(index===0)return `M${p.x},${p.y}`;const prior=points[index-1];if(axis==='vertical'){const bend=Math.max(25,Math.abs(p.y-prior.y)*.4);return `C${prior.x},${prior.y+bend} ${p.x},${p.y-bend} ${p.x},${p.y}`;}const bend=Math.max(25,Math.abs(p.x-prior.x)*.4);return `C${prior.x+bend},${prior.y} ${p.x-bend},${p.y} ${p.x},${p.y}`;}).join(' ');}
export function zoomNodalReadingViewport(view:{x:number;y:number;zoom:number},anchor:NodalReadingPoint,deltaY:number){const zoom=Math.max(.15,Math.min(3,view.zoom*Math.exp(-deltaY*.001)));return{x:anchor.x-(anchor.x-view.x)*zoom/view.zoom,y:anchor.y-(anchor.y-view.y)*zoom/view.zoom,zoom};}
