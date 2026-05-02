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

<!-- Fylls i efter lektionen -->

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

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är skillnaden mellan kind och minikube?

**A:** kind kör K8s-noder som Docker-containers - snabbt och kan simulera flernod-kluster. minikube kör K8s i en VM - långsammare men mer "verklig" miljö. För utbildning: kind är vanligare 2026. För testning av nätverk/storage som påminner om produktion: minikube ibland bättre.

## Q: Vad gör Docker Desktop's inbyggda K8s?

**A:** Ger dig ett en-nod K8s-kluster på Mac/Windows utan extra installation. Aktiveras via Settings. Bra för lärande och utveckling, men kan inte simulera multi-node-scenarier som kind kan.

## Q: Vad är ett "kontext" i kubectl?

**A:** En sparad kombination av kluster + användare + namespace i `~/.kube/config`. Med kontexter kan du ha flera kluster (dev, staging, prod) och växla mellan dem med ett kommando: `kubectl config use-context prod`. Att ha tydlig prompt med aktivt kontext är säkerhetskritiskt - annars kan du av misstag köra destruktiva kommandon i fel kluster.

## Q: Vad är CNI och varför finns det?

**A:** Container Network Interface. En pluggable abstraktion för nätverket mellan Pods. K8s själv definierar inte hur Pods pratar med varandra - den delegerar till en CNI-plugin (Calico, Flannel, Cilium). Olika CNI:er har olika egenskaper: vissa stöttar NetworkPolicies, andra är snabbare, andra integrerar med moln-nätverk.

## Q: Vad är skillnaden mellan managed och självhostat K8s?

**A:** Managed (EKS/AKS/GKE): molnleverantören driftar control plane (etcd, API server, scheduler). Du ansvarar bara för workloads. Självhostat: du driftar allt själv. Managed är snabbare att komma igång och säkrare - men dyrare och med viss vendor lock-in. Självhostat är billigare i längden men kräver plattformsteam.

## Q: Var ligger kubectl-konfigurationen?

**A:** `~/.kube/config` per default. Filen kan ha flera "contexts" - kombinationer av kluster, användare, och default-namespace. Du kan peka kubectl till annan fil med `KUBECONFIG`-miljövariabeln eller `--kubeconfig`-flaggan.

## Q: Vad är k3s och när används det?

**A:** En lättviktig K8s-distribution från Rancher. ~50MB binär, körs som en enda process, inkluderar default storage och networking. Designad för IoT, edge computing, och utveckling. Giacomos labbkluster körde k3s.
