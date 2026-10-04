import * as T from 'three';
import {normalizePeople} from './people-data.js';
import {lookbackPose, readingPoint, readingQuaternion, FLOWER_SPECS, flowerPose} from './lookback.js';

const TRANSITION = .9;
const clamp = t => Math.max(0, Math.min(1, t));
const ease = t => { const u = clamp(t); return u * u * u * (10 + u * (-15 + 6 * u)); };
const entry = lookbackPose(1, new T.PerspectiveCamera());
const world = (x, y, z) => readingPoint(x, y, z).toArray();
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Shared durations: half of each transition belongs to each neighboring window. */
function windowsFor(stations) {
  const seconds = stations.reduce((sum, station) => sum + station.readSeconds, 0) + Math.max(0, stations.length - 1) * TRANSITION;
  let cursor = 0;
  const windows = stations.map((station, stationIndex) => {
    const start = cursor;
    const readStart = start + (stationIndex ? TRANSITION / 2 : 0);
    const readEnd = readStart + station.readSeconds;
    cursor = readEnd + (stationIndex < stations.length - 1 ? TRANSITION / 2 : 0);
    return {stationIndex, start: start / seconds, readStart: readStart / seconds, readEnd: readEnd / seconds, end: cursor / seconds};
  });
  windows.at(-1).readEnd = 1;
  windows.at(-1).end = 1;
  return {windows, seconds};
}

// Lift each complete shot by one scalar. The original tilted horizontal route,
// relative camera/subject/petal geometry and shared Hermite derivatives survive.
// 108+ units leaves the complete ink and rotating HD clusters above the finite
// terrain triangle envelope (all terrain vertices are below -19), even in narrow views.
function elevate(stations) {
 const floor=stations.find(s=>s.quaternion)?.target[1] ?? entry.target[1];
 return stations.map(s=>{
  const lift=s.kind==='entry'?0:Math.max(0,floor-s.target[1]);
  const move=p=>[p[0],p[1]+lift,p[2]];
  return {...s,elevation:lift,position:move(s.position),target:move(s.target),cameraPosition:move(s.cameraPosition),
   petalAnchors:s.petalAnchors.map(p=>({...p,position:move(p.position)}))};
 });
}

/** Pure data, with stable source IDs; position is a text anchor, not the camera. */
export function createPeopleRoute(data) {
  const people = normalizePeople(data);
  if (people.errors.length) throw new Error(people.errors.join('\n'));
  const memberGroups = [];
  for (let start = 0; start < people.members.length; start += 7) {
    memberGroups.push({id: `members-${start / 7}`, memberIndices: Array.from({length: Math.min(7, people.members.length - start)}, (_, i) => start + i)});
  }
  const stations = [{id: 'entry', sourceStationId: 'entry', kind: 'entry', memberIndices: [], position: [...entry.target], target: [...entry.target], cameraPosition: [...entry.position], up: [0, 1, 0], petalAnchors: [], readSeconds: 2}];
  const subjects = [
    ...people.leaders.map((person, leaderIndex) => ({id: person.id, kind: 'leader', leaderIndex, memberIndices: [], readSeconds: person.intro ? 7 : 5})),
    ...memberGroups.map(group => ({...group, kind: 'member', readSeconds: 5})),
  ];
  subjects.forEach((subject, index) => {
    // Lateral travel separates complete old/new name rectangles during transfer,
    // rather than depth-only crossfading two subjects through the same center.
    const x = 32 * Math.sin(index * .38) + index * 50;
    const y = 8 * Math.sin(index * .21);
    const z = -120 - index * 65;
    const position = world(x, y, z);
    const angle = .12 * Math.cos(index * .38);
    const quaternion = readingQuaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), angle)).toArray();
    const petalAnchors = Array.from({length: 6}, (_, j) => {
      const sourceIndex = (index * 5 + j) % FLOWER_SPECS.length;
      const [kind, name, , extent] = FLOWER_SPECS[sourceIndex];
      // Staggered side, above/below and rear layers, authored in the world once.
      return {id: `${subject.id}-petal-${j}`, key: `${kind}:${name}`, sourceIndex,
        position: world(x + (j % 2 ? 1 : -1) * (20 + (j % 3) * 7), y + [-23, 25, -29, 30, -20, 23][j], z + [12, -10, -26, 18, -35, -18][j]),
        quaternion: [...quaternion], scale: [extent, extent, extent]};
    });
    stations.push({...subject, id: `${subject.kind}:${subject.id}`, personId:subject.kind==='leader'?subject.id:undefined, sourceStationId: subject.id, position, target: [...position], quaternion,
      cameraPosition: world(x + Math.sin(angle) * 100, y, z + Math.cos(angle) * 100), up: new T.Vector3(0, 1, 0).applyQuaternion(readingQuaternion).toArray(), petalAnchors});
  });
  const last = stations.at(-1);
  stations.push({id: 'ending', sourceStationId: 'ending', kind: 'ending', memberIndices: [], position: [...last.position], target: [...last.target],
    cameraPosition: mix(last.target,last.cameraPosition,1.08), up: [...last.up], petalAnchors: [], readSeconds: 3});
  return {stations:elevate(stations), sourceStations:stations, memberGroups, ...windowsFor(stations), people};
}

/** The sole responsive window authority. Metrics are post-sync unit ink bounds. */
export function resizeCourtyard(route, {width, height, glyphMetrics}) {
  if (![width,height].every(v=>Number.isFinite(v)&&v>0)) throw new RangeError('viewport must be positive');
  const sourceStations=route.sourceStations || route.stations;
  const stations=[];let extra=0;
  for(const source of sourceStations) {
    const indices=source.memberIndices;
    let columns=1, capacity=7, rowPixels=40;
    if(source.kind==='member') {
      const widest=Math.max(...indices.map(i=>{
        const m=glyphMetrics?.members?.[i];
        return m ? (m.maxX-m.minX)/Math.max(...m.glyphs.map(g=>g[3]-g[1]))*22 : Infinity;
      }));
      columns=widest*2+24<=width*.76 ? 2 : 1;
      rowPixels=Math.max(40,Math.ceil(widest/(width*.74))*31+12);
      capacity=Math.max(1,Math.min(7,Math.floor(height*.4/rowPixels)*columns));
      // Unknown ink still reserves one member; its eventual layout must be finite.
      if(!Number.isFinite(rowPixels))rowPixels=40;
    }
    const chunks=source.kind==='member' ? Array.from({length:Math.ceil(indices.length/capacity)},(_,i)=>indices.slice(i*capacity,(i+1)*capacity)) : [indices];
    chunks.forEach((memberIndices,part)=>{
      const offset=new T.Vector3(50*(extra+part),0,-35*(extra+part)).applyQuaternion(readingQuaternion).toArray();
      const translated=key=>source[key].map((v,i)=>v+offset[i]);
      const id=source.kind==='leader'?`leader:${route.people.leaders[source.leaderIndex].id}`:source.kind==='member'?`member:${source.sourceStationId}:${part}`:`courtyard:${source.kind}`;
      stations.push({...source,id,personId:source.kind==='leader'?route.people.leaders[source.leaderIndex].id:undefined,
        memberIndices:[...memberIndices],part,columns,rowPixels,position:translated('position'),target:translated('target'),cameraPosition:translated('cameraPosition'),
        petalAnchors:source.petalAnchors.map(p=>({...p,id:`${id}:${p.id}`,position:p.position.map((v,i)=>v+offset[i])}))});
    });
    extra+=chunks.length-1;
  }
  return {...route,sourceStations,stations:elevate(stations),...windowsFor(stations),viewport:{width,height}};
}

/** Hermite interpolation with shared derivatives makes random seeks C1 continuous. */
function sampleTrack(knots, seconds, key) {
  let i = 0;
  while (i < knots.length - 2 && seconds > knots[i + 1].time) i++;
  const a = knots[i], b = knots[i + 1], h = b.time - a.time, u = clamp((seconds - a.time) / h);
  const u2 = u * u, u3 = u2 * u;
  const derivative = index => {
    if (!index || index === knots.length - 1) return [0, 0, 0];
    // Each pair bounds one reading interval. Share its slow drift derivative
    // with the neighboring transfer, rather than letting transfer distances
    // pull the target away from the fixed readable subject during the hold.
    const first = knots[index - index % 2], last = knots[index - index % 2 + 1];
    return last[key].map((v, axis) => (v - first[key][axis]) / (last.time - first.time));
  };
  const da = derivative(i), db = derivative(i + 1);
  return a[key].map((v, axis) => (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * h * da[axis] + (-2 * u3 + 3 * u2) * b[key][axis] + (u3 - u2) * h * db[axis]);
}

/** Absolute sampling only: no camera, renderer, Text, loading, or accumulated time. */
export function sampleCourtyard(route, t, aspect = 414 / 896) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('camera aspect must be positive');
  t = clamp(Number.isFinite(t) ? t : 0);
  const knots = [];
  route.windows.forEach(window => {
    const station = route.stations[window.stationIndex];
    const p = station.cameraPosition, target = station.target;
    const drift = window.stationIndex && window.stationIndex < route.stations.length - 1 ? .65 : 0;
    for (const [progress, direction] of [[window.readStart, -1], [window.readEnd, 1]]) {
      const offset = new T.Vector3(0, 0, direction * drift).applyQuaternion(readingQuaternion).toArray();
      knots.push({time: progress * route.seconds, position: p.map((v, i) => v + offset[i]), target: [...target], up: [...station.up]});
    }
  });
  let position = sampleTrack(knots, t * route.seconds, 'position');
  const target = sampleTrack(knots, t * route.seconds, 'target');
  const up = new T.Vector3(...sampleTrack(knots, t * route.seconds, 'up')).normalize().toArray();
  const widen = Math.max(1, (414 / 896) / aspect) - 1;
  position = mix(target, position, 1 + widen * ease(t / Math.max(route.windows[0].readEnd, 1e-6)));
  const primaryStation = route.windows.findIndex(w => t >= w.start && (t < w.end || w.end === 1));
  const visibleStations = [];
  for (let index = Math.max(0, primaryStation - 1); index <= Math.min(route.stations.length - 1, primaryStation + 1); index++) {
    const w = route.windows[index];
    const fadeStart = index ? route.windows[index - 1].readEnd : 0;
    const fadeEnd = index < route.windows.length - 1 ? route.windows[index + 1].readStart : 1;
    const keepLast = route.stations[index].kind === 'member' && route.stations[index + 1]?.kind === 'ending';
    const opacity = t < w.readStart ? ease((t - fadeStart) / Math.max(w.readStart - fadeStart, 1e-9)) : t > w.readEnd && !keepLast ? 1 - ease((t - w.readEnd) / Math.max(fadeEnd - w.readEnd, 1e-9)) : 1;
    visibleStations.push({stationIndex: index, opacity, reading: t >= w.readStart && t <= w.readEnd});
  }
  const petals = route.stations.flatMap(s => s.petalAnchors.map(p => ({...p, position: [...p.position], quaternion: [...p.quaternion], scale: [...p.scale]})));
  // Original ring remains present at the seam and unfolds into a fixed entry cluster.
  FLOWER_SPECS.forEach(([kind, name, , extent], index) => {
    const start = flowerPose(index, 1).toArray();
    const end = world((index % 2 ? 1 : -1) * (24 + index % 3 * 6), -25 + index * 4, -95 - index % 4 * 12);
    petals.push({id: `entry-petal-${index}`, sourceIndex: index, key: `${kind}:${name}`, position: mix(start, end, ease(t / route.windows[0].readEnd)), quaternion: readingQuaternion.toArray(), scale: [extent, extent, extent]});
  });
  return {position, target, up, visibleStations, primaryStation, petals};
}

const environments = new WeakMap();
/** Fixed world clusters authored once from the shared shots, including transfers.
 * Sampling their construction camera never creates a second rendered camera/path.
 */
export function courtyardEnvironment(route) {
  if (environments.has(route)) return environments.get(route);
  const aspect = route.viewport ? route.viewport.width / route.viewport.height : 414 / 896;
  const times = [];
  route.windows.forEach((w,i) => {
    times.push((w.readStart+w.readEnd)/2);
    if(i) for(const u of [.25,.5,.75]) times.push(route.windows[i-1].readEnd+(w.readStart-route.windows[i-1].readEnd)*u);
  });
  const petals = [];
  const camera = new T.PerspectiveCamera(48,aspect,.2,2400);
  times.forEach((t,cluster) => {
    const view=sampleCourtyard(route,t,aspect);
    camera.position.fromArray(view.position);camera.up.fromArray(view.up);camera.lookAt(new T.Vector3(...view.target));camera.updateMatrixWorld();
    for(let j=0;j<6;j++) {
      const sourceIndex=(cluster*5+j)%FLOWER_SPECS.length;
      const [kind,name,,extent]=FLOWER_SPECS[sourceIndex];
      const depth=j%2?112:84, half=depth*Math.tan(Math.PI*24/180);
      const x=[-.65,0,.65,-.65,0,.5][j], y=j<3?.73:-.73;
      petals.push({id:`courtyard-${cluster}-${j}`,key:`${kind}:${name}`,sourceIndex,
        position:new T.Vector3(x*half*aspect,y*half,-depth).applyMatrix4(camera.matrixWorld).toArray(),
        quaternion:camera.quaternion.toArray(),scale:[extent*1.6,extent*1.6,extent*1.6]});
    }
  });
  environments.set(route,petals);return petals;
}
