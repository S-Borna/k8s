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

Giacomo återkom flera gånger till varför StatefulSet finns: det är inte för att göra livet svårare, det är för att vissa appar (databaser, köer, klustrade system) inte fungerar utan stabil identitet och ordning.

> Tentarelevant: Samma poddindex matchar alltid samma PVC. `tkbsts-0` får alltid PVC `data-tkbsts-0`. Om podden dör och återskapas är det fortfarande samma PVC som mountas.

> Tentarelevant: Headless Service har `clusterIP: None`. Den lastbalanserar inte — den returnerar SRV-records för varje podd så klienten kan välja exakt vilken podd den vill prata med.

> Tentarelevant: PVC:er raderas inte automatiskt när StatefulSet raderas. Det är ett medvetet skydd mot dataförlust vid oavsiktlig nedskalning.

Samma image kan köras i både Deployment och StatefulSet — skillnaden ligger inte i appen utan i hur Kubernetes hanterar poddarna. nginx funkar i båda. Postgres i master-replica-setup behöver StatefulSet för identiteten.

Att köra Deployment med en delad PVC funkar illa. ReadWriteOnce gör att bara poddar på samma nod kan mounta. Hamnar poddarna på olika noder får du multi-attach errors. Och även när det fungerar — du vill knappast att alla dina poddar skriver till samma fil samtidigt.

> Viktigt: Skala ner till noll innan du raderar StatefulSeten. Annars dör alla poddar samtidigt utan förutsägbar ordning. För databaskluster är det förödande — noderna hinner inte synka.

> Viktigt: Vid PVC-expansion, ta en nod i taget. Om något går fel mitt i vill du inte ha alla noder trasiga samtidigt.

Om DaemonSets sa Giacomo att det främst är "system-grejor som behöver röra host OS eller hårdvaran" — monitorering, logging, storage-agents, ingress på worker-noder. Inte typiska app-deployments.

Hans avslutande råd: "Håll det som behöver vara stateful som stateful, och allt annat stateless. Stateless ger dig flexibiliteten att skala. I 90 procent av fallen är det bara databaser och köer som faktiskt behöver StatefulSet."


# Lektion

Giacomo körde hela lektionen kring `tkbsts` — en liten StatefulSet med tre repliker som han hade förberett för att visa hur sekventiell start, stabil identitet och persistent storage faktiskt beter sig live.

## tkbsts-0, tkbsts-1, tkbsts-2

Första demot var att deploya StatefulSeten och titta på `kubectl get pods -w`. Poddarna kom inte upp samtidigt — `tkbsts-0` startade först, blev ready, sedan `tkbsts-1`, sedan `tkbsts-2`. Giacomo poängterade att det här är hela poängen:

> Tentarelevant: StatefulSets skalar upp en i taget. Man väntar tills en podd är ready innan nästa startas. Deployments däremot drar igång allt samtidigt.

Han jämförde med MongoDB och Postgres-kluster där noden som startar först ofta är read-write-mastern och resten är read-only-replikor. Om alla skulle starta samtidigt vet ingen vem som är master.

## born.txt-experimentet

Varje podd hade ett startup-script som skrev sitt hostname till `born.txt` om filen inte redan fanns. Sedan körde Giacomo:

```bash
kubectl exec tkbsts-0 -- cat /data/born.txt
kubectl exec tkbsts-1 -- cat /data/born.txt
kubectl exec tkbsts-2 -- cat /data/born.txt
```

Var och en svarade med sitt eget poddnamn — `tkbsts-0`, `tkbsts-1`, `tkbsts-2`. Sedan raderade han `tkbsts-1`:

```bash
kubectl delete pod tkbsts-1
```

Ny podd kom upp med samma namn. `kubectl exec tkbsts-1 -- cat /data/born.txt` gav fortfarande `tkbsts-1`. Filen hade inte skrivits om eftersom scriptet bara skrev om filen inte fanns — och PVC:n var samma som innan.

Det visar att StatefulSeten kommer ihåg vem podden är — samma PVC, samma data, samma identitet.

## log.txt-experimentet

Samma script skrev också till `log.txt` vid varje start — en ny rad varje gång. Efter ett par `kubectl delete pod tkbsts-0` såg `log.txt` ut så här:

```
tkbsts-0 started
tkbsts-0 started
tkbsts-0 started
```

Poängen: PVC:n överlever podd-radering. Data finns kvar. Bara appen startar om.

## Headless Service och DNS per podd

Giacomo körde en busybox-podd och nslookup:

```bash
kubectl run -it --rm test --image=busybox:1.36 -- nslookup dalahan
```

Resultatet var SRV-records för alla tre poddar, inte en enda ClusterIP. Sedan:

```bash
nslookup tkbsts-0.dalahan
```

Det gav IP:n för just `tkbsts-0`. Han förklarade varför detta spelar roll:

> Viktigt: Med en vanlig Service hade alla queries lastbalanserats. Med Headless Service kan du säga "jag vill prata med master-noden, tkbsts-0" och få exakt rätt podd. För databaser är det avgörande — write queries får inte hamna på en replica.

## Access modes på PVC

Giacomo gick igenom de tre vanliga:

- **ReadWriteOnce** — bara poddar från samma nod kan mounta. Vanligast.
- **ReadWriteOncePod** — bara en enda podd kan mounta, oavsett nod.
- **ReadWriteMany** — flera poddar kan mounta samtidigt.

Han sa att ReadWriteOnce är default-valet eftersom det är "krångligt nog när två poddar skriver till samma data". ReadWriteMany använder man bara när man verkligen behöver det — exempel han gav var en backup-podd som dumpar data till en PVC som en arkivpodd sedan läser från.

## Expansion av PVC

> Tentarelevant: Vid expansion av PVC ska man göra en nod i taget, inte alla samtidigt. Storage class måste stödja expansion.

Hans logik: om något går fel mitt i expansionen vill man inte att alla noder är trasiga samtidigt. Ta en, verifiera att det funkar, gå vidare.

## Korrekt nedskalning och radering

Det här återkom Giacomo till flera gånger. Om du raderar StatefulSeten direkt försvinner alla poddar samtidigt utan ordning. För ett databaskluster är det dåligt — noder hinner inte synka sin state innan de dör.

Rätt ordning:

```bash
kubectl scale statefulset tkbsts --replicas=0
# vänta tills alla är borta
kubectl delete statefulset tkbsts
```

> Tentarelevant: Skala ner till noll innan du raderar StatefulSeten. Då går poddarna ner i omvänd ordning (högst index först) och varje hinner stänga av sig snyggt.

PVC:erna försvinner inte automatiskt — det är ett medvetet skydd. Om du verkligen vill bli av med datat:

```bash
kubectl delete pvc -l app=tkbsts
```

Annars ligger PVC:erna kvar och nästa gång du deployar StatefulSeten plockar den upp samma data igen.

## DaemonSets

Boken tar inte upp det djupt, men Giacomo körde igenom det snabbt. En DaemonSet (`ds`) deployar en podd per nod. Du sätter inte `replicas` — du får automatiskt en per nod i klustret.

Användningsområden han nämnde:
- Node exporters för Prometheus
- Traefik på worker-noder för att ta emot trafik
- Longhorn för storage
- Logging-agents

Han jämförde med Docker Swarms "Global Services". Om du lägger till en ny nod i klustret får den automatiskt en kopia av DaemonSetens podd. Med taints kan man begränsa till bara vissa noder.

## Deployment med PVC funkar inte

Giacomo visade också varför man inte bara kan slänga en PVC på en Deployment med flera repliker. Två poddar som försöker mounta samma ReadWriteOnce-PVC ger multi-attach errors om de hamnar på olika noder. Och även om de hamnar på samma nod är det svårt att hantera dynamiskt.

> Viktigt: Backend kan vara en Deployment om den är stateless. Databasen ska vara StatefulSet. Håll det som behöver vara stateful som stateful — resten stateless. Stateless ger mycket mer flexibilitet.


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

## 1. Deploya tkbsts och titta på ordnad start

```bash
kubectl apply -f tkbsts.yaml
kubectl get pods -w
```

Förväntat: `tkbsts-0` startar och blir ready innan `tkbsts-1` ens börjar. Sedan `tkbsts-2`.

## 2. born.txt-experimentet

```bash
kubectl exec tkbsts-0 -- cat /data/born.txt
kubectl exec tkbsts-1 -- cat /data/born.txt
kubectl exec tkbsts-2 -- cat /data/born.txt
```

Förväntat: Varje podd svarar med sitt eget hostname.

Radera sedan en podd och verifiera att data överlever:

```bash
kubectl delete pod tkbsts-1
kubectl get pods -w
kubectl exec tkbsts-1 -- cat /data/born.txt
```

Förväntat: Ny `tkbsts-1` kommer upp, plockar samma PVC, och `born.txt` innehåller fortfarande `tkbsts-1` från första starten.

## 3. log.txt-experimentet

```bash
kubectl exec tkbsts-0 -- cat /data/log.txt
kubectl delete pod tkbsts-0
kubectl exec tkbsts-0 -- cat /data/log.txt
```

Förväntat: En ny rad har lagts till — PVC:n bevarade historiken, scriptet appendade en ny start.

## 4. DNS per podd via Headless Service

```bash
kubectl run -it --rm test --image=busybox:1.36 -- nslookup dalahan
```

Förväntat: SRV-records för alla tre poddar, ingen ClusterIP.

```bash
kubectl run -it --rm test --image=busybox:1.36 -- nslookup tkbsts-0.dalahan
```

Förväntat: IP-adressen för specifika `tkbsts-0`.

## 5. Expansion av PVC en nod i taget

```bash
kubectl edit pvc data-tkbsts-0
# ändra storage till 2Gi, spara
kubectl get pvc data-tkbsts-0 -w
```

Förväntat: Statusen visar `Resizing` och sedan tillbaka till `Bound` med den nya storleken. Gör sedan samma för `data-tkbsts-1` och `data-tkbsts-2` — en i taget.

## 6. Korrekt nedskalning och radering

```bash
kubectl scale statefulset tkbsts --replicas=0
kubectl get pods -w
```

Förväntat: Poddarna går ner i omvänd ordning — `tkbsts-2` först, sedan `tkbsts-1`, sedan `tkbsts-0`.

```bash
kubectl delete statefulset tkbsts
kubectl get pvc
```

Förväntat: StatefulSeten är borta men PVC:erna ligger kvar. Datat är säkrat.

```bash
kubectl delete pvc -l app=tkbsts
```

Förväntat: Nu är allt borta. Gör bara detta när du är säker på att du vill släppa datat.

## 7. Deploya en DaemonSet

```bash
kubectl apply -f daemonset.yaml
kubectl get ds
kubectl get pods -o wide
```

Förväntat: En podd per nod i klustret. Inga `replicas`-inställningar behövs — den räknar noder själv.


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
