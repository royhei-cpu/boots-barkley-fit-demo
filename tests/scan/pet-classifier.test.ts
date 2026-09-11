import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyPetLogits,prepareClassifierInput} from '../../lib/scan/pet-classifier.mjs';
const logits=(entries:number[][])=>{const x=new Float32Array(1000).fill(-20);for(const [i,value]of entries)x[i]=value;return x;};
test('No-pet background and malformed outputs do not create a size prior',()=>{
  for(const x of [new Float32Array(1000),logits([[620,10]]),new Float32Array(2),new Float32Array(1000).fill(NaN)])assert.equal(classifyPetLogits(x).accepted,false);
});
test('Conflicting dog/cat evidence does not silently choose a species',()=>assert.equal(classifyPetLogits(logits([[263,10],[281,10]])).accepted,false));
test('Breed-like classes use distinct adult priors and cats stay separate',()=>{
  assert.equal(classifyPetLogits(logits([[151,10]])).group,'toy');
  assert.equal(classifyPetLogits(logits([[263,10]])).group,'medium');
  assert.equal(classifyPetLogits(logits([[246,10]])).group,'giant');
  assert.equal(classifyPetLogits(logits([[281,10]])).species,'cat');
});
test('Ambiguous sizes remain a labeled rough blend, including nonadjacent groups',()=>{
  const x=classifyPetLogits(logits([[259,10],[260,10]]));
  assert.equal(x.accepted,true);assert.equal(x.uncertainSize,true);assert.equal(x.uncertainty,'high');
  assert.ok(Math.abs((x.groupWeights.toy??NaN)-.5)<.000001);assert.ok(Math.abs((x.groupWeights.large??NaN)-.5)<.000001);
});
test('Variable-size unsupported breed classes never get a default medium',()=>assert.equal(classifyPetLogits(logits([[268,10]])).accepted,false));
test('RGBA preprocessing produces finite RGB normalized planar data',()=>{
  const data=new Uint8ClampedArray(32*24*4);for(let i=0;i<data.length;i+=4){data[i]=255;data[i+1]=128;data[i+2]=0;data[i+3]=255;}
  const result=prepareClassifierInput({width:32,height:24,data});
  assert.deepEqual(result.dims,[1,3,224,224]);assert.ok(Math.abs(result.data[0]-(1-.485)/.229)<1e-6);
  assert.ok(Math.abs(result.data[224*224]-(128/255-.456)/.224)<1e-6);assert.ok(result.data.every(Number.isFinite));
  assert.throws(()=>prepareClassifierInput({width:32,height:24,data},[30,10,20,20]));
});
