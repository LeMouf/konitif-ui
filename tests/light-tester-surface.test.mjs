import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {compile,preprocess} from 'svelte/compiler';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../src/scene/LightTesterSurface.svelte',import.meta.url),'utf8');
const processed=await preprocess(source,{script:({content,attributes})=>attributes.lang==='ts'?{code:ts.transpileModule(content,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText}:undefined},{filename:'LightTesterSurface.svelte'});
const compiled=compile(processed.code,{generate:'ssr',filename:'LightTesterSurface.svelte'}).js.code;
const directory=mkdtempSync(join(tmpdir(),'konitif-light-surface-')),file=join(directory,'surface.mjs');
writeFileSync(file,compiled.replace(/from (["'])svelte\/internal\1/g,'from '+JSON.stringify(pathToFileURL(require.resolve('svelte/internal')).href)));
let Surface;try{Surface=(await import(pathToFileURL(file))).default;}finally{unlinkSync(file);rmdirSync(directory);}
function fixture(){
 let commands=0;const record=()=>{commands++;};
 const configuration={calibrationVersion:1,zoneId:'fixture.zone',groupId:'fixture.group',groupIds:['fixture.group'],color:'#ffaa00',groupColors:{},emitterColors:{},emitterSelections:{},scenario:'individual',groupScenarios:{},individualMode:'free',groupIndividualModes:{},animationPattern:'chase',groupAnimationPatterns:{},animationPrimitiveIds:['chase'],groupAnimationPrimitiveIds:{},animationSpeedMs:400,groupAnimationSpeedMs:{},animationDirection:'forward',groupAnimationDirections:{},loadingMode:'fill',groupLoadingModes:{},pulseShape:'sine',groupPulseShapes:{},rainbowPalette:'spectrum',groupRainbowPalettes:{},secondaryColor:'#000000',tertiaryColor:'#ffffff',groupSecondaryColors:{},groupTertiaryColors:{},intensity:.5,zoneIntensities:{},emissionIntensities:{},lightSpillIntensities:{},active:false};
 const snapshot={configuration,workflowTracksVisible:false,realRobotLedsVisible:false,realRobotConnected:false,realRobotLedAvailable:false,zones:[{id:'fixture.zone',label:'Panel amber',singularLabel:'Panel',capability:'rgb',channels:['red','green','blue'],levelCount:256,ledCountPerInstance:2,instanceOrder:['center'],semanticColor:'#ffaa00',qualification:'qualified'}],groups:[{id:'fixture.group',zoneId:'fixture.zone',label:'All channels',emitterIds:['alpha','beta'],kind:'aggregate'}],canEdit:true,canToggleWorkflowTracks:true,canToggleRealRobotLeds:false};
 const presentation={colorPresets:[{id:'rgb',label:'RGB',colors:['#ffaa00']}],createPresetColors:(_id,count)=>Array(count).fill('#ffaa00'),formatEmitterLabel:id=>'Channel-'+id,identifyAnimationComposition:ids=>({id:'fixture-program',primitiveIds:ids}),partitionEmitterRows:group=>[group.emitterIds],resolveMirrorEmitterId:()=>null,supportsMirror:()=>false,sortEmitterIds:ids=>[...ids]};
 return {props:{snapshot,presentation,commands:{update:record,stop:record,setWorkflowTracksVisible:record,setRealRobotLedsVisible:record}},count:()=>commands};
}
test('renders arbitrary supplied groups without mutating configuration or issuing commands',()=>{
 const f=fixture(),before=JSON.stringify(f.props.snapshot),result=Surface.render(f.props);
 assert.match(result.html,/Panel amber/);assert.match(result.html,/Channel-alpha/);
 assert.equal(JSON.stringify(f.props.snapshot),before);assert.equal(f.count(),0);
});
test('profile ordering and footer are host presentation inputs',()=>{
 const f=fixture();const result=Surface.render({...f.props,zoneOrder:['fixture.zone'],footer:'Fixture profile details'});
 assert.match(result.html,/Fixture profile details/);assert.equal(f.count(),0);
});
