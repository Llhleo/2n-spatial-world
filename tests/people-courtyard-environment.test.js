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
// Removing the route branch must fail coverage; bbox includes every actual HD vertex extent.
test('all shots contain complete separated HD petals across two depths',()=>{
 for(const [width,height] of [[414,896],[320,568],[896,414],[768,1024]]){
 for(const glyphMetrics of [undefined,{members:data.members.map(()=>({minX:0,maxX:3,glyphs:[[0,0,1,1]]}))}]){
 const route=resizeCourtyard(createPeopleRoute(data),{width,height,glyphMetrics}),{rig}=fixture();rig.resize(width/height);
 for(const [i,w] of route.windows.entries()){
 const ts=[w.readStart,(w.readStart+w.readEnd)/2,w.readEnd];if(i)for(const f of [.02,.25,.5,.75,.98])ts.push(route.windows[i-1].readEnd+(w.readStart-route.windows[i-1].readEnd)*f);
 for(const t of ts){rig.update(1,0,t,route);const visible=boxes(rig,camera(route,t)).filter(b=>b.clip&&b.minX>-.98&&b.maxX<.98&&b.minY>-.98&&b.maxY<.98&&Math.max((b.maxX-b.minX)*width/2,(b.maxY-b.minY)*height/2)>=12);
 assert.ok(visible.some((a,i)=>visible.slice(i+1).some((b,j)=>separated(a,b)&&visible.slice(i+j+2).some(c=>separated(a,c)&&separated(b,c)&&Math.max(a.depth,b.depth,c.depth)-Math.min(a.depth,b.depth,c.depth)>5))),`${width} shot ${t}: only ${visible.length} viable petals`);
 }}rig.dispose();
 }}
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
 assert.equal(rig.group.children.filter(m=>m.isInstancedMesh).reduce((n,m)=>n+m.count,0),42);
 for(const [i,[kind,name]]of FLOWER_SPECS.entries()){
  const source=sources[i];let disposed=0;source.geometry.addEventListener('dispose',()=>disposed++);source.material.addEventListener('dispose',()=>disposed++);rig.installDisplay(source,kind,name);
  const meshes=rig.group.children.filter(m=>m.isInstancedMesh&&m.name.endsWith(kind+':'+name));assert.equal(meshes.length,2);assert.equal(meshes[0].geometry,meshes[1].geometry);assert.equal(meshes[0].material,meshes[1].material);source.userData.check=()=>assert.equal(disposed,0);
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
function identities(rig){const result=new Map();for(const mesh of rig.group.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('courtyard-')))for(let i=0;i<mesh.count;i++){
 const m=new T.Matrix4();mesh.getMatrixAt(i,m);const s=new T.Vector3();m.decompose(new T.Vector3(),new T.Quaternion(),s);const size=mesh.geometry.boundingBox.getSize(new T.Vector3());result.set(mesh.userData.anchorIds?.[i],s.length()*Math.max(size.x,size.y,size.z));
 }return result;}
// Catches a visible world-anchor substitution at the bounded pool's rank cutoff.
test('pool replacements fade to zero without visible identity pops',()=>{
 const route=resizeCourtyard(createPeopleRoute(data),{width:414,height:896}),{rig}=fixture();
 for(let i=1;i<1200;i++){
 const t=i/1200;rig.update(1,0,t-1e-7,route);const a=identities(rig);rig.update(1,0,t+1e-7,route);const b=identities(rig);
 for(const id of new Set([...a.keys(),...b.keys()]))assert.ok(Math.abs((a.get(id)||0)-(b.get(id)||0))<.1,`visible replacement ${id} at ${t}: ${a.get(id)} -> ${b.get(id)}`);
 }
 // Locate actual discrete rank changes, rather than hoping regular samples hit one.
 let previous=0;rig.update(1,0,previous,route);let old=identities(rig);
 for(let i=1;i<=200;i++){
 const t=i/200;rig.update(1,0,t,route);const next=identities(rig),lost=[...old.keys()].find(id=>id&& !next.has(id));
 if(lost){let lo=previous,hi=t;for(let k=0;k<35;k++){const mid=(lo+hi)/2;rig.update(1,0,mid,route);if(identities(rig).has(lost))lo=mid;else hi=mid;}
 rig.update(1,0,lo,route);assert.ok((identities(rig).get(lost)||0)<1e-5,`${lost} replaced at visible scale`);}
 previous=t;old=next;
 }rig.dispose();
});

test('decorative motion advances only with positive dt',()=>{
 const route=resizeCourtyard(createPeopleRoute(data),{width:414,height:896}),{rig}=fixture();const snapshot=()=>rig.group.children.filter(m=>m.name.startsWith('courtyard-')).map(m=>Array.from(m.instanceMatrix.array));
 rig.update(1,0,.4,route);const initial=snapshot();rig.update(1,.05,.4,route);assert.notDeepEqual(snapshot(),initial);const moved=snapshot();for(let i=0;i<10;i++)rig.update(1,0,.4,route);assert.deepEqual(snapshot(),moved);rig.dispose();
});
