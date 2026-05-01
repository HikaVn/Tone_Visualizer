import type { HarmonicResult } from '../audio/harmonics';

type Props = { data: HarmonicResult[] };

export default function HarmonicsTable({ data }: Props) {
  return (
    <section>
      <h2>Harmonics Detail</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Harmonic</th><th>Expected Hz</th><th>Peak Hz</th><th>Relative</th><th>Level dB</th><th>Confidence</th></tr>
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
