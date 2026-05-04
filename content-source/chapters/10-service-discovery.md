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

> 💡 Tentarelevant: Förklara skillnaden mellan kort namn och FQDN. Varför fungerar det att curl:a `service` i samma namespace men inte i annat? Svar: search domains i `/etc/resolv.conf` appendas bara till korta namn — och defaulten är lokalt namespace.

> 💡 Tentarelevant: Vad gör `dnsPolicy: ClusterFirst`? Vad gör `dnsPolicy: None`? När använder man vad?

> 💡 Tentarelevant: Hur fungerar service discovery tekniskt? Måste kunna förklara coredns + kube-proxy + iptables-trafiken steg för steg.

# Lektion

**Lektion 27 april — Kap 10: Service discovery + felsökningslab**

Lektionen var kort på teori, lång på hands-on. Giacomo introducerade en **felsökningsuppgift som lämnades in i Canvas** — manifest med tre medvetna fel som vi skulle hitta och fixa. Lektionen täckte också ny labbmiljö och kubeconfig-tips.

## Vad Giacomo gick igenom

### Kapitel 10-diskussion

- Kapitlet handlade om **DNS, namespaces, och hur services hittar varandra**
- Flera studenter tyckte det var krångligt att förstå — abstrakt koncept
- Hands-on från kapitlet **gick inte att köra i labbmiljön** eftersom det krävde flera namespaces (vi har bara ett)
- Studenter fick utföra övningarna lokalt istället

### Ny labbmiljö

- Den gamla labbmiljön har gått ner och en ny är nu uppe
- Nya miljön har **extra noder med mer resurser**
- Detta är fortfarande en nabb-miljö endast för klassen, **inte** CC-miljön
- Said har kommit in i den nya miljön
- Samma begränsningar som i den gamla — studenter har en namespace där de kan labba

### Klusterresurser

**Nuvarande labbkluster:**
- 3 control planes: 2 CPU och 4 GB RAM vardera
- 3 VM worker nodes: 8 CPU och 16 GB RAM vardera
- 3 dedikerade servrar: 8 CPU och 64 GB RAM vardera

**CC-kluster (kommande):**
- 3 control planes: 2 CPU och 4 GB RAM vardera
- 3 VM workers: 8 CPU och 16 GB RAM vardera
- 5 dedikerade servrar: 4 med 8 CPU, 1 med 12 CPU, alla med 64 GB RAM

Mycket mer resurser i CC-klustret när det blir tillgängligt.

### Kubeconfig kontextnamn

Default-kontexten som skapas programmatiskt heter inte alltid något bra — kanske bara `default`. Detta blir förvirrande när du har flera kluster (lokalt, labb, CC).

**Hur man ändrar:**
1. Editera kubeconfig-filen direkt (vim/nano)
2. Ändra klusternamnet
3. Uppdatera motsvarande referenser i `context` och `currentContext`

```yaml
clusters:
- name: my-labb-kluster      # ← ändra här
  cluster:
    ...
contexts:
- name: my-labb-context
  context:
    cluster: my-labb-kluster  # ← och här (måste matcha)
    ...
current-context: my-labb-context  # ← och här
```

Detta gör det lättare att se vilket kluster man arbetar mot — speciellt med `kube-ps1` som visar context i prompten.

## Hands-on uppgift — Felsökning (CANVAS-INLÄMNING)

**Uppgiftens syfte:** Felsöka och fixa problem i K8s-manifest relaterade till kapitel 10.

### Struktur

Manifest med:
- **Två namespaces:** SHOP och FINANCE
- **SHOP namespace:** catalog deployment (HTTP echo) och service
- **FINANCE namespace:** payments deployment (HTTP echo) och service
- **En jump deployment** (i shop) med ett check-skript för att testa connectivity

### Check-skriptet testar

1. Åtkomst till `kubernetes` service (default namespace)
2. Åtkomst till `catalog` service (samma namespace)
3. HTTP till `catalog` (samma namespace)
4. Åtkomst till `payments` via environment variable (annat namespace)
5. HTTP till `payments` (annat namespace)

### Nuvarande status

Alla fem checks failade.

### Instruktioner från Giacomo

- **Ändra INTE** check-skriptet i jump-deploymenten
- Lösningen är att ändra **andra delar** av manifestet så att skriptet fungerar
- Studenter kan exec:a in i jump-Podden för felsökning
- Läs manifesten noga och titta tillbaka på kapitlet för relevanta lösningar
- Övningen ska köras lokalt (nya namespaces går inte att skapa i labb)

### Lösningen — tre fel i jump-deploymentens pod spec

**Fel 1:** `dnsPolicy: None`
- Stänger av automatisk DNS-konfiguration
- **Fix:** Ändra till `dnsPolicy: ClusterFirst`

**Fel 2:** `nameservers: 8.8.8.8` i dnsConfig
- Google DNS kan inte resolva interna K8s services
- **Fix:** Ta bort nameservers helt. Behåll dnsConfig med extra search domain för `default.svc.cluster.local` (behövs för check 1: `nslookup kubernetes`).

**Fel 3:** `PAYMENTS_HOST: payments`
- Kort namn — men payments-Service ligger i `finance` namespace, inte `shop`
- Korta namn resolveras bara inom samma namespace
- **Fix:** FQDN: `payments.finance.svc.cluster.local`

### Kärninsikt

**FQDN — hela pathen och inga genvägar.** Korta namn fungerar bara inom samma namespace; cross-namespace kräver `<service>.<namespace>.svc.cluster.local`.

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

## 7. Testa FQDN

```bash
nslookup hello.prod.svc.cluster.local
```

Förväntat: Resolveras direkt utan search domains.

## 8. Städa

```bash
exit
kubectl delete namespace dev prod
```

# Lektion hands-on

## Service discovery lab — bug fix (Canvas-inlämning)

Komplett manifest med tre medvetna fel:

```yaml
apiVersion: v1
kind: Namespace
metadata: {name: shop}
---
apiVersion: v1
kind: Namespace
metadata: {name: finance}
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: catalog, namespace: shop}
spec:
  replicas: 2
  selector:
    matchLabels: {app: catalog}
  template:
    metadata:
      labels: {app: catalog}
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from catalog"]
        ports: [{containerPort: 5678}]
---
apiVersion: v1
kind: Service
metadata: {name: catalog, namespace: shop}
spec:
  selector: {app: catalog}
  ports: [{port: 80, targetPort: 5678}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: payments, namespace: finance}
spec:
  replicas: 2
  selector:
    matchLabels: {app: payments}
  template:
    metadata:
      labels: {app: payments}
    spec:
      containers:
      - name: web
        image: hashicorp/http-echo:1.0.0
        args: ["-text=Hello from payments"]
        ports: [{containerPort: 5678}]
---
apiVersion: v1
kind: Service
metadata: {name: payments, namespace: finance}
spec:
  selector: {app: payments}
  ports: [{port: 80, targetPort: 5678}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: jump, namespace: shop}
spec:
  replicas: 1
  selector:
    matchLabels: {app: jump}
  template:
    metadata:
      labels: {app: jump}
    spec:
      dnsPolicy: None              # FEL 1: stänger av automatisk DNS
      dnsConfig:
        nameservers:
          - 8.8.8.8                # FEL 2: Google DNS resolver inte interna services
        searches:
          - default.svc.cluster.local
      containers:
      - name: jump
        image: nicolaka/netshoot
        env:
        - name: PAYMENTS_HOST
          value: payments           # FEL 3: kort namn, men payments är i finance NS
        - name: PAYMENTS_PORT
          value: "80"
        command: ["/bin/sh", "-c"]
        args:
        - |
          # check.sh-skriptet (rör inte) ...
          sleep infinity
```

## Lösningen — fixad jump pod spec

```yaml
    spec:
      dnsPolicy: ClusterFirst       # FIX 1: aktivera automatisk DNS
      dnsConfig:
        searches:
          - default.svc.cluster.local   # behövs för check 1 (kubernetes service)
      containers:
      - name: jump
        env:
        - name: PAYMENTS_HOST
          value: payments.finance.svc.cluster.local   # FIX 3: FQDN
```

## Verifiera

```bash
kubectl apply -f sd-lab.yml
kubectl get pods -n shop --watch
kubectl exec -n shop deployments/jump -- /check.sh
```

Förväntat: Alla 5 checks PASS. "LAB COMPLETE".

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

## Q: Sammanfatta lösningen på service discovery-labben.

**A:** Tre fel i jump-podden: (1) `dnsPolicy: None` stängde av automatisk DNS — fix: ändra till `ClusterFirst`. (2) `nameservers: 8.8.8.8` — Google DNS kan inte resolva interna services — fix: ta bort, behåll bara extra search domain för `default.svc.cluster.local` (för check 1). (3) `PAYMENTS_HOST: payments` — kort namn cross-namespace funkar inte — fix: FQDN `payments.finance.svc.cluster.local`. Inga genvägar cross-namespace.
