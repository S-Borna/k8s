# Tentaplugg — Kubernetes

Personlig studieapp inför Kubernetes-tentan **12 juni 2026**, baserad på *The Kubernetes Book 2025 Edition* (Nigel Poulton) och Giacomo Turattos lektioner på Chas Academy. Funkar för Said och hans 35 klasskamrater — varje besökare får sin egen progress lokalt utan login.

Live: [k8s.saidborna.com](https://k8s.saidborna.com)

## Arkitektur

- **Vite 8 + React 19 + TypeScript strict** — typesäkert, snabbt
- **Tailwind v4** via `@tailwindcss/vite` med custom `@theme`-tokens
- **Motion (Framer)** för UI-animationer + spring-physics
- **react-markdown + rehype-highlight** för kapitelinnehåll med syntax highlight
- **Inget backend** — all state i `LocalStorage`, all content som markdown i `content-source/`
- **Inget login** — varje enhet/browser har sin egen state. Cross-device sync via shareable URL.
- **Deploy** — Vercel, custom domain `k8s.saidborna.com`

## Komma igång lokalt

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produktion → dist/
npm run lint     # eslint
```

Verifiera att Opus-innehåll parsar korrekt:

```bash
npx tsx scripts/verify-content.ts
```

## Innehåll

`content-source/` är källan. Opus skriver markdown här enligt formatet i `content-source/README.md` — sex H1-sektioner per kapitel, parsas runtime av Vite.

```
content-source/
  chapters/
    00-preface.md
    01-kubernetes-primer.md
    ...
    17-real-world-security.md
  mock-exam.md
  README.md          # format-spec för Opus
```

Inga genererade filer i `src/content/` — `import.meta.glob('?raw')` läser markdown direkt vid build, parser i `src/lib/markdown.ts` strukturerar.

## Deploy till Cloudflare Pages + k8s.saidborna.com

`saidborna.com` ligger redan på Cloudflare DNS, så Pages är rakaste valet — bygge, hosting, DNS och SSL på samma plattform.

### Engångsstart

1. Pusha repot till GitHub:
   ```bash
   git push -u origin main
   ```
2. Logga in på [dash.cloudflare.com](https://dash.cloudflare.com)
3. Sidomenyn → **Workers & Pages** → **Create application** → fliken **Pages** → **Connect to Git**
4. Auktorisera GitHub om det inte redan är gjort, välj repot `S-Borna/k8s`
5. Build settings:
   - Framework preset: **Vite** (auto-detekteras)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Node version: 22 eller senare (sätts via env-var `NODE_VERSION=22` om Pages default är äldre)
6. Klicka **Save and Deploy** — första bygget tar ~60s

Varje deploy får en URL som `tentaplugg-k8s.pages.dev`.

### Custom domain — k8s.saidborna.com

7. I Pages-projektet → fliken **Custom domains** → **Set up a custom domain**
8. Skriv `k8s.saidborna.com` → **Continue**
9. Cloudflare upptäcker att domänen ligger på samma konto och skapar CNAME-rekordet automatiskt. Klicka **Activate**.
10. SSL-certifikat utfärdas inom 1-2 minuter (Universal SSL via Let's Encrypt). Ingen manuell konfig.

### SPA-routing

`public/_redirects` har raden `/* /index.html 200`. Cloudflare Pages läser den filen automatiskt vid deploy och alla okända rutter pekas till `index.html` — React Router tar över klient-side. Utan den hade `/kapitel/4` direkt-laddat gett 404.

### Auto-deploy

Varje push till `main` triggar ny deploy. PR-branchar får preview-URL:er automatiskt.

### Köra utan custom domain

Om DNS-ändringen inte är gjord ännu — `tentaplugg-k8s.pages.dev` (eller motsvarande) funkar direkt efter första bygget. Säg åt klassen att gå dit tills custom domain är på plats.

## Personalisering

Ingen inloggning. Första besöket: appen frågar om namnet (sparas lokalt). Varje klasskamrat öppnar appen i sin browser → egen LocalStorage → egen progress. Ingen ser någon annans data.

För att flytta progress mellan dina egna enheter (laptop ↔ mobil):
1. Inställningar → Cross-device sync → "Skapa & kopiera länk"
2. Öppna länken på den andra enheten — progressen importeras

## Tangentbordsgenvägar

Inom flashcard-läge:
- `Space` — vänd kort
- `1` — Kunde inte
- `2` — Delvis
- `3` — Kunde

## Kapitelinnehåll

Kap 0-8 + 10-17 ifyllt (kap 9 hoppas över enligt spec). Varje kapitel har:

- **Sammanfattning** — kärninnehåll ur boken
- **Giacomos tillägg** — bok-relaterad expansion
- **Lektion** — *tom mall*, fylls efter Giacomos live-lektion
- **Hands-on** — bok-exercises med kommandon
- **Lektion hands-on** — *tom mall*, övningar Giacomo gick igenom live
- **Flashcards** — Q/A-par för spaced repetition

Totalt vid Dag 7: 144 flashcards + 95 hands-on-steg + 39 mock-tenta-frågor.

## Spec & plan

- `spec.md` — datamodeller, sidstruktur, designprinciper
- `plan.md` — 7-dagars build-plan
- `content-source/README.md` — innehållsformat för Opus
