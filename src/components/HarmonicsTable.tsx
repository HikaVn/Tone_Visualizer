import type { HarmonicResult } from '../audio/harmonics';

type Props = { data: HarmonicResult[] };

export default function HarmonicsTable({ data }: Props) {
  return (
    <section>
      <h2>倍音詳細</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>倍音</th><th>期待周波数(Hz)</th><th>ピーク周波数(Hz)</th><th>相対値(H1=100)</th><th>レベル(dB)</th><th>信頼度</th></tr>
          </thead>
          <tbody>
            {data.map((h) => (
              <tr key={h.order}>
                <td>H{h.order}</td>
                <td>{h.expectedFrequencyHz.toFixed(2)}</td>
                <td>{h.detectedPeakFrequencyHz?.toFixed(2) ?? '-'}</td>
                <td>{h.relativeToH1?.toFixed(2) ?? '-'}</td>
                <td>{h.levelDb?.toFixed(2) ?? '-'}</td>
                <td>{h.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
