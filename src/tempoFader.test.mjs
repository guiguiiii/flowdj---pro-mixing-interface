import assert from 'node:assert/strict';

import {
  clampTempoPercent,
  getPlaybackRateFromTempoPercent,
  getSliderValueFromTempoPercent,
  getTempoPercentFromPlaybackRate,
  getTempoPercentFromSliderValue,
} from './tempoFader.js';

assert.equal(clampTempoPercent(-12), -8, 'tempo floors at -8%');
assert.equal(clampTempoPercent(12), 8, 'tempo caps at +8%');
assert.equal(getPlaybackRateFromTempoPercent(-8), 0.92, '-8% maps to 0.92x');
assert.equal(getPlaybackRateFromTempoPercent(0), 1, '0% maps to 1x');
assert.equal(getPlaybackRateFromTempoPercent(8), 1.08, '+8% maps to 1.08x');
assert.equal(getTempoPercentFromPlaybackRate(1.08), 8, '1.08x maps back to +8%');
assert.equal(getSliderValueFromTempoPercent(-8), 0, '-8% sits at slider minimum');
assert.equal(getSliderValueFromTempoPercent(0), 50, '0% sits at slider center');
assert.equal(getSliderValueFromTempoPercent(8), 100, '+8% sits at slider maximum');
assert.equal(getTempoPercentFromSliderValue(50), 0, 'slider center maps to 0%');
assert.equal(getTempoPercentFromSliderValue(0), -8, 'slider minimum maps to -8%');
assert.equal(getTempoPercentFromSliderValue(100), 8, 'slider maximum maps to +8%');

console.log('tempoFader tests passed');
