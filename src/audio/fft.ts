import FFT from 'fft.js';

export type SpectrumPoint = {
  frequencyHz: number;
  magnitude: number;
  magnitudeDb: number;
};

export const FFT_SIZE = 32768;

const EPSILON = 1e-12;

export const applyHannWindow = (input: Float32Array): Float32Array => {
  const out = new Float32Array(input.length);
  const n = input.length;
  for (let i = 0; i < n; i += 1) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    out[i] = input[i] * w;
  }
  return out;
};

export const extractCenteredSegment = (input: Float32Array, targetLength: number): Float32Array => {
  if (input.length >= targetLength) {
    const start = Math.floor((input.length - targetLength) / 2);
    return input.slice(start, start + targetLength);
  }

  const padded = new Float32Array(targetLength);
  const start = Math.floor((targetLength - input.length) / 2);
  padded.set(input, start);
  return padded;
};

export const calculateSpectrum = (input: Float32Array, sampleRate: number): SpectrumPoint[] => {
  const fft = new FFT(input.length);
  const out = fft.createComplexArray();
  fft.realTransform(out, input);
  fft.completeSpectrum(out);

  const bins = input.length / 2;
  const spectrum: SpectrumPoint[] = [];

  for (let i = 0; i <= bins; i += 1) {
    const real = out[2 * i] ?? 0;
    const imag = out[2 * i + 1] ?? 0;
    const magnitude = Math.sqrt(real * real + imag * imag) / input.length;
    const magnitudeDb = 20 * Math.log10(magnitude + EPSILON);
    const frequencyHz = (i * sampleRate) / input.length;
    spectrum.push({ frequencyHz, magnitude, magnitudeDb });
  }

  return spectrum;
};

export const computeAverageSpectrum = (input: Float32Array, sampleRate: number): SpectrumPoint[] => {
  const centered = extractCenteredSegment(input, FFT_SIZE);
  const windowed = applyHannWindow(centered);
  return calculateSpectrum(windowed, sampleRate);
};
