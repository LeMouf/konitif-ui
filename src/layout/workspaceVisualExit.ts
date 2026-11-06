/** Decorative snapshots only. No transition callback owns live Tools or their resources. */
export function beginWorkspaceVisualExit(root:Document|HTMLElement=document){
 if(typeof window==='undefined'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||typeof Element.prototype.animate!=='function')return ()=>{};
 const layer=document.createElement('div');layer.setAttribute('aria-hidden','true');layer.setAttribute('data-workbench-exit-visual','');layer.inert=true;Object.assign(layer.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'9998',overflow:'hidden'});
 const animations:Animation[]=[],masked:{node:HTMLElement;visibility:string}[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
 const handles='.boundary-corner-handle,.shell-region__widget-move-handle,.resize-handle,.edge-split-handle,.workspace-boundary-chrome__intersection-handle,[data-companion-resize],[role="separator"]';
 const elements=Array.from(root.querySelectorAll<HTMLElement>('.tool-host,'+handles)).filter(node=>!node.closest('[data-workbench-exit-visual]'));
 for(const node of elements){const rect=node.getBoundingClientRect();if(rect.width<1||rect.height<1)continue;const tool=node.classList.contains('tool-host');let ghost:HTMLElement;
  if(tool&&node.querySelectorAll('*').length<=1600){ghost=node.cloneNode(true) as HTMLElement;ghost.querySelectorAll('iframe,script,link,audio,video,source,object,embed').forEach(item=>item.remove());const originals=node.querySelectorAll('canvas'),copies=ghost.querySelectorAll('canvas');copies.forEach((canvas,index)=>{try{canvas.getContext('2d')?.drawImage(originals[index],0,0);}catch{/* A decorative snapshot may omit protected pixels. */}});}else{ghost=document.createElement('div');const style=getComputedStyle(node);ghost.style.background=style.backgroundColor;ghost.style.border=style.border;ghost.style.borderRadius=style.borderRadius;}
  ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(item=>item.removeAttribute('id'));Object.assign(ghost.style,{position:'absolute',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',transformOrigin:'50% 50%',pointerEvents:'none',overflow:'hidden'});layer.append(ghost);
  masked.push({node,visibility:node.style.visibility});node.style.visibility='hidden';
  animations.push(ghost.animate(tool?[{transform:'scale(1)',opacity:1},{transform:'scale(1.025)',opacity:1,offset:.18},{transform:'scale(.06)',opacity:0}]:[{opacity:1},{opacity:0}],{duration:180,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}));
 }
 if(!layer.childElementCount)return ()=>{};document.body.append(layer);
 const removeGhosts=()=>{if(timer)clearTimeout(timer);for(const animation of animations)animation.cancel();layer.remove();};timer=setTimeout(removeGhosts,210);return ()=>{removeGhosts();for(const item of masked)item.node.style.visibility=item.visibility;};
}
