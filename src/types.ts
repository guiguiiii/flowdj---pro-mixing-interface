export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string;
  duration: string;
  src: string;
  artwork?: string;
  fileName?: string;
  url?: string;
  source?: 'built-in' | 'local';
  createdAt?: number;
  fileSignature?: string;
}
