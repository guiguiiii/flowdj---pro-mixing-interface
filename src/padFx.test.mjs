import assert from 'node:assert/strict';

import { PAD_FX_BANKS, getPadFxById } from './padFx.js';

assert.deepEqual(
  PAD_FX_BANKS.fx1.map((pad) => `${pad.label} ${pad.value}`),
  ['ROLL 1/2', 'SWEEP 80', 'FLANGER 16', 'V.BRAKE 3/4'],
  'FX1 should expose the expected pad labels and values',
);

assert.deepEqual(
  PAD_FX_BANKS.fx2.map((pad) => `${pad.label} ${pad.value}`),
  ['ECHO 1/4', 'ECHO 1/2', 'REVERB 60', 'R.ECHO 1/2'],
  'FX2 should expose the expected pad labels and values',
);

assert.equal(
  getPadFxById('sweep-80')?.label,
  'SWEEP',
  'lookup should resolve FX pads by id',
);

assert.equal(
  getPadFxById('missing-pad'),
  null,
  'lookup should return null for unknown pad ids',
);
