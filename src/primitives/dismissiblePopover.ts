export interface DismissiblePopoverOptions {
 trigger?:()=>HTMLElement|null|undefined;
 /** Include explicitly owned portalled panels, never every portal in the application. */
 extraRoots?:()=>readonly Node[];
 onDismiss:(reason:'outside'|'escape')=>void;
 escape?:boolean;
 restoreFocusOnEscape?:boolean;
}
/** Owned by the mounted popover. Outside pointers keep their normal action and focus. */
export function dismissiblePopover(node:HTMLElement,initial:DismissiblePopoverOptions){
 let options=initial;const doc=node.ownerDocument;
 function inside(event:Event){const path=event.composedPath(),roots=[node,options.trigger?.(),...(options.extraRoots?.()??[])].filter((root):root is Node=>!!root);return roots.some(root=>path.includes(root)||event.target instanceof Node&&root.contains(event.target));}
 function pointer(event:PointerEvent){if(!inside(event))options.onDismiss('outside');}
 function key(event:KeyboardEvent){if(event.key!=='Escape'||options.escape===false||event.defaultPrevented)return;event.preventDefault();event.stopPropagation();options.onDismiss('escape');if(options.restoreFocusOnEscape!==false)options.trigger?.()?.focus();}
 doc.addEventListener('pointerdown',pointer,true);doc.addEventListener('keydown',key);
 return {update(value:DismissiblePopoverOptions){options=value;},destroy(){doc.removeEventListener('pointerdown',pointer,true);doc.removeEventListener('keydown',key);}};
}
