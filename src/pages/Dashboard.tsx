import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { ChapterCard } from "@/components/ChapterCard";
import { NamePrompt } from "@/components/NamePrompt";
import { Gubbe } from "@/components/Gubbe";
import { staggerChild, staggerParent, hoverLift, spring } from "@/lib/motion";
import { chapters } from "@/lib/contentLoader";
import { useAppState, useLastVisitedChapter } from "@/hooks/useAppState";
import {
  computeChapterCompletion,
  countCompletedChapters,
  countDueFlashcards,
} from "@/lib/progress";

export default function Dashboard() {
  const { state } = useAppState();
  const lastVisited = useLastVisitedChapter();
  const activeChapters = chapters.filter((c) => !c.skipped);

  const completedChapters = countCompletedChapters(activeChapters, state);
  const dueCards = countDueFlashcards(state);
  const lastMock = state.mockExamHistory.at(-1);
  const continueChapter =
    chapters.find((c) => c.id === lastVisited && !c.skipped) ??
    activeChapters.find(
      (c) => state.chapterProgress[c.id]?.status !== "completed",
    ) ??
    activeChapters[0];

  const greeting = state.settings.userName
    ? `Hej ${state.settings.userName} · ${activeChapters.length - completedChapters} kapitel kvar`
    : `${activeChapters.length - completedChapters} kapitel kvar`;

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <NamePrompt />
      <PageHeader
        eyebrow={greeting}
        title={
          <>
            Kubernetes med{" "}
            <em className="italian-flag font-display italic">Giacomo</em>{" "}
            <Gubbe />
          </>
        }
        description={
          <>
            Läs · öva · testa. Repetera tills det sitter.
            <br />
            Innehåll, flashcards och AI-tenta samlat på ett ställe — utan distraktioner.
          </>
        }
      />

      <motion.div
        variants={staggerChild}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Kapitel klara"
          value={String(completedChapters)}
          suffix={`/ ${activeChapters.length}`}
        />
        <StatCard
          label="Kort att repetera"
          value={String(dueCards)}
          suffix={dueCards === 1 ? "kort idag" : "kort idag"}
        />
        <StatCard
          label="Senaste mock"
          value={lastMock ? `${lastMock.score}/${lastMock.total}` : "—"}
          suffix={lastMock ? formatDate(lastMock.date) : "ingen än"}
        />
      </motion.div>

      {continueChapter && (
        <motion.div variants={staggerChild} className="mt-8">
          <ContinueCard
            chapterId={continueChapter.id}
            titleSv={continueChapter.titleSv}
            estimatedMinutes={continueChapter.estimatedMinutes}
            completion={computeChapterCompletion(continueChapter, state)}
          />
        </motion.div>
      )}

      <motion.div variants={staggerChild} className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.18em] text-text-faint">
            Kapitel
          </h2>
          <span className="text-xs text-text-faint">
            {activeChapters.length} aktiva · 1 hoppat
          </span>
        </div>

        <motion.div
          variants={staggerParent}
          className="grid gap-4 md:grid-cols-2"
        >
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </motion.div>
      </motion.div>

      <motion.div variants={staggerChild} className="mt-12">
        <FootnoteCard />
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <motion.div
      whileHover={hoverLift}
      transition={spring}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-text">{value}</span>
        <span className="text-xs text-text-muted">{suffix}</span>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber/10 blur-2xl" />
    </motion.div>
  );
}

function ContinueCard({
  chapterId,
  titleSv,
  estimatedMinutes,
  completion,
}: {
  chapterId: number;
  titleSv: string;
  estimatedMinutes: number;
  completion: number;
}) {
  const isStarted = completion > 0;
  return (
    <Link to={`/kapitel/${chapterId}`} className="block">
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        transition={spring}
        className="group glass relative overflow-hidden rounded-3xl p-6 md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber/8 via-transparent to-rose/8" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
              {isStarted ? "Fortsätt där du slutade" : "Börja här"}
            </div>
            <div className="mt-2 font-display text-2xl text-text md:text-3xl">
              Kapitel {chapterId} · {titleSv}
            </div>
            <div className="mt-1.5 text-sm text-text-muted">
              ~{estimatedMinutes} min ·{" "}
              {Math.round(completion * 100)}% klart
            </div>
          </div>
          <motion.div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber text-bg"
            whileHover={{ rotate: 8 }}
            transition={spring}
          >
            <ArrowRight size={20} />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

function FootnoteCard() {
  return (
    <div className="rounded-3xl border border-border/60 bg-surface/30 p-6 text-center">
      <Sparkles className="mx-auto mb-2 text-amber" size={18} />
      <p className="font-display text-base text-text">
        Tentan är skriftlig — fokusera på <em className="not-italic text-amber">varför</em>, inte bara vad.
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Mock-tentor + flashcards i Giacomos stil tränar förklaringsförmågan.
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}
