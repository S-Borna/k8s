---
title: "Pod-workshop"
source: lecture
sourceLabel: "Lektion 10 april — Kap 4 Pods"
chapterId: 4
filename: "kap04-pod-workshop.yaml"
---

# Varför

Giacomo byggde manifesten för att visa att en Pod inte är samma sak som en container — det är ett gäng containers som delar nätverk och volym. Tre containers samarbetar om en webbsida: en init förbereder filen, en nginx servar, en writer uppdaterar status varje 5e sekund. Sammanhanget: förstå hur containers i samma Pod kommunicerar via en delad `emptyDir`-volym istället för via nätverk eller filer på hosten. Plus — det finns en avsiktlig typo i manifesten (rad 44) som tvingar dig felsöka på lektionen.

# Pod-grunderna

Det här är en vanlig Pod, inte en Deployment (rad 1-6). En enda Pod-instans, ingen replikering, inget self-healing. Labels `app: pod-workshop` (rad 5-6) används för att en Service skulle kunna hitta podden senare. På G-nivå ska du veta: Pod = minsta enheten i K8s, oftast en container men kan vara fler som hör ihop.

# Den delade volymen

`volumes:` på Pod-nivå (rad 8-10) definierar en `emptyDir` som heter `site`. emptyDir = tom mapp som lever så länge Podden lever, försvinner när Podden dör. Den är Pod-scope, vilket betyder att ALLA containers i Podden kan mounta den och se samma filer. Det är limmet som får init, nginx och writer att samarbeta — de skriver och läser från samma mapp.

# Init-containern

`initContainers` (rad 12-35) kör FÖRE main-containers startar och MÅSTE bli klar innan nginx får boota. Den använder busybox för att skriva `index.html` till `/site/index.html` (rad 18-32) — en HTML-sida med en iframe som pekar på `/status.html`. Init-containern mountar `site`-volymen på `/site` (rad 33-35), gör sitt jobb, och dör. Resultatet ligger kvar i volymen för nästa container.

# Nginx-containern + Giacomos typo

Nginx-containern (rad 38-44) servar filer på port 80 från `/usr/share/nginx/html` — som är nginx-defaulten. MEN Giacomo har skrivit `htlm` istället för `html` (rad 44). Det är avsiktligt. Volymen mountas på fel sökväg, så nginx hittar inga filer och visar default-sidan istället för Pod Workshop-sidan. Du ska upptäcka detta med `kubectl exec` och fixa det — det är lektionens felsöknings-övning.

# Writer-containern

Tredje containern (rad 46-66) är en busybox-loop som varje 5e sekund skriver om `/site/status.html` med aktuell tid och hostname. Den mountar samma `site`-volym på `/site` (rad 64-66). Iframe:n i index.html läser den filen, så sidan uppdaterar sig live. Det demonstrerar att två containers i samma Pod kan skriva/läsa samma fil utan nätverk — bara volymen som delas.

# Vad som faktiskt händer vid start

Ordningen är viktig: först kör init-containern klart (skriver index.html), sedan startar nginx OCH writer parallellt. Nginx väntar inte på writer. Om writer skulle krascha fortsätter nginx serva index.html, men status-iframe:n blir tom. På tentan: kunna förklara att initContainers är sekventiella och blockerar main-containers, medan main-containers startar parallellt.

# Tentapunkter

- Vad en Pod är och varför en Pod kan ha flera containers (delar nätverk + volym).
- Skillnaden mellan initContainers och containers — init körs klart först, sedan startar main-containers parallellt.
- Vad emptyDir är, dess livscykel (lever med Podden, dör med Podden) och varför den används för inter-container-delning.
- Hur volumeMounts kopplar en namngiven volym till en mountPath inne i containern — och varför en typo i sökvägen (htlm vs html) ger tyst fel.
- Hur man felsöker en sådan Pod med kubectl exec, kubectl logs och kubectl describe.
