---
id: 3
title: "Getting Kubernetes"
titleSv: "Skaffa Kubernetes"
estimatedMinutes: 20
---

# Sammanfattning

Kapitel 3 går igenom **var och hur** du får tag på K8s att jobba med. Tre huvudvägar: lokalt, managed cloud, eller självhostat.

## Lokala kluster (för utveckling)

För att lära sig och testa: **kör K8s på din laptop**.

**Docker Desktop** — enklast på Mac/Windows. K8s aktiveras med en checkbox i inställningarna. En enda nod, allt på din maskin.

**kind** (Kubernetes IN Docker) — kör K8s-noder som Docker-containers. Kan simulera flernod-kluster lokalt. Bra för att testa multi-node-scenarier.

**minikube** — äldre, mer stabilt, kör K8s i en VM. Funkar på alla OS men något långsammare än kind.

**k3s/k3d** — superlättviktig K8s, designad för IoT och utveckling. Snabbast att starta.

För boken räcker Docker Desktop eller kind.

## Managed Kubernetes (för produktion)

Molnleverantörerna kör control plane åt dig. Du betalar för worker nodes och eventuell control plane-avgift.

**EKS** (AWS) — flexibelt men komplext att sätta upp.
**AKS** (Azure) — bra integration med övrigt Azure.
**GKE** (Google) — original-K8s, ofta först med nya features.

Fördelar: ingen drift av etcd, automatiska uppdateringar, integrerat med molnets nätverk och IAM. Nackdelar: vendor lock-in på integrationerna.

## Självhostat

Kör K8s på egna servrar (on-prem eller VMs). Mer kontroll men du ansvarar för allt: certifikat, etcd-backups, uppgraderingar, säkerhetspatchar.

Verktyg: `kubeadm` (officiellt), `Rancher`, `OpenShift`. Tunga investeringar — kräver dedikerade plattformsteam.

## kubectl

Verktyget du pratar med klustret med. Pratar HTTP mot API server. Konfigurationen ligger i `~/.kube/config` — kontexter (vilket kluster), credentials (vem du är), namespace (default-arbetsplats).

```bash
kubectl config get-contexts        # Lista kluster du kan nå
kubectl config use-context <namn>  # Byt till ett kluster
kubectl config current-context     # Visa aktivt kluster
```

## Cluster-komponenter du behöver känna till

**CNI** (Container Network Interface) — pluggar in nätverk. Olika kluster använder olika: Calico, Flannel, Cilium. Avgör hur Pods kommunicerar.

**CSI** (Container Storage Interface) — pluggar in storage. Olika moln har olika CSI-drivrutiner.

**Ingress controller** — hanterar extern HTTP-trafik. NGINX, Traefik, etc. Inte default — måste installeras.

# Giacomos tillägg

Giacomo använde **k3s** för labbklustret. Lättviktig, snabb, perfekt för utbildning. Visade också att Docker Desktop's K8s räcker för de flesta hands-on i kursen.

Han nämnde att **kontextbyten är en av de farligaste sakerna i K8s**. Du tror du jobbar mot dev-klustret men har glömt byta från prod. `kubectl delete deployment` på fel ställe kan ta ner produktion. Lösningen: tydlig prompt som visar aktivt context (t.ex. via `kube-ps1`), eller verktyg som `kubectx`/`kubens`.

> 💡 Tentarelevant: Förstå vad `kubectl config` gör. Vad är ett kontext? Hur byter man? Var ligger config-filen? Praktiskt och vanligt på tentan.

> 💡 Tentarelevant: Skillnaden mellan managed och självhostat — när väljer man vad? Tentan kan fråga "Beskriv för- och nackdelar med EKS vs självhostat".

# Lektion

**Lektion 8 april — Kap 0–3 + första hands-on**

Första lektionen kombinerade hela kap 0–3 i en genomgång. Giacomo körde mest live-demos snarare än att gå igenom teori — han ville att vi skulle SE K8s i action innan vi grottade ner i koncepten.

## Vad Giacomo demonstrerade live

**1. Skapade deployment imperativt:**
```bash
kubectl create deployment hello-k8s --image=kicbase/echo-server:1.0
```

Kort efter: `kubectl get pods` visade en Pod med suffix-hash. Detta blev senare relevant när vi pratade om Deployment → ReplicaSet → Pod-hierarkin.

**2. Exponerade som Service:**
```bash
kubectl expose deployment hello-k8s --type=ClusterIP --port=8080
```

Service skapad. Giacomo påpekade att Service behövs för att kunna nå Podden stabilt — Pod-IP:n kan ändras, Service-IP:n är stabil.

**3. Skalade till 5 replikor:**
```bash
kubectl scale deployment hello-k8s --replicas=5
```

Här visade han reconciliation i praktiken — 5 Pods skapades direkt utan att han behövde göra något mer.

**4. Port-forward (men INTE för riktig lastbalansering):**
```bash
kubectl port-forward service/hello-k8s 8080:8080
```

Viktig nyans: port-forward routar trafik till EN Pod, inte load-balancerar. För att SE lastbalanseringen behövde vi göra det inifrån klustret.

**5. Bevisade lastbalansering inifrån klustret:**
```bash
kubectl run -it --rm --image=alpine alpine -- sh
# Inne i Alpine-podden:
while true; do wget -qO- hello-k8s:8080; done
```

Curl-loopen visade att svaren kom från olika Pods (echo-server returnerar Pod-namn). Service load-balancerade. Detta var första gången klassen såg "magin" — Service som stabil frontend, Pods som utbytbara backends.

**6. Namespace-isolering:**

Giacomo skapade en namespace, deployade samma app där, visade att korta namn fungerade lokalt men FQDN krävdes cross-namespace:
```bash
kubectl create namespace testing
nslookup hello-k8s                                        # Funkar i samma NS
nslookup hello-k8s.default.svc.cluster.local              # FQDN, funkar överallt
```

**7. Image pull error → felsökning:**

Han felstavade ett image-namn medvetet. Pod hamnade i `ErrImagePull`. Visade hur man hittar problemet:
```bash
kubectl describe pod <namn>
# Tittade i Events-sektionen längst ner
```

Events visar exakt vad som gått fel. Detta är **det första man kollar vid problem**.

**8. Cleanup:**
```bash
kubectl delete deployment hello-k8s
```

Visade att raderar man Deployment försvinner ReplicaSet och Pods automatiskt — owner references hanterar cascading delete.

## Kommandon från lektionen

```bash
kubectl create deployment hello-k8s --image=kicbase/echo-server:1.0
kubectl expose deployment hello-k8s --type=ClusterIP --port=8080
kubectl scale deployment hello-k8s --replicas=5
kubectl get po,deploy,rs
kubectl describe pod <namn>
kubectl port-forward service/hello-k8s 8080:8080
kubectl run -it --rm --image=alpine alpine -- sh
kubectl delete deployment hello-k8s
kubectl create namespace testing
nslookup hello-k8s
nslookup hello-k8s.default.svc.cluster.local
```

## Giacomos regler going forward

- **Läs kapitlet OCH gör alla praktiska moment INNAN lektion** — annars hänger du inte med
- **Från nästa lektion: YAML-manifest istället för imperativa kommandon** — produktionsmönstret
- **Kapitel 9 (Wasm) hoppas över** — inte tentarelevant
- **Linode behövs inte** — Giacomo tillhandahåller labbmiljöer
- **Ha lokalt kluster + labbkluster redo varje lektion**

## Q&A från lektionen

**Q: ImagePullPolicy `Always` vs `IfNotPresent`?**
A: `Always` pullar alltid från registry. `IfNotPresent` använder lokal cache om finns. Default beror på image-tagg — `:latest` ger Always, specifika versioner ger IfNotPresent.

**Q: Vad händer med Pods när Deployment raderas?**
A: Cascading delete via owner references. Deployment äger ReplicaSet, ReplicaSet äger Pods. Radera Deployment → ReplicaSet och Pods försvinner automatiskt.

# Hands-on

## 1. Aktivera Docker Desktop's K8s

Öppna Docker Desktop → Settings → Kubernetes → Enable Kubernetes. Vänta 1-2 minuter på att klustret startar.

```bash
kubectl get nodes
```

Förväntat: En nod `docker-desktop` med status `Ready`.

## 2. Lista alla kontexter

```bash
kubectl config get-contexts
```

Förväntat: Minst `docker-desktop`. Stjärna (`*`) markerar aktivt kontext.

## 3. Inspektera kubectl-konfigurationen

```bash
cat ~/.kube/config
```

Förväntat: YAML med `clusters`, `users`, och `contexts`. Klustrets cert-data och endpoint syns.

## 4. Skapa ett alias för snabbhet

`kubectl` skrivs ofta. Lägg till alias i din shell-konfiguration (`.zshrc` eller `.bashrc`):

```bash
alias k=kubectl
```

Sedan:

```bash
k get nodes
```

Förväntat: Samma output som `kubectl get nodes`.

## 5. Verifiera att klustret är hälsosamt

```bash
kubectl get componentstatuses
```

Förväntat: `scheduler`, `controller-manager`, och `etcd-0` alla `Healthy`. (Detta kommando är deprecated i nyare versioner — då använd `kubectl get pods -n kube-system` istället.)

# Lektion hands-on

Reproducera Giacomos demo lokalt:

## 1. Skapa deployment imperativt

```bash
kubectl create deployment hello-k8s --image=kicbase/echo-server:1.0
kubectl get pods
```

## 2. Exponera som Service

```bash
kubectl expose deployment hello-k8s --type=ClusterIP --port=8080
kubectl get svc
```

## 3. Skala upp

```bash
kubectl scale deployment hello-k8s --replicas=5
kubectl get pods
```

Förväntat: 5 Pods, alla Running.

## 4. Bevisa lastbalansering

```bash
kubectl run -it --rm --image=alpine alpine -- sh
# Inuti Alpine:
apk add --no-cache curl
while true; do curl -s hello-k8s:8080 | grep Hostname; sleep 0.3; done
```

Förväntat: Olika Pod-namn i svaren — Service round-robin:ar mellan Pods.

## 5. Namespace-test

```bash
kubectl create namespace testing
kubectl create deployment hello-k8s -n testing --image=kicbase/echo-server:1.0
kubectl expose deployment hello-k8s -n testing --port=8080

# Inuti Alpine-podden i default:
nslookup hello-k8s                                  # Resolver lokalt
nslookup hello-k8s.testing.svc.cluster.local        # FQDN cross-NS
```

## 6. Provocera image pull error

```bash
kubectl create deployment broken --image=kicbase/echo-servr:1.0    # typo
kubectl get pods
kubectl describe pod -l app=broken
```

Förväntat: Pod i `ErrImagePull`. Events längst ner i describe visar exakt felet.

## 7. Cleanup

```bash
kubectl delete deployment hello-k8s broken
kubectl delete deployment hello-k8s -n testing
kubectl delete namespace testing
```

# Flashcards

## Q: Vad är skillnaden mellan kind och minikube?

**A:** kind kör K8s-noder som Docker-containers — snabbt och kan simulera flernod-kluster. minikube kör K8s i en VM — långsammare men närmare en riktig server. För utbildning är kind vanligast.

## Q: Vad gör Docker Desktop's inbyggda K8s?

**A:** Ger dig ett en-nod K8s-kluster på Mac/Windows utan extra installation. Aktiveras via Settings. Bra för lärande och utveckling, men kan inte simulera multi-node-scenarier som kind kan.

## Q: Vad är ett "kontext" i kubectl?

**A:** En sparad kombination av kluster + användare + namespace i `~/.kube/config`. Du växlar mellan dev/staging/prod med `kubectl config use-context prod`. Visa alltid aktivt kontext i prompten — annars kan du råka köra `delete` mot prod.

## Q: Vad är CNI och varför finns det?

**A:** Container Network Interface — pluggar in nätverket mellan Pods. K8s bestämmer inte själv hur Pods pratar med varandra, utan lämnar över till en CNI-plugin (Calico, Flannel, Cilium). Olika CNI:er kan olika saker — vissa stöttar NetworkPolicies, andra är snabbare, andra integrerar med molnets nätverk.

## Q: Vad är skillnaden mellan managed och självhostat K8s?

**A:** Managed (EKS/AKS/GKE): molnleverantören driftar control plane (etcd, API server, scheduler). Du ansvarar bara för workloads. Självhostat: du driftar allt själv. Managed är snabbare att komma igång och säkrare - men dyrare och med viss vendor lock-in. Självhostat är billigare i längden men kräver plattformsteam.

## Q: Var ligger kubectl-konfigurationen?

**A:** `~/.kube/config` per default. Filen kan ha flera "contexts" - kombinationer av kluster, användare, och default-namespace. Du kan peka kubectl till annan fil med `KUBECONFIG`-miljövariabeln eller `--kubeconfig`-flaggan.

## Q: Vad är k3s och när används det?

**A:** En lättviktig K8s-distribution från Rancher. ~50MB binär, körs som en enda process, inkluderar default storage och networking. Designad för IoT, edge computing, och utveckling. Giacomos labbkluster körde k3s.

## Q: Varför ger port-forward INTE riktig lastbalansering?

**A:** `kubectl port-forward` öppnar en tunnel direkt till EN Pod — inte till Service. All trafik landar på samma Pod. Vill du se lastbalansering måste trafiken gå genom Service inifrån klustret, eller via NodePort/LoadBalancer/Ingress utifrån. Port-forward är för debugging, inte lastbalansering.

## Q: Hur felsöker man en Pod som hamnar i ErrImagePull?

**A:** `kubectl describe pod <namn>` och titta i Events-sektionen längst ner. Där står det exakta felet — vanligast: typo i image-namnet, image finns inte i registry, autentisering mot privat registry saknas, eller Docker Hub rate limiting. Events är **det första** man alltid kollar vid Pod-problem.
