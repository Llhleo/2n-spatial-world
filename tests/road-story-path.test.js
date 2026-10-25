import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sampleRoadCamera,roadEndingEntry,lightTrackPoint,ROAD_STOPS} from '../src/road-story/path.js';
import {memoryEntryFrame} from '../src/guild-memory-entry.js';
const entry={position:[100,20,-700],target:[120,20,-720],up:[0,1,0]};
test('road camera is continuous at every scene boundary in either direction',()=>{
 for(const t of ROAD_STOPS.slice(1,-1)){
  const a=sampleRoadCamera(t-1e-6,entry),b=sampleRoadCamera(t+1e-6,entry);
  assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position))<.02,`position ${t}`);
  const qa=new T.Quaternion(...a.quaternion),qb=new T.Quaternion(...b.quaternion);
  assert.ok(qa.angleTo(qb)<.001,`angle ${t}`);
 }
 const first=sampleRoadCamera(0,entry);assert.ok(new T.Vector3(...first.position).distanceTo(new T.Vector3(...entry.position))<1e-7);
});
test('ending frame is a fixed forward translation from the road frame',()=>{
 const frame=memoryEntryFrame(entry),shift=roadEndingEntry(entry),out=memoryEntryFrame(shift);
 const expected=frame.clone().multiply(new T.Matrix4().makeTranslation(0,0,-1650));
 assert.ok(Math.max(...out.elements.map((v,i)=>Math.abs(v-expected.elements[i])))<1e-8);
});
test('all three lights sample the same closed smooth track without stopping',()=>{
 for(let scene=0;scene<3;scene++){
  assert.ok(lightTrackPoint(scene,0).distanceTo(lightTrackPoint(scene,1))<1e-6);
  for(let i=0;i<400;i++)assert.ok(lightTrackPoint(scene,i/400).distanceTo(lightTrackPoint(scene,(i+1)/400))>.1);
 }
});
