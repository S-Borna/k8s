---
title: "ForeverHome frontend Deployment (Next.js)"
source: chas-challenge
sourceLabel: "Chas Challenge — Frontend Deployment"
chapterId: 6
filename: "06-frontend-deployment.yaml"
---

# Varför

Frontend-deployment för ForeverHome — Next.js-appen som användaren ser. Den är stateless, så Said kör flera replicas och låter K8s rulla ut nya versioner utan downtime. Hela poängen med Deployment + ReplicaSet — istället för raw Pods — är att få self-healing och RollingUpdate gratis. Om en pod dör så startar K8s en ny direkt.

# Kind och metadata

Deployment, inte Pod direkt (rad 1-7). Det betyder att K8s skapar ett ReplicaSet under huven som håller koll på antalet pods. Labels `app: foreverhome` och `component: frontend` är viktiga — Service-manifesten matchar på exakt dessa för att veta vilka pods som ska få trafik. Skriver du fel label här så hittar Service ingenting och appen är död fast podden lever.

# Replicas och selector

`replicas: 2` (rad 9) — två pods kör parallellt. Eftersom frontend är stateless (ingen DB i podden) kan vi skala bara så här. `selector.matchLabels` (rad 10-13) måste matcha `template.metadata.labels` (rad 16-18) exakt, annars startar Deployment inte. Klassisk fallgrop på tentan — typo i ena labeln och hela manifesten failar utan tydligt fel.

# ImagePullSecrets — privat registry

Image ligger på `registry.chas-lab.dev` som är privat (rad 24). `imagePullSecrets: gitlab-registry` (rad 20-21) pekar på en Secret som innehåller GitLab-credentials så kubelet kan pulla imagen. Utan denna får du `ImagePullBackOff` direkt. Secreten skapas separat med `kubectl create secret docker-registry`.

# Container och port

En container per pod (rad 22-26). `containerPort: 5173` är Vite/Next.js dev-porten som appen lyssnar på internt. Det är inte porten användaren träffar utifrån — Service och Ingress mappar om det. Container-namnet `frontend` används om du behöver köra `kubectl logs <pod> -c frontend`.

# Liveness- och readinessProbe

Två olika probes med olika syften (rad 27-39). `readinessProbe` (rad 34-39) bestämmer om podden ska få trafik från Service — failar den så tas podden ur rotation men dödas inte. `livenessProbe` (rad 27-33) bestämmer om podden ska startas om — failar den tre gånger (failureThreshold) så killar K8s containern. Båda gör HTTP GET på `/` mot port 5173. `initialDelaySeconds` ger appen tid att starta innan probes börjar — annars dödar K8s podden innan Next.js ens hunnit kompilera.

# Resources — requests och limits

`requests` (rad 41-43) är vad scheduler garanterar — K8s placerar bara podden på en node som har 64Mi minne och 50m CPU ledigt. `limits` (rad 44-46) är taket — går minnet över 256Mi så OOM-killas containern. CPU strypas (throttle) men dödar inte. Utan requests blir scheduling slumpmässig, utan limits kan en buggig pod äta hela noden.

# Tentapunkter

- Varför Deployment och inte Pod direkt — self-healing, RollingUpdate, ReplicaSet under huven
- Stateless = kan ha flera replicas. Frontend har ingen lokal data, så replicas: 2 fungerar utan problem
- Selector-labels måste matcha template-labels exakt, annars startar inte Deployment
- Skillnaden mellan livenessProbe (starta om) och readinessProbe (få trafik eller inte)
- Requests vs limits — requests för scheduling, limits för skydd mot runaway-containrar
