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

## Q [storage]: Vad är skillnaden mellan PV och PVC?

**A:** PV är faktisk storage i klustret — en EBS-volym, NFS-share, lokal disk. PVC är användarens begäran: "jag behöver 10 GB". K8s matchar PVC mot tillgänglig PV. Apputvecklaren bryr sig inte om underliggande storage — bara att begäran fylls.

## Q [storage]: Vad gör en StorageClass?

**A:** Mall för att skapa PV dynamiskt. När en PVC skapas med en StorageClass skapar K8s automatiskt en matchande PV. Låter klustret ha flera "tiers" av storage (fast SSD, slow HDD) som användare kan välja mellan.

## Q [storage]: Vad är skillnaden mellan ReadWriteOnce och ReadWriteMany?

**A:** RWO = en nod kan mounta för läs/skriv (vanligast, fungerar med block storage som EBS). RWX = flera noder kan mounta samtidigt för läs/skriv. RWX kräver shared filesystem (NFS, CephFS) och stöds inte av alla storage-backends. Block storage (EBS) är RWO bara.

## Q [storage]: Vad är CSI?

**A:** Container Storage Interface — pluggbart gränssnitt för storage-drivare. K8s pratar inte med EBS/Azure Disk/GCP PD direkt — den delegerar till CSI-drivaren. Varje moln har egna. Liknar CNI för nätverk: K8s API är skilt från underliggande implementation.

## Q [storage]: Vad är skillnaden mellan Delete och Retain reclaim policy?

**A:** Vad händer med PV när PVC raderas. Delete = PV och underliggande storage raderas (default för dynamic). Retain = PV behålls, manuell rensning krävs. Retain är säkrare för viktig data - oavsiktlig PVC-radering förstör inte data.

## Q [storage]: Kan en PV användas av flera Pods samtidigt?

**A:** Beror på access mode. RWO = nej (bara en nod). RWX = ja, om underliggande storage stödjer det (NFS, CephFS). I praktiken kör de flesta workloads RWO och scalar genom att ha flera Pods med egen PVC var (StatefulSets gör detta).

## Q [storage]: Var sker faktiskt mountning av en volym?

**A:** Kubelet på noden där Pod schemaläggs. Kubelet anropar CSI-drivaren för att attachera och mounta volymen. Sedan görs den tillgänglig till containern via volumeMount. Detta är osynligt för apputvecklaren - K8s sköter hela kedjan.

# YAML-quiz

## 1. Fyll i PVC-specen

Du behover 5 GB storage som bara en nod ska kunna skriva till. Fyll i de tva blanken.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ???
  resources:
    requests:
      storage: ???
```

**Svar:** `ReadWriteOnce` och `5Gi`

**Förklaring:** RWO racker nar bara en nod ska skriva. Storlek skrivs som `5Gi` (Gibibyte), inte `5GB`. K8s matchar PVC mot en PV som har minst 5Gi och stoder RWO.

## 2. Hitta felet i Pod-volymen

Pod ska anvanda PVC `my-pvc` men startar inte. Vad ar fel i YAMLn?

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /data
      name: storage
  volumes:
  - name: storage
    pvc:
      claimName: my-pvc
```

**Svar:** Faltet ska heta `persistentVolumeClaim:`, inte `pvc:`.

**Förklaring:** K8s kanner inte igen `pvc` som volym-typ. Det fulla namnet `persistentVolumeClaim` kravs. Annars kraschar Pod med valideringsfel fran API-servern.

## 3. Fyll i StorageClass-referensen

Du vill att din PVC ska provisionera en snabb SSD via StorageClass `fast-ssd`. Fyll i blanket.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-pvc
spec:
  ???: fast-ssd
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

**Svar:** `storageClassName`

**Förklaring:** Faltet heter `storageClassName` och pekar pa namnet i `kubectl get storageclass`. K8s anvander den klassens provisioner for att skapa en PV automatiskt.

# Scenarios

## 1. PVC fastnar i Pending

**Situation:** Du applyar en PVC med `storage: 10Gi` och `accessModes: [ReadWriteMany]`. Efter en stund kor du `kubectl get pvc` och ser:

```
NAME     STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS
my-pvc   Pending                                      standard
```

Podden som ska anvanda PVC:n startar inte och fastnar i `ContainerCreating`.

**Frågor:**
- Vad ar troligaste orsaken till att PVC:n star i Pending?
- Vilket kommando ger dig mer detaljer?
- Hur fixar du det?

**Modellsvar:** **Orsak:** Default StorageClass (`standard`) ar oftast block storage (typ EBS) och stoder bara RWO. Du bad om RWX vilket kraver shared filesystem som NFS eller CephFS. Ingen PV kan matcha begaran.

**Diagnos:**
```bash
kubectl describe pvc my-pvc
```
Du ser troligen `failed to provision volume` eller `no volume plugin matched`.

**Fix:** Antingen byt till `ReadWriteOnce` om bara en Pod behover skriva, eller anvand en StorageClass som stoder RWX (t.ex. en NFS- eller EFS-baserad provisioner). Andra accessModes i PVC:n och re-applya.

## 2. Data forsvann efter PVC-radering

**Situation:** Du raderade en gammal PVC for att stada upp. Nasta dag inser du att databasens data ar borta. `kubectl get pv` visar att aven PV:n ar borta. StorageClass-specen visar:

```
reclaimPolicy: Delete
```

Kunden ringer.

**Frågor:**
- Vad hande tekniskt?
- Hur skulle du ha skyddat datan i forvag?

**Modellsvar:** **Vad hande:** Reclaim policy `Delete` betyder att nar PVC:n raderas tas bade PV:n OCH den underliggande storagen (t.ex. EBS-volymen) bort. Default for dynamiska PVs ar Delete. Datan ar borta om du inte har backup.

**Skydd framat:** Anvand `reclaimPolicy: Retain` for viktig data. Da behalls PV:n och disken nar PVC raderas — du maste rensa manuellt. Du kan andra policyn direkt pa en befintlig PV:
```bash
kubectl patch pv <pv-namn> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```
Kombinera med backuper. Retain skyddar mot misstag, inte mot disk-fel.

## 3. Pod stuck i ContainerCreating

**Situation:** Du deployar en Pod som mountar en RWO PVC. PVC:n ar `Bound`, men Podden fastnar i `ContainerCreating`. `kubectl describe pod` visar:

```
MultiAttachError: Volume is already exclusively attached to one node and can't be attached to another
```

**Frågor:**
- Vad ar orsaken?
- Hur fixar du?

**Modellsvar:** **Orsak:** RWO betyder att volymen kan attacheras till bara EN nod at gangen. En tidigare Pod (eller en gammal version efter en deploy) sitter fortfarande pa volymen pa en annan nod. Nya Podden hamnade pa fel nod och far inte attachera.

**Diagnos:**
```bash
kubectl get pods -o wide --all-namespaces | grep <pvc-namn>
kubectl get volumeattachment
```
Kolla vilken nod den gamla Podden korde pa.

**Fix:** Radera den gamla Podden sa volymen detacheras. Om det ar en Deployment kan du behova satta `strategy: Recreate` istallet for `RollingUpdate` sa K8s vantar in den gamla Podden innan ny startar. For databaser anvand StatefulSet — den hanterar detta korrekt.
