import assert from 'node:assert/strict';

import {
  clampJogTime,
  getPointerAngleDegrees,
  getShortestAngleDelta,
} from './jogWheel.js';

assert.equal(clampJogTime(-1, 180), 0, 'jog time clamps to zero');
assert.equal(clampJogTime(999, 180), 180, 'jog time clamps to duration');
assert.equal(
  getPointerAngleDegrees({
    centerX: 0,
    centerY: 0,
    pointerX: 1,
    pointerY: 0,
  }),
  0,
  'pointer angle points to 0 degrees on the right side',
);
assert.equal(
  getPointerAngleDegrees({
    centerX: 0,
    centerY: 0,
    pointerX: 0,
    pointerY: 1,
  }),
  90,
  'pointer angle points to 90 degrees at the bottom',
);
assert.equal(getShortestAngleDelta(350, 10), 20, 'crossing zero clockwise stays small');
assert.equal(getShortestAngleDelta(10, 350), -20, 'crossing zero counterclockwise stays small');

console.log('jogWheel tests passed');
