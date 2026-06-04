import type { Chapter, MockExamQuestion } from "@/types";
import {
  parseChapterMarkdown,
  parseFlashcards,
  parseHandsOnSteps,
  parseMockExam,
} from "@/lib/markdown";

const chapterFiles = import.meta.glob("/content-source/chapters/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const mockExamFile = import.meta.glob("/content-source/mock-exam.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SKIPPED_CHAPTERS = new Set<number>([9, 16, 17]);

export const chapters: Chapter[] = buildChapters();
export const mockExamQuestions: MockExamQuestion[] = buildMockExam();

function buildChapters(): Chapter[] {
  const result: Chapter[] = [];

  for (const [path, raw] of Object.entries(chapterFiles)) {
    const parsed = parseChapterMarkdown(raw);
    const id = readNumberFrontmatter(parsed.frontmatter, "id", path);
    if (SKIPPED_CHAPTERS.has(id)) continue;
    const title = readStringFrontmatter(parsed.frontmatter, "title");
    const titleSv = readStringFrontmatter(parsed.frontmatter, "titleSv");
    const estimatedMinutes = readNumberFrontmatter(
      parsed.frontmatter,
      "estimatedMinutes",
      path,
    );

    result.push({
      id,
      title,
      titleSv,
      estimatedMinutes,
      summary: parsed.sections["Sammanfattning"] ?? "",
      giacomoNotes: parsed.sections["Giacomos tillägg"] ?? "",
      lecture: parsed.sections["Lektion"] ?? "",
      handsOn: parseHandsOnSteps(
        parsed.sections["Hands-on"] ?? "",
        id,
        "step",
      ),
      lectureHandsOn: parseHandsOnSteps(
        parsed.sections["Lektion hands-on"] ?? "",
        id,
        "lstep",
      ),
      flashcards: parseFlashcards(parsed.sections["Flashcards"] ?? "", id),
    });
  }

  for (const id of SKIPPED_CHAPTERS) {
    if (!result.some((c) => c.id === id)) {
      result.push({
        id,
        title: "Skipped",
        titleSv: "Hoppas över",
        estimatedMinutes: 0,
        summary: "",
        giacomoNotes: "",
        lecture: "",
        handsOn: [],
        lectureHandsOn: [],
        flashcards: [],
        skipped: true,
      });
    }
  }

  return result.sort((a, b) => a.id - b.id);
}

function buildMockExam(): MockExamQuestion[] {
  const entry = Object.values(mockExamFile)[0];
  if (!entry) return [];
  return parseMockExam(entry);
}

function readStringFrontmatter(
  fm: Record<string, string | number>,
  key: string,
): string {
  const v = fm[key];
  if (typeof v !== "string") {
    throw new Error(`Frontmatter "${key}" saknas eller är inte sträng`);
  }
  return v;
}

function readNumberFrontmatter(
  fm: Record<string, string | number>,
  key: string,
  path: string,
): number {
  const v = fm[key];
  if (typeof v !== "number") {
    throw new Error(`Frontmatter "${key}" saknas/inte siffra i ${path}`);
  }
  return v;
}

export function getChapter(id: number): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}

export function getActiveChapters(): Chapter[] {
  return chapters.filter((c) => !c.skipped);
}
