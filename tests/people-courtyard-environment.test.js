import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {createCompanionship} from '../src/companionship.js';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard} from '../src/people-courtyard.js';
import {FLOWER_SPECS} from '../src/lookback.js';
const data={leaders:[{id:'a',name:'A'},{id:'b',name:'B'}],members:Array.from({length:95},(_,i)=>`member ${i}`)};
function geometry(name){
 const b=readFileSync(new URL(`../public/assets/companion-display/${name}.glb`,import.meta.url)),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],v=j.bufferViews[a.bufferView],offset=28+length+(v.byteOffset||0)+(a.byteOffset||0),values=new Float32Array(a.count*3);
 for(let k=0;k<values.length;k++)values[k]=b.readFloatLE(offset+k*4);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(values,3));g.computeBoundingBox();return g;
}
function fixture(hd=true){
 const scene=new T.Scene(),rig=createCompanionship(scene),ground=[],sources=[];
 for(const [kind,name] of FLOWER_SPECS){
  const source=new T.Mesh(geometry(name),new T.MeshStandardMaterial());sources.push(source);
  let root=scene.getObjectByName(kind==='garden'?'florr-petal-assembly':'florr-'+kind);if(!root){root=new T.Group();root.name=kind==='garden'?'florr-petal-assembly':'florr-'+kind;scene.add(root);}
  const batch=new T.InstancedMesh(source.geometry,source.material,1),m=new T.Matrix4().compose(new T.Vector3(166,-30,10),new T.Quaternion().setFromEuler(new T.Euler(.2,.4,.1)),new T.Vector3(2,2,2));batch.setMatrixAt(0,m);root.add(batch);ground.push([batch,Array.from(batch.instanceMatrix.array)]);rig.install(source,kind,name);if(hd)rig.installDisplay(source,kind,name);
 }
 return {rig,ground,sources};
}
const matrices=rig=>rig.group.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('companion-')).map(m=>Array.from(m.instanceMatrix.array));
function camera(route,t){const p=sampleCourtyard(route,t,route.viewport.width/route.viewport.height),c=new T.PerspectiveCamera(48,route.viewport.width/route.viewport.height,.2,2400);c.position.fromArray(p.position);c.up.fromArray(p.up);c.lookAt(new T.Vector3(...p.target));c.updateMatrixWorld();return c;}
function boxes(rig,c){const result=[];for(const mesh of rig.group.children.filter(m=>m.isInstancedMesh&&m.visible))for(let i=0;i<mesh.count;i++){
 const m=new T.Matrix4();mesh.getMatrixAt(i,m);if(Math.abs(m.determinant())<1e-14)continue;
 const box=mesh.geometry.boundingBox,corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new T.Vector3(x,y,z).applyMatrix4(m).project(c));
 const center=box.getCenter(new T.Vector3()).applyMatrix4(m).applyMatrix4(c.matrixWorldInverse);
 result.push({name:mesh.name,minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxY:Math.max(...corners.map(p=>p.y)),depth:-center.z,clip:corners.every(p=>p.z>-1&&p.z<1)});
 }return result;}
const separated=(a,b)=>a.maxX<b.minX||b.maxX<a.minX||a.maxY<b.minY||b.maxY<a.minY;
// Actual HD vertex bounds, not simplified proxy models.
test('stable chains remain readable and separated on all five-region shots',()=>{
 for(const [width,height] of [[414,896],[320,568],[896,414],[768,1024]]){
  const route=resizeCourtyard(createPeopleRoute(data),{width,height}),{rig}=fixture();rig.resize(width/height);
  for(const w of route.windows.slice(1))for(const t of [w.readStart,(w.readStart+w.readEnd)/2,w.readEnd]){
   rig.update(1,.05,t,route);const visible=boxes(rig,camera(route,t));
   assert.equal(visible.length,width<600?10:12);
   assert.ok(visible.every(b=>b.clip&&b.minX>-.98&&b.maxX<.98&&b.minY>-.98&&b.maxY<.98));
   assert.ok(visible.every(b=>Math.max((b.maxX-b.minX)*width/2,(b.maxY-b.minY)*height/2)>=26));
   for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)assert.ok(separated(visible[i],visible[j]));
  }rig.dispose();
 }
});
// Catches replacement of live orbit/scale by the zero-orbit sampler and lost ground restoration.
test('old return samples and live entry seam remain identical; reverse restores ground',()=>{
 const a=fixture(),b=fixture(),route=createPeopleRoute(data);
 for(const t of [.09,.27,.56,.75,.85,1]){a.rig.update(t,.037);b.rig.update(t,.037,0,route);assert.deepEqual(matrices(a.rig),matrices(b.rig));}
 const before=matrices(b.rig);b.rig.update(1,0,1e-9,route);matrices(b.rig).forEach((m,i)=>m.forEach((x,j)=>assert.ok(Math.abs(x-before[i][j])<1e-5)));
 b.rig.update(1,0,.8,route);b.rig.update(0,0,0,route);for(const [batch,original]of b.ground)assert.deepEqual(Array.from(batch.instanceMatrix.array),original);a.rig.dispose();b.rig.dispose();
});
// Catches duplicate downloads/ownership and stale pool references after late HD installation.
test('bounded pool shares upgraded HD geometry and material without disposing source',()=>{
 const {rig,sources}=fixture(false),route=createPeopleRoute(data);rig.update(1,0,.5,route);
 assert.equal(rig.group.children.filter(m=>m.isInstancedMesh).reduce((n,m)=>n+m.count,0),14);
 for(const [i,[kind,name]]of FLOWER_SPECS.entries()){
  const source=sources[i];let disposed=0;source.geometry.addEventListener('dispose',()=>disposed++);source.material.addEventListener('dispose',()=>disposed++);rig.installDisplay(source,kind,name);
  const meshes=rig.group.children.filter(m=>m.isInstancedMesh&&m.name.endsWith(kind+':'+name));assert.equal(meshes.length,1);assert.notEqual(meshes[0].geometry,source.geometry);source.userData.check=()=>assert.equal(disposed,0);
 }rig.dispose();sources.forEach(s=>s.userData.check());
});
// Catches ornament drift in reduced mode, stateful chapter anchors, and text intersections.
test('maximum decorative motion avoids text and reduced sampling is reversible',()=>{
 for(const [width,height] of [[414,896],[320,568],[896,414],[768,1024]]){
 const route=resizeCourtyard(createPeopleRoute(data),{width,height}),{rig}=fixture();rig.resize(width/height);
 for(const w of route.windows.slice(1))for(const t of [w.readStart,(w.readStart+w.readEnd)/2,w.readEnd]){
 rig.update(1,0,t,route);const before=rig.group.children.filter(m=>m.isInstancedMesh).map(m=>Array.from(m.instanceMatrix.array));rig.update(1,0,1,route);rig.update(1,0,t,route);assert.deepEqual(rig.group.children.filter(m=>m.isInstancedMesh).map(m=>Array.from(m.instanceMatrix.array)),before);
 const c=camera(route,t);for(const mesh of rig.group.children.filter(m=>m.isInstancedMesh&&m.visible))for(let i=0;i<mesh.count;i++){
 const m=new T.Matrix4();mesh.getMatrixAt(i,m);const scale=new T.Vector3(),q=new T.Quaternion(),p=new T.Vector3();m.decompose(p,q,scale);if(scale.length()<1e-8)continue;
 const center=mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(m).applyMatrix4(c.matrixWorldInverse),radius=mesh.geometry.boundingBox.getSize(new T.Vector3()).multiply(scale).length()/2+.3;
 if(-center.z<=radius)continue;const x=center.x/(-center.z*Math.tan(Math.PI*24/180)*c.aspect),y=center.y/(-center.z*Math.tan(Math.PI*24/180)),rx=radius/((-center.z-radius)*Math.tan(Math.PI*24/180)*c.aspect),ry=radius/((-center.z-radius)*Math.tan(Math.PI*24/180));
 assert.ok(x+rx<-.76||x-rx>.76||y+ry<-.4||y-ry>.4,`${mesh.name} maximum envelope crosses text at ${t}`);
 }
 }rig.dispose();}
});
test('same visible model identities persist without scale flashes across transfers',()=>{
 const route=resizeCourtyard(createPeopleRoute(data),{width:414,height:896}),{rig}=fixture();
 let names=null;
 for(let i=0;i<=80;i++){
  const t=route.windows[1].readStart+(1-route.windows[1].readStart)*i/80;
  rig.update(1,0,t,route);const visible=boxes(rig,camera(route,t));
  const current=visible.map(b=>b.name);if(names)assert.deepEqual(current,names);names=current;
  assert.ok(visible.every(b=>(b.maxX-b.minX)*414/2>20));
 }rig.dispose();
});

test('decorative motion advances only with positive dt',()=>{
 const route=resizeCourtyard(createPeopleRoute(data),{width:414,height:896}),{rig}=fixture();const snapshot=()=>rig.group.children.filter(m=>m.name.startsWith('companion-')).map(m=>Array.from(m.instanceMatrix.array));
 rig.update(1,0,.4,route);const initial=snapshot();rig.update(1,.05,.4,route);assert.notDeepEqual(snapshot(),initial);const moved=snapshot();for(let i=0;i<10;i++)rig.update(1,0,.4,route);assert.deepEqual(snapshot(),moved);rig.dispose();
});

test('new chains never intersect each other while breathing; old ring exits before first leader',()=>{
 const route=resizeCourtyard(createPeopleRoute(data),{width:414,height:896}),{rig}=fixture();
 const first=route.windows[1].readStart;rig.update(1,0,first,route);
 assert.equal(boxes(rig,camera(route,first)).length,10,'the original ring becomes one chain set, not a second pool');
 for(let i=1;i<=120;i++){
  const t=first+(1-first)*i/120;rig.update(1,.05,t,route);
  const visible=boxes(rig,camera(route,t)).filter(b=>b.name.startsWith('companion-')&&Math.max(b.maxX-b.minX,b.maxY-b.minY)>1e-4);
  for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++)assert.ok(separated(visible[a],visible[b]),`chain collision at ${t}: ${visible[a].name}/${visible[b].name}`);
 }rig.dispose();
});
