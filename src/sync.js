const roundRate = (value) => Number(value.toFixed(3));

export const SYNC_LONG_PRESS_MS = 500;

export const getSyncPressAction = ({
  durationMs,
  longPressThresholdMs = SYNC_LONG_PRESS_MS,
}) => (durationMs >= longPressThresholdMs ? 'restore' : 'sync');

export const getSyncedPlaybackRate = ({
  sourceBpm,
  targetBaseBpm,
}) => {
  if (
    !Number.isFinite(sourceBpm) ||
    sourceBpm <= 0 ||
    !Number.isFinite(targetBaseBpm) ||
    targetBaseBpm <= 0
  ) {
    return null;
  }

  return roundRate(sourceBpm / targetBaseBpm);
};
