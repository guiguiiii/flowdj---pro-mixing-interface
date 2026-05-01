const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setAudioParam = (param, nextValue, contextTime = 0, timeConstant = 0.03) => {
  if (!param) {
    return;
  }

  if (typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(nextValue, contextTime, timeConstant);
    return;
  }

  param.value = nextValue;
};

export const createFxKnobState = () => ({
  filter: 0,
  echo: 0,
  reverb: 0,
});

export const clampFxValue = (value) => clamp(Number.isFinite(value) ? value : 0, 0, 1);

export const knobValueToFxValue = (value) => Number((clamp(value, 0, 100) / 100).toFixed(3));

export const fxValueToKnobValue = (value) => Math.round(clampFxValue(value) * 100);

const getFilterFrequency = (value) => {
  const minFrequency = 380;
  const maxFrequency = 22000;
  const normalized = clampFxValue(value);
  return Number((maxFrequency * ((minFrequency / maxFrequency) ** normalized)).toFixed(3));
};

export const applyFxKnob = ({
  graph,
  effectType,
  value,
  contextTime = 0,
}) => {
  if (!graph) {
    return;
  }

  const nextValue = clampFxValue(value);

  switch (effectType) {
    case 'filter':
      setAudioParam(graph.fxFilter.frequency, getFilterFrequency(nextValue), contextTime);
      setAudioParam(graph.fxFilter.Q, 0.0001 + nextValue * 3.5, contextTime);
      break;
    case 'echo':
      setAudioParam(graph.echoDelay.delayTime, 0.12 + nextValue * 0.36, contextTime);
      setAudioParam(graph.echoFeedback.gain, nextValue * 0.55, contextTime);
      setAudioParam(graph.echoWetGain.gain, nextValue * 0.35, contextTime);
      break;
    case 'reverb':
      setAudioParam(graph.reverbDelay.delayTime, 0.04 + nextValue * 0.08, contextTime);
      setAudioParam(graph.reverbFeedback.gain, nextValue * 0.68, contextTime);
      setAudioParam(graph.reverbWetGain.gain, nextValue * 0.28, contextTime);
      break;
    default:
      break;
  }
};

export const applyDeckFxValues = ({
  graph,
  fx,
  contextTime = 0,
}) => {
  if (!graph || !fx) {
    return;
  }

  applyFxKnob({ graph, effectType: 'filter', value: fx.filter, contextTime });
  applyFxKnob({ graph, effectType: 'echo', value: fx.echo, contextTime });
  applyFxKnob({ graph, effectType: 'reverb', value: fx.reverb, contextTime });
};
