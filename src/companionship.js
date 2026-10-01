import * as T from 'three';
import {Text} from 'troika-three-text';
import {flowerPose,flowerReveal,flowerHeading,readingPoint,readingQuaternion,lookbackPose,FLOWER_SPECS} from './lookback.js';
const selected=FLOWER_SPECS.map(([kind,name])=>kind+':'+name);
// A sync callback is not re-fired when Troika is already syncing. Listen for
// completion instead, so a timeout and retry can adopt the original work.
export function prepareWorldText(text,timeoutMs=20000){
 if(text.textRenderInfo)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timeout);text.removeEventListener('synccomplete',complete);};
  const complete=()=>{cleanup();resolve();};
  const timeout=setTimeout(()=>{cleanup();reject(new Error('同行文字准备超时'));},timeoutMs);
  text.addEventListener('synccomplete',complete);
  try{text.sync();}catch(error){cleanup();reject(error);}
 });
}
export function createCompanionship(scene){
 const group=new T.Group();group.name='companionship';
 const batches=new Map(),assets=new Map(),labels=[];
 const point=new T.Vector3(),scale=new T.Vector3(),matrix=new T.Matrix4(),pivot=new T.Matrix4(),rotation=new T.Quaternion(),heading=new T.Quaternion();
 let previous=NaN,prepared=false;
 for(const [content,size,y] of [['每个地图，',3.6,3],['都有2n的足迹',3.6,-3]]){
  const text=new Text();text.text=content;text.font=`${import.meta.env?.BASE_URL||'/'}assets/fonts/companionship-sc.woff?v=footprints-1`;
  text.fontSize=size;text.color=0xf4f0df;text.anchorX='center';text.anchorY='middle';
  text.position.copy(readingPoint(0,y));text.quaternion.copy(readingQuaternion);
  text.material.depthWrite=false;text.material.transparent=true;text.material.toneMapped=false;
  text.sdfGlyphSize=64;text.gpuAccelerateSDF=false;text.userData.warmup=true;
  text.visible=false;labels.push(text);group.add(text);
 }
 function install(source,kind,name){
  const key=kind+':'+name,index=selected.indexOf(key);if(index<0||batches.has(key))return;
  assets.set(key,{source,kind,name});
  const geometry=source.geometry;geometry.computeBoundingBox();
  const box=geometry.boundingBox,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const normal=size.y<Math.min(size.x,size.z)?new T.Vector3(0,1,0):size.x<size.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  const face=new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1));
  const nativeRoot=scene?.getObjectByName(kind==='garden'?'florr-petal-assembly':'florr-'+kind);
  const view=new T.PerspectiveCamera(48,414/896,.2,2400);lookbackPose(flowerReveal(index)+.015,view);view.updateMatrixWorld();
  let original=null,best=Infinity;
  nativeRoot?.updateWorldMatrix(true,true);
  nativeRoot?.traverse(batch=>{if(!batch.isInstancedMesh||batch.geometry!==geometry)return;for(let slot=0;slot<batch.count;slot++){
   const local=new T.Matrix4();batch.getMatrixAt(slot,local);const world=new T.Matrix4().multiplyMatrices(batch.matrixWorld,local),position=center.clone().applyMatrix4(world),screen=position.clone().project(view);
   const score=Math.abs(screen.x)*2+Math.abs(screen.y)+(screen.z>1||screen.z< -1?100:0);
   if(score<best){best=score;original={batch,slot,local,world,position};}
  }});
  if(!original)return; // Garden may still be detached while its ground is prepared.
  const nativeRotation=new T.Quaternion(),nativeScale=new T.Vector3();original.world.decompose(new T.Vector3(),nativeRotation,nativeScale);
  const material=source.material.clone(),mesh=new T.InstancedMesh(geometry,material,1);
  mesh.name='companion-'+key;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const twist=new T.Quaternion().setFromEuler(new T.Euler((index%3-1)*.13,(index%4-1.5)*.06,(index-6)*.075));
  const finalScale=new T.Vector3().setScalar(FLOWER_SPECS[index][3]/Math.max(size.x,size.y,size.z));
  batches.set(key,{mesh,index,face,twist,original,nativeRotation,nativeScale,finalScale,center,taken:false});group.add(mesh);previous=NaN;
 }
 function update(t){
  if(t===previous)return;previous=t;
  for(const batch of batches.values()){
   const {mesh,index,face,twist,original,nativeRotation,nativeScale,finalScale,center}=batch;
   const phase=flowerReveal(index),taken=t>=phase;
   mesh.visible=taken;
   if(taken!==batch.taken){original.batch.setMatrixAt(original.slot,taken?matrix.makeScale(0,0,0):original.local);original.batch.instanceMatrix.needsUpdate=true;batch.taken=taken;}
   flowerPose(index,t,point,original.position);
   const orient=T.MathUtils.smoothstep(t,phase,phase+.075),final=T.MathUtils.smoothstep(t,.76,.9);
   flowerHeading(t,heading);heading.slerp(readingQuaternion,final).multiply(twist).multiply(face);
   rotation.copy(nativeRotation).slerp(heading,orient);
   scale.copy(nativeScale).lerp(finalScale,orient);
   matrix.compose(point,rotation,scale);pivot.makeTranslation(-center.x,-center.y,-center.z);matrix.multiply(pivot);mesh.setMatrixAt(0,matrix);
   mesh.instanceMatrix.needsUpdate=true;
  }
  const opacity=T.MathUtils.smoothstep(t,.9,.92);
  for(const label of labels){label.visible=opacity>0;label.material.opacity=opacity;}
 }
 return {group,install,update,capture(){for(const asset of assets.values())install(asset.source,asset.kind,asset.name);if(batches.size!==14)throw new Error('起飞花瓣尚未准备完整');},get ready(){return prepared&&batches.size===14;},async prepare(){
  if(prepared)return;
  await Promise.all(labels.map(text=>prepareWorldText(text)));prepared=true;
 },dispose(){for(const {mesh} of batches.values()){mesh.material.dispose();mesh.dispose();}for(const label of labels)label.dispose();}};
}
