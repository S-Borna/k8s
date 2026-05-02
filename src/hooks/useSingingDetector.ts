import { useEffect, useRef, useState } from "react";

const VOICE_BAND_LOW_HZ = 200;
const VOICE_BAND_HIGH_HZ = 3000;
const SINGING_THRESHOLD = 70;
const SUSTAIN_MS = 350;

export type AnthemPhase = "idle" | "preparing" | "singing";

export function useSingingDetector(audio: HTMLAudioElement | null) {
  const [phase, setPhase] = useState<AnthemPhase>("idle");
  const [intensity, setIntensity] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
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
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;
      const src = ctx.createMediaElementSource(audio!);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = src;
      return ctx;
    }

    let raf = 0;
    let aboveThresholdSince: number | null = null;

    function tick(now: number) {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);

      const ctx = ctxRef.current;
      if (!ctx) return;
      const sampleRate = ctx.sampleRate;
      const binHz = sampleRate / analyser.fftSize;
      const lowBin = Math.floor(VOICE_BAND_LOW_HZ / binHz);
      const highBin = Math.min(
        Math.ceil(VOICE_BAND_HIGH_HZ / binHz),
        buf.length - 1,
      );

      let sum = 0;
      for (let i = lowBin; i <= highBin; i++) sum += buf[i] ?? 0;
      const avg = sum / (highBin - lowBin + 1);
      setIntensity(avg / 255);

      if (avg >= SINGING_THRESHOLD) {
        if (aboveThresholdSince === null) aboveThresholdSince = now;
        if (now - aboveThresholdSince >= SUSTAIN_MS) {
          setPhase("singing");
        }
      } else {
        aboveThresholdSince = null;
      }

      raf = requestAnimationFrame(tick);
    }

    function onPlay() {
      const ctx = ensureContext();
      void ctx.resume();
      setPhase("preparing");
      aboveThresholdSince = null;
      raf = requestAnimationFrame(tick);
    }

    function onPauseOrEnd() {
      cancelAnimationFrame(raf);
      setPhase("idle");
      setIntensity(0);
    }

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPauseOrEnd);
    audio.addEventListener("ended", onPauseOrEnd);

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPauseOrEnd);
      audio.removeEventListener("ended", onPauseOrEnd);
    };
  }, [audio]);

  return { phase, intensity };
}
