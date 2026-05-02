# K8s Tentaplugg — Spec

## Vad är detta

En personlig studieapp för Said Ebadi inför Kubernetes-tentan 12 juni 2026. Allt innehåll baseras på "The Kubernetes Book 2025 Edition" (Nigel Poulton) plus lektionsanteckningar från Giacomo Turatto (DOE25, Chas Academy).

Måste fungera så här: Said öppnar appen, pluggar 30-90 min, stänger. Allt sparas lokalt. Funkar på mobil och desktop. Inget login, ingen backend, inga distraktioner.

## Användarprofil

- Said: 8 månader programmering, DevOps-student, har gjort hands-on för kap 0-10 redan
- Lär sig genom att GÖRA, inte genom att läsa
- Tentan är skriftliga svar (inte flerval) — måste kunna förklara VARFÖR, inte bara VAD
- Pluggar i 30-90 min-pass mellan andra projekt och jobb
- Använder mobilen lika ofta som datorn

## Mål

1. Förstå kärnan i varje kapitel (sammanfattningar)
2. Memorera nyckelkoncept (flashcards med spaced repetition)
3. Kunna utföra hands-on (checklist med kommandon)
4. Klara Giacomos skriftliga tenta (mock-tentor)

## Stack

- **Vite + React + TypeScript** — snabbt, modernt, typsäkert
- **Tailwind CSS** — utility-first, snabb iteration, mobil-vänligt
- **React Router** — sidnavigation
- **LocalStorage** — all state lokalt (progress, spaced repetition-data, mock-tenta-historik)
- **Markdown rendering** — `react-markdown` med syntax highlighting via `rehype-highlight`
- **Deploy** — Vercel
- **Domän** — subdomän under saidborna.com (`k8s.saidborna.com` eller `study.saidborna.com`)

INGEN backend. INGEN auth. INGEN databas. Allt innehåll hårdkodas som TypeScript-objekt eller markdown-filer i repot.

## Sidstruktur

```
/                           Dashboard — översikt + progress per kapitel
/kapitel/:n                 Kapitelvy med tabs: Sammanfattning, Flashcards, Hands-on, Giacomos tillägg
/flashcards                 Alla flashcards mixade, spaced repetition
/mock-tenta                 Random frågor, skriftliga svar, self-grade
/installningar              Reset progress, exportera/importera data
```

## Funktionalitet

### Dashboard
- Lista alla kapitel (0-17, hoppa över 9)
- Per kapitel visa: titel, status (ej börjat / pågår / klart), antal flashcards, sista pluggdatum
- Stor knapp: "Fortsätt där du slutade"
- Total progress (X av 17 kapitel klara)
- Senaste mock-tenta-resultat

### Kapitelvy
Fyra tabs:

**1. Sammanfattning**
- Markdown-rendrad text
- Kommandon i kodblock med "kopiera"-knapp
- Bilder/diagram om relevant
- "Markera som läst"-knapp (uppdaterar status)

**2. Flashcards**
- Visa fråga, klicka för att se svar
- Tre knappar: "Kunde inte" / "Kunde delvis" / "Kunde"
- Spaced repetition: kunde inte = idag igen, delvis = 1 dag, kunde = 3→7→14 dagar
- Progress: "5 av 22 kort kvar idag"

**3. Hands-on**
- Checklist med steg
- Varje steg har: beskrivning + kommando(n) + förväntad output
- Bockbar checkbox per steg
- Kopiera-knapp för kommandon
- "Återställ checklist"-knapp

**4. Giacomos tillägg**
- Markerade som tentarelevanta
- Sammanfattning av vad Giacomo visade live på lektionen som inte står i boken
- Hans Q&A-svar
- Hans heads-up om vad som är viktigt på tentan

### Flashcards-läge (global)
- Default: kort som är schemalagda idag (spaced repetition)
- Filter: per kapitel eller alla
- Sessionsstats: "Du har gått igenom 12 kort, 8 rätt"
- Slutförd session: visa stats + "kom tillbaka imorgon"

### Mock-tenta-läge
- "Starta ny mock-tenta": välj antal frågor (5/10/20)
- Slumpa frågor från alla kapitel
- Visa fråga, textarea för svar (skriftligt)
- "Klar med svar" → visa modellsvar bredvid ditt svar
- Self-grade: "Helt rätt" / "Halvrätt" / "Fel"
- Efter alla frågor: visa stats, vilka kapitel som var svaga
- Spara historik: lista över genomförda mock-tentor med datum + resultat

### Inställningar
- Reset progress (med bekräftelse)
- Exportera all data som JSON (backup)
- Importera JSON (återställ)
- Mörkt/ljust läge (default mörkt)

## Datamodell

### TypeScript-typer

```typescript
type Chapter = {
  id: number;                    // 0-17
  title: string;                  // "Working with Pods"
  titleSv: string;                // "Arbeta med Pods"
  summary: string;                // markdown
  giacomoNotes: string;           // markdown, lektionstillägg
  flashcards: Flashcard[];
  handsOn: HandsOnStep[];
  skipped?: boolean;              // true för kap 9
};

type Flashcard = {
  id: string;                     // unikt, t.ex. "ch4-fc-1"
  chapterId: number;
  question: string;
  answer: string;                 // kan vara markdown
  category?: string;              // valfri tagg
};

type HandsOnStep = {
  id: string;
  description: string;
  commands: string[];             // shell-kommandon att kopiera
  expectedOutput?: string;        // valfritt
  notes?: string;                 // ev. kommentar
};

type MockExamQuestion = {
  id: string;
  chapterId: number;
  question: string;
  modelAnswer: string;            // facit (markdown)
  difficulty: "easy" | "medium" | "hard";
};
```

### LocalStorage-state

```typescript
type AppState = {
  chapterProgress: Record<number, {
    status: "not_started" | "in_progress" | "completed";
    lastVisited: string;            // ISO date
    summaryRead: boolean;
    handsOnSteps: Record<string, boolean>;  // step_id -> done
  }>;
  flashcardState: Record<string, {
    box: 1 | 2 | 3 | 4;            // Leitner box
    nextDue: string;                // ISO date
    lastReview: string;
    correctStreak: number;
  }>;
  mockExamHistory: {
    date: string;
    score: number;
    total: number;
    questionResults: { questionId: string; grade: "right" | "half" | "wrong" }[];
  }[];
  settings: {
    theme: "dark" | "light";
  };
};
```

## Spaced repetition-logik (Leitner-system)

Fyra "boxar":
- Box 1 (idag): nytt eller fel kort
- Box 2 (om 1 dag): kunde delvis
- Box 3 (om 3 dagar): kunde
- Box 4 (om 7 dagar): kunde med säkerhet andra gången

Vid review:
- "Kunde inte" → tillbaka till Box 1, due idag
- "Kunde delvis" → +1 box (men inte över 3)
- "Kunde" → +1 box

Daglig session: visa kort vars `nextDue <= idag`.

## Innehåll

All kapitel-data finns redan. Kap 0-10 har fullständig data i Notion (sammanfattningar, flashcards, hands-on, Giacomos tillägg). Kap 11-17 byggs ut efterhand när Said går igenom dem med Claude.

Innehållet exporteras till TypeScript-filer i `src/content/`:

```
src/content/
  chapters/
    chapter-00.ts
    chapter-01.ts
    ...
    chapter-10.ts
  mockExamQuestions.ts
  index.ts                  // exports all
```

Initialt seedas med kap 0-10. Resterande läggs till efterhand.

## Mobile-first design

- Bottom navigation på mobil (kapitel / flashcards / mock-tenta / inställningar)
- Sidebar på desktop
- Touch-vänliga knappar (44px min)
- Swipe mellan flashcard-frågor
- Stor läsbar typografi
- Mörkt läge default (för plugg sent på kvällen)

## Designprinciper

- **Snabbt** — ingen laddtid, allt cached, instant page transitions
- **Fokuserat** — en sak åt gången, inga distraktioner
- **Pålitligt** — LocalStorage syncar omedelbart, ingen data tappas
- **Privat** — ingen tracking, inga cookies, ingen analytics
- **Vackert** — minimalistiskt, monospace för kommandon, generös whitespace

## Vad som INTE ska byggas (yet)

- Användarautentisering
- Backend / databas
- Multiplayer / dela med klasskamrater
- Native mobilapp
- Offline-mode (Service Worker) — kanske senare
- AI-tutor i appen (separat från Claude-chatten)
- Riktiga K8s-kluster i browsern
- Push-notifikationer
- Social features
