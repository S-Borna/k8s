import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  GraduationCap,
  Lightbulb,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownContent } from "@/components/MarkdownContent";
import { yamlWalkthroughs } from "@/lib/yamlWalkthroughs";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import type { YamlWalkthrough } from "@/types";

export default function YamlWalkthroughs() {
  const [activeId, setActiveId] = useState<string>(
    () => yamlWalkthroughs[0]?.id ?? "",
  );
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, YamlWalkthrough[]>();
    for (const w of yamlWalkthroughs) {
      const key = w.source === "lecture" ? "Lektioner" : "Chas Challenge";
      const arr = map.get(key) ?? [];
      arr.push(w);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, []);

  const active = useMemo(
    () => yamlWalkthroughs.find((w) => w.id === activeId) ?? yamlWalkthroughs[0],
    [activeId],
  );

  async function copyYaml() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (yamlWalkthroughs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/60 bg-surface/20 p-10 text-center">
        <FileCode className="mx-auto mb-3 text-text-faint" size={22} />
        <p className="font-display text-lg text-text">
          Inga YAML-walkthroughs laddade
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Lägg till .yaml + .md-par i content-source/yaml-walkthroughs/.
        </p>
      </div>
    );
  }

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow={`${yamlWalkthroughs.length} manifests från lektioner + Chas Challenge`}
        title="YAML"
        description={
          <>
            Riktiga manifests Giacomo körde live och Saids egna från CC.
            <br />
            Inget generiskt — varje fil är som den användes, med pedagogisk
            rad-för-rad-förklaring.
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <motion.aside variants={staggerChild} className="lg:sticky lg:top-6 lg:self-start">
          <div className="glass rounded-2xl p-3">
            {grouped.map(([groupLabel, items]) => (
              <div key={groupLabel} className="mb-4 last:mb-0">
                <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-text-faint">
                  {groupLabel}
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((w) => (
                    <ListItem
                      key={w.id}
                      walkthrough={w}
                      isActive={active?.id === w.id}
                      onClick={() => setActiveId(w.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.aside>

        <motion.section variants={staggerChild}>
          {active && (
            <Detail walkthrough={active} copied={copied} onCopy={copyYaml} />
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}

function ListItem({
  walkthrough,
  isActive,
  onClick,
}: {
  walkthrough: YamlWalkthrough;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      transition={spring}
      className={`relative flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition ${
        isActive
          ? "bg-amber/12 ring-1 ring-amber/25"
          : "hover:bg-surface/40"
      }`}
    >
      <span
        className={`truncate text-sm ${isActive ? "text-amber" : "text-text"}`}
      >
        {walkthrough.title}
      </span>
      <span className="truncate text-[10px] text-text-faint">
        {walkthrough.filename}
      </span>
    </motion.button>
  );
}

function Detail({
  walkthrough,
  copied,
  onCopy,
}: {
  walkthrough: YamlWalkthrough;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 md:p-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
          {walkthrough.sourceLabel}
        </div>
        <h2 className="mt-1 font-display text-2xl text-text md:text-3xl">
          {walkthrough.title}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-faint">
          <span className="inline-flex items-center gap-1.5">
            <FileCode size={12} />
            <code>{walkthrough.filename}</code>
          </span>
          {walkthrough.chapterId !== null && (
            <Link
              to={`/kapitel/${walkthrough.chapterId}`}
              className="inline-flex items-center gap-1.5 transition hover:text-amber"
            >
              Kapitel {String(walkthrough.chapterId).padStart(2, "0")}
              <ExternalLink size={11} />
            </Link>
          )}
        </div>

        {walkthrough.why && (
          <div className="mt-5 rounded-2xl border border-amber/20 bg-amber/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
              Varför
            </div>
            <div className="mt-2 text-sm leading-relaxed text-text">
              <MarkdownContent source={walkthrough.why} />
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-3xl p-6 md:p-7">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Manifest
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2 py-1 text-[11px] text-text-muted transition hover:border-amber/40 hover:text-amber"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Kopierat" : "Kopiera"}
          </button>
        </div>
        <YamlBlock yaml={walkthrough.yaml} />
      </div>

      {walkthrough.sections.length > 0 && (
        <div className="glass rounded-3xl p-6 md:p-7">
          <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Rad-för-rad
          </div>
          <div className="mt-4 space-y-5">
            {walkthrough.sections.map((sec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
                className="rounded-2xl border border-border/60 bg-surface/30 p-4"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-amber" />
                  <h3 className="font-display text-base text-text">
                    {sec.title}
                  </h3>
                </div>
                <div className="mt-2 pl-6 text-sm leading-relaxed text-text-muted">
                  <MarkdownContent source={sec.body} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {walkthrough.examPoints.length > 0 && (
        <div className="glass rounded-3xl p-6 md:p-7">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-sage" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-sage">
              Tentapunkter
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {walkthrough.examPoints.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-text"
              >
                <Lightbulb
                  size={13}
                  className="mt-1 shrink-0 text-sage"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function YamlBlock({ yaml }: { yaml: string }) {
  const lines = yaml.split("\n");
  return (
    <div className="overflow-x-auto rounded-xl bg-bg/60 p-4">
      <pre className="font-mono text-[12.5px] leading-relaxed text-text">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none pr-4 text-right text-text-faint" style={{ width: "3em" }}>
                {i + 1}
              </span>
              <span className="flex-1 whitespace-pre">{line || " "}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
