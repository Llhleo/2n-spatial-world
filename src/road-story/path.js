import * as T from 'three';
import {memoryEntryFrame} from '../guild-memory-entry.js';
import {motionPath} from '../motion-path.js';
import {cameraJourney,offsets} from './journey.js';
export const ROAD_STOPS=[0,5.5,11.5,14.3,20.3,23.1,30.6,36];
export const ROAD_READING_STOPS=[9.3,18.1,28.6];
export const smooth=v=>{const u=T.MathUtils.clamp(v,0,1);return T.MathUtils.clamp(u*u*u*(10+u*(-15+6*u)),0,1);};
const V=a=>new T.Vector3(...a);
const basePositions=[[0,0,170],[-3,0,174],[0,5,208]],baseTargets=[[0,0,-12],[1,0,-20],[0,6,-8]];
export const ROAD_ENDING_OFFSET=[-620,80,-1650];
const exitPath=new T.CatmullRomCurve3([[0,5,-832],[-100,40,-900],[-530,100,-1235],[-624,87,-1452]].map(V),false,'centripetal');
export function roadJourneyTime(seconds){
 const a=[5.5,11.5,14.3,20.3,23.1,30.6],b=[0,24,30,54,60,84];
 if(seconds<=a[0])return 0;if(seconds>=a.at(-1))return 84;
 let i=0;while(seconds>a[i+1])i++;
 return T.MathUtils.lerp(b[i],b[i+1],(seconds-a[i])/(a[i+1]-a[i]));
}
function localCamera(i,time){
 const p=V(basePositions[i]),weight=Math.sin(Math.PI*time/24)**2;
 p.add(new T.Vector3(weight*1.2,weight*.4,-weight*1.5));
 const m=new T.Matrix4().lookAt(p,V(baseTargets[i]),new T.Vector3(0,1,0));m.setPosition(p);return m.toArray();
}
export function roadEndingEntry(entry){
 const delta=V(ROAD_ENDING_OFFSET).applyQuaternion(new T.Quaternion().setFromRotationMatrix(memoryEntryFrame(entry)));
 return {...entry,position:V(entry.position).add(delta).toArray(),target:V(entry.target).add(delta).toArray()};
}
export function sampleRoadCamera(seconds,entry){
 const frame=memoryEntryFrame(entry),camera=new T.PerspectiveCamera(40,1,.2,2400);
 let matrix=cameraJourney(roadJourneyTime(seconds),localCamera).premultiply(frame),fov=40;
 camera.position.setFromMatrixPosition(matrix);camera.quaternion.setFromRotationMatrix(matrix);camera.up.set(0,1,0);camera.updateMatrixWorld();
 if(seconds<5.5){
  const start=V(entry.position),focus=V(entry.target),end=camera.position.clone(),target=camera.getWorldDirection(new T.Vector3()).multiplyScalar(182).add(end);
  const u=T.MathUtils.clamp(seconds/5.5,0,1);
  const shots=[{t:0,p:start.toArray(),target:focus.toArray()},{t:.35,p:start.clone().add(new T.Vector3(105,16,-35)).toArray(),target:focus.clone().add(new T.Vector3(130,-12,-28)).toArray()},{t:.72,p:end.clone().add(new T.Vector3(-65,-42,-18)).toArray(),target:target.clone().add(new T.Vector3(-75,-28,-12)).toArray()},{t:1,p:end.toArray(),target:target.toArray()}];
  camera.up.fromArray(entry.up||[0,1,0]).lerp(new T.Vector3(0,1,0),smooth(u)).normalize();
  motionPath(shots,{p:[0,0,0],target:[0,0,0]},{p:[0,0,0],target:[0,0,0]})(u,camera);
  fov=T.MathUtils.lerp(48,40,smooth(u));
 }else if(seconds>30.6){
  const endingFrame=memoryEntryFrame(roadEndingEntry(entry)),target=V([0,0,-14]).applyMatrix4(endingFrame),u=smooth((seconds-30.6)/5.4);
  const focus=V([0,6,-1048]).applyMatrix4(frame);
  camera.position.copy(exitPath.getPointAt(u).applyMatrix4(frame));camera.lookAt(focus.lerp(target,u));fov=T.MathUtils.lerp(40,48,u);
 }
 return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov};
}
const tracks=[0,1,2].map(i=>new T.CatmullRomCurve3([
 [-30,-48,48],[10,-16,28],[40,22,-45],[16,68,-126],[-25,42,-185],[-54,-6,-138],[-12,-55,-62],[34,-48,12]
].map(p=>V(p).add(new T.Vector3(i===0?10:i===1?22:-10,i===2?15:0,i===0?0:-8))),true,'centripetal'));
export function lightTrackPoint(scene,u){return tracks[scene].getPointAt(((u%1)+1)%1).add(V(offsets[scene]));}
export function lightStage(seconds){const t=roadJourneyTime(seconds);return t<=24?0:t<30?smooth((t-24)/6):t<=54?1:t<60?1+smooth((t-54)/6):2;}
