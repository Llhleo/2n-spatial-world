import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import { pose } from './journey.js';
import {stableViewport,scrollProgress} from './viewport.js';
import {createRevealLight} from './reveal-light.js';
import {gardenPose} from './garden-path.js';
import {createBiomes} from './biomes.js';

const HERO_END=6/14;

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
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 900);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  const arrival = document.querySelector('#arrival');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  const viewport=stableViewport((next,old)=>{
    const retained=old?scrollProgress(scrollY,old.range):0;
    renderer.setSize(next.width,next.height);
    camera.aspect=next.width/next.height;camera.updateProjectionMatrix();
    if(old&&controlled)scrollTo({top:retained*next.range,behavior:'instant'});
  },14);
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
    const target = reduced.matches ? 1 : controlled ? scroll : auto;
    progress += (target-progress)*(1-Math.exp(-dt*5));
    if(reduced.matches) progress=1;
    const heroProgress=Math.min(1,progress/HERO_END);
    const worldProgress=THREE.MathUtils.clamp((progress-HERO_END)/(1-HERO_END),0,1);
    const state=progress<=HERO_END ? pose(heroProgress,camera,view.width<view.height) : gardenPose(worldProgress,camera,view.width<view.height);
    atmosphereRig.update(camera,heroProgress);
    if(heroProgress>.72)world.prepare();
    world.update(camera,worldProgress);
    const text = THREE.MathUtils.smoothstep(heroProgress,.93,.995)*(1-THREE.MathUtils.smoothstep(progress,HERO_END+.025,HERO_END+.09));
    arrival.style.opacity=text;arrival.style.transform=`translateY(calc(-100% + ${(1-text)*18}px))`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    canvas.dataset.biome=worldProgress<.76?'garden':'desert-threshold';
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
