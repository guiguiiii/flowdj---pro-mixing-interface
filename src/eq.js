const clampKnob = (value) => (
  Math.min(Math.max(Number.isFinite(value) ? value : 50, 0), 100)
);

export const getEqGainDbFromKnobValue = (value, maxGainDb = 18) => {
  const normalized = (50 - clampKnob(value)) / 50;
  return Number((normalized * maxGainDb).toFixed(3));
};

export const createDeckEqGraph = ({ context, audio }) => {
  const source = context.createMediaElementSource(audio);
  const lowFilter = context.createBiquadFilter();
  const midFilter = context.createBiquadFilter();
  const highFilter = context.createBiquadFilter();
  const fxFilter = context.createBiquadFilter();
  const echoDelay = context.createDelay(1);
  const echoFeedback = context.createGain();
  const echoWetGain = context.createGain();
  const reverbDelay = context.createDelay(0.5);
  const reverbFeedback = context.createGain();
  const reverbWetGain = context.createGain();
  const outputGain = context.createGain();

  lowFilter.type = 'lowshelf';
  lowFilter.frequency.value = 220;

  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 0.9;

  highFilter.type = 'highshelf';
  highFilter.frequency.value = 4000;

  fxFilter.type = 'lowpass';
  fxFilter.frequency.value = 22000;
  fxFilter.Q.value = 0.0001;

  echoDelay.delayTime.value = 0.18;
  echoFeedback.gain.value = 0;
  echoWetGain.gain.value = 0;

  reverbDelay.delayTime.value = 0.06;
  reverbFeedback.gain.value = 0;
  reverbWetGain.gain.value = 0;

  outputGain.gain.value = 1;

  source.connect(lowFilter);
  lowFilter.connect(midFilter);
  midFilter.connect(highFilter);
  highFilter.connect(fxFilter);
  fxFilter.connect(outputGain);
  fxFilter.connect(echoDelay);
  echoDelay.connect(echoFeedback);
  echoFeedback.connect(echoDelay);
  echoDelay.connect(echoWetGain);
  echoWetGain.connect(outputGain);
  fxFilter.connect(reverbDelay);
  reverbDelay.connect(reverbFeedback);
  reverbFeedback.connect(reverbDelay);
  reverbDelay.connect(reverbWetGain);
  reverbWetGain.connect(outputGain);
  outputGain.connect(context.destination);

  return {
    source,
    lowFilter,
    midFilter,
    highFilter,
    fxFilter,
    echoDelay,
    echoFeedback,
    echoWetGain,
    reverbDelay,
    reverbFeedback,
    reverbWetGain,
    outputGain,
  };
};

export const applyDeckEqValues = ({ graph, mixer }) => {
  graph.highFilter.gain.value = getEqGainDbFromKnobValue(mixer.hi);
  graph.midFilter.gain.value = getEqGainDbFromKnobValue(mixer.mid);
  graph.lowFilter.gain.value = getEqGainDbFromKnobValue(mixer.low);
};
