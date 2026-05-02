import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  parseChapterMarkdown,
  parseFlashcards,
  parseHandsOnSteps,
  parseMockExam,
} from "../src/lib/markdown.ts";

const root = join(import.meta.dirname, "..");
const chaptersDir = join(root, "content-source/chapters");
const mockExamPath = join(root, "content-source/mock-exam.md");

let totalCards = 0;
let totalSteps = 0;
let totalLectureSteps = 0;
let errors = 0;

for (const file of readdirSync(chaptersDir).sort()) {
  if (!file.endsWith(".md")) continue;
  const path = join(chaptersDir, file);
  const raw = readFileSync(path, "utf-8");
  const parsed = parseChapterMarkdown(raw);
  const id = parsed.frontmatter["id"];
  const titleSv = parsed.frontmatter["titleSv"];

  if (typeof id !== "number" || typeof titleSv !== "string") {
    console.error(`✗ ${file}: bad frontmatter`, parsed.frontmatter);
    errors++;
    continue;
  }

  const cards = parseFlashcards(parsed.sections["Flashcards"], id);
  const steps = parseHandsOnSteps(parsed.sections["Hands-on"], id, "step");
  const lstep = parseHandsOnSteps(
    parsed.sections["Lektion hands-on"],
    id,
    "lstep",
  );

  totalCards += cards.length;
  totalSteps += steps.length;
  totalLectureSteps += lstep.length;

  console.log(
    `✓ ch${String(id).padStart(2, "0")}  ${titleSv.padEnd(30)}  ` +
      `${cards.length} kort · ${steps.length} steg · ${lstep.length} lektion-steg`,
  );
}

const mockRaw = readFileSync(mockExamPath, "utf-8");
const mockQs = parseMockExam(mockRaw);

console.log("");
console.log(`Totals: ${totalCards} flashcards · ${totalSteps} hands-on-steg · ${totalLectureSteps} lektion-steg · ${mockQs.length} mock-frågor`);

if (errors > 0) {
  console.error(`\n${errors} fel`);
  process.exit(1);
}
