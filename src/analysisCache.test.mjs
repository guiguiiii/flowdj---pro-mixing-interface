import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANALYSIS_STORAGE_KEY,
  buildTrackAnalysisEntry,
  hydrateTracksWithAnalysis,
  loadTrackAnalysisCache,
  saveTrackAnalysisCache,
} from './analysisCache.js';

const createStorage = () => {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
};

test('buildTrackAnalysisEntry copies analyzed waveform and metadata into a persistent entry', () => {
  assert.deepEqual(
    buildTrackAnalysisEntry(
      {
        id: 'track-1',
        bpm: 128,
        key: '6A',
      },
      {
        bpm: 126,
        key: '8A',
        duration: 92,
        peaks: [{ peak: 0.8, energy: 0.3, low: 0.7, mid: 0.25, high: 0.1 }],
      },
    ),
    {
      bpm: 126,
      key: '8A',
      duration: 92,
      peaks: [{ peak: 0.8, energy: 0.3, low: 0.7, mid: 0.25, high: 0.1 }],
    },
  );
});

test('saveTrackAnalysisCache persists entries under the shared storage key', () => {
  const storage = createStorage();

  saveTrackAnalysisCache(storage, {
    'track-1': {
      bpm: 128,
      key: '6A',
      duration: 92,
      peaks: [{ peak: 0.8, energy: 0.3, low: 0.7, mid: 0.25, high: 0.1 }],
    },
  });

  assert.equal(
    storage.getItem(ANALYSIS_STORAGE_KEY),
    JSON.stringify({
      'track-1': {
        bpm: 128,
        key: '6A',
        duration: 92,
        peaks: [{ peak: 0.8, energy: 0.3, low: 0.7, mid: 0.25, high: 0.1 }],
      },
    }),
  );
});

test('loadTrackAnalysisCache falls back safely for empty or invalid storage', () => {
  assert.deepEqual(loadTrackAnalysisCache(undefined), {});
  assert.deepEqual(loadTrackAnalysisCache({ getItem: () => '{bad json' }), {});
});

test('hydrateTracksWithAnalysis overlays cached bpm key and duration onto the track library', () => {
  const tracks = [
    {
      id: 'track-1',
      title: 'Track 1',
      artist: 'Artist',
      bpm: 120,
      key: '4A',
      duration: '00:00',
      src: '/audio/track-1.mp3',
    },
  ];

  assert.deepEqual(
    hydrateTracksWithAnalysis(tracks, {
      'track-1': {
        bpm: 128,
        key: '6A',
        duration: 92,
        peaks: [{ peak: 0.8, energy: 0.3, low: 0.7, mid: 0.25, high: 0.1 }],
      },
    }),
    [
      {
        id: 'track-1',
        title: 'Track 1',
        artist: 'Artist',
        bpm: 128,
        key: '6A',
        duration: '01:32',
        src: '/audio/track-1.mp3',
      },
    ],
  );
});

test('buildTrackAnalysisEntry keeps legacy peak payloads intact when band analysis is unavailable', () => {
  assert.deepEqual(
    buildTrackAnalysisEntry(
      {
        id: 'track-1',
        bpm: 128,
        key: '6A',
      },
      {
        duration: 92,
        peaks: [{ peak: 0.8, energy: 0.3 }],
      },
    ),
    {
      bpm: 128,
      key: '6A',
      duration: 92,
      peaks: [{ peak: 0.8, energy: 0.3 }],
    },
  );
});
