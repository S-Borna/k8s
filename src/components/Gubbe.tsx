import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { useSingingDetector } from "@/hooks/useSingingDetector";
import type { AnthemPhase } from "@/hooks/useSingingDetector";

export function Gubbe() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const reduce = useReducedMotion();
  const { phase, intensity } = useSingingDetector(audio);

  useEffect(() => {
    setAudio(audioRef.current);
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  return (
    <span className="relative -my-2 inline-block align-middle">
      <audio ref={audioRef} src="/inno-bocelli.mp3" preload="auto" />
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={
          phase === "idle"
            ? "Klicka för att starta nationalsången"
            : "Pausa nationalsången"
        }
        className="group relative cursor-pointer rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-amber/50"
      >
        <GubbeSvg
          phase={phase}
          hovered={hovered}
          intensity={intensity}
          reduce={reduce ?? false}
        />
      </button>
    </span>
  );
}

type GubbeSvgProps = {
  phase: AnthemPhase;
  hovered: boolean;
  intensity: number;
  reduce: boolean;
};

const SOFT: Transition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };
const SPRING: Transition = { type: "spring", stiffness: 280, damping: 18 };

function GubbeSvg({ phase, hovered, intensity, reduce }: GubbeSvgProps) {
  const isSinging = phase === "singing";
  const isPreparing = phase === "preparing";
  const isActive = isSinging || isPreparing;

  // Mouth opens larger when intensity is higher
  const mouthHeightSinging = 11 + intensity * 14;

  return (
    <motion.svg
      viewBox="0 0 120 140"
      width={92}
      height={108}
      className="block drop-shadow-[0_6px_22px_rgba(0,0,0,0.45)]"
      animate={
        reduce
          ? undefined
          : isSinging
            ? { y: [0, -2, 0, 2, 0], rotate: [0, -1.5, 0, 1.5, 0] }
            : isPreparing
              ? { y: [0, -1, 0], rotate: [0, -1, 0, 1, 0] }
              : hovered
                ? { y: -3, rotate: -1 }
                : { y: 0, rotate: 0 }
      }
      transition={
        isSinging
          ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
          : isPreparing
            ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            : SPRING
      }
    >
      <defs>
        <radialGradient id="cap-grad" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="hsl(345 45% 38%)" />
          <stop offset="100%" stopColor="hsl(345 55% 22%)" />
        </radialGradient>
        <radialGradient id="head-grad" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="hsl(28 55% 78%)" />
          <stop offset="100%" stopColor="hsl(25 50% 62%)" />
        </radialGradient>
        <radialGradient id="nose-grad" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="hsl(15 60% 65%)" />
          <stop offset="100%" stopColor="hsl(12 65% 50%)" />
        </radialGradient>
        <radialGradient id="cheek-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(8 80% 65% / 0.85)" />
          <stop offset="100%" stopColor="hsl(8 80% 65% / 0)" />
        </radialGradient>
      </defs>

      {/* Body / vest */}
      <motion.g
        animate={
          reduce
            ? undefined
            : isSinging
              ? { rotate: [0, -3, 0, 3, 0], scaleY: 1 + intensity * 0.04 }
              : isPreparing
                ? { rotate: [0, -2, 0, 2, 0] }
                : hovered
                  ? { rotate: -1 }
                  : { rotate: 0 }
        }
        transition={
          isSinging
            ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            : isPreparing
              ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
              : SOFT
        }
        style={{ transformOrigin: "60px 95px" }}
      >
        {/* Vest */}
        <path
          d="M 35 95 Q 40 122, 60 130 Q 80 122, 85 95 L 80 92 L 60 96 L 40 92 Z"
          fill="hsl(140 35% 28%)"
          stroke="hsl(140 35% 18%)"
          strokeWidth="1"
        />
        {/* Shirt collar */}
        <path
          d="M 52 92 Q 60 100, 68 92 L 60 96 Z"
          fill="hsl(40 30% 92%)"
        />
        {/* Tie */}
        <path
          d="M 58 94 L 62 94 L 63 100 L 60 110 L 57 100 Z"
          fill="hsl(5 75% 50%)"
        />

        {/* Belly hand when singing — "ta i från magen" */}
        <motion.g
          animate={
            isSinging
              ? { y: [0, -1, 0], rotate: [0, -2, 0, 2, 0] }
              : { y: 0, rotate: 0 }
          }
          transition={
            isSinging
              ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
              : SPRING
          }
          style={{ transformOrigin: "78px 110px" }}
        >
          {isActive && (
            <ellipse cx="78" cy="111" rx="6" ry="5" fill="hsl(28 55% 75%)" stroke="hsl(25 45% 55%)" strokeWidth="0.8" />
          )}
        </motion.g>

        {/* Other arm extended outward when singing */}
        <motion.g
          animate={
            isSinging
              ? { rotate: [-22, -18, -22, -16, -22] }
              : isPreparing
                ? { rotate: [-5, -10, -5] }
                : { rotate: 0 }
          }
          transition={
            isSinging
              ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
              : isPreparing
                ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" }
                : SOFT
          }
          style={{ transformOrigin: "40px 100px" }}
        >
          {isActive && (
            <ellipse cx="34" cy="108" rx="5" ry="4.5" fill="hsl(28 55% 75%)" stroke="hsl(25 45% 55%)" strokeWidth="0.8" />
          )}
        </motion.g>
      </motion.g>

      {/* Head wrapper — wobble during prep, sway during singing */}
      <motion.g
        animate={
          reduce
            ? undefined
            : isSinging
              ? { rotate: [0, -1, 0, 1, 0], scale: 1 + intensity * 0.025 }
              : isPreparing
                ? { rotate: [0, 3, -3, 0] }
                : hovered
                  ? { rotate: -2, scale: 1.04 }
                  : { rotate: 0, scale: 1 }
        }
        transition={
          isSinging
            ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
            : isPreparing
              ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              : SPRING
        }
        style={{ transformOrigin: "60px 60px" }}
      >
        {/* Head — extra big as Said wanted */}
        <ellipse cx="60" cy="55" rx="32" ry="34" fill="url(#head-grad)" stroke="hsl(22 45% 48%)" strokeWidth="1" />

        {/* Ears */}
        <ellipse cx="29" cy="55" rx="4" ry="6" fill="hsl(25 50% 62%)" />
        <ellipse cx="91" cy="55" rx="4" ry="6" fill="hsl(25 50% 62%)" />

        {/* Cap (basker / coppola) */}
        <motion.g
          animate={
            isPreparing
              ? { y: [0, -3, 0, -1, 0], rotate: [0, -3, 1, 0] }
              : hovered && !isActive
                ? { y: -1, rotate: -2 }
                : { y: 0, rotate: 0 }
          }
          transition={
            isPreparing
              ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
              : SPRING
          }
          style={{ transformOrigin: "60px 30px" }}
        >
          <path
            d="M 30 32 Q 35 20, 60 19 Q 85 20, 90 32 Q 90 36, 80 36 L 40 36 Q 30 36, 30 32 Z"
            fill="url(#cap-grad)"
            stroke="hsl(345 55% 18%)"
            strokeWidth="1"
          />
          {/* Cap stub */}
          <ellipse cx="68" cy="22" rx="3" ry="2" fill="hsl(345 55% 28%)" />
        </motion.g>

        {/* Eyebrows */}
        <motion.g
          animate={
            isSinging
              ? { y: [-2, -3, -1, -3, -2] }
              : isPreparing
                ? { y: [0, -2, 0] }
                : hovered
                  ? { y: -2 }
                  : { y: 0 }
          }
          transition={
            isSinging
              ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
              : isPreparing
                ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                : SPRING
          }
        >
          <path d="M 42 47 Q 47 44, 53 48" stroke="hsl(0 0% 8%)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 67 48 Q 73 44, 78 47" stroke="hsl(0 0% 8%)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* Eyes — closed in passion when singing */}
        {isSinging ? (
          <g>
            <path d="M 44 56 Q 49 52, 54 56" stroke="hsl(0 0% 8%)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M 66 56 Q 71 52, 76 56" stroke="hsl(0 0% 8%)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g>
            <ellipse cx="49" cy="56" rx="2.5" ry="3" fill="hsl(0 0% 8%)" />
            <ellipse cx="71" cy="56" rx="2.5" ry="3" fill="hsl(0 0% 8%)" />
            <ellipse cx="49.7" cy="55" rx="0.8" ry="1" fill="hsl(40 30% 95%)" />
            <ellipse cx="71.7" cy="55" rx="0.8" ry="1" fill="hsl(40 30% 95%)" />
          </g>
        )}

        {/* Nose — exaggerated big as Said wanted */}
        <motion.g
          animate={
            isPreparing
              ? { rotate: [0, -4, 4, 0], y: [0, -1, 0] }
              : hovered
                ? { y: -1 }
                : { y: 0 }
          }
          transition={
            isPreparing
              ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
              : SPRING
          }
          style={{ transformOrigin: "60px 65px" }}
        >
          <path
            d="M 56 56 Q 53 64, 54 70 Q 55 76, 60 78 Q 65 76, 66 70 Q 67 64, 64 56 Q 60 54, 56 56 Z"
            fill="url(#nose-grad)"
            stroke="hsl(8 60% 42%)"
            strokeWidth="1"
          />
          <ellipse cx="57.5" cy="73" rx="1.5" ry="1" fill="hsl(8 60% 35%)" />
          <ellipse cx="62.5" cy="73" rx="1.5" ry="1" fill="hsl(8 60% 35%)" />
        </motion.g>

        {/* Cheeks — flush when singing */}
        {isSinging && (
          <g>
            <ellipse cx="42" cy="72" rx="6" ry="4" fill="url(#cheek-grad)" />
            <ellipse cx="78" cy="72" rx="6" ry="4" fill="url(#cheek-grad)" />
          </g>
        )}

        {/* Mouth */}
        {isSinging ? (
          <motion.ellipse
            cx="60"
            cy="84"
            rx="8"
            ry={mouthHeightSinging}
            fill="hsl(355 60% 18%)"
            stroke="hsl(0 0% 8%)"
            strokeWidth="1.5"
            animate={{
              ry: [mouthHeightSinging * 0.7, mouthHeightSinging, mouthHeightSinging * 0.85, mouthHeightSinging * 1.05, mouthHeightSinging * 0.8],
            }}
            transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : isPreparing ? (
          <motion.path
            animate={{ d: ["M 50 86 Q 60 90, 70 86", "M 50 84 Q 60 88, 70 84", "M 50 88 Q 60 84, 70 88", "M 50 86 Q 60 89, 70 86"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            stroke="hsl(0 0% 8%)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d={hovered ? "M 50 84 Q 60 91, 70 84" : "M 50 86 Q 60 88, 70 86"}
            stroke="hsl(0 0% 8%)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Mustache — twitches on hover, flutters when singing */}
        <motion.g
          animate={
            isSinging
              ? { y: [0, 1, 0, -1, 0], scaleX: [1, 1.04, 1, 1.06, 1] }
              : isPreparing
                ? { rotate: [0, -3, 3, -2, 0], y: [0, -1, 0] }
                : hovered
                  ? { rotate: [0, -3, 3, 0], y: -0.5 }
                  : { rotate: 0, y: 0 }
          }
          transition={
            isSinging
              ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
              : isPreparing
                ? { duration: 1.0, repeat: Infinity, ease: "easeInOut" }
                : hovered
                  ? { duration: 0.6, ease: "easeInOut" }
                  : SPRING
          }
          style={{ transformOrigin: "60px 80px" }}
        >
          <path
            d="M 40 80 Q 48 76, 60 80 Q 72 76, 80 80 Q 76 84, 70 82 Q 65 86, 60 82 Q 55 86, 50 82 Q 44 84, 40 80 Z"
            fill="hsl(0 0% 8%)"
            stroke="hsl(0 0% 4%)"
            strokeWidth="0.8"
          />
        </motion.g>
      </motion.g>

      {/* Play indicator dot */}
      {!isActive && hovered && (
        <motion.circle
          cx="60"
          cy="135"
          r="2.5"
          fill="hsl(35 95% 62%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.svg>
  );
}
