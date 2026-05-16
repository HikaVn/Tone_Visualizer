import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeHarmonics, type HarmonicResult } from './audio/harmonics';
import { sliceBySeconds } from './audio/audioMetrics';
import { computeAverageSpectrum, type SpectrumPoint } from './audio/fft';
import { detectFundamentalAutocorrelation, type FundamentalResult } from './audio/pitch';
import { estimateRecordingQuality, type RecordingQuality } from './audio/quality';
import { createDefaultHarmonicEqBands, updateBandGain } from './audio/harmonicEq';
import FundamentalResultCard from './components/FundamentalResultCard';
import HarmonicsBarChart from './components/HarmonicsBarChart';
import HarmonicsOverlayChart, { datasetColor, type HarmonicDistributionMode } from './components/HarmonicsOverlayChart';
import HarmonicsTable from './components/HarmonicsTable';
import SpectrumCanvas from './components/SpectrumCanvas';
import RecordingQualityCard from './components/RecordingQualityCard';
import SettingsPanel from './components/SettingsPanel';
import { useSettings } from './settings/useSettings';
import { useLiveMonitor } from './hooks/useLiveMonitor';
import LiveMonitorPanel from './components/LiveMonitorPanel';
import SaveTakeButton from './components/SaveTakeButton';
import SavedTakesPanel from './components/SavedTakesPanel';
import StorageDiagnosticsPanel from './components/StorageDiagnosticsPanel';
import type { SavedTake } from './types/take';
import { deleteTake, getAllTakes, saveTake } from './storage/takeStorage';
import type { HarmonicEqBand } from './types/harmonicEq';
import { useHarmonicEqPlayer } from './hooks/useHarmonicEqPlayer';
import HarmonicEqPanel from './components/HarmonicEqPanel';

type AppStatus = 'idle' | 'requestingMic' | 'countdown' | 'recording' | 'decoding' | 'analyzing' | 'ready' | 'error';

const getSupportedMimeType = (): string | undefined => {
  const candidates = ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm'];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type));
};

function App() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [status, setStatus] = useState<AppStatus>('idle');
  const [message, setMessage] = useState('録音開始でロングトーンを録音します。');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [spectrum, setSpectrum] = useState<SpectrumPoint[]>([]);
  const [fundamental, setFundamental] = useState<FundamentalResult | null>(null);
  const [harmonics, setHarmonics] = useState<HarmonicResult[]>([]);
  const [h1Warning, setH1Warning] = useState<string | null>(null);
  const [quality, setQuality] = useState<RecordingQuality | null>(null);
  const [spectrumMaxHz, setSpectrumMaxHz] = useState(10000);
  const [savedAnalyses, setSavedAnalyses] = useState<Array<{ id: string; label: string; harmonics: HarmonicResult[] }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<HarmonicDistributionMode>('relative');
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [lastSampleRate, setLastSampleRate] = useState(48000);
  const [savedTakes, setSavedTakes] = useState<SavedTake[]>([]);
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const [selectedTakeAudioUrl, setSelectedTakeAudioUrl] = useState<string | null>(null);
  const [harmonicEqBands, setHarmonicEqBands] = useState<HarmonicEqBand[]>([]);

  const selectedTake = useMemo(() => savedTakes.find((t) => t.id === selectedTakeId) ?? null, [savedTakes, selectedTakeId]);

  const monitor = useLiveMonitor({
    echoCancellation: settings.echoCancellationRequestedOff ? false : undefined,
    noiseSuppression: settings.noiseSuppressionRequestedOff ? false : undefined,
    autoGainControl: settings.autoGainControlRequestedOff ? false : undefined,
    channelCount: 1,
  });
  const eqPlayer = useHarmonicEqPlayer(harmonicEqBands);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeType = useMemo(getSupportedMimeType, []);

  const cleanupAudioGraph = () => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    sourceRef.current?.disconnect(); analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    void audioContextRef.current?.close();
    sourceRef.current = null; analyserRef.current = null; streamRef.current = null; audioContextRef.current = null;
  };

  const drawFrame = () => {
    const canvas = canvasRef.current; const analyser = analyserRef.current; if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const bufferLength = analyser.fftSize; const data = new Uint8Array(bufferLength);
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const xStart = (settings.analysisStartSec / settings.recordingDurationSec) * canvas.width;
      const xEnd = ((settings.recordingDurationSec - settings.analysisEndOffsetSec) / settings.recordingDurationSec) * canvas.width;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.20)'; ctx.fillRect(xStart, 0, xEnd - xStart, canvas.height);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength; let x = 0;
      for (let i = 0; i < bufferLength; i += 1) { const y = ((data[i] / 128) * canvas.height) / 2; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); x += sliceWidth; }
      ctx.stroke();
      rafIdRef.current = requestAnimationFrame(draw);
    }; draw();
  };

  const runAnalysis = async (blob: Blob) => {
    setStatus('decoding');
    const arrayBuffer = await blob.arrayBuffer();
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) throw new Error('AudioContext unsupported');
    const decodeContext = new Ctx();
    try {
      const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0));
      setLastSampleRate(audioBuffer.sampleRate);
      setStatus('analyzing');
      const mono = audioBuffer.getChannelData(0);
      const analysisEndSec = Math.max(settings.analysisStartSec + 0.1, settings.recordingDurationSec - settings.analysisEndOffsetSec);
      const section = sliceBySeconds(mono, audioBuffer.sampleRate, settings.analysisStartSec, analysisEndSec);
      const avg = computeAverageSpectrum(section, audioBuffer.sampleRate);
      const q = estimateRecordingQuality(section);
      const f0 = detectFundamentalAutocorrelation(section, audioBuffer.sampleRate, settings.f0MinHz, settings.f0MaxHz, settings.referenceA4Hz);
      const nyquistHz = audioBuffer.sampleRate / 2;
      const harmonicResults = analyzeHarmonics(avg, f0.detectedF0Hz, nyquistHz).slice(0, settings.harmonicCount);
      const maxHz = settings.spectrumMaxHzMode === 'manual'
        ? Math.min(nyquistHz, settings.manualSpectrumMaxHz)
        : Math.min(nyquistHz, 20000, Math.max(10000, (f0.detectedF0Hz ?? 440) * settings.harmonicCount * 1.1));
      setSpectrumMaxHz(maxHz);
      setSpectrum(avg); setFundamental(f0); setHarmonics(harmonicResults); setQuality(q);
      const h1 = harmonicResults.find((h) => h.order === 1);
      setH1Warning(h1?.relativeToH1 === null ? 'H1が検出できないため相対レベルは未計算です。' : null);
      setStatus('ready');
      setMessage('解析完了。');
    } finally { void decodeContext.close(); }
  };

  const startRecording = async () => {
    if (status === 'recording' || status === 'countdown') return;
    monitor.stopMonitor();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setStatus('error'); setMessage('録音API未対応'); return; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setSpectrum([]); setFundamental(null); setHarmonics([]); setH1Warning(null); setQuality(null); setLastBlob(null); setStatus('requestingMic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        echoCancellation: settings.echoCancellationRequestedOff ? false : undefined,
        noiseSuppression: settings.noiseSuppressionRequestedOff ? false : undefined,
        autoGainControl: settings.autoGainControlRequestedOff ? false : undefined,
      } });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('AudioContext unsupported');
      const audioContext = new Ctx(); const analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream); source.connect(analyser);
      audioContextRef.current = audioContext; sourceRef.current = source; analyserRef.current = analyser;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' });
        setLastBlob(blob); setAudioUrl(URL.createObjectURL(blob)); cleanupAudioGraph();
        try { await runAnalysis(blob); }
        catch (error) { console.error(error); setStatus('error'); setMessage('録音は完了しましたが解析に失敗しました。'); }
      };

      const delay = Math.max(0, Math.min(settings.maxPreRecordDelaySec, settings.preRecordDelaySec));
      if (delay > 0) {
        setStatus('countdown'); setSecondsLeft(delay); setMessage(`録音待機中 ${delay.toFixed(0)}秒後に開始`);
        for (let i = delay; i > 0; i -= 1) {
          setSecondsLeft(i);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      setStatus('recording'); setSecondsLeft(settings.recordingDurationSec); setMessage('録音中...');
      recorder.start(250); drawFrame();
      let remaining = settings.recordingDurationSec;
      const countdown = setInterval(() => { remaining -= 1; setSecondsLeft(Math.max(0, remaining)); }, 1000);
      setTimeout(() => { clearInterval(countdown); if (recorder.state !== 'inactive') recorder.stop(); }, settings.recordingDurationSec * 1000);
    } catch (error) { console.error(error); setStatus('error'); setMessage('録音開始に失敗'); cleanupAudioGraph(); }
  };

  const downloadCsv = () => {
    const headers = ['harmonic_order', 'expected_hz', 'peak_hz', 'harmonic_relative_to_h1', 'level_db', 'detected_f0_hz', 'pitch_deviation_cent', 'reference_a4_hz', 'estimated_note_name', 'note_cent_deviation', 'peak_dbfs'];
    const rows = harmonics.map((h: HarmonicResult) => [h.order, h.expectedFrequencyHz.toFixed(4), h.detectedPeakFrequencyHz?.toFixed(4) ?? '', h.relativeToH1?.toFixed(4) ?? '', h.levelDb?.toFixed(4) ?? '', fundamental?.detectedF0Hz?.toFixed(4) ?? '', fundamental?.pitchDeviationCent?.toFixed(4) ?? '', settings.referenceA4Hz, fundamental?.estimatedNote ?? '', fundamental?.pitchDeviationCent?.toFixed(4) ?? '', quality?.peakDbfs.toFixed(4) ?? '']);
    const csv = [headers.join(','), ...rows.map((r: Array<string | number>) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'single_note_harmonics.csv'; link.click(); URL.revokeObjectURL(url);
  };

  const saveCurrentAnalysis = async () => {
    if (!lastBlob || !fundamental) return;
    const take: SavedTake = {
      id: `${Date.now()}`,
      name: `Take ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      detectedF0Hz: fundamental.detectedF0Hz,
      estimatedNoteName: fundamental.estimatedNote,
      noteCentDeviation: fundamental.pitchDeviationCent,
      referenceA4Hz: settings.referenceA4Hz,
      durationSec: settings.recordingDurationSec,
      sampleRate: lastSampleRate,
      audioBlob: lastBlob,
      audioMimeType: lastBlob.type,
      analysisResult: { spectrumMaxHz, fundamental, harmonics, quality },
      settingsSnapshot: {
        referenceA4Hz: settings.referenceA4Hz, recordingDurationSec: settings.recordingDurationSec, analysisStartSec: settings.analysisStartSec,
        analysisEndOffsetSec: settings.analysisEndOffsetSec, f0MinHz: settings.f0MinHz, f0MaxHz: settings.f0MaxHz, harmonicCount: settings.harmonicCount,
        harmonicSearchWidthPercent: settings.harmonicSearchWidthPercent,
      },
    };
    await saveTake(take);
    const list = await getAllTakes(); setSavedTakes(list);
  };

  const addToOverlay = () => {
    if (!harmonics.length) return;
    const id = `${Date.now()}`;
    const label = new Date().toLocaleString();
    const next = [{ id, label, harmonics }, ...savedAnalyses].slice(0, 20);
    setSavedAnalyses(next);
    setSelectedIds((prev) => [id, ...prev].slice(0, 10));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const clearSavedAnalyses = () => {
    setSavedAnalyses([]);
    setSelectedIds([]);
  };

  const removeSavedAnalysis = (id: string) => {
    setSavedAnalyses((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((v) => v !== id));
  };

  const playTake = (take: SavedTake) => {
    if (selectedTakeAudioUrl) URL.revokeObjectURL(selectedTakeAudioUrl);
    setSelectedTakeAudioUrl(URL.createObjectURL(take.audioBlob));
  };

  const overlayDatasets = savedAnalyses.filter((a: { id: string }) => selectedIds.includes(a.id)).map((a, i: number) => ({ ...a, color: datasetColor(i) }));

  useEffect(() => { void (async () => { try { setSavedTakes(await getAllTakes()); } catch (e) { setMessage('IndexedDB未対応または読込失敗'); } })(); }, []);
  useEffect(() => {
    if (!selectedTake || !selectedTake.detectedF0Hz) { setHarmonicEqBands([]); return; }
    setHarmonicEqBands(createDefaultHarmonicEqBands(selectedTake.detectedF0Hz, settings.harmonicCount, settings.harmonicEqQ));
  }, [selectedTake, settings.harmonicCount, settings.harmonicEqQ]);
  useEffect(() => {
    const raw = window.localStorage.getItem('harmonic_saved_analyses');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Array<{ id: string; label: string; harmonics: HarmonicResult[] }>;
      setSavedAnalyses(parsed);
    } catch (error) {
      console.error(error);
    }
  }, []);
  useEffect(() => {
    window.localStorage.setItem('harmonic_saved_analyses', JSON.stringify(savedAnalyses));
  }, [savedAnalyses]);
  useEffect(() => () => { cleanupAudioGraph(); if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  return (
    <main className="app">
      <h1>Violin Harmonic Analyzer</h1>
      <p className="subtitle">Single Note Long Tone</p>
      <SettingsPanel settings={settings} onChange={updateSettings} onReset={resetSettings} />
      <LiveMonitorPanel monitor={monitor} />
      <button className="record-button" type="button" onClick={startRecording} disabled={status === 'recording' || status === 'countdown'}>{status === 'recording' ? `録音中… ${secondsLeft}s` : status === 'countdown' ? `待機中… ${secondsLeft}s` : `録音開始（${settings.recordingDurationSec}秒）`}</button>
      <p className="message">{message}</p>
      <canvas ref={canvasRef} className="wave-canvas" width={900} height={300} aria-label="録音波形キャンバス" />
      <section className="playback"><h2>録音再生</h2>{audioUrl ? <audio controls src={audioUrl} playsInline /> : <p>録音後に再生プレイヤーが表示されます。</p>}</section>
      <SpectrumCanvas data={spectrum} maxFrequencyHz={spectrumMaxHz} harmonicMarkersHz={harmonics.map((h) => ({ order: h.order, expectedFrequencyHz: h.expectedFrequencyHz }))} />
      <FundamentalResultCard result={fundamental} />
      <RecordingQualityCard quality={quality} />
      {h1Warning ? <p className="warning">{h1Warning}</p> : null}
      <button type="button" className="record-button" onClick={downloadCsv} disabled={harmonics.length === 0}>CSVダウンロード</button>
      <SaveTakeButton disabled={harmonics.length === 0 || !lastBlob} onSave={() => void saveCurrentAnalysis()} />
      <button type="button" className="record-button" onClick={addToOverlay} disabled={harmonics.length === 0}>比較チャートに追加</button>
      <StorageDiagnosticsPanel />
      <SavedTakesPanel takes={savedTakes} selectedTakeId={selectedTakeId} onSelect={setSelectedTakeId} onPlay={playTake} onDelete={(id) => { void deleteTake(id).then(async () => setSavedTakes(await getAllTakes())); }} />
      {selectedTakeAudioUrl ? <section className="playback"><h2>選択Take再生</h2><audio controls src={selectedTakeAudioUrl} playsInline /></section> : null}
      {selectedTake && selectedTake.detectedF0Hz && harmonicEqBands.length > 0 ? <HarmonicEqPanel take={selectedTake} bands={harmonicEqBands} minGain={settings.harmonicEqMinGainDb} maxGain={settings.harmonicEqMaxGainDb} isPlaying={eqPlayer.isPlaying} onPlayOriginal={() => void eqPlayer.playOriginal(selectedTake)} onPlayEdited={() => void eqPlayer.playEdited(selectedTake)} onStop={eqPlayer.stop} onReset={() => setHarmonicEqBands(createDefaultHarmonicEqBands(selectedTake.detectedF0Hz ?? 440, settings.harmonicCount, settings.harmonicEqQ))} onChangeGain={(order, gainDb) => setHarmonicEqBands((prev) => updateBandGain(prev, order, gainDb))} /> : null}
      <section className="result-card">
        <h2>保存データ比較</h2>
        <div><label><input type="radio" checked={distributionMode === 'relative'} onChange={() => setDistributionMode('relative')} />相対値</label><label><input type="radio" checked={distributionMode === 'absolute'} onChange={() => setDistributionMode('absolute')} />絶対値</label></div>
        {savedAnalyses.length > 0 ? (
          <button type="button" onClick={clearSavedAnalyses}>保存データを全削除</button>
        ) : null}
        {savedAnalyses.length === 0 ? <p>保存データはまだありません。</p> : (
          <div>
            {savedAnalyses.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ display: 'block', flex: 1 }}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} />
                  {item.label}
                </label>
                <button type="button" onClick={() => removeSavedAnalysis(item.id)}>削除</button>
              </div>
            ))}
          </div>
        )}
      </section>
      <HarmonicsOverlayChart datasets={overlayDatasets} mode={distributionMode} />
      <HarmonicsBarChart data={harmonics} />
      <HarmonicsTable data={harmonics} />
    </main>
  );
}

export default App;
