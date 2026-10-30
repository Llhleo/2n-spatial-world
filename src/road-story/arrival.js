import * as T from 'three';

// A long, closed spatial stream, not an expanded spherical formation. Its
// return leg stays deep and lateral; constant arc travel keeps the flow alive.
const stream=new T.CatmullRomCurve3([
 [-70,-60,100],[-48,-26,5],[-12,22,-90],[40,55,-200],
 [100,55,-310],[155,-20,-220],[80,-90,-20],[0,-110,120]
].map(p=>new T.Vector3(...p)),true,'centripetal');
export function roadArrivalPoint(anchor,aspect,time,reduced=false){
 const phase=anchor.u*.43+(anchor.branch||0)*.5+(reduced?time*.0025:time*.016);
 const point=stream.getPointAt(((phase%1)+1)%1);
 point.x*=Math.min(1,aspect/.6);
 return point.toArray();
}
