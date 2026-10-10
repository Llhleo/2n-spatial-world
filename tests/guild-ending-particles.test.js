import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEndingParticles,ENDING_PARTICLE_COUNT,endingFrame,endingCamera,endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMonument} from '../src/monument.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
const pose={position:[-4,7,198],target:[0,0,-14]};
test('ending keeps the reference-scale swarm on every device and releases GPU resources',()=>{
 const swarm=createEndingParticles(),cam=new T.PerspectiveCamera(48,.46);assert.equal(ENDING_PARTICLE_COUNT,262144);assert.equal(swarm.points.geometry.getAttribute('position').count,262144);
 assert.equal(swarm.points.material.blending,T.NormalBlending);
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

test('particle mark preserves the opening sculpture bounds and superscript n rather than a new font',()=>{
 const monument=createMonument(),original=new T.Box3().setFromObject(monument),center=original.getCenter(new T.Vector3());original.translate(center.clone().negate());
 const swarm=createEndingParticles();swarm.points.geometry.computeBoundingBox();const sampled=swarm.points.geometry.boundingBox;
 for(const axis of ['x','y','z']){assert.ok(Math.abs(sampled.min[axis]-original.min[axis])<.1);assert.ok(Math.abs(sampled.max[axis]-original.max[axis])<.1);}
 const points=swarm.points.geometry.getAttribute('position'),nBox=monument.children[1].geometry.boundingBox.clone().translate(center.clone().negate());let nCount=0;
 for(let i=0;i<points.count;i++){const p=new T.Vector3().fromBufferAttribute(points,i);if(p.x>nBox.min.x-.01){assert.ok(p.y>=nBox.min.y-.01,'n stays in its original superscript height band');nCount++;}}
 assert.ok(nCount>15000&&nCount<points.count/2);assert.equal(swarm.points.geometry.getAttribute('aNormal').count,points.count);swarm.dispose();monument.traverse(o=>o.geometry?.dispose());monument.children[0].material.dispose();
});

test('standalone scene entry actually attaches and activates the particle system at all ending stages',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene(),source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());scene.install(source,'garden','rose');
 const cam=new T.PerspectiveCamera(48,.46,.2,2400);
 for(const nextT of [.15,.45,.7,1]){scene.update({memoryPhase:2,eventIndex:2,nextT},cam,0);
  const swarm=scene.group.getObjectByName('ending-shape-swarm');assert.ok(swarm?.isPoints&&swarm.visible);assert.equal(swarm.geometry.getAttribute('position').count,262144);assert.equal(swarm.material.uniforms.uT.value,nextT);
 }
 scene.dispose();source.geometry.dispose();source.material.dispose();
});
