import * as T from 'three';
const smooth=v=>{const u=T.MathUtils.clamp(v,0,1);return u*u*u*(10+u*(-15+6*u));};
export function memoryEntryProgress(t){return smooth(t*36/4);}
// Raise and retreat the camera; the original world remains fixed in place.
export function applyMemoryEntry(camera,group,entry,u){
 group.matrixAutoUpdate=false;group.matrix.identity();
 if(!entry||u>=1){group.updateMatrixWorld(true);return;}
 const reference=camera.matrixWorld.clone(),referenceInverse=camera.matrixWorldInverse.clone();
 const origin=new T.Vector3(...entry.position),start=new T.PerspectiveCamera();
 start.position.copy(origin);start.up.fromArray(entry.up||[0,1,0]);start.lookAt(...entry.target);start.updateMatrixWorld();
 const lifted=origin.clone().add(new T.Vector3(0,280,0)).addScaledVector(new T.Vector3(0,0,1).applyQuaternion(start.quaternion),105);
 if(u<.6)camera.position.copy(origin).lerp(lifted,smooth(u/.6));
 else camera.position.copy(lifted).lerp(new T.Vector3().setFromMatrixPosition(reference),smooth((u-.6)/.4));
 camera.quaternion.copy(start.quaternion).slerp(new T.Quaternion().setFromRotationMatrix(reference),smooth((u-.35)/.65));
 camera.updateMatrixWorld();group.matrix.multiplyMatrices(camera.matrixWorld,referenceInverse);group.updateMatrixWorld(true);
}
