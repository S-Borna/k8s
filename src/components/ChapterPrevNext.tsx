import { motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Chapter } from "@/types";
import { chapters } from "@/lib/contentLoader";
import { spring } from "@/lib/motion";

type Props = {
  currentId: number;
};

export function ChapterPrevNext({ currentId }: Props) {
  const active = chapters.filter((c) => !c.skipped);
  const idx = active.findIndex((c) => c.id === currentId);
  const prev = idx > 0 ? active[idx - 1] : null;
  const next = idx >= 0 && idx < active.length - 1 ? active[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-16 grid gap-3 md:grid-cols-2">
      {prev ? <NavCard direction="prev" chapter={prev} /> : <span aria-hidden />}
      {next ? <NavCard direction="next" chapter={next} /> : <span aria-hidden />}
    </div>
  );
}

function NavCard({
  direction,
  chapter,
}: {
  direction: "prev" | "next";
  chapter: Chapter;
}) {
  const isPrev = direction === "prev";
  return (
    <Link to={`/kapitel/${chapter.id}`} className="block">
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        transition={spring}
        className={`group glass relative overflow-hidden rounded-2xl p-5 ${isPrev ? "text-left" : "text-right"}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber/0 via-transparent to-rose/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-amber/8 group-hover:to-rose/8" />

        <div className={`relative flex items-center gap-3 ${isPrev ? "flex-row" : "flex-row-reverse"}`}>
          <motion.span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted transition group-hover:bg-amber/15 group-hover:text-amber"
            whileHover={{ x: isPrev ? -2 : 2 }}
            transition={spring}
          >
            {isPrev ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-faint">
              {isPrev ? "Föregående" : "Nästa"}
            </div>
            <div className="mt-0.5 truncate font-display text-base text-text">
              <span className="text-text-faint">{String(chapter.id).padStart(2, "0")}</span>{" "}
              {chapter.titleSv}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
