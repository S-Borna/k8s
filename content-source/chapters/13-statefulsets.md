---
id: 13
title: "StatefulSets"
titleSv: "StatefulSets"
estimatedMinutes: 40
---

# Sammanfattning

Deployments är för **stateless** appar — alla Pods identiska, utbytbara. **StatefulSets** är för stateful appar — varje Pod är unik och har egen identitet, storage, och nätverksnamn. Databaser och köer är klassiska use cases.

## Skillnader mot Deployment

| Aspekt | Deployment | StatefulSet |
|--------|-----------|-------------|
| Pod-namn | Random hash (`web-7d8f9-x2k3`) | Stabilt index (`web-0`, `web-1`) |
| Storage | Delad eller ingen | Egen PVC per Pod |
| DNS | Service load-balancerar | Headless Service ger DNS per Pod |
| Skalning | Parallell | Sekventiell (web-0 startar före web-1) |
| Update | Parallell | Reverse order (högsta index först) |

## Ordnings-garantier

StatefulSet startar Pods i ordning: web-0, sedan web-1, sedan web-2. Tar ner i omvänd ordning. Detta krävs för:
- Master-replica setups (master måste vara igång först)
- Quorum-baserade system (Kafka, Zookeeper)
- Replikering (replica behöver veta master)

## Stabil identitet

Varje Pod får:
- **Stabilt namn**: `<statefulset-name>-<index>` (t.ex. `mongodb-0`, `mongodb-1`)
- **Stabil DNS**: `<pod-name>.<service-name>.<namespace>.svc.cluster.local`
- **Stabil PVC**: egen PVC som följer Podden vid restart

Om `mongodb-0` raderas och K8s återskapar den får den samma namn, samma DNS, samma PVC.

## Headless Service

För StatefulSets används en **headless Service** (`clusterIP: None`). Detta ger DNS per Pod istället för en ClusterIP som load-balancerar.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongo
spec:
  clusterIP: None    # Detta gör den headless
  selector:
    app: mongo
  ports:
  - port: 27017
```

Med headless Service: `mongodb-0.mongo.default.svc.cluster.local` resolverar till `mongodb-0`s IP direkt.

## VolumeClaimTemplates

Istället för en delad PVC har StatefulSet `volumeClaimTemplates` — varje Pod får en egen PVC skapad från template.

```yaml
volumeClaimTemplates:
- metadata:
    name: data
  spec:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 10Gi
```

`mongodb-0` får PVC `data-mongodb-0`, `mongodb-1` får `data-mongodb-1`, osv.

## När använda StatefulSet vs Deployment?

**StatefulSet:**
- Databaser (PostgreSQL, MongoDB)
- Message queues (Kafka, RabbitMQ)
- Distributed systems som kräver stabila identiteter

**Deployment:**
- Web servers
- API servers
- Stateless workers
- I princip allt annat

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Deploya en enkel StatefulSet

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  clusterIP: None
  selector:
    app: web
  ports:
  - port: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: web
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx
        ports:
        - containerPort: 80
        volumeMounts:
        - name: data
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
```

## 2. Verifiera ordnad start

```bash
kubectl get pods -w
```

Förväntat: `web-0` startar först, sedan `web-1`, sedan `web-2`. Var och en väntar tills föregående är ready.

## 3. Verifiera unika PVCs

```bash
kubectl get pvc
```

Förväntat: `data-web-0`, `data-web-1`, `data-web-2`.

## 4. Testa DNS per Pod

```bash
kubectl run -it --rm test --image=busybox:1.36 -- nslookup web-0.web
```

## 5. Verifiera persistent identity

```bash
kubectl delete pod web-0
kubectl get pods
```

Förväntat: Ny Pod skapas med samma namn `web-0` och får samma PVC `data-web-0`.

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är skillnaden mellan Deployment och StatefulSet?

**A:** Deployment = stateless, alla Pods identiska och utbytbara, random namn. StatefulSet = stateful, varje Pod har stabil identitet (namn, DNS, PVC), startas/stoppas i ordning. Deployment för web servers; StatefulSet för databaser.

## Q: Varför behöver databaser StatefulSet och inte Deployment?

**A:** Databaser har state - varje instans har egen data, egen roll (master/replica), och måste startas i specifik ordning. Med Deployment skulle alla Pods vara utbytbara och få random namn - omöjligt att veta vilken är master, vilken har data. StatefulSet ger stabil identitet som krävs för replikering, election, och recovery.

## Q: Vad är en headless Service?

**A:** Service med `clusterIP: None`. Skapar inte en virtuell IP - istället gör DNS-lookup på Service-namnet direkt resolva till Pod-IP. Används med StatefulSets för att ge DNS per Pod (`mongodb-0.mongo`). Skillnad mot vanlig Service: ingen load balancing, klienten väljer specifik Pod.

## Q: Vad gör volumeClaimTemplates?

**A:** Mall för att automatiskt skapa en unik PVC per Pod i StatefulSet. `volumeClaimTemplates: data` + 3 replicas = `data-web-0`, `data-web-1`, `data-web-2`. Varje Pod får sin egen storage som följer den vid restart - persistens av Pod-identitet och data tillsammans.

## Q: Vad händer om `web-1` dör i en StatefulSet?

**A:** K8s skapar ny Pod med samma namn (`web-1`), samma DNS-namn, och mountar samma PVC (`data-web-1`). Ur omvärldens perspektiv är det "samma" Pod som har återställts - inget data förloras, ingen konfiguration ändras. Detta är StatefulSets stora värde.

## Q: I vilken ordning skalas StatefulSet upp och ner?

**A:** Upp: lägsta index först. `web-0` → `web-1` → `web-2`. Varje väntar tills föregående är ready. Ner: omvänd ordning. `web-2` → `web-1` → `web-0`. Detta möjliggör graceful shutdown av distribuerade system där lägre index är "primary" eller har data som måste finnas innan replikor skalas.

## Q: Kan man använda samma image i Deployment och StatefulSet?

**A:** Ja - skillnaden är inte i appen utan i K8s hantering. Vissa appar (nginx) funkar i båda. Andra (PostgreSQL i master-replica setup) behöver StatefulSet för identitet och ordning. Valet beror på app-arkitektur, inte container-image.

## Q: Vad är skillnaden i DNS mellan Deployment och StatefulSet?

**A:** Deployment + Service = `service-name.namespace.svc.cluster.local` resolverar till en av Service:s Pods (load balanced). StatefulSet + headless Service = `pod-name.service-name.namespace.svc.cluster.local` resolverar till specifik Pod direkt. StatefulSets behov av att klienter når specifik instans (master vs replica) styr designen.
