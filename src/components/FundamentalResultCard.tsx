import type { FundamentalResult } from '../audio/pitch';

type Props = { result: FundamentalResult | null };

export default function FundamentalResultCard({ result }: Props) {
  return (
    <section className="result-card">
      <h2>基音推定</h2>
      <p>検出基音 f0: {result?.detectedF0Hz ? `${result.detectedF0Hz.toFixed(2)} Hz` : '未検出'}</p>
      <p>目標周波数: {result?.targetFrequencyHz ?? 440} Hz</p>
      <p>偏差: {result?.pitchDeviationCent !== null && result?.pitchDeviationCent !== undefined ? `${result.pitchDeviationCent.toFixed(2)} cent` : 'N/A'}</p>
      <p>解析区間: {result?.analysisRangeLabel ?? '1.0s - 4.0s'}</p>
    </section>
  );
}
