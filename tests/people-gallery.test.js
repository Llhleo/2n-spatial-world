import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import * as T from 'three';
import {Text} from 'troika-three-text';
import {createCompanionship} from '../src/companionship.js';
import {peoplePose, peopleAnchor, projectTextBounds} from '../src/people-path.js';
import {FLOWER_SPECS} from '../src/lookback.js';
import * as courtyard from '../src/people-courtyard.js';

const api = await import('../src/people-gallery.js').catch(() => ({}));
const data = JSON.parse(readFileSync(new URL('../content/people.json', import.meta.url)));
const camera = aspect => new T.PerspectiveCamera(48, aspect ?? 414 / 896, .2, 2400);
const texts = root => {const result=[];root.traverse(o=>{if(o instanceof Text)result.push(o);});return result;};
const requireGallery = () => assert.equal(typeof api.createPeopleGallery, 'function', 'world people gallery is missing');

// Replacing only the external font worker: actual Text transforms, geometry
// publication events, materials, projection and shared sampler remain real.
async function withInk(run, defer=()=>false) {
 const original=Text.prototype.sync;
 const jobs=[];
 Text.prototype.sync=function(){
  const content=this.text;
  const finish=()=>{
  const glyphs=[];let x=0,y=0;
  for(const ch of content){if(ch==='\n'){x=0;y-=1.4;continue;}if(this.overflowWrap==='break-word'&&x+.55>this.maxWidth){x=0;y-=1.4;}glyphs.push(x,y,x+.55,y+1);x+=.6;}
  this._textRenderInfo={glyphBounds:new Float32Array(glyphs),blockBounds:[0,0,x,1]};
  this.dispatchEvent({type:'synccomplete'});
  };
  if(defer(this))jobs.push({text:this,content,finish});else finish();
 };
 try{await run(jobs);}finally{Text.prototype.sync=original;}
}

// Catches presentation stealing a pending measurement slot. Different ink widths
// distinguish a crash from silently recording the replacement name's geometry.
for(const replacement of ['deferred','immediate'])test(`member measurement owns its slot during update with ${replacement} replacement sync`,async()=>{
 let presentation=false,measurementHeld=false;
 await withInk(async jobs=>{
  const fixture={leaders:[],members:['a','BBBBBB','cc','dddd']};
  const gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));
  try {
   const result=gallery.prepare(100).then(()=>null,reason=>reason);
   for(let i=0;i<30&&!jobs.length;i++)await Promise.resolve();
   const held=jobs.find(job=>job.content==='BBBBBB');assert.ok(held,'second member measurement did not start');
   presentation=true;
   const w=gallery.route.windows[1],t=(w.readStart+w.readEnd)/2,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);
   gallery.update(t,cam);gallery.update(t,cam);
   held.finish();
   assert.equal(await result,null,'animation update corrupted metric preparation');
   assert.ok(Math.abs(gallery.glyphMetrics.members[1].maxX-3.55)<1e-6,'second member received replacement ink bounds');
   assert.equal(gallery.ready,true);assert.equal(gallery.error,null);
   gallery.update(t,cam);jobs.filter(job=>job!==held).forEach(job=>job.finish());await Promise.resolve();gallery.update(t,cam);
   const visible=texts(gallery.group).filter(text=>text.visible&&text.userData.memberIndex!==undefined);
   assert.deepEqual(visible.map(text=>text.text),['a','BBBBBB','cc','dddd']);
  } finally {gallery.dispose();}
 },text=>{
  if(text.text==='BBBBBB'&&!measurementHeld){measurementHeld=true;return true;}
  return presentation&&replacement==='deferred'&&text.text==='a';
 });
});

// Catches timeout releasing measurement ownership while original work is alive.
test('member measurement remains owned through timeout retry and late completion',async()=>{
 let heldOnce=false;
 await withInk(async jobs=>{
  const fixture={leaders:[],members:['a','BBBBBB']},gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));
  try {
   await assert.rejects(gallery.prepare(5),/超时/);
   const held=jobs.find(job=>job.content==='BBBBBB');assert.ok(held);
   const w=gallery.route.windows[1],t=(w.readStart+w.readEnd)/2,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);
   const retry=gallery.retry(100);held.finish();await retry;
   assert.ok(Math.abs(gallery.glyphMetrics.members[1].maxX-3.55)<1e-6);assert.equal(gallery.ready,true);assert.equal(gallery.error,null);
  } finally {gallery.dispose();}
 },text=>{if(text.text==='BBBBBB'&&!heldOnce){heldOnce=true;return true;}return false;});
});

// Catches metric writes from the original worker completion after owned disposal.
test('disposed measurement ignores completion after interleaved update',async()=>withInk(async jobs=>{
 const fixture={leaders:[],members:['a','BBBBBB']},gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));
 const preparation=gallery.prepare(100);
 for(let i=0;i<30&&!jobs.length;i++)await Promise.resolve();
 const held=jobs.find(job=>job.content==='BBBBBB');assert.ok(held);
 const w=gallery.route.windows[1],t=(w.readStart+w.readEnd)/2,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);
 gallery.dispose();held.finish();await preparation;
 assert.equal(gallery.glyphMetrics.members[1],undefined);assert.equal(gallery.ready,false);assert.equal(gallery.group.children.length,0);
},text=>text.text==='BBBBBB'));

// Catches partial group publication and stale geometry exposed after reverse seek.
test('delayed member sync publishes complete revision only and disposal ignores completion',async()=>{
 let delayed=false;
 await withInk(async jobs=>{
  const fixture={leaders:[],members:Array.from({length:28},(_,i)=>`name${i}`)},gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));await gallery.prepare(50);
  delayed=true;
  const show=index=>{const w=gallery.route.windows[index],t=(w.readStart+w.readEnd)/2,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);};
  show(1);show(4);show(1);
  jobs.filter(j=>j.content!=='name3').forEach(j=>j.finish());await Promise.resolve();show(1);
  assert.equal(texts(gallery.group).filter(t=>t.visible&&t.userData.memberIndex<7).length,0,'partial current group became readable');
  for(let round=0;round<4;round++){jobs.splice(0).forEach(j=>j.finish());await Promise.resolve();}
  show(1);await Promise.resolve();show(1);
  const visible=texts(gallery.group).filter(t=>t.visible&&t.userData.memberIndex<7);
  assert.deepEqual(visible.map(t=>t.text).sort(),['name0','name1','name2','name3','name4','name5','name6']);
  show(4);gallery.dispose();jobs.forEach(j=>j.finish());await Promise.resolve();assert.equal(gallery.group.children.length,0);assert.equal(gallery.ready,false);
 },text=>delayed&&text.userData.memberSlot!==undefined);
});

// Catches route being ignored, rank-three visibility, fog fading and identity opacity jumps.
test('courtyard pool covers all members and holds readable spatial handoffs',async()=>withInk(async()=>{
 const route=courtyard.createPeopleRoute(data),gallery=api.createPeopleGallery(data,route);
 await gallery.prepare(50);gallery.resize(414/896,896);
 assert.equal(texts(gallery.group).filter(t=>t.userData.memberSlot!==undefined).length,21);
 const seen=[];
 for(const w of gallery.route.windows){
  const station=gallery.route.stations[w.stationIndex],t=(w.readStart+w.readEnd)/2,cam=camera();
  peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);await Promise.resolve();gallery.update(t,cam);
  if(station.kind==='member'){
   const visible=texts(gallery.group).filter(o=>o.visible&&o.userData.memberIndex!==undefined);
   assert.deepEqual(visible.map(o=>o.userData.memberIndex).sort((a,b)=>a-b),station.memberIndices);
   seen.push(...station.memberIndices);
   visible.forEach(o=>{assert.equal(o.material.opacity,1);assert.equal(o.material.fog,false);assert.ok(o.userData.projection.fits);assert.ok(o.userData.projection.fontPixels>=20);});
  }
 }
 assert.deepEqual(seen,Array.from({length:95},(_,i)=>i));
 for(const [width,height] of [[414,896],[390,844],[320,568],[896,414]]){
  gallery.resize(width/height,height);
  for(const w of gallery.route.windows){const s=gallery.route.stations[w.stationIndex];if(!['leader','member'].includes(s.kind))continue;
   for(const t of [w.readStart,(w.readStart+w.readEnd)/2,w.readEnd]){
    const cam=camera(width/height);peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);await Promise.resolve();gallery.update(t,cam);
    for(const text of texts(gallery.group).filter(o=>o.visible&&(s.kind==='leader'?o.userData.personId===s.personId:s.memberIndices.includes(o.userData.memberIndex)))){
     text.updateMatrixWorld(true);const p=projectTextBounds(cam,text.matrixWorld,text.userData.bounds,{width,height});
     assert.ok(p.fits,`${width} ${s.id} ${text.text}: ${JSON.stringify(p.rect)}`);
     assert.ok(p.fontPixels>=(text.userData.memberIndex!==undefined?20:text.userData.tier==='name'?(width>=390?44:36):text.userData.tier==='role'?22:width>=390?18:16),`${width} ${s.id} ${text.userData.tier} ${p.fontPixels}`);
    }
   }
  }
 }
 gallery.resize(414/896,896);
 {const cam=camera();peoplePose(1,cam,cam.aspect,gallery.route);gallery.update(1,cam);await Promise.resolve();gallery.update(1,cam);const endingNames=texts(gallery.group).filter(o=>o.visible&&o.userData.memberIndex!==undefined);assert.equal(endingNames.length,4,'ending loses last readable group');for(const o of endingNames){o.updateMatrixWorld(true);assert.ok(projectTextBounds(cam,o.matrixWorld,o.userData.bounds,{width:414,height:896}).fontPixels>=20);}}
 for(let i=1;i<5;i++){const a=gallery.route.windows[i],b=gallery.route.windows[i+1];for(const fraction of [.02,.05,.1,.25,.5,.75,.9,.95,.98]){
  const t=a.readEnd+(b.readStart-a.readEnd)*fraction,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);
  const rects=texts(gallery.group).filter(o=>o.visible&&o.userData.personId&&o.userData.tier==='name').map(o=>{o.updateMatrixWorld(true);return projectTextBounds(cam,o.matrixWorld,o.userData.bounds,{width:414,height:896}).rect;});
  if(rects.length===2){const [r,s]=rects;const overlap=Math.min(r.x+r.width,s.x+s.width)-Math.max(r.x,s.x);assert.ok(overlap<=0||r.x+r.width<49.68||s.x>364.32,'duplicate central leader names during spatial transfer');}
  assert.ok(rects.some(r=>r.x<414&&r.x+r.width>0&&r.y<896&&r.y+r.height>0),'spatial handoff hides every subject outside canvas');
  for(const card of gallery.group.getObjectByName('people-leaders').children){const visible=card.children.filter(o=>o.visible);if(visible.length&&visible.every(o=>{o.updateMatrixWorld(true);return projectTextBounds(cam,o.matrixWorld,o.userData.bounds,{width:414,height:896}).fits;}))visible.forEach(o=>assert.equal(o.material.opacity,1,'readable block faded before spatial exit'));}
  assert.ok(texts(gallery.group).some(o=>o.visible&&o.material.opacity>0),'prepared transfer blacks out all subjects');
 }}
 for(const w of gallery.route.windows.slice(1,6))for(const edge of [w.start,w.end]){
  const snapshots=[];
  for(const t of [edge-1e-5,edge+1e-5]){const cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);snapshots.push(texts(gallery.group).filter(o=>o.userData.personId).map(o=>o.material.opacity));}
  snapshots[0].forEach((value,i)=>assert.ok(Math.abs(value-snapshots[1][i])<.02));
 }
 gallery.dispose();
}));

// Catches one failed font request serially preventing unrelated leader preparation.
test('courtyard font timeout retains independently ready leaders and adopts late sync',async()=>withInk(async jobs=>{
 const fixture={leaders:[{id:'a',name:'Blocked'},{id:'b',name:'Ready'}],members:[]};
 const gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));await assert.rejects(gallery.prepare(5),/超时/);
 const w=gallery.route.windows[2],t=(w.readStart+w.readEnd)/2,cam=camera();peoplePose(t,cam,cam.aspect,gallery.route);gallery.update(t,cam);
 assert.ok(texts(gallery.group).find(t=>t.text==='Ready').visible,'failed font hides independently prepared leader');
 const retry=gallery.retry(50);jobs.forEach(j=>j.finish());await retry;assert.equal(gallery.ready,true);assert.equal(gallery.error,null);gallery.dispose();
},text=>text.text==='Blocked'));

// Catches a private gallery window list, lossy split order and colliding person IDs.
test('narrow courtyard splits source groups through shared route authority',async()=>withInk(async()=>{
 assert.equal(typeof courtyard.resizeCourtyard,'function');
 const fixture={leaders:[{id:'entry',name:'Leader',role:'管理'}],members:['INeedMoreLuck','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij',...Array.from({length:5},(_,i)=>'longMember'+i)]};
 const gallery=api.createPeopleGallery(fixture,courtyard.createPeopleRoute(fixture));await gallery.prepare(50);
 const narrow=gallery.resize(320/568,568);
 const parts=narrow.stations.filter(s=>s.kind==='member');assert.ok(parts.length>1);
 assert.deepEqual(parts.flatMap(s=>s.memberIndices),[0,1,2,3,4,5,6]);
 assert.equal(new Set(narrow.stations.map(s=>s.id)).size,narrow.stations.length);
 for(const w of narrow.windows){const s=narrow.stations[w.stationIndex];if(s.kind!=='member')continue;const t=(w.readStart+w.readEnd)/2,cam=camera(320/568);peoplePose(t,cam,cam.aspect,narrow);gallery.update(t,cam);await Promise.resolve();gallery.update(t,cam);for(const text of texts(gallery.group).filter(t=>t.visible&&t.userData.memberIndex!==undefined)){assert.ok(text.userData.projection.fits);assert.ok(text.userData.projection.fontPixels>=20);}}
 const wide=gallery.resize(896/414,414);assert.deepEqual(wide.stations.filter(s=>s.kind==='member').flatMap(s=>s.memberIndices),[0,1,2,3,4,5,6]);
 assert.equal(gallery.route,wide);assert.ok(gallery.glyphMetrics.members[0].glyphs.length>0);gallery.dispose();
}));

function companion() {
 const scene=new T.Scene(), sources=[];
 for(const kind of new Set(FLOWER_SPECS.map(s=>s[0]))) {const root=new T.Group();root.name=kind==='garden'?'florr-petal-assembly':'florr-'+kind;scene.add(root);}
 const rig=createCompanionship(scene);
 for(const [kind,name] of FLOWER_SPECS) {
  const source=new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial()),ground=new T.InstancedMesh(source.geometry,source.material,1);
  ground.setMatrixAt(0,new T.Matrix4().makeTranslation(kind==='hell'?1470:166,-30,10));scene.getObjectByName(kind==='garden'?'florr-petal-assembly':'florr-'+kind).add(ground);
  rig.install(source,kind,name);sources.push({source,ground});
 }
 return {rig,sources,meshes:rig.group.children.filter(o=>o.isInstancedMesh)};
}
const matrixOf = mesh => {const m=new T.Matrix4();mesh.getMatrixAt(0,m);return m;};

// Only the browser font-worker boundary is replaced; real Text/Group/material,
// sync events, measured glyph union, state, visibility and projection run here.
async function withGlyphs(run, pending=new Set()) {
 const original=Text.prototype.sync, jobs=new Map(), calls=new Map();
 Text.prototype.sync=function() {
  calls.set(this,(calls.get(this)||0)+1);
  if(this.textRenderInfo)return;
  const finish=()=>{
   const width=this.text.includes('\n')?132:this.text==='flowerwsr'?105:this.text==='INeedMoreLuck'?200:Math.max(10,this.text.length*3);
   const height=this.text.includes('\n')?12:this.fontSize;
   // Deliberately asymmetric extents catch name-only or blockBounds fitting.
   this._textRenderInfo={glyphBounds:new Float32Array([-width/2,-height*.8,width/2,height*.2]),blockBounds:[-1,-1,1,1]};
   this.dispatchEvent({type:'synccomplete'});
  };
  if(pending.has(this.text))jobs.set(this,finish);else finish();
 };
 try {await run({jobs,calls,complete:text=>jobs.get(text)?.()});} finally {Text.prototype.sync=original;}
}

test('default companion preserves original matrices and labels when peopleT is omitted or zero',()=>{
 const a=companion(),b=companion();
 a.rig.update(1,0);b.rig.update(1,0,0);
 const original=[1.3399391174316406,.9113610982894897,1.3356586694717407,0,-1.6168533563613892,.7752062678337097,1.0930876731872559,0,-.01867307350039482,-1.7258262634277344,1.1963173151016235,0,397.583984375,71.61901092529297,52.13481140136719,1];
 assert.deepEqual(matrixOf(a.rig.group.getObjectByName('companion-hell:darkmark')).toArray(),original);
 for(const [t,dt] of [[.5,.02],[.88,.05],[1,.05],[1,.05],[0,0]]) {
  a.rig.update(t,dt);b.rig.update(t,dt,0);
  a.meshes.forEach((mesh,i)=>assert.deepEqual(matrixOf(mesh).toArray(),matrixOf(b.meshes[i]).toArray()));
  assert.deepEqual(texts(a.rig.group).map(t=>[t.visible,t.material.opacity]),texts(b.rig.group).map(t=>[t.visible,t.material.opacity]));
 }
 a.rig.dispose();b.rig.dispose();
});

test('people handoff fades the old words before spreading along depth-aware side curves and reversal restores ring',()=>{
 const {rig,meshes,sources}=companion(),cam=camera();rig.update(1,0);const ring=meshes.map(matrixOf);
 rig.update(1,0,.000001);
 meshes.forEach((mesh,i)=>assert.ok(new T.Vector3().setFromMatrixPosition(matrixOf(mesh)).distanceTo(new T.Vector3().setFromMatrixPosition(ring[i]))<.001));
 rig.update(1,0,.035);assert.ok(texts(rig.group).every(t=>!t.visible),'old words persist when petals start spreading');
 for(const aspect of [414/896,.35,896/414])for(const t of [.07,.12,.16,.228,.296,.364,.432,.5,.568,.636,.704,.772,.9,1]) {
  cam.aspect=aspect;cam.updateProjectionMatrix();rig.update(1,0,t);peoplePose(t,cam);cam.updateMatrixWorld();
  let visible=0,left=0,right=0;
  meshes.forEach(mesh=>{const ndc=new T.Vector3().setFromMatrixPosition(matrixOf(mesh)).project(cam);if(ndc.z>-1&&ndc.z<1&&Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1){visible++;if(ndc.x<0)left++;else right++;if(aspect<=414/896&&t>=.16)assert.ok(Math.abs(ndc.x)>.72,`petal center enters portrait reading width at ${t}: ${ndc.x}`);}});
  assert.ok(visible>=6&&left>=2&&right>=2,`side petals outside actual frustum at ${aspect}, ${t}: ${visible}, ${left}, ${right}`);
 }
 rig.update(1,0,.1);const mid=matrixOf(meshes[0]);rig.update(1,0,.11);assert.ok(mid.elements.some((v,i)=>i<12&&Math.abs(v-matrixOf(meshes[0]).elements[i])>.0001),'spreading does not rotate');
 rig.update(1,0,0);meshes.forEach((mesh,i)=>assert.deepEqual(matrixOf(mesh).toArray(),ring[i].toArray()));
 sources.forEach(({ground})=>assert.equal(matrixOf(ground).elements[0],0,'duplicate grounded petal'));
 rig.update(0,0,0);sources.forEach(({ground})=>assert.equal(matrixOf(ground).elements[0],1));rig.dispose();
});

test('gallery keeps fixed world anchors, only one detail block, and fits complete measured glyphs on all reading views',async()=>{
 requireGallery();
 await withGlyphs(async()=>{
  const gallery=api.createPeopleGallery(data);await gallery.prepare(50);assert.equal(gallery.ready,true);
  const cards=gallery.group.getObjectByName('people-leaders').children;
  assert.equal(cards.length,5);
  for(const aspect of [414/896,896/414,16/9]) {
   gallery.resize(aspect);const cam=camera(aspect);
   for(let step=160;step<840;step+=4) {
    const t=step/1000;peoplePose(t,cam);cam.updateMatrixWorld();gallery.update(t,cam,.016,false);
    const details=texts(gallery.group).filter(text=>text.visible&&text.userData.tier!=='name');
    assert.ok(new Set(details.map(text=>text.userData.personId)).size<=1,'multiple people show roles');
    for(const card of cards) {
     assert.deepEqual(card.position.toArray(),peopleAnchor(card.userData.index).position);
     if(!card.userData.focal||!card.visible)continue;
     const [minX,minY,maxX,maxY]=card.userData.measuredBounds;
     for(const x of [minX,maxX])for(const y of [minY,maxY]) {
      const ndc=card.localToWorld(new T.Vector3(x,y,0)).project(cam);
      assert.ok(Math.abs(ndc.x)<=.72+1e-6&&Math.abs(ndc.y)<=.70+1e-6,`glyph clipping ${t}: ${ndc.toArray()}`);
     }
    }
   }
  }
  const cam=camera();peoplePose(.364,cam);gallery.update(.364,cam,0,true);
  assert.equal(texts(gallery.group).find(t=>t.userData.personId==='flowerwsr'&&t.userData.tier==='intro').text.split('\n').length,2);
  texts(gallery.group).forEach(t=>{assert.equal(t.sdfGlyphSize,256);assert.equal(t.gpuAccelerateSDF,false);assert.ok(t.font.includes('people-sc-semibold.woff'));});
  const before=cards.map(c=>c.matrix.toArray());gallery.update(.364,cam,1,true);assert.deepEqual(cards.map(c=>c.matrix.toArray()),before);gallery.dispose();
 });
});

test('crowd entry uses separate instanced nodes and only a few nearby real names',async()=>{
 requireGallery();await withGlyphs(async()=>{
  const gallery=api.createPeopleGallery(data);await gallery.prepare(50);
  const cam=camera();peoplePose(1,cam);gallery.update(1,cam,0,true);
  const crowd=gallery.group.getObjectByName('people-crowd'),nodes=crowd.children.find(o=>o.isInstancedMesh);
  assert.equal(nodes.count,95);assert.notEqual(crowd.name,'companionship');
  const names=texts(crowd).filter(t=>t.visible);assert.ok(names.length>0&&names.length<=3);
  names.forEach(t=>{assert.ok(data.members.includes(t.text));const glyphs=t.textRenderInfo.glyphBounds;for(let i=0;i<glyphs.length;i+=4)for(const x of [glyphs[i],glyphs[i+2]])for(const y of [glyphs[i+1],glyphs[i+3]]){const p=t.localToWorld(new T.Vector3(x,y,0)).project(cam);assert.ok(Math.abs(p.x)<.72&&Math.abs(p.y)<.7);}});
  assert.ok(texts(gallery.group).filter(t=>t.userData.personId).every(t=>!t.visible),'leadership cards persist over crowd');
  gallery.update(.5,cam,0,true);assert.equal(crowd.visible,false);gallery.dispose();
 });
});

test('finite font timeout is isolated; retry adopts late sync and never resets already prepared names',async()=>{
 requireGallery();await withGlyphs(async({complete,calls})=>{
  const gallery=api.createPeopleGallery(data);
  await assert.rejects(gallery.prepare(5),/超时/);assert.equal(gallery.ready,false);assert.ok(gallery.error instanceof Error);
  const all=texts(gallery.group),blocked=all.filter(t=>t.text==='flowerwsr'),ready=all.filter(t=>t.text!=='flowerwsr');
  const cam=camera();peoplePose(.228,cam);gallery.update(.228,cam,0,true);
  assert.ok(all.find(t=>t.text==='awdc'&&t.userData.personId).visible,'one failed card hides an already measured neighbor');
  const saved=ready.map(t=>t.textRenderInfo);const retry=gallery.retry(50);blocked.forEach(complete);await retry;
  assert.equal(gallery.ready,true);assert.equal(gallery.error,null);
  ready.forEach((t,i)=>{assert.equal(t.textRenderInfo,saved[i]);assert.equal(calls.get(t),1);});
  await gallery.prepare(50);assert.equal(gallery.ready,true);gallery.dispose();
 },new Set(['flowerwsr']));
});

test('late glyph completion after timeout restores readiness without another retry and disposal removes owned nodes',async()=>{
 requireGallery();await withGlyphs(async({complete})=>{
  const gallery=api.createPeopleGallery(data);await assert.rejects(gallery.prepare(5),/超时/);
  texts(gallery.group).filter(t=>t.text==='flowerwsr').forEach(complete);
  assert.equal(gallery.ready,true);assert.equal(gallery.error,null);gallery.dispose();assert.equal(gallery.group.children.length,0);
 },new Set(['flowerwsr']));
});

test('supplemental WOFF includes every displayed name and Chinese glyph without fallback',()=>{
 let font;try {font=readFileSync(new URL('../public/assets/fonts/people-sc-semibold.woff',import.meta.url));}catch{}
 assert.ok(font,'people supplemental font is missing');assert.equal(font.toString('ascii',0,4),'wOFF');
 let cmap;
 for(let i=0;i<font.readUInt16BE(12);i++) {
  const offset=44+i*20;
  if(font.toString('ascii',offset,offset+4)!=='cmap')continue;
  const start=font.readUInt32BE(offset+4),compressed=font.readUInt32BE(offset+8),length=font.readUInt32BE(offset+12);
  cmap=font.subarray(start,start+compressed);if(compressed<length)cmap=inflateSync(cmap);
 }
 assert.ok(cmap,'font has no character map');
 const tables=[];
 for(let i=0;i<cmap.readUInt16BE(2);i++){const record=4+i*8;if(cmap.readUInt16BE(record)===0||cmap.readUInt16BE(record)===3)tables.push(cmap.readUInt32BE(record+4));}
 function mapped(code) {
  return tables.some(start=>{
   const format=cmap.readUInt16BE(start);
   if(format===12) {
    for(let i=0;i<cmap.readUInt32BE(start+12);i++){const group=start+16+i*12,a=cmap.readUInt32BE(group),b=cmap.readUInt32BE(group+4);if(code>=a&&code<=b)return cmap.readUInt32BE(group+8)+code-a>0;}
   }
   if(format===4&&code<=65535) {
    const count=cmap.readUInt16BE(start+6)/2,end=start+14,begin=end+2*count+2,delta=begin+2*count,range=delta+2*count;
    for(let i=0;i<count;i++)if(code>=cmap.readUInt16BE(begin+i*2)&&code<=cmap.readUInt16BE(end+i*2)) {
     const shift=cmap.readInt16BE(delta+i*2),index=cmap.readUInt16BE(range+i*2);
     if(!index)return ((code+shift)&65535)>0;
     const glyph=cmap.readUInt16BE(range+i*2+index+2*(code-cmap.readUInt16BE(begin+i*2)));
     return glyph!==0&&((glyph+shift)&65535)>0;
    }
   }
   return false;
  });
 }
 const displayed=data.leaders.flatMap(p=>[p.name,p.role,p.intro]).concat(data.members).join('');
 const missing=[...new Set(displayed)].filter(c=>!/[\s]/u.test(c)&&!mapped(c.codePointAt(0)));
 assert.deepEqual(missing,[],'displayed glyphs fall back to another font');
});
