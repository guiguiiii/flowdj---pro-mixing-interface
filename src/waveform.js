export const DEFAULT_WAVEFORM_PEAK_COUNT = 120;
export const EMPTY_WAVEFORM_PEAKS = Array.from({ length: DEFAULT_WAVEFORM_PEAK_COUNT }, () => 0);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const buildWaveformPeaks = (samples, peakCount = DEFAULT_WAVEFORM_PEAK_COUNT) => {
  if (!samples.length) {
    return Array.from({ length: peakCount }, () => 0);
  }

  const bucketSize = Math.max(Math.floor(samples.length / peakCount), 1);
  const peaks = [];

  for (let index = 0; index < peakCount; index += 1) {
    const start = index * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);
    let peak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(samples[sampleIndex]));
    }

    peaks.push(Number(peak.toFixed(3)));
  }

  return peaks;
};

const mergeBufferChannels = (audioBuffer) => {
  const merged = new Float32Array(audioBuffer.length);

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
      merged[sampleIndex] = Math.max(merged[sampleIndex], Math.abs(channelData[sampleIndex]));
    }
  }

  return merged;
};

export const getWaveformProgress = (currentTime, duration) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Number(clamp(currentTime / duration, 0, 1).toFixed(4));
};

export const analyzeTrackWaveform = async (src, peakCount = DEFAULT_WAVEFORM_PEAK_COUNT) => {
  const response = await fetch(src);

  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${src}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API is unavailable in this browser');
  }

  const audioContext = new AudioContextClass();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return {
      duration: audioBuffer.duration,
      peaks: buildWaveformPeaks(mergeBufferChannels(audioBuffer), peakCount),
    };
  } finally {
    await audioContext.close();
  }
};
