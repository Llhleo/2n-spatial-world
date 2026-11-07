import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sampleRoadCamera} from '../src/road-story/path.js';
import {makeConnections} from '../src/road-story/journey.js';
import {createLightFlight, LIGHT_HANDOFF, LIGHT_LAP, LIGHT_SPACING, roadLightPoint, roadLightTailSeconds} from '../src/road-story/light-flight.js';
import {createLightTravelers} from '../src/road-story/lights.js';

test('the closed shared light rail has no stop at its return seam', () => {
 assert.ok(roadLightPoint(0).distanceTo(roadLightPoint(LIGHT_LAP)) < 1e-7);
 for (let i = 0; i < LIGHT_LAP; i += .02) {
  const gap = roadLightPoint(i).distanceTo(roadLightPoint(i + .01));
  assert.ok(gap > .02 && gap < 9, `continuous travel at ${i}: ${gap}`);
 }
});

test('the authored flight hides behind the actual bridge and passes near the next camera', () => {
 const camera = new T.PerspectiveCamera(40, 414 / 896, .2, 2400);
 const bridge = makeConnections();
 bridge.updateMatrixWorld(true);
 const solids = bridge.children.filter(mesh => mesh.material.isMeshStandardMaterial);
 const cameraAt = seconds => {
  const pose = sampleRoadCamera(seconds, null);
  camera.position.fromArray(pose.position);
  camera.quaternion.fromArray(pose.quaternion);
  camera.updateMatrixWorld(true);
 };
 const flight = createLightFlight();
 let now = 0, hidden = false, revealed = false, nearPass = false;
 for (let i = 0; i <= 36 * 120; i++) {
  const shot = i / 120;
  // Exercise manual reading rather than always starting with ideal phase.
  if ([1116, 2172, 3432].includes(i)) for (let j = 0; j < 10 * 120; j++) flight.update(now += 1 / 120, shot - 1 / 120);
  const clock = flight.update(now += 1 / 120, shot);
  if ((shot < 12.5 || shot > 13.5) && (shot < 21.45 || shot > 22.1)) continue;
  cameraAt(shot);
  const head = roadLightPoint(clock), screen = head.clone().project(camera);
  const depth = -head.clone().applyMatrix4(camera.matrixWorldInverse).z;
  if (Math.abs(screen.x) > .93 || Math.abs(screen.y) > .85 || depth < 20) continue;
  const vector = head.clone().sub(camera.position);
  const ray = new T.Raycaster(camera.position, vector.clone().normalize(), .2, vector.length() - 2);
  const blocked = ray.intersectObjects(solids, false).length > 0;
  if (shot < 14) {
   hidden ||= blocked;
   revealed ||= hidden && !blocked;
  } else {
   nearPass ||= !blocked && depth < 80;
  }
 }
 assert.ok(hidden && revealed, 'the same bead passes behind and out from the actual connection');
 assert.ok(nearPass, 'the bead crosses a visible near-camera region');
 assert.ok(roadLightPoint(flight.trail(now)).distanceTo(LIGHT_HANDOFF) < 12, 'the track reaches the particle edge');
 assert.ok(roadLightTailSeconds(21.65) > roadLightTailSeconds(18.1) * 1.75);
 bridge.traverse(mesh => {mesh.geometry?.dispose();mesh.material?.dispose();});
});

test('three heads follow their shared rail and trails preserve real motion during reversal', () => {
 const rig = createLightTravelers(), camera = new T.PerspectiveCamera(40, .46, .2, 2400);
 const cores = rig.group.children.filter(child => child.name === 'road-light-core');
 const tails = rig.group.children.filter(child => child.name === 'road-light-trail');
 const control = createLightFlight();
 let previous = null;
 try {
  for (let frame = 0; frame <= 192; frame++) {
   const time = frame / 120, shot = 20.85 + (frame < 96 ? frame : 192 - frame) / 120;
   const clock = control.update(time, shot);
   const pose = sampleRoadCamera(shot, null);
   camera.position.fromArray(pose.position);
   camera.quaternion.fromArray(pose.quaternion);
   camera.updateMatrixWorld(true);
   rig.update(time, shot, camera);
   cores.forEach((core, index) => {
    assert.ok(core.position.distanceTo(roadLightPoint(clock + index * LIGHT_SPACING)) < 1e-7);
    if (previous) assert.ok(core.position.distanceTo(previous[index]) < 14, 'no phase jump on reverse');
    const attr = tails[index].geometry.attributes.position;
    const tailEnd = new T.Vector3();
    for (let j = attr.count - 6; j < attr.count; j++) tailEnd.add(new T.Vector3().fromBufferAttribute(attr,j));
    assert.ok(tailEnd.multiplyScalar(1 / 6).distanceTo(core.position) < .001, 'tail joins its head');
   });
   previous = cores.map(core => core.position.clone());
  }
  assert.ok(control.trail(1.35) > control.trail(1.6), 'past samples preserve the reversed travel direction');
 } finally {rig.dispose();}
});
