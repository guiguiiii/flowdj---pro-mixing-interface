import assert from 'node:assert/strict';

import { PAD_FX_BANKS, applyPadFx, clearPadFx, getPadFxById } from './padFx.js';

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

const createParam = (value = 0) => ({
  value,
  setTargetAtTime(nextValue) {
    this.value = nextValue;
  },
});

const createGraph = () => ({
  lowFilter: {
    frequency: createParam(220),
    gain: createParam(0),
  },
  highFilter: {
    frequency: createParam(4000),
    gain: createParam(0),
  },
  midFilter: {
    gain: createParam(0),
  },
  fxFilter: {
    frequency: createParam(22000),
    Q: createParam(0.0001),
  },
  echoDelay: {
    delayTime: createParam(0.18),
  },
  echoFeedback: {
    gain: createParam(0),
  },
  echoWetGain: {
    gain: createParam(0),
  },
  reverbDelay: {
    delayTime: createParam(0.06),
  },
  reverbFeedback: {
    gain: createParam(0),
  },
  reverbWetGain: {
    gain: createParam(0),
  },
  outputGain: {
    gain: createParam(1),
  },
});

{
  const graph = createGraph();
  const audio = { playbackRate: 1 };

  applyPadFx({
    padId: 'echo-half',
    audio,
    graph,
    mixer: { hi: 50, mid: 50, low: 50 },
    playbackRate: 1,
  });

  assert.equal(graph.echoWetGain.gain.value > 0, true, 'echo pad should raise echo wet gain');
  assert.equal(graph.echoFeedback.gain.value > 0, true, 'echo pad should raise echo feedback');
}

{
  const graph = createGraph();
  const audio = { playbackRate: 1 };

  applyPadFx({
    padId: 'vbrake-three-quarter',
    audio,
    graph,
    mixer: { hi: 50, mid: 50, low: 50 },
    playbackRate: 1,
  });

  assert.equal(audio.playbackRate < 1, true, 'vinyl brake should slow playback rate while held');

  clearPadFx({
    effectState: { padId: 'vbrake-three-quarter', playbackRate: 1 },
    audio,
    graph,
    mixer: { hi: 50, mid: 50, low: 50 },
    playbackRate: 1,
  });

  assert.equal(audio.playbackRate, 1, 'clearing pad fx should restore playback rate');
  assert.equal(graph.echoWetGain.gain.value, 0, 'clearing pad fx should reset echo wet gain');
}
