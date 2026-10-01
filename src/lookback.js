import * as T from 'three';
import {hellPose} from './hell-production.js';
export const HELL_EXIT=.8, RETURN_UNITS=22;
export const RETURN_START=(24+4*HELL_EXIT)/28;
export const STORY_UNITS=24+4*HELL_EXIT+RETURN_UNITS;
const entry=hellPose(HELL_EXIT,new T.PerspectiveCamera());
const near=hellPose(HELL_EXIT-1e-6,new T.PerspectiveCamera());
const shots=[
 {t:0,p:entry.position,target:entry.target},
 {t:.045,p:[1510,35,68],target:[1535,-35,5]},
 {t:.10,p:[1485,80,108],target:[1470,-35,10]},
 {t:.15,p:[1370,138,110],target:[1400,-35,0]},
 {t:.26,p:[990,125,112],target:[1000,-35,10]},
 {t:.30,p:[970,125,112],target:[1000,-35,10]},
 {t:.40,p:[650,112,108],target:[650,-41,10]},
 {t:.44,p:[630,112,108],target:[650,-41,10]},
 {t:.54,p:[365,94,94],target:[366,-35,10]},
 {t:.58,p:[345,94,94],target:[366,-35,10]},
 {t:.66,p:[165,94,94],target:[166,-35,10]},
 {t:.70,p:[145,94,94],target:[166,-35,10]},
 {t:.76,p:[245,142,165],target:[355,-35,15]},
 {t:.88,p:[305,138,140],target:[450,60,20]},
 {t:1,p:[305,138,140],target:[450,60,20]},
];
const tracks={};
for(const [key,source] of [['p','position'],['target','target']]){
 const points=shots.map(s=>new T.Vector3(...s[key]));
 const tangents=shots.map((s,i)=>i===0?new T.Vector3(...entry[source].map((v,j)=>(v-near[source][j])/1e-6*RETURN_UNITS/4)):i>=shots.length-2?new T.Vector3():points[Math.min(i+1,points.length-1)].clone().sub(points[i-1]).divideScalar(shots[i+1].t-shots[i-1].t));
 tracks[key]={points,tangents};
}
function sample(t,key,out){
 let i=0;while(i<shots.length-2&&t>shots[i+1].t)i++;
 const h=shots[i+1].t-shots[i].t,u=(t-shots[i].t)/h,s=u*u,q=s*u,{points:p,tangents:m}=tracks[key];
 return out.set(0,0,0).addScaledVector(p[i],2*q-3*s+1).addScaledVector(m[i],(q-2*s+u)*h).addScaledVector(p[i+1],-2*q+3*s).addScaledVector(m[i+1],(q-s)*h);
}
const focus=new T.Vector3();
export function lookbackPose(t,camera){t=T.MathUtils.clamp(t,0,1);sample(t,'p',camera.position);sample(t,'target',focus);camera.lookAt(focus);return {position:camera.position.toArray(),target:focus.toArray()};}
const reading=new T.PerspectiveCamera();lookbackPose(1,reading);reading.updateMatrixWorld();
export const readingQuaternion=reading.quaternion.clone();
export const readingPoint=(x,y,z=-100,out=new T.Vector3())=>out.set(x,y,z).applyQuaternion(readingQuaternion).add(reading.position);
export const FLOWER_SPECS=[
 ['garden','rose',.653,4.3],['garden','clover',.663,4.2],['garden','goldenleaf',.673,3.8],
 ['desert','cactus',.533,4.2],['desert','sand',.543,4.3],['desert','iris',.553,2.9],
 ['ocean','pearl',.393,3.5],['ocean','shell',.403,4.4],['ocean','starfish',.413,4.5],
 ['jungle','peas',.253,4.6],['jungle','tomato',.263,4.0],['jungle','compass',.273,4.0],
 ['hell','darkmark',.08,4.2],['hell','corruption',.094,4.2],
];
const arrangement=[[-15,24,-94],[15,22,-110],[-15,-20,-98],[17,-23,-112],[-17,3,-104],[15,1,-94],[-11,30,-108],[10,29,-102],[-13,-28,-110],[12,-29,-104],[-16,14,-106],[16,12,-110],[-17,-12,-114],[16,-12,-106]];
const origins=[[166,-30,10],[366,-30,10],[650,-36,10],[1000,-30,10],[1470,-30,10]];
const escortCamera=new T.PerspectiveCamera(),offset=new T.Vector3();let sampledTime=NaN;
function escort(i,t,out){
 if(t!==sampledTime){lookbackPose(t,escortCamera);sampledTime=t;}
 offset.set((i%2?1:-1)*(10+(i%3)*1.4),6+(i%4)*3,-(72+(i%3)*10));
 return out.copy(offset).applyQuaternion(escortCamera.quaternion).add(escortCamera.position);
}
export function flowerHeading(t,out){if(t!==sampledTime){lookbackPose(t,escortCamera);sampledTime=t;}return out.copy(escortCamera.quaternion);}
const flowers=arrangement.map((v,i)=>({start:new T.Vector3(...origins[Math.floor(i/3)]),end:readingPoint(...v),angle:i*Math.PI*2/14,depth:-84-(i%3)*12}));
const gatheringTarget=new T.Vector3();
export const flowerReveal=i=>FLOWER_SPECS[i][2];
export function flowerPose(i,t,out=new T.Vector3(),origin=flowers[i].start){
 const f=flowers[i],phase=flowerReveal(i);
 if(t<.76){
  const lift=T.MathUtils.smoothstep(t,phase,phase+.035),join=T.MathUtils.smoothstep(t,phase+.035,phase+.08);
  escort(i,t,out).multiplyScalar(join);out.addScaledVector(origin,1-join);out.y+=18*lift*(1-join);return out;
 }
 if(t<.8){const u=T.MathUtils.smoothstep(t,.76,.8);readingPoint(Math.cos(f.angle)*9,Math.sin(f.angle)*12,f.depth,gatheringTarget);return escort(i,t,out).lerp(gatheringTarget,u);}
 const u=T.MathUtils.smoothstep(t,.8,.85),angle=f.angle+(i%2?1:-1)*u*1.1;
 return readingPoint(Math.cos(angle)*(9+u*3),Math.sin(angle)*(12+u*3),f.depth+Math.sin(u*Math.PI)*(i%2?8:-8),out).lerp(f.end,T.MathUtils.smoothstep(t,.85,.9));
}
