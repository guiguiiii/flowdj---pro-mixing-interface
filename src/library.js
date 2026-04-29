export const findTrackById = (tracks, id) => tracks.find((track) => track.id === id) ?? null;

export const updateTrackInLibrary = (tracks, id, updates) => (
  tracks.map((track) => (track.id === id ? { ...track, ...updates } : track))
);
