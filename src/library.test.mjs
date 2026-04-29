import test from 'node:test';
import assert from 'node:assert/strict';

import { findTrackById } from './library.js';

const tracks = [
  { id: '1', title: 'Balearic Slide' },
  { id: '2', title: 'Suitcase' },
];

test('findTrackById returns the matching track', () => {
  assert.deepEqual(findTrackById(tracks, '2'), tracks[1]);
});

test('findTrackById returns null for unknown ids', () => {
  assert.equal(findTrackById(tracks, 'missing'), null);
});
