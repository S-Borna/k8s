---
title: "Blue/green deployment via Service-selector"
source: lecture
sourceLabel: "Lektion 21 april — Kap 7 Services (blue/green deploy)"
chapterId: 7
filename: "kap07-blue-green.yaml"
---

# Varför

Blue/green deployment — switcha trafik mellan två versioner utan downtime. Giacomo körde live: två Deployments (blue + green) parallellt, en Service med selector som pekar på blue, sen `kubectl patch svc` för att flippa selector till green. Inga Pods restartas, trafik byter omedelbart. Konceptet som lärs ut — Services kopplar inte till Pods via namn, utan via labels. Byter du label-filtret byter du backend.

# Blue Deployment — den första versionen

Första Deployment heter `web-blue` och kör 2 repliker av `hashicorp/http-echo` som svarar med strängen 'blue' (rad 1-26). Notera labels på Pod-template: `app: web` OCH `version: blue` (rad 14-16). Två labels — den ena (`app: web`) är gemensam med green, den andra (`version: blue`) skiljer dem åt. Det är version-labeln som blir switch-spaken senare.

# Green Deployment — den nya versionen

Andra Deployment heter `web-green`, identisk struktur men svarar 'green' (rad 27-51). Också 2 repliker, också label `app: web`, men `version: green` (rad 40-42). Båda Deployments lever samtidigt i klustret — green tar inte över blues plats, den körs parallellt. Fyra Pods totalt: 2 blue + 2 green.

# Servicen — selectorn är spaken

`web-svc` är en ClusterIP-Service med selector `app: web, version: blue` (rad 53-65). Servicen matchar alla Pods som har BÅDA labels — dvs bara blue-Poddarna just nu. Green-Poddarna existerar men får ingen trafik, för deras `version` är `green` och passar inte filtret. Det är här magin sitter.

# Client-Podden — testverktyg

En busybox-Pod som bara sover (rad 67-76). Inget produktivt — den finns för att Giacomo ska kunna `kubectl exec` in i den och köra `wget` eller `curl web-svc:8080` inifrån klustret. Du ser då att alla requests svarar 'blue'. Utan en client-Pod inne i klustret når du inte ClusterIP-Servicen utifrån.

# Switchen — kubectl patch

Själva blue/green-switchen är INTE i YAMLn — den körs som kommando: `kubectl patch svc web-svc -p '{"spec":{"selector":{"version":"green"}}}'`. Servicen får nytt selector-filter, börjar matcha green-Poddarna istället. Inga Pods restartas, ingen rollout — bara ett label-filter som ändras. Nästa curl svarar 'green'. Rollback = patcha tillbaka till blue.

# Tentapunkter

- Förklara varför blue/green ger zero downtime — båda versionerna lever samtidigt, switchen är ett label-filter på Servicen, inga Pods omstartas.
- Identifiera vilka två labels som finns på Pods och vilken som är switch-spaken (`version`, inte `app`).
- Beskriv vad `kubectl patch svc` gör — ändrar Service-selector så den matchar andra Pods.
- Förklara varför client-Podden behövs — ClusterIP är intern, du måste vara inne i klustret för att nå den.
- Jämför blue/green med rolling update — blue/green är instant flip, rolling ersätter Pods gradvis.
