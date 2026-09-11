'use client';
import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import {RotateCcw,SlidersHorizontal,FlipHorizontal2} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {publicAsset} from '@/lib/public-asset';
import {costumeOverlays,defaultAdjustment,type TryOnAdjustment} from '@/lib/try-on/costumes';
import {removeCyanMatte} from '@/lib/try-on/matte';
import {computeCostumePlacement,createHeadOcclusionAlpha} from '@/lib/try-on/placement';
import type {ScannedFrame} from '@/lib/scan/pet-scan';
import type {Product} from '@/lib/fit';

function loadImage(url:string):Promise<HTMLImageElement> {
 return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('Image loading timed out.'));},15000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(new Error('Image could not load.'))};img.src=url;});
}
function trimmedGarment(image:HTMLImageElement):HTMLCanvasElement {
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas unavailable.');
 ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),rgba=pixels.data;
 // The source illustrations use a flat cyan matte. Remove it locally just as a
 // camera green-screen filter would, keeping white fabric and dark fur details.
 removeCyanMatte(rgba);
 ctx.putImageData(pixels,0,0);
 let left=canvas.width,top=canvas.height,right=0,bottom=0;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(rgba[(y*canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(left>right)throw new Error('Costume image is empty.');
 const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d')!.drawImage(canvas,left,top,crop.width,crop.height,0,0,crop.width,crop.height);return crop;
}
type Props={photoUrl:string;frame?:ScannedFrame;name:string;product:Product;adjustment?:TryOnAdjustment;onAdjustment:(value:TryOnAdjustment)=>void;compact?:boolean};
export default function OwnCostumeLook({photoUrl,frame,name,product,adjustment,onAdjustment,compact=false}:Props){
 const overlay=costumeOverlays[product.id];
 const [dressed,setDressed]=useState(true),[controls,setControls]=useState(false);
 const [images,setImages]=useState<{pet:HTMLImageElement;garment:HTMLCanvasElement}|null>(null);
 const [error,setError]=useState('');
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const id=useId(),a=adjustment||defaultAdjustment();
 const placement=useMemo(()=>frame?computeCostumePlacement(frame):null,[frame]);
 useEffect(()=>{let cancelled=false;setImages(null);setError('');
  if(!photoUrl||!overlay||!placement?.usable||(overlay.kind==='head'&&!placement.head))return;
  Promise.all([loadImage(photoUrl),loadImage(publicAsset(overlay.path))]).then(([pet,garment])=>{if(!cancelled)setImages({pet,garment:trimmedGarment(garment)});}).catch(()=>{if(!cancelled)setError('The costume preview could not load. Close this preview and try again.');});
  return()=>{cancelled=true};
 },[photoUrl,overlay,placement]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas||!images)return;
  const w=frame?.width||images.pet.naturalWidth,h=frame?.height||images.pet.naturalHeight;
  canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.drawImage(images.pet,0,0,w,h);if(!dressed)return;
  const body=placement?.usable?placement.body:null;
  let matrix:[number,number,number,number,number,number]=body?.matrix||[w*.52,0,0,h*.36,w*.18,h*.28];
  if(overlay.kind==='head'&&placement?.head){const head=placement.head,w=head.radiusX*3.6,h=head.radiusY*3.8;const ax=head.xAxis.x*w,ay=head.xAxis.y*w,bx=head.yAxis.x*h,by=head.yAxis.y*h;matrix=[ax,ay,bx,by,head.center.x-ax*.497-bx*.565,head.center.y-ay*.497-by*.565];}
  if(overlay.kind==='wings'&&body){const ax=body.yAxis.x*body.height*1.05,ay=body.yAxis.y*body.height*1.05,bx=-body.xAxis.x*body.width*.55,by=-body.xAxis.y*body.width*.55;const root={x:body.origin.x+body.matrix[0]*.68,y:body.origin.y+body.matrix[1]*.68};matrix=[ax,ay,bx,by,root.x-ax*.5-bx*.58,root.y-ay*.5-by*.58];}
  const cx=matrix[4]+(matrix[0]+matrix[2])/2,cy=matrix[5]+(matrix[1]+matrix[3])/2;
  ctx.save();ctx.translate(cx+a.x*w/100,cy+a.y*h/100);ctx.rotate(a.rotation*Math.PI/180);ctx.scale(a.scale*(a.flip?-1:1),a.scale*a.height);ctx.translate(-cx,-cy);ctx.transform(...matrix);ctx.drawImage(images.garment,0,0,1,1);ctx.restore();
  if(frame&&placement?.usable&&overlay.kind!=='head'){
   const foreground=document.createElement('canvas');foreground.width=w;foreground.height=h;const fg=foreground.getContext('2d');if(fg){fg.drawImage(images.pet,0,0,w,h);const original=fg.getImageData(0,0,w,h);const alpha=createHeadOcclusionAlpha(frame,placement);for(let i=0;i<alpha.length;i++)original.data[i*4+3]=alpha[i];fg.putImageData(original,0,0);ctx.drawImage(foreground,0,0);}
  }
 },[images,dressed,frame,placement,overlay,a.x,a.y,a.scale,a.height,a.rotation,a.flip]);
 if(!overlay)return <p className="own-try-on-unavailable">A try-on image for this style is not available yet. You can still compare its size details below.</p>;
 if(!photoUrl)return <p className="own-try-on-unavailable">We couldn’t get a clear photo from this video. Upload a photo to preview costumes on your pet.</p>;
 if(!placement?.usable)return <div className="own-try-on-unavailable"><p>We couldn’t locate your pet’s body clearly enough to place this costume. Try a well-lit side photo showing their whole body.</p><img className="try-on-fallback-photo" src={photoUrl} alt={`Your original photo of ${name}`}/></div>;
 if(overlay.kind==='head'&&!placement.head)return <p className="own-try-on-unavailable">Your pet’s face wasn’t clear enough to position this headwear. Try a photo with their eyes and nose visible.</p>;
 const change=(field:keyof TryOnAdjustment,value:number|boolean)=>onAdjustment({...a,[field]:value});
 return <div className={`costume-look own-costume-look${compact?' compact':''}`}>
  <div className="look-view-controls" role="group" aria-label="Your pet costume preview view"><button type="button" aria-pressed={!dressed} onClick={()=>setDressed(false)}>Original photo</button><button type="button" aria-pressed={dressed} onClick={()=>setDressed(true)}>Try costume on {name}</button></div>
  <div className="own-try-on-stage" aria-busy={!images&&!error}>
   {images?<canvas ref={canvasRef} role="img" aria-label={dressed?`${name} with an illustrative ${product.name} overlay on your uploaded photo`:`Original uploaded photo of ${name}`}/>:<img src={photoUrl} alt={`Original photo of ${name}`}/>}
   {!images&&<span className="own-try-on-status" role="status">{error||'Preparing your costume preview…'}</span>}
   {images&&<span className="look-image-label">{dressed?'Virtual costume mock-up':'Your original photo'}</span>}
  </div>
  <p className="look-disclosure">Your actual photo with an illustrated costume overlay. Placement, fabric and fit are approximate. {frame?.timeSeconds!==undefined?'Shown on one frame of your video.':''}</p>
  {images&&<><div className="own-try-on-actions"><button type="button" className="text-btn" aria-expanded={controls} aria-controls={`${id}-controls`} onClick={()=>{setControls(!controls);setDressed(true)}}><SlidersHorizontal size={17}/>Adjust costume placement</button><button type="button" className="text-btn" onClick={()=>{onAdjustment(defaultAdjustment());setDressed(true)}}><RotateCcw size={15}/>Reset</button></div>
  {placement?.source==='silhouette'&&<p className="own-try-on-hint">Placement follows the visible outline because body landmarks were unclear. Check and adjust its position.</p>}
  {controls&&<div id={`${id}-controls`} className="own-try-on-controls">{([
   ['x','Left / right',-50,50,1],['y','Up / down',-50,50,1],['scale','Costume size',.25,2.5,.05],['height','Costume height',.4,2,.05],['rotation','Rotation',-180,180,1],
  ] as const).map(([field,label,min,max,step])=><div key={field} className="own-try-on-control"><div><label id={`${id}-${field}`}>{label}</label><output>{field==='scale'||field==='height'?`${Math.round(a[field]*100)}%`:field==='rotation'?`${a[field]}°`:`${a[field]}%`}</output></div><Slider aria-labelledby={`${id}-${field}`} value={[a[field]]} min={min} max={max} step={step} onValueChange={value=>change(field,Array.isArray(value)?value[0]:value)}/></div>)}<button type="button" className="outline-btn small" aria-pressed={a.flip} onClick={()=>change('flip',!a.flip)}><FlipHorizontal2 size={16}/>Flip costume</button><p>These controls change the picture only. Use your measurements to compare costume sizes.</p></div>}</>}
 </div>;
}
