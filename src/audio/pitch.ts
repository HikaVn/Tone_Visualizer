export type FundamentalResult = {
  detectedF0Hz: number | null;
  estimatedNote: string | null;
  pitchDeviationCent: number | null;
  analysisRangeLabel: string;
  referenceA4Hz: number;
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const detectFundamentalAutocorrelation = (
  samples: Float32Array,
  sampleRate: number,
  minHz = 150,
  maxHz = 1000,
  referenceA4Hz = 440,
): FundamentalResult => {
  if (samples.length < 2 || sampleRate <= 0) {
    return { detectedF0Hz: null, estimatedNote: null, pitchDeviationCent: null, analysisRangeLabel: '1.0s - 4.0s', referenceA4Hz };
  }

  const minLag = Math.max(1, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(samples.length - 1, Math.floor(sampleRate / minHz));

  let bestLag = -1;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    for (let i = 0; i < samples.length - lag; i += 1) {
      corr += samples[i] * samples[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorr <= 0) {
    return { detectedF0Hz: null, estimatedNote: null, pitchDeviationCent: null, analysisRangeLabel: '1.0s - 4.0s', referenceA4Hz };
  }

  const detectedF0Hz = sampleRate / bestLag;
  const midiNote = 69 + 12 * Math.log2(detectedF0Hz / referenceA4Hz);
  const midi = Math.round(midiNote);
  const pitchDeviationCent = (midiNote - midi) * 100;
  const estimatedNote = `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

  return { detectedF0Hz, estimatedNote, pitchDeviationCent, analysisRangeLabel: '1.0s - 4.0s', referenceA4Hz };
};
