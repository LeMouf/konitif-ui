export interface LayerTreeVisibilityState {
  state: 'visible' | 'hidden' | 'inherited' | 'mixed';
  supported: boolean;
  label: string;
  detail?: string;
}
export interface LayerTreeVisibilityPaint {register:(element:HTMLButtonElement,read:()=>LayerTreeVisibilityState & {onToggle:(visible:boolean)=>void})=>()=>void;start:(event:PointerEvent,element:HTMLButtonElement)=>boolean;consumeClick:(element:HTMLButtonElement)=>boolean;}
/** One gesture scope per outliner. Snapshot initial states so repaint never flips a row twice. */
export function createLayerTreeVisibilityPaint():LayerTreeVisibilityPaint {
 const entries=new Map<HTMLButtonElement,()=>LayerTreeVisibilityState & {onToggle:(visible:boolean)=>void}>();
 let gesture:{pointer:number;source:string;visible:boolean;initial:Map<HTMLButtonElement,string>;visited:Set<HTMLButtonElement>}|undefined,document:Document|undefined,suppress:HTMLButtonElement|undefined;
 const end=()=>{gesture=undefined;};
 const move=(event:PointerEvent)=>{if(!gesture||gesture.pointer!==event.pointerId)return;if(!event.buttons){end();return;}const element=document?.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLButtonElement>('[data-layer-tree-visibility]');if(!element||gesture.visited.has(element)||gesture.initial.get(element)!==gesture.source)return;const value=entries.get(element)?.();if(!value?.supported||element.disabled)return;gesture.visited.add(element);value.onToggle(gesture.visible);event.preventDefault();};
 return {register(element,read){entries.set(element,read);if(!document){document=element.ownerDocument;document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);}return ()=>{entries.delete(element);if(!entries.size&&document){document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);document=undefined;end();}};},start(event,element){const value=entries.get(element)?.();if(event.button!==0||!value?.supported||element.disabled||!['visible','hidden'].includes(value.state))return false;suppress=element;gesture={pointer:event.pointerId,source:value.state,visible:value.state==='hidden',initial:new Map([...entries].map(([button,read])=>[button,read().state])),visited:new Set([element])};value.onToggle(gesture.visible);event.preventDefault();event.stopPropagation();return true;},consumeClick(element){if(suppress!==element)return false;suppress=undefined;return true;}};
}
/** Shared outliner visibility control. The host retains authority over what can be hidden. */
export function layerTreeVisibilityButton(element: HTMLButtonElement, initial: LayerTreeVisibilityState & { onToggle: (visible: boolean) => void;paint?:LayerTreeVisibilityPaint }) {
  let value=initial;
  function update(next: typeof initial) {
    value=next;
    element.type='button';
    element.setAttribute('data-layer-tree-visibility','');
    element.disabled=!value.supported||value.state==='inherited';
    element.textContent=value.state==='visible'?'◉':value.state==='mixed'?'◐':'○';
    element.setAttribute('aria-pressed',String(value.state==='visible'));
    element.setAttribute('aria-label',value.supported?`${value.state==='hidden'?'Afficher':'Masquer'} ${value.label}${value.state==='inherited'?' (masqué par un parent)':value.state==='mixed'?' (visibilité mixte)':''}`:`Visibilité au calque pour ${value.label}`);
    element.title=value.detail??(value.supported?`${value.state} · visibilité de travail`:'Aucune visibilité autonome ; utiliser le calque propriétaire.');
  }
  const detach=initial.paint?.register(element,()=>value);
  const pointerdown=(event:PointerEvent)=>value.paint?.start(event,element);
  element.addEventListener('pointerdown',pointerdown);
  const click=(event:MouseEvent)=>{event.stopPropagation();if(value.paint?.consumeClick(element))return;if(!element.disabled)value.onToggle(value.state==='hidden');};
  element.addEventListener('click',click);update(initial);
  return {update,destroy(){detach?.();element.removeEventListener('pointerdown',pointerdown);element.removeEventListener('click',click);}};
}
