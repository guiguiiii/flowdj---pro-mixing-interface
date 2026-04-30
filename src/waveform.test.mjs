import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeDecodedTrack,
  buildWaveformPeaks,
  getDisplayedWaveformPeaks,
  getPlaybackLineWaveformFrame,
  getVerticalWaveformTranslateY,
  getWaveformBandWidths,
  getWaveformBeatWindowSize,
  getWaveformProgress,
  getSmoothedWaveformWindowFrame,
  getWaveformWindow,
  getWaveformWindowFrame,
  shapeWaveformForDisplay,
} from './waveform.js';

test('buildWaveformPeaks downsamples a waveform into normalized peaks', () => {
  const samples = Float32Array.from([0, 0.5, -1, 0.25, 0.75, -0.5, 0.1, -0.2]);

  assert.deepEqual(buildWaveformPeaks(samples, 4), [
    { peak: 0.5, energy: 0.25, low: 0.15, mid: 0, high: 0.475 },
    { peak: 1, energy: 0.625, low: 0.563, mid: 0, high: 0.856 },
    { peak: 0.75, energy: 0.625, low: 0.6, mid: 0, high: 0.475 },
    { peak: 0.2, energy: 0.15, low: 0.513, mid: 0, high: 0.904 },
  ]);
});

test('buildWaveformPeaks returns fallback zeros when samples are empty', () => {
  assert.deepEqual(buildWaveformPeaks(Float32Array.from([]), 3), [
    { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
    { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
    { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
  ]);
});

test('getWaveformProgress clamps to the track duration', () => {
  assert.equal(getWaveformProgress(15, 60), 0.25);
  assert.equal(getWaveformProgress(120, 60), 1);
  assert.equal(getWaveformProgress(10, 0), 0);
});

test('getWaveformWindow returns a centered rolling slice around playback progress', () => {
  const peaks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => ({
    peak: value,
    energy: value / 2,
    low: value / 4,
    mid: value / 5,
    high: value / 6,
  }));

  assert.deepEqual(getWaveformWindow(peaks, 0.5, 4).map((item) => item.peak), [2.5, 3.5, 4.5, 5.5]);
  assert.deepEqual(getWaveformWindow(peaks, 0, 4).map((item) => item.peak), [0, 0, 0, 1]);
  assert.deepEqual(getWaveformWindow(peaks, 1, 4).map((item) => item.peak), [7, 8, 9, 0]);
});

test('getDisplayedWaveformPeaks compresses dense data into a visible display count', () => {
  const peaks = Array.from({ length: 10 }, (_, value) => ({
    peak: value / 10,
    energy: value / 20,
    low: value / 30,
    mid: value / 40,
    high: value / 50,
  }));

  assert.equal(getDisplayedWaveformPeaks(peaks, 5).length, 5);
  assert.deepEqual(getDisplayedWaveformPeaks(peaks, 5)[0], {
    peak: 0.1,
    energy: 0.025,
    low: 0.017,
    mid: 0.013,
    high: 0.01,
  });
  assert.deepEqual(getDisplayedWaveformPeaks(peaks, 5)[4], {
    peak: 0.9,
    energy: 0.425,
    low: 0.283,
    mid: 0.213,
    high: 0.17,
  });
});

test('shapeWaveformForDisplay prevents flat material from rendering as a full-width block', () => {
  const shaped = shapeWaveformForDisplay(
    Array.from({ length: 6 }, () => ({
      peak: 0.6,
      energy: 0.6,
      low: 0.72,
      mid: 0,
      high: 0,
    })),
  );

  assert.equal(shaped.length, 6);
  assert.equal(shaped.every((point) => point.peak < 0.35), true);
  assert.equal(shaped.every((point) => point.low < 0.45), true);
});

test('shapeWaveformForDisplay keeps transients visually stronger than their neighbors', () => {
  const shaped = shapeWaveformForDisplay([
    { peak: 0.18, energy: 0.14, low: 0.12, mid: 0.03, high: 0.02 },
    { peak: 0.22, energy: 0.18, low: 0.14, mid: 0.04, high: 0.03 },
    { peak: 0.92, energy: 0.55, low: 0.3, mid: 0.42, high: 0.48 },
    { peak: 0.2, energy: 0.16, low: 0.13, mid: 0.04, high: 0.03 },
    { peak: 0.18, energy: 0.14, low: 0.12, mid: 0.03, high: 0.02 },
  ]);

  assert.equal(shaped[2].peak > shaped[1].peak, true);
  assert.equal(shaped[2].high > shaped[1].high, true);
  assert.equal(shaped[2].mid > shaped[3].mid, true);
});

test('getWaveformBandWidths keeps flat sections narrow while preserving transient width', () => {
  const flatWidths = getWaveformBandWidths({
    peak: 0.18,
    energy: 0.1,
    low: 0.12,
    mid: 0.02,
    high: 0.01,
  }, 82);
  const transientWidths = getWaveformBandWidths({
    peak: 0.95,
    energy: 0.32,
    low: 0.18,
    mid: 0.3,
    high: 0.38,
  }, 82);

  assert.equal(flatWidths.outer < 6, true);
  assert.equal(flatWidths.bass < 5, true);
  assert.equal(transientWidths.outer > 55, true);
  assert.equal(transientWidths.core > flatWidths.core, true);
});

test('getWaveformBandWidths preserves a readable DJ layer hierarchy', () => {
  const quietWidths = getWaveformBandWidths({
    peak: 0.07,
    energy: 0.03,
    low: 0.02,
    mid: 0.015,
    high: 0.01,
  }, 82);
  const punchWidths = getWaveformBandWidths({
    peak: 0.98,
    energy: 0.38,
    low: 0.2,
    mid: 0.31,
    high: 0.46,
  }, 82);

  assert.equal(quietWidths.outer > quietWidths.mid, true);
  assert.equal(quietWidths.mid > quietWidths.core, true);
  assert.equal(quietWidths.core < 2.5, true);
  assert.equal(punchWidths.outer > punchWidths.mid, true);
  assert.equal(punchWidths.mid > punchWidths.core, true);
  assert.equal(punchWidths.core > quietWidths.core, true);
});

test('getWaveformBeatWindowSize supports an eight-beat default DJ zoom', () => {
  assert.equal(getWaveformBeatWindowSize(4096, 180, 130, 8), 84);
  assert.equal(getWaveformBeatWindowSize(4096, 180, 90, 8), 121);
  assert.equal(getWaveformBeatWindowSize(4096, 180, 170, 8), 64);
});

test('getWaveformWindowFrame returns stable window slices plus a smooth offset', () => {
  const peaks = [0, 1, 2, 3, 4, 5].map((value) => ({
    peak: value,
    energy: value / 2,
    low: value / 4,
    mid: value / 5,
    high: value / 6,
  }));

  assert.deepEqual(getWaveformWindowFrame(peaks, 0.5, 4), {
    peaks: [
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
      { peak: 1, energy: 0.5, low: 0.25, mid: 0.2, high: 0.16666666666666666 },
      { peak: 2, energy: 1, low: 0.5, mid: 0.4, high: 0.3333333333333333 },
      { peak: 3, energy: 1.5, low: 0.75, mid: 0.6, high: 0.5 },
    ],
    offset: 0.5,
  });
});

test('getPlaybackLineWaveformFrame keeps the song start below the playback line', () => {
  const peaks = [0, 1, 2, 3, 4, 5].map((value) => ({
    peak: value,
    energy: value / 2,
    low: value / 4,
    mid: value / 5,
    high: value / 6,
  }));

  assert.deepEqual(getPlaybackLineWaveformFrame(peaks, 0, 4), {
    peaks: [
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
      { peak: 1, energy: 0.5, low: 0.25, mid: 0.2, high: 0.16666666666666666 },
    ],
    offset: 0,
  });
});

test('getPlaybackLineWaveformFrame keeps the song end above the playback line', () => {
  const peaks = [0, 1, 2, 3, 4, 5].map((value) => ({
    peak: value,
    energy: value / 2,
    low: value / 4,
    mid: value / 5,
    high: value / 6,
  }));

  assert.deepEqual(getPlaybackLineWaveformFrame(peaks, 1, 4), {
    peaks: [
      { peak: 4, energy: 2, low: 1, mid: 0.8, high: 0.6666666666666666 },
      { peak: 5, energy: 2.5, low: 1.25, mid: 1, high: 0.8333333333333334 },
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
      { peak: 0, energy: 0, low: 0, mid: 0, high: 0 },
    ],
    offset: 0,
  });
});

test('getVerticalWaveformTranslateY anchors the playback line row to the center guide', () => {
  assert.equal(getVerticalWaveformTranslateY(42, 10, 0), -420);
  assert.equal(getVerticalWaveformTranslateY(42, 10, 0.5), -425);
});

test('getSmoothedWaveformWindowFrame returns interpolated peaks for continuous scrolling', () => {
  const peaks = [0, 1, 2, 3, 4, 5].map((value) => ({
    peak: value,
    energy: value / 2,
    low: value / 4,
    mid: value / 5,
    high: value / 6,
  }));

  assert.deepEqual(getSmoothedWaveformWindowFrame(peaks, 0.5, 4), {
    peaks: [
      { peak: 0.5, energy: 0.25, low: 0.125, mid: 0.1, high: 0.084 },
      { peak: 1.5, energy: 0.75, low: 0.375, mid: 0.3, high: 0.25 },
      { peak: 2.5, energy: 1.25, low: 0.625, mid: 0.5, high: 0.416 },
      { peak: 3.5, energy: 1.75, low: 0.875, mid: 0.7, high: 0.584 },
    ],
    offset: 0,
  });
});

test('analyzeDecodedTrack estimates waveform duration bpm and key from decoded samples', () => {
  const sampleRate = 44100;
  const durationSeconds = 8;
  const totalSamples = sampleRate * durationSeconds;
  const samples = new Float32Array(totalSamples);

  for (let beat = 0; beat < durationSeconds * 2; beat += 1) {
    const start = Math.floor((beat * 0.5) * sampleRate);
    for (let i = 0; i < 1200 && start + i < samples.length; i += 1) {
      const envelope = 1 - i / 1200;
      samples[start + i] += Math.sin((2 * Math.PI * 220 * i) / sampleRate) * 0.9 * envelope;
      samples[start + i] += Math.sin((2 * Math.PI * 261.63 * i) / sampleRate) * 0.45 * envelope;
      samples[start + i] += Math.sin((2 * Math.PI * 329.63 * i) / sampleRate) * 0.45 * envelope;
    }
  }

  const analysis = analyzeDecodedTrack(samples, sampleRate);

  assert.equal(analysis.duration, durationSeconds);
  assert.equal(analysis.bpm, 120);
  assert.equal(analysis.key, '8A');
  assert.equal(analysis.peaks.length > 0, true);
  assert.equal(typeof analysis.peaks[0].low, 'number');
  assert.equal(typeof analysis.peaks[0].mid, 'number');
  assert.equal(typeof analysis.peaks[0].high, 'number');
  assert.equal(
    analysis.peaks.every((point) => (
      point.low >= 0
      && point.mid >= 0
      && point.high >= 0
      && point.low <= 1
      && point.mid <= 1
      && point.high <= 1
    )),
    true,
  );
});
