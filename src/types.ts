import React from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: string;
  artwork?: string;
}

export const MOCK_TRACKS: Track[] = [
  { id: '1', title: 'One Love', artist: 'David Guetta', bpm: 130, key: '4A', duration: '03:45', artwork: 'https://picsum.photos/seed/dj1/100/100' },
  { id: '2', title: 'Teenage Dream', artist: 'Katy Perry', bpm: 120, key: '5B', duration: '04:12', artwork: 'https://picsum.photos/seed/dj2/100/100' },
  { id: '3', title: '2Night', artist: 'Eric Prydz', bpm: 126, key: '5B', duration: '07:22', artwork: 'https://picsum.photos/seed/dj3/100/100' },
  { id: '4', title: 'Sax (Original Club Mix)', artist: 'Mark Knight', bpm: 127, key: '5A', duration: '06:30', artwork: 'https://picsum.photos/seed/dj4/100/100' },
  { id: '5', title: 'Thinking About You', artist: 'Calvin Harris', bpm: 128, key: '8A', duration: '03:50', artwork: 'https://picsum.photos/seed/dj5/100/100' },
  { id: '6', title: 'Underground', artist: 'Nick Curly', bpm: 124, key: '3A', duration: '05:45', artwork: 'https://picsum.photos/seed/dj6/100/100' },
  { id: '7', title: 'Witch Doktor', artist: 'Armand Van Helden', bpm: 128, key: '12A', duration: '06:10', artwork: 'https://picsum.photos/seed/dj7/100/100' },
];
