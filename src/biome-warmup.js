import * as T from 'three';
const frame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
// Upload actual instance geometries and terrain, offscreen, before opening input.
export async function warmBiomeResources(renderer,scene,nextFrame=frame){
 const warm=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.2,2000);camera.position.set(0,10,100);camera.lookAt(500,-40,0);warm.fog=scene.fog?.clone();
 warm.environment=scene.environment;warm.environmentIntensity=scene.environmentIntensity;
 scene.traverse(object=>{
  if(object.isLight)warm.add(object.clone());
  if(object.isInstancedMesh){const copy=new T.InstancedMesh(object.geometry,object.material,1),matrix=new T.Matrix4();object.getMatrixAt(0,matrix);copy.setMatrixAt(0,matrix);copy.frustumCulled=false;warm.add(copy);}
  else if(object.isMesh&&object.name.includes('ground')){const copy=new T.Mesh(object.geometry,object.material);copy.frustumCulled=false;warm.add(copy);}
 });
 const meshes=warm.children.filter(o=>o.isMesh),target=new T.WebGLRenderTarget(4,4,{depthBuffer:true});
 try{
  await renderer.compileAsync(warm,camera);
  for(const m of meshes)m.visible=false;
  for(const mesh of meshes){await nextFrame();const previous=renderer.getRenderTarget();try{mesh.visible=true;renderer.setRenderTarget(target);renderer.render(warm,camera);}finally{mesh.visible=false;renderer.setRenderTarget(previous);}}
 }finally{target.dispose();for(const mesh of meshes)if(mesh.isInstancedMesh)mesh.dispose();}
}
