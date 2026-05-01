import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getFileSignature,
  isSupportedAudioFile,
  mergeImportedTracks,
} from './localTracks.js';

test('isSupportedAudioFile accepts known browser audio types and extensions', () => {
  assert.equal(isSupportedAudioFile({ name: 'demo.mp3', type: 'audio/mpeg' }), true);
  assert.equal(isSupportedAudioFile({ name: 'demo.m4a', type: '' }), true);
  assert.equal(isSupportedAudioFile({ name: 'demo.txt', type: 'text/plain' }), false);
});

test('getFileSignature combines name size and lastModified', () => {
  assert.equal(
    getFileSignature({ name: 'demo.mp3', size: 42, lastModified: 99 }),
    'demo.mp3::42::99',
  );
});

test('mergeImportedTracks skips duplicate local files by signature', () => {
  const existingTracks = [{ id: '1', fileSignature: 'same' }];
  const importedTracks = [
    { id: '2', fileSignature: 'same' },
    { id: '3', fileSignature: 'new' },
  ];

  assert.deepEqual(mergeImportedTracks(existingTracks, importedTracks), [
    { id: '1', fileSignature: 'same' },
    { id: '3', fileSignature: 'new' },
  ]);
});
