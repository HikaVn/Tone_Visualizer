import type { SavedTake } from '../types/take';

type Props = {
  takes: SavedTake[];
  selectedTakeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPlay: (take: SavedTake) => void;
};

export default function SavedTakesPanel({ takes, selectedTakeId, onSelect, onDelete, onPlay }: Props) {
  return (
    <details className="result-card">
      <summary><strong>Saved Takes</strong></summary>
      {takes.length === 0 ? <p>保存データはありません。</p> : takes.map((t) => (
        <div key={t.id} style={{ borderTop: '1px solid #334155', padding: '0.4rem 0' }}>
          <p><strong>{t.name}</strong> ({new Date(t.createdAt).toLocaleString()})</p>
          <p>f0: {t.detectedF0Hz?.toFixed(2) ?? 'N/A'}Hz / Note: {t.estimatedNoteName ?? 'N/A'} / A4={t.referenceA4Hz}</p>
          <button type="button" onClick={() => onSelect(t.id)}>{selectedTakeId === t.id ? 'Loaded' : 'Load'}</button>
          <button type="button" onClick={() => onPlay(t)}>Play</button>
          <button type="button" onClick={() => onDelete(t.id)}>Delete</button>
        </div>
      ))}
    </details>
  );
}
