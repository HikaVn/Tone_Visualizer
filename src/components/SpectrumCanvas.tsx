import { useEffect, useRef } from 'react';
import type { SpectrumPoint } from '../audio/fft';

type Props = {
  data: SpectrumPoint[];
  maxFrequencyHz?: number;
  harmonicMarkersHz?: { order: number; expectedFrequencyHz: number }[];
};

const dbMin = -140;
const dbMax = 0;

export default function SpectrumCanvas({ data, maxFrequencyHz = 10000, harmonicMarkersHz = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    const freqTicks = [0, 2000, 4000, 6000, 8000, 10000];
    freqTicks.forEach((tick) => {
      const x = (tick / maxFrequencyHz) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      const label = tick === 0 ? '0' : `${tick / 1000}k`;
      ctx.fillText(label, Math.min(x + 4, canvas.width - 24), canvas.height - 8);
    });

    harmonicMarkersHz.forEach((h) => {
      if (h.expectedFrequencyHz > maxFrequencyHz) return;
      const x = (h.expectedFrequencyHz / maxFrequencyHz) * canvas.width;
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.fillStyle = '#f9a8d4';
      ctx.font = '10px sans-serif';
      ctx.fillText(`H${h.order}`, x + 1, 12);
    });

    if (data.length === 0) return;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    data.forEach((point) => {
      if (point.frequencyHz < 0 || point.frequencyHz > maxFrequencyHz) return;
      const x = (point.frequencyHz / maxFrequencyHz) * canvas.width;
      const clampedDb = Math.max(dbMin, Math.min(dbMax, point.magnitudeDb));
      const y = ((dbMax - clampedDb) / (dbMax - dbMin)) * canvas.height;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });

    if (started) ctx.stroke();
  }, [data, maxFrequencyHz, harmonicMarkersHz]);

  return (
    <section className="spectrum">
      <h2>平均スペクトル（0〜10kHz）</h2>
      <canvas ref={canvasRef} className="spectrum-canvas" width={900} height={300} aria-label="平均スペクトル" />
    </section>
  );
}
