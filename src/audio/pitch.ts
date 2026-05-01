import type { SpectrumPoint } from './fft';

export type FundamentalResult = {
  detectedF0Hz: number | null;
  targetFrequencyHz: number;
  pitchDeviationCent: number | null;
  analysisRangeLabel: string;
};

export const detectFundamentalFromSpectrum = (
  spectrum: SpectrumPoint[],
  minHz = 400,
  maxHz = 480,
  targetFrequencyHz = 440,
): FundamentalResult => {
  const candidates = spectrum.filter((p) => p.frequencyHz >= minHz && p.frequencyHz <= maxHz);
  if (candidates.length === 0) {
    return { detectedF0Hz: null, targetFrequencyHz, pitchDeviationCent: null, analysisRangeLabel: '1.0s - 4.0s' };
  }

  let maxPoint = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    if (candidates[i].magnitude > maxPoint.magnitude) maxPoint = candidates[i];
  }

  const detectedF0Hz = maxPoint.frequencyHz;
  const pitchDeviationCent = 1200 * Math.log2(detectedF0Hz / targetFrequencyHz);

  return { detectedF0Hz, targetFrequencyHz, pitchDeviationCent, analysisRangeLabel: '1.0s - 4.0s' };
};
