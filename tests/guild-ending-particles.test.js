import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEndingParticles,ENDING_PARTICLE_COUNT,endingFrame,endingCamera,endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
const pose={position:[-4,7,198],target:[0,0,-14]};
test('ending keeps the reference-scale swarm on every device and releases GPU resources',()=>{
 const swarm=createEndingParticles(),cam=new T.PerspectiveCamera(48,.46);assert.equal(ENDING_PARTICLE_COUNT,262144);assert.equal(swarm.points.geometry.getAttribute('position').count,262144);
 assert.ok(Array.from(swarm.points.geometry.getAttribute('position').array).every(Number.isFinite));
 swarm.update(undefined,0,cam);assert.equal(swarm.points.visible,false);swarm.update(.7,2,cam);assert.equal(swarm.points.visible,true);
 assert.equal(swarm.points.material.uniforms.uAspect.value,.46);let released=0;swarm.points.geometry.addEventListener('dispose',()=>released++);swarm.points.material.addEventListener('dispose',()=>released++);swarm.dispose();assert.equal(released,2);
});
test('shape progression reverses deterministically and the camera enters continuously then settles',()=>{
 assert.deepEqual(endingCamera(pose,0),pose);const first=endingFrame(.4);endingFrame(.9);assert.deepEqual(endingFrame(.4),first);
 assert.ok(endingFrame(.3).glyph===0&&endingFrame(1).glyph===1);assert.ok(endingFrame(.5).light>endingFrame(1).light);
 let previous=endingCamera(pose,0);for(let i=1;i<=1000;i++){const current=endingCamera(pose,i/1000);assert.ok(Math.hypot(...current.position.map((v,k)=>v-previous.position[k]))<2);previous=current;}
 assert.ok(Math.abs(endingCamera(pose,.5).position[0])>100);assert.ok(Math.abs(endingCamera(pose,1).position[0])<1e-8);
});
test('petal handoff retains original centers and ends in a readable volume in portrait and landscape',()=>{
 for(const aspect of [.46,.6,1.8]){
  const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,aspect,layout.anchors),end=endingCamera(pose,1),cam=new T.PerspectiveCamera(48,aspect);cam.position.fromArray(end.position);cam.lookAt(...end.target);cam.updateMatrixWorld();
  const depths=[];for(const a of layout.anchors){const start=memoryPoint(a,2);assert.deepEqual(endingPetalPoint(a,start,0,0,false,slots),start);
   const point=new T.Vector3(...endingPetalPoint(a,start,1,0,true,slots)),screen=point.clone().project(cam);assert.ok(Math.abs(screen.x)<1&&screen.y>-.4&&screen.y<.9);depths.push(-point.applyMatrix4(cam.matrixWorldInverse).z);
   assert.deepEqual(endingPetalPoint(a,start,1,0,true,slots),endingPetalPoint(a,start,1,40,true,slots));
  }assert.ok(Math.max(...depths)-Math.min(...depths)>150);
 }
});
