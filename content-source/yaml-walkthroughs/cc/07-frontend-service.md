---
title: "ForeverHome frontend Service"
source: chas-challenge
sourceLabel: "Chas Challenge — Frontend Service"
chapterId: 7
filename: "07-frontend-service.yaml"
---

# Varför

Frontend-podden behover en stabil adress inne i klustret — annars hittar Ingress den inte. Pods byts ut, far nya IPs hela tiden, sa du kan inte hard-koda nat. Den har Servicen sitter mellan Ingress och frontend-deployment i ForeverHome, och dess enda jobb ar att saga: "alla pods med dessa labels nas pa port 80 har inne". ClusterIP racker — trafiken kommer fran Ingress, inte fran internet direkt.

# Service-grunderna

kind: Service och apiVersion v1 (rad 1-2) — core-API, ingen extension behovs. Namnet 'frontend' (rad 4) ar det Ingress refererar till i sin backend-block, sa stavfel har = 503 i webblasaren. Labels app: foreverhome och component: frontend (rad 5-7) ar bara metadata pa Servicen sjalv — de matchar ingenting. Det ar selectorn lite langre ner som gor det riktiga jobbet.

# Selectorn — hur Service hittar pods

selector pa rad 9-11 ar limmet mellan Service och Pod. Den tittar efter pods som har BADE app: foreverhome OCH component: frontend i sina egna labels. Alla pods som matchar plockas in i Servicens endpoint-lista automatiskt. Skalar du frontend-deployment till 3 repliker — alla tre hamnar bakom samma Service, och kube-proxy load-balancar mellan dem. Fallgrop: stavar du fel pa en label i deploymenten matchar selectorn ingenting, Servicen blir tom, och du far Connection refused utan tydligt felmeddelande.

# Port-mappningen

ports-blocket (rad 12-15) ar tva nummer som forvirrar manga. port: 80 ar vad Servicen lyssnar pa inne i klustret — det andra pods (och Ingress) ringer. targetPort: 5173 ar vad podden faktiskt korsar pa, dvs Vite dev-servern eller production-build-servern i containern. Service-objektet oversatter 80 -> 5173 i bakgrunden. Protocol TCP ar default men star utskrivet for tydlighet.

# type: ClusterIP — varfor inte NodePort eller LoadBalancer

ClusterIP (rad 16) betyder Servicen far en intern IP som BARA fungerar inne i klustret. Ingen utifran kan na den direkt — och det ar precis poangen. Frontend-trafiken kommer in via Ingress (TLS, host-routing, allt det), och Ingress ringer ClusterIP-Servicen vidare. Hade detta varit NodePort skulle frontend exponeras pa varje nods port 30000-nat, vilket ar fult och osakert. LoadBalancer kostar pengar pa cloud-providers. ClusterIP ar default och ratt for allt som ligger bakom en Ingress.

# Hur det hanger ihop i ForeverHome

Flode: webblasare -> DNS -> Ingress (TLS-terminerar) -> frontend Service (ClusterIP) -> frontend Pod (port 5173). Servicen ar limmet i mitten — utan den vet inte Ingress vilken pod-IP den ska skicka till, och pod-IPs byts hela tiden nar pods restartar. Service-objektet ar stabilt: namnet 'frontend' lever sa lange manifesten ligger applierad, IP-en likasa.

# Tentapunkter

- Varfor behovs en Service framfor Pods — pods far nya IPs, Service har stabilt namn + IP
- Skillnaden mellan port (Service-porten) och targetPort (container-porten)
- Selectorn matchar Pod-labels — inte Service-labels — och det ar det som binder ihop dem
- ClusterIP vs NodePort vs LoadBalancer — nar man valjer vilket (ClusterIP nar Ingress star framfor)
- Vad hander om selectorn inte matchar nagon pod: tom endpoint-lista, Connection refused
