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

function renderedCenters(scene){const matrix=new T.Matrix4();return scene.group.children.filter(c=>c.isInstancedMesh).flatMap(mesh=>Array.from({length:mesh.count},(_,i)=>{mesh.getMatrixAt(i,matrix);return {point:new T.Vector3().setFromMatrixPosition(matrix),scale:new T.Vector3().setFromMatrixScale(matrix).x};}));}
test('rendered shell remains spherical with text both visible and hidden',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const scene=createMemoryScene();scene.install(new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),'a','b');const camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 for(const showText of [false,true])for(const phase of [1,2]){scene.update({memoryPhase:phase,eventIndex:phase,showText},camera,0);const radius=phase===1?52:111.8;for(const {point} of renderedCenters(scene))assert.ok(Math.abs(point.distanceTo(new T.Vector3(0,0,-14))-radius)<1.6,'screen edges must not distort the shell');}scene.dispose();
});
test('idle chains have visible breathing and enlarged shell has balanced foreground scale',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const scene=createMemoryScene();scene.install(new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),'a','b');const camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 scene.update({memoryPhase:0,eventIndex:0},camera,0);const initial=renderedCenters(scene).map(p=>p.point.clone().project(camera).y);let movement=0;
 for(let frame=0;frame<180;frame++){scene.update({memoryPhase:0,eventIndex:0},camera,1/60);renderedCenters(scene).forEach((p,i)=>{movement=Math.max(movement,Math.abs(p.point.clone().project(camera).y-initial[i])*896/2);});}
 assert.ok(movement>=7,'chain movement must be perceptible while scroll is stationary');
 scene.update({memoryPhase:2,eventIndex:2},camera,0);const sizes=renderedCenters(scene).map(({point,scale})=>scale/-point.clone().applyMatrix4(camera.matrixWorldInverse).z);assert.ok(Math.max(...sizes)/Math.min(...sizes)<2.1,'front petals must remain part of the same composition');scene.dispose();
});

 test('story light stays neutral and copied HD materials do not acquire dark fog',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const scene=createMemoryScene();
 const material=new T.MeshStandardMaterial({color:0xe78742});scene.install(new T.Mesh(new T.BoxGeometry(3,1,2),material),'a','b');
 const camera=new T.PerspectiveCamera(48,.6,.2,2400);
 for(const phase of [0,1,2]){scene.update({memoryPhase:phase,eventIndex:phase},camera,0);for(const light of scene.group.children.filter(c=>c.isLight))assert.equal(light.color.getHex(),0xffffff);}
 const copy=scene.group.children.find(c=>c.isInstancedMesh).material;assert.equal(copy.fog,false);assert.equal(copy.color.getHex(),material.color.getHex());assert.equal(material.fog,true);scene.dispose();
 });
