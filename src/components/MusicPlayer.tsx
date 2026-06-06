import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playlist } from "@/lib/playlist";
import { spring } from "@/lib/motion";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = playlist[index];

  const playTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) pauseTrack();
    else playTrack();
  }, [playing, playTrack, pauseTrack]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % playlist.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + playlist.length) % playlist.length);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  }, []);

  useEffect(() => {
    if (playing) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => setPlaying(false));
    } else {
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => next();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, [next]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  if (!track) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-3">
      <audio ref={audioRef} src={track.src} preload="metadata" />

      <div className="text-[10px] uppercase tracking-[0.18em] text-amber">
        Nu spelas · {index + 1}/{playlist.length}
      </div>
      <div
        className="mt-1 truncate font-display text-base leading-tight text-text"
        title={track.title}
      >
        {track.title}
      </div>
      <div
        className="truncate text-xs text-text-muted"
        title={track.artist}
      >
        {track.artist}
      </div>

      <div
        className="group mt-3 h-1.5 cursor-pointer rounded-full bg-surface-2"
        onClick={seek}
        role="slider"
        aria-label="Sökreglage"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-amber transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-faint">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-1">
        <IconButton onClick={prev} ariaLabel="Föregående">
          <SkipBack size={15} />
        </IconButton>
        <motion.button
          type="button"
          onClick={togglePlay}
          whileTap={{ scale: 0.94 }}
          transition={spring}
          className="grid h-10 w-10 place-items-center rounded-full bg-amber text-bg shadow-lg shadow-amber/30 transition hover:brightness-110"
          aria-label={playing ? "Pausa" : "Spela"}
        >
          {playing ? (
            <Pause size={16} />
          ) : (
            <Play size={16} className="translate-x-[1px]" />
          )}
        </motion.button>
        <IconButton onClick={next} ariaLabel="Nästa">
          <SkipForward size={15} />
        </IconButton>
        <IconButton
          onClick={toggleMute}
          ariaLabel={muted ? "Aktivera ljud" : "Mute"}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={spring}
      aria-label={ariaLabel}
      className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-surface/60 hover:text-text"
    >
      {children}
    </motion.button>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
