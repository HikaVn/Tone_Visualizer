import { useCallback, useRef, useState } from 'react';
import type { HarmonicEqBand } from '../types/harmonicEq';
import type { SavedTake } from '../types/take';

export function useHarmonicEqPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = useCallback(() => {
    try { srcRef.current?.stop(); } catch {}
    srcRef.current?.disconnect(); srcRef.current = null;
    setIsPlaying(false);
  }, []);

  const playOriginal = useCallback(async (take: SavedTake) => {
    stop();
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx(); ctxRef.current = ctx; await ctx.resume();
    const buf = await ctx.decodeAudioData(await take.audioBlob.arrayBuffer());
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.onended = () => setIsPlaying(false); src.start(); srcRef.current = src; setIsPlaying(true);
  }, [stop]);

  const playEdited = useCallback(async (take: SavedTake, bands: HarmonicEqBand[]) => {
    stop();
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx(); ctxRef.current = ctx; await ctx.resume();
    const buf = await ctx.decodeAudioData(await take.audioBlob.arrayBuffer());
    const src = ctx.createBufferSource(); src.buffer = buf;
    let node: AudioNode = src;
    bands.forEach((b) => {
      const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = b.frequencyHz; f.Q.value = b.q; f.gain.value = b.gainDb;
      node.connect(f); node = f;
    });
    node.connect(ctx.destination); src.onended = () => setIsPlaying(false); src.start(); srcRef.current = src; setIsPlaying(true);
  }, [stop]);

  return { isPlaying, playOriginal, playEdited, stop };
}
