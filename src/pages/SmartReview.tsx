import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type { Flashcard, MockExamGrade } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { MarkdownContent } from "@/components/MarkdownContent";
import { chapters, mockExamQuestions } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { buildSmartReview, type SmartReviewDeck } from "@/lib/smartReview";
import { staggerChild, staggerParent, spring } from "@/lib/motion";

type Phase = "intro" | "cards" | "mock" | "done";

export default function SmartReview() {
  const { state, setState } = useAppState();
  const [phase, setPhase] = useState<Phase>("intro");
  const [mockGrade, setMockGrade] = useState<MockExamGrade | null>(null);

  const activeChapterIds = useMemo(
    () => chapters.filter((c) => !c.skipped).map((c) => c.id),
    [],
  );
  const allCards = useMemo(
    () =>
      chapters
        .filter((c) => !c.skipped)
        .flatMap((c) => c.flashcards),
    [],
  );

  const deck = useMemo<SmartReviewDeck>(
    () => buildSmartReview(allCards, state, mockExamQuestions, { activeChapterIds }),
    [allCards, state, activeChapterIds],
  );

  const combinedCards: Flashcard[] = useMemo(
    () => [...deck.dueCards, ...deck.weakSpotCards, ...deck.freshCards],
    [deck],
  );

  const recordMock = useCallback(
    (grade: MockExamGrade) => {
      if (!deck.mockQuestion) return;
      setMockGrade(grade);
      setState((prev) => ({
        ...prev,
        mockExamHistory: [
          ...prev.mockExamHistory,
          {
            date: new Date().toISOString(),
            score: grade === "right" ? 1 : grade === "half" ? 0.5 : 0,
            total: 1,
            questionResults: [
              { questionId: deck.mockQuestion!.id, grade },
            ],
          },
        ],
      }));
    },
    [deck.mockQuestion, setState],
  );

  function startSession() {
    if (combinedCards.length > 0) {
      setPhase("cards");
    } else if (deck.mockQuestion) {
      setPhase("mock");
    } else {
      setPhase("done");
    }
  }

  function cardsDone() {
    if (deck.mockQuestion) setPhase("mock");
    else setPhase("done");
  }

  function reset() {
    setPhase("intro");
    setMockGrade(null);
  }

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Smart kombination för dagens session"
        title="Plugga nu"
        description={
          <>
            Due-kort + svaga ämnen + 1 ny + en mock-fråga.
            <br />
            Ett klick och ~15 minuters fokuserad plugg.
          </>
        }
      />

      {phase === "intro" && (
        <IntroPhase deck={deck} onStart={startSession} />
      )}

      {phase === "cards" && (
        <CardsPhase
          deck={deck}
          combined={combinedCards}
          onDone={cardsDone}
        />
      )}

      {phase === "mock" && deck.mockQuestion && (
        <MockPhase
          question={deck.mockQuestion}
          onGrade={(g) => {
            recordMock(g);
            setPhase("done");
          }}
        />
      )}

      {phase === "done" && (
        <DonePhase deck={deck} mockGrade={mockGrade} onReset={reset} />
      )}
    </motion.div>
  );
}

function IntroPhase({
  deck,
  onStart,
}: {
  deck: SmartReviewDeck;
  onStart: () => void;
}) {
  const total =
    deck.dueCards.length +
    deck.weakSpotCards.length +
    deck.freshCards.length +
    (deck.mockQuestion ? 1 : 0);

  if (total === 0) {
    return (
      <motion.div variants={staggerChild} className="glass rounded-3xl p-10 text-center">
        <Sparkles className="mx-auto mb-3 text-amber" size={24} />
        <p className="font-display text-xl text-text">Inget att plugga just nu</p>
        <p className="mt-2 text-sm text-text-muted">
          Inga due-kort, inga svaga ämnen, inga nya kort i pool. Bra jobbat — kom
          tillbaka imorgon eller skapa fler kort i content-source.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerChild} className="grid gap-4 md:grid-cols-2">
      <StatTile
        icon={<Flame size={18} />}
        eyebrow="Due idag"
        value={String(deck.dueCards.length)}
        suffix="kort att repetera"
        tone="amber"
      />
      <StatTile
        icon={<Target size={18} />}
        eyebrow={
          deck.weakSpotTag
            ? `Svag tag: ${deck.weakSpotTag}`
            : "Inga svaga ämnen"
        }
        value={String(deck.weakSpotCards.length)}
        suffix="extra kort"
        tone="rose"
      />
      <StatTile
        icon={<Layers size={18} />}
        eyebrow="Nya"
        value={String(deck.freshCards.length)}
        suffix="orörda kort"
        tone="sage"
      />
      <StatTile
        icon={<GraduationCap size={18} />}
        eyebrow="Mock-fråga"
        value={deck.mockQuestion ? "1" : "0"}
        suffix={deck.mockQuestion ? "tenta-stil" : "ingen pool"}
        tone="amber"
      />

      <motion.div className="md:col-span-2">
        <motion.button
          onClick={onStart}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          className="group flex w-full items-center justify-between gap-4 rounded-3xl bg-amber p-6 text-bg transition hover:brightness-110"
        >
          <div className="text-left">
            <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">
              Starta session
            </div>
            <div className="mt-1 font-display text-2xl">
              {total} moment · ~{Math.max(5, total * 1)} min
            </div>
          </div>
          <Zap size={24} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function StatTile({
  icon,
  eyebrow,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  value: string;
  suffix: string;
  tone: "amber" | "rose" | "sage";
}) {
  const toneClasses = {
    amber: "bg-amber/15 text-amber",
    rose: "bg-rose/15 text-rose",
    sage: "bg-sage/15 text-sage",
  }[tone];
  return (
    <motion.div variants={staggerChild} className="glass rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            {eyebrow}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl text-text">{value}</span>
            <span className="text-xs text-text-muted">{suffix}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CardsPhase({
  deck,
  combined,
  onDone,
}: {
  deck: SmartReviewDeck;
  combined: Flashcard[];
  onDone: () => void;
}) {
  return (
    <motion.div variants={staggerChild}>
      <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
        {deck.dueCards.length > 0 && (
          <Pill icon={<Flame size={11} />} tone="amber">
            {deck.dueCards.length} due
          </Pill>
        )}
        {deck.weakSpotCards.length > 0 && deck.weakSpotTag && (
          <Pill icon={<Target size={11} />} tone="rose">
            {deck.weakSpotCards.length} svaga: {deck.weakSpotTag}
          </Pill>
        )}
        {deck.freshCards.length > 0 && (
          <Pill icon={<Layers size={11} />} tone="sage">
            {deck.freshCards.length} nya
          </Pill>
        )}
      </div>

      <FlashcardDeck
        cards={combined}
        emptyTitle="Inga kort att repetera"
        emptyDescription="Hoppa direkt till mock-frågan."
        onRestart={onDone}
      />

      <div className="mt-6 flex justify-end">
        <button
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/40 hover:text-amber"
        >
          Hoppa till mock-fråga
          <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function MockPhase({
  question,
  onGrade,
}: {
  question: import("@/types").MockExamQuestion;
  onGrade: (grade: MockExamGrade) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div variants={staggerChild} className="glass rounded-3xl p-6 md:p-8">
      <div className="mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber">
        <GraduationCap size={14} />
        Mock-fråga · {question.difficulty}
      </div>
      <p className="font-display text-xl text-text md:text-2xl">{question.question}</p>

      {!revealed ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Skriv ditt svar i Giacomos stil — fokus på VARFÖR."
            className="mt-5 min-h-[200px] w-full resize-y rounded-2xl border border-border/60 bg-bg/40 p-4 text-[15px] leading-relaxed text-text placeholder:text-text-faint focus:border-amber/40 focus:outline-none"
          />
          <div className="mt-4 flex justify-end">
            <motion.button
              onClick={() => setRevealed(true)}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              className="inline-flex items-center gap-2 rounded-xl bg-amber px-4 py-2 text-sm font-medium text-bg hover:brightness-110"
            >
              Visa modellsvar
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Modellsvar
          </div>
          <div className="mt-2 rounded-2xl border border-border/60 bg-surface/30 p-4">
            <MarkdownContent source={question.modelAnswer} />
          </div>

          {answer.trim() && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
                Ditt svar
              </div>
              <div className="mt-2 rounded-2xl border border-border/60 bg-surface/20 p-4 text-sm text-text">
                {answer}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <GradeBtn label="Fel" tone="rose" onClick={() => onGrade("wrong")} />
            <GradeBtn label="Delvis" tone="amber" onClick={() => onGrade("half")} />
            <GradeBtn label="Rätt" tone="sage" onClick={() => onGrade("right")} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function DonePhase({
  deck,
  mockGrade,
  onReset,
}: {
  deck: SmartReviewDeck;
  mockGrade: MockExamGrade | null;
  onReset: () => void;
}) {
  const cardsCount =
    deck.dueCards.length + deck.weakSpotCards.length + deck.freshCards.length;
  return (
    <motion.div variants={staggerChild} className="glass rounded-3xl p-8 text-center">
      <Check className="mx-auto mb-3 text-sage" size={28} />
      <h3 className="font-display text-2xl text-text">Sessionen klar</h3>
      <p className="mt-2 text-sm text-text-muted">
        {cardsCount} kort · {deck.mockQuestion ? "1 mock-fråga" : "0 mock-frågor"}
        {mockGrade && ` · graderad ${labelForGrade(mockGrade)}`}
      </p>
      <motion.button
        onClick={onReset}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/40 hover:text-amber"
      >
        <RotateCcw size={14} />
        Ny session
      </motion.button>
    </motion.div>
  );
}

function labelForGrade(g: MockExamGrade): string {
  return g === "right" ? "rätt" : g === "half" ? "delvis" : "fel";
}

function Pill({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "amber" | "rose" | "sage";
  children: React.ReactNode;
}) {
  const toneClasses = {
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    sage: "border-sage/30 bg-sage/10 text-sage",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${toneClasses}`}>
      {icon}
      {children}
    </span>
  );
}

function GradeBtn({
  label,
  tone,
  onClick,
}: {
  label: string;
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
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={`rounded-2xl border bg-surface/40 px-4 py-3 text-sm transition ${toneClasses}`}
    >
      {label}
    </motion.button>
  );
}
