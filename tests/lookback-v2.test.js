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
 for(let i=0;i<14;i++){
  const v=api.flowerPose(i,1),p=v.clone().project(cam);
  assert.ok(Math.abs(p.x)<.94&&Math.abs(p.y)<.8,'flower clips phone frame');
  assert.ok(Math.abs(p.x)>.48||Math.abs(p.y)>.3,'flower overlaps reading rectangle');
  depths.add(Math.round(v.clone().applyMatrix4(cam.matrixWorldInverse).z));
 }
 assert.ok(depths.size>=4,'flower arrangement has no depth');
});
test('reverse seeks and pauses produce the same flower positions without accumulated simulation',()=>{
 assert.equal(typeof api.flowerPose,'function');
 const expected=Array.from({length:14},(_,i)=>api.flowerPose(i,.78).toArray());
 for(const t of [1,.5,.01,.9,0,.78,.78])for(let i=0;i<14;i++)api.flowerPose(i,t);
 assert.deepEqual(Array.from({length:14},(_,i)=>api.flowerPose(i,.78).toArray()),expected);
});
test('companion rig takes distinct grounded instances and restores their exact matrices on reverse',async()=>{
 const {createCompanionship}=await import('../src/companionship.js');
 const scene=new T.Scene(),rig=createCompanionship(scene),sources=[];
 const choices=[['garden',['rose','clover','goldenleaf'],166],['desert',['cactus','sand','iris'],366],['ocean',['pearl','shell','starfish'],650],['jungle',['peas','tomato','compass'],1000],['hell',['darkmark','corruption'],1470]];
 for(const [kind,names,x] of choices)for(const name of names){
  const geometry=new T.BoxGeometry(2,.2,2),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());
  if(name==='rose')assert.doesNotThrow(()=>rig.install(mesh,kind,name),'fast asset preparation must not require terrain already attached');
  const rootName=kind==='garden'?'florr-petal-assembly':'florr-'+kind;
  let ground=scene.getObjectByName(rootName);if(!ground){ground=new T.Group();ground.name=rootName;scene.add(ground);}
  const batch=new T.InstancedMesh(geometry,mesh.material,1),original=new T.Matrix4().compose(new T.Vector3(x,-33,10),new T.Quaternion().setFromEuler(new T.Euler(.2,.4,.1)),new T.Vector3(2,2,2));batch.setMatrixAt(0,original);ground.add(batch);sources.push({batch,original});
  rig.install(mesh,kind,name);
  assert.equal(rig.group.children.filter(o=>o.isInstancedMesh).at(-1).geometry,geometry);
 }
 rig.capture();
 assert.equal(rig.group.children.filter(o=>o.isInstancedMesh).reduce((n,o)=>n+o.count,0),14);
 rig.update(0);for(const {batch,original} of sources){const m=new T.Matrix4();batch.getMatrixAt(0,m);assert.deepEqual(m.toArray(),original.toArray().map(Math.fround));}
 rig.update(1);for(const {batch} of sources){const m=new T.Matrix4();batch.getMatrixAt(0,m);assert.equal(m.determinant(),0,'ground copy remained visible after takeoff');}
 rig.update(.95);const saved=rig.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array));
 rig.update(0);for(const {batch,original} of sources){const m=new T.Matrix4();batch.getMatrixAt(0,m);assert.deepEqual(m.toArray(),original.toArray().map(Math.fround));}
 rig.update(.95);
 assert.deepEqual(rig.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array)),saved);
 const labels=rig.group.children.filter(o=>o.userData.warmup);assert.equal(labels.map(o=>o.text).join(''),'每个地图，都有2n的足迹');
 rig.dispose();
});
test('lifted petals follow the return route rather than waiting at a distant origin',()=>{
 for(const [i,t] of [[12,.38],[9,.52],[6,.65]]){const cam=camera();api.lookbackPose(t,cam);cam.updateMatrixWorld();const p=api.flowerPose(i,t);assert.ok(p.distanceTo(cam.position)<130,'petal stayed behind');const screen=p.clone().project(cam);assert.ok(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.85,'escort left phone frame');}
});
test('escort hands its velocity into gathering instead of abruptly freezing every petal',()=>{
 const h=1e-7;
 for(const i of [0,7,13]){const a=api.flowerPose(i,.76-h),b=api.flowerPose(i,.76),c=api.flowerPose(i,.76+h),incoming=b.clone().sub(a).divideScalar(h),outgoing=c.clone().sub(b).divideScalar(h);assert.ok(incoming.distanceTo(outgoing)<.2,'gather join dropped escort velocity');}
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
test('font preparation recovers after timeout and late sync completion without restarting completed labels',async()=>{
 const {prepareWorldText}=await import('../src/companionship.js');
 const text=new T.EventDispatcher();let starts=0;text.textRenderInfo=null;text.sync=()=>{if(!starts)starts++;};
 await assert.rejects(prepareWorldText(text,5),/超时/);
 const retry=prepareWorldText(text,100);text.textRenderInfo={};text.dispatchEvent({type:'synccomplete'});await retry;
 await prepareWorldText(text,5);assert.equal(starts,1);
});
test('real GLB terrain installation can hand off every selected species before opening',async()=>{
 const {readFileSync}=await import('node:fs'),{createBiomes,prepareBiomePetals}=await import('../src/biomes.js'),{createCompanionship}=await import('../src/companionship.js');
 const names={garden:['glass','leaf','rose','clover','rock','goldenleaf'],desert:['cactus','sand','stick','pincer','iris','goldenleaf'],ocean:['pearl','shell','starfish'],jungle:['peas','tomato','bur','goldenleaf','rock','compass'],hell:['darkmark','corruption']};
 const cache=new Map(),catalogs={};
 for(const [kind,list] of Object.entries(names))catalogs[kind]=Object.fromEntries(list.map(name=>{
  const folder=['goldenleaf','rock'].includes(name)?'garden':kind,path=`../public/assets/${folder}-petals/${name}.glb`;
  if(!cache.has(path)){const b=readFileSync(new URL(path,import.meta.url)),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],v=j.bufferViews[a.bufferView],offset=28+length+(v.byteOffset||0)+(a.byteOffset||0),values=new Float32Array(a.count*3);
   for(let k=0;k<values.length;k++)values[k]=b.readFloatLE(offset+k*4);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(values,3));cache.set(path,new T.Mesh(g,new T.MeshStandardMaterial()));}
  return [name,cache.get(path)];
 }));
 const scene=new T.Scene(),rig=createCompanionship(scene),world=createBiomes(scene,true,Object.fromEntries(Object.keys(names).map(kind=>[kind,async()=>catalogs[kind]])));
 scene.add(rig.group);world.onAssetPrepared=rig.install;world.prepare();await prepareBiomePetals(world);
 while(world.groundStatus!=='ready')await new Promise(r=>setTimeout(r,10));rig.capture();
 const moving=rig.group.children.filter(o=>o.isInstancedMesh);assert.equal(moving.length,14);
 for(const mesh of moving){const index=api.FLOWER_SPECS.findIndex(([kind,name])=>mesh.name==='companion-'+kind+':'+name),t=api.flowerReveal(index),cam=camera();api.lookbackPose(t+.015,cam);cam.updateMatrixWorld();rig.update(t);const m=new T.Matrix4();mesh.getMatrixAt(0,m);const center=mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(m),p=center.clone().project(cam);assert.ok(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1,mesh.name+' has no visible grounded origin');}
 rig.update(0);
});
