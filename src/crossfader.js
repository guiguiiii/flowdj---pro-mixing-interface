const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getUsableTrackWidth = (trackWidth, handleWidth) => Math.max(trackWidth - handleWidth, 0);
const getUsableTrackHeight = (trackHeight, handleHeight) => Math.max(trackHeight - handleHeight, 0);

export const getCrossfaderHandleLeft = ({ value, trackWidth, handleWidth }) => {
  const usableTrackWidth = getUsableTrackWidth(trackWidth, handleWidth);
  return (clamp(value, 0, 100) / 100) * usableTrackWidth;
};

export const getCrossfaderValueFromPointer = ({
  pointerX,
  trackLeft,
  trackWidth,
  handleWidth,
}) => {
  const usableTrackWidth = getUsableTrackWidth(trackWidth, handleWidth);

  if (usableTrackWidth === 0) {
    return 0;
  }

  const handleLeft = clamp(pointerX - trackLeft - handleWidth / 2, 0, usableTrackWidth);
  return (handleLeft / usableTrackWidth) * 100;
};

export const getVerticalFaderHandleBottom = ({ value, trackHeight, handleHeight }) => {
  const usableTrackHeight = getUsableTrackHeight(trackHeight, handleHeight);
  return (clamp(value, 0, 100) / 100) * usableTrackHeight;
};

export const getVerticalFaderValueFromPointer = ({
  pointerY,
  trackTop,
  trackHeight,
  handleHeight,
}) => {
  const usableTrackHeight = getUsableTrackHeight(trackHeight, handleHeight);

  if (usableTrackHeight === 0) {
    return 0;
  }

  const handleBottom = clamp(trackHeight - (pointerY - trackTop) - handleHeight / 2, 0, usableTrackHeight);
  return (handleBottom / usableTrackHeight) * 100;
};
