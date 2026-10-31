import * as T from 'three';
import {nextSmooth,PARTICLE_MARK_FORMED,PARTICLE_PETALS_ARRIVED} from './guild-next-route.js';
import {endingFlowCenter,endingGateProgress} from './guild-ending-flow.js';
import {materialRouteTime} from './guild-ending-material.js';

// Restore the former loose, independently moving escorts. Only their shared
// transport center follows the current fluid timing; there is no outside ring.
export function particlePetalPoint(a,start,t,time,reduced,slot,ambientTime,flight){
 const aspect=slot?.aspect||.6,fit=Math.min(1,aspect/.6),motion=reduced?0:1;
 const spiral=nextSmooth((t-.12)/.35),theta=a.longitude+spiral*1.6+(t*18*.09*spiral+ambientTime*.10)*motion;
 const radius=54+(a.branch||0)*18+12*a.u;
 const early=new T.Vector3(Math.cos(theta)*radius*fit,30+Math.sin(theta)*radius*.46,-14+Math.sin(theta)*radius*.62+(a.u-.5)*48);
 const route=new T.Vector3(...endingFlowCenter(endingGateProgress(materialRouteTime(t)),fit)).lerp(new T.Vector3(0,43,-14),nextSmooth((t-.46)/.15));
 const angle=a.longitude+((t-.22)*(3.2+.8*a.u)+ambientTime*.18)*motion+a.branch*.6;
 const spread=(52+18*a.u+14*nextSmooth((t-.46)/.10)+12*nextSmooth((t-.55)/.15)*(1-nextSmooth((t-.80)/.10)))*.55;
 const escort=new T.Vector3(route.x+Math.cos(angle)*spread*fit,route.y+Math.sin(angle)*spread*.65,route.z+(Math.sin(angle*1.4+a.branch)*45+(a.u-.5)*42)*.55);
 const point=early.lerp(escort,nextSmooth((t-.20)/.10));
 const stage=(t-PARTICLE_MARK_FORMED)/(PARTICLE_PETALS_ARRIVED-PARTICLE_MARK_FORMED);
 const delay=flight.delay*.35,u=Math.max(0,Math.min(1,(stage-delay)/(1-delay))),settle=nextSmooth(u);
 const phase=slot?.phase??a.longitude,r=69+3*Math.sin(phase*.73+a.u*4)+2*Math.cos(phase*1.21),orbitFit=Math.min(1,aspect/.75);
 const idleAngle=Math.atan2(Math.sin(time*.14),Math.cos(time*.14)),rotation=reduced?0:ambientTime?ambientTime*.14:idleAngle*settle;
 const orbitAngle=phase-rotation;
 const destination=new T.Vector3(Math.cos(orbitAngle)*r*orbitFit,33+5*Math.sin(orbitAngle)+2*Math.sin(phase*1.7+a.u*4),-14-Math.sin(orbitAngle)*r*.92);
 // While the glyph forms, loose escorts first find independent lower staging
 // slots. Once solid, their short lift into orbit needs no radial snap-back.
 const stagingPhase=slot?.stagingPhase??a.longitude+1.1;
 const stagingRotation=rotation;
 const stagingRadius=61+2*Math.sin(stagingPhase*.73+a.u*4);
 const stagingAngle=stagingPhase-stagingRotation;
 const bottom=43-36.5*Math.min(1.12,aspect*1.75)-8-2*Math.sin(a.u*5);
 const staging=new T.Vector3(Math.cos(stagingAngle)*stagingRadius*orbitFit,bottom,-14-Math.sin(stagingAngle)*stagingRadius*.92);
 point.lerp(staging,nextSmooth((t-.72)/(PARTICLE_MARK_FORMED-.72))).lerp(destination,settle);
 const arc=64*u*u*u*(1-u)*(1-u)*(1-u)*motion;
 point.add(new T.Vector3(flight.bend[0]*fit*.15,flight.bend[1]*.65,flight.bend[2]*.15).multiplyScalar(arc));
 const departure=.006+.018*flight.delay/.22,enter=nextSmooth((t-departure)/(.18-departure));
 return start.map((v,i)=>T.MathUtils.lerp(v,point.getComponent(i),enter));
}
