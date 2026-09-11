'use client';
import {useEffect,useRef,useState} from 'react';
import {Info,ScanLine,Trash2} from 'lucide-react';
import {publicAsset} from '@/lib/public-asset';
import type {scanPetMedia} from '@/lib/scan/pet-scan';
export type ScanBundle=Awaited<ReturnType<typeof scanPetMedia>>;
export type ScanFailure={kind:'media-error'|'model-error';message:string};
type Props={url:string;kind:'image'|'video';initial:ScanBundle|null;onAnalysis:(result:ScanBundle)=>void;onFailure:(failure:ScanFailure)=>void;onRemove:()=>void;onKeep:()=>void};
export default function AutomaticScan({url,kind,initial,onAnalysis,onFailure,onRemove,onKeep}:Props){
 const [bundle,setBundle]=useState<ScanBundle|null>(initial);
 const [busy,setBusy]=useState(!initial),[progress,setProgress]=useState('Preparing your pet scan…');
 const [active,setActive]=useState(0);
 const controller=useRef<AbortController|null>(null);
 const callbacks=useRef({onAnalysis,onFailure});callbacks.current={onAnalysis,onFailure};
 async function run(){
  controller.current?.abort();const task=new AbortController();controller.current=task;
  setBusy(true);setProgress('Opening the automatic scanner…');
  try{
   const {scanPetMedia:scan}=await import('@/lib/scan/pet-scan');
   if(task.signal.aborted)return;
   const next=await scan({url,kind,asset:publicAsset,onProgress:text=>{if(!task.signal.aborted)setProgress(text);},signal:task.signal});
   if(task.signal.aborted)return;
   setBundle(next);setActive(0);callbacks.current.onAnalysis(next);
  }catch(e){
   if(!task.signal.aborted){
    const failure=e as {kind?:string;message?:string};
    callbacks.current.onFailure(failure.kind==='media-error'?{kind:'media-error',message:failure.message||'This file could not be opened. Try another photo or video, or enter measurements below.'}:{kind:'model-error',message:'The scanner could not load or finish. Try again, or enter measurements below.'});
   }
  }finally{if(!task.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{if(!initial)void run();return()=>controller.current?.abort();},[url,kind]);
 const frame=bundle?.frames[active];
 return <section className="automatic-scan" aria-label="Automatic pet scan">
  <div className="automatic-scan-heading"><ScanLine size={24}/><div><b>Automatic pet scan</b><span>Runs on your device · No account needed</span></div></div>
  {busy&&<div className="scan-live-status" role="status"><span className="scan-spinner"/><div><b>{progress}</b><p>The first scan may take a little longer while the scanner downloads. Your photo or video stays on this device.</p></div></div>}
  {frame&&<><div className="automatic-scan-image"><img src={frame.overlayUrl} alt="Your pet with the detected outline and body landmarks"/><span>Actual detection · {bundle!.frameCount} {bundle!.frameCount===1?'frame':'frames'} analyzed</span></div>{bundle!.frames.length>1&&<div className="scan-frame-list" aria-label="Analyzed video frames">{bundle!.frames.map((f,i)=><button type="button" key={i} aria-label={`View analyzed frame ${i+1}`} aria-pressed={active===i} onClick={()=>setActive(i)}><img src={f.previewUrl} alt=""/><span>{i+1}</span></button>)}</div>}</>}
  {bundle&&!busy&&<p role="status">{bundle.result.message}</p>}
  <div className="scan-upload-actions">{!busy&&<><button className="outline-btn" onClick={onKeep}>Review measurements</button><button className="text-btn" onClick={()=>void run()}>Scan this upload again</button></>}<button className="text-btn remove-upload-btn" onClick={onRemove}><Trash2 size={16}/>Remove {kind==='video'?'video':'photo'}</button></div>
  <p className="scan-method-note"><Info size={15}/>Rough estimates are a starting point. Clear views of the whole pet help; you can edit every measurement.</p>
 </section>;
}
