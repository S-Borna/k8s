import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, LayoutList, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Chapter } from "@/types";
import { chapters } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { computeChapterCompletion } from "@/lib/progress";
import { spring } from "@/lib/motion";

type Props = {
  currentId: number;
  estimatedMinutes: number;
};

export function ChapterJumper({ currentId, estimatedMinutes }: Props) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const { state } = useAppState();

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const t = window.setTimeout(() => {
      const activeEl = listRef.current?.querySelector<HTMLElement>(
        "[data-active='true']",
      );
      activeEl?.scrollIntoView({ block: "center" });
    }, 320);
    return () => window.clearTimeout(t);
  }, [open]);

  function jumpTo(id: number) {
    setOpen(false);
    navigate(`/kapitel/${id}`);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.98 }}
        whileHover={{ y: -1 }}
        transition={spring}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-surface/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-text-muted transition hover:border-amber/40 hover:bg-surface/70 hover:text-amber"
      >
        <span>
          Kapitel {String(currentId).padStart(2, "0")} · ~{estimatedMinutes} min
        </span>
        <span className="h-3 w-px bg-current opacity-30" />
        <span className="inline-flex items-center gap-1 text-[10px] tracking-wider">
          Visa alla
          <LayoutList size={12} />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-bg/55 backdrop-blur-md"
              aria-hidden
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 38, mass: 0.9 }}
              className="fixed left-0 top-0 z-50 flex h-screen w-full max-w-[380px] flex-col border-r border-border-strong/70 bg-bg-elevated shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] md:max-w-[400px]"
              role="dialog"
              aria-label="Kapitelnavigation"
            >
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-6 pb-5 pt-7">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
                    Kapitel
                  </div>
                  <h2 className="mt-1 font-display text-3xl leading-tight text-text">
                    Alla 17
                  </h2>
                  <p className="mt-1 text-xs text-text-faint">
                    Hoppa till valfritt kapitel
                  </p>
                </div>
                <motion.button
                  onClick={() => setOpen(false)}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ rotate: 90 }}
                  transition={spring}
                  aria-label="Stäng kapitelnavigation"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/60 bg-surface/50 text-text-muted transition hover:border-amber/40 hover:text-amber"
                >
                  <X size={16} />
                </motion.button>
              </header>

              <ul
                ref={listRef}
                role="listbox"
                className="chapter-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-3"
              >
                {chapters.map((chapter, idx) => (
                  <ChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    isActive={chapter.id === currentId}
                    completion={computeChapterCompletion(chapter, state)}
                    onSelect={jumpTo}
                    delay={Math.min(idx * 0.025, 0.45)}
                  />
                ))}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ChapterRow({
  chapter,
  isActive,
  completion,
  onSelect,
  delay,
}: {
  chapter: Chapter;
  isActive: boolean;
  completion: number;
  onSelect: (id: number) => void;
  delay: number;
}) {
  const skipped = chapter.skipped;
  const status = isActive
    ? "active"
    : completion >= 0.99
      ? "done"
      : completion > 0
        ? "started"
        : "fresh";

  const dotClass = {
    active: "bg-amber shadow-[0_0_10px_var(--color-amber)]",
    done: "bg-sage",
    started: "bg-amber-soft",
    fresh: "bg-text-faint/40",
  }[status];

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        type="button"
        role="option"
        aria-selected={isActive}
        data-active={isActive ? "true" : "false"}
        disabled={skipped}
        onClick={() => onSelect(chapter.id)}
        whileTap={skipped ? undefined : { scale: 0.985 }}
        whileHover={skipped ? undefined : { x: 3 }}
        transition={spring}
        className={`relative flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition ${
          skipped
            ? "cursor-not-allowed opacity-40"
            : isActive
              ? "bg-amber/12 ring-1 ring-amber/30"
              : "hover:bg-surface-2/60"
        }`}
      >
        <span className="font-mono text-sm tabular-nums text-text-faint min-w-[28px]">
          {String(chapter.id).padStart(2, "0")}
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] font-medium ${isActive ? "text-text" : skipped ? "text-text-faint" : "text-text-muted"}`}
          >
            {skipped ? "Hoppas över" : chapter.titleSv}
          </span>
          {!skipped && (
            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-text-faint">
              <span className="truncate">{chapter.title}</span>
              {completion > 0 && completion < 0.99 && (
                <span className="shrink-0 text-amber">
                  · {Math.round(completion * 100)}%
                </span>
              )}
            </span>
          )}
        </span>
        {!skipped && completion >= 0.99 && (
          <Check size={14} className="shrink-0 text-sage" />
        )}
        {!skipped && completion > 0 && completion < 0.99 && (
          <ProgressBar value={completion} />
        )}
      </motion.button>
    </motion.li>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className="h-full bg-gradient-to-r from-amber to-amber-deep"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value * 100)}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

