import assert from 'node:assert/strict';

import {
  assignHotCuePad,
  createHotCueBanks,
  createHotCuePads,
  getHotCuePadAction,
  HOT_CUE_BANKS,
  HOT_CUE_COUNT,
} from './hotCue.js';

assert.equal(
  createHotCuePads().length,
  HOT_CUE_COUNT,
  'each deck should start with four hot cue pads',
);

assert.deepEqual(
  Object.keys(createHotCueBanks()),
  HOT_CUE_BANKS,
  'each deck should expose cue1 and cue2 hot cue banks',
);

assert.notEqual(
  createHotCueBanks().cue1,
  createHotCueBanks().cue2,
  'hot cue banks should be stored independently',
);

assert.deepEqual(
  assignHotCuePad({
    pads: createHotCuePads(),
    index: 1,
    currentTime: 42.75,
  })[1],
  {
    id: 2,
    time: 42.75,
    isSet: true,
  },
  'assigning a hot cue should store its playback time',
);

assert.deepEqual(
  getHotCuePadAction({
    pad: createHotCuePads()[0],
    isSetMode: false,
  }),
  {
    type: 'assign',
  },
  'pressing an unset hot cue should assign it',
);

assert.deepEqual(
  getHotCuePadAction({
    pad: {
      id: 1,
      time: 64.125,
      isSet: true,
    },
    isSetMode: false,
  }),
  {
    type: 'trigger',
    time: 64.125,
    shouldPlay: true,
  },
  'pressing a set hot cue should jump to its stored time and play',
);

assert.deepEqual(
  getHotCuePadAction({
    pad: {
      id: 3,
      time: 12,
      isSet: true,
    },
    isSetMode: true,
  }),
  {
    type: 'assign',
  },
  'arming Set mode should let the same pad be overwritten',
);
