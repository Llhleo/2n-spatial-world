import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {sampleRoadCamera,roadEndingEntry} from '../src/road-story/path.js';
import {memoryEntryFrame} from '../src/guild-memory-entry.js';

const entry={position:[100,20,-700],target:[120,20,-720],up:[0,1,0]};
function setup(){const memory=createMemoryScene(),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);memory.install(asset,'garden','rose');return {memory,asset,camera};}
function centers(memory){const matrix=new T.Matrix4();return memory.group.children.filter(o=>o.isInstancedMesh).flatMap(mesh=>Array.from({length:mesh.count},(_,i)=>{mesh.getMatrixAt(i,matrix);return new T.Vector3().setFromMatrixPosition(matrix);}));}
test('road arrival uses moving deep streams instead of the previous distant spherical shell',()=>{
 const {memory,camera,asset}=setup();try{
  memory.update({memoryPhase:2,eventIndex:2,roadArrival:{}},camera,0);const a=centers(memory),r=a.map(p=>p.distanceTo(new T.Vector3(0,0,-14)));
  assert.ok(Math.max(...r)-Math.min(...r)>100,'stream has a long depth axis');
  for(let i=0;i<60;i++)memory.update({memoryPhase:2,eventIndex:2,roadArrival:{}},camera,1/60);
  const b=centers(memory);assert.ok(b.every((p,i)=>p.distanceTo(a[i])>5),'every escort continues flowing at a held progress');
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
test('arrival petals face the actual travelling camera and retain its world pose',()=>{
 const {memory,camera,asset}=setup(),pose=sampleRoadCamera(33,entry),frame=memoryEntryFrame(roadEndingEntry(entry));
 try{memory.update({memoryPhase:2,eventIndex:2,entryPose:roadEndingEntry(entry),entryBlend:1,roadArrival:{cameraPose:pose}},camera,0);
  assert.ok(camera.position.distanceTo(new T.Vector3(...pose.position))<1e-6);
  assert.ok(camera.quaternion.angleTo(new T.Quaternion(...pose.quaternion))<1e-6);
  const pool=memory.group.children.find(o=>o.isInstancedMesh),matrix=new T.Matrix4();pool.getMatrixAt(0,matrix);matrix.premultiply(frame);const face=new T.Vector3(0,-1,0).transformDirection(matrix),cameraFront=new T.Vector3(0,0,1).applyQuaternion(camera.quaternion);
  assert.ok(Math.abs(face.dot(cameraFront))>.9,'edge-on skateboard silhouettes must not replace fronts');
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
test('held particle phases keep all new-road escorts moving and the opening boundary has no pop',()=>{
 const {memory,camera,asset}=setup();try{
  memory.update({memoryPhase:2,eventIndex:2,roadArrival:{}},camera,0);const before=centers(memory);
  memory.update({memoryPhase:2,eventIndex:2,nextT:0,particleEnding:true,roadArrival:{}},camera,0);assert.ok(centers(memory).every((p,i)=>p.distanceTo(before[i])<1e-6));
  for(const t of [.1,.35,.65,.95,1]){
   memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true,roadArrival:{}},camera,0);const a=centers(memory);
   for(let i=0;i<120;i++)memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true,roadArrival:{}},camera,1/60);
   assert.ok(centers(memory).every((p,i)=>p.distanceTo(a[i])>.25),`no frozen edge petal at ${t}`);
  }
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
