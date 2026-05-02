---
id: 7
title: "Kubernetes Services"
titleSv: "Kubernetes Services"
estimatedMinutes: 45
---

# Sammanfattning

Pods är efemerala — de startar om, byter IP, scalas upp/ned. Services är **stabila abstraktioner** med fast DNS + IP som lastbalanserar trafik till matchande Pods.

## Varför Services?

Anslut **aldrig** direkt till en Pod. Pods dör. Nya får nya IP. En Service ger:
- Stabil frontend (DNS + IP + port) som aldrig ändras
- Backend lastbalanserar över friska Pods via labels (selectors)

## EndpointSlices

Varje Service får automatiskt ett EndpointSlice — live-lista av friska Pods med matchande labels. Uppdateras automatiskt vid skalning, rollouts, failures. Äldre K8s använde Endpoints (samma funktion, sämre prestanda).

```bash
kubectl get endpointslices
```

## Service-typer

De bygger PÅ varandra: ClusterIP → NodePort → LoadBalancer.

### ClusterIP (default)
- Intern IP + DNS på pod-nätverket
- Bara nåbar INIFRÅN klustret
- För intern kommunikation mellan microservices

### NodePort
- Bygger på ClusterIP (du får båda)
- Exponerar en port på VARJE nod (30000–32767)
- Externa klienter via nod-IP:NodePort
- Begränsning: höga portar, klienten måste känna nod-IP

```yaml
spec:
  type: NodePort
  ports:
  - port: 8080          # ClusterIP-port
    targetPort: 9000    # Container-port
    nodePort: 30050     # Port på varje nod
```

### LoadBalancer
- Bygger på NodePort + ClusterIP (du får alla tre)
- Skapar moln-LB med publik DNS/IP
- Låga portar (80, 443, 8080)
- Enklaste sättet att exponera externt
- Lokalt: EXTERNAL-IP = localhost eller `<pending>`

## Trafikflöde (LoadBalancer)

Klient → Load Balancer (publik IP:port) → NodePort (nod-IP:hög port) → ClusterIP (intern IP:port) → Pod (vald från EndpointSlice)

## Viktiga detaljer

### Session Affinity
- `None` (default) — round-robin
- `ClientIP` — sticky sessions (anti-pattern för microservices)

### External Traffic Policy
- `Cluster` (default) — LB över alla noder, döljer källans IP
- `Local` — bara Pods på ankomst-noden, bevarar källans IP

### Namnupplösning
- Samma namespace: `curl http://service-namn:port`
- Annat namespace: `curl http://service.namespace.svc.cluster.local:port`
- IP-adress fungerar men kan ändras — använd ALLTID DNS-namn

# Giacomos tillägg

**kubectl patch** — alternativ till `kubectl edit` för icke-interaktiva miljöer (pipelines, scripts):

```bash
kubectl patch service web-service -p '{"spec":{"selector":{"app":"web","version":"green"}}}'
```

`edit` = interaktiv editor. `patch` = programmatiskt, funkar i pipelines.

**Blue/green switching live** — Giacomo visade två deployments (blue + green), en Service. Bytte selector blue → green → noll downtime. EndpointSlice uppdateras direkt, ingen request tappad.

**Broken selector** — Han ändrade selector till `version: broken` (matchar ingen Pod). EndpointSlice tomt, Service ger connection refused. Alla Pods och Deployments såg friska ut — felet var bara i selectorn.

> 💡 Tentarelevant: Testa alltid att Service SVARAR, inte bara att Pods är Running. En broken selector ger 0% downtime-larm men 100% trasig service.

**NodePort live demo** — Patchade Service ClusterIP → NodePort. Nådde service externt via `nod-namn:30157`.

**Publika IP-begränsningar** — Labb-klustret har lika många publika IP som noder (~4). När alla tagna fastnar nya LB-services på `<pending>`. Exponera inte i onödan.

> 💡 Tentarelevant: Förklara skillnaden mellan ClusterIP, NodePort och LoadBalancer. Förstå att de bygger på varandra.

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Skapa Deployment

```bash
kubectl create deployment web --image=nigelpoulton/k8sbook:1.0 --replicas=3
```

## 2. Exponera som ClusterIP

```bash
kubectl expose deployment web --port=80 --target-port=8080
kubectl get svc web
```

Förväntat: Service med TYPE=ClusterIP och en intern IP.

## 3. Testa internt

```bash
kubectl run -it --rm test --image=busybox:1.36 -- wget -qO- web
```

Förväntat: HTML-output från appen. DNS-namnet `web` resolveras inifrån klustret.

## 4. Patcha till NodePort

```bash
kubectl patch service web -p '{"spec":{"type":"NodePort"}}'
kubectl get svc web
```

Förväntat: TYPE=NodePort, en hög port-nummer (30000-32767) tillagt.

## 5. Inspektera EndpointSlices

```bash
kubectl get endpointslices -l kubernetes.io/service-name=web
```

Förväntat: En EndpointSlice med IP-adresser för alla 3 Pods.

## 6. Testa labels och selector

```bash
kubectl label pod -l app=web env=prod
kubectl get pods --show-labels
```

## 7. Städa

```bash
kubectl delete deployment web
kubectl delete service web
```

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Varför behövs Services framför Pods?

**A:** Pods är efemerala - startar om, byter IP, scalas upp/ned. Klienter kan inte rikta trafik mot Pod-IP eftersom IP försvinner. En Service är en stabil abstraktion med fast ClusterIP + DNS-namn som load-balancerar till matchande Pods via labels. Utan Service ingen meningsfull kommunikation mellan komponenter.

## Q: Hur hittar Service rätt Pods?

**A:** Via labels. Service har en `selector` med ett antal label-key-value-par. Pods som matchar ALLA dessa labels inkluderas i EndpointSlice. När Service tar emot trafik load-balanceras den till någon av Pods i EndpointSlice. Loose coupling - Service vet inget om specifika Pods, bara labels.

## Q: Vad är skillnaden mellan port, targetPort och nodePort?

**A:** `port` = porten Service själv lyssnar på (ClusterIP-port). `targetPort` = porten på Pods (där containern lyssnar). `nodePort` = porten på varje nod (för NodePort-typ, 30000-32767). Olika portar för olika lager - mappning sker automatiskt.

## Q: Vad är skillnaden mellan ClusterIP, NodePort och LoadBalancer?

**A:** Bygger på varandra. ClusterIP = bara intern (default). NodePort = ClusterIP + port på varje nod (extern access via nod-IP:port, höga portar). LoadBalancer = NodePort + extern moln-LB med publik IP (låga portar, enklast extern access). Du får alltid lägre lager när du väljer ett högre.

## Q: Vad är ett EndpointSlice?

**A:** Live-lista av Pods som matchar en Services selector. Skapas automatiskt när Service skapas. Uppdateras automatiskt när Pods scalas, dör, eller skapas. Service routar trafik till slumpmässig Pod i EndpointSlice (eller via session affinity). Äldre K8s använde "Endpoints" - EndpointSlices är prestanda-optimerade.

## Q: Varför ska man använda DNS istället för IP för Services?

**A:** DNS-namn (`my-service`) är stabilt - följer Service-objektet. ClusterIP kan ändras om Service återskapas. Dessutom: DNS gör koden mer läsbar och flyttbar mellan kluster. Hardcodade IP är en anti-pattern.

## Q: Vad är skillnaden mellan `kubectl edit` och `kubectl patch`?

**A:** `edit` öppnar interaktiv editor (vim default) - bra för manuella ändringar. `patch` skickar JSON/YAML-fragment direkt - bra för pipelines, scripts, automation. Patch är programmatisk; edit är interaktiv. Båda gör samma sak underläckt - uppdaterar en resurs.

## Q: Varför misslyckas Service trots att Pods är "Running"?

**A:** Vanligaste orsaken: selector matchar inga Pods (typo i labels). EndpointSlice är tomt → ingen trafik routas → connection refused. Andra orsaker: targetPort fel (Pods lyssnar på annan port), readiness probe failar (Pods finns inte i EndpointSlice). `kubectl describe svc <namn>` visar Endpoints - tomt = problem.

## Q: Hur fungerar blue/green deployment med Services?

**A:** Två Deployments (blue + green) med olika labels (t.ex. `version: blue`, `version: green`). En Service med selector som pekar på en av dem. Byt selector → trafiken switchar omedelbart till andra deployment. EndpointSlice uppdateras direkt - noll downtime, ingen request tappad. Smidigt sätt att rolla ut nya versioner med möjlighet till instant rollback.

## Q: Vad är External Traffic Policy?

**A:** Styr hur extern trafik routas. `Cluster` (default) - LB över alla noder, döljer ursprungs-IP (klienten ses som Service-IP internt). `Local` - bara Pods på ankomst-noden får trafik, ursprungs-IP bevaras. Local används när du behöver veta klientens IP (loggning, rate-limiting). Cluster är bättre för spridning över alla noder.
