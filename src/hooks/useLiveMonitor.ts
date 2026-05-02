import { useCallback, useEffect, useRef, useState } from 'react';

export type ClippingStatus = 'OK' | 'High level' | 'Clipping risk' | 'Too quiet';

export interface LiveMonitorState {
  isMonitoring: boolean;
  peakAmplitude: number;
  peakDbfs: number;
  clippingStatus: ClippingStatus;
  timeDomainData: Float32Array | null;
  startMonitor: () => Promise<void>;
  stopMonitor: () => void;
  errorMessage: string | null;
}

export function useLiveMonitor(audioConstraints: MediaTrackConstraints): LiveMonitorState {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [peakAmplitude, setPeakAmplitude] = useState(0);
  const [timeDomainData, setTimeDomainData] = useState<Float32Array | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopMonitor = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    analyserRef.current?.disconnect();
    void ctxRef.current?.close();
    rafRef.current = null; streamRef.current = null; analyserRef.current = null; ctxRef.current = null;
    setIsMonitoring(false);
  }, []);

  const startMonitor = useCallback(async () => {
    try {
      stopMonitor();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('AudioContext unsupported');
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      streamRef.current = stream; ctxRef.current = ctx; analyserRef.current = analyser;
      setIsMonitoring(true); setErrorMessage(null);
      const loop = () => {
        analyser.getFloatTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
        setPeakAmplitude(peak);
        setTimeDomainData(new Float32Array(data));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setErrorMessage('モニター開始に失敗しました。');
      setIsMonitoring(false);
    }
  }, [audioConstraints, stopMonitor]);

  useEffect(() => () => stopMonitor(), [stopMonitor]);

  const peakDbfs = 20 * Math.log10(Math.max(1e-8, peakAmplitude));
  const clippingStatus: ClippingStatus = peakAmplitude >= 0.98 ? 'Clipping risk' : peakAmplitude >= 0.9 ? 'High level' : peakAmplitude < 0.2 ? 'Too quiet' : 'OK';
  return { isMonitoring, peakAmplitude, peakDbfs, clippingStatus, timeDomainData, startMonitor, stopMonitor, errorMessage };
}
