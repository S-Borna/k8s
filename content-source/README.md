# Innehållskällor — format för Opus

Den här mappen är **källan** för allt kapitelinnehåll. Said har en studieapp som läser från den här. Filerna här kompileras till TypeScript på build-tid (sker automatiskt, du behöver inte tänka på det).

## Mappstruktur

```
content-source/
  README.md                    ← den här filen
  chapters/
    00-preface.md              ← ett kapitel = en .md-fil
    01-kubernetes-primer.md
    02-kubernetes-architecture.md
    ...
    10-deployments.md
  mock-exam.md                 ← skriftliga tenta-frågor
```

## Hur du fyller i ett kapitel

Varje kapitelfil har **YAML-frontmatter** (metadata) följt av **fyra H1-sektioner**: Sammanfattning, Giacomos tillägg, Flashcards, Hands-on. Inget mer, inget mindre — om en sektion inte är relevant, lämna den tom (men behåll rubriken).

Se `00-preface.md` för en komplett mall med kommentarer.

### Frontmatter (alltid överst)

```yaml
---
id: 0                          # Kapitelnummer 0-17
title: "Preface and Introduction"
titleSv: "Förord och introduktion"
estimatedMinutes: 10           # Ungefärlig pluggtid
---
```

### Sektion 1 — `# Sammanfattning`

Vanlig markdown. Max ~600 ord per kapitel. Tänk **Said läser detta på mobilen sent på kvällen**.

- **Korta stycken** (3-4 rader max)
- **`inline-code`** för kommandon, objekt-typer, fältnamn
- **Kodblock** med `bash`/`yaml`-språk för exempel
- **## H2** för underrubriker
- Bilder/diagram: skippa för nu

Exempel:
```markdown
# Sammanfattning

En **Pod** är Kubernetes minsta deploybara enhet. Inte en container — en Pod **innehåller** containrar.

## Varför finns Pods?

Containrar i samma Pod delar:
- IP-adress (`localhost` mellan containrar)
- Storage volumes
- Lifecycle (startas och stoppas tillsammans)

Detta gör sidecar-mönstret möjligt: huvudcontainer + loggshipper + service mesh proxy = en Pod.
```

### Sektion 2 — `# Giacomos tillägg`

Allt som Giacomo lyfte på lektionen som **inte står i boken**:
- Hans live-demos
- Q&A-svar från klassen
- "Detta kommer på tentan"-tips
- Hans erfarenheter från riktiga prod-system

Markera med `> 💡 Tentarelevant:` när han uttryckligen sade det.

```markdown
# Giacomos tillägg

Giacomo visade att `kubectl run --restart=Never` skapar en **Pod direkt**, inte en Deployment. Användbart för tester men aldrig i prod.

> 💡 Tentarelevant: Han betonade att `kubectl run` är imperativt — i prod ska allt vara deklarativt via YAML. Tentafråga kan testa skillnaden mellan dessa paradigmen.
```

### Sektion 3 — `# Flashcards`

Korta Q/A-par för spaced repetition. **Mål: 8-15 kort per kapitel.**

Varje kort = en `## Q:` följt direkt av `**A:**`. Strikt format — parsern läser detta.

**Tonen i svaren:** förklara **VARFÖR**, inte bara VAD. Tentan är skriftlig.

```markdown
# Flashcards

## Q: Vad är skillnaden mellan deklarativ och imperativ?

**A:** Deklarativ = beskriv önskat tillstånd (`apply -f deploy.yaml`), K8s konvergerar dit. Imperativ = tala om exakt vad som ska hända (`kubectl run nginx`). Varför viktigt: K8s controller-loop bygger på deklarativt — imperativa kommandon skapar drift mellan vad som finns och vad som är versionerat.

## Q: Varför kan inte två containrar i samma Pod binda till samma port?

**A:** För att Pods delar nätverks-namespace. Båda containrarna ser samma `localhost` och samma portar. Det är samma anledning till att två processer på samma maskin inte kan binda till port 80 samtidigt.
```

### Sektion 4 — `# Hands-on`

Numrerade steg som Said kan köra. Varje steg = `## N. Titel` + beskrivning + kodblock + "Förväntat: ..."-rad.

**Mål: 4-8 steg per kapitel** som tar tillsammans 15-30 minuter.

```markdown
# Hands-on

## 1. Skapa ett lokalt kluster med kind

Behövs ett K8s-kluster lokalt för att testa kommandon. `kind` kör K8s-noder som Docker-containrar.

```bash
kind create cluster --name study
```

Förväntat: `Cluster "study" created` efter 30-60 sekunder.

## 2. Verifiera klustret

```bash
kubectl get nodes
kubectl cluster-info
```

Förväntat: 1 node `Ready`, role `control-plane`. `cluster-info` visar K8s API-server URL.
```

## Mock-tenta-frågor

I filen `mock-exam.md` — samma format som flashcards men med svårighetsgrad och kapitel-tag:

```markdown
## Q [medium · ch4]: Förklara varför en Service behövs framför Pods.

**A:** Pods är ephemera — startar om, byter IP, scalas upp/ned. Klienter kan inte rikta trafik mot en Pod-IP eftersom IP:n försvinner. En Service är en **stabil abstraktion** med fast ClusterIP + DNS-namn som load-balancerar till matchande Pods via labels. Varför viktigt: detta är K8s lösning på service discovery — utan Service ingen meningsfull kommunikation mellan komponenter.
```

`[svårighet · kapiteltag]`:
- Svårighet: `easy` / `medium` / `hard`
- Kapiteltag: `ch0` till `ch17` (eller `cross` för frågor som spänner flera kapitel)

## Vad du INTE behöver tänka på

- TypeScript, JSON, koddetaljer — Said sköter
- Filnamn — använd format `NN-namn.md` där NN är kapitelnummer (00-17)
- Kapitel 9 — hoppas över helt, skapa ingen fil
- Bilder — skippas för nu
- Layout/styling — appen renderar markdown automatiskt med snygg typografi

## Prioritering

1. **Sammanfattning + flashcards** för kap 0-10 först (det är core-pluggmaterialet)
2. **Hands-on** parallellt — Said kör dem live medan han läser
3. **Giacomos tillägg** sist — det Said redan har bra koll på men vill ha sammanfattat
4. **Mock-tenta-frågor** löpande — sikta på 30+ totalt fördelat över kapitlen

Tentadag: **12 juni 2026**.
