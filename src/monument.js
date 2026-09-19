import * as T from 'three';
import {sculptureShapes, cutSolid} from './sculpture-shapes.js';

// A broad cast ribbon: rounded rectangular section, not a circular tube.
// The hand-drawn centreline and variable section are independent of any font.
function ribbon(points, width, depth, resolution = 240) {
  const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
  const positions = [], indices = [];
  // Flat front/side faces joined by narrow 45-degree chamfers.
  // Duplicate section vertices keep the intentional facet boundaries crisp.
  const bevel = Math.min(width, depth) * .075;
  const x = width / 2, z = depth / 2;
  const section = [[x,z-bevel],[x-bevel,z],[-x+bevel,z],[-x,z-bevel],[-x,-z+bevel],[-x+bevel,-z],[x-bevel,-z],[x,-z+bevel]];
  const sides = 16;
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution, p = path.getPoint(t), tangent = path.getTangent(t);
    const n = new T.Vector3(-tangent.y, tangent.x, 0).normalize();
    for (let j = 0; j < sides; j++) {
      const [u,z] = section[(Math.floor(j/2)+j%2)%8];
      positions.push(p.x + n.x * u, p.y + n.y * u, p.z + z);
    }
  }
  for (let i = 0; i < resolution; i++) for (let j = 0; j < sides; j+=2) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  for (const [ring, reverse] of [[0, true], [resolution, false]]) {
    const p = path.getPoint(ring / resolution), center = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    const capStart=positions.length/3;
    positions.push(...positions.slice(ring*sides*3,(ring+1)*sides*3));
    for (let j = 0; j < sides; j+=2) {
      const a = capStart + j, b = capStart + j + 1;
      indices.push(center, reverse ? b : a, reverse ? a : b);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function createMonument() {
  const group = new T.Group(); group.name = 'static-silver-monument';
  const silver = new T.MeshStandardMaterial({ color: 0xd5d8da, metalness: .92, roughness: .29 });
  const shapes=sculptureShapes();
  const two=new T.Mesh(cutSolid(shapes.two,9),silver);two.name='two-cut-solid';
  const n=new T.Mesh(cutSolid(shapes.n,7),silver);n.name='n-cut-solid';
  group.add(two,n);
  return group;
}

export function createLighting(scene, renderer) {
  const studio = new T.Scene(); studio.background = new T.Color(0x08090b);
  for (const [x,y,z,w,h,power] of [[-45,35,25,14,100,6],[50,15,-20,8,90,9],[0,90,0,70,15,5]]) {
    const panel = new T.Mesh(new T.PlaneGeometry(w,h), new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));
    panel.position.set(x,y,z); panel.lookAt(0,10,0); studio.add(panel);
  }
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio, .035, .1, 300);
  scene.environment = env.texture; scene.environmentIntensity = .9;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();}); pmrem.dispose();
  const key = new T.DirectionalLight(0xf4f1e9, 3.5); key.position.set(-40,65,45); scene.add(key);
  const rim = new T.DirectionalLight(0xc5d2df, 2); rim.position.set(45,20,-25); scene.add(rim);
  scene.add(new T.HemisphereLight(0xaab4c1,0x090908,.35));
}
