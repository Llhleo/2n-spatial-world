import * as T from 'three';
import {nextSmooth,PARTICLE_MARK_FORMED,PARTICLE_PETALS_ARRIVED} from './guild-next-route.js';
import {endingFlowCenter,endingGateProgress} from './guild-ending-flow.js';
import {materialRouteTime} from './guild-ending-material.js';

// One angular coordinate survives the escort, individual arrival and idle.
// Interpolating radius/angle instead of opposite XYZ points keeps the band open.
export function particlePetalPoint(a,start,t,time,reduced,slot,ambientTime,flight){
 const aspect=slot?.aspect||.6,fit=Math.min(1,aspect/.6),orbitFit=Math.min(1,aspect/.75);
 const stage=(t-PARTICLE_MARK_FORMED)/(PARTICLE_PETALS_ARRIVED-PARTICLE_MARK_FORMED);
 const u=Math.max(0,Math.min(1,(stage-flight.delay)/(flight.finish-flight.delay))),settle=nextSmooth(u);
 const transport=nextSmooth((t-.18)/.12),gather=nextSmooth((t-.46)/.15);
 const center=new T.Vector3(0,30,-14).lerp(new T.Vector3(...endingFlowCenter(endingGateProgress(materialRouteTime(t)),fit)),transport).lerp(new T.Vector3(0,43,-14),gather);
 center.y=T.MathUtils.lerp(center.y,33,settle);
 const phase=slot?.phase??a.longitude,base=slot?.escortPhase??a.longitude;
 // Road arrival has a continuous clock. The older preview only starts its
 // orbit clock at the end: return by the shortest phase, not every idle turn.
 const idleAngle=Math.atan2(Math.sin(time*.14),Math.cos(time*.14));
 const rotation=reduced?0:ambientTime?ambientTime*.14:idleAngle*settle;
 const turn=1.1*nextSmooth((t-.10)/.50);
 const delta=Math.atan2(Math.sin(phase-base-1.1),Math.cos(phase-base-1.1));
 const arc=64*u*u*u*(1-u)*(1-u)*(1-u);
 const angle=base+turn-rotation+delta*settle+(reduced?0:flight.bend[0]*.006*arc);
 const finalRadius=69+3*Math.sin(phase*.73+a.u*4)+2*Math.cos(phase*1.21);
 const escortRadius=T.MathUtils.lerp(76+(a.branch||0)*7+5*Math.sin(a.u*8),73,gather);
 const radius=T.MathUtils.lerp(escortRadius,finalRadius,settle),width=T.MathUtils.lerp(fit,orbitFit,gather+(1-gather)*settle);
 const height=T.MathUtils.lerp(27+8*a.u,5,settle),individual=T.MathUtils.lerp(2*Math.sin(base*1.7+a.u*4),2*Math.sin(phase*1.7+a.u*4),settle);
 const point=center.add(new T.Vector3(Math.cos(angle)*radius*width,Math.sin(angle)*height+individual,-Math.sin(angle)*radius*.92));
 point.y+=(reduced?0:flight.bend[1]*.25*arc);
 point.z+=(reduced?0:flight.bend[2]*.35*arc);
 const departure=.006+.018*flight.delay/.22,enter=nextSmooth((t-departure)/(.18-departure));
 return start.map((v,i)=>T.MathUtils.lerp(v,point.getComponent(i),enter));
}
