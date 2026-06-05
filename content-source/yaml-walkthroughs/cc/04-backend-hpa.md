---
title: "Backend HPA"
source: chas-challenge
sourceLabel: "Chas Challenge — Backend HPA"
chapterId: 6
filename: "04-backend-hpa.yaml"
---

# Varför

HPA:n finns för att visa hur man säger till Kubernetes "skala upp backend när CPU drar". I ForeverHome är den medvetet kastrerad — min=max=1 — för att backend har en RWO-PVC för uploads och `strategy: Recreate`. Giacomo poängterade just det här i kapitlet: HPA är förberedd för framtiden när bilder flyttas till objektstorage (S3/R2), då kan backend skalas horisontellt. Just nu är HPA bara dokumentation av intentionen.

# API-versionen och vad det betyder

`autoscaling/v2` (rad 1) är den moderna HPA-API:n — stödjer flera metrics och custom metrics. Den gamla `autoscaling/v1` klarade bara CPU. På tentan: använd alltid v2 om frågan inte är explicit om legacy. Kind är `HorizontalPodAutoscaler` — horisontell = fler poddar, inte större poddar (det är VPA).

# scaleTargetRef — vad skalas

Block 8-12 pekar HPA:n på en Deployment vid namn `backend` i samma namespace. HPA ändrar `replicas`-fältet på den targeten — den rör inte poddar direkt. Fallgrop: om Deployment-namnet är fel, eller om targeten är en StatefulSet med samma namn, så händer inget och HPA visar `<unknown>` i `kubectl get hpa`.

# minReplicas = maxReplicas = 1 — den medvetna kastreringen

Raderna 13-14 låser HPA till exakt 1 podd. Det här är inte ett misstag — det är pedagogiken. Backend har en RWO-PVC (uploads-volym) och `strategy: Recreate` i deployment. Skalas backend till 2 så krockar de om volymen (RWO = bara en nod skriver) och Recreate stänger ner gamla podden innan ny startar. HPA:n är monterad men inaktiverad tills uploads flyttas till objektstorage.

# Metrics — CPU 75 %

Block 15-21 säger: titta på genomsnittlig CPU-utilization över poddarna, target 75 % av request-värdet. Notera `type: Utilization` — det räknar mot Pod-spec:ens `resources.requests.cpu`, inte mot nodens totala CPU. Om backend inte har `requests.cpu` satt i deployment så fungerar inte HPA — den visar `<unknown>` och skalar aldrig. Det här är den vanligaste HPA-buggen.

# Varför den ändå är med i ForeverHome

Said har den här i repot som dokumentation av migrations-vägen: när uploads flyttas till R2/S3 (objektstorage), då försvinner RWO-PVC:n, då kan `strategy` bytas till RollingUpdate, då kan maxReplicas höjas till t.ex. 5. HPA-manifesten är då redan på plats. Det är ett vanligt mönster i prod — bygg in skalningen tidigt, aktivera när stateful-flaskhalsen är borta.

# Tentapunkter

- HPA skalar antal poddar (horisontellt), inte resurser per podd (det är VPA).
- scaleTargetRef pekar på Deployment/StatefulSet — HPA rör targetens replicas, inte poddar direkt.
- CPU `type: Utilization` kräver att targeten har `resources.requests.cpu` satt — annars `<unknown>`.
- HPA krockar med RWO-PVC + Recreate-strategy: går inte skala över 1 podd när storage är stateful och lokal.
- `autoscaling/v2` är modern API:n — stödjer multipla metrics, inte bara CPU.
