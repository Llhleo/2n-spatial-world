import {nextSmooth} from './guild-next-route.js';

// One cubic route for the whole shot. There is no separate transit clock to
// freeze, and no second gather trajectory to switch onto. The endpoint is the
// sampled opening sculpture, with its original surface normals retained.
export function endingFlowCenter(s,fit=1){
 const r=1-s;
 return [(-150*r*r*s+165*r*s*s)*fit,
  30*r*r*r-300*r*r*s+405*r*s*s+43*s*s*s,
  -14*r*r*r-540*r*r*s-390*r*s*s-14*s*s*s];
}
export function endingFlowTangent(s,fit=1){
 const r=1-s;
 return [3*(-50*r*r+210*r*s-55*s*s)*fit,
  3*(-130*r*r+470*r*s-92*s*s),3*(-166*r*r+100*r*s+116*s*s)];
}
export function endingFlowPoint(cloud,mark,seed,t,aspect=.6,reduced=false){
 const u=Number.isFinite(t)?Math.max(0,Math.min(1,t)):0;
 const s=nextSmooth((u-seed[2]*.018)/.68),r=1-s,fit=Math.min(1,aspect/.6);
 const center=endingFlowCenter(s,fit),weight=s**4;
 const turn=seed[0]*Math.PI*2+s*2,flutter=Math.sin(Math.PI*s)*r*2*(reduced?0:1);
 return center.map((v,i)=>v+cloud[i]*r*r*(i===0?fit:1)+(mark[i]-[0,43,-14][i])*weight+[Math.sin(turn)*fit,Math.cos(turn),Math.sin(turn+seed[1]*3)][i]*flutter);
}
// Included verbatim by the actual vertex shader, so the tested trajectory is
// the rendered route rather than an unrelated CPU transit approximation.
export const ENDING_FLOW_GLSL=`
vec3 flowCenter(float s,float fit){
 float r=1.-s;
 return vec3((-150.*r*r*s+165.*r*s*s)*fit,
  30.*r*r*r-300.*r*r*s+405.*r*s*s+43.*s*s*s,
  -14.*r*r*r-540.*r*r*s-390.*r*s*s-14.*s*s*s);
}
vec3 flowPoint(vec3 cloud,vec3 mark,vec4 seed,float t,float fit,float reduced){
 float s=ease((t-seed.z*.018)/.68),r=1.-s;
 float turn=seed.x*6.28318530718+s*2.;
 float flutter=sin(3.14159265359*s)*r*2.*(1.-reduced);
 return flowCenter(s,fit)+cloud*vec3(fit,1.,1.)*r*r
 +(mark-vec3(0.,43.,-14.))*s*s*s*s
 +vec3(sin(turn)*fit,cos(turn),sin(turn+seed.y*3.))*flutter;
}`;
