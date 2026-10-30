import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createTraffic,trafficCoordinate,PETAL_NAMES} from '../road-traffic.js';
import {offsets,makeConnections} from './journey.js';
import {roadTextParts} from './typography.js';

export function createRoadGeometry({assets,vectorText,waveConfig,historyRecords}){
const W=864,H=1872,camera=new T.PerspectiveCamera(40,W/H,.1,2400),plates=new T.Group();
const V=(x,y,z)=>new T.Vector3(x,y,z);let seed=3349;
const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const roads=[],backgrounds=[],petals=[];
const matte=new T.MeshStandardMaterial({color:0x28323b,metalness:.55,roughness:.38,side:T.DoubleSide});
const fine=new T.MeshBasicMaterial({color:0x7a8c94,transparent:true,opacity:.6});
const outline=new T.MeshBasicMaterial({color:0xd9dfd9,transparent:true,opacity:.85});
const faint=new T.MeshBasicMaterial({color:0x53656d,transparent:true,opacity:.5});
const warm=new T.MeshBasicMaterial({color:0xe9c994});
function curve(points){return new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');}
const stageMotion={kind:0,root:null,position:null,quaternion:null,pattern:true};
function configureStage(root,kind){stageMotion.kind=kind;stageMotion.root=root;stageMotion.position=camera.position.clone();stageMotion.quaternion=camera.quaternion.clone();stageMotion.lineRow=0;}
function waveMesh(mesh){
 mesh.userData.wave=true;const uniform={value:7.25};mesh.material.userData.waveTime=uniform;
 if(mesh.isInstancedMesh){mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.material.userData.tidalNearFade={value:new T.Vector2(95,165)};}
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.waveTime=uniform;shader.vertexShader='uniform float waveTime;\n'+shader.vertexShader;
  const n=v=>Number(v).toFixed(6),field=mesh.isInstancedMesh?'mvPosition':'transformed',sample=mesh.isInstancedMesh?'waveSource':'position';
  const displace=Object.entries(waveConfig).map(([axis,terms])=>field+'.'+axis+' += '+terms.map(c=>n(c.a)+'*sin('+sample+'.x*'+n(c.x)+'+'+sample+'.y*'+n(c.y)+'+waveTime*'+n(c.t)+')').join('+')+';').join('\n');
  if(mesh.isInstancedMesh){
   shader.uniforms.tidalNearFade=mesh.material.userData.tidalNearFade;
   shader.vertexShader='uniform vec2 tidalNearFade;\nvarying float vTidalVisibility;\n'+shader.vertexShader;
   shader.fragmentShader='varying float vTidalVisibility;\n'+shader.fragmentShader;
   const project=T.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;','vec3 waveSource = mvPosition.xyz;\n'+displace+'\nmvPosition = modelViewMatrix * mvPosition;\nvTidalVisibility = smoothstep(tidalNearFade.x,tidalNearFade.y,-mvPosition.z);');
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',project);
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vTidalVisibility;');
  }
  else shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+displace);
 };
 mesh.material.customProgramCacheKey=()=>mesh.isInstancedMesh?'2n-tidal-instances-v13-near-fade':'2n-tidal-v11';return mesh;
}
function bgStroke(parent,points,radius,mat,segments){return waveMesh(stageMotion.pattern?typeContour(parent,points,mat,stageMotion.lineRow++):tube(parent,points,radius,mat,segments));}
let glyphGeometry=null;
function typeContour(parent,points,mat,row=0){
 mat.side=T.DoubleSide;
 const c=curve(points),count=Math.max(4,Math.floor(c.getLength()/3.2));
 if(!glyphGeometry){
  const pos=[],idx=[],glyphs=[[[0,.8],[.2,1],[.8,1],[1,.8],[1,.6],[0,0],[1,0]],[[1.5,0],[1.5,.7],[1.5,.5],[1.8,.7],[2.15,.7],[2.15,0]]];
  for(const stroke of glyphs)for(let j=1;j<stroke.length;j++){const a=V(stroke[j-1][0]*.9,stroke[j-1][1]*.9,0),b=V(stroke[j][0]*.9,stroke[j][1]*.9,0),w=b.clone().sub(a).cross(V(0,0,1)).normalize().multiplyScalar(.065),o=pos.length/3;pos.push(...a.clone().add(w).toArray(),...a.clone().sub(w).toArray(),...b.clone().add(w).toArray(),...b.clone().sub(w).toArray());idx.push(o,o+1,o+2,o+2,o+1,o+3);}
  glyphGeometry=new T.BufferGeometry();glyphGeometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));glyphGeometry.setIndex(idx);glyphGeometry.computeVertexNormals();
 }
 const mesh=new T.InstancedMesh(glyphGeometry,mat,count),matrix=new T.Matrix4();mesh.userData.typeLine=true;
 for(let n=0;n<count;n++){const u=row%2?1-(n+.25)/count:(n+.25)/count,p=c.getPointAt(u),t=c.getTangentAt(u).normalize().multiplyScalar(row%2?-1:1),up=V(-t.y,t.x,0).normalize(),normal=new T.Vector3().crossVectors(t,up).normalize();matrix.makeBasis(t,up,normal);matrix.setPosition(p);mesh.setMatrixAt(n,matrix);}
 parent.add(mesh);return mesh;
}
function preparePetalClearance(){}
function inkMotion(mesh,phase=0,strength=.5){mesh.userData.inkMotion={base:mesh.material.color.clone(),phase,strength};return mesh;}
function tube(parent,points,radius,mat,segments=96){const c=points instanceof T.Curve?points:curve(points);const mesh=new T.Mesh(new T.TubeGeometry(c,segments,radius,4,false),mat);parent.add(mesh);return mesh;}

function roadStroke(parent,pts,radius,material){
 const positions=[],indices=[],sides=4;
 for(let i=0;i<pts.length;i++){const tangent=pts[Math.min(pts.length-1,i+1)].clone().sub(pts[Math.max(0,i-1)]).normalize(),side=new T.Vector3().crossVectors(tangent,V(0,0,1)).normalize(),normal=new T.Vector3().crossVectors(tangent,side).normalize();
 for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;positions.push(...pts[i].clone().addScaledVector(side,Math.cos(a)*radius).addScaledVector(normal,Math.sin(a)*radius).toArray());}
 if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;indices.push(a,c,b,b,c,d);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);parent.add(mesh);return mesh;
}
// A real curved 3D surface plus thin longitudinal engravings. The surface,
// side walls and lines all share one parameterization, so lines sit on it.
function ribbon(parent,points,{width=14,twist=0,bow=.23,lines=19,dim=false,detail=false}={}){
 const root=new T.Group();root.name='solid-ribbon';parent.add(root);parent=root;
 const c=curve(points),L=c.getLength(),extension=6000,gridU=[...Array.from({length:48},(_,i)=>-extension/L*(1-i/48)),...Array.from({length:149},(_,i)=>i/148),...Array.from({length:48},(_,i)=>1+extension/L*(i+1)/48)],N=gridU.length-1,M=16;
 const sample=(u,v,back=0)=>{
  const k=Math.max(0,Math.min(1,u)),delta=(u-k)*L,distance=Math.abs(delta),falloff=Math.exp(-distance/250),reach=250*(1-falloff),axis=c.getTangentAt(k).normalize(),p=c.getPointAt(k).addScaledVector(axis,Math.sign(delta)*reach).add(V(0,0,-(distance-reach))),t=axis.multiplyScalar(falloff).add(V(0,0,-Math.sign(delta)*(1-falloff))).normalize();
  const side=V(-t.y,t.x,0).normalize();if(side.lengthSq()<.1)side.set(1,0,0);
  side.applyAxisAngle(t,twist+Math.sin(k*Math.PI*2)*.12);
  const normal=new T.Vector3().crossVectors(t,side).normalize();
  const taper=.72+.28*Math.sin(Math.PI*k),cross=(v-.5)*width*taper;
  return p.addScaledVector(side,cross).addScaledVector(normal,width*bow*(1-(v*2-1)**2)-back);
 };
 const positions=[],indices=[],offset=(N+1)*(M+1),thickness=1.4;
 for(let side=0;side<2;side++)for(let i=0;i<=N;i++)for(let j=0;j<=M;j++)positions.push(...sample(gridU[i],j/M,side*thickness).toArray());
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1,a+offset,a+1+offset,b+offset,b+offset,a+1+offset,b+1+offset);}
 for(let i=0;i<N;i++)for(const edge of [0,M]){const a=i*(M+1)+edge,b=a+M+1;indices.push(a,a+offset,b,b,a+offset,b+offset);}
 for(const end of [0,N])for(let j=0;j<M;j++){const a=end*(M+1)+j,b=a+1;indices.push(a,b,a+offset,b,b+offset,a+offset);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const solid=new T.Mesh(geo,matte);solid.userData.roadCaps=[gridU[0],gridU[N]].map(u=>[0,1.4].flatMap(back=>Array.from({length:17},(_,v)=>sample(u,v/16,back).toArray())));parent.add(solid);
 for(const edge of [0,1]){
  const edgePoints=[];for(let i=0;i<=N;i++)edgePoints.push(sample(gridU[i],edge,.0));
  roadStroke(parent,edgePoints,dim?.055:.115,dim?faint:outline,N);
 }
 for(let j=1;j<lines;j++){
  const pts=[];for(let i=0;i<=N;i++)pts.push(sample(gridU[i],j/lines,-.035));
  roadStroke(parent,pts,dim?.025:(j%5===0?.072:.035),dim?faint:fine,N);
 }
 if(detail){
  const sideInk=new T.MeshStandardMaterial({color:0x52616b,metalness:.65,roughness:.3});
  const seamInk=new T.MeshBasicMaterial({color:dim?0x34424a:0x697a80});
  for(const v of [.025,.975]){
   const pts=[];for(let i=0;i<=N;i++)pts.push(sample(gridU[i],v,.85));
   roadStroke(parent,pts,.13,sideInk,N);
  }
  for(let k=1;k<35;k++){
   const u=k/35,pts=[];
   for(let j=0;j<=16;j++)pts.push(sample(u+.002*Math.sin(j/16*Math.PI),.06+.88*j/16,-.07));
   roadStroke(parent,pts,k%4===0?.045:.022,seamInk,16);
   if(k%2===0)for(const v of [.065,.935]){
    const bolt=new T.Mesh(new T.SphereGeometry(.13,8,6),sideInk);bolt.position.copy(sample(u,v,-.14));parent.add(bolt);
   }
  }
  // Short inlays share the exact surface parameterization and remain inset.
  for(let k=2;k<18;k++){
   const pts=[];for(let j=0;j<=8;j++)pts.push(sample(k/20+j*.0007,.14,-.10));
   inkMotion(roadStroke(parent,pts,.055,new T.MeshBasicMaterial({color:0xa58a60}),8),k*.62,.85);
  }
 }
 const spark=new T.Group();
 const road={root,sample,curve:c,spark,phase:roads.length*.83,width,endU:[gridU[0],gridU[N]]};roads.push(road);return road;
}

// Engraved height-field surfaces and their contour strokes occupy real depth.
// Each frame has a different distant composition rather than an empty sky.
function backgroundDesign(parent,kind){
 const g=new T.Group();g.name='engraved-background-'+kind;parent.add(g);backgrounds.push(g);
 const makeInk=(level)=>new T.MeshBasicMaterial({color:new T.Color(.16*level,.205*level,.24*level)});
 const contour=(cx,cy,base,extent,stretch=1,lean=0)=>{
  const height=(x,y)=>{const dx=x-cx,dy=(y-cy)/stretch,r=Math.hypot(dx,dy);return base+110*(1-Math.exp(-r*r/19000))+14*Math.sin(x*.011+y*.007);};
  const pos=[],idx=[],NX=48,NY=72;
  for(let i=0;i<=NY;i++)for(let j=0;j<=NX;j++){const x=-225+j*450/NX,y=-370+i*740/NY;pos.push(x,y,height(x,y)-.5);}
  for(let i=0;i<NY;i++)for(let j=0;j<NX;j++){const a=i*(NX+1)+j,b=a+NX+1;idx.push(a,a+1,b,a+1,b+1,b);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  // Open contour field: no opaque rectangular backing to intersect travelling roads.
  for(let k=0;k<74;k++){
   const r=10+k*extent/74,pts=[];
   for(let j=0;j<=120;j++){const a=j/120*Math.PI*2,rr=r*(1+.10*Math.sin(a*3+.8)+.045*Math.cos(a*5+r*.018));const x=cx+Math.cos(a)*rr+lean*Math.sin(a)*rr,y=cy+Math.sin(a)*rr*stretch;pts.push([x,y,height(x,y)]);}
   const falloff=.38+.62*Math.exp(-k/34);
   const mat=makeInk((k%6===0?.58:.23)*falloff);
   if(stageMotion.pattern)mat.color.multiplyScalar(1.82);
   inkMotion(waveMesh(stageMotion.pattern?typeContour(g,pts,mat,k):tube(g,pts,k%6===0?.18:.065,mat,120)),k*.22,.6);
  }
 };
 if(kind===0){
  contour(-53,22,-225,290,1.18,.24);
  for(let i=0;i<6;i++){const x=61+i*9,z=-140-i*23;bgStroke(g,[[x,-174,z],[x+40,-60,z-10],[x+15,94,z-32],[x-11,168,z-49]],i%2?.16:.24,makeInk(.40),100);}
 }else if(kind===1){
  contour(-73,-52,-310,300,1.4,-.22);
  for(let i=0;i<22;i++){
   const pts=[],z=-100-i*15,turn=.12+i*.012;
   for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;let x=Math.cos(a)*(68+i*.9),y=Math.sin(a)*(115+i*1.3);pts.push([18+x*Math.cos(turn)-y*Math.sin(turn),26+x*Math.sin(turn)+y*Math.cos(turn),z]);}
   bgStroke(g,pts,i%5===0?.21:.085,makeInk(i%5===0?.55:.26),100);
  }
 }else{
  contour(47,-25,-260,310,1.33,-.35);
  for(let k=0;k<19;k++){
   const pts=[];for(let j=0;j<=120;j++){const a=-1.8+j/120*3.5,r=100+k*5.8;pts.push([-18+Math.cos(a)*r,28+Math.sin(a)*r*1.42,-135-k*7+Math.sin(a)*15]);}
   bgStroke(g,pts,k%5===0?.24:.10,makeInk(k%5===0?.48:.22),120);
  }
 }
 return g;
}

// Sculpted leaves of space: broad surfaces catch light at different depths.
// Cropped near-camera lamellae overlap the mid-distance without covering titles.
function spatialLayers(parent,kind){
 let layer=new T.Group();layer.name='spatial-lamellae-'+kind;parent.add(layer);backgrounds.push(layer);layer.userData.parallax=.18;
 const blade=(points,width,ink,accent=false)=>{
  const c=curve(points),pos=[],idx=[],N=96,M=12;
  const sample=(u,v)=>{const p=c.getPoint(u),t=c.getTangent(u).normalize(),s=V(-t.y,t.x,0).normalize();return p.addScaledVector(s,(v-.5)*width*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.3)).add(V(0,0,Math.sin(Math.PI*v)*width*.65*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.3)));};
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++)pos.push(...sample(i/N,j/M).toArray());
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  layer.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:ink,metalness:.38,roughness:.36,side:T.DoubleSide})));

 };
 // Middle-distance folds establish a deep opening behind the main subject.
 const shift=kind===1?28:kind===2?-15:0;
 for(let k=0;k<5;k++){
  const z=-75-k*23,x=-85-k*13;
  blade([[x-45,-250,z-24],[x-5,-115,z+9],[x+12,shift,z],[x+48,137,z-30],[x+120,310,z-65]],10+k*2,0x111d27,k===0);
 }
 // Two near cropped surfaces have radically larger apparent scale.
 layer=new T.Group();layer.name='near-lamellae-'+kind;layer.userData.parallax=1.15;parent.add(layer);backgrounds.push(layer);
 const near=kind===2?112:91;
 blade([[-55,-140,near-7],[-24,-67,near],[-19,-30,near-2],[-25,4,near-8],[-44,67,near-26]],5,0x09121b,true);
 blade([[54,-145,near-6],[24,-80,near],[20,-49,near-3],[30,-12,near-10],[52,59,near-28]],7,0x0b1720);
 // A few distant petals make the far space measurable, with no extra mobs.
 for(let i=0;i<9;i++)petal(parent,names[(i+kind*2)%names.length],V(kind===1?82+i*9:kind===2?-150+i*38:-72+i*17,kind===2?180+Math.sin(i*1.7)*25:(kind===1?-110:-72)+Math.sin(i*1.7)*57,-470-(i%3)*28),1.2+(i%3)*.35,.12,i*.4);
}

function dust(parent,n=1800){const p=new Float32Array(n*3),colors=new Float32Array(n*3);for(let i=0;i<n;i++){p.set([(rnd()-.5)*260,(rnd()-.5)*390,40-rnd()*300],i*3);const b=.25+rnd()*.45;colors.set([b*.85,b*.95,b],i*3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(colors,3));const m=new T.PointsMaterial({size:.18,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.75,depthWrite:false});parent.add(new T.Points(g,m));}
function glow(parent,p,color=0xefc797,power=1800){const light=new T.PointLight(color,power,110,2);light.position.copy(p);parent.add(light);}

function petal(parent,name,p,size,tilt=0,roll=0){
 const asset=assets.get(name),mesh=new T.Mesh(asset.geometry,asset.material);mesh.userData.asset=true;mesh.userData.assetName=name;mesh.position.copy(p);mesh.scale.setScalar(size);
 mesh.quaternion.copy(camera.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(tilt,.55*Math.sin(roll*2.3+size),roll))).multiply(asset.face);
 parent.add(mesh);petals.push({mesh,base:p.clone(),baseQuaternion:mesh.quaternion.clone(),phase:rnd()*6.28});return mesh;
}
const names=PETAL_NAMES.filter(name=>assets.has(name));
function scatterAlong(parent,r,n,phase=0){
 const traffic=createTraffic({length:r.curve.getLength(),previousCount:Math.ceil(n*1.25),width:r.width,seed:3349+stageMotion.kind*101+phase*17+r.phase*100|0});r.traffic=traffic;traffic.speed=6.4+r.phase*.1;
 const N=4096;r.cache=[];
 for(let lane=0;lane<2;lane++){
  const v=lane===0?.18:.82,pos=new Float32Array((N+1)*3),normal=new Float32Array((N+1)*3),side=new Float32Array((N+1)*3);
  for(let i=0;i<=N;i++){const u=(-traffic.margin+traffic.period*i/N)/traffic.length,p=r.sample(u,v),n=r.sample(u,v,-1).sub(p),s=r.sample(u,v+.001).sub(p).multiplyScalar(1000);pos.set(p.toArray(),i*3);normal.set(n.toArray(),i*3);side.set(s.toArray(),i*3);}
  // Parameter speed compresses near the fog bend. Re-sample by actual lane
  // distance so random gaps cannot collapse while entering/leaving the frame.
  const distance=new Float64Array(N+1);for(let i=1;i<=N;i++)distance[i]=distance[i-1]+Math.hypot(pos[i*3]-pos[(i-1)*3],pos[i*3+1]-pos[(i-1)*3+1],pos[i*3+2]-pos[(i-1)*3+2]);
  const uniformPos=new Float32Array(pos.length),uniformNormal=new Float32Array(normal.length),uniformSide=new Float32Array(side.length);let j=0;
  for(let i=0;i<=N;i++){const target=distance[N]*i/N;while(j<N-1&&distance[j+1]<target)j++;const f=(target-distance[j])/(distance[j+1]-distance[j]||1);for(let axis=0;axis<3;axis++){uniformPos[i*3+axis]=T.MathUtils.lerp(pos[j*3+axis],pos[(j+1)*3+axis],f);uniformNormal[i*3+axis]=T.MathUtils.lerp(normal[j*3+axis],normal[(j+1)*3+axis],f);uniformSide[i*3+axis]=T.MathUtils.lerp(side[j*3+axis],side[(j+1)*3+axis],f);}}
  r.cache.push({pos:uniformPos,normal:uniformNormal,side:uniformSide});
  for(const record of traffic.lanes[lane]){
   const name=assets.has(record.name)?record.name:names[phase%names.length],m=petal(r.root,name,V(0,0,0),record.size,(rnd()-.5)*.35,(rnd()-.5)*.7);
   m.userData.route={road:r,record,lane,height:3.8+lane*4.2+record.size*.35};
  }
 }
}
function trafficPoint(route,clock,out){
 const {road,record,lane,height}=route,traffic=road.traffic,s=trafficCoordinate(record,clock,traffic),f=(s+traffic.margin)/traffic.period*4096,i=Math.min(4095,Math.floor(f)),k=f-i,{pos,normal,side}=road.cache[lane];
 const h=height+.35*Math.sin(clock*.55+record.phase),wander=.018*Math.sin(clock*.46+record.phase)+.007*Math.sin(clock*.23+record.phase*1.7);
 out.set(0,0,0);for(let axis=0;axis<3;axis++){const a=i*3+axis,b=a+3;out.setComponent(axis,pos[a]+(pos[b]-pos[a])*k+(normal[a]+(normal[b]-normal[a])*k)*h+(side[a]+(side[b]-side[a])*k)*wander);}return out;
}

// Shared pure-time movement. Scrubbing backwards reconstructs the same pose.
// Roads move as rigid groups; their surface, engravings and riders stay together.
function applyMotion(t=7.25){
 const clock=t,d=clock-7.25;
 const kind=stageMotion.kind;
 const settle=kind===2?1-.8*(Math.max(0,Math.min(24,clock))/24)**2:1;
 camera.position.copy(stageMotion.position).add(V((kind===1?2.2:1.2)*Math.sin(d*.10),.6*Math.sin(d*.13),-1.8*Math.sin(d*.09)));
 camera.quaternion.copy(stageMotion.quaternion);camera.updateMatrixWorld(true);
 roads.forEach((r,i)=>{
  r.root.rotation.set(.006*Math.sin(d*.16+i),.012*Math.sin(d*.14+i*.7),.008*Math.sin(d*.12+i));
  r.root.position.z=settle*(kind===1?1.4:.65)*Math.sin(d*.18+i*.9);
  r.root.position.y=(kind===2?.35:.65)*Math.sin(d*.14+i*.7);
  for(let j=0;j<r.spark.children.length;j++)r.spark.children[j].position.copy(r.sample(.14+clock*(kind===1?.034:kind===2?.016:.026)-j*.005,.07,-.18));
 });
 backgrounds.forEach((g,i)=>{const near=g.name.startsWith('near-');g.rotation.y=(near?.012:.009)*Math.sin(d*(kind===1?.13:.08)+i);g.rotation.z=.005*Math.sin(d*.13+i);g.position.x=(g.userData.parallax||.25)*Math.sin(d*.16);g.position.z=(near?1.2:.4)*Math.sin(d*.11+i);});
 for(const o of stageMotion.motionNodes){
  const ink=o.userData.inkMotion;
  if(o.userData.wave)o.material.userData.waveTime.value=clock;
  if(ink){const wave=Math.exp(-(((Math.sin(clock*(kind===1?.45:.28)-ink.phase))/.40)**2));o.material.color.copy(ink.base).multiplyScalar(.70+ink.strength*wave);}
  if(o.isPoints){o.rotation.z=d*.0018;o.position.y=d*.06;}
  if(o.isPointLight){
   if(!o.userData.rest){o.userData.rest=o.position.clone();o.userData.power=o.intensity;}
   o.position.copy(o.userData.rest);
   if(kind===0){o.position.x+=8*Math.sin(d*.18);o.position.y+=12*Math.sin(d*.12);}
   o.intensity=o.userData.power*(.80+.20*Math.cos(clock*.45));
  }
  if(o.isRectAreaLight){o.position.set(-40+75*(.5-.5*Math.cos(clock*Math.PI/24)),22,55);o.lookAt(0,22,0);}
  if(o.name==='finale-mark-pivot'){o.rotation.y=-.40+settle*.08*Math.sin(d*.10);o.rotation.x=.10+settle*.025*Math.sin(d*.13);}
 }
 for(const p of petals){
  const route=p.mesh.userData.route;
  if(route){trafficPoint(route,clock,p.mesh.position);}
  else{const phase=clock*.58+p.phase,radius=4.8+.7*Math.sin(p.phase);p.mesh.position.copy(p.base).add(V(radius*Math.sin(phase),4.1*Math.cos(phase),3.2*Math.sin(phase*.83+p.phase)));}
 }
}

function textPlane(text,pixels,color){
 const data=vectorText[text],geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions.map(v=>v*pixels),3));geometry.setIndex(data.indices);geometry.computeVertexNormals();geometry.parameters={width:data.width*pixels,height:1.5*pixels};
 return new T.Mesh(geometry,new T.MeshBasicMaterial({color,depthTest:true,side:T.DoubleSide,toneMapped:false}));
}
function labels(kind=0){
 plates.clear();const record=historyRecords[kind],d=[235,270,245][kind],unit=2*d*Math.tan(T.MathUtils.degToRad(20))/H;
 for(const {text,size:px,x,y:top,color,role} of roadTextParts(record,kind)){const m=textPlane(text,px,color);m.userData.text=text;m.userData.textRole=role;m.material.transparent=true;m.material.depthWrite=false;m.scale.setScalar(unit);m.position.set((-W*.5+x)*unit,(H*.5-top-px*.9)*unit,-d);plates.add(m);}
}

function founding(g){
 camera.position.set(0,0,170);camera.lookAt(0,0,-12);camera.updateMatrixWorld();labels(0);
 configureStage(g,0);
 backgroundDesign(g,0);
 spatialLayers(g,0);
 const a=ribbon(g,[[-57,-125,46],[-35,-65,25],[-18,-27,8],[17,0,-22],[40,46,-56],[52,108,-90],[65,166,-128],[81,245,-180]],{width:19,twist:.25,lines:28});
 const b=ribbon(g,[[91,242,-230],[57,140,-170],[34,69,-140],[17,12,-108],[21,-5,-98],[45,-52,-120],[44,-110,-172],[65,-190,-215],[85,-290,-260]],{width:15,twist:-.35,lines:23});
 const c=ribbon(g,[[-135,-225,-235],[-70,-107,-215],[-28,-67,-220],[9,-67,-224],[39,-103,-265],[72,-181,-280],[98,-285,-315]],{width:12,lines:15,dim:true});
 scatterAlong(g,a,25);scatterAlong(g,b,16,3);scatterAlong(g,c,9,1);
 // Strongly separated foreground, middle-distance and far petals.
 petal(g,'rose',V(-21,-53,100),6.4,.18,-.5);petal(g,'shell',V(19,-41,90),4.0,-.12,.4);petal(g,'iris',V(-14,-82,108),5.8,.2,-.7);
 glow(g,V(18,0,-16),0xf1d6a3,2400);dust(g);
 preparePetalClearance();
}
function convergence(g){
 camera.position.set(-3,0,174);camera.lookAt(1,0,-20);camera.updateMatrixWorld();labels(1);
 configureStage(g,1);
 backgroundDesign(g,1);
 spatialLayers(g,1);
 const center=V(18,31,-90);
 // A right-hand hairpin and two remote cross-spans contrast with the first
 // scene's long diagonal S. The whole left reading window stays open in depth.
 const routes=[
  {points:[[76,-230,50],[54,-110,30],[24,-55,15],[9,-10,-5],[26,42,-55],[40,84,-95],[70,96,-155],[76,35,-205],[62,-35,-225],[66,-160,-270],[106,-260,-330]],width:13,twist:.20,bow:.12,lines:23},
  {points:[[-210,-130,-150],[-95,-91,-135],[-20,-80,-125],[70,-88,-140],[160,-130,-180],[230,-230,-230]],width:10.5,twist:-.22,bow:.10,lines:19},
  {points:[[-250,150,-280],[-110,126,-245],[0,118,-215],[120,134,-245],[250,220,-290]],width:8,twist:.12,bow:.10,lines:15,dim:true}
 ];
 routes.forEach((spec,k)=>{const r=ribbon(g,spec.points,{...spec,detail:true});scatterAlong(g,r,[23,19,14][k],k*2);});
 // Independent large bobbing petals removed; only route riders remain.
 glow(g,center.clone().add(new T.Vector3(0,0,20)),0xf2a07d,3500);dust(g,2100);
 preparePetalClearance();
}
function finale(g){
 camera.position.set(0,5,208);camera.lookAt(0,6,-8);camera.updateMatrixWorld();labels(2);
 configureStage(g,2);
 backgroundDesign(g,2);
 spatialLayers(g,2);
 // Continue both far ends beyond the portrait frustum, including their sway.
 const a=ribbon(g,[[-72,-114,50],[-28,-60,24],[6,-35,6],[41,-3,-30],[48,49,-76],[7,118,-125],[-22,173,-164],[-53,238,-211]],{width:11,twist:.18,lines:19});
 const b=ribbon(g,[[60,-117,-98],[7,-79,-80],[-39,-32,-68],[-48,20,-96],[-24,92,-140],[5,159,-180],[40,236,-222]],{width:8,twist:-.25,lines:13,dim:true});
 scatterAlong(g,a,24,1);scatterAlong(g,b,13,3);
 petal(g,'shell',V(-26,-70,98),7,-.12,-.3);petal(g,'rose',V(-19,-46,85),4.7,.2,-.35);petal(g,'compass',V(17,-37,85),4.3,-.1,.35);petal(g,'iris',V(25,-71,100),4.9,.1,.3);petal(g,'darkmark',V(0,-68,95),3.8,.2,-.4);
 dust(g,1800);
 preparePetalClearance();
}


const contexts=[],group=new T.Group();group.name='guild-road-world';
for(let i=0;i<3;i++){
 seed=3349+i*101;roads.length=0;backgrounds.length=0;petals.length=0;
 const root=new T.Group();[founding,convergence,finale][i](root);
 const labels=new T.Group();labels.position.copy(stageMotion.position);labels.quaternion.copy(stageMotion.quaternion);labels.add(...[...plates.children]);root.add(labels);
 const ctx={root,roads:[...roads],backgrounds:[...backgrounds],petals:[...petals],labels,state:{...stageMotion},pools:new Map()};
 // Retain descriptors, but draw each petal type with one shared instance batch.
 for(const p of ctx.petals){p.parent=p.mesh.parent;p.mesh.removeFromParent();const name=p.mesh.userData.assetName;if(!ctx.pools.has(name))ctx.pools.set(name,[]);ctx.pools.get(name).push(p);}
 for(const [name,items]of ctx.pools){const asset=assets.get(name),mesh=new T.InstancedMesh(asset.geometry,asset.material,items.length);mesh.name='road-petal-'+name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;root.add(mesh);ctx.pools.set(name,{mesh,items});}
 root.position.fromArray(offsets[i]);group.add(root);contexts.push(ctx);
}
group.add(makeConnections());
// Merge repeated contours and all static road strips once, retaining real depth.
function mergeStatic(parent,waves=false){
 const groups=new Map();parent.updateMatrixWorld(true);
 parent.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.asset||o.parent===plates||!!o.userData.wave!==waves||o.userData.isLabel)return;
  const m=o.material,key=[m.type,m.metalness||0,m.roughness||0,m.transparent,m.opacity].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 for(const list of groups.values()){
  if(list.length<2)continue;const geometries=[];
  for(const mesh of list){mesh.updateMatrix();const g=mesh.geometry.clone();const local=new T.Matrix4().copy(parent.matrixWorld).invert().multiply(mesh.matrixWorld);g.applyMatrix4(local);const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)mesh.material.color.toArray(colors,i);g.setAttribute('color',new T.BufferAttribute(colors,3));if(g.attributes.uv)g.deleteAttribute('uv');geometries.push(g);}
  const geometry=mergeGeometries(geometries),material=list[0].material.clone();if(!geometry)throw new Error('Road geometry merge failed');material.color.set(0xffffff);material.vertexColors=true;delete material.userData.waveTime;
  const mesh=new T.Mesh(geometry,material);if(waves)waveMesh(mesh);parent.add(mesh);
  for(const old of list){old.removeFromParent();old.geometry.dispose();}geometries.forEach(g=>g.dispose());
 }
}
function mergeTypeLines(parent){
 const rows=[];parent.updateMatrixWorld(true);parent.traverse(o=>{if(o.userData.typeLine)rows.push(o);});if(!rows.length)return;
 const count=rows.reduce((n,o)=>n+o.count,0),material=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),mesh=new T.InstancedMesh(glyphGeometry,material,count),matrix=new T.Matrix4(),local=new T.Matrix4(),inverse=parent.matrixWorld.clone().invert();let slot=0;
 for(const row of rows){local.multiplyMatrices(inverse,row.matrixWorld);for(let i=0;i<row.count;i++){row.getMatrixAt(i,matrix);matrix.premultiply(local);mesh.setMatrixAt(slot,matrix);mesh.setColorAt(slot++,row.material.color);}row.removeFromParent();row.dispose();row.material.dispose();}
 mesh.name='tidal-2n-glyph-field';mesh.userData.typeLine=true;waveMesh(mesh);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=20;parent.add(mesh);
}
for(const c of contexts){
 c.labels.traverse(o=>o.userData.isLabel=true);
 for(const r of c.roads){r.spark.traverse(o=>o.userData.isLabel=true);mergeStatic(r.root,false);}
 for(const bg of c.backgrounds){mergeTypeLines(bg);mergeStatic(bg,true);}
 c.state.motionNodes=[];
 c.root.traverse(o=>{
  if(o.userData.inkMotion||o.userData.wave||o.isPoints||o.isPointLight||o.isRectAreaLight||o.name==='finale-mark-pivot')c.state.motionNodes.push(o);
  if(o.isMesh){o.updateMatrix();o.matrixAutoUpdate=false;}
 });
}
const object=new T.Object3D(),point=new T.Vector3(),world=new T.Vector3(),frustum=new T.Frustum(),viewProjection=new T.Matrix4(),sphere=new T.Sphere(),rotationScratch=new T.Quaternion(),eulerScratch=new T.Euler();
function update(clock,view,seconds,reduced=false){
 view.updateMatrixWorld();frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse));
 for(let i=0;i<contexts.length;i++){
  const c=contexts[i];roads.splice(0,roads.length,...c.roads);backgrounds.splice(0,backgrounds.length,...c.backgrounds);petals.splice(0,petals.length,...c.petals);Object.assign(stageMotion,c.state);
  applyMotion(reduced?clock*.18:clock);c.root.updateMatrixWorld(true);
  // Freeze text to its scene, fade before the camera flies away, then disable it.
  const a=[5.5,14.3,23.1][i],b=[11.5,20.3,30.6][i],smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);},alpha=smooth((seconds-a)/.65)*(1-smooth((seconds-b+.65)/.65));
  c.labels.visible=alpha>0;c.labels.traverse(o=>{if(o.material)o.material.opacity=alpha;});
  for(const pool of c.pools.values()){
   let count=0;
   for(const p of pool.items){
    point.copy(p.mesh.position);if(p.mesh.userData.route)point.applyMatrix4(p.parent.matrix);world.copy(point).applyMatrix4(c.root.matrixWorld);sphere.center.copy(world);sphere.radius=p.mesh.scale.x*1.1;
    if(world.distanceToSquared(view.position)>1210000||!frustum.intersectsSphere(sphere))continue;
    const t=reduced?clock*.18:clock;
    object.position.copy(point);object.quaternion.copy(p.baseQuaternion).multiply(rotationScratch.setFromEuler(eulerScratch.set(.07*Math.sin(t*.36+p.phase),.10*Math.sin(t*.29+p.phase),.045*Math.sin(t*.31+p.phase))));if(p.mesh.userData.route)object.quaternion.premultiply(p.parent.quaternion);object.scale.copy(p.mesh.scale);object.updateMatrix();pool.mesh.setMatrixAt(count++,object.matrix);
   }
   pool.mesh.count=count;pool.mesh.visible=count>0;
   pool.mesh.instanceMatrix.clearUpdateRanges();
   if(count){pool.mesh.instanceMatrix.addUpdateRange(0,count*16);pool.mesh.instanceMatrix.needsUpdate=true;}
  }
 }
}
return {group,contexts,update,get instanceCount(){return contexts.reduce((n,c)=>n+c.petals.length,0);},get visibleCount(){return contexts.reduce((n,c)=>n+[...c.pools.values()].reduce((a,p)=>a+p.mesh.count,0),0);}};
}
