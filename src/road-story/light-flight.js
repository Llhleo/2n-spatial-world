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
 [13.08, 417, 29, -221], [13.45, 472, 21, -377], [14.3, 512, 103, -571],
 [15.7, 531, 88, -635], [18.1, 521, -13, -686], [19.2, 519, -69, -640],
 [20.3, 492, -37, -480], [20.9, 465, -52, -512], [21.25, 388, 4, -541],
 [21.65, 254, 4, -618], [21.92, 166, 6, -736], [22.25, 79, 29, -872],
 [22.8, 46, 66, -1010], [23.1, 52, 67, -1097], [26.2, 38, 2, -1136],
 [27.5, -19, -37, -977], [28.6, -2, -37, -979], [29.45, 19, -36, -983], [30.6, 47, 50, -1116], [31.7, -11, 60, -1136],
 [32.7, -172, 60, -1207], [34, -456, 88, -1452],
 [35.45, -590, 125, -1626], [36, ...LIGHT_HANDOFF.toArray()],
 [37.3, -558, 147, -1785], [40.5, -350, 365, -2110],
 [45, 230, 410, -2020], [50, 795, 385, -806], [55, 560, 290, 156],
 [58.8, -60, 41, 175]
];

const count = keys.length;
const curve = new T.CatmullRomCurve3(keys.map(([, x, y, z]) => new T.Vector3(x, y, z)), true, 'centripetal');
curve.arcLengthDivisions = count * 128;
const lengths = curve.getLengths();
const totalLength = lengths.at(-1);
const distances = keys.map((_, index) => lengths[index * 128]);
const times = keys.map(([time]) => time);
distances.push(totalLength);
times.push(LIGHT_LAP);
const rates = keys.map((_, index) => (distances[index + 1] - distances[index]) / (times[index + 1] - times[index]));
const tangents = rates.map((rate, index) => {
 const previous = rates[(index + count - 1) % count];
 return 2 * rate * previous / (rate + previous);
});
tangents.push(tangents[0]);

export function roadLightPoint(clock, target = new T.Vector3()) {
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
 return curve.getPointAt(distance / totalLength, target);
}

// Three nearby phases move through the same shot. At a reading stop, move
// gently within the visible part of the rail, then rejoin the traveling cue
// with bounded acceleration on forward or reverse departure.
export function createLightFlight() {
 let clock = 0, velocity = 0, lastTime = null, lastShot = 0, readingDirection = 1;
 const history = [];
 return {
  update(time, shot, reduced = false) {
   const elapsed = time - lastTime, delta = shot - lastShot;
   if (lastTime === null || elapsed < 0 || Math.abs(delta) > .32) {
    clock = shot;
    velocity = 0;
    readingDirection = 1;
    history.length = 0;
   } else if (elapsed > 0) {
    const cruise = reduced ? .06 : .12;
    const traveling = Math.abs(delta) > 1e-5;
    const error = shot - clock;
    let goal;
    if (traveling) {
     const direction = Math.sign(delta);
     readingDirection = direction;
     goal = direction * T.MathUtils.clamp(direction * (delta / elapsed + 1.65 * error), cruise, 2.7);
    } else {
     if (error < -.18) readingDirection = -1;
     else if (error > .18) readingDirection = 1;
     goal = readingDirection * cruise;
    }
    const acceleration = traveling || Math.abs(velocity) > cruise ? 6 : .85;
    velocity += T.MathUtils.clamp(goal - velocity, -elapsed * acceleration, elapsed * acceleration);
    clock += elapsed * velocity;
   }
   if (!history.length || time > history.at(-1).time) history.push({time, clock});
   while (history.length > 1 && (time - history[1].time > .75 || history.length > 256)) history.shift();
   lastTime = time;
   lastShot = shot;
   return clock;
  },
  trail(time) {
   let i = history.length - 1;
   while (i > 0 && history[i - 1].time >= time) i--;
   const a = history[Math.max(0, i - 1)], b = history[i];
   return a === b ? a.clock : T.MathUtils.lerp(a.clock, b.clock, T.MathUtils.clamp((time - a.time) / (b.time - a.time), 0, 1));
  },
  get oldestTime() { return history[0]?.time ?? 0; },
  reset() { lastTime = null; history.length = 0; }
 };
}

export function roadLightTailSeconds(shot, reduced = false) {
 if (reduced) return .21;
 return .27 + .27 * smooth((shot - 20.85) / .48) * (1 - smooth((shot - 22.25) / .48));
}
