export interface AppSettings {
  recordingDurationSec: number;
  preRecordDelaySec: number;
  maxPreRecordDelaySec: number;
  analysisStartSec: number;
  analysisEndOffsetSec: number;
  f0MinHz: number;
  f0MaxHz: number;
  harmonicCount: number;
  harmonicSearchWidthPercent: number;
  spectrumMaxHzMode: 'auto' | 'manual';
  manualSpectrumMaxHz: number;
  referenceA4Hz: number;
  autoGainControlRequestedOff: boolean;
  noiseSuppressionRequestedOff: boolean;
  echoCancellationRequestedOff: boolean;
  harmonicEqMinGainDb: number;
  harmonicEqMaxGainDb: number;
  harmonicEqQ: number;
}
