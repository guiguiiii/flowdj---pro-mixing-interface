export const SAMPLE_TRIGGER_MS = 160;

const toFsSrc = (absolutePath) => `/@fs${encodeURI(absolutePath)}`;

export const SAMPLE_BANKS = {
  s1: [
    { id: 'kick', label: 'KICK', accent: '#FF9457', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/kick.wav') },
    { id: 'snare', label: 'SNARE', accent: '#FF3B7F', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/snare.wav') },
    { id: 'clap', label: 'CLAP', accent: '#2E8DFF', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/clap.wav') },
    { id: 'vox', label: 'VOX', accent: '#7ED321', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/vox.wav') },
  ],
  s2: [
    { id: 'hat', label: 'HAT', accent: '#FFD24A', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/hat.wav') },
    { id: 'perc', label: 'PERC', accent: '#33D7FF', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/perc.wav') },
    { id: 'ride', label: 'RIDE', accent: '#A86BFF', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/ride.wav') },
    { id: 'bass', label: 'BASS', accent: '#47D61A', src: toFsSrc('/Users/shu/Desktop/🍓/5_總審/Sample/bass.wav') },
  ],
};

export const getSampleById = (sampleId) => (
  [...SAMPLE_BANKS.s1, ...SAMPLE_BANKS.s2].find((sample) => sample.id === sampleId) ?? null
);
