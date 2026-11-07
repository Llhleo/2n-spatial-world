import * as T from 'three';
import {smooth} from './path.js';

// A short warm highlight on the existing road edge, including when a long
// reading hold puts the traveling beads out of phase with the camera cue.
export function createRoadGlint(geometry, start, end) {
 const material = new T.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  uniforms: {head: {value: 0}, strength: {value: 0}},
  vertexShader: 'varying float vAlong;void main(){vAlong=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float head,strength;varying float vAlong;void main(){float gap=(vAlong-head)/.055;gl_FragColor=vec4(1.,.68,.33,exp(-gap*gap)*strength);}'
 });
 const mesh = new T.Mesh(geometry, material);
 mesh.name = 'road-edge-glint';
 mesh.visible = false;
 return {
  mesh,
  update(seconds, weight) {
   const u = (seconds - start) / (end - start);
   const alpha = smooth(u / .19) * (1 - smooth((u - .73) / .27)) * weight;
   mesh.visible = alpha > .001;
   material.uniforms.head.value = T.MathUtils.lerp(.25, .83, smooth(u));
   material.uniforms.strength.value = alpha;
  }
 };
}
