import {sampleCourtyardView} from './people-courtyard.js';
const tables=new WeakMap();
const clamp=t=>Math.max(0,Math.min(1,t));
// A small positive metric through genuinely stationary entry/end moments keeps
// time invertible. Reading drift still dominates this .04 world-units/sec floor.
const pending=new WeakMap();
function builder(route){
 const times=[0],distances=[0],aspect=route.viewport?route.viewport.width/route.viewport.height:414/896;
 const edges=[...new Set(route.windows.flatMap(w=>[w.readStart,w.readEnd]))].sort((a,b)=>a-b);
 let previous=sampleCourtyardView(route,0,aspect).position,distance=0,j=1,i=1;
 return {step(){
  if(j>=edges.length)return false;
  const t=edges[j-1]+(edges[j]-edges[j-1])*(.5-.5*Math.cos(Math.PI*i/256)),p=sampleCourtyardView(route,t,aspect).position;
  distance+=Math.hypot(...p.map((v,k)=>v-previous[k]))+.04*(t-times.at(-1))*route.seconds;
  times.push(t);distances.push(distance);previous=p;
  if(++i>256){i=1;j++;}return j<edges.length;
 },finish(){const result={times,distances:distances.map(d=>d/distance)};tables.set(route,result);return result;}};
}
const idleScheduler={
 schedule(fn){return typeof requestIdleCallback==='function'?requestIdleCallback(fn):setTimeout(()=>fn({timeRemaining:()=>2}),16);},
 cancel(id){if(typeof cancelIdleCallback==='function')cancelIdleCallback(id);else clearTimeout(id);}
};
// Each slice samples at most 64 points, checking a 2ms budget between samples. No timeout
// forces work into a busy animation frame. First use can finish this same builder.
export function preparePeopleDistance(route,scheduler=idleScheduler){
 if(!route||tables.has(route))return ()=>{};
 if(pending.has(route))return pending.get(route).cancel;
 const job={build:null,id:null,cancel(){if(pending.get(route)!==job)return;scheduler.cancel(job.id);pending.delete(route);}};
 pending.set(route,job);
 function run(deadline){
  if(pending.get(route)!==job)return;
  const start=performance.now();let more=true;
  for(let n=0;n<64&&deadline.timeRemaining()>0&&performance.now()-start<2;n++){
   job.build??=builder(route);more=job.build.step();if(!more)break;
  }
  if(!more){job.build.finish();pending.delete(route);}
  else job.id=scheduler.schedule(run);
 }
 job.id=scheduler.schedule(run);return job.cancel;
}
function table(route){
 if(tables.has(route))return tables.get(route);
 const job=pending.get(route),build=job?.build??builder(route);
 if(job)job.cancel();
 while(build.step()){}return build.finish();
}
function interpolate(value,from,to){
 value=clamp(value);let lo=0,hi=from.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(from[m]<=value)lo=m;else hi=m;}
 return to[lo]+(to[hi]-to[lo])*(value-from[lo])/(from[hi]-from[lo]);
}
export function peopleTimeToDistance(t,route){if(!route)return clamp(t);const {times,distances}=table(route);return interpolate(t,times,distances);}
export function peopleDistanceToTime(t,route){if(!route)return clamp(t);const {times,distances}=table(route);return interpolate(t,distances,times);}
