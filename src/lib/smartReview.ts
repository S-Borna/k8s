import type { AppState, Flashcard, MockExamQuestion } from "@/types";
import { getDueCards } from "@/lib/spacedRepetition";
import { computeWeakSpotsByTag } from "@/lib/weakSpots";

export type SmartReviewDeck = {
  dueCards: Flashcard[];
  weakSpotCards: Flashcard[];
  weakSpotTag: string | null;
  freshCards: Flashcard[];
  mockQuestion: MockExamQuestion | null;
};

type Options = {
  maxDue?: number;
  maxWeak?: number;
  maxFresh?: number;
  activeChapterIds?: number[];
};

export function buildSmartReview(
  cards: Flashcard[],
  state: AppState,
  mockQuestions: MockExamQuestion[],
  options: Options = {},
): SmartReviewDeck {
  const maxDue = options.maxDue ?? 10;
  const maxWeak = options.maxWeak ?? 5;
  const maxFresh = options.maxFresh ?? 3;
  const activeChapterIds = options.activeChapterIds;

  const dueCards = getDueCards(cards, state.flashcardState).slice(0, maxDue);
  const usedIds = new Set(dueCards.map((c) => c.id));

  const weakSpots = computeWeakSpotsByTag(cards, state);
  const top = weakSpots[0];
  let weakSpotCards: Flashcard[] = [];
  let weakSpotTag: string | null = null;
  if (top) {
    weakSpotTag = top.tag;
    weakSpotCards = cards
      .filter((c) => c.tags.includes(top.tag) && !usedIds.has(c.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, maxWeak);
    for (const c of weakSpotCards) usedIds.add(c.id);
  }

  const neverSeen = cards.filter(
    (c) => !state.flashcardState[c.id] && !usedIds.has(c.id),
  );
  const freshCards = neverSeen
    .sort(() => Math.random() - 0.5)
    .slice(0, maxFresh);

  const filteredMocks = activeChapterIds
    ? mockQuestions.filter(
        (q) => q.chapterId === null || activeChapterIds.includes(q.chapterId),
      )
    : mockQuestions;
  const mockQuestion = filteredMocks.length
    ? filteredMocks[Math.floor(Math.random() * filteredMocks.length)] ?? null
    : null;

  return { dueCards, weakSpotCards, weakSpotTag, freshCards, mockQuestion };
}
