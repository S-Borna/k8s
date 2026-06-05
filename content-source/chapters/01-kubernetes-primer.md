---
id: 1
title: "Kubernetes Primer"
titleSv: "Kubernetes-introduktion"
estimatedMinutes: 25
---

# Sammanfattning

Kapitel 1 ger en historisk och konceptuell grund. **Var kom K8s ifrån, vilket problem löser det, och vad är cloud-native?**

## Bakgrund

K8s startade på Google. De hade kört containeriserade workloads i över ett decennium med interna system (Borg, Omega). 2014 släpptes K8s open source. 2015 donerades det till **CNCF** (Cloud Native Computing Foundation), som nu styr utvecklingen.

## Problemet K8s löser

Innan K8s körde företag appar på dedikerade VMs eller fysiska servrar. När en server dog, dog appen. Skalning krävde manuellt arbete. Uppdateringar var skrämmande. K8s automatiserar allt detta:

- **Self-healing**: dör en container, startas en ny automatiskt
- **Skalning**: öka från 3 till 30 instances med ett kommando (eller automatiskt via HPA)
- **Rolling updates**: uppdatera till ny version utan nedtid
- **Service discovery**: appar hittar varandra via DNS-namn, inte hårdkodade IP-adresser

## Cloud-native

Cloud-native betyder appar designade för moln-miljö: små, **stateless**, kommunicerar över API:er, paketerade som containers. K8s är **standardplattformen** för cloud-native — alla större moln (AWS EKS, Azure AKS, Google GKE) erbjuder managed K8s.

## Microservices vs monoliter

Boken introducerar microservices: applikationer uppdelade i många små tjänster. Varje tjänst körs som egen container, deployas oberoende, skalas oberoende. K8s är byggt för detta. Monoliter (en stor app) funkar också men utnyttjar inte K8s styrkor.

## Container runtime

K8s kör inte containers själv — den delegerar till en **container runtime** som `containerd` eller `CRI-O` på varje nod. Docker var den ursprungliga runtimen men plockades bort 2022 till förmån för enklare alternativ.

# Giacomos tillägg

Giacomo betonade att K8s är **överkill för många team**. Om du har 5 microservices och en utvecklare räcker Docker Compose eller en PaaS som Railway. K8s lönar sig vid många tjänster, många team, eller krav på hög tillgänglighet.

Han nämnde också att **kunskap om Linux och nätverk är förutsättningen** för att förstå K8s djupare. Pods är Linux-processer, Services är iptables-regler, Ingress är reverse proxies. Utan grunderna blir K8s magi som inte går att felsöka.

> 💡 Tentarelevant: Förstå **varför** K8s skapades — för att lösa skalnings- och tillförlitlighetsproblem som monoliter på dedikerade servrar inte klarar. Kunna förklara cloud-native principerna med egna ord.

# Lektion

Första lektionen 8 april kombinerade kap 0–3. Se **Kap 3 — Skaffa Kubernetes** för fullständig genomgång av kommandon, deployments, lastbalansering, och namespace-FQDN. Lektionen var primärt hands-on så det praktiska hör hemma där.

# Hands-on

## 1. Inspektera ditt klusters version

```bash
kubectl version
```

Förväntat: Client version och Server version visas. Server är versionen på din lokala K8s.

## 2. Lista noder i klustret

```bash
kubectl get nodes
```

Förväntat: Minst en nod, status `Ready`, role `control-plane` (för Docker Desktop). I produktion är det vanligt med 3-100+ noder.

## 3. Inspektera en nod på djupet

```bash
kubectl describe node <nod-namn>
```

Förväntat: Mycket information - kapacitet (CPU, minne), allokerade resurser, vilka Pods som körs där, conditions (DiskPressure, MemoryPressure, etc).

## 4. Lista alla namespaces

Namespaces är K8s sätt att gruppera resurser. `default` är där dina egna saker hamnar; `kube-system` är där K8s själv kör.

```bash
kubectl get namespaces
```

Förväntat: 4-5 namespaces inklusive `default`, `kube-system`, `kube-public`, `kube-node-lease`.

# Lektion hands-on

Se Kap 3 för 8 april-genomgången.

# Flashcards

## Q [grunder]: Vad är CNCF och vilken roll har de för K8s?

**A:** Cloud Native Computing Foundation — stiftelsen som styr K8s sedan Google donerade det 2015. CNCF håller K8s leverantörsneutralt så ingen enskild aktör (Google, AWS, Red Hat) kan kapa projektet. Därför kör K8s likadant på alla moln.

## Q [grunder]: Vad menas med "cloud-native"?

**A:** Appar designade för molnet — små, stateless, paketerade som containers, pratar via API:er. Cloud-native är inte samma som "körs i molnet". En monolit i AWS är inte cloud-native.

## Q [grunder]: Varför plockades Docker bort som container runtime?

**A:** Docker var byggt för utvecklare, inte som runtime åt en orkestrator. K8s pratade med Docker via en shim som gjorde stacken onödigt komplex. `containerd` (som Docker använder internt ändå) gör samma jobb enklare och uppfyller CRI. För användare ändrades inget — kubectl och YAML är samma.

## Q [grunder]: Vilka är de fyra huvudfördelarna med K8s jämfört med dedikerade servrar?

**A:** Self-healing (dör container, startas ny), skalning (manuellt eller automatiskt via HPA), rolling updates (uppdatera utan nedtid), service discovery (appar hittar varandra via DNS). De fyra ersätter manuell drift som annars krävde ops-team.

## Q [grunder]: När är K8s INTE rätt val?

**A:** Små team med få tjänster, eller när driften kostar mer än K8s ger tillbaka. Då räcker Docker Compose, en PaaS (Railway, Fly.io) eller managed services. K8s lönar sig först när du har många tjänster, många team, eller hårda krav på tillgänglighet.

## Q [grunder]: Vad är skillnaden mellan ett "kluster" och en "nod"?

**A:** Ett kluster är hela K8s-installationen - flera maskiner som samarbetar. En nod är en enskild maskin (fysisk eller virtuell) i klustret. Workloads körs på noder; klustret är koordinatorn.
