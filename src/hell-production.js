import * as T from 'three';
import {worldHeight} from './world-surface.js';
import {jungleSurface,junglePose,createRegionGround} from './jungle-production.js';
import {petalPlacementSteps,finishSteps,runSteps} from './petal-placement.js';
import {loadPetalCatalog} from './petal-loader.js';
import {motionPath} from './motion-path.js';
const hash=n=>{const a=Math.sin(n*89.17+41.3)*43758.5453;return a-Math.floor(a);};
export const HELL_POPULATION={darkmark:[72,96],corruption:[54,72]};
export const createHellGround=()=>createRegionGround(1280,1740,'florr-hell-ground');
export function hellSurface(x,z){
 if(x<1280)return jungleSurface(x,z);
 const dx=460/80,dz=695/68,ix=Math.max(0,Math.min(79,Math.floor((x-1280)/dx))),iz=Math.max(0,Math.min(67,Math.floor((z+365)/dz)));
 const X=1280+ix*dx,Z=-365+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
 return u+v<=1?(1-u-v)*worldHeight(X,Z)+u*worldHeight(X+dx,Z)+v*worldHeight(X,Z+dz):(u+v-1)*worldHeight(X+dx,Z+dz)+(1-v)*worldHeight(X+dx,Z)+(1-u)*worldHeight(X,Z+dz);
}
export function* hellPetalSteps(catalog,mobile,names=Object.keys(HELL_POPULATION)){
 const group=new T.Group();group.name='florr-hell-petals';
 for(const [species,counts] of Object.entries(HELL_POPULATION)){
  if(!names.includes(species)||!catalog[species])continue;
  const total=counts[mobile?0:1],speciesIndex=species==='darkmark'?0:1;
  for(let zone=0;zone<3;zone++){
   const count=Math.floor((total+2-zone)/3);
   group.add(yield* petalPlacementSteps(catalog[species],count,species==='darkmark'?3.9:3.4,i=>{
    const key=i*67+zone*337+speciesIndex*197;
    return {x:1228+zone*117+hash(key+1)*99,z:[-86,-42,5,51,94][i%5]+(hash(key+2)-.5)*38,scale:.8+hash(key+3)*.4,pitch:i%6===0?-1.42:-.60-hash(key+4)*.47,yaw:-Math.PI/2+(hash(key+5)-.5)*.8,roll:(hash(key+6)-.5)*.25};
   },hellSurface,`hell-${species}-${zone}`));
  }
 }
 return group;
}
export const createHellPetals=(...args)=>finishSteps(hellPetalSteps(...args));
export const createHellPetalsAsync=(...args)=>runSteps(hellPetalSteps(...args));
export const loadHellPetals=onAsset=>loadPetalCatalog(Object.keys(HELL_POPULATION).map(n=>[n,`assets/hell-petals/${n}.glb`]),onAsset);
const end=junglePose(1,new T.PerspectiveCamera()),near=junglePose(.99999,new T.PerspectiveCamera());
const incoming=Object.fromEntries([['p','position'],['target','target']].map(([k,key])=>[k,end[key].map((v,i)=>(v-near[key][i])/.00001)]));
export const hellPose=motionPath([{t:0,p:end.position,target:end.target},{t:.34,p:[1302,4,12],target:[1375,-34,0]},{t:.68,p:[1431,3,-8],target:[1507,-35,4]},{t:1,p:[1570,5,2],target:[1650,-34,-3]}],incoming);
