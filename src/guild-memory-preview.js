import * as T from 'three';
import {memoryEntryProgress} from './guild-memory-entry.js';
import {sampleMemoryStory} from './guild-memory-layout.js';
export function renderMemoryPreview({scene,renderer,camera,memory,history,entryPose,departureGroups=[],index,progress,viewport,dt=0,showText=false,reducedMotion=false}){
 const visibility=scene.children.map(object=>[object,object.visible]);
 const original={fog:scene.fog,background:scene.background,position:camera.position.clone(),rotation:camera.quaternion.clone(),up:camera.up.clone()};
 try{
  const entryBlend=entryPose?memoryEntryProgress(progress):1;
  const departing=!!entryPose&&entryBlend<.6;
  visibility.forEach(([object,value])=>{
   // The map/world roots stay where they are and remain renderable while the
   // camera departs. Only the live member chain is replaced by its captured copy.
   if(object===memory.group)object.visible=true;
   else if(object.name==='opening-monument'||departureGroups.includes(object)||object===history?.group)object.visible=false;
   else object.visible=value;
  });
  const state=Number.isFinite(progress)?sampleMemoryStory(progress):{eventIndex:index,eventOpacity:1};
  memory.setPreview(state.eventIndex);memory.update({...state,entryPose,entryBlend,showText,reducedMotion},camera,dt);
  // Leaving terrain is produced solely by camera motion, never by map fading.
  scene.fog=original.fog;scene.background=original.background;
  if(showText&&history)history.update({...state,target:memory.shot.target},camera,viewport);
  renderer.render(scene,camera);
 }finally{
  visibility.forEach(([object,value])=>{object.visible=value;});
  scene.fog=original.fog;scene.background=original.background;
  camera.position.copy(original.position);camera.quaternion.copy(original.rotation);camera.up.copy(original.up);camera.updateMatrixWorld();
 }
}
