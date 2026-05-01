import assert from 'node:assert/strict';

import { getEqGainDbFromKnobValue } from './eq.js';

assert.equal(
  getEqGainDbFromKnobValue(50),
  0,
  '50 should be the neutral EQ position',
);

assert.ok(
  getEqGainDbFromKnobValue(0) > 0,
  'values to the left of neutral should boost the band for DJ-style EQ',
);

assert.ok(
  getEqGainDbFromKnobValue(100) < 0,
  'values to the right of neutral should attenuate the band for DJ-style EQ',
);

assert.equal(
  getEqGainDbFromKnobValue(-20),
  getEqGainDbFromKnobValue(0),
  'mapping should clamp low out-of-range values',
);

assert.equal(
  getEqGainDbFromKnobValue(120),
  getEqGainDbFromKnobValue(100),
  'mapping should clamp high out-of-range values',
);
