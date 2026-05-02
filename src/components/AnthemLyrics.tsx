import { AnimatePresence, motion } from "motion/react";
import { Music } from "lucide-react";
import type { AnthemState } from "@/hooks/useAnthemState";
import { LYRICS, SING_START_SEC } from "@/lib/anthemConfig";

type Props = {
  state: AnthemState;
};

export function AnthemLyrics({ state }: Props) {
  const { phase, currentTime, activeLyricIndex } = state;
  const visible = phase !== "idle";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative mb-8 overflow-hidden rounded-2xl px-6 py-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(140_70%_40%/0.06)] via-transparent to-[hsl(5_78%_52%/0.06)]" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber/15 text-amber">
              <Music size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
                {phase === "preparing" ? "Inno di Mameli · Bocelli förbereder sig" : "Inno di Mameli"}
              </div>
              <div className="mt-3">
                {phase === "preparing" ? (
                  <PrepCountdown currentTime={currentTime} />
                ) : (
                  <KaraokeStack activeIndex={activeLyricIndex} />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PrepCountdown({ currentTime }: { currentTime: number }) {
  const remaining = Math.max(0, SING_START_SEC - currentTime);
  const pct = Math.min(100, (currentTime / SING_START_SEC) * 100);
  return (
    <div>
      <div className="font-display text-xl text-text-muted italic">
        Snart börjar han sjunga…
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full bg-gradient-to-r from-[hsl(140_70%_45%)] via-[hsl(40_50%_92%)] to-[hsl(5_78%_55%)]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
        </div>
        <span className="font-mono text-xs text-text-faint tabular-nums">
          {remaining.toFixed(0)}s
        </span>
      </div>
    </div>
  );
}

function KaraokeStack({ activeIndex }: { activeIndex: number }) {
  if (activeIndex < 0) {
    return (
      <div className="font-display text-xl text-text-muted italic">
        Han andas in…
      </div>
    );
  }

  const prev = LYRICS[activeIndex - 1];
  const current = LYRICS[activeIndex];
  const next = LYRICS[activeIndex + 1];

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {prev && (
          <motion.div
            key={`prev-${activeIndex - 1}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="font-display text-base italic text-text-faint"
          >
            {prev.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={`current-${activeIndex}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-2xl italic leading-snug md:text-3xl"
          >
            <ItalianFlagText text={current.text} />
          </motion.div>
        )}
      </AnimatePresence>

      {next && (
        <motion.div
          key={`next-${activeIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 0.5 }}
          className="font-display text-base italic text-text-muted"
        >
          {next.text}
        </motion.div>
      )}
    </div>
  );
}

function ItalianFlagText({ text }: { text: string }) {
  return <span className="italian-flag">{text}</span>;
}
