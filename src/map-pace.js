// Shorten travel between landmarks while keeping unit speed at each join.
// Cubic smoothstep has zero slope at both ends, so removing distance this
// way also preserves the adjoining shot's entry and exit velocities.
import * as story from './people-story.js';
import {STORY_UNITS} from './lookback.js';

const cuts = [[12, 27.2, 5], [27.2, STORY_UNITS, 10]];
function travel(units) {
  let distance = units;
  for (const [start, end, saving] of cuts) {
    const t = Math.min(1, Math.max(0, (units - start) / (end - start)));
    distance -= saving * t * t * (3 - 2 * t);
  }
  return distance;
}
function authored(distance) {
  if (distance <= cuts[0][0]) return distance;
  if (distance >= travel(STORY_UNITS)) return distance + 15;
  let low = cuts[0][0], high = STORY_UNITS;
  for (let i = 0; i < 43; i++) {
    const mid = (low + high) / 2;
    if (travel(mid) < distance) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
export const TOTAL_UNITS = travel(story.TOTAL_UNITS);
const secondsPerUnit = 150 / STORY_UNITS;
const savingSeconds = 15 * secondsPerUnit;
export function scrollToStory(scroll, route) {
  return story.scrollToStory(authored(scroll * TOTAL_UNITS) / story.TOTAL_UNITS, route);
}
export function storyToScroll(progress, route) {
  return travel(story.storyToScroll(progress, route) * story.TOTAL_UNITS) / TOTAL_UNITS;
}
export function autoplayDuration(route, ending) {
  return story.autoplayDuration(route, ending) - savingSeconds;
}
export function autoplayToScroll(fraction, route, ending) {
  const seconds = fraction * autoplayDuration(route, ending);
  const original = authored(seconds / secondsPerUnit) * secondsPerUnit;
  const scroll = story.autoplayToScroll(original / story.autoplayDuration(route, ending), route, ending);
  return travel(scroll * story.TOTAL_UNITS) / TOTAL_UNITS;
}
export function scrollToAutoplay(scroll, route, ending) {
  const originalScroll = authored(scroll * TOTAL_UNITS) / story.TOTAL_UNITS;
  const seconds = story.scrollToAutoplay(originalScroll, route, ending) * story.autoplayDuration(route, ending);
  return travel(seconds / secondsPerUnit) * secondsPerUnit / autoplayDuration(route, ending);
}
