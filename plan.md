# K8s Tentaplugg — Build Plan

## Översikt

7 dagar till MVP. Sedan iteration baserat på faktisk användning.

## Dag 1: Foundation

### Setup
- Init Vite + React + TypeScript projekt i `/Users/mrebadi/Desktop/DevOps/K8s`
- Installera dependencies:
  - `react-router-dom`
  - `tailwindcss` + `postcss` + `autoprefixer`
  - `react-markdown` + `rehype-highlight` + `remark-gfm`
  - `lucide-react` (ikoner)
- Konfigurera Tailwind med custom theme (dark mode default)
- Sätt upp folder-struktur:
  ```
  src/
    components/
    pages/
    content/
      chapters/
    hooks/
    lib/
    types/
    App.tsx
    main.tsx
  ```
- Setup React Router med routes
- Skapa basic Layout-komponent (sidebar desktop, bottom nav mobil)
- Init Git, första commit

### Acceptance criteria
- Vite-projekt startar lokalt med `npm run dev`
- Routing funkar mellan tomma pages
- Tailwind dark mode default
- Layout responsiv (testa både desktop och mobil-viewport)

## Dag 2: Content scaffolding + Dashboard

### Innehållsstruktur
- Definiera TypeScript-typer i `src/types/index.ts` (från spec)
- Skapa `src/content/chapters/chapter-00.ts` (Preface) som template
- Skapa stub-filer för kap 1-10 med titel + tom data
- Skapa `src/content/index.ts` som exporterar alla kapitel som array
- Skapa `mockExamQuestions.ts` med 10 exempelfrågor (utbyggs senare)

### Dashboard-sida (`/`)
- Lista alla kapitel med progress-status
- "Fortsätt där du slutade"-knapp
- Total progress-bar
- Kort-design för varje kapitel (klick → navigera till kapitelvyn)

### LocalStorage-hook
- Skapa `useLocalStorage<T>` hook
- Skapa `useAppState` hook som wrappar all state
- Initial state med default-värden

### Acceptance criteria
- Dashboard visar alla 17 kapitel (kap 9 markerad som "skipped")
- Progress sparas i LocalStorage
- Klick på kapitel → navigerar till `/kapitel/:n`

## Dag 3: Kapitelvy med Sammanfattning + Hands-on

### Kapitelvy-layout
- Tab-navigation: Sammanfattning / Flashcards / Hands-on / Giacomos tillägg
- URL-state för aktiv tab (`/kapitel/4?tab=summary`)
- Tillbaka-knapp till Dashboard

### Sammanfattning-tab
- Render markdown med `react-markdown`
- Syntax highlighting för kodblock
- "Kopiera"-knapp på alla kodblock
- "Markera som läst"-knapp uppdaterar progress

### Hands-on-tab
- Lista alla steg som checklist
- Per steg: beskrivning + kommando-block + ev. förväntad output
- Bockbar checkbox per steg
- Progress sparas (vilka steg är klara)
- "Återställ"-knapp

### Giacomos tillägg-tab
- Markdown render
- Visuellt distinkt från sammanfattning (annan border/bg)
- Markerat som "Tentarelevant"

### Acceptance criteria
- Klick på kap 4 → ser sammanfattning + hands-on + Giacomos tillägg
- Bocka av hands-on-steg → status uppdateras
- "Markera som läst" → status går från "in_progress" till "completed"

## Dag 4: Flashcards med spaced repetition

### Flashcard-komponent
- Visa fråga, klicka för att se svar (flip-animation)
- Tre knappar efter svar: Kunde inte / Kunde delvis / Kunde
- Animation mellan kort

### Spaced repetition-logik
- Skapa `lib/spacedRepetition.ts`
- Implementera Leitner-system enligt spec
- `getDueCards(chapterId?: number): Flashcard[]`
- `recordReview(cardId: string, result: "wrong" | "half" | "right")`

### Flashcards-tab i kapitelvyn
- Visa endast kort från det kapitlet
- Filter: bara due idag / alla / nya kort

### Global flashcards-sida (`/flashcards`)
- Alla kort från alla kapitel
- Filter per kapitel
- Daglig sessionsstats
- "Sessionen klar!" när alla due-kort är reviewade

### Acceptance criteria
- Kunna gå igenom 5 kort, markera resultat
- Spaced repetition-state sparas
- Imorgon: bara fel-kort + nya kort visas
- Stats: "12 kort due idag, 5 kvar"

## Dag 5: Mock-tenta-läge

### Mock-tenta-flöde
- Sida: `/mock-tenta`
- Start: välj antal frågor (5/10/20) + ev. kapitelfilter
- Klick "Starta" → slumpa frågor
- Visa fråga + textarea för svar
- "Klar" → visa modellsvar bredvid
- Self-grade: 3 knappar
- Nästa fråga
- Slutskärm: stats + svaga kapitel

### Historik
- Spara varje genomförd mock-tenta i LocalStorage
- Visa lista på mock-tenta-sidan
- Klick på historisk tenta → se alla frågor + svar + grades

### Mock-tenta-frågor
- Skapa `mockExamQuestions.ts` med 30+ frågor från alla kapitel
- Kategorisera difficulty
- Modellsvar i Giacomos stil (förklara VARFÖR, inte bara VAD)

### Acceptance criteria
- Kunna starta 5-frågors mock-tenta
- Skriva svar, jämföra med facit
- Self-grade och se slutstats
- Historik sparas

## Dag 6: Polish + innehåll

### Innehållsmigration
- Exportera kap 0-10 från Notion till TypeScript-filer
- Skriv 100+ flashcards (vi har dessa redan)
- Skriv hands-on för varje kapitel
- Skriv Giacomos tillägg per kapitel
- Skriv 30+ mock-tenta-frågor

### Polish
- Smooth page transitions
- Loading states (även om allt är instant)
- Empty states ("inga flashcards due idag — kom tillbaka imorgon!")
- Error boundaries
- Confirm-dialoger för destruktiva actions (reset progress)
- Tangentbordsgenvägar i flashcard-läge (1 = fel, 2 = halv, 3 = rätt)

### Mobile-test
- Testa på iPhone/Android via Chrome DevTools mobile mode
- Justera typografi för läsbarhet
- Touch-targets minst 44px
- Testa portrait + landscape

### Acceptance criteria
- Allt kapitel 0-10 innehåll i appen
- Inga buggar i hands-on-flow
- Funkar smidigt på mobil

## Dag 7: Deploy + iteration

### Deploy
- Skapa Vercel-projekt
- Connect till GitHub repo
- Deploy från `main` branch
- Sätt upp custom domain (`k8s.saidborna.com` eller `study.saidborna.com`)
- Konfigurera DNS

### Inställningar-sida
- Reset progress (med bekräftelse)
- Export JSON
- Import JSON
- Theme toggle (även om dark är default)

### Final test
- Plugga 30 min i appen
- Identifiera friktion
- Fixa de tre värsta problemen

### Backlog för senare
- Kap 11-17 innehåll (läggs till när Said går igenom dem)
- Service Worker för offline
- PWA-install
- Statistik-sida (heatmap över pluggsessioner, längsta streak)
- Filter på flashcards (svåraste / lättaste)
- Fler mock-tenta-frågor från Giacomos lektioner

## Kritiska tekniska beslut

### Varför Vite?
Snabbare än CRA, bättre TypeScript-stöd, mindre bundlestorlek. Standard 2026.

### Varför LocalStorage?
- Ingen backend behövs → ingen drift, ingen kostnad, ingen latency
- 5MB räcker mer än väl för all denna data
- Synkroniserar omedelbart, ingen "loading state"
- Kan exporteras som JSON för backup

### Varför ingen auth?
- Single-user app
- Privat data stannar på enheten
- Snabbare att bygga, snabbare att använda

### Varför Tailwind?
- Utility-first = snabb iteration
- Tree-shaking ger små bundles
- Konsistent design utan custom CSS

### Varför hårdkodat innehåll?
- Innehållet ändras sällan (en gång per kapitel)
- TypeScript ger typsäkerhet
- Inget API-anrop = instant loading
- Versionerat i Git

## Risker

1. **Saknat innehåll för kap 11-17** — byggs ut efterhand, inte blocker för MVP
2. **Spaced repetition kan kännas pinsam** — start enkelt, iterera baserat på faktisk användning
3. **Mock-tenta-frågor inte i Giacomos stil** — Said reviewar och justerar facit
4. **Domain-setup på Vercel** — testat tidigare, ska vara enkelt
5. **Mobil-buggar** — testas på riktig enhet dag 6

## Success criteria för MVP

- Said pluggar 30 min/dag i appen
- Han föredrar appen framför Notion för flashcards och mock-tenta
- Han kommer ihåg mer efter en vecka jämfört med utan appen
- Han känner att han ligger bättre till inför tentan
