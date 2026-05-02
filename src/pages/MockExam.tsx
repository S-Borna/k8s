import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  History,
  Sparkles,
} from "lucide-react";
import { Select } from "@/components/Select";
import type { SelectOption } from "@/components/Select";
import type { MockExamGrade, MockExamQuestion, MockExamRun } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownContent } from "@/components/MarkdownContent";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import { chapters, mockExamQuestions } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { buildRun, pickQuestions, weakChapters } from "@/lib/mockExam";

type Phase = "answering" | "reviewing" | "done";

const chapterFilterOptions: SelectOption<string>[] = [
  { value: "all", label: "Alla kapitel" },
  ...chapters
    .filter((c) => !c.skipped)
    .map((c) => ({
      value: String(c.id),
      label: c.titleSv,
      hint: `Kap ${String(c.id).padStart(2, "0")}`,
    })),
];

export default function MockExam() {
  const { state, setState } = useAppState();
  const [active, setActive] = useState<MockExamQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, MockExamGrade>>({});
  const [phase, setPhase] = useState<Phase>("answering");

  function start(count: number, chapterFilter: number | null) {
    const qs = pickQuestions(mockExamQuestions, count, chapterFilter);
    setActive(qs);
    setIndex(0);
    setAnswers({});
    setGrades({});
    setPhase("answering");
  }

  function reveal() {
    setPhase("reviewing");
  }

  function next(grade: MockExamGrade) {
    if (!active) return;
    const q = active[index];
    if (!q) return;
    const nextGrades = { ...grades, [q.id]: grade };
    setGrades(nextGrades);
    if (index + 1 >= active.length) {
      const run = buildRun(active, nextGrades);
      setState((prev) => ({
        ...prev,
        mockExamHistory: [...prev.mockExamHistory, run],
      }));
      setPhase("done");
    } else {
      setIndex(index + 1);
      setPhase("answering");
    }
  }

  function quit() {
    setActive(null);
    setIndex(0);
    setAnswers({});
    setGrades({});
    setPhase("answering");
  }

  if (!active) {
    return (
      <motion.div variants={staggerParent} initial="initial" animate="enter">
        <PageHeader
          eyebrow="Skriftliga svar"
          title="Mock-tenta"
          description="Slumpade frågor i Giacomos stil — fokus på att förklara varför, inte bara vad. Skriv svar fritt, jämför med facit, betygsätt själv."
        />
        <StartScreen onStart={start} />
        <HistorySection history={state.mockExamHistory} />
      </motion.div>
    );
  }

  const current = active[index];
  if (!current) return null;

  if (phase === "done") {
    const run = buildRun(active, grades);
    const weak = weakChapters(active, grades);
    return (
      <DoneScreen
        run={run}
        weak={weak}
        onAgain={() => start(active.length, null)}
        onQuit={quit}
      />
    );
  }

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <SessionHeader
        index={index}
        total={active.length}
        difficulty={current.difficulty}
        chapterId={current.chapterId}
        onQuit={quit}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.id}-${phase}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={spring}
        >
          <QuestionCard
            question={current}
            answer={answers[current.id] ?? ""}
            onAnswerChange={(v) =>
              setAnswers({ ...answers, [current.id]: v })
            }
            phase={phase}
            onReveal={reveal}
            onGrade={next}
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function StartScreen({
  onStart,
}: {
  onStart: (count: number, chapterFilter: number | null) => void;
}) {
  const [count, setCount] = useState(10);
  const [filter, setFilter] = useState<"all" | number>("all");

  return (
    <motion.div variants={staggerChild} className="glass mb-10 rounded-3xl p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Antal frågor
          </div>
          <div className="mt-2 inline-flex rounded-xl border border-border/60 bg-surface/30 p-0.5">
            {[5, 10, 20].map((n) => (
              <motion.button
                key={n}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => setCount(n)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  count === n
                    ? "bg-amber/15 text-amber"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Kapitelfokus
          </div>
          <div className="mt-2">
            <Select
              ariaLabel="Kapitelfokus"
              value={String(filter)}
              onChange={(v) => setFilter(v === "all" ? "all" : Number(v))}
              options={chapterFilterOptions}
              triggerClassName="py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <motion.button
        onClick={() => onStart(count, filter === "all" ? null : filter)}
        whileTap={{ scale: 0.98 }}
        whileHover={{ y: -1 }}
        transition={spring}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 text-sm font-medium text-bg transition hover:bg-amber-soft md:w-auto"
      >
        <GraduationCap size={16} />
        Starta mock-tenta
      </motion.button>
    </motion.div>
  );
}

function SessionHeader({
  index,
  total,
  difficulty,
  chapterId,
  onQuit,
}: {
  index: number;
  total: number;
  difficulty: string;
  chapterId: number | null;
  onQuit: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-3 text-text-muted">
        <span>
          <span className="text-text">{index + 1}</span> / {total}
        </span>
        <DifficultyBadge difficulty={difficulty} />
        {chapterId !== null && (
          <span className="text-text-faint">
            Kap {String(chapterId).padStart(2, "0")}
          </span>
        )}
      </div>
      <button
        onClick={onQuit}
        className="text-text-faint transition hover:text-text-muted"
      >
        Avbryt
      </button>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === "hard"
      ? "text-rose"
      : difficulty === "medium"
        ? "text-amber"
        : "text-sage";
  const label =
    difficulty === "hard" ? "Svår" : difficulty === "medium" ? "Medel" : "Lätt";
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function QuestionCard({
  question,
  answer,
  onAnswerChange,
  phase,
  onReveal,
  onGrade,
}: {
  question: MockExamQuestion;
  answer: string;
  onAnswerChange: (v: string) => void;
  phase: Phase;
  onReveal: () => void;
  onGrade: (g: MockExamGrade) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
          Fråga
        </div>
        <p className="mt-3 font-display text-2xl leading-snug text-text md:text-3xl">
          {question.question}
        </p>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border/60 bg-surface/30 p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Ditt svar
          </div>
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={phase === "reviewing"}
            placeholder="Skriv ditt svar här. Förklara varför, inte bara vad."
            className="mt-4 min-h-[260px] w-full flex-1 resize-y bg-transparent text-[15px] leading-relaxed text-text placeholder:text-text-faint focus:outline-none disabled:opacity-70"
          />
        </div>

        <AnimatePresence>
          {phase === "reviewing" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col rounded-2xl border border-amber/30 bg-amber/[0.05] p-6"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
                Modellsvar
              </div>
              <div className="mt-4 flex-1 text-[15px]">
                <MarkdownContent source={question.modelAnswer} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "answering" ? (
        <div className="flex justify-end">
          <motion.button
            onClick={onReveal}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            transition={spring}
            className="inline-flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/15 px-5 py-2.5 text-sm text-amber transition hover:bg-amber/25"
          >
            Visa modellsvar
            <ArrowRight size={14} />
          </motion.button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="grid grid-cols-3 gap-3"
        >
          <GradeButton label="Fel" tone="rose" onClick={() => onGrade("wrong")} />
          <GradeButton label="Halvrätt" tone="amber" onClick={() => onGrade("half")} />
          <GradeButton label="Helt rätt" tone="sage" onClick={() => onGrade("right")} />
        </motion.div>
      )}
    </div>
  );
}

function GradeButton({
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
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={`rounded-2xl border bg-surface/40 px-4 py-3 text-sm transition ${toneClasses}`}
    >
      {label}
    </motion.button>
  );
}

function DoneScreen({
  run,
  weak,
  onAgain,
  onQuit,
}: {
  run: MockExamRun;
  weak: { chapterId: number; missed: number; total: number }[];
  onAgain: () => void;
  onQuit: () => void;
}) {
  const pct = Math.round((run.score / run.total) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="glass rounded-3xl p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-amber" size={28} />
        <h2 className="font-display text-3xl text-text">
          {run.score} / {run.total}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{pct}% — sparat i historiken</p>
      </div>

      {weak.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-surface/30 p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Svaga kapitel
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {weak.map((w) => {
              const ch = chapters.find((c) => c.id === w.chapterId);
              return (
                <li
                  key={w.chapterId}
                  className="flex items-center justify-between"
                >
                  <span className="text-text">
                    Kap {String(w.chapterId).padStart(2, "0")}
                    {ch ? ` · ${ch.titleSv}` : ""}
                  </span>
                  <span className="text-text-muted">
                    {w.missed} / {w.total} fel
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <motion.button
          onClick={onAgain}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="inline-flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/15 px-5 py-2.5 text-sm text-amber transition hover:bg-amber/25"
        >
          <Sparkles size={14} />
          Kör en till
        </motion.button>
        <motion.button
          onClick={onQuit}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-5 py-2.5 text-sm text-text-muted transition hover:border-amber/30 hover:text-amber"
        >
          Tillbaka till start
        </motion.button>
      </div>
    </motion.div>
  );
}

function HistorySection({ history }: { history: MockExamRun[] }) {
  if (history.length === 0) return null;
  const recent = history.slice().reverse().slice(0, 6);
  return (
    <motion.div variants={staggerChild} className="mt-6">
      <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-text-faint">
        <History size={12} />
        Tidigare mock-tentor
      </div>
      <ul className="space-y-2">
        {recent.map((run, idx) => {
          const pct = Math.round((run.score / run.total) * 100);
          return (
            <li
              key={idx}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/20 px-4 py-3 text-sm"
            >
              <div className="text-text-muted">
                {formatDate(run.date)} · {run.total} frågor
              </div>
              <div className="font-display text-text">
                {run.score} / {run.total}
                <span className="ml-2 text-xs text-text-faint">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
