const normalizeCueTime = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value);
};

export const HOT_CUE_COUNT = 4;
export const HOT_CUE_BANKS = ['cue1', 'cue2'];

export const createHotCuePads = (count = HOT_CUE_COUNT) => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  time: null,
  isSet: false,
}));

export const createHotCueBanks = () => ({
  cue1: createHotCuePads(),
  cue2: createHotCuePads(),
});

export const assignHotCuePad = ({ pads, index, currentTime }) => pads.map((pad, padIndex) => {
  if (padIndex !== index) {
    return pad;
  }

  return {
    ...pad,
    time: normalizeCueTime(currentTime),
    isSet: true,
  };
});

export const getHotCuePadAction = ({ pad, isSetMode }) => {
  if (isSetMode || !pad.isSet || pad.time === null) {
    return {
      type: 'assign',
    };
  }

  return {
    type: 'trigger',
    time: pad.time,
    shouldPlay: true,
  };
};
