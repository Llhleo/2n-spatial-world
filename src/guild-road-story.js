import * as T from 'three';
import {petalFrontQuaternion} from './petal-fronts.js';
import {petalDisplayTexture} from './petal-display-texture.js';
import {memoryEntryFrame} from './guild-memory-entry.js';
import {createRoadGeometry} from './road-story/geometry.js';
import {createLightTravelers} from './road-story/lights.js';
import {sampleRoadCamera,roadEndingEntry} from './road-story/path.js';

export function createGuildRoadStory({historyRecords}){
 const group=new T.Group();group.name='guild-road-story';group.visible=false;
 const assets=new Map(),captured=new T.Group(),travelers=createLightTravelers();group.add(travelers.group);
 let geometry=null,ready=false,preparing=null,error=null,ambient=0,entry=null,chainTime=0;
 const base=import.meta.env?.BASE_URL||'/';
 function install(source,kind,name){
  if(assets.has(name)||!source?.geometry||!source?.material)return;
  source.geometry.computeBoundingBox();source.geometry.computeBoundingSphere();
  const sphere=source.geometry.boundingSphere,dims=source.geometry.boundingBox.getSize(new T.Vector3()),g=source.geometry.clone();g.translate(-sphere.center.x,-sphere.center.y,-sphere.center.z);g.scale(1/sphere.radius,1/sphere.radius,1/sphere.radius);g.computeBoundingSphere();
  const material=source.material.clone();if(material.map)material.map=petalDisplayTexture(material.map,{mipmaps:name==='rose'});material.metalness=0;material.roughness=Math.max(.35,material.roughness);material.side=T.FrontSide;
  assets.set(name,{geometry:g,material,face:petalFrontQuaternion(name,dims)});
 }
 async function prepare(){
  if(ready)return;if(preparing)return preparing;if(assets.size<14)throw new Error('道路花瓣资源尚未准备好');
  preparing=(async()=>{
   const read=async path=>{const response=await fetch(base+'assets/road-story/'+path);if(!response.ok)throw new Error('道路文字或背景准备失败');return response.json();};
   const [vectorText,waveConfig]=await Promise.all([read('text-meshes.json'),read('wave-config.json')]);
   geometry=createRoadGeometry({assets,vectorText,waveConfig,historyRecords});group.add(geometry.group);ready=true;error=null;
  })().catch(e=>{error=e;throw e;}).finally(()=>preparing=null);return preparing;
 }
 function captureEntry(sourceGroup,pose){
  entry=pose;chainTime=ambient;
  captured.traverse(o=>{if(o.isInstancedMesh)o.dispose();});captured.clear();
  const records=sourceGroup.userData.departureAnchors||[],byGeometry=new Map();
  for(const record of records){if(!byGeometry.has(record.geometry))byGeometry.set(record.geometry,[]);byGeometry.get(record.geometry).push(record);}
  const inverse=memoryEntryFrame(pose).invert();
  for(const [g,items] of byGeometry){const mesh=new T.InstancedMesh(g,items[0].material,items.length);mesh.frustumCulled=false;items.forEach((p,i)=>mesh.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverse,p.worldMatrix)));mesh.userData.original=mesh.instanceMatrix.array.slice();captured.add(mesh);}
  group.add(captured);
 }
 function update({historyT=0,entryPose=entry,camera,dt=0,reducedMotion=false,ending=false}){
  ambient+=Math.min(.05,Math.max(0,dt));if(!ready)return;
  const seconds=historyT*36;group.matrixAutoUpdate=false;group.matrix.copy(memoryEntryFrame(entryPose));group.updateMatrixWorld(true);
  if(!ending){const pose=sampleRoadCamera(seconds,entryPose);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.up.set(0,1,0);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
  geometry.update(ambient,camera,seconds,reducedMotion);travelers.update(ambient,seconds,camera,reducedMotion);
  captured.visible=!ending&&seconds<5.5;
  // Every captured member continues a small drift while the camera leaves it.
  const matrix=new T.Matrix4();for(const mesh of captured.children){for(let i=0;i<mesh.count;i++){matrix.fromArray(mesh.userData.original,i*16);matrix.elements[13]+=.6*Math.sin((ambient-chainTime)*.8+i*.41)-.6*Math.sin(i*.41);mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;}
 }
 return {group,install,prepare,captureEntry,update,endingEntry:roadEndingEntry,get ready(){return ready;},get error(){return error;},get instanceCount(){return geometry?.instanceCount||0;},get visibleCount(){return geometry?.visibleCount||0;},get geometry(){return geometry;},dispose(){travelers.dispose();captured.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.traverse(o=>{if(o.geometry&&!assets.has(o.userData.assetName))o.geometry.dispose();});for(const a of assets.values()){a.geometry.dispose();a.material.dispose();}group.clear();}};
}
