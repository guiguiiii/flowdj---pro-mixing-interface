import assert from 'node:assert/strict';

import {
  createLoopState,
  getLoopDurationSeconds,
  toggleLoopState,
} from './loop.js';

assert.equal(
  getLoopDurationSeconds({ bpm: 120, beats: 4 }),
  2,
  'loop 4 should last 4 beats at the current bpm',
);

assert.equal(
  getLoopDurationSeconds({ bpm: 120, beats: 8 }),
  4,
  'loop 8 should last 8 beats at the current bpm',
);

assert.deepEqual(
  toggleLoopState({
    state: createLoopState(),
    loopId: 'loop4',
    currentTime: 32,
    bpm: 120,
    duration: 180,
  }),
  {
    activeLoop: 'loop4',
    loopBeats: 4,
    loopStart: 32,
    loopEnd: 34,
  },
  'pressing Loop 4 should create a 4-beat loop from the current time',
);

assert.deepEqual(
  toggleLoopState({
    state: {
      activeLoop: 'loop4',
      loopBeats: 4,
      loopStart: 32,
      loopEnd: 34,
    },
    loopId: 'loop4',
    currentTime: 33,
    bpm: 120,
    duration: 180,
  }),
  createLoopState(),
  'pressing the active loop button again should disable looping',
);

assert.deepEqual(
  toggleLoopState({
    state: {
      activeLoop: 'loop8',
      loopBeats: 8,
      loopStart: 40,
      loopEnd: 44,
    },
    loopId: 'loop4',
    currentTime: 50,
    bpm: 120,
    duration: 180,
  }),
  {
    activeLoop: 'loop4',
    loopBeats: 4,
    loopStart: 50,
    loopEnd: 52,
  },
  'switching from Loop 8 to Loop 4 should rebuild the loop from the current time',
);

assert.deepEqual(
  toggleLoopState({
    state: createLoopState(),
    loopId: 'loop8',
    currentTime: 179,
    bpm: 120,
    duration: 180,
  }),
  {
    activeLoop: 'loop8',
    loopBeats: 8,
    loopStart: 176,
    loopEnd: 180,
  },
  'loops near the end of the track should clamp safely inside the track duration',
);
