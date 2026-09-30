import {worldHeight} from './world-surface.js';
import {createOceanGround,createOceanPetals,loadOceanPetals,coastalColor} from './ocean-production.js';
import * as T from 'three';
import {createDesertProduction,desertGroundColor,loadDesertPetals} from './desert-production.js';
import {createGardenProduction,gardenGroundColor} from './garden-production.js';
import {createPetalInstances,loadOptimizedPetals} from './garden-assembly.js';

const saturate=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
const green=new T.Color(0x23322b), sand=new T.Color(0x655748);
export const desertBlend=x=>smooth(x,223,385);

// Continuous heightfield and palette across the garden/desert boundary.
export const groundHeight=worldHeight;
// Sample the two Desert triangles actually rendered, rather than the smooth
// generator used for the grid vertices. Prevents small horizon gaps.
export function renderedGroundHeight(x,z){
  if(x<296||x>520||z< -365||z>330)return groundHeight(x,z);
  const x0=x<404?296:404,x1=x<404?404:520;
  const dx=(x1-x0)/56,dz=695/68;
  const ix=Math.min(55,Math.floor((x-x0)/dx)),iz=Math.min(67,Math.floor((z+365)/dz));
  const X=x0+ix*dx,Z=-365+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
  if(u+v<=1)return (1-u-v)*groundHeight(X,Z)+u*groundHeight(X+dx,Z)+v*groundHeight(X,Z+dz);
  return (u+v-1)*groundHeight(X+dx,Z+dz)+(1-v)*groundHeight(X+dx,Z)+(1-u)*groundHeight(X,Z+dz);
}
function terrainPart(x0,x1){
  const nx=56,nz=68,geo=new T.BufferGeometry();
  const positions=[],normals=[],colors=[],uvs=[],indices=[],c=new T.Color();
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=x0+(x1-x0)*i/nx,z=-365+j*695/nz,y=groundHeight(x,z);
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
    c.lerp(desertGroundColor(x,z),smooth(x,282,354));
    const rim=smooth(x,42,77)*(1-smooth(x,850,930))*smooth(z,-350,-290)*(1-smooth(z,250,320));
    if(x>=404)c.copy(coastalColor(x,z));
    c.multiplyScalar(.015+rim*.985);
    if(x<296)c.lerp(gardenGroundColor(x,z).multiplyScalar(.015+rim*.985),1-smooth(x,258,296));
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

export const prepareBiomePetals=world=>Promise.all([world.preloadPetals(),world.preloadDesertPetals(),world.preloadOceanPetals?.()]);
// Resource state never clamps navigation. Slow/failed resources are surfaced
// by the loading UI and may be retried without trapping scroll progress.
export function limitUnreadyTravel(target){return target;}

export function createBiomes(scene,mobile,loaders={garden:loadOptimizedPetals,desert:loadDesertPetals,ocean:loadOceanPetals}){
  const spans=[[45,188],[188,296],[296,404],[404,520]],regions=new Array(spans.length);
  const garden=createGardenProduction(groundHeight,mobile);
  const build=i=>{
    if(regions[i])return;
    const [a,b]=spans[i],group=new T.Group();
    group.add(terrainPart(a,b));
    if(i===0)group.add(garden);
    if(i===2)group.add(createDesertProduction(groundHeight,mobile));
    group.visible=false;
    scene.add(group);regions[i]=group;
  };
  const ocean=new T.Group();ocean.name='florr-ocean';ocean.visible=false;scene.add(ocean);
  let preparing=false,groundStatus='pending';
  let petalStatus='pending',desertPetalStatus='pending',oceanPetalStatus='pending';
  let gardenLoad,desertLoad,oceanLoad,petalAssembly;
  const installed={garden:new Set(),desert:new Set(),ocean:new Set()},failures={garden:[],desert:[],ocean:[]};
  let onPrepared=()=>{};
  function installPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.garden.has(n));if(!names.length)return;
    if(!petalAssembly){petalAssembly=new T.Group();petalAssembly.name='florr-petal-assembly';petalAssembly.userData.instanceCount=0;garden.add(petalAssembly);}
    const addition=createPetalInstances(groundHeight,catalog,mobile,names);
    for(const child of [...addition.children])petalAssembly.add(child);
    petalAssembly.userData.instanceCount+=(mobile?36:50)*names.length;
    for(const name of names){installed.garden.add(name);onPrepared(catalog[name]);}
    if(installed.garden.size===6)petalStatus='ready';
  }
  function installDesertPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.desert.has(n));if(!names.length)return;
    build(2);const desert=scene.getObjectByName('florr-desert');
    const addition=createDesertProduction(renderedGroundHeight,mobile,catalog,names);
    for(const child of [...addition.children])desert.add(child);
    for(const name of names){installed.desert.add(name);onPrepared(catalog[name]);}
    if(installed.desert.size===6)desertPetalStatus='ready';
  }
  function installOceanPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.ocean.has(n));if(!names.length)return;
    if(!ocean.getObjectByName('florr-ocean-ground'))ocean.add(createOceanGround());
    const addition=createOceanPetals(catalog,mobile,names);for(const child of [...addition.children])ocean.add(child);
    for(const name of names){installed.ocean.add(name);onPrepared(catalog[name]);}
  }
  function start(kind,loader,install){
    failures[kind]=[];
    return loader((name,mesh)=>install({[name]:mesh})).then(catalog=>{install(catalog);failures[kind]=catalog.failures||[];return failures[kind].length?'error':'ready';}).catch(error=>{failures[kind]=[{message:error.message}];console.error(`${kind} petals unavailable`,error);return 'error';});
  }
  function preloadPetals(){if(petalStatus==='loading'||petalStatus==='ready')return gardenLoad;petalStatus='loading';gardenLoad=start('garden',loaders.garden,installPetals).then(status=>{petalStatus=status;});return gardenLoad;}
  function preloadDesertPetals(){if(desertPetalStatus==='loading'||desertPetalStatus==='ready')return desertLoad;desertPetalStatus='loading';desertLoad=start('desert',loaders.desert,installDesertPetals).then(status=>{desertPetalStatus=status;});return desertLoad;}
  function preloadOceanPetals(){if(oceanPetalStatus==='loading'||oceanPetalStatus==='ready')return oceanLoad;oceanPetalStatus='loading';oceanLoad=start('ocean',loaders.ocean||loadOceanPetals,installOceanPetals).then(status=>{oceanPetalStatus=status;});return oceanLoad;}
  function prepare(){
    if(preparing)return;preparing=true;groundStatus='loading';
    let i=0;
    const step=()=>{
      if(i>=spans.length){groundStatus='ready';return;}
      build(i++);
      if(i<spans.length){
        if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:250});
        else setTimeout(step,32);
      }else {if(!ocean.getObjectByName('florr-ocean-ground'))ocean.add(createOceanGround());groundStatus='ready';}
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:250});
    else setTimeout(step,32);
  }
  const sun=new T.DirectionalLight(0xd7cbb8,1.4);sun.position.set(260,80,28);scene.add(sun);
  const gardenAir=new T.Color(0x11151a),desertAir=new T.Color(0x342b25);
  return {set onAssetPrepared(fn){onPrepared=fn;},get loading(){return {counts:{garden:installed.garden.size,desert:installed.desert.size,ocean:installed.ocean.size},failures};},prepare,preloadOceanPetals,preloadPetals,installPetals,preloadDesertPetals,installDesertPetals,update(camera,t){
    sun.intensity=1.4*T.MathUtils.smoothstep(t,.02,.25);
    const shift=desertBlend(camera.position.x+42)*t;
    sun.color.set(0xd7cbb8).lerp(new T.Color(0xe2ba8b),shift*.42);
    if(t>0){
      // Do not touch the proven Hero atmosphere until the camera has entered the world.
      scene.fog?.color.copy(gardenAir).lerp(new T.Color(0x263d2c),smooth(t,.01,.3)*.55).lerp(desertAir,shift*.16);
      if(scene.fog)scene.fog.density=T.MathUtils.lerp(scene.fog.density,.0036,T.MathUtils.smoothstep(t,0,.38));
    }
    ocean.visible=t>0&&camera.position.x>235;
    if(camera.position.x>470){const oceanShift=smooth(camera.position.x,470,640);scene.fog?.color.lerp(new T.Color(0x1d485d),oceanShift);sun.color.lerp(new T.Color(0xbde5ef),oceanShift*.7);}
    // The complete small Gate is ready before the camera can see a region seam.
    // Runtime visibility follows the whole world, never an individual tile edge.
    for(let i=0;i<regions.length;i++){
      if(regions[i])regions[i].visible=t>0;
    }
  },get oceanPetalStatus(){return oceanPetalStatus;},get gardenStatus(){return 'ready';},get groundStatus(){return groundStatus;},get petalStatus(){return petalStatus;},get desertPetalStatus(){return desertPetalStatus;},stats:{groundTriangles:spans.length*56*68*2}};
}
