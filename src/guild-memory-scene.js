import * as T from 'three';
import {applyMemoryEntry,memoryEntryFrame} from './guild-memory-entry.js';
import {createMemoryLayout,memoryPoint} from './guild-memory-layout.js';

export function createMemoryScene({mobile=true}={}){
 const group=new T.Group();group.name='guild-memory-corridor';group.visible=false;
 const entrySources=new Map();let entryView=null,terrainVisible=false,lightBlend=1;
 const pools=new Map(),owned=[],sources=new Map();let layout=null,preview=0,time=0,spin=0,disposed=false;
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),point=new T.Vector3(),center=new T.Vector3();
 const palette=[0xe8e4cb,0xb43b48,0xe4d1a0];
 const ambient=new T.AmbientLight(0xffffff,1.15);group.add(ambient);
 const key=new T.DirectionalLight(0xffffff,2.8);key.position.set(-28,35,55);group.add(key);
 const fill=new T.DirectionalLight(0xffffff,1.2);fill.position.set(30,-12,-30);group.add(fill);group.add(key.target,fill.target);
 const dustCount=mobile?240:480,positions=new Float32Array(dustCount*3),brightness=new Float32Array(dustCount);let seed=260206;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<dustCount;i++){positions.set([(random()-.5)*130,(random()-.5)*100,-random()*180],i*3);brightness[i]=.25+random()*.5;}
 const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3));dustGeometry.setAttribute('aLight',new T.BufferAttribute(brightness,1));
 const dustMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new T.Color(palette[0])},time:{value:0}},vertexShader:'uniform float time;attribute float aLight;varying float lit;void main(){vec3 drift=position+vec3(sin(time*.13+position.z*.07)*.5,sin(time*.18+position.x*.1)*.8,0.);vec4 p=modelViewMatrix*vec4(drift,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(130./max(1.,-p.z),1.,3.);lit=aLight;}',fragmentShader:'uniform vec3 color;varying float lit;void main(){float a=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(color,a*lit*.6);}'});
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
  sources.set(id,{source,center:sphere.center.clone(),factor:2.2/sphere.radius,face:new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1))});
  layout=null;
 }
 function prepare(){
  if(disposed||layout)return;
  for(const pool of pools.values()){group.remove(pool.mesh);pool.mesh.dispose();pool.material.dispose();}pools.clear();
  layout=createMemoryLayout({mobile,assets:[...sources.keys()].map(key=>({key,radius:2.2}))});
  rebuildPools();
 }
 function rebuildPools(){
  for(const pool of pools.values()){group.remove(pool.mesh);pool.mesh.dispose();pool.material.dispose();}pools.clear();
  for(const [id,asset] of sources){
   const anchors=layout.anchors.filter(a=>a.key===id);if(!anchors.length)continue;
   const material=(entrySources.get(anchors[0].id)?.material||asset.source.material).clone();material.fog=entrySources.size?entrySources.get(anchors[0].id)?.material.fog!==false:false;const mesh=new T.InstancedMesh(asset.source.geometry,material,anchors.length);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.name=`memory-${id}`;mesh.userData.anchorIds=anchors.map(a=>a.id);group.add(mesh);pools.set(id,{...asset,mesh,material,anchors});
  }
 }
 function captureEntry(sourceGroup,entryCamera){
  prepare();entrySources.clear();sourceGroup.updateMatrixWorld(true);entryCamera.updateMatrixWorld();entryView=entryCamera.clone();
  const entry={position:entryCamera.position.toArray(),target:entryCamera.position.clone().add(new T.Vector3(0,0,-1).applyQuaternion(entryCamera.quaternion)).toArray()};
  const frame=memoryEntryFrame(entry).invert(),records=[];
  if(sourceGroup.userData.departureAnchors)records.push(...sourceGroup.userData.departureAnchors);
  else sourceGroup.traverse(mesh=>{
   if(!mesh.isInstancedMesh||!mesh.visible)return;
   const key=mesh.userData.assetKey||mesh.name.replace(/^(companion|courtyard)-/,'');if(!sources.has(key))return;
   mesh.geometry.computeBoundingSphere();
   for(let slot=0;slot<mesh.count;slot++){
    const matrix=new T.Matrix4();mesh.getMatrixAt(slot,matrix);matrix.premultiply(mesh.matrixWorld);
    if(new T.Vector3().setFromMatrixScale(matrix).length()<1e-6)continue;
    const screen=mesh.geometry.boundingSphere.center.clone().applyMatrix4(matrix).project(entryCamera);
    records.push({id:mesh.userData.anchorIds?.[slot]||`${key}-${slot}`,key,branch:screen.y>0?0:1,order:slot,worldMatrix:matrix,geometry:mesh.geometry,material:mesh.material});
   }
  });
  const existing=records.filter(a=>sources.has(a.key));
  layout=createMemoryLayout({mobile,assets:[...sources.keys()].map(key=>({key,radius:2.2})),chains:existing});
  for(const record of existing){
   record.geometry.computeBoundingSphere();const sphere=record.geometry.boundingSphere,asset=sources.get(record.key);
   const matrix=new T.Matrix4().multiplyMatrices(frame,record.worldMatrix),quaternion=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(new T.Vector3(),quaternion,scale);
   scale.multiplyScalar(sphere.radius/asset.source.geometry.boundingSphere.radius);
   const position=sphere.center.clone().applyMatrix4(record.worldMatrix);
   entrySources.set(record.id,{position:position.clone().applyMatrix4(frame),quaternion,scale,material:record.material,viewPosition:position.applyMatrix4(entryCamera.matrixWorldInverse)});
  }
  rebuildPools();
 }

 function setPreview(index){preview=Math.max(0,Math.min(2,Math.round(index)||0));}
 function update(state,camera,dt=0){
  if(disposed)return;prepare();group.visible=!!layout?.anchors.length;time+=Math.min(.05,Math.max(0,dt));
  const index=Number.isInteger(state?.eventIndex)?Math.max(0,Math.min(2,state.eventIndex)):preview,shot=layout.shots[index];
  const phase=Number.isFinite(state?.memoryPhase)?Math.max(0,Math.min(2,state.memoryPhase)):index;
  const from=Math.min(1,Math.floor(phase)),blend=phase-from;
  const eased=v=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
  const elapsed=Math.min(.05,Math.max(0,dt));
  spin+=elapsed*.28*eased(phase)*(1-eased(phase-1))*(state?.reducedMotion?0:1);
  dustMaterial.uniforms.time.value=time;
  camera.position.fromArray(layout.shots[from].position).lerp(new T.Vector3().fromArray(layout.shots[from+1].position),blend);camera.up.set(0,1,0);camera.lookAt(...shot.target);camera.updateMatrixWorld();
  const color=new T.Color(palette[from]).lerp(new T.Color(palette[from+1]),blend);
  dustMaterial.uniforms.color.value.copy(color);
  for(const child of group.children)if(child.material?.uniforms?.color)child.material.uniforms.color.value.copy(color);
  lightBlend=state?.entryPose?eased(((state.entryBlend??0)-.9)/.1):1;
  ambient.intensity=1.15*lightBlend*(terrainVisible?0:1);key.intensity=2.8*lightBlend*(terrainVisible?0:1);fill.intensity=1.2*lightBlend*(terrainVisible?0:1);
  // Keep captured material fog stable: toggling it creates a color discontinuity.
  const locations=new Map(),expand=eased(phase-1);
  // Different periods and phases, centered so the shell itself never bobs.
  const bob=a=>(1.8+1.4*a.u)*Math.sin(time*(.72+a.u*.36+a.branch*.07)+a.u*17+a.branch*2.3);
  const meanBob=layout.anchors.length?layout.anchors.reduce((sum,a)=>sum+bob(a),0)/layout.anchors.length:0;
  for(const a of layout.anchors){point.fromArray(memoryPoint(a,phase,spin));
    // Chains adapt to wide viewports; the spherical shell retains real 3D depth.
    point.x*=1+(Math.max(.8,Math.min(2.8,camera.aspect/.6))-1)*(1-eased(phase));
    const chainWeight=1-eased(phase),motion=state?.reducedMotion?.2:1;
    // Coherent wave plus individual breathing is perceptible during idle reading.
    point.y+=motion*chainWeight*(1.6*Math.sin(time*.65+a.u*4+a.branch*1.7)+.65*Math.sin(time*.9+a.u*9));
    point.x+=motion*chainWeight*.5*Math.sin(time*.42+a.u*5+a.branch);
    // Shell motion follows its surface; text never pushes petals to screen edges.
    const radial=point.clone().sub(new T.Vector3(0,0,-14));
    if(radial.lengthSq()>0)point.addScaledVector(radial.normalize(),motion*eased(phase)*(1-expand)*.35*Math.sin(time*(.78+a.u*.3)+a.u*6+a.branch*1.7));
    point.y+=motion*expand*(bob(a)-meanBob);
    locations.set(a.id,point.clone());
  }
  // Bounded, deterministic separation prevents petals crossing during the morph.
  const delta=new T.Vector3();
  for(let pass=0;pass<8;pass++)for(let i=0;i<layout.anchors.length;i++)for(let j=0;j<i;j++){
   const a=layout.anchors[i],b=layout.anchors[j],p=locations.get(a.id),q=locations.get(b.id);
   delta.copy(p).sub(q);const distance=delta.length(),clearance=a.radius+b.radius+.65;
   if(distance<clearance){if(distance<1e-8)delta.set(1,.1,.1).normalize();else delta.divideScalar(distance);const correction=(clearance-distance)*.5;p.addScaledVector(delta,correction);q.addScaledVector(delta,-correction);}
  }
  const flightCamera=camera.clone(),flightFrame=new T.Group();
  if(state?.entryPose)applyMemoryEntry(flightCamera,flightFrame,state.entryPose,state.entryBlend??1);
  const storyInverse=flightFrame.matrix.clone().invert();
  for(const pool of pools.values()){
   let count=0;
   for(const [slot,a] of pool.anchors.entries()){point.copy(locations.get(a.id));
    rotation.copy(camera.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(.22*Math.sin(a.u*9),a.twist+.2*Math.sin(a.u*7+phase),a.twist+(state?.reducedMotion?0:.035*(1-eased(phase))*Math.sin(time*.6+a.u*5))))).multiply(pool.face);
    const depth=Math.max(1,-point.clone().applyMatrix4(camera.matrixWorldInverse).z);
    const reference=camera.position.distanceTo(new T.Vector3(0,0,-14));
    const balance=1+(Math.max(.65,Math.min(1.2,Math.pow(depth/reference,.4)))-1)*eased(phase-1);
    scale.setScalar(pool.factor*balance);
    if(state?.entryPose&&state.entryBlend<1){
     const start=entrySources.get(a.id),u=state.entryBlend;
     // Track the moving camera through world space, with a separate sliding
     // coordinate for every follower. The story root itself never follows it.
     const travel=eased(u);
     const destination=point.clone().applyMatrix4(camera.matrixWorldInverse);
     const origin=start?.viewPosition?.clone()||destination.clone();
     // Interpolate angular positions, keeping the head in the visible height
     // band while depth and the camera's physical position change continuously.
     const depth=T.MathUtils.lerp(-origin.z,-destination.z,travel);
     point.set(T.MathUtils.lerp(origin.x/-origin.z,destination.x/-destination.z,travel)*depth,T.MathUtils.lerp(origin.y/-origin.z,destination.y/-destination.z,travel)*depth,-depth);
     point.applyMatrix4(flightCamera.matrixWorld).applyMatrix4(storyInverse);
     if(start){const worldStart=new T.Quaternion().setFromRotationMatrix(flightFrame.matrix).multiply(start.quaternion);
      const tracked=new T.Quaternion().setFromRotationMatrix(flightFrame.matrix).invert().multiply(flightCamera.quaternion).multiply(entryView.quaternion.clone().invert()).multiply(worldStart);
      rotation.slerp(tracked,1-travel);scale.lerp(start.scale,1-travel);}

    }
    matrix.compose(point,rotation,scale);matrix.multiply(new T.Matrix4().makeTranslation(-pool.center.x,-pool.center.y,-pool.center.z));pool.mesh.setMatrixAt(count++,matrix);
   }
   pool.mesh.count=count;pool.mesh.instanceMatrix.needsUpdate=true;
  }
  applyMemoryEntry(camera,group,state?.entryPose,state?.entryBlend??1);
 }
 return {group,install,prepare,captureEntry,setPreview,update,setTerrainVisible(visible){terrainVisible=visible;ambient.intensity=1.15*lightBlend*(visible?0:1);key.intensity=2.8*lightBlend*(visible?0:1);fill.intensity=1.2*lightBlend*(visible?0:1);},get assetCount(){return sources.size;},get instanceCount(){return layout?.anchors.length||0;},dustCount,get shot(){const shot=layout?.shots[preview];return shot?{...shot,target:new T.Vector3(...shot.target).applyMatrix4(group.matrix).toArray()}:null;},dispose(){if(disposed)return;disposed=true;for(const pool of pools.values()){pool.mesh.dispose();pool.material.dispose();}for(const item of owned)item.dispose();group.clear();sources.clear();pools.clear();}};
}
