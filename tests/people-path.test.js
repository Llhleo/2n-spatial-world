import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {lookbackPose, readingQuaternion} from '../src/lookback.js';

const api = await import('../src/people-path.js').catch(() => ({}));
const camera = (aspect = 414 / 896) => new T.PerspectiveCamera(48, aspect, .2, 2400);
const requireApi = () => assert.equal(typeof api.peoplePose, 'function', 'people chapter is not implemented');
const distance = (a, b) => new T.Vector3(...a).distanceTo(new T.Vector3(...b));

test('chapter starts at the unchanged old final position and orientation with a stationary smooth handoff', () => {
  requireApi();
  const old = camera(), current = camera();
  const end = lookbackPose(1, old), start = api.peoplePose(0, current, current.aspect);
  assert.deepEqual(start, end);
  assert.ok(old.quaternion.angleTo(current.quaternion) < 1e-7);
  assert.deepEqual(api.peoplePose(.025, camera()), start, 'old ending has no reading hold');
  const before = api.peoplePose(.035, camera()), tiny = api.peoplePose(.035 + 1e-5, camera());
  assert.ok(distance(before.position, tiny.position) / 1e-5 < .01, 'handoff starts with a velocity jump');
  assert.ok(distance(api.peoplePose(.12, camera()).position, start.position) > 1);
  const a = api.peoplePose(.16 - 1e-5, camera()), b = api.peoplePose(.16, camera());
  assert.ok(distance(a.position, b.position) / 1e-5 < .01, 'arrival starts with a velocity jump');
});

test('every forward or reverse seek derives exactly the same finite pose and state', () => {
  requireApi();
  const cam = camera();
  const forward = Array.from({length: 501}, (_, i) => {
    const t = i / 500, pose = api.peoplePose(t, cam), state = api.peopleState(t);
    assert.ok([...pose.position, ...pose.target, ...cam.quaternion.toArray()].every(Number.isFinite));
    assert.ok(distance(pose.position, pose.target) > 10);
    assert.ok(state.opacity >= 0 && state.opacity <= 1);
    return {pose, state, quaternion: cam.quaternion.toArray()};
  });
  for (let i = 500; i >= 0; i--) {
    assert.deepEqual({pose: api.peoplePose(i / 500, cam), state: api.peopleState(i / 500), quaternion: cam.quaternion.toArray()}, forward[i]);
  }
  assert.deepEqual(api.peoplePose(-1, cam), forward[0].pose);
  assert.deepEqual(api.peoplePose(2, cam), forward[500].pose);
});

test('five disjoint person windows are surrounded only by transition and crowd phases', () => {
  requireApi();
  for (const t of [0, .05, .159999]) {
    const state = api.peopleState(t);
    assert.equal(state.focus, -1);
    assert.equal(state.opacity, 0);
    assert.equal(state.crowd, 0);
    assert.ok(state.transition >= 0 && state.transition < 1);
  }
  for (const [t, focus] of [[.16, 0], [.20, 0], [.31, 1], [.45, 2], [.59, 3], [.76, 4], [.839999, 4]]) {
    const state = api.peopleState(t);
    assert.equal(state.focus, focus);
    assert.equal(state.transition, 1);
    assert.equal(state.crowd, 0);
  }
  for (const t of [.84, .9, 1]) {
    const state = api.peopleState(t);
    assert.equal(state.focus, -1);
    assert.equal(state.opacity, 0);
    assert.equal(state.transition, 1);
    assert.ok(state.crowd >= 0 && state.crowd <= 1);
  }
  assert.equal(api.peopleState(1).crowd, 1);
  for (const t of [.228, .364, .50, .636, .772]) assert.ok(api.peopleState(t).opacity > .95);
  for (const t of [.296, .432, .568, .704]) assert.ok(api.peopleState(t).opacity < 1e-8, 'switch shows two labels');
});

test('fixed distinct arc anchors face their own primary reading view', () => {
  requireApi();
  const positions = [];
  for (let i = 0; i < 5; i++) {
    const anchor = api.peopleAnchor(i), cam = camera();
    const pose = api.peoplePose(.228 + i * .136, cam);
    const point = new T.Vector3(...anchor.position);
    cam.updateMatrixWorld();
    const ndc = point.clone().project(cam);
    assert.ok(Math.abs(ndc.x) < 1e-6 && Math.abs(ndc.y) < 1e-6, 'reading shot misses authored anchor');
    assert.ok(distance(pose.target, anchor.position) < 1e-7);
    const local = point.clone().sub(new T.Vector3(305, 138, 140)).applyQuaternion(readingQuaternion.clone().invert());
    assert.ok(local.z < -180, 'chapter collides with original ending flowers');
    positions.push(anchor.position);
    const saved = api.peopleAnchor(i);
    api.peoplePose(1, cam);
    assert.deepEqual(api.peopleAnchor(i), saved, 'authored anchor follows camera');
  }
  for (let i = 1; i < 5; i++) assert.ok(distance(positions[i], positions[i - 1]) > 10);
});

test('measured name and two-line body bounds fit every focal pose on phone, landscape and desktop', () => {
  requireApi();
  for (const aspect of [414 / 896, 896 / 414, 16 / 9]) {
    const cam = camera(aspect);
    for (let k = 160; k < 840; k += 2) {
      const t = k / 1000, state = api.peopleState(t);
      api.peoplePose(t, cam, aspect);
      cam.updateMatrixWorld();
      for (const measured of [{width: 40, height: 28}, {width: 240, height: 28}]) {
        const layout = api.peopleTextLayout(state.focus, cam, measured);
        assert.ok(layout.scale > 0 && layout.scale <= 1);
        assert.deepEqual(layout.position, api.peopleAnchor(state.focus).position, 'text was turned into a camera HUD');
        const quaternion = new T.Quaternion(...layout.quaternion);
        for (const x of [-measured.width / 2, measured.width / 2]) {
          for (const y of [-measured.height / 2, measured.height / 2]) {
            const corner = new T.Vector3(x, y, 0).multiplyScalar(layout.scale).applyQuaternion(quaternion).add(new T.Vector3(...layout.position)).project(cam);
            assert.ok(Math.abs(corner.x) <= .72 + 1e-7, `horizontal clipping: ${aspect}, ${t}, ${corner.x}`);
            assert.ok(Math.abs(corner.y) <= .70 + 1e-7, `vertical clipping: ${aspect}, ${t}`);
            assert.ok(corner.z > -1 && corner.z < 1);
            assert.ok(corner.x >= layout.bounds.minX - 1e-7 && corner.x <= layout.bounds.maxX + 1e-7);
            assert.ok(corner.y >= layout.bounds.minY - 1e-7 && corner.y <= layout.bounds.maxY + 1e-7);
          }
        }
      }
    }
  }
});

test('long measured names shrink uniformly without truncation and small text keeps its size', () => {
  requireApi();
  const cam = camera();
  api.peoplePose(.50, cam);
  const small = api.peopleTextLayout(2, cam, {width: 8, height: 10});
  const long = api.peopleTextLayout(2, cam, {width: 240, height: 10});
  assert.equal(small.scale, 1);
  assert.ok(long.scale > .05 && long.scale < .2);
  assert.ok(long.bounds.maxX - long.bounds.minX > 1.2, 'long name is not using available readable width');
  assert.equal(long.width, 240 * long.scale);
  assert.equal(long.height, 10 * long.scale);
});

test('crowd entry smoothly backs away and rises while all five fixed anchors remain in frame', () => {
  requireApi();
  const start = api.peoplePose(.84, camera()), end = api.peoplePose(1, camera());
  const inverse = readingQuaternion.clone().invert();
  const delta = new T.Vector3(...end.position).sub(new T.Vector3(...start.position)).applyQuaternion(inverse);
  assert.ok(delta.y > 10 && delta.z > 25, 'crowd does not back up and rise');
  const near = api.peoplePose(.84001, camera());
  assert.ok(distance(start.position, near.position) / .00001 < .01, 'crowd starts with a velocity jump');
  const cam = camera();
  api.peoplePose(1, cam); cam.updateMatrixWorld();
  for (let i = 0; i < 5; i++) {
    const p = new T.Vector3(...api.peopleAnchor(i).position).project(cam);
    assert.ok(Math.abs(p.x) < .72 && Math.abs(p.y) < .70);
  }
});

test('measurement and index validation prevent invalid visible geometry', () => {
  requireApi();
  for (const i of [-1, 5, .5]) assert.throws(() => api.peopleAnchor(i), /index/);
  const cam = camera(); api.peoplePose(.5, cam);
  for (const measured of [{width: 0, height: 10}, {width: Infinity, height: 10}, {width: 10, height: -1}]) {
    assert.throws(() => api.peopleTextLayout(2, cam, measured), /dimensions/);
  }
});
