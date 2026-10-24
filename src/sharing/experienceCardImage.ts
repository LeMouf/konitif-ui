import {createExperienceQrMatrix,embedExperienceTransferPng,experienceTransferReference,type ExperienceTransferArtifact} from '@konitif/workbench';
export async function renderExperienceCardImage(card:ExperienceTransferArtifact):Promise<Blob>{
 const canvas=document.createElement('canvas');canvas.width=760;canvas.height=1040;const c=canvas.getContext('2d');if(!c)throw Error('Canvas 2D indisponible.');
 c.fillStyle='#15171b';c.fillRect(0,0,760,1040);c.strokeStyle='#b9bec6';c.lineWidth=3;c.strokeRect(24,24,712,992);
 c.fillStyle='#b9bec6';c.font='bold 19px sans-serif';c.fillText('KONITIF WORKBENCH · EXPÉRIENCE',55,78);
 c.fillStyle='#f4f5f6';c.font='bold 31px sans-serif';const title=card.title.length>35?card.title.slice(0,33)+'…':card.title;c.fillText(title,55,139,650);
 c.font='21px sans-serif';c.fillStyle='#b6bbc3';c.fillText(card.profile==='distribution'?'LIVRABLE DISTRIBUABLE':'CARTE DE REPRISE',55,194);
 c.font='17px sans-serif';c.fillText(card.profile==='distribution'?'État initial choisi · sans historique personnel':'État de travail · continuité explicitement exportée',55,233);
 c.fillStyle='#23262c';c.fillRect(55,272,650,196);c.fillStyle='#e0e3e8';c.font='bold 18px sans-serif';c.fillText('CAPACITÉS REQUISES',76,306);
 c.font='16px monospace';card.requirements.toolIds.slice(0,4).forEach((id,i)=>c.fillText(id,76,342+i*27,602));
 c.fillStyle='#adb3bd';c.font='16px sans-serif';c.fillText('Déposer cette image dans un Workbench compatible.',55,508);
 const matrix=createExperienceQrMatrix(experienceTransferReference(card)),quiet=4,unit=Math.floor(300/(matrix.length+8)),size=unit*(matrix.length+8),left=(760-size)/2,top=556;
 c.fillStyle='#fff';c.fillRect(left,top,size,size);c.fillStyle='#08121c';matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)c.fillRect(left+(x+quiet)*unit,top+(y+quiet)*unit,unit,unit);}));
 c.fillStyle='#e0e3e8';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText('QR : référence de contenu, sans publication en ligne',380,top+size+45,660);
 c.fillStyle='#adb3bd';c.font='14px monospace';c.fillText('SHA-256 '+card.contentId.slice(0,24)+'…',380,945);c.font='15px sans-serif';c.fillText('Définition et métadonnées embarquées dans le PNG',380,980);
 const image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Export PNG indisponible.')),'image/png'));
 const bytes=embedExperienceTransferPng(new Uint8Array(await image.arrayBuffer()),card);return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'image/png'});
}
