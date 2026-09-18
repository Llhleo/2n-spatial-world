import * as T from 'three';
export function atmosphere(scene, mobile) {
  let seed=71821;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const count=mobile?2600:5500, positions=new Float32Array(count*3), sizes=new Float32Array(count);
  for(let i=0;i<count;i++) { positions.set([(random()-.5)*210,(random()-.5)*180,random()*490-70],i*3);sizes[i]=.3+random()*.8; }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('aSize',new T.BufferAttribute(sizes,1));
  const dust=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uPixel:{value:Math.min(devicePixelRatio,1.5)}},vertexShader:`attribute float aSize; uniform float uPixel; varying float fade; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*100.*uPixel/max(1.,-p.z),1.,5.);fade=smoothstep(1.,9.,-p.z)*(1.-smoothstep(90.,280.,-p.z));}`,fragmentShader:`varying float fade;void main(){float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.08,.5,r))*.48*fade;gl_FragColor=vec4(.64,.67,.70,a);}`});
  scene.add(new T.Points(g,dust));
  scene.fog=new T.FogExp2(0x11151a,.006);
  // Three broad, world-fixed wisps. Camera passes through them; no screen overlay.
  const fogMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uOpacity:{value:.30}},vertexShader:`varying vec2 uvW;void main(){uvW=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 uvW;uniform float uOpacity;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=uvW*2.-1.;float edge=smoothstep(1.,.25,length(p));float n=noise(uvW*6.)*.6+noise(uvW*17.)*.25+noise(uvW*43.)*.15;gl_FragColor=vec4(.19,.21,.23,edge*n*uOpacity);}`});
  for(const [x,y,z] of [[-25,8,180],[20,-8,115],[-15,25,65]]){const m=new T.Mesh(new T.PlaneGeometry(220,150),fogMaterial);m.position.set(x,y,z);scene.add(m);}
}
