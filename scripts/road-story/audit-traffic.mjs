import fs from 'node:fs';
import * as T from 'three';
import {createRoadGeometry} from '../../src/road-story/geometry.js';
import {PETAL_NAMES} from '../../src/road-traffic.js';
const read=p=>JSON.parse(fs.readFileSync(p));
const geometry=new T.SphereGeometry(1,6,4),material=new T.MeshBasicMaterial(),assets=new Map(PETAL_NAMES.map(name=>[name,{geometry,material,face:new T.Quaternion()}]));
const world=createRoadGeometry({assets,vectorText:read('public/assets/road-story/text-meshes.json'),waveConfig:read('public/assets/road-story/wave-config.json'),historyRecords:read('content/history.json').events});
const camera=new T.PerspectiveCamera(40,414/896,.2,2400);camera.position.set(477,0,-346);camera.lookAt(481,0,-540);camera.updateMatrixWorld();
let minimum=Infinity,swept=Infinity,overlaps=0,pairs=0,previous=new Map(),worst=null,closest=null;
for(let time=0;time<=600;time+=.5){
 world.update(time,camera,18.1);const current=new Map();
 for(const [scene,context] of world.contexts.entries()){
  const buckets=new Map();
  for(const [index,p] of context.petals.entries()){
   const route=p.mesh.userData.route,q=p.mesh.position.clone();
   if(route){if(Math.abs(q.x)>250||Math.abs(q.y)>380||q.z< -400||q.z>140)continue;q.applyMatrix4(route.road.root.matrix);}
   const radius=p.mesh.scale.x,id=scene+':'+index,cell=q.toArray().map(v=>Math.floor(v/16));current.set(id,q);
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const other of buckets.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))||[]){
    pairs++;const gap=q.distanceTo(other.q)-radius-other.radius;if(gap<minimum){minimum=gap;closest={time,scene,names:[p.mesh.userData.assetName,other.name],lanes:[route?.lane,other.lane],roads:[route?context.roads.indexOf(route.road):null,other.road],ids:[id,other.id]};}if(gap<0)overlaps++;
    const oldA=previous.get(id),oldB=previous.get(other.id);
    if(oldA&&oldB&&oldA.distanceTo(q)<20&&oldB.distanceTo(other.q)<20){const a=oldA.clone().sub(oldB),v=q.clone().sub(other.q).sub(a),u=T.MathUtils.clamp(-a.dot(v)/(v.lengthSq()||1),0,1),g=a.addScaledVector(v,u).length()-radius-other.radius;if(g<swept){swept=g;worst={time,scene,names:[p.mesh.userData.assetName,other.name],routes:[!!route,other.route],lanes:[route?.lane,other.lane],roads:[route?context.roads.indexOf(route.road):null,other.road],ids:[id,other.id]};}}
   }
   const key=cell.join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({id,q,radius,name:p.mesh.userData.assetName,route:!!route,lane:route?.lane,road:route?context.roads.indexOf(route.road):null});
  }
 }previous=current;
}
const result={seconds:600,step:.5,instances:world.instanceCount,pairs,minimum,swept,overlaps,worst,closest};
fs.mkdirSync('scripts/road-story/cache',{recursive:true});fs.writeFileSync('scripts/road-story/cache/traffic-audit.json',JSON.stringify(result,null,2));console.log(result);
if(overlaps||swept<.2)throw new Error('Petal sphere clearance failed');
