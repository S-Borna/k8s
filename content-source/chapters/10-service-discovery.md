---
id: 10
title: "Service discovery deep dive"
titleSv: "Service discovery på djupet"
estimatedMinutes: 40
---

# Sammanfattning

Service discovery = hur appar **hittar varandra** i klustret. Containers vet bara namn (`payments`); de behöver konvertera till IP. K8s gör detta automatiskt via cluster-DNS.

## Två saker appar behöver

1. **Veta namnet** på Service de vill nå (utvecklarens ansvar)
2. **Konvertera namn till IP** (K8s ansvar)

K8s sköter automatiskt steg 2 via cluster-DNS.

## Cluster DNS = service registry

Varje kluster har en inbyggd DNS som fungerar som service registry. Håller koll på alla Services namn och IP.

**Komponenter:**
- **Pods:** `coredns` i `kube-system` namespace
- **Deployment:** Hanterar coredns-Pods
- **Service:** Alltid kallad `kube-dns`, ClusterIP, lyssnar port 53

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl get svc -n kube-system -l k8s-app=kube-dns
```

## Service registration (automatisk)

1. Du skapar en Service med ett namn
2. K8s tilldelar ClusterIP
3. Cluster DNS bevakar API server, ser nya Services, registrerar namn + IP automatiskt

Ingen registreringslogik behövs i din app. Sätt den bakom en Service, klart.

## Service discovery (automatisk)

Varje container konfigureras automatiskt med cluster-DNS-IP i `/etc/resolv.conf`:

```
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```

- `nameserver` = ClusterIP för kube-dns Service
- `search` = domäner som appendas till korta namn
- Kort namn `payments` → DNS letar `payments.default.svc.cluster.local`

## ClusterIP routing — magin i kärnan

ClusterIPs sitter på service network — det finns **inga routes** dit. Trafiken går:

Container → default gateway → nod → nodens kernel → **kube-proxy har skapat regler (iptables/IPVS)** som interceptar ClusterIP-trafik → omdirigerar till en frisk Pods IP

Detta är varför Service är "magisk" — kerneln på varje nod har regler som översätter Service-IP till Pod-IP transparent.

## Service discovery och Namespaces

FQDN-format: `<service>.<namespace>.svc.cluster.local`

- **Samma namespace:** korta namn funkar (`curl payments:8080`)
- **Annat namespace:** FQDN krävs (`curl payments.finance.svc.cluster.local:8080`)

Samma Service-namn kan finnas i olika Namespaces. `resolv.conf` har search domain för lokala namespacet, så korta namn resolver till lokalt.

## Troubleshooting

1. **Kolla att coredns Pods körs:** `kubectl get pods -n kube-system -l k8s-app=kube-dns`
2. **Kolla logs:** `kubectl logs <coredns-pod> -n kube-system`
3. **Kolla att kube-dns Service har IP:** `kubectl get svc kube-dns -n kube-system`
4. **Verifiera att ClusterIP matchar `/etc/resolv.conf`** i containers
5. **Testa med dnsutils:** `kubectl run -it dnsutils --image registry.k8s.io/e2e-test-images/jessie-dnsutils:1.7`
6. **`nslookup kubernetes`** ska returnera `kubernetes.default.svc.cluster.local`
7. **Om DNS trasigt:** radera coredns Pods, Deployment återskapar dem

# Giacomos tillägg

Bokens hands-on **kan inte köras i labb** (kräver flera namespaces, ni har bara ett). Kör lokalt.

Giacomo gjorde en **broken DNS-övning** som inlämning. Manifest med tre fel:
1. `dnsPolicy: None` (stänger av automatisk DNS)
2. `nameservers: 8.8.8.8` (Google DNS, kan inte resolva interna Services)
3. `PAYMENTS_HOST: payments` (kort namn, men payments ligger i annat namespace)

Lösning: ändra till `dnsPolicy: ClusterFirst`, ta bort 8.8.8.8, ändra PAYMENTS_HOST till FQDN `payments.finance.svc.cluster.local`.

> 💡 Tentarelevant: Förklara skillnaden mellan kort namn och FQDN. Varför fungerar det att curl:a `service` i samma namespace men inte i annat? Svar: search domains i `/etc/resolv.conf` appendas bara till korta namn — och defaulten är lokalt namespace.

> 💡 Tentarelevant: Vad gör `dnsPolicy: ClusterFirst`? Vad gör `dnsPolicy: None`? När använder man vad?

> 💡 Tentarelevant: Hur fungerar service discovery tekniskt? Måste kunna förklara coredns + kube-proxy + iptables-trafiken steg för steg.

# Lektion

Lektionen 28 april (eller liknande) handlade om service discovery i praktiken.

# Hands-on

## 1. Inspektera cluster DNS

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl get svc kube-dns -n kube-system
```

Förväntat: 2 coredns-Pods, kube-dns Service med ClusterIP (oftast 10.96.0.10).

## 2. Skapa två Namespaces

```bash
kubectl create namespace dev
kubectl create namespace prod
```

## 3. Deploya samma app i båda

```bash
kubectl create deployment hello -n dev --image=nginx
kubectl create deployment hello -n prod --image=nginx
kubectl expose deployment hello -n dev --port=80
kubectl expose deployment hello -n prod --port=80
```

## 4. Skapa testpod i dev

```bash
kubectl run -it --rm dnsutils -n dev --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.7 -- bash
```

## 5. Inspektera DNS-config inne i Podden

```bash
cat /etc/resolv.conf
```

Förväntat: search-rad börjar med `dev.svc.cluster.local`. Nameserver = cluster DNS-IP.

## 6. Testa kort namn (samma namespace)

```bash
nslookup hello
```

Förväntat: Resolveras till `hello.dev.svc.cluster.local` och dess ClusterIP.

## 7. Testa kort namn (annat namespace)

```bash
# Detta failar eller ger fel resultat
nslookup hello.prod
```

Förväntat: Funkar pga `svc.cluster.local` i search-listan.

## 8. Testa FQDN

```bash
nslookup hello.prod.svc.cluster.local
```

Förväntat: Resolveras direkt utan search domains.

## 9. Städa

```bash
exit
kubectl delete namespace dev prod
```

# Lektion hands-on

## Service discovery lab — bug fix

Manifest med 3 medvetna fel i jump-Pod (boken-stil):

```yaml
spec:
  dnsPolicy: None              # FEL: stänger av automatisk DNS
  dnsConfig:
    nameservers:
      - 8.8.8.8                # FEL: Google DNS kan inte resolva interna Services
    searches:
      - default.svc.cluster.local
  containers:
  - name: jump
    env:
    - name: PAYMENTS_HOST
      value: payments           # FEL: kort namn, men payments ligger i finance namespace
```

**Fix:**
1. `dnsPolicy: ClusterFirst` (eller ta bort fältet — det är default)
2. Ta bort `nameservers: 8.8.8.8` (men behåll `dnsConfig.searches: [default.svc.cluster.local]` så `nslookup kubernetes` funkar)
3. `PAYMENTS_HOST: payments.finance.svc.cluster.local`

Verifiera med `kubectl exec -n shop deployments/jump -- /check.sh` — alla 5 checks PASS.

# Flashcards

## Q: Vad är service discovery i K8s?

**A:** Mekanismen för hur appar hittar varandra i klustret. Containers känner namn (`payments`) men behöver IP. K8s gör översättningen automatiskt via cluster-DNS. Utan service discovery skulle appar behöva hårdkoda IP, vilket bryter när Pods byter IP eller scalas.

## Q: Vad är coredns?

**A:** K8s inbyggda DNS-server. Körs som Pods i `kube-system` namespace, fronted av en Service kallad `kube-dns`. Bevakar API server för nya Services och registrerar dem automatiskt. När en container gör DNS-lookup går request till coredns som svarar med Service ClusterIP.

## Q: Vad är skillnaden mellan kort namn och FQDN?

**A:** Kort namn (`payments`) kräver search domains i `/etc/resolv.conf` för att resolva. FQDN (`payments.finance.svc.cluster.local`) är fullständigt namn, inga genvägar. Korta namn funkar bara i samma namespace (lokalt). Cross-namespace kräver FQDN. FQDN är säkrare i scripts - inga gissningar.

## Q: Vad gör `dnsPolicy: ClusterFirst`?

**A:** Default för Pods. Konfigurerar `/etc/resolv.conf` automatiskt med cluster-DNS som primär nameserver och search domains för lokala namespacet. Detta är vad du vill 99% av tiden - utan det funkar inte service discovery.

## Q: Vad gör `dnsPolicy: None`?

**A:** Stänger av all automatisk DNS-konfiguration. Du måste själv ange `dnsConfig` med nameservers, searches, options. Använd när du behöver custom DNS (t.ex. peka mot extern DNS-server). Sällsynt - om du sätter None av misstag bryts service discovery helt.

## Q: Hur fungerar ClusterIP routing tekniskt?

**A:** ClusterIP är inte en riktig IP - det finns inga routes dit. När Pod skickar trafik till ClusterIP går den mot default gateway. På noden interceptar kerneln paketet via iptables/IPVS-regler som kube-proxy har konfigurerat. Reglerna översätter ClusterIP till en frisk Pod-IP via DNAT. Trafiken når Pod transparent.

## Q: Vad är kube-proxy och vad gör den?

**A:** En Pod på varje nod som konfigurerar nätverksregler för Services. Bevakar API server för Service och Endpoint-ändringar. Skapar/uppdaterar iptables eller IPVS-regler så att ClusterIP-trafik routas till rätt Pod-IPs. Utan kube-proxy fungerar inte Services - trafik når aldrig Pods.

## Q: Vad är `/etc/resolv.conf` i en Pod?

**A:** Standard Linux DNS-config-fil. K8s konfigurerar den automatiskt: `nameserver` pekar på cluster-DNS-IP, `search` listar domäner som appendas till korta namn (default-namespace först), `options ndots:5` styr när search domains används. Ändringar bör göras via Pod-spec (`dnsPolicy`, `dnsConfig`), inte manuellt i filen.

## Q: Hur felsöker man trasig service discovery?

**A:** 1) Kolla att coredns-Pods kör (`kubectl get pods -n kube-system -l k8s-app=kube-dns`). 2) Kolla logs (`kubectl logs <coredns-pod> -n kube-system`). 3) Kör testpod med dnsutils, kör `nslookup kubernetes` (ska resolva). 4) Kolla `/etc/resolv.conf` i Pod - rätt nameserver? Rätt search domains? 5) Verifiera Service exists och har EndpointSlice med Pods. 6) Som sista utväg - radera coredns-Pods, de återskapas.

## Q: Varför ska man använda FQDN i produktionskod?

**A:** Inga gissningar - rätt Service hittas alltid oavsett vilken namespace caller är i. Korta namn är bekväma för utveckling men fragila - en typo i namespace-config bryter dem. FQDN är explicit och self-documenting. Också: korta namn med fel search domains kan resolva till fel Service (samma namn i annat namespace).
