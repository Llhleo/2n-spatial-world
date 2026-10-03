import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createAutoplay} from '../src/autoplay.js';
import {lookbackPose} from '../src/lookback.js';
import {pose} from '../src/journey.js';
import {gardenPose} from '../src/garden-path.js';
import {oceanPose} from '../src/ocean-production.js';
import {junglePose} from '../src/jungle-production.js';
import {hellPose} from '../src/hell-production.js';
import {scrollProgress} from '../src/viewport.js';

const api=await import('../src/people-story.js').catch(()=>({}));
const requireApi=()=>assert.equal(typeof api.sampleStoryPose,'function','appended story scheduler is missing');
const camera=()=>new THREE.PerspectiveCamera(48,414/896,.2,2400);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('same physical scroll offset keeps every old camera shot and original 28-unit coordinate',()=>{
 requireApi();
 const oldCamera=camera(),nextCamera=camera();
 const samples=[
  [3,()=>pose(.5,oldCamera,true)],
  [10,()=>gardenPose(.5,oldCamera,true)],
  [17,()=>oceanPose(.5,oldCamera,true)],
  [22,()=>junglePose(.5,oldCamera)],
  [25,()=>hellPose(.25,oldCamera)],
  [41.2,()=>lookbackPose(.5,oldCamera)],
  [55.2,()=>lookbackPose(1,oldCamera)],
 ];
 for(const [units,oldPose] of samples){
  const progress=api.scrollToStory(units*896/(73.2*896));
  near(progress,units/28);
  const old=oldPose(),next=api.sampleStoryPose(progress,nextCamera,true);
  for(const key of ['position','target'])old[key].forEach((v,i)=>near(next[key][i],v));
  assert.ok(nextCamera.quaternion.angleTo(oldCamera.quaternion)<1e-7);
 }
});

test('direct ending seek, reverse drag and portrait/landscape resize are absolute samples',()=>{
 requireApi();
 const cam=camera(),end=api.scrollToStory(1);
 near(api.chapterAt(end).peopleT,1);
 assert.equal(api.chapterAt(end).chapter,'people');
 const before=api.sampleStoryPose(api.scrollToStory(.88),cam,true);
 api.sampleStoryPose(end,cam,true);
 assert.deepEqual(api.sampleStoryPose(api.scrollToStory(.88),cam,true),before);
 const progress=api.scrollToStory(.88);
 const retained=api.storyToScroll(progress);
 cam.aspect=896/414;cam.updateProjectionMatrix();
 const landscape=api.sampleStoryPose(progress,cam,false);
 assert.ok(landscape.position.every(Number.isFinite));
 near(api.scrollToStory(retained),progress);
 cam.aspect=414/896;cam.updateProjectionMatrix();
 assert.deepEqual(api.sampleStoryPose(progress,cam,true),before);
 near(api.chapterAt(api.scrollToStory(55.2/73.2)).peopleT,0);
 assert.equal(api.chapterAt(api.scrollToStory(55.2/73.2)).chapter,'lookback');
});

test('autoplay keeps old unit speed, reaches appended ending and pauses there on manual control',()=>{
 requireApi();
 const player=createAutoplay(api.AUTOPLAY_DURATION);
 player.toggle(0,true);
 near(api.scrollToStory(player.advance(75))*28,27.6);
 player.advance(75);
 near(api.scrollToStory(player.advance(150*18/55.2)),73.2/28);
 assert.equal(player.playing,false);
 player.toggle(.9,true);player.advance(1);player.pause();
 const paused=player.advance(1);near(player.advance(10),paused);
});

// The GPU/text boundary is replaced; the actual entry script and scheduler run.
// This catches adding people to the original ready gate or seeking on retry.
function entry({constructionError=false,preparationError=false,reduced=false}={}){
 const events=new Map(),elements=new Map(),calls={prepare:0,people:[],companion:[],scroll:[],render:0};
 const element=id=>{
  if(!elements.has(id))elements.set(id,{hidden:false,dataset:{},style:{},classList:{add(){},remove(){}},textContent:'',setAttribute(){},querySelector(){return element(id+'-span');},addEventListener(type,fn){events.set(id+':'+type,fn);}});
  return elements.get(id);
 };
 let frame,resize,oldReady=false,now=0,scrollY=0,currentReduced=reduced;
 const resource=()=>({group:new THREE.Group(),ready:true,prepare:async()=>{},update(){},resize(){},capture(){},install(){},prepared:7,displayPrepared:14});
 const companion=resource();companion.update=(...args)=>calls.companion.push(args);
 const gallery=resource();gallery.ready=false;gallery.error=null;
 gallery.prepare=gallery.retry=async()=>{calls.prepare++;if(preparationError){gallery.error=new Error('font timeout');throw gallery.error;}gallery.ready=true;};
 gallery.update=(...args)=>calls.people.push(args);
 const world={loading:{failures:{},counts:{}},groundStatus:'ready',prepare:async()=>{},update(){}};
 const view={width:414,height:896,range:73.2*896};
 class Renderer{setClearColor(){}setPixelRatio(v){this.ratio=v;}getPixelRatio(){return this.ratio;}setSize(){}initTexture(){}render(){calls.render++;}setAnimationLoop(fn){frame=fn;}}
 const context={...api,THREE:{...THREE,WebGLRenderer:Renderer},oceanPose,createAutoplay,junglePose,hellPose,lookbackPose,RETURN_START:27.2/28,RETURN_UNITS:28,STORY_UNITS:55.2,pose,gardenPose,scrollProgress,
  createMonument:()=>new THREE.Group(),createLighting(){},createRevealLight(){},atmosphere:()=>({update(){}}),createBiomes:()=>world,createCompanionship:()=>companion,createMapFlowers:resource,createRegionNames:resource,
  createLoadingIntro:()=>({update:({allReady})=>({locked:!allReady,speed:1})}),attachIntroInput(){},allBiomesReady:()=>oldReady,warmBiomeResources:async()=>{},prepareBiomePetals:async()=>{},
  peopleData:{},createPeopleGallery(){if(constructionError)throw new Error('invalid record');return gallery;},
  stableViewport(fn){resize=fn;fn(view,null);return()=>view;},
  document:{querySelector:s=>element(s.slice(1)),documentElement:{classList:{toggle(){}}},addEventListener(){}},
  matchMedia:query=>({get matches(){return query.includes('prefers-reduced-motion')&&currentReduced;}}),devicePixelRatio:1,performance:{now:()=>now},setTimeout:()=>1,clearTimeout(){},requestIdleCallback(){},window:{},
  addEventListener(type,fn){events.set(type,fn);},scrollTo({top}){scrollY=top;calls.scroll.push(top);},get scrollY(){return scrollY;},
 };
 vm.runInNewContext(readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);
 return {calls,gallery,elements,events,setReduced(value){currentReduced=value;},async settle(){await new Promise(resolve=>setImmediate(resolve));},tick(){now+=20;frame(now);},open(){oldReady=true;},seek(p){scrollY=p*view.range;},resize(){const old={...view};view.width=896;view.height=414;view.range=73.2*414;resize(view,old);}};
}

test('people font failure cannot lock original opening; retry and resize do not reset camera progress',async()=>{
 requireApi();
 const app=entry({preparationError:true});
 assert.equal(app.calls.prepare,0,'font work competes with opening preparation');
 await app.settle();
 assert.equal(app.calls.prepare,1);
 app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');
 app.events.get('pointerdown')({target:{closest:()=>false}});
 app.seek(.92);for(let i=0;i<180;i++)app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'people');
 const before=Number(app.elements.get('world').dataset.progress);
 app.events.get('retry-people:click')({stopPropagation(){}});await app.settle();
 app.tick();near(Number(app.elements.get('world').dataset.progress),before);
 app.resize();app.tick();near(Number(app.elements.get('world').dataset.progress),before);
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 const playing=app.elements.get('autoplay').textContent;assert.equal(playing,'暂停播放');
 app.events.get('pointerdown')({target:{closest:selector=>selector.includes('#retry-people')}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'暂停播放','retry pointer unexpectedly takes story control');
 app.events.get('wheel')({type:'wheel',target:{closest:selector=>selector.includes('#retry-people')}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'自动播放','wheel over status must immediately pause');
 app.events.get('autoplay:click')({stopPropagation(){}});app.tick();
 app.events.get('touchstart')({target:{closest:()=>false}});app.tick();
 assert.equal(app.elements.get('autoplay').textContent,'自动播放');
 app.gallery.ready=true;app.gallery.error=null;app.tick();
 assert.equal(app.elements.get('people-status').hidden,true,'late sync recovery leaves stale failure');
 assert.ok(app.calls.render>0);
});

test('invalid people content preserves the original scene and intro',async()=>{
 requireApi();
 const app=entry({constructionError:true});await app.settle();app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.loadingIntro,'false');
 assert.ok(app.calls.render>0);
});

test('reduced motion reaches appended ending while gallery and companion receive no drift time',async()=>{
 requireApi();
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 assert.equal(app.elements.get('world').dataset.biome,'people');
 assert.equal(app.elements.get('world').dataset.peopleProgress,'1.000');
 const companion=app.calls.companion.at(-1),gallery=app.calls.people.at(-1);
 near(companion[0],1);near(companion[1],0);near(companion[2],1);
 near(gallery[0],1);near(gallery[2],0);assert.equal(gallery[3],true);
});

test('reduced-motion manual input reads forward and backward without smoothing or forced ending',async()=>{
 requireApi();
 const app=entry({reduced:true});await app.settle();app.open();app.tick();
 app.events.get('touchstart')({type:'touchstart',target:{closest:()=>false}});
 for(const scroll of [.88,.4,.93]){
  app.seek(scroll);app.tick();
  near(Number(app.elements.get('world').dataset.progress),Number((scroll*73.2/28).toFixed(3)));
  near(app.calls.companion.at(-1)[1],0);
 }
 const before=app.elements.get('world').dataset.progress;
 app.setReduced(false);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
 app.setReduced(true);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
});

test('turning reduced motion on mid-opening holds the current shot rather than jumping to ending',async()=>{
 requireApi();
 const app=entry();await app.settle();app.open();for(let i=0;i<50;i++)app.tick();
 const before=app.elements.get('world').dataset.progress;
 app.setReduced(true);app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
 for(let i=0;i<50;i++)app.tick();assert.equal(app.elements.get('world').dataset.progress,before);
});
