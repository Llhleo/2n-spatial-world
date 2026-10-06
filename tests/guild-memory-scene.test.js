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
 scene.update({eventIndex:0},camera,0);const p=camera.position.clone();scene.setPreview(2);scene.update({eventIndex:2},camera,0);assert.ok(p.distanceTo(camera.position)>10);
 scene.dispose();scene.dispose();assert.equal(disposed,0);assert.equal(scene.group.children.length,0);
});
