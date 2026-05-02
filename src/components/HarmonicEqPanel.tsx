import type { HarmonicEqBand } from '../types/harmonicEq';
import type { SavedTake } from '../types/take';
import HarmonicGainSliders from './HarmonicGainSliders';

type Props = {
  take: SavedTake;
  bands: HarmonicEqBand[];
  minGain: number;
  maxGain: number;
  isPlaying: boolean;
  onPlayOriginal: () => void;
  onPlayEdited: () => void;
  onStop: () => void;
  onReset: () => void;
  onChangeGain: (order: number, gainDb: number) => void;
};

export default function HarmonicEqPanel({ take, bands, minGain, maxGain, isPlaying, onPlayOriginal, onPlayEdited, onStop, onReset, onChangeGain }: Props) {
  return (
    <details className="result-card" open>
      <summary><strong>Harmonic EQ</strong></summary>
      <p>Target Take: {take.name}</p>
      <p>Detected f0: {take.detectedF0Hz?.toFixed(2) ?? 'N/A'} Hz</p>
      <div>
        <button type="button" onClick={onPlayOriginal}>Original</button>
        <button type="button" onClick={onPlayEdited}>Edited</button>
        <button type="button" onClick={onStop}>Stop</button>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
      <p>{isPlaying ? '再生中' : '停止中'}</p>
      <HarmonicGainSliders bands={bands} minGain={minGain} maxGain={maxGain} onChangeGain={onChangeGain} />
      <p className="warning">Harmonic EQは倍音周辺帯域の再生実験機能です（完全分離ではありません）。</p>
    </details>
  );
}
