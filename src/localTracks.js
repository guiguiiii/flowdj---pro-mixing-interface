import { formatClock } from './audio.js';

const AUDIO_FILE_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg']);

export const getFileSignature = (file) => (
  `${file.name}::${file.size}::${file.lastModified}`
);

export const isSupportedAudioFile = (file) => {
  if (!file) {
    return false;
  }

  if (typeof file.type === 'string' && file.type.startsWith('audio/')) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_FILE_EXTENSIONS.has(extension);
};

export const createTrackId = (file, index) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${index}-${file.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
};

export const getAudioDuration = (url) => new Promise((resolve) => {
  if (typeof Audio === 'undefined') {
    resolve(null);
    return;
  }

  const audio = new Audio();

  const cleanup = () => {
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    audio.removeEventListener('error', handleError);
    audio.src = '';
  };

  const handleLoadedMetadata = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : null;
    cleanup();
    resolve(duration);
  };

  const handleError = () => {
    cleanup();
    resolve(null);
  };

  audio.preload = 'metadata';
  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
  audio.addEventListener('error', handleError);
  audio.src = url;
});

export const createLocalTrack = async (file, index) => {
  const url = URL.createObjectURL(file);
  const durationSeconds = await getAudioDuration(url);
  const title = file.name.replace(/\.[^.]+$/, '');

  return {
    track: {
      id: createTrackId(file, index),
      title,
      artist: 'Local Import',
      bpm: null,
      key: '--',
      duration: durationSeconds == null ? '--:--' : formatClock(durationSeconds),
      src: url,
      artwork: `https://picsum.photos/seed/${encodeURIComponent(title)}/100/100`,
      fileName: file.name,
      url,
      source: 'local',
      createdAt: Date.now(),
      fileSignature: getFileSignature(file),
    },
    durationSeconds,
  };
};

export const mergeImportedTracks = (existingTracks, importedTracks) => {
  const existingSignatures = new Set(
    existingTracks
      .map((track) => track.fileSignature)
      .filter(Boolean),
  );

  const dedupedTracks = [];

  importedTracks.forEach((track) => {
    if (!track.fileSignature || existingSignatures.has(track.fileSignature)) {
      return;
    }

    existingSignatures.add(track.fileSignature);
    dedupedTracks.push(track);
  });

  return [...existingTracks, ...dedupedTracks];
};
