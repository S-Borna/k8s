---
id: 5
title: "Virtual clusters with Namespaces"
titleSv: "Virtuella kluster med Namespaces"
estimatedMinutes: 25
---

# Sammanfattning

Namespaces delar upp ett K8s-kluster i **virtuella kluster**. Inte samma sak som Linux kernel namespaces — K8s namespaces är en logisk gruppering av resurser.

## Vad Namespaces ger

- Egen scope för resursnamn (samma `Service` kan finnas i flera namespaces)
- Egna RBAC-regler per namespace
- Resource quotas (begränsa CPU/minne)
- Network policies (begränsa trafik mellan namespaces)

## Soft isolation vs hard isolation

**Soft isolation (Namespaces):** Lättviktigt, enkelt. En komprometterad workload i ett namespace kan ändå nå andra namespaces via nätverket.

**Hard isolation (separata kluster):** Egna kluster på dedikerad hårdvara. Riktig isolation. Vanligast för externa tenants.

Tumregel: Använd Namespaces inom samma organisation. Använd separata kluster mellan organisationer.

## Default Namespaces

Varje kluster har fyra:

- `default` — dit objekt hamnar utan annat val
- `kube-system` — control plane-komponenter (DNS, metrics)
- `kube-public` — objekt läsbara av alla
- `kube-node-lease` — node heartbeats

Lägg **aldrig** dina egna grejer i `kube-system`.

## Namespaced vs cluster-scoped

De flesta objekt är namespaced (Pods, Services, Secrets, ConfigMaps, Deployments). Vissa är cluster-scoped (Nodes, PersistentVolumes, Namespaces själva). Cluster-scoped objekt finns på hela klustret, inte inom ett namespace.

```bash
kubectl api-resources         # NAMESPACED-kolumnen visar true/false
```

## Skapa och använda Namespaces

**Imperativt:**
```bash
kubectl create namespace dev
```

**Deklarativt (dev-ns.yaml):**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    env: development
```

**Filtrera per namespace:**
```bash
kubectl get pods -n dev
kubectl get pods --all-namespaces
```

**Sätt default namespace för kubectl:**
```bash
kubectl config set-context --current --namespace=dev
```

## Vanliga use cases

- Dev/staging/prod-miljöer på samma kluster
- Per-team isolering (team-frontend, team-backend)
- Per-customer isolering (för SaaS, men bara om soft isolation räcker)

# Giacomos tillägg

Giacomo betonade **stenhårt** att Namespaces inte ger nätverksisolering. En Pod i namespace `frontend` kan curl:a en Service i namespace `backend` utan problem (med rätt FQDN: `service.namespace.svc.cluster.local`).

Vill du isolera nätverket: använd **NetworkPolicies** (separat objekt).

> 💡 Tentarelevant: Namespaces ger INTE nätverksisolering. Detta är en klassisk fälla. Tentafråga kan vara "Är Pods i olika namespaces isolerade från varandra?" — svaret är "Nej, inte by default. Namespaces är logisk gruppering, inte nätverksisolering. NetworkPolicies krävs för det."

> 💡 Tentarelevant: Förstå vad som är namespaced vs cluster-scoped. Nodes är cluster-scoped (de tillhör hela klustret, inte ett namespace).

# Lektion

**Lektion 13 april — Kap 5: Namespaces**

Giacomo kallade detta för **kortaste lektionen i hela utbildningen**. Kapitel 5 är kort, koncepten enkla. Men han slog hårt på en specifik punkt och gav ut en uppgift.

## Vad Giacomo visade

### Nätverksisolering är INTE en grej

Bara för att resurser är i olika Namespaces kan de fortfarande nå varandra på nätverksnivå. En Pod i namespace A kan curla en Service i namespace B via `servicename.namespace.svc.cluster.local`.

Innebörd: **Namespaces duger INTE för att isolera olika kunder**. Använd separata kluster då. Namespaces är för att dela miljöer/versioner inom samma organisation.

Han visade detta live — skapade två namespaces, deployade samma Service-namn i båda, exec:ade in i en Pod i ena namespacet och curlade Service:n i andra namespacet via FQDN. Funkade direkt.

### `api-resources`-flaggor

```bash
kubectl api-resources --namespaced=false   # Globala (nodes, PV, namespaces)
kubectl api-resources --namespaced=true    # Namespaced (pods, deployments, RS)
```

Han pekade på att **Namespaces själva är inte namespaced** — du kan inte ha namespaces i namespaces. Det är cluster-scoped.

### Samma namn i olika Namespaces

Giacomo visade: samma Pod-namn i `default` och `gg`-namespace — ingen krock. **Namn är unika inom Namespace, inte i klustret.**

### `use-context` vs `set-context`

- **`use-context`** = byta mellan kluster/kontexter
- **`set-context`** = editera en befintlig kontext (byta default namespace, user, etc.)

Praktiskt: `use-context` när du byter kluster, `set-context --current --namespace=foo` när du vill jobba i ett annat namespace utan att skriva `-n foo` på varje kommando.

### När använda `-n`-flagga vs `set-context`?

- **Snabb kontroll** (ett kommando): använd `-n`-flagga
- **Längre arbete** i ett namespace: ändra default med `set-context`

### Vanliga misstag — Giacomos egna erfarenheter

Giacomo berättade öppet att han själv har:
- Jobbat mot fel kluster
- Jobbat mot fel namespace
- **Raderat resurser i fel namespace → nedtid**

Kan bryta SLA. Därför: **visa alltid context + namespace i prompten**. Det är en defensiv åtgärd som kostar nothing och räddar dig från katastrof.

## Giacomos uppgift: PS1-variabel

Editera PS1 så att terminal-prompten visar:
- Aktivt context-namn
- Aktivt namespace

- Bash-användare: editera PS1 i `.bash_profile`
- Zsh: `.zshrc`
- PowerShell: annan variabel

Verktyget `kube-ps1` löser detta out of the box om du inte vill scripta själv.

## Q&A från lektionen

**Q: Kan jag ha Pod-namn `web` i flera namespaces?**
A: Ja. Namn är unika per namespace. Service `web` i `dev` och Service `web` i `prod` är OK.

**Q: Hur når jag en Service cross-namespace?**
A: FQDN: `<service>.<namespace>.svc.cluster.local`. Korta namn funkar bara inom samma namespace.

# Hands-on

## 1. Lista befintliga namespaces

```bash
kubectl get namespaces
```

Förväntat: Default-namespacesarna plus eventuellt egna.

## 2. Skapa ett nytt namespace

```bash
kubectl create namespace shield
```

Förväntat: `namespace/shield created`.

## 3. Skapa en Pod i specifikt namespace

```bash
kubectl run test-pod --image=nginx -n shield
kubectl get pods -n shield
```

Förväntat: Podden finns bara i `shield`, inte i `default`.

## 4. Kolla att den inte syns i default

```bash
kubectl get pods
```

Förväntat: Tom lista (om default är tomt). Pods är osynliga från andra namespaces by default.

## 5. Sätt default namespace

```bash
kubectl config set-context --current --namespace=shield
kubectl get pods
```

Förväntat: Nu visas `test-pod` utan att du anger `-n shield`.

## 6. Återställ default

```bash
kubectl config set-context --current --namespace=default
```

## 7. Städa

```bash
kubectl delete namespace shield
```

Förväntat: Allt i namespacet (Pod, Services, etc) raderas automatiskt. Smidigt sätt att städa.

# Lektion hands-on

## 1. Bevisa att namespaces inte ger nätverksisolering

Reproducera Giacomos demo:

```bash
kubectl create namespace shield
kubectl create namespace hydra

kubectl create deployment web -n shield --image=nginx
kubectl expose deployment web -n shield --port=80

kubectl run -it --rm spy -n hydra --image=alpine -- sh
# Inuti hydra-podden:
apk add --no-cache curl
curl web.shield.svc.cluster.local        # Funkar — cross-namespace
curl web                                 # Funkar inte — kort namn söker i hydra
```

## 2. Sätt upp PS1-prompten (Giacomos uppgift)

Installera kube-ps1:

```bash
brew install kube-ps1
```

Lägg till i `.zshrc`:

```bash
source /opt/homebrew/opt/kube-ps1/share/kube-ps1.sh
PROMPT='$(kube_ps1) '$PROMPT
```

Reload:
```bash
source ~/.zshrc
```

Förväntat: Prompten visar nu `(⎈|kontext-namn:namespace)` framför vanliga prompten. Byt context och namespace — prompten uppdateras direkt.

## 3. Testa misstaget

Detta är defensivt — försök göra ett misstag och se hur PS1 räddar dig:

```bash
kubectl config set-context --current --namespace=kube-system
# Prompten visar: (⎈|docker-desktop:kube-system)
# Nu är du i kube-system. Att radera saker här skulle vara katastrof.
# Tack vare prompten ser du det direkt.
```

## 4. Cleanup

```bash
kubectl delete namespace shield hydra
kubectl config set-context --current --namespace=default
```

# Flashcards

## Q: Vad är en Namespace i K8s?

**A:** En logisk gruppering av resurser inom ett kluster - virtuella kluster. Ger eget scope för resursnamn, egna RBAC-regler, resource quotas. Är INTE samma sak som Linux kernel namespaces, och ger INTE nätverksisolering by default.

## Q: Ger Namespaces nätverksisolering?

**A:** Nej. Pods i olika namespaces kan prata med varandra fritt via FQDN (`service.namespace.svc.cluster.local`). Vill du blockera trafik krävs NetworkPolicies. Detta är en vanlig missuppfattning - Namespaces är logisk gruppering, inte säkerhetsgräns.

## Q: Vad är skillnaden mellan namespaced och cluster-scoped objekt?

**A:** Namespaced objekt (Pods, Services, Secrets) finns inom ett specifikt namespace. Cluster-scoped objekt (Nodes, PersistentVolumes, Namespaces själva) tillhör hela klustret. Du kan inte sätta en Node i ett namespace.

## Q: Vilka är de fyra default-namespaces?

**A:** `default` (dit objekt hamnar utan annat val), `kube-system` (control plane), `kube-public` (läsbart för alla), `kube-node-lease` (node heartbeats). Lägg aldrig egna saker i `kube-system`.

## Q: När använder man Namespaces vs separata kluster?

**A:** Namespaces inom samma organisation - bra för dev/staging/prod, eller per-team isolering. Separata kluster mellan organisationer eller när hard isolation krävs (t.ex. olika customers i SaaS). Namespaces är soft isolation - en komprometterad workload kan nå andra namespaces.

## Q: Hur sätter man default namespace för kubectl?

**A:** `kubectl config set-context --current --namespace=<namn>`. Sparas i `~/.kube/config`. Användbart när du jobbar med ett specifikt namespace - slipper skriva `-n` på varje kommando.

## Q: Vad händer när man raderar ett namespace?

**A:** Alla resurser i det raderas automatiskt - Pods, Services, ConfigMaps, allt. Smidigt sätt att städa upp. Kan ta minuter om många resurser. Cluster-scoped objekt (Nodes) påverkas inte.

## Q: Hur når man en Service i ett annat namespace?

**A:** Med FQDN: `service.namespace.svc.cluster.local`. Kort namn (`service`) funkar bara i samma namespace. Detta beror på DNS search domains som är konfigurerade per namespace.

## Q: Vad är skillnaden mellan `use-context` och `set-context`?

**A:** `use-context` byter mellan befintliga kontexter (kluster). `set-context` editerar en kontext (t.ex. ändrar default namespace eller user). I praktiken: `use-context prod` för att byta till prod-klustret; `set-context --current --namespace=foo` för att ändra default namespace i aktivt kontext.
