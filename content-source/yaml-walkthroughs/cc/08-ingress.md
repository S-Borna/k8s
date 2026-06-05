---
title: "ForeverHome Ingress (path-routing /api → backend, / → frontend)"
source: chas-challenge
sourceLabel: "Chas Challenge — Ingress"
chapterId: 8
filename: "08-ingress.yaml"
---

# Varför

Det har ar Ingress-manifesten som gor ForeverHome natbar utifran — en publik URL med HTTPS istallet for `kubectl port-forward` varje gang man vill testa. CC visade hur Traefik (k3s-klustrets inbyggda ingress-controller) routar `/api` till backend-Servicen och `/` till frontend-Servicen pa samma host. Det ar har bokens "Ingress = L7-router framfor Services" blir konkret: en URL, tva backends, path-baserad routing.

# apiVersion + kind

Ingress ligger i `networking.k8s.io/v1` — inte `apps/v1` som Deployment (rad 1-2). Lat for att slarva pa tentan. Kind `Ingress` ar L7-objektet: det forstar HTTP, hostnamn och paths, till skillnad fran Service som bara forstar portar.

# Namn + labels

Ingress-objektet heter `foreverhome` och far labeln `app: foreverhome` (rad 4-6). Namnet ar bara identifierare i namespacen — det syns inte i URL:en. Labeln ar for att kunna `kubectl get ingress -l app=foreverhome` senare.

# Traefik-annotations (det knepiga)

Tva annotations styr Traefik (rad 7-9). `router.entrypoints: websecure` sager att trafiken ska in via port 443 med TLS — utan den hamnar du pa HTTP. `router.middlewares` pekar pa en middleware som strippar `/api`-prefixet innan request gar till backend. Formatet ar krangligt: `<namespace>-<middleware-namn>@kubernetescrd` — alltsa `doe25-said-ebadi-api-strip-prefix@kubernetescrd`. Glomde du `@kubernetescrd` sa hittar Traefik inte middlewaren.

# ingressClassName: traefik

Talar om vilken ingress-controller som ska plocka upp objektet (rad 11). Lab-klustret kor Traefik som default — i andra klustrer kan det vara nginx eller AWS ALB. Utan `ingressClassName` riskerar du att INGEN controller plockar upp Ingressen och den blir en tyst no-op.

# Host + path-routing

En regel for hosten `foreverhome-doe25-said.labb.k3s.chas-lab.dev` (rad 13). Hosten matchas mot wildcard-cert pa lab-klustret — darfor far du HTTPS gratis. Inom hosten finns tva paths: `/api` med `pathType: Prefix` gar till backend-Service, `/` med `pathType: Prefix` gar till frontend-Service (rad 16-29). Reglerna laser top-to-bottom — mer specifik path forst, darfor `/api` fore `/`.

# Backend → Service, inte Pod

Notera att backend pekar pa `service: name: backend` pa port 80, INTE direkt pa en Pod (rad 18-22). Ingress routar alltid till en Service, som i sin tur lastbalanserar mot Pods via sin selector. Tre lager: Ingress → Service → Pod. Glomma Service-lagret ar en klassisk fallgrop.

# Tentapunkter

- Ingress ar L7-routing (HTTP/paths/host) — Service ar L4 (portar). Ingress sitter framfor Services.
- Path-baserad routing: `/api` → backend-Service, `/` → frontend-Service, samma host.
- `ingressClassName: traefik` valjer controller. Utan den plockar ingen upp objektet.
- Traefik middleware-annotation: `<namespace>-<middleware>@kubernetescrd` — `@kubernetescrd`-suffixet ar obligatoriskt.
- Trafikflode: extern request → Ingress (Traefik) → Service → Pod. Tre lager, inte ett.
