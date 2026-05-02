---
id: 15
title: "The Kubernetes API"
titleSv: "Kubernetes API:t"
estimatedMinutes: 35
---

# Sammanfattning

K8s är **API-centrerat**. Allt — kubectl, controllers, kubelet — pratar HTTP REST mot API server. Förstår du API:t förstår du K8s på djupet.

## API server

Central komponent i control plane. Tar emot HTTP-requests, validerar, autentiserar, persisterar till etcd. **Allt** går genom API server. Varje resurs (Pod, Service, Deployment) har en URL.

## API-grupper

Resurser är organiserade i grupper för att hantera storleken:

- **Core** (`/api/v1/`) — grundläggande resurser: Pods, Services, ConfigMaps, Nodes
- **apps/v1** — Deployments, StatefulSets, DaemonSets, ReplicaSets
- **batch/v1** — Jobs, CronJobs
- **networking.k8s.io/v1** — Ingress, NetworkPolicy
- **rbac.authorization.k8s.io/v1** — Role, RoleBinding, ClusterRole

Detta är `apiVersion` i YAML-filer.

## Versionering

Tre stabilitetsnivåer:

- **Alpha** (v1alpha1) — experimentellt, kan ändras eller tas bort. Inte default-aktiverat.
- **Beta** (v1beta1) — testas i prod, men API kan ändras. Numera ovanligt — K8s gick mot stable snabbare.
- **Stable** (v1) — production-ready, bakåtkompatibilitet garanterad.

## RESTful struktur

Standardoperationer:
- `GET /api/v1/namespaces/default/pods` — lista pods
- `GET /api/v1/namespaces/default/pods/my-pod` — hämta specifik pod
- `POST /api/v1/namespaces/default/pods` — skapa pod
- `PUT /api/v1/namespaces/default/pods/my-pod` — uppdatera pod
- `DELETE /api/v1/namespaces/default/pods/my-pod` — radera pod
- `PATCH` — partiell uppdatering

`kubectl` översätter dina kommandon till dessa HTTP-requests.

## Watching

Förutom standardrequests stöds **watching** — håll en HTTP-anslutning öppen och få push-notifieringar när resurser ändras. Detta är hur controllers reagerar på ändringar.

```bash
kubectl get pods -w
```

Detta öppnar en watch-anslutning till API server.

## Custom Resource Definitions (CRDs)

Du kan utöka API:t med egna resurser. Definiera en CRD, och nu finns en ny resurstyp som kubectl kan hantera. Operators bygger på detta.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              schedule:
                type: string
  scope: Namespaced
  names:
    plural: backups
    singular: backup
    kind: Backup
```

Nu kan du `kubectl get backups`.

## Operators

Operators är applikationer som extends K8s med custom logic via CRDs + controllers. Ex: prometheus-operator hanterar Prometheus-installationer som K8s-objekt.

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Lista alla API-grupper

```bash
kubectl api-resources
```

Förväntat: Stor lista med alla resurstyper, deras API-grupp och om de är namespaced.

## 2. Lista API-versioner

```bash
kubectl api-versions
```

## 3. Direktanrop till API server

```bash
kubectl proxy &
curl http://localhost:8001/api/v1/namespaces/default/pods
```

Förväntat: JSON med alla pods. `kubectl proxy` öppnar en lokal proxy med din auth.

## 4. Watch resurser

```bash
kubectl get pods -w
```

I annan terminal: `kubectl run test --image=nginx`. Du ser eventet komma in i watch.

## 5. Inspektera schema

```bash
kubectl explain pod.spec.containers
```

Förväntat: Schema-dokumentation för det specifika fältet. Användbart vid YAML-skrivning.

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är K8s API server?

**A:** Central komponent i control plane som tar emot HTTP-requests, validerar, autentiserar, persisterar till etcd. ALLT går genom API server - kubectl, controllers, kubelet, andra control plane-komponenter. Är K8s "front door".

## Q: Vad är en API-grupp?

**A:** Logisk gruppering av relaterade resurstyper. Core (`/api/v1/`) har grundläggande som Pods och Services. apps/v1 har Deployments. networking.k8s.io/v1 har Ingress. Detta är `apiVersion` i YAML. Grupper hanterar storleken av API:t och möjliggör utveckling i olika takt.

## Q: Vad är skillnaden mellan alpha, beta och stable API-versioner?

**A:** Alpha (v1alpha1): experimentellt, kan ändras/försvinna, inte default-aktiverat. Beta (v1beta1): testas i prod, API kan ändras. Stable (v1): production-ready, bakåtkompatibilitet garanterad. Använd alltid stable i prod när möjligt.

## Q: Vad är "watching" i K8s API?

**A:** Mekanism för att hålla en HTTP-anslutning öppen och få push-notifieringar när resurser skapas/uppdateras/raderas. Detta är hur controllers reagerar på ändringar - de watchar relevanta resurser och triggas av events. `kubectl get pods -w` använder detta.

## Q: Vad är en CRD?

**A:** Custom Resource Definition. Tillåter dig att utöka K8s API med egna resurstyper. Definiera en CRD och nu finns t.ex. `kubectl get backups`. Bas för operators - applikationer som hanterar komplexa system (databases, certifikat) som K8s-objekt.

## Q: Vad är en Operator?

**A:** Applikation som extends K8s med custom logic. Består av CRD (ny resurstyp) + controller (kod som reagerar på resursen). Ex: prometheus-operator låter dig hantera Prometheus-instances som `kind: Prometheus` i YAML. Förflyttar drift-logik in i K8s deklarativa modell.

## Q: Vad gör `kubectl explain`?

**A:** Visar schema-dokumentation för en resurs eller fält. `kubectl explain pod.spec.containers` visar alla fält under containers. Användbart vid YAML-skrivning - bättre än att gissa fältnamn. Fungerar för alla resurser inklusive CRDs.

## Q: Vad är skillnaden mellan PUT och PATCH?

**A:** PUT = ersätt hela objektet med ny version. PATCH = applicera en delmängd av ändringar (delta). Patch är mer effektivt och säkrare för konkurrent edits. `kubectl edit` använder PUT, `kubectl patch` använder PATCH.

## Q: Hur kommunicerar controllers med API server?

**A:** Via watch-API. Controller startar genom att lista alla relevanta resurser, sedan öppnar watch för att få notifieringar om ändringar. Lokal cache hålls synkad med API server. När event kommer in triggas reconciliation - jämför actual mot desired, agera.
