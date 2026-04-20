const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getKnobValueFromHorizontalDrag = ({
  startValue,
  startX,
  currentX,
  sensitivity = 0.35,
}) => clamp(startValue + (currentX - startX) * sensitivity, 0, 100);
