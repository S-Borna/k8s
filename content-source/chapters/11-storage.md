---
id: 11
title: "Kubernetes Storage"
titleSv: "Kubernetes Storage"
estimatedMinutes: 45
---

# Sammanfattning

Stateless appar är enkla — när Pod dör, dör data med den. Men de flesta appar behöver **persistent storage**: databaser, filuppladdningar, loggar. K8s storage-subsystem hanterar detta via abstraktioner som fungerar med alla storage-backends.

## Tre nyckelobjekt

**PersistentVolume (PV)** — en bit storage i klustret. Kan vara EBS-volym på AWS, NFS-share, lokal disk på en nod. Kluster-admin skapar dessa (eller de skapas dynamiskt).

**PersistentVolumeClaim (PVC)** — en användares "begäran" om storage. "Jag behöver 10 GB". K8s matchar PVC mot lämplig PV.

**StorageClass** — mall för att skapa PV dynamiskt. T.ex. "fast SSD" eller "slow HDD". När en PVC skapas med en StorageClass skapar K8s automatiskt en matchande PV.

## CSI — Container Storage Interface

K8s stöder inte storage direkt. Det delegerar till CSI-drivare. Varje moln har egna: AWS EBS, Azure Disk, GCP Persistent Disk. CSI är pluggable som CNI för nätverk.

## Access modes

PVs kan ha olika access modes:
- **ReadWriteOnce (RWO)** — en nod kan mounta för läs/skriv. Vanligast (block storage).
- **ReadOnlyMany (ROX)** — flera noder kan mounta för läs.
- **ReadWriteMany (RWX)** — flera noder kan mounta för läs/skriv. Kräver shared filesystem (NFS, CephFS).

## Reclaim policies

Vad händer med PV när PVC raderas?
- **Delete** — PV och underliggande storage raderas (default för dynamiska)
- **Retain** — PV behålls, manuell rensning krävs

## Volym vs PV

`volumes:` i en Pod kan vara många typer (emptyDir, configMap, persistentVolumeClaim). Bara `persistentVolumeClaim` kopplar till en PV.

# Giacomos tillägg

_Ingen dedikerad lektion på detta kapitel — Storage gicks igenom kort i samband med StatefulSets (kap 13). Se där för Giacomos kommentarer kring volymer i praktiken._

# Lektion

_Ingen dedikerad lektion på detta kapitel._

# Hands-on

## 1. Lista StorageClasses

```bash
kubectl get storageclass
```

Förväntat: Default StorageClass markerad med `(default)`.

## 2. Skapa en PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

```bash
kubectl apply -f pvc.yaml
kubectl get pvc
```

Förväntat: PVC blir `Bound` när PV provisioneras automatiskt.

## 3. Använd PVC i Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /data
      name: my-storage
  volumes:
  - name: my-storage
    persistentVolumeClaim:
      claimName: my-pvc
```

## 4. Verifiera persistens

Skriv en fil till `/data`, radera Podden, skapa ny som mountar samma PVC. Filen finns kvar.

# Lektion hands-on

_Ingen dedikerad lektion på detta kapitel — se Hands-on ovan._

# Flashcards

## Q: Vad är skillnaden mellan PV och PVC?

**A:** PV (PersistentVolume) är faktisk storage i klustret - en EBS-volym, NFS-share, etc. PVC (PersistentVolumeClaim) är en användares begäran om storage ("jag behöver 10 GB"). K8s matchar PVC mot tillgänglig PV. Loose coupling - apputvecklare bryr sig inte om underliggande storage.

## Q: Vad gör en StorageClass?

**A:** Mall för dynamic provisioning av PV. När PVC skapas med en StorageClass skapar K8s automatiskt en matchande PV med rätt egenskaper. Möjliggör att klustret har flera "tiers" av storage (fast SSD, slow HDD) som användare kan välja mellan.

## Q: Vad är skillnaden mellan ReadWriteOnce och ReadWriteMany?

**A:** RWO = en nod kan mounta för läs/skriv (vanligast, fungerar med block storage som EBS). RWX = flera noder kan mounta samtidigt för läs/skriv. RWX kräver shared filesystem (NFS, CephFS) och stöds inte av alla storage-backends. Block storage (EBS) är RWO bara.

## Q: Vad är CSI?

**A:** Container Storage Interface - pluggbar abstraktion för storage-drivare. K8s själv pratar inte med EBS/Azure Disk/GCP PD direkt - den delegerar till CSI-drivare. Varje moln har egna. Liknar CNI för nätverk - separation mellan K8s API och underliggande implementation.

## Q: Vad är skillnaden mellan Delete och Retain reclaim policy?

**A:** Vad händer med PV när PVC raderas. Delete = PV och underliggande storage raderas (default för dynamic). Retain = PV behålls, manuell rensning krävs. Retain är säkrare för viktig data - oavsiktlig PVC-radering förstör inte data.

## Q: Kan en PV användas av flera Pods samtidigt?

**A:** Beror på access mode. RWO = nej (bara en nod). RWX = ja, om underliggande storage stödjer det (NFS, CephFS). I praktiken kör de flesta workloads RWO och scalar genom att ha flera Pods med egen PVC var (StatefulSets gör detta).

## Q: Var sker faktiskt mountning av en volym?

**A:** Kubelet på noden där Pod schemaläggs. Kubelet anropar CSI-drivaren för att attachera och mounta volymen. Sedan görs den tillgänglig till containern via volumeMount. Detta är osynligt för apputvecklaren - K8s sköter hela kedjan.
