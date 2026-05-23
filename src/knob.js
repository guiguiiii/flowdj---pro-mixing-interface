const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getKnobRotationDegrees = (value, degreesPerStep = 2.4) => (50 - value) * degreesPerStep;

export const getKnobPointerAngleDegrees = ({
  centerX,
  centerY,
  pointerX,
  pointerY,
}) => Math.atan2(pointerY - centerY, pointerX - centerX) * (180 / Math.PI);

export const getShortestAngleDelta = (startAngle, currentAngle) => {
  const delta = currentAngle - startAngle;

  if (delta > 180) {
    return delta - 360;
  }

  if (delta < -180) {
    return delta + 360;
  }

  return delta;
};

export const getKnobValueFromHorizontalDrag = ({
  startValue,
  startX,
  currentX,
  sensitivity = 0.35,
}) => clamp(startValue - (currentX - startX) * sensitivity, 0, 100);

export const getKnobValueFromAngleDrag = ({
  startValue,
  startAngle,
  currentAngle,
  degreesPerStep = 2.4,
}) => {
  const delta = getShortestAngleDelta(startAngle, currentAngle);

  return clamp(startValue - delta / degreesPerStep, 0, 100);
};
