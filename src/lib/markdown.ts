import type {
  Flashcard,
  HandsOnStep,
  MockExamDifficulty,
  MockExamQuestion,
} from "@/types";

const SECTION_NAMES = [
  "Sammanfattning",
  "Giacomos tillägg",
  "Lektion",
  "Hands-on",
  "Lektion hands-on",
  "Flashcards",
] as const;

type SectionName = (typeof SECTION_NAMES)[number];

export type ParsedChapter = {
  frontmatter: Record<string, string | number>;
  sections: Record<SectionName, string>;
};

export function parseChapterMarkdown(raw: string): ParsedChapter {
  const { frontmatter, body } = extractFrontmatter(raw);
  const sections = splitSections(body);
  return { frontmatter, sections };
}

function extractFrontmatter(raw: string): {
  frontmatter: Record<string, string | number>;
  body: string;
} {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) {
    return { frontmatter: {}, body: raw };
  }
  const fm: Record<string, string | number> = {};
  const fmBody = fmMatch[1] ?? "";
  for (const line of fmBody.split("\n")) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1] as string;
    const rawValue = (m[2] ?? "").trim();
    fm[key] = parseFrontmatterValue(rawValue);
  }
  return { frontmatter: fm, body: raw.slice(fmMatch[0].length) };
}

function parseFrontmatterValue(v: string): string | number {
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^".*"$/.test(v)) return v.slice(1, -1);
  if (/^'.*'$/.test(v)) return v.slice(1, -1);
  return v;
}

function splitSections(body: string): Record<SectionName, string> {
  const lines = body.split("\n");
  const sections: Partial<Record<SectionName, string[]>> = {};
  let current: SectionName | null = null;
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      if (current) (sections[current] ??= []).push(line);
      continue;
    }

    if (!inFence && line.startsWith("# ")) {
      const heading = line.slice(2).trim();
      if (isSectionName(heading)) {
        current = heading;
        sections[current] ??= [];
        continue;
      }
    }

    if (current) (sections[current] ??= []).push(line);
  }

  const out = {} as Record<SectionName, string>;
  for (const name of SECTION_NAMES) {
    out[name] = (sections[name] ?? []).join("\n").trim();
  }
  return out;
}

function isSectionName(s: string): s is SectionName {
  return (SECTION_NAMES as readonly string[]).includes(s);
}

export function parseFlashcards(
  sectionBody: string,
  chapterId: number,
): Flashcard[] {
  const cards: Flashcard[] = [];
  const blocks = splitByH2QuestionMarker(sectionBody, /^##\s+Q:\s*(.+)$/);

  for (const [idx, block] of blocks.entries()) {
    const { heading, body } = block;
    const qMatch = heading.match(/^##\s+Q:\s*(.+)$/);
    if (!qMatch) continue;
    const question = (qMatch[1] ?? "").trim();
    const answer = stripAnswerPrefix(body).trim();
    if (!question || !answer) continue;
    cards.push({
      id: `ch${chapterId}-fc-${idx + 1}`,
      chapterId,
      question,
      answer,
    });
  }
  return cards;
}

export function parseHandsOnSteps(
  sectionBody: string,
  chapterId: number,
  prefix: string,
): HandsOnStep[] {
  const steps: HandsOnStep[] = [];
  const blocks = splitByH2QuestionMarker(sectionBody, /^##\s+(\d+)\.\s+(.+)$/);

  for (const block of blocks) {
    const m = block.heading.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (!m) continue;
    const number = Number(m[1]);
    const title = (m[2] ?? "").trim();
    const body = block.body.trim();
    steps.push({
      id: `ch${chapterId}-${prefix}-${number}`,
      number,
      title,
      body,
    });
  }
  return steps.sort((a, b) => a.number - b.number);
}

export function parseMockExam(raw: string): MockExamQuestion[] {
  const { body } = extractFrontmatter(raw);
  const blocks = splitByH2QuestionMarker(
    body,
    /^##\s+Q\s+\[\s*([a-z]+)\s*·\s*(ch\d+|cross)\s*\]\s*:\s*(.+)$/i,
  );
  const out: MockExamQuestion[] = [];
  for (const [idx, block] of blocks.entries()) {
    const m = block.heading.match(
      /^##\s+Q\s+\[\s*([a-z]+)\s*·\s*(ch\d+|cross)\s*\]\s*:\s*(.+)$/i,
    );
    if (!m) continue;
    const difficulty = normalizeDifficulty(m[1] ?? "medium");
    const tag = (m[2] ?? "").toLowerCase();
    const chapterId = tag === "cross" ? null : Number(tag.slice(2));
    const question = (m[3] ?? "").trim();
    const answer = stripAnswerPrefix(block.body).trim();
    if (!question || !answer) continue;
    out.push({
      id: `mock-${idx + 1}`,
      chapterId: Number.isFinite(chapterId) ? chapterId : null,
      difficulty,
      question,
      modelAnswer: normalizeInlineList(answer),
    });
  }
  return out;
}

function normalizeInlineList(text: string): string {
  const matches = text.match(/(?:^|\s)(\d+)\)\s+/g);
  if (!matches || matches.length < 2) return text;
  return text.replace(/(^|[^\n])\s*(\d+)\)\s+/g, (_full, prefix: string, num: string) => {
    const lead = prefix && prefix !== "\n" ? `${prefix}\n\n` : "\n";
    return `${lead}${num}. `;
  }).trim();
}

function normalizeDifficulty(s: string): MockExamDifficulty {
  const v = s.toLowerCase();
  if (v === "easy" || v === "medium" || v === "hard") return v;
  return "medium";
}

type Block = { heading: string; body: string };

function splitByH2QuestionMarker(body: string, re: RegExp): Block[] {
  const lines = body.split("\n");
  const blocks: Block[] = [];
  let current: Block | null = null;
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      if (current) current.body += line + "\n";
      continue;
    }
    if (!inFence && re.test(line)) {
      if (current) blocks.push(current);
      current = { heading: line, body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  if (current) blocks.push(current);
  return blocks;
}

function stripAnswerPrefix(body: string): string {
  return body.replace(/^\s*\*\*A:\*\*\s*/, "");
}
