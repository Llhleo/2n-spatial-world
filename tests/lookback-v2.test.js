import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {hellPose} from '../src/hell-production.js';
const api=await import('../src/lookback.js').catch(()=>({}));
const camera=()=>new T.PerspectiveCamera(48,414/896,.2,2400);
test('return route begins before the empty Hell tail, preserving incoming position and velocity',()=>{
 assert.equal(typeof api.lookbackPose,'function','return route is not implemented');
 assert.ok(api.HELL_EXIT<.9);
 const h=1e-6,a=hellPose(api.HELL_EXIT,camera()),b=api.lookbackPose(0,camera());
 for(const key of ['position','target']){
  assert.ok(new T.Vector3(...a[key]).distanceTo(new T.Vector3(...b[key]))<1e-8);
  const pre=hellPose(api.HELL_EXIT-h,camera()),post=api.lookbackPose(h,camera());
  for(let k=0;k<3;k++)assert.ok(Math.abs((a[key][k]-pre[key][k])/h/4-(post[key][k]-b[key][k])/h/api.RETURN_UNITS)<.03);
 }
});
test('all five visited places, including Garden and Desert, have explicit portrait viewing windows',()=>{
 assert.equal(typeof api.lookbackPose,'function');
 const places=[['hell',1470,-35,10],['jungle',1000,-35,10],['ocean',650,-41,10],['desert',366,-35,10],['garden',166,-35,10]];
 const coverage=new Map(places.map(([n])=>[n,0]));
 for(let i=0;i<=400;i++){
  const cam=camera();api.lookbackPose(i/400,cam);cam.updateMatrixWorld();
  for(const [name,x,y,z] of places){const p=new T.Vector3(x,y,z).project(cam),d=cam.position.distanceTo(new T.Vector3(x,y,z));if(Math.abs(p.x)<.6&&Math.abs(p.y)<.6&&p.z<1&&p.z>-1&&d<260)coverage.set(name,coverage.get(name)+1);}
 }
 for(const [name,count] of coverage)assert.ok(count>=12,name+' did not get a readable return shot: '+count);
});
test('reading pose is stationary, and all flower endpoints leave a clear central text rectangle',()=>{
 assert.equal(typeof api.flowerPose,'function');
 const cam=camera(),last=api.lookbackPose(1,cam);cam.updateMatrixWorld();
 for(const t of [.88,.94,1])assert.deepEqual(api.lookbackPose(t,camera()),last);
 const depths=new Set();
 for(let i=0;i<15;i++){
  const v=api.flowerPose(i,1),p=v.clone().project(cam);
  assert.ok(Math.abs(p.x)<.94&&Math.abs(p.y)<.8,'flower clips phone frame');
  assert.ok(Math.abs(p.x)>.48||Math.abs(p.y)>.3,'flower overlaps reading rectangle');
  depths.add(Math.round(v.clone().applyMatrix4(cam.matrixWorldInverse).z));
 }
 assert.ok(depths.size>=4,'flower arrangement has no depth');
});
test('reverse seeks and pauses produce the same flower positions without accumulated simulation',()=>{
 assert.equal(typeof api.flowerPose,'function');
 const expected=Array.from({length:15},(_,i)=>api.flowerPose(i,.78).toArray());
 for(const t of [1,.5,.01,.9,0,.78,.78])for(let i=0;i<15;i++)api.flowerPose(i,t);
 assert.deepEqual(Array.from({length:15},(_,i)=>api.flowerPose(i,.78).toArray()),expected);
});
test('companion rig reuses five prepared assets, bounds instance count and restores reverse-seek matrices',async()=>{
 const {createCompanionship}=await import('../src/companionship.js');
 const rig=createCompanionship();
 for(const [kind,name] of [['garden','clover'],['desert','cactus'],['ocean','shell'],['jungle','compass'],['hell','darkmark']]){
  const geometry=new T.BoxGeometry(2,.2,2),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());
  rig.install(mesh,kind,name);
  assert.equal(rig.group.children.filter(o=>o.isInstancedMesh).at(-1).geometry,geometry);
 }
 assert.equal(rig.group.children.filter(o=>o.isInstancedMesh).reduce((n,o)=>n+o.count,0),15);
 rig.update(.9);const saved=rig.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array));
 rig.update(.05);rig.update(.9);
 assert.deepEqual(rig.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array)),saved);
 rig.dispose();
});
test('prepared world text is warmed before entry with its render callback and live visibility preserved',async()=>{
 const {warmBiomeResources}=await import('../src/biome-warmup.js');
 const scene=new T.Scene(),text=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial());
 let called=0;text.userData.warmup=true;text.visible=false;text.onBeforeRender=function(){assert.equal(this,text);called++;};scene.add(text);
 let target=null;const renderer={getRenderTarget:()=>target,setRenderTarget:t=>target=t,compileAsync:async()=>{},render:s=>{for(const o of s.children)if(o.visible&&o.isMesh)o.onBeforeRender();}};
 await warmBiomeResources(renderer,scene,async()=>{});assert.equal(called,1);assert.equal(text.visible,false);assert.equal(target,null);
});
test('return viewing windows contain existing populated terrain, not just empty region markers',async()=>{
 const {createHellPetals,HELL_POPULATION}=await import('../src/hell-production.js');
 const {createJunglePetals,JUNGLE_POPULATION}=await import('../src/jungle-production.js');
 const {createOceanPetals,OCEAN_POPULATION}=await import('../src/ocean-production.js');
 const {createDesertProduction:createDesertPetals}=await import('../src/desert-production.js');
 const {createPetalInstances,PETAL_NAMES}=await import('../src/garden-assembly.js');
 const {groundHeight}=await import('../src/biomes.js');
 const catalog=names=>Object.fromEntries(names.map(n=>[n,new T.Mesh(new T.BoxGeometry(1,.3,1),new T.MeshStandardMaterial())]));
 const shots=[[.1,createHellPetals(catalog(Object.keys(HELL_POPULATION)),true)],[.28,createJunglePetals(catalog(Object.keys(JUNGLE_POPULATION)),true)],[.42,createOceanPetals(catalog(Object.keys(OCEAN_POPULATION)),true)],[.56,createDesertPetals(groundHeight,true,catalog(['cactus','sand']))],[.68,createPetalInstances(groundHeight,catalog(PETAL_NAMES),true)]];
 for(const [t,group] of shots){const cam=camera();api.lookbackPose(t,cam);cam.updateMatrixWorld();const m=new T.Matrix4(),p=new T.Vector3();let count=0;
  group.traverse(o=>{if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m).project(cam);if(Math.abs(p.x)<.85&&Math.abs(p.y)<.8&&p.z>-1&&p.z<1)count++;}});
  assert.ok(count>=10,`return shot ${t} has only ${count} visible terrain petals`);
 }
});
