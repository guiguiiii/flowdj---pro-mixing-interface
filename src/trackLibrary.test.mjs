import test from 'node:test';
import assert from 'node:assert/strict';

import { createLibraryTrack } from './trackLibrary.js';

test('createLibraryTrack fills in default duration and artwork', () => {
  const track = createLibraryTrack({
    id: 'demo-track',
    title: 'Demo Track',
    artist: 'Demo Artist',
    bpm: 124,
    key: '8A',
    src: '/audio/demo-track.mp3',
  });

  assert.equal(track.duration, '00:00');
  assert.equal(track.artwork, 'https://picsum.photos/seed/demo-track/100/100');
});
