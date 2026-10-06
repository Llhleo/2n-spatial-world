import test from 'node:test';
import assert from 'node:assert/strict';
test('memory layouts keep stable long chains, separate silhouettes and model clearance',async()=>{
 const {createMemoryLayout}=await import('../src/guild-memory-layout.js');
 const assets=[{key:'rose',radius:1.1},{key:'clover',radius:1.4}];
 for(const mobile of [true,false]){
  const a=createMemoryLayout({mobile,assets}),b=createMemoryLayout({mobile,assets});
  assert.deepEqual(a,b);assert.ok(a.anchors.length>=48);assert.ok(a.anchors.length<=(mobile?96:144));
  assert.equal(new Set(a.anchors.map(p=>p.id)).size,a.anchors.length);
  assert.notDeepEqual(a.shots[0],a.shots[1]);assert.notDeepEqual(a.shots[1],a.shots[2]);
  for(let stage=0;stage<3;stage++)for(let i=0;i<a.anchors.length;i++)for(let j=0;j<i;j++){
   const p=a.anchors[i],q=a.anchors[j];const d=Math.hypot(...p.positions[stage].map((v,k)=>v-q.positions[stage][k]));
   assert.ok(d>=p.radius+q.radius+.5,`clearance stage ${stage} ${i}/${j}`);
  }
 }
 assert.deepEqual(createMemoryLayout({mobile:true,assets:[]}).anchors,[]);
});

test('ribbons surround a reading space at front and rear depths throughout scrolling',async()=>{
 const {createMemoryLayout,memoryPoint,sampleMemoryStory}=await import('../src/guild-memory-layout.js');
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]});
 for(const phase of [0,.25,.5,.75,1,1.25,1.5,1.75,2]){
  const p=layout.anchors.map(a=>memoryPoint(a,phase));
  for(let i=0;i<p.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(...p[i].map((v,k)=>v-p[j][k]))>=4.9);
  assert.ok(Math.max(...p.map(v=>v[2]))-Math.min(...p.map(v=>v[2]))>75);
  assert.ok(p.every(v=>Math.hypot(v[0]/(114-(v[2]+14))/23*114,v[1]/(114-(v[2]+14))/33*114)>.95));
 }
 assert.equal(sampleMemoryStory(0).eventIndex,0);assert.equal(sampleMemoryStory(.5).eventIndex,1);assert.equal(sampleMemoryStory(1).eventIndex,2);
 const a=sampleMemoryStory(12/36).memoryPhase,b=sampleMemoryStory((12+1e-5)/36).memoryPhase;assert.ok(Math.abs(a-b)<1e-5);
});
