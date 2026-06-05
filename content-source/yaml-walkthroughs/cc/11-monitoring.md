---
title: "Monitoring"
source: chas-challenge
sourceLabel: "Eget projekt — Monitoring"
chapterId: 15
filename: "11-monitoring.yaml"
---

# Varför

Saids egna observability-stack för appen i lab-klustret — han säger åt Prometheus att skrapa hans backend, definierar tre alerts som faktiskt betyder något för hans app, och packar in en Grafana-dashboard som ConfigMap. Giacomo demonstrerade kap 11-konceptet att monitoring inte är något du bygger en gång — det är YAML som lever bredvid din app. Poängen: backend exposear `/metrics`, ServiceMonitor pekar Prometheus åt rätt håll, PrometheusRule larmar när det går snett, och Grafana plockar upp dashboarden automatiskt via labeln `grafana_dashboard: "1"`.

# ServiceMonitor — säg åt Prometheus att skrapa

Första blocket (rad 1-16) är en `ServiceMonitor` — en CRD från Prometheus Operator, inte vanlig K8s. Den letar efter Services med labels `app: foreverhome` och `component: backend` (rad 10-12) och börjar skrapa `/metrics` på port 5158 var 15:e sekund. Fallgrop: `release: monitoring` (rad 7) MÅSTE matcha det som operator:n filtrerar på i klustret — saknas labeln så ignoreras hela ServiceMonitorn tyst. Inga metrics, inga alerts, ingen dashboard.

# PrometheusRule — tre alerts som faktiskt betyder något

Andra blocket (rad 18-52) definierar alerts som körs på Prometheus mot appens egna metrics. Tre regler: hög 5xx-rate (>5% i 5 min, warning), ingen trafik alls (15 min, info), och backend nere (0 replicas i 2 min, critical). Severities skiljer — `info` väcker ingen mitt i natten, `critical` gör det. Filtret `endpoint!="/metrics"` (rad 31, 40) finns för att Prometheus själv skrapar `/metrics` konstant och skulle annars maska riktiga trafiken.

# clamp_min — division-by-zero-skyddet

På rad 32 står `clamp_min(sum(...), 1)` i nämnaren — det är inte slarv, det är defensivt. Utan trafik blir nämnaren 0 och PromQL ger `NaN`, vilket gör att larmet aldrig triggar trots att appen är död. `clamp_min(..., 1)` tvingar nämnaren att vara minst 1, så uttrycket alltid kan utvärderas. Det här är G-nivå-konceptet: en alert som tystas vid 0 trafik är värre än ingen alert.

# ConfigMap som Grafana-dashboard

Tredje blocket (rad 54-131) är en helt vanlig ConfigMap — men labeln `grafana_dashboard: "1"` (rad 60) är magin. Grafana sidecar i klustret letar efter just den labeln, plockar JSON-innehållet ur `data`, och importerar dashboarden automatiskt. Inga klick i Grafana-UI:t — dashboarden är kod, versionerad i repo:t. Filnyckeln `foreverhome-grupp10.json` (rad 62) blir dashboardens identitet.

# Fyra paneler — RED-method light

Dashboardens fyra paneler (rad 70-130) följer ungefär RED: Rate (req/s per endpoint, rad 74), Errors (5xx-andel, rad 89), Duration (p95-latens per endpoint, rad 104) och en räknare per HTTP-kod (rad 119). `histogram_quantile(0.95, ...)` (rad 109) räknar fram p95 från Prometheus histogram-buckets — kräver att backend exporterar `http_request_duration_seconds_bucket`. Saknas histogrammet i appen så blir panelen tom.

# Namespace-isolation — varför `doe25-said-ebadi` står överallt

Hela manifesten är låst till namespace `doe25-said-ebadi` (rad 5, 22, 58) och alla PromQL-uttryck filtrerar på `namespace="doe25-said-ebadi"`. Det är inte kosmetik — lab-klustret är delat med hela klassen, och utan namespace-filter skulle Saids alerts trigga på klasskamraters trafik och hans dashboard visa allas metrics. På tentan: namespace är hur du isolerar din observability från grannens i ett delat kluster.

# Tentapunkter

- ServiceMonitor är en CRD (inte core K8s) som säger åt Prometheus Operator vilka Services som ska skrapas och hur ofta
- PrometheusRule definierar alerts i YAML — `expr` är PromQL, `for` är hur länge villkoret måste hålla innan larmet fyrar
- Grafana-dashboards levereras som ConfigMaps med labeln `grafana_dashboard: "1"` — sidecar plockar upp dem automatiskt
- `clamp_min` i nämnaren skyddar mot division-by-zero så alerts inte tystas vid 0 trafik
- I delat kluster MÅSTE alla PromQL-uttryck filtrera på namespace — annars ser du andras data och larmar på andras fel
