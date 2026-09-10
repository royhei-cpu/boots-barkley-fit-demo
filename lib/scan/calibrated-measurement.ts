/** Experimental two-view geometry. Never supplies breed or size defaults. */
export type Point = {x:number;y:number};
export type ScanFrame = {
  width:number; height:number; mask:Uint8Array;
  keypoints:Array<{name:string;x:number;y:number;response:number;insideImage:boolean}>;
  markers:Array<{id:number;corners:Point[]}>;
  touchesImageEdge:boolean;
};
export type ViewAnalysis = {
  view:'side'|'front'|'unknown'; reason:string; calibrated:boolean;
  pixelsPerCm:number|null; backCm?:number; chestDepthCm?:number;
  neckDepthCm?:number; chestWidthCm?:number; neckWidthCm?:number; quality:number;
};
export type CombineResult = {
  status:'needs-reference'|'needs-side'|'needs-front'|'needs-clear-view'|'ready';
  message:string; measurements?:{chest:number;neck:number;back:number;head:number};
};
type Vec = Point;
type Landmark = ScanFrame['keypoints'][number];
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a:Point,b:Point):Vec=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a:Vec,s:number):Vec=>({x:a.x*s,y:a.y*s});
const dot=(a:Vec,b:Vec):number=>a.x*b.x+a.y*b.y;
const length=(a:Vec):number=>Math.hypot(a.x,a.y);
const distance=(a:Point,b:Point):number=>length(sub(a,b));
const norm=(a:Vec):Vec=>mul(a,1/length(a));
const perpendicular=(a:Vec):Vec=>({x:-a.y,y:a.x});
const mid=(a:Point,b:Point):Point=>mul(add(a,b),0.5);
const clamp=(x:number,a=0,b=1):number=>Math.min(b,Math.max(a,x));
const median=(values:number[]):number=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const pointFinite=(p:Point):boolean=>Number.isFinite(p.x)&&Number.isFinite(p.y);

function reference(frame:ScanFrame):{scale:number|null;quality:number;reason:string} {
  const markers=frame.markers.filter(marker=>marker.id===137);
  if(markers.length!==1) return {scale:null,quality:0,reason:markers.length?'Keep only one 10 cm reference marker beside your pet.':'Include the complete 10 cm reference marker (ID 137) beside your pet.'};
  const c=markers[0].corners;
  if(c.length!==4||!c.every(p=>pointFinite(p)&&p.x>1&&p.y>1&&p.x<frame.width-2&&p.y<frame.height-2)) return {scale:null,quality:0,reason:'The reference marker is clipped or incomplete.'};
  const edges=c.map((p,i)=>distance(p,c[(i+1)%4]));
  const smallest=Math.min(...edges),largest=Math.max(...edges),mean=edges.reduce((a,b)=>a+b,0)/4;
  if(smallest<32) return {scale:null,quality:0,reason:'Move closer so the 10 cm marker is at least 32 pixels wide.'};
  const crosses=c.map((p,i)=>{const a=sub(c[(i+1)%4],p),b=sub(c[(i+2)%4],c[(i+1)%4]);return a.x*b.y-a.y*b.x;});
  if(!crosses.every(v=>v>0)&&!crosses.every(v=>v<0)) return {scale:null,quality:0,reason:'The reference marker corners are not a valid square.'};
  const cornerCos=c.map((p,i)=>Math.abs(dot(norm(sub(c[(i+3)%4],p)),norm(sub(c[(i+1)%4],p)))));
  const diagonalRatio=Math.max(distance(c[0],c[2]),distance(c[1],c[3]))/Math.min(distance(c[0],c[2]),distance(c[1],c[3]));
  if(largest/smallest>1.12||Math.max(...cornerCos)>0.15||diagonalRatio>1.10) return {scale:null,quality:0,reason:'Face the camera squarely with the reference marker; its tilt is too large.'};
  return {scale:mean/10,quality:clamp(1-(largest/smallest-1)*2-Math.max(...cornerCos)),reason:'10 cm reference detected; it must be in the same plane as the pet.'};
}

function landmark(frame:ScanFrame,name:string,min=0.5):Landmark|null {
  const p=frame.keypoints.find(k=>k.name===name);
  if(!p||!pointFinite(p)||!p.insideImage||p.x<0||p.y<0||p.x>=frame.width||p.y>=frame.height||!Number.isFinite(p.response)||p.response<min)return null;
  // A model's inferred hidden point cannot lengthen the pet beyond its selected mask.
  // Allow only a two-pixel boundary discrepancy from rasterization/resizing.
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=4&&foreground(frame,{x:p.x+dx,y:p.y+dy}))return p;
  return null;
}

function foreground(frame:ScanFrame,p:Point):boolean {
  const x=Math.round(p.x),y=Math.round(p.y);
  return x>=0&&y>=0&&x<frame.width&&y<frame.height&&frame.mask[y*frame.width+x]!==0;
}

/** A cross-section must be one continuous foreground run containing its anchor. */
function section(frame:ScanFrame,anchor:Point,direction:Vec):number|null {
  if(!foreground(frame,anchor))return null;
  const limit=Math.ceil(Math.hypot(frame.width,frame.height));
  const bits=new Uint8Array(limit*2+1);
  for(let i=-limit;i<=limit;i++)bits[i+limit]=foreground(frame,add(anchor,mul(direction,i)))?1:0;
  // Repair only single-pixel raster holes. Larger breaks remain grounds to abstain.
  for(let i=1;i<bits.length-1;i++)if(!bits[i]&&bits[i-1]&&bits[i+1])bits[i]=1;
  const runs:Array<[number,number]>=[];
  for(let i=0;i<bits.length;) {
    if(!bits[i]){i++;continue;}
    const start=i;while(i<bits.length&&bits[i])i++;
    runs.push([start-limit,i-1-limit]);
  }
  const main=runs.find(([a,b])=>a<=0&&b>=0);
  if(!main)return null;
  const span=main[1]-main[0]+1;
  if(span<10||runs.some(run=>run!==main&&run[1]-run[0]+1>Math.max(2,span*0.025)))return null;
  return span;
}

function stableSection(frame:ScanFrame,anchor:Point,direction:Vec,offsetAxis:Vec,spacing:number):{span:number;quality:number}|null {
  const widths=[];
  for(const n of [-2,-1,0,1,2]) {
    const span=section(frame,add(anchor,mul(offsetAxis,n*spacing)),direction);
    if(span===null)return null;
    widths.push(span);
  }
  const spread=Math.max(...widths)/Math.min(...widths);
  if(spread>1.22)return null;
  return {span:median(widths),quality:clamp(1-(spread-1)*2)};
}

/** Analyze one upright or rotated view without assuming metric depth. */
export function analyzeView(frame:ScanFrame):ViewAnalysis {
  const base:ViewAnalysis={view:'unknown',reason:'A clear full-body view is needed.',calibrated:false,pixelsPerCm:null,quality:0};
  if(!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<64||frame.height<64||frame.mask.length!==frame.width*frame.height) return {...base,reason:'The decoded image and pet outline do not have matching dimensions.'};
  const ref=reference(frame);
  base.calibrated=ref.scale!==null;base.pixelsPerCm=ref.scale;
  if(frame.touchesImageEdge)return {...base,reason:'Part of the pet is clipped. Include the entire body, paws and tail base.'};
  let count=0,minX=frame.width,minY=frame.height,maxX=0,maxY=0;
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++)if(frame.mask[y*frame.width+x]){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(count<Math.max(150,frame.width*frame.height*0.015))return {...base,reason:'The pet outline is too small or could not be detected.'};
  if(minX<2||minY<2||maxX>frame.width-3||maxY>frame.height-3)return {...base,reason:'The pet outline reaches the image edge. Retake a full-body view.'};
  const neck=landmark(frame,'neck'),leftShoulder=landmark(frame,'left_shoulder'),rightShoulder=landmark(frame,'right_shoulder');
  const nose=landmark(frame,'nose'),leftEye=landmark(frame,'left_eye'),rightEye=landmark(frame,'right_eye');
  if(!neck||!leftShoulder||!rightShoulder||!nose)return {...base,reason:'Neck and shoulder landmarks are not clear enough. Remove obstructions and keep the pet standing.'};
  const shoulderMid=mid(leftShoulder,rightShoulder),shoulderWidth=distance(leftShoulder,rightShoulder);
  const tail=landmark(frame,'root_of_tail');
  const torsoLength=tail?distance(tail,neck):0;
  const noseNeck=distance(nose,neck);
  if(noseNeck<8||shoulderWidth<2)return {...base,reason:'The pet posture is too ambiguous to measure.'};
  let view:'side'|'front'|'unknown'='unknown';
  let axis:Vec={x:0,y:0};
  if(tail&&torsoLength>40&&torsoLength>shoulderWidth*3.2) {
    axis=norm(sub(neck,tail));
    const shoulderAxisProjection=Math.abs(dot(sub(leftShoulder,rightShoulder),axis));
    const shoulderPosition=dot(sub(shoulderMid,tail),axis)/torsoLength;
    const headAlignment=dot(norm(sub(nose,neck)),axis);
    const headTurned=leftEye&&rightEye&&distance(leftEye,rightEye)>noseNeck*0.28;
    if(shoulderAxisProjection<torsoLength*0.16&&shoulderPosition>0.55&&shoulderPosition<1.12&&headAlignment>0.8&&!headTurned)view='side';
  }
  if(view==='unknown'&&leftEye&&rightEye&&shoulderWidth>20) {
    const across=norm(sub(rightShoulder,leftShoulder));
    const eyeMid=mid(leftEye,rightEye),downVector=sub(shoulderMid,eyeMid);
    if(length(downVector)>shoulderWidth*0.4) {
      const down=norm(downVector);
      const eyeAxis=norm(sub(rightEye,leftEye));
      const symmetricNose=Math.abs(dot(sub(nose,eyeMid),across))<shoulderWidth*0.12;
      const symmetricNeck=Math.abs(dot(sub(neck,shoulderMid),across))<shoulderWidth*0.15;
      const shouldersLevel=Math.abs(dot(sub(leftShoulder,rightShoulder),down))<shoulderWidth*0.16;
      const alignedEyes=Math.abs(dot(eyeAxis,across))>0.95;
      const neckAboveShoulders=dot(sub(shoulderMid,neck),down)>shoulderWidth*0.12;
      const tailCentered=!tail||Math.abs(dot(sub(tail,neck),across))<shoulderWidth*0.4;
      if(symmetricNose&&symmetricNeck&&shouldersLevel&&alignedEyes&&neckAboveShoulders&&tailCentered&&(!tail||torsoLength<shoulderWidth*1.6)) {view='front';axis=down;}
    }
  }
  if(view==='unknown')return {...base,reason:'This is an angled or unclear posture. Use a straight side view and a separate front view with the head facing forward.'};
  if(!ref.scale)return {...base,view,reason:ref.reason};
  const ppcm=ref.scale;
  const evidence=Math.min(neck.response,leftShoulder.response,rightShoulder.response,nose.response,1);
  if(view==='side'&&tail) {
    // Chest slice is behind the shoulder joints toward the tail, avoiding the forelegs.
    // This geometric placement heuristic has not been validated against tape measurements.
    const chestAnchor=add(shoulderMid,mul(axis,-torsoLength*0.10));
    const chest=stableSection(frame,chestAnchor,perpendicular(axis),axis,Math.max(1,torsoLength*0.012));
    const neckAxis=norm(sub(nose,neck));
    const neckSection=stableSection(frame,neck,perpendicular(neckAxis),neckAxis,Math.max(1,noseNeck*0.015));
    if(!chest||!neckSection)return {...base,view,reason:'The chest or neck outline is broken, obstructed or changing too sharply. Retake the side view without a gate, collar or costume.'};
    if(chest.span>torsoLength*0.9||neckSection.span>chest.span*0.92||neckSection.span<chest.span*0.2)return {...base,view,reason:'The side outline does not separate the chest and neck reliably.'};
    const quality=clamp(Math.min(evidence,tail.response,ref.quality,chest.quality,neckSection.quality));
    if(quality<0.5)return {...base,view,reason:'The side view is not clear enough for an estimate.'};
    return {...base,view,quality,backCm:torsoLength/ppcm,chestDepthCm:chest.span/ppcm,neckDepthCm:neckSection.span/ppcm,
      reason:'Experimental side-view geometry found. Reference must be in the pet body plane; physical accuracy is unvalidated.'};
  }
  const across=perpendicular(axis);
  const chest=stableSection(frame,shoulderMid,across,axis,Math.max(1,shoulderWidth*0.025));
  const neckSection=stableSection(frame,neck,across,axis,Math.max(1,shoulderWidth*0.02));
  if(!chest||!neckSection)return {...base,view,reason:'The front chest or neck outline is fragmented or obstructed. Retake a clear standing front view.'};
  if(chest.span<shoulderWidth||chest.span>shoulderWidth*2.4||neckSection.span>chest.span*0.95||neckSection.span<chest.span*0.2)return {...base,view,reason:'The front outline does not separate chest and neck reliably.'};
  const quality=clamp(Math.min(evidence,ref.quality,chest.quality,neckSection.quality));
  if(quality<0.5)return {...base,view,reason:'The front view is not clear enough for an estimate.'};
  return {...base,view,quality,chestWidthCm:chest.span/ppcm,neckWidthCm:neckSection.span/ppcm,
    reason:'Experimental front-view geometry found. Reference must be in the pet body plane; physical accuracy is unvalidated.'};
}

/** Ramanujan ellipse circumference, using full diameters from perpendicular views. */
function ellipse(depth:number,width:number):number {
  const a=depth/2,b=width/2,h=((a-b)/(a+b))**2;
  return Math.PI*(a+b)*(1+3*h/(10+Math.sqrt(4-3*h)));
}
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;

export function combineViews(views:ViewAnalysis[]):CombineResult {
  if(!views.length||!views.some(v=>v.calibrated&&positive(v.pixelsPerCm)))return {status:'needs-reference',message:'Add the printed 10 cm reference marker beside your pet in each view. Inches cannot be recovered without a known scale.'};
  const usable=views.filter(v=>v.calibrated&&positive(v.pixelsPerCm)&&Number.isFinite(v.quality)&&v.quality>=0.5);
  const sides=usable.filter(v=>v.view==='side'&&positive(v.backCm)&&positive(v.chestDepthCm)&&positive(v.neckDepthCm));
  const fronts=usable.filter(v=>v.view==='front'&&positive(v.chestWidthCm)&&positive(v.neckWidthCm));
  if(!sides.length&&!fronts.length)return {status:'needs-clear-view',message:views.find(v=>v.calibrated)?.reason??'Retake unobstructed standing side and front views.'};
  if(!sides.length)return {status:'needs-side',message:'Add a clear standing side view with the 10 cm marker in the pet body plane.'};
  if(!fronts.length)return {status:'needs-front',message:'Add a separate straight front view with the 10 cm marker in the pet body plane.'};
  // Several otherwise usable frames must agree in physical units. Selecting the
  // most convenient frame would hide unstable pose, scale or silhouette results.
  const agrees=(group:ViewAnalysis[],keys:Array<keyof ViewAnalysis>)=>keys.every(key=>{
    const values=group.map(v=>v[key]).filter(positive);
    return values.length<2||Math.max(...values)/Math.min(...values)<=1.15;
  });
  if(!agrees(sides,['backCm','chestDepthCm','neckDepthCm'])||!agrees(fronts,['chestWidthCm','neckWidthCm']))return {status:'needs-clear-view',message:'Measurements disagree between frames. Keep the pet still and the reference marker in the same body plane, then retake both views.'};
  const pairs=sides.flatMap(side=>fronts.map(front=>({side,front,quality:Math.min(side.quality,front.quality)}))).sort((a,b)=>b.quality-a.quality);
  for(const {side,front} of pairs) {
    const back=side.backCm!,chestDepth=side.chestDepthCm!,neckDepth=side.neckDepthCm!,chestWidth=front.chestWidthCm!,neckWidth=front.neckWidthCm!;
    const chestRatio=chestDepth/chestWidth,neckRatio=neckDepth/neckWidth;
    if(chestRatio<0.5||chestRatio>2||neckRatio<0.5||neckRatio>2||chestWidth>back||neckWidth>=chestWidth||neckDepth>=chestDepth)continue;
    const chest=ellipse(chestDepth,chestWidth)/2.54,neck=ellipse(neckDepth,neckWidth)/2.54,backIn=back/2.54;
    if(![chest,neck,backIn].every(v=>Number.isFinite(v)&&v>=3&&v<=65)||neck>=chest*0.95)continue;
    return {status:'ready',message:'Experimental estimates are ready to review. The two-view ellipse method is unvalidated; check with a tape before ordering.',
      measurements:{chest:Math.round(chest*10)/10,neck:Math.round(neck*10)/10,back:Math.round(backIn*10)/10,head:0}};
  }
  return {status:'needs-clear-view',message:'The side and front outlines or reference scales are inconsistent. Retake both views of the same standing pet with the marker alongside its body.'};
}
