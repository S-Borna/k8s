import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { Select } from "@/components/Select";
import type { SelectOption } from "@/components/Select";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import { chapters } from "@/lib/contentLoader";
import { useAppState } from "@/hooks/useAppState";
import { getDueCards } from "@/lib/spacedRepetition";

type Mode = "due" | "all";
type ChapterFilter = number | "all";
type TagFilter = string | "all";

export default function Flashcards() {
  const { state } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("due");
  const [filter, setFilter] = useState<ChapterFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>(
    searchParams.get("tag") ?? "all",
  );
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (tagFilter === "all") params.delete("tag");
    else params.set("tag", tagFilter);
    setSearchParams(params, { replace: true });
  }, [tagFilter, searchParams, setSearchParams]);

  const allCards = useMemo(
    () =>
      chapters
        .filter((c) => !c.skipped)
        .flatMap((c) => c.flashcards),
    [],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const card of allCards) for (const tag of card.tags) set.add(tag);
    return Array.from(set).sort();
  }, [allCards]);

  const filteredByChapter = useMemo(
    () =>
      filter === "all"
        ? allCards
        : allCards.filter((c) => c.chapterId === filter),
    [allCards, filter],
  );

  const filteredByTag = useMemo(
    () =>
      tagFilter === "all"
        ? filteredByChapter
        : filteredByChapter.filter((c) => c.tags.includes(tagFilter)),
    [filteredByChapter, tagFilter],
  );

  const visibleCards = useMemo(() => {
    if (mode === "all") return filteredByTag;
    return getDueCards(filteredByTag, state.flashcardState);
  }, [filteredByTag, mode, state.flashcardState]);

  const dueCount = useMemo(
    () => getDueCards(allCards, state.flashcardState).length,
    [allCards, state.flashcardState],
  );

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow={`${dueCount} kort due idag`}
        title="Flashcards"
        description={
          <>
            Spaced repetition à la Leitner.
            <br />
            Fel kort kommer tillbaka idag, delvis om en dag, kunde om tre. Box 4 dyker upp igen om en vecka.
          </>
        }
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

        {allTags.length > 0 && (
          <TagPicker
            value={tagFilter}
            tags={allTags}
            onChange={setTagFilter}
          />
        )}

        <span className="ml-auto text-xs text-text-faint">
          {visibleCards.length} kort visas
        </span>
      </motion.div>

      <motion.div variants={staggerChild} key={`deck-${mode}-${filter}-${tagFilter}-${resetTick}`}>
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
  const options: SelectOption<string>[] = [
    { value: "all", label: "Alla kapitel" },
    ...chapters
      .filter((c) => !c.skipped)
      .map((c) => ({
        value: String(c.id),
        label: c.titleSv,
        hint: `Kap ${String(c.id).padStart(2, "0")}`,
      })),
  ];
  return (
    <Select
      ariaLabel="Kapitelfilter"
      value={String(value)}
      onChange={(v) => onChange(v === "all" ? "all" : Number(v))}
      options={options}
      className="w-56"
    />
  );
}

function TagPicker({
  value,
  tags,
  onChange,
}: {
  value: TagFilter;
  tags: string[];
  onChange: (next: TagFilter) => void;
}) {
  const options: SelectOption<string>[] = [
    { value: "all", label: "Alla taggar" },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ];
  return (
    <Select
      ariaLabel="Tagfilter"
      value={value}
      onChange={(v) => onChange(v)}
      options={options}
      className="w-44"
    />
  );
}
