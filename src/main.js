import {oceanPose} from './ocean-production.js';
import {junglePose} from './jungle-production.js';
import {hellPose} from './hell-production.js';
import {createLoadingIntro,attachIntroInput} from './loading-intro.js';
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
  world.onAssetPrepared=mesh=>{if(mesh.material.map)renderer.initTexture(mesh.material.map);};
  prepareBiomePetals(world);
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>world.prepare(),{timeout:500});
  else setTimeout(()=>world.prepare(),80);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 900);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  const arrival = document.querySelector('#arrival');
  const loading=document.querySelector('#loading-status'),retry=document.querySelector('#retry-models');
  const skip=document.querySelector('#skip-loading');
  retry.addEventListener('click',()=>prepareBiomePetals(world));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const intro=createLoadingIntro(performance.now(),new URLSearchParams(location.search).get('loadingIntro')!=='0');
  let introLocked=!reduced.matches;skip.addEventListener('click',()=>intro.skip());
  let lastLoadingText='';
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    if(old&&controlled)scrollTo({top:retained*next.range,behavior:'instant'});
  },28);
  const takeControl = () => {
    if(introLocked)return;
    if (!controlled) {
      // Hand off at the current shot, never jump back to the start on first touch.
      scrollTo({top:progress*viewport().range,behavior:'instant'});
      controlled = true;
    }
  };
  addEventListener('wheel', takeControl, {passive:true});
  addEventListener('touchstart', takeControl, {passive:true});
  addEventListener('keydown', takeControl);
  attachIntroInput(window,()=>introLocked,()=>intro.skip());
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const view=viewport();
    const failed=Object.values(world.loading.failures).some(list=>list.length);
    const introState=intro.update({now,gardenReady:world.petalStatus==='ready'&&world.groundStatus==='ready',failed,reduced:reduced.matches});introLocked=introState.locked;
    document.documentElement.classList.toggle('loading-intro',introLocked);skip.hidden=!introLocked;
    const scroll = scrollProgress(scrollY,view.range);
    if(!controlled) auto = Math.min(HERO_END*(introLocked?.92:1),auto+dt*HERO_END/30*introState.speed);
    const requested = reduced.matches ? 1 : controlled ? scroll : auto;
    const target=requested;
    progress += (target-progress)*(1-Math.exp(-dt*5));
    if(reduced.matches) progress=1;
    const heroProgress=Math.min(1,progress/HERO_END);
    const worldProgress=THREE.MathUtils.clamp((progress-HERO_END)/(DESERT_END-HERO_END),0,1);
    const portrait=view.width<view.height;
    const state=progress<=HERO_END ? pose(heroProgress,camera,portrait) : progress<=DESERT_END?gardenPose(worldProgress,camera,portrait):progress<=OCEAN_END?oceanPose((progress-DESERT_END)/(OCEAN_END-DESERT_END),camera,portrait):progress<=JUNGLE_END?junglePose((progress-OCEAN_END)/(JUNGLE_END-OCEAN_END),camera):hellPose((progress-JUNGLE_END)/(1-JUNGLE_END),camera);
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025*DESERT_END,HERO_END+.09*DESERT_END));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=progress>JUNGLE_END?'hell':progress>OCEAN_END?'jungle':progress>DESERT_END?'ocean':worldProgress<.76?'garden':'desert-threshold';
    canvas.dataset.hellPetals=world.hellPetalStatus;
    canvas.dataset.loadingIntro=String(introLocked);canvas.dataset.junglePetals=world.junglePetalStatus;
    canvas.dataset.gardenAssets=world.gardenStatus;
    canvas.dataset.oceanPetals=world.oceanPetalStatus;
    canvas.dataset.desertPetals=world.desertPetalStatus;
    const counts=world.loading.counts;
    const kind=progress>JUNGLE_END?'hell':progress>OCEAN_END?'jungle':progress>DESERT_END?'ocean':worldProgress>.65?'desert':'garden';
    const expected=kind==='hell'?2:kind==='jungle'?5:kind==='ocean'?3:6;const pending=counts[kind]<expected;
    loading.hidden=!pending&&!failed;
    const loadingText=failed?'部分花瓣未能加载，可重试':`${introLocked?'慢播中，准备好即可滑动 · ':''}正在准备${{garden:'花园',desert:'沙漠',ocean:'海洋',jungle:'丛林',hell:'地狱'}[kind]}花瓣 · ${counts[kind]}/${expected}`;
    if(loadingText!==lastLoadingText){loading.querySelector('span').textContent=loadingText;lastLoadingText=loadingText;}
    retry.hidden=!failed;
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
