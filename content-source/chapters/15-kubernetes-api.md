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

Giacomo om varför API-centrismen spelar roll: "Allt som pratar HTTP kan styra klustret." Det är därför k9s, kubectl och egna GUI:n alla fungerar — de pratar mot samma API.

Om split-brain:

> Tentarelevant: Ojämnt antal control plane-noder (3, 5, 7) krävs för att etcd alltid ska kunna bilda majoritet. Med jämnt antal kan halvorna tycka olika och då vet ingen vilken state som gäller.

Om etcd-haveri: "Går etcd sönder kan du inte deploya nytt." Det som rullar fortsätter, men du tappar förmågan att ändra något.

Giacomo om Gateway API: "Jag har faktiskt inte hört talas om Gateway API — jag har inte jobbat i prod på två år." Och om varför boken ges ut årligen: API:t rör sig, K8s släpper ~2 versioner per år, ligg på senaste eller näst senaste och läs changelogs.

Om monitoring-filosofin:

> Viktigt: "Väldigt Kubernetes-aktigt" — skapa resurser (ServiceMonitor, PrometheusRule, ConfigMap) som Prometheus och Grafana plockar upp dynamiskt, istället för att redigera config för hand.

På frågan om vi behöver bygga egen Prometheus/Grafana svarade Giacomo: "Nej. Stacken finns redan. Ni får bygga den från grunden nästa kurs."

Om Loki: alla poddars loggar finns i Grafana → Explore → Loki, även för namespaces du inte har RBAC-access till. Giacomo: "Det är guld när Ingress strular."

Om ServiceMonitor-fällan:

> Tentarelevant: ServiceMonitor måste ha labeln `release: monitoring` för att Prometheus ska plocka upp den. Utan rätt label syns targetet aldrig.

Om CC-kravet:

> Tentarelevant: Monitoring är ett krav i Chess Challenge — instrumentera appen, dashboard via manifest (inte UI-knapp), enkel larmsättning. Behöver inte vara klart till finaldagen, CI/CD är viktigare.

Giacomo erkände att han varit otydlig om monitoring-kravet med flit: "By design — för att se vilka som frågade." Den egentliga lärdomen:

> Viktigt: "Kunden vet inte vad den vill. Det kunden säger, det kunden menar, och det kunden faktiskt vill ha är tre olika saker. Dubbelkolla alltid."

# Lektion

API server är interfacet mot klustret. Allt går genom den — kubectl, operators, Pods. Giacomo poängterade att API:t inte bryr sig om vilken klient som pratar med det: "Allt som pratar HTTP kan styra klustret." Han nämnde k9s som exempel, men sa att du lika gärna kan bygga ett eget GUI som postar mot API:t. Sealed Secrets-operatorn är ett konkret exempel — den bevakar sealed secret-resurser via API:t och skapar riktiga Secrets utifrån dem.

Etcd ligger bakom. Det är klustrets state store, en distribuerad databas där all konfiguration lever. Control plane håller state synkad mot etcd.

Sen kom split-brain-resonemanget. Med flera control plane-noder måste de vara överens om vilken state som gäller. Giacomo förklarade varför man kör ojämnt antal noder (3, 5, 7): "Hade du två så kan de tycka olika och då vet ingen vilken state som gäller — med ojämnt finns alltid en majoritet." Han la till en varning: går etcd sönder kan du inte deploya nytt. Du kan fortfarande köra det som redan rullar, men du tappar förmågan att ändra något i klustret.

## API-grupper och versioner

`apiVersion` + `kind` står i varje manifest. Versionerna går v1alpha1 (nytt, ostabilt) → v1beta1 (närmar sig stabilt) → v1 (stabilt). Inga revolutionerande nyheter, men Giacomo ville understryka att v1 är det du vill ha i prod.

Sen kom Gateway API upp. Det är Ingress-efterföljaren. Giacomo medgav öppet: "Jag har faktiskt inte hört talas om Gateway API." Han la till att han inte jobbat i prod på två år och att det är därför boken ges ut årligen — API:t rör sig hela tiden. K8s släpper ungefär två versioner per år, och hans tips var enkelt: ligg på senaste eller näst senaste, och läs changelogs när du jobbar.

## Observability — lektionens stora del

Resten av lektionen var monitorering, och Giacomo ramade in det som "väldigt Kubernetes-aktigt": istället för att redigera Prometheus- eller Grafana-config för hand skapar du **resurser** i klustret, och stacken plockar upp dem dynamiskt. Det är samma deklarativa idé som resten av K8s.

Han var tydlig med att vi INTE behöver bygga egen Prometheus/Grafana/Loki för CC. Stacken finns redan på klustret. Det kommer en helt egen kurs där ni bygger den från grunden, så här handlar det bara om att koppla in sig. Loggarna samlas redan in — Grafana → Explore → Loki ger er alla poddars loggar, även för namespaces ni inte har RBAC-access till. Giacomo lyfte specifikt att det är guld vid Ingress-felsökning.

Sen gick han igenom fyra delar:

**1. Exposera metrics i appen.** Devs lägger till ett bibliotek. För FastAPI använde han `prometheus-fastapi-instrumentator` som exempel — importera, initialisera, klart. Du får en `/metrics`-endpoint med request/sec, statuskoder, latens. "Ett par rader kod, knappt mer." Både front och back kan exposa metrics.

**2. ServiceMonitor.** Det är en Prometheus CoreOS-resurs som säger till Prometheus "skrapa det här targetet". Giacomo varnade för en fälla: den måste ha rätt label, `release: monitoring`, annars plockas den inte upp av deras Prometheus. `matchLabels` matchar appen, och `endpoint` definierar port, path och intervall. Det är alltid en GET-request.

**3. PrometheusRule.** Alerts skrivs i PromQL. Giacomo gav två exempel som räcker för CC: mer än 5% 500-svar över 5 minuter (warning), eller ingen trafik alls på 15 minuter. När larmet triggar går det till Mattermost. "Två-tre regler räcker, ni ska inte sätta upp ett SRE-team."

**4. Grafana dashboard via ConfigMap.** Du bygger dashboarden i Grafanas UI, exporterar JSON, klistrar in JSON i en ConfigMap, och sätter labeln `grafana_dashboard: "1"`. Grafana plockar upp den inom en minut. Inget manuellt klick i Grafana efteråt — allt ligger som manifest i repot.

Giacomo påminde om att ni har RBAC-behörighet att skapa de här resurserna i era egna namespaces.

## CC-kravet — viktigt

Monitorering ÄR ett krav i Chess Challenge. Giacomo erkände direkt att han varit "medvetet otydlig — by design" tidigare för att se vilka som frågade. Men nu var det utskrivet:

- Behöver INTE vara klart till finaldagen. CI/CD är det viktiga — monitoring kan kompletteras efter.
- Krav: instrumentera appen, dashboard via manifest (inte byggd för hand i UI:t), enkel larmsättning.

Den egentliga lärdomen, sa han, är inte tekniken. "Kunden vet inte vad den vill. Det kunden säger, det kunden menar och det kunden faktiskt vill ha är tre olika saker. Dubbelkolla alltid." Det är därför han var otydlig — för att tvinga oss att fråga.

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

## 1. Exposera /metrics i appen

Devs lägger till ett Prometheus-bibliotek. För en FastAPI-app:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# efter app = FastAPI()
Instrumentator().instrument(app).expose(app)
```

Förväntat: `GET /metrics` returnerar Prometheus-format med request/sec, statuskoder, latens. Ett par rader är allt som krävs.

## 2. ServiceMonitor — säg till Prometheus att skrapa appen

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

Förväntat: Prometheus plockar upp targetet inom en minut. Labeln `release: monitoring` är obligatorisk — utan den ignoreras manifestet.

## 3. PrometheusRule — larm via PromQL

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: my-app-alerts
  labels:
    release: monitoring
spec:
  groups:
    - name: my-app
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Mer än 5% 500-svar senaste 5 min"
        - alert: NoTraffic
          expr: sum(rate(http_requests_total[15m])) == 0
          for: 15m
          labels:
            severity: warning
```

Förväntat: när regeln triggar går larmet till Mattermost. Två-tre regler räcker för CC.

## 4. Grafana dashboard som ConfigMap

Bygg dashboarden i Grafana UI, exportera JSON, klistra in.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-dashboard
  labels:
    grafana_dashboard: "1"
data:
  my-app.json: |
    {
      "title": "My App",
      "panels": [ ... ]
    }
```

Förväntat: dashboarden dyker upp i Grafana inom ungefär en minut. Inget manuellt klick — allt ligger som manifest i repot.

# Flashcards

## Q [api, observability]: Vad är K8s API server?

**A:** Central komponent i control plane. Tar emot HTTP-requests, validerar, autentiserar och sparar till etcd. Allt går genom API server — kubectl, controllers, kubelet. K8s "front door".

## Q [api, observability]: Vad är en API-grupp?

**A:** Gruppering av relaterade resurstyper. Core (`/api/v1/`) har Pods och Services. apps/v1 har Deployments. networking.k8s.io/v1 har Ingress. Det är detta du skriver som `apiVersion` i YAML. Grupperna gör att olika delar av API:t kan utvecklas i egen takt.

## Q [api, observability]: Vad är skillnaden mellan alpha, beta och stable API-versioner?

**A:** Alpha (v1alpha1): experimentellt, kan ändras/försvinna, inte default-aktiverat. Beta (v1beta1): testas i prod, API kan ändras. Stable (v1): production-ready, bakåtkompatibilitet garanterad. Använd alltid stable i prod när möjligt.

## Q [api, observability]: Vad är "watching" i K8s API?

**A:** Sätt att hålla en HTTP-anslutning öppen mot API server och få push-notiser när resurser skapas, ändras eller raderas. Så här reagerar controllers på ändringar — de watchar sina resurser och triggas av events. `kubectl get pods -w` öppnar en watch.

## Q [api, observability]: Vad är en CRD?

**A:** Custom Resource Definition. Låter dig utöka K8s API med egna resurstyper. Definiera en CRD och nu funkar t.ex. `kubectl get backups`. Grunden för operators — appar som hanterar databaser eller certifikat som K8s-objekt.

## Q [api, observability]: Vad är en Operator?

**A:** App som utökar K8s med egen logik. Består av en CRD (ny resurstyp) + en controller (kod som reagerar på resursen). Ex: prometheus-operator låter dig hantera Prometheus som `kind: Prometheus` i YAML. Flyttar in drift-logiken i K8s deklarativa modell.

## Q [api, observability]: Vad gör `kubectl explain`?

**A:** Visar schema-dokumentation för en resurs eller fält. `kubectl explain pod.spec.containers` visar alla fält under containers. Användbart vid YAML-skrivning - bättre än att gissa fältnamn. Fungerar för alla resurser inklusive CRDs.

## Q [api, observability]: Vad är skillnaden mellan PUT och PATCH?

**A:** PUT = ersätt hela objektet med en ny version. PATCH = skicka bara det du vill ändra (delta). PATCH är effektivare och säkrare när flera klienter redigerar samtidigt. `kubectl edit` gör PUT, `kubectl patch` gör PATCH.

## Q [api, observability]: Hur kommunicerar controllers med API server?

**A:** Via watch-API. Controllern listar först alla relevanta resurser och öppnar sedan en watch för att få notiser om ändringar. Lokal cache hålls synkad med API server. När ett event kommer in körs reconciliation — jämför actual mot desired och agera.