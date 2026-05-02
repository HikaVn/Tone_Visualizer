import { useEffect, useRef } from 'react';

type Props = { data: Float32Array | null };

export default function LiveWaveformCanvas({ data }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, c.width, c.height);
    if (!data) return;
    ctx.strokeStyle = '#22d3ee'; ctx.beginPath();
    for (let i = 0; i < data.length; i += 1) {
      const x = (i / (data.length - 1)) * c.width;
      const y = (0.5 - data[i] * 0.45) * c.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data]);
  return <canvas ref={ref} className="wave-canvas" width={900} height={180} aria-label="live waveform" />;
}
