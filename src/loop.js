const FALLBACK_BPM = 120;

const getSafeBpm = (bpm) => (
  Number.isFinite(bpm) && bpm > 0 ? bpm : FALLBACK_BPM
);

export const createLoopState = () => ({
  activeLoop: null,
  loopBeats: null,
  loopStart: null,
  loopEnd: null,
});

export const getLoopDurationSeconds = ({ bpm, beats }) => (
  Number(((60 / getSafeBpm(bpm)) * beats).toFixed(3))
);

export const toggleLoopState = ({
  state,
  loopId,
  currentTime,
  bpm,
  duration,
}) => {
  if (state.activeLoop === loopId) {
    return createLoopState();
  }

  const beats = loopId === 'loop4' ? 4 : 8;
  const loopDuration = getLoopDurationSeconds({ bpm, beats });
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : currentTime + loopDuration;
  const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
  const maxLoopStart = Math.max(safeDuration - loopDuration, 0);
  const loopStart = Math.min(Math.max(safeCurrentTime, 0), maxLoopStart);
  const loopEnd = Math.min(loopStart + loopDuration, safeDuration);

  return {
    activeLoop: loopId,
    loopBeats: beats,
    loopStart: Number(loopStart.toFixed(3)),
    loopEnd: Number(loopEnd.toFixed(3)),
  };
};
