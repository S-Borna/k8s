---
id: 5
title: "Virtual clusters with Namespaces"
titleSv: "Virtuella kluster med Namespaces"
estimatedMinutes: 25
---

# Sammanfattning

Namespaces delar upp ett K8s-kluster i **virtuella kluster**. Inte samma sak som Linux kernel namespaces — K8s namespaces är en logisk gruppering av resurser.

## Vad Namespaces ger

- Egen scope för resursnamn (samma `Service` kan finnas i flera namespaces)
- Egna RBAC-regler per namespace
- Resource quotas (begränsa CPU/minne)
- Network policies (begränsa trafik mellan namespaces)

## Soft isolation vs hard isolation

**Soft isolation (Namespaces):** Lättviktigt, enkelt. En komprometterad workload i ett namespace kan ändå nå andra namespaces via nätverket.

**Hard isolation (separata kluster):** Egna kluster på dedikerad hårdvara. Riktig isolation. Vanligast för externa tenants.

Tumregel: Använd Namespaces inom samma organisation. Använd separata kluster mellan organisationer.

## Default Namespaces

Varje kluster har fyra:

- `default` — dit objekt hamnar utan annat val
- `kube-system` — control plane-komponenter (DNS, metrics)
- `kube-public` — objekt läsbara av alla
- `kube-node-lease` — node heartbeats

Lägg **aldrig** dina egna grejer i `kube-system`.

## Namespaced vs cluster-scoped

De flesta objekt är namespaced (Pods, Services, Secrets, ConfigMaps, Deployments). Vissa är cluster-scoped (Nodes, PersistentVolumes, Namespaces själva). Cluster-scoped objekt finns på hela klustret, inte inom ett namespace.

```bash
kubectl api-resources         # NAMESPACED-kolumnen visar true/false
```

## Skapa och använda Namespaces

**Imperativt:**
```bash
kubectl create namespace dev
```

**Deklarativt (dev-ns.yaml):**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    env: development
```

**Filtrera per namespace:**
```bash
kubectl get pods -n dev
kubectl get pods --all-namespaces
```

**Sätt default namespace för kubectl:**
```bash
kubectl config set-context --current --namespace=dev
```

## Vanliga use cases

- Dev/staging/prod-miljöer på samma kluster
- Per-team isolering (team-frontend, team-backend)
- Per-customer isolering (för SaaS, men bara om soft isolation räcker)

# Giacomos tillägg

Giacomo betonade **stenhårt** att Namespaces inte ger nätverksisolering. En Pod i namespace `frontend` kan curl:a en Service i namespace `backend` utan problem (med rätt FQDN: `service.namespace.svc.cluster.local`).

Vill du isolera nätverket: använd **NetworkPolicies** (separat objekt).

Han pekade också på att labbklustret bara gav varje student ett namespace — du kan inte skapa fler. Detta är en del av RBAC.

> 💡 Tentarelevant: Namespaces ger INTE nätverksisolering. Detta är en klassisk fälla. Tentafråga kan vara "Är Pods i olika namespaces isolerade från varandra?" — svaret är "Nej, inte by default. Namespaces är logisk gruppering, inte nätverksisolering. NetworkPolicies krävs för det."

> 💡 Tentarelevant: Förstå vad som är namespaced vs cluster-scoped. Nodes är cluster-scoped (de tillhör hela klustret, inte ett namespace).

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Lista befintliga namespaces

```bash
kubectl get namespaces
```

Förväntat: Default-namespacesarna plus eventuellt egna.

## 2. Skapa ett nytt namespace

```bash
kubectl create namespace shield
```

Förväntat: `namespace/shield created`.

## 3. Skapa en Pod i specifikt namespace

```bash
kubectl run test-pod --image=nginx -n shield
kubectl get pods -n shield
```

Förväntat: Podden finns bara i `shield`, inte i `default`.

## 4. Kolla att den inte syns i default

```bash
kubectl get pods
```

Förväntat: Tom lista (om default är tomt). Pods är osynliga från andra namespaces by default.

## 5. Sätt default namespace

```bash
kubectl config set-context --current --namespace=shield
kubectl get pods
```

Förväntat: Nu visas `test-pod` utan att du anger `-n shield`.

## 6. Återställ default

```bash
kubectl config set-context --current --namespace=default
```

## 7. Städa

```bash
kubectl delete namespace shield
```

Förväntat: Allt i namespacet (Pod, Services, etc) raderas automatiskt. Smidigt sätt att städa.

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är en Namespace i K8s?

**A:** En logisk gruppering av resurser inom ett kluster - virtuella kluster. Ger eget scope för resursnamn, egna RBAC-regler, resource quotas. Är INTE samma sak som Linux kernel namespaces, och ger INTE nätverksisolering by default.

## Q: Ger Namespaces nätverksisolering?

**A:** Nej. Pods i olika namespaces kan prata med varandra fritt via FQDN (`service.namespace.svc.cluster.local`). Vill du blockera trafik krävs NetworkPolicies. Detta är en vanlig missuppfattning.

## Q: Vad är skillnaden mellan namespaced och cluster-scoped objekt?

**A:** Namespaced objekt (Pods, Services, Secrets) finns inom ett specifikt namespace. Cluster-scoped objekt (Nodes, PersistentVolumes, Namespaces själva) tillhör hela klustret. Du kan inte sätta en Node i ett namespace.

## Q: Vilka är de fyra default-namespaces?

**A:** `default` (dit objekt hamnar utan annat val), `kube-system` (control plane), `kube-public` (läsbart för alla), `kube-node-lease` (node heartbeats). Lägg aldrig egna saker i `kube-system`.

## Q: När använder man Namespaces vs separata kluster?

**A:** Namespaces inom samma organisation - bra för dev/staging/prod, eller per-team isolering. Separata kluster mellan organisationer eller när hard isolation krävs (t.ex. olika customers i SaaS). Namespaces är soft isolation - en komprometterad workload kan nå andra namespaces.

## Q: Hur sätter man default namespace för kubectl?

**A:** `kubectl config set-context --current --namespace=<namn>`. Sparas i `~/.kube/config`. Användbart när du jobbar med ett specifikt namespace - slipper skriva `-n` på varje kommando.

## Q: Vad händer när man raderar ett namespace?

**A:** Alla resurser i det raderas automatiskt - Pods, Services, ConfigMaps, allt. Smidigt sätt att städa upp. Kan ta minuter om många resurser. Cluster-scoped objekt (Nodes) påverkas inte.

## Q: Hur når man en Service i ett annat namespace?

**A:** Med FQDN: `service.namespace.svc.cluster.local`. Kort namn (`service`) funkar bara i samma namespace. Detta beror på DNS search domains som är konfigurerade per namespace.
