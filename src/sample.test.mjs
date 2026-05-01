import assert from 'node:assert/strict';

import { getSampleById, SAMPLE_BANKS, SAMPLE_TRIGGER_MS } from './sample.js';

assert.deepEqual(
  SAMPLE_BANKS.s1.map((sample) => sample.label),
  ['KICK', 'SNARE', 'CLAP', 'VOX'],
  'S1 should expose the expected sample labels',
);

assert.deepEqual(
  SAMPLE_BANKS.s2.map((sample) => sample.label),
  ['HAT', 'PERC', 'RIDE', 'BASS'],
  'S2 should expose the expected sample labels',
);

assert.ok(
  getSampleById('kick')?.src === '/samples/kick.wav',
  'sample lookup should return a production-safe public asset path',
);

assert.equal(
  SAMPLE_TRIGGER_MS,
  160,
  'sample trigger state should clear quickly after firing',
);
