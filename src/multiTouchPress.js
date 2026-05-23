export const TOUCH_CLICK_SUPPRESSION_MS = 700;

export const shouldRunActionOnPointerDown = ({ pointerType }) => (
  pointerType === 'touch' || pointerType === 'pen'
);

export const shouldSuppressClick = ({ now, suppressUntil }) => now < suppressUntil;
