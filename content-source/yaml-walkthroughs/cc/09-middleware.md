---
title: "stripPrefix middleware for /api-routes"
source: chas-challenge
sourceLabel: "Chas Challenge — Traefik Middleware"
chapterId: 8
filename: "09-middleware.yaml"
---

# Varför

Middleware loser ett konkret problem: webblasaren skickar `/api/users` men backend-appen i ForeverHome lyssnar bara pa `/users`. Istallet for att andra koden i ASP.NET-backenden sitter Traefik-middlewaren emellan och kapar bort `/api`-prefixet innan requesten gar vidare. Demonstrerar Traefiks middleware-koncept — sma byggklossar som kan andra requests in transit mellan router och service. CC-projektet visar varfor det ar smart: frontend och backend kan halla sina egna URL-konventioner utan att jaga varandra.

# apiVersion och kind — Traefik-CRD

(rad 1-2) Detta ar INTE en inbyggd K8s-resurs. `traefik.io/v1alpha1` betyder att Traefik har installerat sin egen Custom Resource Definition i klustret. Utan Traefik-controllern hade kubectl inte vetat vad en `Middleware` ar overhuvudtaget. Samma monster som IngressRoute fran kap 8 — Traefik utokar K8s med egna typer.

# metadata och namespace-koppling

(rad 3-6) Namnet `api-strip-prefix` ar det Said refererar till nar han kopplar middlewaren till en IngressRoute. Label `app: foreverhome` knyter den till ForeverHome-projektet — bra att ha for `kubectl get middleware -l app=foreverhome` nar klustret vaxer. Middleware lever i samma namespace som routern som anvander den, annars hittas den inte.

# stripPrefix — vad den faktiskt gor

(rad 7-10) `stripPrefix` ar en av Traefiks ~20 inbyggda middleware-typer. Den klipper bort `/api` fran request-pathen INNAN den skickas till backend-servicen. Sa `GET /api/users` blir `GET /users` nar ASP.NET-appen tar emot den. Backend-koden behover inte veta att det finns nagot `/api`-prefix overhuvudtaget — det ar Traefiks problem.

# Varfor en lista av prefixes

(rad 9-10) `prefixes` ar en YAML-lista (notera bindestrecket) eftersom samma middleware kan kapa flera prefix samtidigt, t.ex. `/api` OCH `/v1`. Har anvands bara ett, men strukturen later Said utoka utan att skapa en ny middleware. Fallgrop: glomma bindestrecket — da blir det ett scalar-varde istallet for en lista och Traefik klagar.

# Hur den kopplas in i IngressRouten

Middleware gor ingenting i sig sjalv — den maste refereras fran en IngressRoute med `middlewares: - name: api-strip-prefix`. Trafiken gar router -> middleware-kedja -> service, i den ordningen. Said mappar ihop detta i CC-projektets ingress-fil, vilket gor att webblasarens `/api/users` traffar ASP.NET-backenden som ett rent `/users`-anrop.

# Tentapunkter

- Middleware ar en Traefik-CRD, inte en inbyggd K8s-resurs — kraver att Traefik-controllern ar installerad.
- `stripPrefix` kapar bort `/api` sa backend-koden slipper veta om prefixet.
- Middleware gor inget pa egen hand — den maste refereras fran en IngressRoute for att aktiveras.
- Ordning: webblasare -> router -> middleware -> service. Middleware sitter EMELLAN router och backend.
- `prefixes` ar en lista — flera prefix kan kapas av samma middleware.
