import fs from 'node:fs';
import * as T from 'three';
import {createRoadGeometry} from '../../src/road-story/geometry.js';
import {PETAL_NAMES} from '../../src/road-traffic.js';
import {sampleRoadCamera} from '../../src/road-story/path.js';
import {memoryEntryFrame} from '../../src/guild-memory-entry.js';
const read=p=>JSON.parse(fs.readFileSync(p)),wave=read('public/assets/road-story/wave-config.json'),g=new T.SphereGeometry(1,6,4),m=new T.MeshBasicMaterial();
const world=createRoadGeometry({assets:new Map(PETAL_NAMES.map(name=>[name,{geometry:g,material:m,face:new T.Quaternion()}])),vectorText:read('public/assets/road-story/text-meshes.json'),waveConfig:wave,historyRecords:read('content/history.json').events});
const entry={position:[-340,-160,-10],target:[-330,-160,-10],up:[0,1,0]},camera=new T.PerspectiveCamera(40,414/896,.2,2400),fields=[],matrix=new T.Matrix4(),local=new T.Vector3(),p=new T.Vector3(),failures=[];
world.group.matrixAutoUpdate=false;world.group.matrix.copy(memoryEntryFrame(entry));world.group.traverse(o=>{if(o.userData.typeLine)fields.push(o);});let samples=0,nearGlyphs=0,maxReadableGlyphPixels=0;
for(const clockOffset of [0,100,600])for(let tick=0;tick<=360;tick++){
 const seconds=tick/10,clock=clockOffset+seconds,pose=sampleRoadCamera(seconds,entry),reverse=sampleRoadCamera(36-(360-tick)/10,entry);
 if(pose.position.some((v,i)=>!Number.isFinite(v)||Math.abs(v-reverse.position[i])>1e-7))throw new Error('Camera forward/reverse sample differs');
 camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();world.group.updateMatrixWorld(true);world.update(clock,camera,seconds);samples++;
 for(const field of fields){
  const view=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,field.matrixWorld),a=field.instanceMatrix.array,fade=field.material.userData.tidalNearFade?.value;
  if(!fade)throw new Error('Glyph shader is missing its depth fade');
  for(let i=0;i<field.count;i++){
   const x=a[i*16+12],y=a[i*16+13],z=a[i*16+14];local.set(x,y,z);p.copy(local).applyMatrix4(view);
   if(p.z>24||p.z< -220)continue;
   for(const [axis,terms]of Object.entries(wave)){let displacement=0;for(const term of terms)displacement+=term.a*Math.sin(x*term.x+y*term.y+clock*term.t);local[axis]+=displacement;}
   p.copy(local).applyMatrix4(view);const depth=-p.z;if(depth<=.2)continue;
   const projected=p.clone().applyMatrix4(camera.projectionMatrix);if(Math.abs(projected.x)>1.2||Math.abs(projected.y)>1.2)continue;
   nearGlyphs++;const opacity=T.MathUtils.smoothstep(depth,fade.x,fade.y),pixels=2.2/(Math.max(.1,depth-1.1)*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*896/2;
   if(opacity>.05)maxReadableGlyphPixels=Math.max(maxReadableGlyphPixels,pixels);
   if(pixels>30&&opacity>.05&&failures.length<32)failures.push({seconds,clock,depth,pixels,opacity});
  }
 }
}
const result={cameraSamples:samples,ambientOffsets:[0,100,600],nearGlyphs,maxReadableGlyphPixels,failures};
fs.mkdirSync('scripts/road-story/cache',{recursive:true});fs.writeFileSync('scripts/road-story/cache/transition-audit.json',JSON.stringify(result,null,2));console.log(result);if(failures.length)throw new Error('Background text becomes oversized during camera travel');
