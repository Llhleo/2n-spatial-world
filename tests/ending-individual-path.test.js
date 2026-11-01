import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import {endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';

const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame({position:[-4,7,198],target:[0,0,-14]},.46,layout.anchors);
test('individual arrivals pass through the old staging boundary without a shared stop',()=>{
 const t=16.5/18,h=.0001;
 const speeds=layout.anchors.map(a=>{const before=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),t-h,0,false,slots)),after=new T.Vector3(...endingPetalPoint(a,memoryPoint(a,2),t+h,0,false,slots));return after.distanceTo(before)/(h*36);});
 assert.ok(speeds.filter(v=>v>2).length>speeds.length*.8,'most petals must carry their velocity through the old stop');
});

test('every identity owns a different curve even with identical entry and orbit targets',()=>{
 const anchors=Array.from({length:56},(_,i)=>({id:'individual-'+i,u:.35,longitude:1.1,branch:0})),targets=new Map(anchors.map(a=>[a.id,{phase:1.4,stagingPhase:1.4,aspect:.46}]));
 const signatures=anchors.map(a=>[.74,.80,.86,.92].flatMap(t=>endingPetalPoint(a,[20,60,-20],t,0,false,targets)).map(v=>v.toFixed(5)).join(','));
 assert.equal(new Set(signatures).size,anchors.length,'paths differ by their own timing and control displacements');
});

test('actual petal matrices follow smooth paths in portrait/landscape, forward/idle/reverse and reduced motion',()=>{
 for(const aspect of [.35,.46,.6,1.8])for(const reducedMotion of [false,true]){
  const memory=createMemoryScene({mobile:aspect<1}),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,aspect,.2,2400),matrix=new T.Matrix4();memory.install(asset,'garden','rose');
  let previous,previousVelocity,maxTurn=0,maxVelocityChange=0,minimum=Infinity;
  try{const times=[...Array.from({length:601},(_,i)=>.7+.3*i/600),...Array(100).fill(1),...Array.from({length:601},(_,i)=>1-.3*i/600)];
   for(const nextT of times){
    memory.update({memoryPhase:2,eventIndex:2,nextT,particleEnding:true,roadArrival:{},reducedMotion},camera,.009);
    const points=memory.group.children.filter(o=>o.isInstancedMesh).flatMap(pool=>Array.from({length:pool.count},(_,j)=>{pool.getMatrixAt(j,matrix);return {p:new T.Vector3().setFromMatrixPosition(matrix),r:pool.geometry.boundingSphere.radius*matrix.getMaxScaleOnAxis()};}));
    if(previous){const velocity=points.map((q,j)=>q.p.clone().sub(previous[j].p).divideScalar(.009));if(previousVelocity)for(let j=0;j<velocity.length;j++){
     maxVelocityChange=Math.max(maxVelocityChange,velocity[j].distanceTo(previousVelocity[j]));
     // A near-stationary reversal has an unstable heading but subpixel travel.
     // Bound velocity changes at all speeds, heading during visible movement.
     if(velocity[j].length()>20&&previousVelocity[j].length()>20)maxTurn=Math.max(maxTurn,velocity[j].angleTo(previousVelocity[j]));
    }previousVelocity=velocity;}previous=points;
    for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)minimum=Math.min(minimum,points[i].p.distanceTo(points[j].p)-points[i].r-points[j].r);
   }
   const context=`aspect ${aspect}, reduced motion ${reducedMotion}`;
   assert.ok(maxTurn<.45,`smooth visible heading (${context}): ${maxTurn}`);
   assert.ok(maxVelocityChange<9,`continuous velocity (${context}): ${maxVelocityChange}`);
   assert.ok(minimum>0,`actual models retain clearance (${context}): ${minimum}`);
  }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
 }
});

test('the displayed models retain clearance during narrow and landscape forward/idle/reverse playback',()=>{
 for(const aspect of [.35,1.8]){
  const memory=createMemoryScene({mobile:aspect<1}),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,aspect,.2,2400),matrix=new T.Matrix4();memory.install(asset,'garden','rose');let minimum=Infinity;
  try{const times=[...Array.from({length:301},(_,i)=>.7+.3*i/300),...Array(60).fill(1),...Array.from({length:301},(_,i)=>1-.3*i/300)];
   for(const nextT of times){memory.update({memoryPhase:2,eventIndex:2,nextT,particleEnding:true,roadArrival:{}},camera,.018);
    const points=memory.group.children.filter(o=>o.isInstancedMesh).flatMap(pool=>Array.from({length:pool.count},(_,i)=>{pool.getMatrixAt(i,matrix);return {p:new T.Vector3().setFromMatrixPosition(matrix),r:pool.geometry.boundingSphere.radius*matrix.getMaxScaleOnAxis()};}));
    for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)minimum=Math.min(minimum,points[i].p.distanceTo(points[j].p)-points[i].r-points[j].r);
   }
   assert.ok(minimum>0,`actual matrix-scaled models retain clearance at aspect ${aspect}: ${minimum}`);
  }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
 }
});
