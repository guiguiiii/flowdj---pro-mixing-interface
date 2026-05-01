export const createDeckVolumeGroups = (defaultValue = 80) => ({
  track: defaultValue,
  cues: defaultValue,
  pads: defaultValue,
});

export const toggleLevelTarget = (currentTarget, nextTarget) => (
  currentTarget === nextTarget ? 'master' : nextTarget
);

export const getLevelSliderValue = ({ groups, target }) => (
  groups[target === 'master' ? 'track' : target]
);

export const setLevelSliderValue = ({ groups, target, nextValue }) => ({
  ...groups,
  [target === 'master' ? 'track' : target]: nextValue,
});
