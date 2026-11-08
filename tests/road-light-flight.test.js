import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ROAD_READING_STOPS, sampleRoadCamera} from '../src/road-story/path.js';
import {createGesturePlayback} from '../src/gesture-playback.js';
import {makeConnections} from '../src/road-story/journey.js';
import {createLightFlight, LIGHT_HANDOFF, LIGHT_LAP, roadLightPoint, roadLightTailSeconds} from '../src/road-story/light-flight.js';
import {createLightTravelers} from '../src/road-story/lights.js';

test('the closed light lanes have no stop at their return seam', () => {
 for (let lane = 0; lane < 3; lane++) {
  const point = time => roadLightPoint(time, new T.Vector3(), lane);
  assert.ok(point(0).distanceTo(point(LIGHT_LAP)) < 1e-7);
  for (let i = 0; i < LIGHT_LAP; i += .02) {
   const gap = point(i).distanceTo(point(i + .01));
   assert.ok(gap > .02 && gap < 9, `continuous travel on lane ${lane} at ${i}: ${gap}`);
  }
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
  flight.update(now += 1 / 120, shot);
  if ((shot < 12.5 || shot > 13.5) && (shot < 21.45 || shot > 22.1)) continue;
  cameraAt(shot);
  const head = flight.point(now, new T.Vector3(), 1), screen = head.clone().project(camera);
  const depth = -head.clone().applyMatrix4(camera.matrixWorldInverse).z;
  if (Math.abs(screen.x) > .93 || Math.abs(screen.y) > .85 || depth < 20 || flight.opacity(1) < .3) continue;
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
 assert.ok(flight.point(now, new T.Vector3(), 1).distanceTo(LIGHT_HANDOFF) < 12, 'the track reaches the particle edge');
 assert.ok(roadLightTailSeconds(21.65) > roadLightTailSeconds(18.1) * 1.75);
 bridge.traverse(mesh => {mesh.geometry?.dispose();mesh.material?.dispose();});
});

test('three heads follow their own lanes and trails preserve real motion during reversal', () => {
 const rig = createLightTravelers(), camera = new T.PerspectiveCamera(40, .46, .2, 2400);
 const cores = rig.group.children.filter(child => child.name === 'road-light-core');
 const tails = rig.group.children.filter(child => child.name === 'road-light-trail');
 const control = createLightFlight();
 let previous = null;
 try {
  let phaseBeforeReversal;
  for (let frame = 0; frame <= 192; frame++) {
   const time = frame / 120, shot = 21.3 + (frame < 96 ? frame : 192 - frame) / 120;
   const clock = control.update(time, shot);
   if (frame === 162) phaseBeforeReversal = clock;
   if (frame === 192) assert.ok(phaseBeforeReversal > clock, 'the traveling cue can still rewind');
   const pose = sampleRoadCamera(shot, null);
   camera.position.fromArray(pose.position);
   camera.quaternion.fromArray(pose.quaternion);
   camera.updateMatrixWorld(true);
   rig.update(time, shot, camera);
   cores.forEach((core, index) => {
    assert.ok(core.position.distanceTo(control.point(time, new T.Vector3(), index)) < 1e-7);
    if (previous) assert.ok(core.position.distanceTo(previous[index]) < 14, 'no phase jump on reverse');
    const attr = tails[index].geometry.attributes.position;
    const tailEnd = new T.Vector3();
    for (let j = attr.count - 6; j < attr.count; j++) tailEnd.add(new T.Vector3().fromBufferAttribute(attr,j));
    assert.ok(tailEnd.multiplyScalar(1 / 6).distanceTo(core.position) < .001, 'tail joins its head');
   });
   previous = cores.map(core => core.position.clone());
  }
  assert.ok(control.point(1.35, new T.Vector3(), 1).distanceTo(cores[1].position) > 10, 'the trail retains earlier head positions');
 } finally {rig.dispose();}
});

test('the close-up and exit keep a continuous heading through their avoidance bends', () => {
 for (const speed of [1, 1.35]) {
  const step = speed / 60;
  for (let lane = 0; lane < 3; lane++) {
   const point = t => roadLightPoint(t, new T.Vector3(), lane);
   for (const [start, end, limit] of [[11.5, 14.3, 15], [20.3, 23.1, 16], [25.85, 27.35, 24], [30.6, 37.45, 14]]) {
    for (let t = start; t <= end; t += step) {
     const before = point(t).sub(point(t - step));
     const after = point(t + step).sub(point(t));
     if (Math.min(before.length(), after.length()) < .15 * speed) continue;
     const degrees = before.angleTo(after) * 180 / Math.PI;
     assert.ok(degrees < limit, `lane ${lane} turns ${degrees.toFixed(1)}° at ${t.toFixed(3)}s (${speed}×)`);
    }
   }
  }
 }
});

test('the center light enters the portrait close-up while its tail is long in both directions', () => {
 const camera = new T.PerspectiveCamera(40, 414 / 896, .2, 2400);
 for (const rate of [1, -1.35]) {
  const flight = createLightFlight();
  let closeUp = false;
  for (let frame = 0; frame <= 1000; frame++) {
   const shot = (rate > 0 ? 17 : 26) + frame * rate / 60;
   if (rate > 0 ? shot > 23.1 : shot < 20.3) break;
   const time = frame / 60;
   flight.update(time, shot);
   if (shot < 20.3 || shot > 23.1 || roadLightTailSeconds(shot) < .5) continue;
   const pose = sampleRoadCamera(shot, null);
   camera.position.fromArray(pose.position);
   camera.quaternion.fromArray(pose.quaternion);
   camera.updateMatrixWorld(true);
   const head = flight.point(time, new T.Vector3(), 1);
   const depth = -head.clone().applyMatrix4(camera.matrixWorldInverse).z;
   const screen = head.project(camera);
   closeUp ||= flight.opacity(1) > .5 && depth > 38 && depth < 80 && Math.abs(screen.x) < .9 && Math.abs(screen.y) < .9;
  }
  assert.ok(closeUp, `the light misses the long-tail portrait close-up at playback rate ${rate}`);
 }
});

test('the rendered lights keep moving through reading holds and opposite gestures', () => {
 const width = 414, height = 896;
 const camera = new T.PerspectiveCamera(40, width / height, .2, 2400);
 for (const fps of [30, 60, 120]) for (const stop of ROAD_READING_STOPS) {
  const rig = createLightTravelers();
  const cores = rig.group.children.filter(child => child.name === 'road-light-core');
  const tails = rig.group.children.filter(child => child.name === 'road-light-trail');
  const player = createGesturePlayback([0, ...ROAD_READING_STOPS, 36]);
  player.seek(stop - 1.3);
  player.request(1);
  let previous = null;
  const screenWindow = [];
  try {
   for (let frame = 0; frame <= fps * 13; frame++) {
    if (frame === fps * 8) player.request(1);
    if (frame === fps * 8 + Math.round(fps * .3)) player.request(-1);
    if (frame === fps * 11) player.request(-1);
    if (frame === fps * 11 + Math.round(fps * .3)) player.request(1);
    const time = frame / fps, shot = player.advance(1 / fps);
    const pose = sampleRoadCamera(shot, null);
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    camera.updateMatrixWorld(true);
    rig.update(time, shot, camera);
    const points = cores.map(core => core.position.clone());
    if (previous && time >= 1) {
     points.forEach((point, lane) => {
      const speed = point.distanceTo(previous[lane]) * fps;
      assert.ok(speed > .9, `lane ${lane} stalls at ${time.toFixed(3)}s around stop ${stop} (${fps}fps): ${speed.toFixed(2)}`);
     });
    }
    previous = points;
    if (time === 5) tails.forEach((tail, lane) => {
     const positions = tail.geometry.attributes.position;
     const center = new T.Vector3(), vertex = new T.Vector3();
     let reach = 0;
     for (let k = 0; k < positions.count; k += 6) {
      center.set(0, 0, 0);
      for (let j = 0; j < 6; j++) center.add(vertex.fromBufferAttribute(positions, k + j));
      reach = Math.max(reach, center.multiplyScalar(1 / 6).distanceTo(points[lane]));
     }
     assert.ok(reach > 2, `a reading light retains its tail through curved sections: ${stop}, ${lane}, ${reach}`);
    });
    if (time < 2 || time >= 8) continue;
    const screen = points.map(point => point.project(camera));
    screenWindow.push(screen);
    if (screenWindow.length <= fps / 10) continue;
    const before = screenWindow.shift();
    screen.forEach((point, lane) => {
     const travel = Math.hypot((point.x - before[lane].x) * width / 2, (point.y - before[lane].y) * height / 2);
     assert.ok(travel > .3, `lane ${lane} stalls on screen at ${time.toFixed(3)}s on stop ${stop} (${fps}fps)`);
    });
   }
  } finally { rig.dispose(); }
 }
});

test('portrait lights keep their speed and heading near reading stops at different arrival phases', () => {
 const width = 390, height = 844, dt = 1 / 60;
 const camera = new T.PerspectiveCamera(40, width / height, .2, 2400);
 for (const stop of ROAD_READING_STOPS) for (const direction of [-1, 1]) {
  for (let seed = 0; seed < 8; seed++) {
   const flight = createLightFlight();
   const player = createGesturePlayback([0, ...ROAD_READING_STOPS, 36]);
   player.seek(stop - direction * 1.95);
   player.request(direction);
   let previous, heading, lastShot, lastCameraMoved;
   for (let frame = 0; frame <= 435; frame++) {
    if (frame === 180 || frame === 350) player.request(direction);
    if (frame === 225 || frame === 305) player.request(-direction);
    const shot = player.advance(dt), time = seed * .49 + frame * dt;
    const cameraMoved = Math.abs(shot - lastShot) > 1e-7;
    const pose = sampleRoadCamera(shot, null);
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    camera.updateMatrixWorld(true);
    flight.update(time, shot);
    const screen = Array.from({length: 3}, (_, lane) => {
     const point = flight.point(time, new T.Vector3(), lane).project(camera);
     return new T.Vector2(point.x * width / 2, point.y * height / 2);
    });
    if (previous) {
     const nextHeading = screen.map((point, lane) => point.clone().sub(previous[lane]));
     if (heading && Math.abs(shot - stop) <= .9) nextHeading.forEach((step, lane) => {
      const speed = step.length() / dt;
      const turn = Math.acos(T.MathUtils.clamp(step.dot(heading[lane]) / (step.length() * heading[lane].length()), -1, 1)) * 180 / Math.PI;
      const at = `lane ${lane}, reading stop ${stop}, shot ${shot.toFixed(2)}, frame ${frame}, seed ${seed}, direction ${direction}`;
      // Near a gesture reversal, projected motion also includes the camera.
      const moving = cameraMoved || lastCameraMoved;
      assert.ok(speed > (moving ? 5 : 8), `visible speed ${speed.toFixed(1)}px/s at ${at}`);
      assert.ok(turn < (moving ? 25 : 12), `visible heading changes ${turn.toFixed(1)}° at ${at}`);
     });
     heading = nextHeading;
    }
    previous = screen;
    lastShot = shot;
    lastCameraMoved = cameraMoved;
   }
  }
 }
});

test('the loops change passes while the corresponding bead and trail are dimmed', () => {
 const rig = createLightTravelers(), control = createLightFlight();
 const cores = rig.group.children.filter(child => child.name === 'road-light-core');
 const tails = rig.group.children.filter(child => child.name === 'road-light-trail');
 const camera = new T.PerspectiveCamera(40, 414 / 896, .2, 2400);
 const entry = {position: [0, 0, 0], target: [0, 0, -1]};
 try {
  for (const rate of [1, -1.35]) {
   control.reset();
   rig.reset();
   let previous;
   const changes = [0, 0, 0];
   for (let frame = 0; frame < 30 * 30; frame++) {
    const time = frame / 30, shot = (rate > 0 ? 5.05 : 31.3) + time * rate;
    if (shot < 5.05 || shot > 31.3) break;
    const pose = sampleRoadCamera(shot, shot < 5.5 || shot > 30.6 ? entry : null);
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    control.update(time, shot);
    rig.update(time, shot, camera);
    const current = cores.map((core, lane) => {
     const data = tails[lane].geometry.attributes.trail;
     let maxTail = 0;
     if (tails[lane].visible) for (let i = 0; i < data.count; i++) maxTail = Math.max(maxTail, data.getY(i));
     return {pass: control.pass(lane), core: core.visible ? core.material.opacity : 0, tail: maxTail};
    });
    if (previous) current.forEach((light, lane) => {
     const last = previous[lane];
     if (last.pass === light.pass) return;
     changes[lane]++;
     assert.ok(Math.max(last.core, light.core, last.tail, light.tail) < .02,
      `a pass change leaves a bright head or connecting trail at ${shot.toFixed(2)}s`);
    });
    previous = current;
   }
   assert.deepEqual(changes, [6, 6, 6], 'all reading and travel changes are checked in each direction');
  }
 } finally { rig.dispose(); }
});

test('each reading bead travels across its reference corridor instead of circling in place', () => {
 const camera = new T.PerspectiveCamera(40, 414 / 896, .2, 2400);
 for (const [scene, shot] of ROAD_READING_STOPS.entries()) {
  const pose = sampleRoadCamera(shot, null);
  camera.position.fromArray(pose.position);
  camera.quaternion.fromArray(pose.quaternion);
  camera.updateMatrixWorld(true);
  const flight = createLightFlight();
  const bounds = Array.from({length: 3}, () => new T.Box2());
  for (let frame = 0; frame <= 18 * 30; frame++) {
   const time = frame / 30;
   flight.update(time, shot);
   bounds.forEach((box, lane) => {
    const projected = flight.point(time, new T.Vector3(), lane).project(camera);
    box.expandByPoint(new T.Vector2(projected.x, projected.y));
   });
  }
  bounds.forEach((box, lane) => {
   const extent = box.getSize(new T.Vector2());
   const travel = scene === 1 ? extent.y : extent.x;
   assert.ok(travel > .39, `scene ${scene + 1}, lane ${lane} covers only ${(travel * 50).toFixed(1)}% of the frame`);
  });
 }
});
