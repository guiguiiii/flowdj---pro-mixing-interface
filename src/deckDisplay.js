export const getDeckOrbitDot = ({ radius, angleInDegrees, center = 50 }) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: Number((center + radius * Math.cos(angleInRadians)).toFixed(1)),
    y: Number((center + radius * Math.sin(angleInRadians)).toFixed(1)),
  };
};
