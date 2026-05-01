import { applyDeckEqValues } from './eq.js';

export const PAD_FX_BANKS = {
  fx1: [
    { id: 'roll-half', label: 'ROLL', value: '1/2', accent: '#33D7FF' },
    { id: 'sweep-80', label: 'SWEEP', value: '80', accent: '#31D8D0' },
    { id: 'flanger-16', label: 'FLANGER', value: '16', accent: '#23D2C3' },
    { id: 'vbrake-three-quarter', label: 'V.BRAKE', value: '3/4', accent: '#2E5EFF' },
  ],
  fx2: [
    { id: 'echo-quarter', label: 'ECHO', value: '1/4', accent: '#41B5FF' },
    { id: 'echo-half', label: 'ECHO', value: '1/2', accent: '#3AA8FF' },
    { id: 'reverb-60', label: 'REVERB', value: '60', accent: '#47D61A' },
    { id: 'r-echo-half', label: 'R.ECHO', value: '1/2', accent: '#3852FF' },
  ],
};

const ALL_PADS = [...PAD_FX_BANKS.fx1, ...PAD_FX_BANKS.fx2];

export const getPadFxById = (padId) => ALL_PADS.find((pad) => pad.id === padId) ?? null;

export const applyPadFx = ({
  padId,
  audio,
  graph,
  mixer,
  playbackRate,
  contextTime = 0,
}) => {
  const effectState = {
    padId,
    playbackRate,
  };

  if (!audio) {
    return effectState;
  }

  switch (padId) {
    case 'sweep-80':
      if (graph) {
        graph.lowFilter.frequency.setTargetAtTime(600, contextTime, 0.03);
        graph.highFilter.frequency.setTargetAtTime(1800, contextTime, 0.03);
        graph.lowFilter.gain.setTargetAtTime(-16, contextTime, 0.03);
        graph.highFilter.gain.setTargetAtTime(-10, contextTime, 0.03);
      }
      break;
    case 'echo-quarter':
      if (graph) {
        graph.outputGain.gain.setTargetAtTime(0.82, contextTime, 0.03);
      }
      break;
    case 'echo-half':
      if (graph) {
        graph.outputGain.gain.setTargetAtTime(0.72, contextTime, 0.03);
      }
      break;
    case 'vbrake-three-quarter':
      audio.playbackRate = Math.max(playbackRate * 0.35, 0.2);
      break;
    default:
      break;
  }

  if (graph && mixer && !['sweep-80', 'echo-quarter', 'echo-half'].includes(padId)) {
    applyDeckEqValues({ graph, mixer });
  }

  return effectState;
};

export const clearPadFx = ({
  effectState,
  audio,
  graph,
  mixer,
  playbackRate,
  contextTime = 0,
}) => {
  if (audio) {
    audio.playbackRate = playbackRate;
  }

  if (!graph) {
    return;
  }

  graph.lowFilter.frequency.setTargetAtTime(220, contextTime, 0.03);
  graph.highFilter.frequency.setTargetAtTime(4000, contextTime, 0.03);
  graph.outputGain.gain.setTargetAtTime(1, contextTime, 0.03);

  if (mixer) {
    applyDeckEqValues({ graph, mixer });
  }
};
