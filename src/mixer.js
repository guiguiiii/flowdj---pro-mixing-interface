const clampPercent = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const roundGain = (value) => Number(value.toFixed(3));

export const getDeckMixGains = ({ crossfader, levelA, levelB }) => {
  const crossfadePosition = clampPercent(crossfader) / 100;
  const deckALevel = clampPercent(levelA) / 100;
  const deckBLevel = clampPercent(levelB) / 100;

  const crossfadeA = Math.cos(crossfadePosition * Math.PI * 0.5);
  const crossfadeB = Math.sin(crossfadePosition * Math.PI * 0.5);

  return {
    deckA: roundGain(deckALevel * crossfadeA),
    deckB: roundGain(deckBLevel * crossfadeB),
  };
};
