import type { RecordingQuality } from '../audio/quality';

type Props = { quality: RecordingQuality | null };

export default function RecordingQualityCard({ quality }: Props) {
  return (
    <section className="result-card">
      <h2>録音品質</h2>
      <p>Peak level (dBFS): {quality ? quality.peakDbfs.toFixed(2) : 'N/A'}</p>
      <p>Clipping status: {quality ? (quality.clipping ? 'Detected' : 'Not detected') : 'N/A'}</p>
      <p>Noise estimate (dBFS): {quality ? quality.noiseEstimateDbfs.toFixed(2) : 'N/A'}</p>
      <p>Measurement confidence: {quality?.measurementConfidence ?? 'N/A'}</p>
      <p>Reason: {quality?.confidenceReason ?? 'N/A'}</p>
    </section>
  );
}
