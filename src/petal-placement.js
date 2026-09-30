import * as T from 'three';
export function placedPetals(asset,count,width,placement,height,name,embed=.05){
 const batch=new T.InstancedMesh(asset.geometry,asset.material,count),dummy=new T.Object3D(),v=new T.Vector3();batch.name=name;
 asset.geometry.computeBoundingBox();const natural=Math.max(...asset.geometry.boundingBox.getSize(v).toArray());
 const a=asset.geometry.attributes.position;
 for(let i=0;i<count;i++){
  const p=placement(i),size=width*p.scale/natural;dummy.rotation.set(p.pitch,p.yaw,p.roll,'YXZ');dummy.scale.setScalar(size);let y=-Infinity;
  for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyQuaternion(dummy.quaternion).multiplyScalar(size);y=Math.max(y,height(p.x+v.x,p.z+v.z)-v.y);}
  dummy.position.set(p.x,y-embed,p.z);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
 }
 batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();return batch;
}
