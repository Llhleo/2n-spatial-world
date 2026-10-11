import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';
import {createMonument} from './monument.js';
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js';

// Reference study: FrostNovaOrg/world-execute-web engine/swarm.js,
// engine/rig.js, ch/title/galaxy.js and 02_title.js drawGatherR. Independently authored:
// staggered morphs, curved travel, depth-aware luminous points and a settling orbit.
export const ENDING_PARTICLE_COUNT=262144;
// Volumetric teardrop lobes, sampled into the actual GPU shape attribute.
// Broad centres, tapered tips and curled depth make a blossom, not five rays.
export function endingBloomPoint(u,across,through,group){
 const angle=group*Math.PI*2/5+.28+u*.18,radius=8+(52+5*Math.sin(group*1.7))*u;
 const width=16*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.7),side=across*width;
 return [(Math.cos(angle)*radius-Math.sin(angle)*side)*.82,(Math.sin(angle)*radius+Math.cos(angle)*side)*1.1,-18+28*u*u+8*Math.sin(group*1.8)+through*(5+6*Math.sin(Math.PI*u))];
}
export function endingFrame(t=0){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 return {reveal:nextSmooth(u/.14),bloom:nextSmooth((u-.08)/.32),glyph:nextSmooth((u-.64)/.31),settle:nextSmooth((u-.90)/.10),orbit:(-.12+.38*nextSmooth((u-.10)/.46))*(1-nextSmooth((u-.64)/.34)),light:1+1.7*Math.sin(Math.PI*u)**2};
}
export function endingCamera(pose,t){
 const f=endingFrame(t),k=nextSmooth(t/.24),target=[0,30,-14];
 const finalTarget=pose.target.map((v,i)=>T.MathUtils.lerp(v,target[i],k));
 const radius=T.MathUtils.lerp(pose.position[2]-pose.target[2],250,k);
 return {target:finalTarget,position:[T.MathUtils.lerp(pose.position[0],Math.sin(f.orbit)*radius,k),T.MathUtils.lerp(pose.position[1],34+18*Math.sin(Math.PI*t),k),finalTarget[2]+T.MathUtils.lerp(pose.position[2]-pose.target[2],Math.cos(f.orbit)*radius,k)]};
}
export function endingPetalFrame(pose,aspect,anchors){
 const end=endingCamera(pose,1),camera=new T.PerspectiveCamera(48,aspect);camera.position.fromArray(end.position);camera.lookAt(...end.target);camera.updateMatrixWorld();
 const slots=new Map(),placed=[],half=Math.tan(T.MathUtils.degToRad(24));
 for(const [index,a] of anchors.entries()){
  const depth=[195,270,355][index%3];let best=null,score=-Infinity;
  for(let trial=0;trial<700;trial++){
   const angle=(trial*.61803398875+a.u*.413+a.branch*.27)*Math.PI*2;
   const r=.52+((trial*137+index*79)%997)/997*.42;
   const x=Math.cos(angle)*r,y=.27+Math.sin(angle)*r*.54;
   const radius=5.9/(depth*half),gap=placed.length?Math.min(...placed.map(p=>Math.hypot((x-p.x)*aspect,y-p.y)/(radius+p.radius))):2;
   if(gap>score){score=gap;best={x,y,radius};}
  }
  placed.push(best);slots.set(a.id,{position:new T.Vector3(best.x*depth*half*aspect,best.y*depth*half,-depth).applyMatrix4(camera.matrixWorld),phase:index*2.39996,aspect});
 }
 return slots;
}
export function endingPetalPoint(a,start,t,time=0,reduced=false,slots=null){
 const f=endingFrame(t),slot=slots?.get(a.id),theta=a.longitude+(reduced?0:time*.025);
 const fit=Math.min(1,(slot?.aspect||.6)/.6),radius=66+12*a.u;
 const bloom=new T.Vector3(Math.cos(theta)*radius*.82*fit,30+Math.sin(theta)*radius*.9,-14+Math.sin(a.longitude*2)*36);
 const destination=slot?.position.clone()||bloom.clone();
 if(slot&&!reduced)destination.add(new T.Vector3(Math.sin(time*.12+slot.phase)*.8,Math.cos(time*.13+slot.phase)*.8,Math.sin(time*.11+slot.phase)*1.8));
 bloom.lerp(destination,nextSmooth((t-.60)/.32));
 const k=f.bloom;
 return start.map((v,i)=>T.MathUtils.lerp(v,bloom.getComponent(i),k));
}
// Sample the exact opening sculpture, retaining its separate superscript n,
// pitched faces, original proportions and thickness. No hand-drawn glyph.
export function createEndingParticles(){
 const geometry=new T.BufferGeometry(),seed=new Float32Array(ENDING_PARTICLE_COUNT*4),glyph=new Float32Array(ENDING_PARTICLE_COUNT*3),normals=new Float32Array(ENDING_PARTICLE_COUNT*3),bloom=new Float32Array(ENDING_PARTICLE_COUNT*3),start=new Float32Array(ENDING_PARTICLE_COUNT*3);
 let state=971231;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const monument=createMonument(),box=new T.Box3().setFromObject(monument),center=box.getCenter(new T.Vector3()),point=new T.Vector3(),normal=new T.Vector3();
 const surfaces=monument.children.map(mesh=>{
  const sampler=new MeshSurfaceSampler(mesh).setRandomGenerator(random).build();
  return {sampler,area:sampler.distribution.at(-1)};
 });
 const total=surfaces.reduce((n,s)=>n+s.area,0);
 for(let i=0;i<ENDING_PARTICLE_COUNT;i++){
  seed.set([random(),random(),random(),i%5],i*4);
  const [sx,sy,sz]=seed.subarray(i*4,i*4+3),yy=sy*2-1,rr=17*Math.cbrt(sz),xz=Math.sqrt(1-yy*yy),angle=sx*Math.PI*2;
  start.set([Math.cos(angle)*xz*rr,yy*rr,Math.sin(angle)*xz*rr],i*3);
  bloom.set(endingBloomPoint(Math.sqrt(sy),sx*2-1,sz*2-1,i%5),i*3);
  let pick=random()*total,surface=surfaces.at(-1);for(const s of surfaces){if(pick<s.area){surface=s;break;}pick-=s.area;}
  surface.sampler.sample(point,normal);point.sub(center);glyph.set(point.toArray(),i*3);normals.set(normal.toArray(),i*3);
 }
 monument.traverse(o=>o.geometry?.dispose());monument.children[0].material.dispose();
 geometry.setAttribute('aNormal',new T.BufferAttribute(normals,3));
 geometry.setAttribute('aBloom',new T.BufferAttribute(bloom,3));geometry.setAttribute('aStart',new T.BufferAttribute(start,3));
 geometry.setAttribute('position',new T.BufferAttribute(glyph,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seed,4));
 // Ordinary alpha blending bounds dense crossings to the palette; visibility
 // comes from wider bright cores, not unbounded additive accumulation.
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,toneMapped:false,uniforms:{uT:{value:0},uTime:{value:0},uPixels:{value:896},uAspect:{value:.6},uReduced:{value:0}},
 vertexShader:`attribute vec4 aSeed; attribute vec3 aNormal,aBloom,aStart; uniform float uT,uTime,uPixels,uAspect,uReduced; varying vec3 vColor; varying float vEnergy; varying float vMorph; varying float vMetal;
 float ease(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
 vec3 biome(float i){if(i<.5)return vec3(.48,1.,.66);if(i<1.5)return vec3(1.,.78,.35);if(i<2.5)return vec3(.3,.77,1.);if(i<3.5)return vec3(.65,.95,.3);return vec3(1.,.28,.24);}
 void main(){
 float turn=aSeed.x*6.2831853,depth=aSeed.y,group=aSeed.w;
 float opening=ease((uT-.08-group*.009-depth*.015)/.269);
 float morph=ease((uT-.64-group*.01-depth*.035)/.235),reveal=ease((uT-aSeed.z*.05)/.10);
 float fit=min(1.,uAspect/.6);
 vec3 petal=aBloom;
 // A slow travelling deformation opens and breathes across broad volumes.
 float motion=1.-uReduced;
 petal.z+=motion*sin(depth*5.-uTime*.4+group)*2.8;
 petal.xy*=1.+motion*.025*sin(uTime*.35+group*.8);
 vec3 p=mix(aStart,petal,opening);
 float fold=sin(opening*3.141593);p.z+=fold*(14.+depth*18.);p.xy*=1.+fold*.12;
 p.x*=fit;p+=vec3(0.,30.,-14.);
 float sculptureScale=min(1.12,uAspect*1.75);
 vec3 mark=position*sculptureScale+vec3(0.,43.,-14.);
 p=mix(p,mark,morph);
 float arc=sin(morph*3.141593)*(10.+aSeed.z*12.);p+=vec3(-sin(turn)*fit,cos(turn),sin(turn*2.)*.7)*arc;
 float flow=(1.-morph)*motion*.8;p+=vec3(sin(p.y*.07+uTime*.23),cos(p.z*.08-uTime*.17),sin(p.x*.06+uTime*.2))*flow;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float px=clamp(uPixels*1.1/max(1.,-mv.z),1.8,8.);
 gl_PointSize=px;
 float wave=exp(-pow((sqrt(depth)-clamp((uT-.24)/.38,0.,1.))/.14,2.));
 float pulse=pow(max(0.,cos(depth*9.-uTime*.6*motion-group*.5)),12.);
 float climax=1.+1.8*sin(uT*3.141593)*sin(uT*3.141593);
 vEnergy=reveal*(.16+.3*aSeed.z)*climax*(.55+.7*pulse+.7*wave)*(1.-.25*ease((uT-.84)/.16));
 float nearSide=clamp((mv.z+300.)/100.,0.,1.);
 float edge=1.-.35*pow(abs(aSeed.x*2.-1.),3.);
 vEnergy*=mix(.5,edge*(.65+.35*nearSide),opening*(1.-morph)+morph);
 vMetal=.42+.45*max(0.,dot(normalize(aNormal),normalize(vec3(-.5,.7,1.))))+.10*pow(max(0.,dot(normalize(aNormal),normalize(vec3(.5,.2,1.)))),8.);
 float shade=.57+.25*nearSide+.18*aSeed.z;
 vec3 colour=mix(biome(group),vec3(.7,.77,.84),.12*(1.-opening))*shade;
 vMorph=morph;vColor=mix(colour,vec3(.72,.80,.89)*vMetal,morph);
 }`,
 fragmentShader:`varying vec3 vColor;varying float vEnergy;varying float vMorph;varying float vMetal;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*13.);float halo=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));float coverage=(core*.85+halo*.15);float alpha=coverage*min(.58,vEnergy*1.6);gl_FragColor=vec4(vColor,alpha);
 #include <colorspace_fragment>
 }`});
 const points=new T.Points(geometry,material);points.name='ending-shape-swarm';points.frustumCulled=false;points.visible=false;
 return {points,update(t,time,camera,reduced=false){points.visible=Number.isFinite(t)&&t>0;material.uniforms.uT.value=Number.isFinite(t)?t:0;material.uniforms.uTime.value=time;material.uniforms.uAspect.value=camera.aspect;material.uniforms.uPixels.value=(globalThis.devicePixelRatio||1)*896;material.uniforms.uReduced.value=reduced?1:0;},dispose(){geometry.dispose();material.dispose();}};
}
