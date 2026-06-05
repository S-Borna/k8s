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

## Q [workloads, deployments]: Vad är skillnaden mellan Deployment, ReplicaSet och Pod?

**A:** Deployment är det du interagerar med - definierar antal replikor, image, update-strategi. ReplicaSet skapas automatiskt av Deployment och hanterar self-healing/skalning - editera den aldrig direkt. Pods är slutprodukten - skapas av ReplicaSet och kör dina containers. Hierarki: Deployment → ReplicaSet → Pods.

## Q [workloads, deployments]: Vad gör maxSurge och maxUnavailable?

**A:** Vid rolling update styr de hastighet vs säkerhet. `maxSurge` = max antal Pods ÖVER desired. `maxUnavailable` = max antal Pods UNDER desired. maxSurge=1, maxUnavailable=0 → långsam men säker. maxSurge=5, maxUnavailable=0 → snabbare, fortfarande säker. maxUnavailable>0 → snabbast, men kapaciteten sjunker tillfälligt.

## Q [workloads, deployments]: Hur fungerar rollback i K8s?

**A:** Gamla ReplicaSets behålls med sin config intakt (styrs av `revisionHistoryLimit`). Rollback = vind upp gamla RS, vind ner nya. `kubectl rollout undo deployment/<namn> --to-revision=N`. Viktigt: undo är imperativt - YAML-filen i Git är fortfarande den nya versionen, så uppdatera den.

## Q [workloads, deployments]: Vad är HPA och vad krävs för att den ska fungera?

**A:** Horizontal Pod Autoscaler - skalar antal Pods automatiskt baserat på metrics (CPU vanligast). Krav: metrics-server installerad i klustret + `resources.requests` definierat på Pods (annars vet HPA inte vad den ska jämföra mot). Sätt alltid `maxReplicas` för att undvika kostnadsexplosion.

## Q [workloads, deployments]: Varför ska man inte editera ReplicaSets direkt?

**A:** ReplicaSets ägs av Deployments. Ändringar i RS skrivs över när Deployment-controllern reconcilierar. Vill du ändra något: ändra Deployment, så uppdaterar den RS. Detta är en del av K8s deklarativa modell.

## Q [workloads, deployments]: Vad är "flapping" i auto-scaling?

**A:** När en autoscaler skalar upp och ner snabbt i onödan (t.ex. ner till 3, upp till 5, ner till 3 inom minuter). Slösar resurser och ger instabil prestanda. K8s motverkar detta med "stabilization windows" - default 5 min innan nedskalning. Därför är nedskalning långsammare än uppskalning.

## Q [workloads, deployments]: Vad händer om image inte finns vid rolling update?

**A:** Nya Pods fastnar i `ImagePullBackOff`. Gamla Pods tas inte ner förrän nya blir ready — alltså fastnar hela rolloutet. Inget downtime, gamla versionen kör vidare. Kör `kubectl rollout undo` för att gå tillbaka.

## Q [workloads, deployments]: Vad gör selector.matchLabels i en Deployment?

**A:** Definierar vilka Pods Deploymenten "äger" och hanterar. MÅSTE matcha `template.metadata.labels`. Kan inte ändras efter skapande - vill du ändra labels måste du skapa ny Deployment. Detta är limmet mellan Deployment, ReplicaSet, och Pods.

## Q [workloads, deployments]: Vad är `change-cause` annotation?

**A:** Annotation `kubernetes.io/change-cause` som syns i `kubectl rollout history`. Beskriver vad varje revision innehåller (t.ex. "update to version 3"). Utan den ser du bara revisionsnummer — svårt att veta vad ändringen var. Måste uppdateras manuellt på varje deploy.

## Q [workloads, deployments]: Varför sätter man alltid `maxReplicas` på HPA?

**A:** Utan tak kan en DDoS-attack eller bug spinna upp oändliga Pods - enorm faktura och resursutmattning av klustret. `maxReplicas` är en safety brake. Sätt också monitoring/larm när max nås så du vet när skalningen träffar taket.

# YAML-quiz

## 1. Fyll i Deployment-basen

Komplettera Deployment-manifestet. Fyll i apiVersion, kind och rätt fält för antal Pods.

```yaml
apiVersion: ???
kind: ???
metadata:
  name: hello-deploy
spec:
  ???: 10
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
      - name: hello-pod
        image: nigelpoulton/k8sbook:1.0
```

**Svar:** `apiVersion: apps/v1`, `kind: Deployment`, `replicas: 10`

**Förklaring:** Deployments ligger i API-gruppen `apps/v1` (inte `v1` som Pods). `replicas` styr hur många Pods ReplicaSet ska hålla igång.

## 2. Rolling update-strategi

Du vill ha en snabb deploy utan att tappa kapacitet. Fyll i blanken så att max 1 Pod skapas över desired och inga Pods försvinner under tiden.

```yaml
spec:
  replicas: 20
  strategy:
    type: ???
    rollingUpdate:
      maxSurge: ???
      maxUnavailable: ???
```

**Svar:** `type: RollingUpdate`, `maxSurge: 1`, `maxUnavailable: 0`

**Förklaring:** `RollingUpdate` är default-strategin. `maxSurge: 1` tillåter en extra Pod över desired, och `maxUnavailable: 0` betyder att kapaciteten aldrig sjunker under rolloutet.

## 3. Hitta felet — selector mismatch

Manifestet applyas men Deploymenten skapar inga Pods. Vad är fel?

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

**Svar:** `selector.matchLabels` (`app: web`) matchar inte `template.metadata.labels` (`app: nginx`). Ändra båda till samma värde, t.ex. `app: web`.

**Förklaring:** Selector är limmet mellan Deployment, ReplicaSet och Pods. De måste matcha exakt, annars hittar Deployment inga Pods att äga. Selector går inte att ändra efter skapande — du måste delete och skapa om.

# Scenarios

## 1. Rollouten fastnar — Pods är Running men inte Ready

**Situation:** Du körde `kubectl set image deployment/web nginx=nginx:1.26` och sen `kubectl rollout status`. Det timear ut. `kubectl get pods` visar nya Pods som `Running` men `0/1 READY`. Gamla Pods kör fortfarande och appen svarar.

**Frågor:**
- Vad är troligaste orsaken?
- Hur diagnostiserar du vidare?
- Hur fixar du utan downtime?

**Modellsvar:** **Orsak:** Readiness probe failar på de nya Pods. Typiskt fel port, fel path eller appen tar längre tid att starta än `initialDelaySeconds`.

**Diagnos:**

```bash
kubectl describe pod <ny-pod>     # kolla Events och Readiness-rader
kubectl logs <ny-pod>             # ser appen ens HTTP-requesten?
```

Leta efter `Readiness probe failed: HTTP probe failed with statuscode` eller `connection refused`.

**Fix:** Eftersom gamla Pods aldrig togs ner är det noll downtime. Kör:

```bash
kubectl rollout undo deployment/web
```

Sen rätta probe-porten/pathen i YAMLn och apply igen. Precis det Giacomo visade på lektionen.

## 2. HPA skalar inte upp trots hög last

**Situation:** Du har en HPA som ska skala mellan 2 och 10 Pods vid 50% CPU. Du kör load mot servicen, CPU på containrarna ligger uppenbart över 80%, men `kubectl get hpa` visar `TARGETS   <unknown>/50%` och replikorna ligger kvar på 2.

**Frågor:**
- Vad är troligaste orsaken?
- Vilka två saker måste finnas på plats för att HPA ska kunna räkna?

**Modellsvar:** **Orsak:** `<unknown>` betyder att HPA inte får några metrics. Antingen saknas **metrics-server** i klustret, eller så har Deploymenten inga **`resources.requests`** definierat.

**Diagnos:**

```bash
kubectl top pods                  # om detta failar → metrics-server saknas
kubectl get deployment web -o yaml | grep -A 3 resources
```

**Fix:**

1. Installera metrics-server om `kubectl top pods` failar.
2. Lägg till `resources.requests.cpu` på containern i Deploymenten:

```yaml
resources:
  requests:
    cpu: 100m
```

HPA jämför aktuell CPU mot `requests`. Utan requests vet den inte vad 50% betyder.

## 3. Fel version i prod — snabb rollback

**Situation:** Du deployade `app:2.0` till prod för 10 minuter sen. Slack lyser rött — användare får 500-fel. Du behöver tillbaka till `1.0` NU. `kubectl rollout history deployment/checkout` visar revision 1, 2 och 3.

**Frågor:**
- Vilket kommando kör du för att rolla tillbaka till version 1.0?
- Vad behöver du tänka på efter rollbacken?

**Modellsvar:** **Diagnos:** Kolla först vilken revision som var 1.0:

```bash
kubectl rollout history deployment/checkout --revision=2
```

Antag att revision 2 är 1.0.

**Fix:**

```bash
kubectl rollout undo deployment/checkout --to-revision=2
kubectl rollout status deployment/checkout
```

Gamla ReplicaSet vinds upp, nya vinds ner. Noll downtime.

**Viktigt efter:** `rollout undo` är **imperativt** — YAMLn i Git är fortfarande `2.0`. Nästa person som kör `kubectl apply -f deploy.yml` deployar tillbaka det trasiga. Uppdatera YAML-filen till `1.0` direkt och pusha. Sätt också `change-cause` annotation så historiken blir tydlig.
