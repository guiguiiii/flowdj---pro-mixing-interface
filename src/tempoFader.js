const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampTempoPercent = (value) => Number(clamp(Number.isFinite(value) ? value : 0, -8, 8).toFixed(1));

export const getPlaybackRateFromTempoPercent = (tempoPercent) => (
  Number((1 + clampTempoPercent(tempoPercent) / 100).toFixed(3))
);

export const getTempoPercentFromPlaybackRate = (playbackRate) => (
  clampTempoPercent(((Number.isFinite(playbackRate) ? playbackRate : 1) - 1) * 100)
);

export const getSliderValueFromTempoPercent = (tempoPercent) => {
  const clampedTempo = clampTempoPercent(tempoPercent);
  return Number((((clampedTempo + 8) / 16) * 100).toFixed(3));
};

export const getTempoPercentFromSliderValue = (sliderValue) => {
  const clampedSlider = clamp(Number.isFinite(sliderValue) ? sliderValue : 50, 0, 100);
  return clampTempoPercent((clampedSlider / 100) * 16 - 8);
};
