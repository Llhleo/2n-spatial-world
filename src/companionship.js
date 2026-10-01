import * as T from 'three';
import {Text} from 'troika-three-text';
import {flowerPose,flowerReveal,readingPoint,readingQuaternion} from './lookback.js';
const selected=['garden:clover','desert:cactus','ocean:shell','jungle:compass','hell:darkmark'];
export function createCompanionship(){
 const group=new T.Group();group.name='companionship';
 const batches=new Map(),labels=[];
 const point=new T.Vector3(),scale=new T.Vector3(),matrix=new T.Matrix4(),pivot=new T.Matrix4();
 let previous=NaN,prepared=false;
 for(const [content,size,y] of [['同行的力量',3.8,5],['走过五境，',1.7,-4],['同行的人始终在这里。',1.7,-7]]){
  const text=new Text();text.text=content;text.font=`${import.meta.env?.BASE_URL||'/'}assets/fonts/companionship-sc.woff`;
  text.fontSize=size;text.color=0xf4f0df;text.anchorX='center';text.anchorY='middle';
  text.position.copy(readingPoint(0,y));text.quaternion.copy(readingQuaternion);
  text.material.depthWrite=false;text.material.transparent=true;text.material.toneMapped=false;
  text.sdfGlyphSize=64;text.gpuAccelerateSDF=false;text.userData.warmup=true;
  text.visible=false;labels.push(text);group.add(text);
 }
 function install(source,kind,name){
  const key=kind+':'+name,index=selected.indexOf(key);if(index<0||batches.has(key))return;
  const geometry=source.geometry;geometry.computeBoundingBox();
  const box=geometry.boundingBox,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const normal=size.y<Math.min(size.x,size.z)?new T.Vector3(0,1,0):size.x<size.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  const face=new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1));
  const material=source.material.clone(),mesh=new T.InstancedMesh(geometry,material,3);
  mesh.name='companion-'+key;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const rotations=Array.from({length:3},(_,j)=>readingQuaternion.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler((j-1)*.12,(index-2)*.05,(index*3+j-7)*.075))).multiply(face));
  batches.set(key,{mesh,index,rotations,center,size:Math.max(size.x,size.y,size.z)});group.add(mesh);previous=NaN;
 }
 function update(t){
  if(t===previous)return;previous=t;
  for(const batch of batches.values()){
   const {mesh,index,rotations,center,size}=batch;
   mesh.visible=t>=flowerReveal(index*3);
   for(let j=0;j<3;j++){
    const i=index*3+j,reveal=T.MathUtils.smoothstep(t,flowerReveal(i),flowerReveal(i)+.025);
    flowerPose(i,t,point);scale.setScalar(3.6/size*reveal);
    matrix.compose(point,rotations[j],scale);pivot.makeTranslation(-center.x,-center.y,-center.z);matrix.multiply(pivot);mesh.setMatrixAt(j,matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
  const opacity=T.MathUtils.smoothstep(t,.84,.88);
  for(const label of labels){label.visible=opacity>0;label.material.opacity=opacity;}
 }
 return {group,install,update,get ready(){return prepared&&batches.size===5;},async prepare(){
  if(prepared)return;
  await Promise.all(labels.map(text=>new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('同行文字准备超时')),20000);
   text.sync(()=>{clearTimeout(timeout);resolve();});
  })));prepared=true;
 },dispose(){for(const {mesh} of batches.values()){mesh.material.dispose();mesh.dispose();}for(const label of labels)label.dispose();}};
}
