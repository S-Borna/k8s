---
id: 0
title: "Preface and Introduction"
titleSv: "Förord och introduktion"
estimatedMinutes: 10
---

# Sammanfattning

Kapitel 0 sätter scenen för boken. Kubernetes (K8s) är en **orkestrator** för containeriserade applikationer — den startar, stoppar, skalar, helar och uppdaterar containers över ett kluster av maskiner.

## Vad K8s är

K8s tar bort det manuella arbetet med att hålla applikationer igång. Du beskriver vad du vill ha (10 kopior av en webbserver), och K8s ser till att det är så — även om noder kraschar, containers dör, eller trafik ökar plötsligt.

## Var K8s körs

K8s körs på alla större molnplattformar (AWS, Azure, GCP) och on-premises. Du kan köra det lokalt på din laptop med verktyg som `kind`, `minikube` eller Docker Desktop.

## Vad boken täcker

Boken bygger upp förståelse i lager:
1. Grunderna (vad K8s är, hur arkitekturen ser ut)
2. Kärnobjekt (Pods, Deployments, Services, Ingress)
3. Service discovery och nätverk
4. Storage och konfiguration
5. Säkerhet och RBAC

Varje kapitel har hands-on så du faktiskt kör kommandon — inte bara läser om dem.

# Giacomos tillägg

Giacomo betonar att boken är en **bra start men inte räcker** för en DevOps-roll. Boken lär dig ytan; produktionserfarenhet kräver att du själv driftar kluster, hanterar incidenter, och förstår nätverket på djupet.

> 💡 Tentarelevant: Förstå skillnaden mellan att **använda** K8s (köra kubectl-kommandon) och att **drifta** K8s (hantera control plane, etcd, certifikat). Tentan testar konceptuell förståelse, inte enbart kommandon.

# Lektion

Första lektionen 8 april kombinerade kap 0–3 i en genomgång. Det praktiska innehållet (kommandon, deployments, port-forward, lastbalansering, namespaces) ligger samlat under **Kap 3 — Skaffa Kubernetes** eftersom det är där hands-on börjar.

Snabb sammanfattning av vad första lektionen täckte:

- Skapade deployment med kicbase/echo-server, exponerade som Service, skalade till 5
- Port-forward ger INTE riktig lastbalansering — Service gör det
- Bevisade lastbalansering med curl-loop från intern Alpine-pod
- Namespace-isolering: kort namn i samma NS, FQDN cross-NS
- Image pull errors felsöks via `kubectl describe pod` (Events-sektionen)
- Från nästa lektion: alltid YAML-manifest, inte imperativa kommandon

# Hands-on

## 1. Verifiera att Docker Desktop körs

Boken förutsätter att du har en lokal containerruntime. Docker Desktop är enklast på Mac.

```bash
docker version
```

Förväntat: Client och Server visas båda med versioner. Server måste vara igång — om det säger "Cannot connect", starta Docker Desktop-appen.

## 2. Verifiera kubectl

`kubectl` är CLI-verktyget för att prata med K8s. Det installeras automatiskt med Docker Desktop.

```bash
kubectl version --client
```

Förväntat: Client version skrivs ut (t.ex. v1.34.x).

## 3. Skapa ett lokalt kluster

Boken använder `kind` (Kubernetes IN Docker) för lokala kluster. Docker Desktop's inbyggda K8s funkar också.

```bash
kind create cluster --name study --config kind-config.yaml
```

Förväntat: 1-2 minuter att starta. När klart: `kubectl get nodes` ska visa 1+ noder med status `Ready`.

# Lektion hands-on

Inga lektion-specifika hands-on i kap 0. Se Kap 3 för 8 april-genomgången.

# Flashcards

## Q: Vad är Kubernetes i en mening?

**A:** Kubernetes är en orkestrator för containers — den startar, stoppar, skalar, helar och uppdaterar appar över ett kluster av maskiner. Du slipper sköta enskilda servrar manuellt.

## Q: Vad menas med att K8s är "deklarativ"?

**A:** Du beskriver önskat läge i YAML (t.ex. 10 nginx-Pods) och K8s jobbar hela tiden för att verkligheten ska matcha. Motsatsen är imperativ — där du säger steg för steg vad som ska hända. Deklarativt gör self-healing möjligt.

## Q: Varför körs K8s ovanpå containers istället för VMs?

**A:** Containers startar på sekunder och paketerar app + runtime som en enhet — VMs tar minuter och drar mycket mer resurser. K8s kan därför ersätta en trasig container på sekunder utan att användaren märker något.

## Q: Vad gör en orkestrator?

**A:** Den schemalägger workloads till noder, övervakar hälsa, ersätter trasiga instanser, balanserar trafik och hanterar config + secrets. Utan orkestrator gör du allt detta manuellt eller med egna skript.