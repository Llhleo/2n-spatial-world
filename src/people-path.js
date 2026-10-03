import * as T from 'three';
import {lookbackPose, readingPoint, readingQuaternion} from './lookback.js';
import {sampleCourtyard} from './people-courtyard.js';

export const PEOPLE_UNITS = 18;
const START = .16, CROWD = .84, HOLD = .035;
const WINDOWS = [START, .296, .432, .568, .704, CROWD];
const MOVE_HALF = .032;
const ANGLES = [-.32, -.16, 0, .16, .32];
const RADIUS = 110, ORIGIN_Z = -310, DISTANCE = 100;
const SAFE_X = .72, SAFE_Y = .70, INSET = .04;
const clamp = t => T.MathUtils.clamp(t, 0, 1);
const ease = t => { const u = clamp(t); return u * u * u * (10 + u * (-15 + 6 * u)); };
const oldEnd = lookbackPose(1, new T.PerspectiveCamera());
const oldTarget = new T.Vector3(...oldEnd.target).sub(new T.Vector3(...oldEnd.position)).applyQuaternion(readingQuaternion.clone().invert());
const up = new T.Vector3(0, 1, 0);

function validateIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index >= ANGLES.length) throw new RangeError('person index must be 0–4');
}

function anchorLocal(angle) {
  return new T.Vector3(RADIUS * Math.sin(angle), 0, ORIGIN_Z + RADIUS * Math.cos(angle));
}

/** Fixed authored plane: its local origin is the center of the complete text block. */
export function peopleAnchor(index) {
  validateIndex(index);
  const angle = ANGLES[index], local = anchorLocal(angle);
  const quaternion = readingQuaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(up, angle));
  return {position: readingPoint(local.x, local.y, local.z).toArray(), quaternion: quaternion.toArray()};
}

/** Exactly one focal person; opacity belongs only to that person, not all five. */
export function peopleState(t) {
  t = clamp(t);
  const transition = ease((t - HOLD) / (START - HOLD));
  if (t < START) return {transition, focus: -1, opacity: 0, crowd: 0};
  if (t >= CROWD) return {transition: 1, focus: -1, opacity: 0, crowd: ease((t - CROWD) / (1 - CROWD))};
  let focus = 0;
  while (focus < 4 && t >= WINDOWS[focus + 1]) focus++;
  const opacity = Math.min(ease((t - WINDOWS[focus]) / .018), ease((WINDOWS[focus + 1] - t) / .018));
  return {transition: 1, focus, opacity, crowd: 0};
}

function readingAngle(t) {
  for (let i = 1; i < 5; i++) {
    const boundary = WINDOWS[i];
    if (t < boundary - MOVE_HALF) return ANGLES[i - 1];
    if (t < boundary + MOVE_HALF) return T.MathUtils.lerp(ANGLES[i - 1], ANGLES[i], ease((t - boundary + MOVE_HALF) / (2 * MOVE_HALF)));
  }
  return ANGLES[4];
}

/** Absolute scroll sampling; mutates only the supplied existing camera's pose. */
export function peoplePose(t, camera, aspect = camera.aspect, route) {
  if (route) {
    const pose = sampleCourtyard(route, t, aspect);
    camera.position.fromArray(pose.position);
    camera.up.fromArray(pose.up);
    camera.lookAt(new T.Vector3(...pose.target));
    return pose;
  }
  t = clamp(t);
  if (t <= HOLD) return lookbackPose(1, camera);
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('camera aspect must be positive');
  const depth = DISTANCE * Math.max(1, (414 / 896) / aspect);
  const angle = readingAngle(Math.max(t, START));
  const target = anchorLocal(angle);
  const position = target.clone().add(new T.Vector3(Math.sin(angle) * depth, 0, Math.cos(angle) * depth));
  if (t < START) {
    const blend = ease((t - HOLD) / (START - HOLD));
    position.multiplyScalar(blend);
    target.copy(oldTarget).lerp(anchorLocal(ANGLES[0]), blend);
  } else if (t >= CROWD) {
    const blend = ease((t - CROWD) / (1 - CROWD));
    position.lerp(new T.Vector3(0, 28, -200 + depth + 155), blend);
    target.lerp(anchorLocal(0), blend);
  }
  // Work in the old ending's reading frame, including its tilt, without
  // altering camera.up or introducing accumulated quaternion interpolation.
  const orientation = new T.Matrix4().lookAt(position, target, up);
  camera.quaternion.setFromRotationMatrix(orientation).premultiply(readingQuaternion);
  readingPoint(position.x, position.y, position.z, camera.position);
  const worldTarget = readingPoint(target.x, target.y, target.z);
  return {position: camera.position.toArray(), target: worldTarget.toArray()};
}

/**
 * Projects the complete local glyph rectangle through the fixed world matrix.
 * fontPixels is representative ink height: maximum individual glyph height,
 * each conservatively measured by its smaller projected vertical edge. Short
 * punctuation cannot drive sizing. Supply `glyphs` per tier for multiline
 * text; without it the single rectangle is treated as one representative glyph.
 * This is actual ink, not nominal em/fontSize; ascenders differ between fonts.
 * Bounds accept Troika's [minX,minY,maxX,maxY] or named coordinates with glyphs.
 */
export function projectTextBounds(camera, worldMatrix, glyphBounds, viewport) {
  const {width, height} = viewport;
  const [minX, minY, maxX, maxY] = Array.isArray(glyphBounds) || ArrayBuffer.isView(glyphBounds)
    ? glyphBounds : [glyphBounds.minX, glyphBounds.minY, glyphBounds.maxX, glyphBounds.maxY];
  if (![width, height].every(v => Number.isFinite(v) && v > 0) ||
      ![minX, minY, maxX, maxY].every(Number.isFinite) || maxX < minX || maxY < minY) {
    throw new RangeError('viewport and glyph bounds must be finite and ordered');
  }
  camera.updateMatrixWorld();
  let valid = true;
  const points = [];
  for (const x of [minX, maxX]) for (const y of [minY, maxY]) {
    const world = new T.Vector3(x, y, 0).applyMatrix4(worldMatrix);
    const depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
    valid &&= depth > camera.near && depth < camera.far;
    const p = world.project(camera);
    points.push(new T.Vector2((p.x + 1) * width / 2, (1 - p.y) * height / 2));
  }
  const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
  const rect = {x: left, y: top, width: right - left, height: bottom - top};
  const finite = [...points.flatMap(p => p.toArray())].every(Number.isFinite);
  const glyphs = glyphBounds.glyphs;
  const fontPixels = finite && valid ? (glyphs?.length
    ? Math.max(...glyphs.map(glyph => projectTextBounds(camera, worldMatrix, glyph, viewport).fontPixels))
    : Math.min(points[0].distanceTo(points[1]), points[2].distanceTo(points[3]))) : 0;
  return {rect, fontPixels,
    fits: finite && valid && left >= width * .12 && right <= width * .88 && top >= height * .30 && bottom <= height * .70};
}

/**
 * Fit actual post-sync glyph bounds, not a character-count estimate.
 * measured.width/height describe the entire centered three-tier block in its
 * unscaled local units. Recenter glyphs locally before applying this result.
 * Returns a world-space transform, fitted dimensions and NDC bounds. No text
 * is wrapped/truncated, and neither camera nor measured data is mutated.
 */
export function peopleTextLayout(index, camera, measured) {
  const {width, height} = measured;
  if (![width, height].every(v => Number.isFinite(v) && v > 0)) throw new RangeError('text dimensions must be finite and positive');
  const anchor = peopleAnchor(index), quaternion = new T.Quaternion(...anchor.quaternion);
  const center = new T.Vector3(...anchor.position);
  const inverse = camera.quaternion.clone().invert();
  const vertical = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
  const horizontal = vertical * camera.aspect;
  if (![vertical, horizontal].every(v => Number.isFinite(v) && v > 0)) throw new RangeError('perspective camera dimensions must be finite and positive');
  const corners = [];
  for (const x of [-width / 2, width / 2]) for (const y of [-height / 2, height / 2]) {
    corners.push(new T.Vector3(x, y, 0).applyQuaternion(quaternion).applyQuaternion(inverse));
  }
  const localCenter = center.clone().sub(camera.position).applyQuaternion(inverse);
  const project = scale => {
    const bounds = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity};
    let valid = true;
    for (const corner of corners) {
      const p = localCenter.clone().addScaledVector(corner, scale), depth = -p.z;
      const x = p.x / (depth * horizontal), y = p.y / (depth * vertical);
      valid &&= depth > camera.near && depth < camera.far;
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    }
    return {bounds, fits: valid && bounds.minX >= -SAFE_X + INSET && bounds.maxX <= SAFE_X - INSET && bounds.minY >= -SAFE_Y + INSET && bounds.maxY <= SAFE_Y - INSET};
  };
  // Binary search is monotonic while the authored center is inside the safe
  // frustum. Hidden/offscreen cards return scale zero instead of becoming HUDs.
  let scale = 0;
  if (project(0).fits) {
    if (project(1).fits) scale = 1;
    else {
      let low = 0, high = 1;
      for (let i = 0; i < 32; i++) {
        const mid = (low + high) / 2;
        if (project(mid).fits) low = mid; else high = mid;
      }
      scale = low;
    }
  }
  return {...anchor, scale, width: width * scale, height: height * scale, bounds: project(scale).bounds};
}
