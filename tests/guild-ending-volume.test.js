import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const density=await import('../src/guild-ending-density.js').catch(()=>null);
const timing=await import('../src/guild-ending-timing.js').catch(()=>null);
const fluid=await import('../src/guild-ending-fluid.js');
const halfNearest=x=>{
 const bits=T.DataUtils.toHalfFloat(x),a=T.DataUtils.fromHalfFloat(bits),b=T.DataUtils.fromHalfFloat(bits+1);
 return x-a<b-x?a:x-a>b-x?b:(bits%2?b:a);
};

test('entry unfolds coincident stream samples into all three dimensions through velocity, not teleportation',()=>{
 const states=Array.from({length:96},(_,i)=>({p:[0,30,-14],v:[0,0,0],seed:[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5]}));
 for(let tick=0;tick<90;tick++)for(const s of states){
  const n=fluid.stepFluidParticle(s.p,s.v,s.seed,.21+tick/1080,1/60,[],[0,43,-14]);
  assert.ok(Math.hypot(...n.position.map((x,k)=>x-s.p[k]))<2.7,'bounded velocity prevents position jumps');s.p=n.position;s.v=n.velocity;
 }
 for(let k=0;k<3;k++){
  const mean=states.reduce((a,s)=>a+s.p[k]/states.length,0),sigma=Math.sqrt(states.reduce((a,s)=>a+(s.p[k]-mean)**2/states.length,0));
  assert.ok(sigma>3,`local thickness must exist along axis ${k}, not only in a global bounding box`);
 }
});

test('physical forces keep glyph coordinates entirely out of the interior-flow chapter',()=>{
 const p=[20,30,-14],v=[12,3,-5],seed=[.2,.4,.6,1];
 assert.deepEqual(fluid.fluidAcceleration(p,v,seed,13/18,[],[0,43,-14]),fluid.fluidAcceleration(p,v,seed,13/18,[],[90,80,70]));
 assert.notDeepEqual(fluid.fluidAcceleration(p,v,seed,15/18,[],[0,43,-14]),fluid.fluidAcceleration(p,v,seed,15/18,[],[90,80,70]));
});

test('CPU reference splats conserve mass across eight voxel neighbors',()=>{
 assert.equal(typeof density?.createDensityField,'function');
 const f=density.createDensityField([[0,0,0],[3,3,3]],{center:[0,0,0],aspect:.6});
 assert.ok(Math.abs(f.mass()-4096)<.01);
});
test('partitioned FP16 numerical model retains a fully coincident swarm without the single-lane plateau',()=>{
 assert.equal(typeof density?.densityPartition,'function');
 const bins=new Float32Array(256);
 for(let i=0;i<262144;i++){
  const lane=density.densityPartition(i),key=lane.tile*4+lane.channel;
  assert.ok(key>=0&&key<256);
  bins[key]=halfNearest(bins[key]+1/512);
 }
 // Each of eight neighbors receives this independently. A single FP16 lane
 // would plateau at 4; the production partition scheme must retain 512.
 assert.equal(bins.reduce((a,b)=>a+b,0)*8,4096);
});
test('partitioned FP16 pressure estimate bounds error on dense nonbinary-weight fixtures',()=>{
 for(const f of [[.1,.1,.1],[.123,.456,.789]]){
  let total=0;
  for(let i=0;i<8;i++){
   const o=[i%2,(i>>1)%2,i>>2],weight=o.reduce((w,x,k)=>w*(x?f[k]:1-f[k]),1);
   let lane=0;for(let n=0;n<1024;n++)lane=halfNearest(lane+weight/64);
   total+=lane*256;
  }
  assert.ok(Math.abs(total-4096)/4096<.1,'approximate artistic density must avoid severe undercounting');
 }
});

test('evolved stream has local volume, a populated core and nonrigid motion before forming the mark',async()=>{
 const {endingStreamPoint}=await import('../src/guild-ending-flow.js'),aspect=.46;
 const states=Array.from({length:512},(_,i)=>{
  const seed=[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5],p=endingStreamPoint(seed,.18,aspect),n=endingStreamPoint(seed,.18001,aspect);
  return {seed,p,v:p.map((x,k)=>(n[k]-x)/.00018)};
 });
 let earlier;
 const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
 function localVolume(points){
  const quality=[];
  for(let i=0;i<points.length;i+=16){
   const neighbors=points.map(p=>({p,d:Math.hypot(...p.map((x,k)=>x-points[i][k]))})).sort((a,b)=>a.d-b.d).slice(0,16).map(o=>o.p);
   const mean=[0,1,2].map(k=>neighbors.reduce((n,p)=>n+p[k]/16,0)),c=Array.from({length:3},()=>[0,0,0]);
   for(const p of neighbors)for(let a=0;a<3;a++)for(let b=0;b<3;b++)c[a][b]+=(p[a]-mean[a])*(p[b]-mean[b])/16;
   const determinant=c[0][0]*(c[1][1]*c[2][2]-c[1][2]*c[2][1])-c[0][1]*(c[1][0]*c[2][2]-c[1][2]*c[2][0])+c[0][2]*(c[1][0]*c[2][1]-c[1][1]*c[2][0]);
   quality.push(27*determinant/(c[0][0]+c[1][1]+c[2][2])**3);
  }
  return median(quality);
 }
 for(let tick=0;tick<=561;tick++){
  const t=.18+tick/1080,guide=fluid.fluidGuide(t,aspect),gates=fluid.fluidGateStates(t,aspect),volume=fluid.fluidVolumePressure(states,aspect);
  volume.density=density.createDensityField(states.map(s=>s.p),{center:guide.center,aspect,cell:timing.fluidDensityCell(t)});
  for(const s of states){const n=fluid.stepFluidParticle(s.p,s.v,s.seed,t,1/60,gates,[0,43,-14],aspect,false,volume);s.p=n.position;s.v=n.velocity;}
  if(tick===237||tick===561){
   const normalized=states.map(s=>[s.p[0]/(aspect/.6),s.p[1],s.p[2]]);
   assert.ok(localVolume(normalized)>.12,'nearest-neighbor covariance must describe volumes rather than ribbons');
  }
  if(tick===453)earlier=states.map(s=>s.p.slice());
 }
 const center=fluid.fluidVolumePressure(states,aspect).center;
 const inner=states.filter(s=>Math.hypot(...s.p.map((x,k)=>(x-center[k])/(k===0?aspect/.6:1)))<15).length;
 assert.ok(inner/states.length>.02,'the middle is filled, not a hollow shell');
 assert.ok(Math.hypot(center[0],center[1]-43,center[2]+14)<8);
 const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
 const change=states.slice(1).map((s,i)=>Math.abs(distance(s.p,states[0].p)-distance(earlier[i+1],earlier[0])));
 assert.ok(median(change)>1,'internal motion must change relative distances, not only rotate the whole body');
 assert.ok(median(states.map(s=>Math.hypot(...s.v)))>3,'the central chapter cannot freeze');
});
test('local pressure pushes away from dense neighbors, rather than only expanding global bounds',()=>{
 assert.equal(typeof density?.createDensityField,'function');
 const points=Array.from({length:128},(_,i)=>[-5+(i%4)*.2,(i%5)*.1,(i%7)*.1]);
 const f=density.createDensityField(points,{center:[0,0,0],aspect:.6});
 assert.ok(f.force([0,0,0])[0]>0,'dense material on the left produces rightward pressure');
 assert.deepEqual(f.force([1000,0,0]),[0,0,0]);
});
test('a real unshaped interval precedes a gradual glyph reveal without an early global snap',()=>{
 assert.equal(typeof timing?.fluidGlyphProgress,'function');
 for(const seed of [0,.5,1])assert.equal(timing.fluidGlyphProgress(13/18,seed),0);
 assert.ok(timing.fluidGlyphProgress(14/18,.5)<.4);
 assert.ok(timing.fluidGlyphProgress(15.5/18,.5)>.6);
 for(const seed of [0,.5,1])assert.equal(timing.fluidGlyphProgress(16.5/18,seed),1);
});
test('the density domain contains every actual opening sample in portrait and landscape',async()=>{
 const {createEndingParticles}=await import('../src/guild-ending-particles.js');
 const {endingStreamPoint}=await import('../src/guild-ending-flow.js');
 const swarm=createEndingParticles(),seeds=swarm.points.geometry.getAttribute('aSeed').array;
 try{for(const aspect of [.3,.46,.6,1.5,1.8]){
  const points=[];for(let i=0;i<262144;i++)points.push(endingStreamPoint(Array.from(seeds.subarray(i*4,i*4+4)),.18,aspect));
  const f=density.createDensityField(points,{center:[0,30,-14],aspect,cell:timing.fluidDensityCell(.18)});
  assert.ok(Math.abs(f.mass()-4096)<.02,`no initial source particles may be clipped at aspect ${aspect}`);
 }}finally{swarm.dispose();}
});
