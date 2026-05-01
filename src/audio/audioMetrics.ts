export const sliceBySeconds = (
  samples: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number,
): Float32Array => {
  if (samples.length === 0 || sampleRate <= 0 || endSec <= startSec) {
    return new Float32Array(0);
  }

  const startIndex = Math.max(0, Math.floor(startSec * sampleRate));
  const endIndex = Math.min(samples.length, Math.ceil(endSec * sampleRate));

  if (endIndex <= startIndex) {
    return new Float32Array(0);
  }

  return samples.slice(startIndex, endIndex);
};
