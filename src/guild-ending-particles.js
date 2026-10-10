import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';
import {createMonument} from './monument.js';
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js';

// Reference study: FrostNovaOrg/world-execute-web engine/swarm.js,
// engine/rig.js, engine/post.js and pre1/phyllo.js. Independently authored:
// staggered morphs, curved travel, depth-aware luminous points and a settling orbit.
export const ENDING_PARTICLE_COUNT=262144;
export function endingFrame(t=0){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 return {reveal:nextSmooth(u/.16),spiral:nextSmooth((u-.12)/.35),glyph:nextSmooth((u-.48)/.36),settle:nextSmooth((u-.82)/.18),orbit:Math.sin(Math.PI*nextSmooth(u))*.61,light:1+1.7*Math.sin(Math.PI*u)**2};
}
export function endingCamera(pose,t){
 const f=endingFrame(t),k=nextSmooth(t/.24),target=[0,30,-14];
 const finalTarget=pose.target.map((v,i)=>T.MathUtils.lerp(v,target[i],k));
 const radius=T.MathUtils.lerp(pose.position[2]-pose.target[2],250,k);
 return {target:finalTarget,position:[T.MathUtils.lerp(pose.position[0],Math.sin(f.orbit)*radius,k),T.MathUtils.lerp(pose.position[1],34+22*Math.sin(Math.PI*t),k),finalTarget[2]+Math.cos(f.orbit)*radius]};
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
  placed.push(best);slots.set(a.id,{position:new T.Vector3(best.x*depth*half*aspect,best.y*depth*half,-depth).applyMatrix4(camera.matrixWorld),phase:index*2.39996});
 }
 return slots;
}
export function endingPetalPoint(a,start,t,time=0,reduced=false,slots=null){
 const f=endingFrame(t),theta=a.longitude+f.spiral*1.6+(reduced?0:time*.09)*f.spiral;
 const ring=54+(a.branch||0)*18+12*a.u;
 const helix=new T.Vector3(Math.cos(theta)*ring,30+Math.sin(theta)*ring*.46,-14+Math.sin(theta)*ring*.62+(a.u-.5)*48);
 const slot=slots?.get(a.id),destination=slot?.position.clone()||helix.clone();
 if(slot&&!reduced)destination.add(new T.Vector3(Math.sin(time*.12+slot.phase)*.8,Math.cos(time*.13+slot.phase)*.8,Math.sin(time*.11+slot.phase)*1.8));
 helix.lerp(destination,nextSmooth((t-.4)/.45));
 const k=nextSmooth((t-.10-(a.u% .2)*.12)/.58);
 return start.map((v,i)=>T.MathUtils.lerp(v,helix.getComponent(i),k));
}
// Sample the exact opening sculpture, retaining its separate superscript n,
// pitched faces, original proportions and thickness. No hand-drawn glyph.
export function createEndingParticles(){
 const geometry=new T.BufferGeometry(),seed=new Float32Array(ENDING_PARTICLE_COUNT*4),glyph=new Float32Array(ENDING_PARTICLE_COUNT*3),normals=new Float32Array(ENDING_PARTICLE_COUNT*3);
 let state=971231;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const monument=createMonument(),box=new T.Box3().setFromObject(monument),center=box.getCenter(new T.Vector3()),point=new T.Vector3(),normal=new T.Vector3();
 const surfaces=monument.children.map(mesh=>{
  const sampler=new MeshSurfaceSampler(mesh).setRandomGenerator(random).build();
  return {sampler,area:sampler.distribution.at(-1)};
 });
 const total=surfaces.reduce((n,s)=>n+s.area,0);
 for(let i=0;i<ENDING_PARTICLE_COUNT;i++){
  seed.set([random(),random(),random(),i%5],i*4);
  let pick=random()*total,surface=surfaces.at(-1);for(const s of surfaces){if(pick<s.area){surface=s;break;}pick-=s.area;}
  surface.sampler.sample(point,normal);point.sub(center);glyph.set(point.toArray(),i*3);normals.set(normal.toArray(),i*3);
 }
 monument.traverse(o=>o.geometry?.dispose());monument.children[0].material.dispose();
 geometry.setAttribute('aNormal',new T.BufferAttribute(normals,3));
 geometry.setAttribute('position',new T.BufferAttribute(glyph,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seed,4));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,toneMapped:false,uniforms:{uT:{value:0},uTime:{value:0},uPixels:{value:896},uAspect:{value:.6},uReduced:{value:0}},
 vertexShader:`attribute vec4 aSeed; attribute vec3 aNormal; uniform float uT,uTime,uPixels,uAspect,uReduced; varying vec3 vColor; varying float vEnergy; varying float vMorph; varying float vMetal;
 float ease(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
 vec3 biome(float i){if(i<.5)return vec3(.48,1.,.66);if(i<1.5)return vec3(1.,.78,.35);if(i<2.5)return vec3(.3,.77,1.);if(i<3.5)return vec3(.65,.95,.3);return vec3(1.,.28,.24);}
 void main(){
 float turn=aSeed.x*6.2831853,depth=aSeed.y,group=aSeed.w;
 float spiral=ease((uT-.12)/.35),morph=ease((uT-.48-aSeed.z*.08)/.28),reveal=ease((uT-aSeed.z*.07)/.12);
 float phase=turn+group*1.256637+uTime*.11*(1.-uReduced)+spiral*2.5;
 float rad=32.+depth*68.,width=max(.65,min(uAspect,1.5));
 vec3 stream=vec3(cos(group*1.256637+depth*5.)*rad*width,30.+(depth-.5)*140.,-14.+sin(group*1.256637+depth*5.)*rad);
 stream+=vec3(sin(turn)*5.,cos(turn)*5.,aSeed.z*10.);
 vec3 helix=vec3(cos(phase)*rad*width,30.+sin(phase)*rad*.43+(depth-.5)*12.,-14.+sin(phase)*rad*.68);
 vec3 p=mix(stream,helix,spiral);
 float sculptureScale=min(1.12,uAspect*1.75);
 vec3 mark=position*sculptureScale+vec3(0.,43.,-14.);
 p=mix(p,mark,morph);
 float arc=sin(morph*3.141593)*(aSeed.z-.5)*16.;p+=vec3(sin(turn),cos(turn),sin(turn*2.))*arc;
 float flow=(1.-morph)*2.2*(1.-uReduced);p+=vec3(sin(p.y*.07+uTime*.23),cos(p.z*.08-uTime*.17),sin(p.x*.06+uTime*.2))*flow;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float px=clamp(uPixels*.55/max(1.,-mv.z),1.,3.5);
 gl_PointSize=px;
 float pulse=pow(max(0.,sin(depth*14.-uT*19.+group)),12.);
 float climax=1.+1.8*sin(uT*3.141593)*sin(uT*3.141593);
 vEnergy=reveal*(.16+.3*aSeed.z)*climax*(.5+1.5*pulse)*(1.-.25*ease((uT-.84)/.16));
 vMetal=.42+.45*max(0.,dot(normalize(aNormal),normalize(vec3(-.5,.7,1.))))+.10*pow(max(0.,dot(normalize(aNormal),normalize(vec3(.5,.2,1.)))),8.);
 vMorph=morph;vColor=mix(biome(group),vec3(.72,.80,.89)*vMetal,morph);
 }`,
 fragmentShader:`varying vec3 vColor;varying float vEnergy;varying float vMorph;varying float vMetal;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*13.);float halo=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));float coverage=(core*.85+halo*.15);float alpha=coverage*min(.07,vEnergy*.12);gl_FragColor=vec4(vColor,alpha);}`});
 const points=new T.Points(geometry,material);points.name='ending-shape-swarm';points.frustumCulled=false;points.visible=false;
 return {points,update(t,time,camera,reduced=false){points.visible=Number.isFinite(t)&&t>0;material.uniforms.uT.value=Number.isFinite(t)?t:0;material.uniforms.uTime.value=time;material.uniforms.uAspect.value=camera.aspect;material.uniforms.uPixels.value=(globalThis.devicePixelRatio||1)*896;material.uniforms.uReduced.value=reduced?1:0;},dispose(){geometry.dispose();material.dispose();}};
}
