import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const models={ladybug:[65152,15205],bee:[63332,8813],hornet:[45512,5896],worker:[33784,6478],queen:[44228,8919],baby:[24260,4264],anthole:[14088,416],hornetmissile:[9596,884]};
const stage=document.querySelector('#stage'),status=document.querySelector('#status');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,100),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
stage.append(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=.65;
scene.add(new THREE.HemisphereLight(0xd9f3ff,0x655244,2));let key=new THREE.DirectionalLight(0xffedd8,2.4);key.position.set(4,7,5);scene.add(key);let fill=new THREE.DirectionalLight(0x9db9ff,1.2);fill.position.set(-5,3,-4);scene.add(fill);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let current=null,serial=0;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(stage);resize();
async function choose(name){const id=++serial;document.querySelector('#title').textContent=name;document.querySelector('#meta').textContent=`${(models[name][0]/1024).toFixed(1)} KB · ${models[name][1].toLocaleString()} 三角面 · GLB · meh-a · CC BY-NC 4.0（仓库声明）`;
document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.name===name));status.textContent='载入模型中…';
try{const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);if(id!==serial)return;if(current)scene.remove(current);current=gltf.scene;scene.add(current);const box=new THREE.Box3().setFromObject(current),center=box.getCenter(new THREE.Vector3()),radius=Math.max(...box.getSize(new THREE.Vector3()).toArray());current.position.sub(center);controls.target.set(0,0,0);camera.position.set(radius*1.25,radius*.8,radius*1.55);camera.near=Math.max(.001,radius/1000);camera.far=radius*100;camera.updateProjectionMatrix();controls.update();status.textContent=`可拖动查看。${gltf.animations.length?'含动画':'模型无内置动画'}。`}
catch(e){status.textContent=`模型加载失败：${e.message}`}}
for(const name of Object.keys(models)){const b=document.createElement('button');b.dataset.name=name;b.textContent=name;b.onclick=()=>choose(name);document.querySelector('#buttons').append(b)}
for(const [id,names] of [['petals','basic bubble corn glass leaf light missile orange rice rock rose stinger wing'],['tiles','deserttile dirttile grasstile jungletile']])for(const name of names.split(' ')){const el=document.createElement('div');el.className='tile';el.innerHTML=`<img loading="lazy" src="${import.meta.env.BASE_URL}${id}/${name}.svg" alt="${name}"><br><span>${name}</span>`;document.querySelector('#'+id).append(el)}
function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera)}frame();choose('ladybug');
