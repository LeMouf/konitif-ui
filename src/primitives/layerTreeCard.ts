import './layerTreeCard.css';
/** Shared DOM/Svelte action for compact or regular layer cards; content and commands stay with the host. */
export interface LayerTreeCardOptions {accent:string;accents?:readonly string[];selected?:boolean;hovered?:boolean;ancestor?:boolean;focused?:boolean;dimmed?:boolean;compact?:boolean;depth?:number;selectionColor?:string;hoverColor?:string;branch?:{last:boolean;continuations:readonly boolean[]};}
export function layerTreeCard(element:HTMLElement,initial:LayerTreeCardOptions){
 let connector:SVGSVGElement|undefined;
 function update(value:LayerTreeCardOptions){
  element.classList.add('konitif-layer-tree-card');element.dataset.layerTreeCard='';
  for(const key of ['selected','hovered','ancestor','focused','dimmed','compact'] as const)element.dataset['tree'+key[0].toUpperCase()+key.slice(1)]=String(!!value[key]);
  const colors=value.accents??[];element.dataset.treeMixed=String(colors.length>1);element.style.setProperty('--tree-accent-band',colors.length>1?`linear-gradient(90deg,${colors.map((color,i)=>`${color} ${100*i/colors.length}% ${100*(i+1)/colors.length}%`).join(',')})`:'none');
  element.style.setProperty('--tree-accent',value.accent);element.style.setProperty('--tree-selection',value.selectionColor??value.accent);element.style.setProperty('--tree-hover',value.hoverColor??value.accent);
  element.dataset.treeConnected=String(!!value.branch);
  if(value.branch&&value.depth){
   connector??=element.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');connector.setAttribute('aria-hidden','true');connector.setAttribute('data-layer-tree-branches','');
   const depth=Math.min(value.depth,8),width=depth*10+8;
   connector.setAttribute('viewBox',`0 0 ${width} 42`);connector.style.cssText=`position:absolute;pointer-events:none;overflow:visible;left:${-width}px;top:-3px;width:${width}px;height:calc(100% + 6px)`;
   connector.replaceChildren();const path=element.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
   const x=width-8;let d=`M${x} 0V${value.branch.last?15:42} M${x} 15Q${x} 21 ${width} 21`;
   for(const [index,continues]of value.branch.continuations.slice(-7).entries())if(continues)d+=` M${8+index*10} 0V42`;
   path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','var(--tree-accent)');path.setAttribute('stroke-opacity','.4');path.setAttribute('stroke-width','1');connector.append(path);element.prepend(connector);
  }else{connector?.remove();connector=undefined;}
  if(value.depth!==undefined){element.style.setProperty('--tree-indent',`${Math.min(value.depth,8)*10}px`);element.style.setProperty('--tree-branch-opacity',value.depth?'1':'0');}
 }
 update(initial);return {update,destroy(){connector?.remove();element.classList.remove('konitif-layer-tree-card');delete element.dataset.layerTreeCard;}};
}
