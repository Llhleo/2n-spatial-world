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
for(const [index,times]of [[8.6,9.3,10.4],[17.1,18.1,19.4],[25,28.6,30]].entries())for(const [clock,t]of times.entries()){
 const pose=sampleRoadCamera(t,entry);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();world.group.updateMatrixWorld(true);world.update(clock*15,camera,t);
 const context=world.contexts[index];
 for(const label of context.labels.children){label.geometry.computeBoundingBox();const box=label.geometry.boundingBox;
  for(const x of [.1,.3,.5,.7,.9])for(const y of [.25,.6]){
   point.set(T.MathUtils.lerp(box.min.x,box.max.x,x),T.MathUtils.lerp(box.min.y,box.max.y,y),0).applyMatrix4(label.matrixWorld);
   const target=point.clone(),screen=point.clone().project(camera);samples++;
   if(Math.abs(screen.x)>.97||Math.abs(screen.y)>.97)blocked.push({index,t,text:label.userData.text,reason:'outside safe viewport'});
   ray.setFromCamera(screen,camera);
   if(ray.intersectObjects(context.roads.map(r=>r.root),true).some(hit=>hit.distance<camera.position.distanceTo(target)-.1))blocked.push({index,t,text:label.userData.text,reason:'foreground road'});
  }
 }
}
const result={viewport:[414,896],cameraSamples:9,textSamples:samples,blocked};
fs.mkdirSync('scripts/road-story/cache',{recursive:true});fs.writeFileSync('scripts/road-story/cache/layout-audit.json',JSON.stringify(result,null,2));console.log(result);
if(blocked.length)throw new Error('Road text loses its reading area');
