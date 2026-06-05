---
title: "ForeverHome frontend Deployment (Next.js)"
source: chas-challenge
sourceLabel: "Chas Challenge — Frontend Deployment"
chapterId: 6
filename: "06-frontend-deployment.yaml"
---

# Varför

Frontend-deployment for ForeverHome — Next.js-appen som anvandaren ser. Den ar stateless, sa Said kor flera replicas och later K8s rulla ut nya versioner utan downtime. Hela poangen med Deployment + ReplicaSet — istallet for raw Pods — ar att fa self-healing och RollingUpdate gratis. Om en pod dor sa startar K8s en ny direkt.

# Kind och metadata

Deployment, inte Pod direkt (rad 1-7). Det betyder att K8s skapar ett ReplicaSet under huven som halller koll pa antalet pods. Labels `app: foreverhome` och `component: frontend` ar viktiga — Service-manifesten matchar pa exakt dessa for att veta vilka pods som ska fa trafik. Skriver du fel label har sa hittar Service ingenting och appen ar dod fast podden lever.

# Replicas och selector

`replicas: 2` (rad 9) — tva pods kor parallellt. Eftersom frontend ar stateless (ingen DB i podden) kan vi skala bara sa har. `selector.matchLabels` (rad 10-13) maste matcha `template.metadata.labels` (rad 16-18) exakt, annars startar Deployment inte. Klassisk fallgrop pa tentan — typo i ena labeln och hela manifesten failar utan tydligt fel.

# ImagePullSecrets — privat registry

Image ligger pa `registry.chas-lab.dev` som ar privat (rad 24). `imagePullSecrets: gitlab-registry` (rad 20-21) pekar pa en Secret som innehaller GitLab-credentials sa kubelet kan pulla imagen. Utan denna far du `ImagePullBackOff` direkt. Secreten skapas separat med `kubectl create secret docker-registry`.

# Container och port

En container per pod (rad 22-26). `containerPort: 5173` ar Vite/Next.js dev-porten som appen lyssnar pa internt. Det ar inte porten anvandaren traffar utifran — Service och Ingress mappar om det. Container-namnet `frontend` anvands om du behover kora `kubectl logs <pod> -c frontend`.

# Liveness- och readinessProbe

Tva olika probes med olika syften (rad 27-39). `readinessProbe` (rad 34-39) bestammer om podden ska fa trafik fran Service — failar den sa tas podden ur rotation men dodas inte. `livenessProbe` (rad 27-33) bestammer om podden ska startas om — failar den tre ganger (failureThreshold) sa killar K8s containern. Bada gor HTTP GET pa `/` mot port 5173. `initialDelaySeconds` ger appen tid att starta innan probes borjar — annars dodar K8s podden innan Next.js ens hunnit kompilera.

# Resources — requests och limits

`requests` (rad 41-43) ar vad scheduler garanterar — K8s placerar bara podden pa en node som har 64Mi minne och 50m CPU ledigt. `limits` (rad 44-46) ar taket — gar minnet over 256Mi sa OOM-killas containern. CPU strypas (throttle) men dodar inte. Utan requests blir scheduling slumpmassig, utan limits kan en buggig pod ata hela noden.

# Tentapunkter

- Varfor Deployment och inte Pod direkt — self-healing, RollingUpdate, ReplicaSet under huven
- Stateless = kan ha flera replicas. Frontend har ingen lokal data, sa replicas: 2 fungerar utan problem
- Selector-labels maste matcha template-labels exakt, annars startar inte Deployment
- Skillnaden mellan livenessProbe (starta om) och readinessProbe (fa trafik eller inte)
- Requests vs limits — requests for scheduling, limits for skydd mot runaway-containrar
