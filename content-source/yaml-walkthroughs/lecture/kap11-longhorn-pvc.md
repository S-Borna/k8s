---
title: "PVC med longhorn-storageclass + writer-Pod"
source: lecture
sourceLabel: "Lektion 8 maj — Kap 11 Storage"
chapterId: 11
filename: "kap11-longhorn-pvc.yaml"
---

# Varför

Manifesten visar **dynamic provisioning** med Longhorn — Giacomo demonstrerade hur en Pod ber om lagring utan att veta var disken faktiskt ligger. PVC:n är begäran ("jag vill ha 1Gi"), Longhorn-storageclass:en svarar genom att automatiskt skapa en PV bakom kulisserna. Pedagogiken: studenten ser separationen mellan **vad Pod:en vill ha** (PVC) och **vad som faktiskt finns** (PV). På lab-klustret kunde Giacomo döda writer-Pod:en, starta om den, och datan i `/data` fanns kvar — det är hela poängen med persistent storage.

# PVC:n — själva begäran

Första dokumentet (rad 1-11) är en PersistentVolumeClaim. Pod:en frågar inte direkt efter en disk — den frågar efter en PVC, och PVC:n frågar efter en PV. Tänk på det som ett kvitto: 'jag har rätt till 1Gi storage'. Namnet `longhorn-lab-pvc` (rad 4) är det Pod:en refererar till senare.

# AccessMode: ReadWriteOnce

`ReadWriteOnce` (rad 6-7) betyder att en nod åt gången kan mounta volymen för läs/skriv. Det är default för block-storage som Longhorn. Fallgrop Giacomo nämnde: RWO är *per nod*, inte per Pod — flera Pods på samma nod kan dela. Men flyttar du Pod:en till annan nod måste den första släppa volymen först.

# StorageClass: longhorn

`storageClassName: longhorn` (rad 8) är magin för dynamic provisioning. Du säger inte 'använd disk X på nod Y' — du säger 'fråga longhorn-storageclass:en, den fixar det'. Longhorn-controllern lyssnar på PVC:er som ber om `longhorn`, skapar en PV automatiskt, och replikerar datan över noderna. Utan storageClass måste du skapa PV:n manuellt (static provisioning) — Giacomo visade det i förra labbet.

# Storage-requesten 1Gi

`resources.requests.storage: 1Gi` (rad 9-11) är hur mycket plats Pod:en ber om. Longhorn ger dig minst så mycket, ofta exakt så mycket. Notera indentationsfellet i lab-filen (rad 11 har tab istället för spaces) — det är typiskt YAML-gotcha Giacomo varnade för, men kubectl är förlåtande här. På tentan: spaces, alltid.

# Writer-Pod:en

Andra dokumentet (rad 13-31) är själva Pod:en som ska använda lagringen. Den kör `busybox:1.36` med `sleep infinity` (rad 20-24) — alltså gör ingenting, bara hänger där så du kan `kubectl exec` in och skriva filer manuellt. Det är hela demo-poängen: en levande Pod att testa storage mot.

# VolumeMount + volumes-koppling

Här binds allt ihop. `volumeMounts` (rad 25-27) säger 'inne i containern, montera volymen *data* på `/data`'. `volumes` (rad 28-31) säger 'volymen *data* är egentligen PVC:n longhorn-lab-pvc'. Två namn matchar — `name: data` i båda blocken. Glömmer du matcha namnen får Pod:en `MountVolume.SetUp failed` och fastnar i `ContainerCreating`.

# Demot — varför detta funkar

Giacomo körde `kubectl exec writer -- sh -c 'echo hej > /data/test.txt'`, sen `kubectl delete pod writer`, sen återskapade Pod:en — och filen fanns kvar. Det är beviset på att storage är *persistent* (lever bortom Pod:ens livstid) och inte bara emptyDir (dör med Pod:en). PV:n överlevde, PVC:n överlevde, datan överlevde.

# Tentapunkter

- Förklara skillnaden mellan PVC (begäran) och PV (faktisk storage) — och varför separationen finns.
- Vad dynamic provisioning är: storageClassName triggar automatisk PV-skapelse via Longhorn-controllern.
- Vad ReadWriteOnce betyder — en nod åt gången, inte en Pod åt gången.
- Hur volumeMounts och volumes kopplas via matchande `name`-fält inne i Pod-specen.
- Varför datan överlever en `kubectl delete pod` — Pod:ens livscykel är frikopplad från PV:ns.
