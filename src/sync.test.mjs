import assert from 'node:assert/strict';

import { getSyncPressAction, getSyncedPlaybackRate } from './sync.js';

assert.equal(
  getSyncedPlaybackRate({ sourceBpm: 128, targetBaseBpm: 100 }),
  1.28,
  'sync should derive the target playback rate from the opposite deck effective BPM',
);

assert.equal(
  getSyncedPlaybackRate({ sourceBpm: 96, targetBaseBpm: 120 }),
  0.8,
  'sync should support slowing the target deck down to match the source deck BPM',
);

assert.equal(
  getSyncedPlaybackRate({ sourceBpm: 128, targetBaseBpm: 0 }),
  null,
  'sync should ignore invalid target BPM values',
);

assert.equal(
  getSyncPressAction({ durationMs: 499 }),
  'sync',
  'releasing before the threshold should trigger bpm sync',
);

assert.equal(
  getSyncPressAction({ durationMs: 500 }),
  'restore',
  'holding at least the threshold should restore the original bpm',
);
