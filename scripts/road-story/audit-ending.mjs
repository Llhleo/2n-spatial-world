import fs from 'node:fs';
import * as T from 'three';
import {createMemoryScene} from '../../src/guild-memory-scene.js';
const asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial());
const result={aspects:[],frames:0,minimumPetalGap:Infinity,minimumMarkBoxGap:Infinity,maxFinalNdcX:0};
for(const aspect of [.35,.46,.6,1.8]){
 const memory=createMemoryScene({mobile:aspect<1}),camera=new T.PerspectiveCamera(48,aspect,.2,2400),matrix=new T.Matrix4();memory.install(asset,'garden','rose');
 try{for(let tick=0;tick<=360;tick++){
  const t=tick/360;memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true,roadArrival:{}},camera,.05);memory.group.updateMatrixWorld(true);result.frames++;
  const points=memory.group.children.filter(o=>o.isInstancedMesh).flatMap(pool=>Array.from({length:pool.count},(_,i)=>{pool.getMatrixAt(i,matrix);return new T.Vector3().setFromMatrixPosition(matrix);}));
  if(t>=.9167){const box=new T.Box3().setFromObject(memory.group.getObjectByName('ending-mark-depth'));for(const p of points)result.minimumMarkBoxGap=Math.min(result.minimumMarkBoxGap,box.distanceToPoint(p)-2.2);}
  if(t>.9889)for(let i=0;i<points.length;i++){
   result.maxFinalNdcX=Math.max(result.maxFinalNdcX,Math.abs(points[i].clone().project(camera).x));
   for(let j=0;j<i;j++)result.minimumPetalGap=Math.min(result.minimumPetalGap,points[i].distanceTo(points[j])-4.4);
  }
 }result.aspects.push({aspect,count:memory.instanceCount});}finally{memory.dispose();}
}
asset.geometry.dispose();asset.material.dispose();
fs.mkdirSync('scripts/road-story/cache',{recursive:true});fs.writeFileSync('scripts/road-story/cache/ending-audit.json',JSON.stringify(result,null,2));console.log(result);
if(result.minimumPetalGap<0||result.minimumMarkBoxGap<0||result.maxFinalNdcX>.97)throw new Error('Ending spatial audit failed');
