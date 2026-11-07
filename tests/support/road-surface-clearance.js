import * as T from 'three';

// Index the real road triangles in mesh-local space. The index can be reused
// as the ribbons sway, by updating the inverse transforms for each pose.
export function roadSurfaces(root, margin = 7) {
 const cell = 24;
 const gridKey = (x, y, z) => `${x}/${y}/${z}`;
 const surfaces = [];
 root.traverse(mesh => {
  if (!mesh.material?.isMeshStandardMaterial || mesh.isInstancedMesh) return;
  const {index, attributes: {position}} = mesh.geometry;
  const bins = new Map();
  const a = new T.Vector3(), b = a.clone(), c = a.clone();
  const count = index?.count ?? position.count;
  for (let i = 0; i < count; i += 3) {
   const at = offset => index ? index.getX(i + offset) : i + offset;
   a.fromBufferAttribute(position, at(0));
   b.fromBufferAttribute(position, at(1));
   c.fromBufferAttribute(position, at(2));
   const triangle = new T.Triangle(a.clone(), b.clone(), c.clone());
   const lo = a.clone().min(b).min(c).addScalar(-margin).divideScalar(cell).floor();
   const hi = a.clone().max(b).max(c).addScalar(margin).divideScalar(cell).floor();
   for (let x = lo.x; x <= hi.x; x++) for (let y = lo.y; y <= hi.y; y++) for (let z = lo.z; z <= hi.z; z++) {
    const key = gridKey(x, y, z);
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(triangle);
   }
  }
  surfaces.push({mesh, bins, inverse: new T.Matrix4()});
 });
 const local = new T.Vector3(), nearest = new T.Vector3();
 return {
  update() {
   root.updateMatrixWorld(true);
   for (const {mesh, inverse} of surfaces) inverse.copy(mesh.matrixWorld).invert();
  },
  near(point) {
   let result = null, best = margin ** 2;
   for (const {mesh, inverse, bins} of surfaces) {
    local.copy(point).applyMatrix4(inverse);
    const bucket = bins.get(gridKey(Math.floor(local.x / cell), Math.floor(local.y / cell), Math.floor(local.z / cell)));
    for (const triangle of bucket ?? []) {
     const distance = triangle.closestPointToPoint(local, nearest).distanceToSquared(local);
     if (distance >= best) continue;
     best = distance;
     result = {distance: Math.sqrt(distance), position: nearest.clone().applyMatrix4(mesh.matrixWorld)};
    }
   }
   return result;
  }
 };
}
