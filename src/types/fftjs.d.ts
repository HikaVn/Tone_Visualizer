declare module 'fft.js' {
  export default class FFT {
    constructor(size: number);
    createComplexArray(): Float64Array;
    realTransform(out: Float64Array, data: Float32Array | Float64Array): void;
    completeSpectrum(spectrum: Float64Array): void;
  }
}
