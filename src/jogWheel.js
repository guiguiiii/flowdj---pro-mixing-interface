const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const TWO_PI = Math.PI * 2;

export const clampJogTime = (time, duration) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Number(clamp(Number.isFinite(time) ? time : 0, 0, duration).toFixed(3));
};

export const getJogScrubTimeFromHorizontalDrag = ({
  startTime,
  startX,
  currentX,
  duration,
  secondsPerPixel = 0.02,
}) => {
  const nextTime = (Number.isFinite(startTime) ? startTime : 0)
    + ((Number.isFinite(currentX) ? currentX : startX) - startX) * secondsPerPixel;

  return clampJogTime(nextTime, duration);
};

export const normalizeAngleDegrees = (angle) => {
  const normalized = ((Number.isFinite(angle) ? angle : 0) % 360 + 360) % 360;
  return Number(normalized.toFixed(3));
};

export const getPointerAngleDegrees = ({
  centerX,
  centerY,
  pointerX,
  pointerY,
}) => {
  const radians = Math.atan2(pointerY - centerY, pointerX - centerX);
  const normalized = radians >= 0 ? radians : radians + TWO_PI;
  return normalizeAngleDegrees((normalized * 180) / Math.PI);
};

export const getShortestAngleDelta = (previousAngle, nextAngle) => {
  let delta = normalizeAngleDegrees(nextAngle) - normalizeAngleDegrees(previousAngle);

  if (delta > 180) {
    delta -= 360;
  }

  if (delta < -180) {
    delta += 360;
  }

  return Number(delta.toFixed(3));
};
