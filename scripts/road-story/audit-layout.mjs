import fs from 'node:fs';
import * as T from 'three';
import {createRoadGeometry} from '../../src/road-story/geometry.js';
import {PETAL_NAMES} from '../../src/road-traffic.js';
import {sampleRoadCamera} from '../../src/road-story/path.js';
import {memoryEntryFrame} from '../../src/guild-memory-entry.js';
const read=p=>JSON.parse(fs.readFileSync(p)),g=new T.SphereGeometry(1,6,4),m=new T.MeshBasicMaterial();
const world=createRoadGeometry({assets:new Map(PETAL_NAMES.map(name=>[name,{geometry:g,material:m,face:new T.Quaternion()}])),vectorText:read('public/assets/road-story/text-meshes.json'),waveConfig:read('public/assets/road-story/wave-config.json'),historyRecords:read('content/history.json').events});
const entry={position:[-340,-160,-10],target:[-330,-160,-10],up:[0,1,0]},camera=new T.PerspectiveCamera(40,414/896,.2,2400),ray=new T.Raycaster(),point=new T.Vector3(),blocked=[];let samples=0;
world.group.matrixAutoUpdate=false;world.group.matrix.copy(memoryEntryFrame(entry));
let petalFrames=0;
function inspectPetals(context,t,clock){
 petalFrames++;
 const bounds=context.labels.children.map(label=>{const box=label.geometry.boundingBox,lo=box.min.clone().applyMatrix4(label.matrixWorld).project(camera),hi=box.max.clone().applyMatrix4(label.matrixWorld).project(camera);return {text:label.userData.text,left:lo.x,right:hi.x,bottom:lo.y,top:hi.y};});
 const p=new T.Vector3(),local=new T.Vector3(),frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),sphere=new T.Sphere();
 for(const owner of world.contexts)for(const petal of owner.petals){
  p.copy(petal.mesh.position);if(petal.mesh.userData.route)p.applyMatrix4(petal.parent.matrix);p.applyMatrix4(owner.root.matrixWorld);
  sphere.center.copy(p);sphere.radius=petal.mesh.scale.x*1.1;if(!frustum.intersectsSphere(sphere))continue;
  const depth=-local.copy(p).applyMatrix4(camera.matrixWorldInverse).z;if(depth<=petal.mesh.scale.x||depth>1100)continue;
  p.project(camera);const ry=petal.mesh.scale.x/((depth-petal.mesh.scale.x)*Math.tan(T.MathUtils.degToRad(camera.fov/2))),rx=ry/camera.aspect;
  for(const b of bounds)if(p.x+rx>b.left&&p.x-rx<b.right&&p.y+ry>b.bottom&&p.y-ry<b.top&&blocked.length<64)blocked.push({index:world.contexts.indexOf(context),t,clock,text:b.text,reason:'petal silhouette',name:petal.mesh.userData.assetName,owner:world.contexts.indexOf(owner),depth,screen:p.toArray(),radius:[rx,ry]});
 }
}
for(const [index,times]of [[8.6,9.3,10.4],[17.1,18.1,19.4],[25,28.6,30]].entries())for(const [clock,t]of times.entries()){
 const pose=sampleRoadCamera(t,entry);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();world.group.updateMatrixWorld(true);world.update(clock*15,camera,t);
 const context=world.contexts[index];
 for(const label of context.labels.children){label.geometry.computeBoundingBox();const box=label.geometry.boundingBox;
  for(const x of [.1,.3,.5,.7,.9])for(const y of [.25,.6]){
   point.set(T.MathUtils.lerp(box.min.x,box.max.x,x),T.MathUtils.lerp(box.min.y,box.max.y,y),0).applyMatrix4(label.matrixWorld);
   const target=point.clone(),screen=point.clone().project(camera);samples++;
   if(Math.abs(screen.x)>.97||Math.abs(screen.y)>.97)blocked.push({index,t,text:label.userData.text,reason:'outside safe viewport'});
   ray.setFromCamera(screen,camera);
   if(ray.intersectObjects(world.contexts.flatMap(c=>c.roads.map(r=>r.root)),true).some(hit=>label.userData.textRole==='body'||index===1?hit.distance<1100:hit.distance<camera.position.distanceTo(target)-.1))blocked.push({index,t,text:label.userData.text,reason:index===1?'road silhouette':'foreground road'});
  }
 }
 inspectPetals(context,t,clock*15);
}
for(const [index,stop]of [9.3,18.1,28.6].entries()){
const pose=sampleRoadCamera(stop,entry);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
for(let clock=0;clock<=600;clock++){world.update(clock,camera,stop);inspectPetals(world.contexts[index],stop,clock);}
}
const result={viewport:[414,896],cameraSamples:9,textSamples:samples,petalFrames,idleSeconds:600,blocked};
fs.mkdirSync('scripts/road-story/cache',{recursive:true});fs.writeFileSync('scripts/road-story/cache/layout-audit.json',JSON.stringify(result,null,2));console.log(result);
if(blocked.length)throw new Error('Road text loses its reading area');
