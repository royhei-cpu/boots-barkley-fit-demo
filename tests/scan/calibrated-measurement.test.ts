import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeView,combineViews,type ScanFrame,type ViewAnalysis} from '../../lib/scan/calibrated-measurement.ts';

function frame():ScanFrame {
  return {width:640,height:480,mask:new Uint8Array(640*480),keypoints:[],touchesImageEdge:false,
    markers:[{id:137,corners:[{x:500,y:50},{x:580,y:50},{x:580,y:130},{x:500,y:130}]}]};
}
function rect(f:ScanFrame,x1:number,y1:number,x2:number,y2:number,value=1) {
  for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)f.mask[y*f.width+x]=value;
}
function point(name:string,x:number,y:number,response=0.95) {return {name,x,y,response,insideImage:true};}
function side():ScanFrame {
  const f=frame();
  rect(f,160,200,400,320);rect(f,400,210,450,270);rect(f,445,215,495,265);
  rect(f,195,320,220,380);rect(f,380,320,400,380);
  f.keypoints=[point('neck',415,240),point('root_of_tail',180,240),point('nose',475,240),
    point('left_shoulder',370,260),point('right_shoulder',373,280),point('left_eye',450,230),point('right_eye',455,231)];
  return f;
}
function front():ScanFrame {
  const f=frame();rect(f,260,230,380,380);rect(f,290,140,350,235);rect(f,280,110,360,160);
  rect(f,265,380,290,420);rect(f,350,380,375,420);
  f.keypoints=[point('neck',320,190),point('root_of_tail',320,340,0.2),point('nose',320,160),
    point('left_shoulder',280,270),point('right_shoulder',360,270),point('left_eye',305,145),point('right_eye',335,145)];
  return f;
}
test('ideal calibrated perpendicular silhouettes produce observed dimensions and ellipse estimates',()=>{
  const s=analyzeView(side()),f=analyzeView(front());
  assert.equal(s.view,'side');assert.equal(f.view,'front');assert.equal(s.calibrated,true);
  assert.equal(s.pixelsPerCm,8);assert.equal(s.backCm,235/8);
  assert.equal(s.chestDepthCm,121/8);assert.equal(s.neckDepthCm,61/8);
  assert.equal(f.chestWidthCm,121/8);assert.equal(f.neckWidthCm,61/8);
  const result=combineViews([s,f]);assert.equal(result.status,'ready');
  assert.deepEqual(result.measurements,{chest:18.7,neck:9.4,back:11.6,head:0});
});
test('without any reference, no inches can be produced even from clear geometry',()=>{
  const s=side(),f=front();s.markers=[];f.markers=[];
  const result=combineViews([analyzeView(s),analyzeView(f)]);
  assert.equal(result.status,'needs-reference');assert.equal(result.measurements,undefined);
});
test('wrong marker identifier cannot establish scale',()=>{
  const f=side();f.markers[0].id=138;assert.equal(analyzeView(f).calibrated,false);
});
test('small, perspective-distorted, crossed and duplicate reference markers abstain',()=>{
  const corners=[
    [{x:500,y:50},{x:520,y:50},{x:520,y:70},{x:500,y:70}],
    [{x:500,y:50},{x:580,y:50},{x:565,y:130},{x:510,y:130}],
    [{x:500,y:50},{x:580,y:130},{x:580,y:50},{x:500,y:130}],
  ];
  for(const c of corners){const f=side();f.markers[0].corners=c;assert.equal(analyzeView(f).calibrated,false);}
  const f=side();f.markers.push(f.markers[0]);assert.equal(analyzeView(f).calibrated,false);
});
test('clipped body and actual edge-touching mask suppress all estimates',()=>{
  const f=side();f.touchesImageEdge=true;assert.equal(analyzeView(f).backCm,undefined);
  f.touchesImageEdge=false;rect(f,0,200,160,210);assert.equal(analyzeView(f).backCm,undefined);
});
test('gate-sized breaks through a chest cross-section cause abstention',()=>{
  const f=side();rect(f,325,246,375,250,0);
  const result=analyzeView(f);assert.equal(result.view,'side');assert.equal(result.chestDepthCm,undefined);
  assert.match(result.reason,/broken|obstructed/);
});
test('low-response required anchors and out-of-image anchors cannot manufacture dimensions',()=>{
  const f=side();f.keypoints.find(p=>p.name==='neck')!.response=0.1;assert.equal(analyzeView(f).view,'unknown');
  const g=side();g.keypoints.find(p=>p.name==='neck')!.insideImage=false;assert.equal(analyzeView(g).view,'unknown');
});
test('head turned toward the camera is not accepted as aligned side geometry',()=>{
  const f=side();f.keypoints.find(p=>p.name==='right_eye')!.x=485;
  assert.equal(analyzeView(f).view,'unknown');
});
test('oblique shoulder spread fails view classification',()=>{
  const f=side();f.keypoints.find(p=>p.name==='left_shoulder')!.x=300;f.keypoints.find(p=>p.name==='right_shoulder')!.x=400;
  assert.equal(analyzeView(f).view,'unknown');
});
test('one usable view requests the missing perpendicular view',()=>{
  assert.equal(combineViews([analyzeView(side())]).status,'needs-front');
  assert.equal(combineViews([analyzeView(front())]).status,'needs-side');
});
test('internally inconsistent two-view scale/outline fails rather than picking a costume',()=>{
  const s=analyzeView(side()),f=analyzeView(front());f.chestWidthCm=70;f.neckWidthCm=50;
  const r=combineViews([s,f]);assert.equal(r.status,'needs-clear-view');assert.equal(r.measurements,undefined);
});
test('NaN, missing dimensions and empty data cannot produce ready',()=>{
  assert.equal(combineViews([]).status,'needs-reference');
  const s=analyzeView(side());s.backCm=NaN;
  assert.notEqual(combineViews([s,analyzeView(front())]).status,'ready');
  const f=side();f.mask=new Uint8Array(10);assert.equal(analyzeView(f).quality,0);
  const bogus:ViewAnalysis={view:'side',reason:'',calibrated:true,pixelsPerCm:NaN,quality:1,backCm:30,chestDepthCm:15,neckDepthCm:8};
  assert.equal(combineViews([bogus]).status,'needs-reference');
});
test('reference scale affects every physical dimension without defaults',()=>{
  const f=side();f.markers[0].corners=[{x:500,y:50},{x:540,y:50},{x:540,y:90},{x:500,y:90}];
  const result=analyzeView(f);assert.equal(result.pixelsPerCm,4);assert.equal(result.backCm,235/4);
});
test('a high-response tail landmark outside the pet cannot inflate back length',()=>{
  const f=side();f.keypoints.find(p=>p.name==='root_of_tail')!.x=100;
  const result=analyzeView(f);assert.equal(result.backCm,undefined);
  assert.notEqual(combineViews([result,analyzeView(front())]).status,'ready');
});
test('conflicting usable video frames cannot be hidden by selecting one convenient pair',()=>{
  const s=analyzeView(side()),other={...s,backCm:s.backCm!*1.5,chestDepthCm:s.chestDepthCm!*1.5,neckDepthCm:s.neckDepthCm!*1.5};
  const result=combineViews([s,other,analyzeView(front())]);
  assert.equal(result.status,'needs-clear-view');assert.match(result.message,/disagree/);
});
