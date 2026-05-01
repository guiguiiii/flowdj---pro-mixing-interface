const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeDuration = (duration) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Number(duration);
};

export const getSeekTimeFromHorizontalPointer = ({
  pointerX,
  left,
  width,
  duration,
}) => {
  const safeDuration = normalizeDuration(duration);
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;

  if (safeDuration === 0 || safeWidth === 0) {
    return 0;
  }

  const normalizedProgress = clamp((pointerX - left) / safeWidth, 0, 1);
  return Number((normalizedProgress * safeDuration).toFixed(3));
};

export const getScrubbedTimeFromVerticalDrag = ({
  startTime,
  startY,
  currentY,
  duration,
  secondsPerPixel = 0.25,
}) => {
  const safeDuration = normalizeDuration(duration);

  if (safeDuration === 0) {
    return 0;
  }

  const safeStartTime = clamp(Number.isFinite(startTime) ? startTime : 0, 0, safeDuration);
  const safeDeltaY = (Number.isFinite(startY) ? startY : 0) - (Number.isFinite(currentY) ? currentY : 0);
  const safeSecondsPerPixel = Number.isFinite(secondsPerPixel) && secondsPerPixel > 0 ? secondsPerPixel : 0.25;
  const nextTime = safeStartTime + safeDeltaY * safeSecondsPerPixel;

  return Number(clamp(nextTime, 0, safeDuration).toFixed(3));
};
