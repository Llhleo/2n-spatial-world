import * as T from 'three';

// Camera rails use a single polynomial rather than joined Catmull segments:
// position, tangent and curvature remain continuous through every bend.
export function cameraCurve(points){
 const controls=points.map(p=>new T.Vector3(...p));
 class Rail extends T.Curve{
  constructor(){super();this.arcLengthDivisions=4096;}
  getPoint(t,target=new T.Vector3()){
   const work=controls.map(p=>p.clone());
   for(let n=work.length-1;n>0;n--)for(let i=0;i<n;i++)work[i].lerp(work[i+1],t);
   return target.copy(work[0]);
  }
 }
 return new Rail();
}

// Preserve authored entry waypoints and their tangents, with matching zero
// acceleration on both sides of each knot. No new stop at an internal waypoint.
export function cameraEntryPath(shots){
 const tangent=(i,k)=>{
  if(i===0||i===shots.length-1)return new T.Vector3();
  return new T.Vector3(...shots[i+1][k]).sub(new T.Vector3(...shots[i-1][k])).divideScalar(shots[i+1].t-shots[i-1].t);
 };
 return (t,camera)=>{
  const u=T.MathUtils.clamp(t,0,1);let i=0;while(i<shots.length-2&&u>shots[i+1].t)i++;
  const a=shots[i],b=shots[i+1],h=b.t-a.t,v=(u-a.t)/h,v2=v*v,v3=v2*v,v4=v3*v,v5=v4*v,blend=10*v3-15*v4+6*v5;
  const sample=k=>new T.Vector3(...a[k]).multiplyScalar(1-blend).addScaledVector(new T.Vector3(...b[k]),blend).addScaledVector(tangent(i,k),h*(v-6*v3+8*v4-3*v5)).addScaledVector(tangent(i+1,k),h*(-4*v3+7*v4-3*v5));
  camera.position.copy(sample('p'));camera.lookAt(sample('target'));
 };
}
