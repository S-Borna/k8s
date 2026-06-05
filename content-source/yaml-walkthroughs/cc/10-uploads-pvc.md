---
title: "Uploads PVC"
source: chas-challenge
sourceLabel: "Chas Challenge — Uploads PVC"
chapterId: 11
filename: "10-uploads-pvc.yaml"
---

# Varför

PVC:n som backenden ber om för att spara uppladdningar — bilder, dokument, allt usern POSTar. Utan den försvinner filerna när poden dör (poddar är ephemeral). Giacomo körde CC-demot för att visa hur en stateful komponent klistras fast på riktig disk via Longhorn i lab-klustret. För ForeverHome är det här hjärtat i "upload"-flödet — frontenden skickar fil, backenden skriver till `/uploads`, och PVC:n ser till att filen finns kvar nästa morgon.

# Kind: PersistentVolumeClaim

En PVC är inte själva disken — det är en *beställning* på disk (rad 2). Backenden säger 'jag vill ha 5GB', och K8s matchar mot en StorageClass som faktiskt provisionerar volymen. Tänk det som en kvittolapp — Pod:en visar kvittot, K8s hämtar varan från lagret. Namnet `uploads` (rad 4) är vad Deployment:en refererar till i sin `volumes:`-sektion senare.

# Label app: foreverhome

Labeln (rad 5-6) knyter PVC:n till resten av appen rent organisatoriskt — `kubectl get pvc -l app=foreverhome` listar bara mina volymer, inte andras i samma namespace. Det är inte funktionellt nödvändigt för att PVC:n ska fungera, men det är hygien Giacomo tjatar om i alla kapitel. Utan labels blir klustret en soppa när det växer.

# accessModes: ReadWriteOnce

RWO betyder att *en nod* åt gången får mounta volymen läs/skriv (rad 8-9). Det är därför backend-Deployment:en måste köra `strategy.type: Recreate` och inte kan skala över 1 replica — två poddar på olika noder kan inte dela en RWO-volym. Alternativen ROX (många kan läsa) och RWX (många kan skriva) finns men kräver annan storage-backend. Longhorn klarar RWO out-of-the-box, RWX kräver extra setup.

# storageClassName: longhorn

Longhorn är storage-systemet som körs i lab-klustret (rad 10) — det provisionerar volymer dynamiskt när en PVC dyker upp. Hade jag inte angett storageClassName så hade default-classen använts, men explicit är alltid bättre på tentan. Fallgrop: om man deployar samma manifest mot ett kluster *utan* Longhorn (t.ex. en lokal kind/minikube) så fastnar PVC:n i `Pending` för evigt — Giacomo visade det misstaget i en demo.

# resources.requests.storage: 5Gi

5 gigabyte är vad backenden frågar efter (rad 11-13) — Longhorn ger den minst så mycket, kan bli mer beroende på provisioner. Det är `requests`, inte `limits` — PVC har ingen `limits` på storage på samma sätt som CPU/RAM. Vill man ha mer senare så kan man expandera PVC:n om StorageClass:en tillåter det (Longhorn gör det).

# Vad som händer när manifestet appliceras

`kubectl apply` skapar PVC-objektet → Longhorn ser den, provisionerar en 5Gi PV (PersistentVolume) → PVC och PV binds ihop → Pod:en kan nu mounta `uploads`-volymen via sin `volumes:`-sektion. Status går från `Pending` till `Bound`. Om man kör `kubectl get pvc` och den står Pending för länge — då matchar inte storageClassName, eller så är klustret slut på disk.

# Tentapunkter

- Skillnaden mellan PVC (beställning) och PV (faktisk disk) — PVC är abstraktionen poden pratar med
- Varför RWO låser ForeverHome-backenden till 1 replica + Recreate-strategi
- Vad storageClassName gör och vad som händer om man kör manifestet mot fel kluster (PVC fastnar Pending)
- Att PVC överlever att poden dör — det är hela poängen med 'Persistent' i namnet
- Hur PVC kopplas in i en Deployment via volumes + volumeMounts (nästa steg i flödet)
