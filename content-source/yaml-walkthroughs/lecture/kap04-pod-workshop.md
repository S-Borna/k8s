---
title: "Multi-container Pod-workshop"
source: lecture
sourceLabel: "Lektion 10 april — Kap 4 Pods"
chapterId: 4
filename: "kap04-pod-workshop.yaml"
---

# Varför

Giacomo byggde manifesten for att visa att en Pod inte ar samma sak som en container — det ar ett gang containers som delar natverk och volym. Tre containers samarbetar om en webbsida: en init forbereder filen, en nginx servar, en writer uppdaterar status varje 5e sekund. Sammanhanget: forsta hur containers i samma Pod kommunicerar via en delad `emptyDir`-volym istallet for via natverk eller filer pa hosten. Plus — det finns en avsiktlig typo i manifesten (rad 44) som tvingar dig felsoka pa lektionen.

# Pod-grunderna

Det har ar en vanlig Pod, inte en Deployment (rad 1-6). En enda Pod-instans, ingen replikering, inget self-healing. Labels `app: pod-workshop` (rad 5-6) anvands for att en Service skulle kunna hitta podden senare. Pa G-niva ska du veta: Pod = minsta enheten i K8s, oftast en container men kan vara fler som horjer ihop.

# Den delade volymen

`volumes:` pa Pod-niva (rad 8-10) definierar en `emptyDir` som heter `site`. emptyDir = tom mapp som lever sa lange Podden lever, forsvinner nar Podden dor. Den ar Pod-scope, vilket betyder att ALLA containers i Podden kan mounta den och se samma filer. Det ar limmet som far init, nginx och writer att samarbeta — de skriver och laser fran samma mapp.

# Init-containern

`initContainers` (rad 12-35) kor FORE main-containers startar och MASTE bli klar innan nginx fars boota. Den anvander busybox for att skriva `index.html` till `/site/index.html` (rad 18-32) — en HTML-sida med en iframe som pekar pa `/status.html`. Init-containern mountar `site`-volymen pa `/site` (rad 33-35), gor sitt jobb, och dor. Resultatet ligger kvar i volymen for nasta container.

# Nginx-containern + Giacomos typo

Nginx-containern (rad 38-44) servar filer pa port 80 fran `/usr/share/nginx/html` — som ar nginx-defaulten. MEN Giacomo har skrivit `htlm` istallet for `html` (rad 44). Det ar avsiktligt. Volymen mountas pa fel sokvag, sa nginx hittar inga filer och visar default-sidan istallet for Pod Workshop-sidan. Du ska upptacka detta med `kubectl exec` och fixa det — det ar lektionens felsoknings-overning.

# Writer-containern

Tredje containern (rad 46-66) ar en busybox-loop som varje 5e sekund skriver om `/site/status.html` med aktuell tid och hostname. Den mountar samma `site`-volym pa `/site` (rad 64-66). Iframe:n i index.html laser den filen, sa sidan uppdaterar sig live. Det demonstrerar att tva containers i samma Pod kan skriva/lasa samma fil utan natverk — bara volymen som delas.

# Vad som faktiskt hander vid start

Ordningen ar viktig: forst korar init-containern klart (skriver index.html), sedan startar nginx OCH writer parallellt. Nginx vantar inte pa writer. Om writer skulle krascha fortsatter nginx serva index.html, men status-iframe:n blir tom. Pa tentan: kunna forklara att initContainers ar sekventiella och blockerar main-containers, medan main-containers startar parallellt.

# Tentapunkter

- Vad en Pod ar och varfor en Pod kan ha flera containers (delar natverk + volym).
- Skillnaden mellan initContainers och containers — init kors klart forst, sedan startar main-containers parallellt.
- Vad emptyDir ar, dess livscykel (lever med Podden, dor med Podden) och varfor den anvands for inter-container-delning.
- Hur volumeMounts kopplar en namngiven volym till en mountPath inne i containern — och varfor en typo i sokvagen (htlm vs html) ger tyst fel.
- Hur man felsoker en sadan Pod med kubectl exec, kubectl logs och kubectl describe.
