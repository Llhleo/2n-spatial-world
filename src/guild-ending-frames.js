import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';

// Independently authored study of world-execute-web's dimension unfolding:
// luminous geometry is the scaffold, never a destination for every dust point.
export function endingDimensionFrame(t=0,reduced=false){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 const open=nextSmooth((u-3/18)/(1.5/18)),fold=nextSmooth((u-8.5/18)/(2.5/18));
 const action=nextSmooth((u-4.5/18)/(4/18))*(reduced?0:1);
 return {visibility:open*(1-fold),draw:open,fold,
  rotations:[[-.20+action*.65,.32+action*.9,-.12+action*.18],[.34-action*.8,-.36-action*1.2,.20+action*.55],[-.4+action*.5,.45+action*1.4,-.28-action*.7]],
  scales:[30*(.8+.2*open)*(1-.86*fold),22*(.76+.24*open)*(1-.88*fold),15*(.7+.3*open)*(1-.9*fold)]};
}
// Shared transforms drive both visible geometry and particle face lighting.
export function endingDimensionTransforms(t,aspect=.6,reduced=false){
 const f=endingDimensionFrame(t,reduced),fit=Math.min(1,Math.max(.1,aspect)/.6);
 const parent=new T.Matrix4().compose(new T.Vector3(0,30,-14),new T.Quaternion(),new T.Vector3(fit,1,1));
 return f.scales.map((scale,i)=>parent.clone().multiply(new T.Matrix4().compose(
  new T.Vector3([-2,2,0][i]*(1-f.fold),[0,2,-2][i]*(1-f.fold),[-4,3,0][i]*(1-f.fold)),
  new T.Quaternion().setFromEuler(new T.Euler(...f.rotations[i])),new T.Vector3(scale,scale,scale))));
}
export function endingFaceProximity(point,t,aspect=.6,reduced=false){
 const visibility=endingDimensionFrame(t,reduced).visibility;if(!visibility)return 0;
 let light=0;for(const m of endingDimensionTransforms(t,aspect,reduced)){
  const p=new T.Vector3(...point).applyMatrix4(m.invert()),q=[Math.abs(p.x)-1,Math.abs(p.y)-1,Math.abs(p.z)-1];
  const distance=Math.hypot(...q.map(v=>Math.max(0,v)))+Math.min(Math.max(...q),0);
  light=Math.max(light,Math.exp(-((distance/.12)**2)));
 }return light*visibility;
}

export function createEndingFrames(){
 const group=new T.Group();group.name='ending-dimension-frames';group.visible=false;
 const geometry=new T.CylinderGeometry(1,1,1,8,1,true),layers=[],materials=[];
 const vertices=Array.from({length:8},(_,i)=>new T.Vector3(i&1?1:-1,i&2?1:-1,i&4?1:-1));
 const edges=[];for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++){const j=i^(1<<axis);if(i<j)edges.push([vertices[i],vertices[j]]);}
 for(let i=0;i<3;i++){
  const layer=new T.Group(),core=new T.MeshBasicMaterial({color:[0x78cfe2,0xc5b5f1,0xf2d6a2][i],transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const halo=core.clone();materials.push(core,halo);const segments=[];group.add(layer);
  for(let index=0;index<edges.length;index++){
   const [a,b]=edges[index],edge=new T.Mesh(geometry,core),glow=new T.Mesh(geometry,halo);
   edge.userData.frameEdge=true;edge.name=`dimension-edge-${i}-${index}`;
   for(const mesh of [edge,glow]){mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.frustumCulled=false;layer.add(mesh);}
   segments.push({a,b,edge,glow,index});
  }
  layers.push({layer,core,halo,segments});
 }
 let disposed=false;
 return {group,update(t,aspect=.6,reduced=false){
  if(disposed)return;const f=endingDimensionFrame(t,reduced),transforms=endingDimensionTransforms(t,aspect,reduced);
  group.visible=f.visibility>0;
  layers.forEach(({layer,core,halo,segments},i)=>{
   layer.matrixAutoUpdate=false;layer.matrix.copy(transforms[i]);
   core.opacity=f.visibility*.82;halo.opacity=f.visibility*.085;
   for(const {a,b,edge,glow,index} of segments){
    const draw=nextSmooth(f.draw*1.65-index/18);const middle=a.clone().lerp(b,draw*.5),length=a.distanceTo(b)*draw;
    for(const [mesh,width] of [[edge,.16],[glow,.65]]){mesh.visible=draw>0;mesh.position.copy(middle);mesh.scale.set(width/Math.max(.1,f.scales[i]),length,width/Math.max(.1,f.scales[i]));}
   }
  });
 },dispose(){if(disposed)return;disposed=true;geometry.dispose();for(const m of materials)m.dispose();group.clear();}};
}
