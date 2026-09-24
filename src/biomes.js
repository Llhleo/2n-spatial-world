import * as T from 'three';
import {createStoneGarden} from './garden-art.js';
import {createGardenAssets} from './garden-assets.js';
import {loadGardenGate} from './garden-gate.js';

const saturate=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
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
  const nx=56,nz=68,geo=new T.BufferGeometry();
  const positions=[],normals=[],colors=[],uvs=[],indices=[],c=new T.Color();
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=x0+(x1-x0)*i/nx,z=-300+j*570/nz,y=groundHeight(x,z);
    positions.push(x,y,z);
    uvs.push(x/900,z/900);
    // A world-space derivative shares the same normals across every region seam.
    const dx=(groundHeight(x+.3,z)-groundHeight(x-.3,z))/.6;
    const dz=(groundHeight(x,z+.3)-groundHeight(x,z-.3))/.6;
    const normal=new T.Vector3(-dx,1,-dz).normalize();
    normals.push(normal.x,normal.y,normal.z);
    c.copy(green).lerp(sand,desertBlend(x));
    const fleck=.024*Math.sin(x*.12+z*.05)+.012*Math.sin(x*.24-z*.08);
    c.offsetHSL(0,0,fleck);
    const rim=smooth(x,42,77)*(1-smooth(x,452,520))*smooth(z,-300,-235)*(1-smooth(z,170,270));
    c.multiplyScalar(.015+rim*.985);
    colors.push(c.r,c.g,c.b);
    if(i<nx&&j<nz){const p=i*(nz+1)+j;indices.push(p,p+1,p+nz+1,p+1,p+nz+2,p+nz+1);}
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  mesh.name='continuous-3d-ground';mesh.frustumCulled=true;return mesh;
}

export function createBiomes(scene,mobile){
  const spans=[[45,188],[188,296],[296,404],[404,520]],regions=new Array(spans.length);
  let gardenGate,gardenStatus='pending';
  function installGarden(i){
    const region=regions[i];
    if(!region||!gardenGate||region.userData.gardenInstalled)return;
    for(const child of [...region.children]){
      if(child.name!=='garden-sculpted-landscape'&&!child.name.startsWith('planted-strata-'))continue;
      region.remove(child);
      child.traverse(part=>{
        if(!part.isMesh)return;
        part.geometry.dispose();
        if(Array.isArray(part.material))part.material.forEach(material=>material.dispose());
        else part.material.dispose();
      });
    }
    const ground=region.getObjectByName('continuous-3d-ground');
    ground.material.dispose();
    ground.material=new T.MeshStandardMaterial({
      map:gardenGate.diffuse,normalMap:gardenGate.normal,
      color:0xa5b2a3,roughness:1,side:T.DoubleSide
    });
    if(i===0)region.add(gardenGate.group);
    region.userData.gardenInstalled=true;
  }
  function loadGarden(){
    if(gardenStatus!=='pending')return;
    gardenStatus='loading';
    loadGardenGate(groundHeight,mobile).then(assets=>{
      gardenGate=assets;gardenStatus='ready';
      installGarden(0);installGarden(1);
    }).catch(error=>{gardenStatus='error';console.error('Garden asset loading failed',error);});
  }
  const build=i=>{
    if(regions[i])return;
    const [a,b]=spans[i],group=new T.Group();
    group.add(terrainPart(a,b));
    if(i===0&&gardenStatus!=='ready')group.add(createStoneGarden(groundHeight));
    if(i>=2||gardenStatus!=='ready')group.add(createGardenAssets(a,b,groundHeight,desertBlend,mobile));
    group.visible=false;
    scene.add(group);regions[i]=group;
    if(i<2)installGarden(i);
  };
  let preparing=false;
  function prepare(){
    loadGarden();
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
    if(t>0)loadGarden();
    sun.intensity=1.4*T.MathUtils.smoothstep(t,.02,.25);
    const shift=desertBlend(camera.position.x+42)*t;
    sun.color.set(0xd7cbb8).lerp(new T.Color(0xe2ba8b),shift*.42);
    if(t>0){
      // Do not touch the proven Hero atmosphere until the camera has entered the world.
      scene.fog?.color.copy(gardenAir).lerp(desertAir,shift*.16);
      if(scene.fog)scene.fog.density=T.MathUtils.lerp(scene.fog.density,.0036,T.MathUtils.smoothstep(t,0,.38));
    }
    // The complete small Gate is ready before the camera can see a region seam.
    // Runtime visibility follows the whole world, never an individual tile edge.
    if(t>0)for(let i=0;i<regions.length;i++)build(i);
    for(let i=0;i<regions.length;i++){
      if(regions[i])regions[i].visible=t>0;
    }
  },get gardenStatus(){return gardenStatus;},stats:{groundTriangles:spans.length*56*68*2}};
}
