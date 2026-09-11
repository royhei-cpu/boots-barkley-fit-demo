import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeCostumePlacement,chooseTryOnFrame,createHeadOcclusionAlpha} from '../../lib/try-on/placement.ts';
import type {PlacementFrame} from '../../lib/try-on/placement.ts';
function fixture():PlacementFrame{
  const width=240,height=180,mask=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if((x>=30&&x<=160&&y>=60&&y<=130)||Math.hypot((x-180)/30,(y-65)/40)<1)mask[y*width+x]=1;
  const point=(name:string,x:number,y:number)=>({name,x,y,response:.9,insideImage:true});
  return {width,height,mask,keypoints:[point('neck',150,65),point('root_of_tail',40,65),point('left_shoulder',146,105),point('right_shoulder',145,115),point('left_hip',60,110),point('right_hip',70,105),point('left_eye',175,55),point('right_eye',190,55),point('nose',185,76)]};
}
test('Neck and tail orient body from rear-left to front-right and keep it on body',()=>{
  const p=computeCostumePlacement(fixture());assert.equal(p.usable,true);assert.equal(p.source,'pose');
  assert.ok(p.body.xAxis.x>.99);assert.ok(p.body.yAxis.y>.99);assert.ok(p.body.width>90&&p.body.width<110);assert.ok(p.body.height>40&&p.body.height<80);
});
test('Mirroring the pet mirrors garment placement, without changing photo orientation',()=>{
  const f=fixture(),g={...f,mask:new Uint8Array(f.mask.length),keypoints:f.keypoints.map(p=>({...p,x:f.width-1-p.x}))};
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)g.mask[y*f.width+f.width-1-x]=f.mask[y*f.width+x];
  const a=computeCostumePlacement(f),b=computeCostumePlacement(g);
  assert.ok(Math.abs(a.body.width-b.body.width)<.01);assert.ok(b.body.xAxis.x<-.99);assert.ok(b.body.yAxis.y>.99);
  assert.ok(Math.abs(b.body.origin.x-(f.width-1-a.body.origin.x))<.01);
});
test('Head occlusion restores actual face pixels but not background or torso',()=>{
  const f=fixture(),p=computeCostumePlacement(f),alpha=createHeadOcclusionAlpha(f,p);
  assert.equal(alpha[76*f.width+185],255);assert.equal(alpha[55*f.width+175],255);
  assert.equal(alpha[90*f.width+70],0);assert.equal(alpha[5*f.width+235],0);
});
test('No mask gives no placement; uncertain pose gets explicit silhouette fallback',()=>{
  const f=fixture();assert.equal(computeCostumePlacement({...f,mask:new Uint8Array(f.mask.length)}).usable,false);
  const fallback=computeCostumePlacement({...f,keypoints:[]});assert.equal(fallback.usable,true);assert.equal(fallback.source,'silhouette');assert.ok(fallback.warnings.some(x=>x.includes('uncertain')));
});
test('Frame selection keeps background and exact geometry together',()=>{
  const f=fixture(),fallback={...f,keypoints:[],previewUrl:'uncertain'},clear={...f,previewUrl:'clear'};
  const chosen=chooseTryOnFrame([fallback,clear]);assert.equal(chosen?.index,1);assert.equal(chosen?.frame,clear);
  assert.equal(chooseTryOnFrame([]),null);
});

test('A degenerate full-image mask cannot place a costume',()=>{const f=fixture();assert.equal(computeCostumePlacement({...f,mask:new Uint8Array(f.mask.length).fill(1)}).usable,false);});
