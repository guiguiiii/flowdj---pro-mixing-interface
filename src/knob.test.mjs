import assert from 'node:assert/strict';

import { getKnobValueFromHorizontalDrag } from './knob.js';

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 50, startX: 100, currentX: 80 }),
  43,
  'dragging left should reduce the knob value for counter-clockwise rotation',
);

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 50, startX: 100, currentX: 120 }),
  57,
  'dragging right should increase the knob value for clockwise rotation',
);

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 95, startX: 100, currentX: 200 }),
  100,
  'dragging right should clamp at the maximum value',
);
