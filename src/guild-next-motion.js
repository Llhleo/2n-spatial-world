import {sampleNext} from './guild-next-route.js';
export function nextPoint(anchor,expandedPoint,nextT){
 const {opening}=sampleNext(nextT),{u,longitude,latitude}=anchor;
 const side=Math.cos(longitude)>=0?1:-1;
 // Keep individual breathing from the live shell instead of moving its root.
 const destination=[side*(35+u*40),latitude*58+expandedPoint[1]-latitude*90.3,-40-u*180];
 return expandedPoint.map((v,i)=>v+(destination[i]-v)*opening);
}
export function nextCamera(expandedPose,nextT){
 const {opening}=sampleNext(nextT);
 return {position:expandedPose.position.map((v,i)=>v+[2,-3,-58][i]*opening),target:expandedPose.target.map((v,i)=>v+[0,0,-36][i]*opening)};
}
