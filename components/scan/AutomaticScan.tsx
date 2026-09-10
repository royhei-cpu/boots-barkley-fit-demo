'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,CheckCircle2,Download,Info,ScanLine,Trash2,Upload} from 'lucide-react';
import {publicAsset} from '@/lib/public-asset';
import type {scanPetMedia} from '@/lib/scan/pet-scan';
import {combineViews} from '@/lib/scan/calibrated-measurement';
export type ScanBundle=Awaited<ReturnType<typeof scanPetMedia>>;
type Props={url:string;kind:'image'|'video';initial:ScanBundle|null;onAnalysis:(result:ScanBundle)=>void;onRemove:()=>void;onKeep:()=>void};
export default function AutomaticScan({url,kind,initial,onAnalysis,onRemove,onKeep}:Props){
 const [bundle,setBundle]=useState<ScanBundle|null>(initial);
 const [busy,setBusy]=useState(!initial),[progress,setProgress]=useState('Preparing your pet scan…'),[error,setError]=useState('');
 const [active,setActive]=useState(0);
 const controller=useRef<AbortController|null>(null);
 const latest=useRef(bundle);latest.current=bundle;
 const callbacks=useRef({onAnalysis});callbacks.current={onAnalysis};
 async function run(source:string,sourceKind:'image'|'video',append=false){
  controller.current?.abort();const task=new AbortController();controller.current=task;
  setBusy(true);setError('');setProgress('Loading the on-device scanner…');
  try{
   const {scanPetMedia:scan}=await import('@/lib/scan/pet-scan');
   if(task.signal.aborted)return;
   const next=await scan({url:source,kind:sourceKind,asset:publicAsset,onProgress:text=>{if(!task.signal.aborted)setProgress(text);},signal:task.signal});
   if(task.signal.aborted)return;
   const prior=append?latest.current:null;
   const merged=prior?{...next,frames:[...prior.frames,...next.frames],viewResults:[...prior.viewResults,...next.viewResults],frameCount:prior.frameCount+next.frameCount}:next;
   merged.result=combineViews(merged.viewResults);
   setBundle(merged);setActive(prior?prior.frames.length:0);callbacks.current.onAnalysis(merged);
  }catch(e){if(!task.signal.aborted)setError(e instanceof Error?e.message:'The scan could not finish. Try a clear JPG photo or MP4 video.');}
  finally{if(!task.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{if(!initial)void run(url,kind);return()=>controller.current?.abort();},[url,kind]);
 async function addFile(file?:File){
  if(!file)return;
  if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type)||file.size>100*1024*1024){setError('Choose a supported photo or video under 100 MB.');return;}
  if((bundle?.frameCount||0)>=20){setError('This session has enough frames. Remove this upload and start with two clear views.');return;}
  const source=URL.createObjectURL(file);
  try{await run(source,file.type.startsWith('video/')?'video':'image',true);}finally{URL.revokeObjectURL(source);}
 }
 const frame=bundle?.frames[active];
 const located=!!bundle?.frames.some(f=>f.keypoints.length>0);
 const scaled=!!bundle?.viewResults.some(v=>v.calibrated);
 const hasSide=!!bundle?.viewResults.some(v=>v.view==='side'&&v.calibrated&&v.backCm);
 const hasFront=!!bundle?.viewResults.some(v=>v.view==='front'&&v.calibrated&&v.chestWidthCm);
 return <section className="automatic-scan" aria-label="Automatic pet scan">
  <div className="automatic-scan-heading"><ScanLine size={24}/><div><b>Automatic pet scan</b><span>Runs on your device · No account needed</span></div></div>
  {busy&&<div className="scan-live-status" role="status"><span className="scan-spinner"/><div><b>{progress}</b><p>The first scan downloads about 51 MB of models and processing tools. Your photo or video stays on this device.</p></div></div>}
  {error&&<div className="form-error" role="alert">{error}<button className="text-btn" onClick={()=>void run(url,kind)}>Try this upload again</button></div>}
  {frame&&<><div className="automatic-scan-image"><img src={frame.overlayUrl} alt="Your pet with the detected outline, anatomical landmarks and any detected size reference"/><span>Actual detection · {bundle!.frameCount} {bundle!.frameCount===1?'frame':'frames'} analyzed</span></div>{bundle!.frames.length>1&&<div className="scan-frame-list" aria-label="Analyzed video frames">{bundle!.frames.map((f,i)=><button type="button" key={i} aria-label={`View analyzed frame ${i+1}`} aria-pressed={active===i} onClick={()=>setActive(i)}><img src={f.previewUrl} alt=""/><span>{i+1}</span></button>)}</div>}</>}
  {bundle&&<><div className="scan-checks"><span data-ready={located}>{located?<CheckCircle2 size={16}/>:<Info size={16}/>}Pet located</span><span data-ready={scaled}>{scaled?<CheckCircle2 size={16}/>:<Info size={16}/>}10 cm reference</span><span data-ready={hasSide&&hasFront}>{hasSide&&hasFront?<CheckCircle2 size={16}/>:<Info size={16}/>}Side + front views</span></div>{frame&&frame.warnings.length>0&&<p className="small-note">{frame.warnings.join(" ")}</p>}<div className="scan-next-step" role="status"><h3>{bundle.result.status==='ready'?'Your estimates are ready to review.':bundle.result.status==='needs-reference'?'Add a size reference to get measurements.':'Let’s get a clearer measurement view.'}</h3><p>{bundle.result.message}</p></div></>}
  {(!bundle||bundle.result.status!=='ready')&&<div className="scan-capture-guide"><h3>A size reference makes the scan measurable.</h3><ol><li><b>Print the 10 cm reference.</b> Print at 100% and check the black square measures exactly 10 cm.</li><li><b>Capture a clear side and front view.</b> Your pet should stand naturally, without a costume or a gate in front. Keep the camera level with the body.</li><li><b>Keep the reference beside the body.</b> Hold it upright at the same distance from the camera as the pet’s body. Face it toward the camera in both views.</li></ol><a className="outline-btn" href={publicAsset('/downloads/pet-size-reference.html')} target="_blank" rel="noreferrer"><Download size={17}/>Open printable size reference</a><p className="small-note">Do not place the reference closer to the camera or flat on the floor. Keep it clear of the pet’s silhouette.</p></div>}
  <div className="scan-upload-actions"><label className={`outline-btn scan-add-file ${busy?'disabled':''}`}><Camera size={17}/>{bundle?'Add side / front photo or video':'Choose another view'}<input type="file" aria-label="Add side or front photo or video" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e=>{void addFile(e.target.files?.[0]);e.target.value='';}}/></label>{bundle&&<button className="text-btn" onClick={onKeep}>Keep this pet profile</button>}<button className="text-btn remove-upload-btn" onClick={onRemove}><Trash2 size={16}/>Remove {kind==='video'?'video':'photo'}</button></div>
  <p className="scan-method-note"><Info size={15}/>Experimental estimates use the detected body outline and two calibrated views. Fur, posture and hidden body parts affect accuracy. Check measurements before buying a costume.</p>
 </section>;
}
