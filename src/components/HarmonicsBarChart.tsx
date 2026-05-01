import type { HarmonicResult } from '../audio/harmonics';

type Props = { data: HarmonicResult[] };

export default function HarmonicsBarChart({ data }: Props) {
  return (
    <section>
      <h2>H1〜H20 Relative Level (H1=100)</h2>
      <div className="bar-grid">
        {data.map((h) => {
          const value = h.relativeToH1;
          return (
            <div key={h.order} className="bar-item">
              <div className="bar-label">H{h.order}</div>
              <div className="bar-box">
                {value === null ? (
                  <span className="bar-missing">未検出</span>
                ) : (
                  <div className="bar-fill" style={{ height: `${Math.min(100, Math.max(0, value))}%` }} />
                )}
              </div>
              <div className="bar-value">{value === null ? '-' : value.toFixed(1)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
