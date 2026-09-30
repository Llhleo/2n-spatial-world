import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {hellPose} from '../src/hell-production.js';
import {companionPose,companionPoint,createCompanionship,COMPANION_PETALS} from '../src/companionship.js';
const camera=()=>new T.PerspectiveCamera(48,414/896,.2,2400);
const distance=(a,b)=>new T.Vector3(...a).distanceTo(new T.Vector3(...b));
test('Hell and ascent share position, focus and velocity per viewport unit',()=>{
 const a=hellPose(1,camera()),b=companionPose(0,camera());
 assert.ok(distance(a.position,b.position)<1e-8);assert.ok(distance(a.target,b.target)<1e-8);
 const h=1e-6,pre=hellPose(1-h,camera()),post=companionPose(h,camera());
 for(const key of ['position','target'])for(let i=0;i<3;i++){
  const before=(a[key][i]-pre[key][i])/h/4,after=(post[key][i]-b[key][i])/h/12;
  assert.ok(Math.abs(before-after)<.02,key+' velocity '+i);
 }
});
test('ascent is finite and reaches a stable reading shot without overshooting the world floor',()=>{
 for(let i=0;i<=1000;i++){
  const state=companionPose(i/1000,camera());
  assert.ok([...state.position,...state.target].every(Number.isFinite));
  assert.ok(state.position[1]>=4.99);assert.ok(distance(state.position,state.target)>60);
 }
 const end=companionPose(1,camera());
 for(const t of [.84,.9,.96,1])assert.deepEqual(companionPose(t,camera()),end);
 assert.ok(end.position[1]>300);
});
test('fast seeks, reverse seeks and pauses reproduce identical petal matrices',()=>{
 const rig=createCompanionship(true,()=>new T.Texture());
 for(const p of COMPANION_PETALS)rig.install(p.biome,p.name,{geometry:new T.BoxGeometry(1,2,.4),material:new T.MeshStandardMaterial()});
 assert.equal(rig.ready,true);assert.equal(rig.instanceCount,15);
 const snapshot=()=>rig.group.children.filter(c=>c.isInstancedMesh).map(b=>Array.from(b.instanceMatrix.array));
 rig.update(.67);const expected=snapshot();
 for(const t of [1,.05,.9,0,.67,.67])rig.update(t);
 assert.deepEqual(snapshot(),expected);
 rig.update(0);assert.equal(rig.group.visible,false);
 const count=rig.instanceCount;
 const p=COMPANION_PETALS[0];rig.install(p.biome,p.name,{geometry:new T.BoxGeometry(),material:new T.MeshStandardMaterial()});
 assert.equal(rig.instanceCount,count);
});
test('five representative species settle around an open centre and do not collapse',()=>{
 const cam=camera();companionPose(1,cam);cam.updateMatrixWorld();
 for(let s=0;s<5;s++)for(let slot=0;slot<3;slot++){
  const point=companionPoint(s,slot,1),p=point.clone().project(cam);
  assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.80,'ring is outside portrait frame');
  assert.ok(Math.abs(p.x)>.55||Math.abs(p.y)>.28,'petal enters the reading space');
 }
});
test('world text stays within phone reading margins at visible progress',()=>{
 const rig=createCompanionship(true,()=>new T.Texture());
 for(const aspect of [390/844,414/896,16/9]){
  const cam=new T.PerspectiveCamera(48,aspect,.2,2400);
  for(let i=0;i<=100;i++){
   const t=.78+i*.22/100;companionPose(t,cam);rig.update(t);cam.updateMatrixWorld();rig.group.updateMatrixWorld(true);
   for(const label of rig.group.children[0].children)if(label.material.opacity>.05){
    const points=label.geometry.attributes.position;
    for(let v=0;v<points.count;v++){
     const p=new T.Vector3().fromBufferAttribute(points,v).applyMatrix4(label.matrixWorld).project(cam);
     assert.ok(Math.abs(p.x)<.88&&Math.abs(p.y)<.75&&p.z<1,'text clipping at '+t);
    }
   }
  }
 }
});
