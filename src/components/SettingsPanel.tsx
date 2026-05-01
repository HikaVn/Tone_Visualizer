import type { AppSettings } from '../types/settings';

type Props = {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
};

export default function SettingsPanel({ settings, onChange, onReset }: Props) {
  return (
    <details className="result-card" open>
      <summary><strong>設定</strong></summary>
      <p>録音時間: {settings.recordingDurationSec} 秒</p>
      <input type="range" min={1} max={20} step={1} value={settings.recordingDurationSec} onChange={(e) => onChange({ recordingDurationSec: Number(e.target.value) })} />
      <p>録音待機時間: {settings.preRecordDelaySec} 秒</p>
      <input type="range" min={0} max={settings.maxPreRecordDelaySec} step={1} value={settings.preRecordDelaySec} onChange={(e) => onChange({ preRecordDelaySec: Number(e.target.value) })} />

      <p>基準ピッチ A4 = {settings.referenceA4Hz} Hz</p>
      <input type="range" min={400} max={466} step={1} value={settings.referenceA4Hz} onChange={(e) => onChange({ referenceA4Hz: Number(e.target.value) })} />
      <div>
        <button type="button" onClick={() => onChange({ referenceA4Hz: 415 })}>Baroque 415</button>
        <button type="button" onClick={() => onChange({ referenceA4Hz: 440 })}>Modern 440</button>
        <button type="button" onClick={() => onChange({ referenceA4Hz: 442 })}>Orchestra JP 442</button>
        <button type="button" onClick={() => onChange({ referenceA4Hz: 443 })}>High 443</button>
      </div>
      <p>f0探索範囲: {settings.f0MinHz} - {settings.f0MaxHz} Hz</p>
      <p>倍音数: {settings.harmonicCount} / 探索幅: ±{settings.harmonicSearchWidthPercent}%</p>
      <label><input type="checkbox" checked={settings.autoGainControlRequestedOff} onChange={(e) => onChange({ autoGainControlRequestedOff: e.target.checked })} /> autoGainControl OFF要求</label>
      <label><input type="checkbox" checked={settings.noiseSuppressionRequestedOff} onChange={(e) => onChange({ noiseSuppressionRequestedOff: e.target.checked })} /> noiseSuppression OFF要求</label>
      <label><input type="checkbox" checked={settings.echoCancellationRequestedOff} onChange={(e) => onChange({ echoCancellationRequestedOff: e.target.checked })} /> echoCancellation OFF要求</label>
      <p className="warning">iPhone/Safariでは要求値どおり固定されない場合があります。</p>
      <button type="button" onClick={onReset}>設定を初期化</button>
    </details>
  );
}
