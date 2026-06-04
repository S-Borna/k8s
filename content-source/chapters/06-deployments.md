---
id: 6
title: "Kubernetes Deployments"
titleSv: "Kubernetes Deployments"
estimatedMinutes: 50
---

# Sammanfattning

Deployments är **det vanligaste sättet** att köra stateless appar på K8s. De wrappar Pods och ger self-healing, skalning, rolling updates och rollbacks.

## Arkitektur

Deployment → ReplicaSet → Pod(s) → Container(s)

- **Deployment** — det du interagerar med. Definierar replikor, image, update-strategi.
- **ReplicaSet** — skapas automatiskt av Deployment. Hanterar self-healing och skalning. **Editera aldrig direkt.**
- **Pods** — skapas av ReplicaSet.

API-grupp: `apps/v1` (inte `v1` som Pods).

En microservice = en Deployment. Två microservices = två Deployments.

## Desired state och reconciliation

Du säger "10 replikor" i YAML. Det körs 8. ReplicaSet controller reconciliar → skapar 2 till. Automatiskt. Fungerar oavsett orsak (failure, skalning, eviction).

## Deklarativ vs imperativ

- **Deklarativ:** Beskriv VAD du vill. K8s löser HUR.
- **Imperativ:** Steg-för-steg-kommandon.

Även CLI använder deklarativ modell under huven — K8s jämför alltid desired vs observed.

## Autoscalers

- **HPA** (Horizontal Pod Autoscaler) — lägger till/tar bort Pods baserat på metrics. Vanligast.
- **CA** (Cluster Autoscaler) — lägger till/tar bort noder. Också horisontell skalning.
- **VPA** (Vertical Pod Autoscaler) — ökar CPU/minne på körande Pods. Sällan använt.

## Rolling updates

Fungerar bäst med löst kopplade microservices via API:er, backward/forward-kompatibla.

**Processen:**
1. Ändra image-version i deploy.yml
2. `kubectl apply -f deploy.yml`
3. Deployment controller skapar NY ReplicaSet
4. Ökar nya RS, minskar gamla — stegvis
5. Alltid replikor uppe → noll downtime

**Settings:**
```yaml
revisionHistoryLimit: 5        # Behåll 5 gamla RS för rollback
progressDeadlineSeconds: 300   # 5 min per replika att starta
minReadySeconds: 10            # Vänta 10s mellan varje
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1          # Max 1 under desired
    maxSurge: 1                # Max 1 över desired
```

## Rollbacks

Gamla ReplicaSets behålls med config intakt. Rollback = vind upp gamla RS, vind ner nya.

```bash
kubectl rollout history deployment hello-deploy
kubectl rollout undo deployment hello-deploy --to-revision=1
```

OBS: `rollout undo` är imperativt — uppdatera YAML-filen efter.

## YAML-struktur

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: hello-deploy
spec:
  replicas: 10
  selector:
    matchLabels:
      app: hello-world
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
      - name: hello-pod
        image: nigelpoulton/k8sbook:1.0
        ports:
        - containerPort: 8080
```

`selector.matchLabels` MÅSTE matcha `template.metadata.labels`. Kan inte ändras efter skapande.

## Skalning

**Imperativt:** `kubectl scale deploy hello-deploy --replicas 5` → YAML hamnar ur sync. Nästa apply återställer.

**Deklarativt (rekommenderat):** Ändra `replicas:` i YAML → apply.

# Giacomos tillägg

> 💡 Tentarelevant: Skillnaden mellan Deployment, ReplicaSet, Pod. Editera aldrig ReplicaSet direkt.

> 💡 Tentarelevant: Förklara varför nedskalning är långsammare än uppskalning. Svar: undvika "flapping" (skala upp/ner i onödan när last varierar).

# Lektion

**Lektion 15 april — Kap 6: Deployments, rollouts, HPA**

Live-demo-tung lektion. Giacomo visade rolling updates med olika parametrar, broken deployments, rollbacks, och en sneak peek på HPA. Mycket att smälta.

## Vad Giacomo visade

### Rolling updates med olika parametrar

Han deployade samma app tre gånger med olika strategier för att visa hastighet vs säkerhet:

- **20 replikor, maxSurge=1, maxUnavailable=0** → ~2 min, alltid 20 ready
- **20 replikor, maxSurge=5, maxUnavailable=0** → ~35 sek, alltid 20 ready
- **20 replikor, maxSurge=3, maxUnavailable=3** → snabbare men totalen sjunker tillfälligt till 17

Lärdom: höjer du `maxSurge` får du snabbare deploy men mer resursanvändning under övergången. Tillåter du `maxUnavailable > 0` accepterar du tillfällig minskning av kapacitet.

### Change-cause annotations

```yaml
metadata:
  annotations:
    kubernetes.io/change-cause: "update to version 3"
```

Syns i `kubectl rollout history`. **Bra för att spåra vad varje revision innehåller**. Annars ser du bara revisionsnumren utan förklaring vad ändringen var.

### Broken deployment (readiness probe)

Giacomo ändrade porten i containern (5677) men lät readiness probe peka på 5678. Pods startade men blev aldrig ready → rollouten fastnade. Pods hängde i `Running` men `0/1 Ready`.

Lösning: `kubectl rollout undo`. Klustret rullade tillbaka till föregående revision. Inget downtime — gamla Pods hade aldrig tagits ner eftersom nya inte blev ready.

### Rollout history — inga dubbletter

När en revision återanvänds (rollback) **flyttas den till slutet av historiken**. Aldrig dubbletter. Detta är en designdetalj för att hålla historiken ren.

### HPA live-demo (sneak peek)

- Skapade load-Pods som curlade servicen i oändlig loop
- HPA skalade från 3 → 20 Pods när CPU ökade
- Tog bort load-Pods → väntade ~5 min → skalade ner till 1
- Visade `behavior`-config för snabbare nedskalning
- **Krav:** metrics-server installerad + requests/limits på Deployment

### Flera manifest i en fil

Använd `---` för att separera. Giacomo hade Deployment + Service i samma fil. Praktiskt — relaterade resurser ligger ihop. `kubectl apply -f file.yaml` deployar båda.

### Skalning med `kubectl edit`

`kubectl scale` blockerat i labbklustret (RBAC-problem — saknade scale-subresurs). `kubectl edit deployment` fungerade som workaround. Han fixade RBAC senare och skickade ny kubeconfig.

## Q&A — viktiga insikter

### "Man skriver aldrig manifest från scratch"

Giacomo: "Utgå från befintliga manifest eller K8s docs. Kopiera och anpassa." YAML är lätt att fucka upp — börja från ett fungerande exempel.

### `revisionHistoryLimit`

Boken säger 5. I produktion är 20+ vanligt. Tar minimal plats — sparas som YAML i cluster store. Sätt högt om du har plats. Hellre för många historiska revisioner än för få vid en katastrof.

### DDoS + autoscaling

Utan `maxReplicas` kan en DDoS-attack spinna upp **oändliga Pods** → enorm faktura. Sätt alltid tak. Monitoring + larm när max nås.

### VPA

Sällsynt i praktiken. Går emot cloud-native-principen om horisontell skalning. **HPA är default-valet.**

### Deklarativ modell även i CLI

Även `kubectl create` och `kubectl run` använder deklarativ modell under huven. K8s jämför alltid desired vs observed. Skillnaden är bara HUR du levererar desired state — via YAML eller via CLI-args.

## Problem under lektionen

- **`kubectl scale` blockerat** i labbklustret — RBAC saknade scale-subresurs. Giacomo fixar.
- **Ny kubeconfig kommer** när permissions uppdateras.
- **Stresstestning med många hundra Pods** i ett delat kluster — undvik. Tar resurser från andra och kan trigga node pressure.

## Kurslogistik

- **CC-klustret** är inte redo. Vänta med K8s-pipelines. Labba i doe25-labb.
- **Nästa lektion:** Kapitel 7 (Services) — längre kapitel
- **Handledning:** 14–16 idag

# Hands-on

## 1. Skapa Deployment

```bash
kubectl create deployment hello-deploy --image=nigelpoulton/k8sbook:1.0 --replicas=3
kubectl get deploy
kubectl get rs
kubectl get pods
```

Förväntat: Du ser Deployment, ReplicaSet (med hash i namnet), och 3 Pods.

## 2. Skala upp

```bash
kubectl scale deployment hello-deploy --replicas=10
kubectl get pods
```

Förväntat: 10 Pods nu.

## 3. Trigga rolling update

```bash
kubectl set image deployment/hello-deploy hello-deploy=nigelpoulton/k8sbook:2.0
kubectl rollout status deployment/hello-deploy
```

Förväntat: Pods uppdateras stegvis till version 2.0.

## 4. Inspektera rollout-historik

```bash
kubectl rollout history deployment/hello-deploy
```

Förväntat: Två revisioner — första (1.0) och andra (2.0).

## 5. Rollback

```bash
kubectl rollout undo deployment/hello-deploy --to-revision=1
kubectl rollout status deployment/hello-deploy
```

Förväntat: Pods rullas tillbaka till 1.0.

## 6. Städa

```bash
kubectl delete deployment hello-deploy
```

# Lektion hands-on

Reproducera Giacomos demos:

## 1. Rolling update med olika parametrar

Skapa `deploy.yaml` med 20 replikor och `maxSurge=1, maxUnavailable=0`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  annotations:
    kubernetes.io/change-cause: "version 1"
spec:
  replicas: 20
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
```

Apply:
```bash
kubectl apply -f deploy.yaml
kubectl rollout status deployment/web
```

Förväntat: 20 Pods ready.

Triggera rolling update:
```bash
kubectl set image deployment/web nginx=nginx:1.26
kubectl annotate deployment/web kubernetes.io/change-cause="version 2" --overwrite
kubectl rollout status deployment/web    # ~2 min
```

Förväntat: Pods byts stegvis, alltid 20 ready.

Ändra till `maxSurge: 5` och uppdatera igen — märk skillnaden i hastighet (~35 sek istället för ~2 min).

## 2. Broken deployment (readiness probe-mismatch)

Lägg till readiness probe på fel port:

```yaml
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 8080      # nginx lyssnar på 80, inte 8080
          initialDelaySeconds: 5
```

Apply, kolla:
```bash
kubectl get pods    # 0/1 Ready, fastnar
kubectl rollout status deployment/web    # timeout
```

Förväntat: Nya Pods kör men blir aldrig ready. Gamla Pods tas inte ner — inget downtime.

Rollback:
```bash
kubectl rollout undo deployment/web
```

Förväntat: Tillbaka till förra revision direkt.

## 3. Rollout history med change-cause

```bash
kubectl rollout history deployment/web
```

Förväntat: Lista med revisioner och change-cause-text bredvid varje.

## 4. Cleanup

```bash
kubectl delete deployment/web
```

Förväntat: Deployment och alla Pods borta.

# Flashcards

## Q: Vad är skillnaden mellan Deployment, ReplicaSet och Pod?

**A:** Deployment är det du interagerar med - definierar antal replikor, image, update-strategi. ReplicaSet skapas automatiskt av Deployment och hanterar self-healing/skalning - editera den aldrig direkt. Pods är slutprodukten - skapas av ReplicaSet och kör dina containers. Hierarki: Deployment → ReplicaSet → Pods.

## Q: Vad gör maxSurge och maxUnavailable?

**A:** Vid rolling update styr de hastighet vs säkerhet. `maxSurge` = max antal Pods ÖVER desired. `maxUnavailable` = max antal Pods UNDER desired. maxSurge=1, maxUnavailable=0 → långsam men säker. maxSurge=5, maxUnavailable=0 → snabbare, fortfarande säker. maxUnavailable>0 → snabbast, men kapaciteten sjunker tillfälligt.

## Q: Hur fungerar rollback i K8s?

**A:** Gamla ReplicaSets behålls med sin config intakt (styrs av `revisionHistoryLimit`). Rollback = vind upp gamla RS, vind ner nya. `kubectl rollout undo deployment/<namn> --to-revision=N`. Viktigt: undo är imperativt - YAML-filen i Git är fortfarande den nya versionen, så uppdatera den.

## Q: Vad är HPA och vad krävs för att den ska fungera?

**A:** Horizontal Pod Autoscaler - skalar antal Pods automatiskt baserat på metrics (CPU vanligast). Krav: metrics-server installerad i klustret + `resources.requests` definierat på Pods (annars vet HPA inte vad den ska jämföra mot). Sätt alltid `maxReplicas` för att undvika kostnadsexplosion.

## Q: Varför ska man inte editera ReplicaSets direkt?

**A:** ReplicaSets ägs av Deployments. Ändringar i RS skrivs över när Deployment-controllern reconcilierar. Vill du ändra något: ändra Deployment, så uppdaterar den RS. Detta är en del av K8s deklarativa modell.

## Q: Vad är "flapping" i auto-scaling?

**A:** När en autoscaler skalar upp och ner snabbt i onödan (t.ex. ner till 3, upp till 5, ner till 3 inom minuter). Slösar resurser och ger instabil prestanda. K8s motverkar detta med "stabilization windows" - default 5 min innan nedskalning. Därför är nedskalning långsammare än uppskalning.

## Q: Vad händer om image inte finns vid rolling update?

**A:** Nya Pods fastnar i `ImagePullBackOff`. Gamla Pods tas inte ner förrän nya blir ready — alltså fastnar hela rolloutet. Inget downtime, gamla versionen kör vidare. Kör `kubectl rollout undo` för att gå tillbaka.

## Q: Vad gör selector.matchLabels i en Deployment?

**A:** Definierar vilka Pods Deploymenten "äger" och hanterar. MÅSTE matcha `template.metadata.labels`. Kan inte ändras efter skapande - vill du ändra labels måste du skapa ny Deployment. Detta är limmet mellan Deployment, ReplicaSet, och Pods.

## Q: Vad är `change-cause` annotation?

**A:** Annotation `kubernetes.io/change-cause` som syns i `kubectl rollout history`. Beskriver vad varje revision innehåller (t.ex. "update to version 3"). Utan den ser du bara revisionsnummer — svårt att veta vad ändringen var. Måste uppdateras manuellt på varje deploy.

## Q: Varför sätter man alltid `maxReplicas` på HPA?

**A:** Utan tak kan en DDoS-attack eller bug spinna upp oändliga Pods - enorm faktura och resursutmattning av klustret. `maxReplicas` är en safety brake. Sätt också monitoring/larm när max nås så du vet när skalningen träffar taket.
