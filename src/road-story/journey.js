import * as T from 'three';
export const offsets=[[0,0,0],[480,0,-520],[0,0,-1040]];
const vec=a=>new T.Vector3(...a),ease=x=>Math.max(0,Math.min(1,x*x*x*(x*(x*6-15)+10)));
const connectionPoints=[[[81,245,-180],[155,105,-45],[245,65,-65],[310,20,-210],[345,-50,-330],[370,-230,-460]],[[425,280,-710],[350,150,-530],[225,30,-740],[80,-40,-850],[-72,-114,-990]]];
export function journeyTimes(t){return [t,t,t];}
export function cameraJourney(t,localCamera){
 const times=[Math.max(0,Math.min(24,t)),Math.max(0,Math.min(24,t-30)),Math.max(0,Math.min(24,t-60))],stage=t<24?0:t<30?-1:t<54?1:t<60?-2:2;
 const world=(i,time)=>{const a=localCamera(i,time),m=new T.Matrix4().fromArray(a);m.setPosition(new T.Vector3().setFromMatrixPosition(m).add(vec(offsets[i])));return m;};
 if(stage>=0)return world(stage,times[stage]);
 const a=stage===-1?0:1,b=a+1,p=ease((t-(a===0?24:54))/6),from=world(a,24),to=world(b,0),start=new T.Vector3().setFromMatrixPosition(from),end=new T.Vector3().setFromMatrixPosition(to);
 const bends=a===0?[[95,35,360],[300,60,330],[460,30,30]]:[[385,35,-160],[180,60,-200],[15,30,-480]];
 const path=new T.CatmullRomCurve3([start,...bends.map(vec),end],false,'centripetal'),position=path.getPointAt(p);
 const fromTarget=vec([0,0,-250]).applyMatrix4(from),toTarget=vec([0,0,-250]).applyMatrix4(to);
 const route=new T.CatmullRomCurve3(connectionPoints[a].map(vec),false,'centripetal');
 const target=route.getPointAt(p).lerp(fromTarget,1-ease(Math.min(1,p/.22))).lerp(toTarget,ease(Math.max(0,(p-.78)/.22)));
 const rotation=new T.Matrix4().lookAt(position,target,vec([0,1,0]));rotation.setPosition(position);return rotation;
}
export function makeConnections(){
 const group=new T.Group(),sets=connectionPoints;
 for(const pts of sets){const curve=new T.CatmullRomCurve3(pts.map(vec)),N=180,M=10,positions=[],indices=[],width=10;
  const sample=(u,v)=>{const p=curve.getPointAt(u),t=curve.getTangentAt(u),side=vec([-t.y,t.x,0]).normalize();return p.addScaledVector(side,(v-.5)*width).add(vec([0,0,1.5*Math.sin(Math.PI*v)]));};
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++)positions.push(...sample(i/N,j/M).toArray());
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();group.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x28323b,metalness:.55,roughness:.38,side:T.DoubleSide})));
  for(let j=0;j<=18;j++){const points=[];for(let i=0;i<=N;i++)points.push(sample(i/N,j/18).add(vec([0,0,.05])));group.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),180,j===0||j===18?.10:.025,4,false),new T.MeshBasicMaterial({color:j===0||j===18?0xd9dfd9:0x7f9097})));}
 }return group;
}
