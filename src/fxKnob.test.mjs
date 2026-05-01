import assert from 'node:assert/strict';

import {
  applyDeckFxValues,
  clampFxValue,
  fxValueToKnobValue,
  knobValueToFxValue,
} from './fxKnob.js';

assert.equal(clampFxValue(-0.2), 0, 'clamp floors values below 0');
assert.equal(clampFxValue(1.4), 1, 'clamp caps values above 1');
assert.equal(knobValueToFxValue(0), 0, 'knob minimum maps to dry fx state');
assert.equal(knobValueToFxValue(100), 1, 'knob maximum maps to full fx state');
assert.equal(fxValueToKnobValue(0.375), 38, 'fx value maps back to knob scale');

const graph = {
  fxFilter: {
    frequency: { value: 0 },
    Q: { value: 0 },
  },
  echoDelay: {
    delayTime: { value: 0 },
  },
  echoFeedback: {
    gain: { value: 0 },
  },
  echoWetGain: {
    gain: { value: 0 },
  },
  reverbDelay: {
    delayTime: { value: 0 },
  },
  reverbFeedback: {
    gain: { value: 0 },
  },
  reverbWetGain: {
    gain: { value: 0 },
  },
};

applyDeckFxValues({
  graph,
  fx: {
    filter: 0.5,
    echo: 0.25,
    reverb: 0.75,
  },
});

assert.ok(graph.fxFilter.frequency.value < 22000, 'filter value darkens the signal');
assert.ok(graph.echoWetGain.gain.value > 0, 'echo value raises wet gain');
assert.ok(graph.echoFeedback.gain.value > 0, 'echo value raises feedback');
assert.ok(graph.reverbWetGain.gain.value > 0, 'reverb value raises wet gain');
assert.ok(graph.reverbFeedback.gain.value > 0, 'reverb value raises feedback');

console.log('fxKnob tests passed');
