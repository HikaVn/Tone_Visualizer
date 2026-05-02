import type { HarmonicEqBand } from '../types/harmonicEq';

export function createDefaultHarmonicEqBands(detectedF0Hz: number, harmonicCount: number, q: number): HarmonicEqBand[] {
  return Array.from({ length: harmonicCount }, (_, i) => ({ order: i + 1, frequencyHz: detectedF0Hz * (i + 1), gainDb: 0, q }));
}
export function updateBandGain(bands: HarmonicEqBand[], order: number, gainDb: number): HarmonicEqBand[] {
  return bands.map((b) => (b.order === order ? { ...b, gainDb } : b));
}
