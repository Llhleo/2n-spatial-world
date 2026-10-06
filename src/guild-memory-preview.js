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
   // Keep the original map fixed and visible; only replace the live member chain.
   if(object===memory.group)object.visible=true;
   else if(departureGroups.includes(object)||object===history?.group)object.visible=false;
   else object.visible=value;
  });
  const state=Number.isFinite(progress)?sampleMemoryStory(progress):{eventIndex:index,eventOpacity:1};
  memory.setPreview(state.eventIndex);memory.update({...state,entryPose,entryBlend,showText,reducedMotion},camera,dt);
  const fade=Math.min(1,Math.max(0,(entryBlend-.48)/.5));
  const fogColor=original.fog?.color||new T.Color(0x0a101b);
  scene.fog=departing?new T.FogExp2(fogColor,original.fog?.density||.0018):new T.FogExp2(fogColor.clone().lerp(new T.Color(0x0a101b),fade),(original.fog?.density||.0018)+fade*.008);
  scene.background=original.background?.isColor?original.background.clone().lerp(new T.Color(0x0a101b),fade):new T.Color(0x0a101b);
  if(showText&&history)history.update({...state,target:memory.shot.target},camera,viewport);
  renderer.render(scene,camera);
 }finally{
  visibility.forEach(([object,value])=>{object.visible=value;});
  scene.fog=original.fog;scene.background=original.background;
  camera.position.copy(original.position);camera.quaternion.copy(original.rotation);camera.up.copy(original.up);camera.updateMatrixWorld();
 }
}
