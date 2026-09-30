import * as T from 'three';
const clamp=T.MathUtils.clamp;
const smooth=(v,a,b)=>T.MathUtils.smoothstep(v,a,b);
const hash=n=>{const x=Math.sin(n*127.17+14.3)*43758.5453;return x-Math.floor(x);};
export function oceanHeight(x,z){
 const rise=smooth(x,520,585),edge=smooth(z,-365,-290)*(1-smooth(z,250,330));
 return -85+rise*edge*(43+Math.sin(x*.028+z*.013)*2.1+Math.cos(z*.043-x*.012)*1.3);
}
export function oceanColor(x,z){
 const variation=Math.sin(x*.057+Math.sin(z*.035)*2.8)*Math.cos(z*.063)*.5+.5;
 return new T.Color(0x478eb4).lerp(new T.Color(0x64a9c5),variation*.65);
}
const X0=520,X1=900,Z0=-365,Z1=330,NX=80,NZ=68;
export function oceanSurface(x,z){
 const dx=(X1-X0)/NX,dz=(Z1-Z0)/NZ,ix=clamp(Math.floor((x-X0)/dx),0,NX-1),iz=clamp(Math.floor((z-Z0)/dz),0,NZ-1);
 const X=X0+ix*dx,Z=Z0+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
 return u+v<=1?(1-u-v)*oceanHeight(X,Z)+u*oceanHeight(X+dx,Z)+v*oceanHeight(X,Z+dz):
 (u+v-1)*oceanHeight(X+dx,Z+dz)+(1-v)*oceanHeight(X+dx,Z)+(1-u)*oceanHeight(X,Z+dz);
}
export function createOceanGround(){
 const geo=new T.BufferGeometry(),p=[],c=[],idx=[];
 for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
  const x=X0+i*(X1-X0)/NX,z=Z0+j*(Z1-Z0)/NZ;
  p.push(x,oceanHeight(x,z),z);const color=oceanColor(x,z);color.multiplyScalar(smooth(x,520,565)*smooth(z,-365,-290)*(1-smooth(z,250,330)));c.push(color.r,color.g,color.b);
  if(i<NX&&j<NZ){const k=i*(NZ+1)+j;idx.push(k,k+1,k+NZ+1,k+1,k+NZ+2,k+NZ+1);}
 }
 geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.setIndex(idx);geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));mesh.name='florr-ocean-ground';return mesh;
}
export const OCEAN_POPULATION={pearl:[60,82],shell:[55,75],starfish:[50,70]};
export function createOceanPetals(catalog,mobile,names=Object.keys(OCEAN_POPULATION)){
 const group=new T.Group();group.name='florr-ocean-petals';const dummy=new T.Object3D(),v=new T.Vector3();
 for(const [name,counts] of Object.entries(OCEAN_POPULATION)){
  if(!names.includes(name))continue;
  const asset=catalog[name];if(!asset)throw new Error(`Missing Ocean petal ${name}`);
  asset.geometry.computeBoundingBox();const natural=Math.max(...asset.geometry.boundingBox.getSize(v).toArray());const n=counts[mobile?0:1];
  for(let zone=0;zone<3;zone++){
   const count=Math.floor((n+2-zone)/3),batch=new T.InstancedMesh(asset.geometry,asset.material,count);batch.name=`ocean-${name}-${zone}`;
   for(let i=0;i<count;i++){
    const seed=(i+1)*57+zone*347+name.length*131;
    const x=clamp(584+zone*83+(hash(seed+1)-.5)*68+(i%3)*10,572,843),z=clamp([-74,-25,29,79][i%4]+(hash(seed+2)-.5)*44,-110,120);
    const width=(name==='pearl'?2.5:name==='shell'?3.2:3.6)*(.82+hash(seed+3)*.30),size=width/natural;
    dummy.rotation.set([-1.48,-.98,-.61][i%3]+(hash(seed+4)-.5)*.18,hash(seed+5)*Math.PI*2,(hash(seed+6)-.5)*.3,'YXZ');dummy.scale.setScalar(size);
    // Fit the entire transformed support footprint to the actual terrain triangles.
    const a=asset.geometry.getAttribute('position');let y=-Infinity;
    for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyQuaternion(dummy.quaternion).multiplyScalar(size);y=Math.max(y,oceanSurface(x+v.x,z+v.z)-v.y);}
    dummy.position.set(x,y-.04,z);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
   }
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);
  }
 }
 return group;
}
export async function loadOceanPetals(){
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),loader=new GLTFLoader(),catalog={};
 await Promise.all(Object.keys(OCEAN_POPULATION).map(async name=>{const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/ocean-petals/${name}.glb`);const mesh=gltf.scene.getObjectByProperty('isMesh',true);if(!mesh)throw new Error(`Missing mesh ${name}`);catalog[name]=mesh;}));return catalog;
}
// These continue the existing Desert exit; the earlier Garden camera is unchanged.
const oceanShots=[[[305,3,-9],[380,-34,-25]],[[430,0,-7],[525,-60,-20]],[[570,-7,10],[647,-41,-10]],[[685,-6,18],[755,-42,-9]],[[786,-5,6],[845,-42,-5]]];
const paths=[0,1].map(k=>new T.CatmullRomCurve3(oceanShots.map(s=>new T.Vector3(...s[k])),false,'catmullrom',.5));
const position=new T.Vector3(),focus=new T.Vector3();
export function oceanPose(t,camera){
 const u=clamp(t,0,1);paths[0].getPoint(u,position);paths[1].getPoint(u,focus);camera.position.copy(position);camera.lookAt(focus);return {position:camera.position.toArray(),target:focus.toArray()};
}
