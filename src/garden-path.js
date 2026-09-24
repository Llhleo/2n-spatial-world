import * as T from 'three';

// The first key is the existing Hero endpoint, including its look target.
export const gardenShots=[
  {p:[55,98,112],target:[7,7,0]},
  {p:[81,78,96],target:[74,19,12]},
  {p:[111,49,74],target:[155,-24,-20]},
  {p:[151,10,46],target:[208,-28,-19]},
  {p:[196,-5,19],target:[260,-31,-19]},
  {p:[244,-2,6],target:[309,-30,-22]},
  {p:[302,3,-9],target:[377,-33,-25]}
];
const position=new T.CatmullRomCurve3(gardenShots.map(s=>new T.Vector3(...s.p)),false,'centripetal');
const target=new T.CatmullRomCurve3(gardenShots.map(s=>new T.Vector3(...s.target)),false,'centripetal');
const focus=new T.Vector3();
export function gardenPose(t,camera,portrait=false){
  const u=T.MathUtils.clamp(t,0,1);
  position.getPoint(u,camera.position);target.getPoint(u,focus);
  if(portrait){
    camera.position.z+=22*(1-T.MathUtils.smoothstep(u,0,.35));
    camera.position.y+=5*T.MathUtils.smoothstep(u,0,.3);
  }
  camera.lookAt(focus);
  return {position:camera.position.toArray(),target:focus.toArray()};
}
