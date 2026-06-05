---
title: "Middleware"
source: chas-challenge
sourceLabel: "Eget projekt — Middleware"
chapterId: 8
filename: "09-middleware.yaml"
---

# Varför

Middleware löser ett konkret problem: webbläsaren skickar `/api/users` men backend-appen i appen lyssnar bara på `/users`. Istället för att ändra koden i ASP.NET-backenden sitter Traefik-middlewaren emellan och kapar bort `/api`-prefixet innan requesten går vidare. Demonstrerar Traefiks middleware-koncept — små byggklossar som kan ändra requests in transit mellan router och service. egna projektet visar varför det är smart: frontend och backend kan hålla sina egna URL-konventioner utan att jaga varandra.

# apiVersion och kind — Traefik-CRD

(rad 1-2) Detta är INTE en inbyggd K8s-resurs. `traefik.io/v1alpha1` betyder att Traefik har installerat sin egen Custom Resource Definition i klustret. Utan Traefik-controllern hade kubectl inte vetat vad en `Middleware` är överhuvudtaget. Samma mönster som IngressRoute från kap 8 — Traefik utökar K8s med egna typer.

# metadata och namespace-koppling

(rad 3-6) Namnet `api-strip-prefix` är det Said refererar till när han kopplar middlewaren till en IngressRoute. Label `app: felis` knyter den till appen — bra att ha för `kubectl get middleware -l app=felis` när klustret växer. Middleware lever i samma namespace som routern som använder den, annars hittas den inte.

# stripPrefix — vad den faktiskt gör

(rad 7-10) `stripPrefix` är en av Traefiks ~20 inbyggda middleware-typer. Den klipper bort `/api` från request-pathen INNAN den skickas till backend-servicen. Så `GET /api/users` blir `GET /users` när ASP.NET-appen tar emot den. Backend-koden behöver inte veta att det finns något `/api`-prefix överhuvudtaget — det är Traefiks problem.

# Varför en lista av prefixes

(rad 9-10) `prefixes` är en YAML-lista (notera bindestrecket) eftersom samma middleware kan kapa flera prefix samtidigt, t.ex. `/api` OCH `/v1`. Här används bara ett, men strukturen låter Said utöka utan att skapa en ny middleware. Fallgrop: glömma bindestrecket — då blir det ett scalar-värde istället för en lista och Traefik klagar.

# Hur den kopplas in i IngressRouten

Middleware gör ingenting i sig själv — den måste refereras från en IngressRoute med `middlewares: - name: api-strip-prefix`. Trafiken går router -> middleware-kedja -> service, i den ordningen. Said mappar ihop detta i egna projektets ingress-fil, vilket gör att webbläsarens `/api/users` träffar ASP.NET-backenden som ett rent `/users`-anrop.

# Tentapunkter

- Middleware är en Traefik-CRD, inte en inbyggd K8s-resurs — kräver att Traefik-controllern är installerad.
- `stripPrefix` kapar bort `/api` så backend-koden slipper veta om prefixet.
- Middleware gör inget på egen hand — den måste refereras från en IngressRoute för att aktiveras.
- Ordning: webbläsare -> router -> middleware -> service. Middleware sitter EMELLAN router och backend.
- `prefixes` är en lista — flera prefix kan kapas av samma middleware.
