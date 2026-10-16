import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';

// A 32^3 volume in an 8x4 slice atlas. All rendered particles deposit mass;
// this is local artistic pressure, not an incompressible-fluid/SPH solver.
const N=32,CELL=6,COLS=8,W=N*COLS,H=N*4,HALF=(N-1)/2;
export const densityPartition=index=>({tile:Math.floor(index%256/4),channel:index%4});
const valid=c=>c.every(x=>x>=0&&x<N),idx=c=>c[0]+N*(c[1]+N*c[2]);
const gridPoint=(p,center,aspect,cell)=>p.map((x,k)=>(x-center[k])/(k===0?Math.min(1,aspect/.6):1)/cell+HALF);
export function createDensityField(points,{center=[0,0,0],aspect=.6,cell=CELL}={}){
 const data=new Float32Array(N**3),mass=4096/Math.max(1,points.length);
 for(const point of points){
  const q=gridPoint(point,center,aspect,cell),base=q.map(Math.floor),f=q.map((x,k)=>x-base[k]);
  for(let i=0;i<8;i++){const o=[i%2,(i>>1)%2,i>>2],c=base.map((x,k)=>x+o[k]);if(valid(c))data[idx(c)]+=mass*o.reduce((w,x,k)=>w*(x?f[k]:1-f[k]),1);}
 }
 const pressure=c=>valid(c)?Math.max(0,data[idx(c)]-.6):0;
 const cellForce=c=>{
  const v=[0,1,2].map(k=>{const a=c.slice(),b=c.slice();a[k]--;b[k]++;return (pressure(a)-pressure(b))*30/(2*cell);});
  const length=Math.hypot(...v);return length>32?v.map(x=>x*32/length):v;
 };
 return {mass:()=>data.reduce((s,x)=>s+x,0),force(p){
  const q=gridPoint(p,center,aspect,cell);if(q.some(x=>x<1||x>N-2))return [0,0,0];
  const base=q.map(Math.floor),f=q.map((x,k)=>x-base[k]),a=[0,0,0];
  for(let i=0;i<8;i++){const o=[i%2,(i>>1)%2,i>>2],c=base.map((x,k)=>x+o[k]),weight=o.reduce((w,x,k)=>w*(x?f[k]:1-f[k]),1),v=cellForce(c);for(let k=0;k<3;k++)a[k]+=v[k]*weight;}
  const edge=Math.min(...q,...q.map(x=>N-1-x)),fade=nextSmooth((edge-1)/2);
  return a.map((x,k)=>x*(k===0?Math.min(1,aspect/.6):1)*fade);
 }};
}

const ATLAS_GLSL=`
vec2 densityUV(vec3 c){return (vec2(mod(c.z,8.)*32.+c.x,floor(c.z/8.)*32.+c.y)+.5)/vec2(256.,128.);}
bool densityValid(vec3 c){return all(greaterThanEqual(c,vec3(0.)))&&all(lessThan(c,vec3(32.)));}
`;
export const DENSITY_SAMPLE_GLSL=ATLAS_GLSL+`
uniform sampler2D fDensityForce;
uniform float fDensityCell;
vec3 localDensityForce(vec3 p,vec3 center,float fit){
 vec3 q=(p-center)/vec3(fit,1.,1.)/fDensityCell+15.5;
 if(any(lessThan(q,vec3(1.)))||any(greaterThan(q,vec3(30.))))return vec3(0.);
 vec3 base=floor(q),f=fract(q),a=vec3(0.);
 for(int i=0;i<8;i++){
  vec3 o=vec3(float(i-2*(i/2)),float((i/2)-2*(i/4)),float(i/4));
  vec3 w=mix(1.-f,f,o);a+=texture2D(fDensityForce,densityUV(base+o)).xyz*w.x*w.y*w.z;
 }
 float edge=min(min(q.x,min(q.y,q.z)),min(31.-q.x,min(31.-q.y,31.-q.z))),e=clamp((edge-1.)/2.,0.,1.);
 float fade=e*e*e*(10.+e*(-15.+6.*e));return a*vec3(fit,1.,1.)*fade;
}`;

export function createGpuDensity(renderer,particleUV){
 const geometry=new T.InstancedBufferGeometry(),offsets=[];
 for(let i=0;i<8;i++)offsets.push(i%2,(i>>1)%2,i>>2);
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(24),3));
 geometry.setAttribute('aCellOffset',new T.BufferAttribute(new Float32Array(offsets),3));
 geometry.setAttribute('aParticleUV',new T.InstancedBufferAttribute(particleUV,2));geometry.instanceCount=particleUV.length/2;
 const lanes=new Float32Array(geometry.instanceCount*2);
 for(let i=0;i<geometry.instanceCount;i++){const lane=densityPartition(i);lanes.set([lane.tile,lane.channel],i*2);}
 geometry.setAttribute('aDensityLane',new T.InstancedBufferAttribute(lanes,2));
 // 64 tiles × 4 channels = 256 lanes. Each lane sees at most 1024 source
 // particles, avoiding the catastrophic 2048-addition FP16 plateau. Sum
 // lanes in a float32 shader output (no float32 blending extension needed).
 const massTarget=new T.WebGLRenderTarget(W*8,H*8,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false,stencilBuffer:false});
 const totalTarget=new T.WebGLRenderTarget(W,H,{type:T.FloatType,format:T.RGBAFormat,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false,stencilBuffer:false});
 const forceTarget=new T.WebGLRenderTarget(W,H,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false,stencilBuffer:false});
 const material=new T.ShaderMaterial({uniforms:{uPosition:{value:null},uCenter:{value:new T.Vector3()},uFit:{value:1},uCell:{value:CELL},uMass:{value:4096/geometry.instanceCount}},
  vertexShader:ATLAS_GLSL+`
  attribute vec3 aCellOffset;attribute vec2 aParticleUV,aDensityLane;uniform sampler2D uPosition;
  uniform vec3 uCenter;uniform float uFit,uMass,uCell;varying vec4 vMass;
  void main(){vec3 p=texture2D(uPosition,aParticleUV).xyz;
   vec3 q=(p-uCenter)/vec3(uFit,1.,1.)/uCell+15.5,base=floor(q),f=fract(q),c=base+aCellOffset,w=mix(1.-f,f,aCellOffset);
   float tile=aDensityLane.x,channel=aDensityLane.y;
   vMass=uMass*w.x*w.y*w.z*vec4(channel<.5?1.:0.,channel>.5&&channel<1.5?1.:0.,channel>1.5&&channel<2.5?1.:0.,channel>2.5?1.:0.);gl_PointSize=1.;
   vec2 uv=(densityUV(c)+vec2(mod(tile,8.),floor(tile/8.)))/8.;
   gl_Position=densityValid(c)?vec4(uv*2.-1.,0.,1.):vec4(2.,2.,0.,1.);
  }`,fragmentShader:'varying vec4 vMass;void main(){gl_FragColor=vMass;}',
  blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor,
  transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const scene=new T.Scene(),camera=new T.Camera(),points=new T.Points(geometry,material);points.frustumCulled=false;scene.add(points);
 const reduceMaterial=new T.ShaderMaterial({uniforms:{uLanes:{value:massTarget.texture}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform highp sampler2D uLanes;void main(){vec2 uv=gl_FragCoord.xy/vec2(256.,128.);float total=0.;for(int i=0;i<64;i++){vec2 tile=vec2(float(i-8*(i/8)),float(i/8));total+=dot(texture2D(uLanes,(uv+tile)/8.),vec4(1.));}gl_FragColor=vec4(total,0.,0.,1.);}`,
  depthTest:false,depthWrite:false,toneMapped:false});
 const forceMaterial=new T.ShaderMaterial({uniforms:{uDensity:{value:totalTarget.texture},uCell:{value:CELL}},
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:ATLAS_GLSL+`
  uniform highp sampler2D uDensity;uniform float uCell;
  float pressure(vec3 c){return densityValid(c)?max(0.,texture2D(uDensity,densityUV(c)).r-.6):0.;}
  void main(){vec2 pixel=floor(gl_FragCoord.xy);vec3 c=vec3(mod(pixel.x,32.),mod(pixel.y,32.),floor(pixel.x/32.)+8.*floor(pixel.y/32.));
   vec3 a=vec3(pressure(c-vec3(1.,0.,0.))-pressure(c+vec3(1.,0.,0.)),pressure(c-vec3(0.,1.,0.))-pressure(c+vec3(0.,1.,0.)),pressure(c-vec3(0.,0.,1.))-pressure(c+vec3(0.,0.,1.)))*30./(2.*uCell);
   float speed=length(a);gl_FragColor=vec4(speed>32.?a*(32./speed):a,1.);
  }`,depthTest:false,depthWrite:false,toneMapped:false});
 const quadGeometry=new T.PlaneGeometry(2,2),quad=new T.Mesh(quadGeometry,forceMaterial),forceScene=new T.Scene();quad.frustumCulled=false;forceScene.add(quad);
 let disposed=false;
 return {texture:forceTarget.texture,update(position,center,aspect,cell=CELL){
  if(disposed)return;
  const target=renderer.getRenderTarget(),colour=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,xr=renderer.xr.enabled,shadow=renderer.shadowMap.autoUpdate;
  try{
   renderer.autoClear=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;
   material.uniforms.uPosition.value=position;material.uniforms.uCenter.value.fromArray(center);material.uniforms.uFit.value=Math.min(1,aspect/.6);material.uniforms.uCell.value=cell;forceMaterial.uniforms.uCell.value=cell;
   renderer.setRenderTarget(massTarget);renderer.setClearColor(0,0);renderer.clear(true,false,false);renderer.render(scene,camera);
   quad.material=reduceMaterial;renderer.setRenderTarget(totalTarget);renderer.render(forceScene,camera);
   quad.material=forceMaterial;renderer.setRenderTarget(forceTarget);renderer.render(forceScene,camera);
  }finally{renderer.setClearColor(colour,alpha);renderer.autoClear=auto;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadow;renderer.setRenderTarget(target);}
 },dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();quadGeometry.dispose();forceMaterial.dispose();reduceMaterial.dispose();massTarget.dispose();totalTarget.dispose();forceTarget.dispose();}};
}
