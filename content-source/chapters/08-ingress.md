---
id: 8
title: "Ingress"
titleSv: "Ingress"
estimatedMinutes: 40
---

# Sammanfattning

LoadBalancer-Service per app blir dyrt och svårhanterat. **Ingress** löser det: flera appar genom EN load balancer med routing baserat på hostname och path.

## Arkitektur

Två delar:

**Ingress controller** — installeras separat (K8s har INGEN inbyggd). Populära: NGINX, Traefik. Detta är komponenten som faktiskt routar trafik. Körs som Pods.

**Ingress resource** — YAML med routing-regler. Du skapar dessa.

API-grupp: `networking.k8s.io/v1`. Layer 7 (HTTP). Stödjer BARA HTTP/HTTPS. För TCP/UDP behövs annat.

## Ingress classes

Tillåter flera Ingress controllers på samma kluster (t.ex. NGINX för publik trafik, Traefik för intern). Varje Ingress-objekt tilldelas en klass via `ingressClassName`.

```bash
kubectl get ingressclass
```

## Routing — två typer

**Host-baserad:**
```
shield.mcu.com → svc-shield
hydra.mcu.com  → svc-hydra
```

**Path-baserad:**
```
mcu.com/shield → svc-shield
mcu.com/hydra  → svc-hydra
```

Kan kombineras i samma Ingress-objekt.

## Trafikflöde

Klient → DNS → Load Balancer (port 80/443) → Ingress controller läser HTTP headers → Routing-regel matchar → ClusterIP Service → Pod

## Ingress YAML

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcu-all
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: shield.mcu.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: svc-shield
            port:
              number: 8080
  - host: mcu.com
    http:
      paths:
      - path: /shield
        pathType: Prefix
        backend:
          service:
            name: svc-shield
            port:
              number: 8080
```

Viktiga delar:
- `ingressClassName` — vilken controller hanterar detta
- `rewrite-target: /` — skriver om path (mcu.com/shield → /) — NGINX-specifik annotation
- Backend = alltid ClusterIP Service (inte LoadBalancer)

## DNS-konfiguration

I produktion: peka hostnames mot LB-IP via DNS. Lokalt: editera `/etc/hosts`:

```
212.2.246.150 shield.mcu.com
212.2.246.150 hydra.mcu.com
212.2.246.150 mcu.com
```

# Giacomos tillägg

> 💡 Tentarelevant: Förstå skillnaden mellan Service (Layer 4, intern routing) och Ingress (Layer 7, HTTP-routing med host/path). Tentafråga kan vara "När använder man Ingress vs LoadBalancer-Service?". Svar: Ingress för många HTTP-tjänster bakom en LB; LoadBalancer-Service för en enskild tjänst eller icke-HTTP.

> 💡 Tentarelevant: Ingress controller är INTE inbyggd i K8s. Måste installeras separat. Detta skiljer K8s från andra plattformar.

# Lektion

**Lektion 22 april — Kap 8: Ingress, Traefik, TLS**

OBS: Internetproblem under lektionen — inspelning laddades upp separat. Lektionen var live-demo-tung med Traefik istället för bokens NGINX.

## Vad Giacomo visade

### Ingress controller = reverse proxy

Istället för en publik IP per app, en Ingress controller som tar emot ALL trafik på en IP och routar via host/path. **Lastbalansering sker på Service-nivå**, inte i Ingress controllern. Ingress controllern är en router; Service är load balancer.

### Traefik i labb (inte NGINX)

Labb-klustret kör **Traefik** som Pod med LoadBalancer Service på 80/443. Han pekade på att boken pratar om NGINX men i verkligheten används Traefik allt mer. Funktionalitet är likvärdig — syntax på annotations skiljer.

### Host-baserad routing — live demo

Två deployments (`service1` + `service2`) med ClusterIP Services. Ingress med två host-regler:

- `one.testing.gkb.se` → service1
- `two.testing.gkb.se` → service2

**Wildcard DNS** pekade alla subdomäner till samma IP. Olika hostnames hamnade på olika Services.

### HTTP Host Header — varför detta funkar

När request skickas via HTTP inkluderas alltid en `Host` header. Requesten går till en IP, men host-info flyttas till headern. Därför kan flera appar köras på samma IP — **Ingress controllern läser Host-headern och dirigerar baserat på det**.

Utan Host header → 404 från Traefik.

Han demonstrerade med curl:
```bash
curl -H "Host: one.testing.gkb.se" http://lb-ip       # → service1
curl -H "Host: two.testing.gkb.se" http://lb-ip       # → service2
curl http://lb-ip                                     # → 404
```

### Path-baserad routing

Samma host, olika paths:
- `/one` → service1
- `/two` → service2

Om path inte matchar → 404. Detta är alternativet till host-baserad — bra när du har EN domän men flera appar (`mysite.com/blog`, `mysite.com/api`).

### TLS/HTTPS

- Ingress svarar på både HTTP (80) och HTTPS (443) som standard
- **Wildcard-certifikat** för alla subdomäner under huvuddomänen
- HTTPS-only via annotation: `traefik.ingress.kubernetes.io/router.entrypoints: websecure`
- Efter ändringen: HTTP → 404, bara HTTPS funkar

### Certificate Manager — viktig komponent

- K8s har en **dedikerad komponent för TLS-certifikat** (till skillnad från Docker där Traefik/Caddy hanterar själva)
- **cert-manager** requestar och hanterar certifikat (via Let's Encrypt)
- Traefik serverar trafiken bakom certifikaten
- Certifikat är **egna K8s-resurser**: `kubectl get certificates`
- Mer ingående i nästa kurs

### NGINX Ingress controller är ARKIVERAD

**Ingen fler uppdateringar.** Gateway API är framtiden. 2026 års curriculum går igenom Gateway API istället. Detta är värt att notera — om du väljer Ingress controller idag är NGINX inte längre default-valet. Traefik, HAProxy, och Cilium är aktiva alternativ.

### När använda Ingress?

**Alla HTTP-tjänster bör ligga bakom Ingress.** Undviker slöseri av publika IP:ar. Gäller både relaterade tjänster (hemsida + forum) och separata produkter på samma kluster.

Tumregel:
- 1-2 publika tjänster, eller icke-HTTP → LoadBalancer-Service
- Många HTTP-tjänster, eller behov av host/path-routing → Ingress

## Kurslogistik

- Kapitel 9 hoppas över (Wasm)
- En vecka kvar av kursen
- Handledning kl 14:00
- Inspelning laddas upp separat (internetproblem under live)

# Hands-on

## 1. Installera NGINX Ingress controller (lokalt)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

Förväntat: Resurser skapas i `ingress-nginx` namespace. Vänta på att controller-Pod blir ready.

## 2. Verifiera

```bash
kubectl get pods -n ingress-nginx
kubectl get ingressclass
```

Förväntat: Pod `ingress-nginx-controller-*` Running. IngressClass `nginx` finns.

## 3. Deploya appar + Services

Förutsätter `app.yml` med två Deployments (shield, hydra) och två ClusterIP Services.

```bash
kubectl apply -f app.yml
```

## 4. Skapa Ingress

```bash
kubectl apply -f ig-all.yml
kubectl get ing
kubectl describe ing mcu-all
```

Förväntat: Ingress-objekt med ADDRESS-fält ifyllt (LB-IP).

## 5. Editera /etc/hosts

```bash
sudo vi /etc/hosts
# Lägg till rader med LB-IP från `kubectl get ing`
```

## 6. Testa

```bash
curl http://shield.mcu.com
curl http://hydra.mcu.com
curl http://mcu.com/shield
curl http://mcu.com/hydra
```

Förväntat: Olika svar baserat på host/path.

## 7. Städa

```bash
kubectl delete -f ig-all.yml
kubectl delete -f app.yml
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
sudo vi /etc/hosts   # Ta bort tillagda rader
```

# Lektion hands-on

Reproducera Giacomos Traefik-demo lokalt:

## 1. Installera Traefik via Helm

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm install traefik traefik/traefik
kubectl get pods
kubectl get svc traefik    # LoadBalancer med EXTERNAL-IP
```

## 2. Deploy två appar

Skapa `apps.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service1
spec:
  replicas: 1
  selector:
    matchLabels: {app: service1}
  template:
    metadata:
      labels: {app: service1}
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from service1"]
        ports: [{containerPort: 5678}]
---
apiVersion: v1
kind: Service
metadata:
  name: service1
spec:
  selector: {app: service1}
  ports: [{port: 80, targetPort: 5678}]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service2
spec:
  replicas: 1
  selector:
    matchLabels: {app: service2}
  template:
    metadata:
      labels: {app: service2}
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from service2"]
        ports: [{containerPort: 5678}]
---
apiVersion: v1
kind: Service
metadata:
  name: service2
spec:
  selector: {app: service2}
  ports: [{port: 80, targetPort: 5678}]
```

```bash
kubectl apply -f apps.yaml
```

## 3. Skapa Ingress med host-routing

Skapa `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: traefik
  rules:
  - host: one.local.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service1
            port: {number: 80}
  - host: two.local.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service2
            port: {number: 80}
```

```bash
kubectl apply -f ingress.yaml
```

## 4. Editera /etc/hosts

```bash
sudo vi /etc/hosts
# Lägg till:
# 127.0.0.1 one.local.test
# 127.0.0.1 two.local.test
```

## 5. Testa

```bash
curl http://one.local.test
# Hello from service1

curl http://two.local.test
# Hello from service2

curl http://localhost
# 404 — ingen Host-header som matchar
```

## 6. Path-baserad routing

Ändra Ingress till path-baserad — samma host, olika paths. Apply, testa.

## 7. Cleanup

```bash
kubectl delete -f ingress.yaml
kubectl delete -f apps.yaml
helm uninstall traefik
sudo vi /etc/hosts    # Ta bort tillagda rader
```

# Flashcards

## Q: Vad är skillnaden mellan Service och Ingress?

**A:** Service jobbar på Layer 4 (TCP/UDP) och routar baserat på IP/port. Ingress jobbar på Layer 7 (HTTP) och routar baserat på hostname och path. Ingress är ovanpå Services - varje Ingress-regel pekar på en backend Service. Service exponerar EN tjänst; Ingress kan exponera MÅNGA tjänster bakom en LB.

## Q: Varför har K8s inte inbyggd Ingress controller?

**A:** Designprincip - K8s definierar API:t, marknaden levererar implementationer. Olika controllers har olika styrkor: NGINX (mogen, mest använd), Traefik (lätt config, autodiscovery), HAProxy (snabb), Istio (service mesh). Genom att hålla det pluggable kan användare välja det som passar.

## Q: Vad gör en Ingress controller?

**A:** Lyssnar på Ingress-objekt via API server. Konfigurerar sin underliggande proxy (NGINX, Traefik) baserat på dem. När request kommer in läser den HTTP-headers (Host, path) och routar till rätt backend Service. Allt sker i Pod(s) i klustret.

## Q: Vad är `ingressClassName` och varför finns det?

**A:** Anger vilken Ingress controller som ska hantera detta Ingress-objekt. Behövs när flera controllers körs på samma kluster (t.ex. nginx för publik, traefik för intern). Utan det väljs default IngressClass.

## Q: Vad är skillnaden mellan host-baserad och path-baserad routing?

**A:** Host-baserad: olika hostnames (shield.mcu.com, hydra.mcu.com) → olika Services. Kräver att DNS pekar alla hostnames till samma LB-IP. Path-baserad: samma hostname (mcu.com), olika paths (/shield, /hydra) → olika Services. Enklare DNS men kräver path-rewriting för att appen ska se rätt path.

## Q: Vad är `rewrite-target` annotation?

**A:** NGINX-specifik annotation som skriver om path innan request når backend. T.ex. mcu.com/shield → "/". Utan rewrite skulle appen se "/shield" och kanske inte ha den routen. Annotations är hur Ingress passar specifik konfiguration till sin controller - de är icke-standardiserade och varierar per controller.

## Q: Vad är fördelen med Ingress över LoadBalancer-Service?

**A:** En LB istället för många - billigare och enklare. Hostname/path-baserad routing - flexibelt för många microservices. Centralized TLS termination - certifikat hanteras på ett ställe. Authentication/rate limiting kan göras i controllern. För 25 appar: 1 Ingress + 1 LB istället för 25 LoadBalancer-Services.

## Q: Stödjer Ingress andra protokoll än HTTP?

**A:** Nej, bara HTTP/HTTPS. För TCP/UDP behövs andra lösningar: NGINX TCP/UDP services, Service med type=LoadBalancer, eller Gateway API (nyare standard). Ingress är specifikt designat för HTTP-routing - andra protokoll har andra mekanismer.

## Q: Hur hanterar Ingress TLS?

**A:** Certifikat lagras som K8s Secrets (type=kubernetes.io/tls). I Ingress-spec refererar man till secret-namnet under `tls:`. Ingress controller läser certet och terminerar TLS - backend Services pratar HTTP. Med cert-manager + Let's Encrypt kan certifikat genereras och rotateras automatiskt.

## Q: Vad är skillnaden mellan Traefik och NGINX som Ingress controller?

**A:** NGINX: mogen, performant, stort community, traditionell config. **NGINX Ingress controller är arkiverad sedan 2025** - inga uppdateringar. Traefik: modern, autodiscovery av Services, smidig TLS-hantering, dashboard inbyggd. Funktionalitet är likvärdig - syntax på annotations skiljer. Labbklustret kör Traefik. Gateway API är framtiden.

## Q: Vad är cert-manager?

**A:** K8s-controller som hanterar TLS-certifikat som K8s-resurser (`kind: Certificate`). Integrerar med Let's Encrypt för automatisk cert-utfärdning och rotation. Certifikat lagras som Secrets, refereras från Ingress. Standardlösningen för TLS i K8s 2026.
