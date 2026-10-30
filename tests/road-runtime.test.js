import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {createRoadGeometry} from '../src/road-story/geometry.js';
import {PETAL_NAMES} from '../src/road-traffic.js';
import {sampleRoadCamera,roadEndingEntry} from '../src/road-story/path.js';
import {endingCamera} from '../src/guild-ending-particles.js';
import {memoryEntryFrame} from '../src/guild-memory-entry.js';
import {createLightTravelers} from '../src/road-story/lights.js';

const data=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const source=new T.SphereGeometry(1,6,4),material=new T.MeshBasicMaterial(),assets=new Map(PETAL_NAMES.map(n=>[n,{geometry:source,material,face:new T.Quaternion()}]));
test('real scene geometry survives ten-minute idle, all camera flights, and viewport changes',()=>{
 const world=createRoadGeometry({assets,vectorText:data('public/assets/road-story/text-meshes.json'),waveConfig:data('public/assets/road-story/wave-config.json'),historyRecords:data('content/history.json').events});
 const fields=[];world.group.traverse(o=>{if(o.userData.typeLine)fields.push(o);});
 assert.ok(fields.length>=3,'default background is repeated 2n text rather than plain contours');
 assert.ok(fields.every(o=>o.isInstancedMesh),'repeated glyphs share small geometry');
 for(const field of fields){const shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader};field.material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('mvPosition.z +='),'wave displacement follows instance placement');}
 const entry={position:[-340,-160,-10],target:[-330,-160,-10],up:[0,1,0]},camera=new T.PerspectiveCamera(40,414/896,.2,2400);
 // This entry has the same yaw/frame as production; audit actual far cap vertices.
 world.group.matrixAutoUpdate=false;world.group.matrix.copy(memoryEntryFrame(entry));
 let min=Infinity,max=0;
 for(const aspect of [414/896,896/414])for(const t of [0,2,5.5,9.3,11.5,13,14.3,18.1,20.3,22,23.1,28.6,30.6,33,36]){
  camera.aspect=aspect;const pose=sampleRoadCamera(t,entry);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  world.group.updateMatrixWorld(true);world.update(600+t,camera,t);
  min=Math.min(min,world.visibleCount);max=Math.max(max,world.visibleCount);
  const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  for(const c of world.contexts)for(const r of c.roads){
   for(const u of r.endU)for(const v of [0,.5,1]){
    const p=r.sample(u,v).applyMatrix4(r.root.matrixWorld),clip=new T.Vector4(p.x,p.y,p.z,1).applyMatrix4(vp);
    assert.ok(clip.w<=0||Math.abs(clip.x)>clip.w||Math.abs(clip.y)>clip.w||Math.abs(clip.z)>clip.w,'physical road cap outside camera');
   }
   for(const u of [-r.traffic.margin/r.traffic.length,1+r.traffic.margin/r.traffic.length])assert.ok(r.sample(u,.5).applyMatrix4(r.root.matrixWorld).distanceTo(camera.position)>1100,'recycle outside fog-culling radius');
  }
  world.group.traverse(o=>{if(o.geometry){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}if(o.isInstancedMesh){assert.ok(o.count<=o.instanceMatrix.count);for(let i=0;i<o.count*16;i++)assert.ok(Number.isFinite(o.instanceMatrix.array[i]));}});
 }
 assert.ok(world.instanceCount>1000);assert.ok(max>40);assert.ok(min>=0);
 world.update(240,camera,9.3);
 const lane=world.contexts[0].petals.filter(p=>p.mesh.userData.route?.road===world.contexts[0].roads[0]&&p.mesh.userData.route.lane===0&&p.mesh.position.y< -230&&p.mesh.position.y> -270);
 for(let i=0;i<lane.length;i++)for(let j=i+1;j<lane.length;j++)assert.ok(lane[i].mesh.position.distanceTo(lane[j].mesh.position)-lane[i].mesh.scale.x-lane[j].mesh.scale.x>.45,'random spacing remains safe on bent road extensions');
 const c=world.contexts[1],r=c.roads[0],positions=[];
 for(const time of [0,60,300,600]){world.update(time,camera,18.1);positions.push(c.petals.find(p=>p.mesh.userData.route?.road===r).mesh.position.clone());}
 assert.ok(positions.every((p,i)=>!i||p.distanceTo(positions[i-1])>1));
 const ending=memoryEntryFrame(roadEndingEntry(entry));
 camera.fov=48;camera.aspect=414/896;camera.updateProjectionMatrix();
 for(const t of [0,.1,.35,.65,.95,1]){const pose=endingCamera({position:[-4,7,198],target:[0,0,-14]},t);camera.position.fromArray(pose.position).applyMatrix4(ending);camera.lookAt(new T.Vector3(...pose.target).applyMatrix4(ending));camera.updateMatrixWorld();world.update(60,camera,36);assert.equal(world.visibleCount,0,'old road riders must not remain as stationary edge petals in the particle clearing');}
});
test('only three luminous travelers exist and halo plus tail retain depth testing',()=>{
 const rig=createLightTravelers(),cam=new T.PerspectiveCamera();rig.group.updateMatrixWorld(true);
 const lights=[];rig.group.traverse(o=>{if(o.isPointLight)lights.push(o);if(o.isMesh){assert.equal(o.material.depthTest,true);assert.equal(o.material.depthWrite,false);}});
 assert.equal(lights.length,3);rig.update(4,18.1,cam);const first=lights.map(l=>l.position.clone());rig.update(5,18.1,cam);
 lights.forEach((l,i)=>assert.ok(l.position.distanceTo(first[i])>1));rig.dispose();
});
