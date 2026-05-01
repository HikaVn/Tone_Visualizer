# A4 Harmonic Analyzer (Prototype 1)

React + Vite + TypeScript で実装した、iPhone Safari向けのバイオリンA線(A4)ロングトーン解析プロトタイプです。

## 実装ファイル一覧

- `index.html`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/audio/audioMetrics.ts`
- `src/audio/fft.ts`
- `src/audio/pitch.ts`
- `src/audio/harmonics.ts`
- `src/audio/quality.ts`
- `src/components/SpectrumCanvas.tsx`
- `src/components/FundamentalResultCard.tsx`
- `src/components/HarmonicsBarChart.tsx`
- `src/components/HarmonicsTable.tsx`
- `src/components/RecordingQualityCard.tsx`
- `src/types/fftjs.d.ts`

## 主要機能（Phase 1〜4）

### Phase 1: 録音と波形表示
- マイク録音（5秒）
- 録音中のカウントダウン表示
- 自動停止（5秒）
- 録音音の再生
- 波形Canvas表示
- 解析対象範囲 1〜4秒 を波形上にハイライト

### Phase 2: FFTと平均スペクトル
- 解析対象区間 1〜4秒切り出し
- 中央32768サンプル抽出（不足時ゼロパディング）
- Hann窓適用
- `fft.js` を使ったFFT
- 0〜10000Hz 平均スペクトル表示

### Phase 3: 基音推定とH1〜H20
- 400〜480Hz から基音推定（A4専用）
- Deviation cent 表示
- H1〜H20 期待周波数とピーク検出
- H1=100相対レベルの棒グラフ表示
- H1〜H20詳細表表示
- SpectrumCanvas上にH1〜H20縦線表示

### Phase 4: 録音品質・信頼度・CSV出力
- Peak level (dBFS)
- Clipping status
- Noise estimate (dBFS)
- Measurement confidence (High/Medium/Low)
- confidence reason
- CSV出力（H1〜H20の20行）
  - 含む項目: `detected_f0_hz`, `pitch_deviation_cent`, `peak_dbfs`, `harmonic_relative_to_h1`

## 残課題

- この実行環境では npm レジストリ403制限により `npm install` ができないため、`npm run build` の最終実行確認が不可。
- 実機(iPhone Safari)での最終UX検証（縦画面、タップ操作感、録音許可導線、音量条件別の安定性）は、依存導入可能な環境で要確認。
- Phase 4品質推定は簡易実装のため、ノイズフロア推定やSNRベースの厳密化余地あり。

## 未実装（次フェーズ以降）

- G/D/E線対応
- 複数楽器比較
- IndexedDB保存
- スペクトログラム
- Harmonic EQ
- ビブラート追従EQ
- Sin波キャリブレーション
- PWA化
