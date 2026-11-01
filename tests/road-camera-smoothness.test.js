import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sampleRoadCamera,ROAD_STOPS} from '../src/road-story/path.js';

const entry={position:[-340,-160,-10],target:[-330,-160,-10],up:[0,1,0]};
const pose=t=>{const a=sampleRoadCamera(t,entry);return {p:new T.Vector3(...a.position),q:new T.Quaternion(...a.quaternion),f:a.fov};};
const angularVelocity=(a,b,h)=>{
 const q=a.clone().invert().multiply(b);if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);
 const angle=2*Math.acos(T.MathUtils.clamp(q.w,-1,1));
 return new T.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(angle/h);
};
test('all road camera flights have bounded speed changes and lens turns in forward and reverse',()=>{
 const h=1/240;
 for(const direction of [1,-1]){
  let previous=pose(direction===1?0:36),velocity,turn,maxAcceleration=0,maxAngularAcceleration=0,maxStep=0;
  for(let i=1;i<=8640;i++){
   const t=direction===1?i*h:36-i*h,a=pose(t),v=a.p.clone().sub(previous.p).divideScalar(h),w=angularVelocity(previous.q,a.q,h);
   assert.ok([...a.p.toArray(),...a.q.toArray(),a.f].every(Number.isFinite));
   if(velocity)maxAcceleration=Math.max(maxAcceleration,v.distanceTo(velocity)/h);
   if(turn)maxAngularAcceleration=Math.max(maxAngularAcceleration,w.distanceTo(turn)/h);
   maxStep=Math.max(maxStep,previous.q.angleTo(a.q));previous=a;velocity=v;turn=w;
  }
  assert.ok(maxAcceleration<2500,`no sharp rail-speed spikes: ${maxAcceleration}`);
  assert.ok(maxAngularAcceleration<8,`no sudden lens yaw: ${maxAngularAcceleration}`);
  assert.ok(maxStep<.009,`bounded 240Hz angular steps: ${maxStep}`);
 }
});
test('entry waypoints and chapter boundaries match acceleration as well as position',()=>{
 const h=.0002;
 const acceleration=t=>pose(t+h).p.add(pose(t-h).p).addScaledVector(pose(t).p,-2).divideScalar(h*h);
 for(const t of [1.925,3.96,...ROAD_STOPS.slice(1,-1)]){
  const gap=acceleration(t-h).distanceTo(acceleration(t+h));
  assert.ok(gap<3,`matching acceleration at ${t}: ${gap}`);
  const a=pose(t-h),b=pose(t+h);assert.ok(a.q.angleTo(b.q)<.001);assert.ok(Math.abs(a.f-b.f)<.01);
 }
});
