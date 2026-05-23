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

const setAudioParam = (param, value, contextTime = 0, timeConstant = 0.03) => {
  if (!param) {
    return;
  }

  if (typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(value, contextTime, timeConstant);
    return;
  }

  param.value = value;
};

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
    case 'roll-half':
      audio.playbackRate = playbackRate * 1.5;
      if (graph) {
        setAudioParam(graph.outputGain.gain, 0.76, contextTime, 0.015);
        setAudioParam(graph.echoDelay.delayTime, 0.12, contextTime, 0.015);
        setAudioParam(graph.echoFeedback.gain, 0.28, contextTime, 0.015);
        setAudioParam(graph.echoWetGain.gain, 0.22, contextTime, 0.015);
      }
      break;
    case 'sweep-80':
      if (graph) {
        setAudioParam(graph.lowFilter.frequency, 600, contextTime);
        setAudioParam(graph.highFilter.frequency, 1800, contextTime);
        setAudioParam(graph.lowFilter.gain, -16, contextTime);
        setAudioParam(graph.highFilter.gain, -10, contextTime);
        setAudioParam(graph.fxFilter.frequency, 2400, contextTime);
        setAudioParam(graph.fxFilter.Q, 2.2, contextTime);
      }
      break;
    case 'flanger-16':
      if (graph) {
        setAudioParam(graph.fxFilter.frequency, 1200, contextTime, 0.02);
        setAudioParam(graph.fxFilter.Q, 6.5, contextTime, 0.02);
        setAudioParam(graph.echoDelay.delayTime, 0.016, contextTime, 0.02);
        setAudioParam(graph.echoFeedback.gain, 0.42, contextTime, 0.02);
        setAudioParam(graph.echoWetGain.gain, 0.28, contextTime, 0.02);
      }
      break;
    case 'vbrake-three-quarter':
      audio.playbackRate = Math.max(playbackRate * 0.35, 0.2);
      if (graph) {
        setAudioParam(graph.fxFilter.frequency, 1200, contextTime, 0.03);
        setAudioParam(graph.outputGain.gain, 0.88, contextTime, 0.03);
      }
      break;
    case 'echo-quarter':
      if (graph) {
        setAudioParam(graph.echoDelay.delayTime, 0.24, contextTime);
        setAudioParam(graph.echoFeedback.gain, 0.48, contextTime);
        setAudioParam(graph.echoWetGain.gain, 0.38, contextTime);
        setAudioParam(graph.outputGain.gain, 0.9, contextTime);
      }
      break;
    case 'echo-half':
      if (graph) {
        setAudioParam(graph.echoDelay.delayTime, 0.42, contextTime);
        setAudioParam(graph.echoFeedback.gain, 0.56, contextTime);
        setAudioParam(graph.echoWetGain.gain, 0.45, contextTime);
        setAudioParam(graph.outputGain.gain, 0.84, contextTime);
      }
      break;
    case 'reverb-60':
      if (graph) {
        setAudioParam(graph.reverbDelay.delayTime, 0.095, contextTime);
        setAudioParam(graph.reverbFeedback.gain, 0.62, contextTime);
        setAudioParam(graph.reverbWetGain.gain, 0.42, contextTime);
        setAudioParam(graph.outputGain.gain, 0.92, contextTime);
      }
      break;
    case 'r-echo-half':
      audio.playbackRate = Math.max(playbackRate * 0.7, 0.35);
      if (graph) {
        setAudioParam(graph.echoDelay.delayTime, 0.42, contextTime);
        setAudioParam(graph.echoFeedback.gain, 0.62, contextTime);
        setAudioParam(graph.echoWetGain.gain, 0.48, contextTime);
        setAudioParam(graph.reverbWetGain.gain, 0.22, contextTime);
      }
      break;
    default:
      break;
  }

  if (graph && mixer && !['sweep-80'].includes(padId)) {
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

  setAudioParam(graph.lowFilter.frequency, 220, contextTime);
  setAudioParam(graph.highFilter.frequency, 4000, contextTime);
  setAudioParam(graph.fxFilter.frequency, 22000, contextTime);
  setAudioParam(graph.fxFilter.Q, 0.0001, contextTime);
  setAudioParam(graph.echoFeedback.gain, 0, contextTime);
  setAudioParam(graph.echoWetGain.gain, 0, contextTime);
  setAudioParam(graph.reverbFeedback.gain, 0, contextTime);
  setAudioParam(graph.reverbWetGain.gain, 0, contextTime);
  setAudioParam(graph.outputGain.gain, 1, contextTime);

  if (mixer) {
    applyDeckEqValues({ graph, mixer });
  }
};
