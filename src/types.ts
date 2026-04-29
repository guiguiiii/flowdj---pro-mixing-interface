import React from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: string;
  src: string;
  artwork?: string;
}

export const MOCK_TRACKS: Track[] = [
  { id: '1', title: 'Balearic Slide', artist: 'Local Track', bpm: 130, key: '4A', duration: '00:00', src: '/audio/balearic-slide.mp3', artwork: 'https://picsum.photos/seed/dj1/100/100' },
  { id: '2', title: 'Suitcase', artist: 'Jeremy Black', bpm: 120, key: '5B', duration: '00:00', src: '/audio/suitcase-jeremy-black.mp3', artwork: 'https://picsum.photos/seed/dj2/100/100' },
];
