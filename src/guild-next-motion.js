import * as T from 'three';
import {sampleNext} from './guild-next-route.js';
// Final-shot coordinates keep the crescent responsive without flattening depth.
export function nextArcFrame(expandedPose,{aspect=.6,fov=48}={}){
 const pose=nextCamera(expandedPose,1),camera=new T.PerspectiveCamera(fov,aspect);
 camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
 return {matrix:camera.matrixWorld.clone(),halfAngle:Math.tan(T.MathUtils.degToRad(fov/2)),aspect};
}
const defaultFrame=nextArcFrame({position:[-4,7,198],target:[0,0,-14]});
export function nextPoint(anchor,expandedPoint,nextT,frame=defaultFrame){
 const {opening}=sampleNext(nextT),{u,longitude,latitude}=anchor;
 if(!opening)return [...expandedPoint];
 const angle=latitude*1.9,depth=142+48*Math.cos(longitude)+18*u;
 const half=depth*frame.halfAngle;
 const x=.22+.66*Math.cos(angle)+.025*Math.sin(longitude);
 const y=.72*Math.sin(angle)+.10*Math.cos(angle);
 // Retain each live petal's breathing residual, not a translated arc root.
 const destination=new T.Vector3(x*half*frame.aspect,y*half+expandedPoint[1]-latitude*90.3,-depth).applyMatrix4(frame.matrix).toArray();
 return expandedPoint.map((v,i)=>v+(destination[i]-v)*opening);
}
export function nextCamera(expandedPose,nextT){
 const {opening}=sampleNext(nextT);
 return {position:expandedPose.position.map((v,i)=>v+[2,-3,-58][i]*opening),target:expandedPose.target.map((v,i)=>v+[0,0,-36][i]*opening)};
}
