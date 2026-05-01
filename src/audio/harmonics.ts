import type { SpectrumPoint } from './fft';

export type HarmonicConfidence = 'High' | 'Medium' | 'Low';

export type HarmonicResult = {
  order: number;
  expectedFrequencyHz: number;
  detectedPeakFrequencyHz: number | null;
  level: number | null;
  levelDb: number | null;
  relativeToH1: number | null;
  confidence: HarmonicConfidence;
};

const confidenceFromDb = (levelDb: number | null): HarmonicConfidence => {
  if (levelDb === null) return 'Low';
  if (levelDb > -45) return 'High';
  if (levelDb > -70) return 'Medium';
  return 'Low';
};

export const analyzeHarmonics = (spectrum: SpectrumPoint[], f0: number | null): HarmonicResult[] => {
  const results: HarmonicResult[] = [];
  if (!f0) {
    for (let n = 1; n <= 20; n += 1) {
      results.push({
        order: n,
        expectedFrequencyHz: n * 440,
        detectedPeakFrequencyHz: null,
        level: null,
        levelDb: null,
        relativeToH1: null,
        confidence: 'Low',
      });
    }
    return results;
  }

  for (let n = 1; n <= 20; n += 1) {
    const expectedFrequencyHz = n * f0;
    const tol = expectedFrequencyHz * 0.015;
    const minHz = expectedFrequencyHz - tol;
    const maxHz = expectedFrequencyHz + tol;
    const candidates = spectrum.filter((p) => p.frequencyHz >= minHz && p.frequencyHz <= maxHz);

    let peak: SpectrumPoint | null = null;
    for (let i = 0; i < candidates.length; i += 1) {
      if (!peak || candidates[i].magnitude > peak.magnitude) peak = candidates[i];
    }

    results.push({
      order: n,
      expectedFrequencyHz,
      detectedPeakFrequencyHz: peak?.frequencyHz ?? null,
      level: peak?.magnitude ?? null,
      levelDb: peak?.magnitudeDb ?? null,
      relativeToH1: null,
      confidence: confidenceFromDb(peak?.magnitudeDb ?? null),
    });
  }

  const h1 = results.find((r) => r.order === 1);
  const h1Level = h1?.level ?? null;
  if (h1Level && h1Level > 0) {
    results.forEach((r) => {
      r.relativeToH1 = r.level !== null ? (r.level / h1Level) * 100 : null;
      if (r.order === 1 && r.relativeToH1 !== null) r.relativeToH1 = 100;
    });
  }

  return results;
};
