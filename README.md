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

## Deploy till Vercel + k8s.saidborna.com

### Engångsstart

1. Pusha repot till GitHub: `git push -u origin main`
2. Logga in på [vercel.com](https://vercel.com), klicka "Add New → Project"
3. Importera GitHub-repot `S-Borna/k8s`
4. Framework preset: **Vite** (auto-detekteras)
5. Build settings (auto):
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
6. Klicka **Deploy** — första deploy tar ~30s

### Custom domain

7. Gå till projekt-settings → **Domains**
8. Lägg till `k8s.saidborna.com`
9. Vercel ger dig en CNAME-rekord. I din DNS för `saidborna.com`:
   ```
   Type:  CNAME
   Name:  k8s
   Value: cname.vercel-dns.com
   ```
10. Vänta 1-5 minuter på DNS-propagation. SSL-cert (Let's Encrypt) sätts upp automatiskt.

### Auto-deploy

Varje push till `main` triggar ny deploy. Branch-deploys får preview-URL:er.

`vercel.json` i repo-roten konfigurerar SPA-fallback (alla routes → `index.html`) och immutable cache på hashade assets.

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
