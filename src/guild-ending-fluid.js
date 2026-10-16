import * as T from 'three';
import {GPUComputationRenderer} from 'three/addons/misc/GPUComputationRenderer.js';
import {nextSmooth} from './guild-next-route.js';
import {endingFlowCenter,endingFlowTangent,endingStreamPoint,endingGateProgress} from './guild-ending-flow.js';
import {ENDING_GATE_COUNT,endingDimensionTransforms,endingDimensionFrame} from './guild-ending-frames.js';
import {fluidGlyphProgress,fluidRouteTime,fluidDensityCell} from './guild-ending-timing.js';
import {createGpuDensity,DENSITY_SAMPLE_GLSL} from './guild-ending-density.js';

export const FLUID_DT=1/60,FLUID_START=.18,FLUID_SECONDS=18;
// A fixed tick index, never accumulated display deltas. Backwards seeks reset
// and replay the same force history; pauses do not advance physics.
export function createFluidClock(reset,step){
 let tick=0,initialized=false;
 return {seek(progress,forceReset=false){
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  const target=Math.max(0,Math.floor((t-FLUID_START)*FLUID_SECONDS/FLUID_DT+1e-7));
  if(!initialized||forceReset||target<tick){reset();tick=0;initialized=true;}
  while(tick<target){step(FLUID_START+tick*FLUID_DT/FLUID_SECONDS,FLUID_DT);tick++;}
  return tick;
 }};
}
export function fluidGuide(t,aspect=.6){
 const fit=Math.min(1,aspect/.6),route=fluidRouteTime(t),x=Math.max(0,Math.min(1,(route-.18)/.40));
 const center=endingFlowCenter(endingGateProgress(route),fit);
 const ds=30*x*x*(1-x)*(1-x)/(8.5-.18*FLUID_SECONDS);
 return {center,velocity:endingFlowTangent(endingGateProgress(route),fit).map(v=>v*ds)};
}
export function fluidGateStates(t,aspect=.6,reduced=false){
 const route=fluidRouteTime(t),frame=endingDimensionFrame(route,reduced);
 return endingDimensionTransforms(route,aspect,reduced).map((matrix,i)=>{
  const inv=matrix.clone().invert(),e=inv.elements;
  const normal=new T.Vector3(e[2],e[6],e[10]).normalize();
  return {center:new T.Vector3().setFromMatrixPosition(matrix).toArray(),normal:normal.toArray(),radius:frame.scales[i],visibility:frame.gates[i].visibility,inverse:Array.from(e)};
 });
}
// Curl of a smooth vector potential: local eddies, not a displacement applied
// to a fixed sheet. This field has zero analytic divergence before constraints.
export function fluidCurl(p,time){
 const [x,y,z]=p.map(v=>v*.045),a=time*.4;
 return [-Math.sin(x+a*.6)*Math.sin(y)-Math.cos(z-a*.8)*Math.cos(x),
  -Math.sin(y+a)*Math.sin(z)-Math.cos(x+a*.6)*Math.cos(y),
  -Math.sin(z-a*.8)*Math.sin(x)-Math.cos(y+a)*Math.cos(z)];
}
export function fluidVolumePressure(states,aspect=.6){
 const fit=Math.min(1,aspect/.6),center=[0,0,0],variance=[0,0,0],count=Math.max(1,states.length);
 for(const state of states){const p=state.position||state.p;for(let i=0;i<3;i++)center[i]+=p[i]/count;}
 for(const state of states){const p=state.position||state.p;for(let i=0;i<3;i++)variance[i]+=((p[i]-center[i])/(i===0?fit:1))**2/count;}
 // Coarse moment pressure counters squeezed axes without resetting any point
 // to a shape. This is an artistic volume constraint, not an SPH solver.
 return {center,pressure:variance.map(v=>Math.max(-.15,Math.min(2,(306.25/(v+16)-1)*.75)))};
}
function gateExtent(p,gate){
 if(!gate.inverse){const d=p.map((x,k)=>x-gate.center[k]),axial=d.reduce((s,x,k)=>s+x*gate.normal[k],0);return Math.sqrt(Math.max(0,d.reduce((s,x)=>s+x*x,0)-axial*axial))/gate.radius;}
 const e=gate.inverse;
 return Math.max(Math.abs(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12]),Math.abs(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13]));
}
export function fluidAcceleration(p,v,seed,t,gates,mark,aspect=.6,reduced=false,volume=null){
 const fit=Math.min(1,aspect/.6),guide=fluidGuide(t,aspect),q=p.map((x,i)=>(x-guide.center[i])/(i===0?fit:1));
 const r=Math.max(.001,Math.hypot(...q)),curl=fluidCurl([p[0]/fit,p[1],p[2]],t*18);
 const start=nextSmooth((t-.18)/.06),motion=reduced?0:1;
 // No centre-repelling shell force: the middle must actually contain dust.
 const pressure=-2.5*Math.max(0,r-49);
 const spread=24*(1-nextSmooth((t-.34)/.13)),clock=t*18;
 const micro=[Math.sin((seed[0]*7.13+seed[2]*3.7)*Math.PI*2+clock*.65),Math.sin((seed[1]*5.71+seed[0]*2.3)*Math.PI*2-clock*.51),Math.sin((seed[2]*8.37+seed[1]*4.1)*Math.PI*2+clock*.57)];
 const fineCurl=fluidCurl([p[0]/fit*2.1+17,p[1]*2.1-9,p[2]*2.1+23],clock*1.3);
 const local=volume?.density?volume.density.force(p):[0,0,0];
 const a=q.map((x,i)=>{
  const scale=i===0?fit:1;
  const returnFlow=volume?(guide.center[i]-volume.center[i])*1.3*nextSmooth((t-.46)/.12):0;
  const desired=guide.velocity[i]+((curl[i]*14+fineCurl[i]*6)*motion+micro[i]*(spread+4)*(.5+.5*motion)-x*.025)*scale+returnFlow;
  const bulk=volume?(p[i]-volume.center[i])*volume.pressure[i]*nextSmooth((t-.38)/.15):0;
  return ((desired-v[i])*1.7+x/r*pressure*scale+bulk+local[i])*start;
 });
 for(const gate of gates){
  const d=p.map((x,i)=>x-gate.center[i]),axial=d.reduce((n,x,i)=>n+x*gate.normal[i],0);
  const side=d.map((x,i)=>x-gate.normal[i]*axial),extent=gateExtent(p,gate);
  if(extent>=1.15)continue;
  const near=Math.exp(-((axial/13)**2))*(1-nextSmooth((extent-.65)/.5))*gate.visibility;
  const n=gate.normal,tangent=[n[1]*side[2]-n[2]*side[1],n[2]*side[0]-n[0]*side[2],n[0]*side[1]-n[1]*side[0]];
  const along=guide.velocity.reduce((s,x,i)=>s+x*n[i],0)>=0?1:-1;
  for(let i=0;i<3;i++)a[i]+=near*(-side[i]*.30+n[i]*along*16+tangent[i]*.18*motion);
 }
 // Critically damped attraction grows only after the unshaped central hold.
 const glyph=fluidGlyphProgress(t,seed[2]);
 const k=35*glyph,drag=2*Math.sqrt(k);
 return a.map((x,i)=>x*(1-glyph)+(k*(mark[i]-p[i])-drag*v[i]));
}
export function stepFluidParticle(p,v,seed,t,dt,gates,mark,aspect=.6,reduced=false,volume=null){
 const a=fluidAcceleration(p,v,seed,t,gates,mark,aspect,reduced,volume),velocity=v.map((x,i)=>x+a[i]*dt);
 const speed=Math.hypot(...velocity);if(speed>160)for(let i=0;i<3;i++)velocity[i]*=160/speed;
 return {position:p.map((x,i)=>x+velocity[i]*dt),velocity};
}
export function recordFluidPassage(hits,previous,current,t,gates){
 for(let i=0;i<gates.length;i++){
  const gate=gates[i],a=previous.map((x,k)=>x-gate.center[k]),b=current.map((x,k)=>x-gate.center[k]);
  const old=a.reduce((s,x,k)=>s+x*gate.normal[k],0),now=b.reduce((s,x,k)=>s+x*gate.normal[k],0);
  if(old*now<=0&&gateExtent(current,gate)<1&&gate.visibility>.1&&t-hits[i]>.045)hits[i]=t;
 }
}

export const FLUID_FORCE_GLSL=`
uniform float fT,fDt,fAspect,fReduced;
uniform vec3 fCenter,fGuideVelocity,fMassCenter,fVolumePressure;
uniform sampler2D fSeed,fGlyph;
uniform vec3 fGateCenter[${ENDING_GATE_COUNT}],fGateNormal[${ENDING_GATE_COUNT}];
uniform mat4 fGateInverse[${ENDING_GATE_COUNT}];
uniform float fGateRadius[${ENDING_GATE_COUNT}],fGateVisibility[${ENDING_GATE_COUNT}];
${DENSITY_SAMPLE_GLSL}
float smooth5(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
vec3 curlField(vec3 p,float time){
 vec3 q=p*.045;float a=time*.4;
 return vec3(-sin(q.x+a*.6)*sin(q.y)-cos(q.z-a*.8)*cos(q.x),
 -sin(q.y+a)*sin(q.z)-cos(q.x+a*.6)*cos(q.y),
 -sin(q.z-a*.8)*sin(q.x)-cos(q.y+a)*cos(q.z));
}
vec3 velocityStep(vec3 p,vec3 v,vec4 seed,vec3 mark){
 float fit=min(1.,fAspect/.6);vec3 scale=vec3(fit,1.,1.);
 vec3 q=(p-fCenter)/scale;float r=max(.001,length(q));
 vec3 curl=curlField(p/scale,fT*18.);
 float pressure=-2.5*max(0.,r-49.),clock=fT*18.,spread=24.*(1.-smooth5((fT-.34)/.13));
 vec3 micro=sin(vec3((seed.x*7.13+seed.z*3.7)*6.28318530718+clock*.65,(seed.y*5.71+seed.x*2.3)*6.28318530718-clock*.51,(seed.z*8.37+seed.y*4.1)*6.28318530718+clock*.57));
 vec3 fineCurl=curlField(p/scale*2.1+vec3(17.,-9.,23.),clock*1.3);
 vec3 returnFlow=(fCenter-fMassCenter)*1.3*smooth5((fT-.46)/.12);
 vec3 desired=fGuideVelocity+((curl*14.+fineCurl*6.)*(1.-fReduced)+micro*(spread+4.)*(1.-fReduced*.5)-q*.025)*scale+returnFlow;
 vec3 bulk=(p-fMassCenter)*fVolumePressure*smooth5((fT-.38)/.15);
 vec3 a=((desired-v)*1.7+q/r*pressure*scale+bulk+localDensityForce(p,fCenter,fit))*smooth5((fT-.18)/.06);
 for(int i=0;i<${ENDING_GATE_COUNT};i++){
  vec3 d=p-fGateCenter[i],n=fGateNormal[i];float axial=dot(d,n);
  vec3 side=d-n*axial,local=(fGateInverse[i]*vec4(p,1.)).xyz;float extent=max(abs(local.x),abs(local.y));
  if(extent>=1.15)continue;
  float near=exp(-pow(axial/13.,2.))*(1.-smooth5((extent-.65)/.5))*fGateVisibility[i];
  float along=dot(fGuideVelocity,n)>=0.?1.:-1.;
  a+=near*(-side*.30+n*along*16.+cross(n,side)*.18*(1.-fReduced));
 }
 float glyph=smooth5((fT-13.2/18.-seed.z*.035)/(3.3/18.-.035)),k=35.*glyph,drag=2.*sqrt(k);
 a=a*(1.-glyph)+k*(mark-p)-drag*v;
 vec3 nextV=v+a*fDt;float speed=length(nextV);
 return speed>160.?nextV*(160./speed):nextV;
}`;

export function createEndingFluid(renderer,geometry){
 if(!renderer.extensions.has('EXT_color_buffer_float'))throw new Error('此设备不支持当前流体实验所需的浮点缓冲，未回退到旧动画');
 const count=geometry.getAttribute('position').count,side=Math.sqrt(count);
 const gpu=new GPUComputationRenderer(side,side,renderer),pos0=gpu.createTexture(),vel0=gpu.createTexture(),seeds=gpu.createTexture(),glyphs=gpu.createTexture();
 seeds.image.data.set(geometry.getAttribute('aSeed').array);
 const pos=geometry.getAttribute('position');for(let i=0;i<count;i++)glyphs.image.data.set([pos.getX(i),pos.getY(i),pos.getZ(i),1],i*4);
 const common=FLUID_FORCE_GLSL+`\nvoid main(){
 vec2 uv=gl_FragCoord.xy/resolution.xy;vec3 p=texture2D(texturePosition,uv).xyz,v=texture2D(textureVelocity,uv).xyz;
 vec4 seed=texture2D(fSeed,uv);vec3 mark=texture2D(fGlyph,uv).xyz*min(1.12,fAspect*1.75)+vec3(0.,43.,-14.);
 vec3 nextV=velocityStep(p,v,seed,mark);`;
 const position=gpu.addVariable('texturePosition',common+'gl_FragColor=vec4(p+nextV*fDt,1.);}',pos0);
 const velocity=gpu.addVariable('textureVelocity',common+'gl_FragColor=vec4(nextV,1.);}',vel0);
 const density=createGpuDensity(renderer,geometry.getAttribute('aFluidUV').array);
 for(const variable of [position,velocity]){
  gpu.setVariableDependencies(variable,[position,velocity]);
  Object.assign(variable.material.uniforms,{fT:{value:.18},fDt:{value:FLUID_DT},fAspect:{value:.6},fReduced:{value:0},fCenter:{value:new T.Vector3()},fGuideVelocity:{value:new T.Vector3()},fSeed:{value:seeds},fGlyph:{value:glyphs},
   fMassCenter:{value:new T.Vector3()},fVolumePressure:{value:new T.Vector3()},fGateInverse:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Matrix4())},fDensityForce:{value:density.texture},fDensityCell:{value:12},
   fGateCenter:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Vector3())},fGateNormal:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Vector3())},fGateRadius:{value:new Float32Array(ENDING_GATE_COUNT)},fGateVisibility:{value:new Float32Array(ENDING_GATE_COUNT)}});
 }
 const clean=()=>{gpu.dispose();position.material.dispose();velocity.material.dispose();seeds.dispose();glyphs.dispose();density.dispose();};
 // Compile the real compute shaders before declaring the preview ready.
 const previousError=renderer.debug.onShaderError,target=renderer.getRenderTarget(),xr=renderer.xr.enabled,shadow=renderer.shadowMap.autoUpdate;
 try{
  renderer.debug.onShaderError=(gl,program,vs,fs)=>{throw new Error(gl.getProgramInfoLog(program)||gl.getShaderInfoLog(fs)||'GPU流体着色器编译失败');};
  const error=gpu.init();if(error)throw new Error(error);density.update(gpu.getCurrentRenderTarget(position).texture,[0,30,-14],.6,12);gpu.compute();
 }catch(error){clean();throw error;}finally{renderer.debug.onShaderError=previousError;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadow;renderer.setRenderTarget(target);}
 let aspect=.6,reduced=false,disposed=false;const hits=new Float32Array(ENDING_GATE_COUNT).fill(-10),observers=[];
 const reset=()=>{
  for(let i=0;i<count;i++){
   const seed=Array.from(seeds.image.data.subarray(i*4,i*4+4));
   const p=endingStreamPoint(seed,.18,aspect,reduced),next=endingStreamPoint(seed,.18001,aspect,reduced);
   pos0.image.data.set([...p,1],i*4);vel0.image.data.set([...p.map((x,k)=>(next[k]-x)/(.00001*18)),1],i*4);
  }
  pos0.needsUpdate=true;vel0.needsUpdate=true;
  for(const variable of [position,velocity])for(const target of variable.renderTargets)gpu.renderTexture(variable.initialValueTexture,target);
  gpu.currentTextureIndex=0;
  hits.fill(-10);observers.length=0;
  // Coarse companion probes estimate bulk moments and gate feedback. They do
  // not sample the GPU density texture, so they are not a trajectory oracle.
  // All 262144 visible particles independently receive the full GPU pressure.
  for(let j=0;j<64;j++){
   const i=j*4093;observers.push({position:Array.from(pos0.image.data.subarray(i*4,i*4+3)),velocity:Array.from(vel0.image.data.subarray(i*4,i*4+3)),seed:Array.from(seeds.image.data.subarray(i*4,i*4+4)),glyph:Array.from(glyphs.image.data.subarray(i*4,i*4+3))});
  }
 };
 const clock=createFluidClock(reset,(t,dt)=>{
  const guide=fluidGuide(t,aspect),gates=fluidGateStates(t,aspect,reduced),volume=fluidVolumePressure(observers,aspect);
  density.update(gpu.getCurrentRenderTarget(position).texture,guide.center,aspect,fluidDensityCell(t));
  for(const variable of [position,velocity]){
   const u=variable.material.uniforms;u.fT.value=t;u.fDt.value=dt;u.fAspect.value=aspect;u.fReduced.value=reduced?1:0;u.fCenter.value.fromArray(guide.center);u.fGuideVelocity.value.fromArray(guide.velocity);u.fDensityCell.value=fluidDensityCell(t);
   u.fMassCenter.value.fromArray(volume.center);u.fVolumePressure.value.fromArray(volume.pressure);
   for(let i=0;i<ENDING_GATE_COUNT;i++){u.fGateCenter.value[i].fromArray(gates[i].center);u.fGateNormal.value[i].fromArray(gates[i].normal);u.fGateInverse.value[i].fromArray(gates[i].inverse);u.fGateRadius.value[i]=gates[i].radius;u.fGateVisibility.value[i]=gates[i].visibility;}
  }
  gpu.compute();
  for(const o of observers){
   const mark=o.glyph.map((x,i)=>x*Math.min(1.12,aspect*1.75)+[0,43,-14][i]);
   const next=stepFluidParticle(o.position,o.velocity,o.seed,t,dt,gates,mark,aspect,reduced,volume);
   recordFluidPassage(hits,o.position,next.position,t,gates);o.position=next.position;o.velocity=next.velocity;
  }
 });
 return {hits,update(t,nextAspect,nextReduced){
  if(disposed)return null;const change=aspect!==nextAspect||reduced!==!!nextReduced;aspect=nextAspect;reduced=!!nextReduced;
  clock.seek(t,change);return gpu.getCurrentRenderTarget(position).texture;
 },dispose(){if(disposed)return;disposed=true;clean();}};
}
