import * as T from 'three';

// A broad cast ribbon: rounded rectangular section, not a circular tube.
// The hand-drawn centreline and variable section are independent of any font.
function ribbon(points, width, depth, resolution = 240) {
  const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
  const positions = [], indices = [];
  const sides = 32;
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution, p = path.getPoint(t), tangent = path.getTangent(t);
    const n = new T.Vector3(-tangent.y, tangent.x, 0).normalize();
    const breadth = width * (1 + .07 * Math.sin(t * Math.PI));
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2;
      // Superellipse preserves a broad face and continuous shoulder highlights.
      const c = Math.cos(a), s = Math.sin(a);
      const u = Math.sign(c) * Math.pow(Math.abs(c), .42) * breadth / 2;
      const z = Math.sign(s) * Math.pow(Math.abs(s), .42) * depth / 2;
      positions.push(p.x + n.x * u, p.y + n.y * u, p.z + z);
    }
  }
  for (let i = 0; i < resolution; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  for (const [ring, reverse] of [[0, true], [resolution, false]]) {
    const p = path.getPoint(ring / resolution), center = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    for (let j = 0; j < sides; j++) {
      const a = ring * sides + j, b = ring * sides + (j + 1) % sides;
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
  const two = ribbon([[-20,18,0],[-18,29,0],[-7,34,0],[7,31,0],[12,22,0],[8,11,0],[-3,0,0],[-15,-12,0],[-20,-24,0],[-7,-25,0],[13,-25,0]], 9, 9);
  const n = ribbon([[21,20,0],[21,30,0],[22,39,0],[29,44,0],[36,41,0],[38,33,0],[38,20,0]], 5.2, 7, 150);
  group.add(new T.Mesh(two, silver), new T.Mesh(n, silver));
  // Rear tie is structural, largely hidden in the frontal silhouette.
  const tie = new T.Mesh(new T.BoxGeometry(19, 2, 3), silver);
  tie.position.set(16, 25, -4.5); group.add(tie);
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
