---
title: "Backend Service"
source: chas-challenge
sourceLabel: "Eget projekt — Backend Service"
chapterId: 7
filename: "03-backend-service.yaml"
---

# Varför

Backend-Servicen är klisterlappen mellan frontend och backend-Podsen i appen. Eftersom Pods får nya IP varje gång de startar om kan frontend inte ringa dem direkt — den ringer namnet `backend` och K8s router trafiken till rätt Pod. CC visade här default-typen `ClusterIP`, dvs ingen access utifrån, bara intra-cluster — exakt vad ett backend ska vara.

# Service-objektet och namnet

`kind: Service` med `name: backend` (rad 1-4). Namnet är det viktiga — frontend-Podsen anropar `http://backend` och K8s interna DNS löser det till Service-IP:n. Byter du namnet här måste frontend-konfigen ändras också. Detta är poängen med en Service: stabilt namn istället för flyktiga Pod-IP.

# Labels på Servicen själv

`labels` på rad 5-7 (`app: felis`, `component: backend`) sitter på Service-objektet — INTE det som väljer Pods. Används bara för att gruppera/filtrera Servicen i `kubectl get svc -l app=felis`. Förväxla inte med selectorn nedan — vanlig fallgrop på tentan.

# Selectorn — hjärtat i Servicen

`selector` (rad 9-11) säger vilka Pods Servicen ska skicka trafik till. Den letar efter Pods med BÅDA labels `app: felis` OCH `component: backend`. Dessa måste matcha exakt det som står under `spec.template.metadata.labels` i backend-Deploymentet — annars hittar Servicen inga Pods och du får tomt svar. Stavfel här är klassisk fallgrop (Giacomo nämnde htlm-typon i kap 4 som samma kategori-fel).

# Port-mappningen

`port: 80` (rad 13) är vad Servicen lyssnar på — det andra Pods anropar (`backend:80`). `targetPort: 5158` (rad 14) är porten inne i backend-containern, alltså vad ASP.NET-appen faktiskt lyssnar på. Servicen tar emot på 80 och vidarebefordrar till 5158. Du kan ha samma siffra på båda men det är pedagogiskt bra att hålla isär dem.

# ClusterIP — varför default räcker

`type: ClusterIP` (rad 16) är default och betyder att Servicen bara är nåbar inifrån clustret. Ingen extern IP, ingen NodePort, inget i Ingress utöver vad du själv lägger. Det är rätt typ för backend — frontend och Ingress är inne i clustret och når den, men ingen från internet kan ringa `/api` direkt. Skydd genom topologi, inte genom auth.

# Tentapunkter

- Förklara varför vi behöver en Service istället för att ringa Pod-IP direkt (Pods är ephemeral, IP byts).
- Skillnaden mellan `port` (Servicens port) och `targetPort` (containerns port).
- Vad selectorn gör — matchar Pod-labels, måste vara identiska med Deploymentets template-labels.
- Varför ClusterIP räcker för backend — bara intern trafik från frontend och Ingress.
- Skillnad mellan labels PÅ Servicen (rad 5-7) och labels i selectorn (rad 9-11).
