import test from 'node:test';
import assert from 'node:assert/strict';

import { getSyncedPlaybackRate } from './sync.js';

test('getSyncedPlaybackRate matches the source deck bpm when source is playing', () => {
  const playbackRate = getSyncedPlaybackRate({
    sourceIsPlaying: true,
    sourceBpm: 128,
    targetBaseBpm: 120,
  });

  assert.equal(playbackRate, 1.067);
});

test('getSyncedPlaybackRate leaves the target unchanged when source is not playing', () => {
  const playbackRate = getSyncedPlaybackRate({
    sourceIsPlaying: false,
    sourceBpm: 128,
    targetBaseBpm: 120,
  });

  assert.equal(playbackRate, null);
});

test('getSyncedPlaybackRate clamps invalid target bpm values', () => {
  const playbackRate = getSyncedPlaybackRate({
    sourceIsPlaying: true,
    sourceBpm: 128,
    targetBaseBpm: 0,
  });

  assert.equal(playbackRate, null);
});
