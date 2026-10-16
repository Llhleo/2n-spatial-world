import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEndingParticles,endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';
const pose={position:[-4,7,198],target:[0,0,-14]};
test('the new orbit keeps the rendered petals inside narrow and wide camera frames',()=>{
 for(const aspect of [.35,.46,.6,1.8]){
  const memory=createMemoryScene({mobile:aspect<1}),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,aspect,.2,2400);memory.install(asset,'garden','rose');
  try{for(const t of [.95,.975,1]){
   memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true},camera,0);
   for(const pool of memory.group.children.filter(o=>o.isInstancedMesh))for(let i=0;i<pool.count;i++){
    const matrix=new T.Matrix4();pool.getMatrixAt(i,matrix);const point=new T.Vector3().setFromMatrixPosition(matrix).project(camera);
    assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95,`orbit must fit aspect ${aspect}, t=${t}, x=${point.x}, y=${point.y}`);
   }
  }}finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
 }
});
test('formed mark petals orbit clockwise with depth and depend on progress rather than elapsed reading time',()=>{
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,.46,layout.anchors);
 let front=0,back=0;
 for(const a of layout.anchors){
  const start=memoryPoint(a,2),p=endingPetalPoint(a,start,.95,0,false,slots),q=endingPetalPoint(a,start,1,0,false,slots);
  assert.deepEqual(p,endingPetalPoint(a,start,.95,300,false,slots),'scroll pause cannot advance the orbit');
  assert.ok(Math.hypot(...p.map((v,k)=>v-q[k]))>10,'formed petals keep moving as scroll advances');
  assert.ok(p[0]*(q[1]-43)-(p[1]-43)*q[0]<0,'front-view travel is clockwise');
  if(p[2]>2)front++;if(p[2]<-30)back++;
  assert.deepEqual(p,endingPetalPoint(a,start,.95,400,false,slots),'backscroll returns to the same position');
 }
 assert.ok(front>5&&back>5,'the orbit occupies both sides of the model');
});
test('the formed particle sculpture owns its exact depth-only occluder and releases it',()=>{
 const swarm=createEndingParticles(),camera=new T.PerspectiveCamera(48,.46),mask=swarm.occluder;
 try{
  assert.ok(mask?.isGroup,'surface-sampled particles need a matching solid depth mask for petal occlusion');
  const resources=new Set();mask.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);assert.equal(o.material.colorWrite,false);assert.equal(o.material.depthWrite,true);assert.equal(o.material.depthTest,true);}});
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  swarm.update(.7,0,camera,false,true);assert.equal(mask.visible,false);
  swarm.update(1,0,camera,false,true);assert.equal(mask.visible,true);mask.updateMatrixWorld(true);
  const actual=new T.Box3().setFromObject(mask),geometry=swarm.points.geometry;geometry.computeBoundingBox();
  const scale=Math.min(1.12,camera.aspect*1.75),box=geometry.boundingBox.clone();box.min.multiplyScalar(scale).add(new T.Vector3(0,43,-14));box.max.multiplyScalar(scale).add(new T.Vector3(0,43,-14));
  assert.ok(actual.min.distanceTo(box.min)<.2&&actual.max.distanceTo(box.max)<.2,'depth shell matches the original sculpture at the rendered scale');
  swarm.update(.7,0,camera,false,true);assert.equal(mask.visible,false,'reverse removes the mask before the model disperses');
  swarm.update(1,0,camera,false,false);assert.equal(mask.visible,false,'the default legacy ending does not acquire an occlusion surface');
  swarm.dispose();assert.equal(disposed,resources.size);
 }finally{swarm.dispose();}
});
