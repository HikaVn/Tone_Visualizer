import { useEffect, useRef } from 'react';
import type { HarmonicResult } from '../audio/harmonics';

type Dataset = {
  id: string;
  label: string;
  harmonics: HarmonicResult[];
  color: string;
};

export type HarmonicDistributionMode = 'relative' | 'absolute';

type Props = {
  datasets: Dataset[];
  mode: HarmonicDistributionMode;
};

const COLORS = ['#22c55e', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#34d399'];

export const datasetColor = (index: number) => COLORS[index % COLORS.length];

export default function HarmonicsOverlayChart({ datasets, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#334155';
    for (let i = 0; i <= 20; i += 1) {
      const x = (i / 20) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    datasets.forEach((dataset) => {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      dataset.harmonics.forEach((h) => {
        const x = ((h.order - 1) / 19) * canvas.width;
        const rawValue = mode === 'relative'
          ? (h.relativeToH1 ?? 0)
          : (h.levelDb !== null ? Math.max(0, h.levelDb + 120) : 0);
        const maxValue = mode === 'relative' ? 100 : 120;
        const value = Math.max(0, Math.min(maxValue, rawValue));
        const y = canvas.height - (value / maxValue) * canvas.height;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      if (started) ctx.stroke();
    });
  }, [datasets, mode]);

  return (
    <section>
      <h2>倍音分布 重ね書き（{mode === 'relative' ? '相対値' : '絶対値(dB)'}）</h2>
      <canvas ref={canvasRef} className="spectrum-canvas" width={900} height={260} aria-label="倍音重ね書き" />
      <div className="legend">
        {datasets.map((d) => (
          <span key={d.id} style={{ color: d.color, marginRight: '1rem' }}>{d.label}</span>
        ))}
      </div>
    </section>
  );
}
