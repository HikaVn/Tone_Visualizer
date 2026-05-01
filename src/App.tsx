import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeHarmonics, type HarmonicResult } from './audio/harmonics';
import { sliceBySeconds } from './audio/audioMetrics';
import { computeAverageSpectrum, type SpectrumPoint } from './audio/fft';
import { detectFundamentalAutocorrelation, type FundamentalResult } from './audio/pitch';
import { estimateRecordingQuality, type RecordingQuality } from './audio/quality';
import FundamentalResultCard from './components/FundamentalResultCard';
import HarmonicsBarChart from './components/HarmonicsBarChart';
import HarmonicsOverlayChart, { datasetColor } from './components/HarmonicsOverlayChart';
import HarmonicsTable from './components/HarmonicsTable';
import SpectrumCanvas from './components/SpectrumCanvas';
import RecordingQualityCard from './components/RecordingQualityCard';

type RecordingStatus = 'idle' | 'recording' | 'done' | 'error';
const RECORD_SECONDS = 5;
const ANALYSIS_START_SEC = 1;
const ANALYSIS_END_SEC = 4;

const getSupportedMimeType = (): string | undefined => {
  const candidates = ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm'];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type));
};

function App() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [message, setMessage] = useState('録音開始で5秒ロングトーンを録音します。');
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
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,canvas.width,canvas.height);
      const xStart = (ANALYSIS_START_SEC / RECORD_SECONDS) * canvas.width; const xEnd = (ANALYSIS_END_SEC / RECORD_SECONDS) * canvas.width;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.20)'; ctx.fillRect(xStart, 0, xEnd - xStart, canvas.height);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength; let x = 0;
      for (let i=0;i<bufferLength;i+=1){ const y=((data[i]/128)*canvas.height)/2; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=sliceWidth; }
      ctx.stroke(); ctx.fillStyle='#bbf7d0'; ctx.font='14px sans-serif'; ctx.fillText('解析範囲 1.0s - 4.0s', xStart+8, 20);
      rafIdRef.current = requestAnimationFrame(draw);
    }; draw();
  };

  const runAnalysis = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('AudioContext is not supported in this browser.');
    }
    const decodeContext = new AudioContextCtor();
    try {
      const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0));
      const mono = audioBuffer.getChannelData(0);
      const section = sliceBySeconds(mono, audioBuffer.sampleRate, ANALYSIS_START_SEC, ANALYSIS_END_SEC);
      const avg = computeAverageSpectrum(section, audioBuffer.sampleRate);
      const q = estimateRecordingQuality(section);
      const f0 = detectFundamentalAutocorrelation(section, audioBuffer.sampleRate);
      const nyquistHz = audioBuffer.sampleRate / 2;
      const harmonicResults = analyzeHarmonics(avg, f0.detectedF0Hz, nyquistHz);
      const maxHz = Math.min(nyquistHz, 20000, Math.max(10000, (f0.detectedF0Hz ?? 440) * 20 * 1.1));
      setSpectrumMaxHz(maxHz);
      setSpectrum(avg); setFundamental(f0); setHarmonics(harmonicResults); setQuality(q);
      const h1 = harmonicResults.find((h) => h.order === 1);
      setH1Warning(h1?.relativeToH1 === null ? 'H1が検出できないため相対レベルは未計算です。' : null);
    } finally { void decodeContext.close(); }
  };

  const startRecording = async () => {
    if (status === 'recording') return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setStatus('error'); setMessage('このブラウザは録音APIに対応していません。'); return; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setSpectrum([]); setFundamental(null); setHarmonics([]); setH1Warning(null); setQuality(null); setSpectrumMaxHz(10000);
    try {
      setStatus('recording'); setSecondsLeft(RECORD_SECONDS); setMessage('録音中です。単音ロングトーンを維持してください。');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        setStatus('error');
        setMessage('AudioContextに対応していないブラウザです。');
        cleanupAudioGraph();
        return;
      }
      const audioContext = new AudioContextCtor(); const analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
      const source = audioContext.createMediaStreamSource(stream); source.connect(analyser);
      audioContextRef.current = audioContext; sourceRef.current = source; analyserRef.current = analyser;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' });
        setAudioUrl(URL.createObjectURL(blob)); setStatus('done'); setMessage('録音完了。解析中...'); cleanupAudioGraph();
        try { await runAnalysis(blob); setMessage('録音完了。基音とH1〜H20を表示しています。'); }
        catch (error) { console.error(error); setMessage('録音は完了しましたが解析に失敗しました。'); }
      };
      recorder.start(250); drawFrame();
      let remaining = RECORD_SECONDS;
      const countdown = setInterval(() => { remaining -= 1; setSecondsLeft(Math.max(0, remaining)); }, 1000);
      setTimeout(() => { clearInterval(countdown); if (recorder.state !== 'inactive') recorder.stop(); }, RECORD_SECONDS * 1000);
    } catch (error) { console.error(error); setStatus('error'); setMessage('マイク許可または録音初期化に失敗しました。'); cleanupAudioGraph(); }
  };


  const downloadCsv = () => {
    const headers = [
      'harmonic_order',
      'expected_hz',
      'peak_hz',
      'harmonic_relative_to_h1',
      'level_db',
      'detected_f0_hz',
      'pitch_deviation_cent',
      'peak_dbfs',
    ];

    const rows: Array<Array<string | number>> = harmonics.map((h) => [
      h.order,
      h.expectedFrequencyHz.toFixed(4),
      h.detectedPeakFrequencyHz?.toFixed(4) ?? '',
      h.relativeToH1?.toFixed(4) ?? '',
      h.levelDb?.toFixed(4) ?? '',
      fundamental?.detectedF0Hz?.toFixed(4) ?? '',
      fundamental?.pitchDeviationCent?.toFixed(4) ?? '',
      quality?.peakDbfs.toFixed(4) ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((r: Array<string | number>) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'single_note_harmonics.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveCurrentAnalysis = () => {
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

  const overlayDatasets = savedAnalyses
    .filter((a) => selectedIds.includes(a.id))
    .map((a, index) => ({ ...a, color: datasetColor(index) }));

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
      <button className="record-button" type="button" onClick={startRecording} disabled={status === 'recording'}>{status === 'recording' ? `録音中… ${secondsLeft}s` : '録音開始（5秒）'}</button>
      <p className="message">{message}</p>
      <section className="result-card">
        <h2>測定条件</h2>
        <p>Auto f0 detection</p>
        <p>Duration: 5 sec</p>
        <p>Recommended: no vibrato</p>
      </section>

      <canvas ref={canvasRef} className="wave-canvas" width={900} height={300} aria-label="録音波形キャンバス" />
      <section className="playback"><h2>録音再生</h2>{audioUrl ? <audio controls src={audioUrl} playsInline /> : <p>録音後に再生プレイヤーが表示されます。</p>}</section>

      <SpectrumCanvas data={spectrum} maxFrequencyHz={spectrumMaxHz} harmonicMarkersHz={harmonics.map((h) => ({ order: h.order, expectedFrequencyHz: h.expectedFrequencyHz }))} />
      <FundamentalResultCard result={fundamental} />
      <RecordingQualityCard quality={quality} />
      {h1Warning ? <p className="warning">{h1Warning}</p> : null}
      <button type="button" className="record-button" onClick={downloadCsv} disabled={harmonics.length !== 20}>CSVダウンロード</button>
      <button type="button" className="record-button" onClick={saveCurrentAnalysis} disabled={harmonics.length !== 20}>この測定を保存</button>
      <section className="result-card">
        <h2>保存データ比較</h2>
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
      <HarmonicsOverlayChart datasets={overlayDatasets} />
      <HarmonicsBarChart data={harmonics} />
      <HarmonicsTable data={harmonics} />
    </main>
  );
}

export default App;
