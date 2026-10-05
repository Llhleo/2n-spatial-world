import * as T from 'three';
export const HISTORY_SECONDS=31,HISTORY_UNITS=5.2;
const clamp=t=>Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
const smooth=t=>{const u=clamp(t);return u*u*u*(10+u*(-15+6*u));};
const times=[0,3,11,13,21,23,31],distances=[0,.6,1.9,2.25,3.55,3.9,5.2];
export function createHistoryRoute(events,entryPose){
 if(events.length!==3||!['position','target','up'].every(key=>entryPose[key]?.length===3&&entryPose[key].every(Number.isFinite)))throw new Error('历史路线缺少有效入口。');
 return {events,entryPose,seconds:HISTORY_SECONDS,distance:HISTORY_UNITS,segments:times};
}
function map(t,from,to){const v=clamp(t)*from.at(-1);let i=0;while(i<from.length-2&&v>from[i+1])i++;return (to[i]+(to[i+1]-to[i])*(v-from[i])/(from[i+1]-from[i]))/to.at(-1);}
export const historyTimeToDistance=(t,route)=>map(t,times,distances);
export const historyDistanceToTime=(t,route)=>map(t,distances,times);
export function sampleHistory(route,t,aspect){
 const seconds=clamp(t)*31,entry=route.entryPose;
 let eventIndex=seconds<13?0:seconds<23?1:2;
 const start=[3,13,23][eventIndex],end=[11,21,31][eventIndex];
 const opacity=seconds<start?0:seconds<start+1?smooth(seconds-start):eventIndex<2&&seconds>end-1?1-smooth(seconds-(end-1)):1;
 // Keep the verified terrain shot. A slow 3% dolly supplies continuous motion
 // without a speculative lateral path leaving the finite terrain footprint.
 const dolly=1+.03*smooth(seconds/31);
 return {position:entry.position.map((v,i)=>entry.target[i]+(v-entry.target[i])*dolly),target:[...entry.target],up:[...entry.up],eventIndex,eventId:route.events[eventIndex].id,eventOpacity:opacity,peopleOpacity:1-smooth(seconds/3),reading:opacity===1,historyT:clamp(t),replayVisible:seconds>=24};
}
