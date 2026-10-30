import {createGuildRoadStory} from './guild-road-story.js';
import {renderRoadStory} from './road-story/view.js';
import {createGesturePlayback} from './gesture-playback.js';
import {ROAD_READING_STOPS} from './road-story/path.js';
import './loading-log.js';
import {limitManualHistoryEntry,manualHistoryEntryEnd,limitManualParticleEnding,limitManualHistoryReverse} from './manual-history-entry.js';
import {cancelPendingModelLoads} from './petal-loader.js';
import {preparePeopleDistance} from './people-distance.js';
import {createPeopleRoute} from './people-courtyard.js';
import {createAutoplay} from './autoplay.js';
import {createMapFlowers} from './map-flowers.js';
import {RETURN_START,STORY_UNITS} from './lookback.js';
import {TOTAL_UNITS,LEGACY_TOTAL_UNITS,NEXT_START_UNITS,PEOPLE_UNITS,autoplayDuration,autoplayToScroll,scrollToAutoplay,capturePeoplePosition,restorePeoplePosition,scrollToStory,storyToScroll,chapterAt,sampleStoryPose} from './people-story.js';
import {createPeopleGallery} from './people-gallery.js';
import peopleData from '../content/people.json';
import {createNextView} from './guild-next-view.js';
import {particleEndingEnabled} from './guild-next-route.js';
import {createHistoryView} from './guild-history-view.js';
import {createMemoryScene} from './guild-memory-scene.js';
import {renderMemoryPreview} from './guild-memory-preview.js';
import {normalizeHistory} from './guild-history-data.js';
import historyData from '../content/history.json';
import {createCompanionship} from './companionship.js';
import {createLoadingIntro,attachIntroInput,allBiomesReady} from './loading-intro.js';
import {warmBiomeResources} from './biome-warmup.js';
import {createRegionNames} from './region-names.js';
import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import {stableViewport,scrollProgress} from './viewport.js';
import {createRevealLight} from './reveal-light.js';
import {createBiomes,prepareBiomePetals} from './biomes.js';

const HERO_END=6/28, DESERT_END=14/28, OCEAN_END=20/28, JUNGLE_END=24/28;

const canvas = document.querySelector('#world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
catch { document.querySelector('#fallback').hidden = false; }
if (renderer) {
  renderer.setClearColor(0x060709);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const openingMonument=createMonument();openingMonument.name='opening-monument';scene.add(openingMonument);
  const historyRecords=normalizeHistory(historyData);
  const memoryPreview=new URLSearchParams(location.search).get('historyPreview')==='1';
  const particleEnding=particleEndingEnabled(location.search,renderer.extensions.has('EXT_color_buffer_float'));
  const roads=createGuildRoadStory({historyRecords:historyRecords.events});scene.add(roads.group);
  const gestureMode=new URLSearchParams(location.search).get('playback')!=='legacy',roadPreview=new URLSearchParams(location.search).get('roadPreview')==='1';
  const memory=createMemoryScene({mobile:matchMedia('(max-width: 700px)').matches});
  if(memory)scene.add(memory.group);
  let memoryIndex=0,memoryText=true;
  const memoryControls=memoryPreview?document.createElement('nav'):null;
  if(memoryControls){
    memoryControls.className='memory-preview-controls';memoryControls.setAttribute('aria-label','工会故事构图预览');memoryControls.hidden=true;
    const label=document.createElement('span');label.textContent='滑动阅读';memoryControls.append(label);
    ['相遇','延续','繁盛','文案'].forEach((title,index)=>{const button=document.createElement('button');button.type='button';button.textContent=title;button.setAttribute('aria-pressed',String(index===3?memoryText:index===0));button.addEventListener('click',event=>{event.stopPropagation();if(index===3){memoryText=!memoryText;button.setAttribute('aria-pressed',String(memoryText));}else{memoryIndex=index;scrollTo({top:[.14,.52,.86][index]*viewport().range,behavior:'smooth'});[...memoryControls.querySelectorAll('button')].slice(0,3).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}});memoryControls.append(button);});
    document.body.append(memoryControls);
  }
  const nextView=createNextView({particleEnding});scene.add(nextView.group);
  let history=null,historyPreparing=false,historyError=null;
  if(!historyRecords.errors.length){history=createHistoryView(historyRecords.events);scene.add(history.group);}else historyError=new Error(historyRecords.errors.join(' '));
  async function prepareHistory(){
    if(!history||historyPreparing)return;historyPreparing=true;historyError=null;
    try{await Promise.all([history.prepare(),nextView.prepare(),roads.prepare()]);if(particleEnding)memory.prepareParticleEnding(renderer);}catch(error){historyError=error;}finally{historyPreparing=false;}
  }
  createLighting(scene, renderer);
  createRevealLight(scene);
  const atmosphereRig=atmosphere(scene, matchMedia('(max-width: 700px)').matches);
  const world=createBiomes(scene,matchMedia('(max-width: 700px)').matches);
  const companionship=createCompanionship(scene);scene.add(companionship.group);
  const flowers=createMapFlowers();scene.add(flowers.group);
  world.onAssetPrepared=(mesh,kind,name)=>{if(mesh.material.map)renderer.initTexture(mesh.material.map);companionship.install(mesh,kind,name);};
  let gpuReady=false,gpuError='',warming=false,preparingAll=false;
  let people=null,peopleRoute=null,peoplePreparing=false,peopleError=null,peopleStarted=false;
  let measuredRoutePending=false,metricsAdopted=false;
  let cancelDistancePreparation=()=>{};
  // Gallery validation and font sync are isolated from all prior scene resources.
  async function preparePeople(){
    if(peoplePreparing)return;
    peopleStarted=true;peoplePreparing=true;peopleError=null;
    try{
      if(!people){
        const base=createPeopleRoute(peopleData);
        people=createPeopleGallery(peopleData,base);scene.add(people.group);
        const view=viewport();adoptPeopleRoute(people.resize(camera.aspect,view.height));
      }
      await people.retry();
      adoptReadyMetrics();
    }catch(error){peopleError=error;}finally{peoplePreparing=false;}
  }
  async function prepareEverything(){
    if(preparingAll)return;
    preparingAll=true;gpuReady=false;gpuError='';world.prepare();
    try{
    const initMaps=mesh=>{for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])for(const value of Object.values(material))if(value?.isTexture)renderer.initTexture(value);};
    // Settle every branch before enabling a retry: never overlap preparation runs.
    const results=await Promise.allSettled([prepareBiomePetals(world),companionship.prepare(initMaps,(source,kind,name)=>{memory?.install(source,kind,name);roads.install(source,kind,name);}),flowers.prepare(initMaps)].map(job=>job.catch(error=>{cancelPendingModelLoads();throw error;})));
    const rejected=results.find(result=>result.status==='rejected');if(rejected)throw rejected.reason;
    if(Object.values(world.loading.failures).some(list=>list.length))return;
    const groundDeadline=performance.now()+15000;
    while(world.groundStatus!=='ready'){if(world.groundStatus==='error')throw new Error('地图准备失败，请重试');if(performance.now()>groundDeadline)throw new Error('地图准备超时，请重试');await new Promise(resolve=>setTimeout(resolve,16));}
    companionship.capture();
    warming=true;
    await warmBiomeResources(renderer,scene);gpuReady=true;
    }catch(error){gpuError=error.message;}finally{
      warming=false;preparingAll=false;
      // Do not compete with the old opening's model decode and GPU preparation.
      if(gpuReady&&!peopleStarted)void preparePeople();
      if(gpuReady)void prepareHistory();
    }
  }
  void prepareEverything();
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>world.prepare(),{timeout:500});
  else setTimeout(()=>world.prepare(),80);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 2400);
  const names=createRegionNames();scene.add(names.group);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  const arrival = document.querySelector('#arrival');
  const loading=document.querySelector('#loading-status'),retry=document.querySelector('#retry-models');
  const peopleStatus=document.querySelector('#people-status'),peopleRetry=document.querySelector('#retry-people');
  const historyStatus=document.querySelector('#history-status'),historyRetry=document.querySelector('#retry-history');
  historyRetry.addEventListener('click',event=>{event.stopPropagation();void prepareHistory();});
  peopleRetry.addEventListener('click',event=>{event.stopPropagation();void preparePeople();});
  const autoplayButton=document.querySelector('#autoplay');
  const replayButton=document.querySelector('#replay');
  let player=createAutoplay(autoplayDuration(peopleRoute,particleEnding));
  let dimTimer,buttonShown=false;
  function revealButton(){clearTimeout(dimTimer);autoplayButton.classList.remove('dimmed');dimTimer=setTimeout(()=>autoplayButton.classList.add('dimmed'),1400);}
  retry.addEventListener('click',event=>{event.stopPropagation();void prepareEverything();});
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const startAtEnding=reduced.matches;
  const intro=createLoadingIntro();
  let introLocked=true;
  let lastLoadingText='',lastPeopleText='';
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  let gesturePlayer=null,gestureActive=false,roadControl=false,previewStarted=false,gestureResumeDirection=0,roadExitDirection=0;
  const roadStart=LEGACY_TOTAL_UNITS/28,roadEnd=NEXT_START_UNITS/28;
  let touchAnchor=null,touchDirection=0,wheelAt=-Infinity,wheelDirection=0;
  function ensureGesture(){
    if(!gesturePlayer)gesturePlayer=createGesturePlayback([0,...ROAD_READING_STOPS,36]);
    if(!gestureActive){gesturePlayer.seek((progress-roadStart)/(roadEnd-roadStart)*36);gestureActive=true;if(gestureResumeDirection){gesturePlayer.request(gestureResumeDirection);gestureResumeDirection=0;}}
    return gesturePlayer;
  }
  function roadInputScope(direction=0){
    if(!gestureMode||memoryPreview||reduced.matches)return false;
    return roadControl||(progress>roadStart+1e-9&&progress<roadEnd-1e-9)||(direction>0&&Math.abs(progress-roadStart)<1e-9)||(direction<0&&Math.abs(progress-roadEnd)<1e-9);
  }
  function alignRoadScroll(boundaryDirection=0){
    particleScrollOffset=0;particleRebasePending=false;
    const top=storyToScroll(progress,peopleRoute)*viewport().range;
    // Native scroll offsets may round toward the preceding CSS pixel. Land
    // just outside the completed boundary, so rounding cannot invent a reverse
    // crossing on the following idle frame. Interior reading seeks stay exact.
    const landing=boundaryDirection>0?Math.ceil(top)+1:boundaryDirection<0?Math.floor(top)-1:top;
    scrollTo({top:Math.max(0,landing),behavior:'instant'});previousNativeScroll=scrollY;
  }
  function beginRoadControl(){
    if(roadControl)return;
    roadControl=true;roadExitDirection=0;gestureActive=false;gestureResumeDirection=0;player.pause();controlled=true;ensureGesture();alignRoadScroll();
  }
  function releaseRoadControl(direction=0){roadControl=false;roadExitDirection=direction;gestureActive=false;gestureResumeDirection=0;alignRoadScroll(direction);}
  function requestGesture(direction){if(introLocked||!direction||!roadInputScope(direction))return;beginRoadControl();player.pause();controlled=true;ensureGesture().request(direction);}
  let touchScrolling=false,pointerScrolling=false,particleRebasePending=false;
  let previousNativeScroll=0;
  let particleScrollOffset=0,directedInput=0,directedInputAt=-Infinity;
  function adoptPeopleRoute(next){
    const playing=player.playing;
    gestureResumeDirection=gesturePlayer?.playing?gesturePlayer.direction:0;gestureActive=false;
    cancelDistancePreparation();
    peopleRoute=next;people.adoptRoute(next);
    cancelDistancePreparation=preparePeopleDistance(next);
    player=createAutoplay(autoplayDuration(next,particleEnding));
    if(playing)player.toggle(scrollToAutoplay(storyToScroll(progress,peopleRoute),next,particleEnding),true);
  }
  function adoptReadyMetrics(){
    if(!people?.ready||metricsAdopted)return;
    if(measuredRoutePending&&chapterAt(progress).peopleT>0)return;
    // Async glyph completion cannot replace geometry under a people camera.
    if(chapterAt(progress).peopleT>0){measuredRoutePending=true;people.adoptRoute(peopleRoute);return;}
    const view=viewport();adoptPeopleRoute(people.resize(camera.aspect,view.height));
    metricsAdopted=true;measuredRoutePending=false;
  }
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    companionship.resize(camera.aspect);
    history?.resize(next);
    const safeStyle=globalThis.getComputedStyle?.(document.documentElement);
    nextView.resize({...next,safeLeft:parseFloat(safeStyle?.getPropertyValue('--next-safe-left'))||0,safeRight:parseFloat(safeStyle?.getPropertyValue('--next-safe-right'))||0});
    if(gpuReady)void prepareHistory();
    let nextScroll=retained;
    if(people){
      const currentChapter=chapterAt(progress);
      const token=old&&currentChapter.chapter==='people'?capturePeoplePosition(peopleRoute,currentChapter.peopleT):null;
      const nextRoute=people.resize(camera.aspect,next.height);
      if(token){
        progress=(STORY_UNITS+PEOPLE_UNITS*restorePeoplePosition(nextRoute,token))/28;
        nextScroll=storyToScroll(progress,nextRoute);
        particleScrollOffset=0;particleRebasePending=false;
      }
      adoptPeopleRoute(nextRoute);
      if(people.ready){metricsAdopted=true;measuredRoutePending=false;}
    }
    if(old&&controlled){
      let top=nextScroll*next.range;
      // Rescaling the outward pixel can round it inward again. Retain the
      // completed boundary side until a fresh native movement takes over.
      if(roadExitDirection>0)top=Math.max(top,Math.ceil(storyToScroll(roadEnd,peopleRoute)*next.range)+1);
      else if(roadExitDirection<0)top=Math.min(top,Math.floor(storyToScroll(roadStart,peopleRoute)*next.range)-1);
      scrollTo({top:Math.max(0,top),behavior:'instant'});
      previousNativeScroll=scrollY;
    }
  },memoryPreview?6.4:TOTAL_UNITS);
  const takeControl = event => {
    if(introLocked)return;
    const inputDirection=event?.type==='wheel'?Math.sign(event.deltaY||0):event?.type==='keydown'?(['ArrowUp','PageUp','Home'].includes(event.key)||(event.key===' '&&event.shiftKey)?-1:1):0;
    if(roadInputScope(inputDirection)){
      if(event?.target?.closest?.('button,a,input,select,textarea'))return;
      if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
      beginRoadControl();
      if(event?.type==='wheel'){event.preventDefault();const direction=Math.sign(event.deltaY||0),now=performance.now();if(direction&&(now-wheelAt>220||direction!==wheelDirection))requestGesture(direction);wheelAt=now;wheelDirection=direction;}
      else if(event?.type==='keydown'){if(!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;event.preventDefault();if(!event.repeat)requestGesture(['ArrowUp','PageUp','Home'].includes(event.key)||(event.key===' '&&event.shiftKey)?-1:1);}
      return;
    }
    if(memoryPreview){controlled=true;player.pause();return;}
    if(event?.target?.closest?.('#autoplay')||event?.target?.closest?.('#replay'))return;
    if(event?.type!=='wheel'&&(event?.target?.closest?.('#retry-people')||event?.target?.closest?.('#retry-history')))return;
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    if(event?.type==='wheel'||event?.type==='keydown'){
      directedInput=event.type==='wheel'?Math.sign(event.deltaY||0):(['ArrowUp','PageUp','Home'].includes(event.key)||(event.key===' '&&event.shiftKey))?-1:1;
      directedInputAt=performance.now();
    }
    player.pause();
    if (!controlled) {
      // Hand off at the current shot, never jump back to the start on first touch.
      scrollTo({top:storyToScroll(progress,peopleRoute)*viewport().range,behavior:'instant'});
      controlled = true;
    }
  };
  addEventListener('wheel', takeControl, {passive:false});
  addEventListener('touchstart',event=>{touchScrolling=true;touchAnchor=event.touches?.[0]?.clientY??null;touchDirection=0;takeControl(event);},{passive:true});
  addEventListener('touchmove',event=>{
    if(!gestureMode||memoryPreview||introLocked||event.touches.length!==1||event.target.closest?.('button,a,input'))return;
    const y=event.touches[0].clientY,delta=(touchAnchor??y)-y;if(!roadInputScope(Math.sign(delta)))return;
    event.preventDefault();beginRoadControl();if(Math.abs(delta)<7)return;const direction=Math.sign(delta);if(direction!==touchDirection){requestGesture(direction);touchDirection=direction;}touchAnchor=y;
  },{passive:false});
  const finishTouch=event=>{touchScrolling=!!event?.touches?.length;};
  addEventListener('touchend',finishTouch,{passive:true});
  addEventListener('touchcancel',finishTouch,{passive:true});
  addEventListener('pointerdown',event=>{pointerScrolling=true;takeControl(event);},{passive:true});
  const finishPointer=()=>{pointerScrolling=false;};
  addEventListener('pointerup',finishPointer,{passive:true});
  addEventListener('pointercancel',finishPointer,{passive:true});
  addEventListener('blur',()=>{touchScrolling=false;finishPointer();});
  addEventListener('keydown', takeControl);
  autoplayButton.addEventListener('click',event=>{
    event.stopPropagation();if(introLocked)return;
    particleScrollOffset=0;particleRebasePending=false;gestureActive=false;
    player.toggle(scrollToAutoplay(storyToScroll(progress,peopleRoute),peopleRoute,particleEnding),true);controlled=true;
    scrollTo({top:storyToScroll(progress,peopleRoute)*viewport().range,behavior:'instant'});
    revealButton();
  });
  replayButton.addEventListener('click',event=>{
    event.stopPropagation();if(introLocked)return;
    particleScrollOffset=0;particleRebasePending=false;
    player.pause();gesturePlayer?.seek(0);gestureActive=false;roadControl=false;roadExitDirection=0;progress=0;auto=0;controlled=true;
    scrollTo({top:0,behavior:'instant'});replayButton.hidden=true;
  });
  attachIntroInput(window,()=>introLocked,()=>{});
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const view=viewport();
    // Build at most one fixed physics tick per displayed frame, long before
    // the ending is reached. Scrubbing only samples the completed GPU history.
    if(particleEnding)memory.warmParticleEnding?.(camera.aspect,reduced.matches);
    const failed=!!gpuError||Object.values(world.loading.failures).some(list=>list.length);
    const memoryReady=memoryPreview&&memory.assetCount===14;
    const introState=intro.update({allReady:allBiomesReady(world)&&gpuReady&&companionship.ready&&flowers.ready,reduced:reduced.matches});introLocked=(introState.locked&&!memoryReady)||(roadPreview&&(!roads.ready||!people?.ready));
    if(roadPreview&&!introLocked&&!previewStarted){previewStarted=true;controlled=true;progress=LEGACY_TOTAL_UNITS/28;gestureActive=false;requestGesture(1);}
    if(memoryReady&&history&&!history.ready&&!historyPreparing&&!historyError)void prepareHistory();
    document.documentElement.classList.toggle('loading-intro',introLocked);
    const wasPlaying=player.playing;
    let roadAdvanced=false;const progressBeforeManual=progress;
    if(roadControl&&reduced.matches)releaseRoadControl();
    if(roadControl&&controlled&&!wasPlaying&&!memoryPreview){
      const playback=ensureGesture(),direction=playback.direction,time=playback.advance(dt);roadAdvanced=true;
      progress=roadStart+(roadEnd-roadStart)*time/36;
      if(!playback.playing&&((time<=0&&direction<0)||(time>=36&&direction>0)))releaseRoadControl(direction);
    }
    if(wasPlaying){gestureActive=false;roadControl=false;}
    if(wasPlaying){
      progress=scrollToStory(autoplayToScroll(player.advance(dt),peopleRoute,particleEnding),peopleRoute);
      scrollTo({top:storyToScroll(progress,peopleRoute)*view.range,behavior:'instant'});
    }
    const nativePosition=scrollY,scroll=scrollProgress(nativePosition,view.range);
    const previousScroll=scrollProgress(previousNativeScroll,view.range),nativeDelta=scroll-previousScroll;
    previousNativeScroll=nativePosition;
    if(!roadControl&&(nativeDelta!==0||wasPlaying||reduced.matches))roadExitDirection=0;
    if(!controlled&&!reduced.matches) auto = Math.min(HERO_END*(introLocked?.92:1),auto+dt*HERO_END/30*introState.speed);
    // Initial reduced-motion landing is not a permanent scroll lock. Preference
    // changes hold the current shot; manual reduced-motion reads sample directly.
    const initialEnding=startAtEnding&&!introLocked&&!controlled;
    if(wasPlaying||reduced.matches||initialEnding||memoryPreview||!particleEnding){particleScrollOffset=0;particleRebasePending=false;}
    else if(controlled&&particleRebasePending&&nativeDelta!==0){
      const displayed=storyToScroll(progress,peopleRoute),queued=scrollProgress(scroll+particleScrollOffset,1);
      const reversingInput=touchScrolling||pointerScrolling||(now-directedInputAt<250&&Math.sign(nativeDelta)===directedInput);
      if(reversingInput&&nativeDelta*(queued-displayed)<0){
        // Cancel queued visual lag on a real input reversal, without moving
        // the native page. Subsequent deltas retain this temporary offset.
        particleScrollOffset=displayed-previousScroll;
      }
      if((nativeDelta>0&&scroll===1)||(nativeDelta<0&&scroll===0))particleScrollOffset=0;
    }
    const manualScroll=scrollProgress(scroll+particleScrollOffset,1);
    const requested=initialEnding?(peopleRoute?1:LEGACY_TOTAL_UNITS/TOTAL_UNITS):controlled?manualScroll:reduced.matches?progress:auto;
    const target=controlled||initialEnding?scrollToStory(requested,peopleRoute):requested;
    if(!wasPlaying&&!roadAdvanced){
      if(reduced.matches)progress=target;
      else if(controlled||initialEnding){
        // Damp the physical distance coordinate, then sample its inverse. Time
        // damping would reintroduce the hold/transfer sensitivity cliff.
        const current=storyToScroll(progress,peopleRoute);
        const candidate=scrollToStory(current+(requested-current)*(1-Math.exp(-dt*5)),peopleRoute);
        const before=progress;
        const historyCandidate=initialEnding?candidate:particleEnding&&candidate<progress?limitManualHistoryReverse(progress,candidate,dt):limitManualHistoryEntry(progress,candidate,dt);
        progress=!initialEnding&&particleEnding?limitManualParticleEnding(progress,historyCandidate,dt):historyCandidate;
        if(progress!==candidate)particleRebasePending=true;
        if(!initialEnding&&before<manualHistoryEntryEnd&&progress>=manualHistoryEntryEnd&&target>manualHistoryEntryEnd){
          // Discard the fling overshoot at the first readable story event.
          scrollTo({top:storyToScroll(progress,peopleRoute)*view.range,behavior:'instant'});
          particleScrollOffset=0;particleRebasePending=false;
          previousNativeScroll=scrollY;
        }
      } else progress += (target-progress)*(1-Math.exp(-dt*5));
    }
    // Only crossing into this chapter hands control to the time player.
    // Native targets outside it retain the original damping and particle guards.
    if(gestureMode&&!memoryPreview&&!reduced.matches&&controlled&&!wasPlaying&&!roadAdvanced&&!roadControl){
      const direction=progressBeforeManual<=roadStart+1e-9&&progress>roadStart+1e-9?1:progressBeforeManual>=roadEnd-1e-9&&progress<roadEnd-1e-9?-1:0;
      if(direction){progress=direction>0?roadStart:roadEnd;beginRoadControl();requestGesture(direction);}
    }
    document.documentElement.classList.toggle('gesture-playback',roadControl&&!memoryPreview);
    if(people?.ready&&(!metricsAdopted||measuredRoutePending))adoptReadyMetrics();
    const chapter=chapterAt(progress),heroProgress=chapter.heroT,worldProgress=chapter.worldT;
    if(particleScrollOffset!==0)particleRebasePending=true;
    if(wasPlaying||reduced.matches||initialEnding||memoryPreview||!particleEnding||(!['next','history'].includes(chapter.chapter)&&particleScrollOffset===0))particleRebasePending=false;
    // Keep the requested native target after release, including the physical
    // bottom. The speed-limited picture catches up; never discard the ending
    // or pull the page back. Reversals above cancel lag without a scroll write.
    const portrait=view.width<view.height;
    const returnProgress=chapter.returnT,peopleProgress=chapter.peopleT;
    const state=sampleStoryPose(progress,camera,portrait,peopleRoute,particleEnding);
    const inNext=chapter.chapter==='next',closing=chapter.chapter==='history'||inNext;
    nextView.group.visible=false;
    if(history){history.group.visible=false;if(closing)history.update(state,camera,view);}
    if(gpuReady&&history&&(!history.ready||!nextView.ready)&&!historyPreparing&&!historyError)void prepareHistory();
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    const departureCamera=closing?camera.clone():null;
    if(departureCamera){departureCamera.position.fromArray(state.entryPose.position);departureCamera.up.fromArray(state.entryPose.up);departureCamera.lookAt(...state.entryPose.target);departureCamera.updateMatrixWorld();}
    companionship.update(returnProgress,reduced.matches?0:dt,peopleProgress,peopleRoute,closing?{camera:departureCamera}:null);
    const entryKey=closing?JSON.stringify([state.entryPose.position,state.entryPose.target,camera.aspect]):null;
    if(!closing)memory.group.userData.entryCaptured=null;
    if(closing&&memory.group.userData.entryCaptured!==entryKey){companionship.captureChain(departureCamera);memory.captureEntry?.(companionship.group,departureCamera);roads.captureEntry(companionship.group,state.entryPose);memory.group.userData.entryCaptured=entryKey;}
    people?.update(peopleProgress,camera,reduced.matches?0:dt,reduced.matches);
    if(closing&&people){
      people.group.traverse(object=>{
        const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials){if(!material)continue;if(material.uniforms?.opacity)material.uniforms.opacity.value*=state.peopleOpacity;else material.opacity*=state.peopleOpacity;}
      });
      people.group.visible=people.group.visible&&state.peopleOpacity>0;
    }
    const nextButtons=inNext&&state.buttonsVisible&&nextView.ready&&(!particleEnding||memory.particleEndingReady);
    replayButton.hidden=introLocked||!nextButtons;
    flowers.group.visible=heroProgress>=.98;
    flowers.update(camera,reduced.matches?0:dt);
    const readingPixelRatio=Math.min(devicePixelRatio,(memoryPreview||closing)?2.5:returnProgress>.95?2:1.5);
    if(renderer.getPixelRatio()!==readingPixelRatio)renderer.setPixelRatio(readingPixelRatio);
    if(returnProgress>0&&scene.fog){const blend=THREE.MathUtils.smoothstep(returnProgress,0,.12);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0015,blend);}
    names.update(progress>HERO_END&&progress<RETURN_START?camera:-1);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025*DESERT_END,HERO_END+.09*DESERT_END));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.playbackScope=roadControl?'road':'native';canvas.dataset.playbackSeconds=String(gesturePlayer?.time??0);canvas.dataset.playbackTarget=String(gesturePlayer?.target??0);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=inNext?'next':closing?'history':chapter.chapter==='people'?'people':progress>=RETURN_START?'lookback':progress>JUNGLE_END?'hell':progress>OCEAN_END?'jungle':progress>DESERT_END?'ocean':worldProgress<.76?'garden':'desert-threshold';
    canvas.dataset.returnProgress=returnProgress.toFixed(3);
    canvas.dataset.peopleProgress=peopleProgress.toFixed(3);
    canvas.dataset.historyProgress=chapter.historyT.toFixed(3);
    canvas.dataset.hellPetals=world.hellPetalStatus;
    canvas.dataset.loadingIntro=String(introLocked);canvas.dataset.junglePetals=world.junglePetalStatus;
    canvas.dataset.gardenAssets=world.gardenStatus;
    canvas.dataset.oceanPetals=world.oceanPetalStatus;
    canvas.dataset.desertPetals=world.desertPetalStatus;
    const counts=world.loading.counts;
    loading.hidden=!introLocked;
    autoplayButton.hidden=introLocked||inNext;
    autoplayButton.setAttribute('aria-pressed',String(player.playing));
    autoplayButton.textContent=player.playing?'暂停播放':roadControl&&gesturePlayer?.playing?'自动播放 · 继续整段':'自动播放';
    if(!introLocked&&!buttonShown){buttonShown=true;revealButton();}
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    const loadingText=failed?(preparingAll?'正在完成剩余资源，随后可重试':`资源准备失败，可重试${gpuError?' · '+gpuError:''}`):warming?'正在预热完整画面，稍候即可滑动':`正在准备五境花瓣 · ${total}/23 · 高清花瓣 ${companionship.displayPrepared}/14 · 花朵 ${flowers.prepared}/7`;
    if(loadingText!==lastLoadingText){loading.querySelector('span').textContent=loadingText;lastLoadingText=loadingText;}
    retry.hidden=!failed;retry.disabled=preparingAll;retry.textContent=preparingAll?'准备中…':'重新加载';
    const galleryReady=!!people?.ready;
    // Read the gallery getter every frame: late sync can clear a prior timeout.
    const galleryFailed=!galleryReady&&!!(people?.error||peopleError);
    peopleStatus.hidden=introLocked||closing||progress<(STORY_UNITS-2)/28||galleryReady;
    const peopleText=galleryFailed?'人物文字暂未准备好，可继续滑动或重试':'正在准备人物文字，可继续滑动';
    if(peopleText!==lastPeopleText){peopleStatus.querySelector('span').textContent=peopleText;lastPeopleText=peopleText;}
    peopleRetry.hidden=!galleryFailed;peopleRetry.disabled=peoplePreparing;
    const readingReady=inNext?nextView.ready&&(!particleEnding||memory.particleEndingReady):closing&&roads.ready?true:!!history?.ready;
    historyStatus.hidden=introLocked||!closing||readingReady;
    historyStatus.querySelector('span').textContent=historyError?'故事资源准备失败，可重试':inNext?'正在准备结尾，可继续滑动':'正在准备公会历史，可继续滑动';
    historyRetry.hidden=!historyError;historyRetry.disabled=historyPreparing;
    if(memoryPreview&&!introLocked){
      memoryControls.hidden=false;autoplayButton.hidden=true;replayButton.hidden=true;arrival.style.opacity=0;peopleStatus.hidden=true;
      historyStatus.hidden=!memoryText||!!history?.ready;
      renderMemoryPreview({scene,renderer,camera,memory,history,index:memoryIndex,progress:scrollProgress(scrollY,view.range),viewport:view,dt,reducedMotion:reduced.matches,showText:memoryText});
      canvas.dataset.biome='memory-preview';canvas.dataset.memoryStage=String(memoryIndex);
    }else if(closing&&roads.ready&&memory.assetCount===14){
      renderRoadStory({scene,renderer,camera,roads,memory,history,nextView,state,chapter,viewport:view,dt,reducedMotion:reduced.matches,departureGroups:[companionship.group],updateEnvironment:renderCamera=>{atmosphereRig.update(renderCamera,heroProgress);world.update(renderCamera,worldProgress);if(scene.fog)scene.fog.density=.0018;}});
      canvas.dataset.roadInstances=String(roads.instanceCount);canvas.dataset.roadVisible=String(roads.visibleCount);canvas.dataset.gestureTime=String(gesturePlayer?.time??0);
    }else if(closing&&memory.assetCount===14){
      renderMemoryPreview({scene,renderer,camera,memory,history,nextView,particleEnding,nextT:inNext&&(!particleEnding||memory.particleEndingReady)?chapter.nextT:undefined,entryPose:state.entryPose,departureGroups:[companionship.group],progress:chapter.historyT,viewport:view,dt,reducedMotion:reduced.matches,showText:true,updateEnvironment:renderCamera=>{atmosphereRig.update(renderCamera,heroProgress);world.update(renderCamera,worldProgress);if(scene.fog)scene.fog.density=.0015;}});
    }else renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{memory.invalidateParticleEnding?.();previous=performance.now();renderer.setAnimationLoop(frame);});
}
