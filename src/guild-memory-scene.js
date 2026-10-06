import * as T from 'three';
import {createMemoryLayout} from './guild-memory-layout.js';

export function createMemoryScene({mobile=true}={}){
 const group=new T.Group();group.name='guild-memory-corridor';group.visible=false;
 const pools=new Map(),owned=[],sources=new Map();let layout=null,preview=0,time=0,disposed=false;
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),point=new T.Vector3(),center=new T.Vector3();
 const palette=[0xe8e4cb,0xb43b48,0xe4d1a0];
 const ambient=new T.AmbientLight(0x899bb4,.95);group.add(ambient);
 const key=new T.DirectionalLight(palette[0],2.1);key.position.set(-28,35,55);group.add(key);
 const fill=new T.DirectionalLight(0x596e92,.9);fill.position.set(30,-12,-30);group.add(fill);
 const dustCount=mobile?240:480,positions=new Float32Array(dustCount*3),brightness=new Float32Array(dustCount);let seed=260206;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<dustCount;i++){positions.set([(random()-.5)*130,(random()-.5)*100,-random()*180],i*3);brightness[i]=.25+random()*.5;}
 const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3));dustGeometry.setAttribute('aLight',new T.BufferAttribute(brightness,1));
 const dustMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new T.Color(palette[0])}},vertexShader:'attribute float aLight;varying float lit;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(130./max(1.,-p.z),1.,3.);lit=aLight;}',fragmentShader:'uniform vec3 color;varying float lit;void main(){float a=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(color,a*lit*.6);}'});
 group.add(new T.Points(dustGeometry,dustMaterial));owned.push(dustGeometry,dustMaterial);
 for(let i=0;i<3;i++){
  const geometry=new T.PlaneGeometry(16,190),material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{color:{value:new T.Color(palette[0])}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec3 color;void main(){float edge=pow(max(0.,1.-abs(v.x-.5)*2.),3.);float end=smoothstep(0.,.2,v.y)*(1.-smoothstep(.7,1.,v.y));gl_FragColor=vec4(color,edge*end*.028);}'});
  const beam=new T.Mesh(geometry,material);beam.position.set(-35+i*35,5,-60-i*15);beam.rotation.z=-.45;group.add(beam);owned.push(geometry,material);
 }
 function install(source,kind,name){
  if(disposed||!source?.geometry||!source?.material)return;
  const id=`${kind}:${name}`;if(sources.has(id))return;
  source.geometry.computeBoundingSphere();source.geometry.computeBoundingBox();
  const sphere=source.geometry.boundingSphere,dimensions=source.geometry.boundingBox.getSize(new T.Vector3());
  if(!sphere||!Number.isFinite(sphere.radius)||sphere.radius<=0)return;
  const normal=dimensions.y<Math.min(dimensions.x,dimensions.z)?new T.Vector3(0,1,0):dimensions.x<dimensions.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  sources.set(id,{source,center:sphere.center.clone(),factor:1.4/sphere.radius,face:new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1))});
  layout=null;
 }
 function prepare(){
  if(disposed||layout)return;
  for(const pool of pools.values()){group.remove(pool.mesh);pool.mesh.dispose();pool.material.dispose();}pools.clear();
  layout=createMemoryLayout({mobile,assets:[...sources.keys()].map(key=>({key,radius:1.4}))});
  for(const [id,asset] of sources){
   const anchors=layout.anchors.filter(a=>a.key===id);if(!anchors.length)continue;
   const material=asset.source.material.clone();const mesh=new T.InstancedMesh(asset.source.geometry,material,anchors.length);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.name=`memory-${id}`;group.add(mesh);pools.set(id,{...asset,mesh,material,anchors});
  }
 }
 function setPreview(index){preview=Math.max(0,Math.min(2,Math.round(index)||0));}
 function update(state,camera,dt=0){
  if(disposed)return;prepare();group.visible=!!layout?.anchors.length;time+=Math.min(.05,Math.max(0,dt));
  const index=Number.isInteger(state?.eventIndex)?Math.max(0,Math.min(2,state.eventIndex)):preview,shot=layout.shots[index];
  camera.position.fromArray(shot.position);camera.up.set(0,1,0);camera.lookAt(...shot.target);camera.updateMatrixWorld();
  key.color.setHex(palette[index]);dustMaterial.uniforms.color.value.setHex(palette[index]);
  for(const child of group.children)if(child.material?.uniforms?.color)child.material.uniforms.color.value.setHex(palette[index]);
  for(const pool of pools.values()){
   let count=0;
   for(const a of pool.anchors){point.fromArray(a.positions[index]);point.y+=Math.sin(time*.55+a.u*6+a.branch)*.12;
    const projection=point.clone().project(camera),depth=point.clone().applyMatrix4(camera.matrixWorldInverse).z;
    const pad=a.radius/Math.max(1,-depth)*2.5;
    if(state?.showText&&Math.abs(projection.x)<.76+pad&&Math.abs(projection.y)<.4+pad)continue;
    rotation.copy(camera.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(.10*Math.sin(a.u*9),a.twist,a.twist))).multiply(pool.face);
    scale.setScalar(pool.factor);matrix.compose(point,rotation,scale);matrix.multiply(new T.Matrix4().makeTranslation(-pool.center.x,-pool.center.y,-pool.center.z));pool.mesh.setMatrixAt(count++,matrix);
   }
   pool.mesh.count=count;pool.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 return {group,install,prepare,setPreview,update,get assetCount(){return sources.size;},get instanceCount(){return layout?.anchors.length||0;},dustCount,get shot(){return layout?.shots[preview];},dispose(){if(disposed)return;disposed=true;for(const pool of pools.values()){pool.mesh.dispose();pool.material.dispose();}for(const item of owned)item.dispose();group.clear();sources.clear();pools.clear();}};
}
