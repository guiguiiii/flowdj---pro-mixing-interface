import assert from 'node:assert/strict';

import {
  createLoopState,
  getLoopPlaybackWrapTime,
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
    currentTime: 32.37,
    bpm: 120,
    beatOffset: 0.18,
    duration: 180,
  }),
  {
    activeLoop: 'loop4',
    loopBeats: 4,
    loopStart: 32.18,
    loopEnd: 34.18,
  },
  'pressing Loop 4 should create a 4-beat loop snapped to the track beat offset',
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
    currentTime: 50.37,
    bpm: 120,
    duration: 180,
  }),
  {
    activeLoop: 'loop4',
    loopBeats: 4,
    loopStart: 50,
    loopEnd: 52,
  },
  'switching from Loop 8 to Loop 4 should rebuild the loop snapped to the current beat',
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

assert.equal(
  getLoopPlaybackWrapTime({
    currentTime: 33.98,
    loopStart: 32,
    loopEnd: 34,
  }),
  32,
  'playback should wrap slightly before the loop end to avoid audible seek gaps',
);

assert.equal(
  getLoopPlaybackWrapTime({
    currentTime: 34.012,
    loopStart: 32,
    loopEnd: 34,
  }),
  32.012,
  'playback should preserve overshoot when the frame arrives after the loop end',
);

assert.equal(
  getLoopPlaybackWrapTime({
    currentTime: 33.5,
    loopStart: 32,
    loopEnd: 34,
  }),
  null,
  'playback should not wrap before the loop boundary lead window',
);
