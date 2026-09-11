/** Pixel geometry for an illustrative 2D costume overlay, never physical fit. */
export type Point={x:number;y:number};
export type PosePoint=Point&{name:string;response:number;insideImage:boolean};
export type PlacementFrame={width:number;height:number;mask:Uint8Array;keypoints:PosePoint[];touchesImageEdge?:boolean;previewUrl?:string};
export type HeadPlacement={center:Point;xAxis:Point;yAxis:Point;radiusX:number;radiusY:number;source:'eyes-nose'|'nose-neck'};
export type CostumePlacement={
  usable:boolean;source:'pose'|'silhouette';
  body:{origin:Point;xAxis:Point;yAxis:Point;width:number;height:number;angle:number;matrix:[number,number,number,number,number,number]};
  head:HeadPlacement|null;
  /** Placement ranking heuristic, not probability or detection accuracy. */
  score:number;warnings:string[];
};
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const mul=(a:Point,b:number):Point=>({x:a.x*b,y:a.y*b});
const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const length=(a:Point)=>Math.hypot(a.x,a.y);
const unit=(a:Point)=>mul(a,1/Math.max(length(a),1e-6));
const average=(points:Point[]):Point=>mul(points.reduce(add,{x:0,y:0}),1/points.length);
function quantile(xs:number[],q:number):number {const sorted=xs.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(q*(sorted.length-1)))];}
function getPoint(frame:PlacementFrame,name:string):PosePoint|undefined {
  return frame.keypoints.find(p=>p.name===name&&p.insideImage&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.response>=.35&&p.x>=0&&p.y>=0&&p.x<frame.width&&p.y<frame.height);
}
function onPet(frame:PlacementFrame,p:Point,tolerance=3):boolean {
  for(let dy=-tolerance;dy<=tolerance;dy++)for(let dx=-tolerance;dx<=tolerance;dx++){
    const x=Math.round(p.x)+dx,y=Math.round(p.y)+dy;
    if(x>=0&&x<frame.width&&y>=0&&y<frame.height&&frame.mask[y*frame.width+x])return true;
  }
  return false;
}
function headPlacement(frame:PlacementFrame):HeadPlacement|null {
  const left=getPoint(frame,'left_eye'),right=getPoint(frame,'right_eye'),nose=getPoint(frame,'nose'),neck=getPoint(frame,'neck');
  // A thin gate or small segmentation hole may fall exactly over the nose.
  // Nearby observed pet pixels support visual anchoring; this is not anatomy recovery.
  const tolerance=Math.max(3,Math.ceil(Math.min(frame.width,frame.height)*.02));
  if(left&&right&&nose&&onPet(frame,nose,tolerance)){
    const eyeMid=average([left,right]),eyeWidth=length(sub(left,right)),muzzle=length(sub(nose,eyeMid));
    if(eyeWidth>4&&muzzle>3){
      let xAxis=unit(sub(left,right));if(xAxis.x<0)xAxis=mul(xAxis,-1);
      let yAxis={x:-xAxis.y,y:xAxis.x};if(dot(sub(nose,eyeMid),yAxis)<0)yAxis=mul(yAxis,-1);
      return {center:add(eyeMid,mul(yAxis,muzzle*.25)),xAxis,yAxis,radiusX:Math.max(eyeWidth*1.4,muzzle*.7),radiusY:Math.max(eyeWidth*1.15,muzzle*1.45),source:'eyes-nose'};
    }
  }
  if(nose&&neck&&onPet(frame,nose,tolerance)&&onPet(frame,neck,tolerance)){
    const distance=length(sub(nose,neck)),xAxis=unit(sub(nose,neck));
    if(distance>5)return {center:add(neck,mul(sub(nose,neck),.65)),xAxis,yAxis:{x:-xAxis.y,y:xAxis.x},radiusX:distance*.7,radiusY:distance*.55,source:'nose-neck'};
  }
  return null;
}
/** Garment coordinates: rear-left=(0,0), front-right=(1,0), belly=(v=1).
 * Apply body.matrix directly using CanvasRenderingContext2D.setTransform.
 * A left-facing dog naturally has a mirrored matrix; never mirror its photo.
 */
export function computeCostumePlacement(frame:PlacementFrame):CostumePlacement {
  const empty:CostumePlacement={usable:false,source:'silhouette',body:{origin:{x:0,y:0},xAxis:{x:1,y:0},yAxis:{x:0,y:1},width:0,height:0,angle:0,matrix:[0,0,0,0,0,0]},head:null,score:0,warnings:['A visible pet outline is needed for automatic placement.']};
  const {width,height,mask}=frame;if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||mask.length!==width*height)return empty;
  const points:Point[]=[];let count=0,minX=width,minY=height,maxX=0,maxY=0;
  const step=Math.max(1,Math.ceil(Math.max(width,height)/720));
  for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step)if(mask[y*width+x]){points.push({x,y});count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(count*step*step>width*height*.97||count<30||count*step*step<width*height*.003||maxX-minX<10||maxY-minY<10)return empty;
  const head=headPlacement(frame),neck=getPoint(frame,'neck'),tail=getPoint(frame,'root_of_tail');
  const tolerance=Math.max(2,Math.round(Math.min(width,height)*.01));
  let source:'pose'|'silhouette'='silhouette',u:Point={x:1,y:0},start:Point=average(points),span=0;
  const warnings=['Illustrative 2D placement. It does not simulate garment fit or coverage.'];
  const diagonal=Math.hypot(maxX-minX,maxY-minY);
  if(neck&&tail&&onPet(frame,neck,tolerance)&&onPet(frame,tail,tolerance)&&length(sub(neck,tail))>diagonal*.18){
    source='pose';u=unit(sub(neck,tail));span=length(sub(neck,tail));start=tail;
  }else{
    // PCA is only a visual fallback. Orient toward detected face when available.
    let xx=0,xy=0,yy=0;for(const p of points){const d=sub(p,start);xx+=d.x*d.x;xy+=d.x*d.y;yy+=d.y*d.y;}
    const theta=.5*Math.atan2(2*xy,xx-yy);u={x:Math.cos(theta),y:Math.sin(theta)};
    if(head&&dot(sub(head.center,start),u)<0)u=mul(u,-1);
    const offsets=points.map(p=>dot(sub(p,start),u)),low=quantile(offsets,.08),high=quantile(offsets,.82);
    start=add(start,mul(u,low));span=high-low;
    warnings.push('Body landmarks are uncertain; placement follows the visible outline and may need adjustment.');
  }
  let v={x:-u.y,y:u.x};
  const lowerPoints=['left_shoulder','right_shoulder','left_hip','right_hip'].map(n=>getPoint(frame,n)).filter((p):p is PosePoint=>!!p&&onPet(frame,p,tolerance));
  if(source==='pose'&&lowerPoints.length){if(dot(sub(average(lowerPoints),start),v)<0)v=mul(v,-1);}
  else if(v.y<0)v=mul(v,-1);
  // Sample the middle of the actual visible torso, excluding most face and tail.
  // Quantiles tolerate small gate/mask holes for illustration, not measurement.
  const sectionPoints=points.filter(p=>{const t=dot(sub(p,start),u)/span;return t>=.18&&t<=.74;});
  if(sectionPoints.length<15||span<10)return {...empty,head};
  const depths=sectionPoints.map(p=>dot(sub(p,start),v));
  const top=quantile(depths,.04),bottom=quantile(depths,.88);
  const bodyWidth=span*.91,bodyHeight=bottom-top;
  if(bodyHeight<8||!Number.isFinite(bodyHeight))return {...empty,head};
  const origin=add(add(start,mul(u,span*.035)),mul(v,top));
  const matrix:[number,number,number,number,number,number]=[u.x*bodyWidth,u.y*bodyWidth,v.x*bodyHeight,v.y*bodyHeight,origin.x,origin.y];
  const limbReliability=Math.min(1,lowerPoints.length/3),poseReliability=source==='pose'?Math.min(1,Math.min(neck!.response,tail!.response)):0;
  const sideCoverage=Math.min(1,span/diagonal);
  let score=(source==='pose'?.35:.1)+.25*poseReliability+.2*sideCoverage+.1*limbReliability+(head?.source==='eyes-nose'?.1:0);
  if(frame.touchesImageEdge){score*=.8;warnings.push('Part of the outline touches the image edge.');}
  if(!head)warnings.push('The face position is unclear; check that the costume does not cover it.');
  return {usable:true,source,body:{origin,xAxis:u,yAxis:v,width:bodyWidth,height:bodyHeight,angle:Math.atan2(u.y,u.x),matrix},head,score,warnings};
}

/** Select EXACT same scan frame for the background and its geometry. */
export function chooseTryOnFrame<T extends PlacementFrame>(frames:T[]):{frame:T;index:number;placement:CostumePlacement}|null {
  let best:{frame:T;index:number;placement:CostumePlacement}|null=null;
  frames.forEach((frame,index)=>{const placement=computeCostumePlacement(frame);if(placement.usable&&(!best||placement.score>best.placement.score))best={frame,index,placement};});
  return best;
}

/** Alpha (one byte/pixel) for restoring original head pixels OVER a body costume.
 * The original pet mask prevents pasting surrounding background over the garment.
 * Do not use for headwear: its face opening should instead use head placement.
 */
export function createHeadOcclusionAlpha(frame:PlacementFrame,placement:CostumePlacement):Uint8ClampedArray {
  const result=new Uint8ClampedArray(frame.width*frame.height);if(!placement.usable)return result;
  const head=placement.head,neck=getPoint(frame,'neck');
  const useNeckPlane=placement.source==='pose'&&neck;
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
    const i=y*frame.width+x;if(!frame.mask[i])continue;
    const p={x,y};let alpha=0;
    if(head){
      const d=sub(p,head.center),hx=dot(d,head.xAxis)/head.radiusX,hy=dot(d,head.yAxis)/head.radiusY;
      const r=Math.hypot(hx,hy);alpha=Math.max(0,Math.min(1,(1-r)*Math.min(head.radiusX,head.radiusY)/2));
    }
    if(useNeckPlane){
      const along=dot(sub(p,neck!),placement.body.xAxis)+placement.body.width*.07;
      alpha=Math.max(alpha,Math.max(0,Math.min(1,along/2)));
    }
    result[i]=Math.round(alpha*255);
  }
  return result;
}
