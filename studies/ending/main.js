import * as T from 'three';
import {createMemoryScene} from '../../src/guild-memory-scene.js';
import {createNextView} from '../../src/guild-next-view.js';
import {PARTICLE_ENDING_SECONDS,sampleNext} from '../../src/guild-next-route.js';
import {loadPetal} from '../../src/petal-loader.js';
import {FLOWER_SPECS} from '../../src/lookback.js';
const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x060709);renderer.setPixelRatio(devicePixelRatio);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.2,2400),text=createNextView();
let memory;
try{memory=createMemoryScene({mobile:innerWidth<700,renderer});}catch(error){document.querySelector('#status').textContent=`流体初始化失败：${error.message}`;throw error;}
scene.add(memory.group,text.group);
const slider=document.querySelector('#progress'),play=document.querySelector('#play'),status=document.querySelector('#status');let progress=0,playing=true,ready=false;
const scrollMode=new URLSearchParams(location.search).get('scroll')==='1',mode=document.querySelector('#mode');
document.body.classList.toggle('scroll-mode',scrollMode);
if(scrollMode){playing=false;play.hidden=true;mode.href='./';mode.textContent='自动';}
const range=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();text.resize({width:innerWidth,height:innerHeight});if(ready)text.prepare().catch(e=>status.textContent=e.message);}
resize();addEventListener('resize',resize);
play.onclick=()=>{playing=!playing;play.textContent=playing?'暂停':'播放';};slider.oninput=()=>{progress=Number(slider.value);if(scrollMode)scrollTo({top:progress*range(),behavior:'instant'});playing=false;play.textContent='播放';};document.querySelector('#replay').onclick=()=>{progress=0;if(scrollMode)scrollTo({top:0,behavior:'instant'});playing=!scrollMode;play.textContent='暂停';};
const clock=new T.Clock();renderer.setAnimationLoop(()=>{
 const dt=Math.min(clock.getDelta(),.05);if(!ready)return;
 if(scrollMode){progress=Math.max(0,Math.min(1,scrollY/range()));slider.value=progress;}
 else if(playing){progress=Math.min(1,progress+dt/PARTICLE_ENDING_SECONDS);slider.value=progress;if(progress===1){playing=false;play.textContent='播放';}}
 const state=sampleNext(progress,{particleEnding:true});
 memory.update({memoryPhase:2,eventIndex:2,...state,reducedMotion:reducedMotion.matches},camera,dt);memory.setTerrainVisible(false);
 text.update({...state,target:memory.shot.target},camera,{width:innerWidth,height:innerHeight});memory.updateTextOcclusion(camera,text.readingBounds,2);renderer.render(scene,camera);
});
Promise.all([text.prepare(),...FLOWER_SPECS.map(async([kind,name])=>{const source=await loadPetal(`/assets/companion-display/${name}.glb`,100);memory.install(source,kind,name);})]).then(()=>{memory.prepare();const swarm=memory.group.getObjectByName('ending-shape-swarm'),frames=memory.group.getObjectByName('ending-dimension-frames');if(!swarm?.material.uniforms.uFluidEnabled.value||!frames)throw new Error('GPU流体未完整接入');ready=true;status.textContent=scrollMode?'下滑播放 · 上滑倒放 · 262,144 粒子':'五色星流 → 穿门 → 翻涌凝形 → 2ⁿ 环绕 · 262,144 粒子';}).catch(e=>{status.textContent=`准备失败：${e.message}`;});
