import type { FundamentalResult } from '../audio/pitch';

type Props = { result: FundamentalResult | null };

export default function FundamentalResultCard({ result }: Props) {
  return (
    <section className="result-card">
      <h2>基音推定</h2>
      <p>検出基音 f0: {result?.detectedF0Hz ? `${result.detectedF0Hz.toFixed(2)} Hz` : '未検出'}</p>
      <p>推定音名: {result?.estimatedNote ?? 'N/A'}</p>
      <p>cent偏差: {result?.pitchDeviationCent !== null && result?.pitchDeviationCent !== undefined ? `${result.pitchDeviationCent.toFixed(2)} cent` : 'N/A'}</p>
      <p>Reference pitch: A4 = {result?.referenceA4Hz ?? 440} Hz</p>
      <p>解析区間: {result?.analysisRangeLabel ?? '1.0s - 4.0s'}</p>
    </section>
  );
}
