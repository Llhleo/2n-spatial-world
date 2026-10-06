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
