import * as T from 'three';

// Authored silhouettes, not a swept centreline: corners remain actual corners.
export function sculptureShapes() {
  const two = new T.Shape();
  two.moveTo(-24,18);
  two.bezierCurveTo(-24,31,-17,38,-6,38);
  two.bezierCurveTo(7,38,16,32,16,23);
  two.bezierCurveTo(16,15,12,10,5,3);
  two.lineTo(-15,-20);
  two.lineTo(17,-20);
  two.lineTo(17,-29);
  two.lineTo(-24,-29);
  two.lineTo(-24,-20);
  two.lineTo(-2,5);
  two.bezierCurveTo(5,12,7,16,7,22);
  two.bezierCurveTo(7,27,3,29,-6,29);
  two.bezierCurveTo(-12,29,-15,26,-15,18);
  two.closePath();

  const n = new T.Shape();
  n.moveTo(18.4,20); n.lineTo(18.4,44);
  n.lineTo(23.8,44); n.lineTo(23.8,40.5);
  n.lineTo(27.5,44); n.lineTo(33.5,44);
  n.bezierCurveTo(38.5,44,40.6,41.5,40.6,37);
  n.lineTo(40.6,20); n.lineTo(35.2,20); n.lineTo(35.2,36);
  n.bezierCurveTo(35.2,38.4,34.1,39,31.8,39);
  n.lineTo(28.2,39); n.lineTo(23.8,35.2); n.lineTo(23.8,20);
  n.closePath();
  return {two,n};
}

export function cutSolid(shape, depth) {
  const geometry = new T.ExtrudeGeometry(shape, {depth,steps:1,curveSegments:48,bevelEnabled:true,bevelThickness:.16,bevelSize:.16,bevelSegments:1});
  geometry.translate(0,0,-depth/2);
  // Supply an index for shared mesh-budget checks; preserve authored face normals.
  geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
