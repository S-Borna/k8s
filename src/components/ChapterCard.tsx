import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CheckCircle2, Hourglass } from "lucide-react";
import type { Chapter, ChapterProgress } from "@/types";
import { ProgressRing } from "@/components/ProgressRing";
import { staggerChild, spring } from "@/lib/motion";
import { computeChapterCompletion } from "@/lib/progress";
import { useAppState } from "@/hooks/useAppState";

type Props = {
  chapter: Chapter;
};

export function ChapterCard({ chapter }: Props) {
  const { state, getChapterProgress } = useAppState();
  const progress = getChapterProgress(chapter.id);
  const completion = computeChapterCompletion(chapter, state);

  if (chapter.skipped) return <SkippedCard chapter={chapter} />;

  return (
    <motion.div variants={staggerChild}>
      <Link to={`/kapitel/${chapter.id}`} className="block group">
        <motion.article
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={spring}
          className="glass relative overflow-hidden rounded-2xl p-5 h-full"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber/0 via-transparent to-rose/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-amber/8 group-hover:to-rose/8" />

          <header className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
                Kapitel {String(chapter.id).padStart(2, "0")}
              </div>
              <h3 className="mt-1 font-display text-xl leading-tight text-text">
                {chapter.titleSv}
              </h3>
              <div className="mt-0.5 text-xs text-text-faint truncate">
                {chapter.title}
              </div>
            </div>
            <ProgressRing value={completion} />
          </header>

          <footer className="relative mt-5 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-text-muted">
              <StatusPill progress={progress} />
              <span className="inline-flex items-center gap-1">
                <BookOpen size={12} className="text-text-faint" />
                {chapter.flashcards.length} kort
              </span>
              <span className="inline-flex items-center gap-1">
                <Hourglass size={12} className="text-text-faint" />
                {chapter.estimatedMinutes} min
              </span>
            </div>
            <motion.span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
              whileHover={{ rotate: 12 }}
            >
              <ArrowUpRight size={14} />
            </motion.span>
          </footer>
        </motion.article>
      </Link>
    </motion.div>
  );
}

function StatusPill({ progress }: { progress: ChapterProgress }) {
  if (progress.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-sage">
        <CheckCircle2 size={12} />
        Klart
      </span>
    );
  }
  if (progress.status === "in_progress") {
    return <span className="text-amber">Pågår</span>;
  }
  return <span className="text-text-faint">Ej börjat</span>;
}

function SkippedCard({ chapter }: { chapter: Chapter }) {
  return (
    <motion.div
      variants={staggerChild}
      className="rounded-2xl border border-dashed border-border/60 bg-surface/20 p-5 opacity-60"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
        Kapitel {String(chapter.id).padStart(2, "0")}
      </div>
      <div className="mt-1 font-display text-lg text-text-muted">
        Hoppas över
      </div>
      <div className="mt-2 text-xs text-text-faint">
        Inte med på tentan
      </div>
    </motion.div>
  );
}
