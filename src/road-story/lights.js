import * as T from 'three';
import {lightStage,lightTrackPoint} from './path.js';

// One closed centerline, three time offsets. Every visible layer depth-tests.
export function createLightTravelers(){
 const group=new T.Group();group.name='three-light-travelers';
 const flares=[],tails=[],lights=[],N=36,SIDES=6;
 const flareMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,uniforms:{color:{value:new T.Color(1,.66,.26)}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec3 color;void main(){vec2 p=(v-.5)*2.;float r=length(p);float core=exp(-r*r*70.);float glow=exp(-r*r*6.)*.4;float rays=exp(-abs(p.x)*38.)*exp(-abs(p.y)*3.)*.16+exp(-abs(p.y)*38.)*exp(-abs(p.x)*3.)*.16;gl_FragColor=vec4(mix(color,vec3(1.),core),min(1.,core+glow+rays));}'});
 const tailMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,vertexShader:'attribute float life;varying float age;void main(){age=life;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float age;void main(){float a=pow(age,1.7)*.65;gl_FragColor=vec4(1.,.61+.27*age,.19+.65*age,a);}'});
 for(let i=0;i<3;i++){
  const flare=new T.Mesh(new T.PlaneGeometry(8,8),flareMaterial);flare.frustumCulled=false;group.add(flare);flares.push(flare);
  const geometry=new T.BufferGeometry(),positions=new Float32Array((N+1)*SIDES*3),life=new Float32Array((N+1)*SIDES),indices=[];
  for(let k=0;k<=N;k++)for(let j=0;j<SIDES;j++){life[k*SIDES+j]=k/N;if(k<N){const a=k*SIDES+j,b=k*SIDES+(j+1)%SIDES;indices.push(a,b,a+SIDES,b,b+SIDES,a+SIDES);}}
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('life',new T.BufferAttribute(life,1));geometry.setIndex(indices);
  const tail=new T.Mesh(geometry,tailMaterial);tail.frustumCulled=false;group.add(tail);tails.push(tail);
  const light=new T.PointLight(0xffd19a,950,80,2);group.add(light);lights.push(light);
 }
 const point=new T.Vector3(),next=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),normal=new T.Vector3(),z=new T.Vector3(0,0,1);
 function update(time,seconds,camera,reduced=false){
  const stage=lightStage(seconds),a=Math.min(1,Math.floor(stage)),b=a+1,mix=stage-a;
  const at=(u,out)=>out.copy(lightTrackPoint(a,u)).lerp(lightTrackPoint(b,u),mix);
  const rootRotation=new T.Quaternion();group.getWorldQuaternion(rootRotation);rootRotation.invert();
  for(let i=0;i<3;i++){
   const u=time*(reduced?.012:.025)+i/3;
   at(u,point);flares[i].position.copy(point);flares[i].quaternion.copy(rootRotation).multiply(camera.quaternion);lights[i].position.copy(point);
   const pos=tails[i].geometry.attributes.position;
   for(let k=0;k<=N;k++){
    const life=k/N,phase=u-(1-life)*.055;at(phase,point);at(phase+.0006,next);tangent.copy(next).sub(point).normalize();side.crossVectors(tangent,z).normalize();if(side.lengthSq()<.01)side.set(1,0,0);normal.crossVectors(tangent,side).normalize();
    const radius=.06+.43*life;
    for(let j=0;j<SIDES;j++){const angle=j/SIDES*Math.PI*2;pos.setXYZ(k*SIDES+j,point.x+side.x*Math.cos(angle)*radius+normal.x*Math.sin(angle)*radius,point.y+side.y*Math.cos(angle)*radius+normal.y*Math.sin(angle)*radius,point.z+side.z*Math.cos(angle)*radius+normal.z*Math.sin(angle)*radius);}
   }pos.needsUpdate=true;
  }
 }
 return {group,update,dispose(){flares.forEach(m=>m.geometry.dispose());tails.forEach(m=>m.geometry.dispose());flareMaterial.dispose();tailMaterial.dispose();group.clear();}};
}
