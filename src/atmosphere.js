import * as T from 'three';
import {pose} from './journey.js';
export function dustData(mobile) {
  let seed=71821;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const count=mobile?6200:11000, positions=new Float32Array(count*3), sizes=new Float32Array(count);
  const camera=new T.PerspectiveCamera(), point=new T.Vector3();
  for(let i=0;i<count;i++) {
    if(i<count*.48) {
      positions.set([(random()-.5)*210,(random()-.5)*180,random()*490-70],i*3);
      sizes[i]=.35+random()*.6;
    } else {
      // Bake dust around the flight corridor once. Never move/recycle it with camera.
      pose(random()*.82,camera,false);
      const close=i>count*.94;
      const radius=close?2+random()*5:8+Math.sqrt(random())*36;
      const angle=random()*Math.PI*2;
      point.set(Math.cos(angle)*radius,Math.sin(angle)*radius,-4-random()*30);
      point.applyQuaternion(camera.quaternion).add(camera.position);
      positions.set(point.toArray(),i*3);
      sizes[i]=close?1.1+random()*.5:.5+random()*.65;
    }
  }
  return {count,positions,sizes};
}
export function atmosphere(scene, mobile) {
  const {positions,sizes}=dustData(mobile);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('aSize',new T.BufferAttribute(sizes,1));
  const dust=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uPixel:{value:Math.min(devicePixelRatio,1.5)}},vertexShader:`attribute float aSize; uniform float uPixel; varying float fade; varying float brightness; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*165.*uPixel/max(1.,-p.z),1.35*uPixel,7.*uPixel);fade=smoothstep(.3,2.2,-p.z)*(1.-smoothstep(150.,320.,-p.z));brightness=mix(.55,.88,smoothstep(.7,1.5,aSize));}`,fragmentShader:`varying float fade;varying float brightness;void main(){vec2 p=(gl_PointCoord-.5)*vec2(1.,1.15);float r=length(p);float a=(1.-smoothstep(.12,.5,r))*.72*fade;gl_FragColor=vec4(vec3(brightness),a);}`});
  scene.add(new T.Points(g,dust));
  scene.fog=new T.FogExp2(0x11151a,.006);
  // Three broad, world-fixed wisps. Camera passes through them; no screen overlay.
  const fogMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uOpacity:{value:.30}},vertexShader:`varying vec2 uvW;void main(){uvW=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 uvW;uniform float uOpacity;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=uvW*2.-1.;float edge=smoothstep(1.,.25,length(p));float n=noise(uvW*6.)*.6+noise(uvW*17.)*.25+noise(uvW*43.)*.15;gl_FragColor=vec4(.19,.21,.23,edge*n*uOpacity);}`});
  for(const [x,y,z] of [[-25,8,180],[20,-8,115],[-15,25,65]]){const m=new T.Mesh(new T.PlaneGeometry(220,150),fogMaterial);m.position.set(x,y,z);scene.add(m);}
}
