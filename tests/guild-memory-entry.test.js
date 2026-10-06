import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {applyMemoryEntry,memoryEntryProgress} from '../src/guild-memory-entry.js';
import {sampleMemoryStory} from '../src/guild-memory-layout.js';
const entry={position:[140,60,-150],target:[140,20,-220],up:[0,1,0]};
function shot(u){const camera=new T.PerspectiveCamera(48,414/896,.2,2400),group=new T.Group();camera.position.set(0,3,190);camera.lookAt(0,0,-14);camera.updateMatrixWorld();applyMemoryEntry(camera,group,entry,u);return {camera,group};}
test('departure starts at the member camera, lifts out, arrives continuously and reverses',()=>{
 const start=shot(0),lift=shot(.6),end=shot(1);assert.deepEqual(start.camera.position.toArray(),entry.position);
 assert.ok(lift.camera.position.y>entry.position[1]+100);assert.deepEqual(end.camera.position.toArray(),[0,3,190]);assert.ok(end.group.matrix.equals(new T.Matrix4()));
 for(const u of [.2,.6,.9]){assert.ok(shot(u-1e-6).camera.position.distanceTo(shot(u+1e-6).camera.position)<.01);assert.deepEqual(shot(u).camera.position.toArray(),shot(u).camera.position.toArray());}
 const local=new T.Vector3(45,42,-14),reference=shot(1);const screen=local.clone().project(reference.camera);
 for(const u of [0,.3,.6,.9,1]){const s=shot(u),projected=local.clone().applyMatrix4(s.group.matrix).project(s.camera);assert.ok(projected.distanceTo(screen)<1e-8,'chains must follow the departing camera');}
 assert.equal(memoryEntryProgress(0),0);assert.equal(memoryEntryProgress(4/36),1);
 assert.equal(sampleMemoryStory(3.9/36).eventOpacity,0);assert.equal(sampleMemoryStory(4/36).eventOpacity,0);assert.equal(sampleMemoryStory(5/36).eventOpacity,1);
});
test('map stays fixed and visible while the camera departs, then restores after drawing',async()=>{
 const {renderMemoryPreview}=await import('../src/guild-memory-preview.js');const scene=new T.Scene(),terrain=new T.Group(),oldChain=new T.Group(),group=new T.Group();scene.add(terrain,oldChain,group);group.visible=false;
 const camera=new T.PerspectiveCamera(),memory={group,setPreview(){},update(state){group.visible=true;assert.ok(state.entryPose);}};
 for(const progress of [0,.04,.1,.5,1]){renderMemoryPreview({scene,camera,memory,entryPose:entry,departureGroups:[oldChain],progress,renderer:{render(){assert.equal(terrain.visible,true);assert.equal(oldChain.visible,false);}},viewport:{width:414,height:896}});assert.equal(terrain.visible,true);assert.equal(oldChain.visible,true);}
});
test('existing HD chain instances start at their rendered world pose before following camera',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const geometry=new T.BoxGeometry(3,1,2),material=new T.MeshStandardMaterial();
 const memory=createMemoryScene();memory.install(new T.Mesh(geometry,material),'a','b');
 const old=new T.Group(),mesh=new T.InstancedMesh(geometry,material,1);old.add(mesh);const initial=new T.Matrix4().compose(new T.Vector3(150,90,-230),new T.Quaternion(),new T.Vector3(2,2,2));mesh.setMatrixAt(0,initial);
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);camera.position.fromArray(entry.position);camera.up.fromArray(entry.up);camera.lookAt(...entry.target);memory.captureEntry(old,camera);
 memory.update({entryPose:entry,entryBlend:0,memoryPhase:0,eventIndex:0},camera,0);memory.group.updateMatrixWorld(true);
 const target=memory.group.children.find(c=>c.isInstancedMesh),matrix=new T.Matrix4();target.getMatrixAt(0,matrix);matrix.premultiply(target.matrixWorld);
 assert.ok(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(new T.Vector3().setFromMatrixPosition(initial))<1e-5);assert.ok(new T.Vector3().setFromMatrixScale(matrix).distanceTo(new T.Vector3(2,2,2))<1e-5);
 assert.ok(camera.position.distanceTo(new T.Vector3(...entry.position))<1e-8);memory.dispose();
});
