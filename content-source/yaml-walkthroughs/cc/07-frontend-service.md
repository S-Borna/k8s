---
title: "ForeverHome frontend Service"
source: chas-challenge
sourceLabel: "Chas Challenge — Frontend Service"
chapterId: 7
filename: "07-frontend-service.yaml"
---

# Varför

Frontend-podden behöver en stabil adress inne i klustret — annars hittar Ingress den inte. Pods byts ut, får nya IPs hela tiden, så du kan inte hard-koda nåt. Den här Servicen sitter mellan Ingress och frontend-deployment i ForeverHome, och dess enda jobb är att säga: "alla pods med dessa labels nås på port 80 här inne". ClusterIP räcker — trafiken kommer från Ingress, inte från internet direkt.

# Service-grunderna

kind: Service och apiVersion v1 (rad 1-2) — core-API, ingen extension behövs. Namnet 'frontend' (rad 4) är det Ingress refererar till i sin backend-block, så stavfel här = 503 i webbläsaren. Labels app: foreverhome och component: frontend (rad 5-7) är bara metadata på Servicen själv — de matchar ingenting. Det är selectorn lite längre ner som gör det riktiga jobbet.

# Selectorn — hur Service hittar pods

selector på rad 9-11 är limmet mellan Service och Pod. Den tittar efter pods som har BÅDE app: foreverhome OCH component: frontend i sina egna labels. Alla pods som matchar plockas in i Servicens endpoint-lista automatiskt. Skalar du frontend-deployment till 3 repliker — alla tre hamnar bakom samma Service, och kube-proxy load-balancar mellan dem. Fallgrop: stavar du fel på en label i deploymenten matchar selectorn ingenting, Servicen blir tom, och du får Connection refused utan tydligt felmeddelande.

# Port-mappningen

ports-blocket (rad 12-15) är två nummer som förvirrar många. port: 80 är vad Servicen lyssnar på inne i klustret — det andra pods (och Ingress) ringer. targetPort: 5173 är vad podden faktiskt kör på, dvs Vite dev-servern eller production-build-servern i containern. Service-objektet översätter 80 -> 5173 i bakgrunden. Protocol TCP är default men står utskrivet för tydlighet.

# type: ClusterIP — varför inte NodePort eller LoadBalancer

ClusterIP (rad 16) betyder Servicen får en intern IP som BARA fungerar inne i klustret. Ingen utifrån kan nå den direkt — och det är precis poängen. Frontend-trafiken kommer in via Ingress (TLS, host-routing, allt det), och Ingress ringer ClusterIP-Servicen vidare. Hade detta varit NodePort skulle frontend exponeras på varje nods port 30000-nåt, vilket är fult och osäkert. LoadBalancer kostar pengar på cloud-providers. ClusterIP är default och rätt för allt som ligger bakom en Ingress.

# Hur det hänger ihop i ForeverHome

Flöde: webbläsare -> DNS -> Ingress (TLS-terminerar) -> frontend Service (ClusterIP) -> frontend Pod (port 5173). Servicen är limmet i mitten — utan den vet inte Ingress vilken pod-IP den ska skicka till, och pod-IPs byts hela tiden när pods restartar. Service-objektet är stabilt: namnet 'frontend' lever så länge manifesten ligger applierad, IP-en likaså.

# Tentapunkter

- Varför behövs en Service framför Pods — pods får nya IPs, Service har stabilt namn + IP
- Skillnaden mellan port (Service-porten) och targetPort (container-porten)
- Selectorn matchar Pod-labels — inte Service-labels — och det är det som binder ihop dem
- ClusterIP vs NodePort vs LoadBalancer — när man väljer vilket (ClusterIP när Ingress står framför)
- Vad händer om selectorn inte matchar någon pod: tom endpoint-lista, Connection refused
