import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import type { Flashcard } from "@/types";
import { FlashcardView } from "@/components/FlashcardView";
import { spring } from "@/lib/motion";
import { useAppState } from "@/hooks/useAppState";
import { initialFlashcardState, recordReview } from "@/lib/spacedRepetition";

type Props = {
  cards: Flashcard[];
  count?: number;
  onPass: () => void;
};

type Phase = "intro" | "quiz" | "done";

export function ExitQuiz({ cards, count = 3, onPass }: Props) {
  const { setState } = useAppState();
  const [phase, setPhase] = useState<Phase>("intro");
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState(0);

  const start = useCallback(() => {
    if (cards.length === 0) return;
    const shuffled = cards.slice().sort(() => Math.random() - 0.5);
    setDeck(shuffled.slice(0, Math.min(count, cards.length)));
    setIndex(0);
    setFlipped(false);
    setScore(0);
    setPhase("quiz");
  }, [cards, count]);

  const grade = useCallback(
    (correct: boolean) => {
      const card = deck[index];
      if (!card) return;
      setState((prev) => {
        const prevCard = prev.flashcardState[card.id] ?? initialFlashcardState();
        return {
          ...prev,
          flashcardState: {
            ...prev.flashcardState,
            [card.id]: recordReview(prevCard, correct ? "right" : "wrong"),
          },
        };
      });
      if (correct) setScore((s) => s + 1);
      if (index + 1 >= deck.length) {
        setPhase("done");
      } else {
        setIndex(index + 1);
        setFlipped(false);
      }
    },
    [deck, index, setState],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "quiz") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((v) => !v);
        return;
      }
      if (!flipped) return;
      if (e.key === "1") grade(false);
      else if (e.key === "2") grade(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, grade, phase]);

  const passThreshold = Math.ceil(count * (2 / 3));
  const passed = score >= passThreshold;

  if (cards.length === 0) return null;

  if (phase === "intro") {
    return <IntroCard count={Math.min(count, cards.length)} onStart={start} />;
  }

  if (phase === "done") {
    return (
      <ResultCard
        score={score}
        total={deck.length}
        threshold={passThreshold}
        passed={passed}
        onRetry={start}
        onPass={onPass}
      />
    );
  }

  const card = deck[index];
  if (!card) return null;

  return (
    <div className="mt-10 rounded-3xl border border-amber/30 bg-amber/[0.04] p-5 md:p-7">
      <div className="mb-4 flex items-center justify-between text-xs text-text-muted">
        <div className="inline-flex items-center gap-2 text-amber">
          <ShieldCheck size={14} />
          Exit-quiz · {index + 1} / {deck.length}
        </div>
        <div className="text-text-faint">Tryck space för att se svaret</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
        >
          <FlashcardView
            card={card}
            flipped={flipped}
            onFlip={() => setFlipped((v) => !v)}
          />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="mt-5 grid grid-cols-2 gap-3"
          >
            <GradeButton
              label="Visste inte"
              shortcut="1"
              tone="rose"
              icon={<X size={14} />}
              onClick={() => grade(false)}
            />
            <GradeButton
              label="Visste"
              shortcut="2"
              tone="sage"
              icon={<Check size={14} />}
              onClick={() => grade(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IntroCard({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mt-10 rounded-3xl border border-amber/20 bg-amber/[0.04] p-6 md:p-7"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
            Exit-quiz
          </div>
          <div className="mt-0.5 font-display text-xl text-text">
            Testa att du kan kapitlet
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {count} slumpade kort från det här kapitlet. Klara minst {Math.ceil(count * (2 / 3))} av {count} för att markera kapitlet klart.
          </p>
        </div>
      </div>
      <motion.button
        onClick={onStart}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber px-4 py-2 text-sm font-medium text-bg hover:brightness-110"
      >
        <Sparkles size={14} />
        Kör exit-quiz
      </motion.button>
    </motion.div>
  );
}

function ResultCard({
  score,
  total,
  threshold,
  passed,
  onRetry,
  onPass,
}: {
  score: number;
  total: number;
  threshold: number;
  passed: boolean;
  onRetry: () => void;
  onPass: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={`mt-10 rounded-3xl border p-6 md:p-7 ${
        passed
          ? "border-sage/30 bg-sage/[0.06]"
          : "border-rose/30 bg-rose/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            passed ? "bg-sage/15 text-sage" : "bg-rose/15 text-rose"
          }`}
        >
          {passed ? <Check size={18} /> : <RotateCcw size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-[11px] uppercase tracking-[0.18em] ${
              passed ? "text-sage" : "text-rose"
            }`}
          >
            {passed ? "Godkänt" : "Inte än"}
          </div>
          <div className="mt-0.5 font-display text-xl text-text">
            {score} av {total} rätt
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {passed
              ? `Över gränsen (${threshold}/${total}) — du kan markera kapitlet klart.`
              : `Behöver minst ${threshold}/${total}. Läs om Sammanfattningen och försök igen.`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {passed && (
          <motion.button
            onClick={onPass}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-bg hover:brightness-110"
          >
            <Check size={14} />
            Markera kapitel klart
          </motion.button>
        )}
        <motion.button
          onClick={onRetry}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/40 hover:text-amber"
        >
          <RotateCcw size={14} />
          Kör igen
        </motion.button>
      </div>
    </motion.div>
  );
}

function GradeButton({
  label,
  shortcut,
  tone,
  icon,
  onClick,
}: {
  label: string;
  shortcut: string;
  tone: "rose" | "sage";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const toneClasses = {
    rose: "border-rose/30 hover:border-rose hover:bg-rose/10 text-rose",
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
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-text-faint">
        {shortcut}
      </span>
    </motion.button>
  );
}
