import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePetSize,estimatePetFrames,type ApproximateFrame,type SizePrior} from '../../lib/scan/approximate-estimator.ts';
const prior:SizePrior={accepted:true,group:'small',label:'Small build',species:'dog'};
function rect(f:ApproximateFrame,x1:number,y1:number,x2:number,y2:number,value=1){for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)f.mask[y*f.width+x]=value;}
function fixture(depth=120):ApproximateFrame{
 const f:ApproximateFrame={width:640,height:480,mask:new Uint8Array(640*480),keypoints:[],touchesImageEdge:false,meaningfulComponents:1};
 rect(f,160,200,400,200+depth);rect(f,400,210,450,270);rect(f,445,215,495,265);
 const p=(name:string,x:number,y:number)=>({name,x,y,response:.95,insideImage:true});
 f.keypoints=[p('neck',415,240),p('root_of_tail',180,240),p('nose',475,240),p('left_shoulder',370,255),p('right_shoulder',373,270),p('left_eye',450,230),p('right_eye',455,231)];return f;
}
function resize(f:ApproximateFrame,scale:number):ApproximateFrame{
 const w=f.width*scale,h=f.height*scale,mask=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[y*w+x]=f.mask[Math.floor(y/scale)*f.width+Math.floor(x/scale)];
 return {...f,width:w,height:h,mask,keypoints:f.keypoints.map(p=>({...p,x:p.x*scale,y:p.y*scale}))};
}
function crop(f:ApproximateFrame,left:number,top:number,width:number,height:number):ApproximateFrame{
 const mask=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)mask[y*width+x]=f.mask[(y+top)*f.width+x+left];
 return {...f,width,height,mask,keypoints:f.keypoints.map(p=>({...p,x:p.x-left,y:p.y-top}))};
}
test('a real detected silhouette plus accepted prior returns only openly approximate whole inches',()=>{
 const r=estimatePetSize([fixture()],prior);assert.equal(r.status,'ready-approximate');assert.equal(r.method?.kind,'assumed-scale');assert.equal(r.method?.shapeUsed,true);
 assert.deepEqual(r.measurements,{chest:20,neck:11,back:14,head:0});
 assert.ok(Object.values(r.measurements!).every(Number.isInteger));assert.match(r.message,/assumed|rough/i);assert.equal('confidence' in r,false);
});
test('resizing unscaled pixels cannot enlarge the physical estimate',()=>{
 const f=fixture(),a=estimatePetSize([f],prior),b=estimatePetSize([resize(f,2)],prior);
 assert.deepEqual(a.measurements,b.measurements);assert.equal(b.method?.shapeUsed,true);
});
test('cropping empty margins preserves proportions and estimates',()=>{
 const f=fixture();assert.deepEqual(estimatePetSize([f],prior).measurements,estimatePetSize([crop(f,100,100,430,300)],prior).measurements);
});
test('observed shape affects rough values within the same size prior',()=>{
 const thin=estimatePetSize([fixture(100)],prior),deep=estimatePetSize([fixture(160)],prior);
 assert.equal(thin.method?.shapeUsed,true);assert.equal(deep.method?.shapeUsed,true);
 assert.ok(deep.measurements!.chest>thin.measurements!.chest);assert.notDeepEqual(thin.measurements,deep.measurements);
});
test('accepted group differences produce different assumed sizes, never sample identity defaults',()=>{
 const toy=estimatePetSize([fixture()],{...prior,group:'toy',label:'Toy build'}),large=estimatePetSize([fixture()],{...prior,group:'large',label:'Large build'});
 assert.ok(large.measurements!.back>toy.measurements!.back);assert.ok(large.measurements!.chest>toy.measurements!.chest);
});
test('accepted adjacent-group ambiguity blends explicit priors',()=>{
 const f=fixture();f.touchesImageEdge=true;
 const a=estimatePetSize([f],prior),b=estimatePetSize([f],{...prior,group:'medium'});
 const mixed=estimatePetSize([f],{...prior,label:'Small to medium build',groupWeights:{small:.5,medium:.5}});
 assert.equal(mixed.status,'ready-approximate');assert.ok(mixed.measurements!.chest>a.measurements!.chest);assert.ok(mixed.measurements!.chest<b.measurements!.chest);
 assert.equal(mixed.method?.shapeUsed,false);assert.deepEqual(mixed.method?.groupWeights,{small:.5,medium:.5});
});
test('poor outline or fragmented gate-like silhouette uses transparent prior-only fallback',()=>{
 const f=fixture();f.meaningfulComponents=3;const r=estimatePetSize([f],prior);
 assert.equal(r.status,'ready-approximate');assert.equal(r.method?.shapeUsed,false);assert.deepEqual(r.method?.parts,{chest:'group-prior',neck:'group-prior',back:'group-prior'});assert.match(r.message,/typical-size guesses/);
 const g=fixture();rect(g,325,245,375,251,0);assert.equal(estimatePetSize([g],prior).method?.shapeUsed,false);
});
test('tail in background cannot contribute false body geometry',()=>{
 const f=fixture();f.keypoints.find(p=>p.name==='root_of_tail')!.x=100;
 const r=estimatePetSize([f],prior);assert.equal(r.method?.shapeUsed,false);assert.equal(r.method?.parts.back,'group-prior');
});
test('no accepted classification, unknown species or mixed species stays blank',()=>{
 for(const p of [{...prior,accepted:false},{...prior,group:null},{...prior,species:'unknown' as const},{...prior,groupWeights:{small:.5,cat:.5}}]){
  const r=estimatePetSize([fixture()],p);assert.equal(r.status,'needs-clear-pet');assert.equal(r.measurements,undefined);
 }
});
test('no pet, corrupt mask, invalid numbers and inference failure cannot supply dimensions',()=>{
 const empty=fixture();empty.mask.fill(0);
 const corrupt=fixture();corrupt.mask=new Uint8Array(5);
 const failed=fixture();failed.inferenceSucceeded=false;
 const full=fixture();full.mask.fill(1);
 for(const f of [empty,corrupt,failed,full])assert.equal(estimatePetSize([f],prior).measurements,undefined);
 assert.equal(estimatePetSize([],prior).measurements,undefined);
 assert.equal(estimatePetSize([fixture()],{...prior,groupWeights:{small:NaN}}).measurements,undefined);
});
test('low or missing pose evidence uses a stated group guess, not invented anatomy',()=>{
 const f=fixture();f.keypoints=[];const r=estimatePetSize([f],prior);
 assert.equal(r.status,'ready-approximate');assert.equal(r.method?.shapeUsed,false);assert.equal(r.method?.shapeFrames,0);
});
test('disagreeing valid video proportions fall back to the group instead of selecting a convenient frame',()=>{
 const r=estimatePetSize([fixture(100),fixture(160)],prior);assert.equal(r.status,'ready-approximate');assert.equal(r.method?.shapeUsed,false);assert.match(r.method!.warnings.join(' '),/varied between frames/);
});
test('cat group never mixes dog priors and keeps unknown head size empty',()=>{
 const f=fixture();f.keypoints=[];
 const r=estimatePetSize([f],{accepted:true,species:'cat',group:'cat',label:'Cat build'});
 assert.equal(r.status,'ready-approximate');assert.deepEqual(r.measurements,{chest:14,neck:9,back:14,head:0});
 assert.equal(estimatePetSize([f],{...prior,species:'cat'}).measurements,undefined);
});

test('explicitly accepted broad group ambiguity produces a disclosed blended guess',()=>{
 const f=fixture();f.keypoints=[];const r=estimatePetSize([f],{...prior,groupWeights:{toy:.5,giant:.5},uncertainSize:true});
 assert.equal(r.status,'ready-approximate');assert.match(r.method!.warnings.join(' '),/blended guess/);
 assert.deepEqual(r.measurements,{chest:27,neck:17,back:19,head:0});
});
test('video aggregation uses each frame own prior and robust medians, skipping unsupported frames',()=>{
 const a={...fixture(),appearance:{...prior,group:'toy' as const}},b={...fixture(),appearance:prior},c={...fixture(),appearance:{...prior,group:'giant' as const}},bad={...fixture(),appearance:{...prior,accepted:false}};
 const r=estimatePetFrames([a,b,c,bad]);assert.equal(r.status,'ready-approximate');assert.equal(r.method?.usableFrames,3);
 assert.deepEqual(r.measurements,estimatePetSize([b],prior).measurements);assert.match(r.method!.warnings.join(' '),/excluded/);
});
test('repeated exact frames cannot dominate the video aggregate',()=>{
 const a={...fixture(),previewUrl:'same-local-pixels',appearance:prior},b={...fixture(),previewUrl:'same-local-pixels',appearance:prior};
 assert.equal(estimatePetFrames([a,a,b]).method?.usableFrames,1);
});
test('mixed accepted species and missing classifier outputs leave video measurements blank',()=>{
 const a={...fixture(),appearance:prior},b={...fixture(),appearance:{...prior,species:'cat' as const,group:'cat' as const}};
 assert.equal(estimatePetFrames([a,b]).status,'needs-clear-pet');assert.equal(estimatePetFrames([fixture()]).measurements,undefined);
});
