import * as T from 'three';
import {ROAD_ENDING_OFFSET, smooth} from './path.js';

export const LIGHT_LAP = 60;
export const LIGHT_PHASES = Object.freeze([-.55, 0, .55]);
export const LIGHT_HANDOFF = new T.Vector3(25, 45, 8).add(new T.Vector3(...ROAD_ENDING_OFFSET));

// Road-local coordinates. The first flight passes behind the bridge at 12.8,
// the second crosses the lens's right side, and the return leg stays deep.
const keys = [
 [0, -67, -92, 62], [5.5, -45, -68, -38], [8.6, -15, -64, -55],
 [9.3, 10, -62, -76], [10.35, 34, -43, -88], [11.5, 61, 87, -104],
 [12.1, 104, 112, -102], [12.55, 223, 86, -77], [12.8, 336, 39, -167],
 [13.08, 417, 25, -257], [13.45, 472, 21, -377], [14.3, 512, 103, -571],
 [15.7, 512, 72, -583], [18.1, 521, -13, -686], [19.2, 514, -91, -641],
 [20.12, 475, -66, -498], [20.3, 481, -45, -480], [20.9, 465, -52, -512], [21.25, 388, 4, -541],
 [21.65, 254, 4, -618], [21.92, 166, 6, -736], [22.25, 79, 29, -872],
 [22.8, 24, 32, -989], [23.1, 31, 42, -1050], [26.2, 31, 2, -1080],
 [27.5, -19, -37, -977], [28.6, -2, -37, -979], [29.45, 19, -36, -983], [30.6, 48, 50, -1070], [31.7, -11, 72, -1095],
 [32.7, -172, 86, -1207], [34, -456, 88, -1452],
 [35.45, -590, 125, -1626], [36, ...LIGHT_HANDOFF.toArray()],
 [37.3, -558, 147, -1785], [40.5, -350, 365, -2110],
 [45, 230, 410, -2020], [50, 795, 385, -806], [55, 560, 290, 156],
 [58.8, -60, 41, 175]
];

// The flank lights have their own bends and depths. The middle light is
// timed to pass behind the bridge, then carries the final handoff.
const flankOffsets = [
 [
  [0,-14,-9,19], [9.3,-9,-6,11], [11.5,-17,-10,21], [13,-19,18,-16],
  [15.7,-14,-6,16], [18.1,1,-11,30], [20.3,-18,-15,9], [21.65,-12,16,-28],
  [23.1,-17,13,19], [26,-13,-12,18], [28.6,-5,1,-10],
  [30.6,-20,-11,22], [33,-27,-16,12], [36,-22,-12,19], [44,-55,-20,25], [55,-30,20,-22], [60,-14,-9,19]
 ],
 [
  [0,16,12,-14], [9.3,9,7,-16], [11.5,15,19,-25], [13,24,30,-34],
  [15.7,13,22,-12], [18.1,10,10,-18], [20.3,11,17,-20], [21.65,23,-21,-20],
  [23.1,16,24,18], [26,19,19,16], [28.6,2,7,-24],
  [30.6,19,28,6], [33,30,22,-21], [36,26,16,-28], [44,48,34,-18], [55,40,-23,18], [60,16,12,-14]
 ]
];

function flightLane(offsets) {
 const points = keys.map(([time, x, y, z]) => {
  const point = new T.Vector3(x, y, z);
  if (!offsets) return point;
  const i = offsets.findIndex(key => key[0] > time);
  const [start, ax, ay, az] = offsets[i - 1];
  const [end, bx, by, bz] = offsets[i];
  const mix = smooth((time - start) / (end - start));
  return point.add(new T.Vector3(ax, ay, az).lerp(new T.Vector3(bx, by, bz), mix));
 });
 const count = points.length;
 const curve = new T.CatmullRomCurve3(points, true, 'centripetal');
 curve.arcLengthDivisions = count * 128;
 const lengths = curve.getLengths();
 const totalLength = lengths.at(-1);
 const distances = keys.map((_, index) => lengths[index * 128]);
 const times = [...keys.map(([time]) => time), LIGHT_LAP];
 distances.push(totalLength);
 const rates = keys.map((_, i) => (distances[i + 1] - distances[i]) / (times[i + 1] - times[i]));
 const tangents = rates.map((rate, i) => {
  const previous = rates[(i + count - 1) % count];
  return 2 * rate * previous / (rate + previous);
 });
 tangents.push(tangents[0]);
 return {curve, distances, tangents, times, totalLength};
}

const lanes = [flightLane(flankOffsets[0]), flightLane(), flightLane(flankOffsets[1])];

// Fixed bends around the solid ribbons, including their animated sway.
// Each row is the entry, full offset interval, exit, and XYZ clearance.
const clearanceBends = [
 [
  [11.33, 11.51, 12.01, 12.19, 0, -9.192, -9.192],
  [15.71, 15.89, 16.49, 16.67, -9.192, 0, -9.192],
  [18.47, 18.65, 18.99, 19.17, -6.364, 0, 6.364],
  [23.95, 24.55, 25.55, 26.2, 19, 4, 28],
  [25.76, 25.94, 26.08, 26.26, -6.364, 0, -6.364],
  [26.16, 26.34, 26.88, 27.06, -5.196, 5.196, -5.196]
 ],
 [
  [0.5, 0.68, 0.97, 1.15, -5.196, -5.196, -5.196],
  [12.57, 12.75, 13.01, 13.19, -6.364, 0, -6.364],
  [15.51, 15.69, 16.38, 16.56, 17, 0, 0],
  [18.7, 18.88, 19.24, 19.42, -9.815, -9.815, -9.815],
  [22.31, 22.49, 22.68, 22.86, -13, 0, 0],
  [24.65, 25.24, 26.15, 26.55, 15, 0, 28],
  [25.29, 25.47, 26.29, 26.47, -5.196, -5.196, -5.196],
  [25.68, 25.86, 26.35, 26.53, -17, 0, 0],
  [25.82, 26, 26.47, 26.65, -9.192, -9.192, 0],
  [26.37, 26.55, 26.93, 27.11, -6.364, 0, -6.364],
  [31.8, 31.98, 32.17, 32.35, -6.364, 0, 6.364]
 ],
 [
  [0, 0.06, 0.85, 1.03, -13, 0, 0],
  [9.35, 9.7, 10.52, 11.06, -10, 0, 27],
  [15.76, 15.94, 16.5, 16.68, 9.192, -9.192, 0],
  [18.92, 19.1, 19.4, 19.58, 0, 17, 0],
  [19.92, 20.1, 20.75, 20.93, -9.192, -9.192, 0],
  [22.4, 22.58, 22.78, 22.96, 7.506, -7.506, -7.506],
  [31.86, 32.04, 32.45, 32.63, -20.506, 0, 20.506],
  [41.42, 41.6, 42.07, 42.25, 0, 13, 0],
  [43.56, 43.74, 44.48, 44.66, 0, -22, 0]
 ]
];

function authoredLightPoint(clock, target, lane) {
 const {curve, distances, tangents, times, totalLength} = lanes[lane];
 const time = T.MathUtils.euclideanModulo(clock, LIGHT_LAP);
 let i = 0;
 while (time >= times[i + 1]) i++;
 const duration = times[i + 1] - times[i];
 const u = (time - times[i]) / duration;
 const u2 = u * u, u3 = u2 * u;
 const distance = (2 * u3 - 3 * u2 + 1) * distances[i]
  + (u3 - 2 * u2 + u) * duration * tangents[i]
  + (-2 * u3 + 3 * u2) * distances[i + 1]
  + (u3 - u2) * duration * tangents[i + 1];
 curve.getPointAt(distance / totalLength, target);
 for (const [start, full, release, end, x, y, z] of clearanceBends[lane]) {
  if (time <= start || time >= end) continue;
  const mix = smooth((time - start) / (full - start)) * smooth((end - time) / (end - release));
  target.x += x * mix;
  target.y += y * mix;
  target.z += z * mix;
 }
 return target;
}

// Bake the rounded lanes once, so sampling the heads and tails stays cheap.
const flightSampleRate = 120;
const flightSampleCount = LIGHT_LAP * flightSampleRate;
const roundingWeights = [1, 4, 6, 4, 1];

function roundingWindow(time, start, end) {
 return smooth((time - start) / .28) * smooth((end - time) / .28);
}

// Bridge overlapping avoidance bends with an arc that inherits the tangent
// and speed at both joins.
function roundSection(points, start, end) {
 const first = Math.round(start * flightSampleRate);
 const last = Math.round(end * flightSampleRate);
 const a = points[first], b = points[last];
 const handle = (last - first) / 6;
 const out = points[first + 1].clone().sub(points[first - 1]).multiplyScalar(handle).add(a);
 const into = points[last - 1].clone().sub(points[last + 1]).multiplyScalar(handle).add(b);
 const arc = new T.CubicBezierCurve3(a, out, into, b);
 for (let i = first + 1; i < last; i++) arc.getPoint((i - first) / (last - first), points[i]);
}

const roundedLanes = lanes.map((_, lane) => {
 const original = Array.from({length: flightSampleCount}, (_, i) =>
  authoredLightPoint(i / flightSampleRate, new T.Vector3(), lane));
 const points = original.map((_, i) => {
  const time = i / flightSampleRate;
  const span = Math.max(roundingWindow(time, 19.5, 21.15), roundingWindow(time, 25.65, 28.05));
  const stride = 9 + 10 * span;
  const point = new T.Vector3();
  for (let j = 0; j < roundingWeights.length; j++) {
   const sample = i + (j - 2) * stride;
   const lower = Math.floor(sample);
   const index = T.MathUtils.euclideanModulo(lower, flightSampleCount);
   const weight = roundingWeights[j] / 16;
   const fraction = sample - lower;
   point.addScaledVector(original[index], weight * (1 - fraction));
   point.addScaledVector(original[(index + 1) % flightSampleCount], weight * fraction);
  }
  return point;
 });
 roundSection(points, 19.68, 21.03);
 if (lane < 2) roundSection(points, 25.87, 27.35);
 return new T.CatmullRomCurve3(points, true, 'catmullrom');
});

export function roadLightPoint(clock, target = new T.Vector3(), lane = 1) {
 return roundedLanes[lane].getPoint(T.MathUtils.euclideanModulo(clock, LIGHT_LAP) / LIGHT_LAP, target);
}

// The cue clock keeps the cinematic passes aligned with the camera. Around a
// held shot, a small world-space orbit carries the lights through low speeds
// and direction changes. Both the head and the tail sample the same flight.
export function createLightFlight() {
 let clock = 0, velocity = 0, lastTime = null, lastShot = 0;
 const history = [];
 const orbitRadius = 3.2;
 return {
  update(time, shot, reduced = false) {
   const elapsed = time - lastTime, delta = shot - lastShot;
   if (lastTime === null || elapsed < 0 || Math.abs(delta) > .32) {
    clock = shot;
    velocity = 0;
    history.length = 0;
   } else if (elapsed > 0) {
    const traveling = Math.abs(delta) > 1e-5;
    // The next step already includes delta. Correct against the previous
    // camera phase so neither playback direction gets a one-frame lead.
    const goal = T.MathUtils.clamp((traveling ? delta / elapsed : 0) + 1.65 * (lastShot - clock), -2.7, 2.7);
    const acceleration = traveling ? 6 : 4;
    velocity += T.MathUtils.clamp(goal - velocity, -elapsed * acceleration, elapsed * acceleration);
    clock += elapsed * velocity;
   }
   const radius = (reduced ? 1 : orbitRadius) * Math.exp(-((velocity / .6) ** 2));
   if (!history.length || time > history.at(-1).time) history.push({time, clock, radius});
   while (history.length > 1 && (time - history[1].time > 1.05 || history.length > 256)) history.shift();
   lastTime = time;
   lastShot = shot;
   return clock;
  },
  point(time, target, lane) {
   let i = history.length - 1;
   while (i > 0 && history[i - 1].time >= time) i--;
   const a = history[Math.max(0, i - 1)], b = history[i];
   const mix = a === b ? 0 : T.MathUtils.clamp((time - a.time) / (b.time - a.time), 0, 1);
   const phase = T.MathUtils.lerp(a.clock, b.clock, mix);
   const radius = T.MathUtils.lerp(a.radius, b.radius, mix);
   const angle = Math.max(history[0].time, Math.min(time, lastTime)) * (1.45 + lane * .13) + lane * 2.4;
   roadLightPoint(phase + LIGHT_PHASES[lane], target, lane);
   const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
   target.x += x;
   target.y += .88 * y;
   target.z += .35 * x + .4 * y;
   return target;
  },
  get orbitMix() { return (history.at(-1)?.radius ?? 0) / orbitRadius; },
  get oldestTime() { return history[0]?.time ?? 0; },
  reset() { lastTime = null; history.length = 0; }
 };
}

export function roadLightTailSeconds(shot, reduced = false) {
 if (reduced) return .21;
 return .27 + .27 * smooth((shot - 20.85) / .48) * (1 - smooth((shot - 22.25) / .48));
}
