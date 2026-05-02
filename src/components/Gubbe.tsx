import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { Pause } from "lucide-react";
import { useAudioIntensity } from "@/hooks/useAudioIntensity";

const SING_START_SEC = 23.25;

type Phase = "idle" | "preparing" | "singing";

export function Gubbe() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const intensity = useAudioIntensity(audio);

  useEffect(() => {
    setAudio(audioRef.current);
  }, []);

  useEffect(() => {
    if (!audio) return;
    function compute() {
      if (!audio || audio.paused) return setPhase("idle");
      setPhase(audio.currentTime < SING_START_SEC ? "preparing" : "singing");
    }
    audio.addEventListener("play", compute);
    audio.addEventListener("pause", compute);
    audio.addEventListener("ended", compute);
    audio.addEventListener("timeupdate", compute);
    return () => {
      audio.removeEventListener("play", compute);
      audio.removeEventListener("pause", compute);
      audio.removeEventListener("ended", compute);
      audio.removeEventListener("timeupdate", compute);
    };
  }, [audio]);

  function toggle() {
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  const isPlaying = phase !== "idle";

  return (
    <span className="relative -my-2 inline-block align-middle">
      <audio ref={audioRef} src="/inno-bocelli.mp3" preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-label={
          phase === "idle" ? "Starta nationalsången" : "Pausa nationalsången"
        }
        className="group relative cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber/50"
      >
        <GubbeSvg phase={phase} intensity={intensity} />
        <AnimatePresence>
          {isPlaying && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.25 }}
              className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-bg/85 text-amber backdrop-blur ring-1 ring-amber/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition"
              aria-hidden
            >
              <Pause size={12} fill="currentColor" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </span>
  );
}

const SOFT: Transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const SPRING: Transition = { type: "spring", stiffness: 280, damping: 18 };

function GubbeSvg({ phase, intensity }: { phase: Phase; intensity: number }) {
  const reduce = useReducedMotion() ?? false;
  const isSinging = phase === "singing";
  const isPreparing = phase === "preparing";

  const mouthHeightSinging = 14 + intensity * 18;
  const mouthWidthSinging = 14 + intensity * 4;

  return (
    <motion.svg
      viewBox="0 0 140 168"
      width={108}
      height={130}
      className="block drop-shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
      animate={
        reduce
          ? undefined
          : isSinging
            ? { y: [0, -3, 0, 2, 0] }
            : isPreparing
              ? { y: [0, -1, 0] }
              : { y: 0 }
      }
      transition={
        isSinging
          ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
          : isPreparing
            ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : SPRING
      }
    >
      <defs>
        <radialGradient id="skin" cx="0.45" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="hsl(28 50% 80%)" />
          <stop offset="100%" stopColor="hsl(25 45% 62%)" />
        </radialGradient>
        <radialGradient id="cheek" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(8 80% 65% / 0.7)" />
          <stop offset="100%" stopColor="hsl(8 80% 65% / 0)" />
        </radialGradient>
        <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(0 0% 14%)" />
          <stop offset="100%" stopColor="hsl(0 0% 6%)" />
        </linearGradient>
      </defs>

      <FloatingNote show={isSinging} side="left" />
      <FloatingNote show={isSinging && intensity > 0.4} side="right" delay={0.6} />

      {/* BODY */}
      <motion.g
        animate={
          reduce
            ? undefined
            : isSinging
              ? { scaleY: 1 + intensity * 0.04 }
              : { scaleY: 1 }
        }
        transition={SOFT}
        style={{ transformOrigin: "70px 130px" }}
      >
        {/* Tailcoat */}
        <path
          d="M 28 110 Q 32 120, 40 122 L 40 160 L 100 160 L 100 122 Q 108 120, 112 110 Q 110 105, 100 110 Q 90 116, 70 116 Q 50 116, 40 110 Q 30 105, 28 110 Z"
          fill="url(#coat)"
          stroke="hsl(0 0% 4%)"
          strokeWidth="1"
        />
        {/* White waistcoat */}
        <path
          d="M 55 116 L 55 160 L 85 160 L 85 116 L 70 122 Z"
          fill="hsl(40 25% 94%)"
          stroke="hsl(35 15% 80%)"
          strokeWidth="0.8"
        />
        {[124, 132, 140, 148].map((y) => (
          <circle key={y} cx="70" cy={y} r="1.4" fill="hsl(38 60% 55%)" stroke="hsl(35 50% 40%)" strokeWidth="0.4" />
        ))}
        {/* Bow tie */}
        <g>
          <path d="M 56 117 L 64 113 L 64 121 Z" fill="hsl(40 25% 94%)" stroke="hsl(35 15% 70%)" strokeWidth="0.6" />
          <path d="M 84 117 L 76 113 L 76 121 Z" fill="hsl(40 25% 94%)" stroke="hsl(35 15% 70%)" strokeWidth="0.6" />
          <ellipse cx="70" cy="117" rx="3" ry="2.5" fill="hsl(40 25% 94%)" stroke="hsl(35 15% 70%)" strokeWidth="0.6" />
        </g>

        {/* Left arm */}
        <motion.g
          animate={isSinging ? { rotate: [-30, -25, -32, -22, -30] } : { rotate: -8 }}
          transition={
            isSinging
              ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
              : SOFT
          }
          style={{ transformOrigin: "32px 118px" }}
        >
          <path
            d="M 32 116 Q 18 120, 8 130 Q 6 134, 12 138 Q 20 134, 26 132 L 32 124 Z"
            fill="url(#coat)"
            stroke="hsl(0 0% 4%)"
            strokeWidth="0.8"
          />
          <rect x="6" y="132" width="10" height="4" fill="hsl(40 25% 94%)" stroke="hsl(35 15% 70%)" strokeWidth="0.4" />
          <ellipse cx="6" cy="138" rx="5" ry="4" fill="hsl(28 50% 75%)" stroke="hsl(22 45% 50%)" strokeWidth="0.7" />
        </motion.g>

        {/* Right arm with handkerchief */}
        <motion.g
          animate={isSinging ? { rotate: [30, 25, 32, 22, 30] } : { rotate: 8 }}
          transition={
            isSinging
              ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
              : SOFT
          }
          style={{ transformOrigin: "108px 118px" }}
        >
          <path
            d="M 108 116 Q 122 120, 132 130 Q 134 134, 128 138 Q 120 134, 114 132 L 108 124 Z"
            fill="url(#coat)"
            stroke="hsl(0 0% 4%)"
            strokeWidth="0.8"
          />
          <rect x="124" y="132" width="10" height="4" fill="hsl(40 25% 94%)" stroke="hsl(35 15% 70%)" strokeWidth="0.4" />
          <ellipse cx="134" cy="138" rx="5" ry="4" fill="hsl(28 50% 75%)" stroke="hsl(22 45% 50%)" strokeWidth="0.7" />
          <motion.g
            animate={isSinging ? { rotate: [-3, 5, -3, 4, -3], y: [0, 1, 0] } : { rotate: 0, y: 0 }}
            transition={
              isSinging
                ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                : SOFT
            }
            style={{ transformOrigin: "134px 142px" }}
          >
            <rect x="130" y="142" width="4" height="14" fill="hsl(140 70% 40%)" />
            <rect x="134" y="142" width="4" height="14" fill="hsl(40 30% 95%)" />
            <rect x="138" y="142" width="4" height="14" fill="hsl(5 78% 52%)" />
          </motion.g>
        </motion.g>
      </motion.g>

      {/* HEAD */}
      <motion.g
        animate={
          reduce
            ? undefined
            : isSinging
              ? { rotate: [0, -2, 0, 2, 0], scale: 1 + intensity * 0.03 }
              : isPreparing
                ? { rotate: [0, 1, 0, -1, 0] }
                : { rotate: 0, scale: 1 }
        }
        transition={
          isSinging
            ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            : isPreparing
              ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
              : SPRING
        }
        style={{ transformOrigin: "70px 65px" }}
      >
        {/* Hair flowing back */}
        <path
          d="M 30 38 Q 28 32, 35 25 Q 42 18, 55 18 Q 70 16, 85 19 Q 100 22, 108 32 Q 112 42, 108 55 Q 110 70, 105 80 L 95 75 Q 100 60, 96 48 Q 92 38, 80 35 L 65 36 Q 50 36, 40 42 Q 35 50, 38 65 Q 38 75, 32 75 Q 28 60, 30 38 Z"
          fill="hsl(0 0% 8%)"
        />

        {/* Face */}
        <ellipse cx="70" cy="60" rx="38" ry="42" fill="url(#skin)" stroke="hsl(22 45% 48%)" strokeWidth="1" />

        {/* Hair top */}
        <path
          d="M 40 35 Q 50 24, 70 22 Q 90 24, 100 35 Q 105 28, 95 22 Q 80 14, 70 14 Q 55 14, 45 22 Q 35 28, 40 35 Z"
          fill="hsl(0 0% 9%)"
        />
        {/* Sideburns */}
        <path d="M 35 50 Q 33 65, 40 78 Q 38 85, 36 75 Q 33 65, 35 50 Z" fill="hsl(0 0% 9%)" />
        <path d="M 105 50 Q 107 65, 100 78 Q 102 85, 104 75 Q 107 65, 105 50 Z" fill="hsl(0 0% 9%)" />

        {/* Eyebrows */}
        <motion.g
          animate={isSinging ? { y: [-1, -3, -1, -3, -1] } : { y: 0 }}
          transition={
            isSinging
              ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
              : SPRING
          }
        >
          <path d="M 46 51 Q 53 47, 60 51 L 60 54 Q 53 50, 46 54 Z" fill="hsl(0 0% 8%)" />
          <path d="M 80 51 Q 87 47, 94 51 L 94 54 Q 87 50, 80 54 Z" fill="hsl(0 0% 8%)" />
        </motion.g>

        {/* Eyes */}
        {isSinging ? (
          <g>
            <path d="M 49 60 Q 53 56, 57 60" stroke="hsl(0 0% 8%)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 83 60 Q 87 56, 91 60" stroke="hsl(0 0% 8%)" strokeWidth="2" strokeLinecap="round" fill="none" />
            {intensity > 0.5 && (
              <motion.path
                d="M 50 64 Q 49 72, 51 78"
                stroke="hsl(195 70% 75%)"
                strokeWidth="1.6"
                fill="hsl(195 70% 80% / 0.7)"
                strokeLinecap="round"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </g>
        ) : (
          <g>
            <ellipse cx="53" cy="60" rx="2.3" ry="2.8" fill="hsl(0 0% 8%)" />
            <ellipse cx="87" cy="60" rx="2.3" ry="2.8" fill="hsl(0 0% 8%)" />
            <ellipse cx="53.7" cy="59" rx="0.7" ry="0.9" fill="hsl(40 30% 95%)" />
            <ellipse cx="87.7" cy="59" rx="0.7" ry="0.9" fill="hsl(40 30% 95%)" />
          </g>
        )}

        {/* Cheeks flushed */}
        {isSinging && (
          <g>
            <ellipse cx="46" cy="74" rx="6" ry="5" fill="url(#cheek)" />
            <ellipse cx="94" cy="74" rx="6" ry="5" fill="url(#cheek)" />
          </g>
        )}

        {/* Nose */}
        <path
          d="M 64 60 Q 60 70, 62 78 Q 65 82, 70 82 Q 75 82, 78 78 Q 80 70, 76 60 Q 70 58, 64 60 Z"
          fill="hsl(15 55% 70%)"
          stroke="hsl(8 60% 45%)"
          strokeWidth="0.9"
        />
        <ellipse cx="66" cy="78" rx="1.5" ry="1" fill="hsl(8 60% 35%)" />
        <ellipse cx="74" cy="78" rx="1.5" ry="1" fill="hsl(8 60% 35%)" />

        {/* Mustache */}
        <motion.path
          d="M 50 84 Q 60 80, 70 82 Q 80 80, 90 84 Q 86 88, 78 86 Q 73 88, 70 86 Q 67 88, 62 86 Q 54 88, 50 84 Z"
          fill="hsl(0 0% 8%)"
          stroke="hsl(0 0% 4%)"
          strokeWidth="0.7"
          animate={isSinging ? { y: [0, 1, 0] } : { y: 0 }}
          transition={
            isSinging
              ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
              : SPRING
          }
        />

        {/* Beard */}
        <path
          d="M 38 78 Q 35 100, 50 110 Q 60 116, 70 116 Q 80 116, 90 110 Q 105 100, 102 78 Q 100 90, 90 95 Q 80 100, 70 100 Q 60 100, 50 95 Q 40 90, 38 78 Z"
          fill="hsl(0 0% 9%)"
          stroke="hsl(0 0% 4%)"
          strokeWidth="0.7"
        />

        {/* Mouth */}
        {isSinging ? (
          <g>
            <ellipse
              cx="70"
              cy="95"
              rx={mouthWidthSinging}
              ry={mouthHeightSinging * 0.6}
              fill="hsl(355 65% 12%)"
              stroke="hsl(0 0% 5%)"
              strokeWidth="1.2"
            />
            <ellipse
              cx="70"
              cy={95 + mouthHeightSinging * 0.25}
              rx={mouthWidthSinging * 0.55}
              ry={mouthHeightSinging * 0.18}
              fill="hsl(355 60% 45%)"
            />
            <rect
              x={70 - mouthWidthSinging * 0.6}
              y={95 - mouthHeightSinging * 0.55}
              width={mouthWidthSinging * 1.2}
              height="3"
              fill="hsl(40 30% 92%)"
            />
          </g>
        ) : (
          <path
            d="M 60 92 Q 70 96, 80 92"
            stroke="hsl(0 0% 8%)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </motion.g>
    </motion.svg>
  );
}

function FloatingNote({
  show,
  side,
  delay = 0,
}: {
  show: boolean;
  side: "left" | "right";
  delay?: number;
}) {
  if (!show) return null;
  const x = side === "left" ? 18 : 122;
  return (
    <motion.text
      x={x}
      y="40"
      fontSize="22"
      fill="hsl(40 30% 90%)"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: [0, 1, 1, 0], y: [50, 35, 25, 10], rotate: [0, side === "left" ? -10 : 10, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay }}
      style={{ fontFamily: "serif" }}
    >
      ♪
    </motion.text>
  );
}
