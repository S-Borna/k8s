---
title: "Cross-namespace service discovery med jump-Pod"
source: lecture
sourceLabel: "Lektion 27 april — Kap 10 Service Discovery"
chapterId: 10
filename: "kap10-service-discovery.yaml"
---

# Varför

Giacomo visade hur Kubernetes-DNS faktiskt funkar i praktiken — inte teori, utan en pod som verkligen kor `nslookup` och `curl` mot olika Services. Manifesten bygger upp tva namespaces (`shop` och `finance`) for att tvinga fram fragan: vad hander nar du anropar en Service med kort namn over namespace-gransen? Hela poangen ar att visa att `catalog` funkar fran `shop`, men `payments` i `finance` kraver mer — antingen FQDN eller env-var-trick. Det ar samma matrik som i Saids ForeverHome-arkitektur nar `auth` ska prata med `payments` over namespaces.

# Tva namespaces — shop och finance

Forst skapas tva namespaces (rad 1-9) som hela ovningen vilar pa. Anledningen: DNS i Kubernetes ar namespace-medvetet, sa for att kunna demonstrera skillnaden mellan lokal och cross-namespace lookup behovs minst tva. `shop` ar dar appen lever, `finance` ar avsiktligt 'borta' for att simulera en annan teams service. Utan denna separation skulle hela poangen med ovningen forsvinna.

# catalog — Deployment + Service i shop

catalog ar en simpel `http-echo`-Deployment med 2 replicas (rad 11-32) som svarar 'Hello from catalog' pa port 5678. Servicen framfor (rad 34-44) exponerar port 80 och mappar till containerns 5678 via `targetPort`. Selector `app: catalog` ar limmet — Service hittar Pods via labels, inte namn. Detta ar 'normalfallet' som jump-poden senare ska kunna na med bara `catalog` som hostname.

# payments — samma monster, annat namespace

payments-Deployment och Service ar nastan identiska med catalog (rad 46-79), men ligger i `finance`. Avsiktligt — for att visa att YAMLn ser likadan ut, men DNS-beteendet skiljer sig dramatiskt nar du anroopar over namespace-gransen. Samma image, samma port 80 -> 5678, samma selector-monster. Skillnaden ar bara `namespace: finance` pa rad 50 och 73.

# jump-Pod — netshoot som debug-verktyg

jump (rad 81-104) ar en netshoot-container som lever i `shop` och anvands som 'inifran-klustret-terminal'. Den har inget product-syfte — den finns bara for att kora `nslookup` och `curl` mot de andra services. netshoot-imagen ar full av natverksverktyg (dig, nslookup, curl, tcpdump) vilket gor den till standard-debug-pod nar nat strular. `sleep infinity` pa slutet (rad 163) haller poden vid liv sa du kan `kubectl exec` in i den.

# dnsConfig override — varfor det smaller om man inte fattar

Pa rad 96-103 satts `dnsPolicy: None` och en custom `dnsConfig` som pekar pa 8.8.8.8 plus search-domaner. Detta ar fallgropen Giacomo varnar for — normalt arver Pods kluster-DNS automatiskt, men har overrider vi det manuellt. `searches`-listan (`default.svc.cluster.local`, `svc.cluster.local`, `cluster.local`) ar exakt det som gor att kort namn `catalog` kan resolvas till FQDN. Tar du bort dem funkar nslookup 2 inte langre.

# Env-vars som cross-namespace-trick

PAYMENTS_HOST=payments och PAYMENTS_PORT=80 (rad 107-111) ar inte magiska Kubernetes-features — det ar bara vanliga env-vars som scriptet senare laser. Trick: scriptet anvander `${PAYMENTS_HOST}` for att slippa hardkoda FQDN. Men eftersom search-domanerna inte inkluderar `finance.svc.cluster.local`, kommer `nslookup payments` faktiskt MISSLYCKAS — det ar precis det Giacomo ville demonstrera. Cross-namespace kraver FQDN: `payments.finance.svc.cluster.local`.

# /check.sh — de fem testen i ordning

Scriptet (rad 116-160) kor fem checks som tillsammans visar hela DNS-bilden: (1) kubernetes-servicen i default — finns det DNS overhuvudtaget? (2) catalog kort-namn — funkar i samma namespace, (3) curl http://catalog — Service routar till Pod, (4) nslookup payments — failar utan FQDN, (5) curl till payments — failar av samma anledning. Varje check raknar fel i `fails`-variabeln och `LAB COMPLETE` skrivs bara om allt passerar. Just att 4 och 5 falar ar pedagogiken — inte en bugg.

# Tentapunkter

- Forklara varfor `catalog` funkar som hostname fran jump-poden men `payments` inte gor det — search-domaner i dnsConfig inkluderar `shop` men inte `finance`.
- Beskriv vad FQDN ar i K8s-sammanhang: `<service>.<namespace>.svc.cluster.local` och nar man maste anvanda det.
- Forklara skillnaden mellan en Service `port` och `targetPort` — Service lyssnar pa 80, Pod pa 5678.
- Visa hur Service hittar sina Pods via `selector: app: catalog` (labels, inte namn).
- Forklara varfor netshoot-podden anvands — den har debug-verktyg som inte finns i produktions-images.
