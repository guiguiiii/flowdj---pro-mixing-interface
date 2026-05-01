export const createLibraryTrack = ({
  id,
  title,
  artist,
  bpm,
  key,
  src,
  duration = '00:00',
  artwork,
}) => ({
  id,
  title,
  artist,
  bpm,
  key,
  src,
  duration,
  artwork: artwork ?? `https://picsum.photos/seed/${id}/100/100`,
});

// Add future local songs here.
// Each entry only needs the core metadata plus the file you place in public/audio/.
export const TRACK_LIBRARY = [
  createLibraryTrack({
    id: 'balearic-slide',
    title: 'Balearic Slide',
    artist: 'Local Track',
    bpm: 130,
    key: '4A',
    src: '/audio/balearic-slide.mp3',
  }),
  createLibraryTrack({
    id: 'suitcase-jeremy-black',
    title: 'Suitcase',
    artist: 'Jeremy Black',
    bpm: 120,
    key: '5B',
    src: '/audio/suitcase-jeremy-black.mp3',
  }),
  createLibraryTrack({
    id: 'i-might-be-late',
    title: 'I Might Be Late',
    artist: 'Local Track',
    bpm: 120,
    key: '8A',
    src: '/audio/i-might-be-late.mp3',
  }),
  createLibraryTrack({
    id: 'our',
    title: 'OUR',
    artist: 'Local Track',
    bpm: 120,
    key: '8A',
    src: '/audio/our.mp3',
  }),
  createLibraryTrack({
    id: 'ill-see-you-there-tomorrow',
    title: "I'll See You There Tomorrow",
    artist: 'Local Track',
    bpm: 120,
    key: '8A',
    src: '/audio/ill-see-you-there-tomorrow.mp3',
  }),
];
