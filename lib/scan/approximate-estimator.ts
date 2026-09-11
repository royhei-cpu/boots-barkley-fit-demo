/**
 * Editable rough size guesses from a real pet detection and an accepted visual
 * size prior. Unscaled image pixels NEVER establish physical size here.
 */
export type SizeGroup='toy'|'small'|'medium'|'large'|'giant'|'cat';
export type SizePrior={accepted:boolean;group:SizeGroup|null;label:string;species:'dog'|'cat'|'unknown';groupWeights?:Partial<Record<SizeGroup,number>>;uncertainSize?:boolean;uncertainty?:string};
export type ApproximateFrame={
 width:number;height:number;mask:Uint8Array;
 keypoints:Array<{name:string;x:number;y:number;response:number;insideImage:boolean}>;
 touchesImageEdge?:boolean;meaningfulComponents?:number;inferenceSucceeded?:boolean;
};
type PartMethod='group-prior'|'outline-and-prior';
export type ApproximateResult={
 status:'ready-approximate'|'needs-clear-pet';message:string;
 measurements?:{chest:number;neck:number;back:number;head:number};
 method?:{kind:'assumed-scale';group:SizeGroup;label:string;shapeUsed:boolean;usableFrames:number;shapeFrames:number;
  parts:{chest:PartMethod;neck:PartMethod;back:PartMethod};
  groupWeights:Partial<Record<SizeGroup,number>>;warnings:string[]};
};
type Band={back:[number,number];chest:[number,number];neck:[number,number]};
/** Illustrative broad ADULT priors chosen for this prototype; NOT fitted population statistics. Centimeters. */
export const ILLUSTRATIVE_SIZE_BANDS:Record<SizeGroup,Band>={
 toy:{back:[18,30],chest:[25,42],neck:[16,28]},
 small:{back:[28,42],chest:[38,60],neck:[24,38]},
 medium:{back:[35,55],chest:[50,78],neck:[30,48]},
 large:{back:[45,70],chest:[65,100],neck:[38,60]},
 giant:{back:[60,85],chest:[85,125],neck:[50,78]},
 cat:{back:[25,45],chest:[25,48],neck:[18,30]},
};
const groups:SizeGroup[]=['toy','small','medium','large','giant','cat'];
const finite=(n:number)=>Number.isFinite(n);
const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
const center=(b:[number,number])=>(b[0]+b[1])/2;
const median=(a:number[])=>{const v=[...a].sort((x,y)=>x-y);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;};
type Point={x:number;y:number};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const add=(a:Point,b:Point,k=1):Point=>({x:a.x+b.x*k,y:a.y+b.y*k});
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const unit=(a:Point,b:Point):Point=>{const l=distance(a,b);return {x:(b.x-a.x)/l,y:(b.y-a.y)/l};};
const perpendicular=(v:Point):Point=>({x:-v.y,y:v.x});
const blank=(message:string):ApproximateResult=>({status:'needs-clear-pet',message});

function resolvePrior(prior:SizePrior):{weights:Partial<Record<SizeGroup,number>>;group:SizeGroup;base:{back:number;chest:number;neck:number}}|null {
 if(!prior?.accepted||!groups.includes(prior.group as SizeGroup)||!['dog','cat'].includes(prior.species))return null;
 const supplied=prior.groupWeights&&Object.keys(prior.groupWeights).length>0?prior.groupWeights:{[prior.group!]:1};
 let sum=0;const entries:Array<[SizeGroup,number]>=[];
 for(const [key,value] of Object.entries(supplied)){
  if(!groups.includes(key as SizeGroup)||typeof value!=='number'||!finite(value)||value<0)return null;
  if(value===0)continue;
  if((key==='cat')!==(prior.species==='cat'))return null;
  entries.push([key as SizeGroup,value]);sum+=value;
 }
 if(!sum||!finite(sum)||!entries.length)return null;
 const weights:Partial<Record<SizeGroup,number>>={};const base={back:0,chest:0,neck:0};
 for(const [group,value] of entries){const w=value/sum;weights[group]=w;for(const part of ['back','chest','neck'] as const)base[part]+=center(ILLUSTRATIVE_SIZE_BANDS[group][part])*w;}
 const group=[...entries].sort((a,b)=>b[1]-a[1])[0][0];
 return {weights,group,base};
}
function foreground(f:ApproximateFrame,x:number,y:number):boolean {
 const ix=Math.round(x),iy=Math.round(y);
 return ix>=0&&iy>=0&&ix<f.width&&iy<f.height&&f.mask[iy*f.width+ix]!==0;
}
function support(f:ApproximateFrame,p:Point,radius:number):boolean {
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius&&foreground(f,p.x+dx,p.y+dy))return true;
 return false;
}
function usable(f:ApproximateFrame):boolean {
 if(!f||f.inferenceSucceeded===false||!Number.isInteger(f.width)||!Number.isInteger(f.height)||f.width<32||f.height<32||!(f.mask instanceof Uint8Array)||f.mask.length!==f.width*f.height||!Array.isArray(f.keypoints))return false;
 let count=0,minX=f.width,maxX=-1,minY=f.height,maxY=-1;
 for(let i=0;i<f.mask.length;i++)if(f.mask[i]){count++;const x=i%f.width,y=Math.floor(i/f.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 // Require a substantial detected pet region; a few false-positive pixels cannot create sizes.
 return count>=Math.max(96,f.mask.length*.008)&&maxX-minX>=12&&maxY-minY>=12&&count<f.mask.length*.97;
}
function landmark(f:ApproximateFrame,name:string){
 const p=f.keypoints.find(p=>p.name===name);
 const radius=Math.max(2,Math.round(Math.min(f.width,f.height)*.004));
 return p&&p.insideImage&&finite(p.x)&&finite(p.y)&&finite(p.response)&&p.response>=.35&&p.x>=0&&p.y>=0&&p.x<f.width&&p.y<f.height&&support(f,p,radius)?p:null;
}
/** Full width of the connected foreground slice, in pixels; no hidden-body completion. */
function section(f:ApproximateFrame,anchor:Point,direction:Point):number|null {
 if(!foreground(f,anchor.x,anchor.y))return null;
 const limit=Math.ceil(Math.hypot(f.width,f.height));
 const hits:number[]=[];
 for(let d=-limit;d<=limit;d++){const p=add(anchor,direction,d);if(foreground(f,p.x,p.y))hits.push(d);}
 if(!hits.length)return null;
 const start=hits[0],end=hits[hits.length-1],span=end-start+1;
 let largestGap=0;for(let i=1;i<hits.length;i++)largestGap=Math.max(largestGap,hits[i]-hits[i-1]-1);
 // Broken silhouettes (such as bars across the animal) use only the explicit prior fallback.
 if(span<8||largestGap>Math.max(1,span*.012))return null;
 return span;
}
function stableSection(f:ApproximateFrame,anchor:Point,direction:Point,offset:Point,spacing:number):number|null {
 const spans:number[]=[];
 for(const n of [-2,-1,0,1,2]){const span=section(f,add(anchor,offset,n*spacing),direction);if(span===null)return null;spans.push(span);}
 return Math.max(...spans)/Math.min(...spans)<=1.25?median(spans):null;
}
type Shape={chestRatio:number;neckRatio:number|null};
function shape(f:ApproximateFrame):Shape|null {
 if(f.touchesImageEdge||(f.meaningfulComponents??1)>1)return null;
 const neck=landmark(f,'neck'),tail=landmark(f,'root_of_tail');
 if(!neck||!tail)return null;
 const torso=distance(neck,tail);
 if(torso<Math.max(16,Math.min(f.width,f.height)*.12))return null;
 const axis=unit(tail,neck),across=perpendicular(axis);
 const left=landmark(f,'left_shoulder'),right=landmark(f,'right_shoulder');
 if(!left&&!right)return null;
 if(left&&right&&distance(left,right)>torso*.45)return null; // Foreshortened/front-facing torso.
 const shoulder=left&&right?{x:(left.x+right.x)/2,y:(left.y+right.y)/2}:(left??right)!;
 const shoulderPosition=dot({x:shoulder.x-tail.x,y:shoulder.y-tail.y},axis)/torso;
 if(shoulderPosition<.45||shoulderPosition>1.25)return null;
 const chest=stableSection(f,add(shoulder,axis,-torso*.10),across,axis,Math.max(1,torso*.012));
 if(chest===null||chest/torso<.18||chest/torso>.85)return null;
 let neckRatio:number|null=null;
 const nose=landmark(f,'nose'),le=landmark(f,'left_eye'),re=landmark(f,'right_eye');
 if(nose&&distance(nose,neck)>8){
  const headAxis=unit(neck,nose),headAligned=dot(axis,headAxis)>.80;
  const turned=le&&re&&distance(le,re)>distance(nose,neck)*.30;
  if(headAligned&&!turned){
   const n=stableSection(f,neck,perpendicular(headAxis),headAxis,Math.max(1,distance(nose,neck)*.015));
   if(n!==null&&n/chest>.20&&n/chest<.90)neckRatio=n/torso;
  }
 }
 return {chestRatio:chest/torso,neckRatio};
}

export function estimatePetSize(frames:ApproximateFrame[],prior:SizePrior):ApproximateResult {
 const resolved=resolvePrior(prior);
 if(!resolved)return blank('The scan could not suggest a reliable pet size group. Try a clearer photo of one pet; measurements have been left blank.');
 const accepted=Array.isArray(frames)?frames.filter(usable):[];
 if(!accepted.length)return blank('A clear pet could not be detected, so measurements have been left blank. Try another photo or video.');
 const shapes=accepted.map(shape).filter((s):s is Shape=>s!==null);
 const warnings=['These are rough guesses from an assumed adult size range, not physical measurements from the image.','Young pets, mixed breeds, thick fur and unusual body proportions may differ substantially.'];
 if(Object.keys(resolved.weights).length>1||prior.uncertainSize)warnings.push('The appearance model suggested several size groups; the assumed size is a blended guess and may be substantially wrong.');
 const base=resolved.base;
 let back=base.back,chest=base.chest,neck=base.neck;
 let chestUsed=false,neckUsed=false;
 // A fixed ellipse width/depth ratio is an explicit anatomical assumption, not a second measured view.
 const circumferencePerDepth=2.836;
 if(shapes.length){
  const chestRatios=shapes.map(s=>s.chestRatio);
  if(Math.max(...chestRatios)/Math.min(...chestRatios)<=1.25){
   const ratio=median(chestRatios),expected=base.chest/(circumferencePerDepth*base.back);
   // Allow modest body-proportion adjustment; keep the scale anchored in the stated prior.
   back=base.back*clamp(1+(expected/ratio-1)*.25,.90,1.15);
   const outlineChest=circumferencePerDepth*ratio*back;
   chest=base.chest*.55+clamp(outlineChest,base.chest*.70,base.chest*1.35)*.45;
   chestUsed=true;
   const neckRatios=shapes.map(s=>s.neckRatio).filter((v):v is number=>v!==null);
   if(neckRatios.length&&Math.max(...neckRatios)/Math.min(...neckRatios)<=1.25){
    const outlineNeck=circumferencePerDepth*median(neckRatios)*back;
    neck=base.neck*.65+clamp(outlineNeck,base.neck*.75,base.neck*1.30)*.35;neckUsed=true;
   }
  }else warnings.push('Body proportions varied between frames; the estimates use the suggested size group only.');
 }
 if(!chestUsed)warnings.push('The body outline was not reliable enough to adjust the size prior.');
 if(!neckUsed)warnings.push('Neck size uses the group prior because the neck outline was unclear.');
 const label=typeof prior.label==='string'&&prior.label.trim()?prior.label.trim():`${resolved.group} build`;
 const measurements={chest:Math.round(chest/2.54),neck:Math.round(neck/2.54),back:Math.round(back/2.54),head:0};
 if(![measurements.chest,measurements.neck,measurements.back].every(v=>finite(v)&&v>=3&&v<=65)||measurements.neck>=measurements.chest)return blank('The rough size calculation was inconsistent. Try a clearer photo; measurements have been left blank.');
 return {status:'ready-approximate',message:chestUsed?
  'Rough estimates use your pet’s visible proportions and an assumed size range. Review and edit them; the image does not provide real-world scale.':
  'The pet’s outline was unclear, so these are typical-size guesses from the suggested size group. Review and edit every value.',
  measurements,method:{kind:'assumed-scale',group:resolved.group,label,shapeUsed:chestUsed,usableFrames:accepted.length,shapeFrames:shapes.length,
   parts:{back:chestUsed?'outline-and-prior':'group-prior',chest:chestUsed?'outline-and-prior':'group-prior',neck:neckUsed?'outline-and-prior':'group-prior'},groupWeights:resolved.weights,warnings}};
}

/** Combine each frame's own real classifier output; no frame inherits a guessed breed. */
export type ClassifiedFrame=ApproximateFrame & {appearance?:SizePrior|null;previewUrl?:string};
export function estimatePetFrames(frames:ClassifiedFrame[]):ApproximateResult {
 if(!Array.isArray(frames)||!frames.length)return blank('No usable pet frames were available. Measurements have been left blank.');
 const seenObjects=new Set<ClassifiedFrame>(),seenPreviews=new Set<string>();
 const unique=frames.filter(frame=>{
  if(seenObjects.has(frame)||frame.previewUrl&&seenPreviews.has(frame.previewUrl))return false;
  seenObjects.add(frame);if(frame.previewUrl)seenPreviews.add(frame.previewUrl);return true;
 });
 const estimates=unique.map(frame=>({frame,result:frame.appearance?estimatePetSize([frame],frame.appearance):blank('No appearance result.')}))
  .filter(entry=>entry.result.status==='ready-approximate'&&entry.result.measurements&&entry.result.method);
 if(!estimates.length)return blank('The scan could not form a supported rough pet size guess. Try a clearer photo or video of one pet; measurements have been left blank.');
 const species=new Set(estimates.map(entry=>entry.frame.appearance!.species));
 if(species.size>1)return blank('The frames suggest different kinds of pet. Try a clearer view of one pet; measurements have been left blank.');
 const measurements={chest:0,neck:0,back:0,head:0};
 for(const part of ['chest','neck','back'] as const)measurements[part]=Math.round(median(estimates.map(e=>e.result.measurements![part])));
 const weights:Partial<Record<SizeGroup,number>>={};
 for(const {result} of estimates)for(const [group,weight] of Object.entries(result.method!.groupWeights))weights[group as SizeGroup]=(weights[group as SizeGroup]??0)+weight!/estimates.length;
 const group=Object.entries(weights).sort((a,b)=>b[1]!-a[1]!)[0][0] as SizeGroup;
 const labels=[...new Set(estimates.map(e=>e.result.method!.label))];
 const shapeUsed=estimates.some(e=>e.result.method!.shapeUsed);
 const parts={chest:'group-prior',neck:'group-prior',back:'group-prior'} as {chest:PartMethod;neck:PartMethod;back:PartMethod};
 for(const part of ['chest','neck','back'] as const)if(estimates.some(e=>e.result.method!.parts[part]==='outline-and-prior'))parts[part]='outline-and-prior';
 const warnings=[...new Set(estimates.flatMap(e=>e.result.method!.warnings))];
 if(estimates.length<unique.length)warnings.push(`${unique.length-estimates.length} frames could not support a size guess and were excluded.`);
 if(estimates.length>1)warnings.push('Values combine rough guesses across frames; repeated views do not establish physical scale or accuracy.');
 return {status:'ready-approximate',measurements,
  message:shapeUsed?'Rough estimates combine the visible body proportions with assumed size ranges. Review and edit every value.':'These are rough typical-size guesses based on the pet’s appearance. The outline was unclear; review and edit every value.',
  method:{kind:'assumed-scale',group,label:labels.length===1?labels[0]:'Appearance-based size guess across frames',shapeUsed,
   usableFrames:estimates.length,shapeFrames:estimates.reduce((sum,e)=>sum+e.result.method!.shapeFrames,0),parts,groupWeights:weights,warnings}};
}
