import { useCallback, useMemo } from "react";
import type { AppState, ChapterProgress, Settings } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const STORAGE_KEY = "k8s-tentaplugg:v1";

export const DEFAULT_EXAM_DATE = "2026-06-12";

const initialState: AppState = {
  chapterProgress: {},
  flashcardState: {},
  mockExamHistory: [],
  settings: { theme: "dark", userName: null, examDate: null },
};

const initialChapterProgress: ChapterProgress = {
  status: "not_started",
  lastVisited: null,
  summaryRead: false,
  handsOnSteps: {},
};

export function useAppState() {
  const [state, setState] = useLocalStorage<AppState>(STORAGE_KEY, initialState);

  const getChapterProgress = useCallback(
    (chapterId: number): ChapterProgress => {
      return state.chapterProgress[chapterId] ?? initialChapterProgress;
    },
    [state.chapterProgress],
  );

  const updateChapterProgress = useCallback(
    (chapterId: number, update: Partial<ChapterProgress>) => {
      setState((prev) => {
        const current = prev.chapterProgress[chapterId] ?? initialChapterProgress;
        return {
          ...prev,
          chapterProgress: {
            ...prev.chapterProgress,
            [chapterId]: { ...current, ...update },
          },
        };
      });
    },
    [setState],
  );

  const reset = useCallback(
    (preserveSettings = true) => {
      setState((prev) => ({
        ...initialState,
        settings: preserveSettings ? prev.settings : initialState.settings,
      }));
    },
    [setState],
  );

  const updateSettings = useCallback(
    (update: Partial<Settings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...update },
      }));
    },
    [setState],
  );

  return useMemo(
    () => ({
      state,
      setState,
      getChapterProgress,
      updateChapterProgress,
      updateSettings,
      reset,
    }),
    [state, setState, getChapterProgress, updateChapterProgress, updateSettings, reset],
  );
}

export function getEffectiveExamDate(settings: Settings): Date {
  return new Date(settings.examDate ?? DEFAULT_EXAM_DATE);
}

export function useLastVisitedChapter(): number | null {
  const { state } = useAppState();
  let bestId: number | null = null;
  let bestTime = -Infinity;
  for (const [id, progress] of Object.entries(state.chapterProgress)) {
    if (!progress.lastVisited) continue;
    const t = new Date(progress.lastVisited).getTime();
    if (t > bestTime) {
      bestTime = t;
      bestId = Number(id);
    }
  }
  return bestId;
}
