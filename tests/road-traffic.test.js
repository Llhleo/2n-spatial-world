import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraffic,trafficCoordinate,PETAL_NAMES} from '../src/road-traffic.js';
test('density is three times v11, with varied safe circular gaps',()=>{
 const a=createTraffic({length:800,previousCount:32,width:13,seed:19});
 assert.equal(a.lanes.length,2);assert.equal(a.visibleCountPerLane,96);
 const previousMean=1.7*800/32,actualMean=a.period/a.lanes[0].length;
 assert.ok(Math.abs(actualMean/(previousMean/3)-1)<.01);
 for(const lane of a.lanes){
  const gaps=lane.map((v,i)=>(lane[(i+1)%lane.length].s-v.s+a.period)%a.period);
  assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.25);
  assert.ok(Math.min(...gaps)>Math.max(...lane.map(v=>v.size))*2+.45);
  assert.ok(new Set(lane.map(v=>v.name)).size>=14);
 }
 assert.deepEqual(a,createTraffic({length:800,previousCount:32,width:13,seed:19}));
 assert.notDeepEqual(a,createTraffic({length:800,previousCount:32,width:13,seed:20}));
});
test('all traffic keeps moving during a ten-minute stationary camera hold',()=>{
 const a=createTraffic({length:720,previousCount:29,width:10.5,seed:23});
 for(const lane of a.lanes)for(const p of lane){
  const s=trafficCoordinate(p,600,a),s2=trafficCoordinate(p,600.5,a);
  const delta=((s2-s+a.period)%a.period);
  assert.ok(delta>.5&&delta<a.period-.5);
 }
 assert.ok(PETAL_NAMES.includes('starfish')&&PETAL_NAMES.includes('iris')&&PETAL_NAMES.includes('clover'));
});
