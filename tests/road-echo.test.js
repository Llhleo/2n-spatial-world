import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFiveRealmEcho,echoTiming} from '../src/road-story/echo.js';
import {renderRoadStory} from '../src/road-story/view.js';
import {sampleRoadCamera} from '../src/road-story/path.js';
import {createLightTravelers} from '../src/road-story/lights.js';
import {memoryEntryFrame} from '../src/guild-memory-entry.js';
import {LIGHT_PHASES,roadLightPoint} from '../src/road-story/light-flight.js';

const entry={position:[50,20,30],target:[50,20,29],up:[0,1,0]};
const renderer={getDrawingBufferSize:size=>size.set(414,896)};

test('Echo starts at the last road camera and samples the same positions in reverse',()=>{
 globalThis.matchMedia=()=>({matches:true});
 const echo=createFiveRealmEcho(renderer);
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 echo.update(camera,entry,0,false);
 const original=sampleRoadCamera(36,entry);
 assert.ok(camera.position.distanceTo(new T.Vector3(...original.position))<1e-8);
 assert.ok(camera.quaternion.angleTo(new T.Quaternion(...original.quaternion))<1e-7);
 assert.equal(camera.fov,original.fov);
 const end=echoTiming(1), join=1.65/18;
 assert.ok(end.time>=14);
 const poses=[];
 for(const t of [0,join-.00001,join,join+.00001,.31,.59,.88,1]){
  echo.update(camera,entry,t,false);
  poses.push([t,camera.position.clone(),camera.quaternion.clone()]);
 }
 assert.ok(poses[1][1].distanceTo(poses[2][1])<.03);
 assert.ok(poses[2][1].distanceTo(poses[3][1])<.03);
 for(const [t,position,quaternion] of poses.reverse()){
  echo.update(camera,entry,t,false);
  assert.ok(position.distanceTo(camera.position)<1e-8);
  assert.ok(quaternion.angleTo(camera.quaternion)<1e-7);
 }
});

test('Echo keeps the road bead rig, supplies a continuous cue and hides the legacy chain',()=>{
 globalThis.matchMedia=()=>({matches:false});
 const scene=new T.Scene(),echo=createFiveRealmEcho(renderer);
 const road=new T.Group(),other=new T.Group(),oldEnding=new T.Group();
 const camera=new T.PerspectiveCamera(48,1,.2,2400);
 scene.add(road,other,oldEnding,echo.group);
 road.visible=false;oldEnding.visible=true;
 const seen=[];
 for(const chapter of [{chapter:'history',historyT:.75},...[.02,.2,1,.02].map(nextT=>({chapter:'next',historyT:1,nextT}))]){
  let cue;
  renderRoadStory({scene,camera,echo,roads:{group:road,update(update){cue=update.echo;}},memory:{group:oldEnding},
   nextView:{ready:false,group:new T.Group()},state:{entryPose:entry},chapter,departureGroups:[],
   renderer:{render(){seen.push([road.visible,echo.group.visible,oldEnding.visible,cue?.storyBlend===1]);}}});
  assert.equal(road.visible,false);
  assert.equal(echo.group.visible,false);
  assert.equal(other.visible,true);
  assert.equal(oldEnding.visible,true);
 }
 assert.deepEqual(seen,[[true,false,false,false],[true,true,false,false],[true,true,false,true],[true,true,false,true],[true,true,false,false]]);
});

test('the same three depth-tested heads and trails continue from the road into Echo',()=>{
 globalThis.matchMedia=()=>({matches:true});
 const echo=createFiveRealmEcho(renderer),rig=createLightTravelers();
 const camera=new T.PerspectiveCamera(40,414/896,.2,2400),frame=memoryEntryFrame(entry);
 rig.group.matrixAutoUpdate=false;rig.group.matrix.copy(frame);rig.group.updateMatrixWorld();
 const cores=rig.group.children.filter(o=>o.name==='road-light-core');
 const tails=rig.group.children.filter(o=>o.name==='road-light-trail');
 const masks=rig.group.children.filter(o=>o.name==='road-light-trail-stencil');
 assert.equal(cores.length,3);
 assert.ok(echo.group.children.every(o=>o.isPoints&&o.material.isShaderMaterial&&o.material.blending===T.NormalBlending));
 assert.ok(masks.every((o,lane)=>o.geometry===tails[lane].geometry&&o.material.depthTest&&o.material.stencilRef===1));
 const previous=cores.map(()=>new T.Vector3()),end=new T.Vector3();
 const visibleFrames=[0,0,0];
 try{
  for(let i=0;i<=360;i++){
   const time=i/60,shot=34+time,seconds=Math.max(0,shot-36);
   const cue=seconds>0?echo.update(camera,entry,seconds/18,false):null;
   if(!cue){
    const pose=sampleRoadCamera(shot,entry);
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
   }
   rig.update(time,Math.min(shot,36),camera,false,seconds/18,cue??echo.roadLights);
   if(i>0&&(Math.abs(seconds-1.65)<.12||Math.abs(shot-36)<.12)){
    cores.forEach((core,lane)=>{
     assert.ok(core.position.distanceTo(previous[lane])<6);
     const position=tails[lane].geometry.attributes.position;
     const center=new T.Vector3();
     for(let vertex=position.count-6;vertex<position.count;vertex++)center.add(end.fromBufferAttribute(position,vertex));
     assert.ok(center.multiplyScalar(1/6).distanceTo(core.position)<.001);
    });
   }
   cores.forEach((core,lane)=>{
    previous[lane].copy(core.position);
    if(seconds<1.7)return;
    end.copy(core.position).applyMatrix4(frame).project(camera);
    if(core.visible&&Math.abs(end.x)<.99&&Math.abs(end.y)<.99&&Math.abs(end.z)<1)visibleFrames[lane]++;
   });
  }
  assert.ok(visibleFrames.every(count=>count>22),JSON.stringify(visibleFrames));
 } finally {rig.dispose();}
});

test('each ending lane inherits its road tangent and stays smooth in the portrait camera',()=>{
 globalThis.matchMedia=()=>({matches:true});
 const echo=createFiveRealmEcho(renderer);
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400),frame=memoryEntryFrame(entry);
 const cue=echo.roadLights;
 const road=(t,lane)=>roadLightPoint(36+t+LIGHT_PHASES[lane],new T.Vector3(),lane);
 const position=(t,lane)=>t<cue.lightStart(lane)?road(t,lane):cue.sampleLight(t,lane,new T.Vector3());
 function projected(t,lane){
  if(t>=0)echo.update(camera,entry,t/18,false);
  else {
   const pose=sampleRoadCamera(36+t,entry);
   camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);
   camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  const point=position(t,lane).applyMatrix4(frame).project(camera);
  return new T.Vector2(point.x*207,point.y*448);
 }
 for(let lane=0;lane<3;lane++){
  const join=cue.lightStart(lane),epsilon=.001;
  assert.ok(position(join,lane).distanceTo(road(join,lane))<.001);
  const incoming=position(join,lane).sub(position(join-epsilon,lane)).divideScalar(epsilon);
  const outgoing=position(join+epsilon,lane).sub(position(join,lane)).divideScalar(epsilon);
  assert.ok(incoming.distanceTo(outgoing)<1);
  for(const rate of [1,-1.35]){
   const step=rate/60;
   for(let t=-.6;t<5.95;t+=1/120){
    if(cue.lightOpacity(t,lane)<.18)continue;
    const center=projected(t,lane);
    if(Math.abs(center.x)>202||Math.abs(center.y)>438)continue;
    const before=center.clone().sub(projected(t-step,lane));
    const after=projected(t+step,lane).sub(center);
    const speed=before.length()/Math.abs(step),nextSpeed=after.length()/Math.abs(step);
    const angle=Math.abs(Math.atan2(before.cross(after),before.dot(after)));
    const location=`lane ${lane}, shot ${t.toFixed(3)}, rate ${rate}`;
    assert.ok(Math.min(speed,nextSpeed)>32,`projected stall at ${location}`);
    assert.ok(nextSpeed/speed>.83&&nextSpeed/speed<1.2,`projected speed jumps at ${location}`);
    assert.ok(angle<.2,`projected direction jumps at ${location}`);
   }
  }
 }
});

test('Echo camera motion and moving particle layers settle without a hard cut',()=>{
 globalThis.matchMedia=()=>({matches:true});
 const echo=createFiveRealmEcho(renderer),camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 const [petals,thread,dust,pollen]=echo.group.children;
 const sample=seconds=>{
  echo.update(camera,entry,seconds/18,false);
  return {p:camera.position.clone(),q:camera.quaternion.clone()};
 };
 for(const seconds of [1.65,1.65+12.65,1.65+15.35]){
  const dt=.001,a=sample(seconds-dt),b=sample(seconds),c=sample(seconds+dt);
  const before=b.p.clone().sub(a.p).divideScalar(dt),after=c.p.clone().sub(b.p).divideScalar(dt);
  assert.ok(before.distanceTo(after)<.15,`camera translation at ${seconds}s`);
  assert.ok(Math.abs(a.q.angleTo(b.q)-b.q.angleTo(c.q))/dt<.006,`camera rotation at ${seconds}s`);
 }
 sample(1.65);
 assert.equal(petals.visible,false);
 assert.equal(dust.visible,true);
 const lifetime=thread.geometry.attributes.life,positions=thread.geometry.attributes.position;
 const prev=new Float32Array(positions.array.length),previousLife=new Float32Array(lifetime.count);
 let wraps=0;
 for(let i=0;i<=40;i++){
  sample(3+i/120);
  if(i>0)for(let j=0;j<lifetime.count;j++){
   const k=j*3,step=Math.hypot(positions.array[k]-prev[k],positions.array[k+1]-prev[k+1],positions.array[k+2]-prev[k+2]);
   if(step>1){assert.ok(Math.max(previousLife[j],lifetime.getX(j))<.001);wraps++;}
  }
  prev.set(positions.array);previousLife.set(lifetime.array);
 }
 assert.ok(wraps>50);
 sample(10);
 const pollenPositions=pollen.geometry.attributes.position;
 const previousPollen=pollenPositions.array.slice();
 sample(10+1/60);
 const motion=pollenPositions.array.reduce((max,value,i)=>Math.max(max,Math.abs(value-previousPollen[i])),0);
 assert.ok(motion>.002&&motion<.02);
});
