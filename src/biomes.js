import * as T from 'three';
import {createStoneGarden} from './garden-art.js';
import {createGardenAssets} from './garden-assets.js';

const saturate=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
const rand=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const green=new T.Color(0x23322b), sand=new T.Color(0x655748);
export const desertBlend=x=>smooth(x,223,385);

// Continuous heightfield and palette across the garden/desert boundary.
export function groundHeight(x,z){
  const dune=smooth(x,238,365);
  const ridge=Math.sin(x*.021+Math.sin(z*.028)*1.7)*4.8+Math.cos(z*.033+x*.008)*3.4;
  const close=Math.sin(x*.073+z*.045)*1.05+Math.cos(z*.088-x*.052)*.7;
  const long=Math.sin(z*.014+x*.012)*3.6;
  const edge=smooth(x,42,77)*(1-smooth(x,452,520))*smooth(z,-300,-235)*(1-smooth(z,170,270));
  return -85+edge*(49+ridge+close+dune*long);
}
function terrainPart(x0,x1){
  const nx=30,nz=44,geo=new T.BufferGeometry();
  const positions=[],colors=[],indices=[],c=new T.Color();
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=x0+(x1-x0)*i/nx,z=-300+j*570/nz,y=groundHeight(x,z);
    positions.push(x,y,z);
    c.copy(green).lerp(sand,desertBlend(x));
    const fleck=.024*Math.sin(x*.12+z*.05)+.012*Math.sin(x*.24-z*.08);
    c.offsetHSL(0,0,fleck);
    const rim=smooth(x,42,77)*(1-smooth(x,452,520))*smooth(z,-300,-235)*(1-smooth(z,170,270));
    c.multiplyScalar(.015+rim*.985);
    colors.push(c.r,c.g,c.b);
    if(i<nx&&j<nz){const p=i*(nz+1)+j;indices.push(p,p+1,p+nz+1,p+1,p+nz+2,p+nz+1);}
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  mesh.name='continuous-3d-ground';mesh.frustumCulled=true;return mesh;
}

export function createBiomes(scene,mobile){
  const spans=[[45,188],[188,296],[296,404],[404,520]],regions=new Array(spans.length);
  const build=i=>{
    if(regions[i])return;
    const [a,b]=spans[i],group=new T.Group();
    group.add(terrainPart(a,b));
    if(i===0)group.add(createStoneGarden(groundHeight));
    group.add(createGardenAssets(a,b,groundHeight,desertBlend,mobile));group.visible=false;
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
        if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:250});
        else setTimeout(step,32);
      }
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:250});
    else setTimeout(step,32);
  }
  const sun=new T.DirectionalLight(0xd7cbb8,1.4);sun.position.set(260,80,28);scene.add(sun);
  const gardenAir=new T.Color(0x11151a),desertAir=new T.Color(0x342b25);
  return {prepare,update(camera,t){
    sun.intensity=1.4*T.MathUtils.smoothstep(t,.02,.25);
    const shift=desertBlend(camera.position.x+42)*t;
    sun.color.set(0xd7cbb8).lerp(new T.Color(0xe2ba8b),shift*.42);
    scene.fog?.color.copy(gardenAir).lerp(desertAir,shift*.16);
    // The complete small Gate is ready before the camera can see a region seam.
    // Runtime visibility follows the whole world, never an individual tile edge.
    if(t>0)for(let i=0;i<regions.length;i++)build(i);
    for(let i=0;i<regions.length;i++){
      if(regions[i])regions[i].visible=t>0;
    }
  },stats:{groundTriangles:spans.length*30*44*2}};
}
