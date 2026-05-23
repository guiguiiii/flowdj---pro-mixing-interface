const FALLBACK_BPM = 120;
const LOOP_WRAP_LEAD_SECONDS = 0.025;

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

export const getLoopPlaybackWrapTime = ({
  currentTime,
  loopStart,
  loopEnd,
  leadSeconds = LOOP_WRAP_LEAD_SECONDS,
}) => {
  if (
    !Number.isFinite(currentTime)
    || !Number.isFinite(loopStart)
    || !Number.isFinite(loopEnd)
    || loopEnd <= loopStart
  ) {
    return null;
  }

  const safeLeadSeconds = Number.isFinite(leadSeconds) && leadSeconds > 0 ? leadSeconds : 0;

  if (currentTime < loopEnd - safeLeadSeconds) {
    return null;
  }

  const overshoot = Math.max(currentTime - loopEnd, 0);

  return Number((loopStart + overshoot).toFixed(3));
};

const getBeatDurationSeconds = (bpm) => 60 / getSafeBpm(bpm);

const getCurrentBeatTime = ({ currentTime, bpm, beatOffset = 0 }) => {
  const beatDuration = getBeatDurationSeconds(bpm);
  const safeBeatOffset = Number.isFinite(beatOffset) && beatOffset >= 0
    ? beatOffset % beatDuration
    : 0;
  const beatIndex = Math.floor((currentTime - safeBeatOffset) / beatDuration);

  return safeBeatOffset + beatIndex * beatDuration;
};

export const toggleLoopState = ({
  state,
  loopId,
  currentTime,
  bpm,
  beatOffset,
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
  const quantizedStart = getCurrentBeatTime({ currentTime: safeCurrentTime, bpm, beatOffset });
  const loopStart = Math.min(Math.max(quantizedStart, 0), maxLoopStart);
  const loopEnd = Math.min(loopStart + loopDuration, safeDuration);

  return {
    activeLoop: loopId,
    loopBeats: beats,
    loopStart: Number(loopStart.toFixed(3)),
    loopEnd: Number(loopEnd.toFixed(3)),
  };
};
