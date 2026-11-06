import type { WorkspacePresetArtifact } from '@konitif/workbench';

type LayoutRoot = NonNullable<WorkspacePresetArtifact['workspaceSession']['workspace']['windows'][number]['root']>;

/** Draw a thumbnail from the declared panel split tree. */
export function renderWorkbenchExperienceLayoutPreview(root: LayoutRoot | undefined, highlighted = false): string {
 type Node = LayoutRoot;
 const rectangles:string[]=[];
 function draw(node:Node|undefined,x:number,y:number,w:number,h:number){
  if(!node)return;
  if(node.kind==='split'&&node.children){const ratio=node.sizes?.[0]??.5;if(node.orientation==='horizontal'){draw(node.children[0],x,y,w*ratio,h);draw(node.children[1],x+w*ratio,y,w*(1-ratio),h);}else{draw(node.children[0],x,y,w,h*ratio);draw(node.children[1],x,y+h*ratio,w,h*(1-ratio));}}
  else rectangles.push(`<rect x="${x+2}" y="${y+2}" width="${Math.max(0,w-4)}" height="${Math.max(0,h-4)}" rx="2" fill="${highlighted?'#6798c7':'#71849b'}" fill-opacity="${highlighted?'.4':'.25'}" stroke="${highlighted?'#6798c7':'#99abc0'}" stroke-width="1.5"/>`);
 }
 draw(root,0,0,160,100);
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="none">${rectangles.join('')}</svg>`);
}
