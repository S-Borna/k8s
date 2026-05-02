import type { AppState, Chapter } from "@/types";

export function computeChapterCompletion(
  chapter: Chapter,
  state: AppState,
): number {
  if (chapter.skipped) return 1;
  const progress = state.chapterProgress[chapter.id];
  if (!progress) return 0;

  let weights = 0;
  let earned = 0;

  weights += 1;
  if (progress.summaryRead) earned += 1;

  if (chapter.handsOn.length > 0) {
    weights += 1;
    const done = chapter.handsOn.filter(
      (s) => progress.handsOnSteps[s.id],
    ).length;
    earned += done / chapter.handsOn.length;
  }

  if (chapter.flashcards.length > 0) {
    weights += 1;
    const reviewed = chapter.flashcards.filter(
      (fc) => state.flashcardState[fc.id]?.lastReview,
    ).length;
    earned += reviewed / chapter.flashcards.length;
  }

  return weights === 0 ? 0 : earned / weights;
}

export function countDueFlashcards(state: AppState): number {
  const now = new Date();
  let count = 0;
  for (const fc of Object.values(state.flashcardState)) {
    if (new Date(fc.nextDue).getTime() <= now.getTime()) count++;
  }
  return count;
}

export function countCompletedChapters(
  chapters: Chapter[],
  state: AppState,
): number {
  return chapters.filter(
    (c) => !c.skipped && state.chapterProgress[c.id]?.status === "completed",
  ).length;
}
