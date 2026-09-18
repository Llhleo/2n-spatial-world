import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';
import { atmosphere } from './atmosphere.js';
import { pose } from './journey.js';

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
  atmosphere(scene, matchMedia('(max-width: 700px)').matches);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 900);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const arrival = document.querySelector('#arrival');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0, previous = performance.now(), auto = 0, controlled = false;
  const takeControl = () => { controlled = true; };
  addEventListener('wheel', takeControl, {passive:true});
  addEventListener('touchstart', takeControl, {passive:true});
  addEventListener('keydown', takeControl);
  function frame(now) {
    const dt = Math.min(.05, (now-previous)/1000); previous=now;
    const scroll = scrollY / Math.max(1, document.documentElement.scrollHeight-innerHeight);
    if(!controlled) auto = Math.min(1,auto+dt/30);
    const target = reduced.matches ? 1 : controlled ? scroll : auto;
    progress += (target-progress)*(1-Math.exp(-dt*5));
    if(reduced.matches) progress=1;
    const state=pose(progress,camera,innerWidth<innerHeight);
    const text = THREE.MathUtils.smoothstep(progress,.93,.995);
    arrival.style.opacity=text;arrival.style.transform=`translateY(${(1-text)*18}px)`;
    arrival.setAttribute('aria-hidden',String(text<.5));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.camera=JSON.stringify(state.position);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {previous=performance.now();renderer.setAnimationLoop(document.hidden ? null : frame);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);});
  canvas.addEventListener('webglcontextrestored',()=>{previous=performance.now();renderer.setAnimationLoop(frame);});
}
