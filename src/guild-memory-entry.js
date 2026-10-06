import * as T from 'three';
const smooth=v=>{const u=T.MathUtils.clamp(v,0,1);return u*u*u*(10+u*(-15+6*u));};
export function memoryEntryProgress(t){return smooth(t*36/7);}
// A stationary story space beyond the final map. Never parent it to the camera.
export function memoryEntryFrame(entry){
 const frame=new T.Matrix4();if(!entry)return frame;
 const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 const arrival=new T.Vector3(...entry.position).add(new T.Vector3(340,160,180));
 const origin=arrival.sub(new T.Vector3(0,3,190).applyQuaternion(rotation));
 return frame.compose(origin,rotation,new T.Vector3(1,1,1));
}
export function applyMemoryEntry(camera,group,entry,u){
 group.matrixAutoUpdate=false;group.matrix.copy(memoryEntryFrame(entry));group.updateMatrixWorld(true);
 if(!entry)return;
 const destination=camera.position.clone().applyMatrix4(group.matrix);
 const finalRotation=new T.Quaternion().setFromRotationMatrix(group.matrix).multiply(camera.quaternion);
 const start=new T.PerspectiveCamera();start.position.fromArray(entry.position);start.up.fromArray(entry.up||[0,1,0]);start.lookAt(...entry.target);start.updateMatrixWorld();
 const origin=start.position,control1=origin.clone().add(new T.Vector3(145,0,-80)),control2=destination.clone().add(new T.Vector3(-90,-100,-55));
 camera.position.copy(new T.CubicBezierCurve3(origin,control1,control2,destination).getPoint(T.MathUtils.clamp(u,0,1)));
 camera.quaternion.copy(start.quaternion).slerp(finalRotation,smooth((u-.35)/.65));camera.updateMatrixWorld();
}
