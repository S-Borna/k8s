---
title: "Service discovery"
source: lecture
sourceLabel: "Lektion 27 april — Kap 10 Service Discovery"
chapterId: 10
filename: "kap10-service-discovery.yaml"
---

# Varför

Giacomo visade hur Kubernetes-DNS faktiskt funkar i praktiken — inte teori, utan en pod som verkligen kör `nslookup` och `curl` mot olika Services. Manifesten bygger upp två namespaces (`shop` och `finance`) för att tvinga fram frågan: vad händer när du anropar en Service med kort namn över namespace-gränsen? Hela poängen är att visa att `catalog` funkar från `shop`, men `payments` i `finance` kräver mer — antingen FQDN eller env-var-trick. Det är samma matrik som i Saids ForeverHome-arkitektur när `auth` ska prata med `payments` över namespaces.

# Två namespaces — shop och finance

Först skapas två namespaces (rad 1-9) som hela övningen vilar på. Anledningen: DNS i Kubernetes är namespace-medvetet, så för att kunna demonstrera skillnaden mellan lokal och cross-namespace lookup behövs minst två. `shop` är där appen lever, `finance` är avsiktligt 'borta' för att simulera en annan teams service. Utan denna separation skulle hela poängen med övningen försvinna.

# catalog — Deployment + Service i shop

catalog är en simpel `http-echo`-Deployment med 2 replicas (rad 11-32) som svarar 'Hello from catalog' på port 5678. Servicen framför (rad 34-44) exponerar port 80 och mappar till containerns 5678 via `targetPort`. Selector `app: catalog` är limmet — Service hittar Pods via labels, inte namn. Detta är 'normalfallet' som jump-poden senare ska kunna nå med bara `catalog` som hostname.

# payments — samma mönster, annat namespace

payments-Deployment och Service är nästan identiska med catalog (rad 46-79), men ligger i `finance`. Avsiktligt — för att visa att YAMLn ser likadan ut, men DNS-beteendet skiljer sig dramatiskt när du anropar över namespace-gränsen. Samma image, samma port 80 -> 5678, samma selector-mönster. Skillnaden är bara `namespace: finance` på rad 50 och 73.

# jump-Pod — netshoot som debug-verktyg

jump (rad 81-104) är en netshoot-container som lever i `shop` och används som 'inifrån-klustret-terminal'. Den har inget product-syfte — den finns bara för att köra `nslookup` och `curl` mot de andra services. netshoot-imagen är full av nätverksverktyg (dig, nslookup, curl, tcpdump) vilket gör den till standard-debug-pod när nät strular. `sleep infinity` på slutet (rad 163) håller poden vid liv så du kan `kubectl exec` in i den.

# dnsConfig override — varför det smäller om man inte fattar

På rad 96-103 sätts `dnsPolicy: None` och en custom `dnsConfig` som pekar på 8.8.8.8 plus search-domäner. Detta är fallgropen Giacomo varnar för — normalt ärver Pods kluster-DNS automatiskt, men här overrider vi det manuellt. `searches`-listan (`default.svc.cluster.local`, `svc.cluster.local`, `cluster.local`) är exakt det som gör att kort namn `catalog` kan resolvas till FQDN. Tar du bort dem funkar nslookup 2 inte längre.

# Env-vars som cross-namespace-trick

PAYMENTS_HOST=payments och PAYMENTS_PORT=80 (rad 107-111) är inte magiska Kubernetes-features — det är bara vanliga env-vars som scriptet senare läser. Trick: scriptet använder `${PAYMENTS_HOST}` för att slippa hårdkoda FQDN. Men eftersom search-domänerna inte inkluderar `finance.svc.cluster.local`, kommer `nslookup payments` faktiskt MISSLYCKAS — det är precis det Giacomo ville demonstrera. Cross-namespace kräver FQDN: `payments.finance.svc.cluster.local`.

# /check.sh — de fem testen i ordning

Scriptet (rad 116-160) kör fem checks som tillsammans visar hela DNS-bilden: (1) kubernetes-servicen i default — finns det DNS överhuvudtaget? (2) catalog kort-namn — funkar i samma namespace, (3) curl http://catalog — Service routar till Pod, (4) nslookup payments — failar utan FQDN, (5) curl till payments — failar av samma anledning. Varje check räknar fel i `fails`-variabeln och `LAB COMPLETE` skrivs bara om allt passerar. Just att 4 och 5 falar är pedagogiken — inte en bugg.

# Tentapunkter

- Förklara varför `catalog` funkar som hostname från jump-poden men `payments` inte gör det — search-domäner i dnsConfig inkluderar `shop` men inte `finance`.
- Beskriv vad FQDN är i K8s-sammanhang: `<service>.<namespace>.svc.cluster.local` och när man måste använda det.
- Förklara skillnaden mellan en Service `port` och `targetPort` — Service lyssnar på 80, Pod på 5678.
- Visa hur Service hittar sina Pods via `selector: app: catalog` (labels, inte namn).
- Förklara varför netshoot-podden används — den har debug-verktyg som inte finns i produktions-images.
