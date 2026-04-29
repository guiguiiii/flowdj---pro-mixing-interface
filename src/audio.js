const normalizeSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }

  return Math.floor(seconds);
};

export const formatClock = (seconds) => {
  const totalSeconds = normalizeSeconds(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const formatRemainingTime = (currentTime, duration) => {
  const safeDuration = normalizeSeconds(duration);
  const safeCurrentTime = normalizeSeconds(currentTime);

  return `-${formatClock(Math.max(safeDuration - safeCurrentTime, 0))}`;
};
