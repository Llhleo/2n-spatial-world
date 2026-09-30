import {oceanPose} from './ocean-production.js';
import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import { pose } from './journey.js';
import {stableViewport,scrollProgress} from './viewport.js';
import {createRevealLight} from './reveal-light.js';
import {gardenPose} from './garden-path.js';
import {createBiomes,prepareBiomePetals} from './biomes.js';

const HERO_END=6/20, DESERT_END=14/20;

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
  retry.addEventListener('click',()=>prepareBiomePetals(world));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lastLoadingText='';
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    if(old&&controlled)scrollTo({top:retained*next.range,behavior:'instant'});
  },20);
  const takeControl = () => {
    if (!controlled) {
      // Hand off at the current shot, never jump back to the start on first touch.
      scrollTo({top:progress*viewport().range,behavior:'instant'});
      controlled = true;
    }
  };
  addEventListener('wheel', takeControl, {passive:true});
  addEventListener('touchstart', takeControl, {passive:true});
  addEventListener('keydown', takeControl);
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const view=viewport();
    const scroll = scrollProgress(scrollY,view.range);
    if(!controlled) auto = Math.min(HERO_END,auto+dt*HERO_END/30);
    const requested = reduced.matches ? 1 : controlled ? scroll : auto;
    const target=requested;
    progress += (target-progress)*(1-Math.exp(-dt*5));
    if(reduced.matches) progress=1;
    const heroProgress=Math.min(1,progress/HERO_END);
    const worldProgress=THREE.MathUtils.clamp((progress-HERO_END)/(DESERT_END-HERO_END),0,1);
    const state=progress<=HERO_END ? pose(heroProgress,camera,view.width<view.height) : progress<=DESERT_END?gardenPose(worldProgress,camera,view.width<view.height):oceanPose((progress-DESERT_END)/(1-DESERT_END),camera);
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025*DESERT_END,HERO_END+.09*DESERT_END));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=progress>DESERT_END?'ocean':worldProgress<.76?'garden':'desert-threshold';
    canvas.dataset.gardenAssets=world.gardenStatus;
    canvas.dataset.oceanPetals=world.oceanPetalStatus;
    canvas.dataset.desertPetals=world.desertPetalStatus;
    const counts=world.loading.counts,failed=Object.values(world.loading.failures).some(list=>list.length);
    const kind=progress>DESERT_END?'ocean':worldProgress>.65?'desert':'garden';
    const expected=kind==='ocean'?3:6;const pending=counts[kind]<expected;
    loading.hidden=!pending&&!failed;
    const loadingText=failed?'部分花瓣未能加载，可重试':`正在准备${{garden:'花园',desert:'沙漠',ocean:'海洋'}[kind]}花瓣 · ${counts[kind]}/${expected}`;
    if(loadingText!==lastLoadingText){loading.querySelector('span').textContent=loadingText;lastLoadingText=loadingText;}
    retry.hidden=!failed;
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
