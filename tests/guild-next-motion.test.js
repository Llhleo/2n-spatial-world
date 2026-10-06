import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
const api=await import('../src/guild-next-motion.js').catch(()=>({}));
const a={u:.4,branch:0,longitude:1.2,latitude:.6},p=[40,20,-12],pose={position:[-4,7,198],target:[0,0,-14]};
test('next path starts at actual expanded shell, is reversible and has smooth endpoints',()=>{
 assert.equal(typeof api.nextPoint,'function');
 for(const t of [0,3/16])assert.deepEqual(api.nextPoint(a,p,t),p);
 assert.deepEqual(api.nextCamera(pose,0),pose);
 const end=api.nextPoint(a,p,1);assert.notDeepEqual(end,p);assert.deepEqual(api.nextPoint(a,p,.6),api.nextPoint(a,p,.6));
 assert.notDeepEqual(end,api.nextPoint({...a,u:.8},p,1));
 for(const t of [3/16,10/16]){const q=api.nextPoint(a,p,t),r=api.nextPoint(a,p,t+1e-5);assert.ok(Math.hypot(...q.map((v,i)=>v-r[i]))<1e-5);}
 for(const t of [-1,0,.4,1,2,NaN])assert.ok(api.nextPoint(a,p,t).every(Number.isFinite));
 const camera=api.nextCamera(pose,1);assert.ok(camera.position[2]<pose.position[2]);
});
test('same rendered petal IDs open into depth without reallocating or modifying source material',()=>{
 const scene=createMemoryScene();const source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial({color:0xff3333}));scene.install(source,'a','b');
 const cam=new T.PerspectiveCamera(48,.6,.2,2400);
 const capture=t=>{scene.update({memoryPhase:2,eventIndex:2,nextT:t},cam,0);return scene.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array));};
 const before=capture(undefined),pools=scene.group.children.filter(o=>o.isInstancedMesh),count=scene.instanceCount;
 assert.deepEqual(capture(0),before);const opened=capture(1);assert.notDeepEqual(opened,before);
 assert.deepEqual(capture(0),before);assert.equal(scene.instanceCount,count);assert.deepEqual(scene.group.children.filter(o=>o.isInstancedMesh),pools);
 assert.equal(source.material.opacity,1);assert.equal(source.material.color.getHex(),0xff3333);scene.dispose();
});
