import * as T from 'three';
import {hellPose} from './hell-production.js';
export const HELL_EXIT=.8, RETURN_UNITS=18;
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
export const readingPoint=(x,y,z=-100)=>new T.Vector3(x,y,z).applyQuaternion(readingQuaternion).add(reading.position);
const arrangement=[[-16,24,-92],[16,22,-108],[-15,-21,-96],[17,-24,-110],[-17,4,-100],[16,2,-94],[-11,30,-104],[10,29,-98],[-13,-29,-106],[12,-30,-100],[-16,15,-102],[16,13,-106],[-17,-12,-110],[16,-12,-102],[2,32,-110]];
const origins=[[166,-30,10],[366,-30,10],[650,-36,10],[1000,-30,10],[1470,-30,10]];
const reveal=[.66,.54,.40,.26,.08];
const flowers=arrangement.map((v,i)=>{const kind=Math.floor(i/3),start=new T.Vector3(...origins[kind]).add(new T.Vector3((i%3-1)*9,0,(i%3-1)*8)),end=readingPoint(...v),lifted=start.clone();lifted.y+=45;return {kind,start,lifted,end,a:start.clone().add(new T.Vector3((i%2?1:-1)*35,85+i*2,30)),b:end.clone().add(new T.Vector3((i%2?1:-1)*40,30+i%3*12,-20))};});
export const flowerReveal=i=>reveal[flowers[i].kind];
export function flowerPose(i,t,out=new T.Vector3()){
 const f=flowers[i],r=T.MathUtils.smoothstep(t,reveal[f.kind],reveal[f.kind]+.055),u=T.MathUtils.smoothstep(t,.72+(i%3)*.009,.88),v=1-u;
 if(t<.72){out.copy(f.start);out.y+=r*45;return out;}
 return out.copy(f.lifted).multiplyScalar(v*v*v).addScaledVector(f.a,3*v*v*u).addScaledVector(f.b,3*v*u*u).addScaledVector(f.end,u*u*u);
}
