import test from 'node:test';
import assert from 'node:assert/strict';
import {chainLayout} from '../src/petal-chain.js';
import {createBoundedDisplayPipeline} from '../src/petal-loader.js';

test('chains keep five or six moderately sized, separated petals per row',()=>{
 for(const [width,height,count] of [[320,844,5],[414,896,5],[896,414,6]]){
  const layout=chainLayout(width,height);
  assert.equal(layout.length,count*2);
  for(const row of [-1,1]){
   const petals=layout.filter(p=>Math.sign(p.y)===row);
   for(let i=1;i<petals.length;i++)assert.ok((petals[i].x-petals[i-1].x)*width/2>petals[i].pixels+8);
  }
  assert.ok(layout.every(p=>p.pixels>=38&&p.pixels<=64));
  assert.deepEqual(chainLayout(width,height),layout,'identities must not change with animation time');
 }
});

test('HD pipeline overlaps three downloads but bounds retained jobs until decoding completes',async()=>{
 const pipeline=createBoundedDisplayPipeline();let fetched=0,active=0,max=0;const release=[];
 const jobs=Array.from({length:7},()=>pipeline(async()=>{fetched++;return new ArrayBuffer(4);},async()=>{active++;max=Math.max(max,active);await new Promise(r=>release.push(r));active--;}));
 for(let i=0;i<15;i++)await Promise.resolve();
 assert.equal(fetched,3);assert.equal(max,2);
 while(release.length||fetched<7){release.splice(0).forEach(r=>r());for(let i=0;i<20;i++)await Promise.resolve();}
 await Promise.all(jobs);assert.equal(max,2);
});
