export const SAMPLE_TRIGGER_MS = 160;
const toPublicSampleSrc = (filename) => `/samples/${filename}`;

export const SAMPLE_BANKS = {
  s1: [
    { id: 'kick', label: 'KICK', accent: '#FF9457', src: toPublicSampleSrc('kick.wav') },
    { id: 'snare', label: 'SNARE', accent: '#FF3B7F', src: toPublicSampleSrc('snare.wav') },
    { id: 'clap', label: 'CLAP', accent: '#2E8DFF', src: toPublicSampleSrc('clap.wav') },
    { id: 'vox', label: 'VOX', accent: '#7ED321', src: toPublicSampleSrc('vox.wav') },
  ],
  s2: [
    { id: 'hat', label: 'HAT', accent: '#FFD24A', src: toPublicSampleSrc('hat.wav') },
    { id: 'perc', label: 'PERC', accent: '#33D7FF', src: toPublicSampleSrc('perc.wav') },
    { id: 'ride', label: 'RIDE', accent: '#A86BFF', src: toPublicSampleSrc('ride.wav') },
    { id: 'bass', label: 'BASS', accent: '#47D61A', src: toPublicSampleSrc('bass.wav') },
  ],
};

export const getSampleById = (sampleId) => (
  [...SAMPLE_BANKS.s1, ...SAMPLE_BANKS.s2].find((sample) => sample.id === sampleId) ?? null
);
