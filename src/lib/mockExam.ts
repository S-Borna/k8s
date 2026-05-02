import type {
  MockExamDifficulty,
  MockExamGrade,
  MockExamQuestion,
  MockExamRun,
} from "@/types";

export function pickQuestions(
  pool: MockExamQuestion[],
  count: number,
  chapterFilter: number | null = null,
  difficultyFilter: MockExamDifficulty | null = null,
): MockExamQuestion[] {
  let filtered = pool;
  if (chapterFilter !== null) {
    filtered = filtered.filter(
      (q) => q.chapterId === chapterFilter || q.chapterId === null,
    );
  }
  if (difficultyFilter !== null) {
    filtered = filtered.filter((q) => q.difficulty === difficultyFilter);
  }
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function difficultyCount(
  pool: MockExamQuestion[],
  difficulty: MockExamDifficulty,
): number {
  return pool.filter((q) => q.difficulty === difficulty).length;
}

export function scoreFromGrades(
  grades: Record<string, MockExamGrade>,
): number {
  let score = 0;
  for (const g of Object.values(grades)) {
    if (g === "right") score += 1;
    else if (g === "half") score += 0.5;
  }
  return score;
}

export function buildRun(
  questions: MockExamQuestion[],
  grades: Record<string, MockExamGrade>,
): MockExamRun {
  return {
    date: new Date().toISOString(),
    score: scoreFromGrades(grades),
    total: questions.length,
    questionResults: questions.map((q) => ({
      questionId: q.id,
      grade: grades[q.id] ?? "wrong",
    })),
  };
}

export function weakChapters(
  questions: MockExamQuestion[],
  grades: Record<string, MockExamGrade>,
): { chapterId: number; missed: number; total: number }[] {
  const buckets = new Map<number, { missed: number; total: number }>();
  for (const q of questions) {
    if (q.chapterId === null) continue;
    const b = buckets.get(q.chapterId) ?? { missed: 0, total: 0 };
    b.total += 1;
    if (grades[q.id] !== "right") b.missed += 1;
    buckets.set(q.chapterId, b);
  }
  return [...buckets.entries()]
    .map(([chapterId, v]) => ({ chapterId, ...v }))
    .filter((b) => b.missed > 0)
    .sort((a, b) => b.missed - a.missed);
}
