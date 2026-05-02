import type {
  Flashcard,
  FlashcardState,
  LeitnerBox,
  MockExamGrade,
} from "@/types";

export type ReviewResult = "wrong" | "half" | "right";

const BOX_INTERVAL_DAYS: Record<LeitnerBox, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
};

export function initialFlashcardState(): FlashcardState {
  return {
    box: 1,
    nextDue: todayIso(),
    lastReview: null,
    correctStreak: 0,
  };
}

export function recordReview(
  prev: FlashcardState | undefined,
  result: ReviewResult,
): FlashcardState {
  const base = prev ?? initialFlashcardState();
  const now = new Date();
  const nowIso = now.toISOString();

  let nextBox: LeitnerBox;
  let nextStreak: number;

  if (result === "wrong") {
    nextBox = 1;
    nextStreak = 0;
  } else if (result === "half") {
    nextBox = clampBox(base.box + 1, 3);
    nextStreak = 0;
  } else {
    nextBox = clampBox(base.box + 1, 4);
    nextStreak = base.correctStreak + 1;
  }

  const due = addDays(now, BOX_INTERVAL_DAYS[nextBox]);

  return {
    box: nextBox,
    nextDue: due.toISOString(),
    lastReview: nowIso,
    correctStreak: nextStreak,
  };
}

export function isDue(
  state: FlashcardState | undefined,
  now: Date = new Date(),
): boolean {
  if (!state) return true;
  return new Date(state.nextDue).getTime() <= now.getTime();
}

export function getDueCards(
  cards: Flashcard[],
  states: Record<string, FlashcardState>,
  now: Date = new Date(),
): Flashcard[] {
  return cards.filter((c) => isDue(states[c.id], now));
}

export function gradeFromMock(grade: MockExamGrade): ReviewResult {
  if (grade === "right") return "right";
  if (grade === "half") return "half";
  return "wrong";
}

function clampBox(n: number, max: 3 | 4): LeitnerBox {
  if (n < 1) return 1;
  if (n > max) return max;
  return n as LeitnerBox;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function todayIso(): string {
  const d = new Date();
  return d.toISOString();
}
