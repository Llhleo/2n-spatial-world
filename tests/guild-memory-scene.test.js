import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
test('memory scene reuses HD assets, accepts late installs and owns only its resources',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene({mobile:true});scene.prepare();scene.setPreview(0);
 const source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());
 let disposed=0;source.geometry.addEventListener('dispose',()=>disposed++);source.material.addEventListener('dispose',()=>disposed++);
 scene.install(source,'garden','rose');scene.install(source,'garden','rose');scene.prepare();
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 scene.update({eventIndex:0},camera,0);
 assert.equal(scene.assetCount,1);assert.ok(scene.instanceCount>=48);assert.ok(scene.instanceCount<=96);
 for(let i=0;i<3;i++){scene.update({eventIndex:i,showText:false},camera,0);const drawn=scene.group.children.filter(c=>c.isInstancedMesh).reduce((n,c)=>n+c.count,0);assert.equal(drawn,scene.instanceCount,'text-off preview must preserve the full long chain');}
 assert.equal(scene.dustCount,240);assert.equal(scene.group.visible,true);
 scene.update({eventIndex:0},camera,0);const p=camera.position.clone();scene.setPreview(2);scene.update({eventIndex:2},camera,0);assert.ok(p.distanceTo(camera.position)>5);
 scene.dispose();scene.dispose();assert.equal(disposed,0);assert.equal(scene.group.children.length,0);
});

test('scroll morph preserves every petal and reverses deterministically',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene();scene.install(new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),'a','b');
 const camera=new T.PerspectiveCamera(48,.6,.2,2400);
 const capture=phase=>{scene.update({memoryPhase:phase,eventIndex:0,showText:true},camera,0);return scene.group.children.filter(c=>c.isInstancedMesh).map(c=>({count:c.count,matrix:Array.from(c.instanceMatrix.array)}));};
 const first=capture(.47);capture(1.6);assert.deepEqual(capture(.47),first);
 for(const p of [0,.2,.5,1,1.5,2])assert.equal(capture(p).reduce((n,c)=>n+c.count,0),scene.instanceCount);
 scene.dispose();
});

 test('all displayed petals retain clearance during chain-to-shell transitions',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene();scene.install(new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),'a','b');
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400),matrix=new T.Matrix4();
 for(const phase of [0,.2,.325,.5,.75,1,1.5,2]){
  scene.update({memoryPhase:phase,eventIndex:0,showText:true},camera,0);
  const points=[];for(const mesh of scene.group.children.filter(c=>c.isInstancedMesh))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);points.push(new T.Vector3().setFromMatrixPosition(matrix));}
  for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)assert.ok(points[i].distanceTo(points[j])>=4.4,`clearance at ${phase}`);
 }
 scene.dispose();
 });
