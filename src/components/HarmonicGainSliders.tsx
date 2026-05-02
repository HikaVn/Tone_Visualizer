import type { HarmonicEqBand } from '../types/harmonicEq';

type Props = { bands: HarmonicEqBand[]; minGain: number; maxGain: number; onChangeGain: (order: number, gainDb: number) => void };

export default function HarmonicGainSliders({ bands, minGain, maxGain, onChangeGain }: Props) {
  return (
    <div>
      {bands.map((b) => (
        <div key={b.order}>
          <label>H{b.order} {b.frequencyHz.toFixed(1)}Hz {b.gainDb.toFixed(1)}dB</label>
          <input type="range" min={minGain} max={maxGain} step={0.5} value={b.gainDb} onChange={(e) => onChangeGain(b.order, Number(e.target.value))} />
        </div>
      ))}
    </div>
  );
}
