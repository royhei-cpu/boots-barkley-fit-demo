import test from 'node:test';
import assert from 'node:assert/strict';
import {largestPetComponent} from '../../lib/scan/pet-components.ts';

test('empty frame produces no foreground or bounds',()=>{
  const result=largestPetComponent(new Uint8Array(100),10,10);
  assert.equal(result.petPixels,0);assert.equal(result.bounds,null);
  assert.equal(result.meaningfulComponents,0);assert.equal(result.touchesImageEdge,false);
});
test('largest component retained without filling a hole',()=>{
  const input=new Uint8Array(100);
  for(let y=2;y<8;y++)for(let x=2;x<8;x++)input[y*10+x]=1;
  input[4*10+4]=0;input[0]=1;
  const result=largestPetComponent(input,10,10);
  assert.equal(result.petPixels,35);assert.equal(result.mask[0],0);
  assert.equal(result.mask[44],0);assert.equal(result.touchesImageEdge,false);
  assert.deepEqual(result.bounds,{left:2,top:2,right:8,bottom:8});
});
test('diagonal adjacency connects but image row boundaries do not wrap',()=>{
  const diagonal=new Uint8Array([1,0,0,0,1,0,0,0,1]);
  assert.equal(largestPetComponent(diagonal,3,3).componentCount,1);
  const wrapped=new Uint8Array(30);wrapped[9]=1;wrapped[10]=1;
  assert.equal(largestPetComponent(wrapped,10,3).componentCount,2);
});
test('meaningful separated silhouettes are identified for abstention',()=>{
  const input=new Uint8Array(50*30);
  for(let y=5;y<15;y++)for(let x=5;x<15;x++)input[y*50+x]=1;
  for(let y=5;y<13;y++)for(let x=30;x<38;x++)input[y*50+x]=1;
  const result=largestPetComponent(input,50,30);
  assert.equal(result.meaningfulComponents,2);assert.equal(result.petPixels,100);
  assert.equal(result.mask[6*50+31],0);
});
test('clipping is reported and malformed dimensions rejected',()=>{
  const input=new Uint8Array(100);input.fill(1,0,10);
  assert.equal(largestPetComponent(input,10,10).touchesImageEdge,true);
  assert.throws(()=>largestPetComponent(input,9,10));
  assert.throws(()=>largestPetComponent(new Uint8Array(0),0,0));
});
