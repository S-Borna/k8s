export type Flashcard = {
  id: string;
  chapterId: number;
  question: string;
  answer: string;
  tags: string[];
};

export type HandsOnStep = {
  id: string;
  number: number;
  title: string;
  body: string;
};

export type YamlQuiz = {
  id: string;
  chapterId: number;
  number: number;
  title: string;
  description: string;
  yaml: string;
  answer: string;
  explanation: string;
};

export type Scenario = {
  id: string;
  chapterId: number;
  number: number;
  title: string;
  situation: string;
  questions: string[];
  modelAnswer: string;
};

export type YamlWalkthroughSection = {
  title: string;
  body: string;
};

export type YamlWalkthrough = {
  id: string;
  title: string;
  source: "lecture" | "chas-challenge";
  sourceLabel: string;
  chapterId: number | null;
  filename: string;
  yaml: string;
  why: string;
  sections: YamlWalkthroughSection[];
  examPoints: string[];
};

export type Chapter = {
  id: number;
  title: string;
  titleSv: string;
  estimatedMinutes: number;
  summary: string;
  giacomoNotes: string;
  lecture: string;
  handsOn: HandsOnStep[];
  lectureHandsOn: HandsOnStep[];
  flashcards: Flashcard[];
  yamlQuizzes: YamlQuiz[];
  scenarios: Scenario[];
  skipped?: boolean;
};

export type MockExamDifficulty = "easy" | "medium" | "hard";

export type MockExamQuestion = {
  id: string;
  chapterId: number | null;
  difficulty: MockExamDifficulty;
  question: string;
  modelAnswer: string;
};

export type ChapterStatus = "not_started" | "in_progress" | "completed";

export type ChapterProgress = {
  status: ChapterStatus;
  lastVisited: string | null;
  summaryRead: boolean;
  handsOnSteps: Record<string, boolean>;
};

export type LeitnerBox = 1 | 2 | 3 | 4;

export type FlashcardState = {
  box: LeitnerBox;
  nextDue: string;
  lastReview: string | null;
  correctStreak: number;
};

export type MockExamGrade = "right" | "half" | "wrong";

export type MockExamRun = {
  date: string;
  score: number;
  total: number;
  questionResults: { questionId: string; grade: MockExamGrade }[];
};

export type Settings = {
  theme: "dark" | "light";
  userName: string | null;
  examDate: string | null;
};

export type AppState = {
  chapterProgress: Record<number, ChapterProgress>;
  flashcardState: Record<string, FlashcardState>;
  mockExamHistory: MockExamRun[];
  settings: Settings;
};
