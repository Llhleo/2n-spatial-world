import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {createTraffic,trafficCoordinate,PETAL_NAMES} from '../src/road-traffic.js';
import {createRoadGeometry} from '../src/road-story/geometry.js';

test('traffic breathes faster without ever stopping or changing circular gaps',()=>{
 const traffic=createTraffic({length:800,previousCount:32,width:19,seed:19}),[p,q]=traffic.lanes[0],speeds=[];
 for(let t=0;t<45;t+=.05){
  const s=trafficCoordinate(p,t,traffic),next=trafficCoordinate(p,t+.01,traffic),v=(next-s+traffic.period)%traffic.period/.01;
  speeds.push(v);
  const gap=(trafficCoordinate(q,t,traffic)-s+traffic.period)%traffic.period;
  assert.ok(Math.abs(gap-(q.s-p.s))<1e-8);
 }
 assert.ok(Math.min(...speeds)>3,'slow phase still flows faster than old 2.8 units/s');
 assert.ok(Math.max(...speeds)/Math.min(...speeds)>1.8,'breathing is visible');
 assert.ok(speeds.reduce((a,b)=>a+b,0)/speeds.length>5.8);
 assert.ok(Math.max(...speeds.slice(1).map((v,i)=>Math.abs(v-speeds[i])))<.18,'speed changes smoothly');
});

test('larger randomized sizes retain the dense safe spacing',()=>{
 for(const width of [8,11,19]){
  const a=createTraffic({length:800,previousCount:32,width,seed:19}),sizes=a.lanes.flat().map(p=>p.size);
  assert.ok(sizes.reduce((a,b)=>a+b,0)/sizes.length>(width===8?1.6:2.25));
  assert.ok(Math.max(...sizes)/Math.min(...sizes)>1.25);
  for(const lane of a.lanes)for(let i=0;i<lane.length;i++)assert.ok((lane[(i+1)%lane.length].s-lane[i].s+a.period)%a.period>lane[i].size+lane[(i+1)%lane.length].size+.45);
 }
});

const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
test('riders gently vary across the lane and GPU uploads contain only visible instances',()=>{
 const g=new T.SphereGeometry(1,6,4),m=new T.MeshBasicMaterial(),assets=new Map(PETAL_NAMES.map(n=>[n,{geometry:g,material:m,face:new T.Quaternion()}]));
 const w=createRoadGeometry({assets,vectorText:read('public/assets/road-story/text-meshes.json'),waveConfig:read('public/assets/road-story/wave-config.json'),historyRecords:read('content/history.json').events});
 const camera=new T.PerspectiveCamera(40,414/896,.2,2400);camera.position.set(0,0,170);camera.lookAt(0,0,-12);camera.updateMatrixWorld();
 w.update(8,camera,9.3);
 const c=w.contexts[0],r=c.roads[0],p=c.petals.find(p=>p.mesh.userData.route?.road===r&&p.mesh.userData.route.record.s>50&&p.mesh.userData.route.record.s<150),offsets=[];
 for(let t=0;t<12;t+=.2){w.update(t,camera,9.3);const route=p.mesh.userData.route,s=trafficCoordinate(route.record,t,r.traffic),f=(s+r.traffic.margin)/r.traffic.period*4096,i=Math.floor(f),k=f-i,cache=r.cache[route.lane],base=new T.Vector3(),normal=new T.Vector3();for(let axis=0;axis<3;axis++){base.setComponent(axis,T.MathUtils.lerp(cache.pos[i*3+axis],cache.pos[(i+1)*3+axis],k));normal.setComponent(axis,T.MathUtils.lerp(cache.normal[i*3+axis],cache.normal[(i+1)*3+axis],k));}const delta=p.mesh.position.clone().sub(base);delta.addScaledVector(normal,-delta.dot(normal)/normal.lengthSq());offsets.push(delta.length());assert.ok(delta.length()<r.width*.055,'small wander remains inside lane');}
 assert.ok(Math.max(...offsets)>.12,'center line is not a fixed rail');
 for(const context of w.contexts)for(const pool of context.pools.values())if(pool.mesh.count){const ranges=pool.mesh.instanceMatrix.updateRanges;assert.deepEqual(ranges,[{start:0,count:pool.mesh.count*16}],'do not upload thousands of hidden matrices');}
 for(const t of [7,482.25]){
  w.update(t,camera,9.3);
  for(const c of w.contexts){const riders=c.petals.filter(p=>p.mesh.userData.route).map(p=>({p,q:p.mesh.position.clone().applyMatrix4(p.parent.matrix),r:p.mesh.userData.route})).filter(({q})=>Math.abs(q.x)<250&&Math.abs(q.y)<380&&q.z> -400&&q.z<140);
   for(let i=0;i<riders.length;i++)for(let j=0;j<i;j++){const a=riders[i],b=riders[j];if(a.r.road===b.r.road&&a.r.lane!==b.r.lane)assert.ok(a.q.distanceTo(b.q)-a.p.mesh.scale.x-b.p.mesh.scale.x>.2,'large opposite riders retain clearance at the tight bends');}
  }
 }
});
