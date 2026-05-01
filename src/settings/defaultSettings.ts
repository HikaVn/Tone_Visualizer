import type { AppSettings } from '../types/settings';

export const defaultSettings: AppSettings = {
  recordingDurationSec: 5,
  preRecordDelaySec: 3,
  maxPreRecordDelaySec: 10,
  analysisStartSec: 1,
  analysisEndOffsetSec: 1,
  f0MinHz: 150,
  f0MaxHz: 1000,
  harmonicCount: 20,
  harmonicSearchWidthPercent: 1.5,
  spectrumMaxHzMode: 'auto',
  manualSpectrumMaxHz: 10000,
  referenceA4Hz: 440,
  autoGainControlRequestedOff: true,
  noiseSuppressionRequestedOff: true,
  echoCancellationRequestedOff: true,
  harmonicEqMinGainDb: -12,
  harmonicEqMaxGainDb: 12,
  harmonicEqQ: 8,
};
