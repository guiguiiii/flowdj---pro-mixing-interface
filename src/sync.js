const roundRate = (value) => Number(value.toFixed(3));

export const getSyncedPlaybackRate = ({
  sourceIsPlaying,
  sourceBpm,
  targetBaseBpm,
}) => {
  if (!sourceIsPlaying) {
    return null;
  }

  if (!Number.isFinite(sourceBpm) || !Number.isFinite(targetBaseBpm) || targetBaseBpm <= 0) {
    return null;
  }

  return roundRate(sourceBpm / targetBaseBpm);
};
