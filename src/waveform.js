export const DEFAULT_WAVEFORM_PEAK_COUNT = 4096;
export const TARGET_WAVEFORM_PEAKS_PER_SECOND = 64;
export const MAX_WAVEFORM_PEAK_COUNT = 24000;
export const EMPTY_WAVEFORM_PEAKS = Array.from({ length: DEFAULT_WAVEFORM_PEAK_COUNT }, () => ({ peak: 0, energy: 0, low: 0, mid: 0, high: 0 }));
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const CAMELOT_MINOR = {
  C: '5A',
  'C#': '12A',
  D: '7A',
  'D#': '2A',
  E: '9A',
  F: '4A',
  'F#': '11A',
  G: '6A',
  'G#': '1A',
  A: '8A',
  'A#': '3A',
  B: '10A',
};
const CAMELOT_MAJOR = {
  C: '8B',
  'C#': '3B',
  D: '10B',
  'D#': '5B',
  E: '12B',
  F: '7B',
  'F#': '2B',
  G: '9B',
  'G#': '4B',
  A: '11B',
  'A#': '6B',
  B: '1B',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const zeroPoint = () => ({ peak: 0, energy: 0, low: 0, mid: 0, high: 0 });
export const normalizeWaveformPoint = (point = {}) => ({
  peak: Number((point.peak ?? 0).toFixed(3)),
  energy: Number((point.energy ?? 0).toFixed(3)),
  low: Number((point.low ?? 0).toFixed(3)),
  mid: Number((point.mid ?? 0).toFixed(3)),
  high: Number((point.high ?? 0).toFixed(3)),
});
export const normalizeWaveformPeaks = (peaks, fallbackCount = DEFAULT_WAVEFORM_PEAK_COUNT) => {
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return Array.from({ length: fallbackCount }, () => zeroPoint());
  }

  return peaks.map((point) => normalizeWaveformPoint(point));
};
const roundPoint = (point) => normalizeWaveformPoint(point);
const getWaveformNeighborPoint = (peaks, index) => normalizeWaveformPoint(peaks[clamp(index, 0, peaks.length - 1)] ?? zeroPoint());

const buildBandEnvelopes = (samples) => {
  const lowWindow = 2048;
  const midWindow = 384;
  const lowEnvelope = new Float32Array(samples.length);
  const midEnvelope = new Float32Array(samples.length);
  const highEnvelope = new Float32Array(samples.length);
  let lowSum = 0;
  let midSum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const amplitude = Math.abs(samples[index]);
    lowSum += amplitude;
    midSum += amplitude;

    if (index >= lowWindow) {
      lowSum -= Math.abs(samples[index - lowWindow]);
    }

    if (index >= midWindow) {
      midSum -= Math.abs(samples[index - midWindow]);
    }

    const lowAverage = lowSum / Math.min(index + 1, lowWindow);
    const midAverage = midSum / Math.min(index + 1, midWindow);
    const lowBand = Math.min(lowAverage * 1.2, 1);
    const midBand = Math.min(Math.abs(midAverage - lowAverage) * 2.6, 1);
    const highBand = Math.min(Math.abs(amplitude - midAverage) * 3.8, 1);

    lowEnvelope[index] = lowBand;
    midEnvelope[index] = midBand;
    highEnvelope[index] = highBand;
  }

  return { lowEnvelope, midEnvelope, highEnvelope };
};

export const buildWaveformPeaks = (samples, peakCount = DEFAULT_WAVEFORM_PEAK_COUNT) => {
  if (!samples.length) {
    return Array.from({ length: peakCount }, () => zeroPoint());
  }

  const bucketSize = Math.max(Math.floor(samples.length / peakCount), 1);
  const peaks = [];
  const { lowEnvelope, midEnvelope, highEnvelope } = buildBandEnvelopes(samples);

  for (let index = 0; index < peakCount; index += 1) {
    const start = index * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);
    let peak = 0;
    let total = 0;
    let lowTotal = 0;
    let midTotal = 0;
    let highTotal = 0;
    let count = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const amplitude = Math.abs(samples[sampleIndex]);
      peak = Math.max(peak, amplitude);
      total += amplitude;
      lowTotal += lowEnvelope[sampleIndex];
      midTotal += midEnvelope[sampleIndex];
      highTotal += highEnvelope[sampleIndex];
      count += 1;
    }

    peaks.push(roundPoint({
      peak: Number(peak.toFixed(3)),
      energy: Number((count > 0 ? total / count : 0).toFixed(3)),
      low: Number((count > 0 ? lowTotal / count : 0).toFixed(3)),
      mid: Number((count > 0 ? midTotal / count : 0).toFixed(3)),
      high: Number((count > 0 ? highTotal / count : 0).toFixed(3)),
    }));
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

export const getWaveformBeatWindowSize = (
  peaksLength,
  duration,
  bpm,
  beatsVisible = 4,
  minWindow = 24,
  maxWindow = 144,
) => {
  if (!Number.isFinite(peaksLength) || peaksLength <= 0) {
    return minWindow;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return minWindow;
  }

  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const beatWindowSeconds = (60 / safeBpm) * beatsVisible;
  const windowSize = Math.round((peaksLength * beatWindowSeconds) / duration);

  return clamp(windowSize, minWindow, maxWindow);
};

export const resolveWaveformPeakCount = (
  duration,
  peaksPerSecond = TARGET_WAVEFORM_PEAKS_PER_SECOND,
  minPeakCount = DEFAULT_WAVEFORM_PEAK_COUNT,
  maxPeakCount = MAX_WAVEFORM_PEAK_COUNT,
) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return minPeakCount;
  }

  return clamp(Math.round(duration * peaksPerSecond), minPeakCount, maxPeakCount);
};

export const getWaveformWindowFrame = (peaks, progress, windowSize) => {
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return {
      peaks: Array.from({ length: windowSize }, () => zeroPoint()),
      offset: 0,
    };
  }

  const safeWindowSize = Math.max(Math.floor(windowSize), 1);
  const clampedProgress = clamp(progress, 0, 1);
  const centerIndex = clampedProgress * (peaks.length - 1);
  const baseCenterIndex = Math.floor(centerIndex);
  const offset = Number((centerIndex - baseCenterIndex).toFixed(4));
  const startIndex = baseCenterIndex - Math.floor(safeWindowSize / 2);

  return {
    peaks: Array.from({ length: safeWindowSize }, (_, index) => {
      const sampleIndex = startIndex + index;

      if (sampleIndex < 0 || sampleIndex > peaks.length - 1) {
        return zeroPoint();
      }

      return peaks[sampleIndex] ?? zeroPoint();
    }),
    offset,
  };
};

export const getPlaybackLineWaveformFrame = (peaks, progress, windowSize) => {
  const safeWindowSize = Math.max(Math.floor(windowSize), 1);
  const splitIndex = Math.floor(safeWindowSize / 2);

  if (!Array.isArray(peaks) || peaks.length === 0) {
    return {
      peaks: Array.from({ length: safeWindowSize }, () => zeroPoint()),
      offset: 0,
    };
  }

  const clampedProgress = clamp(progress, 0, 1);

  if (clampedProgress <= 0) {
    return {
      peaks: [
        ...Array.from({ length: splitIndex }, () => zeroPoint()),
        ...Array.from({ length: safeWindowSize - splitIndex }, (_, index) => peaks[index] ?? zeroPoint()),
      ],
      offset: 0,
    };
  }

  if (clampedProgress >= 1) {
    const visiblePastLength = splitIndex;
    const tailStart = Math.max(peaks.length - visiblePastLength, 0);

    return {
      peaks: [
        ...Array.from({ length: visiblePastLength }, (_, index) => peaks[tailStart + index] ?? zeroPoint()),
        ...Array.from({ length: safeWindowSize - splitIndex }, () => zeroPoint()),
      ],
      offset: 0,
    };
  }

  return getWaveformWindowFrame(peaks, clampedProgress, safeWindowSize);
};

export const getVerticalWaveformTranslateY = (splitIndex, rowStep, offset = 0) => (
  -((splitIndex + offset) * rowStep)
);

export const getSmoothedWaveformWindowFrame = (peaks, progress, windowSize) => ({
  peaks: getWaveformWindow(peaks, progress, windowSize),
  offset: 0,
});

export const getWaveformWindow = (peaks, progress, windowSize) => {
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return Array.from({ length: windowSize }, () => zeroPoint());
  }

  const safeWindowSize = Math.max(Math.floor(windowSize), 1);
  const clampedProgress = clamp(progress, 0, 1);
  const centerIndex = clampedProgress * (peaks.length - 1);
  const startIndex = centerIndex - safeWindowSize / 2;

  return Array.from({ length: safeWindowSize }, (_, offset) => {
    const sampleIndex = startIndex + offset;

    if (sampleIndex < 0 || sampleIndex > peaks.length - 1) {
      return zeroPoint();
    }

    const lowerIndex = Math.floor(sampleIndex);
    const upperIndex = Math.min(Math.ceil(sampleIndex), peaks.length - 1);
    const ratio = sampleIndex - lowerIndex;
    const lowerPoint = normalizeWaveformPoint(peaks[lowerIndex] ?? zeroPoint());
    const upperPoint = normalizeWaveformPoint(peaks[upperIndex] ?? lowerPoint);

    return roundPoint({
      peak: lowerPoint.peak + (upperPoint.peak - lowerPoint.peak) * ratio,
      energy: lowerPoint.energy + (upperPoint.energy - lowerPoint.energy) * ratio,
      low: lowerPoint.low + (upperPoint.low - lowerPoint.low) * ratio,
      mid: lowerPoint.mid + (upperPoint.mid - lowerPoint.mid) * ratio,
      high: lowerPoint.high + (upperPoint.high - lowerPoint.high) * ratio,
    });
  });
};

const downsampleEnvelope = (samples, blockSize = 1024) => {
  const envelope = [];

  for (let index = 0; index < samples.length; index += blockSize) {
    let total = 0;
    let count = 0;

    for (let sampleIndex = index; sampleIndex < Math.min(index + blockSize, samples.length); sampleIndex += 1) {
      total += Math.abs(samples[sampleIndex]);
      count += 1;
    }

    envelope.push(count > 0 ? total / count : 0);
  }

  return envelope;
};

export const estimateBpmFromSamples = (samples, sampleRate) => {
  const blockSize = 1024;
  const envelope = downsampleEnvelope(samples, blockSize);

  if (envelope.length < 8) {
    return 120;
  }

  const meanEnergy = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  const threshold = meanEnergy * 1.35;
  const peaks = [];

  for (let index = 1; index < envelope.length - 1; index += 1) {
    if (envelope[index] > threshold && envelope[index] >= envelope[index - 1] && envelope[index] >= envelope[index + 1]) {
      peaks.push(index);
    }
  }

  if (peaks.length < 2) {
    return 120;
  }

  const counts = new Map();

  for (let index = 0; index < peaks.length; index += 1) {
    for (let offset = 1; offset <= 8 && index + offset < peaks.length; offset += 1) {
      const interval = peaks[index + offset] - peaks[index];

      if (interval <= 0) {
        continue;
      }

      let bpm = (60 * sampleRate) / (interval * blockSize);

      while (bpm < 80) bpm *= 2;
      while (bpm > 175) bpm /= 2;

      const rounded = Math.round(bpm);
      counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
    }
  }

  const [bestBpm = 120] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [120, 0];
  return bestBpm;
};

const goertzel = (samples, sampleRate, targetFrequency) => {
  const normalizedFrequency = targetFrequency / sampleRate;
  const omega = 2 * Math.PI * normalizedFrequency;
  const coefficient = 2 * Math.cos(omega);
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;

  for (let index = 0; index < samples.length; index += 1) {
    q0 = coefficient * q1 - q2 + samples[index];
    q2 = q1;
    q1 = q0;
  }

  return q1 * q1 + q2 * q2 - coefficient * q1 * q2;
};

export const estimateKeyFromSamples = (samples, sampleRate) => {
  if (samples.length === 0) {
    return '8A';
  }

  const chunkSize = 4096;
  const hopSize = 16384;
  const chroma = Array.from({ length: 12 }, () => 0);
  const octaves = [2, 3, 4, 5, 6];

  for (let start = 0; start + chunkSize <= samples.length; start += hopSize) {
    const slice = samples.slice(start, start + chunkSize);

    NOTE_NAMES.forEach((_, noteIndex) => {
      let energy = 0;

      octaves.forEach((octave) => {
        const midi = 12 * (octave + 1) + noteIndex;
        const frequency = 440 * Math.pow(2, (midi - 69) / 12);
        energy += goertzel(slice, sampleRate, frequency);
      });

      chroma[noteIndex] += energy;
    });
  }

  let bestScore = -Infinity;
  let bestIndex = 9;
  let bestMode = 'minor';

  for (let tonic = 0; tonic < 12; tonic += 1) {
    const majorScore = MAJOR_PROFILE.reduce((sum, weight, index) => sum + weight * chroma[(tonic + index) % 12], 0);
    const minorScore = MINOR_PROFILE.reduce((sum, weight, index) => sum + weight * chroma[(tonic + index) % 12], 0);

    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestIndex = tonic;
      bestMode = 'major';
    }

    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestIndex = tonic;
      bestMode = 'minor';
    }
  }

  const noteName = NOTE_NAMES[bestIndex];
  return bestMode === 'major' ? CAMELOT_MAJOR[noteName] : CAMELOT_MINOR[noteName];
};

export const analyzeDecodedTrack = (samples, sampleRate, peakCount = DEFAULT_WAVEFORM_PEAK_COUNT) => ({
  duration: Number((samples.length / sampleRate).toFixed(3)),
  bpm: estimateBpmFromSamples(samples, sampleRate),
  key: estimateKeyFromSamples(samples, sampleRate),
  peaks: buildWaveformPeaks(samples, peakCount),
});

export const getDisplayedWaveformPeaks = (peaks, displayCount) => {
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return Array.from({ length: displayCount }, () => zeroPoint());
  }

  const safeDisplayCount = Math.max(Math.floor(displayCount), 1);
  const bucketSize = peaks.length / safeDisplayCount;

  return Array.from({ length: safeDisplayCount }, (_, bucketIndex) => {
    const start = Math.floor(bucketIndex * bucketSize);
    const end = Math.max(Math.floor((bucketIndex + 1) * bucketSize), start + 1);
    const slice = peaks.slice(start, Math.min(end, peaks.length));

    if (slice.length === 0) {
      return zeroPoint();
    }

    const peak = Math.max(...slice.map((point) => point.peak));
    const energy = slice.reduce((sum, point) => sum + point.energy, 0) / slice.length;
    const low = slice.reduce((sum, point) => sum + (point.low ?? 0), 0) / slice.length;
    const mid = slice.reduce((sum, point) => sum + (point.mid ?? 0), 0) / slice.length;
    const high = slice.reduce((sum, point) => sum + (point.high ?? 0), 0) / slice.length;

    return roundPoint({ peak, energy, low, mid, high });
  });
};

export const shapeWaveformForDisplay = (peaks) => {
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return [];
  }

  return peaks.map((rawPoint, index) => {
    const point = normalizeWaveformPoint(rawPoint);
    const previousPoint = getWaveformNeighborPoint(peaks, index - 1);
    const nextPoint = getWaveformNeighborPoint(peaks, index + 1);
    const localEnergy = (previousPoint.energy + point.energy + nextPoint.energy) / 3;
    const transient = clamp((point.peak - localEnergy) * 1.85, 0, 1);
    const edge = clamp(
      (
        Math.abs(nextPoint.peak - previousPoint.peak)
        + Math.abs(nextPoint.high - previousPoint.high)
        + Math.abs(nextPoint.low - previousPoint.low)
      ) * 0.85,
      0,
      1,
    );
    const body = Math.pow(point.energy, 1.35) * 0.22 + Math.pow(point.low, 1.25) * 0.09;

    return roundPoint({
      peak: clamp(body + transient * 0.92 + edge * 0.18, 0, 1),
      energy: clamp(body * 1.08 + transient * 0.28 + edge * 0.1, 0, 1),
      low: clamp(Math.pow(point.low, 1.35) * 0.34 + transient * 0.16, 0, 1),
      mid: clamp(Math.pow(point.mid, 1.08) * 0.76 + edge * 0.16 + transient * 0.1, 0, 1),
      high: clamp(Math.pow(point.high, 0.96) * 0.82 + edge * 0.24 + transient * 0.14, 0, 1),
    });
  });
};

export const getWaveformBandWidths = (point, maxHalfWidth) => {
  const normalizedPoint = normalizeWaveformPoint(point);
  const outerContour = clamp(
    Math.pow(normalizedPoint.peak, 1.55) * 0.86
      + Math.pow(normalizedPoint.energy, 1.8) * 0.2
      + Math.pow(normalizedPoint.low, 1.6) * 0.12,
    0,
    1,
  );
  const bodyContour = clamp(
    outerContour * 0.52
      + Math.pow(normalizedPoint.mid, 1.2) * 0.24
      + Math.pow(normalizedPoint.energy, 1.35) * 0.08,
    0,
    outerContour * 0.78,
  );
  const coreContour = clamp(
    bodyContour * 0.42
      + Math.pow(normalizedPoint.high, 1.1) * 0.085
      + Math.pow(normalizedPoint.mid, 1.5) * 0.03,
    0,
    bodyContour * 0.58,
  );
  const bassContour = clamp(
    outerContour * 0.14 + Math.pow(normalizedPoint.low, 1.25) * 0.08,
    0,
    bodyContour * 0.4,
  );

  return {
    outer: Number((outerContour * maxHalfWidth).toFixed(3)),
    bass: Number((bassContour * maxHalfWidth).toFixed(3)),
    mid: Number((bodyContour * maxHalfWidth).toFixed(3)),
    core: Number((coreContour * maxHalfWidth).toFixed(3)),
  };
};

export const analyzeTrackWaveform = async (src, peakCount) => {
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
    const merged = mergeBufferChannels(audioBuffer);
    const resolvedPeakCount = Number.isFinite(peakCount)
      ? peakCount
      : resolveWaveformPeakCount(audioBuffer.duration);
    const analysis = analyzeDecodedTrack(merged, audioBuffer.sampleRate, resolvedPeakCount);

    return {
      ...analysis,
      duration: audioBuffer.duration,
    };
  } finally {
    await audioContext.close();
  }
};
