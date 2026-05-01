import assert from 'node:assert/strict';

import {
  createDeckVolumeGroups,
  getLevelSliderValue,
  setLevelSliderValue,
  toggleLevelTarget,
} from './levelControl.js';

const initial = createDeckVolumeGroups(80);

assert.deepEqual(
  initial,
  { track: 80, cues: 80, pads: 80 },
  'each deck should start with identical stored values for track, cue, and pad groups',
);

assert.equal(
  toggleLevelTarget('master', 'cues'),
  'cues',
  'pressing Cue from default mode should select the cue group',
);

assert.equal(
  toggleLevelTarget('cues', 'cues'),
  'master',
  'pressing the active Cue button again should return to the default track group',
);

assert.equal(
  toggleLevelTarget('cues', 'pads'),
  'pads',
  'Cue and Pad modes should be mutually exclusive',
);

assert.equal(
  getLevelSliderValue({ groups: { track: 62, cues: 31, pads: 14 }, target: 'pads' }),
  14,
  'the level slider should reflect the active target group value',
);

assert.deepEqual(
  setLevelSliderValue({ groups: { track: 62, cues: 31, pads: 14 }, target: 'cues', nextValue: 55 }),
  { track: 62, cues: 55, pads: 14 },
  'moving the level slider should update only the active group value',
);
