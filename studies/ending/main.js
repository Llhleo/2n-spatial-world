import * as T from 'three';
import {createMemoryScene} from '../../src/guild-memory-scene.js';
import {createNextView} from '../../src/guild-next-view.js';
import {sampleNext} from '../../src/guild-next-route.js';
import {loadPetal} from '../../src/petal-loader.js';
import {FLOWER_SPECS} from '../../src/lookback.js';
const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x060709);renderer.setPixelRatio(devicePixelRatio);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.2,2400),memory=createMemoryScene({mobile:innerWidth<700}),text=createNextView();scene.add(memory.group,text.group);
const slider=document.querySelector('#progress'),play=document.querySelector('#play'),status=document.querySelector('#status');let progress=0,playing=true,ready=false;
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();text.resize({width:innerWidth,height:innerHeight});if(ready)text.prepare().catch(e=>status.textContent=e.message);}
resize();addEventListener('resize',resize);
play.onclick=()=>{playing=!playing;play.textContent=playing?'暂停':'播放';};slider.oninput=()=>{progress=Number(slider.value);playing=false;play.textContent='播放';};document.querySelector('#replay').onclick=()=>{progress=0;playing=true;play.textContent='暂停';};
const clock=new T.Clock();renderer.setAnimationLoop(()=>{
 const dt=Math.min(clock.getDelta(),.05);if(!ready)return;
 if(playing){progress=Math.min(1,progress+dt/20);slider.value=progress;if(progress===1){playing=false;play.textContent='播放';}}
 memory.update({memoryPhase:2,eventIndex:2,...sampleNext(progress)},camera,dt);memory.setTerrainVisible(false);
 text.update({...sampleNext(progress),target:memory.shot.target},camera,{width:innerWidth,height:innerHeight});memory.updateTextOcclusion(camera,text.readingBounds,2);renderer.render(scene,camera);
});
Promise.all([text.prepare(),...FLOWER_SPECS.map(async([kind,name])=>{const source=await loadPetal(`/assets/companion-display/${name}.glb`,100);memory.install(source,kind,name);})]).then(()=>{memory.prepare();ready=true;status.textContent='结尾实验 · 262,144 粒子';}).catch(e=>{status.textContent=`准备失败：${e.message}`;});
