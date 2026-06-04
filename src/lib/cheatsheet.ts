import type { Chapter } from "@/types";

export type CheatsheetEntry = {
  id: string;
  chapterId: number;
  chapterTitle: string;
  context: string;
  source: "handson" | "lecture-handson" | "summary" | "lecture";
  command: string;
};

const BASH_BLOCK_RE = /```bash\s*\n([\s\S]*?)```/g;

export function buildCheatsheet(chapters: Chapter[]): CheatsheetEntry[] {
  const entries: CheatsheetEntry[] = [];

  for (const ch of chapters) {
    if (ch.skipped) continue;

    for (const step of ch.handsOn) {
      for (const [idx, command] of extractBashBlocks(step.body).entries()) {
        entries.push({
          id: `${ch.id}-h-${step.id}-${idx}`,
          chapterId: ch.id,
          chapterTitle: ch.titleSv,
          context: step.title,
          source: "handson",
          command,
        });
      }
    }

    for (const step of ch.lectureHandsOn) {
      for (const [idx, command] of extractBashBlocks(step.body).entries()) {
        entries.push({
          id: `${ch.id}-l-${step.id}-${idx}`,
          chapterId: ch.id,
          chapterTitle: ch.titleSv,
          context: step.title,
          source: "lecture-handson",
          command,
        });
      }
    }

    extractFromMarkdown(ch.summary, ch.id, ch.titleSv, "summary").forEach((e) =>
      entries.push(e),
    );
    extractFromMarkdown(ch.lecture, ch.id, ch.titleSv, "lecture").forEach((e) =>
      entries.push(e),
    );
  }

  return entries;
}

function extractBashBlocks(body: string): string[] {
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(BASH_BLOCK_RE.source, "g");
  while ((m = re.exec(body)) !== null) {
    const content = (m[1] ?? "").trim();
    if (content) blocks.push(content);
  }
  return blocks;
}

function extractFromMarkdown(
  body: string,
  chapterId: number,
  chapterTitle: string,
  source: "summary" | "lecture",
): CheatsheetEntry[] {
  if (!body.trim()) return [];
  const entries: CheatsheetEntry[] = [];
  const lines = body.split("\n");
  let currentHeading = source === "summary" ? "Sammanfattning" : "Lektion";
  let inBash = false;
  let bashLines: string[] = [];
  let blockIdx = 0;
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      if (!inFence) {
        inFence = true;
        if (lang === "bash") {
          inBash = true;
          bashLines = [];
        }
      } else {
        if (inBash) {
          const cmd = bashLines.join("\n").trim();
          if (cmd) {
            entries.push({
              id: `${chapterId}-${source[0]}-${blockIdx++}`,
              chapterId,
              chapterTitle,
              context: currentHeading,
              source,
              command: cmd,
            });
          }
          inBash = false;
        }
        inFence = false;
      }
      continue;
    }

    if (inBash) {
      bashLines.push(line);
      continue;
    }

    if (!inFence && line.startsWith("## ")) {
      currentHeading = line.slice(3).trim();
    }
  }

  return entries;
}

export function filterCheatsheet(
  entries: CheatsheetEntry[],
  query: string,
  chapterFilter: number | "all",
): CheatsheetEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((e) => {
    if (chapterFilter !== "all" && e.chapterId !== chapterFilter) return false;
    if (!q) return true;
    return (
      e.command.toLowerCase().includes(q) ||
      e.context.toLowerCase().includes(q)
    );
  });
}
