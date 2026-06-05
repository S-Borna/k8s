---
title: "Ingress"
source: chas-challenge
sourceLabel: "Eget projekt — Ingress"
chapterId: 8
filename: "08-ingress.yaml"
---

# Varför

Det här är Ingress-manifesten som gör appen nåbar utifrån — en publik URL med HTTPS istället för `kubectl port-forward` varje gång man vill testa. CC visade hur Traefik (k3s-klustrets inbyggda ingress-controller) routar `/api` till backend-Servicen och `/` till frontend-Servicen på samma host. Det är här bokens "Ingress = L7-router framför Services" blir konkret: en URL, två backends, path-baserad routing.

# apiVersion + kind

Ingress ligger i `networking.k8s.io/v1` — inte `apps/v1` som Deployment (rad 1-2). Lätt för att slarva på tentan. Kind `Ingress` är L7-objektet: det förstår HTTP, hostnamn och paths, till skillnad från Service som bara förstår portar.

# Namn + labels

Ingress-objektet heter `foreverhome` och får labeln `app: foreverhome` (rad 4-6). Namnet är bara identifierare i namespacen — det syns inte i URL:en. Labeln är för att kunna `kubectl get ingress -l app=foreverhome` senare.

# Traefik-annotations (det knepiga)

Två annotations styr Traefik (rad 7-9). `router.entrypoints: websecure` säger att trafiken ska in via port 443 med TLS — utan den hamnar du på HTTP. `router.middlewares` pekar på en middleware som strippar `/api`-prefixet innan request går till backend. Formatet är krångligt: `<namespace>-<middleware-namn>@kubernetescrd` — alltså `doe25-said-ebadi-api-strip-prefix@kubernetescrd`. Glömde du `@kubernetescrd` så hittar Traefik inte middlewaren.

# ingressClassName: traefik

Talar om vilken ingress-controller som ska plocka upp objektet (rad 11). Lab-klustret kör Traefik som default — i andra klustrer kan det vara nginx eller AWS ALB. Utan `ingressClassName` riskerar du att INGEN controller plockar upp Ingressen och den blir en tyst no-op.

# Host + path-routing

En regel för hosten `foreverhome-doe25-said.labb.k3s.chas-lab.dev` (rad 13). Hosten matchas mot wildcard-cert på lab-klustret — därför får du HTTPS gratis. Inom hosten finns två paths: `/api` med `pathType: Prefix` går till backend-Service, `/` med `pathType: Prefix` går till frontend-Service (rad 16-29). Reglerna läses top-to-bottom — mer specifik path först, därför `/api` före `/`.

# Backend → Service, inte Pod

Notera att backend pekar på `service: name: backend` på port 80, INTE direkt på en Pod (rad 18-22). Ingress routar alltid till en Service, som i sin tur lastbalanserar mot Pods via sin selector. Tre lager: Ingress → Service → Pod. Glömma Service-lagret är en klassisk fallgrop.

# Tentapunkter

- Ingress är L7-routing (HTTP/paths/host) — Service är L4 (portar). Ingress sitter framför Services.
- Path-baserad routing: `/api` → backend-Service, `/` → frontend-Service, samma host.
- `ingressClassName: traefik` väljer controller. Utan den plockar ingen upp objektet.
- Traefik middleware-annotation: `<namespace>-<middleware>@kubernetescrd` — `@kubernetescrd`-suffixet är obligatoriskt.
- Trafikflöde: extern request → Ingress (Traefik) → Service → Pod. Tre lager, inte ett.
