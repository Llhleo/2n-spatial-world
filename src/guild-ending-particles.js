import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';
import {createMonument} from './monument.js';
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js';
import {endingDimensionTransforms,endingDimensionFrame} from './guild-ending-frames.js';

// Reference study: FrostNovaOrg/world-execute-web engine/swarm.js,
// engine/rig.js, ch/title/galaxy.js and 02_title.js drawGatherR. Independently authored:
// staggered morphs, curved travel, depth-aware luminous points and a settling orbit.
export const ENDING_PARTICLE_COUNT=262144;
// Irregular overlapping cloud volumes. Biome hues favour regions but spill
// across their neighbours; no five-fold silhouette or planar galaxy disk.
export function endingNebulaPoint(u,v,w,group){
 const cluster=(group+(u>.8?1:0))%3,centres=[[-18,-28,-8],[17,1,17],[-8,32,-20]],c=centres[cluster];
 const angle=u*Math.PI*2+group*.37,yy=v*2-1,xz=Math.sqrt(Math.max(0,1-yy*yy));
 const radius=27*Math.pow(w,.55)*(.92+.17*Math.sin(angle*3+yy*4));
 return [c[0]+Math.cos(angle)*xz*radius*.82,c[1]+yy*radius*1.12,c[2]+Math.sin(angle)*xz*radius];
}
// A broad dust volume crosses the dimensional scaffold. Movement is keyed to
// playback progress, not elapsed wall time, so scrubbing and replay agree.
export function endingTransitPoint(u,v,w,group,t,reduced=false){
 const phase=(reduced?.25:Math.max(0,Math.min(1,Number.isFinite(t)?t:0)))*24;
 return [(u*2-1)*32+Math.sin(v*5+phase*.8)*8,
  (v*2-1)*33+Math.sin(u*Math.PI*2+phase+group*.7)*10,
  (w*2-1)*32+Math.sin(u*4+v*3-phase*1.25+group*.7)*18];
}
export function endingFrame(t=0){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 return {reveal:nextSmooth(u/.14),cloud:nextSmooth(u/(3/18)),dimension:nextSmooth((u-3/18)/.14),glyph:nextSmooth((u-8.5/18)/(4/18)),settle:nextSmooth((u-12.5/18)/.12),orbit:(-.12+.38*nextSmooth((u-.10)/.34))*(1-nextSmooth((u-8.5/18)/(4/18))),light:1+1.7*Math.sin(Math.PI*u)**2};
}
export function endingCamera(pose,t,reduced=false){
 const f=endingFrame(t),k=nextSmooth(t/.24),target=[0,30,-14];
 const finalTarget=pose.target.map((v,i)=>T.MathUtils.lerp(v,target[i],k));
 const radius=T.MathUtils.lerp(pose.position[2]-pose.target[2],250,k);
 const orbit=reduced?0:f.orbit;
 return {target:finalTarget,position:[T.MathUtils.lerp(pose.position[0],Math.sin(orbit)*radius,k),T.MathUtils.lerp(pose.position[1],34+(reduced?0:18*Math.sin(Math.PI*t)),k),finalTarget[2]+T.MathUtils.lerp(pose.position[2]-pose.target[2],Math.cos(orbit)*radius,k)]};
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
 const cloud=new T.Vector3(Math.cos(theta)*radius*.72*fit,30+Math.sin(theta)*radius*.75,-14+Math.sin(a.longitude*2)*45);
 const destination=slot?.position.clone()||cloud.clone();
 if(slot&&!reduced)destination.add(new T.Vector3(Math.sin(time*.12+slot.phase)*.8,Math.cos(time*.13+slot.phase)*.8,Math.sin(time*.11+slot.phase)*1.8));
 cloud.lerp(destination,nextSmooth((t-8.5/18)/(4/18)));
 const k=f.cloud;
 return start.map((v,i)=>T.MathUtils.lerp(v,cloud.getComponent(i),k));
}
// Sample the exact opening sculpture, retaining its separate superscript n,
// pitched faces, original proportions and thickness. No hand-drawn glyph.
export function createEndingParticles(){
 const geometry=new T.BufferGeometry(),seed=new Float32Array(ENDING_PARTICLE_COUNT*4),glyph=new Float32Array(ENDING_PARTICLE_COUNT*3),normals=new Float32Array(ENDING_PARTICLE_COUNT*3),cloud=new Float32Array(ENDING_PARTICLE_COUNT*3);
 let state=971231;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const monument=createMonument(),box=new T.Box3().setFromObject(monument),center=box.getCenter(new T.Vector3()),point=new T.Vector3(),normal=new T.Vector3();
 const surfaces=monument.children.map(mesh=>{
  const sampler=new MeshSurfaceSampler(mesh).setRandomGenerator(random).build();
  return {sampler,area:sampler.distribution.at(-1)};
 });
 const total=surfaces.reduce((n,s)=>n+s.area,0);
 for(let i=0;i<ENDING_PARTICLE_COUNT;i++){
  seed.set([random(),random(),random(),i%5],i*4);
  cloud.set(endingNebulaPoint(seed[i*4],seed[i*4+1],seed[i*4+2],i%5),i*3);
  let pick=random()*total,surface=surfaces.at(-1);for(const s of surfaces){if(pick<s.area){surface=s;break;}pick-=s.area;}
  surface.sampler.sample(point,normal);point.sub(center);glyph.set(point.toArray(),i*3);normals.set(normal.toArray(),i*3);
 }
 monument.traverse(o=>o.geometry?.dispose());monument.children[0].material.dispose();
 geometry.setAttribute('aNormal',new T.BufferAttribute(normals,3));
 geometry.setAttribute('aCloud',new T.BufferAttribute(cloud,3));
 geometry.setAttribute('position',new T.BufferAttribute(glyph,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seed,4));
 // Ordinary alpha blending bounds dense crossings to the palette; visibility
 // comes from wider bright cores, not unbounded additive accumulation.
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,toneMapped:false,uniforms:{uT:{value:0},uTime:{value:0},uPixels:{value:896},uAspect:{value:.6},uReduced:{value:0},uFrameInverse:{value:[new T.Matrix4(),new T.Matrix4(),new T.Matrix4()]},uFramePulse:{value:0}},
 vertexShader:`attribute vec4 aSeed; attribute vec3 aNormal,aCloud; uniform float uT,uTime,uPixels,uAspect,uReduced,uFramePulse; uniform mat4 uFrameInverse[3]; varying vec3 vColor; varying float vEnergy; varying float vMorph; varying float vMetal;
 float ease(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
 vec3 biome(float i){if(i<.5)return vec3(.48,1.,.66);if(i<1.5)return vec3(1.,.78,.35);if(i<2.5)return vec3(.3,.77,1.);if(i<3.5)return vec3(.65,.95,.3);return vec3(1.,.28,.24);}
 void main(){
 float turn=aSeed.x*6.2831853,depth=aSeed.y,group=aSeed.w;
 float establish=ease(uT/.1666667);
 // The dimensional volume yields to the sculpture in a staggered wave.
 float distanceKey=clamp(length(aCloud)/65.,0.,1.);
 float morph=ease((uT-.4722222-distanceKey*.035)/.1872222),reveal=ease((uT-aSeed.z*.05)/.10);
 float remnant=step(.965,aSeed.x),gather=morph*(1.-remnant);
 float fit=min(1.,uAspect/.6);
 float motion=1.-uReduced;
 vec3 p=aCloud*mix(1.16,1.,establish);
 float sceneTime=uT*18.;
 vec3 billow=vec3(sin(p.y*.065+sceneTime*.13)*cos(p.z*.055),sin(p.z*.07-sceneTime*.11)*cos(p.x*.05),sin(p.x*.065+sceneTime*.12)*cos(p.y*.055));
 p+=billow*3.5*motion;
 float travel=mix(.25,min(uT,.4722222),motion)*24.;
 vec3 transit=vec3((aSeed.x*2.-1.)*32.+sin(aSeed.y*5.+travel*.8)*8.,
  (aSeed.y*2.-1.)*33.+sin(aSeed.x*6.2831853+travel+group*.7)*10.,
  (aSeed.z*2.-1.)*32.+sin(aSeed.x*4.+aSeed.y*3.-travel*1.25+group*.7)*18.);
 float dimension=ease((uT-.1666667-aSeed.z*.035)/.105)*(1.-remnant);
 p=mix(p,transit,dimension);
 p.x*=fit;p+=vec3(0.,30.,-14.);
 float sculptureScale=min(1.12,uAspect*1.75);
 vec3 mark=position*sculptureScale+vec3(0.,43.,-14.);
 p=mix(p,mark,gather);
 float arc=sin(gather*3.141593)*(10.+aSeed.z*12.);p+=vec3(-sin(turn)*fit,cos(turn),sin(turn*2.)*.7)*arc;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float star=step(.955,aSeed.y);
 float px=clamp(uPixels*mix(.72,1.1,max(star,gather))/max(1.,-mv.z),1.8,8.);
 gl_PointSize=px;
 float front=mix(-48.,48.,ease((uT-.12)/.15));
 float wave=exp(-pow((aCloud.z-front)/12.,2.))*(1.-ease((uT-.25)/.08));
 // Bounded cube SDF: closest finite face, measured in each visible frame's
 // actual local coordinates. Off-face points do not light an infinite plane.
 float passage=0.;for(int i=0;i<3;i++){
  vec3 local=(uFrameInverse[i]*vec4(p,1.)).xyz;
  vec3 q=abs(local)-vec3(1.);
  float faceDistance=length(max(q,vec3(0.)))+min(max(q.x,max(q.y,q.z)),0.);
  passage=max(passage,exp(-pow(faceDistance/.12,2.)));
 }
 passage*=uFramePulse*dimension*(1.-morph);
 float pulse=pow(max(0.,cos(depth*9.-sceneTime*.6*motion-group*.5)),12.);
 float climax=1.+1.8*sin(uT*3.141593)*sin(uT*3.141593);
 float pockets=.22+.78*smoothstep(-.4,.7,sin(aCloud.x*.13+aCloud.y*.08)+.6*cos(aCloud.z*.16-aCloud.y*.06));
 vEnergy=reveal*(.16+.3*aSeed.z)*climax*(.55+.55*pulse+1.1*wave+.7*passage);
 float nearSide=clamp((mv.z+300.)/100.,0.,1.);
 vEnergy*=mix(pockets*(.65+.35*nearSide)+star*.55,.75,gather);
 vEnergy*=1.-remnant*morph*.82;
 vMetal=.42+.45*max(0.,dot(normalize(aNormal),normalize(vec3(-.5,.7,1.))))+.10*pow(max(0.,dot(normalize(aNormal),normalize(vec3(.5,.2,1.)))),8.);
 float shade=.36+.28*nearSide+.22*pockets+.14*aSeed.z;
 vec3 colour=mix(biome(group),vec3(.75,.82,.9),star*.25)*shade;
 vMorph=gather;vColor=mix(colour,vec3(.72,.80,.89)*vMetal,gather);
 }`,
 fragmentShader:`varying vec3 vColor;varying float vEnergy;varying float vMorph;varying float vMetal;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*13.);float halo=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));float coverage=(core*.85+halo*.15);float alpha=coverage*min(.58,vEnergy*1.6);gl_FragColor=vec4(vColor,alpha);
 #include <colorspace_fragment>
 }`});
 const points=new T.Points(geometry,material);points.name='ending-shape-swarm';points.frustumCulled=false;points.visible=false;
 return {points,update(t,time,camera,reduced=false){points.visible=Number.isFinite(t)&&t>0;material.uniforms.uT.value=Number.isFinite(t)?t:0;material.uniforms.uTime.value=time;material.uniforms.uAspect.value=camera.aspect;material.uniforms.uPixels.value=(globalThis.devicePixelRatio||1)*896;material.uniforms.uReduced.value=reduced?1:0;
  endingDimensionTransforms(t,camera.aspect,reduced).forEach((matrix,i)=>material.uniforms.uFrameInverse.value[i].copy(matrix).invert());material.uniforms.uFramePulse.value=endingDimensionFrame(t,reduced).visibility;
 },dispose(){geometry.dispose();material.dispose();}};
}
