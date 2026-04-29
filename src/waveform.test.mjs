import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWaveformPeaks, getWaveformProgress } from './waveform.js';

test('buildWaveformPeaks downsamples a waveform into normalized peaks', () => {
  const samples = Float32Array.from([0, 0.5, -1, 0.25, 0.75, -0.5, 0.1, -0.2]);

  assert.deepEqual(buildWaveformPeaks(samples, 4), [0.5, 1, 0.75, 0.2]);
});

test('buildWaveformPeaks returns fallback zeros when samples are empty', () => {
  assert.deepEqual(buildWaveformPeaks(Float32Array.from([]), 3), [0, 0, 0]);
});

test('getWaveformProgress clamps to the track duration', () => {
  assert.equal(getWaveformProgress(15, 60), 0.25);
  assert.equal(getWaveformProgress(120, 60), 1);
  assert.equal(getWaveformProgress(10, 0), 0);
});
