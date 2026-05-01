import assert from 'node:assert/strict';

import {
  createCueState,
  toggleCueSetMode,
  getCueButtonAction,
  applyCueAssignment,
} from './cue.js';

assert.deepEqual(
  toggleCueSetMode(createCueState()),
  {
    cuePoint: null,
    isCueSet: false,
    isSetMode: true,
  },
  'pressing Set should arm cue assignment for that deck',
);

assert.deepEqual(
  applyCueAssignment({
    state: toggleCueSetMode(createCueState()),
    currentTime: 37.25,
  }),
  {
    cuePoint: 37.25,
    isCueSet: true,
    isSetMode: false,
  },
  'pressing Cue while armed should store the current time and exit set mode',
);

assert.deepEqual(
  getCueButtonAction({
    state: createCueState(),
    currentTime: 12,
  }),
  {
    type: 'noop',
  },
  'pressing Cue with no stored point should do nothing',
);

assert.deepEqual(
  getCueButtonAction({
    state: {
      cuePoint: 24.5,
      isCueSet: true,
      isSetMode: false,
    },
    currentTime: 50,
  }),
  {
    type: 'recall',
    cuePoint: 24.5,
    shouldPause: true,
  },
  'pressing Cue outside set mode should recall the stored point and pause',
);

assert.deepEqual(
  applyCueAssignment({
    state: {
      cuePoint: 10,
      isCueSet: true,
      isSetMode: true,
    },
    currentTime: 64.125,
  }),
  {
    cuePoint: 64.125,
    isCueSet: true,
    isSetMode: false,
  },
  'assigning a new cue should replace the previous cue point',
);
