import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Search, Terminal, ExternalLink, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/Select";
import type { SelectOption } from "@/components/Select";
import { chapters } from "@/lib/contentLoader";
import {
  buildCheatsheet,
  filterCheatsheet,
  type CheatsheetEntry,
} from "@/lib/cheatsheet";
import { staggerChild, staggerParent, spring } from "@/lib/motion";

type ChapterFilter = number | "all";

export default function Cheatsheet() {
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allEntries = useMemo(() => buildCheatsheet(chapters), []);

  const visible = useMemo(
    () => filterCheatsheet(allEntries, query, chapterFilter),
    [allEntries, query, chapterFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, CheatsheetEntry[]>();
    for (const e of visible) {
      const arr = map.get(e.chapterId) ?? [];
      arr.push(e);
      map.set(e.chapterId, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [visible]);

  async function copy(entry: CheatsheetEntry) {
    try {
      await navigator.clipboard.writeText(entry.command);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const chapterOptions: SelectOption<string>[] = [
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
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow={`${allEntries.length} kommandon · ${visible.length} visas`}
        title="Cheatsheet"
        description={
          <>
            Alla <code>kubectl</code>-kommandon från kapitlen.
            <br />
            Sök efter resurs, verb eller kontext. Klicka för att kopiera.
          </>
        }
      />

      <motion.div
        variants={staggerChild}
        className="mb-6 flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök kommando, t.ex. 'get pods' eller 'rbac'"
            className="w-full rounded-xl border border-border/60 bg-surface/30 py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-amber/40 focus:outline-none"
          />
        </div>
        <Select
          ariaLabel="Kapitelfilter"
          value={String(chapterFilter)}
          onChange={(v) => setChapterFilter(v === "all" ? "all" : Number(v))}
          options={chapterOptions}
          className="w-56"
        />
      </motion.div>

      {grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div variants={staggerChild} className="space-y-8">
          {grouped.map(([chapterId, entries]) => (
            <ChapterGroup
              key={chapterId}
              chapterId={chapterId}
              entries={entries}
              copiedId={copiedId}
              onCopy={copy}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function ChapterGroup({
  chapterId,
  entries,
  copiedId,
  onCopy,
}: {
  chapterId: number;
  entries: CheatsheetEntry[];
  copiedId: string | null;
  onCopy: (e: CheatsheetEntry) => void;
}) {
  const title = entries[0]?.chapterTitle ?? "";
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Kapitel {String(chapterId).padStart(2, "0")}
          </div>
          <h2 className="font-display text-xl text-text">{title}</h2>
        </div>
        <Link
          to={`/kapitel/${chapterId}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-amber"
        >
          Öppna kapitel
          <ExternalLink size={11} />
        </Link>
      </div>

      <div className="grid gap-3">
        {entries.map((entry) => (
          <CommandCard
            key={entry.id}
            entry={entry}
            copied={copiedId === entry.id}
            onCopy={() => onCopy(entry)}
          />
        ))}
      </div>
    </section>
  );
}

function CommandCard({
  entry,
  copied,
  onCopy,
}: {
  entry: CheatsheetEntry;
  copied: boolean;
  onCopy: () => void;
}) {
  const sourceLabel = {
    handson: "Hands-on",
    "lecture-handson": "Lektion",
    summary: "Sammanfattning",
    lecture: "Lektion-prosa",
  }[entry.source];
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={spring}
      className="rounded-2xl border border-border/60 bg-surface/30 p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-text-faint">
            {sourceLabel}
          </div>
          <div className="mt-0.5 truncate text-sm text-text-muted">
            {entry.context}
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2 py-1 text-[11px] text-text-muted transition hover:border-amber/40 hover:text-amber"
          aria-label="Kopiera kommando"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Kopierat" : "Kopiera"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-bg/60 p-3 font-mono text-[13px] leading-relaxed text-text">
        <code>{entry.command}</code>
      </pre>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-surface/20 p-10 text-center">
      <Terminal className="mx-auto mb-3 text-text-faint" size={22} />
      <p className="font-display text-lg text-text">Inga kommandon matchar</p>
      <p className="mt-1 text-sm text-text-muted">
        Prova en bredare sökterm eller välj annat kapitel.
      </p>
    </div>
  );
}
