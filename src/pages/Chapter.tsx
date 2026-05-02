import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, BookOpenCheck, Check } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { Chapter } from "@/types";
import { getChapter } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import { ChapterTabs } from "@/components/ChapterTabs";
import type { Tab } from "@/components/ChapterTabs";
import { useActiveTab } from "@/hooks/useActiveTab";
import { MarkdownContent } from "@/components/MarkdownContent";
import { HandsOnList } from "@/components/HandsOnList";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { SANDBOX_LABEL, SANDBOX_URL } from "@/lib/sandbox";

export default function ChapterPage() {
  const { n } = useParams<{ n: string }>();
  const id = n ? Number(n) : NaN;
  const chapter = Number.isFinite(id) ? getChapter(id) : undefined;
  const { getChapterProgress, updateChapterProgress, setState } = useAppState();
  const chapterId = chapter && !chapter.skipped ? chapter.id : null;

  useEffect(() => {
    if (chapterId === null) return;
    setState((prev) => {
      const current = prev.chapterProgress[chapterId] ?? {
        status: "not_started" as const,
        lastVisited: null,
        summaryRead: false,
        handsOnSteps: {},
      };
      return {
        ...prev,
        chapterProgress: {
          ...prev.chapterProgress,
          [chapterId]: {
            ...current,
            lastVisited: new Date().toISOString(),
            status:
              current.status === "completed" ? "completed" : "in_progress",
          },
        },
      };
    });
  }, [chapterId, setState]);

  if (!chapter) return <Navigate to="/" replace />;
  if (chapter.skipped) {
    return (
      <div className="text-center text-text-muted py-16">
        Kapitel {chapter.id} är inte med på tentan.
        <div className="mt-4">
          <Link to="/" className="text-amber hover:underline">
            Tillbaka till översikt
          </Link>
        </div>
      </div>
    );
  }

  const progress = getChapterProgress(chapter.id);
  const hasLecture = chapter.lecture.trim().length > 0;
  const hasLectureHandsOn = chapter.lectureHandsOn.length > 0;

  const tabs: Tab[] = [
    { key: "summary", label: "Sammanfattning" },
    { key: "flashcards", label: "Flashcards", count: chapter.flashcards.length },
    { key: "handson", label: "Hands-on", count: chapter.handsOn.length },
    { key: "lecture", label: "Giacomo & lektion" },
  ];

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <motion.div variants={staggerChild} className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted transition hover:text-text"
        >
          <motion.span whileHover={{ x: -2 }} transition={spring}>
            <ArrowLeft size={16} />
          </motion.span>
          Tillbaka till översikt
        </Link>
      </motion.div>

      <motion.header variants={staggerChild} className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
          Kapitel {String(chapter.id).padStart(2, "0")} · ~{chapter.estimatedMinutes} min
        </div>
        <h1 className="mt-2 font-display text-balance text-3xl font-medium leading-[1.1] text-text md:text-5xl">
          {chapter.titleSv}
        </h1>
        <div className="mt-1 text-sm text-text-faint">{chapter.title}</div>
      </motion.header>

      <motion.div variants={staggerChild}>
        <ChapterTabs tabs={tabs} />
      </motion.div>

      <TabContent
        chapter={chapter}
        hasLecture={hasLecture}
        hasLectureHandsOn={hasLectureHandsOn}
        summaryRead={progress.summaryRead}
        handsOnSteps={progress.handsOnSteps}
        onMarkSummaryRead={() =>
          updateChapterProgress(chapter.id, {
            summaryRead: !progress.summaryRead,
            status: !progress.summaryRead ? "in_progress" : progress.status,
          })
        }
        onToggleStep={(stepId) => {
          const next = { ...progress.handsOnSteps, [stepId]: !progress.handsOnSteps[stepId] };
          const allDone =
            chapter.handsOn.length > 0 &&
            chapter.handsOn.every((s) => next[s.id]);
          updateChapterProgress(chapter.id, {
            handsOnSteps: next,
            status:
              progress.summaryRead && allDone ? "completed" : "in_progress",
          });
        }}
        onResetHandsOn={() =>
          updateChapterProgress(chapter.id, { handsOnSteps: {} })
        }
      />
    </motion.div>
  );
}

type TabContentProps = {
  chapter: Chapter;
  hasLecture: boolean;
  hasLectureHandsOn: boolean;
  summaryRead: boolean;
  handsOnSteps: Record<string, boolean>;
  onMarkSummaryRead: () => void;
  onToggleStep: (stepId: string) => void;
  onResetHandsOn: () => void;
};

function TabContent({
  chapter,
  hasLecture,
  hasLectureHandsOn,
  summaryRead,
  handsOnSteps,
  onMarkSummaryRead,
  onToggleStep,
  onResetHandsOn,
}: TabContentProps) {
  const [active] = useActiveTab("summary");

  if (active === "summary") {
    return (
      <motion.section
        variants={staggerChild}
        initial="initial"
        animate="enter"
        key="summary"
      >
        <MarkdownContent source={chapter.summary} />
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <motion.button
            onClick={onMarkSummaryRead}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
              summaryRead
                ? "border border-amber/40 bg-amber/15 text-amber"
                : "border border-border bg-surface/40 text-text-muted hover:border-amber/30 hover:text-amber"
            }`}
          >
            {summaryRead ? <Check size={14} /> : <BookOpenCheck size={14} />}
            {summaryRead ? "Markerat som läst" : "Markera som läst"}
          </motion.button>
        </div>
      </motion.section>
    );
  }

  if (active === "handson") {
    return (
      <motion.section
        variants={staggerChild}
        initial="initial"
        animate="enter"
        key="handson"
      >
        <SandboxBanner />
        <HandsOnList
          steps={chapter.handsOn}
          completed={handsOnSteps}
          onToggle={onToggleStep}
          onReset={onResetHandsOn}
          emptyMessage="Inga hands-on-steg ännu — fyll på i content-source/."
        />
        {hasLectureHandsOn && (
          <div className="mt-12">
            <SectionHeading
              eyebrow="Från lektionen"
              title="Egna övningar Giacomo gick igenom"
            />
            <HandsOnList
              steps={chapter.lectureHandsOn}
              completed={handsOnSteps}
              onToggle={onToggleStep}
            />
          </div>
        )}
      </motion.section>
    );
  }

  if (active === "lecture") {
    return (
      <motion.section
        variants={staggerChild}
        initial="initial"
        animate="enter"
        key="lecture"
      >
        <div className="rounded-3xl border border-amber/20 bg-amber/[0.04] p-6 md:p-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
            Tentarelevant — Giacomo
          </div>
          <div className="mt-4">
            <MarkdownContent source={chapter.giacomoNotes} />
          </div>
        </div>
        <div className="mt-10">
          <SectionHeading eyebrow="Live från lektionen" title="Vad Giacomo gick igenom" />
          {hasLecture ? (
            <MarkdownContent source={chapter.lecture} />
          ) : (
            <LecturePlaceholder />
          )}
        </div>
      </motion.section>
    );
  }

  // flashcards tab
  return (
    <motion.section
      variants={staggerChild}
      initial="initial"
      animate="enter"
      key="flashcards"
    >
      <FlashcardDeck
        cards={chapter.flashcards}
        emptyTitle="Inga flashcards för det här kapitlet ännu"
        emptyDescription="Lägg till i content-source/ när Opus levererar fler kort."
      />
    </motion.section>
  );
}

function SandboxBanner() {
  return (
    <a
      href={SANDBOX_URL}
      target="_blank"
      rel="noreferrer"
      className="group mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface/30 px-5 py-3 transition hover:border-amber/40"
    >
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
          Övningssandlåda
        </div>
        <div className="mt-0.5 text-sm text-text-muted">
          Riktig kubectl-prompt mot ett kind-kluster i browsern
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-3 py-1.5 text-xs text-text-muted group-hover:border-amber/40 group-hover:text-amber">
        {SANDBOX_LABEL}
        <ExternalLink size={12} />
      </span>
    </a>
  );
}

function LecturePlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 bg-surface/20 p-6 text-sm text-text-muted">
      Sektionen fylls in efter att Giacomo gått igenom kapitlet på lektion. Egna
      anteckningar, demos och Q&A från klassen kommer hit.
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
        {eyebrow}
      </div>
      <h2 className="mt-1 font-display text-2xl text-text">{title}</h2>
    </div>
  );
}
