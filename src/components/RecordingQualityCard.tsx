import type { RecordingQuality } from '../audio/quality';

type Props = { quality: RecordingQuality | null };

export default function RecordingQualityCard({ quality }: Props) {
  return (
    <section className="result-card">
      <h2>録音品質</h2>
      <p>ピークレベル (dBFS): {quality ? quality.peakDbfs.toFixed(2) : 'N/A'}</p>
      <p>クリッピング状態: {quality ? (quality.clipping ? '検出' : '未検出') : 'N/A'}</p>
      <p>ノイズ推定値 (dBFS): {quality ? quality.noiseEstimateDbfs.toFixed(2) : 'N/A'}</p>
      <p>測定信頼度: {quality?.measurementConfidence ?? 'N/A'}</p>
      <p>理由: {quality?.confidenceReason ?? 'N/A'}</p>
    </section>
  );
}
