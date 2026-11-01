import * as T from 'three';
import {nextSmooth,PARTICLE_MARK_FORMED,PARTICLE_PETALS_ARRIVED} from './guild-next-route.js';
import {endingFlowCenter,endingGateProgress} from './guild-ending-flow.js';
import {materialRouteTime} from './guild-ending-material.js';

function escortPoint(a,t,fit,motion,ambientTime){
 const spiral=nextSmooth((t-.12)/.35),theta=a.longitude+spiral*1.6+(t*18*.09*spiral+ambientTime*.10)*motion;
 const radius=54+(a.branch||0)*18+12*a.u;
 const early=new T.Vector3(Math.cos(theta)*radius*fit,30+Math.sin(theta)*radius*.46,-14+Math.sin(theta)*radius*.62+(a.u-.5)*48);
 const route=new T.Vector3(...endingFlowCenter(endingGateProgress(materialRouteTime(t)),fit)).lerp(new T.Vector3(0,43,-14),nextSmooth((t-.46)/.15));
 const angle=a.longitude+((t-.22)*(3.2+.8*a.u)+ambientTime*.18)*motion+a.branch*.6;
 const spread=(52+18*a.u+14*nextSmooth((t-.46)/.10)+12*nextSmooth((t-.55)/.15)*(1-nextSmooth((t-.80)/.10)))*.55;
 const escort=new T.Vector3(route.x+Math.cos(angle)*spread*fit,route.y+Math.sin(angle)*spread*.65,route.z+(Math.sin(angle*1.4+a.branch)*45+(a.u-.5)*42)*.55);
 return early.lerp(escort,nextSmooth((t-.20)/.10));
}

// Each identity gets its own duration and control displacement. A quintic
// Hermite bridge carries the escort's tangent and curvature into the moving
// final orbit; there is no stop at a shared lower staging position.
export function particlePetalPoint(a,start,t,time,reduced,slot,ambientTime,flight){
 const aspect=slot?.aspect||.6,fit=Math.min(1,aspect/.6),motion=reduced?0:1;
 const stage=(t-PARTICLE_MARK_FORMED)/(PARTICLE_PETALS_ARRIVED-PARTICLE_MARK_FORMED);
 const settle=nextSmooth(stage);
 const phase=slot?.phase??a.longitude,r=69+3*Math.sin(phase*.73+a.u*4)+2*Math.cos(phase*1.21),orbitFit=Math.min(1,aspect/.75);
 const idleAngle=Math.atan2(Math.sin(time*.14),Math.cos(time*.14)),rotation=reduced?0:ambientTime?ambientTime*.14:idleAngle*settle;
 const guidePhase=slot?.stagingPhase??a.longitude+1.1,delta=Math.atan2(Math.sin(phase-guidePhase),Math.cos(phase-guidePhase));
 const orbitPhase=guidePhase+delta*settle,orbitAngle=orbitPhase-rotation;
 const guideRadius=69+3*Math.sin(guidePhase*.73+a.u*4)+2*Math.cos(guidePhase*1.21),radius=T.MathUtils.lerp(guideRadius,r,settle);
 const destination=new T.Vector3(Math.cos(orbitAngle)*radius*orbitFit,33+5*Math.sin(orbitAngle)+2*Math.sin(orbitPhase*1.7+a.u*4),-14-Math.sin(orbitAngle)*radius*.92);
 const begin=.675+flight.delay*.12,end=PARTICLE_PETALS_ARRIVED-(1-flight.finish)*.012,duration=end-begin;
 let point;
 if(t<=begin)point=escortPoint(a,t,fit,motion,ambientTime);
 else if(t>=end)point=destination;
 else{
  const h=.0001,p=escortPoint(a,begin,fit,motion,ambientTime),before=escortPoint(a,begin-h,fit,motion,ambientTime),after=escortPoint(a,begin+h,fit,motion,ambientTime);
  const velocity=after.clone().sub(before).multiplyScalar(1/(2*h)),acceleration=after.clone().add(before).addScaledVector(p,-2).multiplyScalar(1/(h*h));
  const u=(t-begin)/duration,u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u,blend=nextSmooth(u);
  point=p.multiplyScalar(1-blend).addScaledVector(destination,blend).addScaledVector(velocity,duration*(u-6*u3+8*u4-3*u5)).addScaledVector(acceleration,duration*duration*.5*(u2-3*u3+3*u4-u5));
  const arc=64*u3*(1-u)*(1-u)*(1-u);
  point.add(new T.Vector3(flight.bend[0]*fit*.65,-(26+flight.bend[1]*.7),flight.bend[2]*.7).multiplyScalar(arc*(reduced?.25:1)));
 }
 const departure=.006+.018*flight.delay/.22,enter=nextSmooth((t-departure)/(.18-departure));
 return start.map((v,i)=>T.MathUtils.lerp(v,point.getComponent(i),enter));
}
