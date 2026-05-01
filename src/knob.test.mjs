import assert from 'node:assert/strict';

import { getKnobRotationDegrees, getKnobValueFromHorizontalDrag } from './knob.js';

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 50, startX: 100, currentX: 80 }),
  57,
  'dragging left should increase the knob value for DJ-style counter-clockwise boost',
);

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 50, startX: 100, currentX: 120 }),
  43,
  'dragging right should reduce the knob value for DJ-style clockwise cut',
);

assert.equal(
  getKnobValueFromHorizontalDrag({ startValue: 95, startX: 100, currentX: 0 }),
  100,
  'dragging left should clamp at the maximum value',
);

assert.equal(
  getKnobRotationDegrees(50),
  0,
  'the neutral knob value should render at the center rotation',
);

assert.ok(
  getKnobRotationDegrees(80) < 0,
  'higher knob values should rotate left on screen for DJ-style boost',
);

assert.ok(
  getKnobRotationDegrees(20) > 0,
  'lower knob values should rotate right on screen for DJ-style cut',
);
