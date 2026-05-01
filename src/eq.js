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
  const outputGain = context.createGain();

  lowFilter.type = 'lowshelf';
  lowFilter.frequency.value = 220;

  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 0.9;

  highFilter.type = 'highshelf';
  highFilter.frequency.value = 4000;

  outputGain.gain.value = 1;

  source.connect(lowFilter);
  lowFilter.connect(midFilter);
  midFilter.connect(highFilter);
  highFilter.connect(outputGain);
  outputGain.connect(context.destination);

  return {
    source,
    lowFilter,
    midFilter,
    highFilter,
    outputGain,
  };
};

export const applyDeckEqValues = ({ graph, mixer }) => {
  graph.highFilter.gain.value = getEqGainDbFromKnobValue(mixer.hi);
  graph.midFilter.gain.value = getEqGainDbFromKnobValue(mixer.mid);
  graph.lowFilter.gain.value = getEqGainDbFromKnobValue(mixer.low);
};
