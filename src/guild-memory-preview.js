import * as T from 'three';
import {sampleMemoryStory} from './guild-memory-layout.js';
export function renderMemoryPreview({scene,renderer,camera,memory,history,textView,index,progress,viewport,dt=0,showText=false,reducedMotion=false}){
 const visibility=scene.children.map(object=>[object,object.visible]);
 const original={fog:scene.fog,background:scene.background,position:camera.position.clone(),rotation:camera.quaternion.clone(),up:camera.up.clone()};
 try{
  visibility.forEach(([object])=>{object.visible=false;});
  const state=Number.isFinite(progress)?sampleMemoryStory(progress):{eventIndex:index,eventOpacity:1};
  memory.setPreview(state.eventIndex);memory.update({...state,showText,reducedMotion},camera,dt);
  scene.fog=new T.FogExp2(0x111a29,.0018);scene.background=new T.Color(0x0a101b);
  if(textView)textView.update(state,showText);
  else if(showText&&history)history.update({...state,target:memory.shot.target},camera,viewport);
  renderer.render(scene,camera);
 }finally{
  visibility.forEach(([object,value])=>{object.visible=value;});
  scene.fog=original.fog;scene.background=original.background;
  camera.position.copy(original.position);camera.quaternion.copy(original.rotation);camera.up.copy(original.up);camera.updateMatrixWorld();
 }
}
