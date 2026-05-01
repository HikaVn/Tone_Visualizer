import type { FundamentalResult } from '../audio/pitch';
import type { HarmonicResult } from '../audio/harmonics';
import type { RecordingQuality } from '../audio/quality';
import type { AppSettings } from './settings';

export interface AnalysisResult {
  spectrumMaxHz: number;
  fundamental: FundamentalResult | null;
  harmonics: HarmonicResult[];
  quality: RecordingQuality | null;
}

export interface SavedTake {
  id: string;
  name: string;
  createdAt: string;
  detectedF0Hz: number | null;
  estimatedNoteName?: string | null;
  noteCentDeviation?: number | null;
  referenceA4Hz: number;
  durationSec: number;
  sampleRate: number;
  audioBlob: Blob;
  audioMimeType: string;
  analysisResult: AnalysisResult;
  settingsSnapshot: Pick<AppSettings, 'referenceA4Hz' | 'recordingDurationSec' | 'analysisStartSec' | 'analysisEndOffsetSec' | 'f0MinHz' | 'f0MaxHz' | 'harmonicCount' | 'harmonicSearchWidthPercent'>;
}
