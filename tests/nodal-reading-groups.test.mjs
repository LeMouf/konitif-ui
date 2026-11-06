import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/nodal/nodalReadingGroups.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {projectNodalReadingGroups,zoomNodalReadingViewport}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const port=(id,nodeId,direction,dataType='number')=>({id,nodeId,label:id,direction,dataType,mode:'value'});
const node=(id,x)=>({id,type:'test',title:id,mode:'never',locked:false,position:{x,y:80},inputs:[port('in',id,'input')],outputs:[port('out',id,'output')],config:{}});
const edge=(id,from,to)=>({id,sourceNodeId:from,sourcePortId:'out',targetNodeId:to,targetPortId:'in'});
const fixture=()=>({id:'example',version:1,dialect:'test',nodes:[node('source',0),node('one',350),node('two',700),node('sink',1100)],edges:[edge('enter','source','one'),edge('inside','one','two'),edge('exit','two','sink')],groups:[{id:'group',label:'Chaîne',nodeIds:['one','two']}],metadata:{}});

test('folding keeps exact boundary ports and never rewrites the graph',()=>{const graph=fixture(),before=JSON.stringify(graph),closed=projectNodalReadingGroups(graph);assert.deepEqual(closed.nodes.map(n=>n.id),['source','sink']);assert.deepEqual(closed.connections.map(e=>e.id),['enter','exit']);assert.equal(closed.groups[0].inputs[0].nodeId,'one');assert.equal(closed.groups[0].outputs[0].nodeId,'two');assert.equal(closed.groups[0].inputs[0].portId,'in');assert.equal(JSON.stringify(graph),before);});
test('opening routes each external connection through the boundary and reveals the internal chain',()=>{const graph=fixture(),view=projectNodalReadingGroups(graph,['group']),frame=view.groups[0].frame;assert.equal(view.nodes.length,4);assert.equal(view.connections.length,3);assert.equal(view.connections.find(e=>e.id==='enter').points.length,3);assert.equal(view.connections.find(e=>e.id==='inside').points.length,2);assert.equal(view.connections.find(e=>e.id==='exit').points.length,3);for(const n of graph.nodes.filter(n=>['one','two'].includes(n.id))){assert.ok(n.position.x>=frame.x&&n.position.y>=frame.y);assert.ok(n.position.x+250<=frame.x+frame.width&&n.position.y+105<=frame.y+frame.height);}assert.equal(view.connections.find(e=>e.id==='enter').points[1].x,frame.x);});
test('ports with the same label on different internal nodes remain distinct',()=>{const graph=fixture();graph.edges.push(edge('other-entry','source','two'));const view=projectNodalReadingGroups(graph);assert.equal(view.groups[0].inputs.length,2);assert.notEqual(view.groups[0].inputs[0].id,view.groups[0].inputs[1].id);});
test('ambiguous overlapping memberships remain visible with a diagnostic',()=>{const graph=fixture();graph.groups.push({id:'overlap',label:'Other',nodeIds:['two','sink']});const view=projectNodalReadingGroups(graph);assert.equal(view.groups.length,0);assert.equal(view.nodes.length,4);assert.equal(view.diagnostics.length,2);});
test('normal wheel zoom preserves the world point under the cursor and clamps extremes',()=>{const view={x:16,y:20,zoom:.5},anchor={x:240,y:130},next=zoomNodalReadingViewport(view,anchor,-120);assert.ok(next.zoom>view.zoom);assert.ok(Math.abs((anchor.x-next.x)/next.zoom-(anchor.x-view.x)/view.zoom)<1e-9);assert.ok(Math.abs((anchor.y-next.y)/next.zoom-(anchor.y-view.y)/view.zoom)<1e-9);assert.equal(zoomNodalReadingViewport(view,anchor,1e9).zoom,.15);assert.equal(zoomNodalReadingViewport(view,anchor,-1e9).zoom,3);});

test('nested groups reveal one level at a time and preserve every crossed boundary',()=>{
 const graph=fixture();graph.groups.push({id:'root',label:'Startup',nodeIds:['one','two','sink']});const before=JSON.stringify(graph);
 let view=projectNodalReadingGroups(graph);assert.deepEqual(view.groups.map(g=>g.id),['root']);assert.deepEqual(view.nodes.map(n=>n.id),['source']);
 view=projectNodalReadingGroups(graph,['root']);assert.equal(view.groups.length,2);assert.deepEqual(view.nodes.map(n=>n.id),['source','sink']);
 view=projectNodalReadingGroups(graph,['root','group']);assert.equal(view.nodes.length,4);assert.equal(view.connections.find(e=>e.id==='enter').points.length,4);assert.equal(JSON.stringify(graph),before);
});

test('the single group port is the shared junction for exterior and interior links',()=>{const view=projectNodalReadingGroups(fixture(),['group']),points=view.connections.find(e=>e.id==='enter').points;assert.equal(points.length,3);assert.equal(points[1].x,view.groups[0].frame.x);assert.equal(view.groups[0].inputs[0].portId,'in');});

test('a declared unconnected group input stays visible and binds inside without fabricating a causal edge',()=>{
 const graph=fixture();graph.edges=graph.edges.filter(e=>e.id!=='enter');const before=JSON.stringify(graph),interfaces={group:[{nodeId:'one',portId:'in',direction:'input',label:'Entrée du groupe'}]};
 const closed=projectNodalReadingGroups(graph,[],interfaces);assert.equal(closed.groups[0].inputs.length,1);assert.equal(closed.groups[0].inputs[0].label,'Entrée du groupe');
 const open=projectNodalReadingGroups(graph,['group'],interfaces);assert.ok(open.connections.some(c=>c.id.startsWith('interface.')));assert.equal(JSON.stringify(graph),before);
});

test('a group binds directly to the first internal node without adding an execution step',()=>{
 const graph=fixture(),before=JSON.stringify(graph),open=projectNodalReadingGroups(graph,['group']);assert.deepEqual(open.nodes.map(n=>n.id),graph.nodes.map(n=>n.id));const cable=open.connections.find(c=>c.id==='enter');assert.equal(cable.points.length,3);assert.equal(cable.points[1].x,open.groups[0].frame.x);assert.equal(cable.points[2].x,graph.nodes.find(n=>n.id==='one').position.x);assert.equal(JSON.stringify(graph),before);
});

test('primary control ports come first on nodes and groups and cable endpoints use that order',()=>{
 const graph=fixture();graph.nodes[1].inputs=[port('data','one','input'),{...port('flow','one','input'),mode:'control'},port('context','one','input')];graph.nodes[2].outputs=[port('data','two','output'),{...port('flow','two','output'),mode:'control'}];graph.edges=[{...edge('data-entry','source','one'),targetPortId:'data'},{...edge('flow-entry','source','one'),targetPortId:'flow'},{...edge('data-exit','two','sink'),sourcePortId:'data'},{...edge('flow-exit','two','sink'),sourcePortId:'flow'}];const before=JSON.stringify(graph),closed=projectNodalReadingGroups(graph),open=projectNodalReadingGroups(graph,['group']);
 assert.deepEqual(closed.groups[0].inputs.map(p=>p.portId),['flow','data']);assert.deepEqual(closed.groups[0].outputs.map(p=>p.portId),['flow','data']);assert.deepEqual(open.nodes.find(n=>n.id==='one').inputs.map(p=>p.id),['flow','data','context']);assert.deepEqual(open.nodes.find(n=>n.id==='two').outputs.map(p=>p.id),['flow','data']);assert.equal(open.connections.find(c=>c.id==='flow-entry').points.at(-1).y,graph.nodes[1].position.y+105/4);assert.equal(JSON.stringify(graph),before);
});

test('vertical flow places control ports top/bottom and resource ports on the sides with exact cable endpoints',()=>{
 const graph=fixture();for(const n of graph.nodes){n.inputs.unshift({...port('trigger',n.id,'input'),mode:'control'});n.outputs.unshift({...port('next',n.id,'output'),mode:'control'});}
 graph.edges=[{id:'flow',sourceNodeId:'source',sourcePortId:'next',targetNodeId:'one',targetPortId:'trigger'},edge('resource','two','one')];
 const view=projectNodalReadingGroups(graph,['group'],{},'vertical'),flow=view.connections.find(e=>e.id==='flow'),resource=view.connections.find(e=>e.id==='resource'),group=view.groups[0];
 assert.equal(flow.axis,'vertical');assert.equal(flow.points[0].y,185);assert.equal(flow.points.at(-1).y,80);assert.equal(flow.points[1].y,group.frame.y);
 assert.equal(resource.axis,'horizontal');assert.equal(resource.points[0].x,950);assert.equal(resource.points.at(-1).x,350);
 assert.deepEqual(view.nodes.find(n=>n.id==='one').inputs.map(p=>p.id),['trigger','in']);
});

test('compact closed control junctions reduce crossed bundles while retaining every canonical connection and value port',()=>{
 const graph=fixture();for(const n of graph.nodes){n.inputs.unshift({...port('trigger',n.id,'input'),mode:'control'});n.outputs.unshift({...port('next',n.id,'output'),mode:'control'});}
 graph.edges=[{id:'first',sourceNodeId:'source',sourcePortId:'next',targetNodeId:'one',targetPortId:'trigger'},{id:'second',sourceNodeId:'source',sourcePortId:'next',targetNodeId:'two',targetPortId:'trigger'},edge('resource','sink','two')];const before=JSON.stringify(graph),view=projectNodalReadingGroups(graph,[],{},'vertical',true),a=view.connections.find(e=>e.id==='first'),b=view.connections.find(e=>e.id==='second'),resource=view.connections.find(e=>e.id==='resource');
 assert.equal(view.connections.length,3);assert.deepEqual(a.points.at(-1),b.points.at(-1));assert.equal(view.groups[0].inputs.length,3);assert.equal(resource.points.at(-1).x,view.groups[0].frame.x);assert.equal(JSON.stringify(graph),before);
 const open=projectNodalReadingGroups(graph,['group'],{},'vertical',true);assert.notDeepEqual(open.connections.find(e=>e.id==='first').points.at(-1),open.connections.find(e=>e.id==='second').points.at(-1));
});

test('expanded vertical resource cables cross group boundaries at the visible consumer height',()=>{const graph=fixture(),view=projectNodalReadingGroups(graph,['group'],{},'vertical',true),connection=view.connections.find(e=>e.id==='enter'),end=connection.points.at(-1),boundary=connection.points[1],port=view.groups[0].inputs[0];assert.equal(boundary.y,end.y);assert.deepEqual(port.point,boundary);assert.equal(boundary.x,view.groups[0].frame.x);});
