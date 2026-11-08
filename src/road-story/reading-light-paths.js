import * as T from 'three';
import {ROAD_READING_STOPS, sampleRoadCamera} from './path.js';

function verticalSweep({center, radius, lean}) {
 const [x, y, depth] = center, [width, height, depthCross] = radius;
 const [bend, depthRise] = lean;
 return (u, project, target) => {
  const angle = u * Math.PI * 2, along = Math.cos(angle), across = Math.sin(angle);
  return project(target, x + bend * along + width * across, y - height * along, depth + depthRise * along + depthCross * across);
 };
}

// Composition guides [frame x, frame y, depth] are converted to world space
// once. The reference framing is the same as the authored road typography.
const guides = [
 [
  {period: 9.6, start: .12, knots: [[.25,.932,208],[.35,.919,216],[.48,.901,227],[.57,.908,233],[.52,.945,226],[.38,.954,216],[.27,.953,211]]},
  {period: 8.8, start: .41, knots: [[.43,.831,219],[.51,.805,230],[.64,.786,240],[.715,.768,244],[.753,.793,238],[.625,.832,229],[.49,.851,223],[.43,.854,218]]},
  {period: 10.4, start: .66, knots: [[.64,.724,228],[.735,.688,236],[.84,.613,241],[.887,.592,234],[.907,.63,231],[.855,.684,227],[.751,.727,222],[.661,.741,222]]}
 ],
 [
  {period: 7.7, start: .22, sweep: verticalSweep({center: [.625,.279,178], radius: [.042,.111,5], lean: [.06,-6]})},
  {period: 6.85, start: .54, sweep: verticalSweep({center: [.835,.589,312], radius: [.031,.105,5], lean: [.014,-13]})},
  {period: 8.25, start: .72, sweep: verticalSweep({center: [.81,.816,140], radius: [.041,.103,6], lean: [.08,12]})}
 ],
 [
  {period: 9.7, start: .16, knots: [[.17,.909,149],[.253,.863,152],[.361,.827,156],[.402,.826,153],[.410,.867,147],[.338,.906,145],[.231,.939,144],[.174,.937,145]]},
  {period: 9.4, start: .47, knots: [[.489,.904,153],[.57,.884,154],[.681,.845,164],[.759,.832,166],[.774,.863,164],[.69,.904,157],[.56,.935,149],[.495,.933,147]]},
  {period: 8.9, start: .71, knots: [[.633,.77,165],[.716,.732,165],[.806,.685,169],[.852,.663,170],[.888,.686,163],[.842,.742,157],[.745,.8,154],[.651,.806,156]]}
 ]
];

const lanes = guides.map((scene, index) => {
 const pose = sampleRoadCamera(ROAD_READING_STOPS[index], null);
 const origin = new T.Vector3(...pose.position), rotation = new T.Quaternion(...pose.quaternion);
 const halfFov = Math.tan(T.MathUtils.degToRad(pose.fov / 2)), aspect = 864 / 1872;
 function project(target, x, y, depth) {
  const half = halfFov * depth;
  return target.set((2 * x - 1) * half * aspect, (1 - 2 * y) * half, -depth)
   .applyQuaternion(rotation).add(origin);
 }
 return scene.map(({period, start, knots, sweep}) => {
  if (sweep) return {period, start, sample: (u, target) => sweep(u, project, target)};
  const points = knots.map(([x, y, depth]) => project(new T.Vector3(), x, y, depth));
  const guide = new T.CatmullRomCurve3(points, true, 'centripetal');
  guide.arcLengthDivisions = 512;
  const count = 240;
  const samples = Array.from({length: count}, (_, index) => {
   const u = index / count;
   return guide.getPoint(T.MathUtils.lerp(u, guide.getUtoTmapping(u), .28));
  });
  // Round the tight returns in space while preserving the long visible sweep.
  const weights = [1, 4, 6, 4, 1];
  const rounded = samples.map((_, index) => {
   const point = new T.Vector3();
   for (const [i, weight] of weights.entries()) {
    point.addScaledVector(samples[(index + (i - 2) * 9 + count) % count], weight / 16);
   }
   return point;
  });
  const curve = new T.CatmullRomCurve3(rounded, true, 'catmullrom');
  curve.arcLengthDivisions = 512;
  curve.updateArcLengths();
  return {period, start, sample: (u, target) => curve.getPoint(T.MathUtils.lerp(u, curve.getUtoTmapping(u), .16), target)};
 });
});

export function readingLightPoint(time, target, scene, lane, reduced = false) {
 const {sample, period, start} = lanes[scene][lane];
 const clock = time * (reduced ? .25 : 1);
 const phase = clock / period + start + .015 * Math.sin(clock * .47 + lane * 1.8);
 sample(T.MathUtils.euclideanModulo(phase, 1), target);
 // The return takes a slightly different depth on later laps, within the
 // tested corridor, and the three beads have independent periods.
 const breath = 2.2 * Math.sin(clock * .19 + scene * 1.7 + lane * 2.1);
 target.x += .18 * breath;
 target.z += breath;
 return target;
}
