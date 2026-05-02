import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioIntensity } from "@/hooks/useAudioIntensity";
import {
  SING_START_SEC,
  getActiveLyricIndex,
  getPrepAction,
} from "@/lib/anthemConfig";
import type { PrepAction } from "@/lib/anthemConfig";

export type AnthemPhase = "idle" | "preparing" | "singing";

export type AnthemState = {
  audio: HTMLAudioElement | null;
  phase: AnthemPhase;
  prepAction: PrepAction;
  intensity: number;
  currentTime: number;
  activeLyricIndex: number;
  toggle: () => void;
};

export function useAnthemState(): [
  React.RefObject<HTMLAudioElement | null>,
  AnthemState,
] {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intensity = useAudioIntensity(audio);

  useEffect(() => {
    setAudio(audioRef.current);
  }, []);

  useEffect(() => {
    if (!audio) return;
    function onTimeUpdate() {
      if (audio) setCurrentTime(audio.currentTime);
    }
    function onPlay() {
      setPlaying(true);
    }
    function onStop() {
      setPlaying(false);
    }
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
    };
  }, [audio]);

  const phase: AnthemPhase = !playing
    ? "idle"
    : currentTime < SING_START_SEC
      ? "preparing"
      : "singing";

  const prepAction = getPrepAction(currentTime);
  const activeLyricIndex = phase === "singing" ? getActiveLyricIndex(currentTime) : -1;

  const state: AnthemState = useMemo(
    () => ({
      audio,
      phase,
      prepAction,
      intensity,
      currentTime,
      activeLyricIndex,
      toggle: () => {
        if (!audio) return;
        if (audio.paused) void audio.play();
        else audio.pause();
      },
    }),
    [audio, phase, prepAction, intensity, currentTime, activeLyricIndex],
  );

  return [audioRef, state];
}
