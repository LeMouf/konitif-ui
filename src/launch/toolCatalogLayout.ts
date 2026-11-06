import type {ToolDefinition} from '@konitif/workbench';
export type WorkbenchToolCatalogEntry=Pick<ToolDefinition,'id'|'title'> & Partial<Pick<ToolDefinition,'description'|'shell'|'version'|'catalogPresentation'|'panelTitle'|'keywords'>> & {tags?:readonly string[];revisionDate?:string};
export type ToolCatalogLayoutBox={id:string;x:number;y:number;width:number;height:number;labels:string[]};
/** A projection of declared default docks; no tool instance or runtime is acquired. */
export function toolCatalogLayout(tool:WorkbenchToolCatalogEntry):ToolCatalogLayoutBox[]{
 const docks=tool.shell?.widgetDocks?.filter(dock=>dock.defaultVisible!==false)??[];
 const labels=(region:string)=>docks.filter(dock=>dock.defaultRegionId===region).map(dock=>dock.title);
 const left=labels('left'),right=labels('right'),bottom=labels('bottom'),x=left.length?40:4,y=14,width=152-(left.length?36:0)-(right.length?36:0),height=82-(bottom.length?24:0);
 return [{id:'chrome',x:4,y:4,width:152,height:6,labels:['En-tête']},{id:'main',x,y,width,height,labels:['Surface principale']},
  ...(left.length?[{id:'left',x:4,y,width:32,height,labels:left}]:[]),
  ...(right.length?[{id:'right',x:124,y,width:32,height,labels:right}]:[]),
  ...(bottom.length?[{id:'bottom',x:4,y:76,width:152,height:20,labels:bottom}]:[])];
}
