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

> 💡 Tentarelevant: Testa alltid att Service SVARAR, inte bara att Pods är Running. En broken selector ger 0% downtime-larm men 100% trasig service.

> 💡 Tentarelevant: Förklara skillnaden mellan ClusterIP, NodePort och LoadBalancer. Förstå att de bygger på varandra.

# Lektion

**Lektion 21 april — Kap 7: Services, blue/green, patch**

Live-demo-lektion. Giacomo körde fyra centrala demos: blue/green switching, kubectl patch, broken selectors, och Service-typer. Avslutade med en heads-up om Ingress till nästa lektion.

## Vad Giacomo visade

### Blue/green switching live

Han skapade två deployments med samma app men olika versioner — `web-blue` och `web-green` — med 2 replikor var. Båda hade samma label `app: web` men olika `version`-label. En Service `web-service` med selector `app: web, version: blue`. En client-pod med busybox körde curl-loop i bakgrunden.

```bash
kubectl run client --image=busybox:1.36 -- sh -c 'while true; do wget -qO- web-service; sleep 1; done'
```

Loopen körde mot Service var sekund. Svaren kom från blue-Pods.

Sedan patchade han Service:n:
```bash
kubectl patch service web-service -p '{"spec":{"selector":{"app":"web","version":"green"}}}'
```

Svaren ändrades **direkt** till green-Pods. **Ingen request tappad.** EndpointSlice uppdaterades omedelbart med nya Pod-IP:ar. Noll downtime.

Det här är blue/green deployment i sin renaste form — två versioner deployade parallellt, switch via Service-selector. Smidigt sätt att testa nya versioner med möjlighet till instant rollback (patcha tillbaka till blue).

### `kubectl patch` demo

```bash
kubectl patch service web-service -p '{"spec":{"selector":{"app":"web","version":"green"}}}'
```

Smidigt för pipelines och scripts. `kubectl edit` är smidigare vid terminalen men fungerar inte i icke-interaktiva miljöer (CI/CD). Båda gör samma sak under huven — uppdaterar resursen via API server.

### Broken selector

Giacomo patchade selector till `version: broken`. EndpointSlice blev tomt. Service gav `connection refused`. **Alla Pods och Deployments såg friska ut** — felet var bara i Service.

Lärdom: **testa alltid att servicen SVARAR, inte bara att resurser är Running.** Pods kan vara Running och Deployments kan vara klara, men Service kan vara helt trasig pga selector-typo.

Felsökning: `kubectl describe svc <namn>` visar `Endpoints:` — om det är tomt har selector inget matchning.

### Service-typer live

Giacomo patchade samma Service genom alla tre typer:

- **ClusterIP** → nåbar internt via namn (`curl web-service` från Pod)
- **NodePort** → nåbar externt via `control-plane-1:30157` (port slumpas i 30000-32767)
- **LoadBalancer** → fick extern publik IP

Visade att de bygger på varandra. NodePort behåller ClusterIP. LoadBalancer behåller båda. Du tar inte bort lägre lager när du går uppåt.

### Skalning + hicka

Skalade från 2 → 12 replikor — inga problem, smooth. Skalade ner 12 → 2 — kort hicka när en request routades till en terminerande Pod. I produktion löses detta med **graceful shutdown** (preStop hooks + tid att avsluta pågående requests innan termination).

### Publika IP:ar begränsade

Labb-klustret har ~4 publika IP:ar (en per nod). När alla tagna → nya LB-services fastnar på `<pending>`. Giacomo: **exponera inte i onödan, bygg tillbaka till ClusterIP efter test**. Annars blockerar du andras tester.

## Heads-up för nästa lektion (Ingress)

- Labb-klustret kör **Traefik** som ingress controller (inte NGINX)
- Hands-on från boken kap 8 fungerar **INTE i labb** (kräver att installera egen ingress controller)
- Kör lokalt istället, men **TLS fungerar inte lokalt** (ej publikt)
- Heads-up: Giacomos hands-on med Traefik + TLS kommer i labb

## Q&A — viktiga insikter

### Nästa kurs (hösten)

Giacomo gav en heads up:
- **Flipped classroom utan bok** — tema per lektion, läs på själv
- Grupper sätter upp **hela K8s-miljö från scratch** (install, ingress, storage, ArgoCD, secrets, CI/CD)
- Välj själv distribution: K3S, Talos, eller annat
- Intensivt men **mest lärorika kursen**. Förbereder för LIA.

### CC-kluster

Fortfarande inte redo. Labba i doe25-labb. Vänta med K8s-pipelines.

## Kurslogistik

- **Nästa lektion:** Kapitel 8 (Ingress) + Giacomos hands-on med Traefik i labb

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

Reproducera Giacomos blue/green-demo:

## 1. Två versioner samtidigt

Skapa `blue-green.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-blue
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      version: blue
  template:
    metadata:
      labels:
        app: web
        version: blue
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from BLUE"]
        ports:
        - containerPort: 5678
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-green
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      version: green
  template:
    metadata:
      labels:
        app: web
        version: green
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from GREEN"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
    version: blue
  ports:
  - port: 80
    targetPort: 5678
```

```bash
kubectl apply -f blue-green.yaml
```

## 2. Kör curl-loop i bakgrunden

```bash
kubectl run client --image=busybox:1.36 -- sh -c 'while true; do wget -qO- web-service; sleep 1; done'
kubectl logs -f client
```

Förväntat: "Hello from BLUE" var sekund.

## 3. Switcha till green

```bash
kubectl patch service web-service -p '{"spec":{"selector":{"app":"web","version":"green"}}}'
```

Förväntat: Loggen växlar **omedelbart** till "Hello from GREEN". Ingen request tappad.

## 4. Bevisa broken selector

```bash
kubectl patch service web-service -p '{"spec":{"selector":{"app":"web","version":"broken"}}}'
kubectl describe svc web-service    # Endpoints: <none>
```

Förväntat: `connection refused` i client-loggen. Service är "trasig" trots att alla Pods är Running.

## 5. Cleanup

```bash
kubectl delete -f blue-green.yaml
kubectl delete pod client
```

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

## Q: Varför hicker Service vid nedskalning?

**A:** När en Pod tas ner kan en pågående request routas till den terminerande Podden innan EndpointSlice hunnit uppdateras. Klienten får en error. I produktion löses detta med graceful shutdown - preStop hooks + tid för Podden att avsluta pågående requests innan SIGTERM. Det är därför `terminationGracePeriodSeconds` finns.
