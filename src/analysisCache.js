import { formatClock } from './audio.js';

export const ANALYSIS_STORAGE_KEY = 'flowdj.track-analysis.v2';

export const buildTrackAnalysisEntry = (track, analysis) => ({
  bpm: analysis.bpm ?? track.bpm,
  key: analysis.key ?? track.key,
  duration: analysis.duration,
  peaks: analysis.peaks,
});

export const loadTrackAnalysisCache = (storage) => {
  if (!storage?.getItem) {
    return {};
  }

  try {
    const rawValue = storage.getItem(ANALYSIS_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
};

export const saveTrackAnalysisCache = (storage, cache) => {
  if (!storage?.setItem) {
    return;
  }

  storage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(cache));
};

export const hydrateTracksWithAnalysis = (tracks, analysisCache) => (
  tracks.map((track) => {
    const analysis = analysisCache[track.id];

    if (!analysis) {
      return track;
    }

    return {
      ...track,
      bpm: analysis.bpm ?? track.bpm,
      key: analysis.key ?? track.key,
      duration: Number.isFinite(analysis.duration) ? formatClock(analysis.duration) : track.duration,
    };
  })
);
