import assert from 'node:assert/strict';

import {
  getSeekTimeFromHorizontalPointer,
  getScrubbedTimeFromVerticalDrag,
} from './waveformScrub.js';

assert.equal(
  getSeekTimeFromHorizontalPointer({
    pointerX: 150,
    left: 50,
    width: 200,
    duration: 180,
  }),
  90,
  'horizontal waveform should map pointer position to an absolute seek time',
);

assert.equal(
  getSeekTimeFromHorizontalPointer({
    pointerX: 10,
    left: 50,
    width: 200,
    duration: 180,
  }),
  0,
  'horizontal waveform should clamp seek time before the start',
);

assert.equal(
  getSeekTimeFromHorizontalPointer({
    pointerX: 310,
    left: 50,
    width: 200,
    duration: 180,
  }),
  180,
  'horizontal waveform should clamp seek time after the end',
);

assert.equal(
  getScrubbedTimeFromVerticalDrag({
    startTime: 40,
    startY: 300,
    currentY: 260,
    duration: 180,
    secondsPerPixel: 0.25,
  }),
  50,
  'dragging upward should move playback later in the track',
);

assert.equal(
  getScrubbedTimeFromVerticalDrag({
    startTime: 40,
    startY: 300,
    currentY: 340,
    duration: 180,
    secondsPerPixel: 0.25,
  }),
  30,
  'dragging downward should move playback earlier in the track',
);

assert.equal(
  getScrubbedTimeFromVerticalDrag({
    startTime: 4,
    startY: 300,
    currentY: 380,
    duration: 180,
    secondsPerPixel: 0.25,
  }),
  0,
  'vertical scrubbing should clamp at the start of the track',
);

assert.equal(
  getScrubbedTimeFromVerticalDrag({
    startTime: 178,
    startY: 300,
    currentY: 260,
    duration: 180,
    secondsPerPixel: 0.25,
  }),
  180,
  'vertical scrubbing should clamp at the end of the track',
);
