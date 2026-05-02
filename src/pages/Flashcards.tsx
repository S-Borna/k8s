import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import { chapters } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { getDueCards } from "@/lib/spacedRepetition";

type Mode = "due" | "all";
type ChapterFilter = number | "all";

export default function Flashcards() {
  const { state } = useAppState();
  const [mode, setMode] = useState<Mode>("due");
  const [filter, setFilter] = useState<ChapterFilter>("all");
  const [resetTick, setResetTick] = useState(0);

  const allCards = useMemo(
    () =>
      chapters
        .filter((c) => !c.skipped)
        .flatMap((c) => c.flashcards),
    [],
  );

  const filteredByChapter = useMemo(
    () =>
      filter === "all"
        ? allCards
        : allCards.filter((c) => c.chapterId === filter),
    [allCards, filter],
  );

  const visibleCards = useMemo(() => {
    if (mode === "all") return filteredByChapter;
    return getDueCards(filteredByChapter, state.flashcardState);
  }, [filteredByChapter, mode, state.flashcardState]);

  const dueCount = useMemo(
    () => getDueCards(allCards, state.flashcardState).length,
    [allCards, state.flashcardState],
  );

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow={`${dueCount} kort due idag`}
        title="Flashcards"
        description="Spaced repetition à la Leitner. Fel kort kommer tillbaka idag, delvis om en dag, kunde om tre. Box 4 dyker upp igen om en vecka."
      />

      <motion.div variants={staggerChild} className="mb-6 flex flex-wrap items-center gap-3">
        <ToggleGroup
          options={[
            { value: "due", label: "Due idag" },
            { value: "all", label: "Alla" },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />

        <ChapterPicker
          value={filter}
          onChange={setFilter}
        />

        <span className="ml-auto text-xs text-text-faint">
          {visibleCards.length} kort visas
        </span>
      </motion.div>

      <motion.div variants={staggerChild} key={`deck-${mode}-${filter}-${resetTick}`}>
        <FlashcardDeck
          cards={visibleCards}
          emptyTitle={
            mode === "due"
              ? "Inga kort due idag"
              : "Inga kort matchar filtret"
          }
          emptyDescription={
            mode === "due"
              ? "Kom tillbaka imorgon eller växla till 'Alla' för att öva förebyggande."
              : "Välj annat kapitel eller växla till 'Due idag'."
          }
          onRestart={() => setResetTick((t) => t + 1)}
        />
      </motion.div>
    </motion.div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border/60 bg-surface/30 p-0.5">
      {options.map((o) => (
        <motion.button
          key={o.value}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-1.5 text-xs transition ${
            value === o.value
              ? "bg-amber/15 text-amber"
              : "text-text-muted hover:text-text"
          }`}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

function ChapterPicker({
  value,
  onChange,
}: {
  value: ChapterFilter;
  onChange: (next: ChapterFilter) => void;
}) {
  return (
    <div className="relative">
      <select
        value={String(value)}
        onChange={(e) =>
          onChange(e.target.value === "all" ? "all" : Number(e.target.value))
        }
        className="appearance-none rounded-xl border border-border/60 bg-surface/30 py-1.5 pl-3 pr-8 text-xs text-text-muted transition hover:border-amber/40 hover:text-text focus:outline-none focus:ring-1 focus:ring-amber/40"
      >
        <option value="all">Alla kapitel</option>
        {chapters
          .filter((c) => !c.skipped)
          .map((c) => (
            <option key={c.id} value={c.id}>
              Kap {String(c.id).padStart(2, "0")} — {c.titleSv}
            </option>
          ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint"
      />
    </div>
  );
}
