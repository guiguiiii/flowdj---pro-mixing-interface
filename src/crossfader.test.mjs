import assert from 'node:assert/strict';

import {
  getCrossfaderHandleLeft,
  getCrossfaderValueFromPointer,
  getVerticalFaderHandleBottom,
  getVerticalFaderValueFromPointer,
} from './crossfader.js';

assert.equal(
  getCrossfaderHandleLeft({ value: 0, trackWidth: 280, handleWidth: 32 }),
  0,
  '0% should align the handle with the left edge of the track',
);

assert.equal(
  getCrossfaderHandleLeft({ value: 100, trackWidth: 280, handleWidth: 32 }),
  248,
  '100% should keep the handle fully inside the right edge of the track',
);

assert.equal(
  getCrossfaderValueFromPointer({
    pointerX: 0,
    trackLeft: 0,
    trackWidth: 280,
    handleWidth: 32,
  }),
  0,
  'dragging to the far left should clamp to 0%',
);

assert.equal(
  getCrossfaderValueFromPointer({
    pointerX: 280,
    trackLeft: 0,
    trackWidth: 280,
    handleWidth: 32,
  }),
  100,
  'dragging to the far right should clamp to 100% while keeping the handle inside the track',
);

assert.equal(
  getVerticalFaderHandleBottom({ value: 0, trackHeight: 160, handleHeight: 24 }),
  0,
  '0% should align the vertical fader handle with the bottom edge of the track',
);

assert.equal(
  getVerticalFaderHandleBottom({ value: 100, trackHeight: 160, handleHeight: 24 }),
  136,
  '100% should keep the vertical fader handle fully inside the top edge of the track',
);

assert.equal(
  getVerticalFaderValueFromPointer({
    pointerY: 0,
    trackTop: 0,
    trackHeight: 160,
    handleHeight: 24,
  }),
  100,
  'dragging to the very top should clamp to 100% without overshooting',
);

assert.equal(
  getVerticalFaderValueFromPointer({
    pointerY: 160,
    trackTop: 0,
    trackHeight: 160,
    handleHeight: 24,
  }),
  0,
  'dragging to the very bottom should clamp to 0%',
);
