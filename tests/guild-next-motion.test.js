import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
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
test('ending arc curves around the right, with open left space and genuine depth in portrait and landscape',()=>{
 const layout=createMemoryLayout({assets:[{key:'petal',radius:2.2}]});
 for(const aspect of [.46,.6,1.8]){
  const cam=new T.PerspectiveCamera(48,aspect,.2,2400),end=api.nextCamera(pose,1);
  cam.position.fromArray(end.position);cam.lookAt(...end.target);cam.updateMatrixWorld();
  const frame=api.nextArcFrame(pose,{aspect,fov:48});
  const points=layout.anchors.map(a=>new T.Vector3(...api.nextPoint(a,memoryPoint(a,2,0),1,frame)));
  const projected=points.map(p=>p.clone().project(cam));
  assert.ok(projected.every(p=>p.x>-.1&&p.x<.98&&Math.abs(p.y)<.9),'arc must fit without left side rail');
  const middle=projected.filter(p=>Math.abs(p.y)<.2),tips=projected.filter(p=>Math.abs(p.y)>.65);
  assert.ok(middle.length&&tips.length);
  assert.ok(Math.min(...middle.map(p=>p.x))>Math.max(...tips.map(p=>p.x))+.2,'middle must bulge right rather than form a vertical rail');
  const depths=points.map(p=>-p.applyMatrix4(cam.matrixWorldInverse).z);
  assert.ok(Math.max(...depths)-Math.min(...depths)>80,'preserve front/rear depth');
 }
});
test('ending individual breathing survives the settled arc without translating its whole shape',()=>{
 const frame=api.nextArcFrame(pose,{aspect:.6,fov:48});
 const base=api.nextPoint(a,[40,a.latitude*90.3,-12],1,frame);
 const up=api.nextPoint(a,[40,a.latitude*90.3+3,-12],1,frame);
 assert.ok(Math.hypot(...up.map((v,i)=>v-base[i]))>2.9);
 assert.deepEqual(api.nextPoint(a,p,0,frame),p);
});
