---
title: "Monitoring-stack"
source: lecture
sourceLabel: "Lektion 21 maj — Kap 15 Monitoring"
chapterId: 15
filename: "kap15-monitoring.yaml"
---

# Varför

Giacomo körde igenom hur du sätter upp observability för en app i klustret — utan att röra Prometheus eller Grafana själva. Du deklarerar tre resurser i en fil: en ServiceMonitor som säger "skrapa här", en PrometheusRule som säger "larma så här", och en ConfigMap som blir en Grafana-dashboard. Stacken plockar upp dem automatiskt via labels. Det är samma deklarativa idé som genom hela kursen — du beskriver vad du vill, klustret löser hur.

# ServiceMonitor — säg åt Prometheus att skrapa

Första resursen (rad 1-14) talar om för Prometheus-operatorn att den ska skrapa appen test-rest-api. `selector.matchLabels` (rad 8-10) hittar Service:n som har `app: test-rest-api`, och `endpoints` (rad 11-14) säger vilken port och path metrics ligger på — här `/metrics` var 15:e sekund. Appen själv måste exponera Prometheus-format på den endpointen, annars får du tomma grafer.

# Label `release: monitoring` — den absolut viktigaste raden

Raderna 6 och 21 är där allt brukar gå fel. Prometheus-operatorn är konfigurerad att bara plocka upp ServiceMonitors och PrometheusRules som har exakt denna label. Glömmer du den — eller stavar fel — händer ingenting, inga felmeddelanden, bara tystnad. Giacomo markerade detta med kommentar i YAMLen för att studenter ska kolla labeln först vid felsökning.

# PrometheusRule — alerts definierade i kod

Andra resursen (rad 16-46) lägger till två larm. Första (rad 26-37) räknar andelen 5xx-svar de senaste 5 minuterna och larmar om den går över 5% i 5 minuter — det är PromQL-uttrycket på rad 27-31 som gör mattan. Andra (rad 38-45) larmar om appen inte fått någon trafik på 15 minuter, vilket fångar att appen kraschat tyst. `handler!="/metrics"` filtrerar bort Prometheus egen skrapning så den inte räknas som trafik.

# ConfigMap som Grafana-dashboard

Tredje resursen (rad 47-136) är en helt vanlig ConfigMap — men labeln `grafana_dashboard: "1"` (rad 52) gör att Grafanas sidecar plockar upp den och laddar in JSONen som en dashboard automatiskt. Du behöver alltså inte logga in i Grafana och importera filer manuellt — du applyar YAML och dashboarden dyker upp. Samma label-pickup-mönster som ServiceMonitor använder.

# Dashboardens fyra paneler

JSONen (rad 54-136) definierar fyra paneler: request rate per handler (rad 75-90), 5xx-andel (rad 91-105), p95-latens per handler (rad 106-120), och en stat-panel med antal requests per status-kod (rad 121-134). `$namespace`-variabeln (rad 62-73) gör dashboarden återanvändbar — du väljer namespace i toppen och alla queries filtreras dynamiskt. Samma metric `http_requests_total` driver både alerts och paneler.

# Deklarativ monitoring — pedagogiken

Hela poängen Giacomo ville få fram: du rör aldrig Prometheus eller Grafana direkt. Du skapar tre Kubernetes-resurser, stacken plockar upp dem via labels, och övervakningen finns. Vill du ta bort allt — `kubectl delete -f` på samma fil. Samma flöde som med Deployments och Services: deklarera önskat tillstånd, låt klustret göra resten.

# Tentapunkter

- Förklara varför `release: monitoring`-labeln är kritisk — utan den ignorerar Prometheus-operatorn resursen helt
- Beskriv vad en ServiceMonitor gör: pekar ut vilken Service, vilken port och vilken path som ska skrapas för metrics
- Förklara skillnaden mellan en PrometheusRule (definierar alerts i YAML) och en ConfigMap med `grafana_dashboard: "1"` (laddar dashboard automatiskt)
- Förklara varför `handler!="/metrics"` används i PromQL-uttrycken — för att inte räkna Prometheus egen skrapning som riktig trafik
- Förklara den deklarativa idén: du applyar YAML, stacken upptäcker resurserna via labels, du rör aldrig Prometheus/Grafana manuellt
