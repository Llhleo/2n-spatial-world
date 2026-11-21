import * as T from 'three';
import {smooth} from './path.js';
import {createLightFlight, LIGHT_HANDOFF, LIGHT_PHASES, roadLightTailSeconds} from './light-flight.js';
import {PARTICLE_ENDING_SECONDS} from '../guild-next-route.js';
import {LIGHT_TRAIL_STENCIL,writeBackgroundOcclusion} from './stencil.js';

export function createLightTravelers() {
 const group = new T.Group();
 group.name = 'three-light-travelers';
 const flight = createLightFlight(), beads = [];
 const segments = 36, sides = 6;
 const coreGeometry = new T.SphereGeometry(1.1, 12, 8);
 const haloGeometry = new T.PlaneGeometry(8, 8);
 const haloMaterial = new T.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false,
  uniforms: {strength: {value: 1}},
  vertexShader: 'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float strength; varying vec2 v; void main(){float r=length((v-.5)*2.);float glow=exp(-r*r*7.)*.52*(1.-smoothstep(.7,1.,r));gl_FragColor=vec4(1.,.66,.26,glow*strength);}'
 });
 const tailMaterial = new T.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  vertexShader: 'attribute vec2 trail;varying vec2 vTrail;void main(){vTrail=trail;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec2 vTrail;void main(){float age=vTrail.x;gl_FragColor=vec4(1.,.58+.32*age,.26+.57*age,smoothstep(0.,1.,age)*vTrail.y);}'
 });
 const trailStencil = new T.ShaderMaterial({
  vertexShader: tailMaterial.vertexShader,
  fragmentShader: 'varying vec2 vTrail;void main(){if(smoothstep(0.,1.,vTrail.x)*vTrail.y<.12)discard;gl_FragColor=vec4(0.);}',
  colorWrite: false, depthWrite: false, ...writeBackgroundOcclusion(LIGHT_TRAIL_STENCIL)
 });
 for (let i = 0; i < LIGHT_PHASES.length; i++) {
  const core = new T.Mesh(coreGeometry, new T.MeshBasicMaterial({color: 0xfff2d8, transparent: true, depthWrite: false, toneMapped: false}));
  core.name = 'road-light-core';
  const halo = new T.Mesh(haloGeometry, haloMaterial.clone());
  halo.renderOrder = 3;
  core.renderOrder = 4;
  const geometry = new T.BufferGeometry(), indices = [];
  const position = new T.BufferAttribute(new Float32Array((segments + 1) * sides * 3), 3).setUsage(T.DynamicDrawUsage);
  const trail = new T.BufferAttribute(new Float32Array((segments + 1) * sides * 2), 2).setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < segments; k++) for (let j = 0; j < sides; j++) {
   const a = k * sides + j, b = k * sides + (j + 1) % sides;
   indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  geometry.setAttribute('position', position);
  geometry.setAttribute('trail', trail);
  geometry.setIndex(indices);
  const tail = new T.Mesh(geometry, tailMaterial);
  tail.name = 'road-light-trail';
  tail.renderOrder = 2;
  tail.frustumCulled = false;
  const mask = new T.Mesh(geometry, trailStencil);
  mask.name = 'road-light-trail-stencil';
  mask.renderOrder = 1;
  mask.frustumCulled = false;
  const light = new T.PointLight(0xffd19a, 950, 80, 2);
  light.name = 'road-light-reflection';
  group.add(core, halo, tail, mask, light);
  beads.push({core, halo, tail, mask, light, position, trail});
 }
 haloMaterial.dispose();

 let before = new T.Vector3(), point = new T.Vector3(), after = new T.Vector3();
 const tangent = new T.Vector3(), side = new T.Vector3(), normal = new T.Vector3();
 const up = new T.Vector3(0, 1, 0), right = new T.Vector3(1, 0, 0);
 const rootRotation = new T.Quaternion(), localView = new T.Matrix4(), viewPoint = new T.Vector3();
 let handoff = 0, cueOffset = 0;
 function update(time, seconds, camera, reduced = false, nextT = 0, echo) {
  const shot = echo ? seconds + echo.seconds
   : seconds + Math.min(4, Math.max(0, nextT) * PARTICLE_ENDING_SECONDS);
  const clock = flight.update(time, shot, reduced, !!echo);
  cueOffset = Math.abs(shot - clock);
  const cueTailSeconds = roadLightTailSeconds(shot, reduced);
  const sceneStrength = smooth((seconds - .8) / 2) * (echo ? 1 : 1 - smooth(nextT / .09));
  localView.multiplyMatrices(camera.matrixWorldInverse, group.matrixWorld);
  group.getWorldQuaternion(rootRotation).invert();
  handoff = 0;
  function visibility(position) {
   const depth = -viewPoint.copy(position).applyMatrix4(localView).z;
   return sceneStrength * smooth((depth - 14) / 24) * (1 - smooth((depth - 440) / 340));
  }
  beads.forEach(({core, halo, tail, mask, light, position, trail}, lane) => {
   const pass = flight.pass(lane);
   const opacity = echo && clock > 36 ? echo.lightOpacity(clock-36, lane) : flight.opacity(lane);
   const travelTail = cueTailSeconds + (reduced ? 0 : .47 * flight.travelDrift);
   const thirdRead = pass === 2 ? flight.thirdReadingMix(lane) : 0;
   const readingMix = pass >= 0 && !reduced ? (pass === 2 ? thirdRead : 1) : 0;
   const roadTail = T.MathUtils.lerp(travelTail, pass === 2 ? 1.18 : .92, readingMix);
   const tailSeconds = T.MathUtils.lerp(roadTail, reduced ? .21 : .42, echo?.storyBlend ?? 0);
   function sample(sampleTime, target) {
    const echoTime = echo ? flight.phaseAt(sampleTime) - 36 : -Infinity;
    if (echo && echoTime >= echo.lightStart(lane)) echo.sampleLight(echoTime, lane, target);
    else flight.point(sampleTime, target, lane, pass);
   }
   sample(time, core.position);
   const alpha = opacity * visibility(core.position), depth = -viewPoint.z;
   const lensScale = echo ? T.MathUtils.lerp(1, T.MathUtils.clamp(depth / 108, .29, 1), echo.storyBlend) : 1;
   core.visible = halo.visible = alpha > .002;
   core.material.opacity = alpha;
   core.scale.setScalar(lensScale);
   halo.position.copy(core.position);
   halo.scale.setScalar(lensScale);
   halo.quaternion.copy(rootRotation).multiply(camera.quaternion);
   halo.material.uniforms.strength.value = alpha * (.32 + .68 * smooth((depth - 38) / 130));
   light.position.copy(core.position);
   light.intensity = 950 * alpha * (1 - (echo?.storyBlend ?? 0));
   handoff = Math.max(handoff, 1 - smooth(core.position.distanceTo(LIGHT_HANDOFF) / 82));
   tail.visible = sceneStrength * opacity > .002;
   mask.visible = tail.visible && (!echo || echo.storyBlend < 1);
   if (!tail.visible) return;
   const step = tailSeconds / segments, start = time - tailSeconds;
   sample(start, before);
   point.copy(before);
   for (let k = 0; k <= segments; k++) {
    const life = k / segments, sampleTime = start + k * step;
    sample(Math.min(time, sampleTime + step), after);
    tangent.copy(after).sub(before).normalize();
    side.crossVectors(tangent, Math.abs(tangent.y) > .94 ? right : up).normalize();
    normal.crossVectors(tangent, side).normalize();
    const radius = (.06 + (.43 + (reduced ? 0 : .19 * thirdRead)) * life) * lensScale;
    const strength = opacity * visibility(point) * smooth((sampleTime - flight.oldestTime) / .05);
    for (let j = 0; j < sides; j++) {
     const angle = j / sides * Math.PI * 2, a = Math.cos(angle) * radius, b = Math.sin(angle) * radius;
     position.setXYZ(k * sides + j, point.x + side.x * a + normal.x * b, point.y + side.y * a + normal.y * b, point.z + side.z * a + normal.z * b);
     trail.setXY(k * sides + j, life, strength);
    }
    const reusable = before;
    before = point;
    point = after;
    after = reusable;
   }
   position.needsUpdate = true;
   trail.needsUpdate = true;
  });
 }
 return {
  group, update, reset: flight.reset,
  get handoff() { return handoff; },
  get glintStrength() { return .17 + .32 * smooth((cueOffset - .12) / .42); },
  dispose() {
   coreGeometry.dispose();
   haloGeometry.dispose();
   tailMaterial.dispose();
   trailStencil.dispose();
   for (const {core, halo, tail} of beads) {
    core.material.dispose();
    halo.material.dispose();
    tail.geometry.dispose();
   }
   group.clear();
  }
 };
}
