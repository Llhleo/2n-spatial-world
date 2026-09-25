import * as T from 'three';

// Direction B: one continuous graphic field, with real depth in the petals.
const leafGreen=new T.MeshStandardMaterial({color:0x527f38,roughness:1,flatShading:true,side:T.DoubleSide});
const paleGreen=new T.MeshStandardMaterial({color:0x87b34c,roughness:1,flatShading:true,side:T.DoubleSide});
const cream=new T.MeshStandardMaterial({color:0xf3e7c8,roughness:1,side:T.DoubleSide});
const rose=new T.MeshStandardMaterial({color:0xe5aaa5,roughness:1,side:T.DoubleSide});
const yellow=new T.MeshStandardMaterial({color:0xeab956,roughness:1});
const red=new T.MeshStandardMaterial({color:0xd7503f,roughness:1});
const ink=new T.MeshStandardMaterial({color:0x172420,roughness:1});
const shared={leaf:new T.SphereGeometry(1,8,6),dot:new T.SphereGeometry(1,6,4)};
const random=(n)=>{const v=Math.sin(n*127.1+4.13)*43758.5453;return v-Math.floor(v);};

export function gardenGroundColor(x,z){
  const entry=T.MathUtils.smoothstep(x,52,118);
  const ribbon=Math.sin(x*.029+Math.sin(z*.016)*1.7+z*.007);
  const shade=.52+.18*ribbon+.07*Math.sin(z*.031-x*.017);
  const green=new T.Color().setHSL(.245,.39,shade);
  return new T.Color(0x111b19).lerp(green,entry);
}

function petalGeometry(width,height){
  const shape=new T.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(-width*.48,height*.22,-width*.78,height*.73,-width*.4,height*.91);
  shape.bezierCurveTo(-width*.18,height*1.11,width*.21,height*1.11,width*.46,height*.88);
  shape.bezierCurveTo(width*.82,height*.56,width*.43,height*.16,0,0);
  return new T.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:true,bevelThickness:.45,bevelSize:.45,bevelSegments:2,steps:1,curveSegments:8});
}

function petal(group,height,x,z,width,h,turn,material){
  const mesh=new T.Mesh(petalGeometry(width,h),material);
  mesh.position.set(x,height(x,z)-.1,z);
  mesh.rotation.y=turn;
  mesh.rotation.z=(random(x+z)-.5)*.13;
  mesh.castShadow=false;
  group.add(mesh);
}

function leaf(group,height,x,z,size,turn,material=leafGreen){
  const mesh=new T.Mesh(shared.leaf,material);
  mesh.scale.set(size*.34,size,Math.max(1,size*.15));
  mesh.rotation.set(.13,turn,-.16);
  mesh.position.set(x,height(x,z)+size*.72,z);
  group.add(mesh);
}

function flower(group,height,x,z,r,material){
  const y=height(x,z)+r*.35;
  for(let j=0;j<5;j++){
    const angle=j*Math.PI*2/5;
    const mesh=new T.Mesh(shared.leaf,material);
    mesh.scale.set(r*.62,r*.22,r*.38);
    mesh.rotation.y=-angle;
    mesh.position.set(x+Math.cos(angle)*r*.55,y,z+Math.sin(angle)*r*.55);
    group.add(mesh);
  }
  const core=new T.Mesh(shared.dot,yellow);
  core.scale.set(r*.35,r*.28,r*.35);core.position.set(x,y+r*.14,z);group.add(core);
}

function creatures(group,height,mobile){
  // Original geometric cues, not a copy of the source sprites or GLBs.
  for(const [x,z,kind] of [[139,52,'bee'],[250,-42,'ladybug']].slice(0,mobile?1:2)){
    const body=new T.Mesh(shared.leaf,kind==='bee'?yellow:red);
    body.scale.set(1.7,1.45,1.6);body.position.set(x,height(x,z)+(kind==='bee'?9:1.4),z);
    group.add(body);
    const marking=new T.Mesh(shared.dot,ink);
    marking.scale.set(.65,.58,.5);marking.position.copy(body.position).add(new T.Vector3(.45,.15,1.14));group.add(marking);
    if(kind==='bee')for(const side of [-1,1]){
      const wing=new T.Mesh(shared.leaf,cream);
      wing.scale.set(.9,.18,.52);wing.position.copy(body.position).add(new T.Vector3(-.25,1.3,side*.75));group.add(wing);
    }
  }
}

export function createGardenProduction(height,mobile){
  const group=new T.Group();group.name='garden-asset-gate';
  const portal=new T.Group();portal.name='garden-petal-portal';group.add(portal);
  // The camera crosses between these tall silhouettes instead of looking at a wall.
  const tall=[
    [163,27,13,47,-.36,cream],[174,116,11,41,.8,rose],
    [198,10,16,56,-.62,cream],[204,100,12,48,.48,cream],
    [233,-20,12,43,-.4,rose],[248,65,13,45,.7,cream]
  ];
  for(const [x,z,w,h,a,mat] of tall.slice(0,mobile?4:6))petal(portal,height,x,z,w,h,a,mat);
  // Petal-ring focus from the chosen image; sparse enough to read at phone width.
  for(const [x,z,w,h,a,mat] of [
    [223,-74,11,27,.5,cream],[249,-67,10,31,-.3,rose],
    [273,-83,11,28,.85,cream],[272,-31,10,27,-.8,rose]
  ])petal(group,height,x,z,w,h,a,mat);
  const sites=[[113,-16,6,cream],[146,-64,8,cream],[164,5,6,rose],
    [190,-58,8,cream],[226,118,6,cream],[251,-6,8,cream],[279,45,7,rose]];
  for(const [x,z,r,mat] of sites)flower(group,height,x,z,mobile?r*.8:r,mat);
  const plants=mobile?34:62;
  for(let i=0;i<plants;i++){
    const x=91+random(i*3+1)*207,z=-115+random(i*3+2)*265;
    const nearCorridor=x>155&&x<239&&z>17&&z<102;
    if(nearCorridor)continue;
    leaf(group,height,x,z,2.3+random(i*3+3)*4,random(i*3+4)*Math.PI,paleGreen);
  }
  creatures(group,height,mobile);
  return group;
}
