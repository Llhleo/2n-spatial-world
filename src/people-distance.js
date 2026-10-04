import {sampleCourtyardView} from './people-courtyard.js';
const tables=new WeakMap();
const clamp=t=>Math.max(0,Math.min(1,t));
// A small positive metric through genuinely stationary entry/end moments keeps
// time invertible. Reading drift still dominates this .04 world-units/sec floor.
function table(route){
 if(tables.has(route))return tables.get(route);
 const times=[0],distances=[0],aspect=route.viewport?route.viewport.width/route.viewport.height:414/896;
 const edges=[...new Set(route.windows.flatMap(w=>[w.readStart,w.readEnd]))].sort((a,b)=>a-b);
 let previous=sampleCourtyardView(route,0,aspect).position,distance=0;
 for(let j=1;j<edges.length;j++)for(let i=1;i<=256;i++){
  const t=edges[j-1]+(edges[j]-edges[j-1])*(.5-.5*Math.cos(Math.PI*i/256)),p=sampleCourtyardView(route,t,aspect).position;
  distance+=Math.hypot(...p.map((v,k)=>v-previous[k]))+.04*(t-times.at(-1))*route.seconds;
  times.push(t);distances.push(distance);previous=p;
 }
 const result={times,distances:distances.map(d=>d/distance)};tables.set(route,result);return result;
}
function interpolate(value,from,to){
 value=clamp(value);let lo=0,hi=from.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(from[m]<=value)lo=m;else hi=m;}
 return to[lo]+(to[hi]-to[lo])*(value-from[lo])/(from[hi]-from[lo]);
}
export function peopleTimeToDistance(t,route){if(!route)return clamp(t);const {times,distances}=table(route);return interpolate(t,times,distances);}
export function peopleDistanceToTime(t,route){if(!route)return clamp(t);const {times,distances}=table(route);return interpolate(t,distances,times);}
