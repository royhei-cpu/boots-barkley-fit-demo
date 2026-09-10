import * as ort from 'onnxruntime-web/wasm';
import {createPetSegmenter,originalPetMask} from './pet-segmentation';
import {inferAnimalPose,AP10K_LINKS} from './rtmpose-browser.mjs';
import {AR} from './vendor/aruco.js';
import {largestPetComponent} from './pet-components';
import {analyzeView,combineViews,type ScanFrame,type ViewAnalysis,type CombineResult} from './calibrated-measurement';

export type ScannedFrame=ScanFrame & {
  previewUrl:string;overlayUrl:string;timeSeconds?:number;
  petPixels:number;dogPixels:number;catPixels:number;
  componentCount:number;meaningfulComponents:number;warnings:string[];
};
export type ScanMediaResult={
  frames:ScannedFrame[];viewResults:ViewAnalysis[];result:CombineResult;frameCount:number;
};
export type ScanMediaOptions={
  url:string;kind:'image'|'video';asset:(path:string)=>string;
  onProgress:(text:string)=>void;signal?:AbortSignal;
};
type Segmenter=Awaited<ReturnType<typeof createPetSegmenter>>;
type Models={segmenter:Segmenter;pose:ort.InferenceSession};
const modelCache=new Map<string,Promise<Models>>();
// A WebAssembly run itself cannot be interrupted. Queue scans, then discard an
// aborted run's outputs at every await boundary before progress/results reach UI.
let scanQueue:Promise<void>=Promise.resolve();

function checkAbort(signal?:AbortSignal) {
  if(signal?.aborted) throw new DOMException('Scan cancelled.','AbortError');
}
function isAbort(error:unknown) {return error instanceof Error&&error.name==='AbortError';}
function waitAbortable<T>(promise:Promise<T>,signal?:AbortSignal):Promise<T> {
  checkAbort(signal);
  if(!signal)return promise;
  return new Promise<T>((resolve,reject)=>{
    const abort=()=>{cleanup();reject(new DOMException('Scan cancelled.','AbortError'));};
    const cleanup=()=>signal.removeEventListener('abort',abort);
    signal.addEventListener('abort',abort,{once:true});
    promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
  });
}
async function yieldFrame(signal?:AbortSignal) {
  await new Promise<void>(resolve=>setTimeout(resolve,0));checkAbort(signal);
}
async function fetchModelPart(url:string) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),90000);
  try {
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error(`The scan model could not load (${response.status}). Please try again.`);
    return new Uint8Array(await response.arrayBuffer());
  } catch(error) {
    if(isAbort(error))throw new Error('The scan model download timed out. Check your connection and try again.');
    throw error;
  } finally {clearTimeout(timer);}
}
function loadModels(asset:ScanMediaOptions['asset']):Promise<Models> {
  const segmentUrl=asset('/models/pet-lraspp-512.onnx');
  const posePart1=asset('/models/rtmpose-ap10k-fp16.part1');
  const posePart2=asset('/models/rtmpose-ap10k-fp16.part2');
  const wasmBase=new URL(asset('/scan-runtime/'),document.baseURI).href;
  const key=[segmentUrl,posePart1,posePart2,wasmBase].join('|');
  let promise=modelCache.get(key);
  if(promise)return promise;
  ort.env.wasm.numThreads=1;
  ort.env.wasm.wasmPaths=wasmBase;
  promise=(async()=>{
    const posePromise=(async()=>{
      const parts=await Promise.all([fetchModelPart(posePart1),fetchModelPart(posePart2)]);
      const bytes=new Uint8Array(parts[0].length+parts[1].length);
      bytes.set(parts[0]);bytes.set(parts[1],parts[0].length);
      return ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
    })();
    const loaded=await Promise.allSettled([createPetSegmenter(segmentUrl,wasmBase),posePromise] as const);
    const segmentation=loaded[0],pose=loaded[1];
    if(segmentation.status==='fulfilled'&&pose.status==='fulfilled')return {segmenter:segmentation.value,pose:pose.value};
    if(segmentation.status==='fulfilled')await segmentation.value.dispose();
    if(pose.status==='fulfilled')await pose.value.release();
    throw segmentation.status==='rejected'?segmentation.reason:pose.status==='rejected'?pose.reason:new Error('Scan model loading failed.');
  })().catch(error=>{modelCache.delete(key);throw error;});
  modelCache.set(key,promise);
  return promise;
}

function fitCanvas(source:CanvasImageSource,width:number,height:number):HTMLCanvasElement {
  if(!width||!height)throw new Error('This photo or video frame could not be decoded.');
  const scale=Math.min(1,960/Math.max(width,height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*scale));
  canvas.height=Math.max(1,Math.round(height*scale));
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(source,0,0,canvas.width,canvas.height);
  return canvas;
}
async function decodePhoto(url:string,signal?:AbortSignal) {
  checkAbort(signal);
  const image=new Image();
  try {
    await new Promise<void>((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);image.onload=null;image.onerror=null;signal?.removeEventListener('abort',abort);};
      const fail=(error:Error)=>{cleanup();reject(error);};
      const abort=()=>fail(new DOMException('Scan cancelled.','AbortError'));
      const timer=setTimeout(()=>fail(new Error('The photo took too long to open. Try a smaller JPG or PNG.')),20000);
      image.onload=()=>{cleanup();resolve();};
      image.onerror=()=>fail(new Error('This photo could not be opened. Try a JPG, PNG or WebP image.'));
      signal?.addEventListener('abort',abort,{once:true});
      image.src=url;
    });
    checkAbort(signal);
    return fitCanvas(image,image.naturalWidth,image.naturalHeight);
  } finally {image.onload=null;image.onerror=null;image.removeAttribute('src');}
}
function videoEvent(video:HTMLVideoElement,event:'loadedmetadata'|'loadeddata'|'seeked',
  action:()=>void,signal?:AbortSignal,timeout=15000):Promise<void> {
  checkAbort(signal);
  return new Promise<void>((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener('error',failed);signal?.removeEventListener('abort',abort);};
    const ready=()=>{cleanup();resolve();};
    const failed=()=>{cleanup();reject(new Error('This video format could not be decoded. Try an MP4 video or clear photos.'));};
    const abort=()=>{cleanup();reject(new DOMException('Scan cancelled.','AbortError'));};
    const timer=setTimeout(()=>{cleanup();reject(new Error('The video frame took too long to open. Try a shorter MP4 video.'));},timeout);
    video.addEventListener(event,ready,{once:true});
    video.addEventListener('error',failed,{once:true});
    signal?.addEventListener('abort',abort,{once:true});
    try {action();}catch(error){cleanup();reject(error);}
  });
}
async function seekVideo(video:HTMLVideoElement,time:number,signal?:AbortSignal) {
  checkAbort(signal);
  if(Math.abs(video.currentTime-time)>.002||video.readyState<2) {
    await videoEvent(video,'seeked',()=>{video.currentTime=time;},signal);
  }
  if(video.readyState<2)await videoEvent(video,'loadeddata',()=>{},signal);
  checkAbort(signal);
  return fitCanvas(video,video.videoWidth,video.videoHeight);
}

function overlayFrame(canvas:HTMLCanvasElement,frame:ScanFrame):string {
  const overlay=document.createElement('canvas');
  overlay.width=canvas.width;overlay.height=canvas.height;
  const context=overlay.getContext('2d');
  if(!context)throw new Error('The scan preview could not be drawn.');
  context.drawImage(canvas,0,0);
  const rgba=context.getImageData(0,0,overlay.width,overlay.height);
  for(let i=0;i<frame.mask.length;i++)if(frame.mask[i]) {
    rgba.data[i*4]=Math.round(rgba.data[i*4]*.72);
    rgba.data[i*4+1]=Math.round(rgba.data[i*4+1]*.72+200*.28);
    rgba.data[i*4+2]=Math.round(rgba.data[i*4+2]*.72+155*.28);
  }
  context.putImageData(rgba,0,0);
  const strong=frame.keypoints.map(point=>point.insideImage&&Number.isFinite(point.response)&&point.response>=.4);
  context.lineWidth=Math.max(1.5,overlay.width/480);
  context.strokeStyle='#ffce5b';
  for(const [a,b] of AP10K_LINKS) {
    if(!strong[a]||!strong[b])continue;
    context.beginPath();context.moveTo(frame.keypoints[a].x,frame.keypoints[a].y);
    context.lineTo(frame.keypoints[b].x,frame.keypoints[b].y);context.stroke();
  }
  const radius=Math.max(2.5,overlay.width/220);
  for(let i=0;i<frame.keypoints.length;i++)if(strong[i]) {
    const point=frame.keypoints[i];context.beginPath();context.arc(point.x,point.y,radius,0,Math.PI*2);
    context.fillStyle='#fff4bf';context.fill();context.strokeStyle='#664713';context.stroke();
  }
  context.strokeStyle='#68e2ff';context.fillStyle='#073647';
  context.lineWidth=Math.max(2,overlay.width/360);
  context.font=`600 ${Math.max(12,Math.round(overlay.width/45))}px sans-serif`;
  for(const marker of frame.markers) {
    if(marker.id!==137||marker.corners.length!==4)continue;
    context.beginPath();marker.corners.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));
    context.closePath();context.stroke();
    const {x,y}=marker.corners[0];context.fillRect(x,y-21,95,22);
    context.fillStyle='#baf0ff';context.fillText('Reference 137',x+4,y-5);context.fillStyle='#073647';
  }
  const result=overlay.toDataURL('image/jpeg',.88);
  overlay.width=overlay.height=1;
  return result;
}
async function scanCanvas(canvas:HTMLCanvasElement,models:Models,progress:(text:string)=>void,
  label:string,signal?:AbortSignal,timeSeconds?:number):Promise<{frame:ScannedFrame;view:ViewAnalysis}> {
  progress(`${label}: finding your pet…`);
  await yieldFrame(signal);
  const segmentation=await models.segmenter.segment(canvas);
  checkAbort(signal);
  const components=largestPetComponent(originalPetMask(segmentation),canvas.width,canvas.height);
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('Image processing is unavailable in this browser.');
  const imageData=context.getImageData(0,0,canvas.width,canvas.height);
  const warnings:string[]=[];
  if(components.meaningfulComponents>1)warnings.push('Separate pet-shaped regions were detected; the body may be obstructed or more than one pet may be present.');
  if(components.touchesImageEdge)warnings.push('The detected pet touches the edge of the image. Include the entire body.');
  const totalSpecies=segmentation.dogPixels+segmentation.catPixels;
  if(totalSpecies&&Math.min(segmentation.dogPixels,segmentation.catPixels)/totalSpecies>.1)
    warnings.push('The model gives mixed dog and cat labels in this frame.');
  progress(`${label}: locating body landmarks and the size reference…`);
  await yieldFrame(signal);
  const markers=new AR.Detector().detect(imageData).filter(marker=>marker.id===137);
  checkAbort(signal);
  let keypoints:ScanFrame['keypoints']=[];
  const enoughPet=components.petPixels>=Math.max(48,canvas.width*canvas.height*.003);
  if(components.bounds&&enoughPet) {
    const bounds=components.bounds;
    const pose=await inferAnimalPose({ort,session:models.pose,imageData,bbox:[bounds.left,bounds.top,bounds.right,bounds.bottom]});
    checkAbort(signal);keypoints=pose.keypoints;
  } else warnings.push('A clear pet outline could not be detected in this frame.');
  const frame:ScannedFrame={width:canvas.width,height:canvas.height,mask:components.mask,keypoints,markers,
    touchesImageEdge:components.touchesImageEdge,previewUrl:canvas.toDataURL('image/jpeg',.88),overlayUrl:'',
    timeSeconds,petPixels:components.petPixels,dogPixels:segmentation.dogPixels,catPixels:segmentation.catPixels,
    componentCount:components.componentCount,meaningfulComponents:components.meaningfulComponents,warnings};
  let view=analyzeView(frame);
  if(!enoughPet||components.meaningfulComponents>1) {
    view={view:'unknown',reason:!enoughPet?'A clear pet outline could not be detected.':
      'Separate pet-shaped regions were detected. Use one unobstructed pet in the frame.',
      calibrated:view.calibrated,pixelsPerCm:view.pixelsPerCm,quality:0};
  }
  frame.overlayUrl=overlayFrame(canvas,frame);
  checkAbort(signal);
  return {frame,view};
}

/** Runs real local models on a photo or up to five automatically sampled video frames. */
export async function scanPetMedia(options:ScanMediaOptions):Promise<ScanMediaResult> {
  const {url,kind,asset,onProgress,signal}=options;
  checkAbort(signal);
  const progress=(text:string)=>{checkAbort(signal);onProgress(text);};
  const job=scanQueue.catch(()=>{}).then(async()=>{
    checkAbort(signal);
    progress('Loading the on-device scan models…');
    const models=await waitAbortable(loadModels(asset),signal);
    checkAbort(signal);
    const frames:ScannedFrame[]=[],viewResults:ViewAnalysis[]=[];
    if(kind==='image') {
      progress('Opening your photo…');
      const canvas=await decodePhoto(url,signal);
      try {
        const scanned=await scanCanvas(canvas,models,progress,'Photo',signal);
        frames.push(scanned.frame);viewResults.push(scanned.view);
      } finally {canvas.width=canvas.height=1;}
    } else {
      const video=document.createElement('video');
      video.preload='auto';video.muted=true;video.playsInline=true;
      try {
        progress('Opening your video and selecting frames…');
        await videoEvent(video,'loadedmetadata',()=>{video.src=url;video.load();},signal,20000);
        const duration=video.duration;
        if(!Number.isFinite(duration)||duration<=0||!video.videoWidth||!video.videoHeight)
          throw new Error('The video duration could not be read. Try a shorter MP4 video or clear photos.');
        const times=Array.from(new Set([.05,.275,.5,.725,.95].map(ratio=>Math.round(duration*ratio*1000)/1000)))
          .map(time=>Math.min(Math.max(0,duration-.001),time));
        const frameErrors:string[]=[];
        for(let i=0;i<times.length;i++) {
          checkAbort(signal);
          let canvas:HTMLCanvasElement;
          try {canvas=await seekVideo(video,times[i],signal);}
          catch(error) {if(isAbort(error))throw error;frameErrors.push(error instanceof Error?error.message:'A video frame could not be decoded.');continue;}
          try {
            const scanned=await scanCanvas(canvas,models,progress,`Frame ${i+1} of ${times.length}`,signal,times[i]);
            frames.push(scanned.frame);viewResults.push(scanned.view);
          } finally {canvas.width=canvas.height=1;}
        }
        if(!frames.length)throw new Error(frameErrors[0]||'No usable video frame could be opened. Try clear photos instead.');
        if(frameErrors.length)frames[0].warnings.push(`${frameErrors.length} video frames could not be decoded; only the displayed frames were analyzed.`);
      } finally {video.pause();video.removeAttribute('src');video.load();}
    }
    checkAbort(signal);
    progress('Checking whether the views support physical measurements…');
    await yieldFrame(signal);
    const result=combineViews(viewResults);
    checkAbort(signal);
    return {frames,viewResults,result,frameCount:frames.length};
  });
  scanQueue=job.then(()=>{},()=>{});
  return waitAbortable(job,signal);
}
