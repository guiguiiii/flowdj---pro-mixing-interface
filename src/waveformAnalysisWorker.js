import { analyzeDecodedTrack } from './waveform.js';

self.onmessage = (event) => {
  if (event.data?.type !== 'analyze-samples') {
    return;
  }

  try {
    const samples = new Float32Array(event.data.samples);
    const analysis = analyzeDecodedTrack(
      samples,
      event.data.sampleRate,
      event.data.peakCount,
      event.data.options,
    );

    self.postMessage({
      type: 'analysis-complete',
      analysis,
    });
  } catch (error) {
    self.postMessage({
      type: 'analysis-error',
      message: error instanceof Error ? error.message : 'Waveform analysis failed',
    });
  }
};
