import {test} from 'node:test';
import assert from 'node:assert/strict';
import {removeCyanMatte} from '../../lib/try-on/matte.ts';
test('Flat and compressed cyan become transparent while white and costume colors stay opaque',()=>{
 const colors=[[0,255,255,255],[6,249,252,255],[255,255,255,255],[240,155,25,255],[30,30,30,255],[45,175,25,255]];
 const rgba=new Uint8ClampedArray(colors.flat());removeCyanMatte(rgba);
 assert.deepEqual(Array.from(rgba).filter((_,i)=>i%4===3),[0,0,255,255,255,255]);
 for(let i=0;i<colors.length;i++)assert.deepEqual(Array.from(rgba.slice(i*4,i*4+3)),colors[i].slice(0,3));
});
test('Partially matted edge is softened without resurrecting transparent pixels',()=>{
 const rgba=new Uint8ClampedArray([100,190,190,255,0,255,255,0]);removeCyanMatte(rgba);
 assert.ok(rgba[3]>0&&rgba[3]<255);assert.equal(rgba[7],0);
});
