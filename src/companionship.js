import * as T from 'three';
import {hellPose} from './hell-production.js';
import {worldHeight} from './world-surface.js';

// Twelve additional viewport units follow the existing four-unit Hell shot.
// Explicit Hermite tangents inherit Hell's velocity and stop at the reading shot.
export const COMPANION_UNITS=12;
const reference=new T.PerspectiveCamera();
const end=hellPose(1,reference),near=hellPose(1-.00001,reference);
export const companionShots=[
 {t:0,p:end.position,target:end.target},
 {t:.16,p:[1640,50,40],target:[1685,-28,-5]},
 {t:.40,p:[1665,186,182],target:[1460,-28,0]},
 {t:.66,p:[1520,300,355],target:[1150,-35,0]},
 {t:.84,p:[1390,310,415],target:[1015,106,70]},
 {t:.92,p:[1390,310,415],target:[1015,106,70]},
 {t:1,p:[1390,310,415],target:[1015,106,70]}
];
const keys=[['p','position'],['target','target']];
const tracks=keys.map(([key,state])=>{
 const points=companionShots.map(s=>new T.Vector3(...s[key]));
 const tangents=points.map((p,i)=>{
  if(i===0)return new T.Vector3(...end[state]).sub(new T.Vector3(...near[state])).multiplyScalar(3/.00001);
  if(i>=4)return new T.Vector3();
  return points[i+1].clone().sub(points[i-1]).divideScalar(companionShots[i+1].t-companionShots[i-1].t);
 });
 return {points,tangents};
});
const focus=new T.Vector3();
function sample(track,i,u,out){
 const s=u*u,q=s*u,h=companionShots[i+1].t-companionShots[i].t;
 return out.copy(track.points[i]).multiplyScalar(2*q-3*s+1)
 .addScaledVector(track.tangents[i],(q-2*s+u)*h)
 .addScaledVector(track.points[i+1],-2*q+3*s)
 .addScaledVector(track.tangents[i+1],(q-s)*h);
}
export function companionPose(t,camera){
 const v=T.MathUtils.clamp(t,0,1);let i=0;
 while(i<companionShots.length-2&&v>companionShots[i+1].t)i++;
 const u=(v-companionShots[i].t)/(companionShots[i+1].t-companionShots[i].t);
 sample(tracks[0],i,u,camera.position);sample(tracks[1],i,u,focus);camera.lookAt(focus);
 return {position:camera.position.toArray(),target:focus.toArray()};
}

export const COMPANION_PETALS=[
 {biome:'garden',name:'clover',x:165,z:38,pitch:.56},
 {biome:'desert',name:'cactus',x:382,z:-35,pitch:-.70},
 {biome:'ocean',name:'shell',x:680,z:42,pitch:-.62},
 {biome:'jungle',name:'compass',x:1030,z:-35,pitch:-.65},
 {biome:'hell',name:'darkmark',x:1470,z:42,pitch:-.65}
];
const readingCamera=new T.PerspectiveCamera(48,1,.2,2400);
companionPose(1,readingCamera);
const center=readingCamera.position.clone().addScaledVector(readingCamera.getWorldDirection(new T.Vector3()),150);
const orientation=readingCamera.quaternion.clone();
const ease=t=>{const v=T.MathUtils.clamp(t,0,1);return v*v*v*(v*(v*6-15)+10);};
// Pure scroll sampling: no elapsed-time simulation, spring state or accumulated rotation.
export function companionPoint(species,slot,t,mobile=true,out=new T.Vector3()){
 const petal=COMPANION_PETALS[species],count=mobile?3:4;
 const index=species*count+slot,total=5*count;
 // Leave an opening below the ellipse and a generous central reading window.
 const angle=.18*Math.PI+index/(total-1)*1.64*Math.PI;
 const destination=new T.Vector3(26*Math.cos(angle),43*Math.sin(angle),Math.sin(index*2.1)*7)
 .applyQuaternion(orientation).add(center);
 const origin=new T.Vector3(petal.x+slot*6,worldHeight(petal.x+slot*6,petal.z)+5,petal.z+slot*5);
 const a=origin.clone().add(new T.Vector3(20+species*12,100+slot*20,50+species*10));
 const b=destination.clone().add(new T.Vector3(80-species*16,60+slot*8,-90));
 const u=ease((t-.34-species*.013-slot*.009)/.47),v=1-u;
 return out.copy(origin).multiplyScalar(v*v*v).addScaledVector(a,3*v*v*u)
 .addScaledVector(b,3*v*u*u).addScaledVector(destination,u*u*u);
}
function textTexture(text,caption=false){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=caption?320:256;
 const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#faf5e9';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=7;
 ctx.font=caption?'400 58px system-ui, "PingFang SC", sans-serif':'500 144px "Songti SC", "Noto Serif CJK SC", serif';
 if(caption){ctx.fillText('走过五境，',512,95);ctx.fillText('同行的人始终在这里。',512,200);}
 else ctx.fillText(text,512,128);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function createCompanionship(mobile=true,textureFactory=textTexture){
 const group=new T.Group();group.name='companionship';group.visible=false;
 const labels=new T.Group();labels.position.copy(center);labels.quaternion.copy(orientation);group.add(labels);
 for(const [text,caption,y,width] of [['同行的力量',false,5,43],['走过五境，同行的人始终在这里。',true,-11,43]]){
  const texture=textureFactory(text,caption);
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:false,opacity:0});
  const label=new T.Mesh(new T.PlaneGeometry(width,width*(caption?320:256)/1024),material);
  label.name=caption?'companion-caption':'companion-title';label.position.y=y;label.userData.warmup=true;labels.add(label);
 }
 const batches=new Map(),dummy=new T.Object3D(),position=new T.Vector3(),pivot=new T.Vector3();
 const lookbackColor=new T.Color(0x18202b);
 let lastT=-1;
 function install(biome,name,asset){
  const species=COMPANION_PETALS.findIndex(p=>p.biome===biome&&p.name===name);
  if(species<0||batches.has(species))return;
  asset.geometry.computeBoundingBox();
  const box=asset.geometry.boundingBox,size=box.getSize(new T.Vector3());
  const scale=4.6/Math.max(size.x,size.y,size.z),count=mobile?3:4;
  const batch=new T.InstancedMesh(asset.geometry,asset.material.clone(),count);
  batch.name='companion-'+name;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
  // Fifteen mobile instances only; avoid per-frame bound rebuilding.
  batch.frustumCulled=false;
  const points=Array.from({length:count},(_,slot)=>{
   const origin=companionPoint(species,slot,0,mobile);
   const destination=companionPoint(species,slot,1,mobile);
   return {origin,destination,a:origin.clone().add(new T.Vector3(20+species*12,100+slot*20,50+species*10)),
    b:destination.clone().add(new T.Vector3(80-species*16,60+slot*8,-90))};
  });
  batches.set(species,{batch,scale,pivot:box.getCenter(new T.Vector3()),points});group.add(batch);lastT=-1;
  writeMatrices(0);
 }
 function writeMatrices(t){
  for(const [species,entry] of batches){
   for(let slot=0;slot<entry.points.length;slot++){
    const {origin,destination,a,b}=entry.points[slot];
    const u=ease((t-.34-species*.013-slot*.009)/.47),v=1-u;
    position.copy(origin).multiplyScalar(v*v*v).addScaledVector(a,3*v*v*u)
    .addScaledVector(b,3*v*u*u).addScaledVector(destination,u*u*u);
    const rotation=ease((t-.40)/.42);
    dummy.rotation.set(COMPANION_PETALS[species].pitch,-Math.PI/2,(slot-1)*.33,'YXZ');
    dummy.quaternion.slerp(orientation,rotation*.58);
    dummy.scale.setScalar(entry.scale*(.88+slot*.08));
    pivot.copy(entry.pivot).applyQuaternion(dummy.quaternion).multiplyScalar(dummy.scale.x);
    dummy.position.copy(position).sub(pivot);dummy.updateMatrix();entry.batch.setMatrixAt(slot,dummy.matrix);
   }
   entry.batch.instanceMatrix.needsUpdate=true;
  }
 }
 return {group,install,get ready(){return batches.size===5;},get instanceCount(){return [...batches.values()].reduce((n,b)=>n+b.batch.count,0);},
  prepareTextures(renderer){for(const label of labels.children)renderer.initTexture(label.material.map);},
  update(t,scene){
   const v=T.MathUtils.clamp(t,0,1);group.visible=t>0;
   if(!group.visible)return;
   if(Math.abs(v-lastT)>1e-7){writeMatrices(v);lastT=v;}
   const opacity=T.MathUtils.smoothstep(v,.845,.90);
   for(const label of labels.children)label.material.opacity=opacity;
   if(scene?.fog){const blend=T.MathUtils.smoothstep(v,.14,.67);scene.fog.density=T.MathUtils.lerp(scene.fog.density,.00055,blend);scene.fog.color.lerp(lookbackColor,blend);}
  }};
}
