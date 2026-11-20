import test from 'node:test';
import assert from 'node:assert/strict';
import * as pace from '../src/map-pace.js';
import * as original from '../src/people-story.js';

test('compressed travel remains reversible for both endings and playback modes', () => {
  assert.equal(original.TOTAL_UNITS - pace.TOTAL_UNITS, 15);
  for (const particleEnding of [false, true]) {
    for (let step = 0; step <= 1000; step++) {
      const t = step / 1000;
      const scroll = pace.autoplayToScroll(t, null, particleEnding);
      assert.ok(Math.abs(pace.scrollToAutoplay(scroll, null, particleEnding) - t) < 1e-10);
      assert.ok(Math.abs(pace.storyToScroll(pace.scrollToStory(t)) - t) < 1e-10);
    }
  }
});
