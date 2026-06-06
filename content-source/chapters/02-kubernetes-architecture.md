---
id: 2
title: "Kubernetes Principles of Operation"
titleSv: "Kubernetes-arkitektur"
estimatedMinutes: 30
---

# Sammanfattning

Kapitel 2 är **kritiskt** — det förklarar hur K8s faktiskt fungerar internt. Förstår du detta, förstår du resten av boken.

## Klusterets två sidor

Ett K8s-kluster har två typer av noder:

**Control plane** — hjärnan. Tar beslut, schemalägger workloads, hanterar API:t. Pratar du med klustret pratar du med control plane.

**Worker nodes** — musklerna. Kör dina applikationer. Containers (i Pods) körs här.

I produktion separeras de helt. Lokalt (Docker Desktop) körs båda på samma maskin.

## Control plane-komponenter

Fyra kärnkomponenter:

**API server** (`kube-apiserver`) — entrypoint till klustret. Allt går igenom den: kubectl, andra komponenter, controllers. Den validerar och persisterar requests till `etcd`.

**etcd** — distributed key-value store. Klustrets enda källa till sanning. Allt om varje resurs lagras här. Förlorar du etcd, förlorar du klustret.

**Scheduler** (`kube-scheduler`) — bestämmer vilken nod en ny Pod ska köras på. Tittar på resurskrav, taints, affinity-regler, och välj bästa nod.

**Controller manager** (`kube-controller-manager`) — kör alla controllers. Controllers är loopar som ständigt jämför "vad finns" mot "vad ska finnas" och agerar för att stänga gapet. Deployments, ReplicaSets, Services — alla har controllers.

## Worker node-komponenter

Tre komponenter på varje worker:

**kubelet** — agent som pratar med API server. Får order ("kör denna Pod"), startar containers via runtimen, rapporterar status.

**kube-proxy** — hanterar nätverket på noden. Sätter upp iptables/IPVS-regler så att Service-IP:n routas till rätt Pods.

**Container runtime** — det som faktiskt kör containers. Vanligast: `containerd`.

## Reconciliation loop

Det viktigaste konceptet i hela boken. Controllers gör samma sak om och om igen:

1. Läs **desired state** (vad du vill) från API server
2. Observera **actual state** (vad som faktiskt körs)
3. Om de skiljer sig — gör något för att stänga gapet
4. Vänta. Repetera.

Detta är **varför** K8s är self-healing. Dör en Pod märker ReplicaSet-controllern att antalet körande Pods är lägre än önskat, och skapar en ny.

## Deklarativt vs imperativt

Två sätt att jobba med K8s:

**Deklarativt** (rekommenderat): Skriv YAML som beskriver önskat tillstånd. `kubectl apply -f deploy.yaml`. K8s bestämmer hur det ska uppnås.

**Imperativt**: Säg exakt vad som ska göras. `kubectl run nginx --image=nginx`. Snabbt för tester, men skapar drift mellan vad som finns och vad som är versionerat i Git.

I produktion: alltid deklarativt, allt i Git (GitOps).

# Giacomos tillägg

Giacomo betonade att **etcd är kritisk**. Backup av etcd är något du måste ha innan något går fel. Förlorar du etcd utan backup förlorar du varenda resurs i klustret.

Han nämnde också att **scheduler är extremt smart men inte magisk**. Den kan inte schemalägga en Pod som kräver mer minne än någon nod har. Då fastnar Podden i `Pending`. Det är en av de vanligaste felkällorna.

> 💡 Tentarelevant: Du måste kunna förklara reconciliation loop med egna ord. Det är **det** koncept som skiljer K8s från äldre orchestrators. Tentafråga kan vara "Vad händer steg för steg när en Pod dör i en Deployment?" — svaret involverar reconciliation.

> 💡 Tentarelevant: Skillnaden mellan deklarativt och imperativt kommer på tentan. Förstå **varför** deklarativt är bättre — det är det som ger dig GitOps, audit, och rollback.

# Lektion

Första lektionen 8 april kombinerade kap 0–3. Se **Kap 3 — Skaffa Kubernetes** för fullständig genomgång.

# Hands-on

## 1. Lista alla control plane-komponenter

Control plane-komponenter körs som Pods i `kube-system`-namespace.

```bash
kubectl get pods -n kube-system
```

Förväntat: Du ser pods med namn som `kube-apiserver-*`, `etcd-*`, `kube-scheduler-*`, `kube-controller-manager-*`. På Docker Desktop är de alla på samma nod.

## 2. Inspektera API server

```bash
kubectl describe pod -n kube-system $(kubectl get pods -n kube-system -l component=kube-apiserver -o name | head -1)
```

Förväntat: Stort YAML-output. Kolla `Args:` - där ser du hur API servern är konfigurerad (vilken etcd den pratar med, certifikat, etc).

## 3. Trigga reconciliation manuellt

Skapa en Deployment, ta bort en Pod, observera att en ny skapas direkt.

```bash
kubectl create deployment hello --image=nginx --replicas=3
kubectl get pods -l app=hello
kubectl delete pod -l app=hello --field-selector=status.phase=Running --wait=false
kubectl get pods -l app=hello -w
```

Förväntat: När du tar bort Pods skapas omedelbart nya för att matcha `replicas=3`. Det är reconciliation i praktiken.

## 4. Visa hur scheduler placerade Pods

```bash
kubectl get pods -l app=hello -o wide
```

Förväntat: Kolumnen `NODE` visar vilken nod varje Pod kör på. På Docker Desktop är det samma nod; på flernod-kluster sprids de.

## 5. Städa

```bash
kubectl delete deployment hello
```

# Lektion hands-on

Se Kap 3.

# Flashcards

## Q [arkitektur, grunder]: Vilka fyra komponenter finns på control plane?

**A:** API server (entrypoint), etcd (state store), scheduler (placerar Pods), controller manager (kör alla controllers). Tillsammans är de hjärnan i klustret. Tappar du etcd tappar du all state.

## Q [arkitektur, grunder]: Vad är reconciliation loop?

**A:** En controller jämför hela tiden desired state (vad du skrev i YAML) med actual state (vad som körs) och agerar för att stänga gapet. Det är **därför** K8s är self-healing — dör en Pod märker controllern att antalet är fel och skapar en ny.

## Q [arkitektur, grunder]: Vad gör kubelet på en worker node?

**A:** Agent som tar order från API server och kör Pods via container runtimen. Rapporterar tillbaka statusen för noden och alla Pods på den. Utan kubelet är en nod blind - den kan inte ta emot eller köra workloads.

## Q [arkitektur, grunder]: Varför är etcd kritisk?

**A:** etcd lagrar **all** klusterstate - varje Deployment, Service, ConfigMap, Secret, Node. Det är klustrets enda källa till sanning. Förlorar du etcd utan backup måste du bygga om allt manuellt. Backups av etcd är därför obligatoriska i produktion.

## Q [arkitektur, grunder]: Vad är skillnaden mellan deklarativt och imperativt?

**A:** Deklarativt = beskriv önskat tillstånd (`apply -f deploy.yaml`), K8s tar dig dit. Imperativt = säg exakt vad som ska hända (`kubectl run nginx`). K8s reconciliation bygger på deklarativt — imperativa kommandon skapar drift mot det som ligger i Git. I produktion: alltid deklarativt.

## Q [arkitektur, grunder]: Vad gör scheduler och vad är dess begränsning?

**A:** Scheduler bestämmer vilken nod en ny Pod ska köras på baserat på resurskrav, affinity, taints. Begränsning: kan inte schemalägga en Pod om ingen nod har tillräckliga resurser - Podden fastnar då i `Pending`. Vanligaste orsaken till "min Pod startar inte" är att scheduler inte hittar plats.

## Q [arkitektur, grunder]: Vad är skillnaden mellan API server och etcd?

**A:** API server är gränssnittet — alla requests går genom den, den validerar och autentiserar. etcd är lagret som sparar allt. Du pratar aldrig direkt med etcd, du går alltid via API server.

## Q [arkitektur, grunder]: Hur kommunicerar control plane och worker nodes?

**A:** kubelet på varje worker pollar API server kontinuerligt: "har du några order åt mig?". Om en Pod ska schemaläggas på noden får kubelet besked, startar den, och rapporterar tillbaka status. All kommunikation går genom API server - workers pratar aldrig direkt med varandra eller med etcd.
