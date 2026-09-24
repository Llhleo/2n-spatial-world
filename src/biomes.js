import * as T from 'three';
import {createStoneGarden} from './garden-art.js';

const saturate=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
const rand=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const green=new T.Color(0x23322b), sand=new T.Color(0x655748);
const stoneGreen=new T.Color(0x59635d),stoneSand=new T.Color(0x897864);
const foliage=new T.Color(0x566d58),dry=new T.Color(0x797357);
export const desertBlend=x=>smooth(x,255,330);

// Continuous heightfield and palette across the garden/desert boundary.
export function groundHeight(x,z){
  const dune=smooth(x,238,365);
  const ridge=Math.sin(x*.021+Math.sin(z*.028)*1.7)*4.8+Math.cos(z*.033+x*.008)*3.4;
  const close=Math.sin(x*.073+z*.045)*1.05+Math.cos(z*.088-x*.052)*.7;
  const long=Math.sin(z*.014+x*.012)*3.6;
  const edge=smooth(x,42,77)*smooth(z,-300,-235)*(1-smooth(z,170,270));
  return -85+edge*(49+ridge+close+dune*long);
}
const clay=(color,roughness=1)=>new T.MeshStandardMaterial({color,roughness,metalness:0});

function terrainPart(x0,x1){
  const nx=30,nz=44,geo=new T.BufferGeometry();
  const positions=[],colors=[],indices=[],c=new T.Color();
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=x0+(x1-x0)*i/nx,z=-300+j*570/nz,y=groundHeight(x,z);
    positions.push(x,y,z);
    c.copy(green).lerp(sand,desertBlend(x));
    const fleck=.024*Math.sin(x*.12+z*.05)+.012*Math.sin(x*.24-z*.08);
    c.offsetHSL(0,0,fleck);
    const rim=smooth(x,42,77)*smooth(z,-300,-235)*(1-smooth(z,170,270));
    c.multiplyScalar(.015+rim*.985);
    colors.push(c.r,c.g,c.b);
    if(i<nx&&j<nz){const p=i*(nz+1)+j;indices.push(p,p+1,p+nz+1,p+1,p+nz+2,p+nz+1);}
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  mesh.name='continuous-3d-ground';mesh.frustumCulled=true;return mesh;
}

const scratch=new T.Object3D(),color=new T.Color();
function place(mesh,index,x,y,z,scale,rot,colorValue){
  scratch.position.set(x,y,z);scratch.rotation.set(0,rot,0);scratch.scale.set(...scale);scratch.updateMatrix();
  mesh.setMatrixAt(index,scratch.matrix);mesh.setColorAt(index,colorValue);
}
function populate(x0,x1,mobile){
  const region=new T.Group();region.name=`world-${x0}-${x1}`;
  const count=mobile?95:170,treeCount=mobile?25:44,rockCount=mobile?95:180;
  const rockGeo=new T.IcosahedronGeometry(1,1);
  const rockPos=rockGeo.attributes.position;
  for(let v=0;v<rockPos.count;v++){
    const x=rockPos.getX(v),y=rockPos.getY(v),z=rockPos.getZ(v);
    const n=1+.09*Math.sin(x*7+y*11+z*4);
    rockPos.setXYZ(v,x*n,y*.7*n,z*1.4*n);
  }
  rockGeo.computeVertexNormals();
  const rocks=new T.InstancedMesh(rockGeo,clay(0xffffff),rockCount);
  const trunk=new T.InstancedMesh(new T.CylinderGeometry(.22,.45,1.0,6),clay(0x343a33),treeCount);
  const leaves=new T.SphereGeometry(1,12,8),brushShape=new T.SphereGeometry(1,8,6);
  // Three offset canopies read as a grove, not a sphere on a stick.
  const crowns=[0,1,2].map(()=>new T.InstancedMesh(leaves,clay(0xffffff),treeCount));
  const brush=new T.InstancedMesh(brushShape,clay(0xffffff),count);
  for(let i=0;i<rockCount;i++){
    const x=x0+rand(i+13,x0)*(x1-x0),z=-145+rand(i+33,x0)*225;
    const s=.8+rand(i+57,x0)*2.7,d=desertBlend(x);
    color.copy(stoneGreen).lerp(stoneSand,d).multiplyScalar(.78+rand(i+39,x0)*.4);
    place(rocks,i,x,groundHeight(x,z)+s*.15,z,[s,s*(.5+rand(i+4,x0)*.3),s*1.4],rand(i+42,x0)*6.28,color);
  }
  for(let i=0;i<treeCount;i++){
    const x=x0+rand(i+78,x0)*(x1-x0),z=-130+rand(i+90,x0)*190;
    const alive=rand(i+26,x0)>desertBlend(x)*.97;
    const height=(5+rand(i+20,x0)*7)*(alive?1:.15),y=groundHeight(x,z),angle=rand(i+25,x0)*6.28;
    place(trunk,i,x,y+height*.5,z,[.55,height,.55],angle,new T.Color(0x363c35));
    color.copy(foliage).lerp(dry,desertBlend(x)).multiplyScalar(.77+rand(i+3,x0)*.4);
    for(let layer=0;layer<3;layer++){
      const theta=angle+layer*2.399,offset=layer===0?0:1.5;
      const cx=x+Math.cos(theta)*offset,cz=z+Math.sin(theta)*offset;
      const size=(layer===0?1:.72)*(2.1+height*.12);
      place(crowns[layer],i,cx,y+height*(.73+layer*.10),cz,alive?[size,height*.25,size*.83]:[.01,.01,.01],theta,color);
    }
  }
  for(let i=0;i<count;i++){
    const x=x0+rand(i+131,x0)*(x1-x0),z=-140+rand(i+151,x0)*215;
    const b=desertBlend(x),exists=rand(i+161,x0)>(b*.83);
    const s=exists?.45+rand(i+171,x0)*1.25:.01;
    color.copy(foliage).lerp(dry,b).multiplyScalar(.7+rand(i+91,x0)*.5);
    place(brush,i,x,groundHeight(x,z)+s*.55,z,[s*1.4,s*.8,s],rand(i+41,x0)*6.28,color);
  }
  for(const inst of [rocks,trunk,...crowns,brush]){inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;inst.frustumCulled=false;region.add(inst);}
  return region;
}

export function createBiomes(scene,mobile){
  const spans=[[45,188],[188,296],[296,404],[404,520]],regions=new Array(spans.length);
  const build=i=>{
    if(regions[i])return;
    const [a,b]=spans[i],group=new T.Group();
    group.add(terrainPart(a,b));
    if(i===0)group.add(createStoneGarden(groundHeight));
    group.add(populate(a,b,mobile));group.visible=false;
    scene.add(group);regions[i]=group;
  };
  let preparing=false;
  function prepare(){
    if(preparing)return;preparing=true;
    let i=0;
    const step=()=>{
      if(i>=spans.length)return;
      build(i++);
      if(i<spans.length){
        if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:1800});
        else setTimeout(step,32);
      }
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:1800});
    else setTimeout(step,32);
  }
  const sun=new T.DirectionalLight(0xd7cbb8,1.4);sun.position.set(260,80,28);scene.add(sun);
  return {prepare,update(camera,t){
    sun.intensity=1.4*T.MathUtils.smoothstep(t,.02,.25);
    for(let i=0;i<regions.length;i++){
      const [a,b]=spans[i];
      const visible=t>.015&&camera.position.x>=a-95&&camera.position.x<=b+130;
      if(visible)build(i);
      if(regions[i])regions[i].visible=visible;
    }
  },stats:{groundTriangles:spans.length*30*44*2,instances:spans.length*((mobile?95:170)+(mobile?25:44)*4+(mobile?95:180))}};
}
