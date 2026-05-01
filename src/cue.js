const normalizeCueTime = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value);
};

export const createCueState = () => ({
  cuePoint: null,
  isCueSet: false,
  isSetMode: false,
});

export const toggleCueSetMode = (state) => ({
  ...state,
  isSetMode: !state.isSetMode,
});

export const applyCueAssignment = ({ state, currentTime }) => ({
  cuePoint: normalizeCueTime(currentTime),
  isCueSet: true,
  isSetMode: false,
});

export const getCueButtonAction = ({ state }) => {
  if (state.isSetMode) {
    return {
      type: 'assign',
    };
  }

  if (!state.isCueSet || state.cuePoint === null) {
    return {
      type: 'noop',
    };
  }

  return {
    type: 'recall',
    cuePoint: state.cuePoint,
    shouldPause: true,
  };
};
