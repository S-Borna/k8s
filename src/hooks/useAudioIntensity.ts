import { useEffect, useRef, useState } from "react";

const VOICE_BAND_LOW_HZ = 200;
const VOICE_BAND_HIGH_HZ = 3000;

export function useAudioIntensity(audio: HTMLAudioElement | null): number {
  const [intensity, setIntensity] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audio) return;

    function ensureContext() {
      if (ctxRef.current) return ctxRef.current;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;
      const src = ctx.createMediaElementSource(audio!);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      return ctx;
    }

    let raf = 0;

    function tick() {
      const analyser = analyserRef.current;
      const ctx = ctxRef.current;
      if (!analyser || !ctx) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const binHz = ctx.sampleRate / analyser.fftSize;
      const lowBin = Math.floor(VOICE_BAND_LOW_HZ / binHz);
      const highBin = Math.min(
        Math.ceil(VOICE_BAND_HIGH_HZ / binHz),
        buf.length - 1,
      );
      let sum = 0;
      for (let i = lowBin; i <= highBin; i++) sum += buf[i] ?? 0;
      const avg = sum / (highBin - lowBin + 1);
      setIntensity(avg / 255);
      raf = requestAnimationFrame(tick);
    }

    function onPlay() {
      const ctx = ensureContext();
      void ctx.resume();
      raf = requestAnimationFrame(tick);
    }

    function onStop() {
      cancelAnimationFrame(raf);
      setIntensity(0);
    }

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
    };
  }, [audio]);

  return intensity;
}
