import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import {endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {endingFlowCenter,endingGateProgress} from '../src/guild-ending-flow.js';
import {materialRouteTime} from '../src/guild-ending-material.js';

const pose={position:[-4,7,198],target:[0,0,-14]},aspect=.46;
const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,aspect,layout.anchors);
test('petal escorts surround the current material-particle transport rather than the old route',()=>{
 for(const t of [.3,.36,.42,.46]){
  const points=layout.anchors.map(a=>endingPetalPoint(a,memoryPoint(a,2),t,0,false,slots));
  const center=new T.Vector3();points.forEach(p=>center.add(new T.Vector3(...p)));center.divideScalar(points.length);
  const expected=new T.Vector3(...endingFlowCenter(endingGateProgress(materialRouteTime(t)),aspect/.6));
  assert.ok(center.distanceTo(expected)<14,`escort must follow the actual moving cloud at ${t}: gap ${center.distanceTo(expected)}`);
 }
});
test('restored loose escorts interleave with the cloud instead of drawing an outside necklace',()=>{
 for(const t of [.65,.7]){
  const distances=layout.anchors.map(a=>endingPetalPoint(a,memoryPoint(a,2),t,0,false,slots)).map(p=>Math.hypot(p[0]/(aspect/.6),p[1]-43,p[2]+14));
  assert.ok(distances.filter(r=>r<45).length>distances.length*.25,'petals must occupy the particle cloud volume');
  assert.ok(Math.max(...distances)-Math.min(...distances)>25,'the loose depth distribution must not reduce to a constant-radius ring');
 }
});
test('final ring stays spatially outside the mark and gently rises around its lower half',()=>{
 for(const clock of [0,12,90]){
  const points=layout.anchors.map(a=>new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),1,clock,false,slots)));
  assert.ok(Math.min(...points.map(p=>p.y))>22&&Math.max(...points.map(p=>p.y))<45);
  assert.ok(points.some(p=>p.y>35),'the orbit must not collapse below the mark');
  for(const p of points)assert.ok(Math.hypot(p.x/(aspect/.75),(p.z+14)/.92)>62,'wide, open band keeps the petal models off the glyph');
 }
});
test('the restored individual arrival paths stay continuous at 50ms sampling',()=>{
 for(let tick=331;tick<=356;tick++)for(const a of layout.anchors){
  const t=tick/360,p=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),t,0,false,slots)),q=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),t+1/360,0,false,slots));
  assert.ok(p.distanceTo(q)<8,'a 50ms arrival step must not whip petals around the mark');
 }
});
test('reverse arrival after ten minutes of idle takes a short angular arc instead of unwinding every turn',()=>{
 for(const a of layout.anchors){
  let previous=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),17.8/18,600,false,slots));
  for(let tick=1;tick<=78;tick++){
   const t=17.8/18-tick/1080,current=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),t,600,false,slots));
   assert.ok(current.distanceTo(previous)<8,'long idle must not create a one-frame orbit yank');previous=current;
  }
 }
});
