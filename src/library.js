export const findTrackById = (tracks, id) => tracks.find((track) => track.id === id) ?? null;
