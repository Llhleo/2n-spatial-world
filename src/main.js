import {oceanPose} from './ocean-production.js';
import {createAutoplay} from './autoplay.js';
import {junglePose} from './jungle-production.js';
import {hellPose} from './hell-production.js';
import {lookbackPose,RETURN_START,RETURN_UNITS,STORY_UNITS} from './lookback.js';
import {createCompanionship} from './companionship.js';
import {createLoadingIntro,attachIntroInput,allBiomesReady} from './loading-intro.js';
import {warmBiomeResources} from './biome-warmup.js';
import {createRegionNames} from './region-names.js';
import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import { pose } from './journey.js';
import {stableViewport,scrollProgress} from './viewport.js';
import {createRevealLight} from './reveal-light.js';
import {gardenPose} from './garden-path.js';
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
  scene.add(createMonument());
  createLighting(scene, renderer);
  createRevealLight(scene);
  const atmosphereRig=atmosphere(scene, matchMedia('(max-width: 700px)').matches);
  const world=createBiomes(scene,matchMedia('(max-width: 700px)').matches);
  const companionship=createCompanionship(scene);scene.add(companionship.group);
  world.onAssetPrepared=(mesh,kind,name)=>{if(mesh.material.map)renderer.initTexture(mesh.material.map);companionship.install(mesh,kind,name);};
  let gpuReady=false,gpuError='',warming=false,preparingAll=false;
  async function prepareEverything(){
    if(preparingAll)return;
    preparingAll=true;gpuReady=false;gpuError='';
    try{
    await Promise.all([prepareBiomePetals(world),companionship.prepare(mesh=>{if(mesh.material.map)renderer.initTexture(mesh.material.map);})]);
    if(Object.values(world.loading.failures).some(list=>list.length))return;
    while(world.groundStatus!=='ready')await new Promise(resolve=>setTimeout(resolve,16));
    companionship.capture();
    warming=true;
    await warmBiomeResources(renderer,scene);gpuReady=true;
    }catch(error){gpuError=error.message;}finally{warming=false;preparingAll=false;}
  }
  void prepareEverything();
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>world.prepare(),{timeout:500});
  else setTimeout(()=>world.prepare(),80);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 2400);
  const names=createRegionNames();scene.add(names.group);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  const arrival = document.querySelector('#arrival');
  const loading=document.querySelector('#loading-status'),retry=document.querySelector('#retry-models');
  const autoplayButton=document.querySelector('#autoplay'),player=createAutoplay(180);
  let dimTimer,buttonShown=false;
  function revealButton(){clearTimeout(dimTimer);autoplayButton.classList.remove('dimmed');dimTimer=setTimeout(()=>autoplayButton.classList.add('dimmed'),1400);}
  retry.addEventListener('click',()=>prepareEverything());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const intro=createLoadingIntro();
  let introLocked=true;
  let lastLoadingText='';
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    companionship.resize(camera.aspect);
    if(old&&controlled)scrollTo({top:retained*next.range,behavior:'instant'});
  },STORY_UNITS);
  const takeControl = event => {
    if(introLocked)return;
    if(event?.target?.closest?.('#autoplay'))return;
    if(event?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
    player.pause();
    if (!controlled) {
      // Hand off at the current shot, never jump back to the start on first touch.
      scrollTo({top:progress*28/STORY_UNITS*viewport().range,behavior:'instant'});
      controlled = true;
    }
  };
  addEventListener('wheel', takeControl, {passive:true});
  addEventListener('touchstart', takeControl, {passive:true});
  addEventListener('pointerdown', takeControl, {passive:true});
  addEventListener('keydown', takeControl);
  autoplayButton.addEventListener('click',event=>{
    event.stopPropagation();if(introLocked)return;
    player.toggle(progress*28/STORY_UNITS,true);controlled=true;
    scrollTo({top:progress*28/STORY_UNITS*viewport().range,behavior:'instant'});
    revealButton();
  });
  attachIntroInput(window,()=>introLocked,()=>{});
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const view=viewport();
    const failed=!!gpuError||Object.values(world.loading.failures).some(list=>list.length);
    const introState=intro.update({allReady:allBiomesReady(world)&&gpuReady&&companionship.ready,reduced:reduced.matches});introLocked=introState.locked;
    document.documentElement.classList.toggle('loading-intro',introLocked);
    const wasPlaying=player.playing;
    if(wasPlaying){
      progress=player.advance(dt)*STORY_UNITS/28;
      scrollTo({top:progress*28/STORY_UNITS*view.range,behavior:'instant'});
    }
    const scroll = scrollProgress(scrollY,view.range);
    if(!controlled) auto = Math.min(HERO_END*(introLocked?.92:1),auto+dt*HERO_END/30*introState.speed);
    const requested = reduced.matches&&!introLocked ? 1 : controlled ? scroll : auto;
    const target=controlled||reduced.matches&&!introLocked?requested*STORY_UNITS/28:requested;
    if(!wasPlaying)progress += (target-progress)*(1-Math.exp(-dt*5));
    if(reduced.matches&&!introLocked&&!wasPlaying) progress=STORY_UNITS/28;
    const heroProgress=Math.min(1,progress/HERO_END);
    const worldProgress=THREE.MathUtils.clamp((progress-HERO_END)/(DESERT_END-HERO_END),0,1);
    const portrait=view.width<view.height;
    const returnProgress=THREE.MathUtils.clamp((progress-RETURN_START)/(RETURN_UNITS/28),0,1);
    const state=progress>=RETURN_START?lookbackPose(returnProgress,camera):progress<=HERO_END ? pose(heroProgress,camera,portrait) : progress<=DESERT_END?gardenPose(worldProgress,camera,portrait):progress<=OCEAN_END?oceanPose((progress-DESERT_END)/(OCEAN_END-DESERT_END),camera,portrait):progress<=JUNGLE_END?junglePose((progress-OCEAN_END)/(JUNGLE_END-OCEAN_END),camera):hellPose((progress-JUNGLE_END)/(1-JUNGLE_END),camera);
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    companionship.update(returnProgress,reduced.matches?0:dt);
    const readingPixelRatio=Math.min(devicePixelRatio,returnProgress>.95?2:1.5);
    if(renderer.getPixelRatio()!==readingPixelRatio)renderer.setPixelRatio(readingPixelRatio);
    if(returnProgress>0&&scene.fog){const blend=THREE.MathUtils.smoothstep(returnProgress,0,.12);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0015,blend);}
    names.update(progress>HERO_END&&progress<RETURN_START?camera:-1);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025*DESERT_END,HERO_END+.09*DESERT_END));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=progress>=RETURN_START?'lookback':progress>JUNGLE_END?'hell':progress>OCEAN_END?'jungle':progress>DESERT_END?'ocean':worldProgress<.76?'garden':'desert-threshold';
    canvas.dataset.returnProgress=returnProgress.toFixed(3);
    canvas.dataset.hellPetals=world.hellPetalStatus;
    canvas.dataset.loadingIntro=String(introLocked);canvas.dataset.junglePetals=world.junglePetalStatus;
    canvas.dataset.gardenAssets=world.gardenStatus;
    canvas.dataset.oceanPetals=world.oceanPetalStatus;
    canvas.dataset.desertPetals=world.desertPetalStatus;
    const counts=world.loading.counts;
    loading.hidden=!introLocked;
    autoplayButton.hidden=introLocked;
    autoplayButton.setAttribute('aria-pressed',String(player.playing));
    autoplayButton.textContent=player.playing?'暂停播放':'自动播放';
    if(!introLocked&&!buttonShown){buttonShown=true;revealButton();}
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    const loadingText=failed?'部分资源未能准备好，请重试':warming?'正在预热完整画面，稍候即可滑动':`正在准备五境花瓣 · ${total}/23 · 高清花瓣 ${companionship.displayPrepared}/14`;
    if(loadingText!==lastLoadingText){loading.querySelector('span').textContent=loadingText;lastLoadingText=loadingText;}
    retry.hidden=!failed;retry.disabled=warming;
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
