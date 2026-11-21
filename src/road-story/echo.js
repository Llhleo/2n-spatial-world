import * as T from 'three';
import {PARTICLE_ENDING_SECONDS} from '../guild-next-route.js';
import {sampleRoadCamera,smooth} from './path.js';
import paths from './echo-paths.json' with {type:'json'};

const LEAD=1.65, DURATION=PARTICLE_ENDING_SECONDS, SCALE=19;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const UP=V(0,1,0);
const beadFade=[4.17,5.58,3.72], beadFadeSeconds=.67;
export const ECHO_LIGHTS_FINISH=6.65;

function sample([knots,c],t,target=new T.Vector3()){
 let i=0;
 while(i<knots.length-2&&t>knots[i+1])i++;
 const u=t-knots[i];
 const a=c[0][i],b=c[1][i],v=c[2][i],p=c[3][i];
 return target.set(((a[0]*u+b[0])*u+v[0])*u+p[0],
  ((a[1]*u+b[1])*u+v[1])*u+p[1],((a[2]*u+b[2])*u+v[2])*u+p[2]);
}
export function echoTiming(nextT){
 const seconds=T.MathUtils.clamp(nextT,0,1)*DURATION;
 return {seconds,storyBlend:smooth(seconds/LEAD),time:Math.max(0,seconds-LEAD)};
}

function leadCurve(from,to,tangent,acceleration,u,target){
 const u3=u*u*u;
 return target.copy(from).lerp(to,smooth(u))
  .addScaledVector(tangent,LEAD*u3*(-4+u*(7-3*u)))
  .addScaledVector(acceleration,.5*LEAD*LEAD*u3*(1-u)**2);
}

function cameraTime(time){
 const distance=1.35,end=paths.eye[0].at(-1),start=end-distance;
 if(time<=start)return time;
 const duration=2*distance;
 const u=Math.min(1,(time-start)/duration);
 return start+duration*(u-u**3+.5*u**4);
}

function prng(seed){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
const vertexShader=`
 uniform float time, fit, perspective; attribute vec4 seed; attribute vec3 flow;
 varying vec3 vColor; varying float vEnergy;

 void main(){
  float group=seed.x, u=fract(seed.y+time*(.107+.028*flow.x)), across=seed.z, grain=seed.w;
  float a=group==0.?1.54:group==1.?.24:group==2.?-.95:group==3.?-2.25:2.74;
  float l=3.26+.24*sin(group*1.53+1.4), breadth=pow(max(0.,sin(3.14159*pow(u,.90))),.78)*(1.+.10*cos(group*1.13));
  float r=.46+l*u, theta=a+.15*sin(3.14159*u+group*.7);
  float side=breadth*across+.33*sin(group*1.7)*pow(u,1.55)+.12*sin(u*3.8+group)*u;
  float fold=(.4*across*across+.17*sin(across*8.+5.*u+group))*sin(3.14159*u);
  vec3 p=vec3(cos(theta)*r-sin(theta)*side,sin(theta)*r+cos(theta)*side,
      -.41-1.36*sin(3.14159*u)+(.30+.60*flow.y)*u*u+fold+flow.z*.12);
  p.x+=.04*sin(5.1*u+time*.72+group);p.z+=.053*sin(u*13.-1.35*time+group*.87);
  float gate=group==0.?3.05:group==1.?3.9:group==2.?2.35:group==3.?.15:2.9;
  float lit=smoothstep(gate+.1+u*1.82,gate+2.4+u*2.42,time);
  float band=pow(max(0.,cos(14.*u-2.9*time+floor((across+1.)*26.)*.10+group*.88)),9.);
  float pulseOffset=(u-(time-11.72)/1.57)/.13;
  float pulse=exp(-pulseOffset*pulseOffset)*smoothstep(11.64,12.05,time)*(1.-smoothstep(13.,13.56,time));
  float silhouette=smoothstep(.008,.13,u)*(1.-smoothstep(.94,.999,u));
  float reveal=mix(.085*smoothstep(.15,1.6,time),1.,lit);
  vEnergy=silhouette*reveal*(.32+.52*grain*grain+.34*band+.57*pulse+.23*pow(abs(across),7.));
  vColor=group==0.?vec3(.68,.81,.96):group==1.?vec3(.96,.68,.59):
    group==2.?vec3(.66,.85,.78):group==3.?vec3(.94,.82,.65):vec3(.63,.77,.74);
  vColor=mix(vColor,vec3(1.,.84,.62),pulse*.43);
  p.x*=fit;
  vec4 q=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*q;
  gl_PointSize=clamp(perspective*(.52+grain*.40)/max(1.,-q.z),1.15,4.25);
 }`;
const fragmentShader=`
 varying vec3 vColor; varying float vEnergy;
 void main(){
  float r=length(gl_PointCoord-.5)*2.;
  float profile=exp(-r*r*2.6)*(1.-smoothstep(.60,1.,r));
  float alpha=1.-exp(-1.32*profile*vEnergy);
  gl_FragColor=vec4(vColor,alpha);
 }`;
const dustVertex=`
 uniform float perspective, diameter, maxSize;
 varying float depthFade;
#ifdef THREAD
 attribute float life;
#endif
 void main(){
  vec4 q=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*q;
  gl_PointSize=clamp(perspective*diameter/max(1.,-q.z),1.05,maxSize);
  depthFade=smoothstep(9.,31.,-q.z);
#ifdef THREAD
  depthFade*=life;
#endif
 }`;
const dustFragment=`
 uniform vec3 tint;
 uniform float opacity;
 varying float depthFade;
 void main(){
  float r=length(gl_PointCoord-.5)*2.;
  float alpha=exp(-r*r*3.1)*(1.-smoothstep(.55,1.,r));
  gl_FragColor=vec4(tint,alpha*opacity*depthFade);
 }`;

function softPoints(geometry,perspective,tint,diameter,maxSize){
 const material=new T.ShaderMaterial({vertexShader:dustVertex,fragmentShader:dustFragment,
  uniforms:{perspective,tint:{value:new T.Vector3(...tint)},diameter:{value:diameter},maxSize:{value:maxSize},opacity:{value:0}},
  transparent:true,depthWrite:false,toneMapped:false});
 return new T.Points(geometry,material);
}

export function createFiveRealmEcho(renderer){
 const group=new T.Group();
 group.name='five-realm-echo';
 const rng=prng(248), count=matchMedia('(max-width: 700px)').matches?29000:36000;
 const seeded=new Float32Array(count*4), flow=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const track=Math.floor(rng()*52)/51*2-1;
  seeded.set([i%5,rng(),track+.009*(rng()-.5),rng()],i*4);
  flow.set([rng(),rng(),rng()-.5],i*3);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));
 geometry.setAttribute('seed',new T.BufferAttribute(seeded,4));
 geometry.setAttribute('flow',new T.BufferAttribute(flow,3));
 const uniforms={time:{value:0},fit:{value:1},perspective:{value:1}};
 const points=new T.Points(geometry,new T.ShaderMaterial({
  uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,
  toneMapped:false,
 }));
 points.frustumCulled=false;
 group.add(points);
 const streamCount=3200, particlePosition=new Float32Array(streamCount*3);
 const streamSeeds=Array.from({length:streamCount},()=>[rng(),rng(),rng()]);
 const streams=new T.BufferGeometry();
 streams.setAttribute('position',new T.BufferAttribute(particlePosition,3).setUsage(T.DynamicDrawUsage));
 const threadLife=new T.BufferAttribute(new Float32Array(streamCount),1).setUsage(T.DynamicDrawUsage);
 streams.setAttribute('life',threadLife);
 const thread=softPoints(streams,uniforms.perspective,[1,.75,.46],.43,3.3);
 thread.material.defines.THREAD=1;
 thread.frustumCulled=false;
 group.add(thread);
 const dustPos=new Float32Array(1800*3);
 for(let i=0;i<dustPos.length;i+=3)dustPos.set([24*(rng()-.5),26*(rng()-.5),-8+14*rng()],i);
 const dustGeometry=new T.BufferGeometry();
 dustGeometry.setAttribute('position',new T.BufferAttribute(dustPos,3));
 const dust=softPoints(dustGeometry,uniforms.perspective,[.37,.46,.56],.26,2.25);
 group.add(dust);
 const pollenGeo=new T.BufferGeometry(), pollenData=new Float32Array(1900*3);
 const pollenSeeds=Array.from({length:1900},()=>[rng(),rng(),rng()]);
 pollenGeo.setAttribute('position',new T.BufferAttribute(pollenData,3).setUsage(T.DynamicDrawUsage));
 const pollen=softPoints(pollenGeo,uniforms.perspective,[.96,.74,.47],.49,3.6);
 pollen.frustumCulled=false;group.add(pollen);
 // Upload and compile the ending particles during the existing offscreen warmup.
 for(const layer of group.children)layer.userData.warmup=true;
 const initialEye=sample(paths.eye,0), initialFocus=sample(paths.focus,0);
 const facing=new T.Matrix4().lookAt(initialEye,initialFocus,UP);
 const localOrientation=new T.Quaternion().setFromRotationMatrix(facing);
 const orientation=new T.Quaternion();
 const align=localOrientation.clone().invert();
 const entryVelocity=V(...paths.eye[1][2][0]).multiplyScalar(SCALE);
 const entryAcceleration=V(...paths.eye[1][1][0]).multiplyScalar(2*SCALE);
 const endEye=new T.Vector3(), startEye=new T.Vector3(), worldVelocity=new T.Vector3(), worldAcceleration=new T.Vector3();
 const eye=new T.Vector3(), focus=new T.Vector3(), target=new T.Vector3();
 const quaternion=new T.Quaternion(), curveMatrix=new T.Matrix4();
 const viewSize=new T.Vector2(), fitDepth=new T.Vector3();

 // The incoming lanes are authored in the same world frame as the roads.
 // The first position and tangent of each spline match its road lane.
 function sampleLight(seconds,lane,out){
  const path=paths.beads[lane];
  return sample(path,Math.min(seconds,path[0].at(-1)),out);
 }
 const lightCue={seconds:0,storyBlend:0,sampleLight,
  lightStart:lane=>paths.beads[lane][0][0],
  lightOpacity:(seconds,lane)=>1-smooth((seconds-beadFade[lane])/beadFadeSeconds)};

 let lastEntry,lastPose;
 function cameraStart(entry){
  if(!lastEntry||entry.position.some((v,i)=>v!==lastEntry[i])){
   lastEntry=entry.position.slice();lastPose=sampleRoadCamera(36,entry);
  }
  return lastPose;
 }

 function update(camera,entry,nextT,reduced){
  const {seconds,storyBlend,time}=echoTiming(nextT);
  group.visible=true;
  const start=cameraStart(entry);
  startEye.fromArray(start.position);
  quaternion.fromArray(start.quaternion);
  orientation.copy(quaternion).multiply(align);
  endEye.copy(startEye).add(V(0,-13,-58).applyQuaternion(quaternion));
  group.position.copy(endEye).sub(eye.copy(initialEye).multiplyScalar(SCALE).applyQuaternion(orientation));
  group.quaternion.copy(orientation);group.scale.setScalar(SCALE);
  group.updateMatrixWorld(true);
  const lookTime=seconds<LEAD?seconds-LEAD:cameraTime(time);
  const fit=T.MathUtils.clamp(camera.aspect/.5625,.64,1);
  uniforms.fit.value=fit;
  sample(paths.eye,lookTime,eye).applyMatrix4(group.matrixWorld);
  sample(paths.focus,lookTime,focus).applyMatrix4(group.matrixWorld);
  if(seconds<LEAD){
   worldVelocity.copy(entryVelocity).applyQuaternion(orientation);
   worldAcceleration.copy(entryAcceleration).applyQuaternion(orientation);
   leadCurve(startEye,endEye,worldVelocity,worldAcceleration,seconds/LEAD,camera.position);
  }else camera.position.copy(eye);
  curveMatrix.lookAt(eye,focus,fitDepth.copy(UP).applyQuaternion(orientation));
  camera.quaternion.setFromRotationMatrix(curveMatrix).slerp(quaternion,1-storyBlend);
  if(!reduced)camera.rotateZ(-.075*Math.sin(Math.PI*smooth((time-2)/7.4)));
  camera.fov=T.MathUtils.lerp(start.fov,42,storyBlend);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  uniforms.time.value=time;
  uniforms.perspective.value=renderer.getDrawingBufferSize(viewSize).y/(2*Math.tan(T.MathUtils.degToRad(camera.fov*.5)));
  points.visible=time>0;
  group.userData.time=time;
  dust.visible=seconds>.04;
  dust.material.uniforms.opacity.value=.22*storyBlend;
  // Keep the warm thread readable as the leader enters the first petal.
  const current=smooth((time-.12)/.61)*(1-smooth((time-3.6)/2.8));
  thread.visible=current>.001;
  if(thread.visible){
   thread.material.uniforms.opacity.value=.32*current;
   for(let i=0;i<streamSeeds.length;i++){
    const [phase,a,b]=streamSeeds[i],u=(phase+time*.167)%1, width=.046+.11*Math.sin(u*Math.PI);
    sample(paths.thread,u,target);
    streams.attributes.position.setXYZ(i,target.x*fit+(a-.5)*width,target.y+(b-.5)*width,target.z+Math.sin(u*25+a)*width*.42);
    threadLife.setX(i,smooth(u/.075)*smooth((1-u)/.11));
   }
   streams.attributes.position.needsUpdate=true;
   threadLife.needsUpdate=true;
  }
  const pollenOpacity=.51*smooth((time-2.7)/2.9)*(1-.19*smooth((time-10.6)/3));
  pollen.material.uniforms.opacity.value=pollenOpacity;
  pollen.visible=pollenOpacity>.001;
  if(pollen.visible){
   for(let i=0;i<pollenSeeds.length;i++){
    const [a,b,c]=pollenSeeds[i],phase=a*Math.PI*2+time*(.31+.18*b),radius=.08+.59*b**.83;
    pollenGeo.attributes.position.setXYZ(i,radius*Math.cos(phase),radius*.88*Math.sin(phase),-.22+(c-.5)*.39+.21*Math.sin(phase*2+a*2.7));
   }
   pollenGeo.attributes.position.needsUpdate=true;
  }
  lightCue.seconds=seconds;
  lightCue.storyBlend=storyBlend;
  return lightCue;
 }
 group.visible=false;
 return {group,update,roadLights:{...lightCue}};
}
