import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as courtyard from '../src/people-courtyard.js';
import {lookbackPose, FLOWER_SPECS} from '../src/lookback.js';

const data = count => ({leaders: [{id: 'a', name: 'A'}, {id: 'b', name: 'B', intro: '简介'}], members: Array.from({length: count}, (_, i) => `member-${i}`)});

// Catches dropped remainder, reordered names, and synthetic empty groups.
test('groups preserve source order and remainder', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  for (const count of [0, 1, 7, 8, 95, 96]) {
    const route = courtyard.createPeopleRoute(data(count));
    assert.equal(route.memberGroups.length, Math.ceil(count / 7));
    assert.deepEqual(route.memberGroups.flatMap(group => group.memberIndices), Array.from({length: count}, (_, i) => i));
    assert.ok(route.memberGroups.every(group => group.memberIndices.length > 0 && group.memberIndices.length <= 7));
    assert.equal(route.stations.filter(s => s.kind === 'member').length, Math.ceil(count / 7));
  }
});

// Catches skipped reading windows, overlapping main subjects, hard opacity switches, and stateful seeks.
test('windows are continuous and deterministic', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  const route = courtyard.createPeopleRoute(data(95));
  assert.equal(route.seconds, 2 + 5 + 7 + 14 * 5 + 3 + 17 * .9);
  assert.equal(route.windows[0].start, 0);
  assert.equal(route.windows.at(-1).end, 1);
  route.windows.forEach((window, index) => {
    assert.ok(window.start <= window.readStart && window.readStart < window.readEnd && window.readEnd <= window.end);
    if (index) assert.equal(window.start, route.windows[index - 1].end);
    const sample = courtyard.sampleCourtyard(route, (window.readStart + window.readEnd) / 2, 414 / 896);
    assert.equal(sample.primaryStation, index);
    assert.equal(sample.visibleStations.find(s => s.stationIndex === index).opacity, 1);
    assert.equal(sample.visibleStations.filter(s => s.reading).length, 1);
    for (const edge of [window.readStart, window.readEnd]) {
      const near = courtyard.sampleCourtyard(route, edge + (edge === window.readStart ? 1 : -1) * 1e-8, 414 / 896);
      assert.equal(near.visibleStations.find(s => s.stationIndex === index).opacity, 1);
    }
  });
  for (const t of [-1, 0, 1, 2]) {
    const sample = courtyard.sampleCourtyard(route, t, 414 / 896);
    assert.ok([...sample.position, ...sample.target, ...sample.up].every(Number.isFinite));
  }
  assert.deepEqual(courtyard.sampleCourtyard(route, -1, .5), courtyard.sampleCourtyard(route, 0, .5));
  assert.deepEqual(courtyard.sampleCourtyard(route, 2, .5), courtyard.sampleCourtyard(route, 1, .5));
  const before = courtyard.sampleCourtyard(route, .37, .5);
  courtyard.sampleCourtyard(route, 1, .5);
  assert.deepEqual(courtyard.sampleCourtyard(route, .37, .5), before);
});

// Catches route-camera divergence, boundary jumps and camera-attached decoration.
test('world-space route joins the old ending and retains authored petals', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  const route = courtyard.createPeopleRoute(data(8));
  const entry = courtyard.sampleCourtyard(route, 0, .5);
  const old = lookbackPose(1, new T.PerspectiveCamera());
  assert.deepEqual(entry.position, old.position);
  assert.deepEqual(entry.target, old.target);
  const middle = courtyard.sampleCourtyard(route, .5, .5);
  assert.ok(middle.petals.length >= 3);
  const keys = new Set(FLOWER_SPECS.map(([kind, name]) => `${kind}:${name}`));
  assert.ok(middle.petals.every(p => keys.has(p.key) && [...p.position, ...p.quaternion, ...p.scale].every(Number.isFinite)));
  assert.deepEqual(middle.petals, courtyard.sampleCourtyard(route, .51, .5).petals);
  for (const w of route.windows.slice(1)) {
    const a = courtyard.sampleCourtyard(route, w.start - 1e-7, .5);
    const b = courtyard.sampleCourtyard(route, w.start + 1e-7, .5);
    assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position)) < .01);
  }
});

test('invalid editable content preserves existing validation errors', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  assert.throws(() => courtyard.createPeopleRoute({leaders: [], members: ['']}), /members\[0\]/);
});
