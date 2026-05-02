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

Giacomo gjorde **live-demos** av rolling updates med olika settings:
- 20 replikor, maxSurge=1, maxUnavailable=0 → ~2 min, alltid 20 ready
- 20 replikor, maxSurge=5, maxUnavailable=0 → ~35 sek, alltid 20 ready

Han visade också en **broken deployment** där readiness probe failade — rollouten fastnade. Lösning: `kubectl rollout undo`.

**HPA live-demo** (sneak peek):
- Skapade load-Pods som curlade servicen i oändlig loop
- HPA skalade från 3 → 20 Pods när CPU ökade
- Tog bort load → väntade ~5 min → skalade ner till 1
- VIKTIGT: Sätt alltid `maxReplicas` — utan tak kan DDoS spinna upp oändliga Pods → enorm faktura

`kubectl scale` blockerat i labbklustret (RBAC). `kubectl edit deployment` fungerar som workaround.

> 💡 Tentarelevant: Skillnaden mellan Deployment, ReplicaSet, Pod. Editera aldrig ReplicaSet direkt.

> 💡 Tentarelevant: Förklara varför nedskalning är långsammare än uppskalning. Svar: undvika "flapping" (skala upp/ner i onödan när last varierar).

# Lektion

<!-- Fylls i efter lektionen -->

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

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är skillnaden mellan Deployment, ReplicaSet och Pod?

**A:** Deployment är det du interagerar med - definierar antal replikor, image, update-strategi. ReplicaSet skapas automatiskt av Deployment och hanterar self-healing/skalning - editera den aldrig direkt. Pods är slutprodukten - skapas av ReplicaSet och kör dina containers. Hierarki: Deployment → ReplicaSet → Pods.

## Q: Vad gör maxSurge och maxUnavailable?

**A:** Vid rolling update: `maxSurge` = max antal Pods OVER desired (kan vara nummer eller procent). `maxUnavailable` = max antal Pods UNDER desired. Tillsammans styr de hur snabbt rolloutsker. maxSurge=1, maxUnavailable=0 = långsam men säker. maxSurge=5, maxUnavailable=0 = snabb och säker. maxUnavailable>0 = kortare downtime tolereras för snabbare rollout.

## Q: Hur fungerar rollback i K8s?

**A:** Gamla ReplicaSets behålls med sin config intakt (styrs av `revisionHistoryLimit`). Rollback = vind upp gamla RS, vind ner nya. `kubectl rollout undo deployment/<namn> --to-revision=N`. Viktigt: undo är imperativt - YAML-filen i Git är fortfarande den nya versionen, så uppdatera den.

## Q: Vad är HPA och vad krävs för att den ska fungera?

**A:** Horizontal Pod Autoscaler - skalar antal Pods automatiskt baserat på metrics (CPU vanligast). Krav: metrics-server installerad i klustret + `resources.requests` definierat på Pods (annars vet HPA inte vad den ska jämföra mot). Sätt alltid `maxReplicas` för att undvika kostnadsexplosion.

## Q: Varför ska man inte editera ReplicaSets direkt?

**A:** ReplicaSets ägs av Deployments. Ändringar i RS skrivs över när Deployment-controllern reconcilierar. Vill du ändra något: ändra Deployment, så uppdaterar den RS. Detta är en del av K8s deklarativa modell.

## Q: Vad är "flapping" i auto-scaling?

**A:** När en autoscaler skalar upp och ner snabbt i onödan (t.ex. ner till 3, upp till 5, ner till 3 inom minuter). Slösar resurser och ger instabil prestanda. K8s motverkar detta med "stabilization windows" - default 5 min innan nedskalning. Därför är nedskalning långsammare än uppskalning.

## Q: Vad händer om image inte finns vid rolling update?

**A:** Nya Pods fastnar i `ImagePullBackOff`. Eftersom maxUnavailable hindrar att gamla Pods tas ner förrän nya är ready, fastnar rolloutsen. Inget downtime - gamla version fortsätter köra. Kör `kubectl rollout undo` för att gå tillbaka.

## Q: Vad gör selector.matchLabels i en Deployment?

**A:** Definierar vilka Pods Deploymenten "äger" och hanterar. MÅSTE matcha `template.metadata.labels`. Kan inte ändras efter skapande - vill du ändra labels måste du skapa ny Deployment. Detta är limmet mellan Deployment, ReplicaSet, och Pods.

## Q: Vad är skillnaden mellan `kubectl rollout restart` och `kubectl delete pod`?

**A:** `rollout restart` triggar en rolling restart genom Deployment - en Pod i taget, respekterar maxUnavailable, downtime undviks. `kubectl delete pod` tar bort en specifik Pod direkt - om den ägs av Deployment skapas en ny direkt, men du har inte kontroll över ordningen om du gör det på flera. Restart är säkrare.

## Q: Vad är `kubectl scale` och varför används det sällan i prod?

**A:** Imperativt kommando som ändrar replicas-värdet på en Deployment direkt. Funkar men skapar drift mellan klustret och YAML i Git. I prod används HPA (automatisk) eller deklarativ uppdatering av YAML + apply. `kubectl scale` är mer för debugging och tester.
