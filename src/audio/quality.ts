export type MeasurementConfidence = 'High' | 'Medium' | 'Low';

export type RecordingQuality = {
  peakDbfs: number;
  clipping: boolean;
  noiseEstimateDbfs: number;
  measurementConfidence: MeasurementConfidence;
  confidenceReason: string;
};

const EPS = 1e-12;

export const estimateRecordingQuality = (samples: Float32Array): RecordingQuality => {
  if (samples.length === 0) {
    return {
      peakDbfs: -120,
      clipping: false,
      noiseEstimateDbfs: -120,
      measurementConfidence: 'Low',
      confidenceReason: 'No signal in analysis segment',
    };
  }

  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  const peakDbfs = 20 * Math.log10(peak + EPS);
  const noiseEstimateDbfs = 20 * Math.log10(rms + EPS);
  const clipping = peak >= 0.99;

  let measurementConfidence: MeasurementConfidence = 'Medium';
  let confidenceReason = 'Usable level';
  if (clipping) {
    measurementConfidence = 'Low';
    confidenceReason = 'Clipping detected';
  } else if (peakDbfs > -12 && noiseEstimateDbfs > -30) {
    measurementConfidence = 'High';
    confidenceReason = 'Strong level with stable energy';
  } else if (peakDbfs < -35) {
    measurementConfidence = 'Low';
    confidenceReason = 'Signal too quiet';
  }

  return { peakDbfs, clipping, noiseEstimateDbfs, measurementConfidence, confidenceReason };
};
