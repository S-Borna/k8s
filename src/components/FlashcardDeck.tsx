import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import type { Flashcard } from "@/types";
import { FlashcardView } from "@/components/FlashcardView";
import { useAppState } from "@/hooks/useAppState";
import {
  initialFlashcardState,
  recordReview,
  type ReviewResult,
} from "@/lib/spacedRepetition";
import { spring, staggerChild } from "@/lib/motion";

type Props = {
  cards: Flashcard[];
  emptyTitle?: string;
  emptyDescription?: string;
  onRestart?: () => void;
};

type SessionStats = {
  right: number;
  half: number;
  wrong: number;
};

export function FlashcardDeck({
  cards,
  emptyTitle = "Inga kort att repetera just nu",
  emptyDescription = "Kom tillbaka när det finns nytt eller schemalagt.",
  onRestart,
}: Props) {
  const { setState } = useAppState();
  const deck = useMemo(() => cards.slice(), [cards]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ right: 0, half: 0, wrong: 0 });
  const [done, setDone] = useState(false);

  const current = deck[index];
  const total = deck.length;

  const grade = useCallback(
    (result: ReviewResult) => {
      if (!current) return;
      const cardId = current.id;
      setState((prev) => {
        const prevState = prev.flashcardState[cardId] ?? initialFlashcardState();
        return {
          ...prev,
          flashcardState: {
            ...prev.flashcardState,
            [cardId]: recordReview(prevState, result),
          },
        };
      });
      setStats((s) => ({
        right: s.right + (result === "right" ? 1 : 0),
        half: s.half + (result === "half" ? 1 : 0),
        wrong: s.wrong + (result === "wrong" ? 1 : 0),
      }));
      if (index + 1 >= total) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
    },
    [current, index, setState, total],
  );

  const flip = useCallback(() => setFlipped((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (done) return;
      if (e.code === "Space") {
        e.preventDefault();
        flip();
        return;
      }
      if (!flipped) return;
      if (e.key === "1") grade("wrong");
      else if (e.key === "2") grade("half");
      else if (e.key === "3") grade("right");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, flipped, grade, done]);

  if (total === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (done) {
    return (
      <SessionDone
        stats={stats}
        total={total}
        onRestart={() => {
          setIndex(0);
          setFlipped(false);
          setStats({ right: 0, half: 0, wrong: 0 });
          setDone(false);
          onRestart?.();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-text-muted">
        <div>
          <span className="text-text">{index + 1}</span> / {total} kort
        </div>
        <div className="hidden gap-3 md:flex">
          <Hint label="Space" desc="Vänd" />
          <Hint label="1" desc="Kunde inte" />
          <Hint label="2" desc="Delvis" />
          <Hint label="3" desc="Kunde" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={spring}
          >
            <FlashcardView card={current} flipped={flipped} onFlip={flip} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            <GradeButton
              label="Kunde inte"
              shortcut="1"
              tone="rose"
              onClick={() => grade("wrong")}
            />
            <GradeButton
              label="Delvis"
              shortcut="2"
              tone="amber"
              onClick={() => grade("half")}
            />
            <GradeButton
              label="Kunde"
              shortcut="3"
              tone="sage"
              onClick={() => grade("right")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GradeButton({
  label,
  shortcut,
  tone,
  onClick,
}: {
  label: string;
  shortcut: string;
  tone: "rose" | "amber" | "sage";
  onClick: () => void;
}) {
  const toneClasses = {
    rose: "border-rose/30 hover:border-rose hover:bg-rose/10 text-rose",
    amber: "border-amber/30 hover:border-amber hover:bg-amber/10 text-amber",
    sage: "border-sage/30 hover:border-sage hover:bg-sage/10 text-sage",
  }[tone];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={`group flex flex-col items-center gap-1 rounded-2xl border bg-surface/40 px-4 py-3 transition ${toneClasses}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[10px] uppercase tracking-wider text-text-faint">
        {shortcut}
      </span>
    </motion.button>
  );
}

function Hint({ label, desc }: { label: string; desc: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="rounded border border-border/60 bg-surface/60 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
        {label}
      </kbd>
      <span>{desc}</span>
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      variants={staggerChild}
      initial="initial"
      animate="enter"
      className="glass rounded-3xl p-10 text-center"
    >
      <Sparkles className="mx-auto mb-3 text-amber" size={22} />
      <p className="font-display text-xl text-text">{title}</p>
      <p className="mt-2 text-sm text-text-muted">{description}</p>
    </motion.div>
  );
}

function SessionDone({
  stats,
  total,
  onRestart,
}: {
  stats: SessionStats;
  total: number;
  onRestart: () => void;
}) {
  const pct = Math.round((stats.right / total) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="glass rounded-3xl p-8 text-center"
    >
      <CheckCircle2 className="mx-auto mb-3 text-amber" size={28} />
      <h3 className="font-display text-2xl text-text">Sessionen klar</h3>
      <p className="mt-1 text-sm text-text-muted">
        {total} kort · {pct}% kunde
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
        <ResultPill label="Kunde" value={stats.right} tone="text-sage" />
        <ResultPill label="Delvis" value={stats.half} tone="text-amber" />
        <ResultPill label="Kunde inte" value={stats.wrong} tone="text-rose" />
      </div>
      <motion.button
        onClick={onRestart}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/40 hover:text-amber"
      >
        <RotateCcw size={14} />
        Kör en till runda
      </motion.button>
    </motion.div>
  );
}

function ResultPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/30 px-3 py-3">
      <div className={`font-display text-2xl ${tone}`}>{value}</div>
      <div className="mt-0.5 text-text-faint">{label}</div>
    </div>
  );
}

