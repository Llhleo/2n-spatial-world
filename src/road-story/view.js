import * as T from 'three';
import {renderMemoryPreview} from '../guild-memory-preview.js';
import {smooth} from './path.js';

export function renderRoadStory({scene,renderer,camera,roads,memory,history,nextView,state,chapter,viewport,dt,reducedMotion,departureGroups,updateEnvironment}){
 const visibility=scene.children.map(o=>[o,o.visible]),position=camera.position.clone(),quaternion=camera.quaternion.clone(),up=camera.up.clone(),fov=camera.fov;
 const fog=scene.fog,fogColor=fog?.color.clone(),fogDensity=fog?.density;
 const roadEnvironment=cam=>{updateEnvironment?.(cam);if(scene.fog){scene.fog.color.lerp(new T.Color(0x06090d),smooth((chapter.historyT*36-.8)/3.5));scene.fog.density=.0018;}};
 try{
  roads.group.visible=true;
  const endingReady=nextView.ready&&(!state.particleEnding||memory.particleEndingReady);
  if(chapter.chapter==='next'&&endingReady){
   memory.setLayerOpacity?.(1);
   // The original ending runs in its own fixed space beyond the third road.
   renderMemoryPreview({scene,renderer,camera,memory,history,nextView,particleEnding:state.particleEnding,nextT:chapter.nextT,entryPose:roads.endingEntry(state.entryPose),departureGroups,progress:1,viewport,dt,reducedMotion,showText:false,updateEnvironment:renderCamera=>{roads.update({historyT:1,entryPose:state.entryPose,camera:renderCamera,dt,reducedMotion,ending:true});roadEnvironment(renderCamera);}});
   return;
  }
  if(chapter.historyT*36>=23.1){
   // Introduce the actual ending followers in their distant fixed space while
   // the camera is still in the third road, before it approaches them.
   renderMemoryPreview({scene,renderer,camera,memory,history,nextView,particleEnding:state.particleEnding,nextT:undefined,entryPose:roads.endingEntry(state.entryPose),departureGroups,progress:1,viewport,dt,reducedMotion,showText:false,updateEnvironment:renderCamera=>{memory.setLayerOpacity?.(smooth((chapter.historyT*36-23.1)/7.5));roads.update({historyT:chapter.historyT,entryPose:state.entryPose,camera:renderCamera,dt,reducedMotion});roadEnvironment(renderCamera);}});
   return;
  }
  for(const o of scene.children)if(o===memory.group||o===history?.group||o===nextView.group||o.name==='opening-monument'||departureGroups.includes(o))o.visible=false;
  roads.update({historyT:chapter.historyT,entryPose:state.entryPose,camera,dt,reducedMotion});
  roadEnvironment(camera);
  renderer.render(scene,camera);
 }finally{
  visibility.forEach(([o,v])=>o.visible=v);camera.position.copy(position);camera.quaternion.copy(quaternion);camera.up.copy(up);camera.fov=fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();if(fog){fog.color.copy(fogColor);fog.density=fogDensity;scene.fog=fog;}
 }
}
