import type { AppState, Flashcard } from "@/types";

export type WeakSpot = {
  tag: string;
  weak: number;
  total: number;
  ratio: number;
};

export type WeakChapter = {
  chapterId: number;
  weak: number;
  total: number;
  ratio: number;
};

/**
 * Räknar ett kort som "svagt" om:
 *  - state finns OCH box === 1 (felade senast eller är ny + due), eller
 *  - state finns OCH correctStreak === 0 OCH lastReview finns (delvis/fel senast)
 */
function isCardWeak(cardId: string, state: AppState): boolean {
  const s = state.flashcardState[cardId];
  if (!s) return false;
  if (s.box === 1) return true;
  if (s.lastReview && s.correctStreak === 0) return true;
  return false;
}

export function computeWeakSpotsByTag(
  cards: Flashcard[],
  state: AppState,
): WeakSpot[] {
  const tagStats = new Map<string, { weak: number; total: number }>();

  for (const card of cards) {
    for (const tag of card.tags) {
      const stats = tagStats.get(tag) ?? { weak: 0, total: 0 };
      stats.total += 1;
      if (isCardWeak(card.id, state)) stats.weak += 1;
      tagStats.set(tag, stats);
    }
  }

  return Array.from(tagStats.entries())
    .map(([tag, { weak, total }]) => ({
      tag,
      weak,
      total,
      ratio: total === 0 ? 0 : weak / total,
    }))
    .filter((s) => s.weak > 0)
    .sort((a, b) => {
      if (b.weak !== a.weak) return b.weak - a.weak;
      return b.ratio - a.ratio;
    });
}

export function computeWeakChapters(
  cards: Flashcard[],
  state: AppState,
): WeakChapter[] {
  const stats = new Map<number, { weak: number; total: number }>();

  for (const card of cards) {
    const s = stats.get(card.chapterId) ?? { weak: 0, total: 0 };
    s.total += 1;
    if (isCardWeak(card.id, state)) s.weak += 1;
    stats.set(card.chapterId, s);
  }

  return Array.from(stats.entries())
    .map(([chapterId, { weak, total }]) => ({
      chapterId,
      weak,
      total,
      ratio: total === 0 ? 0 : weak / total,
    }))
    .filter((s) => s.weak > 0)
    .sort((a, b) => {
      if (b.weak !== a.weak) return b.weak - a.weak;
      return b.ratio - a.ratio;
    });
}
