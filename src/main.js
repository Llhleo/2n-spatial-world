import * as THREE from 'three';
import './style.css';
import { createMonument, createLighting } from './monument.js';

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
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 900);
  camera.position.set(0, 5, 145); camera.lookAt(5, 5, 0);
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  function frame() { renderer.render(scene, camera); }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : frame));
}
